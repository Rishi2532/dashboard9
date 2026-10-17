import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDispatches() {
  try {
    const res = await pool.query(`
      SELECT id, dispatch_date, sent_time, engineer_name, engineer_email, engineer_role, total_schemes, scheme_ids, total_alerts, status
      FROM consolidated_email_dispatches 
      WHERE dispatch_date = '2026-10-17'
      ORDER BY id ASC
    `);

    console.log(`Total dispatches on 2026-10-17: ${res.rows.length}`);

    const roleBreakdown: Record<string, number> = {};
    const timeBreakdown: Record<string, number> = {};
    
    for (const row of res.rows) {
      roleBreakdown[row.engineer_role] = (roleBreakdown[row.engineer_role] || 0) + 1;
      timeBreakdown[row.sent_time] = (timeBreakdown[row.sent_time] || 0) + 1;
    }

    console.log('\nBreakdown by Engineer Role:', roleBreakdown);
    console.log('\nBreakdown by Sent Time:', timeBreakdown);

    console.log('\nDetails of runs:');
    const runs: Record<string, { totalSchemes: number; count: number; sampleOfficers: string[] }> = {};
    for (const row of res.rows) {
      const key = `${row.sent_time} - ${row.engineer_role}`;
      if (!runs[key]) {
        runs[key] = { totalSchemes: 0, count: 0, sampleOfficers: [] };
      }
      runs[key].count++;
      runs[key].totalSchemes += (row.total_schemes || 1);
      if (runs[key].sampleOfficers.length < 3) {
        runs[key].sampleOfficers.push(`${row.engineer_name} (${row.total_schemes} schemes: ${JSON.stringify(row.scheme_ids)})`);
      }
    }
    console.table(runs);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDispatches();
