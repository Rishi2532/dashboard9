async function checkPadaliKurhaIssues() {
    try {
        const response = await fetch('http://localhost:5000/api/issue-reporting/active');
        const data = await response.json();

        const allIssues = Array.isArray(data) ? data : [];

        console.log(`\nTotal issues fetched from API: ${allIssues.length}\n`);

        // Find issues for Padali and Kurha schemes
        const padaliIssues = allIssues.filter(issue =>
            issue.scheme_name && issue.scheme_name.toLowerCase().includes('padali')
        );

        const kurhaIssues = allIssues.filter(issue =>
            issue.scheme_name && issue.scheme_name.toLowerCase().includes('kurha')
        );

        console.log('='.repeat(80));
        console.log('PADALI & KURHA SCHEMES - ISSUE REPORT');
        console.log('='.repeat(80));

        // Padali Issues
        console.log(`\n***** PADALI SCHEME *****`);
        console.log(`Total Issues: ${padaliIssues.length}\n`);

        if (padaliIssues.length > 0) {
            padaliIssues.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue.scheme_name} (Scheme ID: ${issue.scheme_id})`);
                console.log(`   Level: ${issue.village_name ? 'VILLAGE' : (issue.esr_name ? 'ESR' : 'SCHEME')}`);
                if (issue.village_name) console.log(`   Village: ${issue.village_name}`);
                if (issue.esr_name) console.log(`   ESR: ${issue.esr_name}`);
                console.log(`   Problem Level: ${issue.problem_level}`);
                console.log(`   Status: ${issue.status_value}`);
                console.log(`   Reason: ${issue.reason}`);
                console.log(`   Reported by: ${issue.creator_name} on ${new Date(issue.created_at).toLocaleDateString()}`);
                console.log('');
            });
        } else {
            console.log('No issues found for Padali scheme.\n');
        }

        // Kurha Issues
        console.log(`***** KURHA SCHEME *****`);
        console.log(`Total Issues: ${kurhaIssues.length}\n`);

        if (kurhaIssues.length > 0) {
            kurhaIssues.forEach((issue, i) => {
                console.log(`${i + 1}. ${issue.scheme_name} (Scheme ID: ${issue.scheme_id})`);
                console.log(`   Level: ${issue.village_name ? 'VILLAGE' : (issue.esr_name ? 'ESR' : 'SCHEME')}`);
                if (issue.village_name) console.log(`   Village: ${issue.village_name}`);
                if (issue.esr_name) console.log(`   ESR: ${issue.esr_name}`);
                console.log(`   Problem Level: ${issue.problem_level}`);
                console.log(`   Status: ${issue.status_value}`);
                console.log(`   Reason: ${issue.reason}`);
                console.log(`   Reported by: ${issue.creator_name} on ${new Date(issue.created_at).toLocaleDateString()}`);
                console.log('');
            });
        } else {
            console.log('No issues found for Kurha scheme.\n');
        }

        // Summary
        console.log('='.repeat(80));
        console.log('SUMMARY:');
        console.log(`- Padali Scheme: ${padaliIssues.length} issue(s)`);
        console.log(`- Kurha Scheme: ${kurhaIssues.length} issue(s)`);
        console.log(`- Total: ${padaliIssues.length + kurhaIssues.length} issue(s)`);
        console.log('='.repeat(80));

        // Show scheme IDs for reference
        if (padaliIssues.length > 0) {
            const padaliSchemeId = padaliIssues[0].scheme_id;
            console.log(`\nPadali Scheme ID: ${padaliSchemeId}`);
        }
        if (kurhaIssues.length > 0) {
            const kurhaSchemeId = kurhaIssues[0].scheme_id;
            console.log(`Kurha Scheme ID: ${kurhaSchemeId}`);
        }

    } catch (err) {
        console.error('Error fetching issues:', err);
    }
}

checkPadaliKurhaIssues();
