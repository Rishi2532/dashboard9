
const { Client } = require('pg');

async function test() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'jjm_dashboard',
        port: 5432,
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        // Insert some dummy data with 28.8 in March and 36.8 in April
        await client.query("DELETE FROM scheme_lpcd_data_history WHERE scheme_id = 'TEST_SCHEME'");
        
        const dates = [
            { d: '25-Mar', v: 28.8 },
            { d: '26-Mar', v: 28.8 },
            { d: '27-Mar', v: 28.8 },
            { d: '28-Mar', v: 28.8 },
            { d: '29-Mar', v: 28.8 },
            { d: '30-Mar', v: 28.8 },
            { d: '31-Mar', v: 28.8 },
            { d: '01-Apr', v: 36.8 },
            { d: '02-Apr', v: 36.8 },
            { d: '03-Apr', v: 36.8 },
            { d: '04-Apr', v: 36.8 },
            { d: '05-Apr', v: 36.8 },
            { d: '06-Apr', v: 36.8 },
            { d: '07-Apr', v: 36.8 },
        ];

        for (const item of dates) {
            await client.query(
                "INSERT INTO scheme_lpcd_data_history (scheme_id, data_date, lpcd_value, uploaded_at) VALUES ($1, $2, $3, '2026-04-08')",
                ['TEST_SCHEME', item.d, item.v]
            );
        }

        const query = `
        WITH parsed_history AS (
          SELECT 
            h.*,
            CASE 
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9][0-9]$|' || '^[0-9]+-[A-Za-z]+-[0-9][0-9][0-9][0-9]$' THEN 
                TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]+-[A-Za-z]+$' THEN 
                CASE
                  WHEN TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY') > (COALESCE(uploaded_at, CURRENT_DATE) + interval '1 month')
                  THEN TO_DATE(data_date || '-' || (TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY')::int - 1), 'DD-Mon-YYYY')
                  ELSE TO_DATE(data_date || '-' || TO_CHAR(COALESCE(uploaded_at, CURRENT_DATE), 'YYYY'), 'DD-Mon-YYYY')
                END
              WHEN data_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN 
                SUBSTRING(data_date FROM 1 FOR 10)::date
              ELSE 
                COALESCE(uploaded_at, CURRENT_DATE)::date
            END as parsed_date
          FROM scheme_lpcd_data_history h
        ),
        ranked_history AS (
          SELECT 
            *,
            ROW_NUMBER() OVER (
              PARTITION BY scheme_id, data_date 
              ORDER BY uploaded_at DESC, id DESC
            ) as upload_rank
          FROM parsed_history
        ),
        latest_history AS (
          SELECT 
            *,
            ROW_NUMBER() OVER (
              PARTITION BY scheme_id 
              ORDER BY parsed_date DESC, uploaded_at DESC, id DESC
            ) as day_rank
          FROM ranked_history
          WHERE upload_rank = 1
        )
        SELECT * FROM latest_history WHERE scheme_id = 'TEST_SCHEME' AND day_rank <= 7;
        `;

        const res = await client.query(query);
        console.log('Result for TEST_SCHEME (latest 7 days):');
        res.rows.forEach(r => {
            console.log(\`Date: \${r.data_date} (Parsed: \${r.parsed_date.toISOString().split('T')[0]}), Value: \${r.lpcd_value}\`);
        });

    } finally {
        await client.end();
    }
}

test().catch(err => console.error(err));
