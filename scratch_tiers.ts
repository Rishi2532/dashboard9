import { getDB } from './server/db';
import { getSentEscalationAlerts } from './server/services/escalation-service';

async function main() {
  const sentRes = await getSentEscalationAlerts({ timeRange: '30days', channel: 'email', limit: 3000 });
  console.log('Total email alerts in 30 days:', sentRes.alerts.length);
  
  const tierCounts: Record<number, number> = {};
  sentRes.alerts.forEach((a: any) => {
    const t = Number(a.tier);
    tierCounts[t] = (tierCounts[t] || 0) + 1;
  });
  console.log('Tier breakdown of email alerts:', tierCounts);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
