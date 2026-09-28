import { getDB } from '../server/db';
import { sql } from 'drizzle-orm';

async function testHierarchy() {
  const db = await getDB();
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
          directoryMap.set(key, { key, name, email, phone, rank: r.rank, level: r.level });
        }
      }
    }
  }

  console.log('Current hierarchy directory count:', directoryMap.size);
  console.log('Current keys:', Array.from(directoryMap.keys()));
  process.exit(0);
}

testHierarchy().catch(console.error);
