import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const dateFilter = "sent_date = '2026-10-17'::date";

  const q = `
    SELECT scheme_id,
           sent_date,
           json_agg(json_build_object(
             'engineer_email', engineer_email,
             'engineer_name', engineer_name,
             'engineer_role', engineer_role,
             'engineer_mobile', engineer_mobile,
             'sent_date', sent_date::text,
             'acknowledged_at', max_ack
           )) as acknowledgements
    FROM (
      SELECT 
        sub.scheme_id,
        sub.sent_date,
        sub.engineer_email,
        MAX(sub.engineer_name) as engineer_name,
        MAX(sub.engineer_role) as engineer_role,
        MAX(sub.engineer_mobile) as engineer_mobile,
        MAX(sub.max_ack) as max_ack
      FROM (
        SELECT 
          s.scheme_id,
          cd.dispatch_date as sent_date,
          LOWER(TRIM(cd.engineer_email)) as engineer_email,
          cd.engineer_name,
          cd.engineer_role,
          cd.engineer_mobile,
          ea.acknowledged_at as max_ack
        FROM consolidated_email_dispatches cd
        CROSS JOIN LATERAL jsonb_array_elements_text(cd.scheme_ids) AS s(scheme_id)
        LEFT JOIN email_acknowledgements ea 
          ON ea.scheme_id = s.scheme_id 
         AND ea.sent_date = cd.dispatch_date 
         AND LOWER(TRIM(ea.engineer_email)) = LOWER(TRIM(cd.engineer_email))
         AND ea.acknowledged_at IS NOT NULL
        WHERE cd.status = 'SENT'
          AND (cd.lpcd_alerts_count > 0 OR (cd.total_alerts > 0 AND cd.lpcd_alerts_count IS NULL))
          AND cd.dispatch_date = '2026-10-17'::date

        UNION ALL

        SELECT 
          ea.scheme_id, 
          ea.sent_date,
          LOWER(TRIM(ea.engineer_email)) as engineer_email, 
          ea.engineer_name, 
          NULL as engineer_role,
          NULL as engineer_mobile,
          ea.acknowledged_at as max_ack
        FROM email_acknowledgements ea
        WHERE ea.alert_type IN ('LPCD', 'Low LPCD')
          AND ea.sent_date = '2026-10-17'::date
          AND NOT EXISTS (
            SELECT 1 FROM consolidated_email_dispatches cd2
            CROSS JOIN LATERAL jsonb_array_elements_text(cd2.scheme_ids) AS s2(scheme_id)
            WHERE cd2.dispatch_date = ea.sent_date
              AND s2.scheme_id = ea.scheme_id
              AND LOWER(TRIM(cd2.engineer_email)) = LOWER(TRIM(ea.engineer_email))
          )
      ) sub
      GROUP BY sub.scheme_id, sub.sent_date, sub.engineer_email
    ) grouped
    WHERE scheme_id = '20027541'
    GROUP BY scheme_id, sent_date;
  `;

  const res = await pool.query(q);
  console.log('Ack status for 20027541:');
  console.log(JSON.stringify(res.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
