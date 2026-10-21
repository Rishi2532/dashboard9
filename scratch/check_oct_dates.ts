import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkOctoberDates() {
  const db = await getDB();
  
  const wDates = await db.execute(sql`
    SELECT DISTINCT data_date, COUNT(*) as cnt
    FROM water_scheme_data_history h
    JOIN scheme_status ss ON ss.scheme_id = h.scheme_id AND ss.water_supply = 'Yes'
    WHERE data_date ILIKE '%Oct%'
    GROUP BY data_date
    ORDER BY data_date;
  `);
  console.log("October water dates (operational schemes):", wDates.rows);

  const clDates = await db.execute(sql`
    SELECT DISTINCT chlorine_date, COUNT(*) as cnt
    FROM chlorine_history c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    WHERE chlorine_date ILIKE '%Oct%'
    GROUP BY chlorine_date
    ORDER BY chlorine_date;
  `);
  console.log("October chlorine dates (operational schemes):", clDates.rows);

  const prDates = await db.execute(sql`
    SELECT DISTINCT pressure_date, COUNT(*) as cnt
    FROM pressure_history p
    JOIN scheme_status ss ON ss.scheme_id = p.scheme_id AND ss.water_supply = 'Yes'
    WHERE pressure_date ILIKE '%Oct%'
    GROUP BY pressure_date
    ORDER BY pressure_date;
  `);
  console.log("October pressure dates (operational schemes):", prDates.rows);

  process.exit(0);
}

checkOctoberDates().catch(console.error);
