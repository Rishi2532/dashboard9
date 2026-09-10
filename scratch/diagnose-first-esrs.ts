import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';

async function diagnoseFirstESRs() {
  const db = await getDB();
  const dbRows = await db.execute(sql`
    SELECT 
      scheme_id, village_name, esr_name, dashboard_url
    FROM water_consumption_history
    WHERE lower(region) LIKE '%amravati%'
    ORDER BY circle, division, sub_division, block, scheme_id, village_name, esr_name
    LIMIT 10
  `);

  for (const row of dbRows.rows as any[]) {
    const match = row.dashboard_url ? row.dashboard_url.match(/asset=([^&]+)/) : null;
    const assetPath = match ? decodeURIComponent(match[1]) : '';
    console.log(`\n--------------------------------------------`);
    console.log(`ESR: ${row.scheme_id} - ${row.village_name} - ${row.esr_name}`);
    console.log(`Asset Path: ${assetPath}`);

    try {
      // Fetch the element
      const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(assetPath)}`);
      const elemWebId = elemRes?.data?.WebId;
      console.log(`Element WebId: ${elemWebId}`);

      if (elemWebId) {
        const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes`);
        const attrNames = attrsRes?.data?.Items?.map((a: any) => a.Name) || [];
        console.log(`Attributes (${attrNames.length}):`, attrNames.filter((n: string) => n.toLowerCase().includes('water') || n.toLowerCase().includes('calc') || n.toLowerCase().includes('flow')));
      }
    } catch (e: any) {
      console.error(`Error querying PI API:`, e.message);
    }
  }

  process.exit(0);
}

diagnoseFirstESRs();
