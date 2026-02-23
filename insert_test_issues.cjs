const { Pool } = require('pg');

async function insertTestIssues() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
    });

    try {
        console.log('\n' + '='.repeat(80));
        console.log('INSERTING TEST ISSUES FOR PADALI AND KURHA');
        console.log('='.repeat(80) + '\n');

        // Insert Padali issue
        const padaliResult = await pool.query(`
      INSERT INTO issue_reports (
        problem_level,
        region,
        scheme_id,
        scheme_name,
        village_name,
        esr_name,
        status_value,
        reason,
        sensor_type,
        status,
        created_by,
        creator_name,
        created_at
      ) VALUES (
        'Scheme',
        'Amravati',
        '20094779',
        'Padali & 5 Villages RRWSS',
        NULL,
        NULL,
        'Not Achieved: 20.3 LPCD',
        'Low water supply due to pump maintenance issues. Expected resolution within 48 hours.',
        NULL,
        'Active',
        2,
        'Rushikesh Salunke',
        NOW()
      ) RETURNING id, scheme_name, reason
    `);

        console.log('✅ Created Padali issue:');
        console.log(`   ID: ${padaliResult.rows[0].id}`);
        console.log(`   Scheme: ${padaliResult.rows[0].scheme_name}`);
        console.log(`   Reason: ${padaliResult.rows[0].reason}\n`);

        // Insert Kurha issue
        const kurhaResult = await pool.query(`
      INSERT INTO issue_reports (
        problem_level,
        region,
        scheme_id,
        scheme_name,
        village_name,
        esr_name,
        status_value,
        reason,
        sensor_type,
        status,
        created_by,
        creator_name,
        created_at
      ) VALUES (
        'Scheme',
        'Amravati',
        '7945938',
        'Kurha & 2 Villages RRWSS',
        NULL,
        NULL,
        'Not Achieved: 5.1 LPCD',
        'Critical water shortage - main pipeline needs repair. Engineering team deployed.',
        NULL,
        'Active',
        2,
        'Rushikesh Salunke',
        NOW()
      ) RETURNING id, scheme_name, reason
    `);

        console.log('✅ Created Kurha issue:');
        console.log(`   ID: ${kurhaResult.rows[0].id}`);
        console.log(`   Scheme: ${kurhaResult.rows[0].scheme_name}`);
        console.log(`   Reason: ${kurhaResult.rows[0].reason}\n`);

        // Verify the insertions
        const verifyResult = await pool.query(`
      SELECT 
        id,
        problem_level,
        scheme_name,
        status_value,
        reason,
        status,
        creator_name,
        created_at
      FROM issue_reports
      WHERE scheme_name IN ('Padali & 5 Villages RRWSS', 'Kurha & 2 Villages RRWSS')
      ORDER BY created_at DESC
    `);

        console.log('='.repeat(80));
        console.log('VERIFICATION - All Issues for Padali and Kurha:');
        console.log('='.repeat(80) + '\n');

        verifyResult.rows.forEach((issue, i) => {
            console.log(`${i + 1}. ${issue.scheme_name} (ID: ${issue.id})`);
            console.log(`   Level: ${issue.problem_level}`);
            console.log(`   Status: ${issue.status} | Status Value: ${issue.status_value}`);
            console.log(`   Reason: ${issue.reason}`);
            console.log(`   Created by: ${issue.creator_name} at ${issue.created_at}`);
            console.log('');
        });

        console.log('='.repeat(80));
        console.log('✅ SUCCESS! Issues created successfully.');
        console.log('='.repeat(80));
        console.log('\nℹ️  Refresh the Detailed Chlorine Page to see the red highlighting!\n');

    } catch (error) {
        console.error('❌ Error inserting test issues:', error);
    } finally {
        await pool.end();
    }
}

insertTestIssues();
