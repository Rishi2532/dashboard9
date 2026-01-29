/**
 * OpenAI API Routes
 * Provides endpoints for interacting with OpenAI services
 */

import { Router, Request, Response } from "express";
import { config, hasApiKey } from "../../config";
import { z } from "zod";
import { getDB } from "../../db";
import { getChatCompletionStream } from "../../services/openai-service";

const router = Router();

// Schema for chat completion request
const chatCompletionSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().optional().default(150),
  temperature: z.number().optional().default(0.7),
  language: z.enum(["en", "hi", "mr"]).optional().default("en"),
});

// Schema for streaming chat completion request
const chatCompletionStreamSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  maxTokens: z.number().optional().default(500),
  temperature: z.number().optional().default(0.7),
  language: z.enum(["en", "hi", "mr"]).optional().default("en"),
});

// Schema for NLP query parsing
const nlpQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
  includeRegions: z.boolean().optional().default(true),
  includeSchemes: z.boolean().optional().default(true),
});

// Complete list of supported keywords that trigger existing API calls (extracted from ChatbotComponent.tsx)
const SUPPORTED_KEYWORDS = [
  // Equipment and infrastructure queries
  "flow meters",
  "flow meter",
  "flowmeters",
  "fm",
  "esrs",
  "esr",
  "chlorine analyzers",
  "chlorine analyzer",
  "rca",
  "cl",
  "chlorine",
  "pressure transmitters",
  "pressure transmitter",
  "pt",
  "pressure",

  // Flow Meters queries
  "flow meters integrated",
  "flow meters connected",
  "how many flow meters",
  "total flow meters",
  "flow meter count",

  // RCA/Chlorine queries
  "residual chlorine analyzers",
  "residual chlorine analyzer",
  "how many rca",
  "total rca",
  "rca integrated",
  "rca connected",
  "chlorine analyzers integrated",
  "chlorine analyzers connected",
  "how many chlorine",
  "total chlorine",

  // Pressure Transmitters queries
  "pressure transmitters integrated",
  "pressure transmitters connected",
  "how many pressure transmitters",
  "total pressure transmitters",
  "pressure transmitter count",
  "how many pressure",
  "total pressure",

  // ESR queries
  "esr integrated",
  "esr connected",
  "total esr",
  "how many esr",
  "esr count",
  "fully completed esr",
  "total number of esr",
  "total esr integrated",

  // Chlorine Range queries
  "chlorine 0.2 0.5",
  "chlorine between 0.2 and 0.5",
  "optimal chlorine",
  "chlorine less than 0.2",
  "chlorine below 0.2",
  "chlorine greater than 0.5",
  "chlorine above 0.5",
  "average optimal chlorine",
  "average chlorine optimal",
  "average chlorine 0.2 0.5",
  "average chlorine below 0.2",
  "average chlorine below optimal",
  "average chlorine above 0.5",
  "average chlorine above optimal",

  // Combined Chlorine Analysis queries
  "chlorine analysis",
  "rca analysis",
  "residual chlorine analysis",

  // Pressure Range queries
  "pressure 0.2 0.7",
  "pressure between 0.2 and 0.7",
  "optimal pressure",
  "pressure less than 0.2",
  "pressure below 0.2",
  "pressure greater than 0.7",
  "pressure above 0.7",
  "average optimal pressure",
  "average pressure optimal",
  "average pressure 0.2 0.7",
  "average pressure below 0.2",
  "average pressure below optimal",
  "average pressure above 0.7",
  "average pressure above optimal",

  // Combined Pressure Analysis queries
  "pressure analysis",
  "pressure data",

  // Summary and statistics
  "summary statistics",
  "summary",
  "area coverage",

  // Scheme completion queries
  "fully completed schemes",
  "fully completed villages",
  "partial schemes",
  "in progress schemes",

  // Combined scheme analysis queries
  "scheme analysis",
  "schemes analysis",

  // Chart generation queries (includes graph synonyms)
  "7 day water consumption analysis",
  "7-day water consumption analysis",
  "weekly water consumption",
  "weekly water analysis",
  "water consumption chart",
  "water consumption graph",
  "water consumption analysis",
  "7 day lpcd analysis",
  "7-day lpcd analysis",
  "weekly lpcd analysis",
  "lpcd chart",
  "lpcd graph",
  "lpcd analysis",
  "lpcd analysis for the week",
  "weekly lpcd",
  "7 day chart",
  "7-day chart",
  "7 day graph",
  "7-day graph",
  "weekly chart",
  "weekly graph",
  "chart generation",
  "graph generation",
  "generate chart",
  "generate graph",
  "show chart",
  "show graph",
  "create chart",
  "create graph",
  "7 day analysis",
  "7-day analysis",
  "weekly analysis",
  // Chlorine chart/graph keywords
  "chlorine chart",
  "chlorine graph",
  "7 day chlorine",
  "weekly chlorine",
  // Pressure chart/graph keywords  
  "pressure chart",
  "pressure graph",
  "7 day pressure",
  "weekly pressure",
  // Scheme LPCD keywords
  "scheme lpcd",
  "schemes lpcd",
  "scheme lpcd status",
  "lpcd of schemes",
  "lpcd schemes",
  "lpcd in all regions",
  "lpcd all regions",
  "schemes",
  "schemes integrated",
  "schemes data",
  "scheme information",
  "scheme status",
  "scheme overview",
  "schemes overview",
  "scheme details",
  "schemes details",
  "schemes information",

  // Water supply queries
  "consistent water",
  "reliable water",
  "consistent supply",
  "consistent water supply",
  "reliable supply",
  "villages with consistent",
  "villages have consistent",
  "villages with water",
  "villages having water",
  "villages no water",
  "villages without water",
  "consistent zero",
  "always zero",

  // LPCD queries
  "above 55 lpcd",
  "over 55 lpcd",
  "below 55 lpcd",
  "under 55 lpcd",
  "consistent above 55",
  "consistently above 55",
  "consistent below 55",
  "consistently below 55",
  "average above 55",
  "average lpcd above 55",
  "average above 55 lpcd",
  "average below 55",
  "average lpcd below 55",
  "average below 55 lpcd",

  // Combined water consumption analysis queries
  "water consumption",
  "water analysis",
  "water consumption analysis",
  "water usage",
  "water usage analysis",
  "water statistics",
  "water data",
  "water supply analysis",
  "water consumption statistics",
  "consumption analysis",
  "consumption statistics",

  // 7-day water consumption chart queries
  "7 day water consumption analysis",
  "7 day water analysis",
  "weekly water consumption analysis",
  "weekly water analysis",
  "water consumption graph",
  "water consumption chart",
  "water consumption graphs",
  "water consumption charts",
  "7 day water consumption graph",
  "7 day water consumption chart",
  "weekly water consumption graph",
  "weekly water consumption chart",
  "water consumption graph for village",
  "water consumption chart for village",

  // Combined LPCD analysis queries
  "lpcd statistics",
  "lpcd values",
  "lpcd analysis",
  "lpcd data",
  "lpcd information",
  "lpcd statistics analysis",
  "lpcd performance",
  "lpcd metrics",
  "lpcd distribution",
  "lpcd status",

  // 7-day LPCD chart queries
  "7 day lpcd analysis",
  "7 day lpcd",
  "weekly lpcd analysis",
  "weekly lpcd",
  "lpcd analysis for the week",
  "lpcd for the week",
  "lpcd graph",
  "lpcd chart",
  "lpcd graphs",
  "lpcd charts",
  "7 day lpcd graph",
  "7 day lpcd chart",
  "weekly lpcd graph",
  "weekly lpcd chart",
  "lpcd graph for village",
  "lpcd chart for village",

  // Village-specific historical data queries
  "village historical data",
  "water in village",
  "water consumption in village",
  "lpcd in village",
  "chlorine in village",
  "pressure in village",
  "village water data",
  "village lpcd data",
  "village chlorine data",
  "village pressure data",

  // Legacy pressure/chlorine queries (keeping existing functionality)
  "good pressure",
  "low pressure",
  "high pressure",
  "good chlorine",
  "low chlorine",
  "high chlorine",
  "excess chlorine",

  // Export queries (handled by existing logic)
  "excel",
  "export",
  "download",

  // Enhanced specific query behaviors
  "scheme details",
  "scheme information",
  "schemes details",
  "schemes information",
  "scheme analysis",
  "schemes analysis",

  // ESR in scheme queries
  "esr in scheme",
  "esrs in scheme",
  "elevated service reservoir in scheme",
  "elevated service reservoirs in scheme",
  "esr count in scheme",
  "total esr in scheme",
  "how many esr in scheme",

  // ESR in village queries
  "esr in village",
  "esrs in village",
  "elevated service reservoir in village",
  "elevated service reservoirs in village",
  "esr count in village",
  "total esr in village",
  "how many esr in village",

  // Villages in scheme queries
  "villages in scheme",
  "villages in the scheme",
  "how many villages in scheme",
  "total villages in scheme",
  "village count in scheme",
  "number of villages in scheme",

  // Water consumption in village queries
  "water consumption in village",
  "water in village",
  "water value in village",
  "water consumption for village",
  "village water consumption",
  "current water in village",
  "latest water in village",

  // LPCD in village queries
  "lpcd in village",
  "lpcd for village",
  "lpcd value in village",
  "village lpcd",
  "current lpcd in village",
  "latest lpcd in village",

  // Smart Report / PDF Report queries
  "smart report",
  "smart reports",
  "pdf report",
  "pdf reports",
  "generate report",
  "generate reports",
  "professional report",
  "professional reports",
  "comprehensive report",
  "comprehensive reports",
  "scheme report",
  "scheme reports",
  "detailed report",
  "detailed reports",
  "performance report",
  "performance reports",

  // ESR level water consumption queries
  "esr level water consumption",
  "esr water consumption",
  "water consumption by esr",
  "esr wise water consumption",
  "esr level consumption",
  "esr consumption in village",
  "water consumption for each esr",

  // Scheme detail analysis queries
  "scheme details",
  "scheme analysis",
  "schemes analysis",
  "scheme information",
  "schemes information",
  "scheme overview",
  "schemes overview",

  // ESR in scheme queries
  "esr in scheme",
  "esrs in scheme",
  "elevated service reservoir in scheme",
  "elevated service reservoirs in scheme",
  "esr count in scheme",
  "total esr in scheme",
  "how many esr in scheme",

  // ESR in village queries
  "esr in village",
  "esrs in village",
  "elevated service reservoir in village",
  "elevated service reservoirs in village",
  "esr count in village",
  "total esr in village",
  "how many esr in village",

  // Villages in scheme queries
  "villages in scheme",
  "villages in the scheme",
  "how many villages in scheme",
  "total villages in scheme",
  "village count in scheme",
  "number of villages in scheme",

  // Chlorine sensor day-wise status queries
  "sensors offline",
  "offline sensors",
  "sensors below 0.2",
  "sensors below chlorine",
  "low chlorine sensors",
  "sensors above 0.5",
  "sensors above chlorine",
  "high chlorine sensors",
  "offline for days",
  "offline for 1 day",
  "offline for 2 days",
  "offline for 3 days",
  "offline for 5 days",
  "offline for 7 days",
  "offline for 10 days",
  "offline for 30 days",
  "below 0.2 for days",
  "below chlorine for days",
  "above 0.5 for days",
  "above chlorine for days",
  "how many sensors offline",
  "how many sensors below",
  "how many sensors above",
  "chlorine sensor status",
  "sensor status for days",
  "day wise sensor status",
  "sensors offline yesterday",
  "sensors offline last week",
];

// POST /api/ai/enhanced-interpret - Enhanced interpretation with intent classification and entity extraction
router.post("/enhanced-interpret", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    // Create enhanced interpretation prompt
    const systemPrompt = `You are a smart query interpreter for a Maharashtra Water Dashboard. Analyze user queries and classify them into specific intents while extracting relevant entities.

INTENT TYPES:
1. COMPREHENSIVE_SCHEME_ANALYSIS - When user provides ONLY a scheme ID (numeric) or scheme name (with WSS/RRWSS/VRRWSS) without asking for specific data
2. SCHEME_DETAILS - General scheme analysis or details requests
3. SCHEME_ESR_SUMMARY - ESR information for a specific scheme
4. VILLAGE_ESR_SUMMARY - ESR information for a specific village
5. REGION_ESR_SUMMARY - ESR information for a specific region
6. SCHEME_VILLAGE_SUMMARY - Village count information for a scheme
7. VILLAGE_ESR_CONSUMPTION - ESR-level water consumption for a village
8. ESR_WATER_CONSUMPTION - General ESR water consumption with region/scheme filtering
9. ABRUPT_WATER_CONSUMPTION - ESRs with >400% consumption percentage (water_value_day7/esr_capacity ratio)
10. RELIABLE_WATER_CONSUMPTION - Villages/ESRs with ≤200% consumption AND LPCD >100 (reliable/normal consumption but abrupt/high LPCD)
11. FLOW_METER_COUNT - Count of flow meters in a village/scheme
12. ESR_COUNT - Count of ESRs in a village/scheme
13. ESR_CAPACITY - Total ESR capacity/volume/size for a scheme/village/region
14. CHLORINE_SENSOR_STATUS - Chlorine sensor status for specific days (offline, below 0.2, above 0.5)
15. FALLBACK - Default for other queries

ENTITY EXTRACTION:
- Extract scheme names (e.g., "Bidgaon Tarodi WSS", "Hatedi & 5 Villages RRWSS", "Khambora 60 VRRWSS Tq. & Dist. Akola")
- Extract village names (e.g., "Bidgaon", "Hatedi", "Gondapur")  
- Extract scheme IDs if numeric - ALWAYS put numeric IDs in schemeId field, NOT schemeName (e.g., "20094594")
- Extract regions with proper case (e.g., "Nagpur", "Amravati", "Pune", "Nashik", "Chhatrapati Sambhajinagar")
- For chlorine sensor queries, extract:
  * metric: "offline", "below_0_2", or "above_0_5"
  * days: number of consecutive days (1-30, default to 1 if not specified)

SCHEME RECOGNITION PATTERNS:
- Look for WSS, RRWSS, VRRWSS, RWS patterns
- Look for "Tq. & Dist." patterns (Taluka and District)
- Look for numerical codes with scheme names
- Look for "&" or "and" connecting multiple villages
- Distinguish from single village names

QUERY PATTERNS:
- JUST a scheme ID (numeric like "7940695" or "20094594") → COMPREHENSIVE_SCHEME_ANALYSIS
- JUST a scheme name (like "Bidgaon Tarodi wss" or "Hatedi & 5 Villages RRWSS") → COMPREHENSIVE_SCHEME_ANALYSIS
- Scheme ID/name + "details", "information", "tell me about", "about", "info" → COMPREHENSIVE_SCHEME_ANALYSIS
- "scheme details" or "scheme analysis" WITHOUT specific scheme identifier → SCHEME_DETAILS
- "esr in [scheme_name]" → SCHEME_ESR_SUMMARY
- "how many esr in scheme [id/name]" → ESR_COUNT
- "esr in [village_name] village" OR "esr in [village_name]" (if simple village name) → VILLAGE_ESR_SUMMARY  
- "esr in [region_name]" OR "esr in [region_name] region" → REGION_ESR_SUMMARY
- "how many esr in [village_name]" OR "esr count in [village_name]" → ESR_COUNT
- "villages in [scheme_name]" → SCHEME_VILLAGE_SUMMARY
- "how many flow meters in scheme [id/name]" → FLOW_METER_COUNT
- "how many flow meters in [village_name]" OR "flow meter count in [village_name]" → FLOW_METER_COUNT
- "esr level water consumption in [village_name] village" OR "esr level water consumption in [village_name]" (if simple village name) → VILLAGE_ESR_CONSUMPTION
- "esr level water consumption in [scheme_name]" (if contains WSS/RRWSS/VRRWSS/Tq./&) → ESR_WATER_CONSUMPTION
- "esr level water consumption" or "esr water consumption" → ESR_WATER_CONSUMPTION
- "esr capacity", "esr volume", "esr size", "esr storage", "tank size", "esr holding" (with capacity-related keywords) → ESR_CAPACITY
- "esr capacity in [scheme/village/region]" → ESR_CAPACITY with appropriate entity
- "total esr capacity" or "overall esr capacity" → ESR_CAPACITY (all regions)
- "sensors offline" or "offline sensors" or "how many sensors offline" → CHLORINE_SENSOR_STATUS with metric="offline", days=1
- "sensors offline for [X] days" or "offline for [X] days" → CHLORINE_SENSOR_STATUS with metric="offline", days=X
- "sensors below 0.2" or "sensors below chlorine" or "low chlorine sensors" → CHLORINE_SENSOR_STATUS with metric="below_0_2", days=1
- "sensors below 0.2 for [X] days" or "below chlorine for [X] days" → CHLORINE_SENSOR_STATUS with metric="below_0_2", days=X
- "sensors above 0.5" or "sensors above chlorine" or "high chlorine sensors" → CHLORINE_SENSOR_STATUS with metric="above_0_5", days=1
- "sensors above 0.5 for [X] days" or "above chlorine for [X] days" → CHLORINE_SENSOR_STATUS with metric="above_0_5", days=X
- "chlorine sensor status" or "sensor status for days" → CHLORINE_SENSOR_STATUS (default to offline for 1 day)

PRIORITY: When uncertain between village vs scheme, prefer VILLAGE if the name is simple (1-2 words), prefer SCHEME if it contains scheme indicators (WSS, RRWSS, VRRWSS, Tq., &, numbers)

EXAMPLES:
- "7940695" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, SchemeId: "7940695" (JUST a numeric ID means comprehensive analysis)
- "Bidgaon Tarodi wss" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, Scheme: "Bidgaon Tarodi wss" (JUST a scheme name means comprehensive analysis)
- "20094594" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, SchemeId: "20094594" (JUST a numeric ID)
- "Hatedi & 5 Villages RRWSS" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, Scheme: "Hatedi & 5 Villages RRWSS" (JUST a scheme name)
- "7940695 details" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, SchemeId: "7940695" (scheme ID + details = comprehensive analysis)
- "bidgaon tarodi wss details" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, Scheme: "bidgaon tarodi wss" (scheme name + details = comprehensive analysis)
- "tell me about 20003791" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, SchemeId: "20003791" (tell me about + scheme ID = comprehensive analysis)
- "tell me about bidgaon tarodi wss" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, Scheme: "bidgaon tarodi wss" (tell me about + scheme name = comprehensive analysis)
- "20094594 information" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, SchemeId: "20094594" (scheme ID + information = comprehensive analysis)
- "bidgaon tarodi wss info" → Intent: COMPREHENSIVE_SCHEME_ANALYSIS, Scheme: "bidgaon tarodi wss" (scheme name + info = comprehensive analysis)
- "esr in bidgaon tarodi wss" → Intent: SCHEME_ESR_SUMMARY, Scheme: "bidgaon tarodi wss" (asking FOR ESR data)
- "esr level water consumption in Khambora 60 VRRWSS Tq. & Dist. Akola" → Intent: ESR_WATER_CONSUMPTION, Scheme: "Khambora 60 VRRWSS Tq. & Dist. Akola"
- "scheme details" → Intent: SCHEME_DETAILS (WITHOUT specific scheme identifier)
- "villages in hatedi scheme" → Intent: SCHEME_VILLAGE_SUMMARY, Scheme: "hatedi"
- "esr in bidgaon village" → Intent: VILLAGE_ESR_SUMMARY, Village: "bidgaon"
- "esr in gondapur" → Intent: VILLAGE_ESR_SUMMARY, Village: "gondapur" (simple village name)
- "esr in nagpur" → Intent: REGION_ESR_SUMMARY, Region: "Nagpur"
- "esr in nagpur region" → Intent: REGION_ESR_SUMMARY, Region: "Nagpur"
- "esr count in pune" → Intent: REGION_ESR_SUMMARY, Region: "Pune"
- "esr level water consumption in gondapur village" → Intent: VILLAGE_ESR_CONSUMPTION, Village: "gondapur"
- "esr level water consumption in gondapur" → Intent: VILLAGE_ESR_CONSUMPTION, Village: "gondapur" (simple village name)
- "esr level water consumption" → Intent: ESR_WATER_CONSUMPTION
- "esr level water consumption in nagpur" → Intent: ESR_WATER_CONSUMPTION, Region: "Nagpur" (proper case)
- "esr level water consumption in amravati" → Intent: ESR_WATER_CONSUMPTION, Region: "Amravati" (proper case)
- "esr water consumption in bidgaon tarodi wss" → Intent: ESR_WATER_CONSUMPTION, Scheme: "bidgaon tarodi wss"
- "esr level water consumption in 20003791" → Intent: ESR_WATER_CONSUMPTION, SchemeId: "20003791" (numeric ID goes to schemeId field)
- "esr level water consumption in scheme 20003791" → Intent: ESR_WATER_CONSUMPTION, SchemeId: "20003791" (numeric ID goes to schemeId field)
- "abrupt water consumption" → Intent: ABRUPT_WATER_CONSUMPTION
- "esr with high consumption" → Intent: ABRUPT_WATER_CONSUMPTION
- "esr with abnormal consumption" → Intent: ABRUPT_WATER_CONSUMPTION
- "abrupt water consumption in nagpur" → Intent: ABRUPT_WATER_CONSUMPTION, Region: "Nagpur"
- "high consumption esr in bidgaon tarodi wss" → Intent: ABRUPT_WATER_CONSUMPTION, Scheme: "bidgaon tarodi wss"
- "reliable water consumption" → Intent: RELIABLE_WATER_CONSUMPTION
- "villages with reliable water" → Intent: RELIABLE_WATER_CONSUMPTION
- "good water management" → Intent: RELIABLE_WATER_CONSUMPTION
- "reliable consumption" → Intent: RELIABLE_WATER_CONSUMPTION
- "reliable water consumption in nagpur" → Intent: RELIABLE_WATER_CONSUMPTION, Region: "Nagpur"
- "reliable water supply in bidgaon tarodi wss" → Intent: RELIABLE_WATER_CONSUMPTION, Scheme: "bidgaon tarodi wss"
- "esr with reliable water consumption but abrupt lpcd" → Intent: RELIABLE_WATER_CONSUMPTION
- "villages with normal water consumption but abrupt lpcd" → Intent: RELIABLE_WATER_CONSUMPTION
- "reliable consumption abrupt lpcd" → Intent: RELIABLE_WATER_CONSUMPTION
- "esr with normal water but high lpcd" → Intent: RELIABLE_WATER_CONSUMPTION
- "villages with reliable supply but high lpcd" → Intent: RELIABLE_WATER_CONSUMPTION
- "normal water consumption high lpcd" → Intent: RELIABLE_WATER_CONSUMPTION
- "reliable esr abrupt lpcd" → Intent: RELIABLE_WATER_CONSUMPTION
- "esr with reliable consumption but abrupt lpcd in nagpur" → Intent: RELIABLE_WATER_CONSUMPTION, Region: "Nagpur"
- "villages with normal water but high lpcd in bidgaon tarodi wss" → Intent: RELIABLE_WATER_CONSUMPTION, Scheme: "bidgaon tarodi wss"
- "how many flow meters in scheme 20094594" → Intent: FLOW_METER_COUNT, SchemeId: "20094594"
- "how many flow meters in bidgaon tarodi wss" → Intent: FLOW_METER_COUNT, Scheme: "bidgaon tarodi wss"
- "flow meter count in gondapur village" → Intent: FLOW_METER_COUNT, Village: "gondapur"
- "how many esr in scheme 20094594" → Intent: ESR_COUNT, SchemeId: "20094594"
- "how many esr in bidgaon tarodi wss" → Intent: ESR_COUNT, Scheme: "bidgaon tarodi wss"
- "esr count in gondapur village" → Intent: ESR_COUNT, Village: "gondapur"
- "esr capacity in scheme 20094594" → Intent: ESR_CAPACITY, SchemeId: "20094594"
- "esr capacity in bidgaon tarodi wss" → Intent: ESR_CAPACITY, Scheme: "bidgaon tarodi wss"
- "esr capacity in gondapur village" → Intent: ESR_CAPACITY, Village: "gondapur"
- "esr capacity in nagpur region" → Intent: ESR_CAPACITY, Region: "Nagpur"
- "total esr capacity" → Intent: ESR_CAPACITY
- "esr volume in scheme 20094594" → Intent: ESR_CAPACITY, SchemeId: "20094594"
- "esr size in amravati" → Intent: ESR_CAPACITY, Region: "Amravati"
- "esr storage capacity" → Intent: ESR_CAPACITY
- "tank size in bidgaon" → Intent: ESR_CAPACITY, Village: "bidgaon"
- "esr holding capacity in nashik" → Intent: ESR_CAPACITY, Region: "Nashik"
- "how many sensors offline" → Intent: CHLORINE_SENSOR_STATUS, metric: "offline", days: 1
- "sensors offline for 5 days" → Intent: CHLORINE_SENSOR_STATUS, metric: "offline", days: 5
- "sensors offline for 10 days in nagpur" → Intent: CHLORINE_SENSOR_STATUS, metric: "offline", days: 10, Region: "Nagpur"
- "how many sensors below 0.2" → Intent: CHLORINE_SENSOR_STATUS, metric: "below_0_2", days: 1
- "sensors below 0.2 for 7 days" → Intent: CHLORINE_SENSOR_STATUS, metric: "below_0_2", days: 7
- "low chlorine sensors for 3 days in pune" → Intent: CHLORINE_SENSOR_STATUS, metric: "below_0_2", days: 3, Region: "Pune"
- "sensors above 0.5" → Intent: CHLORINE_SENSOR_STATUS, metric: "above_0_5", days: 1
- "sensors above 0.5 for 30 days" → Intent: CHLORINE_SENSOR_STATUS, metric: "above_0_5", days: 30
- "high chlorine sensors for 2 days" → Intent: CHLORINE_SENSOR_STATUS, metric: "above_0_5", days: 2
- "chlorine sensor status" → Intent: CHLORINE_SENSOR_STATUS, metric: "offline", days: 1 (default)

Respond ONLY with valid JSON in this exact format:
{
  "intent": "<INTENT_TYPE>",
  "confidence": <number_0_to_1>,
  "entities": {
    "schemeName": "<extracted_scheme_name>" or null,
    "villageName": "<extracted_village_name>" or null,
    "schemeId": "<extracted_scheme_id>" or null,
    "regionName": "<extracted_region_name>" or null,
    "metric": "<offline|below_0_2|above_0_5>" or null,
    "days": <number_1_to_30> or null
  },
  "reasoning": "<brief_explanation>"
}`;

    // Call OpenAI API for enhanced interpretation
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Analyze this query: "${query}"`,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error in enhanced-interpret:", errorData);
      return res.status(response.status).json({
        success: false,
        message: "Error from OpenAI API",
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    // Parse OpenAI response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";

    // Parse JSON response from OpenAI
    let interpretation;
    try {
      const cleanedText = completionText
        .replace(/```json\s*|```\s*/g, "")
        .trim();
      interpretation = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(
        "Failed to parse enhanced interpret response:",
        completionText,
      );
      return res.json({
        success: true,
        intent: "FALLBACK",
        confidence: 0,
        entities: {
          schemeName: null,
          villageName: null,
          schemeId: null,
          regionName: null,
        },
        reasoning: "Failed to parse AI response",
        fallback: true,
      });
    }

    // Validate and return response
    const { intent, confidence, entities, reasoning } = interpretation;
    const validIntents = [
      "COMPREHENSIVE_SCHEME_ANALYSIS",
      "SCHEME_DETAILS",
      "SCHEME_ESR_SUMMARY",
      "VILLAGE_ESR_SUMMARY",
      "REGION_ESR_SUMMARY",
      "SCHEME_VILLAGE_SUMMARY",
      "VILLAGE_ESR_CONSUMPTION",
      "ESR_WATER_CONSUMPTION",
      "ABRUPT_WATER_CONSUMPTION",
      "FLOW_METER_COUNT",
      "ESR_COUNT",
      "ESR_CAPACITY",
      "Above55SchemeWidget",
      "Below55SchemeWidget",
      "CombinedSchemesWidget",
      "CombinedSchemeLpcdWidget",
      "FALLBACK",
    ];

    const finalIntent = validIntents.includes(intent) ? intent : "FALLBACK";
    const clampedConfidence = Math.max(
      0,
      Math.min(1, typeof confidence === "number" ? confidence : 0),
    );

    return res.json({
      success: true,
      intent: finalIntent,
      confidence: clampedConfidence,
      entities: entities || {
        schemeName: null,
        villageName: null,
        schemeId: null,
        regionName: null,
      },
      reasoning: reasoning || "No reasoning provided",
      originalQuery: query,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in enhanced-interpret endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing the enhanced interpretation",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai/chat-stream - Streaming chat completion endpoint
router.post("/chat-stream", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = chatCompletionStreamSchema.parse(req.body);
    
    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    try {
      // Get the streaming response from OpenAI
      const stream = await getChatCompletionStream(validatedData);

      if (!stream.body) {
        throw new Error("No response body from OpenAI");
      }

      const reader = stream.body.getReader();
      const decoder = new TextDecoder();

      // Read the stream and forward chunks to the client
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Send [DONE] marker to signal completion
          res.write("data: [DONE]\n\n");
          res.end();
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // OpenAI sends data in SSE format already
        // Each chunk looks like: "data: {...}\n\n"
        // We need to parse it and extract the actual content
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6); // Remove "data: " prefix
            
            if (dataStr === "[DONE]") {
              res.write("data: [DONE]\n\n");
              continue;
            }
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content;
              
              if (content) {
                // Send the content token to the client
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (parseError) {
              // Skip unparseable lines
              continue;
            }
          }
        }
      }
    } catch (streamError) {
      console.error("Streaming error:", streamError);
      res.write(`data: ${JSON.stringify({ error: "Streaming error occurred" })}\n\n`);
      res.end();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in chat-stream endpoint:", error);
    
    // If headers haven't been sent yet, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Server error processing the streaming request",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

// POST /api/ai/widget-intent - Enhanced widget intent detection with strict filtering
router.post("/widget-intent", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    // Create comprehensive widget intent detection prompt
    const systemPrompt = `You are an expert intent classifier for a Maharashtra Water Dashboard chatbot. Your task is to:
1. Detect the user's EXACT intent from the 10 supported widget categories
2. Extract ALL relevant filtering entities (region, scheme name, scheme ID, village name)
3. Handle multilingual queries (English, Hindi, Marathi, or mixed)
4. Properly translate and normalize entity names

## ⛔ CRITICAL CHART DETECTION (CHECK FIRST):
If the query contains ANY of these chart/time-series indicators, IMMEDIATELY return "NONE":
- "weekly", "7 day", "7-day", "7 days", "chart", "graph", "trend", "historical", "analysis" (when combined with weekly/7-day/chart/graph)
- Examples that MUST return "NONE":
  * "7 day water consumption analysis" → NONE (chart request)
  * "weekly lpcd in bidgaon" → NONE (chart request)
  * "7 day lpcd bidgaon" → NONE (chart request)
  * "weekly water consumption in bidgaon" → NONE (chart request)
  * "7 day water analysis bidgaon" → NONE (chart request)
  * "weekly chlorine data for bidgaon tarodi wss" → NONE (chart request)
  * "weekly pressure data for bidgaon tarodi wss" → NONE (chart request)

These queries are handled by the dedicated chart handler and should NOT be routed to any widget.

## SUPPORTED WIDGETS AND THEIR KEYWORDS:

⚠️ **CRITICAL: MODIFIER WORD DETECTION FOR CHLORINE/PRESSURE WIDGETS:**

**🔴 IMPORTANT RULES:**
1. The word "range" is MEANINGLESS - ignore it completely
2. The word "esr with" at the start is MEANINGLESS - ignore it completely
3. ONLY "average" or "consistent" modifiers determine the widget type
4. If NO "average" or "consistent" → Use BASE widget
5. If "average" present → Use AVERAGE widget
6. If "consistent" present → Use CONSISTENT widget

**CHLORINE/PRESSURE WIDGET SELECTION LOGIC:**

Step 1: Remove "esr with" or "esr" from the beginning if present
Step 2: Check for modifier words:
  - Has "average"? → Use Average widget
  - Has "consistent"? → Use Consistent widget  
  - Has neither? → Use BASE widget
Step 3: Check for range indicator:
  - "optimal", "0.2-0.5", "0.2 0.5", "between 0.2 and 0.5", "good" → Optimal widget
  - "above", ">0.5", "greater than 0.5", "high", "excess" → Above widget
  - "below", "<0.2", "less than 0.2", "low" → Below widget

**BASE Widgets (NO modifier word):**
✅ "optimal range chlorine" → OptimalChlorineWidget
✅ "esr with optimal range chlorine" → OptimalChlorineWidget
✅ "above range chlorine" → AboveChlorineWidget
✅ "esr with above range chlorine" → AboveChlorineWidget
✅ "below range chlorine" → BelowChlorineWidget
✅ "esr with below range chlorine" → BelowChlorineWidget
✅ "chlorine between 0.2-0.5" → OptimalChlorineWidget
✅ "chlorine>0.5" → AboveChlorineWidget
✅ "chlorine<0.2" → BelowChlorineWidget
✅ Same logic for pressure (0.2-0.7 range)

**AVERAGE Widgets (WITH "average" modifier):**
✅ "average optimal chlorine" → AverageOptimalChlorineWidget
✅ "average optimal range chlorine" → AverageOptimalChlorineWidget
✅ "esr with average optimal chlorine" → AverageOptimalChlorineWidget
✅ "average above range chlorine" → AverageAboveChlorineWidget
✅ "esr with average above range chlorine" → AverageAboveChlorineWidget
✅ "average below range chlorine" → AverageBelowChlorineWidget
✅ Same logic for pressure

**CONSISTENT Widgets (WITH "consistent" modifier):**
✅ "consistent optimal chlorine" → ConsistentOptimalChlorineWidget
✅ "consistent optimal range chlorine" → ConsistentOptimalChlorineWidget
✅ "esr with consistent optimal chlorine" → ConsistentOptimalChlorineWidget
✅ "consistent above range chlorine" → ConsistentAboveChlorineWidget
✅ "esr with consistent above range chlorine" → ConsistentAboveChlorineWidget
✅ "consistent below range chlorine" → ConsistentBelowChlorineWidget
✅ Same logic for pressure

1️⃣ **VillagesWithWaterWidget**
Keywords: villages with water, supplied villages, water available, water present, villages having water, villages receiving water

2️⃣ **VillagesNoWaterWidget**
Keywords: villages without water, no water, zero supply villages, water not available, villages no water

3️⃣ **ConsistentWaterWidget**
Keywords: consistent water, regular supply, continuous water, always water, reliable water, consistent supply, reliable supply, villages with consistent, villages have consistent

4️⃣ **ConsistentZeroWidget**
Keywords: consistent no water, zero water consistently, regularly no water, always dry, consistent zero, always zero

5️⃣ **Above55LpcdWidget**
Keywords: above 55 lpcd, more than 55 lpcd, higher than 55 lpcd, over 55 lpcd, greater than 55 lpcd, > 55 lpcd, ≥ 55 lpcd

6️⃣ **Below55LpcdWidget**
Keywords: below 55 lpcd, less than 55 lpcd, under 55 lpcd, lower than 55 lpcd, < 55 lpcd, ≤ 55 lpcd

7️⃣ **ConsistentAbove55LpcdWidget**
Keywords: consistent above 55 lpcd, regular above 55 lpcd, always above 55 lpcd, consistently above 55 lpcd, consistently over 55

8️⃣ **ConsistentBelow55LpcdWidget**
Keywords: consistent below 55 lpcd, regular below 55 lpcd, always below 55 lpcd, consistently below 55 lpcd, consistently under 55

9️⃣ **CombinedWaterStatusWidget** (ONLY use when NO chart keywords present)
Keywords: current water status, latest water consumption, water consumption statistics, water status report
⚠️ **NEVER match if**: query contains weekly/7 day/chart/graph/trend/historical

🔟 **CombinedLpcdStatusWidget** (ONLY use for VILLAGE-level LPCD, when NO chart keywords and NO "scheme" keyword present)
Keywords: current lpcd, latest lpcd, lpcd statistics, lpcd status report, lpcd information, village lpcd, villages lpcd
⚠️ **NEVER match if**: query contains weekly/7 day/chart/graph/trend/historical
⚠️ **NEVER match if**: query contains "scheme" or "schemes" - use CombinedSchemeLpcdWidget instead

🔟.1️⃣ **CombinedSchemeLpcdWidget** (SCHEME-level LPCD - use when "scheme" keyword is present)
Keywords: scheme lpcd, schemes lpcd, scheme lpcd status, lpcd of schemes, lpcd schemes, lpcd in all regions, lpcd all regions, scheme level lpcd, scheme-level lpcd, scheme lpcd in [region], schemes lpcd in [region]
⚠️ **MUST match if**: query contains "scheme" or "schemes" combined with "lpcd"
⚠️ **Examples that MUST use CombinedSchemeLpcdWidget**:
  - "scheme lpcd in amravati" → CombinedSchemeLpcdWidget
  - "scheme lpcd in all region" → CombinedSchemeLpcdWidget
  - "schemes lpcd status" → CombinedSchemeLpcdWidget
  - "lpcd of schemes in pune" → CombinedSchemeLpcdWidget
  - "show scheme lpcd" → CombinedSchemeLpcdWidget
⚠️ **NEVER match if**: query contains weekly/7 day/chart/graph/trend/historical

1️⃣1️⃣ **AverageAbove55LpcdWidget**
Keywords: average above 55, average lpcd above 55, average above 55 lpcd, mean lpcd above 55, avg lpcd > 55

1️⃣2️⃣ **AverageBelow55LpcdWidget**
Keywords: average below 55, average lpcd below 55, average below 55 lpcd, mean lpcd below 55, avg lpcd < 55

1️⃣3️⃣ **Above55SchemeWidget** (SCHEME-level)
Keywords: schemes above 55, schemes > 55, schemes greater than 55, schemes with more than 55 lpcd, schemes meeting 55, schemes with 55 lpcd
⚠️ **MUST match if**: query contains "scheme" AND "above/greater/>" 55

1️⃣4️⃣ **Below55SchemeWidget** (SCHEME-level)
Keywords: schemes below 55, schemes < 55, schemes less than 55, schemes with less than 55 lpcd
⚠️ **MUST match if**: query contains "scheme" AND "below/less/<" 55

1️⃣5️⃣ **OptimalChlorineWidget** (BASE - ONLY when "optimal" is EXPLICITLY mentioned)
Keywords: optimal chlorine, optimal range chlorine, chlorine optimal range, chlorine in optimal range, chlorine between 0.2-0.5, chlorine between 0.2 and 0.5, chlorine 0.2-0.5, chlorine in range 0.2-0.5, optimal chlorine range, chlorine optimal, good chlorine range, chlorine 0.2 0.5, esr with optimal chlorine, esr with optimal range chlorine, esr optimal chlorine, esr optimal range chlorine
⚠️ **CRITICAL**: ONLY match if query contains "optimal", "0.2-0.5", "between 0.2 and 0.5", or "good" explicitly. DO NOT match for generic "chlorine" queries.

1️⃣4️⃣ **BelowChlorineWidget** (BASE - ONLY when "below"/"low" is EXPLICITLY mentioned)
Keywords: below chlorine, below range chlorine, chlorine below range, low chlorine range, chlorine less than 0.2, chlorine<0.2, chlorine < 0.2, chlorine below optimal range, below optimal chlorine, low chlorine, esr with below chlorine, esr with below range chlorine, esr below chlorine, esr below range chlorine
⚠️ **CRITICAL**: ONLY match if query contains "below", "low", "<0.2", or "less than" explicitly. DO NOT match for generic "chlorine" queries.

1️⃣5️⃣ **AboveChlorineWidget** (BASE - ONLY when "above"/"high" is EXPLICITLY mentioned)
Keywords: above chlorine, above range chlorine, chlorine above range, high chlorine range, excess chlorine range, chlorine greater than 0.5, chlorine>0.5, chlorine > 0.5, chlorine above optimal range, above optimal chlorine, high chlorine, excess chlorine, esr with above chlorine, esr with above range chlorine, esr above chlorine, esr above range chlorine
⚠️ **CRITICAL**: ONLY match if query contains "above", "high", "excess", ">0.5", or "greater than" explicitly. DO NOT match for generic "chlorine" queries.

1️⃣6️⃣ **ConsistentOptimalChlorineWidget** (REQUIRES "consistent" keyword)
Keywords: consistent optimal chlorine, consistent chlorine optimal, consistent chlorine 0.2 0.5, consistent optimal range chlorine, consistent chlorine in optimal range, esr with consistent optimal chlorine, esr with consistent optimal range chlorine, esr consistent optimal chlorine

1️⃣7️⃣ **ConsistentBelowChlorineWidget** (REQUIRES "consistent" keyword)
Keywords: consistent below chlorine, consistent chlorine below, consistent chlorine below 0.2, consistent below range chlorine, consistent low chlorine, esr with consistent below chlorine, esr with consistent below range chlorine, esr consistent below chlorine

1️⃣8️⃣ **ConsistentAboveChlorineWidget** (REQUIRES "consistent" keyword)
Keywords: consistent above chlorine, consistent chlorine above, consistent chlorine above 0.5, consistent above range chlorine, consistent high chlorine, esr with consistent above chlorine, esr with consistent above range chlorine, esr consistent above chlorine

1️⃣9️⃣ **AverageOptimalChlorineWidget** (REQUIRES "average" keyword)
Keywords: average optimal chlorine, average chlorine optimal, average chlorine 0.2 0.5, mean chlorine optimal, avg chlorine between 0.2 and 0.5, average optimal range chlorine, average chlorine in optimal range, esr with average optimal chlorine, esr with average optimal range chlorine, esr average optimal chlorine

2️⃣0️⃣ **AverageBelowChlorineWidget** (REQUIRES "average" keyword)
Keywords: average chlorine below 0.2, average chlorine below optimal, average below chlorine, mean chlorine below 0.2, avg chlorine < 0.2, average below range chlorine, esr with average below chlorine, esr with average below range chlorine, esr average below chlorine

2️⃣1️⃣ **AverageAboveChlorineWidget** (REQUIRES "average" keyword)
Keywords: average chlorine above 0.5, average chlorine above optimal, average above chlorine, mean chlorine above 0.5, avg chlorine > 0.5, average above range chlorine, esr with average above chlorine, esr with average above range chlorine, esr average above chlorine

2️⃣2️⃣ **OptimalPressureWidget** (BASE - NO "average" or "consistent" keyword)
Keywords: optimal pressure, optimal range pressure, pressure optimal range, pressure in optimal range, pressure between 0.2-0.7, pressure between 0.2 and 0.7, pressure 0.2-0.7, pressure in range 0.2-0.7, optimal pressure range, pressure optimal, good pressure range, pressure 0.2 0.7, esr with optimal pressure, esr with optimal range pressure, esr optimal pressure, esr optimal range pressure

2️⃣3️⃣ **BelowPressureWidget** (BASE - NO "average" or "consistent" keyword)
Keywords: below pressure, below range pressure, pressure below range, low pressure range, pressure less than 0.2, pressure<0.2, pressure < 0.2, pressure below optimal range, below optimal pressure, low pressure, esr with below pressure, esr with below range pressure, esr below pressure, esr below range pressure

2️⃣4️⃣ **AbovePressureWidget** (BASE - NO "average" or "consistent" keyword)
Keywords: above pressure, above range pressure, pressure above range, high pressure range, excess pressure range, pressure greater than 0.7, pressure>0.7, pressure > 0.7, pressure above optimal range, above optimal pressure, high pressure, excess pressure, esr with above pressure, esr with above range pressure, esr above pressure, esr above range pressure

2️⃣5️⃣ **ConsistentOptimalPressureWidget** (REQUIRES "consistent" keyword)
Keywords: consistent optimal pressure, consistent pressure optimal, consistent pressure 0.2 0.7, consistent optimal range pressure, consistent pressure in optimal range, esr with consistent optimal pressure, esr with consistent optimal range pressure, esr consistent optimal pressure

2️⃣6️⃣ **ConsistentBelowPressureWidget** (REQUIRES "consistent" keyword)
Keywords: consistent below pressure, consistent pressure below, consistent pressure below 0.2, consistent below range pressure, consistent low pressure, esr with consistent below pressure, esr with consistent below range pressure, esr consistent below pressure

2️⃣7️⃣ **ConsistentAbovePressureWidget** (REQUIRES "consistent" keyword)
Keywords: consistent above pressure, consistent pressure above, consistent pressure above 0.7, consistent above range pressure, consistent high pressure, esr with consistent above pressure, esr with consistent above range pressure, esr consistent above pressure

2️⃣8️⃣ **AverageOptimalPressureWidget** (REQUIRES "average" keyword)
Keywords: average optimal pressure, average pressure optimal, average pressure 0.2 0.7, mean pressure optimal, avg pressure between 0.2 and 0.7, average optimal range pressure, average pressure in optimal range, esr with average optimal pressure, esr with average optimal range pressure, esr average optimal pressure

2️⃣9️⃣ **AverageBelowPressureWidget** (REQUIRES "average" keyword)
Keywords: average pressure below 0.2, average pressure below optimal, average below pressure, mean pressure below 0.2, avg pressure < 0.2, average below range pressure, esr with average below pressure, esr with average below range pressure, esr average below pressure

3️⃣0️⃣ **AverageAbovePressureWidget** (REQUIRES "average" keyword)
Keywords: average pressure above 0.7, average pressure above optimal, average above pressure, mean pressure above 0.7, avg pressure > 0.7, average above range pressure, esr with average above pressure, esr with average above range pressure, esr average above pressure

3️⃣1️⃣ **CombineChlorineStatusWidget** (DEFAULT for ANY general chlorine query)
Keywords: chlorine, chlorine data, chlorine status, chlorine information, rca, residual chlorine, chlorine levels, chlorine in [region], chlorine for [scheme]
⚠️ **DEFAULT WIDGET FOR CHLORINE**: Use this widget when user asks about "chlorine" WITHOUT specifying "optimal", "above", "below", "average", or "consistent"
⚠️ **Examples that MUST use CombineChlorineStatusWidget**:
  - "chlorine in nagpur" → CombineChlorineStatusWidget
  - "chlorine in pune" → CombineChlorineStatusWidget
  - "chlorine data for bidgaon tarodi wss" → CombineChlorineStatusWidget
  - "show me chlorine status in nashik" → CombineChlorineStatusWidget
  - "rca in amravati" → CombineChlorineStatusWidget
⚠️ **DO NOT use if**: query contains weekly/7 day/chart/graph/trend/historical OR "optimal"/"above"/"below"/"average"/"consistent"

3️⃣2️⃣ **CombinePressureStatusWidget** (DEFAULT for ANY general pressure query)
Keywords: pressure, pressure data, pressure status, pressure information, pt, pressure transmitter, pressure levels, pressure in [region], pressure for [scheme]
⚠️ **DEFAULT WIDGET FOR PRESSURE**: Use this widget when user asks about "pressure" WITHOUT specifying "optimal", "above", "below", "average", or "consistent"
⚠️ **Examples that MUST use CombinePressureStatusWidget**:
  - "pressure in nagpur" → CombinePressureStatusWidget
  - "pressure in pune" → CombinePressureStatusWidget
  - "pressure data for bidgaon tarodi wss" → CombinePressureStatusWidget
  - "show me pressure status in nashik" → CombinePressureStatusWidget
  - "pt in amravati" → CombinePressureStatusWidget
⚠️ **DO NOT use if**: query contains weekly/7 day/chart/graph/trend/historical OR "optimal"/"above"/"below"/"average"/"consistent"

3️⃣3️⃣ **ReliableWaterConsumptionWidget**
Keywords: reliable water consumption, normal water consumption but abrupt lpcd, reliable consumption abrupt lpcd, esr with reliable water but high lpcd, villages with reliable supply but high lpcd, reliable esr high lpcd, normal consumption high lpcd, esr with reliable consumption but abrupt lpcd, villages with normal water but high lpcd, reliable water but abrupt lpcd, normal water abrupt lpcd, reliable esr abrupt lpcd
⚠️ **Shows**: Villages/ESRs with consumption ≤200% ESR capacity AND village LPCD >100

## ENTITY EXTRACTION RULES:

**Regions** (case-insensitive, normalize to proper case):
- Amravati, Nagpur, Pune, Nashik, Konkan, Chhatrapati Sambhajinagar, Aurangabad (→ Chhatrapati Sambhajinagar), Mumbai
- Marathi: नागपूर → Nagpur, पुणे → Pune, नाशिक → Nashik, अमरावती → Amravati, कोंकण → Konkan, मुंबई → Mumbai
- Variations: nasik → Nashik, poona → Pune, bombay → Mumbai
- Extract from patterns: "in [region]", "[region] region", "for [region]", "[region] madhye"

**Scheme Names**:
- Look for WSS, RRWSS, VRRWSS, RWS patterns
- Look for "Tq. & Dist." patterns
- Look for "&" or "and" connecting villages
- Extract from: "[name] WSS", "[name] RRWSS", "scheme [name]", "[name] wss scheme"
- Examples: "Bidgaon Tarodi WSS", "Hatedi & 5 Villages RRWSS", "Khambora 60 VRRWSS Tq. & Dist. Akola"

**Scheme IDs**:
- ALWAYS numeric (8+ digits)
- Extract patterns: just numbers like "20094594", "7940695", "20003791"
- IMPORTANT: Put numeric IDs in schemeId field, NOT in schemeName field

**Village Names**:
- Simple 1-2 word names (Bidgaon, Gondapur, Wadi, Dhonkhed, etc.)
- Extract from: "in [village] village", "[village] gaon", "for [village]"
- Distinguish from scheme names (no WSS/RRWSS markers)

## FILTERING PRIORITY:
1. If "all regions" mentioned → regionName: null
2. If specific region mentioned → extract and normalize
3. If scheme name/ID mentioned → extract exactly as written
4. If village name mentioned → extract exactly

## TRANSLATION & NORMALIZATION:
- Hindi/Marathi numbers: "पंचावन्न" → "55", "छप्पन" → "56"
- Hindi/Marathi operators: "जास्त" → "above", "कमी" → "below"
- Mixed queries: "55 पेक्षा जास्त lpcd" → Above55LpcdWidget
- Location markers: "madhye", "mein", "में" → "in"

## EXAMPLES:

Input: "villages with water in Nagpur"
Output: {"widget": "VillagesWithWaterWidget", "regionName": "Nagpur", "schemeName": null, "schemeId": null, "villageName": null}

Input: "villages without water in all regions"
Output: {"widget": "VillagesNoWaterWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null}

Input: "above 55 lpcd in Bidgaon Tarodi WSS"
Output: {"widget": "Above55LpcdWidget", "regionName": null, "schemeName": "Bidgaon Tarodi WSS", "schemeId": null, "villageName": null}

Input: "consistent below 55 lpcd in 20028532"
Output: {"widget": "ConsistentBelow55LpcdWidget", "regionName": null, "schemeName": null, "schemeId": "20028532", "villageName": null}

Input: "water consumption stats for 20003791"
Output: {"widget": "CombinedWaterStatusWidget", "regionName": null, "schemeName": null, "schemeId": "20003791", "villageName": null}

Input: "lpcd statistics in Pune region"
Output: {"widget": "CombinedLpcdStatusWidget", "regionName": "Pune", "schemeName": null, "schemeId": null, "villageName": null}

Input: "scheme lpcd in amravati"
Output: {"widget": "CombinedSchemeLpcdWidget", "regionName": "Amravati", "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Scheme-level LPCD query with Amravati region specified"}

Input: "scheme lpcd in nagpur"
Output: {"widget": "CombinedSchemeLpcdWidget", "regionName": "Nagpur", "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Scheme-level LPCD query with Nagpur region specified"}

Input: "scheme lpcd in pune"
Output: {"widget": "CombinedSchemeLpcdWidget", "regionName": "Pune", "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Scheme-level LPCD query with Pune region specified"}

Input: "scheme lpcd"
Output: {"widget": "CombinedSchemeLpcdWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Scheme-level LPCD query for all regions"}

Input: "55 पेक्षा जास्त lpcd वाले गावे नागपूर मध्ये"
Output: {"widget": "Above55LpcdWidget", "regionName": "Nagpur", "schemeName": null, "schemeId": null, "villageName": null}

Input: "bidgaon tarodi मध्ये पाणी किती आहे"
Output: {"widget": "CombinedWaterStatusWidget", "regionName": null, "schemeName": "bidgaon tarodi", "schemeId": null, "villageName": null}

Input: "20094594 consistent no water villages दाखव"
Output: {"widget": "ConsistentZeroWidget", "regionName": null, "schemeName": null, "schemeId": "20094594", "villageName": null}

Input: "konkan madhye je village la paani येते त्या दाखव"
Output: {"widget": "VillagesWithWaterWidget", "regionName": "Konkan", "schemeName": null, "schemeId": null, "villageName": null}

Input: "7 day water consumption analysis"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0, "reasoning": "Chart request - delegating to chart handler"}

Input: "weekly lpcd in bidgaon"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Chart request - delegating to chart handler"}

Input: "7 day lpcd bidgaon"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Chart request - delegating to chart handler"}

Input: "weekly water consumption in bidgaon"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Chart request - delegating to chart handler"}

Input: "7 day water analysis bidgaon"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Chart request - delegating to chart handler"}

Input: "lpcd graph in bidgaon village"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Graph request - delegating to chart handler"}

Input: "lpcd graph of bidgao village"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgao", "confidence": 0, "reasoning": "Graph request - delegating to chart handler"}

Input: "chlorine graph in bidgaon village"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Graph request - delegating to chart handler"}

Input: "pressure graph for bidgaon village"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Graph request - delegating to chart handler"}

Input: "water consumption graph in bidgaon village"
Output: {"widget": "NONE", "regionName": null, "schemeName": null, "schemeId": null, "villageName": "bidgaon", "confidence": 0, "reasoning": "Graph request - delegating to chart handler"}

Input: "chlorine data for bidgaon tarodi wss"
Output: {"widget": "CombineChlorineStatusWidget", "regionName": null, "schemeName": "bidgaon tarodi wss", "schemeId": null, "villageName": null, "confidence": 0.9, "reasoning": "Chlorine data request for scheme"}

Input: "pressure analysis 20003791"
Output: {"widget": "CombinePressureStatusWidget", "regionName": null, "schemeName": null, "schemeId": "20003791", "villageName": null, "confidence": 0.9, "reasoning": "Pressure data request for scheme ID"}

Input: "weekly chlorine data for bidgaon tarodi wss"
Output: {"widget": "NONE", "regionName": null, "schemeName": "bidgaon tarodi wss", "schemeId": null, "villageName": null, "confidence": 0, "reasoning": "Weekly chart request - delegating to chart handler"}

Input: "weekly pressure data for bidgaon tarodi wss"
Output: {"widget": "NONE", "regionName": null, "schemeName": "bidgaon tarodi wss", "schemeId": null, "villageName": null, "confidence": 0, "reasoning": "Weekly chart request - delegating to chart handler"}

Input: "average above 55 lpcd"
Output: {"widget": "AverageAbove55LpcdWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Average LPCD above 55 query"}

Input: "average below 55 lpcd in Nagpur"
Output: {"widget": "AverageBelow55LpcdWidget", "regionName": "Nagpur", "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Average LPCD below 55 query for Nagpur region"}

Input: "optimal range chlorine"
Output: {"widget": "OptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Optimal range chlorine - NO modifier, use base widget"}

Input: "chlorine optimal range"
Output: {"widget": "OptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Optimal chlorine range - NO modifier, use base widget"}

Input: "above range chlorine"
Output: {"widget": "AboveChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Above range chlorine - NO modifier, use base widget"}

Input: "chlorine above range"
Output: {"widget": "AboveChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Chlorine above range - NO modifier, use base widget"}

Input: "below range chlorine"
Output: {"widget": "BelowChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Below range chlorine - NO modifier, use base widget"}

Input: "chlorine below range"
Output: {"widget": "BelowChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Chlorine below range - NO modifier, use base widget"}

Input: "chlorine between 0.2-0.5"
Output: {"widget": "OptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Chlorine in optimal range 0.2-0.5 - NO modifier, use base widget"}

Input: "chlorine between 0.2 and 0.5"
Output: {"widget": "OptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Chlorine in optimal range - NO modifier, use base widget"}

Input: "chlorine>0.5"
Output: {"widget": "AboveChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Chlorine greater than 0.5 (above range) - NO modifier, use base widget"}

Input: "chlorine<0.2"
Output: {"widget": "BelowChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Chlorine less than 0.2 (below range) - NO modifier, use base widget"}

Input: "average optimal chlorine"
Output: {"widget": "AverageOptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "AVERAGE modifier present - use AverageOptimalChlorineWidget"}

Input: "average chlorine below optimal"
Output: {"widget": "AverageBelowChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "AVERAGE modifier present - use AverageBelowChlorineWidget"}

Input: "average chlorine above optimal"
Output: {"widget": "AverageAboveChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "AVERAGE modifier present - use AverageAboveChlorineWidget"}

Input: "consistent optimal chlorine"
Output: {"widget": "ConsistentOptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "CONSISTENT modifier present - use ConsistentOptimalChlorineWidget"}

Input: "consistent above range chlorine"
Output: {"widget": "ConsistentAboveChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "CONSISTENT modifier present - use ConsistentAboveChlorineWidget"}

Input: "consistent below range chlorine"
Output: {"widget": "ConsistentBelowChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "CONSISTENT modifier present - use ConsistentBelowChlorineWidget"}

Input: "optimal range pressure"
Output: {"widget": "OptimalPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Optimal range pressure - NO modifier, use base widget"}

Input: "pressure optimal range"
Output: {"widget": "OptimalPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Optimal pressure range - NO modifier, use base widget"}

Input: "above range pressure"
Output: {"widget": "AbovePressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Above range pressure - NO modifier, use base widget"}

Input: "pressure above range"
Output: {"widget": "AbovePressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Pressure above range - NO modifier, use base widget"}

Input: "below range pressure"
Output: {"widget": "BelowPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Below range pressure - NO modifier, use base widget"}

Input: "pressure below range"
Output: {"widget": "BelowPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Pressure below range - NO modifier, use base widget"}

Input: "pressure between 0.2-0.7"
Output: {"widget": "OptimalPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Pressure in optimal range 0.2-0.7 - NO modifier, use base widget"}

Input: "pressure between 0.2 and 0.7"
Output: {"widget": "OptimalPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Pressure in optimal range - NO modifier, use base widget"}

Input: "pressure>0.7"
Output: {"widget": "AbovePressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Pressure greater than 0.7 (above range) - NO modifier, use base widget"}

Input: "pressure<0.2"
Output: {"widget": "BelowPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Pressure less than 0.2 (below range) - NO modifier, use base widget"}

Input: "average optimal pressure in Pune"
Output: {"widget": "AverageOptimalPressureWidget", "regionName": "Pune", "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "AVERAGE modifier present for Pune region"}

Input: "average pressure below optimal"
Output: {"widget": "AverageBelowPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "AVERAGE modifier present - use AverageBelowPressureWidget"}

Input: "average pressure above optimal"
Output: {"widget": "AverageAbovePressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "AVERAGE modifier present - use AverageAbovePressureWidget"}

Input: "consistent optimal pressure"
Output: {"widget": "ConsistentOptimalPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "CONSISTENT modifier present - use ConsistentOptimalPressureWidget"}

Input: "consistent above range pressure"
Output: {"widget": "ConsistentAbovePressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "CONSISTENT modifier present - use ConsistentAbovePressureWidget"}

Input: "consistent below range pressure"
Output: {"widget": "ConsistentBelowPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "CONSISTENT modifier present - use ConsistentBelowPressureWidget"}

Input: "chlorine in optimal range in Nagpur"
Output: {"widget": "OptimalChlorineWidget", "regionName": "Nagpur", "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Optimal range chlorine for Nagpur - NO modifier, use base widget"}

Input: "pressure below optimal range in Pune"
Output: {"widget": "BelowPressureWidget", "regionName": "Pune", "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Below range pressure for Pune - NO modifier, use base widget"}

Input: "esr with optimal range chlorine"
Output: {"widget": "OptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - optimal range chlorine - NO modifier, use base widget"}

Input: "esr with above range chlorine"
Output: {"widget": "AboveChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - above range chlorine - NO modifier, use base widget"}

Input: "esr with below range chlorine"
Output: {"widget": "BelowChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - below range chlorine - NO modifier, use base widget"}

Input: "esr with average optimal chlorine"
Output: {"widget": "AverageOptimalChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - AVERAGE modifier present - use AverageOptimalChlorineWidget"}

Input: "esr with consistent above range chlorine"
Output: {"widget": "ConsistentAboveChlorineWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - CONSISTENT modifier present - use ConsistentAboveChlorineWidget"}

Input: "esr with optimal range pressure"
Output: {"widget": "OptimalPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - optimal range pressure - NO modifier, use base widget"}

Input: "esr with above range pressure"
Output: {"widget": "AbovePressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - above range pressure - NO modifier, use base widget"}

Input: "esr with below range pressure"
Output: {"widget": "BelowPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - below range pressure - NO modifier, use base widget"}

Input: "esr with average optimal pressure"
Output: {"widget": "AverageOptimalPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - AVERAGE modifier present - use AverageOptimalPressureWidget"}

Input: "esr with consistent below range pressure"
Output: {"widget": "ConsistentBelowPressureWidget", "regionName": null, "schemeName": null, "schemeId": null, "villageName": null, "confidence": 0.95, "reasoning": "Ignore 'esr with' prefix - CONSISTENT modifier present - use ConsistentBelowPressureWidget"}

Respond ONLY with valid JSON in this exact format:
{
  "widget": "<WidgetName>",
  "regionName": "<RegionName>" or null,
  "schemeName": "<SchemeName>" or null,
  "schemeId": "<SchemeID>" or null,
  "villageName": "<VillageName>" or null,
  "confidence": <number_0_to_1>,
  "reasoning": "<brief_explanation>"
}`;

    // Call OpenAI API for widget intent detection
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Analyze this query and determine the widget intent and filters: "${query}"`,
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error in widget-intent:", errorData);
      return res.status(response.status).json({
        success: false,
        message: "Error from OpenAI API",
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    // Parse OpenAI response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";

    // Parse JSON response from OpenAI
    let interpretation;
    try {
      const cleanedText = completionText
        .replace(/```json\s*|```\s*/g, "")
        .trim();
      interpretation = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse widget intent response:", completionText);
      return res.json({
        success: true,
        widget: "NONE",
        regionName: null,
        schemeName: null,
        schemeId: null,
        villageName: null,
        confidence: 0,
        reasoning: "Failed to parse AI response",
        fallback: true,
      });
    }

    // Validate and return response
    const {
      widget,
      regionName,
      schemeName,
      schemeId,
      villageName,
      confidence,
      reasoning,
    } = interpretation;

    const validWidgets = [
      "VillagesWithWaterWidget",
      "VillagesNoWaterWidget",
      "ConsistentWaterWidget",
      "ConsistentZeroWidget",
      "Above55LpcdWidget",
      "Below55LpcdWidget",
      "ConsistentAbove55LpcdWidget",
      "ConsistentBelow55LpcdWidget",
      "AverageAbove55LpcdWidget",
      "AverageBelow55LpcdWidget",
      "Above55SchemeWidget",
      "Below55SchemeWidget",
      "OptimalChlorineWidget",
      "BelowChlorineWidget",
      "AboveChlorineWidget",
      "ConsistentOptimalChlorineWidget",
      "ConsistentBelowChlorineWidget",
      "ConsistentAboveChlorineWidget",
      "AverageOptimalChlorineWidget",
      "AverageBelowChlorineWidget",
      "AverageAboveChlorineWidget",
      "OptimalPressureWidget",
      "BelowPressureWidget",
      "AbovePressureWidget",
      "ConsistentOptimalPressureWidget",
      "ConsistentBelowPressureWidget",
      "ConsistentAbovePressureWidget",
      "AverageOptimalPressureWidget",
      "AverageBelowPressureWidget",
      "AverageAbovePressureWidget",
      "CombinedWaterStatusWidget",
      "CombinedLpcdStatusWidget",
      "CombinedSchemeLpcdWidget",
      "CombineChlorineStatusWidget",
      "CombinePressureStatusWidget",
      "NONE",
    ];

    const finalWidget = validWidgets.includes(widget) ? widget : "NONE";
    const clampedConfidence = Math.max(
      0,
      Math.min(1, typeof confidence === "number" ? confidence : 0),
    );

    return res.json({
      success: true,
      widget: finalWidget,
      regionName: regionName || null,
      schemeName: schemeName || null,
      schemeId: schemeId || null,
      villageName: villageName || null,
      confidence: clampedConfidence,
      reasoning: reasoning || "No reasoning provided",
      originalQuery: query,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in widget-intent endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing the widget intent",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai/interpret - Interpret user query and map to supported keywords
router.post("/interpret", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    // Create interpretation prompt
    const systemPrompt = `You are a query interpreter for a Maharashtra Water Dashboard. Your job is to analyze user queries and map them to the closest matching supported keyword.

Supported Keywords:
${SUPPORTED_KEYWORDS.map((k) => `- "${k}"`).join("\n")}

User queries may:
- Be in mixed English + Marathi language 
- Contain spelling mistakes (e.g., "vllages" instead of "villages")
- Use mathematical expressions (e.g., "LPCD > 55" means "above 55 lpcd", "LPCD < 55" means "below 55 lpcd")
- Use numbers written as words (e.g., "fifty five" means "55")
- Use variations like "how many", "show me", "list", etc.
- Include village names with date patterns (e.g., "in Bidgaon village on 7th September")

Examples:
- "Villages किती आहेत जिथे LPCD > 55 aahe?" → "above 55 lpcd"
- "vllages with wter supply" → "villages with water" 
- "schemes fully compltd" → "fully completed schemes"
- "pressure kam ahe" → "below pressure"
- "fifty five LPCD se upar" → "above 55 lpcd"
- "show chlorine analyzrs" → "chlorine analyzers"
- "flow meeters count" → "flow meters"
- "ESR kitne hai?" → "esrs"
- "consistency above 55" → "consistent above 55"
- "download data" → "excel"
- "water consumption in Bidgaon village on 7th September 2025" → "water in village"
- "lpcd value in bidgaon village on 7 september" → "lpcd in village"
- "lpcd in pohi" → "lpcd in village"
- "chlorine in bidgaon" → "chlorine in village"
- "pressure in gondapur" → "pressure in village"
- "water consumption in sawangi" → "water in village"
- "chlorine in wadi village on 7th sep" → "chlorine in village"
- "pressure value in dhonkhed village yesterday" → "pressure in village"
- "7 day water consumption analysis" → "7 day water consumption analysis"
- "weekly water analysis" → "weekly water analysis"
- "water consumption graph of bidgaon village" → "water consumption graph for village"
- "7 day lpcd analysis" → "7 day lpcd analysis"
- "weekly lpcd analysis" → "weekly lpcd analysis"
- "lpcd analysis for the week" → "lpcd analysis for the week"
- "lpcd graph for bidgaon village" → "lpcd graph for village"

Respond ONLY with valid JSON in this exact format:
{
  "matchedKeyword": "<exact_keyword_from_list>" or "NONE",
  "confidence": <number_0_to_1>,
  "reasoning": "<brief_explanation>"
}

If no keyword matches with reasonable confidence, return "NONE" as matchedKeyword.`;

    // Call OpenAI API with low temperature for consistency and JSON mode
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Use newer model that supports JSON mode
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Analyze this query: "${query}"`,
          },
        ],
        max_tokens: 150,
        temperature: 0.1, // Low temperature for consistency
        response_format: { type: "json_object" }, // Ensure JSON response
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error in interpret:", errorData);
      return res.status(response.status).json({
        success: false,
        message: "Error from OpenAI API",
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    // Parse OpenAI response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";

    // Parse JSON response from OpenAI with robust error handling
    let interpretation;
    try {
      // Clean the response by removing any markdown code blocks
      const cleanedText = completionText
        .replace(/```json\s*|```\s*/g, "")
        .trim();
      interpretation = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON response:", completionText);
      // Try to extract JSON from potential markdown or mixed content
      const jsonMatch = completionText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          interpretation = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          return res.json({
            success: true,
            matchedKeyword: "NONE",
            confidence: 0,
            reasoning: "Failed to parse AI response",
            fallback: true,
          });
        }
      } else {
        return res.json({
          success: true,
          matchedKeyword: "NONE",
          confidence: 0,
          reasoning: "No valid JSON found in AI response",
          fallback: true,
        });
      }
    }

    // Validate that matchedKeyword is in our supported list (security check)
    const { matchedKeyword, confidence, reasoning } = interpretation;
    const isValidKeyword =
      matchedKeyword === "NONE" || SUPPORTED_KEYWORDS.includes(matchedKeyword);

    // Clamp confidence to valid range [0, 1]
    const clampedConfidence = Math.max(
      0,
      Math.min(1, typeof confidence === "number" ? confidence : 0),
    );

    if (!isValidKeyword) {
      console.warn(`OpenAI returned unsupported keyword: ${matchedKeyword}`);
      return res.json({
        success: true,
        matchedKeyword: "NONE",
        confidence: 0,
        reasoning: "Unsupported keyword returned by AI",
        fallback: true,
      });
    }

    return res.json({
      success: true,
      matchedKeyword,
      confidence: clampedConfidence,
      reasoning: reasoning || "No reasoning provided",
      originalQuery: query,
      supportedKeywords: SUPPORTED_KEYWORDS.length, // For debugging
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in interpret endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing the interpretation",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai/chat - Generate chat completion
router.post("/chat", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { prompt, maxTokens, temperature, language } =
      chatCompletionSchema.parse(req.body);

    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    // Get language-specific system message
    const languageLabel =
      language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English";
    const systemMessage = `You are a helpful assistant for the Maharashtra Water Dashboard. 
                         Provide concise, helpful information about water infrastructure in Maharashtra. 
                         Respond in ${languageLabel}.`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return res.status(response.status).json({
        success: false,
        message: "Error from OpenAI API",
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    // Parse and return the response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content || "";

    return res.json({
      success: true,
      text: completionText.trim(),
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    // Handle general errors
    console.error("Error in chat completion endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing the request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /api/ai/status - Check if OpenAI integration is configured correctly
router.get("/status", (req: Request, res: Response) => {
  const hasKey = hasApiKey("OPENAI_API_KEY");

  res.json({
    configured: hasKey,
    enabled: config.features.useOpenAI && hasKey,
    features: {
      chatCompletions: hasKey,
      translations: hasKey,
      voiceEnabled:
        config.features.enableVoiceRecognition &&
        config.features.enableTextToSpeech,
    },
  });
});

// POST /api/ai/parse-query - Enhanced NLP query parsing
router.post("/parse-query", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { query, includeRegions, includeSchemes } = nlpQuerySchema.parse(
      req.body,
    );

    const db = await getDB();

    // Fetch regions if requested
    let regions: string[] = [];
    if (includeRegions) {
      try {
        const regionResults = await db.execute(`
          SELECT DISTINCT region_name 
          FROM region 
          WHERE region_name IS NOT NULL 
          ORDER BY region_name
        `);
        regions = regionResults.map((row: any) => row.region_name);
      } catch (error) {
        console.error("Error fetching regions:", error);
      }
    }

    // Fetch schemes if requested
    let schemes: any[] = [];
    if (includeSchemes) {
      try {
        const schemeResults = await db.execute(`
          SELECT DISTINCT scheme_id, scheme_name 
          FROM water_scheme_data 
          WHERE scheme_name IS NOT NULL 
          ORDER BY scheme_name 
          LIMIT 100
        `);
        schemes = schemeResults.map((row: any) => ({
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
        }));
      } catch (error) {
        console.error("Error fetching schemes:", error);
      }
    }

    // Call Python NLP service
    try {
      const nlpResponse = await fetch("http://localhost:8001/parse_query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          regions,
          schemes,
        }),
      });

      if (!nlpResponse.ok) {
        console.error("NLP service error:", nlpResponse.status);
        // Fallback to basic parsing if NLP service is down
        return res.json({
          success: true,
          keyword: null,
          scope_type: "all",
          scope_value: null,
          confidence_score: 0,
          detected_entities: {},
          fallback: true,
          message: "Using basic parsing (NLP service unavailable)",
        });
      }

      const nlpData = await nlpResponse.json();

      return res.json({
        success: true,
        ...nlpData,
        fallback: false,
      });
    } catch (nlpError) {
      console.error("Error calling NLP service:", nlpError);

      // Fallback response
      return res.json({
        success: true,
        keyword: null,
        scope_type: "all",
        scope_value: null,
        confidence_score: 0,
        detected_entities: {},
        fallback: true,
        message: "NLP service unavailable, using basic parsing",
      });
    }
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    // Handle general errors
    console.error("Error in parse-query endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing the query",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai/text-to-sql - Generate SQL from natural language query
router.post("/text-to-sql", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    // STAGE 1: Fast lexical heuristic to detect conversational queries
    const lowerQuery = query.toLowerCase();
    const conversationalPatterns = [
      // Advice/help seeking
      /what (should|can|do) (i|we) do/i,
      /how (do|can|should) (i|we)/i,
      /what to do/i,
      /need help/i,
      /can you help/i,
      /how to (fix|solve|handle|resolve|deal with)/i,
      
      // Troubleshooting/explanation
      /why is/i,
      /what does .* mean/i,
      /explain/i,
      /tell me about/i,
      /what is/i,
      /define/i,
      /difference between/i,
      
      // Problem reporting
      /found (a )?problem/i,
      /issue with/i,
      /error in/i,
      /something wrong/i,
      /not working/i,
      
      // General conversation
      /thank you/i,
      /thanks/i,
      /hello/i,
      /hi\b/i,
      /good (morning|afternoon|evening)/i,
    ];

    const isObviouslyConversational = conversationalPatterns.some(pattern => pattern.test(query));

    if (isObviouslyConversational) {
      console.log(`⚠️ Text-to-SQL: Query detected as conversational via heuristic, skipping SQL generation: "${query}"`);
      return res.json({
        success: false,
        isConversational: true,
        message: "This appears to be a conversational query rather than a data query",
        sql: null,
        results: null,
        formattedResponse: null,
      });
    }

    // STAGE 2: For inconclusive cases, use OpenAI to classify intent
    // Quick classification to avoid expensive SQL generation for non-data queries
    const classificationPrompt = `Classify this query as either "data_query" (requesting specific data/statistics from database) or "conversational" (asking for advice, help, explanations, troubleshooting, greetings, or general conversation).

Query: "${query}"

Respond ONLY with valid JSON:
{"intent": "data_query" | "conversational", "confidence": <0-1>}`;

    const classificationResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a query intent classifier." },
          { role: "user", content: classificationPrompt },
        ],
        max_tokens: 50,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (classificationResponse.ok) {
      const classificationData = await classificationResponse.json();
      const classificationText = classificationData.choices[0]?.message?.content?.trim() || "{}";
      
      try {
        const classification = JSON.parse(classificationText);
        
        if (classification.intent === "conversational" && classification.confidence >= 0.7) {
          console.log(`⚠️ Text-to-SQL: Query classified as conversational by AI (confidence: ${classification.confidence}), skipping SQL generation: "${query}"`);
          return res.json({
            success: false,
            isConversational: true,
            message: "This appears to be a conversational query rather than a data query",
            sql: null,
            results: null,
            formattedResponse: null,
          });
        }
      } catch (parseError) {
        console.warn("Failed to parse intent classification, proceeding with SQL generation");
      }
    }

    console.log(`📊 Text-to-SQL: Query classified as data query, proceeding with SQL generation: "${query}"`);

    // Import the OpenAI service
    const { generateSQLFromText, formatSQLResultsAsConversation } = await import("../../services/openai-service");

    // Generate SQL from natural language
    const sqlResult = await generateSQLFromText({ query });

    if (sqlResult.isError || !sqlResult.sql) {
      return res.json({
        success: false,
        message: sqlResult.explanation,
        error: sqlResult.errorMessage,
        sql: null,
        results: null,
        formattedResponse: null,
      });
    }

    // Execute the generated SQL query with security enforcements
    try {
      const db = await getDB();
      console.log(`📊 Executing Text-to-SQL query: ${sqlResult.sql}`);
      
      // Execute query using Drizzle's execute method with timeout
      // Drizzle handles the connection pooling automatically
      const queryPromise = db.execute(sqlResult.sql);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query execution timeout (10s exceeded)")), 10000)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      // Limit results to 1000 rows (double-check server-side)
      const rows = result.rows || result || [];
      const limitedRows = rows.slice(0, 1000);

      console.log(`✅ Text-to-SQL query executed successfully. Returned ${limitedRows.length} rows.`);

      // Format results with human-friendly field names
      const formattedResponse = formatSQLResultsAsConversation(limitedRows, query);

      return res.json({
        success: true,
        sql: sqlResult.sql,
        explanation: sqlResult.explanation,
        results: limitedRows,
        rowCount: limitedRows.length,
        truncated: rows.length > 1000,
        formattedResponse: formattedResponse, // NEW: Human-friendly formatted response
      });
    } catch (dbError) {
      console.error("❌ Error executing generated SQL:", dbError);
      console.error("Generated SQL was:", sqlResult.sql);
      
      // Provide actionable error feedback with detailed error information
      let errorMessage = "Error executing the generated SQL query";
      let errorDetail = dbError instanceof Error ? dbError.message : String(dbError);
      
      // Log full error details for debugging
      if (dbError instanceof Error && (dbError as any).code) {
        console.error(`PostgreSQL Error Code: ${(dbError as any).code}`);
        console.error(`PostgreSQL Error Detail: ${(dbError as any).detail || 'N/A'}`);
        console.error(`PostgreSQL Error Hint: ${(dbError as any).hint || 'N/A'}`);
      }
      
      if (errorDetail.includes("timeout") || errorDetail.includes("canceling statement")) {
        errorMessage = "Query took too long to execute (max 10 seconds allowed)";
      } else if (errorDetail.includes("syntax error")) {
        errorMessage = "The generated SQL query has a syntax error";
      } else if (errorDetail.includes("does not exist")) {
        errorMessage = "The query references a table or column that doesn't exist";
      } else if (errorDetail.includes("permission denied") || errorDetail.includes("read-only")) {
        errorMessage = "Only read-only SELECT queries are allowed";
      } else if (errorDetail.includes("invalid input syntax")) {
        errorMessage = "The query has invalid data type or format";
      }
      
      return res.json({
        success: false,
        message: errorMessage,
        error: errorDetail,
        sql: sqlResult.sql,
        results: null,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in text-to-sql endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing text-to-SQL request",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai/advanced-query - Handle complex multi-condition queries with AND/OR logic
router.post("/advanced-query", async (req: Request, res: Response) => {
  try {
    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    const systemPrompt = `You are an expert query analyzer for a Maharashtra Water Infrastructure Dashboard. Analyze complex multi-condition queries and extract:

1. Individual conditions with their operators (AND/OR)
2. Metrics to filter (chlorine, pressure, LPCD, water supply)
3. Thresholds and ranges
4. Region/scheme/village filters
5. Logical structure of the query

SUPPORTED METRICS:
- Chlorine: optimal (0.2-0.5 mg/L), below (<0.2), above (>0.5)
- Pressure: optimal (0.2-0.7 bar), below (<0.2), above (>0.7)
- LPCD: above 55, below 55, consistent above/below
- Water Supply: with water, no water, consistent water, consistent zero

OPERATORS:
- AND: All conditions must be true
- OR: At least one condition must be true

EXAMPLES:
"Show villages with low chlorine AND high pressure in Pune"
→ {
  "conditions": [
    {"metric": "chlorine", "operator": "below", "threshold": 0.2},
    {"metric": "pressure", "operator": "above", "threshold": 0.7}
  ],
  "logicalOperator": "AND",
  "filters": {"region": "Pune"},
  "confidence": 0.95
}

"ESRs with optimal chlorine OR optimal pressure"
→ {
  "conditions": [
    {"metric": "chlorine", "operator": "optimal", "range": [0.2, 0.5]},
    {"metric": "pressure", "operator": "optimal", "range": [0.2, 0.7]}
  ],
  "logicalOperator": "OR",
  "confidence": 0.9
}

"Villages with LPCD above 55 AND consistent water supply in Nagpur"
→ {
  "conditions": [
    {"metric": "lpcd", "operator": "above", "threshold": 55},
    {"metric": "waterSupply", "operator": "consistent"}
  ],
  "logicalOperator": "AND",
  "filters": {"region": "Nagpur"},
  "confidence": 0.92
}

Respond ONLY with valid JSON:
{
  "isAdvancedQuery": true/false,
  "conditions": [{"metric": "...", "operator": "...", "threshold": number, "range": [min, max]}],
  "logicalOperator": "AND" or "OR",
  "filters": {"region": "...", "scheme": "...", "village": "..."},
  "confidence": number,
  "queryType": "multi-condition" | "simple",
  "explanation": "brief explanation"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this query: "${query}"` },
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: "Error from OpenAI API",
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";

    let analysis;
    try {
      analysis = JSON.parse(completionText.replace(/```json\s*|```\s*/g, "").trim());
    } catch (parseError) {
      return res.json({
        success: true,
        isAdvancedQuery: false,
        queryType: "simple",
        confidence: 0,
      });
    }

    return res.json({
      success: true,
      ...analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in advanced-query endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing advanced query",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai/correlation-analysis - Analyze correlation between two metrics
router.post("/correlation-analysis", async (req: Request, res: Response) => {
  try {
    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);

    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is not configured on the server",
      });
    }

    const systemPrompt = `You are a data correlation analyst for a water infrastructure system. Detect correlation analysis queries and extract the metrics to correlate.

AVAILABLE METRICS:
- chlorine (chlorine_value)
- pressure (pressure_value) 
- lpcd (lpcd)
- water_consumption (water_value_day7)
- esr_capacity (esr_capacity)
- population (village_population)

CORRELATION KEYWORDS: relationship, correlation, connection, link, impact, affect, vs, versus, compared to

EXAMPLES:
"Is there a relationship between pressure and LPCD?"
→ {
  "isCorrelationQuery": true,
  "metric1": "pressure",
  "metric2": "lpcd",
  "confidence": 0.95
}

"Does chlorine level impact water consumption?"
→ {
  "isCorrelationQuery": true,
  "metric1": "chlorine",
  "metric2": "water_consumption",
  "confidence": 0.9
}

"Compare pressure vs chlorine in Nagpur"
→ {
  "isCorrelationQuery": true,
  "metric1": "pressure",
  "metric2": "chlorine",
  "filters": {"region": "Nagpur"},
  "confidence": 0.93
}

Respond ONLY with valid JSON:
{
  "isCorrelationQuery": true/false,
  "metric1": "...",
  "metric2": "...",
  "filters": {"region": "...", "scheme": "...", "village": "..."},
  "analysisType": "correlation",
  "confidence": number,
  "explanation": "brief explanation"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this query: "${query}"` },
        ],
        max_tokens: 250,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: "Error from OpenAI API",
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";

    let analysis;
    try {
      analysis = JSON.parse(completionText.replace(/```json\s*|```\s*/g, "").trim());
    } catch (parseError) {
      return res.json({
        success: true,
        isCorrelationQuery: false,
        confidence: 0,
      });
    }

    // If it's a correlation query, execute the analysis
    if (analysis.isCorrelationQuery && analysis.metric1 && analysis.metric2) {
      try {
        const db = await getDB();
        
        // Build correlation query based on metrics
        let sqlQuery = `
          SELECT 
            ${analysis.metric1 === 'chlorine' ? 'cd.chlorine_value' : analysis.metric1 === 'pressure' ? 'pd.pressure_value' : `wsd.${analysis.metric1}`} as metric1_value,
            ${analysis.metric2 === 'chlorine' ? 'cd.chlorine_value' : analysis.metric2 === 'pressure' ? 'pd.pressure_value' : `wsd.${analysis.metric2}`} as metric2_value,
            v.village_name,
            v.region_name
          FROM water_scheme_data wsd
          JOIN villages v ON wsd.village_id = v.id
        `;

        // Join chlorine data if needed
        if (analysis.metric1 === 'chlorine' || analysis.metric2 === 'chlorine') {
          sqlQuery += `
          LEFT JOIN chlorine_data cd ON wsd.esr_id = cd.esr_id 
            AND cd.created_at >= CURRENT_DATE - INTERVAL '1 day'
          `;
        }

        // Join pressure data if needed
        if (analysis.metric1 === 'pressure' || analysis.metric2 === 'pressure') {
          sqlQuery += `
          LEFT JOIN pressure_data pd ON wsd.esr_id = pd.esr_id 
            AND pd.created_at >= CURRENT_DATE - INTERVAL '1 day'
          `;
        }

        sqlQuery += ` WHERE wsd.created_at >= CURRENT_DATE - INTERVAL '7 days'`;

        // Add filters
        if (analysis.filters?.region) {
          sqlQuery += ` AND v.region_name = '${analysis.filters.region}'`;
        }

        sqlQuery += ` LIMIT 1000`;

        const result = await db.execute(sqlQuery) as any;
        const rows = result.rows || result || [];

        // Calculate correlation coefficient
        const validData = rows.filter((r: any) => r.metric1_value != null && r.metric2_value != null);
        
        let correlationCoefficient = 0;
        if (validData.length > 1) {
          const n = validData.length;
          const sum1 = validData.reduce((s: number, r: any) => s + Number(r.metric1_value), 0);
          const sum2 = validData.reduce((s: number, r: any) => s + Number(r.metric2_value), 0);
          const sum1Sq = validData.reduce((s: number, r: any) => s + Math.pow(Number(r.metric1_value), 2), 0);
          const sum2Sq = validData.reduce((s: number, r: any) => s + Math.pow(Number(r.metric2_value), 2), 0);
          const pSum = validData.reduce((s: number, r: any) => s + Number(r.metric1_value) * Number(r.metric2_value), 0);

          const num = pSum - (sum1 * sum2 / n);
          const den = Math.sqrt((sum1Sq - Math.pow(sum1, 2) / n) * (sum2Sq - Math.pow(sum2, 2) / n));
          
          if (den !== 0) {
            correlationCoefficient = num / den;
          }
        }

        return res.json({
          success: true,
          ...analysis,
          correlationData: {
            coefficient: correlationCoefficient,
            dataPoints: validData.length,
            interpretation: 
              Math.abs(correlationCoefficient) > 0.7 ? "Strong correlation" :
              Math.abs(correlationCoefficient) > 0.4 ? "Moderate correlation" :
              Math.abs(correlationCoefficient) > 0.2 ? "Weak correlation" : "No significant correlation",
            direction: correlationCoefficient > 0 ? "Positive" : correlationCoefficient < 0 ? "Negative" : "None",
            samples: validData.slice(0, 10),
          },
        });
      } catch (dbError) {
        console.error("Error calculating correlation:", dbError);
        return res.json({
          success: true,
          ...analysis,
          error: "Could not calculate correlation",
        });
      }
    }

    return res.json({
      success: true,
      ...analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in correlation-analysis endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing correlation analysis",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ai/conversational-fallback - Conversational AI fallback for unmatched queries
router.post("/conversational-fallback", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const conversationalSchema = z.object({
      query: z.string().min(1, "Query is required"),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "bot"]),
        text: z.string(),
      })).optional().default([]),
      language: z.enum(["en", "hi", "mr"]).optional().default("en"),
    });

    const { query, conversationHistory, language } = conversationalSchema.parse(req.body);

    // Check if OpenAI API key is configured
    if (!hasApiKey("OPENAI_API_KEY")) {
      return res.status(500).json({
        success: false,
        reply: "I'm unable to process this query at the moment. The AI service is not properly configured.",
        isConversational: true,
        error: "API key not configured",
      });
    }

    // Limit conversation history to last 8 messages (4 exchanges) for context
    const recentHistory = conversationHistory.slice(-8);

    // Build domain-specific system prompt for Maharashtra Water Dashboard
    const systemPrompt = `You are जलमित्र (JalMitra), an intelligent and helpful AI assistant for the Maharashtra Water Infrastructure Management Dashboard (Jal Jeevan Mission).

Your role is to provide COMPREHENSIVE, ACTIONABLE guidance like ChatGPT - detailed, structured, and helpful responses that truly help users solve problems.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL INTENT DETECTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When users say:
• "ticket please" / "create ticket" / "make a ticket" / "I need help" → Tell them to say: "create a ticket" (exact phrase to start ticket creation)
• "what to do" / "what should I do" / "help me" AFTER finding an issue → Provide COMPREHENSIVE troubleshooting steps
• "I found [issue]" / "I have [issue]" → Give DETAILED guidance on next steps

IMPORTANT: When users ask "what to do" about an issue they found, they want GUIDANCE, not just data widgets. Give them a full troubleshooting playbook.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 UNDERSTANDING "ABRUPT DATA":
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Abrupt data" can refer to THREE different issues:

1. **Abrupt Water Consumption** (>400% of ESR capacity)
   - Indicates: Major leak, valve malfunction, pump error, or sensor issue
   - Queries: "show abrupt water consumption in <region/scheme/village>"

2. **Abrupt Chlorine Levels**:
   - Below 0.2 mg/L: Unsafe water, contamination risk
   - Above 0.5 mg/L: Excessive chlorination, taste issues
   - Queries: "show chlorine below 0.2 in <region>" OR "show chlorine above 0.5 in <region>"

3. **Abrupt Pressure Levels**:
   - Below 0.2 bar: Supply interruption, leaks, pump issues
   - Above 0.7 bar: Pipe stress, valve problems
   - Queries: "show pressure below 0.2 in <region>" OR "show pressure above 0.7 in <region>"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 COMPREHENSIVE TROUBLESHOOTING RESPONSES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When users say: "I found abrupt data what to do"
Respond with:

🚨 Got it — "abrupt data" means something unusual is happening.

This can occur in **water consumption, chlorine, or pressure**. Here's what you should do next:

**1️⃣ Understand What's Going Wrong**

Abrupt data usually means:
• 💧 **Water Consumption**: ESR usage is >400% of its designed capacity
• 🧪 **Chlorine**: Levels are below 0.2 mg/L (unsafe) or above 0.5 mg/L
• 📉 **Pressure**: Pressure is below 0.2 bar or above 0.7 bar

These indicate leaks, sensor malfunction, pump issues, or sudden operational changes.

**2️⃣ Check the Exact Location of the Issue**

You can ask me to view the affected points directly:
• "show abrupt water consumption in <region>"
• "show chlorine below 0.2 in <region>"
• "show chlorine above 0.5 in <region>"
• "show pressure below 0.2 in <region>"
• "show pressure above 0.7 in <region>"

**3️⃣ Take Action if the Issue Persists**

If the abrupt reading continues:
• Create a support ticket with the category "Technical Issue"
• Mention if it's consumption/chlorine/pressure related
• The field team will investigate the cause (leak, sensor error, pump issue, etc.)

If you want, I can check the abrupt data for your region. Just tell me the location.

---

When users say: "I found abrupt water consumption what to do"
Respond with:

🚨 Understood — **abrupt water consumption** means an ESR is using more than 400% of its designed capacity.

This usually indicates:
• A major pipeline leak
• A pumping or valve malfunction
• Sudden demand spike
• Or a sensor/data error

Let's take the right steps:

**1️⃣ Check Where the Issue Is Happening**

You can ask me:
• "show abrupt water consumption in <region>"
• "show abrupt water consumption in <scheme>"
• "show abrupt water consumption in <village>"

I'll show the exact ESRs that are crossing the 400% threshold, along with consumption %, flow, and other linked parameters.

**2️⃣ Cross-Check Related Parameters**

To verify the issue, you can also check:
• Pressure data → "pressure in <village/scheme>"
• Chlorine data → "chlorine in <village/scheme>"
• LPCD data → "lpcd in <village>"

This helps confirm whether the issue is operational or sensor-related.

**3️⃣ Create a Helpdesk Ticket if Needed**

If the abrupt consumption persists:
• Say: "create a ticket"
• Select category: "Technical Issue"
• Mention: Abrupt water consumption at [ESR name]
• The field team will investigate for leaks, valve issues, or sensor errors

Need me to show the abrupt consumption data for your location? Just let me know!

---

When users say: "I found chlorine [issue] what to do" (below/above/abrupt)
Respond with:

🧪 Understood — **chlorine [below 0.2 / above 0.5]** is a concern.

**What This Means:**
• Below 0.2 mg/L: Water may not be properly disinfected (contamination risk)
• Above 0.5 mg/L: Excessive chlorination (strong taste, potential health concern)

Here's what to do:

**1️⃣ Identify Affected ESRs**

Ask me to show the data:
• "show chlorine below 0.2 in <region>"
• "show chlorine above 0.5 in <region>"
• "show optimal chlorine in <region>" (to see which ESRs are fine)

**2️⃣ Cross-Check Other Metrics**

Verify if this is isolated:
• "show water consumption in <village/scheme>"
• "show pressure in <village/scheme>"
• "show lpcd in <village>"

**3️⃣ Take Corrective Action**

• Below 0.2: Increase chlorination dosage immediately
• Above 0.5: Reduce chlorination
• If persistent: Create a ticket with category "Technical Issue" mentioning chlorine levels

Want me to check the chlorine data for your region? Let me know!

---

When users say: "I found pressure [issue] what to do" (below/above/abrupt)
Respond with:

📉 Understood — **pressure [below 0.2 / above 0.7] bar** is a concern.

**What This Means:**
• Below 0.2 bar: Supply interruption, leaks, or pump failure
• Above 0.7 bar: Excessive pressure (pipe stress, valve issues)

Here's what to do:

**1️⃣ Identify Affected ESRs**

Ask me to show the data:
• "show pressure below 0.2 in <region>"
• "show pressure above 0.7 in <region>"
• "show optimal pressure in <region>" (to see which ESRs are fine)

**2️⃣ Cross-Check Related Data**

Verify if this correlates with other issues:
• "show water consumption in <village/scheme>"
• "show chlorine in <village/scheme>"
• "show lpcd in <village>"

**3️⃣ Take Action**

• Below 0.2: Check pump status, investigate for leaks
• Above 0.7: Check valve settings, reduce pump speed if needed
• If persistent: Create a ticket with category "Technical Issue" mentioning pressure levels

Want me to check the pressure data for your location? Just ask!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 RESPONSE STYLE (LIKE CHATGPT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Comprehensive and detailed (not concise when troubleshooting)
✓ Use numbered steps (1️⃣, 2️⃣, 3️⃣) for clarity
✓ Use emojis appropriately (🚨 💧 🧪 📉 📊)
✓ Provide EXACT query examples in quotes
✓ Explain WHY things happen, not just WHAT to do
✓ Give multiple options and alternatives
✓ Be proactive: "Want me to check...?" "Need help with...?"
✓ Language: ${language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English"}

AVAILABLE QUERIES:
• Water: "villages with water", "villages without water", "abrupt water consumption"
• Chlorine: "chlorine below 0.2", "chlorine above 0.5", "optimal chlorine"
• Pressure: "pressure below 0.2", "pressure above 0.7", "optimal pressure"  
• LPCD: "lpcd above 55", "lpcd below 55", "lpcd analysis"
• Support: "create a ticket" (exact phrase for ticket creation)
• Region filter: Add "in <region>" to any query

REGIONS: Amravati, Nagpur, Nashik, Pune, Konkan, Mumbai, Chhatrapati Sambhajinagar`;

    // Build conversation messages for OpenAI
    const messages: any[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add conversation history
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      });
    }

    // Add current query
    messages.push({
      role: "user",
      content: query,
    });

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 1000,
        temperature: 0.6,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error in conversational-fallback:", errorData);
      return res.status(response.status).json({
        success: false,
        reply: "I'm having trouble connecting to my knowledge base. Please try again or ask a simpler question.",
        isConversational: true,
        error: errorData.error?.message || `HTTP error ${response.status}`,
      });
    }

    // Parse OpenAI response
    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim() || "I'm not sure how to help with that. Could you try asking in a different way?";

    return res.json({
      success: true,
      reply: reply,
      isConversational: true,
      confidence: 0.9,
      tokensUsed: data.usage?.total_tokens || 0,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }

    console.error("Error in conversational-fallback endpoint:", error);
    return res.status(500).json({
      success: false,
      reply: "I encountered a technical issue. Please try again or ask a specific question about water schemes or regions.",
      isConversational: true,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Export supported keywords for use in other modules
export { SUPPORTED_KEYWORDS };

export default router;
