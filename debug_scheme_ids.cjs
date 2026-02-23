const { Pool } = require('pg');

async function debugSchemeIds() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:Ceinsys@2025@localhost:5432/water_scheme_dashboard'
    });

    try {
        console.log('\n' + '='.repeat(80));
        console.log('DEBUGGING SCHEME ID MISMATCH');
        console.log('='.repeat(80) + '\n');

        // Get the actual scheme IDs from chlorine_data for Padali and Kurha
        const chlorineData = await pool.query(`
      SELECT DISTINCT scheme_id, scheme_name 
      FROM chlorine_data 
      WHERE scheme_name LIKE '%Padali%' OR scheme_name LIKE '%Kurha%'
      ORDER BY scheme_name
    `);

        console.log('📊 Scheme IDs in chlorine_data table:');
        console.log('-'.repeat(80));
        chlorineData.rows.forEach(row => {
            console.log(`  Scheme: ${row.scheme_name}`);
            console.log(`  ID: "${row.scheme_id}"`);
            console.log(`  ID Type: ${typeof row.scheme_id}`);
            console.log('');
        });

        // Get the scheme IDs from issue_reports
        const issueData = await pool.query(`
      SELECT id, scheme_id, scheme_name, problem_level, status
      FROM issue_reports 
      WHERE scheme_name LIKE '%Padali%' OR scheme_name LIKE '%Kurha%'
      ORDER BY scheme_name
    `);

        console.log('🚨 Scheme IDs in issue_reports table:');
        console.log('-'.repeat(80));
        issueData.rows.forEach(row => {
            console.log(`  Issue ID: ${row.id}`);
            console.log(`  Scheme: ${row.scheme_name}`);
            console.log(`  Scheme ID: "${row.scheme_id}"`);
            console.log(`  ID Type: ${typeof row.scheme_id}`);
            console.log(`  Level: ${row.problem_level}`);
            console.log(`  Status: ${row.status}`);
            console.log('');
        });

        // Check if they match
        console.log('='.repeat(80));
        console.log('🔍 MATCHING ANALYSIS:');
        console.log('='.repeat(80) + '\n');

        chlorineData.rows.forEach(lpcd => {
            const matchingIssue = issueData.rows.find(issue =>
                issue.scheme_id === lpcd.scheme_id
            );

            if (matchingIssue) {
                console.log(`✅ MATCH FOUND: ${lpcd.scheme_name}`);
                console.log(`   Chlorine scheme_id: "${lpcd.scheme_id}"`);
                console.log(`   Issue scheme_id: "${matchingIssue.scheme_id}"`);
            } else {
                console.log(`❌ NO MATCH: ${lpcd.scheme_name}`);
                console.log(`   Chlorine scheme_id: "${lpcd.scheme_id}"`);
                const possibleMatch = issueData.rows.find(issue =>
                    issue.scheme_name.includes(lpcd.scheme_name.split('&')[0].trim())
                );
                if (possibleMatch) {
                    console.log(`   Issue scheme_id: "${possibleMatch.scheme_id}" (DIFFERENT!)`);
                    console.log(`   => Frontend won't match because IDs differ`);
                }
            }
            console.log('');
        });

        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugSchemeIds();
