import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const region = 'Amravati';
  
  // Aggregate Logic FIXED
  const aggQuery = `
      WITH pressure_analysis AS (
        SELECT DISTINCT ON (cs.scheme_id, cs.village_name, cs.esr_name)
          cs.region,
          CASE 
            WHEN pd.pressure_value_7 < 0.2 THEN 'below_0_2'
            WHEN pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7 THEN 'optimal_0_2_0_7'
            WHEN pd.pressure_value_7 > 0.7 THEN 'above_0_7'
            ELSE 'no_data'
          END as pressure_category
        FROM communication_status cs
        LEFT JOIN pressure_data pd ON (
          pd.scheme_id = cs.scheme_id AND 
          pd.village_name = cs.village_name AND 
          pd.esr_name = cs.esr_name
        )
        WHERE cs.region = $1 
        AND cs.pressure_connected = 'Connected' 
        AND cs.pressure_status <> 'Offline'
      ),
      offline_analysis AS (
        SELECT 
          cs.region,
          COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' AND cs.pressure_status = 'Offline' THEN cs.id END) as offline_count
        FROM communication_status cs
        WHERE cs.region = $1
        GROUP BY cs.region
      )
      SELECT 
        pa.region,
        COALESCE(oa.offline_count, 0) + COUNT(CASE WHEN pressure_category = 'no_data' THEN 1 END) as offline
      FROM pressure_analysis pa
      LEFT JOIN offline_analysis oa ON pa.region = oa.region
      GROUP BY pa.region, oa.offline_count
  `;
  const aggRes = await pool.query(aggQuery, [region]);
  const aggCount = aggRes.rows[0]?.offline || 0;

  console.log(`FIXED Aggregate Offline Count for Amravati: ${aggCount}`);

  pool.end();
}

main().catch(console.error);
