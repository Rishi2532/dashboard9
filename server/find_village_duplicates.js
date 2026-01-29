
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findDuplicates() {
  console.log("Finding LPCD Village Duplicates...");

  try {
    const latestDateRes = await pool.query(`
      SELECT MAX(TO_DATE(data_date, 'DD-Mon-YYYY')) as max_date 
      FROM water_scheme_data_history
      WHERE data_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
    `);
    const latestDate = latestDateRes.rows[0].max_date.toISOString().split('T')[0];
    console.log("Latest Village Date:", latestDate);

    // Find duplicates: Group by scheme/village/date, HAVING count > 1
    const duplicatesRes = await pool.query(`
      SELECT scheme_id, village_name, data_date, COUNT(*) as cnt
      FROM water_scheme_data_history
      WHERE TO_DATE(data_date, 'DD-Mon-YYYY') = $1::date
      GROUP BY scheme_id, village_name, data_date
      HAVING COUNT(*) > 1
    `, [latestDate]);

      const fs = require('fs');
      const reportPath = path.join(__dirname, 'duplicates_report.txt');
      let report = '';
      
      if (duplicatesRes.rows.length > 0) {
        report += `Found ${duplicatesRes.rows.length} duplicate groups.\n`;
        duplicatesRes.rows.forEach(row => {
          report += `- ${row.village_name} (${row.scheme_id}): ${row.cnt} entries\n`;
        });
        
        const totalExcess = duplicatesRes.rows.reduce((sum, row) => sum + (row.cnt - 1), 0);
        report += `Total duplicate entries (excess): ${totalExcess}\n`;
      } else {
        report += "No duplicates found.\n";
      }
      fs.writeFileSync(reportPath, report);


  } catch (err) {
    console.error(err);
    const fs = require('fs');
    const errorPath = path.join(__dirname, 'duplicates_error.txt');
    fs.writeFileSync(errorPath, err.stack || String(err));
  } finally {

    pool.end();
  }
}

findDuplicates();
