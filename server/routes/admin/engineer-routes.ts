import { Router, type Request, type Response } from "express";
import { getDB } from "../../db";
import { users, schemeEngineerDetails } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { DLT_TEMPLATES, sendSmartpingDLTSMS } from "../../services/sms-service";

const router = Router();

const createEngineerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").trim().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Full name is required").trim(),
  email: z.string().email("Valid email address is required").trim().toLowerCase(),
  phone: z.string().optional().nullable(),
});

const updateEngineerSchema = z.object({
  name: z.string().min(2, "Full name is required").trim().optional(),
  email: z.string().email("Valid email address is required").trim().toLowerCase().optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

/**
 * GET /api/admin/engineers
 * List all users with role 'engineer'
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const engineerUsers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
      })
      .from(users)
      .where(eq(users.role, "engineer"))
      .orderBy(sql`${users.id} DESC`);

    // Fetch scheme assignments count for each engineer
    const allSchemes = await db.select().from(schemeEngineerDetails);

    const engineersWithSchemeStats = engineerUsers.map((eng: any) => {
      const engEmail = (eng.email || "").trim().toLowerCase();
      const engName = (eng.name || "").trim().toLowerCase();

      const matchedSchemes = allSchemes.filter((s: any) => {
        const emails = [
          s.ee_civil_email,
          s.ee_mech_email,
          s.de_ae_civil_email,
          s.de_ae_mech_email,
          s.se_email,
          s.chief_engineer_email,
        ].map((e) => (e || "").trim().toLowerCase()).filter(Boolean);

        const names = [
          s.ee_civil_name,
          s.ee_mech_name,
          s.de_ae_civil_name,
          s.de_ae_mech_name,
          s.se_name,
          s.chief_engineer_name,
        ].map((n) => (n || "").trim().toLowerCase()).filter(Boolean);

        // Case 1 & 2: Match by name if engineer name exists, otherwise fall back to email
        if (engName) {
          return names.includes(engName);
        }
        return Boolean(engEmail && emails.includes(engEmail));
      });

      return {
        ...eng,
        assigned_schemes_count: matchedSchemes.length,
        assigned_scheme_ids: Array.from(new Set(matchedSchemes.map((s: any) => s.scheme_id).filter(Boolean))),
        assigned_scheme_names: Array.from(new Set(matchedSchemes.map((s: any) => s.scheme).filter(Boolean))),
      };
    });

    res.json({
      success: true,
      count: engineersWithSchemeStats.length,
      engineers: engineersWithSchemeStats,
    });
  } catch (error: any) {
    console.error("Error fetching engineer users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer accounts" });
  }
});

/**
 * Helper to format session duration nicely
 */
function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "Active / In-progress";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/**
 * Classify role/title/username into strict 4-tier hierarchy:
 * 1: Chief Engineer (CE)
 * 2: Superintending Engineer (SE)
 * 3: Executive Engineer (EE)
 * 4: Deputy / Assistant Engineer (DE / AE)
 * Explicitly excludes admin and site supervisor / section engineer
 */
function determineTier(titleOrUsername: string, role?: string): { rank: number; level: "CE" | "SE" | "EE" | "DE/AE"; title: string } | null {
  const s = (titleOrUsername || "").toLowerCase().trim();

  // Explicitly omit Admin, Site Supervisor, and Section Engineer
  if (
    s.includes("admin") ||
    s.includes("supervisor") ||
    s.includes("site supervisor") ||
    s.includes("section engineer")
  ) {
    return null;
  }

  if (s.startsWith("ce_") || s.includes("chief engineer") || s.includes("chief") || s === "ce") {
    return { rank: 1, level: "CE", title: "Chief Engineer (CE)" };
  }
  if (
    s.startsWith("se_") ||
    s.includes("superintending") ||
    s.includes("se circle") ||
    s.includes("se ur") ||
    s.includes("se mjp") ||
    s === "se"
  ) {
    return { rank: 2, level: "SE", title: "Superintending Engineer (SE)" };
  }
  if (
    s.startsWith("ee_") ||
    s.includes("executive") ||
    s.includes("ex engineer") ||
    s.includes("ee wm") ||
    s.includes("ee ur") ||
    s.includes("ee mjp") ||
    s === "ee"
  ) {
    const isMech = s.includes("mech");
    return { rank: 3, level: "EE", title: isMech ? "Executive Engineer (EE Mech)" : "Executive Engineer (EE Civil)" };
  }
  if (
    s.startsWith("de_") ||
    s.startsWith("ae_") ||
    s.includes("assistant") ||
    s.includes("deputy") ||
    s.includes("de/ae") ||
    s === "ae" ||
    s === "de"
  ) {
    const isMech = s.includes("mech");
    return { rank: 4, level: "DE/AE", title: isMech ? "Deputy / Assistant Engineer (DE/AE Mech)" : "Deputy / Assistant Engineer (DE/AE Civil)" };
  }

  if (role === "engineer") {
    return { rank: 3, level: "EE", title: "Executive Engineer (EE)" };
  }

  return null;
}

/**
 * GET /api/admin/engineers/hierarchy
 * Comprehensive Admin endpoint returning engineers organized position-wise:
 * 1. Chief Engineer (CE)
 * 2. Superintending Engineer (SE)
 * 3. Executive Engineer (EE)
 * 4. Deputy / Assistant Engineer (DE / AE)
 * Includes: Mail, alerts sent, last 30 logins, and actions taken (acknowledgements, issue resolutions)
 */
router.get("/hierarchy", async (req: Request, res: Response) => {
  try {
    const db = await getDB();

    // 1. Fetch schemes roster
    const schemesRes = await db.execute(sql`
      SELECT 
        id, region, district, division, scheme_id, scheme,
        chief_engineer_name, chief_engineer_mobile, chief_engineer_email,
        se_name, se_mobile, se_email,
        ee_civil_name, ee_civil_mobile, ee_civil_email,
        ee_mech_name, ee_mech_mobile, ee_mech_email,
        de_ae_civil_name, de_ae_civil_mobile, de_ae_civil_email,
        de_ae_mech_name, de_ae_mech_mobile, de_ae_mech_email
      FROM scheme_engineer_details
    `);

    // 2. Fetch users (excluding admin)
    const usersRes = await db.execute(sql`
      SELECT id, username, name, email, phone, role 
      FROM users 
      WHERE role != 'admin'
    `);
    const allUsers = usersRes.rows as any[];

    // 3. Fetch login logs
    const loginsRes = await db.execute(sql`
      SELECT id, user_id, username, login_time, logout_time, session_duration, ip_address, user_agent, is_active
      FROM user_login_logs
      ORDER BY login_time DESC
    `);
    const allLogins = loginsRes.rows as any[];

    // 4. Fetch email_acknowledgements
    let allAcks: any[] = [];
    try {
      const acksRes = await db.execute(sql`
        SELECT id, token, scheme_id, alert_type, alert_id, ticket_id, esr_name, engineer_email, engineer_name, sent_date, acknowledged_at, created_at
        FROM email_acknowledgements
        ORDER BY created_at DESC
      `);
      allAcks = acksRes.rows as any[];
    } catch (e: any) {
      console.warn("Could not query email_acknowledgements:", e.message);
    }

    // 5. Fetch issue_reports
    let allIssues: any[] = [];
    try {
      const issuesRes = await db.execute(sql`
        SELECT id, problem_level, region, scheme_id, scheme_name, village_name, esr_name, status_value, reason, sensor_type, status, resolution_remark, resolved_at, created_by, creator_name, created_at
        FROM issue_reports
        ORDER BY created_at DESC
      `);
      allIssues = issuesRes.rows as any[];
    } catch (e: any) {
      console.warn("Could not query issue_reports:", e.message);
    }

    // 6. Fetch user_activity_logs
    let allActivities: any[] = [];
    try {
      const activitiesRes = await db.execute(sql`
        SELECT id, user_id, username, activity_type, activity_description, file_name, timestamp
        FROM user_activity_logs
        ORDER BY timestamp DESC
      `);
      allActivities = activitiesRes.rows as any[];
    } catch (e: any) {
      // Table might not exist or be empty
    }

    // 7. Fetch sms_alert_logs
    let allSmsLogs: any[] = [];
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sms_alert_logs (
          id SERIAL PRIMARY KEY,
          mobile VARCHAR(30) NOT NULL,
          engineer_name VARCHAR(255),
          engineer_email VARCHAR(255),
          scheme_id VARCHAR(100),
          scheme_name VARCHAR(255),
          template_id VARCHAR(50),
          template_name VARCHAR(100),
          message_text TEXT,
          gateway_status INTEGER,
          gateway_response TEXT,
          is_success BOOLEAN DEFAULT TRUE,
          sent_date DATE DEFAULT CURRENT_DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      const smsRes = await db.execute(sql`
        SELECT id, mobile, engineer_name, engineer_email, scheme_id, scheme_name, template_id, template_name, message_text, gateway_status, gateway_response, is_success, sent_date, created_at
        FROM sms_alert_logs
        ORDER BY created_at DESC
      `);
      allSmsLogs = smsRes.rows as any[];
    } catch (e: any) {
      console.warn("Could not query sms_alert_logs:", e.message);
    }

    // Pre-group logins by user_id and username
    const loginsByUserId = new Map<number, any[]>();
    const loginsByUsername = new Map<string, any[]>();
    for (const log of allLogins) {
      const formattedLog = {
        ...log,
        session_duration_formatted: formatDuration(log.session_duration),
      };
      if (log.user_id) {
        if (!loginsByUserId.has(log.user_id)) loginsByUserId.set(log.user_id, []);
        if (loginsByUserId.get(log.user_id)!.length < 30) {
          loginsByUserId.get(log.user_id)!.push(formattedLog);
        }
      }
      if (log.username) {
        const uKey = log.username.toLowerCase();
        if (!loginsByUsername.has(uKey)) loginsByUsername.set(uKey, []);
        if (loginsByUsername.get(uKey)!.length < 30) {
          loginsByUsername.get(uKey)!.push(formattedLog);
        }
      }
    }

    // Pre-group acks by engineer email and name
    const acksByEmail = new Map<string, any[]>();
    const acksByName = new Map<string, any[]>();
    for (const ack of allAcks) {
      if (ack.engineer_email) {
        const eKey = ack.engineer_email.trim().toLowerCase();
        if (!acksByEmail.has(eKey)) acksByEmail.set(eKey, []);
        acksByEmail.get(eKey)!.push(ack);
      }
      if (ack.engineer_name) {
        const nKey = ack.engineer_name.trim().toLowerCase();
        if (!acksByName.has(nKey)) acksByName.set(nKey, []);
        acksByName.get(nKey)!.push(ack);
      }
    }

    // Pre-group SMS logs by mobile (last 10 digits), email, and name
    const smsByMobile = new Map<string, any[]>();
    const smsByEmail = new Map<string, any[]>();
    const smsByName = new Map<string, any[]>();
    for (const sms of allSmsLogs) {
      if (sms.mobile) {
        const mKey = sms.mobile.replace(/\D/g, "").slice(-10);
        if (mKey) {
          if (!smsByMobile.has(mKey)) smsByMobile.set(mKey, []);
          smsByMobile.get(mKey)!.push(sms);
        }
      }
      if (sms.engineer_email) {
        const eKey = sms.engineer_email.trim().toLowerCase();
        if (!smsByEmail.has(eKey)) smsByEmail.set(eKey, []);
        smsByEmail.get(eKey)!.push(sms);
      }
      if (sms.engineer_name) {
        const nKey = sms.engineer_name.trim().toLowerCase();
        if (!smsByName.has(nKey)) smsByName.set(nKey, []);
        smsByName.get(nKey)!.push(sms);
      }
    }

    // Pre-group issues by created_by and creator_name
    const issuesByUserId = new Map<number, any[]>();
    const issuesByCreatorName = new Map<string, any[]>();
    for (const issue of allIssues) {
      if (issue.created_by) {
        if (!issuesByUserId.has(issue.created_by)) issuesByUserId.set(issue.created_by, []);
        issuesByUserId.get(issue.created_by)!.push(issue);
      }
      if (issue.creator_name) {
        const nKey = issue.creator_name.trim().toLowerCase();
        if (!issuesByCreatorName.has(nKey)) issuesByCreatorName.set(nKey, []);
        issuesByCreatorName.get(nKey)!.push(issue);
      }
    }

    // Pre-group user activities by user_id and username
    const activitiesByUserId = new Map<number, any[]>();
    const activitiesByUsername = new Map<string, any[]>();
    for (const act of allActivities) {
      if (act.user_id) {
        if (!activitiesByUserId.has(act.user_id)) activitiesByUserId.set(act.user_id, []);
        activitiesByUserId.get(act.user_id)!.push(act);
      }
      if (act.username) {
        const uKey = act.username.toLowerCase();
        if (!activitiesByUsername.has(uKey)) activitiesByUsername.set(uKey, []);
        activitiesByUsername.get(uKey)!.push(act);
      }
    }

    // Build the directory of engineers strictly from scheme_engineer_details
    const roleFields = [
      { rank: 1, level: "CE" as const, title: "Chief Engineer (CE)", n: "chief_engineer_name", e: "chief_engineer_email", p: "chief_engineer_mobile" },
      { rank: 2, level: "SE" as const, title: "Superintending Engineer (SE)", n: "se_name", e: "se_email", p: "se_mobile" },
      { rank: 3, level: "EE" as const, title: "Executive Engineer (EE Civil)", n: "ee_civil_name", e: "ee_civil_email", p: "ee_civil_mobile" },
      { rank: 3, level: "EE" as const, title: "Executive Engineer (EE Mech)", n: "ee_mech_name", e: "ee_mech_email", p: "ee_mech_mobile" },
      { rank: 4, level: "DE/AE" as const, title: "Deputy / Assistant Engineer (DE/AE Civil)", n: "de_ae_civil_name", e: "de_ae_civil_email", p: "de_ae_civil_mobile" },
      { rank: 4, level: "DE/AE" as const, title: "Deputy / Assistant Engineer (DE/AE Mech)", n: "de_ae_mech_name", e: "de_ae_mech_email", p: "de_ae_mech_mobile" },
    ];

    const cleanStr = (s: any) => (s ? String(s).replace(/^\uFEFF/, "").trim() : "");
    const directoryMap = new Map<string, any>();

    for (const row of schemesRes.rows as any[]) {
      for (const r of roleFields) {
        const name = cleanStr(row[r.n]);
        const email = cleanStr(row[r.e]).toLowerCase();
        const phone = cleanStr(row[r.p]);

        if (name || email) {
          const key = name ? `${r.rank}::${name.toLowerCase()}` : `${r.rank}::${email}`;
          if (!directoryMap.has(key)) {
            directoryMap.set(key, {
              key,
              rank: r.rank,
              level: r.level,
              position_title: r.title,
              name: name || email,
              email,
              phone,
              regions: new Set(),
              districts: new Set(),
              divisions: new Set(),
              schemes: new Set(),
            });
          }
          const item = directoryMap.get(key);
          if (email && !item.email) item.email = email;
          if (phone && !item.phone) item.phone = phone;
          if (row.region) item.regions.add(cleanStr(row.region));
          if (row.district) item.districts.add(cleanStr(row.district));
          if (row.division) item.divisions.add(cleanStr(row.division));
          if (row.scheme) item.schemes.add(cleanStr(row.scheme));
        }
      }
    }

    // Match registered users strictly against engineers existing in directoryMap
    // Do NOT inject phantom user records that are not in scheme_engineer_details!
    for (const u of allUsers) {
      const email = cleanStr(u.email).toLowerCase();
      const name = cleanStr(u.name);
      const phone = cleanStr(u.phone).replace(/\D/g, "").slice(-10);

      let matchedItem: any = null;
      for (const item of directoryMap.values()) {
        if (name && item.name && item.name.toLowerCase() === name.toLowerCase()) {
          matchedItem = item;
          break;
        }
        if (email && item.email && item.email.toLowerCase() === email) {
          matchedItem = item;
          break;
        }
        if (phone && item.phone && item.phone.replace(/\D/g, "").slice(-10) === phone) {
          matchedItem = item;
          break;
        }
      }

      if (matchedItem) {
        matchedItem.user_id = u.id;
        matchedItem.username = u.username;
        matchedItem.is_registered = true;
        if (!matchedItem.email && email) matchedItem.email = email;
        if (!matchedItem.phone && u.phone) matchedItem.phone = u.phone;
      }
    }

    // Process logins, alerts, SMS, and actions taken for each engineer
    const engineers = Array.from(directoryMap.values()).map((eng: any) => {
      const emailKey = (eng.email || "").trim().toLowerCase();
      const nameKey = (eng.name || "").trim().toLowerCase();
      const phoneKey = (eng.phone || "").replace(/\D/g, "").slice(-10);

      // 1. Logins
      let logins: any[] = [];
      if (eng.user_id && loginsByUserId.has(eng.user_id)) {
        logins = loginsByUserId.get(eng.user_id)!;
      } else if (eng.username && loginsByUsername.has(eng.username.toLowerCase())) {
        logins = loginsByUsername.get(eng.username.toLowerCase())!;
      }
      const lastLogin = logins.length > 0 ? logins[0].login_time : null;

      // 2. Alerts & Acks
      const matchedAcks = [
        ...(emailKey && acksByEmail.has(emailKey) ? acksByEmail.get(emailKey)! : []),
        ...(nameKey && acksByName.has(nameKey) ? acksByName.get(nameKey)! : []),
      ];
      // Deduplicate acks by id
      const uniqueAcks = Array.from(new Map(matchedAcks.map((a: any) => [a.id, a])).values());
      const alertsSentCount = uniqueAcks.length;
      const ackedList = uniqueAcks.filter((a: any) => a.acknowledged_at != null);
      const alertsAcknowledgedCount = ackedList.length;
      const ackRate = alertsSentCount > 0 ? Math.round((alertsAcknowledgedCount / alertsSentCount) * 100) : 0;

      // 3. SMS Dispatches
      const matchedSms = [
        ...(phoneKey && smsByMobile.has(phoneKey) ? smsByMobile.get(phoneKey)! : []),
        ...(emailKey && smsByEmail.has(emailKey) ? smsByEmail.get(emailKey)! : []),
        ...(nameKey && smsByName.has(nameKey) ? smsByName.get(nameKey)! : []),
      ];
      const uniqueSms = Array.from(new Map(matchedSms.map((s: any) => [s.id, s])).values());
      const smsSentCount = uniqueSms.length;

      // 4. Actions Taken timeline
      const actions: any[] = [];

      // Alert acknowledgements
      for (const ack of ackedList) {
        actions.push({
          id: `ack-${ack.id}`,
          type: "alert_acknowledged",
          category: "Alert Acknowledgement",
          title: `Acknowledged ${ack.alert_type} Alert`,
          description: `Alert for Scheme ${ack.scheme_id}${ack.esr_name ? ` (${ack.esr_name})` : ""}. Ticket #${ack.ticket_id || ack.id}`,
          timestamp: ack.acknowledged_at,
          meta: {
            ticket_id: ack.ticket_id,
            scheme_id: ack.scheme_id,
            alert_type: ack.alert_type,
            esr_name: ack.esr_name,
          },
        });
      }

      // SMS Alerts Dispatched
      for (const sms of uniqueSms) {
        actions.push({
          id: `sms-${sms.id}`,
          type: "sms_sent",
          category: "SMS Dispatched",
          title: `SMS: ${sms.template_name || "Daily Alert Dispatch"}`,
          description: `Dispatched to ${sms.mobile}${sms.scheme_name ? ` for Scheme: ${sms.scheme_name}` : ""}. Message: ${sms.message_text || ""}`,
          timestamp: sms.created_at || sms.sent_date,
          meta: {
            sms_id: sms.id,
            mobile: sms.mobile,
            scheme_id: sms.scheme_id,
            scheme_name: sms.scheme_name,
            template_name: sms.template_name,
            template_id: sms.template_id,
            status: sms.gateway_status,
            is_success: sms.is_success,
          },
        });
      }

      // Issue resolution / reports
      const matchedIssues = [
        ...(eng.user_id && issuesByUserId.has(eng.user_id) ? issuesByUserId.get(eng.user_id)! : []),
        ...(nameKey && issuesByCreatorName.has(nameKey) ? issuesByCreatorName.get(nameKey)! : []),
      ];
      const uniqueIssues = Array.from(new Map(matchedIssues.map((i: any) => [i.id, i])).values());
      for (const issue of uniqueIssues) {
        if (issue.status === "Resolved" || issue.resolution_remark) {
          actions.push({
            id: `issue-res-${issue.id}`,
            type: "issue_resolved",
            category: "Issue Resolution",
            title: `Resolved ${issue.sensor_type || issue.problem_level} Issue`,
            description: `Scheme ${issue.scheme_name}: ${issue.resolution_remark || "Marked as resolved"}`,
            timestamp: issue.resolved_at || issue.created_at,
            meta: {
              issue_id: issue.id,
              scheme_id: issue.scheme_id,
              scheme_name: issue.scheme_name,
              remark: issue.resolution_remark,
            },
          });
        } else {
          actions.push({
            id: `issue-rep-${issue.id}`,
            type: "issue_reported",
            category: "Issue Report",
            title: `Reported ${issue.sensor_type || issue.problem_level} Issue`,
            description: `Scheme ${issue.scheme_name} (${issue.village_name || "Scheme level"}): ${issue.reason}`,
            timestamp: issue.created_at,
            meta: {
              issue_id: issue.id,
              scheme_id: issue.scheme_id,
              scheme_name: issue.scheme_name,
            },
          });
        }
      }

      // User activities (downloads, visits)
      const matchedActivities = [
        ...(eng.user_id && activitiesByUserId.has(eng.user_id) ? activitiesByUserId.get(eng.user_id)! : []),
        ...(eng.username && activitiesByUsername.has(eng.username.toLowerCase()) ? activitiesByUsername.get(eng.username.toLowerCase())! : []),
      ];
      for (const act of matchedActivities.slice(0, 15)) {
        actions.push({
          id: `act-${act.id}`,
          type: "user_activity",
          category: "User Activity",
          title: act.activity_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          description: act.activity_description || (act.file_name ? `Downloaded ${act.file_name}` : "Activity logged"),
          timestamp: act.timestamp,
          meta: {
            activity_type: act.activity_type,
            file_name: act.file_name,
          },
        });
      }

      // Sort actions chronologically descending
      actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        key: eng.key,
        rank: eng.rank,
        level: eng.level,
        position_title: eng.position_title,
        name: eng.name,
        email: eng.email,
        phone: eng.phone,
        user_id: eng.user_id || null,
        username: eng.username || null,
        is_registered: Boolean(eng.is_registered),
        regions: Array.from(eng.regions),
        districts: Array.from(eng.districts),
        divisions: Array.from(eng.divisions),
        schemes: Array.from(eng.schemes),
        schemes_count: eng.schemes.size,
        alerts_sent_count: alertsSentCount,
        alerts_acknowledged_count: alertsAcknowledgedCount,
        acknowledgement_rate: ackRate,
        sms_sent_count: smsSentCount,
        total_logins_recorded: logins.length,
        last_login_at: lastLogin,
        last_30_logins: logins,
        actions_taken: actions.slice(0, 30),
        actions_count: actions.length,
      };
    });

    // Sort by rank ascending (1: CE, 2: SE, 3: EE, 4: DE/AE), then name
    engineers.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.name.localeCompare(b.name);
    });

    // Compute KPI counts
    const kpis = {
      total_engineers: engineers.length,
      ce_count: engineers.filter((e) => e.level === "CE").length,
      se_count: engineers.filter((e) => e.level === "SE").length,
      ee_count: engineers.filter((e) => e.level === "EE").length,
      de_ae_count: engineers.filter((e) => e.level === "DE/AE").length,
      registered_count: engineers.filter((e) => e.is_registered).length,
      total_alerts_sent: engineers.reduce((acc, e) => acc + e.alerts_sent_count, 0),
      total_alerts_acknowledged: engineers.reduce((acc, e) => acc + e.alerts_acknowledged_count, 0),
      total_sms_sent: engineers.reduce((acc, e) => acc + (e.sms_sent_count || 0), 0),
      total_actions_taken: engineers.reduce((acc, e) => acc + e.actions_count, 0),
    };

    res.json({
      success: true,
      kpis,
      engineers,
    });
  } catch (error: any) {
    console.error("Error fetching engineer hierarchy:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer hierarchy data" });
  }
});

/**
 * POST /api/admin/engineers/test-sms
 * Allows admin to trigger a test DLT SMS to verify server gateway connectivity
 */
router.post("/test-sms", async (req: Request, res: Response) => {
  try {
    const { mobile, templateType = "PRESSURE_LOW", scheme = "7940695", value = "0.15" } = req.body;
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    const template = DLT_TEMPLATES[templateType as keyof typeof DLT_TEMPLATES] || DLT_TEMPLATES.PRESSURE_LOW;
    const messageText = template.render(scheme, value);

    const result = await sendSmartpingDLTSMS({
      mobile,
      text: messageText,
      dltContentId: template.contentId,
    });

    res.json({
      success: result.success,
      gatewayStatus: result.status,
      gatewayResponse: result.response,
      error: result.error,
      payload: {
        mobile,
        templateName: template.name,
        templateId: template.contentId,
        messageText,
      },
    });
  } catch (err: any) {
    console.error("Error sending test SMS:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/engineers/directory
 * List distinct engineers found in scheme_engineer_details to allow one-click account creation
 */
router.get("/directory", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const allSchemes = await db.select().from(schemeEngineerDetails);
    const existingUsers = await db.select().from(users).where(eq(users.role, "engineer"));
    const registeredEmails = new Set(
      existingUsers.map((u: any) => (u.email || "").trim().toLowerCase()).filter(Boolean)
    );

    const directoryMap = new Map<string, {
      name: string;
      email: string;
      phone: string;
      role_title: string;
      region?: string | null;
      district?: string | null;
      division?: string | null;
      schemes: string[];
      is_registered: boolean;
      existing_username?: string;
    }>();

    for (const row of allSchemes) {
      const rolesConfig = [
        { name: row.ee_civil_name, email: row.ee_civil_email, phone: row.ee_civil_mobile, title: "EE (Civil)" },
        { name: row.ee_mech_name, email: row.ee_mech_email, phone: row.ee_mech_mobile, title: "EE (Mech)" },
        { name: row.de_ae_civil_name, email: row.de_ae_civil_email, phone: row.de_ae_civil_mobile, title: "DE/AE (Civil)" },
        { name: row.de_ae_mech_name, email: row.de_ae_mech_email, phone: row.de_ae_mech_mobile, title: "DE/AE (Mech)" },
        { name: row.se_name, email: row.se_email, phone: row.se_mobile, title: "Superintending Engineer (SE)" },
        { name: row.chief_engineer_name, email: row.chief_engineer_email, phone: row.chief_engineer_mobile, title: "Chief Engineer" },
      ];

      for (const r of rolesConfig) {
        if (r.name || r.email) {
          const email = (r.email || "").trim().toLowerCase();
          const name = (r.name || "").trim();
          const phone = (r.phone || "").trim();
          // Unique key by name + email to prevent shared emails from merging different engineers
          const key = name ? `${name.toLowerCase()}::${email}` : email;

          if (key) {
            if (!directoryMap.has(key)) {
              const matchedUser = existingUsers.find((u: any) => 
                (name && (u.name || "").trim().toLowerCase() === name.toLowerCase()) ||
                (!name && email && (u.email || "").trim().toLowerCase() === email)
              );
              const isReg = Boolean(matchedUser);
              directoryMap.set(key, {
                name,
                email,
                phone,
                role_title: r.title,
                region: row.region,
                district: row.district,
                division: row.division,
                schemes: [],
                is_registered: isReg,
                existing_username: matchedUser?.username,
              });
            }
            if (row.scheme) directoryMap.get(key)!.schemes.push(row.scheme);
          }
        }
      }
    }

    const directory = Array.from(directoryMap.values()).map((item) => ({
      ...item,
      schemes_count: Array.from(new Set(item.schemes)).length,
      schemes: Array.from(new Set(item.schemes)).slice(0, 10),
    }));

    res.json({
      success: true,
      directory,
    });
  } catch (error: any) {
    console.error("Error fetching engineer directory:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer roster directory" });
  }
});

/**
 * POST /api/admin/engineers
 * Admin creates a new login credential for an engineer in the users table
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const validated = createEngineerSchema.parse(req.body);

    // Check if username already exists
    const [existingByUsername] = await db
      .select()
      .from(users)
      .where(eq(users.username, validated.username));

    if (existingByUsername) {
      return res.status(409).json({
        success: false,
        message: `Username '${validated.username}' is already taken. Please choose another username.`,
      });
    }

    // Insert new engineer user
    const [newUser] = await db
      .insert(users)
      .values({
        username: validated.username,
        password: validated.password,
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        role: "engineer", // Strictly enforced
      })
      .returning();

    res.status(201).json({
      success: true,
      message: `Engineer account '${newUser.username}' created successfully`,
      engineer: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || "Invalid engineer account data",
        errors: error.errors,
      });
    }
    console.error("Error creating engineer user:", error);
    res.status(500).json({ success: false, message: "Failed to create engineer account" });
  }
});

/**
 * PUT /api/admin/engineers/:id
 * Admin updates engineer account credentials or details
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const engineerId = parseInt(req.params.id, 10);
    if (isNaN(engineerId)) {
      return res.status(400).json({ success: false, message: "Invalid engineer ID" });
    }

    const validated = updateEngineerSchema.parse(req.body);

    const [existing] = await db.select().from(users).where(eq(users.id, engineerId));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Engineer account not found" });
    }

    const updateFields: any = {};
    if (validated.name !== undefined) updateFields.name = validated.name;
    if (validated.email !== undefined) updateFields.email = validated.email;
    if (validated.phone !== undefined) updateFields.phone = validated.phone;
    if (validated.password && validated.password.trim().length >= 6) {
      updateFields.password = validated.password.trim();
    }

    const [updated] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, engineerId))
      .returning();

    res.json({
      success: true,
      message: `Engineer account '${updated.username}' updated successfully`,
      engineer: {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || "Invalid update data",
        errors: error.errors,
      });
    }
    console.error("Error updating engineer user:", error);
    res.status(500).json({ success: false, message: "Failed to update engineer account" });
  }
});

/**
 * DELETE /api/admin/engineers/:id
 * Admin deletes an engineer user
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const engineerId = parseInt(req.params.id, 10);
    if (isNaN(engineerId)) {
      return res.status(400).json({ success: false, message: "Invalid engineer ID" });
    }

    const [existing] = await db.select().from(users).where(eq(users.id, engineerId));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Engineer account not found" });
    }

    if (existing.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot delete administrator accounts via this portal" });
    }

    await db.delete(users).where(eq(users.id, engineerId));

    res.json({
      success: true,
      message: `Engineer account '${existing.username}' deleted successfully`,
    });
  } catch (error: any) {
    console.error("Error deleting engineer user:", error);
    res.status(500).json({ success: false, message: "Failed to delete engineer account" });
  }
});

export default router;
