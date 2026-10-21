async function testLevel5Both() {
  const res20 = await fetch('http://127.0.0.1:5000/api/escalation/level5-summary?days=20&refresh=true');
  const json20 = await res20.json();

  const res7 = await fetch('http://127.0.0.1:5000/api/escalation/level5-summary?days=7&refresh=true');
  const json7 = await res7.json();

  console.log("=== LEVEL 5 PORTAL UPDATED METRICS ===");
  console.log("FOR 20+ DAYS (Level 5):", {
    lowLpcdSchemes: json20.alertsLevel?.lowLpcdSchemes,
    lowLpcdVillages: json20.alertsLevel?.lowLpcdVillages,
    lowPressureEsrs: json20.alertsLevel?.lowPressureEsrs,
    residualChlorineOutOfRange: json20.alertsLevel?.residualChlorineOutOfRange,
  });

  console.log("FOR 7+ DAYS (Level 3):", {
    lowLpcdSchemes: json7.alertsLevel?.lowLpcdSchemes,
    lowLpcdVillages: json7.alertsLevel?.lowLpcdVillages,
    lowPressureEsrs: json7.alertsLevel?.lowPressureEsrs,
    residualChlorineOutOfRange: json7.alertsLevel?.residualChlorineOutOfRange,
  });

  process.exit(0);
}

testLevel5Both().catch(console.error);
