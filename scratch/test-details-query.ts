import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function testQuery() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        ss.agency_type,
        cs.region,
        cs.circle,
        cs.division,
        cs.sub_division,
        cs.block,
        cs.scheme_id,
        cs.scheme_name,
        cs.village_name,
        cs.esr_name,
        cs.chlorine_connected,
        cs.chlorine_status,
        cs.chlorine_0h_72h,
        cs.chlorine_72h,
        wc.water_value_day1,
        wc.water_date_day1,
        wc.water_value_day2,
        wc.water_date_day2,
        wc.water_value_day3,
        wc.water_date_day3,
        wc.water_value_day4,
        wc.water_date_day4,
        wc.water_value_day5,
        wc.water_date_day5,
        wc.water_value_day6,
        wc.water_date_day6,
        wc.water_value_day7,
        wc.water_date_day7,
        cd.chlorine_value_1,
        cd.chlorine_date_day_1,
        cd.chlorine_value_2,
        cd.chlorine_date_day_2,
        cd.chlorine_value_3,
        cd.chlorine_date_day_3,
        cd.chlorine_value_4,
        cd.chlorine_date_day_4,
        cd.chlorine_value_5,
        cd.chlorine_date_day_5,
        cd.chlorine_value_6,
        cd.chlorine_date_day_6,
        cd.chlorine_value_7,
        cd.chlorine_date_day_7,
        (SELECT description FROM helpdesk_tickets ht 
         WHERE ht.scheme_id = cs.scheme_id 
         AND ht.village_name = cs.village_name 
         AND ht.esr_name = cs.esr_name 
         AND ht.level = 'ESR' 
         AND ht.status IN ('Open', 'In-Progress') 
         ORDER BY ht.created_at DESC LIMIT 1) as remark,
        cd.dashboard_url
      FROM communication_status cs
      LEFT JOIN scheme_status ss ON (
        cs.scheme_id = ss.scheme_id AND
        cs.block = ss.block
      )
      LEFT JOIN water_consumption wc ON (
        cs.region = wc.region AND
        cs.circle = wc.circle AND
        cs.division = wc.division AND
        cs.sub_division = wc.sub_division AND
        cs.block = wc.block AND
        cs.scheme_id = wc.scheme_id AND
        cs.scheme_name = wc.scheme_name AND
        cs.village_name = wc.village_name AND
        cs.esr_name = wc.esr_name
      )
      LEFT JOIN chlorine_data cd ON (
        cs.region = cd.region AND
        cs.circle = cd.circle AND
        cs.division = cd.division AND
        cs.sub_division = cd.sub_division AND
        cs.block = cd.block AND
        cs.scheme_id = cd.scheme_id AND
        cs.scheme_name = cd.scheme_name AND
        cs.village_name = cd.village_name AND
        cs.esr_name = cd.esr_name
      )
      WHERE cs.chlorine_status = 'Online'
      LIMIT 5;
    `);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
testQuery();
