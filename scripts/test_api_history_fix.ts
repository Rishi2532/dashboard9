async function testEndpoints() {
  // Test 1: Latest Date
  const dateRes = await fetch('http://localhost:5000/api/escalation/latest-date');
  const dateJson = await dateRes.json();
  console.log('Latest Date API:', dateJson);

  // Test 2: Offline History for Dongargaon
  const offUrl = 'http://localhost:5000/api/escalation/alert-history?schemeId=7948936&category=offline&villageName=Dongargaon&esrName=' + encodeURIComponent('Dongargaon wadi Gaothan ESR 0.50 LL');
  const offRes = await fetch(offUrl);
  const offJson = await offRes.json();
  console.log('\nOffline History Timeline:');
  console.table(offJson.timeline);

  // Test 3: Chlorine History
  const clUrl = 'http://localhost:5000/api/escalation/alert-history?schemeId=20027951&category=chlorine';
  const clRes = await fetch(clUrl);
  const clJson = await clRes.json();
  console.log('\nChlorine History Timeline:');
  console.table(clJson.timeline);
}

testEndpoints().catch(console.error);
