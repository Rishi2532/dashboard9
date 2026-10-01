require('dotenv').config(); 
const { Client } = require('pg'); 
const client = new Client({ connectionString: process.env.DATABASE_URL }); 
client.connect().then(() => 
  client.query(`
    ALTER TABLE water_scheme_data 
    ALTER COLUMN water_value_day1 TYPE NUMERIC,
    ALTER COLUMN water_value_day2 TYPE NUMERIC,
    ALTER COLUMN water_value_day3 TYPE NUMERIC,
    ALTER COLUMN water_value_day4 TYPE NUMERIC,
    ALTER COLUMN water_value_day5 TYPE NUMERIC,
    ALTER COLUMN water_value_day6 TYPE NUMERIC,
    ALTER COLUMN water_value_day7 TYPE NUMERIC,
    ALTER COLUMN lpcd_value_day1 TYPE NUMERIC,
    ALTER COLUMN lpcd_value_day2 TYPE NUMERIC,
    ALTER COLUMN lpcd_value_day3 TYPE NUMERIC,
    ALTER COLUMN lpcd_value_day4 TYPE NUMERIC,
    ALTER COLUMN lpcd_value_day5 TYPE NUMERIC,
    ALTER COLUMN lpcd_value_day6 TYPE NUMERIC,
    ALTER COLUMN lpcd_value_day7 TYPE NUMERIC;
  `)
).then(() => { 
  console.log('Altered main table successfully'); 
  client.end(); 
}).catch(e => { 
  console.error(e); 
  client.end(); 
});
