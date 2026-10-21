async function test() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  try {
    const t0 = Date.now();
    const res = await fetch('http://127.0.0.1:5000/api/escalation/latest-date', { signal: controller.signal });
    clearTimeout(id);
    const json = await res.json();
    console.log(`Success in ${Date.now() - t0}ms:`, json);
  } catch (err: any) {
    console.error(`Failed:`, err.message);
  }
}
test();
