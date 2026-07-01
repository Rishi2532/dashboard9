const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace TableHead
content = content.replace(/(<TableHead[^>]*>[\s\n]*Scheme Name[\s\n]*<\/TableHead>)/g, (match, p1) => {
    // Clone p1 and replace Scheme Name with Owner
    let ownerHead = p1.replace('Scheme Name', 'Owner');
    // Ensure w-[100px] and text-center
    ownerHead = ownerHead.replace(/w-\[\d+px\]/, 'w-[100px]');
    if (!ownerHead.includes('text-center')) {
        ownerHead = ownerHead.replace('className="', 'className="text-center ');
    }
    return p1 + '\n' + ownerHead;
});

// Replace TableCell
// It needs to match <TableCell>... {item.scheme_name} ... </TableCell>
content = content.replace(/(<TableCell[^>]*>[\s\S]*?\{(sensor|item|scheme|village)\.scheme_name\}[\s\S]*?<\/TableCell>)/g, (match, p1, objName) => {
    let ownerCell = `                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">\n                                        {${objName}.owner || ${objName}.agency_type || 'N/A'}\n                                      </TableCell>`;
    return p1 + '\n' + ownerCell;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Done");
