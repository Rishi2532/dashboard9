async function run() {
  try {
    const res = await fetch('http://localhost:5000/api/escalation/summary');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Summary:', data.summary);
    console.log('Total schemes returned:', data.schemes?.length);
    if (data.schemes?.length > 0) {
      console.log('First scheme sample:', {
        scheme_id: data.schemes[0].scheme_id,
        scheme_name: data.schemes[0].scheme_name,
        escalation_level: data.schemes[0].escalation_level,
        max_streak_days: data.schemes[0].max_streak_days,
        lpcd_villages_count: data.schemes[0].lpcd_villages_count,
        chlorine_low_count: data.schemes[0].chlorine_low_count,
        pressure_low_count: data.schemes[0].pressure_low_count,
        offline_count: data.schemes[0].offline_count,
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
