"""
KilimoChat Voice Handler Module
Complete pipeline for processing WhatsApp voice messages:
Download → Save → Transcribe → Translate → Process → Respond
"""

import uuid
import logging
import requests
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, Callable
from datetime import datetime, timedelta

from groq import Groq

from config import (
    GROQ_API_KEY,
    GROQ_WHISPER_MODEL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    UPLOADS_DIR,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_BACKOFF,
    VOICE_MAX_AGE_HOURS,
    VOICE_MAX_FILES,
    logger
)
from language_utils import (
    detect_language,
    translate_text,
    process_voice_transcription,
    get_target_language_for_voice,
    validate_response_language
)
from database import (
    create_voice_message,
    update_voice_message,
    get_voice_message,
    get_user_language
)
from utils.files import voice_upload_file_path

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY)


def download_audio_from_twilio(
    media_url: str,
    local_path: Path,
    auth: Tuple[str, str]
) -> bool:
    """
    Download audio file from Twilio's CDN.
    
    Args:
        media_url: Twilio MediaUrl
        local_path: Where to save the file
        auth: Tuple of (TWILIO_SID, TWILIO_AUTH_TOKEN)
    
    Returns:
        True if successful, False otherwise
    """
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(
                media_url,
                auth=auth,
                timeout=REQUEST_TIMEOUT,
                stream=True
            )
            response.raise_for_status()
            
            # Save file
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            logger.info(f"Downloaded audio file: {local_path} ({local_path.stat().st_size} bytes)")
            return True
            
        except Exception as e:
            logger.warning(f"Download attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(RETRY_BACKOFF ** attempt)
    
    logger.error(f"Failed to download audio after {MAX_RETRIES} attempts")
    return False


def transcribe_audio_with_whisper(audio_path: Path) -> Optional[str]:
    """
    Transcribe audio file using Groq Whisper API.
    
    Args:
        audio_path: Path to audio file (.ogg, .mp3, etc.)
    
    Returns:
        Transcription text or None if failed
    """
    for attempt in range(MAX_RETRIES):
        try:
            with open(audio_path, "rb") as audio_file:
                response = groq_client.audio.transcriptions.create(
                    file=(audio_path.name, audio_file.read()),
                    model=GROQ_WHISPER_MODEL,
                    response_format="text",
                    language="sw",  # Hint for Swahili, but model will auto-detect
                )
            
            transcription = response if isinstance(response, str) else response.text
            
            if transcription and transcription.strip():
                logger.info(f"Transcription successful: {transcription[:50]}...")
                return transcription.strip()
            else:
                logger.warning("Transcription returned empty result")
                return None
                
        except Exception as e:
            logger.warning(f"Transcription attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(RETRY_BACKOFF ** attempt)
    
    logger.error(f"Transcription failed after {MAX_RETRIES} attempts")
    return None


def process_voice_message(
    user_phone: str,
    media_url: str,
    get_ai_response_func: Callable[[str, str, str], str],
) -> str:
    """
    Complete voice message processing pipeline.
    
    Args:
        user_phone: User's WhatsApp number
        media_url: Twilio media URL
        get_ai_response_func: Function to get AI response (from ai_handler)
    
    Returns:
        Final response text to send to user
    """
    # Generate unique ID for this voice message
    voice_id = str(uuid.uuid4())

    # Local file path (pathlib + allowlisted extension)
    local_path = voice_upload_file_path(UPLOADS_DIR, voice_id, media_url)
    
    # Create database record
    db_id = create_voice_message(user_phone, media_url, str(local_path))
    
    try:
        # Step 1: Download audio
        auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        download_success = download_audio_from_twilio(media_url, local_path, auth)
        
        if not download_success:
            update_voice_message(db_id, status="failed")
            return "Sorry, I couldn't download your voice message. Please try again or type your question. 🙏"
        
        # Step 2: Transcribe audio
        transcription = transcribe_audio_with_whisper(local_path)
        
        if not transcription:
            update_voice_message(db_id, status="failed")
            return "Sorry, I couldn't understand your voice message. Please try speaking more clearly, or type your question. 🎤"
        
        # Step 3: Detect language of transcription
        detected_language = detect_language(transcription)
        
        update_voice_message(
            db_id,
            original_transcription=transcription,
            detected_language=detected_language,
            status="transcribed"
        )
        
        # Step 4: Get user's preferred language
        user_lang = get_user_language(user_phone)
        
        # Step 5: Determine target language for AI processing
        target_language = get_target_language_for_voice(
            transcription,
            detected_language,
            user_lang
        )
        
        # Step 6: Translate if needed
        translation_result = process_voice_transcription(
            transcription,
            detected_language,
            target_language
        )
        
        translated_text = translation_result["translated_text"]
        
        update_voice_message(
            db_id,
            translated_text=translated_text,
            status="translated"
        )
        
        # Step 7: Get AI response using the translated text
        ai_response = get_ai_response_func(translated_text, user_phone, target_language)
        
        # Step 8: Validate response language
        validated_response = validate_response_language(ai_response, target_language)
        
        # Step 9: Update database
        update_voice_message(
            db_id,
            ai_response=validated_response,
            status="completed"
        )
        
        # Step 10: Cleanup old files (async)
        cleanup_old_voice_files()
        
        logger.info(f"Voice message processed successfully: {db_id}")
        return validated_response
        
    except Exception as e:
        logger.error(f"Voice processing error: {e}", exc_info=True)
        update_voice_message(db_id, status="failed")
        return "Sorry, I had trouble processing your voice message. Please try again or type your question. 🙏"


def cleanup_old_voice_files() -> int:
    """
    Clean up voice files older than VOICE_MAX_AGE_HOURS.
    Also removes oldest files if more than VOICE_MAX_FILES exist.
    
    Returns:
        Number of files deleted
    """
    deleted_count = 0
    
    try:
        # Get all voice files
        voice_files = list(UPLOADS_DIR.glob("*"))
        
        if not voice_files:
            return 0
        
        # Sort by modification time (oldest first)
        voice_files.sort(key=lambda f: f.stat().st_mtime)
        
        now = datetime.now()
        cutoff_time = now - timedelta(hours=VOICE_MAX_AGE_HOURS)
        
        # Delete old files
        for file_path in voice_files:
            try:
                mod_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                
                # Delete if older than max age
                if mod_time < cutoff_time:
                    file_path.unlink()
                    deleted_count += 1
                    logger.info(f"Deleted old voice file: {file_path}")
                    continue
                
                # Or delete if we have too many files (keep only VOICE_MAX_FILES newest)
                if len(voice_files) - deleted_count > VOICE_MAX_FILES:
                    file_path.unlink()
                    deleted_count += 1
                    logger.info(f"Deleted excess voice file: {file_path}")
                    
            except Exception as e:
                logger.warning(f"Failed to delete {file_path}: {e}")
        
        if deleted_count > 0:
            logger.info(f"Cleanup completed: deleted {deleted_count} voice files")
        
    except Exception as e:
        logger.error(f"Cleanup error: {e}")
    
    return deleted_count


def get_voice_message_status(voice_id: str) -> Optional[Dict[str, Any]]:
    """
    Get status of a voice message processing.
    
    Args:
        voice_id: The voice message ID
    
    Returns:
        Dict with status info or None if not found
    """
    record = get_voice_message(voice_id)
    
    if not record:
        return None
    
    return {
        "id": record.id,
        "status": record.status,
        "user_phone": record.user_phone,
        "detected_language": record.detected_language,
        "has_transcription": bool(record.original_transcription),
        "has_translation": bool(record.translated_text),
        "has_response": bool(record.ai_response),
        "created_at": record.created_at,
        "updated_at": record.updated_at
    }


# Error response messages
VOICE_ERROR_MESSAGES = {
    "download_failed": "Sorry, I couldn't download your voice message. Please try again or type your question. 🙏",
    "transcription_failed": "Sorry, I couldn't understand your voice message. Please try speaking more clearly, or type your question. 🎤",
    "processing_failed": "Sorry, I had trouble processing your voice message. Please try again or type your question. 🙏",
    "language_not_detected": "I couldn't determine the language of your message. Please speak clearly in English or Swahili. 🗣️",
    "too_long": "Your voice message is too long. Please keep it under 2 minutes. ⏱️",
}
