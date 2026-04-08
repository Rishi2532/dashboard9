
import fs from 'fs';
import path from 'path';

const filePath = 'server/routes/chlorine-routes.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: /scheme-lpcd/region-comparison
const target1 = `          FROM (
            SELECT DISTINCT ON (region, scheme_name) *
            FROM scheme_calculated_values
            WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
            ORDER BY region, scheme_name, block
          ) calculated`;

const replacement1 = `          FROM (
            SELECT DISTINCT ON (scheme_id) *
            FROM scheme_calculated_values
            WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
            ORDER BY scheme_id, block
          ) calculated`;

// Fix 2: /scheme-lpcd/region-comparison-schemes/:category
const target2 = `          FROM (
            SELECT DISTINCT ON (region, scheme_name) *
            FROM scheme_calculated_values
            WHERE scheme_name IS NOT NULL AND BTRIM(scheme_name) <> ''
            ORDER BY region, scheme_name, block
          ) calculated`;

// Since they might be slightly different in indentation or hidden chars, 
// I will use a more flexible replacement or a regex if needed.
// But first I'll try exact match if I can find it in the content.

if (content.includes(target1)) {
    console.log("Found target 1");
    content = content.replace(target1, replacement1);
} else {
    console.log("Target 1 not found exactly. Trying flexible match.");
    // Flexible match for the first occurrence (around line 7043)
    const regex1 = /SELECT DISTINCT ON \(region, scheme_name\) \*[\s\S]*?FROM scheme_calculated_values[\s\S]*?ORDER BY region, scheme_name, block/m;
    content = content.replace(regex1, (match) => {
        console.log("Matched regex 1");
        return match.replace('DISTINCT ON (region, scheme_name)', 'DISTINCT ON (scheme_id)')
                    .replace('ORDER BY region, scheme_name, block', 'ORDER BY scheme_id, block');
    });
}

// Second occurrence (around line 7273)
const regex2 = /SELECT DISTINCT ON \(region, scheme_name\) \*[\s\S]*?FROM scheme_calculated_values[\s\S]*?ORDER BY region, scheme_name, block/m;
// We already replaced the first one, so we replace the next one.
if (regex2.test(content)) {
    console.log("Found target 2 with regex");
    content = content.replace(regex2, (match) => {
        console.log("Matched regex 2");
        return match.replace('DISTINCT ON (region, scheme_name)', 'DISTINCT ON (scheme_id)')
                    .replace('ORDER BY region, scheme_name, block', 'ORDER BY scheme_id, block');
    });
}

fs.writeFileSync(filePath, content);
console.log("Done.");
