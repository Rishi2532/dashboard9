const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const user = {
    username: 'rishikesh.salunke',
    name: 'Rishikesh Salunke',
    email: 'salunkerishikesh@gmail.com',
    phone: '9834955236'
  };

  const rows = (await pool.query('SELECT * FROM scheme_engineer_details')).rows;
  console.log(`Total rows in scheme_engineer_details: ${rows.length}`);

  const userEmail = (user.email || '').trim().toLowerCase();
  const userPhone = (user.phone || '').trim().replace(/\D/g, ''); // just digits
  const userName = (user.name || '').trim().toLowerCase();
  const userUsername = (user.username || '').trim().toLowerCase();

  const assigned = [];

  for (const eng of rows) {
    const ceEmail = (eng.civil_engineer_email || '').trim().toLowerCase();
    const cePhone = (eng.civil_engineer_mobile || '').trim().replace(/\D/g, '');
    const ceName = (eng.civil_engineer_name || '').trim().toLowerCase();

    const meEmail = (eng.mechanical_engineer_email || '').trim().toLowerCase();
    const mePhone = (eng.mechanical_engineer_mobile || '').trim().replace(/\D/g, '');
    const meName = (eng.mechanical_engineer_name || '').trim().toLowerCase();

    const ssEmail = (eng.site_supervisor_email || '').trim().toLowerCase();
    const ssPhone = (eng.site_supervisor_mobile || '').trim().replace(/\D/g, '');
    const ssName = (eng.site_supervisor_name || '').trim().toLowerCase();

    let matchedRole = null;
    let matchedName = null;
    let matchedEmail = null;
    let matchedPhone = null;

    // Helper to check match
    const isMatch = (eEmail, ePhone, eName) => {
      if (userEmail && eEmail && (eEmail === userEmail || userEmail.includes(eEmail) || eEmail.includes(userEmail))) return true;
      if (userPhone && ePhone && (ePhone.endsWith(userPhone) || userPhone.endsWith(ePhone))) return true;
      if (userName && eName && (eName === userName || userName.includes(eName) || eName.includes(userName))) return true;
      if (userUsername && eEmail && (userUsername === eEmail || eEmail.startsWith(userUsername))) return true;
      if (userUsername && eName && (userUsername.replace(/[\s._-]/g, '') === eName.replace(/[\s._-]/g, ''))) return true;
      return false;
    };

    if (isMatch(ceEmail, cePhone, ceName)) {
      matchedRole = 'Civil Engineer';
      matchedName = eng.civil_engineer_name;
      matchedEmail = eng.civil_engineer_email;
      matchedPhone = eng.civil_engineer_mobile;
    } else if (isMatch(meEmail, mePhone, meName)) {
      matchedRole = 'Mechanical Engineer';
      matchedName = eng.mechanical_engineer_name;
      matchedEmail = eng.mechanical_engineer_email;
      matchedPhone = eng.mechanical_engineer_mobile;
    } else if (isMatch(ssEmail, ssPhone, ssName)) {
      matchedRole = 'Site Supervisor';
      matchedName = eng.site_supervisor_name;
      matchedEmail = eng.site_supervisor_email;
      matchedPhone = eng.site_supervisor_mobile;
    }

    if (matchedRole && eng.scheme_id) {
      assigned.push({
        scheme_id: eng.scheme_id,
        scheme_name: eng.scheme,
        matchedRole,
        matchedName,
        matchedEmail,
        matchedPhone
      });
    }
  }

  console.log(`Matched ${assigned.length} schemes for ${user.username}:`);
  console.table(assigned);

  await pool.end();
}

main();
