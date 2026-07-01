const fs = require('fs');
let code = fs.readFileSync('server/storage.ts', 'utf8');

const regex = /pd\.pressure_date_day_7 as latest_pressure_date,\s*pd\.dashboard_url\s*FROM sensor_streaks ss\s*JOIN communication_status cs ON \(\s*ss\.scheme_id = cs\.scheme_id\s*AND ss\.village_name = cs\.village_name\s*AND ss\.esr_name = cs\.esr_name\s*\)\s*LEFT JOIN pressure_data pd ON/g;

const matches = code.match(regex);
if (matches) {
  code = code.replace(regex, `pd.pressure_date_day_7 as latest_pressure_date,
            pd.dashboard_url,
            ss_status.agency_type
          FROM sensor_streaks ss
          JOIN communication_status cs ON (
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )
          LEFT JOIN scheme_status ss_status ON ss.scheme_id = ss_status.scheme_id
          LEFT JOIN pressure_data pd ON`);
  fs.writeFileSync('server/storage.ts', code);
  console.log('Patched pressure non-offline query');
} else {
  console.log('Regex not matched');
}
