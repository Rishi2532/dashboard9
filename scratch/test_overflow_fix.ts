import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

async function testOverflow() {
  const sql_db = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql_db);
  
  try {
    console.log("Testing Excel date expansion with potentially overflowing value...");
    
    // Test with a value larger than 2^31 - 1 (approx 2.14B)
    const largeNumber = "3000000000"; // 3 Billion
    
    const query = sql`
      SELECT (TO_DATE('1899-12-30', 'YYYY-MM-DD') + (INTERVAL '1 day' * CAST(${largeNumber} AS NUMERIC)))::date as test_date
    `;
    
    const result = await db.execute(query);
    console.log("Result:", result.rows[0]);
    console.log("Success! No integer out of range error.");
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await sql_db.end();
  }
}

testOverflow();
