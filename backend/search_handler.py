"""
KilimoChat Search Handler Module
Provides web search capability using DuckDuckGo (no API key required).
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from duckduckgo_search import DDGS

from config import (
    SEARCH_MAX_RESULTS,
    SEARCH_TIMEOUT,
    SEARCH_KEYWORDS,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_BACKOFF,
    logger
)


@dataclass
class SearchResult:
    """Data class for search results."""
    title: str
    snippet: str
    url: str


@dataclass
class SearchContext:
    """Data class for search context to be injected into AI prompts."""
    query: str
    results: List[SearchResult]
    used_in_response: bool = False


def needs_search(query: str) -> Tuple[bool, float]:
    """
    Analyze if a query needs current/real-time information.
    
    Args:
        query: User's query text
    
    Returns:
        Tuple of (needs_search: bool, confidence_score: float)
    """
    query_lower = query.lower()
    
    # Count matching keywords
    matches = sum(1 for keyword in SEARCH_KEYWORDS if keyword.lower() in query_lower)
    
    # Calculate confidence score (0 to 1)
    confidence = min(matches / 2, 1.0)  # 2+ matches = high confidence
    
    # High-confidence patterns
    high_confidence_patterns = [
        r"\bbei\s+(?:ya\s+)?(?:leo|sasa|hivi\s+sasa)\b",  # "bei ya leo", "bei sasa"
        r"\bmvua\s+(?:leo|kesho|wiki\s+hii)\b",  # "mvua leo", "mvua kesho"
        r"\bhali\s+ya\s+hewa\s+(?:leo|sasa)\b",  # "hali ya hewa leo"
        r"\bweather\s+(?:today|now|forecast)\b",
        r"\bprice\s+(?:today|now|current)\b",
        r"\bmarket\s+price\b",
        r"\bcurrent\s+(?:price|weather|update)\b",
    ]
    
    for pattern in high_confidence_patterns:
        if re.search(pattern, query_lower):
            confidence = 1.0
            break
    
    # Determine if search is needed
    needs_search = confidence >= 0.5
    
    logger.debug(f"Search analysis: needs={needs_search}, confidence={confidence:.2f}, query='{query[:50]}...'")
    
    return needs_search, confidence


def perform_search(query: str, max_results: int = SEARCH_MAX_RESULTS) -> List[SearchResult]:
    """
    Perform DuckDuckGo search.
    
    Args:
        query: Search query
        max_results: Maximum number of results to return
    
    Returns:
        List of SearchResult objects
    """
    results = []
    
    for attempt in range(MAX_RETRIES):
        try:
            with DDGS(timeout=SEARCH_TIMEOUT) as ddgs:
                # Perform text search
                search_results = ddgs.text(
                    keywords=query,
                    region="ke-ke",  # Kenya region
                    safesearch="moderate",
                    max_results=max_results * 2  # Get extra in case some fail
                )
                
                # Process results
                for r in search_results:
                    if len(results) >= max_results:
                        break
                    
                    result = SearchResult(
                        title=r.get("title", "").strip(),
                        snippet=r.get("body", "").strip(),
                        url=r.get("href", "").strip()
                    )
                    
                    # Filter out empty results
                    if result.title and result.snippet:
                        results.append(result)
                
                logger.info(f"Search completed: '{query[:50]}...' - Found {len(results)} results")
                return results
                
        except Exception as e:
            logger.warning(f"Search attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                import time
                time.sleep(RETRY_BACKOFF ** attempt)
            else:
                logger.error(f"Search failed after {MAX_RETRIES} attempts: {e}")
    
    return results


def format_search_results_for_prompt(results: List[SearchResult]) -> str:
    """
    Format search results for injection into AI prompt.
    
    Args:
        results: List of search results
    
    Returns:
        Formatted string for prompt context
    """
    if not results:
        return "No recent web search results available."
    
    formatted_parts = ["Recent web search results:"]
    
    for i, result in enumerate(results, 1):
        formatted_parts.append(f"\n{i}. {result.title}")
        formatted_parts.append(f"   {result.snippet[:200]}...")  # Truncate long snippets
    
    return "\n".join(formatted_parts)


def enhance_query_with_search_context(
    query: str,
    search_results: List[SearchResult]
) -> str:
    """
    Enhance user query with search context for AI processing.
    
    Args:
        query: Original user query
        search_results: Search results to provide context
    
    Returns:
        Enhanced prompt with search context
    """
    context = format_search_results_for_prompt(search_results)
    
    enhanced = f"""{context}

User question: {query}

Please answer the user's question using both your agricultural knowledge AND the recent web search results provided above. Be specific about current information from the search results."""
    
    return enhanced


def search_and_get_context(query: str) -> Optional[SearchContext]:
    """
    Full search pipeline: check if needed, perform search, format context.
    
    Args:
        query: User's query
    
    Returns:
        SearchContext if search was performed and successful, None otherwise
    """
    # Check if search is needed
    needs, confidence = needs_search(query)
    
    if not needs:
        logger.debug(f"Search not needed for query: '{query[:50]}...'")
        return None
    
    # Enhance query for better agricultural results
    enhanced_query = query
    
    # Add Kenyan context if not present
    if "kenya" not in query.lower():
        enhanced_query = f"{query} Kenya agriculture"
    
    # Perform search
    results = perform_search(enhanced_query)
    
    if not results:
        logger.warning(f"Search returned no results for: '{query[:50]}...'")
        return None
    
    return SearchContext(
        query=query,
        results=results,
        used_in_response=True
    )


def search_with_fallback(query: str) -> Tuple[Optional[str], bool]:
    """
    Search with graceful fallback.
    
    Args:
        query: User's query
    
    Returns:
        Tuple of (enhanced_prompt: Optional[str], search_succeeded: bool)
    """
    context = search_and_get_context(query)
    
    if context:
        enhanced = enhance_query_with_search_context(query, context.results)
        return enhanced, True
    
    return None, False


# Specific search functions for common agricultural queries

def search_market_prices(crop: str, region: Optional[str] = None) -> List[SearchResult]:
    """Search for current market prices of specific crops."""
    query = f"{crop} price today Kenya"
    if region:
        query = f"{crop} price {region} Kenya today"
    return perform_search(query, max_results=5)


def search_weather_forecast(region: str, days: int = 3) -> List[SearchResult]:
    """Search for weather forecast."""
    query = f"weather forecast {region} Kenya next {days} days"
    return perform_search(query, max_results=3)


def search_disease_outbreak(disease_name: str, crop: str) -> List[SearchResult]:
    """Search for disease outbreak information."""
    query = f"{disease_name} {crop} outbreak Kenya 2024"
    return perform_search(query, max_results=3)


def search_farming_news(days: int = 7) -> List[SearchResult]:
    """Search for recent farming news."""
    query = f"Kenya agriculture news farming updates {days} days"
    return perform_search(query, max_results=5)
