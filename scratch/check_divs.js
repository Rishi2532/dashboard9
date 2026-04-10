const fs = require('fs');
const content = fs.readFileSync('c:/Users/12626/dashboard8/client/src/pages/chlorine/ChlorineDashboard.tsx', 'utf8');

let stack = [];
let lineNum = 0;
const lines = content.split('\n');

for (let line of lines) {
    lineNum++;
    // Simple regex to find <div and </div
    // This is naive but might help for well-formatted code
    const opens = line.match(/<div/g);
    const closes = line.match(/<\/div/g);
    
    if (opens) {
        opens.forEach(() => stack.push({ line: lineNum, type: 'open' }));
    }
    if (closes) {
        closes.forEach(() => {
            if (stack.length === 0) {
                console.log(`Extra closing div at line ${lineNum}`);
            } else {
                stack.pop();
            }
        });
    }
}

console.log(`Remaining open tags: ${stack.length}`);
stack.forEach(s => console.log(`Unclosed tag at line ${s.line}`));
