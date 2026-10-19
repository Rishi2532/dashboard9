import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables:', res.rows.map(r => r.table_name));
  await pool.end();
}

run().catch(console.error);
