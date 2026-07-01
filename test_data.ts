import { getMonthlyChlorineData, getMonthlyPressureData } from './server/routes/monthly-reports-helpers';

async function run() {
  try {
    const data = await getMonthlyChlorineData({ report_month: '2026-03', region: 'all' });
    console.log("Chlorine data generated, tables:", data.chlorineCommissionedSchemes.length);
    console.log("First table rows:", data.chlorineCommissionedSchemes[0]?.rows.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
