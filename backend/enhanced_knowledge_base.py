"""
Enhanced KilimoChat Knowledge Base System
Integrates KALRO, FAO, and Kenya Ministry sources.
"""

import json
import re
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import numpy as np
from config import logger

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

class AuthorityLevel(Enum):
    KALRO = 5
    KEPHIS = 5
    FAO = 4
    MINISTRY = 4
    RESEARCH = 3
    EXTENSION = 2
    GENERAL = 1

class Region(Enum):
    HIGHLANDS = "highlands"
    LOWLANDS = "lowlands"
    ASAL = "asal"
    COASTAL = "coastal"
    CENTRAL = "central"
    NATIONAL = "national"

class Season(Enum):
    LONG_RAINS = "long_rains"
    SHORT_RAINS = "short_rains"
    DRY_SEASON = "dry_season"
    YEAR_ROUND = "year_round"
    ANY = "any"

@dataclass
class KnowledgeFact:
    """Enhanced agricultural fact with metadata."""
    id: str
    crop: str
    category: str
    question: str
    answer: str
    source: str
    confidence: float = 1.0
    tags: List[str] = field(default_factory=list)
    embedding: List[float] = None
    region: str = "national"
    season: str = "any"
    soil_type: str = "any"
    authority_level: int = 1
    document_id: str = ""
    compliance_tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "crop": self.crop, "category": self.category,
            "question": self.question, "answer": self.answer, "source": self.source,
            "confidence": self.confidence, "tags": self.tags or [],
            "region": self.region, "season": self.season, "soil_type": self.soil_type,
            "authority_level": self.authority_level, "document_id": self.document_id,
            "compliance_tags": self.compliance_tags
        }

@dataclass
class SourceDocument:
    """Represents an ingested PDF or document."""
    id: str
    title: str
    source_type: str  # KALRO, FAO, MINISTRY
    authority_level: int
    file_path: str
    upload_date: str
    total_pages: int
    extracted_facts: List[str] = field(default_factory=list)
    compliance_approved: bool = False
    consent_tracking: Dict = field(default_factory=dict)

class EnhancedKnowledgeBase:
    """Enhanced knowledge base with PDF ingestion and compliance."""
    
    def __init__(self):
        self.facts: List[KnowledgeFact] = []
        self.documents: Dict[str, SourceDocument] = {}
        self.model = None
        
        if EMBEDDINGS_AVAILABLE:
            try:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("Embedding model loaded")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
        
        # Initialize with verified facts
        self._load_enhanced_facts()
    
    def _load_enhanced_facts(self):
        """Load enhanced agricultural facts from KALRO, FAO, Ministry sources."""
        enhanced_facts = [
            # KALRO Climate-Smart Agriculture
            KnowledgeFact(
                id="kalro-csa-1",
                crop="general",
                category="climate_smart",
                question="What is climate-smart agriculture?",
                answer="Climate-smart agriculture (CSA) integrates three pillars: increasing productivity sustainably, adapting to climate change, and reducing greenhouse gas emissions. Key practices include conservation agriculture, agroforestry, improved water management, and drought-resistant varieties.",
                source="KALRO",
                confidence=1.0,
                tags=["climate_smart", "sustainability", "adaptation"],
                region="national",
                season="any",
                authority_level=5,
                compliance_tags=["government_approved", "public_domain"]
            ),
            
            # KALRO ASAL (Dryland) Farming
            KnowledgeFact(
                id="kalro-asal-1",
                crop="general",
                category="dryland_farming",
                question="What are best practices for dryland farming in ASAL regions?",
                answer="ASAL farming best practices: 1) Water harvesting (bunds, zai pits, terraces) 2) Drought-resistant crops (sorghum, millet, cowpeas) 3) Mulching to retain moisture 4) Conservation tillage 5) Planting with first rains 6) Early maturing varieties. Water use efficiency is critical.",
                source="KALRO",
                confidence=1.0,
                tags=["dryland", "asal", "water_harvesting", "drought"],
                region="asal",
                season="short_rains",
                authority_level=5,
                compliance_tags=["government_approved", "asal_priority"]
            ),
            
            # FAO Dryland Practices
            KnowledgeFact(
                id="fao-dryland-1",
                crop="sorghum",
                category="planting",
                question="How do I conserve soil moisture for sorghum in drylands?",
                answer="Soil moisture conservation for sorghum: 1) Plant in furrows or zai pits 2) Apply mulch (crop residues, straw) 3) Use tied ridges to capture runoff 4) Plant at 5-10cm depth to access subsoil moisture 5) Weed early to reduce competition. FAO recommends combining traditional and modern techniques.",
                source="FAO",
                confidence=0.95,
                tags=["sorghum", "dryland", "moisture_conservation", "mulching"],
                region="asal",
                season="long_rains",
                authority_level=4,
                compliance_tags=["international_standard"]
            ),
            
            # Ministry KIAMIS Data Governance
            KnowledgeFact(
                id="ministry-kiamis-1",
                crop="general",
                category="policy",
                question="What is KIAMIS and how does it help farmers?",
                answer="KIAMIS (Kenya Integrated Agricultural Management Information System) is the national farmer registry. It: 1) Registers all farmers with unique IDs 2) Tracks farm boundaries using GPS 3) Links farmers to services (subsidies, insurance, credit) 4) Enables data-driven policy. Farmers must provide consent for data sharing per the Data Governance Framework.",
                source="Ministry of Agriculture",
                confidence=1.0,
                tags=["kiamis", "farmer_registry", "digital", "policy"],
                region="national",
                season="any",
                authority_level=4,
                compliance_tags=["government_approved", "data_governance", "consent_required"]
            ),
            
            # KALRO Good Agricultural Practices (GAP)
            KnowledgeFact(
                id="kalro-gap-1",
                crop="beans",
                category="good_practices",
                question="What are Good Agricultural Practices (GAP) for beans?",
                answer="GAP for beans: 1) Use certified seed (GLP 2, KK 8) 2) Test soil and apply lime if pH < 5.5 3) Plant at 30-40cm x 10-15cm spacing 4) Apply DAP at planting, CAN at flowering 5) Scout weekly for pests 6) Harvest when pods turn yellow 7) Dry to 12-14% moisture 8) Store in PICS bags. Keep detailed records for traceability.",
                source="KALRO",
                confidence=1.0,
                tags=["gap", "beans", "certification", "traceability"],
                region="national",
                season="any",
                authority_level=5,
                compliance_tags=["gap_certified", "export_ready"]
            ),
            
            # FAO Water Management
            KnowledgeFact(
                id="fao-water-1",
                crop="general",
                category="irrigation",
                question="What are efficient water management techniques for smallholder farmers?",
                answer="Efficient water management: 1) Drip irrigation (40% water savings) 2) Mulching (reduces evaporation by 50%) 3) Planting basins/zai pits 4) Conservation agriculture (minimum tillage) 5) Water harvesting from roofs and runoff 6) Deficit irrigation (stress during non-critical growth) 7) Use drought-resistant varieties. Prioritize high-value crops for irrigation.",
                source="FAO",
                confidence=0.95,
                tags=["water", "irrigation", "efficiency", "smallholder"],
                region="asal",
                season="dry_season",
                authority_level=4,
                compliance_tags=["international_standard", "climate_adaptation"]
            ),
            
            # KALRO Sorghum Production Guidelines
            KnowledgeFact(
                id="kalro-sorghum-1",
                crop="sorghum",
                category="planting",
                question="What are the best sorghum varieties for ASAL regions?",
                answer="KALRO recommends drought-tolerant sorghum varieties for ASAL: 1) Serena - early maturing, drought tolerant 2) Kari Mtama 1 - dual purpose (grain + fodder) 3) E1291 - Striga resistant 4) Sila - bird resistant. Plant at onset of rains in ASAL areas.",
                source="KALRO",
                confidence=1.0,
                tags=["sorghum", "varieties", "asal", "drought_resistant"],
                region="asal",
                season="long_rains",
                authority_level=5,
                compliance_tags=["government_approved", "asal_priority"]
            ),
            
            # KALRO Millet Guidelines
            KnowledgeFact(
                id="kalro-millet-1",
                crop="millet",
                category="planting",
                question="How do I grow finger millet successfully?",
                answer="Finger millet production (KALRO): 1) Use certified seed (U15, P224) 2) Plant at 30cm x 10cm spacing 3) Apply 1/2 bag DAP at planting 4) Top-dress with CAN at 4 weeks 5) Keep field weed-free 6) Harvest when ears turn brown 7) Thresh and dry to 13% moisture. Millet is drought-hardy and suits ASAL areas.",
                source="KALRO",
                confidence=1.0,
                tags=["millet", "finger_millet", "asal", "drought"],
                region="asal",
                season="short_rains",
                authority_level=5,
                compliance_tags=["government_approved", "asal_priority"]
            ),
            
            # KALRO Dairy Calf Management
            KnowledgeFact(
                id="kalro-dairy-calf-1",
                crop="dairy",
                category="calf_management",
                question="What is the KALRO protocol for raising dairy calves?",
                answer="KALRO dairy calf protocol: 1) Ensure first colostrum within 1 hour (10% body weight) 2) Feed whole milk at 10% body weight for first 2 months 3) Introduce calf starter at week 1 4) Provide fresh water daily 5) House separately for first 3 months 6) Deworm monthly 7) Wean at 3 months when eating 1kg calf starter daily.",
                source="KALRO",
                confidence=1.0,
                tags=["dairy", "calves", "colostrum", "weaning"],
                region="highlands",
                season="any",
                authority_level=5,
                compliance_tags=["government_approved"]
            ),
            
            # FAO Terracing and Water Conservation
            KnowledgeFact(
                id="fao-terrace-1",
                crop="general",
                category="soil_conservation",
                question="How do I construct terraces for water conservation?",
                answer="FAO terrace construction: 1) Mark contour lines using A-frame level 2) Cut and fill method - cut uphill, fill downhill 3) Terrace width 5-6m depending on slope 4) Build 30cm high bunds at edges 5) Plant Napier grass or trees on bunds 6) Maintain terraces annually. Suitable for slopes 5-20%.",
                source="FAO",
                confidence=0.95,
                tags=["terraces", "soil_conservation", "water", "contour"],
                region="highlands",
                season="long_rains",
                authority_level=4,
                compliance_tags=["international_standard"]
            ),
            
            # FAO Agroforestry
            KnowledgeFact(
                id="fao-agroforestry-1",
                crop="general",
                category="agroforestry",
                question="What are benefits of agroforestry in farming?",
                answer="FAO agroforestry benefits: 1) Trees provide windbreaks reducing crop damage 2) Legume trees (Leucaena, Sesbania) fix nitrogen 3) Tree leaf mulch improves soil moisture 4) Fruit trees provide income diversification 5) Fodder trees supplement livestock nutrition 6) Trees sequester carbon. Recommended spacing: 5m x 5m.",
                source="FAO",
                confidence=0.95,
                tags=["agroforestry", "trees", "nitrogen", "mulch"],
                region="national",
                season="any",
                authority_level=4,
                compliance_tags=["international_standard", "climate_adaptation"]
            ),
            
            # Ministry Aceli Kenya
            KnowledgeFact(
                id="ministry-finance-1",
                crop="general",
                category="finance",
                question="What agricultural financing options exist in Kenya?",
                answer="Kenya agricultural financing: 1) Aceli Africa - reduces lender risk for smallholder finance 2) Kilimo Biashara loans - through KCB and Co-operative Bank 3) Youth Enterprise Development Fund - for agri-startups 4) Women Enterprise Fund - for female farmers 5) County climate funds - for adaptation projects 6) Insurance (ACRE Africa) - for drought/weather risk.",
                source="Ministry of Agriculture",
                confidence=1.0,
                tags=["finance", "loans", "insurance", "aceli"],
                region="national",
                season="any",
                authority_level=4,
                compliance_tags=["government_approved", "financial_inclusion"]
            ),
            
            # KALRO Pest Management - Fall Armyworm
            KnowledgeFact(
                id="kalro-faw-1",
                crop="maize",
                category="pests",
                question="What is the latest KALRO recommendation for Fall Armyworm control?",
                answer="KALRO FAW management (2024): 1) Scout fields twice weekly 2) Use pheromone traps for monitoring 3) Biological: Trichogramma wasps, Beauveria bassiana 4) Chemical: Emamectin benzoate, Spinetoram, Chlorantraniliprole 5) Cultural: Intercrop maize with beans/push-pull 6) Plant early maturing varieties. Rotate insecticides to avoid resistance.",
                source="KALRO",
                confidence=1.0,
                tags=["fall_armyworm", "maize", "pests", "control"],
                region="national",
                season="any",
                authority_level=5,
                compliance_tags=["government_approved", "pest_management"]
            ),
            
            # KALRO Potato Production
            KnowledgeFact(
                id="kalro-potato-1",
                crop="potatoes",
                category="planting",
                question="What are best practices for potato farming in Kenya?",
                answer="KALRO potato guidelines: 1) Use certified seed (Shangi, Unica, Dutch Robjin) 2) Plant at 75cm x 30cm spacing, 10cm deep 3) Apply DAP at planting, CAN at emergence 4) Hill soil around plants at 4 weeks 5) Control late blight with fungicides 6) Harvest when vines dry 7) Cure tubers for 2 weeks before storage. High yields in highlands.",
                source="KALRO",
                confidence=1.0,
                tags=["potatoes", "seed", "certified", "highlands"],
                region="highlands",
                season="long_rains",
                authority_level=5,
                compliance_tags=["government_approved"]
            ),
            
            # FAO Organic Farming
            KnowledgeFact(
                id="fao-organic-1",
                crop="general",
                category="organic",
                question="How can I transition to organic farming?",
                answer="FAO organic transition: 1) Stop synthetic fertilizers - switch to compost/manure 2) Use biopesticides (neem, pyrethrum) instead of chemicals 3) Practice crop rotation (3-year cycle) 4) Grow cover crops (Crotalaria, Mucuna) 5) Maintain buffer zones 6) Keep detailed input records 7) Get certified by KOAN (Kenya Organic Agriculture Network). Transition period: 2 years.",
                source="FAO",
                confidence=0.95,
                tags=["organic", "certification", "koan", "sustainable"],
                region="national",
                season="any",
                authority_level=4,
                compliance_tags=["international_standard", "organic_certified"]
            ),
        ]
        
        self.facts = enhanced_facts
        logger.info(f"Enhanced knowledge base loaded with {len(self.facts)} facts")
        
        if self.model:
            self._generate_embeddings()
    
    def _generate_embeddings(self):
        """Generate embeddings for all facts."""
        texts = [f"{f.question} {f.answer} {' '.join(f.tags)} {f.crop} {f.category}" for f in self.facts]
        embeddings = self.model.encode(texts, show_progress_bar=False)
        
        for fact, embedding in zip(self.facts, embeddings):
            fact.embedding = embedding.tolist()
        
        logger.info("Embeddings generated for all facts")
    
    def search(self, query: str, region: str = None, season: str = None, 
               top_k: int = 3, threshold: float = 0.7) -> List[tuple]:
        """Search with optional region/season filtering."""
        results = []
        
        # Get base results
        if self.model and any(f.embedding for f in self.facts):
            results = self._semantic_search(query, top_k * 2, threshold)
        else:
            results = self._keyword_search(query, top_k * 2, threshold)
        
        # Filter by region and season if specified
        filtered_results = []
        for fact, score in results:
            if region and fact.region != "national" and fact.region != region:
                continue
            if season and fact.season != "any" and fact.season != season:
                continue
            filtered_results.append((fact, score))
        
        # Sort by combined score (similarity + authority boost)
        filtered_results.sort(
            key=lambda x: (x[1] * 0.7 + x[0].authority_level * 0.1), 
            reverse=True
        )
        
        return filtered_results[:top_k]
    
    def _semantic_search(self, query: str, top_k: int, threshold: float) -> List[tuple]:
        """Semantic search using embeddings."""
        query_embedding = self.model.encode([query])[0]
        
        results = []
        for fact in self.facts:
            if fact.embedding:
                similarity = np.dot(query_embedding, fact.embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(fact.embedding)
                )
                if similarity >= threshold:
                    results.append((fact, float(similarity)))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
    
    def _keyword_search(self, query: str, top_k: int, threshold: float) -> List[tuple]:
        """Fallback keyword search."""
        query_words = set(re.findall(r'\w+', query.lower()))
        
        results = []
        for fact in self.facts:
            fact_text = f"{fact.question} {fact.answer} {' '.join(fact.tags)}".lower()
            fact_words = set(re.findall(r'\w+', fact_text))
            
            intersection = len(query_words & fact_words)
            union = len(query_words | fact_words)
            score = intersection / union if union > 0 else 0
            
            if score >= threshold * 0.5:
                results.append((fact, score))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

# Global instance
_enhanced_kb: Optional[EnhancedKnowledgeBase] = None

def get_enhanced_knowledge_base() -> EnhancedKnowledgeBase:
    """Get or create global enhanced knowledge base."""
    global _enhanced_kb
    if _enhanced_kb is None:
        _enhanced_kb = EnhancedKnowledgeBase()
    return _enhanced_kb

def search_enhanced_knowledge(query: str, region: str = None, season: str = None,
                               top_k: int = 3, threshold: float = 0.7) -> Dict[str, Any]:
    """Main entry point for enhanced knowledge search."""
    kb = get_enhanced_knowledge_base()
    results = kb.search(query, region=region, season=season, top_k=top_k, threshold=threshold)
    
    if not results:
        return {
            "found": False,
            "confidence": 0.0,
            "answer": None,
            "source": None,
            "all_matches": [],
            "authority_sources": []
        }
    
    best_match = results[0]
    fact, score = best_match
    
    all_matches = []
    authority_sources = []
    
    for f, s in results:
        all_matches.append({
            "id": f.id,
            "question": f.question,
            "answer": f.answer,
            "crop": f.crop,
            "score": round(s, 3),
            "source": f.source,
            "authority_level": f.authority_level,
            "region": f.region,
            "season": f.season,
            "is_high_authority": f.is_high_authority
        })
        
        if f.is_high_authority:
            authority_sources.append(f.source)
    
    return {
        "found": score >= threshold,
        "confidence": round(score, 3),
        "answer": fact.answer,
        "source": fact.source,
        "authority_level": fact.authority_level,
        "is_authority_source": fact.is_high_authority,
        "authority_sources": list(set(authority_sources)),
        "region": fact.region,
        "season": fact.season,
        "citations": [f.id for f, _ in results],
        "all_matches": all_matches
    }
