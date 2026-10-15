const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Ceinsys%402025@localhost:5432/water_scheme_dashboard" });

async function run() {
  await client.connect();

  console.log('--- RECIPIENTS BY DATE IN email_acknowledgements ---');
  const res = await client.query(`
    SELECT 
      sent_date,
      engineer_name,
      engineer_email,
      scheme_id,
      COUNT(*) / 2 as alert_count,
      CASE 
        WHEN engineer_name ILIKE '%Principal Secretary%' OR engineer_email ILIKE '%ps.%' THEN 'Principal Secretary (PS)'
        WHEN engineer_name ILIKE '%Member Secretary%' OR engineer_email ILIKE '%ms.%' THEN 'Member Secretary (MS)'
        WHEN engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Chief Engineer%' THEN 'Chief Engineer (CE)'
        WHEN engineer_name ILIKE '%Rishikesh Salunkhe%' OR engineer_email ILIKE '%rishikeshsalunke2001%' THEN 'Superintending Engineer (SE)'
        WHEN engineer_name ILIKE '%Rishikesh Salunke%' OR engineer_email ILIKE '%salunkerishikesh%' THEN 'Executive Engineer (EE Civil)'
        WHEN engineer_name ILIKE '%Rushikesh Salunke%' OR engineer_email ILIKE '%rushikeshsalunkhe33%' THEN 'Executive Engineer (EE Mech)'
        WHEN engineer_name ILIKE '%Akshay Bhojane%' OR engineer_email ILIKE '%akshay.bhojane%' THEN 'Deputy Engineer (DE Civil)'
        WHEN engineer_name ILIKE '%Rushikesh Salunkhe%' OR engineer_email ILIKE '%rishikesh.salunke@cstech.ai' THEN 'Deputy Engineer (DE Mech)'
        ELSE 'Field Engineer'
      END as officer_role,
      CASE 
        WHEN engineer_name ILIKE '%Principal Secretary%' OR engineer_email ILIKE '%ps.%' THEN 5
        WHEN engineer_name ILIKE '%Member Secretary%' OR engineer_email ILIKE '%ms.%' THEN 4
        WHEN engineer_name ILIKE '%Deepak Ingale%' OR engineer_name ILIKE '%Chief Engineer%' THEN 3
        WHEN engineer_name ILIKE '%Rishikesh Salunkhe%' OR engineer_email ILIKE '%rishikeshsalunke2001%' THEN 3
        WHEN engineer_name ILIKE '%Rishikesh Salunke%' OR engineer_email ILIKE '%salunkerishikesh%' THEN 2
        WHEN engineer_name ILIKE '%Rushikesh Salunke%' OR engineer_email ILIKE '%rushikeshsalunkhe33%' THEN 2
        WHEN engineer_name ILIKE '%Akshay Bhojane%' OR engineer_email ILIKE '%akshay.bhojane%' THEN 1
        WHEN engineer_name ILIKE '%Rushikesh Salunkhe%' OR engineer_email ILIKE '%rishikesh.salunke@cstech.ai' THEN 1
        ELSE 1
      END as tier
    FROM email_acknowledgements
    GROUP BY sent_date, engineer_name, engineer_email, scheme_id
    ORDER BY sent_date DESC, tier ASC;
  `);
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
