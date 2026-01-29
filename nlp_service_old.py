#!/usr/bin/env python3
"""
Advanced NLP Service for Water Infrastructure Chatbot
Provides intelligent query parsing with fuzzy matching, entity extraction, and context awareness
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List, Union, Any
import re
import json
import requests
from rapidfuzz import fuzz, process
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("sklearn not available, using basic fuzzy matching only")

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

app = FastAPI(title="Water Infrastructure NLP Service", version="1.0.0")

# Enhanced keyword categories with variations and synonyms
KEYWORD_CATEGORIES = {
    "Villages with Water": [
        "villages with water", "villages water available", "water villages", 
        "villages having water", "villages water supply", "villages with supply",
        "water available villages", "connected villages", "supplied villages"
    ],
    "Villages No Water": [
        "villages no water", "villages without water", "no water villages",
        "villages water shortage", "villages lacking water", "disconnected villages",
        "unsupplied villages", "villages no supply", "water not available"
    ],
    "Consistent Water": [
        "consistent water", "regular water", "reliable water", "stable water",
        "continuous water", "steady water", "uninterrupted water",
        "constant water", "dependable water", "good water supply"
    ],
    "Consistent Zero": [
        "consistent zero", "no water consistently", "zero water", "always zero",
        "consistently empty", "regular zero", "stable zero", "continuous zero",
        "persistent zero", "constant zero", "zero supply"
    ],
    "Above 55 LPCD": [
        "above 55 lpcd", "more than 55 lpcd", "over 55 lpcd", "higher than 55",
        "above 55", "greater than 55", "exceeding 55", "55+ lpcd",
        "high lpcd", "good lpcd", "sufficient lpcd"
    ],
    "Below 55 LPCD": [
        "below 55 lpcd", "less than 55 lpcd", "under 55 lpcd", "lower than 55",
        "below 55", "under 55", "insufficient lpcd", "low lpcd",
        "poor lpcd", "inadequate lpcd", "deficient lpcd"
    ],
    "Consistent Above 55": [
        "consistent above 55", "regularly above 55", "consistently high lpcd",
        "reliable above 55", "stable above 55", "steady above 55",
        "continuous above 55", "constantly above 55"
    ],
    "Consistent Below 55": [
        "consistent below 55", "regularly below 55", "consistently low lpcd",
        "reliable below 55", "stable below 55", "steady below 55",
        "continuous below 55", "constantly below 55"
    ],
    "Optimal Chlorine": [
        "optimal chlorine", "good chlorine", "proper chlorine", "right chlorine",
        "correct chlorine", "appropriate chlorine", "ideal chlorine",
        "perfect chlorine", "best chlorine", "suitable chlorine",
        "adequate chlorine", "normal chlorine", "acceptable chlorine"
    ],
    "Below Chlorine": [
        "below chlorine", "low chlorine", "insufficient chlorine", "poor chlorine",
        "inadequate chlorine", "deficient chlorine", "weak chlorine",
        "minimal chlorine", "reduced chlorine", "under chlorine"
    ],
    "Above Chlorine": [
        "above chlorine", "high chlorine", "excess chlorine", "too much chlorine",
        "excessive chlorine", "over chlorine", "strong chlorine",
        "heavy chlorine", "concentrated chlorine", "elevated chlorine"
    ],
    "Optimal Pressure": [
        "optimal pressure", "good pressure", "proper pressure", "right pressure",
        "correct pressure", "appropriate pressure", "ideal pressure",
        "perfect pressure", "best pressure", "suitable pressure",
        "adequate pressure", "normal pressure", "acceptable pressure"
    ],
    "Below Pressure": [
        "below pressure", "low pressure", "insufficient pressure", "poor pressure",
        "inadequate pressure", "deficient pressure", "weak pressure",
        "minimal pressure", "reduced pressure", "under pressure"
    ],
    "Above Pressure": [
        "above pressure", "high pressure", "excess pressure", "too much pressure",
        "excessive pressure", "over pressure", "strong pressure",
        "heavy pressure", "elevated pressure", "intense pressure"
    ]
}

# Database configuration
DATABASE_CONFIG = {
    "host": "localhost",
    "port": 5000,
    "base_url": "http://localhost:5000/api"
}

class QueryRequest(BaseModel):
    query: str
    regions: Optional[List[str]] = None
    schemes: Optional[List[Dict[str, Any]]] = None

class ParsedResponse(BaseModel):
    keyword: Optional[str] = None
    scope_type: str = "all"  # "all", "region", "scheme"
    scope_value: Optional[Union[str, Dict[str, Any]]] = None
    confidence_score: float = 0.0
    detected_entities: Dict[str, Any] = {}

class NLPProcessor:
    def __init__(self):
        if SKLEARN_AVAILABLE:
            self.vectorizer = TfidfVectorizer(
                stop_words='english',
                lowercase=True,
                ngram_range=(1, 3),
                max_features=1000
            )
            self._fit_vectorizer()
        else:
            self.vectorizer = None
        
    def _fit_vectorizer(self):
        """Pre-fit vectorizer with all possible keywords and variations"""
        if not SKLEARN_AVAILABLE:
            return
            
        all_texts = []
        for category, variations in KEYWORD_CATEGORIES.items():
            all_texts.extend(variations)
            all_texts.append(category)
        
        # Add common region and scheme terms
        all_texts.extend([
            "nagpur", "pune", "mumbai", "nashik", "amravati", "konkan",
            "chhatrapati sambhajinagar", "scheme", "project", "rrws", "wss",
            "villages", "block", "district", "region", "area"
        ])
        
        self.vectorizer.fit(all_texts)
    
    def extract_keyword(self, query: str) -> tuple[Optional[str], float]:
        """Extract the best matching keyword using TF-IDF and fuzzy matching"""
        query_lower = query.lower()
        
        # First try exact/fuzzy matching for performance
        best_keyword = None
        best_score = 0
        
        for category, variations in KEYWORD_CATEGORIES.items():
            for variation in variations:
                # Fuzzy matching
                fuzzy_score = fuzz.partial_ratio(query_lower, variation.lower()) / 100
                if fuzzy_score > best_score and fuzzy_score > 0.7:
                    best_keyword = category
                    best_score = fuzzy_score
        
        # If fuzzy matching doesn't work well, use TF-IDF similarity
        if best_score < 0.8 and SKLEARN_AVAILABLE and self.vectorizer:
            try:
                query_vector = self.vectorizer.transform([query_lower])
                
                for category, variations in KEYWORD_CATEGORIES.items():
                    category_texts = variations + [category.lower()]
                    category_vectors = self.vectorizer.transform(category_texts)
                    
                    # Calculate max similarity with any variation
                    similarities = cosine_similarity(query_vector, category_vectors)[0]
                    max_sim = np.max(similarities)
                    
                    if max_sim > best_score and max_sim > 0.3:
                        best_keyword = category
                        best_score = max_sim
                        
            except Exception:
                pass
        
        return best_keyword, best_score
    
    def extract_region(self, query: str, available_regions: Optional[List[str]]) -> tuple[Optional[str], float]:
        """Extract region name using fuzzy matching"""
        if not available_regions:
            return None, 0.0
            
        query_lower = query.lower()
        
        # Try to find region mentions
        best_region = None
        best_score = 0
        
        for region in available_regions:
            region_lower = region.lower()
            
            # Direct fuzzy matching
            fuzzy_score = fuzz.partial_ratio(query_lower, region_lower) / 100
            if fuzzy_score > best_score and fuzzy_score > 0.6:
                best_region = region
                best_score = fuzzy_score
            
            # Check for region name components (e.g., "sambhajinagar" for "Chhatrapati Sambhajinagar")
            region_parts = region_lower.split()
            for part in region_parts:
                if len(part) > 3:  # Avoid matching small words
                    if part in query_lower:
                        score = 0.9
                        if score > best_score:
                            best_region = region
                            best_score = score
        
        return best_region, best_score
    
    def extract_scheme(self, query: str, available_schemes: Optional[List[Dict[str, Any]]]) -> tuple[Optional[Dict[str, Any]], float]:
        """Extract scheme information using fuzzy matching"""
        if not available_schemes:
            return None, 0.0
            
        query_lower = query.lower()
        
        # Extract potential scheme IDs (numbers)
        scheme_id_pattern = r'\b(\d{3,6})\b'
        scheme_ids = re.findall(scheme_id_pattern, query)
        
        best_scheme = None
        best_score = 0
        
        # First check for scheme ID matches
        for scheme in available_schemes:
            scheme_id = str(scheme.get('scheme_id', ''))
            if scheme_id in scheme_ids:
                return {
                    "id": scheme_id,
                    "name": scheme.get('scheme_name', ''),
                    "full_data": scheme
                }, 1.0
        
        # Then check for scheme name fuzzy matching
        for scheme in available_schemes:
            scheme_name = scheme.get('scheme_name', '').lower()
            if not scheme_name:
                continue
                
            # Fuzzy match full name
            fuzzy_score = fuzz.partial_ratio(query_lower, scheme_name) / 100
            if fuzzy_score > best_score and fuzzy_score > 0.6:
                best_scheme = {
                    "id": str(scheme.get('scheme_id', '')),
                    "name": scheme.get('scheme_name', ''),
                    "full_data": scheme
                }
                best_score = fuzzy_score
            
            # Check for individual words in scheme name (all words must be present)
            scheme_words = scheme_name.split()
            if len(scheme_words) > 1:
                word_matches = 0
                for word in scheme_words:
                    if len(word) > 2 and word in query_lower:
                        word_matches += 1
                
                if word_matches >= len(scheme_words) * 0.6:  # At least 60% of words match
                    score = word_matches / len(scheme_words)
                    if score > best_score:
                        best_scheme = {
                            "id": str(scheme.get('scheme_id', '')),
                            "name": scheme.get('scheme_name', ''),
                            "full_data": scheme
                        }
                        best_score = score
        
        return best_scheme, best_score
    
    def parse_query(self, query: str, regions: Optional[List[str]] = None, schemes: Optional[List[Dict[str, Any]]] = None) -> ParsedResponse:
        """Parse user query and extract structured information"""
        
        # Extract keyword
        keyword, keyword_confidence = self.extract_keyword(query)
        
        # Extract region
        region, region_confidence = self.extract_region(query, regions)
        
        # Extract scheme
        scheme, scheme_confidence = self.extract_scheme(query, schemes)
        
        # Determine scope type and value based on highest confidence
        scope_type = "all"
        scope_value = None
        confidence_score = keyword_confidence or 0
        
        if scheme and scheme_confidence > 0.6:
            scope_type = "scheme"
            scope_value = scheme
            confidence_score = min(confidence_score + scheme_confidence, 1.0)
        elif region and region_confidence > 0.6:
            scope_type = "region"
            scope_value = region
            confidence_score = min(confidence_score + region_confidence, 1.0)
        
        return ParsedResponse(
            keyword=keyword,
            scope_type=scope_type,
            scope_value=scope_value,
            confidence_score=confidence_score,
            detected_entities={
                "region": {"value": region, "confidence": region_confidence} if region else None,
                "scheme": {"value": scheme, "confidence": scheme_confidence} if scheme else None,
                "keyword_confidence": keyword_confidence
            }
        )

# Initialize NLP processor
nlp_processor = NLPProcessor()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Water Infrastructure NLP Service", "status": "running"}

@app.post("/parse_query")
async def parse_query(request: QueryRequest) -> ParsedResponse:
    """
    Parse user query and extract structured information
    
    This endpoint uses advanced NLP techniques including:
    - TF-IDF vectorization for semantic similarity
    - Fuzzy string matching for typo tolerance
    - Entity extraction for regions and schemes
    - Multi-word matching for complex scheme names
    """
    try:
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Parse the query
        result = nlp_processor.parse_query(
            query=request.query,
            regions=request.regions,
            schemes=request.schemes
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.post("/analyze_query")
async def analyze_query(request: QueryRequest) -> Dict[str, Any]:
    """
    Advanced query analysis with detailed breakdown
    Returns comprehensive analysis including confidence scores for debugging
    """
    try:
        result = nlp_processor.parse_query(
            query=request.query,
            regions=request.regions,
            schemes=request.schemes
        )
        
        # Additional analysis
        query_lower = request.query.lower()
        
        return {
            "parsed_result": result.dict(),
            "query_analysis": {
                "original_query": request.query,
                "processed_query": query_lower,
                "query_length": len(request.query),
                "word_count": len(query_lower.split()),
                "contains_numbers": bool(re.search(r'\d+', query_lower)),
                "contains_lpcd": "lpcd" in query_lower,
                "contains_chlorine": "chlorine" in query_lower,
                "contains_pressure": "pressure" in query_lower,
                "contains_water": "water" in query_lower
            },
            "matching_details": result.detected_entities
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing query: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "nlp_processor"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)