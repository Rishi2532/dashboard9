const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const newLines = [];

let insideTableHead = false;
let tableHeadLines = [];
let tableHeadContainsSchemeName = false;

let insideTableCell = false;
let tableCellLines = [];
let tableCellContainsSchemeName = false;
let objNameForCell = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Handle TableHead
  if (line.includes('<TableHead')) {
    insideTableHead = true;
    tableHeadLines = [];
    tableHeadContainsSchemeName = false;
  }

  if (insideTableHead) {
    tableHeadLines.push(line);
    if (line.includes('Scheme Name')) {
      tableHeadContainsSchemeName = true;
    }
    if (line.includes('</TableHead>')) {
      insideTableHead = false;
      newLines.push(...tableHeadLines);
      if (tableHeadContainsSchemeName) {
        // Clone the exact same TableHead but replace 'Scheme Name' with 'Owner'
        // Also ensure it is centered and has w-[100px]
        const ownerLines = tableHeadLines.map(l => {
          let modified = l.replace('Scheme Name', 'Owner');
          if (modified.includes('className=')) {
            // Force width to 100px and text-center
            modified = modified.replace(/w-\[\d+px\]/, 'w-[100px]');
            if (!modified.includes('text-center')) {
               modified = modified.replace('className="', 'className="text-center ');
            }
          }
          return modified;
        });
        newLines.push(...ownerLines);
      }
      continue;
    }
    continue;
  }

  // Handle TableCell
  if (line.includes('<TableCell')) {
    insideTableCell = true;
    tableCellLines = [];
    tableCellContainsSchemeName = false;
    objNameForCell = '';
  }

  if (insideTableCell) {
    tableCellLines.push(line);
    
    // Check for object.scheme_name
    const match = line.match(/\{(sensor|item|scheme|village)\.scheme_name\}/);
    if (match) {
      tableCellContainsSchemeName = true;
      objNameForCell = match[1];
    }

    if (line.includes('</TableCell>')) {
      insideTableCell = false;
      newLines.push(...tableCellLines);
      if (tableCellContainsSchemeName && objNameForCell) {
        // Find the cell's own className or use a default one that matches the rest
        const ownerCell = `                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">\n                                        {${objNameForCell}.owner || ${objNameForCell}.agency_type || 'N/A'}\n                                      </TableCell>`;
        newLines.push(ownerCell);
      }
      continue;
    }
    continue;
  }

  newLines.push(line);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('TSX successfully replaced line-by-line via node block processing');
