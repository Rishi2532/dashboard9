const fs = require('fs');
const content = fs.readFileSync('client/src/pages/chlorine/DetailedChlorinePage.tsx', 'utf8');
const matches = content.match(/<TableHead[^>]*>([\s\S]*?)<\/TableHead>/g);
if (matches) {
    matches.forEach(m => console.log(m.replace(/<[^>]+>/g, '').trim()));
}
