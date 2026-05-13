"""
KilimoChat Response Formatter
Transforms raw AI output into beautiful WhatsApp-friendly messages for Kenyan farmers.
"""

import re
from typing import List

from user_experience_improvements import get_ux_enhancer


def polish_whatsapp_message(text: str, lang: str = "en") -> str:
    """
    Present bot replies in a clear, professional layout suited to WhatsApp.

    - Preserves paragraph breaks while removing trailing clutter
    - Converts common markdown (``**bold**``) to WhatsApp ``*bold*``
    - Turns section markers into short *bold* headings for scanability
    - Normalizes numbered lists (``1.item`` → ``1. item``)

    Args:
        text: Raw or partially formatted assistant text.
        lang: BCP-47 style language hint (``en`` / ``sw``); reserved for future tweaks.

    Returns:
        WhatsApp-ready string (may still be chunked upstream for Twilio limits).
    """
    del lang  # Reserved for localized labels if we diverge further by language.
    if not text or not str(text).strip():
        return ""

    t = str(text).replace("\r\n", "\n").replace("\r", "\n")

    # Markdown → WhatsApp formatting (minimal, safe transforms)
    t = re.sub(r"\*\*([^*]+)\*\*", r"*\1*", t)
    t = re.sub(r"__([^_]+)__", r"_\1_", t)

    # Underscore section headers from model prompts → bold labels
    _section_pairs: List[tuple[str, str]] = [
        (r"(?im)^_summary_\s*:\s*$", "SUMMARY: "),
        (r"(?im)^_details from search_\s*:\s*$", "DETAILS: "),
        (r"(?im)^_what to do_\s*:\s*$", "NEXT STEPS: "),
        (r"(?im)^_costs_\s*:\s*$", "COSTS: "),
        (r"(?im)^_where info came from_\s*:\s*$", "SOURCE: "),
        (r"(?im)^_muhtasari_\s*:\s*$", "MUHTASARI: "),
        (r"(?im)^_maelezo kutoka kwenye hazina_\s*:\s*$", "MAELEZO: "),
        (r"(?im)^_maelezo kutoka kwenye hati_\s*:\s*$", "MAELEZO: "),
        (r"(?im)^_maelezo_\s*:\s*$", "MAELEZO: "),
        (r"(?im)^_unachofanya_\s*:\s*$", "HATUA: "),
        (r"(?im)^_gharama_\s*:\s*$", "GHARAMA: "),
        (r"(?im)^_taarifa ilitoka wapi_\s*:\s*$", "CHANZO: "),
    ]
    for pattern, repl in _section_pairs:
        t = re.sub(pattern, repl, t)

    # Legacy bracket headings from this module → bold
    t = re.sub(
        r"^\[(SUMMARY|DETAILS|WHAT TO DO|COSTS|SOURCE|MUHTASARI|MAELEZO|"
        r"UNACHOFANYA|GHARAMA|CHANZO)\]\s*$",
        lambda m: f"*{m.group(1)}*",
        t,
        flags=re.MULTILINE | re.IGNORECASE,
    )

    # "1.Item" → "1. Item" for numbered lists
    t = re.sub(r"^(\d+)\.(?=\S)", r"\1. ", t, flags=re.MULTILINE)

    lines = [ln.rstrip() for ln in t.split("\n")]
    out: List[str] = []
    prev_blank = False
    for ln in lines:
        s = ln.strip()
        if not s:
            if not prev_blank:
                out.append("")
            prev_blank = True
            continue
        prev_blank = False
        out.append(s)

    while out and out[-1] == "":
        out.pop()
    while out and out[0] == "":
        out.pop(0)

    return "\n".join(out).strip()


def _truncate_preserving_paragraphs(text: str, max_chars: int) -> str:
    """Trim long text without collapsing newlines into a single line."""
    if len(text) <= max_chars:
        return text
    cut = text[: max_chars - 3].rstrip()
    last_break = cut.rfind("\n\n")
    if last_break > max_chars // 2:
        return cut[:last_break].rstrip() + "\n\n…"
    return cut.rstrip() + "…"


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
            return polish_whatsapp_message(
                ux_enhancer.format_success_message("Welcome message sent", lang),
                lang,
            )
    
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

    return polish_whatsapp_message(formatted_response, lang)


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
    """Build English response with clear section spacing and bold-style headings."""
    response_sections: List[str] = []

    response_sections.append(
        "Below is a structured answer you can skim or read in full."
    )

    # Summary section
    if sections['summary']:
        summary = re.sub(r'^\d+\.\s*', '• ', sections['summary'], flags=re.MULTILINE)
        response_sections.append(f"\n SUMMARY: \n{summary.strip()}")

    # Details section
    if sections['details']:
        details = re.sub(r'^\d+\.\s*', '• ', sections['details'], flags=re.MULTILINE)
        response_sections.append(f"\n DETAILS: \n{details.strip()}")

    # Actions section
    if sections['actions']:
        actions = re.sub(r'^\d+\.\s*', '• ', sections['actions'], flags=re.MULTILINE)
        response_sections.append(f"\n NEXT STEPS: \n{actions.strip()}")

    # Costs section
    if sections['costs']:
        costs = re.sub(r'^\d+\.\s*', '• ', sections['costs'], flags=re.MULTILINE)
        response_sections.append(f"\n COSTS: \n{costs.strip()}")

    # Source section
    if sections['source']:
        response_sections.append(f"\n SOURCE: \n{sections['source'].strip()}")

    response_sections.append(
        "\n_Reply with a follow-up if you want more detail on any section._"
    )

    full_response = "\n".join(response_sections).strip()
    return _truncate_preserving_paragraphs(full_response, 4200)


def _build_swahili_response(sections: dict) -> str:
    """Build Swahili response with clear section spacing."""
    response_sections: List[str] = []

    response_sections.append(
        "Hapa kuna jibu lililopangwa kwa urahisi wa kusoma."
    )

    if sections['summary']:
        summary = re.sub(r'^\d+\.\s*', '• ', sections['summary'], flags=re.MULTILINE)
        response_sections.append(f"\n MUHTASARI: \n{summary.strip()}")

    if sections['details']:
        details = re.sub(r'^\d+\.\s*', '• ', sections['details'], flags=re.MULTILINE)
        response_sections.append(f"\n MAELEZO: \n{details.strip()}")

    if sections['actions']:
        actions = re.sub(r'^\d+\.\s*', '• ', sections['actions'], flags=re.MULTILINE)
        response_sections.append(f"\n HATUA: \n{actions.strip()}")

    if sections['costs']:
        costs = re.sub(r'^\d+\.\s*', '• ', sections['costs'], flags=re.MULTILINE)
        response_sections.append(f"\n GHARAMA: \n{costs.strip()}")

    if sections['source']:
        response_sections.append(f"\n CHANZO: \n{sections['source'].strip()}")

    response_sections.append(
        "\n_Jibu tena ikiwa ungependa maelezo zaidi kuhusu sehemu yoyote._"
    )

    full_response = "\n".join(response_sections).strip()
    return _truncate_preserving_paragraphs(full_response, 4200)
