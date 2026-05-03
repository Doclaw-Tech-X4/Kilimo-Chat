#!/usr/bin/env python3
"""
Test script for RAG (Retrieval-Augmented Generation) system.
Tests knowledge base search and RAG integration.
"""

import sys
from knowledge_base import search_knowledge, get_kb_stats

def test_knowledge_base():
    """Test the knowledge base search functionality."""
    print("\n" + "="*60)
    print("🌾 KILIMOCHAT RAG SYSTEM TEST")
    print("="*60)
    
    # Test 1: Stats
    print("\n📊 Testing Knowledge Base Stats...")
    stats = get_kb_stats()
    print(f"   Total facts: {stats['total_facts']}")
    print(f"   Crops: {stats['crops']}")
    print(f"   Categories: {stats['categories']}")
    print(f"   Embeddings: {'✅ Available' if stats['embeddings_available'] else '⚠️  Keyword fallback'}")
    
    if stats['total_facts'] < 50:
        print(f"   ⚠️  Warning: Only {stats['total_facts']} facts (target: 50+)")
    else:
        print(f"   ✅ {stats['total_facts']} verified facts loaded")
    
    # Test 2: High confidence match
    print("\n🔍 Test 1: Maize fertilizer (should find match > 80%)")
    result = search_knowledge("How much fertilizer for maize?", threshold=0.7)
    
    if result['found']:
        print(f"   ✅ Found match (confidence: {result['confidence']})")
        print(f"   📚 Source: {result['source']}")
        print(f"   🌾 Crop: {result['matched_crop']}")
        print(f"   💡 Answer preview: {result['answer'][:100]}...")
    else:
        print(f"   ⚠️  No high-confidence match (best: {result['confidence']})")
        if result['all_matches']:
            print(f"   💡 Low-confidence matches available: {len(result['all_matches'])}")
    
    # Test 3: Beans planting
    print("\n🔍 Test 2: Beans planting time")
    result = search_knowledge("When should I plant beans?", threshold=0.7)
    
    if result['found']:
        print(f"   ✅ Found match (confidence: {result['confidence']})")
        print(f"   📚 Source: {result['source']}")
        print(f"   🌾 Crop: {result['matched_crop']}")
    else:
        print(f"   ⚠️  No high-confidence match")
    
    # Test 4: Tomato pests
    print("\n🔍 Test 3: Tomato leaf miner (Tuta absoluta)")
    result = search_knowledge("How to control Tuta absoluta in tomatoes?", threshold=0.7)
    
    if result['found']:
        print(f"   ✅ Found match (confidence: {result['confidence']})")
        print(f"   📚 Source: {result['source']}")
        print(f"   🌾 Crop: {result['matched_crop']}")
    else:
        print(f"   ⚠️  No high-confidence match")
    
    # Test 5: Avocado
    print("\n🔍 Test 4: Avocado root rot")
    result = search_knowledge("What is root rot in avocados?", threshold=0.7)
    
    if result['found']:
        print(f"   ✅ Found match (confidence: {result['confidence']})")
        print(f"   📚 Source: {result['source']}")
        print(f"   🌾 Crop: {result['matched_crop']}")
    else:
        print(f"   ⚠️  No high-confidence match")
    
    # Test 6: Dairy
    print("\n🔍 Test 5: Dairy mastitis")
    result = search_knowledge("How do I treat mastitis in cows?", threshold=0.7)
    
    if result['found']:
        print(f"   ✅ Found match (confidence: {result['confidence']})")
        print(f"   📚 Source: {result['source']}")
        print(f"   🌾 Category: Dairy")
    else:
        print(f"   ⚠️  No high-confidence match")
    
    # Test 7: No match expected
    print("\n🔍 Test 6: Random question (should NOT find match)")
    result = search_knowledge("What is the weather like today in New York?", threshold=0.7)
    
    if not result['found']:
        print(f"   ✅ Correctly returned no match")
    else:
        print(f"   ⚠️  Unexpected match found")
    
    # Test 8: Export
    print("\n📁 Test 7: Export knowledge base")
    try:
        from knowledge_base import get_knowledge_base
        kb = get_knowledge_base()
        kb.export_to_json("data/knowledge_base_test.json")
        print("   ✅ Exported successfully to data/knowledge_base_test.json")
    except Exception as e:
        print(f"   ❌ Export failed: {e}")
    
    print("\n" + "="*60)
    print("✅ RAG SYSTEM TEST COMPLETE")
    print("="*60)
    
    return True


if __name__ == "__main__":
    success = test_knowledge_base()
    sys.exit(0 if success else 1)
