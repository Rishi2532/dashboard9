async function getSchemeIssues() {
    try {
        const response = await fetch('http://localhost:5000/api/issue-reporting/active');
        const data = await response.json();

        // Ensure data is an array
        const allIssues = Array.isArray(data) ? data : [];

        console.log(`\nTotal issues fetched from API: ${allIssues.length}\n`);

        // Filter for scheme-level issues only (no village_name and no esr_name)
        const schemeIssues = allIssues.filter(issue =>
            !issue.village_name && !issue.esr_name
        );

        console.log('='.repeat(70));
        console.log('SCHEME-LEVEL ISSUES REPORT');
        console.log('='.repeat(70));
        console.log(`\nTotal Active Scheme-Level Issues: ${schemeIssues.length}\n`);

        if (schemeIssues.length === 0) {
            console.log('No active scheme-level issues found.\n');
        } else {
            // Get unique schemes
            const schemeMap = new Map();
            schemeIssues.forEach(issue => {
                if (!schemeMap.has(issue.scheme_id)) {
                    schemeMap.set(issue.scheme_id, {
                        id: issue.scheme_id,
                        name: issue.scheme_name || 'Unknown Scheme',
                        count: 0
                    });
                }
                schemeMap.get(issue.scheme_id).count++;
            });

            const uniqueSchemes = Array.from(schemeMap.values());

            console.log('Schemes with Active Issues:');
            console.log('-'.repeat(70));
            uniqueSchemes.forEach((scheme, i) => {
                console.log(`  ${i + 1}. ${scheme.name} (ID: ${scheme.id}) - ${scheme.count} issue(s)`);
            });

            console.log('\n' + '='.repeat(70));
            console.log('DETAILED ISSUE LIST:');
            console.log('='.repeat(70) + '\n');

            schemeIssues.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue.scheme_name || 'Unknown Scheme'} (Scheme ID: ${issue.scheme_id})`);
                console.log(`   Problem Level: ${issue.problem_level}`);
                console.log(`   Status: ${issue.status_value}`);
                console.log(`   Reason: ${issue.reason}`);
                console.log(`   Reported by: ${issue.creator_name}`);
                console.log(`   Date: ${new Date(issue.created_at).toLocaleString()}`);
                console.log('');
            });
        }

        console.log('='.repeat(70));
    } catch (err) {
        console.error('Error fetching issues:', err);
    }
}

getSchemeIssues();
