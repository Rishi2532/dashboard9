import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
});

async function verifyCounts() {
  console.log('--- VERIFYING EXACT 3-DAY AND 7-DAY STREAKS FROM HISTORY TABLES ---');

  // 1. Water Scheme Data (LPCD < 55)
  // Check sliding window backwards from Day 7 (18-Oct)
  const lpcdRes = await pool.query(`
    SELECT 
      w.scheme_id, w.village_name,
      w.lpcd_value_day7, w.lpcd_value_day6, w.lpcd_value_day5,
      w.lpcd_value_day4, w.lpcd_value_day3, w.lpcd_value_day2, w.lpcd_value_day1,
      s.water_supply
    FROM water_scheme_data w
    LEFT JOIN scheme_status s ON s.scheme_id = w.scheme_id
    WHERE (s.water_supply = 'Yes' OR s.water_supply IS NULL)
  `);

  let lpcd_1d = 0;
  let lpcd_3d = 0;
  let lpcd_7d = 0;

  for (const row of lpcdRes.rows) {
    const vals = [
      row.lpcd_value_day7, row.lpcd_value_day6, row.lpcd_value_day5,
      row.lpcd_value_day4, row.lpcd_value_day3, row.lpcd_value_day2, row.lpcd_value_day1
    ].map(v => (v !== null && v !== undefined && String(v).trim() !== '' ? parseFloat(String(v)) : null));

    // If day 7 is not < 55, streak is 0
    if (vals[0] === null || vals[0] >= 55) continue;

    let streak = 0;
    for (const v of vals) {
      if (v !== null && v < 55) streak++;
      else break;
    }

    if (streak >= 1) lpcd_1d++;
    if (streak >= 3) lpcd_3d++;
    if (streak >= 7) lpcd_7d++;
  }

  // 2. Chlorine (< 0.20 or > 0.50 with water_supply = 'Yes' and water consumption > 0)
  const clRes = await pool.query(`
    SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
      c.scheme_id, c.village_name, c.esr_name,
      c.chlorine_value_7 as c7, c.chlorine_value_6 as c6, c.chlorine_value_5 as c5,
      c.chlorine_value_4 as c4, c.chlorine_value_3 as c3, c.chlorine_value_2 as c2,
      c.chlorine_value_1 as c1,
      wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
      wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
      wc.water_value_day1 as w1
    FROM chlorine_data c
    JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
    JOIN water_consumption wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
    WHERE c.chlorine_value_7 IS NOT NULL
      AND NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
      AND (
        (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
        OR (NULLIF(REGEXP_REPLACE(c.chlorine_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) > 0.5
      )
      AND wc.water_value_day7 IS NOT NULL 
      AND CAST(wc.water_value_day7 AS text) NOT IN ('0', '0.0', '0.00')
      AND wc.water_value_day7::numeric > 0
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, '')))
  `);

  let cl_1d = 0;
  let cl_3d = 0;
  let cl_7d = 0;

  for (const row of clRes.rows) {
    const cVals = [row.c7, row.c6, row.c5, row.c4, row.c3, row.c2, row.c1].map(v => (v !== null && v !== undefined && String(v).trim() !== '' ? parseFloat(String(v)) : null));
    const wVals = [row.w7, row.w6, row.w5, row.w4, row.w3, row.w2, row.w1].map(v => (v !== null && v !== undefined && String(v).trim() !== '' ? parseFloat(String(v)) : null));

    const isBreach = (idx: number) => {
      const cv = cVals[idx];
      const wv = wVals[idx];
      return cv !== null && wv !== null && wv > 0 && (cv < 0.20 || cv > 0.50);
    };

    if (!isBreach(0)) continue;

    let streak = 0;
    for (let i = 0; i < 7; i++) {
      if (isBreach(i)) streak++;
      else break;
    }

    if (streak >= 1) cl_1d++;
    if (streak >= 3) cl_3d++;
    if (streak >= 7) cl_7d++;
  }

  // 3. Pressure (< 0.20 with water_supply = 'Yes' and water consumption > 0)
  const prRes = await pool.query(`
    SELECT DISTINCT ON (p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, ''))))
      p.scheme_id, p.village_name, p.esr_name,
      p.pressure_value_7 as p7, p.pressure_value_6 as p6, p.pressure_value_5 as p5,
      p.pressure_value_4 as p4, p.pressure_value_3 as p3, p.pressure_value_2 as p2,
      p.pressure_value_1 as p1,
      wc.water_value_day7 as w7, wc.water_value_day6 as w6, wc.water_value_day5 as w5,
      wc.water_value_day4 as w4, wc.water_value_day3 as w3, wc.water_value_day2 as w2,
      wc.water_value_day1 as w1
    FROM pressure_data p
    JOIN scheme_status ss ON ss.scheme_id = p.scheme_id AND ss.water_supply = 'Yes'
    JOIN water_consumption wc ON (
      p.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(p.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(p.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, '')))
    )
    WHERE p.pressure_value_7 IS NOT NULL
      AND NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '') IS NOT NULL
      AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) < 0.2
      AND (NULLIF(REGEXP_REPLACE(p.pressure_value_7::text, '[^0-9.]', '', 'g'), '')::numeric) >= 0
      AND wc.water_value_day7 IS NOT NULL 
      AND CAST(wc.water_value_day7 AS text) NOT IN ('0', '0.0', '0.00')
      AND wc.water_value_day7::numeric > 0
    ORDER BY p.scheme_id, LOWER(TRIM(COALESCE(p.village_name, ''))), LOWER(TRIM(COALESCE(p.esr_name, '')))
  `);

  let pr_1d = 0;
  let pr_3d = 0;
  let pr_7d = 0;

  for (const row of prRes.rows) {
    const pVals = [row.p7, row.p6, row.p5, row.p4, row.p3, row.p2, row.p1].map(v => (v !== null && v !== undefined && String(v).trim() !== '' ? parseFloat(String(v)) : null));
    const wVals = [row.w7, row.w6, row.w5, row.w4, row.w3, row.w2, row.w1].map(v => (v !== null && v !== undefined && String(v).trim() !== '' ? parseFloat(String(v)) : null));

    const isBreach = (idx: number) => {
      const pv = pVals[idx];
      const wv = wVals[idx];
      return pv !== null && wv !== null && wv > 0 && (pv < 0.20 && pv >= 0);
    };

    if (!isBreach(0)) continue;

    let streak = 0;
    for (let i = 0; i < 7; i++) {
      if (isBreach(i)) streak++;
      else break;
    }

    if (streak >= 1) pr_1d++;
    if (streak >= 3) pr_3d++;
    if (streak >= 7) pr_7d++;
  }

  // 4. Offline Sensors in communication_status
  const offRes = await pool.query(`
    SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))))
      c.scheme_id, c.village_name, c.esr_name,
      c.chlorine_connected, c.pressure_connected, c.flow_meter_connected,
      c.chlorine_status, c.pressure_status, c.flow_meter_status,
      c.last_seen, c.pressure_last_seen,
      (CURRENT_DATE - 1) as yesterday_date
    FROM communication_status c
    WHERE (TRIM(c.chlorine_connected) = 'Connected' AND c.chlorine_status = 'Offline')
       OR (TRIM(c.pressure_connected) = 'Connected' AND c.pressure_status = 'Offline')
       OR (TRIM(c.flow_meter_connected) = 'Connected' AND c.flow_meter_status = 'Offline')
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, '')))
  `);

  let off_esr_1d = 0, off_sensors_1d = 0;
  let off_esr_3d = 0, off_sensors_3d = 0;
  let off_esr_7d = 0, off_sensors_7d = 0;

  let flow_3d = 0, flow_7d = 0;
  let press_3d = 0, press_7d = 0;
  let cl_off_3d = 0, cl_off_7d = 0;

  for (const row of offRes.rows) {
    const isChlorine = String(row.chlorine_connected || '').trim() === 'Connected' && row.chlorine_status === 'Offline';
    const isPressure = String(row.pressure_connected || '').trim() === 'Connected' && row.pressure_status === 'Offline';
    const isFlow = String(row.flow_meter_connected || '').trim() === 'Connected' && row.flow_meter_status === 'Offline';

    const sensorCount = (isChlorine ? 1 : 0) + (isPressure ? 1 : 0) + (isFlow ? 1 : 0);
    if (sensorCount === 0) continue;

    const yesterday = new Date(row.yesterday_date);
    let clFlowDays = 0;
    if ((isChlorine || isFlow) && row.last_seen) {
      clFlowDays = Math.max(1, Math.floor((yesterday.getTime() - new Date(row.last_seen).getTime()) / (1000 * 86400)));
    }
    let prDays = 0;
    if (isPressure && row.pressure_last_seen) {
      prDays = Math.max(1, Math.floor((yesterday.getTime() - new Date(row.pressure_last_seen).getTime()) / (1000 * 86400)));
    }
    const streak = Math.max(clFlowDays, prDays, 1);

    if (streak >= 1) {
      off_esr_1d++;
      off_sensors_1d += sensorCount;
    }
    if (streak >= 3) {
      off_esr_3d++;
      off_sensors_3d += sensorCount;
      if (isFlow) flow_3d++;
      if (isPressure) press_3d++;
      if (isChlorine) cl_off_3d++;
    }
    if (streak >= 7) {
      off_esr_7d++;
      off_sensors_7d += sensorCount;
      if (isFlow) flow_7d++;
      if (isPressure) press_7d++;
      if (isChlorine) cl_off_7d++;
    }
  }

  console.log('\n--- EXACT COUNT SUMMARY ---');
  console.log('1-Day (Level 1):', {
    lpcd: lpcd_1d,
    chlorine: cl_1d,
    pressure: pr_1d,
    offline_esrs: off_esr_1d,
    offline_sensors: off_sensors_1d,
  });
  console.log('3-Day (Level 2: EE):', {
    lpcd: lpcd_3d,
    chlorine: cl_3d,
    pressure: pr_3d,
    offline_esrs: off_esr_3d,
    offline_sensors: off_sensors_3d,
    bifurcation: { flow: flow_3d, pressure: press_3d, chlorine: cl_off_3d }
  });
  console.log('7-Day (Level 3: CE & SE):', {
    lpcd: lpcd_7d,
    chlorine: cl_7d,
    pressure: pr_7d,
    offline_esrs: off_esr_7d,
    offline_sensors: off_sensors_7d,
    bifurcation: { flow: flow_7d, pressure: press_7d, chlorine: cl_off_7d }
  });

  await pool.end();
}

verifyCounts().catch(console.error);
