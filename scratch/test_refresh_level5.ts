async function test() {
  const t0 = Date.now();
  console.log("Calling /api/escalation/level5-summary?days=20&refresh=true ...");
  const res = await fetch('http://127.0.0.1:5000/api/escalation/level5-summary?days=20&refresh=true');
  const json = await res.json();
  console.log(`Finished in ${(Date.now() - t0) / 1000}s!`);
  console.log("Operational schemes:", json.operational?.schemes);
}
test().catch(console.error);
