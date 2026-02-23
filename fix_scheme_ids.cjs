const { Pool } = require('pg');

async function fixSchemeIds() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
    });

    try {
        console.log('\n' + '='.repeat(80));
        console.log('FIXING SCHEME ID MISMATCH');
        console.log('='.repeat(80) + '\n');

        // Step 1: Get the CORRECT scheme IDs from chlorine_data
        const correctIds = await pool.query(`
      SELECT DISTINCT scheme_id, scheme_name 
      FROM chlorine_data 
      WHERE scheme_name LIKE '%Padali%' OR scheme_name LIKE '%Kurha%'
      ORDER BY scheme_name
    `);

        console.log('✅ CORRECT Scheme IDs from chlorine_data:');
        correctIds.rows.forEach(row => {
            console.log(`  ${row.scheme_name} => ID: "${row.scheme_id}"`);
        });
        console.log('');

        // Step 2: Show current WRONG IDs in issue_reports
        const wrongIds = await pool.query(`
      SELECT id, scheme_id, scheme_name
      FROM issue_reports 
      WHERE scheme_name LIKE '%Padali%' OR scheme_name LIKE '%Kurha%'
      ORDER BY scheme_name
    `);

        console.log('❌ WRONG Scheme IDs in issue_reports:');
        wrongIds.rows.forEach(row => {
            console.log(`  Issue ID ${row.id}: ${row.scheme_name} => ID: "${row.scheme_id}"`);
        });
        console.log('');

        // Step 3: UPDATE the issue_reports with correct scheme_ids
        console.log('🔧 UPDATING issue_reports with correct IDs...\n');

        for (const correct of correctIds.rows) {
            const schemeName = correct.scheme_name;
            const correctId = correct.scheme_id;

            const updateResult = await pool.query(`
        UPDATE issue_reports 
        SET scheme_id = $1
        WHERE scheme_name = $2
        RETURNING id, scheme_name, scheme_id
      `, [correctId, schemeName]);

            if (updateResult.rowCount > 0) {
                console.log(`✅ Updated: ${schemeName}`);
                console.log(`   New scheme_id: "${correctId}"`);
                console.log(`   Affected rows: ${updateResult.rowCount}\n`);
            }
        }

        // Step 4: Verify the fix
        const verified = await pool.query(`
      SELECT id, scheme_id, scheme_name, status
      FROM issue_reports 
      WHERE scheme_name LIKE '%Padali%' OR scheme_name LIKE '%Kurha%'
      ORDER BY scheme_name
    `);

        console.log('='.repeat(80));
        console.log('✅ VERIFICATION - Updated Issues:');
        console.log('='.repeat(80) + '\n');
        verified.rows.forEach(row => {
            console.log(`  Issue ID ${row.id}: ${row.scheme_name}`);
            console.log(`  Scheme ID: "${row.scheme_id}"`);
            console.log(`  Status: ${row.status}\n`);
        });

        console.log('='.repeat(80));
        console.log('✅ SUCCESS! Scheme IDs updated. Frontend should now match issues correctly!');
        console.log('='.repeat(80));
        console.log('\nℹ️  Wait 60 seconds for auto-refresh or reload the page to see red highlighting!\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

fixSchemeIds();
