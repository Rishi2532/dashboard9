import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { issueReports } from './shared/schema.ts';
import { desc } from 'drizzle-orm';

const { Pool } = pg;

async function checkIssueReportsTable() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    const db = drizzle(pool);

    try {
        console.log('\n' + '='.repeat(80));
        console.log('DIRECT DATABASE QUERY: issue_reports TABLE');
        console.log('='.repeat(80) + '\n');

        // Get all issues from the table
        const allIssues = await db
            .select()
            .from(issueReports)
            .orderBy(desc(issueReports.created_at));

        console.log(`Total Issues in Database: ${allIssues.length}\n`);

        if (allIssues.length > 0) {
            // Group by status
            const activeIssues = allIssues.filter(i => i.status === 'Active');
            const resolvedIssues = allIssues.filter(i => i.status === 'Resolved');

            console.log(`Active Issues: ${activeIssues.length}`);
            console.log(`Resolved Issues: ${resolvedIssues.length}\n`);

            // Check for Padali and Kurha
            const padaliIssues = allIssues.filter(i =>
                i.scheme_name && i.scheme_name.toLowerCase().includes('padali')
            );
            const kurhaIssues = allIssues.filter(i =>
                i.scheme_name && i.scheme_name.toLowerCase().includes('kurha')
            );

            console.log(`Padali Issues: ${padaliIssues.length}`);
            console.log(`Kurha Issues: ${kurhaIssues.length}\n`);

            console.log('-'.repeat(80));
            console.log('ALL ISSUES:');
            console.log('-'.repeat(80) + '\n');

            allIssues.forEach((issue, i) => {
                console.log(`${i + 1}. ID: ${issue.id} | ${issue.scheme_name} (Scheme ID: ${issue.scheme_id})`);
                console.log(`   Level: ${issue.problem_level}`);
                if (issue.village_name) console.log(`   Village: ${issue.village_name}`);
                if (issue.esr_name) console.log(`   ESR: ${issue.esr_name}`);
                console.log(`   Status: ${issue.status} | Status Value: ${issue.status_value}`);
                console.log(`   Reason: ${issue.reason}`);
                console.log(`   Created by: ${issue.creator_name} (ID: ${issue.created_by})`);
                console.log(`   Created at: ${issue.created_at}`);
                if (issue.resolved_at) console.log(`   Resolved at: ${issue.resolved_at}`);
                console.log('');
            });
        } else {
            console.log('No issues found in issue_reports table.\n');
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await pool.end();
    }
}

checkIssueReportsTable();
