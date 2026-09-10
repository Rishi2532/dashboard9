const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/server/routes/chlorine-routes.ts';
let content = fs.readFileSync(path, 'utf8');

const applyReplace = (oldStr, newStr) => {
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        return true;
    }
    return false;
};

// 1. Fix `regional-stats`
const oldRegional = `        WITH village_counts AS (
          SELECT 
            vc_wsd.scheme_id,
            vc_wsd.block,
            vc_wsd.village_name,
            CASE WHEN vc_wsd.lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN vc_wsd.lpcd_value_day7 < 55 AND vc_wsd.lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN vc_wsd.lpcd_value_day7 = 0 OR vc_wsd.lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data vc_wsd
        ),
        deduplicated_villages AS (
          SELECT DISTINCT ON (dv_wsd.scheme_id, dv_wsd.block, dv_wsd.village_name)
            dv_wsd.scheme_id, dv_wsd.scheme_name, dv_wsd.region, dv_wsd.circle, dv_wsd.division, dv_wsd.sub_division, dv_wsd.block,
            dv_wsd.village_name, dv_wsd.population,
            dv_wsd.water_value_day1, dv_wsd.water_value_day2, dv_wsd.water_value_day3,
            dv_wsd.water_value_day4, dv_wsd.water_value_day5, dv_wsd.water_value_day6, dv_wsd.water_value_day7
          FROM water_scheme_data dv_wsd
          ORDER BY dv_wsd.scheme_id, dv_wsd.block, dv_wsd.village_name, dv_wsd.lpcd_value_day7 DESC NULLS LAST
        ),
        village_status AS (
          SELECT
            vs_vc.scheme_id, vs_vc.block, vs_vc.village_name,
            MAX(vs_vc.is_above_55) as has_above_55,
            MAX(vs_vc.is_below_55) as has_below_55,
            MAX(vs_vc.is_zero_supply) as has_zero_supply
          FROM village_counts vs_vc
          GROUP BY vs_vc.scheme_id, vs_vc.block, vs_vc.village_name
        ),
        lpcd_aggregation AS (
          SELECT
            la_vs.scheme_id, la_vs.block,
            COUNT(DISTINCT la_vs.village_name) as total_villages,
            SUM(CASE WHEN la_vs.has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN la_vs.has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN la_vs.has_above_55 = 0 AND la_vs.has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status la_vs
          GROUP BY la_vs.scheme_id, la_vs.block
        ),
        scheme_aggregation AS (
          SELECT 
            sa_wsd.scheme_id, sa_wsd.scheme_name, sa_wsd.region, sa_wsd.block,
            SUM(sa_wsd.population) as total_population,
            SUM(sa_wsd.water_value_day7) as total_water_day7,
            sa_la.total_villages, sa_la.villages_above_55, sa_la.villages_below_55, sa_la.villages_zero_supply
          FROM deduplicated_villages sa_wsd
          JOIN lpcd_aggregation sa_la ON sa_wsd.scheme_id = sa_la.scheme_id AND sa_wsd.block = sa_la.block
          GROUP BY sa_wsd.scheme_id, sa_wsd.scheme_name, sa_wsd.region, sa_wsd.block,
            sa_la.total_villages, sa_la.villages_above_55, sa_la.villages_below_55, sa_la.villages_zero_supply
        ),
        scheme_with_lpcd AS (
          SELECT
            swl.scheme_id, swl.scheme_name, swl.region, swl.block,
            swl.total_population, swl.total_villages,
            swl.villages_above_55, swl.villages_below_55, swl.villages_zero_supply,
            CASE WHEN swl.total_population > 0 THEN ROUND((swl.total_water_day7 * 100000) / swl.total_population, 2) ELSE 0 END as lpcd_value_day7
          FROM scheme_aggregation swl
          WHERE swl.region IS NOT NULL
          \${schemeIdFilter ? schemeIdFilter.replace('scheme_id', 'swl.scheme_id') : ''}
        ),
        unique_schemes AS (
          SELECT DISTINCT ON (us.scheme_name)
            us.scheme_id, us.region, us.total_population, us.total_villages, us.lpcd_value_day7, us.scheme_name, us.block
          FROM scheme_with_lpcd us
          WHERE us.scheme_name IS NOT NULL AND BTRIM(us.scheme_name) <> ''
          ORDER BY us.scheme_name, us.block
        ),
        scheme_stats AS (
          SELECT
            ss_us.region,
            COUNT(*) as total_schemes,
            SUM(ss_us.total_population) as total_population,
            SUM(ss_us.total_villages) as total_villages,
            COUNT(CASE WHEN ss_us.lpcd_value_day7 >= 55 THEN 1 END) as schemes_above_55,
            COUNT(CASE WHEN ss_us.lpcd_value_day7 < 55 AND ss_us.lpcd_value_day7 > 0 THEN 1 END) as schemes_below_55,
            COUNT(CASE WHEN ss_us.lpcd_value_day7 = 0 OR ss_us.lpcd_value_day7 IS NULL THEN 1 END) as schemes_no_supply
          FROM unique_schemes ss_us
          GROUP BY ss_us.region
        ),`;

const newRegional = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, scheme_id, block, lpcd_value_day7 as lpcd_value, water_value_day7 as water_value,
            population as total_population, total_villages
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            \${schemeIdFilter}
        ),
        scheme_stats AS (
          SELECT
            region,
            COUNT(DISTINCT scheme_id || '-' || COALESCE(block, '')) as total_schemes,
            SUM(total_population) as total_population,
            SUM(total_villages) as total_villages,
            COUNT(DISTINCT CASE 
              WHEN lpcd_value IS NOT NULL AND lpcd_value::numeric >= 55 
              THEN scheme_id || '-' || COALESCE(block, '')
            END) as schemes_above_55,
            COUNT(DISTINCT CASE 
              WHEN ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0))
                   AND (lpcd_value IS NULL OR lpcd_value::numeric < 55)
              THEN scheme_id || '-' || COALESCE(block, '')
            END) as schemes_below_55,
            COUNT(DISTINCT CASE 
              WHEN (water_value IS NULL OR water_value::numeric = 0) AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)
              THEN scheme_id || '-' || COALESCE(block, '')
            END) as schemes_no_supply
          FROM latest_scheme_data
          GROUP BY region
        ),`;

if (!applyReplace(oldRegional, newRegional)) console.error("Failed to replace regional-stats CTE");

// 2. Fix details endpoints baseQuery
const oldBaseQuery = `        SELECT DISTINCT ON (sldh.scheme_name)
            sldh.region, sldh.circle, sldh.division, sldh.sub_division, sldh.block,
            sldh.scheme_id, sldh.scheme_name, sldh.total_population, sldh.total_villages, 
            sldh.villages_below_55, sldh.villages_above_55, sldh.villages_zero_supply,
            sldh.water_value, sldh.lpcd_value, sldh.data_date, 
            sldh.dashboard_url as history_url,
            ss.dashboard_url as status_url,
            COALESCE(NULLIF(ss.dashboard_url, ''), sldh.dashboard_url) as dashboard_url,
                    ss.agency_type
                FROM scheme_lpcd_data_history sldh
        LEFT JOIN scheme_status ss ON sldh.scheme_id = ss.scheme_id AND sldh.block = ss.block
        WHERE sldh.region IS NOT NULL
          \${regionFilter}
          \${schemeIdFilter}
        ORDER BY sldh.scheme_name, sldh.region, sldh.scheme_id, sldh.block, 
          CASE 
            WHEN sldh.data_date ~ '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' THEN sldh.data_date::date
            WHEN sldh.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(sldh.data_date, 'DD-Mon-YY')
            WHEN sldh.data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
              CASE
                WHEN TO_DATE(sldh.data_date || '-' || TO_CHAR(COALESCE(sldh.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(sldh.uploaded_at, CURRENT_DATE) + interval '1 month')
                THEN TO_DATE(sldh.data_date || '-' || (TO_CHAR(COALESCE(sldh.uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                ELSE TO_DATE(sldh.data_date || '-' || TO_CHAR(COALESCE(sldh.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
              END
            ELSE NULL 
          END DESC, sldh.uploaded_at DESC`;

const newBaseQuery = `        SELECT DISTINCT ON (sldh.scheme_name, sldh.region, sldh.scheme_id, sldh.block)
            sldh.region, sldh.circle, sldh.division, sldh.sub_division, sldh.block,
            sldh.scheme_id, sldh.scheme_name, sldh.population as total_population, sldh.total_villages, 
            sldh.villages_below_55, sldh.villages_above_55, sldh.villages_zero_supply,
            sldh.water_value_day7 as water_value, sldh.lpcd_value_day7 as lpcd_value, 
            sldh.dashboard_url as history_url,
            ss.dashboard_url as status_url,
            COALESCE(NULLIF(ss.dashboard_url, ''), sldh.dashboard_url) as dashboard_url,
                    ss.agency_type
                FROM scheme_lpcd sldh
        LEFT JOIN scheme_status ss ON sldh.scheme_id = ss.scheme_id AND sldh.block = ss.block
        WHERE sldh.region IS NOT NULL
          \${regionFilter}
          \${schemeIdFilter}
        ORDER BY sldh.scheme_name, sldh.region, sldh.scheme_id, sldh.block`;

if (!applyReplace(oldBaseQuery, newBaseQuery)) console.error("Failed to replace details baseQuery 1");
if (!applyReplace(oldBaseQuery, newBaseQuery)) console.error("Failed to replace details baseQuery 2"); // for export

// 3. Fix cases in details & details-export (above55, below55, noSupply)
// They are exactly matching, so I can just replace them globally (they appear 2 times each).
// Above 55
const above55Old = `WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 55`;
const above55New = `WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric >= 55`;
applyReplace(above55Old, above55New);
applyReplace(above55Old, above55New);

// Below 55
const below55Old = `WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 0 AND lpcd_value::numeric <= 55`;
const below55New = `WHERE ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0)) AND (lpcd_value IS NULL OR lpcd_value::numeric < 55)`;
applyReplace(below55Old, below55New);
applyReplace(below55Old, below55New);

// No Supply
const noSupplyOld = `WHERE lpcd_value IS NULL OR lpcd_value::numeric = 0`;
const noSupplyNew = `WHERE (water_value IS NULL OR water_value::numeric = 0) AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)`;
applyReplace(noSupplyOld, noSupplyNew);
applyReplace(noSupplyOld, noSupplyNew);

// 4. division-summary
const oldDivSumCTE = `        WITH latest_scheme_data AS (
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
const newDivSumCTE = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, division, scheme_id, block, lpcd_value_day7 as lpcd_value, water_value_day7 as water_value
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            \${regionFilter}
            \${schemeIdFilter}
        )`;
if (!applyReplace(oldDivSumCTE, newDivSumCTE)) console.error("Failed to replace division-summary CTE");

// 5. division-details and division-details-export
const oldDivDetailsCTE = `        WITH latest_scheme_data AS (
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
const newDivDetailsCTE = `        WITH latest_scheme_data AS (
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
if (!applyReplace(oldDivDetailsCTE, newDivDetailsCTE)) console.error("Failed to replace division-details CTE");

const oldDivDetailsExportCTE = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value, lpcd_value, data_date
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
const newDivDetailsExportCTE = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, population as total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value_day7 as water_value, lpcd_value_day7 as lpcd_value
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            AND division = $1
            \${regionFilter}
            \${schemeIdFilter}
        )`;
if (!applyReplace(oldDivDetailsExportCTE, newDivDetailsExportCTE)) console.error("Failed to replace division-details-export CTE");


fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated all endpoints');
