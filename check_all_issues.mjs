async function checkAllIssues() {
    try {
        const response = await fetch('http://localhost:5000/api/issue-reporting/list');
        const data = await response.json();

        console.log('\n' + '='.repeat(80));
        console.log('ALL ISSUES IN DATABASE (Including Resolved)');
        console.log('='.repeat(80));
        console.log(`\nTotal Issues: ${Array.isArray(data) ? data.length : 0}\n`);

        if (Array.isArray(data) && data.length > 0) {
            // Group by status
            const activeIssues = data.filter(i => i.status === 'Active');
            const resolvedIssues = data.filter(i => i.status === 'Resolved');

            console.log(`Active Issues: ${activeIssues.length}`);
            console.log(`Resolved Issues: ${resolvedIssues.length}\n`);

            console.log('-'.repeat(80));
            console.log('ISSUE DETAILS:');
            console.log('-'.repeat(80) + '\n');

            data.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue.scheme_name} (Scheme ID:${issue.scheme_id})`);
                console.log(`   Level: ${issue.problem_level}`);
                if (issue.village_name) console.log(`   Village: ${issue.village_name}`);
                if (issue.esr_name) console.log(`   ESR: ${issue.esr_name}`);
                console.log(`   Problem Level: ${issue.problem_level}`);
                console.log(`   Status: ${issue.status} | Status Value: ${issue.status_value}`);
                console.log(`   Reason: ${issue.reason}`);
                console.log(`   Reported by: ${issue.creator_name} on ${new Date(issue.created_at).toLocaleDateString()}`);
                if (issue.status === 'Resolved') {
                    console.log(`   Resolved at: ${new Date(issue.resolved_at).toLocaleDateString()}`);
                    if (issue.resolution_remark) console.log(`   Resolution: ${issue.resolution_remark}`);
                }
                console.log('');
            });
        } else {
            console.log('No issues found in database.\n');
        }

        console.log('='.repeat(80));
    } catch (err) {
        console.error('Error fetching issues:', err.message);
        console.error('Full error:', err);
    }
}

checkAllIssues();
