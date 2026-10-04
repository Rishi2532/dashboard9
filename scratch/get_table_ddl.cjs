const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jaljeevandb'
});

async function main() {
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = 'realtime_sensor_data'
    ORDER BY ordinal_position
  `);
  console.log('Columns:');
  console.table(cols.rows);

  const indexes = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'realtime_sensor_data'
  `);
  console.log('Indexes:');
  console.table(indexes.rows);

  await pool.end();
}

main().catch(console.error);
