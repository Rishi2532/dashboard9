import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const countHistory = await client.query(`SELECT COUNT(DISTINCT scheme_id) as cnt FROM water_scheme_data_history`);
  console.log("Distinct scheme_ids in water_scheme_data_history:", countHistory.rows[0].cnt);

  const countStatus = await client.query(`SELECT COUNT(*) as cnt FROM scheme_status`);
  console.log("Total schemes in scheme_status:", countStatus.rows[0].cnt);

  const regions = ['Amravati', 'Chhatrapati Sambhajinagar', 'Konkan', 'Nagpur', 'Nashik', 'Pune'];
  const startIso = '2026-04-01T00:00:00.000Z';
  const nextIso = '2026-05-01T00:00:00.000Z';

  for (const rn of regions) {
    let endRowRes = await client.query(
      `SELECT region_name, data_month, uploaded_at, total_esr_integrated, total_villages_integrated, total_schemes_integrated 
       FROM region_history 
       WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz 
       ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
      [rn, nextIso]
    );
    const endRow = endRowRes.rows[0];

    let startRowRes = await client.query(
      `SELECT region_name, data_month, uploaded_at, total_esr_integrated, total_villages_integrated, total_schemes_integrated 
       FROM region_history 
       WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz 
       ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
      [rn, startIso]
    );
    const startRow = startRowRes.rows[0];

    console.log(`Region: ${rn}`);
    console.log("  endRow:", endRow ? { data_month: endRow.data_month, uploaded_at: endRow.uploaded_at, esr: endRow.total_esr_integrated } : "null");
    console.log("  startRow:", startRow ? { data_month: startRow.data_month, uploaded_at: startRow.uploaded_at, esr: startRow.total_esr_integrated } : "null");
    if (endRow && startRow) {
      console.log(`  Diff ESRs: ${endRow.total_esr_integrated - startRow.total_esr_integrated}`);
    }
  }

  const rn = 'Pune';
  const startIso = '2026-04-01T00:00:00.000Z';
  const nextIso = '2026-05-01T00:00:00.000Z';

  let endRowRes = await client.query(
    `SELECT region_name, data_month, uploaded_at, total_esr_integrated, total_villages_integrated, fully_completed_villages, rca_integrated 
     FROM region_history 
     WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz 
     ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
    [rn, nextIso]
  );
  console.log("endRow (Pune):", endRowRes.rows[0]);

  let startRowRes = await client.query(
    `SELECT region_name, data_month, uploaded_at, total_esr_integrated, total_villages_integrated, fully_completed_villages, rca_integrated 
     FROM region_history 
     WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz 
     ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
    [rn, startIso]
  );
  console.log("startRow (Pune):", startRowRes.rows[0]);

  await client.end();
}

main().catch(console.error);
