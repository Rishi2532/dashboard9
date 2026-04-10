const fs = require('fs');
const path = 'c:/Users/12626/dashboard8/client/src/pages/chlorine/ChlorineDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Remove extra closing div at line 2373
// We'll look for the specific block of 5 closing divs/tags
const extraDivPattern = /<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+\{ \/\* Regional Summary Mini-Table/;
if (extraDivPattern.test(content)) {
    console.log("Found extra div at 2373");
    content = content.replace(extraDivPattern, "</div>\n        </div>\n      </div>\n    </div>\n\n      {/* Regional Summary Mini-Table");
}

// Fix 2: Remove corrupted legacy block (2733-2803 approx)
// This block starts with </Table> and ends before the Remark Details Dialog
const legacyBlockPattern = /<\/Table>\s+<\/div>\s+\{\/\* Pagination \*\/\}[\s\S]*?\{totalPages > 1 && \([\s\S]*?<\/Pagination>[\s\S]*?<\/div>[\s\S]*?\}[\s\S]*?<\/>[\s\S]*?\}\s+(?=\{ \/\* Remark Details Dialog \*\/)/;
if (legacyBlockPattern.test(content)) {
    console.log("Found legacy block corruption");
    content = content.replace(legacyBlockPattern, "");
}

fs.writeFileSync(path, content);
console.log("Fixed ChlorineDashboard.tsx");
