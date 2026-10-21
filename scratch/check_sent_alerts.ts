import { getSentEscalationAlerts } from '../server/services/escalation-service';

async function main() {
  const emailRes = await getSentEscalationAlerts({ timeRange: '30days', channel: 'email', limit: 1000 });
  console.log('Total sent email alerts:', emailRes.alerts.length);

  const byTierAndDate: Record<string, { count: number; schemeIds: Set<string> }> = {};
  emailRes.alerts.forEach((a: any) => {
    const d = a.sent_date ? String(a.sent_date).slice(0, 10) : 'unknown';
    const key = `Tier ${a.tier} on ${d}`;
    if (!byTierAndDate[key]) byTierAndDate[key] = { count: 0, schemeIds: new Set() };
    byTierAndDate[key].count++;
    byTierAndDate[key].schemeIds.add(a.scheme_id);
  });

  const summary = Object.entries(byTierAndDate).map(([k, v]) => ({
    group: k,
    alerts: v.count,
    unique_schemes: v.schemeIds.size
  }));
  console.table(summary);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
