import axios from 'axios';
import https from 'https';
import { format, subDays } from 'date-fns';

// PI Web API Configuration
const PI_BASE_URL = process.env.PI_WEB_API_URL || 'https://192.168.1.6/piwebapi';
const PI_USERNAME = process.env.PI_WEB_API_USERNAME || '.\\piadmin';
const PI_PASSWORD = process.env.PI_WEB_API_PASSWORD || 'JJM@123';

// Setup axios instance to ignore self-signed certificates and handle basic auth
const piClient = axios.create({
  baseURL: PI_BASE_URL,
  auth: {
    username: PI_USERNAME,
    password: PI_PASSWORD,
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, 
    keepAlive: true, 
    maxSockets: 50, 
    maxFreeSockets: 10 
  }),
});

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await piClient.get(url, { timeout: 30000 });
    } catch (error: any) {
      if (error.response && error.response.status === 501) throw error;
      if (i === retries - 1) throw error;
      console.warn(`PI API request to ${url.split('?')[0]} failed (${error.code || error.message}). Retrying in ${2000 * (i + 1)}ms...`);
      await new Promise(res => setTimeout(res, 2000 * (i + 1)));
    }
  }
}

export interface PIElement {
  WebId: string;
  Name: string;
  Path: string;
  TemplateName?: string;
  HasChildren: boolean;
}

/**
 * Helper to extract hierarchy from a PI Path
 * Path example: \\DemoAF\JJM\JJM\Maharashtra\Region-Amravati\Circle-Akola\Division-Akola\Sub Division-Akola\Block-Akola\Scheme-20027951 - Khambora...\Akhatwada\Existing 0.20 LL ESR
 */
export function extractHierarchyFromPath(path: string) {
  const parts = path.split('\\');
  // parts[0] = "", parts[1] = "", parts[2] = "DemoAF" (server)
  // parts[3] = "JJM" (database)
  // parts[4] = "JJM" (root element)
  // parts[5] = "Maharashtra" (state)
  
  const extractValue = (part: string) => {
    if (!part) return '';
    const dashIndex = part.indexOf('-');
    return dashIndex > -1 ? part.substring(dashIndex + 1).trim() : part.trim();
  };

  const schemePart = parts[11] || '';
  const schemeMatch = schemePart.match(/Scheme-(.*?)\s*-\s*(.*)/);
  const schemeId = schemeMatch ? schemeMatch[1].trim() : '';
  const schemeName = schemeMatch ? schemeMatch[2].trim() : schemePart;

  return {
    region: extractValue(parts[6]),
    circle: extractValue(parts[7]),
    division: extractValue(parts[8]),
    sub_division: extractValue(parts[9]),
    block: extractValue(parts[10] || ''), 
    scheme_id: schemeId,
    scheme_name: schemeName,
    village_name: parts[12] ? parts[12].trim() : '',
    esr_name: parts[13] ? parts[13].trim() : '',
  };
}

/**
 * Wait function for delaying requests
 */


/**
 * Crawls the PI AF Hierarchy starting from a given path (e.g., \\DemoAF\JJM\JJM\Maharashtra)
 * Finds all elements matching the given template name.
 */
export async function findElementsByTemplate(startPath: string, targetTemplate: string): Promise<PIElement[]> {
  const results: PIElement[] = [];
  
  // Get initial element
  try {
    const rootRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(startPath)}`);
    await traverseElement(rootRes.data, targetTemplate, results);
    return results;
  } catch (error) {
    console.error('Error starting PI hierarchy crawl:', error);
    throw error;
  }
}

async function traverseElement(element: PIElement, targetTemplate: string, results: PIElement[]) {
  if (element.TemplateName === targetTemplate) {
    results.push(element);
  }

  if (element.HasChildren) {
    try {
      // Get children
      const childrenRes = await fetchWithRetry(`/elements/${element.WebId}/elements?maxCount=100000`);
      const children: PIElement[] = childrenRes.data.Items || [];
      
      // Process children in batches to avoid overwhelming the PI server or node
      for (const child of children) {
        await traverseElement(child, targetTemplate, results);
        // await delay(10); // slight delay to prevent rate limiting if tree is huge
      }
    } catch (error) {
      console.error(`Error traversing element ${element.Name}:`, error);
    }
  }
}

/**
 * Finds all active ESRs in the system.
 * We can optionally restrict to a specific Region path to limit the crawl scope.
 */
export async function getAllESRs(rootPath: string = '\\\\DemoAF\\JJM\\JJM\\Maharashtra'): Promise<PIElement[]> {
  console.log(`Starting crawl for ESRs at path: ${rootPath}...`);
  return findElementsByTemplate(rootPath, 'MJP Reservoir Level - Active');
}

/**
 * Gets historical interpolated data for an attribute over the last N days.
 */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
export async function getAttributeInterpolatedData(elementWebId: string, attributeName: string, days: number = 7) {
  try {
    // First find the attribute WebId by name
    const attrsRes = await fetchWithRetry(`/elements/${elementWebId}/attributes?nameFilter=${encodeURIComponent(attributeName)}`);
    const items = attrsRes.data.Items;
    if (!items || items.length === 0) {
      return null;
    }
    
    const attrWebId = items[0].WebId;
    
    // Get interpolated data for the last 7 days, 1 value per day
    // PI Web API format: startTime=*-7d, endTime=*, interval=1d
    const dataRes = await fetchWithRetry(`/streams/${attrWebId}/interpolated?startTime=*-${days}d&endTime=*&interval=1d`);
    
    return dataRes.data.Items || [];
  } catch (error) {
    console.error(`Error fetching interpolated data for ${attributeName}:`, error);
    return null;
  }
}

/**
 * Gets historical summary data for an attribute over the last N days.
 * summaryType can be Maximum, Minimum, Average, etc.
 */
export async function getAttributeSummaryData(elementWebId: string, attributeName: string, days: number = 7, summaryType: string = 'Maximum') {
  try {
    // First find the attribute WebId by name
    const attrsRes = await fetchWithRetry(`/elements/${elementWebId}/attributes?nameFilter=${encodeURIComponent(attributeName)}`);
    const items = attrsRes.data.Items;
    if (!items || items.length === 0) {
      return null;
    }
    
    const attrWebId = items[0].WebId;
    
    // Explicitly format dynamic dates, e.g. "2026-06-05" and "2026-06-12"
    const today = new Date();
    const stTime = format(subDays(today, days), 'yyyy-MM-dd');
    const edTime = format(today, 'yyyy-MM-dd');

    const dataRes = await fetchWithRetry(`/streams/${attrWebId}/summary?startTime=${stTime}&endTime=${edTime}&summaryType=${summaryType}&summaryDuration=1d`);
    
    return dataRes.data.Items || [];
  } catch (error) {
    console.error(`Error fetching summary data for ${attributeName}:`, error);
    return null;
  }
}

/**
 * Fetches exactly the recorded events in the specified time range.
 * This prevents carrying over previous values (step interpolation) for days that have no new data.
 */
export async function getAttributeRecordedData(
  webId: string,
  attributeName: string,
  startTime: string = 't-7d',
  endTime: string = 't%2B1d'
) {
  try {
    const searchRes = await fetchWithRetry(
      `/elements/${webId}/attributes?nameFilter=${encodeURIComponent(attributeName)}`
    );
    const items = searchRes.data.Items;
    if (!items || items.length === 0) {
      return null;
    }
    
    const attrWebId = items[0].WebId;
    const dataRes = await fetchWithRetry(`/streams/${attrWebId}/recorded?startTime=${startTime}&endTime=${endTime}`);
    
    return dataRes.data.Items || [];
  } catch (error) {
    console.error(`Error fetching recorded data for ${attributeName}:`, error);
    return null;
  }
}



/**
 * Gets a specific attribute's current value by Element WebId
 */
export async function getAttributeValue(elementWebId: string, attributeName: string) {
  try {
    const attrsRes = await fetchWithRetry(`/elements/${elementWebId}/attributes?nameFilter=${encodeURIComponent(attributeName)}`);
    const items = attrsRes.data.Items;
    if (!items || items.length === 0) {
      return null;
    }
    
    const valueLink = items[0].Links.Value;
    const dataRes = await fetchWithRetry(valueLink);
    return dataRes.data.Value;
  } catch (error) {
    console.error(`Error fetching value for ${attributeName}:`, error);
    return null;
  }
}

