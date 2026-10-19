import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  console.log('--- Inspecting chlorine_history ---');
  const chCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'chlorine_history' 
    ORDER BY ordinal_position;
  `);
  console.log('chlorine_history cols:', chCols.rows.map(r => `${r.column_name} (${r.data_type})`));
  const chSample = await pool.query(`SELECT * FROM chlorine_history LIMIT 3;`);
  console.log('chlorine_history sample:', chSample.rows);

  console.log('\n--- Inspecting pressure_history ---');
  const phCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'pressure_history' 
    ORDER BY ordinal_position;
  `);
  console.log('pressure_history cols:', phCols.rows.map(r => `${r.column_name} (${r.data_type})`));
  const phSample = await pool.query(`SELECT * FROM pressure_history LIMIT 3;`);
  console.log('pressure_history sample:', phSample.rows);

  console.log('\n--- Inspecting water_scheme_data_history ---');
  const wsCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'water_scheme_data_history' 
    ORDER BY ordinal_position;
  `);
  console.log('water_scheme_data_history cols:', wsCols.rows.map(r => `${r.column_name} (${r.data_type})`));
  const wsSample = await pool.query(`SELECT * FROM water_scheme_data_history LIMIT 3;`);
  console.log('water_scheme_data_history sample:', wsSample.rows);

  await pool.end();
}

run().catch(console.error);
