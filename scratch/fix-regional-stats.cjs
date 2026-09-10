const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/server/routes/chlorine-routes.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace the regional-stats CTEs
// Currently it uses water_scheme_data. We'll simplify it to use scheme_lpcd for current stats
// And keep scheme_lpcd_data_history for the streaks.

const oldRegionalQueryPattern = /WITH village_counts AS \([\s\S]*?FROM scheme_stats f_ss\s+LEFT JOIN consecutive_below_55 f_cb ON f_ss.region = f_cb.region\s+WHERE f_ss.region IS NOT NULL\s+ORDER BY f_ss.region\s+`;/m;

const newRegionalQuery = `WITH latest_scheme_data AS (
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
        ),
        -- Improved historical below-55 day counts using consecutive streak detection
        history_parsed AS (
          SELECT 
            hp_h.region, hp_h.scheme_name,
            CASE 
              WHEN hp_h.data_date::text ~ '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' THEN hp_h.data_date::date
              WHEN hp_h.data_date::text ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(hp_h.data_date::text, 'DD-Mon-YY')
              WHEN hp_h.data_date::text ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(hp_h.data_date::text || '-' || TO_CHAR(COALESCE(hp_h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(hp_h.uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(hp_h.data_date::text || '-' || (TO_CHAR(COALESCE(hp_h.uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(hp_h.data_date::text || '-' || TO_CHAR(COALESCE(hp_h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date,
            hp_h.lpcd_value as lpcd
          FROM scheme_lpcd_data_history hp_h
          WHERE hp_h.region IS NOT NULL AND hp_h.data_date IS NOT NULL
        ),
        history_ranked AS (
          SELECT 
            hr_d.region, hr_d.scheme_name, hr_d.lpcd, hr_d.parsed_date,
            ROW_NUMBER() OVER (PARTITION BY hr_d.scheme_name ORDER BY hr_d.parsed_date DESC) as rn
          FROM (
            SELECT DISTINCT ON (hr_p.scheme_name, hr_p.parsed_date)
              hr_p.region, hr_p.scheme_name, hr_p.lpcd, hr_p.parsed_date
            FROM history_parsed hr_p
            WHERE hr_p.parsed_date IS NOT NULL
            ORDER BY hr_p.scheme_name, hr_p.parsed_date DESC
          ) hr_d
        ),
        streak_groups AS (
          SELECT
            sg_orig.region, sg_orig.scheme_name, sg_orig.rn, sg_orig.lpcd,
            sg_orig.rn - ROW_NUMBER() OVER (PARTITION BY sg_orig.scheme_name, (CASE WHEN sg_orig.lpcd < 55 AND sg_orig.lpcd > 0 THEN 1 ELSE 0 END) ORDER BY sg_orig.rn) as grp
          FROM history_ranked sg_orig
          WHERE sg_orig.lpcd IS NOT NULL
        ),
        current_streaks AS (
          SELECT 
            cs_sg.region, cs_sg.scheme_name, 
            COUNT(*) as streak_length
          FROM streak_groups cs_sg
          JOIN (
            SELECT latest_sg.scheme_name, latest_sg.grp 
            FROM streak_groups latest_sg
            WHERE latest_sg.rn = 1 AND latest_sg.lpcd < 55 AND latest_sg.lpcd > 0
          ) latest ON cs_sg.scheme_name = latest.scheme_name AND cs_sg.grp = latest.grp
          GROUP BY cs_sg.region, cs_sg.scheme_name
        ),
        consecutive_below_55 AS (
          SELECT
            cb_cs.region,
            COUNT(CASE WHEN cb_cs.streak_length >= 3 THEN 1 END) as below_55_3days,
            COUNT(CASE WHEN cb_cs.streak_length >= 7 THEN 1 END) as below_55_7days,
            COUNT(CASE WHEN cb_cs.streak_length >= 30 THEN 1 END) as below_55_30days
          FROM current_streaks cb_cs
          GROUP BY cb_cs.region
        )
        SELECT 
          f_ss.region,
          COALESCE(f_ss.total_schemes, 0) as total_schemes,
          COALESCE(f_ss.total_population, 0) as total_population,
          COALESCE(f_ss.total_villages, 0) as total_villages,
          COALESCE(f_ss.schemes_above_55, 0) as schemes_above_55,
          COALESCE(f_ss.schemes_below_55, 0) as schemes_below_55,
          COALESCE(f_ss.schemes_no_supply, 0) as schemes_no_supply,
          COALESCE(f_cb.below_55_3days, 0) as below_55_3days,
          COALESCE(f_cb.below_55_7days, 0) as below_55_7days,
          COALESCE(f_cb.below_55_30days, 0) as below_55_30days
        FROM scheme_stats f_ss
        LEFT JOIN consecutive_below_55 f_cb ON f_ss.region = f_cb.region
        WHERE f_ss.region IS NOT NULL
        ORDER BY f_ss.region
      \`;`;

let newContent = content.replace(oldRegionalQueryPattern, newRegionalQuery);
if (newContent === content) {
    console.error("Failed to replace regional-stats query");
} else {
    content = newContent;
}

// Now replace details base query
const oldBaseQueryPattern = /const baseQuery = `\s*SELECT DISTINCT ON \(sldh\.scheme_name\)[\s\S]*?END DESC, sldh\.uploaded_at DESC\s*`;/m;
const newBaseQuery = `const baseQuery = \`
        SELECT DISTINCT ON (sldh.scheme_name, sldh.region, sldh.scheme_id, sldh.block)
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
        ORDER BY sldh.scheme_name, sldh.region, sldh.scheme_id, sldh.block
      \`;`;

// There are TWO occurrences of baseQuery: one for details and one for details-export
newContent = content.replace(oldBaseQueryPattern, newBaseQuery);
if (newContent === content) {
    console.error("Failed to replace first details query");
} else {
    content = newContent;
}

newContent = content.replace(oldBaseQueryPattern, newBaseQuery);
if (newContent === content) {
    console.error("Failed to replace second details query");
} else {
    content = newContent;
}

// Now replace the case statement logic in details
// case 'schemesAbove55'
content = content.replace(/WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 55/g, 'WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric >= 55');
// case 'schemesBelow55'
content = content.replace(/WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 0 AND lpcd_value::numeric <= 55/g, 'WHERE ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0)) AND (lpcd_value IS NULL OR lpcd_value::numeric < 55)');
// case 'schemesNoSupply'
content = content.replace(/WHERE lpcd_value IS NULL OR lpcd_value::numeric = 0/g, 'WHERE (water_value IS NULL OR water_value::numeric = 0) AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)');

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated regional stats and details endpoints');
