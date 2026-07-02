import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query(`
      SELECT scheme_id, scheme_name, village_name, population, water_value, lpcd_value 
      FROM water_scheme_data_history 
      WHERE scheme_id = '20022133' AND data_date = '03-Mar'
    `);
    console.log("water_scheme_data_history for Peth RR on 03-Mar:", res.rows);

    const sumPop = res.rows.reduce((sum, r) => sum + Number(r.population || 0), 0);
    const sumWater = res.rows.reduce((sum, r) => sum + Number(r.water_value || 0), 0);
    const calculatedLpcd = sumPop > 0 ? (sumWater * 100000) / sumPop : 0;
    
    console.log(`Sum Population: ${sumPop}`);
    console.log(`Sum Water: ${sumWater}`);
    console.log(`Calculated LPCD: ${calculatedLpcd}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
