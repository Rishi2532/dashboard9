const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'pressure-routes.ts');
console.log(`Reading ${filePath}...`);

let content = fs.readFileSync(filePath, 'utf8');

// Regex to capture:
// Group 1: Newline + indentation + AND cs.pressure_status = 'Offline' + newline
// Group 2: indentation + ${region
const regex = /(\n\s+AND cs\.pressure_status = 'Offline'\r?\n)(\s+\$\{region)/g;

let count = 0;
const newContent = content.replace(regex, (match, p1, p2) => {
    count++;
    console.log(`Match ${count} found.`);
    // Insert the filter line with same indentation (assumed from p2 or hardcoded)
    // p2 starts with spaces.
    return `${p1}            \${communicationStatusSchemeFilter}\n${p2}`;
});

console.log(`Replaced ${count} occurrences.`);

if (count > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("File saved.");
} else {
    console.error("No matches found!");
    process.exit(1);
}
