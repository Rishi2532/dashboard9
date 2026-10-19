import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  console.log('--- Date overview in chlorine_history ---');
  const chDates = await pool.query(`
    SELECT chlorine_date, count(*) as cnt, max(uploaded_at) as latest_upload
    FROM chlorine_history 
    GROUP BY chlorine_date 
    ORDER BY latest_upload DESC 
    LIMIT 15;
  `);
  console.log('Recent chlorine_history dates:', chDates.rows);

  console.log('\n--- Date overview in pressure_history ---');
  const phDates = await pool.query(`
    SELECT pressure_date, count(*) as cnt, max(uploaded_at) as latest_upload
    FROM pressure_history 
    GROUP BY pressure_date 
    ORDER BY latest_upload DESC 
    LIMIT 15;
  `);
  console.log('Recent pressure_history dates:', phDates.rows);

  console.log('\n--- Date overview in water_scheme_data_history ---');
  const wsDates = await pool.query(`
    SELECT data_date, count(*) as cnt, max(uploaded_at) as latest_upload
    FROM water_scheme_data_history 
    GROUP BY data_date 
    ORDER BY latest_upload DESC 
    LIMIT 15;
  `);
  console.log('Recent water_scheme_data_history dates:', wsDates.rows);

  console.log('\n--- Total rows in history tables ---');
  const totalCh = await pool.query(`SELECT COUNT(*) FROM chlorine_history`);
  const totalPh = await pool.query(`SELECT COUNT(*) FROM pressure_history`);
  const totalWs = await pool.query(`SELECT COUNT(*) FROM water_scheme_data_history`);
  console.log('Totals:', {
    chlorine_history: totalCh.rows[0].count,
    pressure_history: totalPh.rows[0].count,
    water_scheme_data_history: totalWs.rows[0].count,
  });

  await pool.end();
}

run().catch(console.error);
