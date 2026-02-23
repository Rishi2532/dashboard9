import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkCounts() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        const query = `
      WITH history_parsed AS (
        SELECT 
          hp_h.scheme_name,
          CASE 
            WHEN hp_h.data_date::text ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN hp_h.data_date::date
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
        WHERE hp_h.data_date IS NOT NULL
      ),
      history_ranked AS (
        SELECT 
          hr_d.scheme_name, hr_d.lpcd, hr_d.parsed_date,
          ROW_NUMBER() OVER (PARTITION BY hr_d.scheme_name ORDER BY hr_d.parsed_date DESC) as rn
        FROM (
          SELECT DISTINCT ON (hr_p.scheme_name, hr_p.parsed_date)
            hr_p.scheme_name, hr_p.lpcd, hr_p.parsed_date
          FROM history_parsed hr_p
          WHERE hr_p.parsed_date IS NOT NULL
          ORDER BY hr_p.scheme_name, hr_p.parsed_date DESC
        ) hr_d
      ),
      -- INCLUSIVE LOGIC (Current)
      streak_groups_incl AS (
        SELECT
          sg.scheme_name, sg.rn, sg.lpcd,
          sg.rn - ROW_NUMBER() OVER (PARTITION BY sg.scheme_name, (CASE WHEN sg.lpcd < 55 THEN 1 ELSE 0 END) ORDER BY sg.rn) as grp
        FROM history_ranked sg
      ),
      current_streaks_incl AS (
        SELECT cs_sg.scheme_name, COUNT(*) as streak_length
        FROM streak_groups_incl cs_sg
        JOIN (
          SELECT latest_sg.scheme_name, latest_sg.grp 
          FROM streak_groups_incl latest_sg
          WHERE latest_sg.rn = 1 AND latest_sg.lpcd < 55
        ) latest ON cs_sg.scheme_name = latest.scheme_name AND cs_sg.grp = latest.grp
        GROUP BY cs_sg.scheme_name
      ),
      -- EXCLUSIVE LOGIC (Proposed)
      streak_groups_excl AS (
        SELECT
          sg.scheme_name, sg.rn, sg.lpcd,
          sg.rn - ROW_NUMBER() OVER (PARTITION BY sg.scheme_name, (CASE WHEN sg.lpcd < 55 AND sg.lpcd > 0 THEN 1 ELSE 0 END) ORDER BY sg.rn) as grp
        FROM history_ranked sg
      ),
      current_streaks_excl AS (
        SELECT cs_sg.scheme_name, COUNT(*) as streak_length
        FROM streak_groups_excl cs_sg
        JOIN (
          SELECT latest_sg.scheme_name, latest_sg.grp 
          FROM streak_groups_excl latest_sg
          WHERE latest_sg.rn = 1 AND latest_sg.lpcd < 55 AND latest_sg.lpcd > 0
        ) latest ON cs_sg.scheme_name = latest.scheme_name AND cs_sg.grp = latest.grp
        GROUP BY cs_sg.scheme_name
      ),
      -- NO WATER LOGIC
      streak_groups_none AS (
        SELECT
          sg.scheme_name, sg.rn, sg.lpcd,
          sg.rn - ROW_NUMBER() OVER (PARTITION BY sg.scheme_name, (CASE WHEN sg.lpcd = 0 THEN 1 ELSE 0 END) ORDER BY sg.rn) as grp
        FROM history_ranked sg
      ),
      current_streaks_none AS (
        SELECT cs_sg.scheme_name, COUNT(*) as streak_length
        FROM streak_groups_none cs_sg
        JOIN (
          SELECT latest_sg.scheme_name, latest_sg.grp 
          FROM streak_groups_none latest_sg
          WHERE latest_sg.rn = 1 AND latest_sg.lpcd = 0
        ) latest ON cs_sg.scheme_name = latest.scheme_name AND cs_sg.grp = latest.grp
        GROUP BY cs_sg.scheme_name
      )
      SELECT 
        (SELECT COUNT(*) FROM current_streaks_incl WHERE streak_length >= 1) as today_incl,
        (SELECT COUNT(*) FROM current_streaks_incl WHERE streak_length >= 3) as streak3_incl,
        (SELECT COUNT(*) FROM current_streaks_incl WHERE streak_length >= 7) as streak7_incl,
        
        (SELECT COUNT(*) FROM current_streaks_excl WHERE streak_length >= 1) as today_excl,
        (SELECT COUNT(*) FROM current_streaks_excl WHERE streak_length >= 3) as streak3_excl,
        (SELECT COUNT(*) FROM current_streaks_excl WHERE streak_length >= 7) as streak7_excl,
        
        (SELECT COUNT(*) FROM current_streaks_none WHERE streak_length >= 1) as today_none,
        (SELECT COUNT(*) FROM current_streaks_none WHERE streak_length >= 3) as streak3_none,
        (SELECT COUNT(*) FROM current_streaks_none WHERE streak_length >= 7) as streak7_none
    `;

        const result = await client.query(query);
        console.log(JSON.stringify(result.rows[0], null, 2));

    } finally {
        client.release();
        pool.end();
    }
}

checkCounts();
