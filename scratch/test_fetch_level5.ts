async function testLevel5() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 180000);
  try {
    console.log("Fetching /api/escalation/level5-summary?days=20...");
    const t0 = Date.now();
    const res = await fetch('http://127.0.0.1:5000/api/escalation/level5-summary?days=20', { signal: controller.signal });
    clearTimeout(id);
    console.log(`Response status: ${res.status} in ${(Date.now() - t0)/1000}s`);
    const json = await res.json();
    console.log(`Success! ProjectScope:`, json.projectScope);
    console.log(`Operational:`, json.operational);
    console.log(`Alerts:`, json.alertsLevel5 || json.alertsLevel);
  } catch (err: any) {
    console.error(`Failed:`, err.message);
  }
}
testLevel5();
