import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function cleanEmails() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, civil_engineer_email, mechanical_engineer_email, site_supervisor_email FROM scheme_engineer_details');
    let updatedCount = 0;
    
    for (const row of res.rows) {
      const clean = (email: string | null) => {
        if (!email) return null;
        let c = email.trim().replace(/^['"]+|['"]+$/g, '').trim();
        return c || null;
      };

      const cleanCiv = clean(row.civil_engineer_email);
      const cleanMech = clean(row.mechanical_engineer_email);
      const cleanSite = clean(row.site_supervisor_email);

      if (cleanCiv !== row.civil_engineer_email || cleanMech !== row.mechanical_engineer_email || cleanSite !== row.site_supervisor_email) {
        await client.query(
          'UPDATE scheme_engineer_details SET civil_engineer_email = $1, mechanical_engineer_email = $2, site_supervisor_email = $3 WHERE id = $4',
          [cleanCiv, cleanMech, cleanSite, row.id]
        );
        updatedCount++;
      }
    }
    console.log(`Successfully cleaned ${updatedCount} rows in scheme_engineer_details`);
  } catch (err) {
    console.error('Error cleaning emails:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanEmails();
