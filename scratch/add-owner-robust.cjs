const fs = require('fs');

function injectOwnerColumn(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Inject TableHead
    // We look for <TableHead ...>Scheme Name</TableHead>
    const headRegex = /(<TableHead[^>]*>)\s*Scheme Name\s*(<\/TableHead>)/g;
    let headMatchCount = 0;
    content = content.replace(headRegex, (match, openTag, closeTag) => {
        headMatchCount++;
        const newHead = `\n                                      ${openTag}Owner${closeTag}`;
        return match + newHead;
    });

    // 2. Inject TableCell
    // We look for <TableCell ...> ... </TableCell>
    const cellRegex = /<TableCell[\s\S]*?<\/TableCell>/g;
    let cellMatchCount = 0;
    
    let result = '';
    let lastIndex = 0;
    
    let match;
    while ((match = cellRegex.exec(content)) !== null) {
        const cellText = match[0];
        
        // Check if it's the Scheme Name cell
        if (cellText.includes('.scheme_name') && !cellText.includes('renderRemarkCell')) {
            cellMatchCount++;
            
            // Extract the object name (item, sensor, scheme, village, etc)
            // e.g. {item.scheme_name}
            const objMatch = cellText.match(/\{?([a-zA-Z0-9_]+)\.scheme_name/);
            const objName = objMatch ? objMatch[1] : 'item';
            
            const newCell = `\n                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">\n                                        {${objName}.owner || ${objName}.agency_type || 'N/A'}\n                                      </TableCell>`;
            
            result += content.substring(lastIndex, match.index + match[0].length);
            result += newCell;
            lastIndex = match.index + match[0].length;
        }
    }
    result += content.substring(lastIndex);

    console.log(`Matched TableHead: ${headMatchCount}`);
    console.log(`Matched TableCell: ${cellMatchCount}`);
    
    fs.writeFileSync(filePath, result, 'utf-8');
}

injectOwnerColumn('c:\\Users\\12626\\dashboard8\\client\\src\\pages\\chlorine\\DetailedChlorinePage.tsx');
