async function verify() {
  console.log("=== 1. VERIFY LEVEL 5 SUMMARY (days=7) ===");
  const l5Res = await fetch("http://127.0.0.1:5000/api/escalation/level5-summary?days=7&refresh=true");
  const l5 = await l5Res.json();

  console.log("Status:", l5Res.status, l5.success);
  console.log("Project Scope:", l5.projectScope);
  console.log("IoT Progress:", l5.iotProgress);
  console.log("Operational:", l5.operational);
  console.log("Operational Schemes detail list length:", l5.details.operationalSchemes.length);
  console.log("Operational Schemes sample with remarks:", l5.details.operationalSchemes.filter((s: any) => s.remarks && s.remarks.length > 0).length);
  console.log("Alerts Level (7+ Days):", {
    lowLpcdVillages: l5.alertsLevel.lowLpcdVillages,
    lowLpcdSchemes: l5.alertsLevel.lowLpcdSchemes,
    lowPressureEsrs: l5.alertsLevel.lowPressureEsrs,
    residualChlorineOutOfRange: l5.alertsLevel.residualChlorineOutOfRange,
  });
  console.log("SMS Dispatches:", {
    total: l5.smsDispatches.total,
    delivered: l5.smsDispatches.delivered,
    failed: l5.smsDispatches.failed,
  });
  console.log("Low LPCD Villages detail count:", l5.details.lowLpcdVillages.length);
  const villagesWithRemarks = l5.details.lowLpcdVillages.filter((v: any) => v.remarks && v.remarks.length > 0);
  console.log("Low LPCD Villages with field remarks:", villagesWithRemarks.length, "/", l5.details.lowLpcdVillages.length);

  console.log("\n=== 2. VERIFY ALERT HISTORY 7 DAYS ===");
  const histRes = await fetch("http://127.0.0.1:5000/api/escalation/alert-history?schemeId=20003791&category=lpcd");
  const hist = await histRes.json();
  console.log("Timeline days count:", hist.timeline.length);
  console.log("Timeline dates:", hist.timeline.map((d: any) => `${d.dayLabel}: ${d.dateFormatted} (${d.alertValue})`));

  console.log("\n=== 3. VERIFY SUMMARY (PORTAL) ===");
  const sumRes = await fetch("http://127.0.0.1:5000/api/escalation/summary");
  const sum = await sumRes.json();
  console.log("Level 2 (EE):", sum.tiers?.layer2?.counts);
  console.log("Level 3 (CE/SE):", sum.tiers?.layer3?.counts);

  process.exit(0);
}

verify().catch((e) => {
  console.error("Error during verification:", e);
  process.exit(1);
});
