const fs = require('fs');
let code = fs.readFileSync('server/storage.ts', 'utf8');

const regexMap = [
  {
    find: /cd\.dashboard_url\s+FROM communication_status cs\s+LEFT JOIN chlorine_data cd ON \(/g,
    replace: `cd.dashboard_url, ss_status.agency_type
          FROM communication_status cs
          LEFT JOIN scheme_status ss_status ON cs.scheme_id = ss_status.scheme_id
          LEFT JOIN chlorine_data cd ON (`
  },
  {
    find: /lr\.latest_chlorine_date,\s*cd\.dashboard_url\s*FROM sensor_streaks ss\s*JOIN communication_status cs ON \(\s*ss\.scheme_id = cs\.scheme_id\s*AND ss\.village_name = cs\.village_name\s*AND ss\.esr_name = cs\.esr_name\s*\)\s*LEFT JOIN latest_readings lr ON/g,
    replace: `lr.latest_chlorine_date,
            cd.dashboard_url,
            ss_status.agency_type
          FROM sensor_streaks ss
          JOIN communication_status cs ON (
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )
          LEFT JOIN scheme_status ss_status ON ss.scheme_id = ss_status.scheme_id
          LEFT JOIN latest_readings lr ON`
  },
  {
    find: /pd\.pressure_date_day_7 as latest_pressure_date,\s*pd\.dashboard_url\s*FROM communication_status cs\s*LEFT JOIN pressure_data pd ON \(/g,
    replace: `pd.pressure_date_day_7 as latest_pressure_date,
            pd.dashboard_url,
            ss_status.agency_type
          FROM communication_status cs
          LEFT JOIN scheme_status ss_status ON cs.scheme_id = ss_status.scheme_id
          LEFT JOIN pressure_data pd ON (`
  },
  {
    find: /lr\.latest_pressure_date,\s*pd\.dashboard_url\s*FROM sensor_streaks ss\s*JOIN communication_status cs ON \(\s*ss\.scheme_id = cs\.scheme_id\s*AND ss\.village_name = cs\.village_name\s*AND ss\.esr_name = cs\.esr_name\s*\)\s*LEFT JOIN latest_readings lr ON/g,
    replace: `lr.latest_pressure_date,
            pd.dashboard_url,
            ss_status.agency_type
          FROM sensor_streaks ss
          JOIN communication_status cs ON (
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )
          LEFT JOIN scheme_status ss_status ON ss.scheme_id = ss_status.scheme_id
          LEFT JOIN latest_readings lr ON`
  },
  {
    find: /dashboard_url: row\.dashboard_url,(\s*\}\))/g,
    replace: `dashboard_url: row.dashboard_url,
          agency_type: row.agency_type,$1`
  }
];

let replaced = 0;
regexMap.forEach(r => {
  const matches = code.match(r.find);
  if (matches) {
    replaced += matches.length;
    code = code.replace(r.find, r.replace);
  }
});

fs.writeFileSync('server/storage.ts', code);
console.log('Replaced', replaced, 'occurrences');
