"""
KilimoChat Language Utilities Module
Handles language detection, translation, and validation.
"""

import re
import logging
from typing import Optional, Dict, List
from functools import lru_cache

from groq import Groq
from config import (
    GROQ_API_KEY,
    GROQ_CHAT_MODEL,
    TRANSLATION_PROMPT,
    LANGUAGE_DETECTION_PROMPT,
    VALIDATE_LANGUAGE_PROMPT,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_BACKOFF,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    logger
)

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY)

# Setup logger
logger = logging.getLogger(__name__)

# Swahili keyword patterns for detection
SWAHILI_KEYWORDS: List[str] = [
    "shamba", "mkulima", "mimea", "mazao", "mbegu", "mbolea",
    "mvua", "hali", "hewa", "dawa", "wadudu", "magugum", "kutu",
    "mahindi", "mchele", "maharage", "viazi", "tikiti", "malenge",
    "mengine", "shambani", "pandikiza", "vunaji", "soko", "bei",
    "ulimwengu", "msimu", "kupanda", "kuvuna", "kulima", "nafaka",
    "chakula", "kuku", "mbuzi", "ngombe", "samaki", "kondoo",
    "tIBA", "dAWA", "tIBU", "gonjwa", "athiri", "madhara",
    "mbolea", "nitrogen", "phosphorus", "potassium", "calcium",
    "mchanga", "udongo", "mchanga", "mawingu", "jua", "mvua",
    "kiasi", "kiasi", "wakati", "muda", "siku", "wiki", "mwezi",
    "mwaka", "msimu", "vuli", "masika", "kuli", "kiangazi",
]

# English keyword patterns
ENGLISH_KEYWORDS: List[str] = [
    "farm", "farmer", "crop", "plant", "seed", "fertilizer",
    "rain", "weather", "medicine", "pest", "weed", "disease",
    "maize", "corn", "rice", "beans", "potatoes", "pumpkin",
    "planting", "harvest", "market", "price", "agriculture",
    "season", "plant", "harvest", "farming", "grain", "food",
    "chicken", "goat", "cow", "fish", "sheep", "treatment",
    "cure", "affected", "damage", "nitrogen", "phosphorus",
    "potassium", "calcium", "sand", "soil", "clay", "cloud",
    "sun", "rain", "amount", "time", "day", "week", "month",
    "year", "season", "long rains", "short rains", "dry",
]


def detect_language_keywords(text: str) -> Optional[str]:
    """
    Detect language using keyword matching.
    Returns 'sw' for Swahili, 'en' for English, or None if uncertain.
    """
    text_lower = text.lower()
    
    # Count keyword matches
    swahili_score = sum(1 for word in SWAHILI_KEYWORDS if word in text_lower)
    english_score = sum(1 for word in ENGLISH_KEYWORDS if word in text_lower)
    
    # Determine language based on scores
    if swahili_score > english_score:
        return "sw"
    elif english_score > swahili_score:
        return "en"
    
    return None


def detect_language_ai(text: str) -> str:
    """
    Detect language using Groq AI.
    Falls back to keyword detection if AI fails.
    """
    # First try keyword detection
    keyword_result = detect_language_keywords(text)
    if keyword_result:
        return keyword_result
    
    # Try AI detection with retries
    for attempt in range(MAX_RETRIES):
        try:
            prompt = LANGUAGE_DETECTION_PROMPT.format(text=text[:500])  # Limit text length
            
            response = groq_client.chat.completions.create(
                model=GROQ_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are a language detection expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=10,
                timeout=REQUEST_TIMEOUT,
            )
            
            lang_code = response.choices[0].message.content.strip().lower()
            
            # Validate response
            if lang_code in SUPPORTED_LANGUAGES:
                logger.debug(f"AI detected language: {lang_code}")
                return lang_code
            
            # Handle variations
            if "sw" in lang_code or "swahili" in lang_code:
                return "sw"
            if "en" in lang_code or "english" in lang_code:
                return "en"
            
        except Exception as e:
            logger.warning(f"Language detection attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(RETRY_BACKOFF ** attempt)
    
    # Default fallback
    logger.warning(f"Language detection failed, defaulting to {DEFAULT_LANGUAGE}")
    return DEFAULT_LANGUAGE


def detect_language(text: str) -> str:
    """
    Main language detection function.
    Combines keyword detection with AI detection for accuracy.
    """
    # Clean text
    text = text.strip()
    if not text:
        return DEFAULT_LANGUAGE
    
    # Try keyword detection first (fast)
    keyword_result = detect_language_keywords(text)
    if keyword_result and len(text) > 20:
        # If text is substantial and keywords clearly indicate language
        swahili_score = sum(1 for word in SWAHILI_KEYWORDS if word in text.lower())
        english_score = sum(1 for word in ENGLISH_KEYWORDS if word in text.lower())
        
        if abs(swahili_score - english_score) >= 2:
            logger.debug(f"Language detected via keywords: {keyword_result}")
            return keyword_result
    
    # Fall back to AI detection
    return detect_language_ai(text)


def translate_text(
    text: str,
    target_language: str,
    source_language: Optional[str] = None
) -> str:
    """
    Translate text to target language using Groq AI.
    
    Args:
        text: Text to translate
        target_language: Target language code ('en' or 'sw')
        source_language: Optional source language (auto-detect if None)
    
    Returns:
        Translated text
    """
    if not text or not text.strip():
        return text
    
    # If already in target language, return as-is
    if source_language == target_language:
        return text
    
    # Determine target language name
    lang_name = "Swahili" if target_language == "sw" else "English"
    
    for attempt in range(MAX_RETRIES):
        try:
            prompt = TRANSLATION_PROMPT.format(
                target_language=lang_name,
                text=text[:1000]  # Limit text length
            )
            
            response = groq_client.chat.completions.create(
                model=GROQ_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are a professional translator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000,
                timeout=REQUEST_TIMEOUT,
            )
            
            translation = response.choices[0].message.content.strip()
            
            # Clean up translation
            translation = re.sub(r'^["\']|["\']$', '', translation)  # Remove surrounding quotes
            translation = translation.replace('Translation:', '').strip()
            
            logger.debug(f"Translated to {target_language}: {translation[:50]}...")
            return translation
            
        except Exception as e:
            logger.warning(f"Translation attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(RETRY_BACKOFF ** attempt)
    
    # Return original on failure
    logger.error(f"Translation failed after {MAX_RETRIES} attempts")
    return text


def validate_response_language(response: str, target_language: str) -> str:
    """
    Validate that AI response is in correct language.
    If not, translate it.
    
    Args:
        response: AI response text
        target_language: Expected language code
    
    Returns:
        Validated/translated response
    """
    if not response or not response.strip():
        return response
    
    # Quick check - look for common indicators
    response_lower = response.lower()
    
    if target_language == "sw":
        # Check for Swahili indicators
        swahili_indicators = ["ni", "wa", "ya", "la", "kwa", "na", "za", "zaidi"]
        score = sum(1 for indicator in swahili_indicators if f" {indicator} " in f" {response_lower} ")
        if score >= 3:
            return response
    else:
        # Check for English indicators
        english_indicators = ["the", "is", "are", "and", "for", "with", "you", "your"]
        score = sum(1 for indicator in english_indicators if f" {indicator} " in f" {response_lower} ")
        if score >= 3:
            return response
    
    # If uncertain, use AI to validate/translate
    for attempt in range(MAX_RETRIES):
        try:
            lang_name = "Swahili" if target_language == "sw" else "English"
            prompt = VALIDATE_LANGUAGE_PROMPT.format(
                target_language=lang_name,
                response=response[:500]
            )
            
            result = groq_client.chat.completions.create(
                model=GROQ_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You validate and correct language."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=500,
                timeout=REQUEST_TIMEOUT,
            )
            
            output = result.choices[0].message.content.strip()
            
            # If output is VALID, return original
            if output.upper() == "VALID":
                return response
            
            # Otherwise, use the translation
            cleaned = output.replace('VALID', '').replace('Translation:', '').strip()
            if cleaned:
                logger.debug(f"Response translated to {target_language}")
                return cleaned
            
            return response
            
        except Exception as e:
            logger.warning(f"Validation attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(RETRY_BACKOFF ** attempt)
    
    # Return original on failure
    return response


def get_target_language_for_voice(
    transcription: str,
    detected_language: str,
    user_preferred_language: str
) -> str:
    """
    Determine target language for voice processing.
    
    Strategy:
    - If user has preferred language, use that
    - Otherwise, use detected language from transcription
    
    Args:
        transcription: Transcribed text
        detected_language: Language detected from transcription
        user_preferred_language: User's saved preference
    
    Returns:
        Target language code
    """
    # If user has a preference, respect it
    if user_preferred_language and user_preferred_language in SUPPORTED_LANGUAGES:
        return user_preferred_language
    
    # Otherwise use detected language
    if detected_language in SUPPORTED_LANGUAGES:
        return detected_language
    
    return DEFAULT_LANGUAGE


def process_voice_transcription(
    transcription: str,
    detected_language: str,
    target_language: str
) -> Dict[str, str]:
    """
    Process voice transcription for AI consumption.
    
    Args:
        transcription: Original transcribed text
        detected_language: Language of transcription
        target_language: Language to translate to for AI processing
    
    Returns:
        Dict with original, detected_language, and translated_text
    """
    # If already in target language, no translation needed
    if detected_language == target_language:
        return {
            "original": transcription,
            "detected_language": detected_language,
            "translated_text": transcription,
            "translation_needed": False
        }
    
    # Translate to target language
    translated = translate_text(transcription, target_language, detected_language)
    
    return {
        "original": transcription,
        "detected_language": detected_language,
        "translated_text": translated,
        "translation_needed": True
    }


# Language names for display
LANGUAGE_NAMES = {
    "en": "English",
    "sw": "Swahili"
}


def get_language_name(lang_code: str) -> str:
    """Get display name for language code."""
    return LANGUAGE_NAMES.get(lang_code, lang_code.upper())


def translate_response(text: str, target_language: str = "sw") -> str:
    """
    Translate AI response text to target language.
    Used for post-processing when AI doesn't follow language instructions.
    
    Args:
        text: The AI response text to translate
        target_language: Target language code ('sw' or 'en')
    
    Returns:
        Translated text
    """
    if target_language == "sw":
        # Common English to Swahili translations for farming content
        translations = {
            # Headings
            "📌 SUMMARY": "📌 MUHTASARI",
            "📌 SUMMARY:": "📌 MUHTASARI:",
            "📋 DETAILS": "📋 MAELEZO",
            "📋 DETAILS FROM SEARCH:": "📋 MAELEZO KUTOKA UTAFUTI:",
            "📋 DETAILS FROM SEARCH": "📋 MAELEZO KUTOKA UTAFUTI",
            "🎯 WHAT TO DO": "🎯 CHA KUFANYA",
            "🎯 WHAT TO DO:": "🎯 CHA KUFANYA:",
            "💰 COSTS": "💰 GHARAMA",
            "💰 COSTS:": "💰 GHARAMA:",
            "📊 WHERE INFO CAME FROM": "📊 MAELEZO YALITOKA WAPI",
            "📊 WHERE INFO CAME FROM:": "📊 MAELEZO YALITOKA WAPI:",
            "📍 WHERE TO BUY": "📍 WAPI WA KUNUNUA",
            "📍 WHERE TO BUY:": "📍 WAPI WA KUNUNUA:",
            "⚠️ IMPORTANT": "⚠️ MUHIMU",
            "⚠️ IMPORTANT:": "⚠️ MUHIMU:",
            
            # Common phrases
            "The price of": "Bei ya",
            "is around": "ni kati ya",
            "per": "kwa",
            "You can find them at": "Unaweza kuwapata katika",
            "local": "za mitaa",
            "markets": "masoko",
            "farms": "mashamba",
            "or": "au",
            "Visit": "Tembelea",
            "Compare prices": "Linganisha bei",
            "from different": "kutoka kwa",
            "sellers": "wauzaji mbalimbali",
            "Ensure": "Hakikisha",
            "you buy": "ununua",
            "healthy": "wenye afya",
            "chicks": "vifaranga",
            "Prices as of": "Bei kuanzia",
            "from web search": "kutoka utafuti wa mtandao",
            "From web search": "Kutoka utafuti wa mtandao",
            "various online": "tovuti mbalimbali",
            "marketplaces": "masoko ya mtandao",
            "in": "katika",
        }
        
        # Apply translations
        result = text
        for eng, swa in translations.items():
            result = result.replace(eng, swa)
        
        # Add note that this was translated
        if result != text:
            logger.info(f"Translated AI response from English to Swahili")
        
        return result
    
    # For English target, return as-is
    return text
