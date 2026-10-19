import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const client = await pool.connect();
    try {
      console.log('=== CHECKING TODAY DISPATCH POTENTIAL FOR LEVEL 2 (EE) ===');
      const schemesRes = await client.query(`
        SELECT ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division,
               sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile
        FROM scheme_status ss
        LEFT JOIN scheme_engineer_details sed ON ss.scheme_id = sed.scheme_id
        GROUP BY ss.scheme_id, ss.scheme_name, ss.region, ss.circle, ss.division,
                 sed.ee_civil_name, sed.ee_civil_email, sed.ee_civil_mobile
        ORDER BY ss.scheme_name
      `);
      console.log('Total schemes in scheme_status:', schemesRes.rows.length);
      
      const withEe = schemesRes.rows.filter(r => r.ee_civil_email && r.ee_civil_email.includes('@'));
      console.log('Schemes with valid EE email:', withEe.length);

      // Unique EE emails
      const uniqueEeEmails = new Set(withEe.map(r => r.ee_civil_email.toLowerCase().trim()));
      console.log('Unique EE email addresses across schemes:', uniqueEeEmails.size);
      console.log('Unique EE email addresses:', Array.from(uniqueEeEmails));

    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
