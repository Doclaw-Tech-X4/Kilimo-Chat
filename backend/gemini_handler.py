"""
Gemini AI Handler for Image and Video Analysis
Uses Google's Gemini API to analyze agricultural images and videos.
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
    logger.warning("google-genai not installed. Gemini features will be unavailable.")


class GeminiHandler:
    """Handler for Gemini AI image and video analysis."""
    
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.is_configured = False
        self.model = None
        
        if not GEMINI_AVAILABLE:
            logger.error("Gemini AI not available. Install with: pip install google-genai")
            return
            
        if not self.api_key:
            logger.error("GEMINI_API_KEY not configured")
            return
        
        try:
            # Initialize the new genai client
            self.client = genai.Client(api_key=self.api_key)
            
            # Use gemini-1.5-flash which supports images and videos
            # Note: Model names should NOT have 'models/' prefix in newer SDK versions
            self.model_name = 'gemini-1.5-flash'
            self.is_configured = True
            logger.info(f"✅ Gemini AI configured successfully with {self.model_name}")
            
        except Exception as e:
            logger.error(f"Failed to configure Gemini: {e}")
            # Try fallback models - without models/ prefix
            fallback_models = [
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gemini-pro-vision',
                'gemini-1.5-flash-001'
            ]
            for model_name in fallback_models:
                try:
                    self.client = genai.Client(api_key=self.api_key)
                    self.model_name = model_name
                    self.is_configured = True
                    logger.info(f"✅ Gemini AI configured with fallback {model_name}")
                    return
                except Exception as e2:
                    logger.warning(f"Fallback {model_name} failed: {e2}")
                    continue
            logger.error("All Gemini models failed to initialize")
    
    def _encode_file(self, file_path: str) -> Dict[str, Any]:
        """Encode file for Gemini API."""
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        file_ext = Path(file_path).suffix.lower()
        
        # Determine MIME type
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
            "data": base64.b64encode(file_content).decode('utf-8')
        }
    
    def _get_agricultural_prompt(self, context: str = "") -> str:
        """Generate agricultural analysis prompt."""
        base_prompt = """You are a Kenyan agricultural expert. Analyze this crop image. Identify the crop, any disease/pest visible, and suggest practical treatment using locally available methods. Respond concisely.

Structure your response as follows:

🌱 CROP IDENTIFIED
• Name of crop and growth stage

🔍 OBSERVATIONS
• What you see (healthy parts, problem areas)
• Any visible pests, diseases, or nutrient deficiencies

💊 RECOMMENDED TREATMENT
• Natural/organic options (neem, wood ash, etc.)
• Chemical options if needed (specific product names available in Kenya)
• Application rates (e.g., "10ml per liter water")

📅 ACTION PLAN
• When to apply treatment
• How often to repeat

💰 ESTIMATED COST
• Cost in Kenyan Shillings (Ksh)
• Where to buy (agrovet)

⚠️ IMPORTANT
• Be specific about what you see
• Use simple language farmers understand
• Focus on practical, affordable solutions
• If unclear, say so honestly"""
        
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
        
        try:
            # Encode image
            image_data = self._encode_file(image_path)
            
            # Create prompt
            prompt = self._get_agricultural_prompt(context)
            
            # Generate content using new SDK
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    prompt,
                    types.Part.from_bytes(
                        data=base64.b64decode(image_data["data"]),
                        mime_type=image_data["mime_type"]
                    )
                ]
            )
            
            return {
                "success": True,
                "analysis": response.text,
                "content_type": "image",
                "has_agricultural_content": self._detect_agricultural_content(response.text)
            }
            
        except Exception as e:
            logger.error(f"Gemini image analysis error: {e}")
            return {
                "success": False,
                "error": f"Failed to analyze image: {str(e)}"
            }
    
    def analyze_video(self, video_path: str, context: str = "") -> Dict[str, Any]:
        """
        Analyze an agricultural video using Gemini.
        
        Args:
            video_path: Path to the video file
            context: Optional context from the user
            
        Returns:
            Dict with success status and analysis
        """
        if not self.is_configured:
            return {
                "success": False,
                "error": "Gemini AI not configured. Please set GEMINI_API_KEY."
            }
        
        try:
            # Encode video
            video_data = self._encode_file(video_path)
            
            # Create prompt
            prompt = self._get_agricultural_prompt(context) + """

For video analysis, also note:
- Any movement or changes over time
- Patterns that might indicate pest activity
- Irrigation flow or drainage issues
- Machinery operation (if visible)
"""
            
            # Generate content using new SDK
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    prompt,
                    types.Part.from_bytes(
                        data=base64.b64decode(video_data["data"]),
                        mime_type=video_data["mime_type"]
                    )
                ]
            )
            
            return {
                "success": True,
                "analysis": response.text,
                "content_type": "video",
                "has_agricultural_content": self._detect_agricultural_content(response.text)
            }
            
        except Exception as e:
            logger.error(f"Gemini video analysis error: {e}")
            return {
                "success": False,
                "error": f"Failed to analyze video: {str(e)}"
            }
    
    def analyze_file(self, file_path: str, context: str = "") -> Dict[str, Any]:
        """
        Analyze any file (image or video) automatically detecting type.
        
        Args:
            file_path: Path to the file
            context: Optional context from the user
            
        Returns:
            Dict with success status and analysis
        """
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
                "error": f"Unsupported file type: {file_ext}. Supported: {image_extensions + video_extensions}"
            }
    
    def _detect_agricultural_content(self, text: str) -> bool:
        """Detect if analysis contains agricultural content."""
        agricultural_keywords = [
            'crop', 'plant', 'farm', 'agriculture', 'pest', 'disease', 'fertilizer',
            'soil', 'water', 'irrigation', 'harvest', 'seed', 'weed', 'insect',
            'fungus', 'nutrient', 'deficiency', 'treatment', 'organic', 'chemical',
            'spray', 'apply', 'growth', 'leaf', 'stem', 'root', 'fruit', 'yield',
            'maize', 'beans', 'tomato', 'potato', 'cabbage', 'kale', 'spinach',
            'onion', 'carrot', 'rice', 'wheat', 'coffee', 'tea', 'sugarcane'
        ]
        
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in agricultural_keywords)


# Global instance
gemini_handler = GeminiHandler()


def analyze_image(image_path: str, context: str = "") -> Dict[str, Any]:
    """Convenience function for image analysis."""
    return gemini_handler.analyze_image(image_path, context)


def analyze_video(video_path: str, context: str = "") -> Dict[str, Any]:
    """Convenience function for video analysis."""
    return gemini_handler.analyze_video(video_path, context)


def analyze_file(file_path: str, context: str = "") -> Dict[str, Any]:
    """Convenience function for any file analysis."""
    return gemini_handler.analyze_file(file_path, context)


def is_gemini_configured() -> bool:
    """Check if Gemini is properly configured."""
    return gemini_handler.is_configured
