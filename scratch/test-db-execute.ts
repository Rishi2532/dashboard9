import { getDB } from "../server/db";
import { sql } from "drizzle-orm";

async function test() {
  const db = await getDB();
  const res = await db.execute(sql`SELECT 1 as test`);
  console.log("res:", res);
  console.log("res[0]:", (res as any)[0]);
  console.log("res.rows:", (res as any).rows);
  console.log("res.length:", (res as any).length);
  process.exit(0);
}

test();
