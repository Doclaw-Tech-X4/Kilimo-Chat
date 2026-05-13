#!/usr/bin/env python3
"""
Test script to verify the response formatter works correctly
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from response_formatter import format_response

# Test greeting
print("=== TEST 1: GREETING ===")
greeting_response = format_response("", "hello", "en")
print(greeting_response)
print("\n" + "="*50 + "\n")

# Test agricultural question
print("=== TEST 2: AGRICULTURAL QUESTION ===")
raw_response = """_SUMMARY_:

Maize prices in Nairobi are currently around Ksh 3,000-3,500 per 90kg bag.

_DETAILS FROM SEARCH_:
- Price range: Ksh 3,000-3,500 per 90kg bag
- Location: Major markets in Nairobi
- Season: Current harvest season
- Quality varies by supplier

_WHAT TO DO_:
1. Visit Nairobi markets for best prices
2. Compare quality before buying
3. Consider storage costs
4. Buy in bulk for better rates

_COSTS_:
- Transport: Ksh 200-500 depending on distance
- Market fees: Ksh 50-100 per bag
- Storage: Ksh 100-200 per month
Prices as of March 2024 from web search

_WHERE INFO CAME FROM_:
From: Kenya Agricultural Market Information System"""

agri_response = format_response(raw_response, "what is the price of maize in nairobi", "en")
print(agri_response)
print("\n" + "="*50 + "\n")

# Test Swahili
print("=== TEST 3: SWAHILI RESPONSE ===")
swahili_response = format_response(raw_response, "bei ya mahindi nairobi", "sw")
print(swahili_response)
