import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const client = await pool.connect();
  try {
    const regions = ['Nagpur', 'Chhatrapati Sambhajinagar', 'Konkan', 'Nashik', 'Pune'];
    
    for (const region of regions) {
      console.log(`\n--- Region: ${region} ---`);
      
      // 1. Count what's in the frontend summary calculation
      const offlineRes = await client.query(`
        SELECT COUNT(*) as count 
        FROM communication_status cs
        LEFT JOIN chlorine_data cd ON (cs.scheme_id = cd.scheme_id AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name)
        WHERE cs.region = $1 
        AND cs.chlorine_connected = 'Connected'
        AND (
          (cs.chlorine_status = 'Offline' OR cs.chlorine_status = 'offline')
          OR
          ((cs.chlorine_status = 'Online' OR cs.chlorine_status = 'online') AND cd.chlorine_value_7 IS NULL)
        )
      `, [region]);
      
      const rangesRes = await client.query(`
        SELECT COUNT(*) as count
        FROM chlorine_data cd
        WHERE cd.region = $1 AND cd.chlorine_value_7 IS NOT NULL
      `, [region]);
      
      const expectedTotal = parseInt(offlineRes.rows[0].count) + parseInt(rangesRes.rows[0].count);
      console.log(`Summary Total (Offline/NoData + Valid Readings): ${expectedTotal}`);
      
      // 2. Count what the detailed route outputs
      const detailRes = await client.query(`
        SELECT COUNT(*) as count
        FROM communication_status cs
        FULL OUTER JOIN chlorine_data cd ON cs.scheme_id = cd.scheme_id AND cs.scheme_name = cd.scheme_name AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name
        WHERE COALESCE(cs.region, cd.region) = $1 
        AND (cs.chlorine_connected = 'Connected' OR cd.chlorine_value_7 IS NOT NULL)
      `, [region]);
      
      console.log(`Detail List all_sensors count: ${detailRes.rows[0].count}`);
      
      if (expectedTotal !== parseInt(detailRes.rows[0].count)) {
        console.log('MISMATCH!');
        
        // Find which sensors are pushing up the rangesCount but missing in cs
        const missingInCs = await client.query(`
          SELECT cd.scheme_id, cd.village_name, cd.esr_name
          FROM chlorine_data cd
          LEFT JOIN communication_status cs ON cs.scheme_id = cd.scheme_id AND cs.village_name = cd.village_name AND cs.esr_name = cd.esr_name
          WHERE cd.region = $1 AND cd.chlorine_value_7 IS NOT NULL
          AND (cs.chlorine_connected IS NULL OR cs.chlorine_connected != 'Connected')
        `, [region]);
        
        if (missingInCs.rows.length > 0) {
          console.log(`Found ${missingInCs.rows.length} rows in chlorine_data with valid readings but NOT connected in communication_status.`);
        }
      }
      
      // 3. Consistent counts
      const consRangesRes = await client.query(`
        SELECT COUNT(*) as count
        FROM chlorine_data cd
        WHERE cd.region = $1 AND (
          (
                cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 < 0.2
                AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 < 0.2
                AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 < 0.2
                AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 < 0.2
                AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 < 0.2
                AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 < 0.2
                AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 < 0.2
              )
              OR
              (
                cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 >= 0.2 AND cd.chlorine_value_1 <= 0.5
                AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 >= 0.2 AND cd.chlorine_value_2 <= 0.5
                AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 >= 0.2 AND cd.chlorine_value_3 <= 0.5
                AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 >= 0.2 AND cd.chlorine_value_4 <= 0.5
                AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 >= 0.2 AND cd.chlorine_value_5 <= 0.5
                AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 >= 0.2 AND cd.chlorine_value_6 <= 0.5
                AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5
              )
              OR
              (
                cd.chlorine_value_1 IS NOT NULL AND cd.chlorine_value_1 > 0.5
                AND cd.chlorine_value_2 IS NOT NULL AND cd.chlorine_value_2 > 0.5
                AND cd.chlorine_value_3 IS NOT NULL AND cd.chlorine_value_3 > 0.5
                AND cd.chlorine_value_4 IS NOT NULL AND cd.chlorine_value_4 > 0.5
                AND cd.chlorine_value_5 IS NOT NULL AND cd.chlorine_value_5 > 0.5
                AND cd.chlorine_value_6 IS NOT NULL AND cd.chlorine_value_6 > 0.5
                AND cd.chlorine_value_7 IS NOT NULL AND cd.chlorine_value_7 > 0.5
              )
        )
      `, [region]);
      
      console.log(`Summary 7-Day Consistent: ${consRangesRes.rows[0].count}`);
    }
  } finally {
    client.release();
    pool.end();
  }
}
check();
