import { setupDatabase } from '../server/setup-db';

async function main() {
  const { pool } = setupDatabase();
  try {
    const res = await pool.query(`
      SELECT 
        engineer_email, 
        COUNT(*)::int as total, 
        COUNT(acknowledged_at)::int as acked,
        COUNT(*) FILTER (WHERE is_acknowledged = true)::int as is_acked_true
      FROM email_acknowledgements 
      GROUP BY engineer_email
      ORDER BY engineer_email
    `);
    console.log('--- EMAIL ACKNOWLEDGEMENTS PER ENGINEER ---');
    console.table(res.rows);

    const realtimeRes = await pool.query(`
      SELECT 
        engineer_email,
        COUNT(*)::int as total,
        COUNT(acknowledged_at)::int as acked,
        COUNT(*) FILTER (WHERE is_acknowledged = true)::int as is_acked_true
      FROM realtime_acknowledgements
      GROUP BY engineer_email
      ORDER BY engineer_email
    `);
    console.log('\n--- REALTIME ACKNOWLEDGEMENTS PER ENGINEER ---');
    console.table(realtimeRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
