#!/usr/bin/env python3
"""
Maharashtra Water Infrastructure NLP Microservice
Fast, accurate keyword detection and classification for chatbot queries
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Tuple
import uvicorn
import spacy
from rapidfuzz import fuzz, process
import re
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Maharashtra Water NLP Service", version="1.0.0")

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("✅ spaCy English model loaded successfully")
except IOError:
    logger.error("❌ spaCy model 'en_core_web_sm' not found. Please install it with: python -m spacy download en_core_web_sm")
    # Use basic NLP if spaCy not available
    nlp = None

# Request/Response models
class QueryRequest(BaseModel):
    text: str
    context: Optional[str] = None

class ClassificationResult(BaseModel):
    keyword: str
    confidence: float
    region: Optional[str] = None
    scheme_id: Optional[str] = None
    scheme_name: Optional[str] = None
    raw_text: str

# Canonical regions (exact names from database)
CANONICAL_REGIONS = [
    "Nagpur", "Amravati", "Chhatrapati Sambhajinagar", 
    "Nashik", "Konkan", "Pune"
]

# Canonical keyword labels (mapped to API endpoints)
CANONICAL_KEYWORDS = {
    # Villages - Water Supply
    "Villages with Water": "villages-with-water",
    "Villages No Water": "villages-no-water", 
    "Consistent Water": "villages-consistent-water",
    "Consistent Zero": "villages-consistent-zero-water",
    
    # Villages - LPCD Analysis
    "Above 55 LPCD": "villages-above-55-lpcd",
    "Below 55 LPCD": "villages-below-55-lpcd",
    "Consistent Above 55": "villages-consistently-above-55-lpcd",
    "Consistent Below 55": "villages-consistently-below-55-lpcd",
    
    # ESR/Sensors - Chlorine
    "Optimal Chlorine": "esr-optimal-chlorine",
    "Below Chlorine": "esr-below-chlorine",
    "Above Chlorine": "esr-above-chlorine",
    
    # ESR/Sensors - Pressure
    "Optimal Pressure": "esr-optimal-pressure",
    "Below Pressure": "esr-below-pressure",
    "Above Pressure": "esr-above-pressure"
}

# Comprehensive synonym mapping for fuzzy matching
KEYWORD_SYNONYMS = {
    # Chlorine variants
    "Optimal Chlorine": [
        "optimal chlorine", "optimum chlorine", "good chlorine", "right chlorine range",
        "chlorine ok", "optimal range chlorine", "proper chlorine", "ideal chlorine",
        "chlorine optimal", "chlorine in range", "correct chlorine level"
    ],
    "Below Chlorine": [
        "low chlorine", "chlorine below range", "insufficient chlorine", "poor chlorine",
        "chlorine low", "under chlorine", "chlorine below", "inadequate chlorine"
    ],
    "Above Chlorine": [
        "high chlorine", "chlorine above range", "excessive chlorine", "too much chlorine",
        "chlorine high", "over chlorine", "chlorine above", "chlorine excess"
    ],
    
    # Pressure variants
    "Optimal Pressure": [
        "optimal pressure", "good pressure", "pressure ok", "right pressure",
        "proper pressure", "ideal pressure", "pressure optimal", "pressure in range"
    ],
    "Below Pressure": [
        "low pressure", "pressure below range", "insufficient pressure", "poor pressure",
        "pressure low", "under pressure", "pressure below", "inadequate pressure"
    ],
    "Above Pressure": [
        "high pressure", "pressure above range", "excessive pressure", "too much pressure",
        "pressure high", "over pressure", "pressure above", "pressure excess"
    ],
    
    # LPCD variants
    "Above 55 LPCD": [
        "above 55 lpcd", ">=55 lpcd", "above fifty five lpcd", "villages with above 55 lpcd",
        "more than 55 lpcd", "over 55 lpcd", "lpcd above 55", "55+ lpcd"
    ],
    "Below 55 LPCD": [
        "below 55 lpcd", "<=55 lpcd", "less than 55 lpcd", "under 55 lpcd",
        "lpcd below 55", "lpcd under 55", "insufficient lpcd"
    ],
    "Consistent Above 55": [
        "consistent above 55", "consistently above 55 lpcd", "always above 55",
        "regularly above 55", "stable above 55"
    ],
    "Consistent Below 55": [
        "consistent below 55", "consistently below 55 lpcd", "always below 55",
        "regularly below 55", "stable below 55"
    ],
    
    # Water supply variants
    "Villages with Water": [
        "villages with water", "villages having water", "water available villages",
        "villages with supply", "water supply villages", "villages getting water"
    ],
    "Villages No Water": [
        "villages without water", "no water villages", "villages no supply",
        "water shortage villages", "villages lacking water", "dry villages"
    ],
    "Consistent Water": [
        "consistent water", "consistent supply", "regular supply", "reliable water",
        "stable water supply", "continuous water", "uninterrupted supply"
    ],
    "Consistent Zero": [
        "consistent zero", "consistent zero supply", "always zero", "permanently zero",
        "continuously zero", "zero throughout", "no supply consistently"
    ]
}

# Stopwords for scheme name cleaning
SCHEME_STOPWORDS = {
    "scheme", "wss", "rrws", "project", "supply", "water", "rural", "regional",
    "tal", "taluka", "dist", "district", "village", "villages", "phase",
    "and", "the", "of", "in", "at", "for", "with", "under", "&"
}

def clean_text(text: str) -> str:
    """Normalize text for better matching"""
    if not text:
        return ""
    
    # Remove special characters and normalize
    text = re.sub(r'[^\w\s\-]', ' ', text.lower())
    text = re.sub(r'\s+', ' ', text.strip())
    return text

def tokenize_scheme_name(name: str) -> List[str]:
    """Extract significant tokens from scheme name"""
    if not name:
        return []
    
    # Clean and tokenize
    cleaned = clean_text(name)
    tokens = cleaned.split()
    
    # Remove stopwords and short tokens
    significant_tokens = [
        token for token in tokens 
        if len(token) > 2 and token.lower() not in SCHEME_STOPWORDS
    ]
    
    return significant_tokens

def detect_region(text: str) -> Optional[str]:
    """Detect region from text using fuzzy matching"""
    text_clean = clean_text(text)
    
    # First try exact substring match
    for region in CANONICAL_REGIONS:
        if region.lower() in text_clean:
            return region
    
    # Then try fuzzy matching with high threshold
    matches = process.extractOne(
        text_clean, 
        [r.lower() for r in CANONICAL_REGIONS],
        scorer=fuzz.partial_ratio
    )
    
    if matches and matches[1] >= 90:  # High confidence threshold
        # Map back to canonical case
        for region in CANONICAL_REGIONS:
            if region.lower() == matches[0]:
                return region
    
    return None

def detect_scheme(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Detect scheme ID or name from text with strict matching
    Returns (scheme_id, scheme_name)
    """
    # Look for numeric scheme ID pattern
    scheme_id_pattern = r'\b(?:scheme\s+)?(\d{7,10})\b'
    id_match = re.search(scheme_id_pattern, text, re.IGNORECASE)
    if id_match:
        return id_match.group(1), None
    
    # For scheme name matching, we'd need access to the database
    # This is a placeholder - in production, you'd query the schemes table
    # and use the tokenize_scheme_name function for matching
    
    return None, None

def detect_keyword_by_synonyms(text: str) -> Tuple[Optional[str], float]:
    """Detect keyword using synonym mapping"""
    text_clean = clean_text(text)
    text_tokens = set(text_clean.split())
    
    best_match = None
    best_score = 0.0
    
    for canonical_keyword, synonyms in KEYWORD_SYNONYMS.items():
        for synonym in synonyms:
            synonym_tokens = set(clean_text(synonym).split())
            
            # Check if all synonym tokens appear in text
            if synonym_tokens.issubset(text_tokens):
                # Calculate match strength (higher = better)
                match_strength = len(synonym_tokens) / len(text_tokens) * 100
                if match_strength > best_score:
                    best_match = canonical_keyword
                    best_score = match_strength
    
    return best_match, best_score

def detect_keyword_by_fuzzy(text: str) -> Tuple[Optional[str], float]:
    """Fallback fuzzy matching against canonical labels"""
    text_clean = clean_text(text)
    
    matches = process.extractOne(
        text_clean,
        list(CANONICAL_KEYWORDS.keys()),
        scorer=fuzz.token_set_ratio
    )
    
    if matches and matches[1] >= 85:  # High threshold for accuracy
        return matches[0], matches[1]
    
    return None, 0.0

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Maharashtra Water NLP"}

@app.post("/classify", response_model=ClassificationResult)
async def classify_query(request: QueryRequest):
    """
    Classify water infrastructure query into canonical categories
    """
    try:
        text = request.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Empty query text")
        
        logger.info(f"🔍 Classifying query: '{text}'")
        
        # Process with spaCy if available
        if nlp:
            doc = nlp(text)
        
        # 1. Detect region
        region = detect_region(text)
        logger.info(f"📍 Region detected: {region}")
        
        # 2. Detect scheme
        scheme_id, scheme_name = detect_scheme(text)
        logger.info(f"🏗️ Scheme detected: ID={scheme_id}, Name={scheme_name}")
        
        # 3. Detect keyword using synonyms (primary method)
        keyword, confidence = detect_keyword_by_synonyms(text)
        
        # 4. Fallback to fuzzy matching if needed
        if not keyword or confidence < 60:
            keyword_fuzzy, confidence_fuzzy = detect_keyword_by_fuzzy(text)
            if confidence_fuzzy > confidence:
                keyword, confidence = keyword_fuzzy, confidence_fuzzy
        
        # 5. Apply confidence threshold and margin logic
        if confidence < 85:
            keyword = None
            confidence = 0.0
        
        logger.info(f"🎯 Final classification: keyword={keyword}, confidence={confidence:.1f}%")
        
        return ClassificationResult(
            keyword=keyword or "unknown",
            confidence=confidence / 100.0,  # Convert to 0-1 scale
            region=region,
            scheme_id=scheme_id,
            scheme_name=scheme_name,
            raw_text=text
        )
        
    except Exception as e:
        logger.error(f"❌ Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.get("/keywords")
async def get_keywords():
    """Get all supported keywords and their API endpoints"""
    return {
        "canonical_keywords": CANONICAL_KEYWORDS,
        "regions": CANONICAL_REGIONS,
        "synonym_count": {k: len(v) for k, v in KEYWORD_SYNONYMS.items()}
    }

if __name__ == "__main__":
    # Run the service
    port = int(os.getenv("NLP_SERVICE_PORT", "8001"))
    uvicorn.run(
        "nlp_service:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False
    )