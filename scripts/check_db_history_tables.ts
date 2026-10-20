import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkHistoryTables() {
  const db = await getDB();

  const tables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log('Tables in database:');
  const tableNames = tables.rows.map(r => r.table_name);
  console.log(tableNames.filter(t => t.includes('history') || t.includes('data') || t.includes('water') || t.includes('pressure') || t.includes('chlorine') || t.includes('alert')));

  // Check columns and row counts for any history table
  for (const t of ['water_scheme_data_history', 'chlorine_history', 'pressure_history', 'water_consumption_history', 'water_scheme_data', 'chlorine_data', 'pressure_data']) {
    if (tableNames.includes(t)) {
      const countRes = await db.execute(sql.raw(`SELECT count(*) as cnt FROM "${t}"`));
      const colsRes = await db.execute(sql.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${t}'
        ORDER BY ordinal_position
        LIMIT 15;
      `));
      console.log(`\nTable ${t} (Rows: ${countRes.rows[0].cnt}):`);
      console.log(colsRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    }
  }

  process.exit(0);
}

checkHistoryTables().catch(console.error);
