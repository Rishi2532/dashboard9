const fs = require('fs');

const path = 'server/storage.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace in Chlorine offline query
code = code.replace(
  `            cd.dashboard_url
          FROM communication_status cs
          LEFT JOIN chlorine_data cd ON (`,
  `            cd.dashboard_url,
            ss_status.agency_type
          FROM communication_status cs
          LEFT JOIN scheme_status ss_status ON cs.scheme_id = ss_status.scheme_id
          LEFT JOIN chlorine_data cd ON (`
);

// Replace in Chlorine other query
code = code.replace(
  `            lr.latest_chlorine_date,
            cd.dashboard_url
          FROM sensor_streaks ss
          JOIN communication_status cs ON (`,
  `            lr.latest_chlorine_date,
            cd.dashboard_url,
            ss_status.agency_type
          FROM sensor_streaks ss
          JOIN communication_status cs ON (
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )
          LEFT JOIN scheme_status ss_status ON ss.scheme_id = ss_status.scheme_id
          /* REPLACED_CS_ON */
          `
);
code = code.replace(`          /* REPLACED_CS_ON */
          
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )`, ``);

// Now map agency_type in Chlorine
code = code.replace(
  /dashboard_url: row\.dashboard_url,\s*\}\)/g,
  `dashboard_url: row.dashboard_url,
          agency_type: row.agency_type,
        })`
);

// Pressure offline query
code = code.replace(
  `            pd.latest_pressure_date,
            pd.dashboard_url
          FROM communication_status cs
          LEFT JOIN pressure_data pd ON (`,
  `            pd.latest_pressure_date,
            pd.dashboard_url,
            ss_status.agency_type
          FROM communication_status cs
          LEFT JOIN scheme_status ss_status ON cs.scheme_id = ss_status.scheme_id
          LEFT JOIN pressure_data pd ON (`
);
code = code.replace(
  `            pd.pressure_date_day_7 as latest_pressure_date,
            pd.dashboard_url
          FROM communication_status cs
          LEFT JOIN pressure_data pd ON (`,
  `            pd.pressure_date_day_7 as latest_pressure_date,
            pd.dashboard_url,
            ss_status.agency_type
          FROM communication_status cs
          LEFT JOIN scheme_status ss_status ON cs.scheme_id = ss_status.scheme_id
          LEFT JOIN pressure_data pd ON (`
);

// Pressure other query
code = code.replace(
  `            lr.latest_pressure_date,
            pd.dashboard_url
          FROM sensor_streaks ss
          JOIN communication_status cs ON (`,
  `            lr.latest_pressure_date,
            pd.dashboard_url,
            ss_status.agency_type
          FROM sensor_streaks ss
          JOIN communication_status cs ON (
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )
          LEFT JOIN scheme_status ss_status ON ss.scheme_id = ss_status.scheme_id
          /* REPLACED_CS_ON_P */
          `
);
code = code.replace(`          /* REPLACED_CS_ON_P */
          
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )`, ``);

fs.writeFileSync(path, code);
console.log('Patched storage.ts');
