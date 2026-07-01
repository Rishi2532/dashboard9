const fs = require('fs');
const path = require('path');

const tsxPath = path.join(__dirname, '../client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(tsxPath, 'utf8');

// The TableHead might have newlines inside
// We match <TableHead ... >[spaces/newlines]Scheme Name[spaces/newlines]</TableHead>
content = content.replace(/(<TableHead[^>]*text-([a-z]+)-50[^>]*>[\s\n]*Scheme Name[\s\n]*<\/TableHead>)/g, 
`$1\n                                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-$2-50 !px-4 !py-3.5 w-[100px] border-r border-white/10 text-center">\n                                    Owner\n                                  </TableHead>`);

// Also match text-slate-100 which is used in some tables
content = content.replace(/(<TableHead[^>]*text-slate-100[^>]*>[\s\n]*Scheme Name[\s\n]*<\/TableHead>)/g, 
`$1\n                                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[100px] border-r border-white/10 text-center">\n                                    Owner\n                                  </TableHead>`);

// Also match teal-50 which is used in some tables if not matched by [a-z]+
// Replace TableCell
// The regex finds <TableCell ...>{sensor.scheme_name}</TableCell>
content = content.replace(/(<TableCell[^>]*border-([a-z]+)-100\/80[^>]*>[\s\n]*\{sensor\.scheme_name\}[\s\n]*<\/TableCell>)/g, 
`$1\n                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-$2-100/80 dark:border-$2-900/60 font-medium">\n                                        {sensor.owner || 'N/A'}\n                                      </TableCell>`);

// Handle TableCells with hardcoded borders like border-slate-100
content = content.replace(/(<TableCell[^>]*border-slate-100\/80[^>]*>[\s\n]*\{sensor\.scheme_name\}[\s\n]*<\/TableCell>)/g, 
`$1\n                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 font-medium">\n                                        {sensor.owner || 'N/A'}\n                                      </TableCell>`);

fs.writeFileSync(tsxPath, content);
console.log('Replaced TSX');
