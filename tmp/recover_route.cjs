
const fs = require('fs');
const path = 'server/routes/chlorine-routes.ts';
let content = fs.readFileSync(path, 'utf8');

// Define the correct route code
const correctRouteCode = `
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();

    try {
      // Get latest data date from history
      const latestDateResult = await client.query(\`
        SELECT MAX(uploaded_at) as latest_date FROM scheme_lpcd_data_history
      \`);
      const latestDate = latestDateResult.rows[0]?.latest_date || new Date().toISOString();

      const query = \`
        WITH ranked_history AS (
          SELECT 
            h.scheme_id, h.block, h.lpcd_value, h.total_population, h.data_date, h.uploaded_at,
            CASE 
              WHEN h.data_date ~ '^\\\\d{4}-\\\\d{2}-\\\\d{2}$' THEN h.data_date::date
              WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
              WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(h.data_date || '-' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(h.uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(h.data_date || '-' || (TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(h.data_date || '-' || TO_CHAR(COALESCE(h.uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              ELSE NULL 
            END as parsed_date
          FROM scheme_lpcd_data_history h
        ),
        latest_ranks AS (
          SELECT rh.*,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, block ORDER BY parsed_date DESC NULLS LAST, uploaded_at DESC) as rn
          FROM ranked_history rh
          WHERE parsed_date IS NOT NULL
        ),
        latest_scheme_data AS (
          SELECT lr.*, ss.region, ss.circle, ss.division, ss.sub_division, ss.agency_type, ss.fully_completion_scheme_status, ss.water_supply
          FROM latest_ranks lr
          LEFT JOIN scheme_status ss ON lr.scheme_id = ss.scheme_id AND lr.block = ss.block
          WHERE rn = 1
        )
        SELECT 
          region,
          COUNT(*) as total_schemes,
          SUM(CASE WHEN lpcd_value >= 55 THEN 1 ELSE 0 END) as above_55,
          SUM(CASE WHEN lpcd_value > 0 AND lpcd_value < 55 THEN 1 ELSE 0 END) as below_55,
          SUM(CASE WHEN lpcd_value > 0 THEN 1 ELSE 0 END) as with_water,
          SUM(CASE WHEN lpcd_value = 0 OR lpcd_value IS NULL THEN 1 ELSE 0 END) as no_water
        FROM 
          latest_scheme_data
        WHERE region IS NOT NULL
        \${schemeIdFilter.replace('calculated.scheme_id', 'scheme_id')}
        GROUP BY region
        ORDER BY region
      \`;

      const result = await client.query(query);

      res.json({
        success: true,
        data: result.rows.map((row) => ({
          region: row.region,
          total_schemes: parseInt(row.total_schemes) || 0,
          above_55: parseInt(row.above_55) || 0,
          below_55: parseInt(row.below_55) || 0,
          with_water: parseInt(row.with_water) || 0,
          no_water: parseInt(row.no_water) || 0,
        })),
        latestDate
      });
    } finally {
      client.release();
      pool.end();
    }
`;

// Replace the botched block. We'll find it by the unique leftovers.
const startMarker = /const pool = new pg\.Pool\({/g;
// We need to find where the botched block ends. It ends at res.json(...) roughly.
// But wait, the previous view_file showed it goes down to } finally {

// I'll use a very broad match to replace the damaged area.
const damageStart = /const pool = new pg\.Pool\(\{[\s\S]+?pool\.end\(\);\s+}/;

content = content.replace(damageStart, correctRouteCode);

fs.writeFileSync(path, content);
console.log('Successfully recovered and refactored scheme-lpcd/region-comparison route');
