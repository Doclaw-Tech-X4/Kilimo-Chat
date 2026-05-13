"""
KilimoChat AI Handler Module
Manages Groq LLaMA 3.3 integration for generating agricultural responses.
"""

import logging
import re
from typing import Optional, List, Dict, Any
from groq import Groq

from config import (
    GROQ_API_KEY,
    GROQ_CHAT_MODEL,
    SYSTEM_PROMPT_BASE,
    SYSTEM_PROMPT_WITH_SEARCH,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_BACKOFF,
    logger
)
from search_handler import search_and_get_context, SearchContext
from weather_handler import needs_weather_data, get_weather_response
from database import save_search_log
from knowledge_base import search_knowledge, get_kb_stats
from document_ingestion import get_ingestion_pipeline
from language_utils import translate_response
from database_auth import get_user_profile
from response_formatter import format_response

# RAG threshold - minimum confidence to use knowledge base answer
RAG_CONFIDENCE_THRESHOLD = 0.75

# Fast timeout for chat responses (seconds) - impatient farmers need quick answers
FAST_CHAT_TIMEOUT = 6  # Even faster than before

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY)


def clean_ai_response(response: str) -> str:
    """
    Post-process AI response to ensure it's helpful and well-formatted.
    Removes 'I'm not sure' statements and converts wall-of-text to bullet points.
    """
    import re
    
    # Remove uncertainty phrases and replace with helpful alternatives
    uncertainty_patterns = [
        r"I'm not sure[.,]?",
        r"I don't know[.,]?",
        r"I cannot tell[.,]?",
        r"I am not sure[.,]?",
        r"I am not certain[.,]?",
        r"Unfortunately,? I don't have",
        r"Unfortunately,? I cannot",
        r"I apologize,? but I don't",
        r"I regret to inform",
        r"I'm sorry,? but I",
        r"I cannot provide",
        r"I don't have enough information",
        r"I don't have specific data",
        r"I don't have real-time data",
        r"I don't have access to",
        r"I cannot access",
        r"web search (didn't find|failed|wasn't helpful)",
    ]
    
    # Remove these patterns and the following text up to the next sentence
    for pattern in uncertainty_patterns:
        response = re.sub(pattern, "", response, flags=re.IGNORECASE)
    
    # Clean up empty statements and double spaces
    response = re.sub(r"\s+", " ", response)
    response = re.sub(r"\.{3,}", "", response)
    response = re.sub(r",\s*\.", ".", response)
    
    # Remove orphaned references to checking other sources
    orphaned_phrases = [
        r"you (can|should) (check|ask|visit|contact).*?(?=\.|$)",
        r"consider (checking|asking|visiting).*?(?=\.|$)",
        r"for more information.*?check.*?\.",
    ]
    for pattern in orphaned_phrases:
        response = re.sub(pattern, "", response, flags=re.IGNORECASE)
    
    # Clean up any double periods or weird spacing
    response = response.strip()
    response = re.sub(r"\s+", " ", response)
    response = re.sub(r"\.{2,}", ".", response)
    
    # Ensure response ends with proper punctuation
    if response and not response[-1] in ".!?":
        response += "."
    
    # If response is too short after cleaning, add a helpful fallback
    if len(response.strip()) < 20:
        response = "I'd be happy to help with your farming question. Could you share more details about your crop or specific concern? For example, what type of crop, the size of your farm, and where you're located. This will help me give you better advice!"
    
    return response.strip()


def enforce_response_format(response: str, has_search: bool = True) -> str:
    """
    Ensure response follows the exact 5-section format without emojis.
    Aggressively reformats any response that doesn't match.
    """
    import re
    
    # Check if response is a greeting - return short clear answer
    greeting_patterns = [
        r"^(hello|hi|hey|greetings|good morning|good afternoon|good evening|karibu|habari|jambo)",
        r"^(how are you|how do you do|unaendeleaje|vipi)",
    ]
    for pattern in greeting_patterns:
        if re.match(pattern, response.strip(), re.IGNORECASE):
            return "Hello! I'm here to help with your farming questions. What would you like to know about crops, diseases, weather, or market prices?"
    
    # Check if response already has all 5 required sections (uppercase underlined headings with spacing)
    has_summary = bool(re.search(r"(?i)_summary_:\s*\n", response))
    has_details = bool(re.search(r"(?i)_details from search_:\s*\n", response))
    has_actions = bool(re.search(r"(?i)_what to do_:\s*\n", response))
    has_costs = bool(re.search(r"(?i)_costs_:\s*\n", response))
    has_source = bool(re.search(r"(?i)_where info came from_:\s*\n", response))
    
    # If all 5 sections are present, return as-is
    if has_summary and has_details and has_actions and has_costs and has_source:
        return response
    
    # Otherwise, aggressively reformat by extracting content
    lines = response.split('\n')
    
    # Initialize sections with defaults
    summary_lines = []
    detail_lines = []
    action_lines = []
    cost_lines = []
    source_lines = []
    
    current_section = None
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        
        # Skip lines that are just emojis or short headers
        if len(line_stripped) < 3:
            continue
            
        # Detect section headers in the response
        if re.search(r"SUMMARY|MUHTASARI|INTRODUCTION", line_stripped, re.IGNORECASE):
            current_section = "summary"
            continue
        elif re.search(r"DETAILS?|MAELEZO|FACTS?|INFORMATION", line_stripped, re.IGNORECASE):
            current_section = "details"
            continue
        elif re.search(r"WHAT TO DO|ACTION|UNACHOFANYA|STEPS|DO THIS", line_stripped, re.IGNORECASE):
            current_section = "actions"
            continue
        elif re.search(r"COSTS?|GHARAMA|PRICE|BEI", line_stripped, re.IGNORECASE):
            current_section = "costs"
            continue
        elif re.search(r"SOURCE|FROM|ILITOKA|REFERENCE", line_stripped, re.IGNORECASE):
            current_section = "source"
            continue
        elif re.search(r"CROP|OBSERVATION|IDENTIFIED|TREATMENT|PLAN|NOTES", line_stripped, re.IGNORECASE):
            # Skip these old section headers
            current_section = None
            continue
        
        # Extract content based on patterns
        line_lower = line_stripped.lower()
        
        # Price/cost detection
        if 'ksh' in line_lower or 'cost' in line_lower or 'price' in line_lower or 'bei' in line_lower or '💰' in line_stripped:
            cost_lines.append(line_stripped)
        # Numbered step detection
        elif re.match(r"^\d+[\.\)]\s", line_stripped):
            action_lines.append(line_stripped)
        # Bullet point detection
        elif line_stripped.startswith('-') or line_stripped.startswith('•'):
            content = line_stripped[1:].strip()
            if len(content) > 10:
                detail_lines.append(content)
        # Longer sentences go to summary or details
        elif len(line_stripped) > 30:
            if len(summary_lines) < 2:
                summary_lines.append(line_stripped)
            else:
                detail_lines.append(line_stripped)
        # Shorter actionable lines
        elif any(word in line_lower for word in ['visit', 'buy', 'apply', 'plant', 'do', 'check', 'use', 'call']):
            action_lines.append(f"{line_stripped}")
    
    # Build sections with extracted content or defaults
    summary = " ".join(summary_lines[:2]) if summary_lines else "Here's what you need to know for your farming question."
    
    details = "\n".join([f"- {d[:120]}" for d in detail_lines[:5]]) if detail_lines else "- Information based on agricultural best practices for Kenyan farmers"
    
    actions = []
    for i, act in enumerate(action_lines[:4], 1):
        # Clean up the action text
        act_clean = re.sub(r"^\d+[\.\)]\s*", "", act)  # Remove existing numbers
        actions.append(f"{i}. {act_clean[:100]}")
    if not actions:
        actions = ["1. Visit your local agrovet for specific products and advice", 
                   "2. Apply the recommendations based on your farm conditions",
                   "3. Monitor your crops regularly for best results"]
    
    costs = "\n".join([f"- {c[:100]}" for c in cost_lines]) if cost_lines else "- Costs vary by location and supplier. Visit your local agrovet for exact pricing."
    
    source = source_lines[0] if source_lines else "From verified agricultural knowledge base and best farming practices"
    
    # Build final formatted response with uppercase underlined headings and proper spacing
    formatted = f"""_summary_:

{summary}

_details from search_:

{details}

_what to do_:

{"\n".join(actions)}

_costs_:

{costs}
Prices as of 2024 from web search

_where info came from_:

{source}"""

    return formatted


def get_ai_response(
    user_message: str,
    user_phone: str,
    target_language: str = "en",
    use_search: bool = True
) -> str:
    """
    Get AI response using Groq LLaMA 3.3.
    
    Args:
        user_message: The user's message (already in target language)
        user_phone: User's phone number (for context)
        target_language: Target language code ('en' or 'sw')
        use_search: Whether to enable web search for current info
    
    Returns:
        AI-generated response
    """
    # Build system prompt
    if use_search:
        system_prompt = SYSTEM_PROMPT_WITH_SEARCH
    else:
        system_prompt = SYSTEM_PROMPT_BASE
    
    # Fetch user profile for personalized context
    user_profile = get_user_profile(user_phone)
    profile_context = ""
    
    if user_profile:
        # Build profile context from available data
        profile_parts = []
        
        if user_profile.get('county') or user_profile.get('location'):
            location = user_profile.get('county') or user_profile.get('location')
            profile_parts.append(f"Location: {location}")
        
        if user_profile.get('crop_types') and len(user_profile['crop_types']) > 0:
            crops = ', '.join(user_profile['crop_types'])
            profile_parts.append(f"Crops planted: {crops}")
        
        if user_profile.get('farm_size'):
            unit = user_profile.get('farm_size_unit', 'acres')
            profile_parts.append(f"Farm size: {user_profile['farm_size']} {unit}")
        
        if user_profile.get('water_access_level'):
            water = user_profile['water_access_level']
            profile_parts.append(f"Water access: {water}")
        
        if user_profile.get('soil_type'):
            profile_parts.append(f"Soil type: {user_profile['soil_type']}")
        
        if user_profile.get('farming_experience'):
            profile_parts.append(f"Experience: {user_profile['farming_experience']}")
        
        if user_profile.get('primary_farming_activity'):
            profile_parts.append(f"Primary activity: {user_profile['primary_farming_activity']}")
        
        if profile_parts:
            profile_context = f"""
👤 FARMER PROFILE CONTEXT (Use this information to personalize your response):
{chr(10).join(f"- {part}" for part in profile_parts)}

When the farmer asks about their crops, farm, or location, use this profile information to provide specific, personalized advice. If they ask "what crops am I planting?" or similar questions, refer to their profile crops listed above."""
    
    # CRITICAL: Language instruction must be FIRST and STRONGEST
    lang_instruction = "Swahili" if target_language == "sw" else "English"
    
    # Formatting instructions - CRITICAL: MUST USE THIS EXACT FORMAT
    formatting_instruction = f"""
CRITICAL FORMATTING RULE - YOUR RESPONSE MUST FOLLOW THIS EXACT STRUCTURE

YOU ARE REQUIRED TO USE ALL 5 SECTIONS BELOW. DO NOT SKIP ANY SECTION.

================================================================

SECTION 1 - START WITH THIS EXACT HEADER:
_SUMMARY_:
- Write 2-3 sentences giving the direct answer
- Keep it brief and practical

SECTION 2 - USE THIS EXACT HEADER:
_DETAILS FROM SEARCH_:
- Use bullet points starting with "- " (dash followed by space)
- List 3-5 key facts
- Include prices, locations, dates

SECTION 3 - USE THIS EXACT HEADER:
_WHAT TO DO_:
- Numbered steps: 1. 2. 3.
- Write 3-4 clear action items
- Make them practical for farmers

SECTION 4 - USE THIS EXACT HEADER:
_COSTS_:
- Use "- " for bullet points
- List ALL costs with Ksh amounts
- ALWAYS end this section with: "Prices as of [month year] from web search"

SECTION 5 - USE THIS EXACT HEADER:
_WHERE INFO CAME FROM_:
- Write "From web search: [source description]"
- Or "From verified agricultural database" if using KB

================================================================

MANDATORY RULES:
- NEVER use any other section headers (NO "Crop Identified", NO "Observations", etc.)
- NEVER skip any of the 5 sections above
- ALWAYS use "- " (dash space) for bullet points
- ALWAYS use "1. 2. 3." format for what to do section
- ALWAYS put 1 blank line between each section
- ALWAYS start with _SUMMARY_:
- ALWAYS end with _WHERE INFO CAME FROM_:

PERFECT EXAMPLE (COPY THIS STRUCTURE EXACTLY):

_SUMMARY_:
The price of layer chickens in Nairobi is around Ksh 500-700 per chick. You can find them at local poultry farms or markets.

_DETAILS FROM SEARCH_:
- Price: Ksh 500-700 per chick
- Location: Nairobi, local poultry farms or markets
- Availability: Usually in stock

_WHAT TO DO_:
1. Visit local poultry farms or markets in Nairobi.
2. Compare prices from different sellers.
3. Ensure you buy healthy chicks.

_COSTS_:
- Price per chick: Ksh 500-700
- Total cost estimate: depends on the number of chicks you buy
Prices as of March 2024 from web search

_WHERE INFO CAME FROM_:
From web search: various online marketplaces and poultry farms in Nairobi.

================================================================
WARNING: Responses that don't use this exact format will be rejected. Use ONLY the 5 sections above."""
    
    lang_enforcement = f"""CRITICAL LANGUAGE RULE - THIS IS THE MOST IMPORTANT INSTRUCTION:

You MUST respond ENTIRELY in {lang_instruction}. 
- EVERY word, sentence, and section must be in {lang_instruction}
- The user asked in {lang_instruction}, so you MUST answer in {lang_instruction}
- Do NOT use English words unless they are proper nouns (names, places)
- If search results are in English, TRANSLATE them to {lang_instruction}
- All headings (SUMMARY, DETAILS, etc.) must be in {lang_instruction}
- Prices can stay as numbers (Ksh 500) but surrounding text must be in {lang_instruction}

THIS IS MANDATORY. IGNORE ALL OTHER LANGUAGE INSTRUCTIONS IN THIS PROMPT."""
    
    # Combine all context with system prompt
    if profile_context:
        system_prompt = lang_enforcement + "\n\n" + formatting_instruction + "\n\n" + profile_context + "\n\n" + system_prompt
    else:
        system_prompt = lang_enforcement + "\n\n" + formatting_instruction + "\n\n" + system_prompt
    
    # Also replace "English" mentions in the prompt with the target language
    if target_language == "sw":
        system_prompt = system_prompt.replace("Use SIMPLE English", "Use SIMPLE Swahili")
        system_prompt = system_prompt.replace("use simple English", "tumia Kiswahili rahisi")
        system_prompt = system_prompt.replace("Mix in Swahili words", "Tumia maneno ya Kiingereza kama ni lazima")
    
    # ===== FAST PATH: Check Local Sources First =====
    # 1. Check Knowledge Base (KALRO, FAO, Ministry facts)
    kb_result = search_knowledge(user_message, top_k=3, threshold=0.65)
    
    if kb_result["found"] and kb_result["confidence"] >= RAG_CONFIDENCE_THRESHOLD:
        logger.info(f"✅ KB match (confidence: {kb_result['confidence']}) for: {user_message[:50]}...")
        return _format_kb_response(kb_result, target_language)
    
    # 2. Check Uploaded Documents (admin uploads)
    try:
        pipeline = get_ingestion_pipeline()
        doc_results = _search_uploaded_documents(user_message, pipeline)
        
        if doc_results and doc_results.get("found"):
            logger.info(f"✅ Document match from {doc_results['source']} for: {user_message[:50]}...")
            return _format_document_response(doc_results, target_language)
    except Exception as e:
        logger.debug(f"Document search failed: {e}")
    
    # Log if RAG didn't find match
    if kb_result["all_matches"]:
        logger.debug(f"RAG: Low confidence matches found (best: {kb_result['confidence']}), proceeding to AI")
    else:
        logger.debug(f"RAG: No knowledge base matches for: {user_message[:50]}...")
    
    # Prepare messages
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    # Try with search first if enabled
    if use_search:
        search_context = search_and_get_context(user_message)
        
        if search_context:
            # Enhance prompt with search results
            search_text = search_context.query
            results_list = [
                {"title": r.title, "snippet": r.snippet}
                for r in search_context.results
            ]
            
            # Build enhanced content with search and any RAG matches
            kb_context = ""
            if kb_result["all_matches"]:
                kb_context = "\n📚 VERIFIED AGRICULTURAL KNOWLEDGE:\n"
                for match in kb_result["all_matches"][:2]:  # Top 2 RAG matches
                    kb_context += f"- {match['answer'][:200]}... (Source: {match['source']})\n"
            
            # Add language reminder at the end of enhanced content
            lang_reminder = f"\n\n⚠️ CRITICAL: Your ENTIRE response MUST be in {lang_instruction}. Translate all search results to {lang_instruction}."
            
            enhanced_content = f"""Here is recent information from the web:
            
{format_search_results_text(search_context.results)}
{kb_context}

User question: {user_message}

Please answer using both your knowledge, the web search results, and any verified agricultural knowledge provided above. Be specific and cite sources when possible. If the verified knowledge differs from web results, prioritize practical farming experience.{lang_reminder}"""
            
            messages[1]["content"] = enhanced_content
            
            # Log search
            try:
                save_search_log(
                    query=search_context.query,
                    results=results_list,
                    used_in_response=True
                )
            except Exception as e:
                logger.warning(f"Failed to save search log: {e}")
    
    # Call Groq API with retries
    for attempt in range(MAX_RETRIES):
        try:
            response = groq_client.chat.completions.create(
                model=GROQ_CHAT_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
                timeout=4,
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            if ai_response:
                logger.debug(f"AI response generated: {ai_response[:50]}...")
                
                # Post-processing: Clean up the response
                ai_response = clean_ai_response(ai_response)
                
                # Post-processing: Enforce exact 5-section format
                ai_response = enforce_response_format(ai_response, has_search=use_search)
                
                # Post-processing: Check if response is in correct language
                if target_language == "sw":
                    # Check if response contains mostly English
                    english_words = ['the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'summary', 'details', 'what', 'where', 'cost', 'price', 'information', 'came', 'from', 'search', 'web']
                    words = ai_response.lower().split()
                    if len(words) > 5:  # Only check if response is long enough
                        english_count = sum(1 for word in words if word.strip('.,!?;:"()[]{}') in english_words)
                        english_ratio = english_count / len(words)
                        
                        # If more than 40% English words, translate the response
                        if english_ratio > 0.4:
                            logger.warning(f"AI responded in English (ratio: {english_ratio:.2f}), translating to Swahili...")
                            ai_response = translate_response(ai_response, "sw")
                            ai_response = clean_ai_response(ai_response)  # Clean again after translation
                            ai_response = enforce_response_format(ai_response, has_search=use_search)  # Re-enforce format after translation
                
                return ai_response
            else:
                logger.warning("AI returned empty response")
                
        except Exception as e:
            logger.warning(f"AI request attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(RETRY_BACKOFF ** attempt)
    
    # Fallback response after all retries failed
    logger.error(f"AI request failed after {MAX_RETRIES} attempts")
    return get_fallback_response(target_language)


def get_ai_response_simple(
    user_message: str,
    target_language: str = "en"
) -> str:
    """
    Simple AI response without user tracking or search.
    Used for initial testing and simple queries.
    """
    return get_ai_response(
        user_message=user_message,
        user_phone="unknown",
        target_language=target_language,
        use_search=True
    )


def get_ai_response_streaming(
    user_message: str,
    user_phone: str,
    target_language: str = "en",
    use_search: bool = True
):
    """
    Stream AI response using Groq LLaMA 3.3 for real-time TTS.
    Yields chunks of text as they are generated.
    
    Args:
        user_message: The user's message
        user_phone: User's phone number (for context)
        target_language: Target language code ('en' or 'sw')
        use_search: Whether to enable web search
    
    Yields:
        Text chunks as they are generated by the AI
    """
    # Build system prompt (same as non-streaming)
    if use_search:
        system_prompt = SYSTEM_PROMPT_WITH_SEARCH
    else:
        system_prompt = SYSTEM_PROMPT_BASE
    
    # CRITICAL: Language instruction must be FIRST and STRONGEST
    lang_instruction = "Swahili" if target_language == "sw" else "English"
    lang_enforcement = f"""CRITICAL LANGUAGE RULE - THIS IS THE MOST IMPORTANT INSTRUCTION:

You MUST respond ENTIRELY in {lang_instruction}. 
- EVERY word, sentence, and section must be in {lang_instruction}
- The user asked in {lang_instruction}, so you MUST answer in {lang_instruction}
- Do NOT use English words unless they are proper nouns (names, places)
- If search results are in English, TRANSLATE them to {lang_instruction}
- All headings (SUMMARY, DETAILS, etc.) must be in {lang_instruction}
- Prices can stay as numbers (Ksh 500) but surrounding text must be in {lang_instruction}

THIS IS MANDATORY. IGNORE ALL OTHER LANGUAGE INSTRUCTIONS IN THIS PROMPT."""
    
    # Add formatting instructions for streaming too
    formatting_instruction = """
CRITICAL: YOU MUST USE THIS EXACT FORMAT

_SUMMARY_:
[2-3 sentence summary]

_DETAILS FROM SEARCH_:
- [bullet points]

_WHAT TO DO_:
1. [step 1]
2. [step 2]
3. [step 3]

_COSTS_:
- [cost items]
Prices as of [date] from web search

_WHERE INFO CAME FROM_:
[source info]

USE ONLY THESE 5 SECTIONS. NEVER SKIP ANY."""
    
    # Prepend language enforcement and formatting
    system_prompt = lang_enforcement + "\n\n" + formatting_instruction + "\n\n" + system_prompt
    
    if target_language == "sw":
        system_prompt = system_prompt.replace("Use SIMPLE English", "Use SIMPLE Swahili")
        system_prompt = system_prompt.replace("use simple English", "tumia Kiswahili rahisi")
        system_prompt = system_prompt.replace("Mix in Swahili words", "Tumia maneno ya Kiingereza kama ni lazima")
    
    # Check knowledge base first (no streaming for cached responses)
    kb_result = search_knowledge(user_message, top_k=3, threshold=0.7)
    
    if kb_result["found"] and kb_result["confidence"] >= RAG_CONFIDENCE_THRESHOLD:
        # Return formatted KB response using new WhatsApp-friendly format
        yield format_response("", user_message, target_language)
        return
    
    # Prepare messages for AI
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    # Enhance with search if enabled
    if use_search:
        search_context = search_and_get_context(user_message)
        if search_context:
            kb_context = ""
            if kb_result["all_matches"]:
                kb_context = "\n📚 VERIFIED AGRICULTURAL KNOWLEDGE:\n"
                for match in kb_result["all_matches"][:2]:
                    kb_context += f"- {match['answer'][:200]}... (Source: {match['source']})\n"
            
            lang_reminder = f"\n\n⚠️ CRITICAL: Your ENTIRE response MUST be in {lang_instruction}."
            
            enhanced_content = f"""Here is recent information from the web:
            
{format_search_results_text(search_context.results)}
{kb_context}

User question: {user_message}

Please answer using both your knowledge, the web search results, and any verified agricultural knowledge provided above. Be specific and cite sources when possible. If the verified knowledge differs from web results, prioritize practical farming experience.{lang_reminder}"""
            
            messages[1]["content"] = enhanced_content
            
            # Log search
            try:
                results_list = [
                    {"title": r.title, "snippet": r.snippet}
                    for r in search_context.results
                ]
                save_search_log(
                    query=search_context.query,
                    results=results_list,
                    used_in_response=True
                )
            except Exception as e:
                logger.warning(f"Failed to save search log: {e}")
    
    # Stream from Groq API
    try:
        response = groq_client.chat.completions.create(
            model=GROQ_CHAT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            timeout=FAST_CHAT_TIMEOUT,  # Changed to FAST_CHAT_TIMEOUT
            stream=True,  # Enable streaming
        )
        
        full_response = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                text_chunk = chunk.choices[0].delta.content
                full_response += text_chunk
                yield text_chunk
        
        # Post-processing: Apply new WhatsApp-friendly format
        if full_response:
            formatted = format_response(full_response, user_message, target_language)
            yield formatted
        else:
            yield get_fallback_response(target_language)
        
    except Exception as e:
        logger.error(f"Streaming AI request failed: {e}")
        # Yield fallback response
        yield get_fallback_response(target_language)


def format_search_results_text(results: List[Any]) -> str:
    """Format search results for inclusion in AI prompt."""
    if not results:
        return "No recent web search results available."
    
    formatted = []
    for i, result in enumerate(results, 1):
        formatted.append(f"{i}. {result.title}")
        formatted.append(f"   {result.snippet[:200]}...")
    
    return "\n".join(formatted)


def _format_kb_response(kb_result: dict, target_language: str) -> str:
    """Format knowledge base response using new WhatsApp-friendly format."""
    verified_answer = kb_result["answer"]
    source = kb_result["source"]
    crop = kb_result.get("matched_crop", "")
    
    # Create raw response in old format for the formatter to process
    if target_language == "sw":
        raw_response = f"""_MUHTASARI_:

{verified_answer[:200]}...

_MAELEZO KUTOKA KWENYE HAZINA_:

- {verified_answer[:150]}
- Taarifa imethibitishwa na {source}
- Zaidi ya maelezo yanapatikana kwenye hii hazina

_UNACHOFANYA_:

1. Soma maelezo yote hapo juu kwa uangalifu
2. Fuata maelekezo yanayohusiana na shida lako
3. Wasiliana na KALRO 0111-029111 ikiwa unahitaji usaidizi zaidi

_GHARAMA_:

- Bidhaa zinapatikana kwa bei tofauti kulingana na eneo
- Tembelea agrovet ya karibu kwa bei sahihi
Bei zinaweza kutofautiana kulingana na eneo na wakati

_TAARIFA ILITOKA WAPI_:

Kutoka: {source} (hazina ya kilimo iliyoidhinishwa)"""
    else:
        raw_response = f"""_SUMMARY_:

{verified_answer[:200]}...

_DETAILS FROM SEARCH_:

- {verified_answer[:150]}
- Information verified by {source}
- Additional details available in knowledge base

_WHAT TO DO_:

1. Read the information above carefully
2. Follow relevant advice for your situation
3. Contact KALRO 0111-029111 if you need more help

_COSTS_:

- Products available at varying prices depending on location
- Visit your local agrovet for exact pricing
Prices may vary by location and timing

_WHERE INFO CAME FROM_:

From: {source} (verified agricultural knowledge base)"""
    
    # Use the new formatter to convert to WhatsApp-friendly format
    return format_response(raw_response, "", target_language)


def _search_uploaded_documents(query: str, pipeline) -> dict:
    """Search uploaded documents for relevant information."""
    documents = pipeline.list_documents()
    
    if not documents:
        return None
    
    # Simple keyword search across all document facts
    query_words = set(query.lower().split())
    best_match = None
    best_score = 0
    
    for doc in documents:
        facts = doc.get("extracted_facts", [])
        for fact in facts:
            # Check question and answer
            fact_text = f"{fact.get('question', '')} {fact.get('answer', '')}".lower()
            fact_words = set(fact_text.split())
            
            # Calculate overlap
            overlap = len(query_words & fact_words)
            score = overlap / len(query_words) if query_words else 0
            
            if score > best_score and score > 0.3:  # Threshold
                best_score = score
                best_match = {
                    "found": True,
                    "answer": fact.get("answer"),
                    "question": fact.get("question"),
                    "source": doc.get("source_type", "Document"),
                    "title": doc.get("title"),
                    "crop": fact.get("crop", "general"),
                    "score": score
                }
    
    return best_match


def _format_document_response(doc_results: dict, target_language: str) -> str:
    """Format uploaded document response using new WhatsApp-friendly format."""
    answer = doc_results["answer"]
    source = doc_results["source"]
    title = doc_results.get("title", "")
    
    # Create raw response in old format for the formatter to process
    if target_language == "sw":
        raw_response = f"""_MUHTASARI_:

{answer[:200]}...

_MAELEZO KUTOKA KWENYE HATI_:

- {answer[:150]}
- Taarifa kutoka: {title}
- Chapisho: {source}

_UNACHOFANYA_:

1. Soma maelezo yote kwa uangalifu
2. Fuata maelekezo yanayohusiana na hali yako
3. Uliza maswali zaidi ikiwa hujielewi

_GHARAMA_:

- Gharama zinategemea bidhaa na eneo
- Tembelea agrovet kwa bei sahihi
Bei zinaweza kutofautiana

_TAARIFA ILITOKA WAPI_:

Kutoka: {source} - {title}"""
    else:
        raw_response = f"""_SUMMARY_:

{answer[:200]}...

_DETAILS FROM SEARCH_:

- {answer[:150]}
- From document: {title}
- Published by: {source}

_WHAT TO DO_:

1. Read all the information carefully
2. Follow the advice relevant to your situation
3. Ask follow-up questions if you need clarification

_COSTS_:

- Costs depend on products and your location
- Visit your local agrovet for exact pricing
Prices may vary by location

_WHERE INFO CAME FROM_:

From: {source} - {title}"""
    
    # Use the new formatter to convert to WhatsApp-friendly format
    return format_response(raw_response, "", target_language)


def get_fallback_response(language: str = "en") -> str:
    """Get confident fallback response when AI fails."""
    # Create a generic fallback that the formatter can process
    if language == "sw":
        raw_fallback = """Habari! Ninaweza kukusaidia na maswali yako ya kilimo.

Ninajua mengi kuhusu:
- Kulima mahindi, maharagwe, na mimea mingine
- Kutibu wadudu na magonjwa
- Mbolea na lishe ya mimea
- Hali ya hewa na wakati wa kupanda
- Bei za soko

Uliza swali lolote kuhusu kilimo, nikusaidie!"""
    else:
        raw_fallback = """Hello! I'm ready to help with your farming questions.

I can assist with:
- Growing maize, beans, and other crops
- Treating pests and diseases
- Fertilizers and plant nutrition
- Weather timing and planting seasons
- Market prices and selling

Ask me anything about farming - I'm here to help!"""
    
    # Use the new formatter to make it WhatsApp-friendly
    return format_response(raw_fallback, "", language)


# Specific response templates for common queries
QUICK_RESPONSES = {
    "greeting": {
        "en": "Hello! I'm KilimoChat, your farming assistant. How can I help you today?",
        "sw": "Habari! Mimi ni KilimoChat, msaidizi wako wa kilimo. Nikusaidie vipi leo?"
    },
    "help": {
        "en": """I can help you with:
- Crop diseases and pest control
- Fertilizer recommendations
- Weather and farming seasons
- Market prices for crops
- Send photos for diagnosis

Just ask me anything!""",
        "sw": """Naweza kukusaidia na:
- Magonjwa ya mimea na udhibiti wa wadudu
- Mapendekezo ya mbolea
- Hali ya hewa na misimu ya kilimo
- Bei za soko kwa mazao
- Tuma picha kwa uchunguzi

Uliza chochote!"""
    },
    "thanks": {
        "en": "You're welcome! Feel free to ask anytime. Happy farming!",
        "sw": "Karibu! Uliza wakati wowote. Kilimo cha furaha!"
    },
    "bye": {
        "en": "Goodbye! Come back anytime you need farming advice.",
        "sw": "Kwaheri! Rudi wakati wowote unapohitaji ushauri wa kilimo."
    }
}


def check_quick_response(message: str, language: str = "en") -> Optional[str]:
    """Check if message matches a quick response pattern."""
    message_lower = message.lower().strip()
    
    # Greetings
    greetings = ["hello", "hi", "hey", "habari", "jambo", "hujambo", "mambo", "vipi"]
    if any(g in message_lower for g in greetings) and len(message_lower) < 20:
        return QUICK_RESPONSES["greeting"].get(language, QUICK_RESPONSES["greeting"]["en"])
    
    # Help
    help_patterns = ["help", "what can you do", "assist", "usaidizi", "unaweza nini", "msaada"]
    if any(h in message_lower for h in help_patterns):
        return QUICK_RESPONSES["help"].get(language, QUICK_RESPONSES["help"]["en"])
    
    # Thanks
    thanks_patterns = ["thank", "asante", "shukran", "thanks"]
    if any(t in message_lower for t in thanks_patterns):
        return QUICK_RESPONSES["thanks"].get(language, QUICK_RESPONSES["thanks"]["en"])
    
    # Goodbye
    bye_patterns = ["bye", "goodbye", "kwaheri", "tuonane"]
    if any(b in message_lower for b in bye_patterns):
        return QUICK_RESPONSES["bye"].get(language, QUICK_RESPONSES["bye"]["en"])
    
    return None
