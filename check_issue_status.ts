import { getDB } from "./server/db";
import { issueReports } from "@shared/schema";
import { or, like, desc } from "drizzle-orm";

async function checkIssueStatus() {
    const db = await getDB();

    console.log("Checking status of Kurha/Padali issues...\n");

    const issues = await db
        .select()
        .from(issueReports)
        .where(
            or(
                like(issueReports.scheme_name, "%Kurha%"),
                like(issueReports.scheme_name, "%Padali%")
            )
        )
        .orderBy(desc(issueReports.created_at))
        .limit(10);

    if (issues.length === 0) {
        console.log("❌ No issues found for Kurha or Padali schemes!");
        process.exit(0);
    }

    console.log(`Found ${issues.length} issue(s):\n`);

    issues.forEach((issue, idx) => {
        console.log(`Issue ${idx + 1}:`);
        console.log(`  ID: ${issue.id}`);
        console.log(`  Scheme: ${issue.scheme_name} (ID: ${issue.scheme_id})`);
        console.log(`  Village: ${issue.village_name || 'N/A'}`);
        console.log(`  ESR: ${issue.esr_name || 'N/A'}`);
        console.log(`  Status: "${issue.status}" (exact value)`);
        console.log(`  Problem Level: ${issue.problem_level}`);
        console.log(`  Reason: ${issue.reason}`);
        console.log(`  Created: ${issue.created_at}`);
        console.log("");
    });

    // Check how many would match "Active" filter
    const activeCount = issues.filter(i => i.status === "Active").length;
    const lowercaseCount = issues.filter(i => i.status === "active").length;

    console.log(`Issues with status="Active" (capital A): ${activeCount}`);
    console.log(`Issues with status="active" (lowercase): ${lowercaseCount}`);
    console.log(`Other statuses: ${issues.length - activeCount - lowercaseCount}`);

    process.exit(0);
}

checkIssueStatus().catch(console.error);
