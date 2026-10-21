async function test() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 120000);
  try {
    console.log("Fetching /api/escalation/summary...");
    const t0 = Date.now();
    const res = await fetch('http://127.0.0.1:5000/api/escalation/summary', { signal: controller.signal });
    clearTimeout(id);
    console.log(`Response status: ${res.status} in ${(Date.now() - t0)/1000}s`);
    const json = await res.json();
    console.log(`Success! Summary:`, json.summary);
    console.log(`Schemes count:`, json.schemes?.length);
  } catch (err: any) {
    console.error(`Failed:`, err.message);
  }
}
test();
