const fs = require('fs');
let content = fs.readFileSync('client/src/pages/chlorine/DetailedChlorinePage.tsx', 'utf8');
const lines = content.split('\n');
let changes = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('renderRemarkCell(issues,') || lines[i].includes('renderRemarkCell(esrIssues,')) {
    let defined = false;
    for(let j=Math.max(0, i-5); j<=i; j++) {
      if (lines[j].includes('const issues =') || lines[j].includes('let issues =') || lines[j].includes('var issues =') ||
          lines[j].includes('const esrIssues =') || lines[j].includes('let esrIssues =')) defined = true;
    }
    if (defined) continue;

    let match = lines[i].match(/\$\{([a-zA-Z0-9_]+)\./);
    if (!match) {
        console.log('No match found on line', i+1, lines[i]);
        continue;
    }
    let objName = match[1];

    let type = '';
    if (lines[i].includes('.esr_name')) {
      type = 'esr';
    } else if (lines[i].includes('.village_name')) {
      type = 'village';
    } else if (lines[i].includes('.scheme_name')) {
      type = 'scheme';
    }

    let issuesStr = '[]';
    if (type === 'esr') {
      issuesStr = `(esrIssuesMap?.get(\`\${${objName}.scheme_id}-\${${objName}.village_name}-\${${objName}.esr_name}\`) || [])`;
    } else if (type === 'village') {
      issuesStr = `(villageIssuesMap?.get(\`\${${objName}.scheme_id}-\${${objName}.village_name}\`) || [])`;
    } else if (type === 'scheme') {
      issuesStr = `(schemeIssuesMap?.get(String(${objName}.scheme_id)) || [])`;
    }

    lines[i] = lines[i].replace(/renderRemarkCell\((issues|esrIssues),/, `renderRemarkCell(${issuesStr},`);
    changes++;
  }
}
fs.writeFileSync('client/src/pages/chlorine/DetailedChlorinePage.tsx', lines.join('\n'), 'utf8');
console.log('Replaced ' + changes + ' occurrences successfully');
