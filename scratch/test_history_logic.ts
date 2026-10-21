import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function testAlertHistory() {
  const db = await getDB();
  const schemeId = '20003791';
  const category = 'lpcd';
  const villageName = 'Zanji';

  const targetDates = ['18-Oct', '17-Oct', '16-Oct', '15-Oct', '14-Oct', '13-Oct', '12-Oct'];
  const sqlTargetDates = sql.join(targetDates.map(d => sql`${d}`), sql`, `);

  const rowsRes: any = await db.execute(sql`
    SELECT DISTINCT ON (h.data_date)
      h.scheme_id, h.scheme_name, h.village_name, h.data_date, h.lpcd_value
    FROM water_scheme_data_history h
    WHERE h.scheme_id = ${schemeId}
      AND h.data_date IN (${sqlTargetDates})
      ${villageName && villageName !== '-' ? sql`AND LOWER(TRIM(h.village_name)) = LOWER(TRIM(${villageName}))` : sql``}
    ORDER BY h.data_date, h.uploaded_at DESC, h.id DESC
  `);

  const recordsByDate = new Map<string, any>();
  (rowsRes.rows || []).forEach((r: any) => {
    recordsByDate.set(String(r.data_date).trim(), r);
  });

  const timeline = targetDates.map((dateStr, idx) => {
    const rec = recordsByDate.get(dateStr);
    const numVal = rec && rec.lpcd_value !== null ? parseFloat(String(rec.lpcd_value)) : null;
    const isBreach = numVal !== null && numVal < 55;
    const alertType = isBreach ? "Low LPCD" : "Compliant";
    const alertValue = numVal !== null ? `${numVal.toFixed(0)} LPCD` : "No Data";

    const cleanDate = dateStr.replace('-', ' ') + ' 2026';
    return {
      dayIndex: idx + 1,
      date: cleanDate,
      dateFormatted: cleanDate,
      dayLabel: idx === 0 ? "Latest" : `Day ${idx + 1}`,
      hasAlert: isBreach,
      alertType,
      alertValue,
      villageName: villageName || rec?.village_name || "-",
      esrName: "-",
      ticketId: `TKT-${schemeId}-${dateStr.replace('-', '')}`,
      logCount: isBreach ? 1 : 0,
      allLogs: [],
    };
  });

  console.log('Result timeline:');
  console.log(timeline);
}

testAlertHistory().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
