
    import { drizzle } from 'drizzle-orm/postgres-js';
    import postgres from 'postgres';
    import { sql } from 'drizzle-orm';
    import * as schema from './shared/schema';

    // Correct connection string from .env
    const connectionString = "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard";
    const client = postgres(connectionString);
    const db = drizzle(client, { schema });

    async function verifyFix() {
      console.log('Verifying Pressure Count Fix...');

      // 1. Simulate the NEW Summary Query Logic (with joins and filters)
      const region = 'Amravati'; 

      const summaryQuery = sql`
       WITH pressure_analysis AS (
        SELECT 
          pd.region,
          pd.pressure_value_7
        FROM pressure_data pd
        INNER JOIN communication_status cs ON (
          pd.scheme_id = cs.scheme_id AND 
          pd.village_name = cs.village_name AND 
          pd.esr_name = cs.esr_name
        )
        WHERE pd.region = ${region}
        AND cs.pressure_connected = 'Connected' 
        AND cs.pressure_status <> 'Offline'
      ),
      offline_analysis AS (
        SELECT 
          cs.region,
          COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' AND cs.pressure_status = 'Offline' THEN cs.id END) as offline_count
        FROM communication_status cs
        WHERE cs.region = ${region}
        GROUP BY cs.region
      )
      SELECT 
        COALESCE(oa.offline_count, 0) as offline,
        COUNT(CASE WHEN pressure_value_7 < 0.2 THEN 1 END) as below_0_2,
        COUNT(CASE WHEN pressure_value_7 >= 0.2 AND pressure_value_7 <= 0.7 THEN 1 END) as optimal,
        COUNT(CASE WHEN pressure_value_7 > 0.7 THEN 1 END) as above_0_7,
        (SELECT COUNT(*) FROM pressure_analysis) as pressure_data_count
      FROM offline_analysis oa
      `;

      const summaryResult = await db.execute(summaryQuery);
      const row = summaryResult.rows[0];
      
      if (!row) {
          console.log(`No data found for region ${region}`);
          process.exit(0);
      }

      console.log('--- Summary Calculation (Simulated) ---');
      console.log(`Offline: ${row.offline}`);
      console.log(`Pressure Data Count (Online): ${row.pressure_data_count}`);
      
      // Calculate Total
      const summaryTotal = Number(row.offline) + Number(row.pressure_data_count);
      console.log(`Summary Total: ${summaryTotal}`);

      // 2. Simulate the List Query "Total" logic (all_sensors category)
      const listQuery = sql`
        SELECT COUNT(*) as count
        FROM communication_status cs
        LEFT JOIN pressure_data pd ON (
            cs.scheme_id = pd.scheme_id AND 
            cs.village_name = pd.village_name AND 
            cs.esr_name = pd.esr_name
        )
        WHERE cs.region = ${region}
        AND cs.pressure_connected = 'Connected'
        AND (cs.pressure_status = 'Offline' OR cs.pressure_status = 'offline' OR pd.pressure_value_7 IS NOT NULL)
      `;

      const listResult = await db.execute(listQuery);
      const listTotal = Number(listResult.rows[0].count);

      console.log('--- List Calculation (Simulated) ---');
      console.log(`List Total: ${listTotal}`);

      if (summaryTotal === listTotal) {
          console.log(`SUCCESS: Counts match! (${summaryTotal} vs ${listTotal})`);
      } else {
          console.log(`FAILURE: Counts still differ! (${summaryTotal} vs ${listTotal})`);
      }

      process.exit(0);
    }

    verifyFix().catch(err => {
        console.error(err);
        process.exit(1);
    });
    
