import dotenv from 'dotenv';
dotenv.config();
import { getEscalationStatus } from './server/services/escalation-service';

async function test() {
  const res = await getEscalationStatus();
  console.log('Total schemes returned:', res.schemes.length);
  [1, 2, 3, 4, 5].forEach(level => {
    const minDays = level === 1 ? 1 : level === 2 ? 3 : level === 3 ? 7 : level === 4 ? 10 : 15;
    let lpcd = 0, cl = 0, pr = 0, off = 0;
    const schemesForLevel = new Set();
    res.schemes.forEach(s => {
      (s.lpcd_villages || []).forEach(v => {
        const days = v.days_count || s.max_streak_days || 1;
        if (days >= minDays) { lpcd++; schemesForLevel.add(s.scheme_id); }
      });
      (s.chlorine_low_esrs || []).forEach(c => {
        const days = c.days_count || s.max_streak_days || 1;
        if (days >= minDays) { cl++; schemesForLevel.add(s.scheme_id); }
      });
      (s.chlorine_high_esrs || []).forEach(c => {
        const days = c.days_count || s.max_streak_days || 1;
        if (days >= minDays) { cl++; schemesForLevel.add(s.scheme_id); }
      });
      (s.pressure_low_esrs || []).forEach(p => {
        const days = p.days_count || s.max_streak_days || 1;
        if (days >= minDays) { pr++; schemesForLevel.add(s.scheme_id); }
      });
      (s.offline_esrs || []).forEach(o => {
        const days = o.days_count || s.max_streak_days || 1;
        if (days >= minDays) { off++; schemesForLevel.add(s.scheme_id); }
      });
    });
    console.log(`Level ${level} (>= ${minDays} days): Schemes: ${schemesForLevel.size}, LPCD: ${lpcd}, Chlorine: ${cl}, Pressure: ${pr}, Offline: ${off}, Total: ${lpcd+cl+pr+off}`);
  });
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
