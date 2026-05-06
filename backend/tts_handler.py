"""
Text-to-Speech Handler for KilimoChat
Provides human-like, professional voice synthesis with natural formatting.
"""

import os
import re
import hashlib
from typing import Dict, Any, Optional
from pathlib import Path
from config import logger

# Try to import TTS libraries
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Audio directory
AUDIO_DIR = Path(__file__).parent / "audio_cache"
AUDIO_DIR.mkdir(exist_ok=True)

# Ensure directory exists
if not AUDIO_DIR.exists():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Created audio cache directory: {AUDIO_DIR}")

# API Keys from environment


ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

def clean_text_for_speech(text: str) -> str:
    """
    Clean text for natural speech synthesis.
    Removes emojis, formats bullets, makes it sound human.
    """
    if not text:
        return ""
    
    # Step 1: Remove emojis and special symbols
    # Remove emoji characters
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"  # chess symbols
        "\U0001FA70-\U0001FAFF"  # symbols and pictographs extended-a
        "\U00002600-\U000026FF"  # miscellaneous symbols
        "\U00002700-\U000027BF"  # dingbats
        "\U0001F900-\U0001F9FF"  # supplemental symbols and pictographs
        "]+",
        flags=re.UNICODE
    )
    text = emoji_pattern.sub("", text)
    
    # Step 2: Replace bullet points with natural transitions
    text = re.sub(r'^[•\-\*]\s*', 'First, ', text, flags=re.MULTILINE)
    
    # Step 3: Replace multiple bullet points with natural flow
    lines = text.split('\n')
    cleaned_lines = []
    prev_was_bullet = False
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if it's a section header (all caps or ends with colon)
        if line.isupper() or line.endswith(':'):
            # Add pause before section
            cleaned_lines.append(f". . . {line}")
            prev_was_bullet = False
        # Check if line starts with bullet-like character
        elif line.startswith('•') or line.startswith('-') or line.startswith('*'):
            # Convert bullet to natural speech
            content = line[1:].strip()
            if prev_was_bullet:
                cleaned_lines.append(f". Next, {content}")
            else:
                cleaned_lines.append(f". First, {content}")
            prev_was_bullet = True
        else:
            cleaned_lines.append(line)
            prev_was_bullet = False
    
    text = ' '.join(cleaned_lines)
    
    # Step 4: Clean up markdown formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Remove bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Remove italic
    text = re.sub(r'__([^_]+)__', r'\1', text)       # Remove underline
    text = re.sub(r'`([^`]+)`', r'\1', text)         # Remove code
    
    # Step 5: Fix spacing and punctuation
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    text = re.sub(r'\.{3,}', '. ', text)  # Convert multiple dots to single
    text = re.sub(r'\.{2}', '. ', text)   # Convert double dots to single
    
    # Step 6: Add natural pauses for readability
    text = text.replace('.', '. ')
    text = text.replace(',', ', ')
    
    # Step 7: Clean up any remaining special characters
    text = re.sub(r'[^\w\s.,;:!?\-\'"()]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    
    # Step 8: Final cleanup
    text = text.strip()
    
    return text

def format_for_agricultural_advice(text: str) -> str:
    """
    Special formatting for agricultural advice to sound more natural.
    """
    text = clean_text_for_speech(text)
    
    # Add natural transitions for common agricultural terms
    replacements = {
        "CROP IDENTIFIED": "I've identified your crop as",
        "OBSERVATIONS": "Here's what I observe",
        "RECOMMENDED TREATMENT": "For treatment, I recommend",
        "ACTION PLAN": "Here's your action plan",
        "ESTIMATED COST": "The estimated cost is",
        "IMPORTANT NOTES": "Important notes",
        "Ksh": "Kenyan shillings",
        "KSH": "Kenyan shillings",
        "per liter": "per liter of water",
        "per ha": "per hectare",
        "agrovet": "agricultural supply store",
        "PPE": "protective equipment",
        "Disease": "disease",
        "Pest": "pest",
        "Severity": "severity",
        "Mild": "mild",
        "Moderate": "moderate",
        "Severe": "severe",
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    return text

def format_image_analysis_for_speech(text: str) -> str:
    """
    Special formatting for image analysis responses.
    Makes it sound like a professional agronomist speaking.
    """
    # First clean all emojis and formatting
    text = clean_text_for_speech(text)
    
    # Replace structured sections with natural speech
    section_replacements = {
        "CROP IDENTIFIED": "Looking at your image, I can see this is",
        "OBSERVATIONS": "Now, let me share what I observe. ",
        "TREATMENT": "For treatment, here's what I recommend. ",
        "ACTION PLAN": "Here's your step by step action plan. ",
        "COST IN KSH": "The estimated cost is",
        "COST": "The cost is",
        "IMPORTANT": "Important note",
        "NOTES": "Here are some additional notes",
        "Cannot identify clearly from this image": "I'm unable to clearly identify this from the image provided. Please try taking another photo with better lighting and closer to the affected area.",
    }
    
    for old, new in section_replacements.items():
        text = text.replace(old, new)
    
    # Make it more conversational
    text = re.sub(r'Stage:\s*', 'at the ', text)
    text = re.sub(r'Crop:\s*', '', text)
    text = re.sub(r'Disease/Pest:\s*', 'I can see ', text)
    text = re.sub(r'Severity:\s*', 'The severity is ', text)
    
    # Add natural pauses between sections
    text = text.replace('. ', '. ... ')
    
    return text.strip()

def generate_speech(text: str, language: str = "en", is_image_analysis: bool = False) -> Dict[str, Any]:
    """
    Generate speech from text using available TTS service.
    Returns audio URL or base64 encoded audio.
    
    Args:
        text: The text to convert to speech
        language: Language code (en, sw, etc.)
        is_image_analysis: True if this is image analysis output (uses special formatting)
    """
    if not text:
        return {
            "success": False,
            "error": "No text provided",
            "audio_url": None
        }
    
    # Auto-detect image analysis content
    if not is_image_analysis:
        is_image_analysis = "CROP IDENTIFIED" in text or "OBSERVATIONS" in text
    
    # Use appropriate formatter
    if is_image_analysis:
        cleaned_text = format_image_analysis_for_speech(text)
    else:
        cleaned_text = format_for_agricultural_advice(text)
    
    # Generate cache key
    cache_key = hashlib.md5(f"{cleaned_text}:{language}".encode()).hexdigest()
    cache_file = AUDIO_DIR / f"{cache_key}.mp3"
    
    # Check cache
    if cache_file.exists():
        logger.info(f"TTS cache hit: {cache_key}")
        return {
            "success": True,
            "audio_url": f"/audio/{cache_key}.mp3",
            "text": cleaned_text,
            "cached": True
        }
    
    # Try ElevenLabs (best human-like voice)
    if ELEVENLABS_API_KEY:
        try:
            result = _generate_elevenlabs_speech(cleaned_text, language, cache_file)
            if result["success"]:
                return result
        except Exception as e:
            logger.warning(f"ElevenLabs TTS failed: {e}")
    
    # Fallback: Return cleaned text for browser TTS
    logger.info("Using browser TTS fallback")
    return {
        "success": True,
        "audio_url": None,
        "text": cleaned_text,
        "use_browser_tts": True,
        "message": "Text prepared for browser speech synthesis"
    }

def _generate_elevenlabs_speech(text: str, language: str, output_file: Path) -> Dict[str, Any]:
    """
    Generate speech using ElevenLabs API.
    """
    if not REQUESTS_AVAILABLE:
        return {"success": False, "error": "requests not available"}
    
    # Voice IDs - use a professional, clear voice
    # Rachel is good for English, or use multilingual voices
    voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel - professional female voice
    
    if language == "sw":
        # Use a multilingual voice for Swahili
        voice_id = "pNInz6obpgDQGcFmaJgB"  # Adam - multilingual male voice
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": text[:5000],  # ElevenLabs limit
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.3,
            "use_speaker_boost": True
        }
    }
    
    response = requests.post(url, json=data, headers=headers, timeout=60)
    
    if response.status_code == 200:
        with open(output_file, "wb") as f:
            f.write(response.content)
        
        return {
            "success": True,
            "audio_url": f"/audio/{output_file.name}",
            "text": text,
            "cached": False
        }
    else:
        return {
            "success": False,
            "error": f"ElevenLabs API error: {response.status_code}",
            "audio_url": None
        }

# Global function for easy import
def text_to_speech(text: str, language: str = "en") -> Dict[str, Any]:
    """Main entry point for text-to-speech."""
    return generate_speech(text, language)
