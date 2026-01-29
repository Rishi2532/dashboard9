/**
 * NLP Service - Client-side
 * Provides functionality for parsing queries and extracting entities
 */

export interface ParsedQuery {
  keyword: string | null;
  scopeType: 'all' | 'region' | 'scheme';
  scopeValue: any;
  confidenceScore: number;
  detectedEntities: {
    region: { value: string; confidence: number } | null;
    scheme: { value: any; confidence: number } | null;
    keywordConfidence: number;
  };
}

/**
 * Parse a natural language query to extract keyword, scope, and entities
 */
export async function parseQuery(query: string, regions: any[], schemes: any[]): Promise<ParsedQuery> {
  try {
    const response = await fetch('/api/nlp-chatbot/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error('Failed to parse query');
    }

    const data = await response.json();
    
    return {
      keyword: data.keyword,
      scopeType: data.scope_type,
      scopeValue: data.scope_value,
      confidenceScore: data.confidence_score,
      detectedEntities: {
        region: data.detected_entities?.region || null,
        scheme: data.detected_entities?.scheme || null,
        keywordConfidence: data.detected_entities?.keyword_confidence || 0
      }
    };
  } catch (error) {
    console.error('Error parsing query:', error);
    return {
      keyword: null,
      scopeType: 'all',
      scopeValue: null,
      confidenceScore: 0,
      detectedEntities: {
        region: null,
        scheme: null,
        keywordConfidence: 0
      }
    };
  }
}

/**
 * Fetch available data for parsing (regions and schemes)
 */
export async function fetchDataForParsing(): Promise<{ regions: any[]; schemes: any[] }> {
  try {
    const [regionsResponse, schemesResponse] = await Promise.all([
      fetch('/api/regions'),
      fetch('/api/schemes')
    ]);

    const regions = regionsResponse.ok ? await regionsResponse.json() : [];
    const schemes = schemesResponse.ok ? await schemesResponse.json() : [];

    return { regions, schemes };
  } catch (error) {
    console.error('Error fetching data for parsing:', error);
    return { regions: [], schemes: [] };
  }
}

/**
 * Query chatbot for categorized data
 */
export async function queryChatbotData(query: string): Promise<any> {
  try {
    const response = await fetch('/api/nlp-chatbot/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to query data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying chatbot data:', error);
    throw error;
  }
}