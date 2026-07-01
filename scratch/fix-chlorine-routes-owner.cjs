const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('server/routes/chlorine-routes.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// The SQL query now returns `agency_type`.
// The response map is using `row.owner || 'N/A'`, so we must map `agency_type` to `owner`
content = content.replace(
  /owner: row\.owner \|\| 'N\/A'/g,
  `owner: row.agency_type || 'N/A'`
);

// Note: Ensure `owner: row.agency_type` without 'N/A' is covered if any
content = content.replace(
  /owner: row\.owner,/g,
  `owner: row.agency_type,`
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log("chlorine-routes.ts owner fields updated!");
