"""
KilimoChat AI Handler Module
Manages Groq LLaMA 3.3 integration for generating agricultural responses.
"""

import logging
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

# RAG threshold - minimum confidence to use knowledge base answer
RAG_CONFIDENCE_THRESHOLD = 0.75

# Fast timeout for chat responses (seconds) - impatient farmers need quick answers
FAST_CHAT_TIMEOUT = 6  # Even faster than before

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY)


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
    
    # CRITICAL: Language instruction must be FIRST and STRONGEST
    lang_instruction = "Swahili" if target_language == "sw" else "English"
    lang_enforcement = f"""⚠️ CRITICAL LANGUAGE RULE - THIS IS THE MOST IMPORTANT INSTRUCTION:

You MUST respond ENTIRELY in {lang_instruction}. 
- EVERY word, sentence, and section must be in {lang_instruction}
- The user asked in {lang_instruction}, so you MUST answer in {lang_instruction}
- Do NOT use English words unless they are proper nouns (names, places)
- If search results are in English, TRANSLATE them to {lang_instruction}
- All headings (SUMMARY, DETAILS, etc.) must be in {lang_instruction}
- Prices can stay as numbers (Ksh 500) but surrounding text must be in {lang_instruction}

THIS IS MANDATORY. IGNORE ALL OTHER LANGUAGE INSTRUCTIONS IN THIS PROMPT."""
    
    # Prepend language enforcement to make it the first/highest priority instruction
    system_prompt = lang_enforcement + "\n\n" + system_prompt
    
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
    lang_enforcement = f"""⚠️ CRITICAL LANGUAGE RULE - THIS IS THE MOST IMPORTANT INSTRUCTION:

You MUST respond ENTIRELY in {lang_instruction}. 
- EVERY word, sentence, and section must be in {lang_instruction}
- The user asked in {lang_instruction}, so you MUST answer in {lang_instruction}
- Do NOT use English words unless they are proper nouns (names, places)
- If search results are in English, TRANSLATE them to {lang_instruction}
- All headings (SUMMARY, DETAILS, etc.) must be in {lang_instruction}
- Prices can stay as numbers (Ksh 500) but surrounding text must be in {lang_instruction}

THIS IS MANDATORY. IGNORE ALL OTHER LANGUAGE INSTRUCTIONS IN THIS PROMPT."""
    
    # Prepend language enforcement
    system_prompt = lang_enforcement + "\n\n" + system_prompt
    
    if target_language == "sw":
        system_prompt = system_prompt.replace("Use SIMPLE English", "Use SIMPLE Swahili")
        system_prompt = system_prompt.replace("use simple English", "tumia Kiswahili rahisi")
        system_prompt = system_prompt.replace("Mix in Swahili words", "Tumia maneno ya Kiingereza kama ni lazima")
    
    # Check knowledge base first (no streaming for cached responses)
    kb_result = search_knowledge(user_message, top_k=3, threshold=0.7)
    
    if kb_result["found"] and kb_result["confidence"] >= RAG_CONFIDENCE_THRESHOLD:
        # Return cached response immediately (no streaming needed for KB hits)
        verified_answer = kb_result["answer"]
        source = kb_result["source"]
        crop = kb_result.get("matched_crop", "")
        
        # Translate if needed
        if target_language == "sw":
            verified_answer = translate_response(verified_answer, "sw")
            source_label = "Kutoka"
            verified_label = "info iliyoidhinishwa"
            for_label = "Kwa"
        else:
            source_label = "From"
            verified_label = "verified info"
            for_label = "For"
        
        rag_response = f"""{verified_answer}

📚 {source_label}: {source} ({verified_label})
🌾 {for_label}: {crop.capitalize() if crop else 'General farming'}"""
        
        yield rag_response
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
        
        # Post-processing: Check if response needs translation
        if target_language == "sw" and full_response:
            english_words = ['the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'summary', 'details', 'what', 'where', 'cost', 'price', 'information', 'came', 'from', 'search', 'web']
            words = full_response.lower().split()
            if len(words) > 5:
                english_count = sum(1 for word in words if word.strip('.,!?;:"()[]{}') in english_words)
                english_ratio = english_count / len(words)
                
                if english_ratio > 0.4:
                    logger.warning(f"AI responded in English (ratio: {english_ratio:.2f}), suggesting client-side translation")
                    # Note: We can't re-stream translated content, but we signal it
                    yield "\n\n[Note: Response may need translation to Swahili]"
        
        logger.debug(f"Streaming AI response completed: {full_response[:50]}...")
        
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
    """Format knowledge base response for user."""
    verified_answer = kb_result["answer"]
    source = kb_result["source"]
    crop = kb_result.get("matched_crop", "")
    
    # Translate if needed
    if target_language == "sw":
        verified_answer = translate_response(verified_answer, "sw")
        response = f"""{verified_answer}

📚 Kutoka: {source} (info iliyoidhinishwa)
🌾 Kwa: {crop.capitalize() if crop else 'Mkulima'}"""
    else:
        response = f"""{verified_answer}

📚 From: {source} (verified info)
🌾 For: {crop.capitalize() if crop else 'Farmers'}"""
    
    return response


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
    """Format uploaded document response for user."""
    answer = doc_results["answer"]
    source = doc_results["source"]
    title = doc_results.get("title", "")
    
    if target_language == "sw":
        answer = translate_response(answer, "sw")
        response = f"""{answer}

📄 Kutoka: {source}
📖 Hati: {title}"""
    else:
        response = f"""{answer}

📄 From: {source}
📖 Document: {title}"""
    
    return response


def get_fallback_response(language: str = "en") -> str:
    """Get fallback response when AI fails."""
    if language == "sw":
        return """Samahani, nimekumbwa na shida kidogo. Tafadhali jaribu tena baadaye.

Kwa sasa, unaweza kuuliza maswali kuhusu:
- Ugonjwa wa mimea
- Mbolea na lishe ya udongo
- Hali ya hewa na mvua
- Bei za soko"""
    else:
        return """I'm sorry, I'm experiencing a technical issue right now. Please try again later.

In the meantime, you can ask about:
- Plant diseases and pests
- Fertilizers and soil nutrition
- Weather and rainfall
- Market prices"""


# Specific response templates for common queries
QUICK_RESPONSES = {
    "greeting": {
        "en": "Hello! I'm KilimoChat, your farming assistant. How can I help you today? 🌾",
        "sw": "Habari! Mimi ni KilimoChat, msaidizi wako wa kilimo. Nikusaidie vipi leo? 🌾"
    },
    "help": {
        "en": """I can help you with:
🌱 Crop diseases and pest control
🌾 Fertilizer recommendations
🌧️ Weather and farming seasons
💰 Market prices for crops
📸 Send photos for diagnosis

Just ask me anything!""",
        "sw": """Naweza kukusaidia na:
🌱 Magonjwa ya mimea na udhibiti wa wadudu
🌾 Mapendekezo ya mbolea
🌧️ Hali ya hewa na misimu ya kilimo
💰 Bei za soko kwa mazao
📸 Tuma picha kwa uchunguzi

Uliza chochote!"""
    },
    "thanks": {
        "en": "You're welcome! Feel free to ask anytime. Happy farming! 🚜",
        "sw": "Karibu! Uliza wakati wowote. Kilimo cha furaha! 🚜"
    },
    "bye": {
        "en": "Goodbye! Come back anytime you need farming advice. 🌾",
        "sw": "Kwaheri! Rudi wakati wowote unapohitaji ushauri wa kilimo. 🌾"
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
