
const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const query = `
    SELECT COUNT(DISTINCT scheme_id) as count
    FROM scheme_status
    WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'connected', 'in progress')
    AND TRIM(LOWER(water_supply)) = 'yes'
  `;
  
  const res = await client.query(query);
  console.log('Strict 100% Civil Work Completed Schemes:', res.rows[0].count);
  
  const queryOld = `
    SELECT COUNT(DISTINCT scheme_id) as count
    FROM scheme_status
    WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'connected', 'in progress')
    AND TRIM(LOWER(water_supply)) = 'yes'
  `;
  const resOld = await client.query(queryOld);
  console.log('Old (including "completed") Schemes with water_supply yes:', resOld.rows[0].count);

  const queryOldNoWater = `
    SELECT COUNT(DISTINCT scheme_id) as count
    FROM scheme_status
    WHERE TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'connected', 'in progress')
  `;
  const resOldNoWater = await client.query(queryOldNoWater);
  console.log('Old (including "completed") Schemes without water_supply check:', resOldNoWater.rows[0].count);

  await client.end();
}
test();
