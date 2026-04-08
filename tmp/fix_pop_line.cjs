
const fs = require('fs');
const path = 'server/routes/chlorine-routes.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Line 2540 (0-indexed 2539)
if (lines[2539].includes('FROM communication_status')) {
  lines[2539] = lines[2539].replace('communication_status', 'water_scheme_data');
}

// Line 3086 (0-indexed 3085)
if (lines[3085].includes('FROM communication_status')) {
  lines[3085] = lines[3085].replace('communication_status', 'water_scheme_data');
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixed population error efficiently.');
