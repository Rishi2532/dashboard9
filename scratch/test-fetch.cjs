async function main() {
  const res = await fetch('http://localhost:5000/api/escalation/sent-alerts?timeRange=today');
  const d = await res.json();
  console.log('Summary:', JSON.stringify(d.summary, null, 2));
  console.log('Alerts length:', d.alerts?.length);
  const emails = (d.alerts || []).filter(a => a.channel === 'email');
  console.log('Emails count:', emails.length);
  if (emails.length > 0) {
    console.log('First email:', emails[0]);
  }
}
main().catch(console.error);
