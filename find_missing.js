const fs = require('fs');
const file = 'c:/Users/HP/dashboard9/server/routes/chlorine-routes.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('router.get(')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
    for (let j = 1; j <= 5 && i + j < lines.length; j++) {
      if (lines[i+j].includes('req.query')) {
        console.log(`  Line ${i+j+1}: ${lines[i+j].trim()}`);
      }
    }
  }
}
