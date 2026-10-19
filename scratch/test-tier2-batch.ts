import { getSentEscalationAlerts } from '../server/services/escalation-service';

async function test() {
  const sentAlertsData = await getSentEscalationAlerts({ timeRange: '30days', channel: 'email', limit: 3000 });
  const alerts = sentAlertsData.alerts || [];

  const tierEmails = alerts.filter((a: any) => a.channel === "email" && Number(a.tier) === 2);
  console.log('Tier 2 email count in sentAlertsData:', tierEmails.length);

  let maxTimestamp = 0;
  tierEmails.forEach((a: any) => {
    const raw = a.sent_date || a.created_at;
    if (raw) {
      const ts = new Date(raw).getTime();
      if (ts > maxTimestamp) maxTimestamp = ts;
    }
  });

  const maxDate = new Date(maxTimestamp);
  const maxDateKey = maxDate.toISOString().split("T")[0];
  console.log('maxDateKey:', maxDateKey);

  const latestBatch = tierEmails.filter((a: any) => {
    const raw = a.sent_date || a.created_at;
    if (!raw) return false;
    return new Date(raw).toISOString().split("T")[0] === maxDateKey;
  });
  console.log('latestBatch length:', latestBatch.length);

  const schemeIds = new Set<string>();
  latestBatch.forEach((a: any) => {
    const sid = String(a.scheme_id || "").trim();
    if (sid && sid !== "0" && sid !== "MJP-SCHEME") schemeIds.add(sid);
  });
  console.log('schemeIds count in latestBatch:', schemeIds.size);
  console.log('schemeIds:', Array.from(schemeIds));
}

test().catch(console.error);
