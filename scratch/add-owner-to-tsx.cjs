const fs = require('fs');
const path = require('path');

const tsxPath = path.join(__dirname, '../client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(tsxPath, 'utf8');

// Replace TableHead
content = content.replace(/(<TableHead className="[^"]*text-([a-z]+)-50[^"]*">\s*Scheme Name\s*<\/TableHead>)/g, 
`$1\n<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-$2-50 !px-4 !py-3.5 w-[100px] border-r border-white/10 text-center">\nOwner\n</TableHead>`);

// Replace TableCell
content = content.replace(/(<TableCell className="[^"]*border-([a-z]+)-100\/80[^"]*">\s*\{sensor\.scheme_name\}\s*<\/TableCell>)/g, 
`$1\n<TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-$2-100/80 dark:border-$2-900/60 font-medium">\n{sensor.owner || 'N/A'}\n</TableCell>`);

// Replace Excel export columns in chlorine-routes.ts
const chlorineRoutesPath = path.join(__dirname, '../server/routes/chlorine-routes.ts');
let chlorineRoutes = fs.readFileSync(chlorineRoutesPath, 'utf8');

// In division-sensors-export
chlorineRoutes = chlorineRoutes.replace(/({ header: 'Scheme Name', key: 'scheme_name', width: 30 },)/g, `$1\n      { header: 'Owner', key: 'owner', width: 15 },`);
chlorineRoutes = chlorineRoutes.replace(/scheme_name: row\.scheme_name,/g, `scheme_name: row.scheme_name,\n        owner: row.owner || 'N/A',`);

// In day-wise-sensors-export
chlorineRoutes = chlorineRoutes.replace(/scheme_name: sensor\.scheme_name,/g, `scheme_name: sensor.scheme_name,\n        owner: sensor.owner || 'N/A',`);

fs.writeFileSync(tsxPath, content);
fs.writeFileSync(chlorineRoutesPath, chlorineRoutes);
console.log('Replaced TSX and Chlorine Routes Excel Exports');
