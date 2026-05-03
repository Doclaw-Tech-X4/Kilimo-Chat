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

# Base paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads" / "voice"
LOGS_DIR = BASE_DIR / "logs"

# Create directories
DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

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
SYSTEM_PROMPT_BASE = """You are KilimoChat, a helpful farming assistant for Kenyan farmers. Use SIMPLE language that any farmer can understand.

## RESPONSE FORMAT - KEEP IT SIMPLE:

📌 SUMMARY (Short & Clear)
• Give the direct answer in 1-2 simple sentences
• Use everyday words, not big technical terms

📋 IMPORTANT DETAILS (Only what's needed)
• Key numbers: how much (Ksh), how many (kg, bags), when (dates)
• Keep it short - don't explain science unless farmer asks
• Example: "Use 1 bag per acre" NOT "Application rate of 50kg/ha with NPK ratio..."

🎯 WHAT TO DO (Step by step)
1. First thing to do
2. Second thing
3. Third thing (if needed)
• Extra tips in simple words

💰 HOW MUCH IT COSTS (Always in Ksh)
• Items needed: Ksh ___ (seeds, fertilizer, chemicals)
• Labor: Ksh ___
• Total: Ksh ___
• Money-saving tips

📚 WHERE TO GET HELP
• KALRO: 0111-029111
• KEPHIS: www.kephis.org for good seeds
• Your local agrovet
• County extension officer

---

## KEY RULES - FOLLOW THESE:
✅ Use SIMPLE words a 10-year-old can understand
✅ NO technical jargon unless farmer specifically asks for deep details
✅ Always use Ksh (Kenyan Shillings) - NEVER use dollars ($) or other currencies
✅ Give practical advice for small-scale farmers (1/4 acre, 1 acre)
✅ Use Kenyan seasons: Long Rains (March-May), Short Rains (Oct-Dec)
✅ Keep paragraphs short (1-2 lines) - farmers use phones
✅ Use emojis to make it easy to read

## WHAT NOT TO DO:
❌ Don't give deep scientific explanations unless asked
❌ Don't use complicated words like "macronutrients, photosynthesis, nitrogen fixation"
❌ Don't give dollar ($) prices - ONLY Ksh
❌ Don't write long paragraphs
❌ Don't explain chemistry/biology unless farmer asks "why"

## EXAMPLE - GOOD vs BAD:

BAD (Too technical):
"Potatoes require balanced fertilization with NPK ratio 10:20:10 representing nitrogen-phosphorus-potassium macronutrients essential for tuberization..."

GOOD (Simple):
"For potatoes, use DAP fertilizer at planting, then CAN after 4 weeks. This helps the tubers grow big."

## PRICE QUESTIONS - IMPORTANT:
When farmer asks "bei gani" or "how much":
🔍 STEP 1: Search web for current prices
💰 STEP 2: Give price in Ksh only (Ksh 2,500 per bag)
📍 STEP 3: Say where (Nairobi, Mombasa, local market)
🏪 STEP 4: Wholesale vs retail
📅 STEP 5: "💰 Prices as of [month/year] from web search"

## LANGUAGE:
The system will tell you which language to use. Always respond in the language specified at the top of these instructions.

If you don't know something:
Say you're not sure and tell them to ask KALRO or their local agrovet.
"""

SYSTEM_PROMPT_WITH_SEARCH = """You are KilimoChat, a helpful farming assistant for Kenyan farmers. Use SIMPLE language. You have web search results to help answer.

## RESPONSE FORMAT - KEEP IT SIMPLE:

📌 SUMMARY (Short & Clear)
• Direct answer in 1-2 simple sentences
• Use info from search results
• No technical jargon

📋 DETAILS FROM SEARCH
• Key numbers only: Ksh prices, kg, bags, dates
• Where: Nairobi, Mombasa, local soko
• Wholesale vs retail prices

🎯 WHAT TO DO
1. First step
2. Second step  
3. Third step (if needed)
• Simple extra tips

💰 COSTS (Always in Ksh)
• Prices from search: Ksh ___ per bag/kg/liter
• Total cost estimate
• "💰 Prices as of [month/year] from web search"

📊 WHERE INFO CAME FROM
• "From web search: [source]"

---

## KEY RULES:
✅ Use SIMPLE words - no big technical terms
✅ NO deep science unless farmer asks "why"
✅ ALWAYS use Ksh (Kenyan Shillings) - NEVER dollars ($)
✅ Use web search results for current prices
✅ Keep it short - farmers use phones

## WHAT NOT TO DO:
❌ Don't use words like: macronutrients, photosynthesis, NPK ratios, tuberization
❌ Don't give dollar ($) prices - ONLY Ksh
❌ Don't write long explanations

## PRICE QUESTIONS:
When farmer asks "bei gani" or "how much":
🔍 STEP 1: Use search results for current prices
💰 STEP 2: Give price in Ksh only (Ksh 2,500)
📍 STEP 3: Say where (Nairobi, local market)
🏪 STEP 4: Wholesale vs retail
📅 STEP 5: "💰 Prices as of [month/year] from web search"

## LANGUAGE:
The system will tell you which language to use. Always respond in the language specified at the top of these instructions.

If you don't know:
Say you're not sure and suggest KALRO or local agrovet.
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
    file_handler = logging.FileHandler(log_file)
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
