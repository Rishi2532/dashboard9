import { Router } from "express";
import { Pool } from "pg";
import { getDB } from "../db";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { waterSchemeData, chlorineData, pressureData } from "@shared/schema";

const router = Router();

// Fixed canonical regions
const CANONICAL_REGIONS = [
  "Nagpur", "Amravati", "Chhatrapati Sambhajinagar", 
  "Nashik", "Konkan", "Pune"
];

// Fixed keyword set with comprehensive synonym mapping for all categories including water infrastructure
const KEYWORD_SYNONYMS = {
  "Flow Meters": [
    "flow meters", "flow meter", "fm", "flow measurement", "water flow meter",
    "flowmeter", "flow sensors", "flow devices", "flow monitoring",
    "meters flow", "water meter", "flow instrumentation"
  ],
  "Chlorine Analyzers": [
    "chlorine", "chlorine analyzers", "residual chlorine analyzers", "rca",
    "chlorine analyzer", "residual chlorine", "chlorine monitoring",
    "chlorine sensors", "chlorine measurement", "chlorine testing",
    "water chlorine", "chlorine levels", "chlorination", "disinfection"
  ],
  "Pressure Transmitters": [
    "pressure", "pressure transmitters", "pt", "pressure transmitter",
    "pressure sensors", "pressure monitoring", "pressure measurement",
    "water pressure", "pressure devices", "pressure instruments",
    "pressure transducers", "pressure gauges"
  ],
  "ESRs": [
    "esrs", "esr", "elevated storage reservoir", "elevated storage reservoirs",
    "water tank", "water tanks", "storage tank", "storage tanks",
    "water reservoir", "water reservoirs", "overhead tank", "overhead tanks"
  ],
  "Summary Statistics": [
    "summary statistics", "summary stats", "overall statistics", "total statistics",
    "regional summary", "aggregate statistics", "consolidated data",
    "overall summary", "total summary", "complete statistics",
    "summary data", "statistical summary", "data summary"
  ],
  "Export to Excel": [
    "export to excel", "export excel", "download excel", "excel export",
    "export data to excel", "save to excel", "generate excel",
    "create excel file", "excel download", "data export excel",
    "export spreadsheet", "download data excel"
  ],
  "Fully Completed Schemes": [
    "fully completed schemes", "completed schemes", "fully completed",
    "schemes completed", "finished schemes", "complete schemes",
    "schemes fully completed", "fully finished schemes",
    "completely finished schemes", "100% completed schemes"
  ],
  "Fully Completed Villages": [
    "fully completed villages", "completed villages", "villages completed",
    "finished villages", "complete villages", "villages fully completed",
    "fully finished villages", "completely finished villages",
    "100% completed villages", "villages with completed schemes"
  ],
  
  // Water Infrastructure Keywords
  "Villages with Water": [
    "villages with water", "villages having water", "villages getting water",
    "villages receiving water", "water villages", "villages water supply",
    "villages with water supply", "water supplied villages", "villages supplied"
  ],
  "Villages No Water": [
    "villages no water", "villages without water", "villages having no water",
    "no water villages", "villages not getting water", "villages with no water",
    "villages lacking water", "villages not receiving water", "zero water villages"
  ],
  
  // LPCD Keywords  
  "Above 55 LPCD": [
    "above 55 lpcd", "above 55", "lpcd above 55", "over 55 lpcd", 
    "more than 55 lpcd", "higher than 55 lpcd", "55+ lpcd", "lpcd over 55"
  ],
  "Below 55 LPCD": [
    "below 55 lpcd", "below 55", "lpcd below 55", "under 55 lpcd",
    "less than 55 lpcd", "lower than 55 lpcd", "lpcd under 55"
  ],
  
  // Pressure Keywords
  "Optimal Pressure": [
    "optimal pressure", "good pressure", "proper pressure", "normal pressure",
    "adequate pressure", "suitable pressure", "optimal water pressure"
  ],
  "Below Pressure": [
    "below pressure", "low pressure", "insufficient pressure", "poor pressure",
    "inadequate pressure", "weak pressure", "pressure below normal"
  ],
  "Above Pressure": [
    "above pressure", "high pressure", "excess pressure", "over pressure",
    "excessive pressure", "pressure above normal", "too much pressure"
  ],
  
  // Chlorine Keywords  
  "Optimal Chlorine": [
    "optimal chlorine", "good chlorine", "proper chlorine", "normal chlorine",
    "adequate chlorine", "suitable chlorine", "optimal chlorine levels"
  ],
  "Below Chlorine": [
    "below chlorine", "low chlorine", "insufficient chlorine", "poor chlorine",
    "inadequate chlorine", "weak chlorine", "chlorine below normal"
  ],
  "Above Chlorine": [
    "above chlorine", "high chlorine", "excess chlorine", "over chlorine",
    "excessive chlorine", "chlorine above normal", "too much chlorine"
  ]
};

// Stopwords for scheme name processing
const SCHEME_STOPWORDS = new Set([
  "scheme", "wss", "rrws", "project", "water", "supply", "system",
  "rural", "regional", "the", "and", "of", "in", "at", "to", "for"
]);

function normalizeText(text: string): string {
  // Convert to lowercase and remove punctuation
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized;
}

function fuzzyMatch(str1: string, str2: string): number {
  // Simple Levenshtein distance based fuzzy matching
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

function detectKeyword(query: string): { keyword: string | null; confidence: number } {
  const queryNorm = normalizeText(query);
  
  // ENHANCED: Check for specific pressure and LPCD combinations first
  // This prevents "optimal" from matching LPCD when pressure is mentioned
  if (queryNorm.includes('pressure')) {
    if (queryNorm.includes('optimal') || queryNorm.includes('good') || queryNorm.includes('proper')) {
      return { keyword: 'Optimal Pressure', confidence: 0.98 };
    }
    if (queryNorm.includes('below') || queryNorm.includes('low') || queryNorm.includes('insufficient')) {
      return { keyword: 'Below Pressure', confidence: 0.98 };
    }
    if (queryNorm.includes('above') || queryNorm.includes('high') || queryNorm.includes('excess')) {
      return { keyword: 'Above Pressure', confidence: 0.98 };
    }
  }
  
  if (queryNorm.includes('chlorine')) {
    if (queryNorm.includes('optimal') || queryNorm.includes('good') || queryNorm.includes('proper')) {
      return { keyword: 'Optimal Chlorine', confidence: 0.98 };
    }
    if (queryNorm.includes('below') || queryNorm.includes('low') || queryNorm.includes('insufficient')) {
      return { keyword: 'Below Chlorine', confidence: 0.98 };
    }
    if (queryNorm.includes('above') || queryNorm.includes('high') || queryNorm.includes('excess')) {
      return { keyword: 'Above Chlorine', confidence: 0.98 };
    }
  }
  
  if (queryNorm.includes('lpcd')) {
    if (queryNorm.includes('above') || queryNorm.includes('55') && (queryNorm.includes('above') || queryNorm.includes('more') || queryNorm.includes('higher'))) {
      return { keyword: 'Above 55 LPCD', confidence: 0.98 };
    }
    if (queryNorm.includes('below') || queryNorm.includes('55') && (queryNorm.includes('below') || queryNorm.includes('less') || queryNorm.includes('under'))) {
      return { keyword: 'Below 55 LPCD', confidence: 0.98 };
    }
  }
  
  // First try exact token presence in synonym map
  for (const [canonicalLabel, synonyms] of Object.entries(KEYWORD_SYNONYMS)) {
    for (const synonym of synonyms) {
      const synonymNorm = normalizeText(synonym);
      const synonymWords = synonymNorm.split(' ');
      
      // Check if all words of synonym appear in query
      const allWordsMatch = synonymWords.every(word => queryNorm.includes(word));
      if (allWordsMatch) {
        return { keyword: canonicalLabel, confidence: 0.95 };
      }
    }
  }
  
  // Fallback to fuzzy matching against canonical labels
  const canonicalLabels = Object.keys(KEYWORD_SYNONYMS);
  let bestKeyword: string | null = null;
  let bestScore = 0;
  
  for (const label of canonicalLabels) {
    const score = fuzzyMatch(queryNorm, normalizeText(label));
    if (score > bestScore && score >= 0.85) {
      bestKeyword = label;
      bestScore = score;
    }
  }
  
  return { keyword: bestKeyword, confidence: bestScore };
}

function detectRegion(query: string): { region: string | null; confidence: number } {
  const queryNorm = normalizeText(query);
  
  // Try substring matching first
  for (const region of CANONICAL_REGIONS) {
    const regionNorm = normalizeText(region);
    if (queryNorm.includes(regionNorm)) {
      return { region, confidence: 0.95 };
    }
  }
  
  // Fuzzy matching with ≥90% threshold
  let bestRegion: string | null = null;
  let bestScore = 0;
  
  for (const region of CANONICAL_REGIONS) {
    const score = fuzzyMatch(queryNorm, normalizeText(region));
    if (score > bestScore && score >= 0.90) {
      bestRegion = region;
      bestScore = score;
    }
  }
  
  return { region: bestRegion, confidence: bestScore };
}

async function detectScheme(query: string): Promise<{ scheme: { id: string; name: string } | null; confidence: number }> {
  // Check for numeric ID first
  const numericPattern = /\b(\d{3,6})\b/;
  const numericMatch = query.match(numericPattern);
  
  if (numericMatch) {
    const schemeId = numericMatch[1];
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await pool.connect();
      
      const result = await client.query("SELECT scheme_id, scheme_name FROM scheme_status WHERE scheme_id = $1", [schemeId]);
      client.release();
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return { 
          scheme: { id: row.scheme_id, name: row.scheme_name }, 
          confidence: 0.98 
        };
      }
    } catch (error) {
      console.error("Error checking scheme ID:", error);
    }
  }
  
  // Name-based matching
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    const result = await client.query("SELECT DISTINCT scheme_id, scheme_name FROM scheme_status");
    const schemes = result.rows;
    client.release();
    
    const queryNorm = normalizeText(query);
    console.log(`DEBUG: Scheme detection for query: "${query}" -> normalized: "${queryNorm}"`);
    const queryTokens = new Set(queryNorm.split(' ').filter(token => !SCHEME_STOPWORDS.has(token)));
    console.log(`DEBUG: Query tokens after stopwords:`, Array.from(queryTokens));
    
    const candidates: Array<{ scheme: any; score: number }> = [];
    
    for (const scheme of schemes) {
      const schemeName = scheme.scheme_name;
      const schemeNorm = normalizeText(schemeName);
      const schemeTokens = new Set(schemeNorm.split(' ').filter(token => !SCHEME_STOPWORDS.has(token)));
      
      // Check if this is the Bidgaon scheme we're looking for
      if (schemeName.toLowerCase().includes('bidgaon')) {
        console.log(`DEBUG: Found Bidgaon scheme: "${schemeName}" -> normalized: "${schemeNorm}"`);
        console.log(`DEBUG: Scheme tokens:`, Array.from(schemeTokens));
      }
      
      // Require ALL significant tokens in scheme name to appear in query
      if (schemeTokens.size > 0) {
        let allTokensPresent = true;
        let missingTokens = [];
        for (const token of Array.from(schemeTokens)) {
          if (!queryNorm.includes(token)) {
            allTokensPresent = false;
            missingTokens.push(token);
          }
        }
        
        if (schemeName.toLowerCase().includes('bidgaon')) {
          console.log(`DEBUG: Bidgaon scheme token check - all present: ${allTokensPresent}, missing:`, missingTokens);
        }
        
        if (allTokensPresent) {
          const score = fuzzyMatch(queryNorm, schemeNorm) * 100;
          if (schemeName.toLowerCase().includes('bidgaon')) {
            console.log(`DEBUG: Bidgaon fuzzy match score: ${score} (threshold: 88)`);
          }
          if (score >= 85) { // Lowered threshold to 85
            candidates.push({ scheme, score });
            console.log(`DEBUG: Added candidate: "${schemeName}" with score: ${score}`);
          }
        }
      }
    }
    
    console.log(`DEBUG: Found ${candidates.length} scheme candidates`);
    
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      return {
        scheme: { id: best.scheme.scheme_id, name: best.scheme.scheme_name },
        confidence: best.score / 100
      };
    }
  } catch (error) {
    console.error("Error in scheme detection:", error);
  }
  
  return { scheme: null, confidence: 0 };
}

// Parse query endpoint
router.post("/parse", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query is required and must be a string" });
    }
    
    const keywordResult = detectKeyword(query);
    const regionResult = detectRegion(query);
    const schemeResult = await detectScheme(query);
    
    // Determine scope
    let scopeType = "all";
    let scopeValue = null;
    let confidenceScore = keywordResult.confidence;
    
    if (schemeResult.scheme && schemeResult.confidence > 0.88) {
      scopeType = "scheme";
      scopeValue = schemeResult.scheme;
      confidenceScore = Math.min(keywordResult.confidence, schemeResult.confidence);
    } else if (regionResult.region && regionResult.confidence > 0.90) {
      scopeType = "region";
      scopeValue = regionResult.region;
      confidenceScore = Math.min(keywordResult.confidence, regionResult.confidence);
    }
    
    res.json({
      keyword: keywordResult.keyword,
      scope_type: scopeType,
      scope_value: scopeValue,
      confidence_score: confidenceScore,
      detected_entities: {
        region: regionResult.region ? { value: regionResult.region, confidence: regionResult.confidence } : null,
        scheme: schemeResult.scheme ? { value: schemeResult.scheme, confidence: schemeResult.confidence } : null,
        keyword_confidence: keywordResult.confidence
      }
    });
  } catch (error) {
    console.error("Error parsing query:", error);
    res.status(500).json({ error: "Query parsing failed" });
  }
});

// Process query and fetch data endpoint
router.post("/query", async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query is required and must be a string" });
    }
    
    // First parse the query
    const keywordResult = detectKeyword(query);
    const regionResult = detectRegion(query);
    const schemeResult = await detectScheme(query);
    
    if (!keywordResult.keyword) {
      return res.status(400).json({ error: "Could not identify keyword from query" });
    }
    
    // Determine scope
    let scopeType = "all";
    let scopeValue = null;
    
    if (schemeResult.scheme && schemeResult.confidence > 0.88) {
      scopeType = "scheme";
      scopeValue = schemeResult.scheme;
    } else if (regionResult.region && regionResult.confidence > 0.90) {
      scopeType = "region";
      scopeValue = regionResult.region;
    }
    
    // Fetch appropriate data
    const data = await fetchDataForKeyword(keywordResult.keyword, scopeType, scopeValue);
    
    res.json({
      success: true,
      data,
      keyword: keywordResult.keyword,
      scope_type: scopeType,
      scope_value: scopeValue,
      total_count: data.length
    });
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({ error: "Query processing failed" });
  }
});

// Helper function to fetch data for different keyword categories
async function fetchDataForKeyword(keyword: string, scopeType: string, scopeValue: any): Promise<any[]> {
  console.log(`Fetching data for keyword: ${keyword}, scope: ${scopeType}, value:`, scopeValue);
  
  try {
    switch (keyword) {
      case 'Flow Meters':
        return await getFlowMeters(scopeType, scopeValue);
      case 'Chlorine Analyzers':
        return await getChlorineAnalyzers(scopeType, scopeValue);
      case 'Pressure Transmitters':
        return await getPressureTransmitters(scopeType, scopeValue);
      case 'ESRs':
        return await getESRs(scopeType, scopeValue);
      case 'Summary Statistics':
        return await getSummaryStatistics(scopeType, scopeValue);
      case 'Export to Excel':
        return [{ message: 'Excel export functionality triggered' }];
      case 'Fully Completed Schemes':
        return await getFullyCompletedSchemes(scopeType, scopeValue);
      case 'Fully Completed Villages':
        return await getFullyCompletedVillages(scopeType, scopeValue);
      
      // Water Infrastructure Keywords
      case 'Villages with Water':
        return await getVillagesWithWater(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      case 'Villages No Water':
        return await getVillagesNoWater(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      
      // LPCD Keywords
      case 'Above 55 LPCD':
        return await getVillagesAbove55LPCD(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      case 'Below 55 LPCD':
        return await getVillagesBelow55LPCD(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      
      // Pressure Keywords
      case 'Optimal Pressure':
        return await getESROptimalPressure(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      case 'Below Pressure':
        return await getESRBelowPressure(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      case 'Above Pressure':
        return await getESRAbovePressure(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      
      // Chlorine Keywords
      case 'Optimal Chlorine':
        return await getESROptimalChlorine(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      case 'Below Chlorine':
        return await getESRBelowChlorine(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      case 'Above Chlorine':
        return await getESRAboveChlorine(scopeType === 'region' ? scopeValue : undefined, scopeType === 'scheme' ? scopeValue?.id : undefined);
      
      default:
        console.log(`No handler for keyword: ${keyword}`);
        return [];
    }
  } catch (error) {
    console.error(`Error fetching data for keyword ${keyword}:`, error);
    return [];
  }
}

// Helper functions for each keyword category
const getFlowMeters = async (scopeType: string, scopeValue: any) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    let query, params: any[] = [];
    
    if (scopeType === 'all') {
      // All regions: SUM(flow_meter_integrated) from region table
      query = `
        SELECT SUM(flow_meter_integrated) as total_flow_meters,
               'All Regions' as scope_name
        FROM region
      `;
    } else if (scopeType === 'region' && scopeValue) {
      // Specific region: SUM(flow_meter_integrated) for that region
      query = `
        SELECT flow_meter_integrated as total_flow_meters,
               region_name as scope_name
        FROM region 
        WHERE region_name = $1
      `;
      params.push(scopeValue);
    } else if (scopeType === 'village' && scopeValue) {
      // Specific village: Count from communication_status table
      query = `
        SELECT COUNT(*) as total_flow_meters,
               village_name as scope_name,
               scheme_id, scheme_name, region, esr_name,
               flow_meter_connected, flow_meter_status
        FROM communication_status 
        WHERE (flow_meter_connected = 'connected' OR flow_meter_connected = 'Connected')
        AND village_name = $1
        GROUP BY village_name, scheme_id, scheme_name, region, esr_name, flow_meter_connected, flow_meter_status
      `;
      params.push(scopeValue);
    } else if (scopeType === 'scheme' && scopeValue?.id) {
      // Specific scheme: Count from communication_status table
      query = `
        SELECT COUNT(*) as total_flow_meters,
               scheme_name as scope_name,
               scheme_id, village_name, region, esr_name,
               flow_meter_connected, flow_meter_status
        FROM communication_status 
        WHERE (flow_meter_connected = 'connected' OR flow_meter_connected = 'Connected')
        AND scheme_id = $1
        GROUP BY scheme_name, scheme_id, village_name, region, esr_name, flow_meter_connected, flow_meter_status
      `;
      params.push(scopeValue.id);
    } else {
      // Fallback: individual records
      query = `
        SELECT scheme_id, scheme_name, village_name, esr_name, region, 
               flow_meter_connected, flow_meter_status
        FROM communication_status 
        WHERE (flow_meter_connected = 'connected' OR flow_meter_connected = 'Connected')
        ORDER BY scheme_name, village_name
      `;
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const getChlorineAnalyzers = async (scopeType: string, scopeValue: any) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    let query, params: any[] = [];
    
    if (scopeType === 'all') {
      // All regions: SUM(rca_integrated) from region table
      query = `
        SELECT SUM(rca_integrated) as total_chlorine_analyzers,
               'All Regions' as scope_name
        FROM region
      `;
    } else if (scopeType === 'region' && scopeValue) {
      // Specific region: SUM(rca_integrated) for that region
      query = `
        SELECT rca_integrated as total_chlorine_analyzers,
               region_name as scope_name
        FROM region 
        WHERE region_name = $1
      `;
      params.push(scopeValue);
    } else if (scopeType === 'village' && scopeValue) {
      // Specific village: Count from communication_status table
      query = `
        SELECT COUNT(*) as total_chlorine_analyzers,
               village_name as scope_name,
               scheme_id, scheme_name, region, esr_name,
               chlorine_connected, chlorine_status
        FROM communication_status 
        WHERE (chlorine_connected = 'connected' OR chlorine_connected = 'Connected')
        AND village_name = $1
        GROUP BY village_name, scheme_id, scheme_name, region, esr_name, chlorine_connected, chlorine_status
      `;
      params.push(scopeValue);
    } else if (scopeType === 'scheme' && scopeValue?.id) {
      // Specific scheme: Count from communication_status table
      query = `
        SELECT COUNT(*) as total_chlorine_analyzers,
               scheme_name as scope_name,
               scheme_id, village_name, region, esr_name,
               chlorine_connected, chlorine_status
        FROM communication_status 
        WHERE (chlorine_connected = 'connected' OR chlorine_connected = 'Connected')
        AND scheme_id = $1
        GROUP BY scheme_name, scheme_id, village_name, region, esr_name, chlorine_connected, chlorine_status
      `;
      params.push(scopeValue.id);
    } else {
      // Fallback: individual records
      query = `
        SELECT scheme_id, scheme_name, village_name, esr_name, region, 
               chlorine_connected, chlorine_status
        FROM communication_status 
        WHERE (chlorine_connected = 'connected' OR chlorine_connected = 'Connected')
        ORDER BY scheme_name, village_name
      `;
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const getPressureTransmitters = async (scopeType: string, scopeValue: any) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    let query, params: any[] = [];
    
    if (scopeType === 'all') {
      // All regions: SUM(pressure_transmitter_integrated) from region table
      query = `
        SELECT SUM(pressure_transmitter_integrated) as total_pressure_transmitters,
               'All Regions' as scope_name
        FROM region
      `;
    } else if (scopeType === 'region' && scopeValue) {
      // Specific region: SUM(pressure_transmitter_integrated) for that region
      query = `
        SELECT pressure_transmitter_integrated as total_pressure_transmitters,
               region_name as scope_name
        FROM region 
        WHERE region_name = $1
      `;
      params.push(scopeValue);
    } else if (scopeType === 'village' && scopeValue) {
      // Specific village: Count from communication_status table
      query = `
        SELECT COUNT(*) as total_pressure_transmitters,
               village_name as scope_name,
               scheme_id, scheme_name, region, esr_name,
               pressure_connected, pressure_status
        FROM communication_status 
        WHERE (pressure_connected = 'connected' OR pressure_connected = 'Connected')
        AND village_name = $1
        GROUP BY village_name, scheme_id, scheme_name, region, esr_name, pressure_connected, pressure_status
      `;
      params.push(scopeValue);
    } else if (scopeType === 'scheme' && scopeValue?.id) {
      // Specific scheme: Count from communication_status table
      query = `
        SELECT COUNT(*) as total_pressure_transmitters,
               scheme_name as scope_name,
               scheme_id, village_name, region, esr_name,
               pressure_connected, pressure_status
        FROM communication_status 
        WHERE (pressure_connected = 'connected' OR pressure_connected = 'Connected')
        AND scheme_id = $1
        GROUP BY scheme_name, scheme_id, village_name, region, esr_name, pressure_connected, pressure_status
      `;
      params.push(scopeValue.id);
    } else {
      // Fallback: individual records
      query = `
        SELECT scheme_id, scheme_name, village_name, esr_name, region, 
               pressure_connected, pressure_status
        FROM communication_status 
        WHERE (pressure_connected = 'connected' OR pressure_connected = 'Connected')
        ORDER BY scheme_name, village_name
      `;
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const getESRs = async (scopeType: string, scopeValue: any) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    let query, params: any[] = [];
    
    if (scopeType === 'all') {
      // All regions: SUM(total_esr_integrated) from region table
      query = `
        SELECT SUM(total_esr_integrated) as total_esrs,
               SUM(fully_completed_esr) as fully_completed_esrs,
               'All Regions' as scope_name
        FROM region
      `;
    } else if (scopeType === 'region' && scopeValue) {
      // Specific region: total_esr_integrated and fully_completed_esr for that region
      query = `
        SELECT total_esr_integrated as total_esrs,
               fully_completed_esr as fully_completed_esrs,
               region_name as scope_name
        FROM region 
        WHERE region_name = $1
      `;
      params.push(scopeValue);
    } else if (scopeType === 'scheme' && scopeValue?.id) {
      // Specific scheme: fully_completed_esr from scheme_status table
      query = `
        SELECT no_fully_completed_esr as fully_completed_esrs,
               total_number_of_esr as total_esrs,
               scheme_name as scope_name,
               scheme_id
        FROM scheme_status 
        WHERE scheme_id = $1
      `;
      params.push(scopeValue.id);
    } else {
      // Fallback: individual ESR records from communication_status
      query = `
        SELECT scheme_id, scheme_name, village_name, esr_name, region,
               chlorine_connected, pressure_connected, flow_meter_connected,
               overall_status
        FROM communication_status 
        WHERE esr_name IS NOT NULL AND esr_name != ''
        ORDER BY scheme_name, village_name, esr_name
      `;
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const getSummaryStatistics = async (scopeType: string, scopeValue: any) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    let query, params: any[] = [];
    
    if (scopeType === 'region' && scopeValue) {
      query = `
        SELECT *
        FROM region 
        WHERE region_name = $1
      `;
      params.push(scopeValue);
    } else {
      query = `
        SELECT *
        FROM region 
        ORDER BY region_name
      `;
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const getFullyCompletedSchemes = async (scopeType: string, scopeValue: any) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT scheme_id, scheme_name, region, circle, division, sub_division, block,
             fully_completion_scheme_status, total_number_of_esr, no_fully_completed_esr
      FROM scheme_status 
      WHERE fully_completion_scheme_status IN ('Completed', 'completed', 'fully completed', 'Fully Completed', 'Fully completed')
    `;
    const params: any[] = [];
    
    if (scopeType === 'region' && scopeValue) {
      query += ' AND region = $1';
      params.push(scopeValue);
    } else if (scopeType === 'scheme' && scopeValue?.id) {
      query += ' AND scheme_id = $1';
      params.push(scopeValue.id);
    }
    
    query += ' ORDER BY region, scheme_name';
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const getFullyCompletedVillages = async (scopeType: string, scopeValue: any) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT DISTINCT wsd.village_name, wsd.scheme_id, wsd.scheme_name, wsd.region,
             ss.fully_completion_scheme_status, wsd.population
      FROM water_scheme_data wsd
      JOIN scheme_status ss ON wsd.scheme_id = ss.scheme_id
      WHERE ss.fully_completion_scheme_status IN ('Completed', 'completed', 'fully completed', 'Fully Completed', 'Fully completed')
        AND wsd.village_name IS NOT NULL AND wsd.village_name != ''
    `;
    const params: any[] = [];
    
    if (scopeType === 'region' && scopeValue) {
      query += ' AND wsd.region = $1';
      params.push(scopeValue);
    } else if (scopeType === 'scheme' && scopeValue?.id) {
      query += ' AND wsd.scheme_id = $1';
      params.push(scopeValue.id);
    }
    
    query += ' ORDER BY wsd.region, wsd.scheme_name, wsd.village_name';
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

// Helper functions from category-data-routes - reused for consistency
const getVillagesWithWater = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  let query = db
    .select({
      village_name: waterSchemeData.village_name,
      water_value_day7: waterSchemeData.water_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name
    })
    .from(waterSchemeData)
    .where(
      and(
        isNotNull(waterSchemeData.water_value_day7),
        sql`${waterSchemeData.water_value_day7} > 0`
      )
    );

  if (region) {
    query = query.where(eq(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    query = query.where(eq(waterSchemeData.scheme_id, schemeId));
  }

  return await query.orderBy(waterSchemeData.village_name);
};

const getVillagesAbove55LPCD = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  let query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id
    })
    .from(waterSchemeData)
    .where(
      and(
        isNotNull(waterSchemeData.lpcd_value_day7),
        sql`${waterSchemeData.lpcd_value_day7} >= 55`
      )
    );

  if (region) {
    query = query.where(eq(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    query = query.where(eq(waterSchemeData.scheme_id, schemeId));
  }

  return await query.orderBy(waterSchemeData.village_name);
};

const getESROptimalPressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  let query = db
    .select({
      esr_name: pressureData.esr_name,
      pressure_value_7: pressureData.pressure_value_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id
    })
    .from(pressureData)
    .where(
      and(
        isNotNull(pressureData.pressure_value_7),
        sql`${pressureData.pressure_value_7} >= 0.2`,
        sql`${pressureData.pressure_value_7} <= 0.7`
      )
    );

  if (region) {
    query = query.where(eq(pressureData.region, region));
  }
  
  if (schemeId) {
    query = query.where(eq(pressureData.scheme_id, schemeId));
  }

  return await query.orderBy(pressureData.esr_name);
};

// Add all other helper functions for complete coverage
const getVillagesNoWater = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  let query = db
    .select({
      village_name: waterSchemeData.village_name,
      water_value_day7: waterSchemeData.water_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name
    })
    .from(waterSchemeData)
    .where(
      sql`${waterSchemeData.water_value_day7} = 0 OR ${waterSchemeData.water_value_day7} IS NULL`
    );

  if (region) {
    query = query.where(eq(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    query = query.where(eq(waterSchemeData.scheme_id, schemeId));
  }

  return await query.orderBy(waterSchemeData.village_name);
};

const getVillagesBelow55LPCD = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  let query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id
    })
    .from(waterSchemeData)
    .where(
      and(
        isNotNull(waterSchemeData.lpcd_value_day7),
        sql`${waterSchemeData.lpcd_value_day7} > 0`,
        sql`${waterSchemeData.lpcd_value_day7} < 55`
      )
    );

  if (region) {
    query = query.where(eq(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    query = query.where(eq(waterSchemeData.scheme_id, schemeId));
  }

  return await query.orderBy(waterSchemeData.village_name);
};

const getESROptimalChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_7} >= 0.2`,
    sql`${chlorineData.chlorine_value_7} <= 0.5`
  ];

  if (region) {
    whereConditions.push(eq(chlorineData.region, region));
  }
  
  if (schemeId) {
    whereConditions.push(eq(chlorineData.scheme_id, schemeId));
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      chlorine_value_7: chlorineData.chlorine_value_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

const getESRBelowChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_7} < 0.2`
  ];

  if (region) {
    whereConditions.push(eq(chlorineData.region, region));
  }
  
  if (schemeId) {
    whereConditions.push(eq(chlorineData.scheme_id, schemeId));
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      chlorine_value_7: chlorineData.chlorine_value_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

const getESRAboveChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_7} > 0.5`
  ];

  if (region) {
    whereConditions.push(eq(chlorineData.region, region));
  }
  
  if (schemeId) {
    whereConditions.push(eq(chlorineData.scheme_id, schemeId));
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      chlorine_value_7: chlorineData.chlorine_value_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

const getESRBelowPressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  let query = db
    .select({
      esr_name: pressureData.esr_name,
      pressure_value_7: pressureData.pressure_value_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id
    })
    .from(pressureData)
    .where(
      and(
        isNotNull(pressureData.pressure_value_7),
        sql`${pressureData.pressure_value_7} < 0.2`
      )
    );

  if (region) {
    query = query.where(eq(pressureData.region, region));
  }
  
  if (schemeId) {
    query = query.where(eq(pressureData.scheme_id, schemeId));
  }

  return await query.orderBy(pressureData.esr_name);
};

const getESRAbovePressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  let query = db
    .select({
      esr_name: pressureData.esr_name,
      pressure_value_7: pressureData.pressure_value_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id
    })
    .from(pressureData)
    .where(
      and(
        isNotNull(pressureData.pressure_value_7),
        sql`${pressureData.pressure_value_7} > 0.7`
      )
    );

  if (region) {
    query = query.where(eq(pressureData.region, region));
  }
  
  if (schemeId) {
    query = query.where(eq(pressureData.scheme_id, schemeId));
  }

  return await query.orderBy(pressureData.esr_name);
};

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "Enhanced NLP Chatbot" });
});

export default router;