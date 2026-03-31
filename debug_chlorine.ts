import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const region = 'Amravati';
  
  // FIXED Aggregate Logic
  const offlineQuery = `
          SELECT COUNT(*) as count 
          FROM communication_status cs
          LEFT JOIN chlorine_data cd ON (cs.scheme_id = cd.scheme_id AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name)
          WHERE cs.region = $1 
          AND cs.chlorine_connected = 'Connected'
          AND (
            (cs.chlorine_status IN ('Offline', 'offline', 'Online', 'online') AND cd.chlorine_value_7 IS NULL)
          )
  `;
  const offlineRes = await pool.query(offlineQuery, [region]);
  const offlineCount = parseInt(offlineRes.rows[0].count);

  const chlorineQuery = `
          SELECT 
            SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 < 0.2 THEN 1 ELSE 0 END) as below_0_2,
            SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5 THEN 1 ELSE 0 END) as optimal_0_2_0_5,
            SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 > 0.5 THEN 1 ELSE 0 END) as above_0_5
          FROM chlorine_data
          WHERE region = $1
  `;
  const chlorineRes = await pool.query(chlorineQuery, [region]);
  const below = parseInt(chlorineRes.rows[0].below_0_2 || '0');
  const optimal = parseInt(chlorineRes.rows[0].optimal_0_2_0_5 || '0');
  const above = parseInt(chlorineRes.rows[0].above_0_5 || '0');

  const aggregateTotal = offlineCount + below + optimal + above;

  console.log(`NEW Aggregate Total: ${aggregateTotal} (Offline: ${offlineCount}, Below: ${below}, Optimal: ${optimal}, Above: ${above})`);

  pool.end();
}

main().catch(console.error);
