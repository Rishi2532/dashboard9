const fs = require('fs');
const code = fs.readFileSync('server/routes/chlorine-routes.ts', 'utf8');

// Find all occurrences of SELECT and print the lines around them
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SELECT ') || lines[i].includes('SELECT\n')) {
        console.log(`Line ${i + 1}: ${lines[i]}`);
    }
}
