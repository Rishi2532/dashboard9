import dotenv from 'dotenv';
dotenv.config();
import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function listCols() {
  const db = await getDB();
  const tables = ['email_acknowledgements', 'consolidated_email_dispatches'];
  for (const t of tables) {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${t}
    `);
    console.log(`Columns for ${t}:`, res.rows.map((r: any) => r.column_name).join(', '));
  }
  process.exit(0);
}
listCols().catch(console.error);
