import cron from "node-cron";
import { getDB } from "../db";
import pg from 'pg';
import {
  chlorineData,
  pressureData,
  waterSchemeData,
  schemeEngineerDetails,
  emailAlertLogs,
  schemeStatuses,
} from "../../shared/schema";
import { sendDailyAlertEmail, generateAcknowledgeToken } from "../services/email-service";
import { eq, or, lt, and, isNotNull, sql } from "drizzle-orm";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface Alert {
  scheme_id: string;
  scheme_name: string;
  village_name?: string;
  esr_name?: string;
  chlorine_issue?: boolean;
  chlorine_value?: string | number;
  pressure_issue?: boolean;
  pressure_value?: string | number;
  lpcd_issue?: boolean;
  lpcd_value?: string | number;
  water_issue?: boolean;
  water_value?: string | number;
}

export function startDailyAlertsCron() {
  // Run every day at 8:00 AM
  // You can adjust the cron expression as needed: '0 8 * * *'
  cron.schedule("0 8 * * *", async () => {
    await runDailyAlertsJob();
  });
}

export async function runDailyAlertsJob() {
  console.log("⏰ Running daily alerts job...");
  try {
      const db = await getDB();
      const allAlertsBySchemeId: Record<string, Alert[]> = {};
      const allAlertsBySchemeName: Record<string, Alert[]> = {};

      const validSchemesRes = await db
        .select({ scheme_id: schemeStatuses.scheme_id, scheme_name: schemeStatuses.scheme_name })
        .from(schemeStatuses)
        .where(eq(schemeStatuses.water_supply, 'Yes'));

      const validSchemeIds = new Set(validSchemesRes.map(r => r.scheme_id).filter(Boolean));
      const validSchemeNames = new Set(validSchemesRes.map(r => r.scheme_name).filter(Boolean));

      const addAlert = (schemeId: string | null, schemeName: string | null, alert: Alert) => {
        const isValidId = schemeId && validSchemeIds.has(schemeId);
        const isValidName = schemeName && validSchemeNames.has(schemeName);
        
        if (!isValidId && !isValidName) {
          return; // Skip schemes that do not have water_supply = 'Yes'
        }

        if (schemeId) {
          if (!allAlertsBySchemeId[schemeId]) allAlertsBySchemeId[schemeId] = [];
          allAlertsBySchemeId[schemeId].push(alert);
        }
        if (schemeName) {
          if (!allAlertsBySchemeName[schemeName]) allAlertsBySchemeName[schemeName] = [];
          allAlertsBySchemeName[schemeName].push(alert);
        }
      };

      // 1. Check Chlorine Data
      const chlorineIssues = await db
        .select()
        .from(chlorineData)
        .where(
          and(
            isNotNull(chlorineData.chlorine_value_7),
            lt(chlorineData.chlorine_value_7, "0.2")
          )
        );

      chlorineIssues.forEach((row) => {
        addAlert(row.scheme_id, row.scheme_name, {
          scheme_id: row.scheme_id || "N/A",
          scheme_name: row.scheme_name || "N/A",
          village_name: row.village_name || "N/A",
          esr_name: row.esr_name || "N/A",
          chlorine_issue: true,
          chlorine_value: row.chlorine_value_7,
        });
      });

      // 2. Check Pressure Data
      const pressureIssues = await db
        .select()
        .from(pressureData)
        .where(
          and(
            isNotNull(pressureData.pressure_value_7),
            lt(pressureData.pressure_value_7, "0.2")
          )
        );

      pressureIssues.forEach((row) => {
        addAlert(row.scheme_id, row.scheme_name, {
          scheme_id: row.scheme_id || "N/A",
          scheme_name: row.scheme_name || "N/A",
          village_name: row.village_name || "N/A",
          esr_name: row.esr_name || "N/A",
          pressure_issue: true,
          pressure_value: row.pressure_value_7,
        });
      });

      // 3. Check Water Scheme Data (LPCD < 55 or Water == 0)
      const waterIssues = await db
        .select()
        .from(waterSchemeData)
        .where(
          or(
            and(
              isNotNull(waterSchemeData.lpcd_value_day7),
              lt(waterSchemeData.lpcd_value_day7, "55")
            ),
            and(
              isNotNull(waterSchemeData.water_value_day7),
              eq(waterSchemeData.water_value_day7, "0")
            )
          )
        );

      waterIssues.forEach((row) => {
        const isLpcdIssue = row.lpcd_value_day7 !== null && parseFloat(row.lpcd_value_day7 as any) < 55;
        const isWaterIssue = row.water_value_day7 !== null && parseFloat(row.water_value_day7 as any) === 0;

        addAlert(row.scheme_id, row.scheme_name, {
          scheme_id: row.scheme_id || "N/A",
          scheme_name: row.scheme_name || "N/A",
          village_name: row.village_name || "N/A",
          lpcd_issue: isLpcdIssue,
          lpcd_value: isLpcdIssue ? row.lpcd_value_day7 : undefined,
          water_issue: isWaterIssue,
          water_value: isWaterIssue ? row.water_value_day7 : undefined,
        });
      });

      // 4. Fetch Scheme Engineer Details for all schemes that have alerts
      const schemeIdsWithAlerts = Object.keys(allAlertsBySchemeId);
      const schemeNamesWithAlerts = Object.keys(allAlertsBySchemeName);

      if (schemeIdsWithAlerts.length === 0 && schemeNamesWithAlerts.length === 0) {
        console.log("✅ No critical alerts found today.");
        return;
      }

      // We'll query all engineer details and filter locally to avoid complex OR clauses if lists are huge
      const allEngineerDetails = await db.select().from(schemeEngineerDetails);

      // We will batch insert into emailAlertLogs at the end
      const emailLogsToInsert: any[] = [];

      // Group alerts by Engineer Email
      const emailsToSend: Record<string, { name: string; alerts: Alert[] }> = {};

      allEngineerDetails.forEach((engineer) => {
        let schemeAlerts: Alert[] = [];

        // Match by scheme_id or scheme_name
        if (engineer.scheme_id && allAlertsBySchemeId[engineer.scheme_id]) {
          schemeAlerts = schemeAlerts.concat(allAlertsBySchemeId[engineer.scheme_id]);
        } else if (engineer.scheme && allAlertsBySchemeName[engineer.scheme]) {
          schemeAlerts = schemeAlerts.concat(allAlertsBySchemeName[engineer.scheme]);
        }

        if (schemeAlerts.length > 0) {
          // Civil Engineer
          if (engineer.civil_engineer_email && engineer.civil_engineer_email.includes('@')) {
            if (!emailsToSend[engineer.civil_engineer_email]) {
              emailsToSend[engineer.civil_engineer_email] = {
                name: engineer.civil_engineer_name || "Civil Engineer",
                alerts: [],
              };
            }
            emailsToSend[engineer.civil_engineer_email].alerts.push(...schemeAlerts);
          }

          // Mechanical Engineer
          if (engineer.mechanical_engineer_email && engineer.mechanical_engineer_email.includes('@')) {
            if (!emailsToSend[engineer.mechanical_engineer_email]) {
              emailsToSend[engineer.mechanical_engineer_email] = {
                name: engineer.mechanical_engineer_name || "Mechanical Engineer",
                alerts: [],
              };
            }
            emailsToSend[engineer.mechanical_engineer_email].alerts.push(...schemeAlerts);
          }

          // Site Supervisor
          if (engineer.site_supervisor_email && engineer.site_supervisor_email.includes('@')) {
            if (!emailsToSend[engineer.site_supervisor_email]) {
              emailsToSend[engineer.site_supervisor_email] = {
                name: engineer.site_supervisor_name || "Site Supervisor",
                alerts: [],
              };
            }
            emailsToSend[engineer.site_supervisor_email].alerts.push(...schemeAlerts);
          }

          // Build emailAlertLogs entries for each issue in this scheme
          schemeAlerts.forEach((alert) => {
            const baseLog = {
              scheme_id: alert.scheme_id,
              scheme_name: alert.scheme_name,
              region: engineer.region || null,
              village_name: alert.village_name || null,
              esr_name: alert.esr_name || null,
              civil_engineer_name: engineer.civil_engineer_name || null,
              civil_engineer_email: engineer.civil_engineer_email || null,
              mechanical_engineer_name: engineer.mechanical_engineer_name || null,
              mechanical_engineer_email: engineer.mechanical_engineer_email || null,
              site_supervisor_name: engineer.site_supervisor_name || null,
              site_supervisor_email: engineer.site_supervisor_email || null,
            };

            const generateTicketId = () => `TKT-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            if (alert.chlorine_issue) {
              emailLogsToInsert.push({ ...baseLog, alert_type: "Chlorine", alert_value: String(alert.chlorine_value), ticket_id: generateTicketId() });
            }
            if (alert.pressure_issue) {
              emailLogsToInsert.push({ ...baseLog, alert_type: "Pressure", alert_value: String(alert.pressure_value), ticket_id: generateTicketId() });
            }
            if (alert.lpcd_issue) {
              emailLogsToInsert.push({ ...baseLog, alert_type: "LPCD", alert_value: String(alert.lpcd_value), ticket_id: generateTicketId() });
            }
            if (alert.water_issue) {
              emailLogsToInsert.push({ ...baseLog, alert_type: "Water", alert_value: String(alert.water_value), ticket_id: generateTicketId() });
            }
          });
        }
      });

      // First: ensure email_acknowledgements table exists (with correct schema)
      const dbClient = await pool.connect();
      try {
        await dbClient.query(`
          CREATE TABLE IF NOT EXISTS email_acknowledgements (
            id SERIAL PRIMARY KEY,
            token VARCHAR(128) NOT NULL,
            scheme_id VARCHAR(50) NOT NULL,
            alert_type VARCHAR(20) NOT NULL,
            engineer_email VARCHAR(255) NOT NULL,
            engineer_name VARCHAR(255),
            sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
            acknowledged_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_token ON email_acknowledgements(token);
          CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_scheme ON email_acknowledgements(scheme_id, alert_type, sent_date);
        `);
      } catch (e) {
        // Table may already exist with old schema — that's OK, we'll work with what we have
      } finally {
        dbClient.release();
      }

      // Send the consolidated emails
      const emails = Object.keys(emailsToSend);
      console.log(`📧 Preparing to send ${emails.length} alert emails...`);

      for (const email of emails) {
        const { name, alerts } = emailsToSend[email];
        // Deduplicate alerts for this person just in case
        const uniqueAlertsMap = new Map();
        alerts.forEach(a => {
          const key = `${a.scheme_id}-${a.village_name}-${a.esr_name}-${a.chlorine_issue}-${a.pressure_issue}-${a.lpcd_issue}-${a.water_issue}`;
          uniqueAlertsMap.set(key, a);
        });
        const uniqueAlerts = Array.from(uniqueAlertsMap.values());

        // Generate ONE token for this engineer that covers all their schemes in this email.
        const engineerToken = generateAcknowledgeToken();
        const tokenClient = await pool.connect();
        try {
          for (const alert of uniqueAlerts) {
            const alertType = alert.chlorine_issue ? 'Chlorine' : alert.pressure_issue ? 'Pressure' : 'LPCD';
            // Insert one row per scheme — all sharing the same engineer token.
            await tokenClient.query(
              `INSERT INTO email_acknowledgements (token, scheme_id, alert_type, engineer_email, engineer_name, sent_date)
               VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
              [engineerToken, alert.scheme_id, alertType, email, name]
            );
          }
        } finally {
          tokenClient.release();
        }

        try {
          // Pass the single engineer token — email shows ONE acknowledge button for the whole email.
          await sendDailyAlertEmail(email, name, uniqueAlerts, engineerToken);
          console.log(`✅ Sent alert email to ${email} for ${uniqueAlerts.length} issues.`);
        } catch (err) {
          console.error(`❌ Failed to send alert email to ${email}:`, err);
        }
      }

      // Persist logs in database
      if (emailLogsToInsert.length > 0) {
        console.log(`💾 Saving ${emailLogsToInsert.length} alert logs to the database...`);
        // We do batch inserts to prevent inserting thousands of rows in one query block
        const batchSize = 100;
        for (let i = 0; i < emailLogsToInsert.length; i += batchSize) {
          const batch = emailLogsToInsert.slice(i, i + batchSize);
          await db.insert(emailAlertLogs).values(batch);
        }
        console.log("✅ Alert logs saved successfully.");
      }

    } catch (error) {
      console.error("❌ Error running daily alerts cron job:", error);
    }
}
