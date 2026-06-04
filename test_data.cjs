const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard' });

async function run() {
  await client.connect();

  const dbDates = ['31-May']; 
  const dateInClause = dbDates.map(d => `'${d}'`).join(',');
  
  const { rows: lpcdData } = await client.query(`
    SELECT scheme_id, village_name, data_date, lpcd_value
    FROM water_scheme_data_history
    WHERE data_date IN (${dateInClause}) AND village_name = 'Burhannagar'
  `);
  console.log('lpcdData for Burhannagar 31-May:', lpcdData);

  const { rows: clData } = await client.query(`
    SELECT scheme_id, esr_name, chlorine_date, chlorine_value
    FROM chlorine_history
    WHERE chlorine_date IN (${dateInClause}) AND esr_name LIKE 'Existing%ESR%'
  `);
  console.log('clData for Burhannagar 31-May length:', clData.length);

  await client.end();
}
run().catch(console.error);
