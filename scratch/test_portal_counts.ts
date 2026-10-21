async function test() {
  const res = await fetch("http://127.0.0.1:5000/api/escalation/summary");
  const data = await res.json();
  const schemes = data.schemes || [];

  // Level 2 (EE): streak >= 3
  let l2Lpcd = 0;
  schemes.forEach((s: any) => {
    (s.lpcd_villages || []).forEach((v: any) => {
      const streak = v.days_count || s.max_streak_days || 1;
      if (streak >= 3) l2Lpcd++;
    });
  });

  // Level 3 (CE/SE): streak >= 7
  let l3Lpcd = 0;
  schemes.forEach((s: any) => {
    (s.lpcd_villages || []).forEach((v: any) => {
      const streak = v.days_count || s.max_streak_days || 1;
      if (streak >= 7) l3Lpcd++;
    });
  });

  console.log("Portal Level 2 LPCD Count (streak >= 3):", l2Lpcd);
  console.log("Portal Level 3 LPCD Count (streak >= 7):", l3Lpcd);
  process.exit(0);
}

test().catch(console.error);
