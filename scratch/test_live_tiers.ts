async function test() {
  try {
    const res = await fetch("http://localhost:5000/api/escalation/summary");
    const json = await res.json();
    console.log("Summary success:", json.success);
    console.log("schemes count (18-Oct):", json.schemes?.length);
    console.log("layer1Schemes count (20-Oct):", json.layer1Schemes?.length);

    // Count Level 1 LPCD alerts in layer1Schemes
    let l1Lpcd = 0;
    (json.layer1Schemes || []).forEach((s: any) => {
      l1Lpcd += (s.lpcd_villages || []).length;
    });
    console.log("Total Level 1 LPCD villages in layer1Schemes:", l1Lpcd);

    // Count Level 2 & 3 LPCD in schemes
    let l2Lpcd = 0;
    let l3Lpcd = 0;
    (json.schemes || []).forEach((s: any) => {
      (s.lpcd_villages || []).forEach((v: any) => {
        if ((v.days_count || 1) >= 3) l2Lpcd++;
        if ((v.days_count || 1) >= 7) l3Lpcd++;
      });
    });
    console.log("Total Level 2 LPCD (streak >= 3):", l2Lpcd);
    console.log("Total Level 3 LPCD (streak >= 7):", l3Lpcd);

    // Test alert-history for Level 1 (20-Oct) vs Level 2 (18-Oct)
    const h1Res = await fetch("http://localhost:5000/api/escalation/alert-history?schemeId=20027978&category=lpcd&tier=1");
    const h1Json = await h1Res.json();
    console.log("Level 1 7-day timeline dates:", h1Json.timeline?.map((d: any) => d.dayLabel + ': ' + (d.dateFormatted || d.date)));

    const h2Res = await fetch("http://localhost:5000/api/escalation/alert-history?schemeId=20027978&category=lpcd&tier=2");
    const h2Json = await h2Res.json();
    console.log("Level 2 7-day timeline dates:", h2Json.timeline?.map((d: any) => d.dayLabel + ': ' + (d.dateFormatted || d.date)));

  } catch (err) {
    console.error("Test fetch error:", err);
  }
}
test();
