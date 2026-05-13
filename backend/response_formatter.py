"""
KilimoChat Response Formatter
Transforms raw AI output into beautiful WhatsApp-friendly messages for Kenyan farmers.
"""

import re
from user_experience_improvements import get_ux_enhancer


def format_response(raw_response: str, user_message: str, lang: str) -> str:
    """
    Transform ANY raw AI output into beautiful WhatsApp-friendly messages.
    
    Args:
        raw_response: The raw response from AI
        user_message: The user's original message
        lang: Language code ('en' or 'sw')
    
    Returns:
        Formatted response string
    """
    
    ux_enhancer = get_ux_enhancer()
    
    # Check if user message is ONLY a greeting
    greeting_patterns = [
        r"^(hi|hello|hey|greetings|good morning|good afternoon|good evening|karibu|habari|jambo|mambo|sasa)",
        r"^(how are you|how do you do|unaendeleaje|vipi)",
    ]
    
    for pattern in greeting_patterns:
        if re.match(pattern, user_message.strip().lower()):
            return ux_enhancer.format_success_message("Welcome message sent", lang)
    
    # For non-greeting messages, format agricultural response
    formatted_response = _format_agricultural_response(raw_response, lang)
    
    # Apply UX enhancements
    formatted_response = ux_enhancer.enhance_response_clarity(formatted_response)
    
    # Add contextual help based on message content
    if any(word in user_message.lower() for word in ['price', 'bei', 'cost', 'gharama']):
        formatted_response = ux_enhancer.add_contextual_help(formatted_response, "price", lang)
    elif any(word in user_message.lower() for word in ['disease', 'magonjwa', 'sick', 'disease']):
        formatted_response = ux_enhancer.add_contextual_help(formatted_response, "disease", lang)
    elif any(word in user_message.lower() for word in ['weather', 'hewa', 'mvua', 'rain']):
        formatted_response = ux_enhancer.add_contextual_help(formatted_response, "weather", lang)
    
    return formatted_response


def _format_greeting(lang: str) -> str:
    """Format greeting response without emojis for professional appearance."""
    if lang == "sw":
        return """Jambo! Mimi ni KilimoChat — mshauri wako wa kilimo.

Naweza kukusaidia na:
[U] Magonjwa ya mimea — Tuma picha
[U] Bei za soko — Uliza "Bei ya mahindi"
[U] Hali ya hewa — Uliza "Mvua Kitui"
[U] Ushauri wa kilimo — Swali lolote

Unataka nikusaidie na nini leo?"""
    else:
        return """Hello! I'm KilimoChat — your farming assistant.

I can help you with:
[U] Crop diseases — Send photos for diagnosis
[U] Market prices — Ask "What's the price of..."
[U] Weather info — Ask "What's the weather like..."
[U] Farming advice — Any farming question

How can I help you today?"""


def _format_agricultural_response(raw_response: str, lang: str) -> str:
    """Format agricultural response with emoji headers and bullet points."""
    
    # Extract content from old format if present
    sections = _extract_sections(raw_response)
    
    # Build response with emoji headers
    if lang == "sw":
        return _build_swahili_response(sections)
    else:
        return _build_english_response(sections)


def _extract_sections(text: str) -> dict:
    """Extract content from various section formats."""
    sections = {
        'summary': '',
        'details': '',
        'actions': '',
        'costs': '',
        'source': ''
    }
    
    # Try to extract from old underscore format
    patterns = {
        'summary': [
            r'_SUMMARY_:\s*\n(.*?)(?=\n_DETAILS|_WHAT|$)',
            r'SUMMARY:\s*\n(.*?)(?=\nDETAILS|WHAT|$)',
            r'summary:\s*\n(.*?)(?=\nDETAILS|WHAT|$)'
        ],
        'details': [
            r'_DETAILS FROM SEARCH_:\s*\n(.*?)(?=\n_WHAT|_COSTS|$)',
            r'DETAILS FROM SEARCH:\s*\n(.*?)(?=\nWHAT|COSTS|$)',
            r'details from search:\s*\n(.*?)(?=\nWHAT|COSTS|$)'
        ],
        'actions': [
            r'_WHAT TO DO_:\s*\n(.*?)(?=\n_COSTS|_WHERE|$)',
            r'WHAT TO DO:\s*\n(.*?)(?=\nCOSTS|WHERE|$)',
            r'what to do:\s*\n(.*?)(?=\nCOSTS|WHERE|$)'
        ],
        'costs': [
            r'_COSTS_:\s*\n(.*?)(?=\n_WHERE|$)',
            r'COSTS:\s*\n(.*?)(?=\nWHERE|$)',
            r'costs:\s*\n(.*?)(?=\nWHERE|$)'
        ],
        'source': [
            r'_WHERE INFO CAME FROM_:\s*\n(.*)',
            r'WHERE INFO CAME FROM:\s*\n(.*)',
            r'where info came from:\s*\n(.*)'
        ]
    }
    
    for section, pattern_list in patterns.items():
        for pattern in pattern_list:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                sections[section] = match.group(1).strip()
                break
    
    return sections


def _build_english_response(sections: dict) -> str:
    """Build English response with professional headers and proper section spacing."""
    response_sections = []
    
    # Add warm acknowledgment
    response_sections.append("I understand your question. Here's what I found:")
    
    # Summary section
    if sections['summary']:
        # Convert numbered lists to bullet points
        summary = re.sub(r'^\d+\.\s*', '• ', sections['summary'], flags=re.MULTILINE)
        response_sections.append(f"""
[SUMMARY]
{summary}""")
    
    # Details section
    if sections['details']:
        # Convert numbered lists to bullet points
        details = re.sub(r'^\d+\.\s*', '• ', sections['details'], flags=re.MULTILINE)
        response_sections.append(f"""
[DETAILS]
{details}""")
    
    # Actions section
    if sections['actions']:
        # Convert numbered lists to bullet points
        actions = re.sub(r'^\d+\.\s*', '• ', sections['actions'], flags=re.MULTILINE)
        response_sections.append(f"""
[WHAT TO DO]
{actions}""")
    
    # Costs section
    if sections['costs']:
        # Convert numbered lists to bullet points
        costs = re.sub(r'^\d+\.\s*', '• ', sections['costs'], flags=re.MULTILINE)
        response_sections.append(f"""
[COSTS]
{costs}""")
    
    # Source section
    if sections['source']:
        response_sections.append(f"""
[SOURCE]
{sections['source']}""")
    
    # Add engaging question
    response_sections.append("""

Did this help? What else would you like to know?""")
    
    # Join all sections with proper spacing
    full_response = '\n'.join(response_sections)
    
    # Truncate to ~150 words if too long
    words = full_response.split()
    if len(words) > 150:
        full_response = ' '.join(words[:147]) + '...'
    
    return full_response


def _build_swahili_response(sections: dict) -> str:
    """Build Swahili response with professional headers and proper section spacing."""
    response_sections = []
    
    # Add warm acknowledgment
    response_sections.append("Nimekuelewa swali lako. Hii ndiyo niliyopata:")
    
    # Summary section
    if sections['summary']:
        # Convert numbered lists to bullet points
        summary = re.sub(r'^\d+\.\s*', '• ', sections['summary'], flags=re.MULTILINE)
        response_sections.append(f"""
[MUHTASARI]
{summary}""")
    
    # Details section
    if sections['details']:
        # Convert numbered lists to bullet points
        details = re.sub(r'^\d+\.\s*', '• ', sections['details'], flags=re.MULTILINE)
        response_sections.append(f"""
[MAELEZO]
{details}""")
    
    # Actions section
    if sections['actions']:
        # Convert numbered lists to bullet points
        actions = re.sub(r'^\d+\.\s*', '• ', sections['actions'], flags=re.MULTILINE)
        response_sections.append(f"""
[UNACHOFANYA]
{actions}""")
    
    # Costs section
    if sections['costs']:
        # Convert numbered lists to bullet points
        costs = re.sub(r'^\d+\.\s*', '• ', sections['costs'], flags=re.MULTILINE)
        response_sections.append(f"""
[GHARAMA]
{costs}""")
    
    # Source section
    if sections['source']:
        response_sections.append(f"""
[CHANZO]
{sections['source']}""")
    
    # Add engaging question
    response_sections.append("""

Hii ilikusaidia? Unataka kujua nini zaidi?""")
    
    # Join all sections with proper spacing
    full_response = '\n'.join(response_sections)
    
    # Truncate to ~100 words if too long (Swahili is more concise)
    words = full_response.split()
    if len(words) > 100:
        full_response = ' '.join(words[:97]) + '...'
    
    return full_response
