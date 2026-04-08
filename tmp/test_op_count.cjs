
const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    
    // Total Instrumented (Fully Completed)
    const resTotal = await client.query(\`
      SELECT COUNT(DISTINCT scheme_id) as count 
      FROM scheme_status 
      WHERE fully_completion_scheme_status = 'Fully Completed'
    \`);
    console.log('Total Instrumented Schemes:', resTotal.rows[0].count);

    // Operational Instrumented (Fully Completed + water_supply = 'Yes')
    const resOp = await client.query(\`
      SELECT COUNT(DISTINCT scheme_id) as count 
      FROM scheme_status 
      WHERE fully_completion_scheme_status = 'Fully Completed'
      AND water_supply = 'Yes'
    \`);
    console.log('Operational Instrumented (Fully Completed + Water Supply Yes):', resOp.rows[0].count);

    // Check with 'fully-completed' as well (case sensitivity)
    const resOpDetailed = await client.query(\`
      SELECT COUNT(DISTINCT scheme_id) as count 
      FROM scheme_status 
      WHERE (LOWER(fully_completion_scheme_status) IN ('fully completed', 'fully-completed', 'completed'))
      AND water_supply = 'Yes'
    \`);
    console.log('Operational (Broad Completed + Water Supply Yes):', resOpDetailed.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
