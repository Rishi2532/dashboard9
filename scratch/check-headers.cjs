const fs = require('fs');
const content = fs.readFileSync('client/src/pages/chlorine/DetailedChlorinePage.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line) => {
    if (line.includes('<TableHead')) {
        let text = line.split('>')[1] || '';
        if (text) {
            console.log(text.split('<')[0].trim());
        } else {
             console.log(line);
        }
    }
});
