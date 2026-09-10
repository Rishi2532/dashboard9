const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/server/routes/chlorine-routes.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// 1. regional-stats CTE (lines 5354 to 5433 approx)
let start1 = lines.findIndex((l, i) => i > 5330 && l.includes('WITH village_counts AS ('));
let end1 = lines.findIndex((l, i) => i > start1 && l.includes('scheme_stats AS ('));
end1 = lines.findIndex((l, i) => i > end1 && l.includes('GROUP BY ss_us.region'));
end1 = lines.findIndex((l, i) => i > end1 && l.includes('),'));

if (start1 !== -1 && end1 !== -1) {
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
    lines.splice(start1, end1 - start1 + 1, newRegional);
} else {
    console.error("Failed to find regional-stats bounds");
}

// Re-join to string for the other replaces since they are simpler
let content = lines.join('\n');

// Replace details base query
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

content = content.replace(/SELECT DISTINCT ON \(sldh\.scheme_name\)[\s\S]*?END DESC, sldh\.uploaded_at DESC/g, newBaseQuery.trim());


content = content.replace(/WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 55/g, 'WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric >= 55');
content = content.replace(/WHERE lpcd_value IS NOT NULL AND lpcd_value::numeric > 0 AND lpcd_value::numeric <= 55/g, 'WHERE ((water_value IS NOT NULL AND water_value::numeric > 0) OR (lpcd_value IS NOT NULL AND lpcd_value::numeric > 0)) AND (lpcd_value IS NULL OR lpcd_value::numeric < 55)');
content = content.replace(/WHERE lpcd_value IS NULL OR lpcd_value::numeric = 0/g, 'WHERE (water_value IS NULL OR water_value::numeric = 0) AND (lpcd_value IS NULL OR lpcd_value::numeric = 0)');

const newDivSumCTE = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, division, scheme_id, block, lpcd_value_day7 as lpcd_value, water_value_day7 as water_value
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            \${regionFilter}
            \${schemeIdFilter}
        )`;
content = content.replace(/WITH latest_scheme_data AS \([\s\S]*?SELECT DISTINCT ON \(region, scheme_id, block\)\s*region, division, scheme_id, block, lpcd_value, water_value, data_date[\s\S]*?END DESC, uploaded_at DESC\s*\)/, newDivSumCTE);


const newDivDetailsCTE = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, population as total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value_day7 as water_value, lpcd_value_day7 as lpcd_value, dashboard_url
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            AND division = \$1
            \${regionFilter}
            \${schemeIdFilter}
        )`;
content = content.replace(/WITH latest_scheme_data AS \([\s\S]*?SELECT DISTINCT ON \(region, scheme_id, block\)\s*region, circle, division, sub_division, block,\s*scheme_id, scheme_name, total_population, total_villages,\s*villages_below_55, villages_above_55, villages_zero_supply,\s*water_value, lpcd_value, data_date, dashboard_url[\s\S]*?END DESC, uploaded_at DESC\s*\)/, newDivDetailsCTE);

const newDivDetailsExportCTE = `        WITH latest_scheme_data AS (
          SELECT DISTINCT ON (region, scheme_id, block)
            region, circle, division, sub_division, block,
            scheme_id, scheme_name, population as total_population, total_villages,
            villages_below_55, villages_above_55, villages_zero_supply,
            water_value_day7 as water_value, lpcd_value_day7 as lpcd_value
          FROM scheme_lpcd
          WHERE region IS NOT NULL
            AND division = \$1
            \${regionFilter}
            \${schemeIdFilter}
        )`;
content = content.replace(/WITH latest_scheme_data AS \([\s\S]*?SELECT DISTINCT ON \(region, scheme_id, block\)\s*region, circle, division, sub_division, block,\s*scheme_id, scheme_name, total_population, total_villages,\s*villages_below_55, villages_above_55, villages_zero_supply,\s*water_value, lpcd_value, data_date[\s\S]*?END DESC, uploaded_at DESC\s*\)/, newDivDetailsExportCTE);


fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated all endpoints securely');
