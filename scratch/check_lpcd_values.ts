import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkLpcdValues() {
  const db = await getDB();
  
  const res = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    )
    SELECT 
      h.scheme_id, h.village_name,
      COUNT(*) as total_days,
      COUNT(*) FILTER (WHERE CAST(h.lpcd_value AS numeric) = 0) as zero_days,
      COUNT(*) FILTER (WHERE CAST(h.lpcd_value AS numeric) > 0 AND CAST(h.lpcd_value AS numeric) < 55) as low_days,
      COUNT(*) FILTER (WHERE CAST(h.lpcd_value AS numeric) >= 55) as compliant_days,
      AVG(CAST(h.lpcd_value AS numeric)) as avg_lpcd,
      MAX(CAST(h.lpcd_value AS numeric)) as max_lpcd
    FROM water_scheme_data_history h
    JOIN op_schemes ss ON ss.scheme_id = h.scheme_id
    WHERE h.data_date IN (
      '19-Oct','18-Oct','17-Oct','16-Oct','15-Oct','14-Oct','13-Oct','12-Oct',
      '11-Oct','10-Oct','09-Oct','08-Oct','07-Oct','06-Oct','05-Oct','04-Oct',
      '03-Oct','02-Oct','01-Oct','30-Sep','29-Sep','28-Sep','27-Sep','26-Sep',
      '25-Sep','24-Sep','23-Sep','22-Sep','21-Sep','20-Sep','19-Sep','18-Sep',
      '17-Sep','16-Sep','15-Sep'
    )
    GROUP BY h.scheme_id, h.village_name
    HAVING COUNT(*) FILTER (WHERE CAST(h.lpcd_value AS numeric) >= 55) = 0
    ORDER BY zero_days DESC
    LIMIT 20;
  `);

  console.log(`Found ${res.rows.length} sample villages with ZERO compliant days (always < 55):`);
  console.table(res.rows.map(r => ({
    scheme: r.scheme_id,
    village: r.village_name,
    total_days: r.total_days,
    zero_days: r.zero_days,
    low_days: r.low_days,
    compliant_days: r.compliant_days,
    max_lpcd: Number(r.max_lpcd).toFixed(1)
  })));

  // Total villages that have 0 compliant days across this 35-day period:
  const totalAlwaysBreached = await db.execute(sql`
    WITH op_schemes AS (
      SELECT scheme_id FROM scheme_status WHERE water_supply = 'Yes'
    ),
    village_stats AS (
      SELECT 
        h.scheme_id, LOWER(TRIM(h.village_name)) as vname,
        COUNT(DISTINCT h.data_date) as days_count,
        COUNT(DISTINCT CASE WHEN CAST(h.lpcd_value AS numeric) >= 55 THEN h.data_date END) as compliant_days
      FROM water_scheme_data_history h
      JOIN op_schemes ss ON ss.scheme_id = h.scheme_id
      WHERE h.data_date IN (
        '19-Oct','18-Oct','17-Oct','16-Oct','15-Oct','14-Oct','13-Oct','12-Oct',
        '11-Oct','10-Oct','09-Oct','08-Oct','07-Oct','06-Oct','05-Oct','04-Oct',
        '03-Oct','02-Oct','01-Oct','30-Sep','29-Sep','28-Sep','27-Sep','26-Sep',
        '25-Sep','24-Sep','23-Sep','22-Sep','21-Sep','20-Sep','19-Sep','18-Sep',
        '17-Sep','16-Sep','15-Sep'
      )
      GROUP BY h.scheme_id, LOWER(TRIM(h.village_name))
    )
    SELECT 
      COUNT(*) as total_villages_with_data,
      COUNT(*) FILTER (WHERE compliant_days = 0 AND days_count >= 20) as never_compliant_20_plus_days,
      COUNT(*) FILTER (WHERE compliant_days = 0 AND days_count >= 35) as never_compliant_all_35_days
    FROM village_stats;
  `);
  console.log("\nSummary across all operational villages:", totalAlwaysBreached.rows[0]);

  process.exit(0);
}

checkLpcdValues().catch(console.error);
