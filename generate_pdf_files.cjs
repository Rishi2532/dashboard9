const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'client/src/lib/pdf-generator-monthly.ts');
const chlorinePath = path.join(__dirname, 'client/src/lib/pdf-generator-monthly-chlorine.ts');
const pressurePath = path.join(__dirname, 'client/src/lib/pdf-generator-monthly-pressure.ts');

const content = fs.readFileSync(sourcePath, 'utf8');

// Replace logic for Chlorine
let chlorineContent = content.replace(/generateMonthlyReportPDF/g, 'generateMonthlyChlorineReportPDF');
chlorineContent = chlorineContent.replace(/MonthlyIntegrationData/g, 'MonthlyChlorineData');
chlorineContent = chlorineContent.replace(/lpcdCommissionedSchemes/g, 'chlorineCommissionedSchemes');
chlorineContent = chlorineContent.replace(/lpcdHighlights/g, 'chlorineHighlights');
chlorineContent = chlorineContent.replace(/LPCD - Daily Status/g, 'Chlorine - Daily Status');
chlorineContent = chlorineContent.replace(/Monthly LPCD Status/g, 'Monthly Chlorine Status');
chlorineContent = chlorineContent.replace(/LPCD Monthly Report/g, 'Chlorine Monthly Report');

// Replace logic for Pressure
let pressureContent = content.replace(/generateMonthlyReportPDF/g, 'generateMonthlyPressureReportPDF');
pressureContent = pressureContent.replace(/MonthlyIntegrationData/g, 'MonthlyPressureData');
pressureContent = pressureContent.replace(/lpcdCommissionedSchemes/g, 'pressureCommissionedSchemes');
pressureContent = pressureContent.replace(/lpcdHighlights/g, 'pressureHighlights');
pressureContent = pressureContent.replace(/LPCD - Daily Status/g, 'Pressure - Daily Status');
pressureContent = pressureContent.replace(/Monthly LPCD Status/g, 'Monthly Pressure Status');
pressureContent = pressureContent.replace(/LPCD Monthly Report/g, 'Pressure Monthly Report');

fs.writeFileSync(chlorinePath, chlorineContent);
fs.writeFileSync(pressurePath, pressureContent);

console.log("PDF generator files created successfully.");
