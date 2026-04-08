
const fs = require('fs');
const path = 'server/routes/chlorine-routes.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const newCode = [
  '      const latestDateResult = await client.query(`',
  '        SELECT MAX(uploaded_at) as latest_date FROM scheme_lpcd_data_history',
  '      `);',
  '      const latestDate = latestDateResult.rows[0]?.latest_date || new Date().toISOString();',
  '',
  '      const query = `',
  '        WITH ranked_history AS (',
  '          SELECT ',
  '            h.scheme_id, h.block, h.lpcd_value, h.total_population, h.data_date, h.uploaded_at,',
  '            CASE ',
  '              WHEN h.data_date ~ \'^\\\\d{4}-\\\\d{2}-\\\\d{2}$\' THEN h.data_date::date',
  '              WHEN h.data_date ~ \'^[0-9]+-[A-Za-z]+-[0-9]+$\' THEN TO_DATE(h.data_date, \'DD-Mon-YY\')',
  '              WHEN h.data_date ~ \'^[0-9]+-[A-Za-z]+$\' THEN ',
  '                CASE',
  '                  WHEN TO_DATE(h.data_date || \'-\' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), \'YYYY\'), \'DD-Mon-YYYY\') > (COALESCE(h.uploaded_at, CURRENT_DATE) + interval \'1 month\')',
  '                  THEN TO_DATE(h.data_date || \'-\' || (TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), \'YYYY\')::int - 1), \'DD-Mon-YYYY\')',
  '                  ELSE TO_DATE(h.data_date || \'-\' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), \'YYYY\'), \'DD-Mon-YYYY\')',
  '                END',
  '              ELSE NULL ',
  '            END as parsed_date',
  '          FROM scheme_lpcd_data_history h',
  '        ),',
  '        latest_ranks AS (',
  '          SELECT rh.*,',
  '            ROW_NUMBER() OVER (PARTITION BY scheme_id, block ORDER BY parsed_date DESC NULLS LAST, uploaded_at DESC) as rn',
  '          FROM ranked_history rh',
  '          WHERE parsed_date IS NOT NULL',
  '        ),',
  '        latest_scheme_data AS (',
  '          SELECT lr.*, ss.region, ss.circle, ss.division, ss.sub_division, ss.agency_type, ss.fully_completion_scheme_status, ss.water_supply',
  '          FROM latest_ranks lr',
  '          LEFT JOIN scheme_status ss ON lr.scheme_id = ss.scheme_id AND lr.block = ss.block',
  '          WHERE rn = 1',
  '        )',
  '        SELECT ',
  '          region,',
  '          COUNT(*) as total_schemes,',
  '          SUM(CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END) as above_55,',
  '          SUM(CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END) as below_55,',
  '          SUM(CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END) as with_water,',
  '          SUM(CASE WHEN lpcd_value = 0 OR lpcd_value IS NULL THEN 1 ELSE 0 END) as no_water',
  '        FROM ',
  '          latest_scheme_data',
  '        WHERE region IS NOT NULL',
  '        ${schemeIdFilter.replace(\'calculated.scheme_id\', \'scheme_id\')}',
  '        GROUP BY region',
  '        ORDER BY region',
  '      `;'
];

// Lines 7011 to 7157 (roughly)
// 7011 is index 7010
// We need to find the actual end line.
// In previous view_file, line 7147 was "FROM (".
// Let's check where the query string ends. It usually ends with "`;".

let endIdx = 7010;
while (endIdx < lines.length && !lines[endIdx].includes('`;')) {
  endIdx++;
}
// Include the closing tag line
endIdx++;

lines.splice(7010, endIdx - 7010, ...newCode);

fs.writeFileSync(path, lines.join('\n'));
console.log('Successfully refactored region-comparison at line 7011');
