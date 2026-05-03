"""
KilimoChat Voice Pipeline Test Script
Tests the complete voice message processing pipeline with a sample audio file.

Usage:
    python tests/test_voice.py

This script:
1. Creates a sample audio file (or uses an existing one)
2. Tests the transcription with Groq Whisper
3. Tests language detection
4. Tests translation if needed
5. Gets AI response
6. Reports results
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    GROQ_API_KEY,
    logger,
    setup_logging
)
from language_utils import detect_language, translate_text, process_voice_transcription
from ai_handler import get_ai_response_simple
from voice_handler import transcribe_audio_with_whisper

# Ensure logs are printed to console
setup_logging()


def create_sample_audio() -> Path:
    """
    Create a sample audio file for testing.
    If ffmpeg is available, creates a simple test tone.
    Otherwise, instructs user to provide their own file.
    """
    test_dir = Path(__file__).parent / "test_audio"
    test_dir.mkdir(exist_ok=True)
    
    sample_path = test_dir / "sample_test.mp3"
    
    # Try to create a test audio file using pydub if available
    try:
        from pydub import AudioSegment
        from pydub.generators import Sine
        
        # Generate 5 seconds of 440Hz sine wave (A4 note)
        sine_wave = Sine(440).to_audio_segment(duration=5000)
        
        # Export as MP3
        sine_wave.export(sample_path, format="mp3")
        print(f"✅ Created sample audio file: {sample_path}")
        return sample_path
        
    except ImportError:
        print("⚠️  pydub not installed. Cannot create sample audio.")
        print("   Please provide your own audio file using --file option.")
        return None


def test_transcription(audio_path: Path) -> str:
    """Test audio transcription with Groq Whisper."""
    print(f"\n🎤 Testing Transcription")
    print(f"   File: {audio_path}")
    print(f"   Size: {audio_path.stat().st_size} bytes")
    
    transcription = transcribe_audio_with_whisper(audio_path)
    
    if transcription:
        print(f"✅ Transcription successful")
        print(f"   Text: {transcription[:100]}...")
        return transcription
    else:
        print(f"❌ Transcription failed")
        return None


def test_language_detection(text: str) -> str:
    """Test language detection."""
    print(f"\n🌍 Testing Language Detection")
    print(f"   Text: {text[:50]}...")
    
    detected = detect_language(text)
    
    print(f"✅ Detected language: {detected}")
    if detected == "sw":
        print(f"   → Swahili detected")
    else:
        print(f"   → English detected")
    
    return detected


def test_translation(text: str, source_lang: str, target_lang: str) -> str:
    """Test translation."""
    print(f"\n🔄 Testing Translation")
    print(f"   From: {source_lang} → To: {target_lang}")
    print(f"   Original: {text[:50]}...")
    
    translated = translate_text(text, target_lang, source_lang)
    
    print(f"✅ Translation successful")
    print(f"   Translated: {translated[:50]}...")
    
    return translated


def test_ai_response(text: str, language: str) -> str:
    """Test AI response generation."""
    print(f"\n🤖 Testing AI Response")
    print(f"   Language: {language}")
    print(f"   Query: {text[:50]}...")
    
    response = get_ai_response_simple(text, language)
    
    print(f"✅ AI Response generated")
    print(f"   Response: {response[:100]}...")
    
    return response


def run_full_pipeline_test(audio_path: Path, user_phone: str = "+254712345678"):
    """
    Run the complete voice pipeline test.
    
    Args:
        audio_path: Path to audio file
        user_phone: Simulated user phone number
    """
    print("=" * 60)
    print("KILIMOCHAT VOICE PIPELINE TEST")
    print("=" * 60)
    print(f"Time: {datetime.now().isoformat()}")
    print(f"Audio File: {audio_path}")
    print(f"User: {user_phone}")
    print("=" * 60)
    
    results = {
        "success": False,
        "transcription": None,
        "detected_language": None,
        "translated_text": None,
        "ai_response": None,
        "errors": []
    }
    
    try:
        # Step 1: Transcription
        transcription = test_transcription(audio_path)
        if not transcription:
            results["errors"].append("Transcription failed")
            return results
        results["transcription"] = transcription
        
        # Step 2: Language Detection
        detected_lang = test_language_detection(transcription)
        results["detected_language"] = detected_lang
        
        # Step 3: Determine target language (simulate user preference)
        # For testing, we'll assume user wants Swahili
        target_lang = "sw"  # or "en" for testing English
        
        if detected_lang != target_lang:
            translated = test_translation(transcription, detected_lang, target_lang)
            results["translated_text"] = translated
            processing_text = translated
        else:
            print(f"\n🔄 Translation skipped (already in target language)")
            results["translated_text"] = transcription
            processing_text = transcription
        
        # Step 4: AI Response
        ai_response = test_ai_response(processing_text, target_lang)
        results["ai_response"] = ai_response
        
        results["success"] = True
        
    except Exception as e:
        logger.error(f"Pipeline test error: {e}", exc_info=True)
        results["errors"].append(str(e))
    
    # Print summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    if results["success"]:
        print("✅ All tests passed!")
        print(f"\n📝 Transcription: {results['transcription'][:80]}...")
        print(f"🌍 Language: {results['detected_language']}")
        print(f"🔄 Translation: {results['translated_text'][:80]}...")
        print(f"🤖 AI Response: {results['ai_response'][:80]}...")
    else:
        print("❌ Tests failed")
        for error in results["errors"]:
            print(f"   Error: {error}")
    
    print("=" * 60)
    
    return results


def test_with_text_only(text: str, simulate_language: str = None):
    """
    Test the pipeline with text only (simulating transcription result).
    
    Args:
        text: Simulated transcription text
        simulate_language: Force specific language detection
    """
    print("=" * 60)
    print("KILIMOCHAT VOICE PIPELINE TEST (Text Simulation)")
    print("=" * 60)
    print(f"Simulated transcription: {text}")
    print("=" * 60)
    
    # Step 1: Language Detection
    detected_lang = test_language_detection(text)
    
    if simulate_language and detected_lang != simulate_language:
        print(f"   (Overriding to: {simulate_language})")
        detected_lang = simulate_language
    
    # Step 2: Translate if needed
    target_lang = "sw"  # Assume user wants Swahili
    
    if detected_lang != target_lang:
        translated = test_translation(text, detected_lang, target_lang)
        processing_text = translated
    else:
        print(f"\n🔄 Translation skipped")
        processing_text = text
    
    # Step 3: AI Response
    ai_response = test_ai_response(processing_text, target_lang)
    
    print("\n" + "=" * 60)
    print("✅ Text-only pipeline test completed")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Test KilimoChat Voice Pipeline"
    )
    parser.add_argument(
        "--file", "-f",
        type=str,
        help="Path to audio file for testing"
    )
    parser.add_argument(
        "--text", "-t",
        type=str,
        help="Test with text only (simulate transcription)"
    )
    parser.add_argument(
        "--language", "-l",
        type=str,
        choices=["en", "sw"],
        help="Force language for text simulation"
    )
    
    args = parser.parse_args()
    
    # Check Groq API key
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not set. Please set it in .env file.")
        sys.exit(1)
    
    print(f"✅ Groq API key configured")
    
    if args.text:
        # Test with text only
        test_with_text_only(args.text, args.language)
    elif args.file:
        # Test with provided audio file
        audio_path = Path(args.file)
        if not audio_path.exists():
            print(f"❌ Audio file not found: {audio_path}")
            sys.exit(1)
        run_full_pipeline_test(audio_path)
    else:
        # Try to create or use sample audio
        sample_path = create_sample_audio()
        if sample_path and sample_path.exists():
            print("\n⚠️  Using sample audio (sine wave tone)")
            print("   Note: This will likely produce gibberish transcription")
            print("   For real testing, provide an actual speech audio file with --file\n")
            
            response = input("Continue with sample audio? (y/N): ")
            if response.lower() == 'y':
                run_full_pipeline_test(sample_path)
            else:
                print("\nTo test with a real audio file:")
                print("   python tests/test_voice.py --file /path/to/audio.mp3")
                print("\nTo test with text only:")
                print("   python tests/test_voice.py --text 'Mahindi yangu yamekufa'")
        else:
            print("\nℹ️  No audio file provided and sample could not be created.")
            print("   Please provide an audio file:")
            print("   python tests/test_voice.py --file /path/to/audio.mp3")
            print("\n   Or test with text:")
            print("   python tests/test_voice.py --text 'Your text here'")


if __name__ == "__main__":
    main()
