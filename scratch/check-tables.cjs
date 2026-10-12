const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log("All tables in public schema:");
  console.log(tables.rows.map(r => r.table_name));

  const alertTables = tables.rows.filter(r => r.table_name.includes('alert') || r.table_name.includes('sms') || r.table_name.includes('email') || r.table_name.includes('escalat') || r.table_name.includes('dispatch'));
  console.log("\nMatching tables:");
  console.log(alertTables.map(r => r.table_name));

  for (const t of alertTables) {
    try {
      const cnt = await client.query(`SELECT COUNT(*) FROM "${t.table_name}"`);
      console.log(`Table ${t.table_name}: ${cnt.rows[0].count} rows`);
    } catch (e) {
      console.log(`Table ${t.table_name} error:`, e.message);
    }
  }

  await client.end();
}

main().catch(console.error);
