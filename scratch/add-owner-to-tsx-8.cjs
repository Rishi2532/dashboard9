const fs = require('fs');
const path = require('path');
const tsxPath = path.join(__dirname, '../client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(tsxPath, 'utf8');

let lines = content.split(/\r?\n/);
let outLines = [];

for(let i=0; i < lines.length; i++) {
    let line = lines[i];
    outLines.push(line);
    
    // We want to add Owner TableHead after </TableHead> if the previous lines were for Scheme Name
    if (line.includes('Scheme Name') && outLines[outLines.length - 2] && outLines[outLines.length - 2].includes('<TableHead')) {
        let colorMatch = outLines[outLines.length - 2].match(/text-([a-z]+-50|slate-100)/);
        let color = colorMatch ? colorMatch[1] : 'slate-100';
        
        let k = i + 1;
        while (k < lines.length && !lines[k].includes('</TableHead>')) {
            outLines.push(lines[k]);
            k++;
        }
        outLines.push(lines[k]); // push </TableHead>
        i = k; // skip those lines
        
        outLines.push(`                                  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-${color} !px-4 !py-3.5 w-[100px] border-r border-white/10 text-center">`);
        outLines.push(`                                    Owner`);
        outLines.push(`                                  </TableHead>`);
        continue;
    }

    let match = line.match(/\{(sensor|item|scheme|village)\.scheme_name\}/);
    if (match && outLines[outLines.length - 2] && outLines[outLines.length - 2].includes('<TableCell')) {
        let objName = match[1];
        let borderMatch = outLines[outLines.length - 2].match(/border-([a-z]+)-100\/80/);
        let color = borderMatch ? borderMatch[1] : 'slate';
        
        let k = i + 1;
        while (k < lines.length && !lines[k].includes('</TableCell>')) {
            outLines.push(lines[k]);
            k++;
        }
        outLines.push(lines[k]); // push </TableCell>
        i = k; // skip those lines
        
        outLines.push(`                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-${color}-100/80 dark:border-${color}-900/60 font-medium truncate max-w-[150px]">`);
        outLines.push(`                                        {${objName}.owner || ${objName}.agency_type || 'N/A'}`);
        outLines.push(`                                      </TableCell>`);
        continue;
    }
}

fs.writeFileSync(tsxPath, outLines.join('\n'));
console.log('TSX successfully replaced line-by-line via node');
