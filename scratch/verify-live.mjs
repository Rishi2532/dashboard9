async function test() {
  try {
    const escData = await fetch('http://localhost:5000/api/escalation/summary').then(r => r.json());
    const escRes = escData.schemes || escData;
    let lpcd = 0, clLow = 0, clHigh = 0, pr = 0, off = 0;
    for (const s of escRes) {
      lpcd += s.lpcd_villages_count || 0;
      clLow += s.chlorine_low_count || 0;
      clHigh += s.chlorine_high_count || 0;
      pr += s.pressure_low_count || 0;
      off += s.offline_count || 0;
    }
    console.log('--- Escalation Portal Live API ---');
    console.log('LPCD Villages:', lpcd);
    console.log('Chlorine Sensors:', clLow + clHigh, '(Low:', clLow, 'High:', clHigh, ')');
    console.log('Pressure Sensors:', pr);
    console.log('Offline Sensors:', off);

    const [lpcdProg, clProg, prProg, offProg] = await Promise.all([
      fetch('http://localhost:5000/api/alerts-progress/lpcd?date=2026-10-19').then(r => r.json()),
      fetch('http://localhost:5000/api/alerts-progress/chlorine?date=2026-10-19').then(r => r.json()),
      fetch('http://localhost:5000/api/alerts-progress/pressure?date=2026-10-19').then(r => r.json()),
      fetch('http://localhost:5000/api/alerts-progress/offline?date=2026-10-19').then(r => r.json())
    ]);

    console.log('--- Alerts Progress Live API ---');
    console.log('LPCD Villages:', lpcdProg.length);
    console.log('Chlorine Sensors:', clProg.length);
    console.log('Pressure Sensors:', prProg.length);
    console.log('Offline Sensors:', offProg.length);
  } catch (e) {
    console.error('Error during test:', e);
  }
}
test();
