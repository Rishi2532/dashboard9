/**
 * Enhanced NLP Service for Water Infrastructure Chatbot
 * Provides intelligent query parsing with fuzzy matching and entity extraction
 */

// Enhanced keyword categories with variations and synonyms
const KEYWORD_CATEGORIES = {
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
};

export interface ParsedQuery {
  keyword: string | null;
  scopeType: "all" | "region" | "scheme";
  scopeValue: string | { id: string; name: string } | null;
  confidenceScore: number;
  detectedEntities: {
    region?: { value: string; confidence: number };
    scheme?: { value: any; confidence: number };
    keywordConfidence?: number;
  };
}

/**
 * Simple fuzzy matching function (Levenshtein distance based)
 */
function fuzzyMatch(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

/**
 * Extract the best matching keyword using fuzzy matching
 */
function extractKeyword(query: string): { keyword: string | null; confidence: number } {
  const queryLower = query.toLowerCase();
  let bestKeyword: string | null = null;
  let bestScore = 0;

  for (const [category, variations] of Object.entries(KEYWORD_CATEGORIES)) {
    for (const variation of variations) {
      // Check for partial matches
      if (queryLower.includes(variation.toLowerCase())) {
        const score = 0.9;
        if (score > bestScore) {
          bestKeyword = category;
          bestScore = score;
        }
      }
      
      // Fuzzy matching
      const fuzzyScore = fuzzyMatch(queryLower, variation.toLowerCase());
      if (fuzzyScore > bestScore && fuzzyScore > 0.7) {
        bestKeyword = category;
        bestScore = fuzzyScore;
      }
    }
  }

  return { keyword: bestKeyword, confidence: bestScore };
}

/**
 * Extract region name using fuzzy matching
 */
function extractRegion(query: string, availableRegions: string[]): { region: string | null; confidence: number } {
  if (!availableRegions.length) {
    return { region: null, confidence: 0 };
  }

  const queryLower = query.toLowerCase();
  let bestRegion: string | null = null;
  let bestScore = 0;

  for (const region of availableRegions) {
    const regionLower = region.toLowerCase();
    
    // Direct substring matching
    if (queryLower.includes(regionLower)) {
      return { region, confidence: 0.95 };
    }
    
    // Check for region name components
    const regionParts = regionLower.split(' ');
    for (const part of regionParts) {
      if (part.length > 3 && queryLower.includes(part)) {
        const score = 0.8;
        if (score > bestScore) {
          bestRegion = region;
          bestScore = score;
        }
      }
    }
    
    // Fuzzy matching
    const fuzzyScore = fuzzyMatch(queryLower, regionLower);
    if (fuzzyScore > bestScore && fuzzyScore > 0.6) {
      bestRegion = region;
      bestScore = fuzzyScore;
    }
  }

  return { region: bestRegion, confidence: bestScore };
}

/**
 * Extract scheme information using fuzzy matching
 */
function extractScheme(query: string, availableSchemes: Array<{ scheme_id: string; scheme_name: string }>): { scheme: { id: string; name: string } | null; confidence: number } {
  if (!availableSchemes.length) {
    return { scheme: null, confidence: 0 };
  }

  const queryLower = query.toLowerCase();
  
  // Extract potential scheme IDs (numbers)
  const schemeIdPattern = /\b(\d{3,6})\b/g;
  const schemeIds = query.match(schemeIdPattern) || [];
  
  // First check for scheme ID matches
  for (const scheme of availableSchemes) {
    const schemeId = scheme.scheme_id.toString();
    if (schemeIds.includes(schemeId)) {
      return {
        scheme: { id: schemeId, name: scheme.scheme_name },
        confidence: 1.0
      };
    }
  }

  let bestScheme: { id: string; name: string } | null = null;
  let bestScore = 0;

  // Then check for scheme name fuzzy matching
  for (const scheme of availableSchemes) {
    const schemeName = scheme.scheme_name.toLowerCase();
    if (!schemeName) continue;
    
    // Direct substring matching
    if (queryLower.includes(schemeName) || schemeName.includes(queryLower)) {
      const score = 0.9;
      if (score > bestScore) {
        bestScheme = { id: scheme.scheme_id, name: scheme.scheme_name };
        bestScore = score;
      }
    }
    
    // Check for individual words in scheme name
    const schemeWords = schemeName.split(/\s+/);
    if (schemeWords.length > 1) {
      let wordMatches = 0;
      for (const word of schemeWords) {
        if (word.length > 2 && queryLower.includes(word)) {
          wordMatches++;
        }
      }
      
      if (wordMatches >= Math.ceil(schemeWords.length * 0.6)) {
        const score = wordMatches / schemeWords.length;
        if (score > bestScore) {
          bestScheme = { id: scheme.scheme_id, name: scheme.scheme_name };
          bestScore = score;
        }
      }
    }
    
    // Fuzzy matching
    const fuzzyScore = fuzzyMatch(queryLower, schemeName);
    if (fuzzyScore > bestScore && fuzzyScore > 0.6) {
      bestScheme = { id: scheme.scheme_id, name: scheme.scheme_name };
      bestScore = fuzzyScore;
    }
  }

  return { scheme: bestScheme, confidence: bestScore };
}

/**
 * Parse user query and extract structured information
 */
export async function parseQuery(
  query: string, 
  regions?: string[], 
  schemes?: Array<{ scheme_id: string; scheme_name: string }>
): Promise<ParsedQuery> {
  // Extract keyword
  const { keyword, confidence: keywordConfidence } = extractKeyword(query);
  
  // Extract region
  const { region, confidence: regionConfidence } = extractRegion(query, regions || []);
  
  // Extract scheme
  const { scheme, confidence: schemeConfidence } = extractScheme(query, schemes || []);
  
  // Determine scope type and value based on highest confidence
  let scopeType: "all" | "region" | "scheme" = "all";
  let scopeValue: string | { id: string; name: string } | null = null;
  let confidenceScore = keywordConfidence;
  
  if (scheme && schemeConfidence > 0.6) {
    scopeType = "scheme";
    scopeValue = scheme;
    confidenceScore = Math.min(confidenceScore + schemeConfidence, 1.0);
  } else if (region && regionConfidence > 0.6) {
    scopeType = "region";
    scopeValue = region;
    confidenceScore = Math.min(confidenceScore + regionConfidence, 1.0);
  }
  
  return {
    keyword,
    scopeType,
    scopeValue,
    confidenceScore,
    detectedEntities: {
      region: region ? { value: region, confidence: regionConfidence } : undefined,
      scheme: scheme ? { value: scheme, confidence: schemeConfidence } : undefined,
      keywordConfidence
    }
  };
}

/**
 * Fetch regions and schemes from API for parsing
 */
export async function fetchDataForParsing(): Promise<{ regions: string[]; schemes: Array<{ scheme_id: string; scheme_name: string }> }> {
  try {
    const [regionsResponse, schemesResponse] = await Promise.all([
      fetch('/api/regions').then(res => res.ok ? res.json() : []),
      fetch('/api/schemes?limit=100').then(res => res.ok ? res.json() : [])
    ]);
    
    const regions = regionsResponse.map((r: any) => r.region_name || r.name).filter(Boolean);
    const schemes = schemesResponse.map((s: any) => ({
      scheme_id: s.scheme_id || s.id,
      scheme_name: s.scheme_name || s.name
    })).filter((s: any) => s.scheme_name);
    
    return { regions, schemes };
  } catch (error) {
    console.error('Error fetching data for parsing:', error);
    return { regions: [], schemes: [] };
  }
}