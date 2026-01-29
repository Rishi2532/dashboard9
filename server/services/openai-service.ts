/**
 * OpenAI Service
 * Provides functionality for interacting with OpenAI API from the server
 */

import { config, hasApiKey } from "../config";

interface ChatCompletionParams {
  prompt: string;
  systemMessage?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  language?: "en" | "hi" | "mr";
}

interface CompletionResponse {
  text: string;
  isError: boolean;
  status?: number;
  errorMessage?: string;
}

interface TextToSQLParams {
  query: string;
  language?: "en" | "hi" | "mr";
}

interface TextToSQLResponse {
  sql: string | null;
  explanation: string;
  isError: boolean;
  errorMessage?: string;
}

/**
 * Send a request to OpenAI for chat completion
 * @param params - Parameters for the completion request
 * @returns Formatted response from OpenAI
 */
export async function getChatCompletion(
  params: ChatCompletionParams,
): Promise<CompletionResponse> {
  const {
    prompt,
    systemMessage = "You are a helpful assistant for the Maharashtra Water Dashboard.",
    model = "gpt-4o-mini",
    maxTokens = 150,
    temperature = 0.7,
    language = "en",
  } = params;

  // Check if API key is configured
  if (!hasApiKey("OPENAI_API_KEY")) {
    console.error("OpenAI API key is not configured on the server");
    return {
      text: "I'm unable to process advanced queries at the moment. The OpenAI integration is not properly configured.",
      isError: true,
      errorMessage: "API key not configured",
    };
  }

  // Get the correct language for the system message
  const languageLabel =
    language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English";
  const languageSystemMessage = `${systemMessage} Respond in ${languageLabel}.`;

  try {
    // Prepare request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKeys.openai}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: languageSystemMessage,
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

    // Handle non-200 responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return {
        text: "I'm having trouble connecting to my knowledge base. Please try again or ask a simpler question.",
        isError: true,
        status: response.status,
        errorMessage:
          errorData.error?.message || `HTTP error ${response.status}`,
      };
    }

    // Parse the response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content || "";

    return {
      text: completionText.trim(),
      isError: false,
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return {
      text: "I encountered a technical issue while processing your request. Please try again later.",
      isError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send a request to OpenAI for chat completion with streaming
 * @param params - Parameters for the completion request
 * @returns Stream from OpenAI API
 */
export async function getChatCompletionStream(
  params: ChatCompletionParams,
): Promise<Response> {
  const {
    prompt,
    systemMessage = "You are a helpful assistant for the Maharashtra Water Dashboard.",
    model = "gpt-4o-mini",
    maxTokens = 150,
    temperature = 0.7,
    language = "en",
  } = params;

  // Check if API key is configured
  if (!hasApiKey("OPENAI_API_KEY")) {
    throw new Error("OpenAI API key is not configured on the server");
  }

  // Get the correct language for the system message
  const languageLabel =
    language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English";
  const languageSystemMessage = `${systemMessage} Respond in ${languageLabel}.`;

  // Prepare request to OpenAI API with streaming enabled
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKeys.openai}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content: languageSystemMessage,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      stream: true, // Enable streaming
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("OpenAI API error:", errorData);
    throw new Error(
      errorData.error?.message || `HTTP error ${response.status}`,
    );
  }

  return response;
}

/**
 * Generate SQL query from natural language using OpenAI
 * @param params - Parameters for text-to-SQL conversion
 * @returns Generated SQL query and explanation
 */
export async function generateSQLFromText(
  params: TextToSQLParams,
): Promise<TextToSQLResponse> {
  const { query, language = "en" } = params;

  // Check if API key is configured
  if (!hasApiKey("OPENAI_API_KEY")) {
    console.error("OpenAI API key is not configured on the server");
    return {
      sql: null,
      explanation: "OpenAI API key is not configured",
      isError: true,
      errorMessage: "API key not configured",
    };
  }

  // Database schema description for OpenAI
  const databaseSchema = `
You are a SQL query generator for the Maharashtra Water Infrastructure Management Platform PostgreSQL database.

**IMPORTANT RULES:**
1. ONLY generate SELECT queries (READ-ONLY). Never generate INSERT, UPDATE, DELETE, DROP, or any modifying queries.
2. Use proper PostgreSQL syntax
3. Use table aliases for clarity
4. Limit results to 1000 rows maximum using LIMIT clause
5. Handle NULL values appropriately
6. Use proper CAST() functions for type conversions when needed
7. For text search, use ILIKE for case-insensitive matching
8. Always include ORDER BY for consistent results

**DATABASE SCHEMA:**

TABLE: region
- region_id: serial PRIMARY KEY
- region_name: text (Values: Amravati, Nagpur, Nashik, Pune, Konkan, Chhatrapati Sambhajinagar, Mumbai)
- total_esr_integrated: integer (Total ESRs integrated on IoT)
- fully_completed_esr: integer (Fully completed ESRs)
- partial_esr: integer (Partially completed ESRs)
- total_villages_integrated: integer (Villages integrated)
- fully_completed_villages: integer (Fully completed villages)
- total_schemes_integrated: integer (Schemes integrated)
- fully_completed_schemes: integer (Fully completed schemes)
- flow_meter_integrated: integer (Flow meters connected)
- rca_integrated: integer (Residual Chlorine Analyzers)
- pressure_transmitter_integrated: integer (Pressure transmitters)

TABLE: scheme_status
- sr_no: integer
- scheme_id: text PRIMARY KEY
- region, circle, division, sub_division, block: text (Geographic hierarchy)
- scheme_name: text (Name of water scheme)
- agency: text (Managing agency)
- number_of_village: integer (Total villages in scheme)
- total_villages_integrated: integer (Villages on IoT)
- no_of_functional_village: integer (Functional villages)
- no_of_partial_village: integer (Partial villages)
- no_of_non_functional_village: integer (Non-functional villages)
- fully_completed_villages: integer
- total_number_of_esr: integer (Total ESRs)
- scheme_functional_status: text (Functional status)
- total_esr_integrated: integer (ESRs on IoT)
- no_fully_completed_esr: integer (Completed ESRs)
- balance_to_complete_esr: integer (Remaining ESRs)
- flow_meters_connected: integer
- pressure_transmitter_connected: integer
- residual_chlorine_analyzer_connected: integer
- fully_completion_scheme_status: text (Fully Completed / In Progress)
- mjp_commissioned: text (Yes/No - Maharashtra Jeevan Pradhikaran commissioned)
- mjp_fully_completed: text
- dashboard_url: text

TABLE: water_scheme_data
PRIMARY KEY: (scheme_id, village_name, block)
- region, circle, division, sub_division, block: text/varchar
- scheme_id, scheme_name, village_name: varchar/text
- population: integer
- number_of_esr: integer
- water_value_day1 to water_value_day7: decimal (Water consumption in m³ for last 7 days)
- lpcd_value_day1 to lpcd_value_day7: decimal (Liters Per Capita Per Day for last 7 days)
- water_date_day1 to water_date_day7: varchar (Dates)
- lpcd_date_day1 to lpcd_date_day7: varchar (Dates)
- consistent_zero_lpcd_for_a_week: integer (Count of zero LPCD days)
- below_55_lpcd_count: integer (Days with LPCD < 55)
- above_55_lpcd_count: integer (Days with LPCD > 55)
- dashboard_url: text

TABLE: chlorine_data
PRIMARY KEY: (scheme_id, village_name, esr_name)
- region, circle, division, sub_division, block: varchar/text
- scheme_id, scheme_name, village_name, esr_name: varchar/text
- chlorine_value_1 to chlorine_value_7: decimal (Chlorine levels in mg/L for last 7 days)
- chlorine_date_day_1 to chlorine_date_day_7: varchar
- number_of_consistent_zero_value_in_chlorine: integer
- chlorine_less_than_02_mgl: decimal (Days with chlorine < 0.2 mg/L)
- chlorine_between_02_05_mgl: decimal (Optimal range 0.2-0.5 mg/L)
- chlorine_greater_than_05_mgl: decimal (Days with chlorine > 0.5 mg/L)
- dashboard_url: text

TABLE: pressure_data
PRIMARY KEY: (scheme_id, village_name, esr_name)
- region, circle, division, sub_division, block: text
- scheme_id, scheme_name, village_name, esr_name: text
- pressure_value_1 to pressure_value_7: decimal (Pressure in bar for last 7 days)
- pressure_date_day_1 to pressure_date_day_7: varchar
- number_of_consistent_zero_value_in_pressure: integer
- pressure_less_than_02_bar: decimal (Days with pressure < 0.2 bar)
- pressure_between_02_07_bar: decimal (Optimal range 0.2-0.7 bar)
- pressure_greater_than_07_bar: decimal (Days with pressure > 0.7 bar)
- dashboard_url: text

TABLE: water_consumption
PRIMARY KEY: (scheme_id, village_name, esr_name)
- region, circle, division, sub_division, block: varchar
- scheme_id, scheme_name, village_name, esr_name: varchar
- flow_rate_m3: decimal (Flow rate in m³)
- flow_meter_connected: varchar (Yes/No)
- online_status: varchar (Online/Offline)
- esr_capacity: decimal (ESR capacity in m³)
- water_value_day1 to water_value_day7: decimal (Water consumption for last 7 days)
- water_date_day1 to water_date_day7: varchar
- consistent_zero_consumption: integer (Days with zero consumption)
- percentage_consumption_previous_day: decimal
- dashboard_url: text

TABLE: helpdesk_tickets
- id: serial PRIMARY KEY
- ticket_id: varchar (Format: HD-000001)
- title, description: text
- category, specific_issue: text
- region, circle, division, sub_division, block, village_name, esr_name: text
- priority: text (Low/Medium/High)
- status: text (Open/In-Progress/Resolved/Closed)
- contact_name, contact_phone, contact_email: text
- created_by: integer (references users.id)
- created_at, updated_at: timestamp
- dashboard_url, attachment_path, admin_comments: text

TABLE: communication_status
- id: serial PRIMARY KEY
- region, circle, division, sub_division, block: varchar
- scheme_id, scheme_name, village_name, esr_name: varchar
- chlorine_connected, pressure_connected, flow_meter_connected: varchar (Yes/No)
- chlorine_status, pressure_status, flow_meter_status, overall_status: varchar (Online/Offline)
- chlorine_0h_72h, pressure_0h_72h, flow_meter_0h_72h: varchar (Time-based status)
- uploaded_at, updated_at: timestamp

TABLE: users
- id: serial PRIMARY KEY
- username: text UNIQUE
- password: text (hashed)
- name, email, phone: text
- role: text (admin/user)

TABLE: village
- region, circle, division, sub_division, block: varchar
- scheme_id, scheme_name, village_name: varchar
- number_of_esr, connected_esr, not_connected_esr: integer
- village_functional_status, fully_completion_village_status: varchar
- no_of_fully_completion_esr: integer

TABLE: population_tracking
- id: serial PRIMARY KEY
- date: text UNIQUE (Format: YYYY-MM-DD)
- total_population: integer
- created_at: timestamp

TABLE: region_population_tracking
- id: serial PRIMARY KEY
- date: text (Format: YYYY-MM-DD)
- region: text
- total_population: integer
- created_at: timestamp
UNIQUE: (date, region)

**EXAMPLE QUERIES:**

Q: "Which region has the most ESRs integrated?"
SQL: SELECT region_name, total_esr_integrated FROM region ORDER BY total_esr_integrated DESC LIMIT 1;

Q: "Show me schemes in Nagpur with more than 10 villages"
SQL: SELECT scheme_name, number_of_village, scheme_functional_status FROM scheme_status WHERE region = 'Nagpur' AND number_of_village > 10 ORDER BY number_of_village DESC LIMIT 1000;

Q: "What's the average LPCD across all villages?"
SQL: SELECT AVG(CAST(lpcd_value_day7 AS NUMERIC)) as avg_lpcd FROM water_scheme_data WHERE lpcd_value_day7 IS NOT NULL AND lpcd_value_day7 != '0';

Q: "List villages with population greater than 5000"
SQL: SELECT village_name, population, scheme_name, region FROM water_scheme_data WHERE population > 5000 ORDER BY population DESC LIMIT 1000;

Q: "How many ESRs have optimal chlorine levels?"
SQL: SELECT COUNT(*) as optimal_chlorine_esrs FROM chlorine_data WHERE CAST(chlorine_between_02_05_mgl AS NUMERIC) > 0;

Q: "Show me all schemes managed by specific agency"
SQL: SELECT scheme_name, region, total_number_of_esr, total_villages_integrated FROM scheme_status WHERE agency ILIKE '%ceinsys%' ORDER BY scheme_name LIMIT 1000;

Q: "Which ESRs are offline?"
SQL: SELECT esr_name, village_name, scheme_name, region, online_status FROM water_consumption WHERE online_status = 'Offline' ORDER BY region, village_name LIMIT 1000;

Respond ONLY with valid JSON in this exact format:
{
  "sql": "<generated_sql_query>",
  "explanation": "<brief_explanation_of_what_query_does>",
  "confidence": <0_to_1>
}
`;

  try {
    // Call OpenAI API for SQL generation
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
            content: databaseSchema,
          },
          {
            role: "user",
            content: `Generate a SQL query for: "${query}"`,
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error in text-to-SQL:", errorData);
      return {
        sql: null,
        explanation: "Error from OpenAI API",
        isError: true,
        errorMessage: errorData.error?.message || `HTTP error ${response.status}`,
      };
    }

    // Parse OpenAI response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";

    // Parse JSON response from OpenAI
    let sqlResponse;
    try {
      const cleanedText = completionText
        .replace(/```json\s*|```\s*/g, "")
        .trim();
      sqlResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse text-to-SQL response:", completionText);
      return {
        sql: null,
        explanation: "Failed to parse AI response",
        isError: true,
        errorMessage: "Invalid JSON response from AI",
      };
    }

    const { sql, explanation, confidence } = sqlResponse;

    // Validate that SQL is read-only (SELECT only)
    if (sql && typeof sql === "string") {
      const sqlTrimmed = sql.trim();
      const sqlUpper = sqlTrimmed.toUpperCase();
      
      // CRITICAL: Block query stacking (multiple statements separated by semicolons)
      // Remove comments and count actual statement terminators
      const sqlWithoutComments = sqlTrimmed.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const semicolonCount = (sqlWithoutComments.match(/;/g) || []).length;
      
      // Allow one optional trailing semicolon, but no more
      if (semicolonCount > 1 || (semicolonCount === 1 && !sqlWithoutComments.trim().endsWith(';'))) {
        return {
          sql: null,
          explanation: "Security error: Multiple SQL statements are not allowed",
          isError: true,
          errorMessage: "Query stacking detected",
        };
      }

      const forbiddenKeywords = [
        "INSERT",
        "UPDATE",
        "DELETE",
        "DROP",
        "ALTER",
        "CREATE",
        "TRUNCATE",
        "GRANT",
        "REVOKE",
        "EXEC",
        "EXECUTE",
        "CALL",
      ];

      const hasForbiddenKeyword = forbiddenKeywords.some((keyword) =>
        sqlUpper.includes(keyword)
      );

      if (hasForbiddenKeyword) {
        return {
          sql: null,
          explanation: "Security error: Only SELECT queries are allowed",
          isError: true,
          errorMessage: "Forbidden SQL operation detected",
        };
      }

      // Ensure SQL starts with SELECT
      if (!sqlUpper.startsWith("SELECT")) {
        return {
          sql: null,
          explanation: "Only SELECT queries are supported",
          isError: true,
          errorMessage: "Query must start with SELECT",
        };
      }
      
      // CRITICAL: Remove comments before checking for LIMIT to prevent bypass
      // Remove SQL comments: -- style and /* */ style
      const sqlWithoutCommentsForCheck = sqlTrimmed
        .replace(/--[^\n]*/g, '')  // Remove -- comments
        .replace(/\/\*[\s\S]*?\*\//g, '');  // Remove /* */ comments
      const sqlUpperNoComments = sqlWithoutCommentsForCheck.toUpperCase();
      
      // Enforce LIMIT if not present - add it to the end
      let finalSql = sqlTrimmed;
      if (!sqlUpperNoComments.includes('LIMIT')) {
        // Remove trailing semicolon if present before adding LIMIT
        finalSql = finalSql.replace(/;\s*$/, '');
        finalSql = `${finalSql} LIMIT 1000`;
      } else {
        // Validate that LIMIT doesn't exceed 1000
        const limitMatch = sqlUpperNoComments.match(/LIMIT\s+(\d+)/);
        if (limitMatch && parseInt(limitMatch[1]) > 1000) {
          // Replace the LIMIT value in the original SQL
          finalSql = finalSql.replace(/LIMIT\s+\d+/i, 'LIMIT 1000');
        }
      }

      return {
        sql: finalSql,
        explanation: explanation || "SQL query generated successfully",
        isError: false,
      };
    }

    return {
      sql: null,
      explanation: "No SQL query generated",
      isError: true,
      errorMessage: "Empty SQL response",
    };
  } catch (error) {
    console.error("Error in text-to-SQL generation:", error);
    return {
      sql: null,
      explanation: "Server error during SQL generation",
      isError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Simple language detection
 * @param text - Text to detect language for
 * @returns Language code ('en', 'hi', 'mr')
 */
export function detectLanguage(text: string): "en" | "hi" | "mr" {
  // Hindi Unicode range
  const hindiPattern = /[\u0900-\u097F]/g;
  // Marathi uses same Unicode range as Hindi, but we can check for some Marathi-specific patterns
  const marathiPattern = /[\u0900-\u097F][\u0900-\u097F]\s/g;

  if (marathiPattern.test(text)) {
    return "mr"; // Marathi
  } else if (hindiPattern.test(text)) {
    return "hi"; // Hindi
  }

  return "en"; // Default to English
}

/**
 * Translate text using OpenAI
 * @param text - Text to translate
 * @param targetLanguage - Target language code ('en', 'hi', 'mr')
 * @returns Translated text
 */
export async function translateText(
  text: string,
  targetLanguage: "en" | "hi" | "mr",
): Promise<string> {
  const languageNames = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
  };

  const response = await getChatCompletion({
    prompt: `Translate the following text to ${languageNames[targetLanguage]}: "${text}"`,
    maxTokens: 200,
    temperature: 0.3,
    language: targetLanguage,
  });

  return response.isError ? text : response.text;
}

/**
 * Field name mapping - converts database column names to human-friendly names
 */
const FIELD_NAME_MAP: Record<string, string> = {
  // Region table
  region_id: "Region ID",
  region_name: "Region",
  total_esr_integrated: "Total ESRs Integrated",
  fully_completed_esr: "Fully Completed ESRs",
  partial_esr: "Partial ESRs",
  total_villages_integrated: "Integrated Villages",
  fully_completed_villages: "Fully Completed Villages",
  total_schemes_integrated: "Integrated Schemes",
  fully_completed_schemes: "Fully Completed Schemes",
  flow_meter_integrated: "Flow Meters Connected",
  rca_integrated: "Chlorine Analyzers Connected",
  pressure_transmitter_integrated: "Pressure Transmitters Connected",
  
  // Scheme status table
  sr_no: "Sr. No.",
  scheme_id: "Scheme ID",
  scheme_name: "Scheme Name",
  region: "Region",
  circle: "Circle",
  division: "Division",
  sub_division: "Sub Division",
  block: "Block",
  agency: "Managing Agency",
  number_of_village: "Total Villages",
  no_of_functional_village: "Functional Villages",
  no_of_partial_village: "Partial Villages",
  no_of_non_functional_village: "Non-Functional Villages",
  total_number_of_esr: "Total ESRs",
  scheme_functional_status: "Functional Status",
  no_fully_completed_esr: "Completed ESRs",
  balance_to_complete_esr: "Remaining ESRs",
  flow_meters_connected: "Flow Meters",
  pressure_transmitter_connected: "Pressure Transmitters",
  residual_chlorine_analyzer_connected: "Chlorine Analyzers",
  fully_completion_scheme_status: "Completion Status",
  mjp_commissioned: "MJP Commissioned",
  mjp_fully_completed: "MJP Status",
  
  // Water scheme data
  village_name: "Village",
  population: "Population",
  number_of_esr: "ESR Count",
  water_value_day1: "Water Day 1 (m³)",
  water_value_day2: "Water Day 2 (m³)",
  water_value_day3: "Water Day 3 (m³)",
  water_value_day4: "Water Day 4 (m³)",
  water_value_day5: "Water Day 5 (m³)",
  water_value_day6: "Water Day 6 (m³)",
  water_value_day7: "Water Day 7 (m³)",
  lpcd_value_day1: "LPCD Day 1",
  lpcd_value_day2: "LPCD Day 2",
  lpcd_value_day3: "LPCD Day 3",
  lpcd_value_day4: "LPCD Day 4",
  lpcd_value_day5: "LPCD Day 5",
  lpcd_value_day6: "LPCD Day 6",
  lpcd_value_day7: "LPCD Day 7",
  water_date_day1: "Date Day 1",
  water_date_day2: "Date Day 2",
  water_date_day3: "Date Day 3",
  water_date_day4: "Date Day 4",
  water_date_day5: "Date Day 5",
  water_date_day6: "Date Day 6",
  water_date_day7: "Date Day 7",
  consistent_zero_lpcd_for_a_week: "Days with Zero LPCD",
  below_55_lpcd_count: "Days Below 55 LPCD",
  above_55_lpcd_count: "Days Above 55 LPCD",
  
  // Chlorine data
  esr_name: "ESR Name",
  chlorine_value_1: "Chlorine Day 1 (mg/L)",
  chlorine_value_2: "Chlorine Day 2 (mg/L)",
  chlorine_value_3: "Chlorine Day 3 (mg/L)",
  chlorine_value_4: "Chlorine Day 4 (mg/L)",
  chlorine_value_5: "Chlorine Day 5 (mg/L)",
  chlorine_value_6: "Chlorine Day 6 (mg/L)",
  chlorine_value_7: "Chlorine Day 7 (mg/L)",
  chlorine_date_day_1: "Chlorine Date 1",
  chlorine_date_day_2: "Chlorine Date 2",
  chlorine_date_day_3: "Chlorine Date 3",
  chlorine_date_day_4: "Chlorine Date 4",
  chlorine_date_day_5: "Chlorine Date 5",
  chlorine_date_day_6: "Chlorine Date 6",
  chlorine_date_day_7: "Chlorine Date 7",
  number_of_consistent_zero_value_in_chlorine: "Days with Zero Chlorine",
  chlorine_less_than_02_mgl: "Days Below 0.2 mg/L",
  chlorine_between_02_05_mgl: "Days at Optimal (0.2-0.5 mg/L)",
  chlorine_greater_than_05_mgl: "Days Above 0.5 mg/L",
  
  // Pressure data
  pressure_value_1: "Pressure Day 1 (bar)",
  pressure_value_2: "Pressure Day 2 (bar)",
  pressure_value_3: "Pressure Day 3 (bar)",
  pressure_value_4: "Pressure Day 4 (bar)",
  pressure_value_5: "Pressure Day 5 (bar)",
  pressure_value_6: "Pressure Day 6 (bar)",
  pressure_value_7: "Pressure Day 7 (bar)",
  pressure_date_day_1: "Pressure Date 1",
  pressure_date_day_2: "Pressure Date 2",
  pressure_date_day_3: "Pressure Date 3",
  pressure_date_day_4: "Pressure Date 4",
  pressure_date_day_5: "Pressure Date 5",
  pressure_date_day_6: "Pressure Date 6",
  pressure_date_day_7: "Pressure Date 7",
  number_of_consistent_zero_value_in_pressure: "Days with Zero Pressure",
  pressure_less_than_02_bar: "Days Below 0.2 bar",
  pressure_between_02_07_bar: "Days at Optimal (0.2-0.7 bar)",
  pressure_greater_than_07_bar: "Days Above 0.7 bar",
  
  // Water consumption
  flow_rate_m3: "Flow Rate (m³)",
  flow_meter_connected: "Flow Meter Status",
  online_status: "Online Status",
  esr_capacity: "ESR Capacity (m³)",
  consistent_zero_consumption: "Days with Zero Consumption",
  percentage_consumption_previous_day: "Consumption vs Previous Day (%)",
  
  // Helpdesk tickets
  ticket_id: "Ticket ID",
  title: "Title",
  description: "Description",
  category: "Category",
  specific_issue: "Issue Type",
  level: "Level",
  priority: "Priority",
  status: "Status",
  contact_name: "Contact Name",
  contact_phone: "Contact Phone",
  contact_email: "Contact Email",
  created_by: "Created By",
  created_at: "Created",
  updated_at: "Updated",
  
  // Communication status
  chlorine_connected: "Chlorine Connected",
  pressure_connected: "Pressure Connected",
  chlorine_status: "Chlorine Status",
  pressure_status: "Pressure Status",
  flow_meter_status: "Flow Meter Status",
  overall_status: "Overall Status",
  
  // Common aggregates
  count: "Count",
  avg: "Average",
  sum: "Total",
  min: "Minimum",
  max: "Maximum",
  avg_lpcd: "Average LPCD",
  total_flow_meters: "Total Flow Meters",
  total_pressure_transmitters: "Total Pressure Transmitters",
  total_chlorine_analyzers: "Total Chlorine Analyzers",
  optimal_chlorine_esrs: "ESRs with Optimal Chlorine",
};

/**
 * Convert database field name to human-friendly name
 */
function getHumanFriendlyFieldName(dbFieldName: string): string {
  // Check direct mapping first
  if (FIELD_NAME_MAP[dbFieldName]) {
    return FIELD_NAME_MAP[dbFieldName];
  }
  
  // Fallback: Convert snake_case to Title Case
  return dbFieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format SQL query results into human-friendly, conversational response
 * @param results - Raw database query results
 * @param query - Original user query for context
 * @returns Formatted, AI-like response text
 */
export function formatSQLResultsAsConversation(
  results: any[],
  query: string
): string {
  if (!results || results.length === 0) {
    return "I searched the database but couldn't find any matching data for your query.";
  }

  let response = "📊 Here's what I found:\n\n";

  // Single value result (like COUNT, SUM, AVG)
  if (results.length === 1 && Object.keys(results[0]).length === 1) {
    const dbKey = Object.keys(results[0])[0];
    const value = results[0][dbKey];
    const friendlyKey = getHumanFriendlyFieldName(dbKey);
    
    response = `📊 ${friendlyKey}: **${value}**`;
    return response;
  }

  // Single row with multiple fields
  if (results.length === 1) {
    const row = results[0];
    const entries = Object.entries(row).map(([dbKey, value]) => {
      const friendlyKey = getHumanFriendlyFieldName(dbKey);
      return `**${friendlyKey}:** ${value}`;
    });
    
    response += entries.join('\n');
    response += `\n\n📋 Total: **1** result.`;
    return response;
  }

  // Multiple rows - show as numbered list
  const maxDisplayRows = 20;
  const displayResults = results.slice(0, maxDisplayRows);

  displayResults.forEach((row: any, index: number) => {
    response += `**${index + 1}.** `;
    
    const entries = Object.entries(row).map(([dbKey, value]) => {
      const friendlyKey = getHumanFriendlyFieldName(dbKey);
      return `${friendlyKey}: ${value}`;
    });
    
    response += entries.join(', ');
    response += '\n';
  });

  // Add summary
  if (results.length > maxDisplayRows) {
    response += `\n📋 Showing first **${maxDisplayRows}** of **${results.length}** results.`;
  } else {
    response += `\n📋 Total: **${results.length}** results.`;
  }

  return response;
}

export default {
  getChatCompletion,
  generateSQLFromText,
  detectLanguage,
  translateText,
  formatSQLResultsAsConversation,
  getHumanFriendlyFieldName,
};
