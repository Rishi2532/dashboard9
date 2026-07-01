const fs = require('fs');
const content = fs.readFileSync('client/src/pages/chlorine/DetailedChlorinePage.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('Agency') || line.includes('agency') || line.includes('Owner') || line.includes('owner')) {
        console.log(`Line ${i+1}: ${line}`);
    }
});
