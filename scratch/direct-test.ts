import { getEscalationStatus } from '../server/services/escalation-service';

async function test() {
  const { summary, schemes } = await getEscalationStatus();
  console.log('Schemes count:', schemes.length);
  const totalLpcd = schemes.reduce((acc, s) => acc + (s.lpcd_villages ? s.lpcd_villages.length : 0), 0);
  const totalClLow = schemes.reduce((acc, s) => acc + (s.chlorine_low_esrs ? s.chlorine_low_esrs.length : 0), 0);
  const totalClHigh = schemes.reduce((acc, s) => acc + (s.chlorine_high_esrs ? s.chlorine_high_esrs.length : 0), 0);
  const totalPr = schemes.reduce((acc, s) => acc + (s.pressure_low_esrs ? s.pressure_low_esrs.length : 0), 0);
  const totalOff = schemes.reduce((acc, s) => acc + (s.offline_esrs ? s.offline_esrs.length : 0), 0);

  console.log('Escalation Portal metrics:');
  console.log('Total LPCD Villages:', totalLpcd);
  console.log('Total Chlorine Sensors (Low + High):', totalClLow + totalClHigh, `(${totalClLow} Low + ${totalClHigh} High)`);
  console.log('Total Pressure Sensors:', totalPr);
  console.log('Total Offline Sensors:', totalOff);
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
