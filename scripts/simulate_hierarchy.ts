import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = await getDB();
    
    // Call the hierarchy endpoint logic or check what engineers have logins
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

    const usersRes = await db.execute(sql`
      SELECT id, username, name, email, phone, role 
      FROM users 
      WHERE role != 'admin'
    `);
    const allUsers = usersRes.rows as any[];

    const loginsRes = await db.execute(sql`
      SELECT id, user_id, username, login_time, logout_time, session_duration, ip_address, user_agent, is_active
      FROM user_login_logs
      ORDER BY login_time DESC
    `);
    const allLogins = loginsRes.rows as any[];

    // Pre-group logins by user_id and username
    const loginsByUserId = new Map<number, any[]>();
    const loginsByUsername = new Map<string, any[]>();
    for (const log of allLogins) {
      if (log.user_id) {
        if (!loginsByUserId.has(log.user_id)) loginsByUserId.set(log.user_id, []);
        if (loginsByUserId.get(log.user_id)!.length < 30) {
          loginsByUserId.get(log.user_id)!.push(log);
        }
      }
      if (log.username) {
        const uKey = log.username.toLowerCase();
        if (!loginsByUsername.has(uKey)) loginsByUsername.set(uKey, []);
        if (loginsByUsername.get(uKey)!.length < 30) {
          loginsByUsername.get(uKey)!.push(log);
        }
      }
    }

    const roleFields = [
      { rank: 1, level: "CE" as const, title: "Chief Engineer (CE)", n: "chief_engineer_name", e: "chief_engineer_email", p: "chief_engineer_mobile" },
      { rank: 2, level: "SE" as const, title: "Superintending Engineer (SE)", n: "se_name", e: "se_email", p: "se_mobile" },
      { rank: 3, level: "EE" as const, title: "Executive Engineer (EE Civil)", n: "ee_civil_name", e: "ee_civil_email", p: "ee_civil_mobile" },
      { rank: 3, level: "EE" as const, title: "Executive Engineer (EE Mech)", n: "ee_mech_name", e: "ee_mech_email", p: "ee_mech_mobile" },
      { rank: 4, level: "DE/AE" as const, title: "Deputy / Assistant Engineer (DE/AE Civil)", n: "de_ae_civil_name", e: "de_ae_civil_email", p: "de_ae_civil_mobile" },
      { rank: 4, level: "DE/AE" as const, title: "Deputy / Assistant Engineer (DE/AE Mech)", n: "de_ae_mech_name", e: "de_ae_mech_email", p: "de_ae_mech_mobile" },
    ];

    function isValidEngineerName(name: any): boolean {
      if (!name) return false;
      const str = String(name).trim();
      if (!str || str === "-" || str === "--" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined" || str.toLowerCase() === "na") return false;
      return true;
    }

    const cleanStr = (s: any) => (s ? String(s).replace(/^\uFEFF/, "").trim() : "");
    const directoryMap = new Map<string, any>();

    for (const row of schemesRes.rows as any[]) {
      for (const r of roleFields) {
        const name = cleanStr(row[r.n]);
        const email = cleanStr(row[r.e]).toLowerCase();
        const phone = cleanStr(row[r.p]);

        if (isValidEngineerName(name)) {
          const key = name.toLowerCase();
          if (!directoryMap.has(key)) {
            directoryMap.set(key, {
              key,
              rank: r.rank,
              level: r.level,
              position_title: r.title,
              name,
              email,
              phone,
            });
          }
          const item = directoryMap.get(key);
          if (email && !item.email) item.email = email;
          if (phone && !item.phone) item.phone = phone;
        }
      }
    }

    for (const u of allUsers) {
      const email = cleanStr(u.email).toLowerCase();
      const name = cleanStr(u.name);
      const phone = cleanStr(u.phone).replace(/\D/g, "").slice(-10);

      let matchedItem: any = null;
      for (const item of Array.from(directoryMap.values())) {
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
      }
    }

    const engineersWithLogins = [];
    for (const eng of Array.from(directoryMap.values())) {
      let logins: any[] = [];
      if (eng.user_id && loginsByUserId.has(eng.user_id)) {
        logins = loginsByUserId.get(eng.user_id)!;
      } else if (eng.username && loginsByUsername.has(eng.username.toLowerCase())) {
        logins = loginsByUsername.get(eng.username.toLowerCase())!;
      }
      if (logins.length > 0) {
        engineersWithLogins.push({
          name: eng.name,
          username: eng.username,
          user_id: eng.user_id,
          logins_count: logins.length
        });
      }
    }

    console.log("Engineers in directoryMap with logins:", engineersWithLogins);
    console.log(`Total engineers in directoryMap: ${directoryMap.size}`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
