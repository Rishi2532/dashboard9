const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/client/src/pages/chlorine/ChlorineDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 3: Remove extra closing div at line 1921 (now shifted probably)
// We look for the Select block ending followed by three closing divs
const selectEndPattern = /<\/Select>\s+<\/div>\s+<\/div>\s+<\/div>\s+(?=\{ \/\* Search and Actions Row)/;
if (selectEndPattern.test(content)) {
    console.log("Found extra div at 1921 area");
    content = content.replace(selectEndPattern, "</Select>\n          </div>\n        </div>\n\n      ");
}

fs.writeFileSync(path, content);
console.log("Fixed extra div at 1921 in ChlorineDashboard.tsx");
