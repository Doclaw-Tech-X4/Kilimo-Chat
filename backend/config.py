"""
KilimoChat Configuration Module
Loads environment variables and defines constants, prompts, and settings.
"""

import os
import logging
from pathlib import Path
from typing import List

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base paths (pathlib.Path for correct ``/`` joining on all platforms)
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads" / "voice"
LOGS_DIR = BASE_DIR / "logs"

# Create directories
for _dir in (DATA_DIR, UPLOADS_DIR, LOGS_DIR):
    _dir.mkdir(parents=True, exist_ok=True)

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

# Weather API (OpenWeatherMap)
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# Gemini API (Google AI for image/video analysis)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "kilimochat")

# Groq Models
GROQ_CHAT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_WHISPER_MODEL = "whisper-large-v3"

# Application Settings
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
APP_NAME = os.getenv("APP_NAME", "KilimoChat")
APP_VERSION = "2.0.0"

# Timeouts and Retries
REQUEST_TIMEOUT = 10  # seconds
MAX_RETRIES = 3
RETRY_BACKOFF = 2  # exponential backoff multiplier

# Voice Settings
VOICE_MAX_AGE_HOURS = int(os.getenv("VOICE_MAX_AGE_HOURS", "24"))
VOICE_MAX_FILES = int(os.getenv("VOICE_MAX_FILES", "100"))
SUPPORTED_AUDIO_FORMATS = [".ogg", "mp3", "m4a", "wav", "webm"]

# Search Settings
SEARCH_MAX_RESULTS = 3
SEARCH_TIMEOUT = 10

# Keywords for detecting search needs (current/real-time info)
SEARCH_KEYWORDS: List[str] = [
    # English - Price/Market
    "price", "prices", "cost", "costs", "rate", "rates", "market", "value", "worth",
    "how much", "how much is", "what is the price", "current price", "today's price",
    "market price", "selling price", "buying price", "farm gate price", "wholesale price",
    "retail price", "kg price", "per kg", "per bag", "90kg", "price list", "commodity price",
    # English - Weather/Time
    "current", "today", "latest", "now", "recent", "update",
    "weather", "forecast", "temperature", "rain", "rainfall",
    # Swahili - Price/Market
    "bei", "bei ya", "bei za", "gharama", "thamani", "soko", "sokoni",
    "bei ngapi", "bei ya leo", "bei ya sasa", "bei ya soko", "bei ya mchezo",
    "shilingi ngapi", "elfu ngapi", "pesa ngapi", "bei ya jumla", "bei ya rejareja",
    "bei kwa kilo", "bei kwa mifuko", "tani moja", "kilo moja", "chupa", "lita",
    # Swahili - Weather/Time
    "sasa", "leo", "hivi punde", "habari mpya", "sasa hivi",
    "mvua leo", "hali ya hewa", "soko la leo", "mvua kesho", "wiki hii",
]

# Language settings
SUPPORTED_LANGUAGES = ["en", "sw"]  # English, Swahili
DEFAULT_LANGUAGE = "en"

# System Prompts
SYSTEM_PROMPT_BASE = """You are KilimoChat, an EXPERT farming assistant for Kenyan farmers. Provide CONFIDENT, PRACTICAL advice.

## CORE PRINCIPLE: ALWAYS BE HELPFUL
When a farmer asks a question, you MUST give a helpful answer. Never say "I'm not sure" or "I don't know."

## KEY RULES:
- Be CONFIDENT - farmers trust your advice
- Use SIMPLE words a 10-year-old can understand
- ALWAYS use Ksh (Kenyan Shillings) - NEVER dollars ($)
- Give specific numbers: bags per acre, liters, Ksh amounts
- Use Kenyan context: Long Rains (March-May), Short Rains (Oct-Dec)

## WHAT NOT TO DO:
- Never say "I'm not sure" - always give your best advice
- Never say "check online" - YOU are the expert
- Don't use complicated scientific words

## TYPICAL PRICES (use when exact data not available):
- Maize 90kg bag: Ksh 2,500-3,500
- Beans 90kg bag: Ksh 4,000-6,000
- Fertilizer DAP 50kg: Ksh 2,800-3,200
- Seeds: Ksh 500-1,500 per kg

## HELP CONTACTS:
- KALRO: 0111-029111
- KEPHIS: www.kephis.org for good seeds
- Local agrovet
- County extension officer

Only refer to KALRO for serious disease outbreaks or legal questions.
Otherwise, GIVE YOUR BEST ADVICE directly.

IMPORTANT: The system will provide specific formatting instructions. Follow them exactly.
"""

SYSTEM_PROMPT_WITH_SEARCH = """You are KilimoChat, an EXPERT farming assistant for Kenyan farmers. Use web search results to enhance your answers.

## CORE PRINCIPLE: ALWAYS BE HELPFUL
When a farmer asks a question, you MUST give a helpful answer. Never say "I'm not sure" or "web search failed."

## USING SEARCH RESULTS:
- Good results (farming related): Use them for current prices/dates
- Bad results (irrelevant): IGNORE them, use your knowledge instead
- ALWAYS give a helpful answer regardless of search quality

## KEY RULES:
- Be CONFIDENT - you are the farming expert
- Use SIMPLE words - no big technical terms
- ALWAYS use Ksh (Kenyan Shillings) - NEVER dollars ($)
- If search gives prices: Use them! "Ksh 3,000 per bag (from web search)"
- If search is bad: Give TYPICAL RANGE from your knowledge

## WHAT NOT TO DO:
- Never say "I'm not sure" or "search results not helpful"
- Don't give dollar ($) prices - ONLY Ksh

## TYPICAL PRICES (use when exact data not available):
- Maize 90kg bag: Ksh 2,500-3,500
- Beans 90kg bag: Ksh 4,000-6,000
- Fertilizer DAP 50kg: Ksh 2,800-3,200
- Seeds: Ksh 500-1,500 per kg

## HELP CONTACTS:
- KALRO: 0111-029111
- KEPHIS: www.kephis.org
- Local agrovet
- County extension officer

Only refer to KALRO for serious disease outbreaks.
Otherwise, GIVE DIRECT ANSWERS using your knowledge.

IMPORTANT: The system will provide specific formatting instructions. Follow them exactly.
"""

# Translation prompt
TRANSLATION_PROMPT = """Translate the following text to {target_language}. 
Only output the translation, no explanations, no quotes around the text, no additional commentary.

Text to translate: {text}

Translation:"""

# Language detection prompt (for voice transcriptions)
LANGUAGE_DETECTION_PROMPT = """Detect the language of the following text. 
Respond with ONLY the ISO 639-1 language code (e.g., 'en' for English, 'sw' for Swahili).
Do not add any other text.

Text: {text}

Language code:"""

# Response validation prompt
VALIDATE_LANGUAGE_PROMPT = """Check if the following response is in {target_language} language.
If it is, output exactly: VALID
If it is not, translate it to {target_language} and output only the translation.

Response to check: {response}

Output:"""

# Logging configuration
def setup_logging() -> logging.Logger:
    """Setup logging to both console and file."""
    logger = logging.getLogger("kilimochat")
    logger.setLevel(logging.DEBUG if DEBUG else logging.INFO)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG if DEBUG else logging.INFO)
    console_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # File handler
    log_file = LOGS_DIR / "kilimoChat.log"
    file_handler = logging.FileHandler(str(log_file))
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s"
    )
    file_handler.setFormatter(file_format)
    logger.addHandler(file_handler)
    
    return logger


# Initialize logger
logger = setup_logging()

# Validate required environment variables
def validate_config() -> List[str]:
    """Validate that all required environment variables are set."""
    missing = []
    
    if not GROQ_API_KEY:
        missing.append("GROQ_API_KEY")
    if not TWILIO_ACCOUNT_SID:
        missing.append("TWILIO_ACCOUNT_SID")
    if not TWILIO_AUTH_TOKEN:
        missing.append("TWILIO_AUTH_TOKEN")
    if not GEMINI_API_KEY:
        missing.append("GEMINI_API_KEY")
    
    if missing:
        logger.warning(f"Missing environment variables: {', '.join(missing)}")
    
    return missing


# Run validation on import
MISSING_CONFIG = validate_config()
