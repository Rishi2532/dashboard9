
    import { drizzle } from 'drizzle-orm/postgres-js';
    import postgres from 'postgres';
    import { sql } from 'drizzle-orm';
    import * as schema from './shared/schema';

    // Use environment variable or hardcoded string for testing
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/dashboard_db";
    const client = postgres(connectionString);
    const db = drizzle(client, { schema });

    async function checkDoubleCounting() {
      console.log('Checking for sensors that are "Offline" in communication_status but present in pressure_data...');

      const query = sql`
        SELECT 
          cs.region,
          cs.scheme_id,
          cs.village_name,
          cs.esr_name,
          cs.pressure_connected,
          cs.pressure_status,
          pd.pressure_value_7
        FROM communication_status cs
        JOIN pressure_data pd ON (
          cs.scheme_id = pd.scheme_id AND 
          cs.village_name = pd.village_name AND 
          cs.esr_name = pd.esr_name
        )
        WHERE cs.pressure_connected = 'Connected'
          AND cs.pressure_status = 'Offline'
          AND pd.pressure_value_7 IS NOT NULL
      `;

      const result = await db.execute(query);

      if (result.rows.length > 0) {
        console.log('--- FOUND DOUBLE COUNTED SENSORS ---');
        console.table(result.rows);
        console.log(`Total count: ${result.rows.length}`);
      } else {
        console.log('No double counted sensors found. Hypothesis rejected.');
      }
      
      process.exit(0);
    }

    checkDoubleCounting();
    
