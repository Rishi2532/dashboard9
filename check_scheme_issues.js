const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { sql } = require('drizzle-orm');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const db = drizzle(pool);

async function getSchemeIssues() {
    try {
        const result = await db.execute(sql`
      SELECT 
        ir.id, 
        ir.scheme_id, 
        ws.scheme_name, 
        ir.problem_level, 
        ir.reason, 
        ir.status_value, 
        ir.creator_name, 
        ir.created_at 
      FROM issue_reporting ir
      LEFT JOIN water_schemes ws ON ir.scheme_id = ws.scheme_id
      WHERE ir.status_value IN ('Open', 'In Progress')
        AND ir.village_name IS NULL
        AND ir.esr_name IS NULL
      ORDER BY ir.created_at DESC
    `);

        console.log('='.repeat(60));
        console.log('SCHEME-LEVEL ISSUES REPORT');
        console.log('='.repeat(60));
        console.log(`\nTotal Active Scheme-Level Issues: ${result.rows.length}\n`);

        if (result.rows.length === 0) {
            console.log('No active scheme-level issues found.\n');
        } else {
            console.log('Scheme Names with Issues:');
            const schemeNames = [...new Set(result.rows.map(r => r.scheme_name))];
            schemeNames.forEach((name, i) => {
                console.log(`  ${i + 1}. ${name}`);
            });

            console.log('\n' + '-'.repeat(60));
            console.log('DETAILED ISSUE LIST:');
            console.log('-'.repeat(60) + '\n');

            result.rows.forEach((row, i) => {
                console.log(`${i + 1}. ${row.scheme_name} (Scheme ID: ${row.scheme_id})`);
                console.log(`   Problem Level: ${row.problem_level}`);
                console.log(`   Status: ${row.status_value}`);
                console.log(`   Reason: ${row.reason}`);
                console.log(`   Reported by: ${row.creator_name}`);
                console.log(`   Date: ${new Date(row.created_at).toLocaleString()}`);
                console.log('');
            });
        }

        console.log('='.repeat(60));
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

getSchemeIssues();
