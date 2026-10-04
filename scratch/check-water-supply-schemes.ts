import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkWaterSupplySchemes() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT scheme_id, scheme_name, water_supply 
      FROM scheme_status 
      WHERE water_supply = 'Yes' OR water_supply ILIKE 'yes%'
      LIMIT 10
    `);
    console.log(`Schemes with water_supply = 'Yes': ${res.rows.length}`);
    console.table(res.rows);

    const totalCount = await client.query(`SELECT COUNT(*)::int as total, COUNT(CASE WHEN water_supply = 'Yes' THEN 1 END)::int as yes_count FROM scheme_status`);
    console.log("Total schemes vs yes_count:", totalCount.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

checkWaterSupplySchemes().catch(console.error);
