const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Helper to add agencyType to params
const addAgencyType = (paramsIdent) => {
  return `if (selectedAgencyType !== 'ALL') ${paramsIdent}.append("agencyType", selectedAgencyType);`;
};

// 1. Chlorine Day-Wise (approx line 9278)
content = content.replace(
  /(const params = new URLSearchParams\(\);[\s\S]*?if \(schemeFilter === "fully_completed"\) params\.append\("fullyCompleted", "true"\);)/,
  `$1\n                                if (selectedAgencyType !== 'ALL') params.append("agencyType", selectedAgencyType);`
);

// 2. Pressure Day-Wise (approx line 9491)
content = content.replace(
  /(if \(schemeFilter === "fully_completed"\) \{[\s\S]*?params\.append\("fullyCompleted", "true"\);[\s\S]*?\})/,
  `$1\n                                if (selectedAgencyType !== 'ALL') {\n                                  params.append("agencyType", selectedAgencyType);\n                                }`
);

// 3. Region Comparison (approx line 9732)
content = content.replace(
  /(if \(schemeFilter === "fully_completed"\) \{[\s\S]*?params\.append\("fullyCompleted", "true"\);[\s\S]*?\})[\s\S]*?(window\.open\(\s*`\/api\/chlorine\/day-wise-sensors-export)/,
  (match, p1, p2) => {
    return p1 + `\n                                if (selectedAgencyType !== 'ALL') {\n                                  params.append("agencyType", selectedAgencyType);\n                                }\n` + p2;
  }
);

// 4. LPCD Day-Wise (approx line 9960)
content = content.replace(
  /(if \(schemeFilter === "fully_completed"\) \{[\s\S]*?params\.append\("fullyCompleted", "true"\);[\s\S]*?\})[\s\S]*?(window\.open\(\s*`\/api\/chlorine\/lpcd\/day-wise-villages-export)/,
  (match, p1, p2) => {
    return p1 + `\n                                if (selectedAgencyType !== 'ALL') {\n                                  params.append("agencyType", selectedAgencyType);\n                                }\n` + p2;
  }
);

// 5. Division Villages Chlorine (approx line 10918)
// Need unique marker
content = content.replace(
  /(data-testid="button-export-division-villages"[\s\S]*?if \(schemeFilter === "fully_completed"\) \{[\s\S]*?params\.append\("fullyCompleted", "true"\);[\s\S]*?\})/,
  `$1\n                                        if (selectedAgencyType !== 'ALL') {\n                                          params.append("agencyType", selectedAgencyType);\n                                        }`
);

// 6. Division Villages Pressure (approx line 12279)
// Need unique marker
content = content.replace(
  /(data-testid="button-export-pressure-division-villages"[\s\S]*?if \(schemeFilter === "fully_completed"\) \{[\s\S]*?params\.append\("fullyCompleted", "true"\);[\s\S]*?\})/,
  `$1\n                                if (selectedAgencyType !== 'ALL') {\n                                  params.append("agencyType", selectedAgencyType);\n                                }`
);

// 7. Division Summary Chlorine (approx line 10905 - Wait, I missed this one?)
// Ah, the Division Summary actually has "data-testid='button-export-division-summary'".
content = content.replace(
  /(data-testid="button-export-division-summary"[\s\S]*?const params = new URLSearchParams\(\);[\s\S]*?if \(schemeFilter !== "all"\) params\.append\("filterType", schemeFilter\);)/,
  `$1\n                                        if (selectedAgencyType !== 'ALL') params.append("agencyType", selectedAgencyType);`
);

// 8. Division Summary Pressure (approx line 12260?)
content = content.replace(
  /(data-testid="button-export-pressure-division-summary"[\s\S]*?const params = new URLSearchParams\(\);[\s\S]*?if \(schemeFilter !== "all"\) params\.append\("filterType", schemeFilter\);)/,
  `$1\n                                if (selectedAgencyType !== 'ALL') params.append("agencyType", selectedAgencyType);`
);

fs.writeFileSync(filePath, content);
console.log('Successfully updated DetailedChlorinePage.tsx');
