import { getDB } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { getEscalationStatus } from '../server/services/escalation-service.js';

async function testLevel5Summary() {
  const db = await getDB();
  const { schemes } = await getEscalationStatus({ asOfDate: '18-Oct' });
  console.log('Total schemes in escalation status:', schemes.length);

  // CE / SE dispatches
  const emailRes: any = await db.execute(sql`
    SELECT scheme_ids FROM consolidated_email_dispatches
    WHERE engineer_role IN ('Chief Engineer (CE)', 'Superintending Engineer (SE)')
    ORDER BY dispatch_date DESC LIMIT 50;
  `);

  const dispatchedIds = new Set<string>();
  (emailRes.rows || []).forEach((r: any) => {
    const sids = Array.isArray(r.scheme_ids) ? r.scheme_ids : (r.scheme_ids ? [r.scheme_ids] : []);
    sids.forEach((sid: any) => { if (sid) dispatchedIds.add(String(sid).trim()); });
  });

  const lowLpcdVillages: any[] = [];
  const lowLpcdSchemes: any[] = [];
  const lowPressure: any[] = [];
  const chlorine: any[] = [];

  schemes.forEach((s: any) => {
    const qv = (s.lpcd_villages || []).filter((v: any) => (v.days_count || 1) >= 7);
    if (qv.length > 0) {
      lowLpcdSchemes.push(s.scheme_id);
      qv.forEach((v: any) => lowLpcdVillages.push({ scheme_id: s.scheme_id, village_name: v.village_name }));
    }
    const qp = (s.pressure_low_esrs || []).filter((p: any) => (p.days_count || 1) >= 7);
    qp.forEach((p: any) => lowPressure.push(p));

    const qcl = (s.chlorine_low_esrs || []).filter((c: any) => (c.days_count || 1) >= 7);
    qcl.forEach((c: any) => chlorine.push(c));
    const qch = (s.chlorine_high_esrs || []).filter((c: any) => (c.days_count || 1) >= 7);
    qch.forEach((c: any) => chlorine.push(c));
  });

  console.log('All eligible (streak >= 7): LPCD schemes:', lowLpcdSchemes.length, 'LPCD villages:', lowLpcdVillages.length, 'Pressure:', lowPressure.length, 'Chlorine:', chlorine.length);

  const filteredLpcdVillages = lowLpcdVillages.filter(v => dispatchedIds.has(String(v.scheme_id).trim()));
  const filteredPressure = lowPressure.filter(p => dispatchedIds.has(String(p.scheme_id).trim()));
  const filteredChlorine = chlorine.filter(c => dispatchedIds.has(String(c.scheme_id).trim()));

  console.log('Filtered to dispatched scheme_ids: LPCD villages:', filteredLpcdVillages.length, 'Pressure:', filteredPressure.length, 'Chlorine:', filteredChlorine.length);
}

testLevel5Summary().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
