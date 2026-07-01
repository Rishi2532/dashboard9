const fs = require('fs');
let code = fs.readFileSync('client/src/pages/chlorine/DetailedChlorinePage.tsx', 'utf8');
code = code.replace(/\{(\w+)\.owner \|\| \1\.agency_type \|\| 'N\/A'\}/g, '{$1?.owner || $1?.agency_type || \'N/A\'}');
fs.writeFileSync('client/src/pages/chlorine/DetailedChlorinePage.tsx', code);
console.log('Fixed optional chaining');
