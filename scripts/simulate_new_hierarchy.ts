import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "Active / In Session";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

function isValidEngineerName(name: any): boolean {
  if (!name) return false;
  const str = String(name).trim();
  if (!str || str === "-" || str === "--" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined" || str.toLowerCase() === "na") return false;
  return true;
}

const cleanStr = (s: any) => (s ? String(s).replace(/^\uFEFF/, "").trim() : "");

async function run() {
  const db = await getDB();

  // 1. Schemes
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

  // 2. All users (excluding pure admin)
  const usersRes = await db.execute(sql`
    SELECT id, username, name, email, phone, role 
    FROM users 
    WHERE role != 'admin'
  `);
  const allUsers = usersRes.rows as any[];

  // 3. Login logs
  const loginsRes = await db.execute(sql`
    SELECT id, user_id, username, user_name, login_time, logout_time, session_duration, ip_address, user_agent, is_active
    FROM user_login_logs
    ORDER BY login_time DESC
  `);
  const allLogins = loginsRes.rows as any[];

  // Pre-group logins by user_id and username
  const loginsByUserId = new Map<number, any[]>();
  const loginsByUsername = new Map<string, any[]>();
  const loginsByName = new Map<string, any[]>();

  for (const log of allLogins) {
    const formattedLog = {
      ...log,
      session_duration_formatted: formatDuration(log.session_duration),
    };
    if (log.user_id) {
      if (!loginsByUserId.has(log.user_id)) loginsByUserId.set(log.user_id, []);
      loginsByUserId.get(log.user_id)!.push(formattedLog);
    }
    if (log.username) {
      const uKey = log.username.toLowerCase();
      if (!loginsByUsername.has(uKey)) loginsByUsername.set(uKey, []);
      loginsByUsername.get(uKey)!.push(formattedLog);
    }
    if (log.user_name) {
      const nKey = log.user_name.trim().toLowerCase();
      if (!loginsByName.has(nKey)) loginsByName.set(nKey, []);
      loginsByName.get(nKey)!.push(formattedLog);
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
            regions: new Set(),
            districts: new Set(),
            divisions: new Set(),
            schemes: new Set(),
          });
        }
        const item = directoryMap.get(key);
        if (r.rank < item.rank) {
          item.rank = r.rank;
          item.level = r.level;
          item.position_title = r.title;
        }
        if (email && !item.email) item.email = email;
        if (phone && !item.phone) item.phone = phone;
        if (row.region) item.regions.add(cleanStr(row.region));
        if (row.district) item.districts.add(cleanStr(row.district));
        if (row.division) item.divisions.add(cleanStr(row.division));
        if (row.scheme) item.schemes.add(cleanStr(row.scheme));
      }
    }
  }

  // Match registered users to directoryMap or add them as registered engineers
  for (const u of allUsers) {
    const email = cleanStr(u.email).toLowerCase();
    const name = cleanStr(u.name);
    const phone = cleanStr(u.phone).replace(/\D/g, "").slice(-10);
    const username = cleanStr(u.username);

    let matchedItem: any = null;

    // 1. Try exact username match if item already has username
    for (const item of Array.from(directoryMap.values())) {
      if (item.username && item.username.toLowerCase() === username.toLowerCase()) {
        matchedItem = item;
        break;
      }
    }

    // 2. Try exact name match (ignore case and spacing)
    if (!matchedItem && name) {
      for (const item of Array.from(directoryMap.values())) {
        if (!item.user_id && item.name && item.name.toLowerCase() === name.toLowerCase()) {
          matchedItem = item;
          break;
        }
      }
    }

    // 3. Try unique phone match (only if phone is 10 digits and not shared by multiple users)
    if (!matchedItem && phone && phone.length === 10) {
      const samePhoneUsers = allUsers.filter(usr => cleanStr(usr.phone).replace(/\D/g, "").slice(-10) === phone);
      if (samePhoneUsers.length === 1) {
        for (const item of Array.from(directoryMap.values())) {
          if (!item.user_id && item.phone && item.phone.replace(/\D/g, "").slice(-10) === phone) {
            matchedItem = item;
            break;
          }
        }
      }
    }

    // 4. Try unique email match (only if email is not shared by multiple users / not generic dummy)
    if (!matchedItem && email && !email.includes("salunkerishikesh") && !email.includes("rushikeshsalunkhe")) {
      const sameEmailUsers = allUsers.filter(usr => cleanStr(usr.email).toLowerCase() === email);
      if (sameEmailUsers.length === 1) {
        for (const item of Array.from(directoryMap.values())) {
          if (!item.user_id && item.email && item.email.toLowerCase() === email) {
            matchedItem = item;
            break;
          }
        }
      }
    }

    if (matchedItem) {
      matchedItem.user_id = u.id;
      matchedItem.username = u.username;
      matchedItem.is_registered = true;
      if (!matchedItem.email && email) matchedItem.email = email;
      if (!matchedItem.phone && u.phone) matchedItem.phone = u.phone;
    } else if (u.role === "engineer" || u.role === "admin2" || loginsByUserId.has(u.id)) {
      // Add as distinct registered engineer account!
      const userKey = `user-${u.id}-${username.toLowerCase()}`;
      if (!directoryMap.has(userKey)) {
        directoryMap.set(userKey, {
          key: userKey,
          rank: u.role === "admin2" ? 2 : 4,
          level: u.role === "admin2" ? "SE" : "DE/AE",
          position_title: u.role === "admin2" ? "Admin2 Officer" : "Deputy / Assistant Engineer (Field Engineer)",
          name: name || username,
          email: u.email || "",
          phone: u.phone || "",
          user_id: u.id,
          username: u.username,
          is_registered: true,
          regions: new Set(),
          districts: new Set(),
          divisions: new Set(),
          schemes: new Set(),
        });
      }
    }
  }

  // Count logins for each engineer
  const withLogins = [];
  for (const eng of Array.from(directoryMap.values())) {
    const collectedLogs = new Map<number, any>();
    if (eng.user_id && loginsByUserId.has(eng.user_id)) {
      for (const l of loginsByUserId.get(eng.user_id)!) collectedLogs.set(l.id, l);
    }
    if (eng.username && loginsByUsername.has(eng.username.toLowerCase())) {
      for (const l of loginsByUsername.get(eng.username.toLowerCase())!) collectedLogs.set(l.id, l);
    }
    // Only fallback to name if neither user_id nor username matched any logs
    if (collectedLogs.size === 0 && eng.name && loginsByName.has(eng.name.trim().toLowerCase())) {
      for (const l of loginsByName.get(eng.name.trim().toLowerCase())!) collectedLogs.set(l.id, l);
    }

    const logList = Array.from(collectedLogs.values())
      .sort((a, b) => new Date(b.login_time).getTime() - new Date(a.login_time).getTime())
      .slice(0, 30);

    if (logList.length > 0) {
      withLogins.push({
        name: eng.name,
        username: eng.username,
        user_id: eng.user_id,
        level: eng.level,
        logins_count: logList.length,
        latest_login: logList[0].login_time
      });
    }
  }

  console.log(`Total engineers in directory: ${directoryMap.size}`);
  console.log(`Engineers with logins: ${withLogins.length}`);
  console.log(withLogins);

  process.exit(0);
}

run();
