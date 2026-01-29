import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This script will help us diagnose issues with Excel column headers
function inspectExcelFile(filePath) {
  console.log(`Inspecting file: ${filePath}`);

  try {
    // Read the Excel file
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Print all sheet names
    console.log('Sheets in workbook:', workbook.SheetNames);

    // Process the first sheet (assuming it's the one we want)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`\nExamining Sheet: ${sheetName}`);
    
    // Convert to JSON for easier processing
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      console.log('No data found in sheet');
      return;
    }
    
    // Print all headers (column names)
    console.log('\nColumns found in Excel:');
    const headers = Object.keys(data[0]);
    headers.forEach(header => {
      console.log(`  - "${header}"`);
    });
    
    // Check for specific water values and LPCD columns
    console.log('\nChecking for specific water and LPCD columns:');
    const waterColumns = headers.filter(h => h.includes('Water Value') || h.includes('water value'));
    const lpcdColumns = headers.filter(h => h.includes('LPCD Value') || h.includes('lpcd value'));
    
    console.log('Water Value columns:', waterColumns);
    console.log('LPCD Value columns:', lpcdColumns);
    
    // Show sample data for the first row
    console.log('\nSample Data (First Row):');
    const firstRow = data[0];
    
    // Print all cell values for the first row
    for (const key in firstRow) {
      console.log(`  ${key}: ${firstRow[key]}`);
    }
    
    // Print some specific columns important for debugging
    console.log('\nValues for first 3 rows:');
    data.slice(0, 3).forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log(`  Scheme ID: ${row['Scheme ID'] || row['scheme_id'] || 'N/A'}`);
      console.log(`  Village: ${row['Village Name'] || row['village_name'] || 'N/A'}`);
      
      // Print water values if available
      waterColumns.forEach(col => {
        console.log(`  ${col}: ${row[col] !== undefined ? row[col] : 'N/A'}`);
      });
      
      // Print LPCD values if available
      lpcdColumns.forEach(col => {
        console.log(`  ${col}: ${row[col] !== undefined ? row[col] : 'N/A'}`);
      });
    });
    
    // If water or LPCD values are missing, provide guidance
    if (waterColumns.length === 0 || lpcdColumns.length === 0) {
      console.log('\nISSUE DETECTED: Missing expected columns');
      console.log('The Excel file must have columns with exact names:');
      console.log('  - Water Value Day 1, Water Value Day 2, etc.');
      console.log('  - LPCD Value Day 1, LPCD Value Day 2, etc.');
    }
    
  } catch (error) {
    console.error('Error inspecting Excel file:', error);
  }
}

// Check all Excel files in the attached_assets directory
const assetDir = 'attached_assets';
const excelFiles = fs.readdirSync(assetDir)
  .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

if (excelFiles.length === 0) {
  console.log('No Excel files found in attached_assets directory');
} else {
  // Check all Excel files for water and LPCD value columns
  console.log('Checking all Excel files for water and LPCD columns...\n');
  
  let foundWaterAndLpcdColumns = false;
  
  for (const file of excelFiles) {
    try {
      console.log(`\n=============================================`);
      console.log(`FILE: ${file}`);
      console.log(`=============================================`);
      
      // Read the Excel file
      const filePath = path.join(assetDir, file);
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      console.log('Sheets:', workbook.SheetNames);
      
      // Check each sheet in the file
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) continue;
        
        // Get column headers
        const headers = Object.keys(data[0]);
        
        // Check for water and LPCD columns
        const waterColumns = headers.filter(h => 
          h.includes('Water Value') || 
          h.includes('water value') || 
          h.includes('Water_Value') || 
          h.includes('water_value'));
          
        const lpcdColumns = headers.filter(h => 
          h.includes('LPCD Value') || 
          h.includes('lpcd value') || 
          h.includes('LPCD_Value') || 
          h.includes('lpcd_value'));
        
        if (waterColumns.length > 0 || lpcdColumns.length > 0) {
          console.log(`\nSheet "${sheetName}" contains water or LPCD columns!`);
          console.log('Water columns:', waterColumns);
          console.log('LPCD columns:', lpcdColumns);
          
          // Show the first row as a sample
          if (data.length > 0) {
            console.log('\nSample row:');
            console.log(JSON.stringify(data[0], null, 2));
          }
          
          foundWaterAndLpcdColumns = true;
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  if (!foundWaterAndLpcdColumns) {
    console.log('\nNo Excel files found with the expected water and LPCD columns.');
    console.log('You need to create a template with proper column headers:');
    console.log('  - Water Value Day 1, Water Value Day 2, etc.');
    console.log('  - LPCD Value Day 1, LPCD Value Day 2, etc.');
  }
}