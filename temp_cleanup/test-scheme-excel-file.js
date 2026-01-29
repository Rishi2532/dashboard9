import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeExcelFile(filePath) {
  console.log(`Analyzing Excel file: ${filePath}`);
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellFormula: false,
      cellHTML: false,
      cellText: true,
      cellDates: true,
      cellNF: false,
      WTF: true,
      cellStyles: false,
      bookVBA: false,
      dateNF: 'yyyy-mm-dd',
      raw: true
    });
    
    console.log(`Found ${workbook.SheetNames.length} sheets in the workbook:`);
    
    // Process each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      console.log(`\nAnalyzing sheet: ${sheetName}`);
      
      const sheet = workbook.Sheets[sheetName];
      
      // Find the header row in the sheet
      const headerRowIndex = findHeaderRow(sheet);
      console.log(`Found header row at index: ${headerRowIndex}`);
      
      // Convert to JSON with the header row
      const jsonData = XLSX.utils.sheet_to_json(sheet, { 
        defval: null,
        raw: true,
        range: headerRowIndex
      });
      
      if (jsonData.length === 0) {
        console.log(`No data found in sheet: ${sheetName}`);
        continue;
      }
      
      // Display the headers present in the first row
      console.log("\nHeaders found in Excel:");
      for (const header of Object.keys(jsonData[0])) {
        if (!header.startsWith('__EMPTY')) {
          console.log(`  - "${header}"`);
        }
      }
      
      // Show a sample of the first row of data
      console.log("\nSample data (first row):");
      for (const [key, value] of Object.entries(jsonData[0])) {
        if (!key.startsWith('__EMPTY')) {
          console.log(`  "${key}": ${value === null ? 'null' : JSON.stringify(value)}`);
        }
      }
      
      // Check specifically for important columns
      checkForColumns(jsonData[0], [
        'Scheme ID', 'scheme_id', 'SchemeId', 'Scheme Code',
        'Flow Meters Connected', 'Flow Meter Connected', 'FM Connected',
        'Pressure Transmitter Connected', 'PT Connected',
        'Residual Chlorine Connected', 'RCA Connected', 'Residual Chlorine'
      ]);
    }
  } catch (error) {
    console.error(`Error analyzing Excel file: ${error.message}`);
    console.error(error.stack);
  }
}

/**
 * Find the header row in a sheet by looking for rows with many non-empty cells
 */
function findHeaderRow(sheet) {
  // Get the address range of the sheet
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const minRow = range.s.r;
  const maxRow = Math.min(range.e.r, minRow + 20); // Check only first 20 rows
  
  let bestRowIndex = 0;
  let bestRowCount = 0;
  
  // Check each row to see which one has the most non-empty cells
  for (let r = minRow; r <= maxRow; r++) {
    let cellCount = 0;
    
    // Count non-empty cells in the row
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (sheet[cellRef] && sheet[cellRef].v !== undefined && sheet[cellRef].v !== null && sheet[cellRef].v !== '') {
        cellCount++;
      }
    }
    
    // If this row has more non-empty cells, consider it as the header row
    if (cellCount > bestRowCount) {
      bestRowCount = cellCount;
      bestRowIndex = r;
    }
  }
  
  return bestRowIndex;
}

/**
 * Check if specific important columns are present in the Excel file
 */
function checkForColumns(headerRow, columnsToCheck) {
  console.log("\nChecking for specific important columns:");
  
  // Keep track of matched and missing columns
  const foundColumns = [];
  const missingColumns = [];
  
  // Check each important column
  for (const column of columnsToCheck) {
    let found = false;
    
    for (const header of Object.keys(headerRow)) {
      if (
        header === column || 
        header.toLowerCase() === column.toLowerCase() ||
        header.toLowerCase().includes(column.toLowerCase())
      ) {
        foundColumns.push({ column, matchedHeader: header });
        found = true;
        break;
      }
    }
    
    if (!found) {
      missingColumns.push(column);
    }
  }
  
  // Report results
  if (foundColumns.length > 0) {
    console.log("Found columns:");
    for (const { column, matchedHeader } of foundColumns) {
      console.log(`  - "${column}" matched as "${matchedHeader}"`);
    }
  }
  
  if (missingColumns.length > 0) {
    console.log("Missing columns:");
    for (const column of missingColumns) {
      console.log(`  - "${column}"`);
    }
  }
}

async function analyzeSpecificSheet(filePath, sheetName) {
  console.log(`\nFocusing on sheet '${sheetName}'...`);
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellFormula: false,
      cellHTML: false,
      cellText: true,
      cellDates: true,
    });
    
    // Check if the sheet exists
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`Sheet '${sheetName}' not found in workbook.`);
      console.log(`Available sheets: ${workbook.SheetNames.join(', ')}`);
      return;
    }
    
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(sheet, { 
      defval: null,
      raw: true
    });
    
    if (jsonData.length === 0) {
      console.log(`No data found in sheet: ${sheetName}`);
      return;
    }
    
    // Display all headers
    console.log("\nAll headers in Scheme_Status sheet:");
    const headers = Object.keys(jsonData[0]);
    headers.forEach(header => {
      console.log(`  - "${header}"`);
    });
    
    // Show a sample row
    console.log("\nSample data (first row with full details):");
    Object.entries(jsonData[0]).forEach(([key, value]) => {
      console.log(`  "${key}": ${value === null ? 'null' : JSON.stringify(value)}`);
    });
    
    // Check for the specific columns we're interested in
    const columnsOfInterest = [
      "Scheme ID", 
      " Flow Meters Connected", // Note the space at the beginning 
      "Flow Meters Connected",
      "Pressure Transmitter Connected",
      "Residual Chlorine Analyzer Connected"
    ];
    
    console.log("\nChecking specifically for columns of interest:");
    columnsOfInterest.forEach(col => {
      const found = headers.some(h => h === col || h.trim() === col.trim());
      console.log(`  - "${col}": ${found ? 'FOUND' : 'NOT FOUND'}`);
      
      // If found, show an example value from the first row
      if (found) {
        const exactMatch = headers.find(h => h === col);
        const trimMatch = headers.find(h => h.trim() === col.trim());
        const matchedHeader = exactMatch || trimMatch;
        console.log(`    Value in first row: ${jsonData[0][matchedHeader]}`);
      }
    });
  } catch (error) {
    console.error(`Error analyzing specific sheet: ${error.message}`);
  }
}

const filePath = path.resolve(__dirname, 'attached_assets/scheme_level_datalink_report.xlsx');
// First do general analysis
analyzeExcelFile(filePath);

// Then focus specifically on the Scheme_Status sheet
analyzeSpecificSheet(filePath, 'Scheme_Status');