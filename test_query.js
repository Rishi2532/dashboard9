require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const query = `
  WITH weekly_data AS (
      SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, population,
          lpcd_value, data_date, dashboard_url
      FROM water_scheme_data_history
      WHERE region = 'Amravati'
  )
  SELECT
      wd.region, wd.circle, wd.division, wd.sub_division, wd.block,
      wd.scheme_id, wd.scheme_name, wd.village_name, wd.population,
      ROUND((SUM(COALESCE(NULLIF(TRIM(wd.lpcd_value::text), '')::numeric, 0)) / 7.0), 2) as lpcd_value,
      MAX(wd.data_date) as lpcd_date,
      MAX(COALESCE(wsd.dashboard_url, wd.dashboard_url)) as dashboard_url,
      NULL as water_value_day7,
      NULL as water_date_day7
  FROM weekly_data wd
  LEFT JOIN water_scheme_data wsd ON 
      wd.scheme_id = wsd.scheme_id AND 
      wd.village_name = wsd.village_name AND 
      wd.block = wsd.block
  GROUP BY wd.region, wd.circle, wd.division, wd.sub_division, wd.block, wd.scheme_id, wd.scheme_name, wd.village_name, wd.population
  HAVING 1=1
  ORDER BY wd.region, wd.division, wd.village_name
`;
pool.query(query)
  .then(() => console.log('SUCCESS'))
  .catch(e => console.error('ERROR:', e.message))
  .finally(() => pool.end());
