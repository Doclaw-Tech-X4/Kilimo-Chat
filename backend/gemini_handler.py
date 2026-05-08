"""
Gemini AI Handler for Image and Video Analysis
Uses Google's NEW genai SDK (google-genai) - NOT google-generativeai
"""

import os
import io
import base64
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging

from config import GEMINI_API_KEY, logger

# Try to import new google.genai SDK
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-genai not installed. Run: pip install google-genai")


class GeminiHandler:
    """Handler for Gemini AI image and video analysis."""
    
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.is_configured = False
        self.client = None
        self.model_name = None
        
        if not GEMINI_AVAILABLE:
            logger.error("google-genai not installed. Run: pip install google-genai")
            return
            
        if not self.api_key:
            logger.error("GEMINI_API_KEY not configured in .env")
            return
        
        # Initialize client
        try:
            self.client = genai.Client(api_key=self.api_key)
            
            # Test with a simple request to find working model
            available_models = self._get_available_models()
            logger.info(f"Available Gemini models: {available_models}")
            
            # Priority: newest first
            preferred_models = [
                'gemini-2.5-flash',
                'gemini-2.0-flash',
                'gemini-2.0-flash-001',
                'gemini-1.5-flash',
                'gemini-1.5-flash-001'
            ]
            
            # Find first working model
            for model in preferred_models:
                if model in available_models:
                    self.model_name = model
                    self.is_configured = True
                    logger.info(f"✅ Gemini AI configured with model: {model}")
                    return
            
            # If none preferred found, use first available
            if available_models:
                self.model_name = available_models[0]
                self.is_configured = True
                logger.info(f"✅ Gemini AI configured with fallback model: {self.model_name}")
            else:
                logger.error("No Gemini models available with this API key")
                
        except Exception as e:
            logger.error(f"Failed to configure Gemini: {e}")
    
    def _get_available_models(self) -> List[str]:
        """Get list of available models for this API key."""
        try:
            models = []
            for model in self.client.models.list():
                # Only include models that support generateContent
                if 'generateContent' in str(model.supported_actions):
                    models.append(model.name)
            return models
        except Exception as e:
            logger.warning(f"Could not list models: {e}")
            # Return common model names as fallback
            return ['gemini-2.0-flash', 'gemini-2.5-flash']
    
    def _encode_file(self, file_path: str) -> Dict[str, Any]:
        """Read file and return bytes + mime type."""
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        file_ext = Path(file_path).suffix.lower()
        
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.webm': 'video/webm',
        }
        
        mime_type = mime_types.get(file_ext, 'application/octet-stream')
        
        return {
            "mime_type": mime_type,
            "data": file_content  # Return raw bytes, NOT base64
        }
    
    def _get_agricultural_prompt(self, context: str = "") -> str:
        """Generate agricultural analysis prompt."""
        base_prompt = """You are a Kenyan agricultural expert. Analyze this crop image and output ONLY the structured format below.

⚠️ CRITICAL: OUTPUT ONLY THE STRUCTURED FORMAT. NO EXTRA TEXT.

FORBIDDEN (DO NOT WRITE THESE):
- "Shikamoo mkulima!"
- "Let's look at your maize plant."
- "Habari!"
- "Jambo!"
- "Here is the analysis"
- "I will analyze"
- Any greeting or introduction

REQUIRED: Start immediately with 📌 SUMMARY:

OUTPUT THIS EXACT FORMAT (5 SECTIONS ONLY):

📌 SUMMARY:
[What you see in the image: crop name, visible problem, and severity in 2-3 sentences]

📋 DETAILS FROM SEARCH:
- Crop identified: [English name] ([Swahili name])
- Growth stage: [seedling/vegetative/flowering/fruiting/maturity]
- Problem: [disease/pest name or "No visible problem"]
- Severity: [Mild/Moderate/Severe/None]
- Affected areas: [which parts of plant are affected]

🎯 WHAT TO DO:
1. [Immediate action - e.g., "Remove infected plants/leaves"]
2. [Apply treatment - specific product and method]
3. [Prevention - how to avoid this in future]
4. [Monitoring - how to check if treatment is working]

💰 COSTS:
- Natural/Organic option: [product name]: Ksh [amount]
- Chemical option: [product name]: Ksh [amount]
- Where to buy: [agrovet/shop name]
💰 Prices as of 2024 from agricultural suppliers

📊 WHERE INFO CAME FROM:
From: Agricultural expert analysis based on crop image and verified farming knowledge

If you cannot identify something clearly, write: "Cannot identify clearly from this image."""
        
        if context:
            base_prompt += f"\n\n📋 CONTEXT: {context}\nUse this information to make your analysis more relevant."
        
        return base_prompt
    
    def analyze_image(self, image_path: str, context: str = "") -> Dict[str, Any]:
        """
        Analyze an agricultural image using Gemini.
        
        Args:
            image_path: Path to the image file
            context: Optional context from the user
            
        Returns:
            Dict with success status and analysis
        """
        if not self.is_configured:
            return {
                "success": False,
                "error": "Gemini AI not configured. Please set GEMINI_API_KEY."
            }
        
        # Read image file once
        try:
            file_data = self._encode_file(image_path)
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to read image: {str(e)}"
            }
        
        prompt_text = self._get_agricultural_prompt(context)
        
        # Build content parts (reusable for retries)
        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt_text),
                    types.Part.from_bytes(
                        data=file_data["data"],
                        mime_type=file_data["mime_type"]
                    )
                ]
            )
        ]
        
        # Try models in priority order with retry logic
        models_to_try = [self.model_name] if self.model_name else []
        models_to_try += [
            'gemini-2.0-flash',
            'gemini-2.0-flash-001', 
            'gemini-2.5-flash',
            'gemini-1.5-flash',
            'gemini-1.5-flash-001'
        ]
        # Remove duplicates while preserving order
        seen = set()
        models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]
        
        last_error = None
        
        for model in models_to_try:
            try:
                logger.info(f"🔄 Trying model: {model}")
                
                response = self.client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=0.4,
                        max_output_tokens=8192,
                        top_p=0.8
                    )
                )
                
                logger.info(f"✅ Success with model: {model}")
                
                # Clean up response - remove any greetings/intros
                cleaned_text = self._clean_analysis_output(response.text)
                
                return {
                    "success": True,
                    "analysis": cleaned_text,
                    "content_type": "image",
                    "model_used": model,
                    "has_agricultural_content": self._detect_agricultural_content(cleaned_text)
                }
                
            except Exception as e:
                error_str = str(e)
                last_error = e
                
                # If 503 (overloaded), try next model immediately
                if "503" in error_str or "UNAVAILABLE" in error_str or "high demand" in error_str:
                    logger.warning(f"⚠️ Model {model} overloaded, trying fallback...")
                    continue
                
                # If 404 (model not found), try next model
                if "404" in error_str or "NOT_FOUND" in error_str:
                    logger.warning(f"⚠️ Model {model} not found, trying fallback...")
                    continue
                
                # For other errors, stop and return error
                logger.error(f"❌ Fatal error with {model}: {e}")
                break
        
        # All models failed
        logger.error(f"All Gemini models failed. Last error: {last_error}")
        return {
            "success": False,
            "error": "Our AI service is temporarily overloaded. Please try again in 30 seconds.",
            "detail": str(last_error),
            "models_attempted": models_to_try
            }
    
    def analyze_video(self, video_path: str, context: str = "") -> Dict[str, Any]:
        """
        Analyze an agricultural video using Gemini.
        """
        if not self.is_configured:
            return {
                "success": False,
                "error": "Gemini AI not configured."
            }
        
        try:
            file_data = self._encode_file(video_path)
            prompt_text = self._get_agricultural_prompt(context) + """

For video analysis, also note:
- Any movement or changes over time
- Patterns that might indicate pest activity
- Irrigation flow or drainage issues
"""
            
            contents = [
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt_text),
                        types.Part.from_bytes(
                            data=file_data["data"],
                            mime_type=file_data["mime_type"]
                        )
                    ]
                )
            ]
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.4,
                    max_output_tokens=8192
                )
            )
            
            # Clean up response
            cleaned_text = self._clean_analysis_output(response.text)
            
            return {
                "success": True,
                "analysis": cleaned_text,
                "content_type": "video",
                "model_used": self.model_name,
                "has_agricultural_content": self._detect_agricultural_content(cleaned_text)
            }
            
        except Exception as e:
            logger.error(f"Gemini video analysis error: {e}")
            return {
                "success": False,
                "error": f"Failed to analyze video: {str(e)}"
            }
    
    def analyze_file(self, file_path: str, context: str = "") -> Dict[str, Any]:
        """Auto-detect file type and analyze."""
        file_ext = Path(file_path).suffix.lower()
        
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        video_extensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv']
        
        if file_ext in image_extensions:
            return self.analyze_image(file_path, context)
        elif file_ext in video_extensions:
            return self.analyze_video(file_path, context)
        else:
            return {
                "success": False,
                "error": f"Unsupported file type: {file_ext}"
            }
    
    def _clean_analysis_output(self, text: str) -> str:
        """Remove greetings, intros and ensure proper formatting."""
        import re
        
        # List of patterns to remove (greetings, intros)
        patterns_to_remove = [
            r'^(Shikamoo|Habari|Jambo|Hello|Hi)[^\n]*\n*',
            r"^[^\n]*(Let's look at|I will analyze|Here is|This is)[^\n]*\n*",
            r'^[^🌱🔍💊📅💰⚠️]*?(?=🌱)',
        ]
        
        cleaned = text
        for pattern in patterns_to_remove:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        
        # Ensure it starts with the crop emoji
        cleaned = cleaned.strip()
        if not cleaned.startswith('🌱'):
            # Find the first emoji and cut before it
            match = re.search(r'[🌱🔍💊📅💰⚠️]', cleaned)
            if match:
                cleaned = cleaned[match.start():]
        
        return cleaned.strip()
    
    def _detect_agricultural_content(self, text: str) -> bool:
        """Detect if analysis contains agricultural content."""
        keywords = [
            'crop', 'plant', 'farm', 'agriculture', 'pest', 'disease', 'fertilizer',
            'soil', 'water', 'irrigation', 'harvest', 'seed', 'weed', 'insect',
            'fungus', 'nutrient', 'deficiency', 'treatment', 'organic', 'chemical',
            'spray', 'apply', 'growth', 'leaf', 'stem', 'root', 'fruit', 'yield',
            'maize', 'beans', 'tomato', 'potato', 'cabbage', 'kale', 'spinach',
            'onion', 'carrot', 'rice', 'wheat', 'coffee', 'tea', 'sugarcane'
        ]
        return any(kw in text.lower() for kw in keywords)


# Global instance
gemini_handler = GeminiHandler()


# Convenience functions
def analyze_image(image_path: str, context: str = "") -> Dict[str, Any]:
    return gemini_handler.analyze_image(image_path, context)

def analyze_video(video_path: str, context: str = "") -> Dict[str, Any]:
    return gemini_handler.analyze_video(video_path, context)

def analyze_file(file_path: str, context: str = "") -> Dict[str, Any]:
    return gemini_handler.analyze_file(file_path, context)

def is_gemini_configured() -> bool:
    return gemini_handler.is_configured