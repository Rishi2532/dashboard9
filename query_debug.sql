
        -- Mirror the exact query structure from /api/scheme-lpcd-data (scheme-lpcd-routes.ts)
        WITH village_counts AS (
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
          
        ),
        unique_schemes AS (
          SELECT DISTINCT ON (us.scheme_name)
            us.region, us.total_population, us.total_villages, us.lpcd_value_day7, us.scheme_name, us.block
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
            COUNT(CASE WHEN ss_us.lpcd_value_day7 < 55 THEN 1 END) as schemes_below_55,
            COUNT(CASE WHEN ss_us.lpcd_value_day7 = 0 THEN 1 END) as schemes_no_supply
          FROM unique_schemes ss_us
          GROUP BY ss_us.region
        ),
        -- Improved historical below-55 day counts using consecutive streak detection
        history_parsed AS (
          SELECT 
            hp_h.region, hp_h.scheme_name,
            CASE 
              WHEN hp_h.data_date::text ~ '^d{4}-d{2}-d{2}$' THEN hp_h.data_date::date
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
            sg_orig.rn - ROW_NUMBER() OVER (PARTITION BY sg_orig.scheme_name, (CASE WHEN sg_orig.lpcd < 55 THEN 1 ELSE 0 END) ORDER BY sg_orig.rn) as grp
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
            WHERE latest_sg.rn = 1 AND latest_sg.lpcd < 55
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
      