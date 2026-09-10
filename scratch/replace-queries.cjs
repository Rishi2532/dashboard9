const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/server/routes/chlorine-routes.ts';
let content = fs.readFileSync(path, 'utf8');

// We have three places where this CTE is used:
// 1. /scheme-lpcd/division-summary
// 2. /scheme-lpcd/division-details/:division/:metric
// 3. /scheme-lpcd/division-details-export/:division/:metric

const oldCTE1 = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, division, scheme_id, block, lpcd_value, water_value, data_date
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
            \${regionFilter}
            \${schemeIdFilter}
          ORDER BY region, scheme_id, block, 
            CASE 
              WHEN data_date ~ '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END DESC, uploaded_at DESC
        )`;

const newCTE1 = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, division, scheme_id, block, lpcd_value_day7 as lpcd_value, water_value_day7 as water_value
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            \${regionFilter}
            \${schemeIdFilter}
        )`;

const oldCTE2 = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value, lpcd_value, data_date, dashboard_url
          FROM scheme_lpcd_data_history
          WHERE region IS NOT NULL
            AND division = $1
            \${regionFilter}
            \${schemeIdFilter}
          ORDER BY region, scheme_id, block, 
            CASE 
              WHEN data_date ~ '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END DESC, uploaded_at DESC
        )`;

const newCTE2 = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, population as total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value_day7 as water_value, lpcd_value_day7 as lpcd_value, dashboard_url
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            AND division = $1
            \${regionFilter}
            \${schemeIdFilter}
        )`;


content = content.replace(oldCTE1, newCTE1);
content = content.replace(oldCTE2, newCTE2);
// Replacing export endpoint (it uses the same oldCTE2)
content = content.replace(oldCTE2, newCTE2);

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced query contents successfully.');
