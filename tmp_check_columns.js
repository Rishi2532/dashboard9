const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkColumns() {
  const query = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'water_scheme_data_history'
    ORDER BY ordinal_position;
  `;

  const result = await pool.query(query);
  console.log('Columns in water_scheme_data_history:');
  console.log(result.rows.map(r => r.column_name).join(', '));
}

checkColumns().catch(console.error).finally(() => pool.end());
