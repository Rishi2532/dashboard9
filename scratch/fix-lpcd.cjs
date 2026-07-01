const fs = require('fs');
let content = fs.readFileSync('c:\\Users\\12626\\dashboard8\\client\\src\\pages\\chlorine\\DetailedChlorinePage.tsx', 'utf8');

// The TableHeads have some class names inside them. Let's find all Owner table heads and add text-center.
content = content.replace(/(<TableHead[^>]*?)>Owner<\/TableHead>/g, (match, prefix) => {
    if (prefix.includes('className="')) {
        // if it doesn't already have text-center, add it
        if (!prefix.includes('text-center')) {
            return prefix.replace('className="', 'className="text-center ') + '>Owner</TableHead>';
        }
        return match;
    } else {
        return prefix + ' className="text-center">Owner</TableHead>';
    }
});
fs.writeFileSync('c:\\Users\\12626\\dashboard8\\client\\src\\pages\\chlorine\\DetailedChlorinePage.tsx', content);

let content2 = fs.readFileSync('c:\\Users\\12626\\dashboard8\\server\\routes\\scheme-lpcd-routes.ts', 'utf8');
content2 = content2.replace(/ss\.scheme_id = ss\.scheme_id/g, "TRIM(wsd.scheme_id) = TRIM(ss.scheme_id)"); // wait that's not right
// replace: h.scheme_id = ss.scheme_id with TRIM(h.scheme_id) = TRIM(ss.scheme_id)
content2 = content2.replace(/wsd\.scheme_id = ss\.scheme_id/g, "TRIM(wsd.scheme_id) = TRIM(ss.scheme_id)");
content2 = content2.replace(/sl\.scheme_id = ss\.scheme_id/g, "TRIM(sl.scheme_id) = TRIM(ss.scheme_id)");
content2 = content2.replace(/h\.scheme_id = ss\.scheme_id/g, "TRIM(h.scheme_id) = TRIM(ss.scheme_id)");

fs.writeFileSync('c:\\Users\\12626\\dashboard8\\server\\routes\\scheme-lpcd-routes.ts', content2);

console.log("Replaced!");
