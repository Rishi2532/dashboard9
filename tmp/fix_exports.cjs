const fs = require('fs');
const content = fs.readFileSync('c:/Users/HP/dashboard9/client/src/pages/chlorine/DetailedChlorinePage.tsx', 'utf8');

const oldText = '                                       if (schemeFilter === "fully_completed") {\r\n                                         params.append("fullyCompleted", "true");\r\n                                       }\r\n                                       window.open(\r\n';

const newText = '                                       if (schemeFilter === "fully_completed") {\r\n                                         params.append("fullyCompleted", "true");\r\n                                       }\r\n                                       if (selectedAgencyType !== "ALL") {\r\n                                         params.append("agencyType", selectedAgencyType);\r\n                                       }\r\n                                       window.open(\r\n';

// Replace the LAST occurrence to avoid double-fixing the first one (which is already fixed).
const lastIndex = content.lastIndexOf(oldText);
if (lastIndex !== -1) {
  const newContent = content.substring(0, lastIndex) + newText + content.substring(lastIndex + oldText.length);
  fs.writeFileSync('c:/Users/HP/dashboard9/client/src/pages/chlorine/DetailedChlorinePage.tsx', newContent);
  console.log('Successfully updated the last export button.');
} else {
  console.log('Could not find the target text or it is already updated.');
}
