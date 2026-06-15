const fs = require('fs');
['server/cron/pi-chlorine-ingestion.ts', 'server/cron/pi-pressure-ingestion.ts'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 500) {
      lines[i] = '            if (pt && typeof pt.Value === \'number\' && pt.Good !== false && !pt.IsSystem && pt.Name !== \'Pt Created\' && (!pt.Value || (pt.Value.IsSystem !== true && pt.Value.Name !== \'Pt Created\'))) {';
    }
  }
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
});
console.log('Fixed');
