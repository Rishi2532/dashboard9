const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const { getSentEscalationAlerts } = await import('../server/services/escalation-service.ts');
  const res = await getSentEscalationAlerts({ timeRange: 'today', channel: 'email', limit: 1000 });
  console.log('Total email alerts returned:', res.alerts.length);
  const lpcdAlerts = res.alerts.filter(a => a.is_lpcd || (a.categories && a.categories.includes('lpcd')));
  console.log('LPCD email alerts returned:', lpcdAlerts.length);
  const officers = new Set(lpcdAlerts.map(a => (a.recipient_name || a.recipient_email || '').toLowerCase().trim()));
  console.log('LPCD unique officers:', officers.size, Array.from(officers));
}

run().catch(console.error);
