import { processExcelFile } from './import-scheme-level-data.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main function to run the test
async function main() {
  try {
    // Path to the Excel file
    const filePath = path.join(__dirname, 'attached_assets', 'scheme_level_datalink_report.xlsx');
    
    console.log(`Starting Excel import test with file: ${filePath}`);
    
    // Process the file and get results
    const results = await processExcelFile(filePath);
    
    console.log('Test completed successfully!');
    console.log('Schemes created:', results.totalCreated);
    console.log('Schemes updated:', results.totalUpdated);
    
  } catch (error) {
    console.error('Error running test script:', error);
    process.exit(1);
  }
}

// Run the main function
main();