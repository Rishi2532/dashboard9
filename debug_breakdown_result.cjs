
require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();

    const regionName = "Chhatrapati Sambhajinagar";
    console.log(`Running query for: '${regionName}'`);

    const isChhatrapati = regionName.toLowerCase().includes('chhatrapati');
    
    // Simulate the logic in storage.ts
    // If Chhatrapati -> use explicit OR
    // Else -> use %LIKE%
    
    let whereClause;
    if (isChhatrapati) {
        whereClause = "(cs.region ILIKE '%Chhatrapati%' OR cs.region ILIKE 'Aurangabad%')";
    } else {
        whereClause = "cs.region ILIKE $1";
    }

    const query = `
      WITH 
        offline_sensors AS (
          SELECT
            CASE 
              WHEN cs.pressure_status = 'Offline' AND cs.pressure_last_seen IS NOT NULL 
              THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.pressure_last_seen))::integer
              ELSE 0
            END as offline_days,
            count(*) as count
          FROM communication_status cs
          WHERE cs.pressure_connected = 'Connected'
            AND ${whereClause}
          GROUP BY 1
        )
      SELECT * FROM offline_sensors WHERE offline_days > 0 ORDER BY offline_days LIMIT 20
    `;
    
    // If not Chhatrapati, we need $1 param. 
    // Since we are simulating Chhatrapati heavily, I'll allow $1 to be present but unused in string if query doesn't use it.
    // Actually pg might complain if $1 is unused? No, pg doesn't care if strict? 
    // If query string has no $1, we can pass [] or ignore.
    
    const params = isChhatrapati ? [] : ['%' + regionName + '%'];

    const res = await client.query(query, params);
    console.log("Query Results (Offline Days):");
    console.table(res.rows);

  } catch (err) { console.error(err); } 
  finally { await client.end(); }
}
run();
