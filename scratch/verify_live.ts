async function verifyEndpoints() {
  const t0 = Date.now();
  const summaryRes = await fetch('http://127.0.0.1:5000/api/escalation/summary');
  const summaryJson = await summaryRes.json();
  const t1 = Date.now();

  const level5Res = await fetch('http://127.0.0.1:5000/api/escalation/level5-summary');
  const level5Json = await level5Res.json();
  const t2 = Date.now();

  console.log("=== VERIFICATION ===");
  console.log(`/api/escalation/summary: ${summaryRes.status} in ${t1 - t0}ms`);
  console.log(`- Total schemes in escalation: ${summaryJson.summary.total_schemes_in_escalation}`);
  console.log(`- Schemes array length: ${summaryJson.schemes.length}`);
  console.log(`- Level 1 count: ${summaryJson.summary.level_1_count}`);
  console.log(`- Level 2 count: ${summaryJson.summary.level_2_count}`);
  console.log(`- Level 3 count: ${summaryJson.summary.level_3_count}`);
  console.log(`- Level 5 count: ${summaryJson.summary.level_5_count}`);
  console.log(`- Low LPCD villages: ${summaryJson.summary.total_villages_below_55}`);
  console.log(`- Low Chlorine ESRs: ${summaryJson.summary.total_esrs_low_chlorine}`);
  console.log(`- Low Pressure ESRs: ${summaryJson.summary.total_esrs_low_pressure}`);
  console.log(`- Offline sensors: ${summaryJson.summary.total_offline_sensors}`);

  console.log(`\n/api/escalation/level5-summary: ${level5Res.status} in ${t2 - t1}ms`);
  console.log(`- Operational schemes: ${level5Json.operational.schemes}`);
  console.log(`- Operational villages: ${level5Json.operational.villages}`);
  console.log(`- Operational ESRs: ${level5Json.operational.esr}`);
  console.log(`- Level 5 low LPCD villages: ${level5Json.alertsLevel?.lowLpcdVillages ?? level5Json.alertsLevel5?.lowLpcdVillages}`);

  process.exit(0);
}

verifyEndpoints().catch(console.error);
