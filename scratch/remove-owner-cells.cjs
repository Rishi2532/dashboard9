const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/client/src/pages/chlorine/DetailedChlorinePage.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// 1-indexed line numbers
// 5953 to 5957
// 10906 to 10910
// 12205 to 12209

// To remove, we just make them empty strings or slice them out.
const toRemove = [
  ...Array.from({length: 5957 - 5953 + 1}, (_, i) => i + 5953),
  ...Array.from({length: 10910 - 10906 + 1}, (_, i) => i + 10906),
  ...Array.from({length: 12209 - 12205 + 1}, (_, i) => i + 12205)
];

const newLines = lines.filter((_, idx) => !toRemove.includes(idx + 1));
fs.writeFileSync(path, newLines.join('\n'));
console.log('Removed duplicate owner cells.');
