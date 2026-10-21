import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDB();

  // 1. How many total ESRs in chlorine_history across all schemes?
  const allESRs: any = await db.execute(sql`
    SELECT count(DISTINCT (scheme_id || '_' || LOWER(TRIM(village_name)) || '_' || LOWER(TRIM(esr_name)))) as count
    FROM chlorine_history
  `);
  console.log("Total ESRs across ALL schemes:", allESRs.rows[0]);

  // 2. How many chlorine alerts in operational schemes if we DO NOT require water_value > 0?
  // Let's run the streak logic on operational schemes without checking wc.water_value > 0:
  const opSchemes: any = await db.execute(sql`SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'`);
  const opIds: string[] = opSchemes.rows.map((r: any) => r.scheme_id);
  const formattedIds = opIds.map(id => `'${id}'`).join(',');

  const clRows: any = await db.execute(sql.raw(`
    SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date)
      c.scheme_id, c.village_name, c.esr_name, c.chlorine_date, c.chlorine_value,
      wc.water_value
    FROM chlorine_history c
    LEFT JOIN water_consumption_history wc ON (
      c.scheme_id = wc.scheme_id AND
      LOWER(TRIM(COALESCE(c.village_name, ''))) = LOWER(TRIM(COALESCE(wc.village_name, ''))) AND
      LOWER(TRIM(COALESCE(c.esr_name, ''))) = LOWER(TRIM(COALESCE(wc.esr_name, ''))) AND
      c.chlorine_date = wc.data_date
    )
    WHERE c.scheme_id IN (${formattedIds})
    ORDER BY c.scheme_id, LOWER(TRIM(COALESCE(c.village_name, ''))), LOWER(TRIM(COALESCE(c.esr_name, ''))), c.chlorine_date, c.uploaded_at DESC, c.id DESC
  `));

  // Let's parse dates helper
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  function parseDate(s: string): Date | null {
    if (!s) return null;
    const trimmed = s.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
    const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})(?:-(\d{2,4}))?$/);
    if (match) {
      const day = parseInt(match[1]);
      const mon = months[match[2].toLowerCase()];
      if (mon === undefined) return null;
      let yr = match[3] ? parseInt(match[3]) : 2026;
      if (yr < 100) yr += 2000;
      return new Date(Date.UTC(yr, mon, day));
    }
    return null;
  }

  // Count streaks WITH water_value > 0 vs WITHOUT water_value > 0
  const esrMap = new Map<string, any[]>();
  for (const r of clRows.rows) {
    const key = `${r.scheme_id}_${String(r.village_name).trim().toLowerCase()}_${String(r.esr_name).trim().toLowerCase()}`;
    const d = parseDate(String(r.chlorine_date));
    if (!d) continue;
    if (!esrMap.has(key)) esrMap.set(key, []);
    const arr = esrMap.get(key)!;
    if (!arr.some(x => x.date.getTime() === d.getTime())) {
      arr.push({
        date: d,
        cl: r.chlorine_value !== null ? parseFloat(String(r.chlorine_value)) : null,
        water: r.water_value !== null ? parseFloat(String(r.water_value)) : 0
      });
    }
  }

  let streakWithWater20 = 0;
  let streakWithoutWaterCheck20 = 0;

  esrMap.forEach((records) => {
    records.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (records.length === 0) return;

    // A: With water check (current streak engine)
    const latestA = records[0];
    if (latestA.cl !== null && !isNaN(latestA.cl) && (latestA.cl < 0.2 || latestA.cl > 0.5) && latestA.water > 0) {
      let streak = 1;
      let prevDate = latestA.date;
      for (let i = 1; i < records.length; i++) {
        const curr = records[i];
        const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));
        if (diffDays === 1 && curr.cl !== null && !isNaN(curr.cl) && (curr.cl < 0.2 || curr.cl > 0.5) && curr.water > 0) {
          streak++;
          prevDate = curr.date;
        } else break;
      }
      if (streak >= 20) streakWithWater20++;
    }

    // B: Without water check (pure chlorine < 0.2 or > 0.5 regardless of water delivery)
    const latestB = records[0];
    if (latestB.cl !== null && !isNaN(latestB.cl) && (latestB.cl < 0.2 || latestB.cl > 0.5)) {
      let streak = 1;
      let prevDate = latestB.date;
      for (let i = 1; i < records.length; i++) {
        const curr = records[i];
        const diffDays = Math.round((prevDate.getTime() - curr.date.getTime()) / (1000 * 86400));
        if (diffDays === 1 && curr.cl !== null && !isNaN(curr.cl) && (curr.cl < 0.2 || curr.cl > 0.5)) {
          streak++;
          prevDate = curr.date;
        } else break;
      }
      if (streak >= 20) streakWithoutWaterCheck20++;
    }
  });

  console.log("Operational schemes streak >= 20 WITH water check:", streakWithWater20);
  console.log("Operational schemes streak >= 20 WITHOUT water check:", streakWithoutWaterCheck20);

  // 3. What about the 81 and 2 from DetailedChlorinePage? Where do they come from?
  // Let's call storage.getChlorineDayWiseBreakdown() directly!
  const { storage } = await import('../server/storage');
  const breakdown = await storage.getChlorineDayWiseBreakdown(undefined, undefined);
  const row20 = breakdown.find(r => r.days === 20);
  console.log("DetailedChlorinePage Day 20 breakdown:", row20);
}

run();
