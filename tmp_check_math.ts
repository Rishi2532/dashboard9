import { getDB } from './server/db';

async function checkLpcdMath() {
  const db = await getDB();
  const scheme_id = '20030287';
  const village_name = 'Dahigaon';
  const dates = ['16-Mar', '17-Mar', '18-Mar', '19-Mar', '20-Mar', '21-Mar', '22-Mar'];

  console.log(`Checking LPCD data for Scheme ${scheme_id}, Village ${village_name}...`);

  const query = `
    SELECT data_date, lpcd_value, uploaded_at
    FROM water_scheme_data_history
    WHERE scheme_id = $1 AND village_name ILIKE $2 AND data_date = ANY($3)
    ORDER BY data_date, uploaded_at DESC;
  `;

  const result = await db.execute(query, [scheme_id, village_name, dates]);
  
  console.log('Results:');
  console.table(result.rows);

  // Deduplication logic check (DISTINCT ON (data_date))
  const dayMap = new Map();
  result.rows.forEach(row => {
    if (!dayMap.has(row.data_date)) {
      dayMap.set(row.data_date, row.lpcd_value);
    }
  });

  const uniqueValues = Array.from(dayMap.values());
  const numericValues = uniqueValues
    .map(v => v === 'NaN' ? null : parseFloat(v))
    .filter(v => v !== null && !isNaN(v));

  const sum = numericValues.reduce((a, b) => a + b, 0);
  const avg_div_7 = sum / 7.0;
  const avg_div_count = sum / numericValues.length;

  console.log(`Deduplicated Values: ${numericValues.join(', ')}`);
  console.log(`Sum: ${sum}`);
  console.log(`Count of days with data: ${numericValues.length}`);
  console.log(`Average (Sum / 7.0): ${avg_div_7}`);
  console.log(`Average (Sum / ${numericValues.length}): ${avg_div_count}`);
}

checkLpcdMath().catch(console.error).finally(() => process.exit());
