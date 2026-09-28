import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { sendEngineerCredentialsEmail } from "../server/services/email-service.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface CredentialRow {
  name: string;
  email: string;
  username: string;
  password?: string;
  schemesCount?: number;
}

async function loadFromDatabase(): Promise<CredentialRow[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.name, 
        u.email, 
        u.password,
        (
          SELECT COUNT(DISTINCT sed.scheme_id)::int
          FROM scheme_engineer_details sed
          WHERE 
            LOWER(TRIM(COALESCE(sed.ee_civil_name, ''))) = LOWER(TRIM(COALESCE(u.name, '')))
            OR LOWER(TRIM(COALESCE(sed.ee_mech_name, ''))) = LOWER(TRIM(COALESCE(u.name, '')))
            OR LOWER(TRIM(COALESCE(sed.de_ae_civil_name, ''))) = LOWER(TRIM(COALESCE(u.name, '')))
            OR LOWER(TRIM(COALESCE(sed.de_ae_mech_name, ''))) = LOWER(TRIM(COALESCE(u.name, '')))
            OR LOWER(TRIM(COALESCE(sed.se_name, ''))) = LOWER(TRIM(COALESCE(u.name, '')))
            OR LOWER(TRIM(COALESCE(sed.chief_engineer_name, ''))) = LOWER(TRIM(COALESCE(u.name, '')))
            OR LOWER(TRIM(COALESCE(sed.ee_civil_email, ''))) = LOWER(TRIM(COALESCE(u.email, '')))
            OR LOWER(TRIM(COALESCE(sed.de_ae_civil_email, ''))) = LOWER(TRIM(COALESCE(u.email, '')))
        ) as schemes_count
      FROM users u
      WHERE u.role = 'engineer'
      ORDER BY u.name ASC, u.id ASC
    `);

    return res.rows.map((r: any) => ({
      name: r.name || r.username,
      email: (r.email || "").trim(),
      username: r.username,
      password: r.password,
      schemesCount: r.schemes_count || 0,
    }));
  } finally {
    client.release();
  }
}

async function loadFromFile(filePath: string): Promise<CredentialRow[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const rows: CredentialRow[] = [];

  if (ext === ".xlsx" || ext === ".xls") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    let headerMap: Record<string, number> = {};
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          const val = String(cell.value || "").toLowerCase().trim();
          if (val.includes("name")) headerMap["name"] = colNumber;
          if (val.includes("email") || val.includes("mail")) headerMap["email"] = colNumber;
          if (val.includes("user") || val.includes("login") || val.includes("id")) headerMap["username"] = colNumber;
          if (val.includes("pass")) headerMap["password"] = colNumber;
        });
      } else {
        const name = String(row.getCell(headerMap["name"] || 1).value || "").trim();
        const email = String(row.getCell(headerMap["email"] || 2).value || "").trim();
        const username = String(row.getCell(headerMap["username"] || 3).value || "").trim();
        const password = String(row.getCell(headerMap["password"] || 4).value || "").trim();

        if (email && email.includes("@")) {
          rows.push({ name: name || username, email, username: username || email, password });
        }
      }
    });
  } else if (ext === ".csv") {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length > 1) {
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes("name"));
      const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
      const userIdx = headers.findIndex(h => h.includes("user") || h.includes("login") || h.includes("id"));
      const passIdx = headers.findIndex(h => h.includes("pass"));

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.trim().replace(/^['"]+|['"]+$/g, ""));
        const email = parts[emailIdx >= 0 ? emailIdx : 1] || "";
        if (email && email.includes("@")) {
          rows.push({
            name: parts[nameIdx >= 0 ? nameIdx : 0] || "Engineer",
            email,
            username: parts[userIdx >= 0 ? userIdx : 2] || email,
            password: parts[passIdx >= 0 ? passIdx : 3] || "",
          });
        }
      }
    }
  } else {
    throw new Error(`Unsupported file type: ${ext}. Please provide a .xlsx or .csv file.`);
  }

  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const isSend = args.includes("--send");
  const isDryRun = !isSend || args.includes("--dry-run");

  const fileArgIdx = args.findIndex(a => a === "--file" || a === "-f");
  const customFilePath = fileArgIdx >= 0 && args[fileArgIdx + 1] ? args[fileArgIdx + 1] : null;

  console.log("\n============================================================");
  console.log("🔐 PRIVATE ENGINEER CREDENTIALS DISPATCH TOOL");
  console.log("============================================================");
  console.log(`Mode: ${isSend ? "🚀 LIVE DISPATCH (Sending individual emails)" : "🔍 DRY RUN (Preview only, no emails sent)"}`);
  if (customFilePath) {
    console.log(`Source File: ${customFilePath}`);
  } else {
    console.log(`Source: Database 'users' table (role = 'engineer')`);
  }
  console.log("============================================================\n");

  let recipients: CredentialRow[] = [];
  try {
    if (customFilePath) {
      recipients = await loadFromFile(customFilePath);
    } else {
      recipients = await loadFromDatabase();
    }
  } catch (err: any) {
    console.error("❌ Error loading recipients:", err.message);
    process.exit(1);
  }

  if (recipients.length === 0) {
    console.log("⚠️ No engineer recipients found with valid email addresses.");
    process.exit(0);
  }

  console.log(`Found ${recipients.length} engineer recipients:\n`);
  recipients.forEach((r, idx) => {
    const maskedPass = r.password ? (r.password.length > 2 ? `${r.password[0]}***${r.password.slice(-1)}` : "***") : "None";
    console.log(`  ${idx + 1}. [${r.email}] - Name: "${r.name}" | Username: "${r.username}" | Password: [${maskedPass}] ${r.schemesCount ? `| Schemes: ${r.schemesCount}` : ""}`);
  });

  if (isDryRun) {
    console.log("\n------------------------------------------------------------");
    console.log("ℹ️  This was a DRY RUN. No emails were sent.");
    console.log("👉 To actually dispatch private emails to each engineer, run:");
    console.log("   npx tsx scripts/send-engineer-credentials.ts --send");
    if (customFilePath) {
      console.log(`   npx tsx scripts/send-engineer-credentials.ts --file "${customFilePath}" --send`);
    }
    console.log("------------------------------------------------------------\n");
    await pool.end();
    return;
  }

  // Live send
  console.log(`\n🚀 Starting live dispatch of ${recipients.length} personalized emails...`);
  let successCount = 0;
  let failCount = 0;
  const failures: Array<{ email: string; name: string; error: string }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    process.stdout.write(`   [${i + 1}/${recipients.length}] Sending to ${r.email} (${r.name})... `);

    try {
      const ok = await sendEngineerCredentialsEmail({
        toEmail: r.email,
        engineerName: r.name,
        username: r.username,
        password: r.password,
        assignedSchemesCount: r.schemesCount,
      });

      if (ok) {
        successCount++;
        console.log("✅ Delivered");
      } else {
        failCount++;
        console.log("❌ Failed (SMTP rejected)");
        failures.push({ email: r.email, name: r.name, error: "SMTP rejected" });
      }
    } catch (err: any) {
      failCount++;
      console.log(`❌ Error: ${err.message}`);
      failures.push({ email: r.email, name: r.name, error: err.message });
    }

    // 1.5 second throttle to avoid SMTP rate-limit bans
    if (i < recipients.length - 1) {
      await new Promise(res => setTimeout(res, 1500));
    }
  }

  console.log("\n============================================================");
  console.log("📊 DISPATCH COMPLETED");
  console.log(`   Total: ${recipients.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  if (failures.length > 0) {
    console.log("\nFailed Recipients:");
    failures.forEach((f, idx) => {
      console.log(`   ${idx + 1}. ${f.email} (${f.name}) - ${f.error}`);
    });
  }
  console.log("============================================================\n");

  await pool.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  pool.end();
  process.exit(1);
});
