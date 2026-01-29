import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readExcelFile(filePath) {
  try {
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // List all sheets
    console.log("Available sheets:");
    workbook.SheetNames.forEach((name, index) => {
      console.log(`${index}: ${name}`);
    });
    
    // Check specific region sheets
    const regionSheets = [
      'Nagpur Datalink', 
      'Amravati Datalink', 
      'Nashik Datalink', 
      'Konkan Datalink', 
      'CS Datalink', 
      'Pune Datalink'
    ];
    
    console.log("\n");
    
    // Process each region sheet
    regionSheets.forEach(sheetName => {
      if (workbook.SheetNames.includes(sheetName)) {
        console.log(`Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Print headers for first sheet
        if (sheetName === 'Nagpur Datalink' && jsonData.length > 0) {
          console.log("Excel headers:");
          const headers = Object.keys(jsonData[0]);
          headers.forEach(header => {
            console.log(`- "${header}"`);
          });
          
          // Sample row
          console.log("\nSample row data:");
          console.log(JSON.stringify(jsonData[0], null, 2));
        }
        
        // Check flow meter data for all sheets
        if (jsonData.length > 0) {
          console.log(`\nFlow meter data for ${sheetName}:`);
          const sample = jsonData[0];
          
          // Log all available fields for debugging
          console.log("Available fields:", Object.keys(sample).join(", "));
          
          // Check for flow meter, RCA, and PT data
          const flowMeterField = Object.keys(sample).find(k => k.includes('Flow') || k.includes('flow'));
          const rcaField = Object.keys(sample).find(k => k.includes('RCA') || k.includes('rca'));
          const ptField = Object.keys(sample).find(k => k.includes('Pressure') || k.includes('pressure'));
          
          console.log(`Flow meter field: ${flowMeterField || 'Not found'}`);
          console.log(`RCA field: ${rcaField || 'Not found'}`);
          console.log(`PT field: ${ptField || 'Not found'}`);
          
          if (flowMeterField) {
            console.log(`Flow meter value: ${sample[flowMeterField]}`);
          }
          
          if (rcaField) {
            console.log(`RCA value: ${sample[rcaField]}`);
          }
          
          if (ptField) {
            console.log(`PT value: ${sample[ptField]}`);
          }
        } else {
          console.log(`No data found in ${sheetName}`);
        }
      }
    });
    
    // Return data from first region sheet as the main result
    const firstRegionSheet = regionSheets.find(name => workbook.SheetNames.includes(name));
    if (firstRegionSheet) {
      return XLSX.utils.sheet_to_json(workbook.Sheets[firstRegionSheet]);
    }
    
    return [];
  } catch (error) {
    console.error("Error reading Excel file:", error);
    return [];
  }
}

// Path to the Excel file
const filePath = path.join(__dirname, 'attached_assets', '15. Live Site Data - Scheme Level (2).xlsx');
console.log(`Reading Excel file: ${filePath}`);
const data = readExcelFile(filePath);
console.log(`Read ${data.length} rows from the Excel file`);