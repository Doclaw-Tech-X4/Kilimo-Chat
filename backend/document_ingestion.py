"""
Document Ingestion System for KilimoChat
Processes PDFs from KALRO, FAO, and Kenya Ministry of Agriculture.

Features:
- PDF text extraction and chunking
- Metadata extraction (crop, region, season)
- Automatic fact generation using AI
- Compliance validation
"""

import os
import re
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from config import logger

# PDF processing
try:
    import PyPDF2
    from PyPDF2 import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logger.warning("PyPDF2 not installed. PDF processing disabled. please run pip install PyPDF2")

# AI integration
try:
    from groq import Groq
    from config import GROQ_API_KEY, GROQ_CHAT_MODEL
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False


@dataclass
class DocumentChunk:
    """Represents a chunk of text from a document."""
    text: str
    page_number: int
    chunk_index: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExtractedFact:
    """A fact extracted from a document."""
    question: str
    answer: str
    category: str
    crop: str
    region: str
    season: str
    confidence: float
    page_number: int


class PDFProcessor:
    """Processes PDF documents and extracts text."""
    
    def __init__(self):
        self.chunk_size = 1000
        self.chunk_overlap = 200
    
    def extract_text(self, pdf_path: str) -> List[DocumentChunk]:
        """Extract text from PDF and chunk it."""
        if not PDF_AVAILABLE:
            logger.error("PDF processing not available. Install PyPDF2.")
            return []
        
        chunks = []
        
        try:
            reader = PdfReader(pdf_path)
            
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                
                if text:
                    # Clean text
                    text = self._clean_text(text)
                    
                    # Split into chunks
                    page_chunks = self._chunk_text(text, page_num)
                    chunks.extend(page_chunks)
            
            logger.info(f"Extracted {len(chunks)} chunks from {pdf_path}")
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to extract text from {pdf_path}: {e}")
            return []
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters
        text = re.sub(r'[^\w\s\.,;:!?\-\'\"]', ' ', text)
        return text.strip()
    
    def _chunk_text(self, text: str, page_number: int) -> List[DocumentChunk]:
        """Split text into overlapping chunks."""
        chunks = []
        words = text.split()
        
        for i in range(0, len(words), self.chunk_size - self.chunk_overlap):
            chunk_words = words[i:i + self.chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            chunk = DocumentChunk(
                text=chunk_text,
                page_number=page_number,
                chunk_index=len(chunks),
                metadata={"word_count": len(chunk_words)}
            )
            chunks.append(chunk)
        
        return chunks


class FactExtractor:
    """Extracts structured facts from document chunks using AI."""
    
    def __init__(self):
        self.client = None
        if GROQ_AVAILABLE and GROQ_API_KEY:
            self.client = Groq(api_key=GROQ_API_KEY)
    
    def extract_facts(self, chunks: List[DocumentChunk], document_type: str = "KALRO") -> List[ExtractedFact]:
        """Extract agricultural facts from document chunks."""
        if not self.client:
            logger.error("Groq client not available for fact extraction")
            return []
        
        facts = []
        
        for chunk in chunks:
            try:
                extracted = self._extract_from_chunk(chunk, document_type)
                facts.extend(extracted)
            except Exception as e:
                logger.warning(f"Failed to extract facts from chunk: {e}")
        
        logger.info(f"Extracted {len(facts)} facts from document")
        return facts
    
    def _extract_from_chunk(self, chunk: DocumentChunk, document_type: str) -> List[ExtractedFact]:
        """Extract facts from a single chunk using AI."""
        
        prompt = f"""You are an agricultural expert analyzing a document from {document_type}.
        
        Extract factual information from this text as question-answer pairs:
        
        TEXT:
        {chunk.text[:2000]}
        
        For each fact found, provide:
        1. Question: What practical question does this answer?
        2. Answer: Clear, actionable answer (1-3 sentences)
        3. Category: planting, pests, fertilizer, harvest, irrigation, disease, or general
        4. Crop mentioned (if any)
        5. Region relevance (highlands, lowlands, asal, national)
        6. Season relevance (long_rains, short_rains, dry_season, any)
        
        Format as JSON list:
        [
          {{
            "question": "...",
            "answer": "...",
            "category": "...",
            "crop": "...",
            "region": "...",
            "season": "..."
          }}
        ]
        
        Return only valid JSON. If no agricultural facts found, return []."""
        
        try:
            response = self.client.chat.completions.create(
                model=GROQ_CHAT_MODEL or "llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You extract structured agricultural facts from documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2048
            )
            
            content = response.choices[0].message.content
            
            # Extract JSON from response
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                
                facts = []
                for item in data:
                    fact = ExtractedFact(
                        question=item.get("question", ""),
                        answer=item.get("answer", ""),
                        category=item.get("category", "general"),
                        crop=item.get("crop", "general"),
                        region=item.get("region", "national"),
                        season=item.get("season", "any"),
                        confidence=0.8,
                        page_number=chunk.page_number
                    )
                    facts.append(fact)
                
                return facts
            
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
        
        return []


class DocumentIngestionPipeline:
    """Complete pipeline for ingesting agricultural documents."""
    
    def __init__(self, upload_dir: str = "uploads/documents"):
        self.upload_dir = upload_dir
        self.pdf_processor = PDFProcessor()
        self.fact_extractor = FactExtractor()
        
        # Ensure upload directory exists
        os.makedirs(upload_dir, exist_ok=True)
    
    def ingest_pdf(self, file_path: str, source_type: str, title: str = None,
                   compliance_approved: bool = False) -> Dict[str, Any]:
        """
        Ingest a PDF document and extract facts.
        
        Args:
            file_path: Path to PDF file
            source_type: KALRO, FAO, or MINISTRY
            title: Document title (optional)
            compliance_approved: Whether document is compliance-approved
        
        Returns:
            Ingestion result with extracted facts
        """
        
        # Validate file
        if not os.path.exists(file_path):
            return {"success": False, "error": "File not found"}
        
        if not file_path.lower().endswith('.pdf'):
            return {"success": False, "error": "File must be PDF"}
        
        # Generate document ID
        doc_id = self._generate_doc_id(file_path)
        
        # Copy to upload directory
        dest_path = os.path.join(self.upload_dir, f"{doc_id}.pdf")
        
        try:
            import shutil
            shutil.copy2(file_path, dest_path)
        except Exception as e:
            logger.error(f"Failed to copy file: {e}")
            return {"success": False, "error": "Failed to store file"}
        
        # Extract text chunks
        chunks = self.pdf_processor.extract_text(dest_path)
        
        if not chunks:
            return {
                "success": False,
                "error": "No text could be extracted from PDF",
                "document_id": doc_id
            }
        
        # Extract facts using AI
        facts = self.fact_extractor.extract_facts(chunks, source_type)
        
        # Create document record
        document_info = {
            "document_id": doc_id,
            "title": title or os.path.basename(file_path),
            "source_type": source_type,
            "authority_level": self._get_authority_level(source_type),
            "file_path": dest_path,
            "upload_date": datetime.now().isoformat(),
            "total_pages": max(c.page_number for c in chunks),
            "chunks_processed": len(chunks),
            "facts_extracted": len(facts),
            "compliance_approved": compliance_approved,
            "extracted_facts": [
                {
                    "question": f.question,
                    "answer": f.answer,
                    "crop": f.crop,
                    "category": f.category,
                    "region": f.region,
                    "season": f.season,
                    "page": f.page_number
                }
                for f in facts
            ]
        }
        
        # Save document metadata
        metadata_path = os.path.join(self.upload_dir, f"{doc_id}.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(document_info, f, indent=2)
        
        logger.info(f"Successfully ingested document: {doc_id} with {len(facts)} facts")
        
        return {
            "success": True,
            "document_id": doc_id,
            "facts_count": len(facts),
            "document": document_info
        }
    
    def _generate_doc_id(self, file_path: str) -> str:
        """Generate unique document ID."""
        hash_input = f"{file_path}{datetime.now().isoformat()}"
        return hashlib.md5(hash_input.encode()).hexdigest()[:12]
    
    def _get_authority_level(self, source_type: str) -> int:
        """Get authority level based on source type."""
        levels = {
            "KALRO": 5,
            "KEPHIS": 5,
            "FAO": 4,
            "MINISTRY": 4,
            "RESEARCH": 3,
            "EXTENSION": 2
        }
        return levels.get(source_type.upper(), 1)
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """List all ingested documents."""
        documents = []
        
        for filename in os.listdir(self.upload_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.upload_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        doc = json.load(f)
                        documents.append(doc)
                except Exception as e:
                    logger.warning(f"Failed to load document metadata: {e}")
        
        return sorted(documents, key=lambda x: x.get('upload_date', ''), reverse=True)
    
    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get specific document by ID."""
        metadata_path = os.path.join(self.upload_dir, f"{doc_id}.json")
        
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        
        return None
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and its metadata."""
        try:
            pdf_path = os.path.join(self.upload_dir, f"{doc_id}.pdf")
            json_path = os.path.join(self.upload_dir, f"{doc_id}.json")
            
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            if os.path.exists(json_path):
                os.remove(json_path)
            
            logger.info(f"Deleted document: {doc_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            return False


# Global pipeline instance
_ingestion_pipeline: Optional[DocumentIngestionPipeline] = None

def get_ingestion_pipeline() -> DocumentIngestionPipeline:
    """Get or create global ingestion pipeline."""
    global _ingestion_pipeline
    if _ingestion_pipeline is None:
        _ingestion_pipeline = DocumentIngestionPipeline()
    return _ingestion_pipeline
