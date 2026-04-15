
const { Pool } = require('pg');
require('dotenv').config();

const SERVER_PATH = '\\\\DemoAF\\JJM\\JJM\\Maharashtra';
const VILLAGE_BASE_URL = 'https://mahajaliot.in/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD';
const SCHEME_BASE_URL = 'https://mahajaliot.in/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD';
const STANDARD_PARAMS = 'hidetoolbar=true&hidesidebar=true&mode=kiosk';

function cleanNameForUrl(name) {
  if (!name) return "";
  return name.replace(/\uFFFD/g, String.fromCharCode(160));
}

function generateVillageUrl(v) {
  if (!v.region || !v.block || !v.scheme_id || !v.scheme_name || !v.village_name) return null;
  const region = cleanNameForUrl(v.region);
  const circle = cleanNameForUrl(v.circle);
  const division = cleanNameForUrl(v.division);
  const sub_division = cleanNameForUrl(v.sub_division);
  const block = cleanNameForUrl(v.block);
  const cleanSchemeName = cleanNameForUrl(v.scheme_name);
  const cleanVillageName = cleanNameForUrl(v.village_name);

  const path = `${SERVER_PATH}\\Region-${region}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${v.scheme_id} - ${cleanSchemeName}\\${cleanVillageName}`;
  return `${VILLAGE_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodeURIComponent(path)}`;
}

function generateSchemeUrl(s) {
  if (!s.region || !s.block || !s.scheme_id || !s.scheme_name) return null;
  const region = cleanNameForUrl(s.region);
  const circle = cleanNameForUrl(s.circle);
  const division = cleanNameForUrl(s.division);
  const sub_division = cleanNameForUrl(s.sub_division);
  const block = cleanNameForUrl(s.block);
  const cleanSchemeName = cleanNameForUrl(s.scheme_name);

  const path = `${SERVER_PATH}\\Region-${region}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${s.scheme_id} - ${cleanSchemeName}`;
  return `${SCHEME_BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodeURIComponent(path)}`;
}

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('Regenerating all water_scheme_data links...');
    const villages = await client.query('SELECT * FROM water_scheme_data');
    for (const v of villages.rows) {
      const url = generateVillageUrl(v);
      if (url) {
        await client.query('UPDATE water_scheme_data SET dashboard_url = $1 WHERE scheme_id = $2 AND village_name = $3 AND block = $4', [url, v.scheme_id, v.village_name, v.block]);
      }
    }
    console.log(`Updated ${villages.rows.length} villages.`);

    console.log('Regenerating all scheme_status links...');
    const schemes = await client.query('SELECT * FROM scheme_status');
    for (const s of schemes.rows) {
      const url = generateSchemeUrl(s);
      if (url) {
        await client.query('UPDATE scheme_status SET dashboard_url = $1 WHERE scheme_id = $2 AND block = $3', [url, s.scheme_id, s.block]);
      }
    }
    console.log(`Updated ${schemes.rows.length} schemes.`);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
