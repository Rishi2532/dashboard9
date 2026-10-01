require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => 
  client.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'water_scheme_data_history'::regclass;")
).then(res => { 
  console.log(res.rows); 
  client.end(); 
}).catch(e => { 
  console.error(e); 
  client.end(); 
});
