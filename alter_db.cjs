require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => 
  client.query("ALTER TABLE water_scheme_data_history ALTER COLUMN water_value TYPE NUMERIC, ALTER COLUMN lpcd_value TYPE NUMERIC;")
).then(() => { 
  console.log('Altered table successfully'); 
  client.end(); 
}).catch(e => { 
  console.error(e); 
  client.end(); 
});
