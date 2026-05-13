const fs = require('fs');
const content = fs.readFileSync('server/storage.ts', 'utf8');

// Find the importWaterSchemeDataFromCSV method
const methodStart = content.indexOf('  async importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{');
if (methodStart === -1) { console.error("Could not find method start"); process.exit(1); }

// Try to find the next method
const nextMethodStart = content.indexOf('  async importChlorineDataFromExcel', methodStart);
const methodString = nextMethodStart !== -1 
  ? content.substring(methodStart, nextMethodStart) 
  : content.substring(methodStart);

// Create the new method
const newMethod = methodString
  .replace(/importWaterSchemeDataFromCSV/g, 'importSchemeLpcdFromCSV')
  .replace(/water_scheme_data/g, 'scheme_lpcd')
  .replace(/WaterSchemeData/g, 'SchemeLpcd')
  .replace(/waterSchemeData/g, 'schemeLpcd');

// Insert it right after the original method
const newContent = content.substring(0, nextMethodStart) + newMethod + content.substring(nextMethodStart);

fs.writeFileSync('server/storage.ts', newContent);
console.log('Modified storage.ts');
