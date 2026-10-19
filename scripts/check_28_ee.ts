import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== BREAKDOWN OF ALL 28 EE DISPATCHES IN consolidated_email_dispatches ===');
      const res = await client.query(`
        SELECT 
          dispatch_date::date as date,
          count(*) as dispatch_count,
          sum(jsonb_array_length(scheme_ids)) as total_schemes,
          count(*) FILTER (WHERE lpcd_alerts_count > 0) as lpcd_dispatches,
          count(*) FILTER (WHERE chlorine_alerts_count > 0) as chlorine_dispatches,
          count(*) FILTER (WHERE pressure_alerts_count > 0) as pressure_dispatches,
          count(*) FILTER (WHERE offline_alerts_count > 0) as offline_dispatches
        FROM consolidated_email_dispatches
        WHERE engineer_role ILIKE '%EE%' OR engineer_role ILIKE '%Executive%'
        GROUP BY dispatch_date::date
        ORDER BY dispatch_date::date DESC
      `);
      console.log(res.rows);

      console.log('\n--- ALL 28 RECORDS ---');
      const allRes = await client.query(`
        SELECT 
          id,
          dispatch_date::date as date,
          engineer_name,
          engineer_email,
          scheme_names,
          scheme_ids,
          lpcd_alerts_count,
          chlorine_alerts_count,
          pressure_alerts_count,
          offline_alerts_count,
          total_alerts
        FROM consolidated_email_dispatches
        WHERE engineer_role ILIKE '%EE%' OR engineer_role ILIKE '%Executive%'
        ORDER BY dispatch_date::date DESC, engineer_name ASC
      `);
      allRes.rows.forEach((r, i) => {
        console.log(`${i+1}. [${r.date.toISOString().slice(0,10)}] ${r.engineer_name} | Schemes: ${JSON.stringify(r.scheme_names)} | LPCD=${r.lpcd_alerts_count}, Cl=${r.chlorine_alerts_count}, Pr=${r.pressure_alerts_count}, Off=${r.offline_alerts_count}`);
      });

    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
