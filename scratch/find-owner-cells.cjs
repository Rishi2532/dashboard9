const fs = require('fs');
const content = fs.readFileSync('c:/Users/12626/dashboard8/client/src/pages/chlorine/DetailedChlorinePage.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('renderRemarkCell(')) {
    for (let j = i + 1; j < i + 15 && j < lines.length; j++) {
      if (lines[j].includes('owner ||') || lines[j].includes('owner}')) {
         let startIdx = j;
         while(startIdx > i && !lines[startIdx].includes('<TableCell')) startIdx--;
         let endIdx = j;
         while(endIdx < i + 15 && !lines[endIdx].includes('</TableCell>')) endIdx++;
         console.log('Cell range:', startIdx + 1, 'to', endIdx + 1);
         break;
      }
    }
  }
}
