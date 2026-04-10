const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/client/src/pages/chlorine/ChlorineDashboard.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// We will find extra closing divs by looking for </div> on a line by itself that is part of an imbalance
// Based on the diagnostic script, we know there are extra ones at:
// Line 1921 (double closing instead of single)
// Line 2373
// Line 2734 (inside Table/Dialog mess)
// Line 2869

// Actually, I'll just use the stack logic to automatically identify and REMOVE extra closing tags
let stack = [];
let toRemove = new Set();

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = line.match(/<div(\s|>)/g);
    const closes = line.match(/<\/div>/g);
    
    if (opens) {
        opens.forEach(() => stack.push(i));
    }
    if (closes) {
        closes.forEach(() => {
            if (stack.length === 0) {
                console.log(`Marking extra closing div at line ${i+1} for removal`);
                toRemove.add(i);
            } else {
                stack.pop();
            }
        });
    }
}

// Special case: if we have unclosed tags at the end, it might mean we closed something else too early.
// But the script said 0 remaining open tags.

let filteredLines = lines.filter((_, i) => !toRemove.has(i));
fs.writeFileSync(path, filteredLines.join('\n'));
console.log(`Removed ${toRemove.size} extra closing divs`);
