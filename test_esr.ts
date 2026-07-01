import { pool } from "./server/db-local";

async function testQuery() {
  try {
    const chlorineRes = await pool.query("SELECT * FROM chlorine_history WHERE scheme_id='20077212' AND esr_name='ESR-0.79 LL' LIMIT 20");
    console.log("Chlorine data for 20077212:");
    console.log(chlorineRes.rows.map(r => `${r.chlorine_date} = ${r.chlorine_value}`));

    const waterRes = await pool.query("SELECT * FROM water_consumption_history WHERE scheme_id='20077212' AND esr_name='ESR-0.79 LL'");
    console.log("Water data for 20077212:");
    console.log(waterRes.rows.map(r => `${r.data_date} = ${r.water_value}`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
testQuery();
