import fs from 'fs';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test function to read Excel file and check its structure
function analyzeExcelFile(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Print sheet names
    console.log(`\nSheets in workbook: ${workbook.SheetNames.join(', ')}`);
    
    // Focus on the Nagpur sheet
    const targetSheets = ['Region - Nagpur'];
    
    // Process selected sheets
    for (const sheetName of targetSheets) {
      if (!workbook.SheetNames.includes(sheetName)) {
        console.log(`Sheet ${sheetName} not found in workbook!`);
        continue;
      }
      
      console.log(`\n--- Analyzing Sheet: ${sheetName} ---`);
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      if (!data || data.length === 0) {
        console.log(`No data found in sheet: ${sheetName}`);
        continue;
      }
      
      console.log(`Found ${data.length} rows in ${sheetName}`);
      
      // Sample first row to see column structure
      if (data.length > 0) {
        const sampleRow = data[0];
        console.log('\nSample row column names:');
        Object.keys(sampleRow).forEach(key => {
          console.log(`- ${key}: ${sampleRow[key]}`);
        });
        
        // Print scheme IDs from this sheet
        console.log("\nScheme IDs in this sheet:");
        data.forEach((row, index) => {
          const schemeId = row['Scheme ID'];
          if (schemeId) {
            console.log(`Row ${index + 1}: Scheme ID = ${schemeId}, Name = ${row['Scheme Name'] || 'N/A'}`);
          }
        });
        
        // Analyze actual column names for import mapping
        const allColumns = new Set();
        data.forEach(row => {
          Object.keys(row).forEach(key => allColumns.add(key));
        });
        
        console.log("\nAll column names in this sheet:");
        console.log(Array.from(allColumns).join(', '));
        
        // Print a sample of actual values for key metrics
        if (data.length > 0) {
          const metrics = [
            'Total Villages Integrated', 
            'Fully Completed Villages', 
            'Total ESR Integrated', 
            'No. Fully Completed ESR',
            'Flow Meters Connected',
            'Residual Chlorine Analyzer Connected',
            'Pressure Transmitter Connected'
          ];
          
          console.log("\nSample values for key metrics (first row):");
          metrics.forEach(metric => {
            const alternative = metric.replace('Connected', '');
            const value = sampleRow[metric] !== undefined ? sampleRow[metric] : 
                         (sampleRow[alternative] !== undefined ? sampleRow[alternative] : 'N/A');
            console.log(`- ${metric}: ${value}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

// Change this to the path of your Excel file
const excelFilePath = path.join(__dirname, 'attached_assets', 'scheme_level_datalink_report.xlsx');

// Run the analysis
analyzeExcelFile(excelFilePath);