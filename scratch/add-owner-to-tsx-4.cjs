const fs = require('fs');
const path = require('path');
const tsxPath = path.join(__dirname, '../client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(tsxPath, 'utf8');

content = content.replace(/(<TableHead[^>]*>\s*Scheme Name\s*<\/TableHead>)/g, 
$1\n                                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[100px] border-r border-white/10 text-center">\n                                    Owner\n                                  </TableHead>);

content = content.replace(/(<TableCell[^>]*>\s*\{sensor\.scheme_name\}\s*<\/TableCell>)/g, 
$1\n                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 font-medium">\n                                        {sensor.owner || 'N/A'}\n                                      </TableCell>);

fs.writeFileSync(tsxPath, content);
console.log('Replaced TSX precisely');
