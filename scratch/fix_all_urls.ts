
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { generateVillageDashboardUrl, generateDashboardUrl, generateEsrDashboardUrl } from './server/auto-generate-dashboard-urls';

dotenv.config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('Regenerating water_scheme_data links...');
    const villages = await client.query('SELECT * FROM water_scheme_data');
    for (const v of villages.rows) {
      const url = generateVillageDashboardUrl(v);
      if (url) {
        await client.query('UPDATE water_scheme_data SET dashboard_url = $1 WHERE scheme_id = $2 AND village_name = $3 AND block = $4', [url, v.scheme_id, v.village_name, v.block]);
      }
    }
    console.log(`Updated ${villages.rows.length} villages.`);

    console.log('Regenerating scheme_status links...');
    const schemes = await client.query('SELECT * FROM scheme_status');
    for (const s of schemes.rows) {
      const url = generateDashboardUrl(s);
      if (url) {
        await client.query('UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3', [url, s.scheme_id, s.block]);
      }
    }
    console.log(`Updated ${schemes.rows.length} schemes.`);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
