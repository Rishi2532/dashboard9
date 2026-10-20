import { getDB } from './server/db';
import { getEscalationStatus, getSentEscalationAlerts } from './server/services/escalation-service';

async function main() {
  const db = await getDB();
  const summaryRes = await getEscalationStatus();
  console.log('Schemes count:', summaryRes.schemes.length);
  console.log('Dispatches today:', summaryRes.summary.dispatches?.today);
  const sentRes = await getSentEscalationAlerts({ timeRange: '30days', channel: 'email', limit: 50 });
  console.log('Sent email alerts count:', sentRes.alerts.length);
  const sentSmsRes = await getSentEscalationAlerts({ timeRange: 'today', channel: 'sms', limit: 50 });
  console.log('Sent sms alerts count:', sentSmsRes.alerts.length);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
