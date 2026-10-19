import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== INVESTIGATING 212 VILLAGES: CURRENT vs CONSISTENT ===\n');

      // Fetch what escalation-service generates for lpcd_villages
      const res = await fetch('http://localhost:5000/api/escalation/summary').then(r => r.json());
      const schemes = res.schemes || [];
      
      let totalLpcdVillages = 0;
      const streaks = [];

      schemes.forEach((s: any) => {
        (s.lpcd_villages || []).forEach((v: any) => {
          totalLpcdVillages++;
          streaks.push({
            scheme_id: s.scheme_id,
            scheme_name: s.scheme_name,
            village_name: v.village_name,
            days_count: v.days_count,
            avg_val: v.avg_val
          });
        });
      });

      console.log(`Total LPCD Villages in escalation portal: ${totalLpcdVillages}`);

      // Count streak ranges
      const streak1 = streaks.filter(s => s.days_count === 1).length;
      const streak2 = streaks.filter(s => s.days_count === 2).length;
      const streak3to6 = streaks.filter(s => s.days_count >= 3 && s.days_count < 7).length;
      const streak7plus = streaks.filter(s => s.days_count >= 7).length;
      const streak15plus = streaks.filter(s => s.days_count >= 15).length;

      console.log(`- Streak = 1 day (Current only, NEW breach): ${streak1} villages`);
      console.log(`- Streak = 2 days: ${streak2} villages`);
      console.log(`- Streak >= 3 days (Level 2 EE threshold): ${streaks.filter(s => s.days_count >= 3).length} villages`);
      console.log(`  * Streak 3 to 6 days: ${streak3to6} villages`);
      console.log(`- Streak >= 7 days (Chronic / Level 3 CE/SE threshold): ${streak7plus} villages`);
      console.log(`- Streak >= 15 days (Level 4/5 MS/PS threshold): ${streak15plus} villages`);

      // Now check lpcd_data table to see what is defined as "Consistent Below 55" in the main LPCD dashboard
      console.log('\n=== CHECKING lpcd_data / water_consumption IN DATABASE ===');
      try {
        const lpcdDef = await client.query(`
          SELECT 
            count(*) as total_rows,
            count(*) FILTER (WHERE lpcd_value_7 < 55) as current_below_55,
            count(*) FILTER (
              lpcd_value_1 < 55 AND lpcd_value_2 < 55 AND lpcd_value_3 < 55 AND 
              lpcd_value_4 < 55 AND lpcd_value_5 < 55 AND lpcd_value_6 < 55 AND lpcd_value_7 < 55
            ) as consistent_7days_below_55
          FROM lpcd_data
        `);
        console.log('lpcd_data metrics:', lpcdDef.rows[0]);
      } catch (e) {
        console.log('lpcd_data query error:', e.message);
      }

    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
