"""
KilimoChat Knowledge Base & RAG System
Retrieval-Augmented Generation for accurate agricultural answers.

Features:
- Structured agricultural facts (KALRO-based)
- Semantic search with embeddings
- Confidence scoring for answers
- Citation tracking
"""

import json
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import numpy as np
from config import logger

# Try to import sentence-transformers for embeddings
try:
    from sentence_transformers import SentenceTransformer

    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logger.warning(
        "sentence-transformers not installed. Using keyword search fallback."
    )


@dataclass
class KnowledgeFact:
    """Single agricultural fact with metadata."""

    id: str
    crop: str
    category: str  # planting, pests, fertilizer, harvest, etc.
    question: str  # Common question this answers
    answer: str  # Verified answer
    source: str  # KALRO, KEPHIS, etc.
    confidence: float = 1.0
    tags: List[str] = None
    embedding: List[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "crop": self.crop,
            "category": self.category,
            "question": self.question,
            "answer": self.answer,
            "source": self.source,
            "confidence": self.confidence,
            "tags": self.tags or [],
            "embedding": self.embedding,
        }


class KnowledgeBase:
    """Agricultural knowledge base with RAG capabilities."""

    def __init__(self):
        self.facts: List[KnowledgeFact] = []
        self.model = None

        if EMBEDDINGS_AVAILABLE:
            try:
                # Use lightweight model for embeddings
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
                logger.info("✅ Embedding model loaded")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")

        # Initialize with verified facts
        self._load_verified_facts()

    def _load_verified_facts(self):
        """Load 50+ verified agricultural facts."""
        verified_facts = [
            # MAIZE FACTS (10)
            KnowledgeFact(
                "m1",
                "maize",
                "planting",
                "When is the best time to plant maize in Kenya?",
                "Long rains: March-April. Short rains: September-October. Highlands plant by mid-March. Lowlands plant with first reliable rains.",
                "KALRO",
                1.0,
                ["maize", "planting", "seasons", "timing"],
            ),
            KnowledgeFact(
                "m2",
                "maize",
                "spacing",
                "What is the correct spacing for maize?",
                "75cm between rows, 25-30cm between plants. Plant 2 seeds per hole, thin to 1 plant after germination.",
                "KALRO",
                1.0,
                ["maize", "spacing", "planting"],
            ),
            KnowledgeFact(
                "m3",
                "maize",
                "fertilizer",
                "How much fertilizer should I use for maize?",
                "Use 1-2 bags DAP fertilizer when planting. After 4-6 weeks when plants are knee-high, add 1-2 bags CAN fertilizer. Available at any agrovet shop.",
                "KALRO",
                1.0,
                ["maize", "fertilizer", "DAP", "CAN"],
            ),
            KnowledgeFact(
                "m4",
                "maize",
                "pests",
                "How do I control Fall Armyworm in maize?",
                "1) Scout weekly 2) Use Emamectin benzoate or Spinetoram 3) Apply in evening 4) Remove and destroy infested plants 5) Plant early maturing varieties",
                "KALRO/KEPHIS",
                1.0,
                ["maize", "Fall Armyworm", "pests", "control"],
            ),
            KnowledgeFact(
                "m5",
                "maize",
                "disease",
                "What causes maize streak virus and how to prevent it?",
                "Spread by leafhoppers. Control: Plant resistant varieties (SC Duma 43, SC Tembo 73), control weeds, remove infected plants early.",
                "KALRO",
                0.95,
                ["maize", "streak virus", "disease", "leafhopper"],
            ),
            KnowledgeFact(
                "m6",
                "maize",
                "harvest",
                "How do I know when maize is ready for harvest?",
                "Dent stage: Kernels are hard and dented at top, black layer formed at base. Leaves turn yellow/brown. Moisture content 20-25%.",
                "KALRO",
                1.0,
                ["maize", "harvest", "dent stage"],
            ),
            KnowledgeFact(
                "m7",
                "maize",
                "storage",
                "How should I store maize to prevent aflatoxin?",
                "Dry to 13% moisture, store in airtight PICS bags or hermetic containers, add diatomaceous earth, keep in cool dry place, inspect monthly.",
                "KALRO/KEPHIS",
                1.0,
                ["maize", "storage", "aflatoxin", "post-harvest"],
            ),
            KnowledgeFact(
                "m8",
                "maize",
                "variety",
                "Which maize varieties are best for highlands?",
                "Highlands (>1500m): SC Duma 43, SC Tembo 73, KH500-33A, H513. These tolerate cooler temperatures and have shorter maturity.",
                "KALRO",
                1.0,
                ["maize", "varieties", "highlands", "seeds"],
            ),
            KnowledgeFact(
                "m9",
                "maize",
                "variety",
                "Which maize varieties are drought tolerant?",
                "Drought tolerant: KH500-33A, H513, ZM 521. These have good stay-green trait and use water efficiently.",
                "KALRO",
                1.0,
                ["maize", "drought", "varieties", "dry areas"],
            ),
            KnowledgeFact(
                "m10",
                "maize",
                "water",
                "How often should I water maize?",
                "Critical stages: germination, knee-high, tasseling/silking. Water 2-3 times per week if no rain, 30-40mm per application. Drip irrigation saves 40% water.",
                "KALRO",
                0.95,
                ["maize", "irrigation", "water", "drip"],
            ),
            # BEANS FACTS (10)
            KnowledgeFact(
                "b1",
                "beans",
                "planting",
                "When should I plant beans?",
                "Plant at onset of rains. Highlands: March-April and September-October. Lowlands: April-May and October-November. Avoid middle of rainy season.",
                "KALRO",
                1.0,
                ["beans", "planting", "seasons", "timing"],
            ),
            KnowledgeFact(
                "b2",
                "beans",
                "spacing",
                "What is the spacing for beans?",
                "Bush beans: 30-40cm between rows, 10-15cm between plants. Climbing beans: 1m between rows, 20-30cm between plants.",
                "KALRO",
                1.0,
                ["beans", "spacing", "bush", "climbing"],
            ),
            KnowledgeFact(
                "b3",
                "beans",
                "fertilizer",
                "Do beans need fertilizer?",
                "Beans fix nitrogen - need less fertilizer. Use half bag DAP fertilizer at planting. For climbing beans, add 1 bag CAN when flowers appear. Beans make their own nitrogen so need less fertilizer.",
                "KALRO",
                1.0,
                ["beans", "fertilizer", "nitrogen", "DAP"],
            ),
            KnowledgeFact(
                "b4",
                "beans",
                "pests",
                "How do I control bean pests?",
                "Bean fly: Apply wood ash or neem at planting. Bean aphid: Spray neem or pyrethrum. Bruchids in storage: Use PICS bags, add neem leaves.",
                "KALRO",
                1.0,
                ["beans", "pests", "bean fly", "aphid", "bruchid"],
            ),
            KnowledgeFact(
                "b5",
                "beans",
                "disease",
                "What is angular leaf spot and how to control it?",
                "Common bean disease. Control: Use certified seeds, rotate with maize, avoid overhead irrigation, plant resistant varieties (GLP 2, GLP 1126).",
                "KALRO",
                0.95,
                ["beans", "angular leaf spot", "disease"],
            ),
            KnowledgeFact(
                "b6",
                "beans",
                "varieties",
                "Which bean varieties are best for market?",
                "Popular market varieties: GLP 2 (Rosecoco), GLP 1126 (Mwitemania), KK 8 (Canadian Wonder), KK 15 (Red Haricot). High yield and good cooking quality.",
                "KALRO",
                1.0,
                ["beans", "varieties", "market", "GLP"],
            ),
            KnowledgeFact(
                "b7",
                "beans",
                "harvest",
                "When are beans ready for harvest?",
                "Pods turn yellow/brown and dry. Harvest before pods split. For fresh beans, harvest when pods are full but still green.",
                "KALRO",
                1.0,
                ["beans", "harvest", "pods"],
            ),
            KnowledgeFact(
                "b8",
                "beans",
                "rotation",
                "Can I plant beans after maize?",
                "Yes! Beans are excellent after maize. They fix nitrogen that maize depleted. Ideal rotation: Maize → Beans → Vegetables → Maize.",
                "KALRO",
                1.0,
                ["beans", "rotation", "maize", "soil fertility"],
            ),
            KnowledgeFact(
                "b9",
                "beans",
                "support",
                "How do I support climbing beans?",
                "Use 2.5m stakes/poles in A-frame or trellis. Plant 2-3 seeds at base of each stake. Train vines upward. Can use maize stalks if still standing.",
                "KALRO",
                0.95,
                ["beans", "climbing", "staking", "trellis"],
            ),
            KnowledgeFact(
                "b10",
                "beans",
                "storage",
                "How do I store beans without pesticides?",
                "Dry to 12-14% moisture. Use PICS bags (hermetic). Add neem leaves or diatomaceous earth. Store in cool, dry, well-ventilated area.",
                "KALRO",
                1.0,
                ["beans", "storage", "PICS bags", "neem"],
            ),
            # TOMATOES FACTS (10)
            KnowledgeFact(
                "t1",
                "tomatoes",
                "planting",
                "When is the best time to plant tomatoes?",
                "Year-round in irrigated areas. Rain-fed: avoid heavy rains. Transplant seedlings 3-4 weeks after sowing, when 15-20cm tall.",
                "KALRO",
                0.95,
                ["tomatoes", "planting", "seedlings", "transplant"],
            ),
            KnowledgeFact(
                "t2",
                "tomatoes",
                "spacing",
                "What is the spacing for tomatoes?",
                "Determinate (bush): 60cm between rows, 45cm between plants. Indeterminate (vine): 1m between rows, 40cm between plants, stake every plant.",
                "KALRO",
                1.0,
                ["tomatoes", "spacing", "determinate", "indeterminate"],
            ),
            KnowledgeFact(
                "t3",
                "tomatoes",
                "fertilizer",
                "How do I fertilize tomatoes?",
                "Mix compost into soil before planting. Add 1 bag DAP at planting. When flowers appear, add 1 bag CAN. When fruits start, add 1 bag NPK. For blossom end rot, add calcium.",
                "KALRO",
                1.0,
                ["tomatoes", "fertilizer", "compost", "calcium"],
            ),
            KnowledgeFact(
                "t4",
                "tomatoes",
                "pests",
                "How do I control Tuta absoluta (tomato leaf miner)?",
                "1) Use pheromone traps 2) Remove infested leaves 3) Spray with Bacillus thuringiensis or spinosad 4) Use nets (screen houses) 5) Destroy crop residues after harvest.",
                "KEPHIS/KALRO",
                1.0,
                ["tomatoes", "Tuta absoluta", "leaf miner", "pests"],
            ),
            KnowledgeFact(
                "t5",
                "tomatoes",
                "disease",
                "How do I prevent late blight in tomatoes?",
                "Avoid overhead watering. Space for air circulation. Remove lower leaves. Spray copper fungicide before rains. Use resistant varieties (Fortune Maker, Riogrande).",
                "KALRO",
                1.0,
                ["tomatoes", "late blight", "disease", "fungicide"],
            ),
            KnowledgeFact(
                "t6",
                "tomatoes",
                "water",
                "How much water do tomatoes need?",
                "Critical: flowering and fruit development. Drip irrigation: 2-4 liters per plant daily. Avoid wetting leaves. Mulch to retain moisture.",
                "KALRO",
                0.95,
                ["tomatoes", "irrigation", "water", "drip", "mulch"],
            ),
            KnowledgeFact(
                "t7",
                "tomatoes",
                "varieties",
                "Which tomato varieties are best for market?",
                "Roma (Valoria, Rio Grande) - processing. Round (Fortune Maker, Kentom) - fresh market. Cherry - high value. Indeterminate for greenhouse.",
                "KALRO",
                1.0,
                ["tomatoes", "varieties", "Roma", "market"],
            ),
            KnowledgeFact(
                "t8",
                "tomatoes",
                "pruning",
                "Should I prune tomatoes?",
                "Indeterminate: Yes. Remove suckers (side shoots) weekly. Remove leaves below first fruit cluster. Determinate: Minimal pruning, just remove bottom leaves.",
                "KALRO",
                0.95,
                ["tomatoes", "pruning", "suckers", "indeterminate"],
            ),
            KnowledgeFact(
                "t9",
                "tomatoes",
                "greenhouse",
                "Can I grow tomatoes in a greenhouse?",
                "Yes, excellent for year-round production. Use indeterminate varieties. Ensure ventilation, pollination (bumblebees or vibration), trellis to 3m height.",
                "KALRO",
                0.95,
                ["tomatoes", "greenhouse", "protected cultivation"],
            ),
            KnowledgeFact(
                "t10",
                "tomatoes",
                "harvest",
                "When should I harvest tomatoes?",
                "Fresh market: Breaker stage (slight pink). Processing: Red ripe. Long distance: Mature green with gel formation. Harvest every 2-3 days.",
                "KALRO",
                1.0,
                ["tomatoes", "harvest", "stages", "breaker"],
            ),
            # AVOCADOS FACTS (10)
            KnowledgeFact(
                "a1",
                "avocados",
                "planting",
                "When should I plant avocados?",
                "Best: Long rains (March-April). Can plant anytime with irrigation. Avoid waterlogged soils. Plant at beginning of rains.",
                "KALRO",
                1.0,
                ["avocados", "planting", "timing", "rains"],
            ),
            KnowledgeFact(
                "a2",
                "avocados",
                "spacing",
                "What is the spacing for avocados?",
                "Hass and Fuerte: 7m x 7m (200 trees/acre). Dwarf varieties: 5m x 5m. Allow space for equipment access and light penetration.",
                "KALRO",
                1.0,
                ["avocados", "spacing", "Hass", "Fuerte", "orchard"],
            ),
            KnowledgeFact(
                "a3",
                "avocados",
                "fertilizer",
                "How do I fertilize avocado trees?",
                "Young trees (year 1): Give 200g CAN and 100g DAP per tree, 4 times a year. Mature trees: 2-3 bags NPK fertilizer per acre yearly. Also add zinc and boron supplements from agrovet.",
                "KALRO",
                0.95,
                ["avocados", "fertilizer", "NPK", "micronutrients"],
            ),
            KnowledgeFact(
                "a4",
                "avocados",
                "pollination",
                "Do I need Type A and Type B avocados?",
                "Yes! Hass (Type A) needs cross-pollinator like Fuerte (Type B). Plant 1:1 ratio or 1:2. This ensures better fruit set and yield.",
                "KALRO",
                1.0,
                ["avocados", "pollination", "Type A", "Type B", "cross-pollination"],
            ),
            KnowledgeFact(
                "a5",
                "avocados",
                "pruning",
                "How do I prune avocado trees?",
                "Train to central leader for first 2 years. Remove water shoots. Maintain open vase shape. Prune after harvest, before flowering. Remove dead/diseased wood.",
                "KALRO",
                0.95,
                ["avocados", "pruning", "training", "canopy"],
            ),
            KnowledgeFact(
                "a6",
                "avocados",
                "pests",
                "What are common avocado pests and how to control them?",
                "False codling moth: Pheromone traps, remove fallen fruit. Thrips: Blue sticky traps. Fruit flies: Protein bait, sanitation. Use nets for high-value orchards.",
                "KEPHIS/KALRO",
                1.0,
                ["avocados", "pests", "codling moth", "thrips", "fruit fly"],
            ),
            KnowledgeFact(
                "a7",
                "avocados",
                "disease",
                "What is root rot and how to prevent it?",
                "Phytophthora root rot - deadly to avocados. Prevent: Plant on slopes, ensure drainage, use resistant rootstocks (Velvick), avoid over-irrigation, apply phosphorous acid.",
                "KALRO",
                1.0,
                ["avocados", "root rot", "Phytophthora", "drainage"],
            ),
            KnowledgeFact(
                "a8",
                "avocados",
                "harvest",
                "When should I harvest avocados?",
                "Hass: Harvest when skin turns purple-black (mature). Fuerte: Skin stays green but fruit is mature (Sept-Jan). Use stem cutter, leave 1cm stalk.",
                "KALRO",
                1.0,
                ["avocados", "harvest", "Hass", "Fuerte", "maturity"],
            ),
            KnowledgeFact(
                "a9",
                "avocados",
                "rootstock",
                "What rootstock should I use for avocados?",
                "Seedling rootstock for normal soils. Velvick for wet/heavy soils (root rot resistance). Duke 7 for high pH soils. Clonal rootstocks for high-density planting.",
                "KALRO",
                0.95,
                ["avocados", "rootstock", "Velvick", "Duke 7", "grafting"],
            ),
            KnowledgeFact(
                "a10",
                "avocados",
                "export",
                "What are requirements for export avocados?",
                "KEPHIS certification, GlobalGAP for EU, residue testing (no methyl bromide), correct maturity, size grading, traceability records. Use approved packhouses.",
                "KEPHIS/KALRO",
                1.0,
                ["avocados", "export", "GlobalGAP", "KEPHIS", "standards"],
            ),
            # DAIRY FACTS (10)
            KnowledgeFact(
                "d1",
                "dairy",
                "breeding",
                "Which dairy breeds are best for Kenya?",
                "Friesian: Highest milk (20-40L/day). Ayrshire: Heat tolerant, good milk (15-25L). Jersey: High butterfat, smaller (12-20L). Crossbreeds: Balanced for local conditions.",
                "KALRO",
                1.0,
                ["dairy", "breeds", "Friesian", "Ayrshire", "Jersey", "milk"],
            ),
            KnowledgeFact(
                "d2",
                "dairy",
                "feeding",
                "What should I feed my dairy cow?",
                "Basal: Napier grass 100kg + 2kg dairy meal + 1kg mineral daily. Lactating: Increase meal to 4-6kg, add bypass protein. Water: 80-100L per day always available.",
                "KALRO",
                1.0,
                ["dairy", "feeding", "napier", "dairy meal", "nutrition"],
            ),
            KnowledgeFact(
                "d3",
                "dairy",
                "milking",
                "How many times should I milk per day?",
                "Twice daily: 12-hour intervals (6am & 6pm). High producers: Can milk 3x for 15% more milk. Consistent timing critical for milk let-down.",
                "KALRO",
                1.0,
                ["dairy", "milking", "frequency", "timing"],
            ),
            KnowledgeFact(
                "d4",
                "dairy",
                "mastitis",
                "How do I prevent and treat mastitis?",
                "Prevention: Clean udders, dry cow therapy, proper milking hygiene. Treatment: Strip milk, intramammary antibiotics (after culture), discard milk during treatment + 3 days.",
                "KALRO/Vet Dept",
                1.0,
                ["dairy", "mastitis", "udder health", "antibiotics"],
            ),
            KnowledgeFact(
                "d5",
                "dairy",
                "heat",
                "How do I know when my cow is on heat?",
                "Signs: Mounting others, restlessness, swollen vulva, clear mucus discharge, reduced milk, bawling. Most fertile 12-18 hours after heat starts. Inseminate AM-PM or PM-AM.",
                "KALRO",
                0.95,
                ["dairy", "heat detection", "fertility", "AI"],
            ),
            KnowledgeFact(
                "d6",
                "dairy",
                "calf",
                "How do I care for a newborn calf?",
                "Immediate: Clear airways, dip navel in iodine, give colostrum within 1 hour (10% body weight). Week 1: Train to drink bucket. Weaning: 3 months at 80kg body weight.",
                "KALRO",
                1.0,
                ["dairy", "calf", "colostrum", "newborn", "weaning"],
            ),
            KnowledgeFact(
                "d7",
                "dairy",
                "shed",
                "What are requirements for a dairy shed?",
                "Space: 2.5m x 1.5m per cow, concrete slatted floor with rubber mats. Ventilation: Open sides, roof overhang. Drainage: Sloped floor, urine channels. Calf pen separate.",
                "KALRO",
                0.95,
                ["dairy", "housing", "shed", "construction"],
            ),
            KnowledgeFact(
                "d8",
                "dairy",
                "fodder",
                "What are good fodder crops for dairy?",
                "Napier grass (Bana, Kakamega 1): 20-30 tons/acre/year. Desmodium: Protein, fixes nitrogen. Lucerne: High protein. Sweet potato vines: Drought tolerant. Mulberry: Perennial.",
                "KALRO",
                1.0,
                ["dairy", "fodder", "napier", "desmodium", "lucerne"],
            ),
            KnowledgeFact(
                "d9",
                "dairy",
                "economics",
                "Is dairy farming profitable in Kenya?",
                "Yes with proper management. Break-even: 10-15L/day at current prices. Profitable at 20L+ with cost control. Key: Quality feed, good genetics, disease prevention, records.",
                "KALRO",
                0.95,
                ["dairy", "economics", "profit", "break-even"],
            ),
            KnowledgeFact(
                "d10",
                "dairy",
                "record",
                "What records should I keep for dairy?",
                "Daily: Milk yield, feed given, health events. Monthly: Weights, AI dates, pregnancy checks. Essential: Breeding dates, calving dates, treatments, sales. Use KALRO templates.",
                "KALRO",
                1.0,
                ["dairy", "records", "management", "productivity"],
            ),
            KnowledgeFact(
                "m11",
                "maize",
                "soil",
                "What soil type is best for maize?",
                "Well-drained loamy soils with pH 5.5-7.0 are ideal. Avoid waterlogged or very sandy soils. Add lime if soil is acidic.",
                "KALRO",
                1.0,
                ["maize", "soil", "pH", "loam"],
            ),
            KnowledgeFact(
                "m12",
                "maize",
                "weeding",
                "How often should I weed maize?",
                "Weed 2-3 times: First at 2-3 weeks, second at 5-6 weeks, third if necessary. Keep field weed-free during early growth.",
                "KALRO",
                1.0,
                ["maize", "weeding", "weed control"],
            ),
            KnowledgeFact(
                "m13",
                "maize",
                "intercropping",
                "Can I intercrop maize with beans?",
                "Yes. Plant maize first, then beans after 2 weeks. This improves soil nitrogen and maximizes land use.",
                "KALRO",
                1.0,
                ["maize", "intercropping", "beans"],
            ),
            KnowledgeFact(
                "m14",
                "maize",
                "topdressing",
                "When should I topdress maize?",
                "Apply CAN fertilizer when maize is knee-high (4-6 weeks after planting) and before rains for best absorption.",
                "KALRO",
                1.0,
                ["maize", "topdressing", "CAN"],
            ),
            KnowledgeFact(
                "m15",
                "maize",
                "yield",
                "What is the expected yield for maize?",
                "Good management: 20-30 bags per acre. Poor management: 5-10 bags. Hybrid seeds and fertilizer significantly increase yield.",
                "KALRO",
                0.95,
                ["maize", "yield", "production"],
            ),
            KnowledgeFact(
                "s1",
                "soil",
                "testing",
                "Why is soil testing important?",
                "Soil testing shows nutrient levels and pH. Helps apply correct fertilizer and avoid wasting money. Test every 2-3 years.",
                "KALRO",
                1.0,
                ["soil", "testing", "fertility"],
            ),
            KnowledgeFact(
                "s2",
                "soil",
                "ph",
                "What is ideal soil pH for crops?",
                "Most crops grow well at pH 5.5-7.0. Acidic soils need lime, alkaline soils need organic matter.",
                "KALRO",
                1.0,
                ["soil", "pH", "fertility"],
            ),
            KnowledgeFact(
                "s3",
                "soil",
                "organic",
                "How can I improve soil fertility naturally?",
                "Use compost, manure, crop rotation, cover crops, and mulching. Avoid overuse of chemical fertilizers.",
                "KALRO",
                1.0,
                ["soil", "organic", "compost", "fertility"],
            ),
            KnowledgeFact(
                "s4",
                "soil",
                "erosion",
                "How do I prevent soil erosion?",
                "Use terraces, contour farming, cover crops, mulching, and grass strips. Avoid bare soil.",
                "KALRO",
                1.0,
                ["soil", "erosion", "conservation"],
            ),
            KnowledgeFact(
                "s5",
                "soil",
                "manure",
                "How much manure should I apply?",
                "Apply 5-10 tons per acre before planting. Mix well into soil to improve structure and nutrients.",
                "KALRO",
                1.0,
                ["soil", "manure", "fertility"],
            ),
            KnowledgeFact(
                "c1",
                "climate",
                "rainfall",
                "How much rainfall do crops need?",
                "Most crops need 500-1200mm annually. Maize needs 500-800mm. Too little or too much affects yield.",
                "FAO/KALRO",
                0.95,
                ["climate", "rainfall", "water"],
            ),
            KnowledgeFact(
                "c2",
                "climate",
                "drought",
                "How do I manage crops during drought?",
                "Use drought-tolerant seeds, mulch soil, plant early, use drip irrigation, and reduce plant population.",
                "FAO",
                1.0,
                ["climate", "drought", "management"],
            ),
            KnowledgeFact(
                "c3",
                "climate",
                "mulching",
                "What is mulching and why is it important?",
                "Covering soil with dry grass or leaves. Reduces evaporation, controls weeds, improves soil moisture.",
                "KALRO",
                1.0,
                ["mulch", "water conservation"],
            ),
            KnowledgeFact(
                "c4",
                "climate",
                "irrigation",
                "What is the best irrigation method?",
                "Drip irrigation is most efficient (saves up to 60% water). Sprinklers good for large areas. Avoid flooding.",
                "FAO",
                1.0,
                ["irrigation", "drip", "water efficiency"],
            ),
            KnowledgeFact(
                "p1",
                "poultry",
                "breeds",
                "Which chicken breeds are best for eggs?",
                "Layers like Kienyeji improved, Isa Brown, and Lohmann produce 250-300 eggs/year.",
                "KALRO",
                1.0,
                ["poultry", "layers", "eggs"],
            ),
            KnowledgeFact(
                "p2",
                "poultry",
                "feeding",
                "What do chickens eat?",
                "Chick mash (0-8 weeks), growers mash (8-18 weeks), layers mash (18+ weeks). Provide clean water always.",
                "KALRO",
                1.0,
                ["poultry", "feeding"],
            ),
            KnowledgeFact(
                "p3",
                "poultry",
                "housing",
                "How should I house chickens?",
                "Provide dry, well-ventilated housing. 1 sq ft per bird. Protect from predators and rain.",
                "KALRO",
                1.0,
                ["poultry", "housing"],
            ),
            KnowledgeFact(
                "p4",
                "poultry",
                "disease",
                "What is Newcastle disease?",
                "Highly contagious viral disease. Prevent with vaccination. Symptoms: coughing, paralysis, sudden death.",
                "Vet Dept",
                1.0,
                ["poultry", "Newcastle", "disease"],
            ),
            KnowledgeFact(
                "p5",
                "poultry",
                "eggs",
                "When do chickens start laying eggs?",
                "At 18-22 weeks depending on breed and feeding. Good nutrition increases egg production.",
                "KALRO",
                1.0,
                ["poultry", "eggs", "laying"],
            ),
            KnowledgeFact(
                "g1",
                "goats",
                "breeds",
                "Which goat breeds are best for milk?",
                "Toggenburg, Alpine, and Saanen are best for milk production.",
                "KALRO",
                1.0,
                ["goats", "milk", "breeds"],
            ),
            KnowledgeFact(
                "g2",
                "goats",
                "feeding",
                "What do goats eat?",
                "Browse plants, shrubs, and grasses. Supplement with hay, minerals, and water.",
                "KALRO",
                1.0,
                ["goats", "feeding"],
            ),
            KnowledgeFact(
                "g3",
                "goats",
                "housing",
                "How should I house goats?",
                "Raised, dry floor housing. Protect from rain and cold. Good ventilation required.",
                "KALRO",
                1.0,
                ["goats", "housing"],
            ),
            KnowledgeFact(
                "g4",
                "goats",
                "disease",
                "What is common disease in goats?",
                "PPR (peste des petits ruminants). Prevent by vaccination. Symptoms: fever, diarrhea, nasal discharge.",
                "Vet Dept",
                1.0,
                ["goats", "PPR", "disease"],
            ),
            KnowledgeFact(
                "ag1",
                "agribusiness",
                "records",
                "Why should farmers keep records?",
                "Helps track profit/loss, improve decisions, access loans, and monitor productivity.",
                "FAO",
                1.0,
                ["records", "business"],
            ),
            KnowledgeFact(
                "ag2",
                "agribusiness",
                "market",
                "How can farmers get better prices?",
                "Sell in groups, access market information, store produce, avoid middlemen, target high-demand seasons.",
                "FAO",
                1.0,
                ["market", "pricing"],
            ),
            KnowledgeFact(
                "ag3",
                "agribusiness",
                "value_addition",
                "What is value addition in farming?",
                "Processing products (e.g., milk to yogurt, tomatoes to paste) to increase income.",
                "FAO",
                1.0,
                ["value addition", "income"],
            ),
            KnowledgeFact(
                "ag4",
                "agribusiness",
                "losses",
                "How can farmers reduce post-harvest losses?",
                "Proper drying, storage, handling, and use of hermetic bags reduce losses by up to 30%.",
                "FAO",
                1.0,
                ["post-harvest", "losses"],
            ),
        ]

        self.facts = verified_facts
        logger.info(f"✅ Knowledge base loaded with {len(self.facts)} verified facts")

        # Generate embeddings if model available
        if self.model:
            self._generate_embeddings()

    def _generate_embeddings(self):
        """Generate embeddings for all facts."""
        texts = [
            f"{f.question} {f.answer} {' '.join(f.tags or [])}" for f in self.facts
        ]
        embeddings = self.model.encode(texts, show_progress_bar=False)

        for fact, embedding in zip(self.facts, embeddings):
            fact.embedding = embedding.tolist()

        logger.info("✅ Embeddings generated for all facts")

    def search(
        self, query: str, top_k: int = 3, threshold: float = 0.7
    ) -> List[Tuple[KnowledgeFact, float]]:
        """
        Search knowledge base for relevant facts.

        Args:
            query: User question
            top_k: Number of results to return
            threshold: Minimum similarity score (0-1)

        Returns:
            List of (fact, score) tuples sorted by relevance
        """
        if not query.strip():
            return []

        # Method 1: Semantic search with embeddings (if available)
        if self.model and any(f.embedding for f in self.facts):
            return self._semantic_search(query, top_k, threshold)

        # Method 2: Fallback to keyword search
        return self._keyword_search(query, top_k, threshold)

    def _semantic_search(
        self, query: str, top_k: int, threshold: float
    ) -> List[Tuple[KnowledgeFact, float]]:
        """Search using vector embeddings."""
        query_embedding = self.model.encode([query])[0]

        results = []
        for fact in self.facts:
            if fact.embedding:
                # Cosine similarity
                similarity = np.dot(query_embedding, fact.embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(fact.embedding)
                )
                if similarity >= threshold:
                    results.append((fact, float(similarity)))

        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def _keyword_search(
        self, query: str, top_k: int, threshold: float
    ) -> List[Tuple[KnowledgeFact, float]]:
        """Fallback keyword search."""
        query_words = set(re.findall(r"\w+", query.lower()))

        results = []
        for fact in self.facts:
            # Search in question, answer, and tags
            fact_text = (
                f"{fact.question} {fact.answer} {' '.join(fact.tags or [])}".lower()
            )
            fact_words = set(re.findall(r"\w+", fact_text))

            # Calculate Jaccard similarity
            intersection = len(query_words & fact_words)
            union = len(query_words | fact_words)
            score = intersection / union if union > 0 else 0

            if score >= threshold * 0.5:  # Lower threshold for keyword search
                results.append((fact, score))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def get_fact_by_id(self, fact_id: str) -> Optional[KnowledgeFact]:
        """Retrieve a specific fact by ID."""
        for fact in self.facts:
            if fact.id == fact_id:
                return fact
        return None

    def get_facts_by_crop(self, crop: str) -> List[KnowledgeFact]:
        """Get all facts for a specific crop."""
        return [f for f in self.facts if f.crop.lower() == crop.lower()]

    def add_fact(self, fact: KnowledgeFact):
        """Add a new fact to the knowledge base."""
        self.facts.append(fact)
        # Regenerate embeddings
        if self.model:
            self._generate_embeddings()
        logger.info(f"✅ Added fact: {fact.id} - {fact.crop}")

    def export_to_json(self, filepath: str):
        """Export knowledge base to JSON file."""
        data = {
            "version": "1.0",
            "created": datetime.now().isoformat(),
            "total_facts": len(self.facts),
            "facts": [f.to_dict() for f in self.facts],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"✅ Knowledge base exported to {filepath}")

    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        crops = {}
        categories = {}
        for fact in self.facts:
            crops[fact.crop] = crops.get(fact.crop, 0) + 1
            categories[fact.category] = categories.get(fact.category, 0) + 1

        return {
            "total_facts": len(self.facts),
            "crops": crops,
            "categories": categories,
            "embeddings_available": EMBEDDINGS_AVAILABLE
            and any(f.embedding for f in self.facts),
            "sources": list(set(f.source for f in self.facts)),
        }


# Global knowledge base instance
_knowledge_base: Optional[KnowledgeBase] = None


def get_knowledge_base() -> KnowledgeBase:
    """Get or create the global knowledge base instance."""
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = KnowledgeBase()
    return _knowledge_base


def search_knowledge(
    query: str, top_k: int = 3, threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Main entry point for knowledge base search.

    Returns:
        {
            "found": bool,
            "confidence": float,
            "answer": str,
            "source": str,
            "citations": [fact_ids],
            "all_matches": [{"question": str, "answer": str, "score": float}]
        }
    """
    kb = get_knowledge_base()
    results = kb.search(query, top_k=top_k, threshold=threshold)

    if not results:
        return {
            "found": False,
            "confidence": 0.0,
            "answer": None,
            "source": None,
            "citations": [],
            "all_matches": [],
        }

    best_match = results[0]
    fact, score = best_match

    # Format all matches for context
    all_matches = []
    for f, s in results:
        all_matches.append(
            {
                "id": f.id,
                "question": f.question,
                "answer": f.answer,
                "crop": f.crop,
                "score": round(s, 3),
                "source": f.source,
            }
        )

    return {
        "found": score >= threshold,
        "confidence": round(score, 3),
        "answer": fact.answer,
        "source": fact.source,
        "citations": [fact.id for fact, _ in results],
        "all_matches": all_matches,
        "matched_crop": fact.crop,
        "category": fact.category,
    }


def get_kb_stats() -> Dict[str, Any]:
    """Get knowledge base statistics."""
    return get_knowledge_base().get_stats()
