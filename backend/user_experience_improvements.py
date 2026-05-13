"""
KilimoChat User Experience Improvements
Enhances user experience with better error handling, responses, and interactions.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class UXEnhancer:
    """Enhances user experience with better formatting and error handling."""
    
    @staticmethod
    def format_error_message(error: str, user_language: str = "en") -> str:
        """Format error messages in user-friendly way."""
        if user_language == "sw":
            return f"Samahani, kuna tatizo: {error}\n\nTafadhali jaribu tena baada ya muda."
        else:
            return f"Sorry, there's an issue: {error}\n\nPlease try again in a moment."
    
    @staticmethod
    def format_success_message(action: str, user_language: str = "en") -> str:
        """Format success messages."""
        if user_language == "sw":
            return f"✓ Imefanikiwa: {action}"
        else:
            return f"✓ Completed: {action}"
    
    @staticmethod
    def format_loading_message(action: str, user_language: str = "en") -> str:
        """Format loading messages."""
        if user_language == "sw":
            return f"Inatafuta {action}... Tafadhali subiri."
        else:
            return f"Loading {action}... Please wait."
    
    @staticmethod
    def enhance_response_clarity(response: str) -> str:
        """Enhance response clarity with better formatting."""
        # Add proper spacing
        lines = response.split('\n')
        enhanced_lines = []
        
        for line in lines:
            if line.strip():
                # Add spacing after headers
                if line.startswith('[') and line.endswith(']'):
                    enhanced_lines.append(f"\n{line}\n")
                # Add spacing for bullet points
                elif line.strip().startswith('•'):
                    enhanced_lines.append(f"  {line}")
                else:
                    enhanced_lines.append(line)
            else:
                enhanced_lines.append("")
        
        return '\n'.join(enhanced_lines)
    
    @staticmethod
    def add_contextual_help(response: str, topic: str, user_language: str = "en") -> str:
        """Add contextual help based on topic."""
        help_suggestions = {
            "price": {
                "en": "\n\n💡 Tip: For more prices, ask 'What's the price of [crop]'",
                "sw": "\n\n💡 Tip: Kwa bei zaidi, uliza 'Bei ya [mmea]'"
            },
            "disease": {
                "en": "\n\n💡 Tip: Send clear photos of affected plants for better diagnosis",
                "sw": "\n\n💡 Tip: Tuma picha wazi za mimea iliyoathiriwa kwa uambuzi bora"
            },
            "weather": {
                "en": "\n\n💡 Tip: Ask 'What's the weather like in [location]?'",
                "sw": "\n\n💡 Tip: Uliza 'Hali ya hewa inapo [eneo]?'"
            }
        }
        
        if topic in help_suggestions:
            response += help_suggestions[topic].get(user_language, "")
        
        return response
    
    @staticmethod
    def format_response_time(response: str, processing_time: float) -> str:
        """Add processing time info for transparency."""
        if processing_time < 1.0:
            time_info = "Quick response"
        elif processing_time < 3.0:
            time_info = "Fast response"
        else:
            time_info = "Processing complete"
        
        return f"{response}\n\n({time_info})"
    
    @staticmethod
    def add_follow_up_suggestions(response: str, topic: str, user_language: str = "en") -> str:
        """Add relevant follow-up suggestions."""
        suggestions = {
            "maize": {
                "en": "\n\nRelated questions:\n• How to prevent maize diseases?\n• Best fertilizer for maize?\n• Current maize market prices?",
                "sw": "\n\nMaswali yanayofuata:\n• Kuzuia magonjwa ya mahindi?\n• Mbolea bora kwa mahindi?\n• Bei ya soko la mahindi leo?"
            },
            "weather": {
                "en": "\n\nRelated questions:\n• What's the forecast for this week?\n• When should I plant?\n• Rainfall predictions?",
                "sw": "\n\nMaswali yanayofuata:\n• Ubashiria wa wiki hii?\n• Nipandaje lini?\n• Matabia ya mvua?"
            }
        }
        
        if topic in suggestions:
            response += suggestions[topic].get(user_language, "")
        
        return response


def get_ux_enhancer() -> UXEnhancer:
    """Get UX enhancer instance."""
    return UXEnhancer()
