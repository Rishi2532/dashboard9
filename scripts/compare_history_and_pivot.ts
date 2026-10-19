import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  console.log('--- Checking sample record in chlorine_data vs chlorine_history ---');
  const cdSample = await pool.query(`
    SELECT scheme_id, village_name, esr_name, 
           chlorine_value_7, chlorine_date_day_7,
           chlorine_value_6, chlorine_date_day_6,
           chlorine_value_5, chlorine_date_day_5,
           chlorine_value_4, chlorine_date_day_4,
           chlorine_value_3, chlorine_date_day_3,
           chlorine_value_2, chlorine_date_day_2,
           chlorine_value_1, chlorine_date_day_1
    FROM chlorine_data
    WHERE chlorine_value_7 IS NOT NULL AND chlorine_value_7::numeric < 0.2
    LIMIT 3;
  `);
  console.log('chlorine_data sample:', cdSample.rows);

  if (cdSample.rows.length > 0) {
    const s = cdSample.rows[0];
    const chRows = await pool.query(`
      SELECT chlorine_date, chlorine_value, uploaded_at
      FROM chlorine_history
      WHERE scheme_id = $1 AND LOWER(TRIM(village_name)) = LOWER(TRIM($2)) AND LOWER(TRIM(esr_name)) = LOWER(TRIM($3))
      ORDER BY uploaded_at DESC, id DESC
      LIMIT 15;
    `, [s.scheme_id, s.village_name, s.esr_name]);
    console.log(`chlorine_history for scheme ${s.scheme_id}, ${s.village_name}, ${s.esr_name}:`, chRows.rows);
  }

  await pool.end();
}

run().catch(console.error);
