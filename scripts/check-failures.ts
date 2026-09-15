import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkFailures() {
  console.log('\n============================================================');
  console.log('🔍 PRIVATE EMAIL DELIVERY FAILURE AUDIT');
  console.log('============================================================\n');

  try {
    const client = await pool.connect();
    try {
      // 1. Total counts
      const countRes = await client.query(`
        SELECT 
          COUNT(*)::int as total_failures,
          COUNT(*) FILTER (WHERE attempted_at >= CURRENT_DATE)::int as today_failures,
          COUNT(DISTINCT recipient_email)::int as unique_failed_recipients
        FROM email_delivery_failures
      `);

      const stats = countRes.rows[0];
      console.log(`📊 Total Recorded Delivery Failures : ${stats.total_failures}`);
      console.log(`📅 Failures Attempted Today          : ${stats.today_failures}`);
      console.log(`👥 Unique Failed Recipient Inboxes   : ${stats.unique_failed_recipients}\n`);

      if (stats.total_failures === 0) {
        console.log('🎉 No email delivery failures found in the database. All alert emails have sent successfully!\n');
        return;
      }

      // 2. Fetch latest 25 failure records
      const listRes = await client.query(`
        SELECT 
          id,
          recipient_email,
          engineer_name,
          scheme_name,
          scheme_id,
          alert_count,
          error_message,
          attempted_at
        FROM email_delivery_failures
        ORDER BY attempted_at DESC
        LIMIT 25
      `);

      console.log('📋 Recent Failed Delivery Records (Latest 25):\n');
      listRes.rows.forEach((row, i) => {
        const timeStr = row.attempted_at 
          ? new Date(row.attempted_at).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : 'N/A';

        console.log(`[#${row.id}] ${timeStr}`);
        console.log(`   To       : ${row.recipient_email} (${row.engineer_name || 'Engineer'})`);
        console.log(`   Scheme   : ${row.scheme_name || 'N/A'} (ID: ${row.scheme_id || 'N/A'}) [${row.alert_count || 1} alerts]`);
        console.log(`   Error    : ❌ ${row.error_message || 'Transporter error'}`);
        console.log('------------------------------------------------------------');
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error querying email_delivery_failures table:', error);
  } finally {
    await pool.end();
    console.log('\n============================================================\n');
  }
}

checkFailures();
