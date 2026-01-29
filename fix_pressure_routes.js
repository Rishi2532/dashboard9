const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'pressure-routes.ts');
console.log(`Reading ${filePath}...`);

let content = fs.readFileSync(filePath, 'utf8');

const targetStr = "AND cs.pressure_status = 'Offline'";
const insertStr = "\n            ${communicationStatusSchemeFilter}";

// We want to insert it after the target string, but only if it's not already there.
// And we want to do it for both occurrences.

const parts = content.split(targetStr);
console.log(`Found ${parts.length - 1} occurrences.`);

if (parts.length < 3) {
    console.error("Expected at least 2 occurrences!");
    // process.exit(1); 
    // Proceed anyway if it found at least 1? No, we expect 2.
    // If it found 1, check if the other one is already patched?
}

let newContent = "";
for (let i = 0; i < parts.length - 1; i++) {
    newContent += parts[i] + targetStr;
    // Check if next part already starts with the filter
    const nextPart = parts[i+1];
    if (nextPart.trim().startsWith("${communicationStatusSchemeFilter}")) {
        console.log(`Occurrence ${i+1} already patched.`);
    } else {
        console.log(`Patching occurrence ${i+1}...`);
        newContent += insertStr;
    }
}
newContent += parts[parts.length - 1];

fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Done.");
