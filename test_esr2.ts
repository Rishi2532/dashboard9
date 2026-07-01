import { pool } from "./server/db-local";

async function testQuery() {
  try {
    const chlorineRes = await pool.query("SELECT DISTINCT esr_name FROM chlorine_history WHERE scheme_id='20077212'");
    console.log("ESRs for 20077212 in chlorine_history:");
    console.log(chlorineRes.rows);

    const waterRes = await pool.query("SELECT DISTINCT esr_name FROM water_consumption_history WHERE scheme_id='20077212'");
    console.log("ESRs for 20077212 in water_consumption_history:");
    console.log(waterRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
testQuery();
