const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('server/routes/chlorine-routes.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Fix weekly_... branch (around line 7401+)
content = content.replace(
  /SELECT DISTINCT ss\.region, ss\.circle, ss\.division, ss\.sub_division,\s*COALESCE\(NULLIF\(TRIM\(ss\.block\), ''\), ''\) as block,\s*\(ss\.scheme_id::text\) as scheme_id, ss\.scheme_name,\s*ss\.dashboard_url/g,
  `SELECT DISTINCT ss.region, ss.circle, ss.division, ss.sub_division, \n                              COALESCE(NULLIF(TRIM(ss.block), ''), '') as block, \n                              (ss.scheme_id::text) as scheme_id, ss.scheme_name,\n                              ss.dashboard_url, ss.agency_type`
);

content = content.replace(
  /MAX\(s\.dashboard_url\) as dashboard_url\s*FROM all_schemes s/g,
  `MAX(s.dashboard_url) as dashboard_url, MAX(s.agency_type) as agency_type\n            FROM all_schemes s`
);

content = content.replace(
  /LEFT JOIN weekly_data w ON s\.scheme_id = w\.scheme_id AND s\.block = w\.block/g,
  `LEFT JOIN weekly_data w ON TRIM(s.scheme_id) = TRIM(w.scheme_id) AND s.block = w.block`
);

// 2. Fix the ELSE branch (daily data) (around line 7490+)
content = content.replace(
  /SELECT lr\.\*, ss\.region, ss\.circle, ss\.division, ss\.sub_division, ss\.dashboard_url\s*FROM latest_ranks lr\s*LEFT JOIN scheme_status ss ON lr\.scheme_id = ss\.scheme_id/g,
  `SELECT lr.*, ss.region, ss.circle, ss.division, ss.sub_division, ss.dashboard_url, ss.agency_type\n            FROM latest_ranks lr\n            LEFT JOIN scheme_status ss ON TRIM(lr.scheme_id) = TRIM(ss.scheme_id)`
);

// 3. Add agency_type to res.json map
content = content.replace(
  /dashboard_url: row\.dashboard_url,\s*scheme_id: row\.scheme_id/g,
  `dashboard_url: row.dashboard_url,\n          agency_type: row.agency_type,\n          scheme_id: row.scheme_id`
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log("chlorine-routes.ts updated!");
