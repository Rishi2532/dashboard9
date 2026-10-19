import { getSentEscalationAlerts } from '../server/services/escalation-service';

async function test() {
  const res = await getSentEscalationAlerts({ timeRange: '30days', channel: 'email', limit: 3000 });
  console.log('Total sent alerts returned:', res.alerts.length);
  const tier2Alerts = res.alerts.filter((a: any) => a.tier === 2);
  console.log('Tier 2 alerts count:', tier2Alerts.length);
  if (tier2Alerts.length > 0) {
    console.log('Sample Tier 2 alert:', tier2Alerts[0]);
    const dates = [...new Set(tier2Alerts.map((a: any) => a.sent_date))];
    console.log('Tier 2 sent_dates:', dates);
  }
}

test().catch(console.error);
