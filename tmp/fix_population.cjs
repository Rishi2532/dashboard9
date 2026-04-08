
const fs = require('fs');
const path = 'server/routes/chlorine-routes.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix the population error in two places
const target = /FROM communication_status/g;
const replacement = 'FROM water_scheme_data';

// More specific check to ensure we only replace where it's part of the all_villages CTE with population
// But actually, population is not in communication_status at all, so any SELECT population ... FROM communication_status is an error.
// The CTE was: SELECT DISTINCT ... village_name, population FROM communication_status

const cteTarget = /SELECT DISTINCT region, circle, division, sub_division, block, \(scheme_id::text\) as scheme_id, scheme_name, village_name, population\s+FROM communication_status/g;
const cteReplacement = 'SELECT DISTINCT ON (scheme_id, village_name, block) region, circle, division, sub_division, block, (scheme_id::text) as scheme_id, scheme_name, village_name, population FROM water_scheme_data';

content = content.replace(cteTarget, cteReplacement);

fs.writeFileSync(path, content);
console.log('Successfully fixed population column error in chlorine-routes.ts');
