import fs from 'fs';
const content = fs.readFileSync('server/routes/chlorine-routes.ts', 'utf8');
const lines = content.split('\n');
let inString = false;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '`') {
            // Check for escaping
            let escs = 0; let k = j - 1;
            while (k >= 0 && line[k] === '\\') { escs++; k--; }
            if (escs % 2 === 0) {
                inString = !inString;
                if (i >= 6900 && i <= 7150) {
                    console.log(`Line ${i + 1}, col ${j + 1}: backtick found, now inside string? ${inString}`);
                }
            }
        }
    }
}
