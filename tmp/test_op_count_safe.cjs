
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    // Total Instrumented (Fully Completed)
    const q1 = "SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status WHERE fully_completion_scheme_status = 'Fully Completed'";
    const resTotal = await client.query(q1);
    console.log('Total Instrumented Schemes:', resTotal.rows[0].count);

    // Operational Instrumented (Fully Completed + water_supply = 'Yes')
    const q2 = "SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status WHERE fully_completion_scheme_status = 'Fully Completed' AND water_supply = 'Yes'";
    const resOp = await client.query(q2);
    console.log('Operational Instrumented (Fully Completed + Water Supply Yes):', resOp.rows[0].count);

    // Check with 'fully-completed' as well (case sensitivity)
    const q3 = "SELECT COUNT(DISTINCT scheme_id) as count FROM scheme_status WHERE (LOWER(fully_completion_scheme_status) IN ('fully completed', 'fully-completed', 'completed')) AND water_supply = 'Yes'";
    const resOpDetailed = await client.query(q3);
    console.log('Operational (Broad Completed + Water Supply Yes):', resOpDetailed.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
