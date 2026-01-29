const XLSX = require('xlsx');

function analyzeSchemeStatusSheet(filePath) {
  try {
    console.log(`Analyzing Excel file for Scheme Status: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    // Look for the Scheme_Status sheet
    if (!workbook.SheetNames.includes('Scheme_Status')) {
      console.log('Scheme_Status sheet not found in workbook');
      return;
    }
    
    const worksheet = workbook.Sheets['Scheme_Status'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    // Find the header row
    let headerRowIndex = -1;
    const keyHeaderTerms = ['Scheme ID', 'Total Villages Integrated', 'Fully Scheme Completing Status'];
    
    for (let i = 0; i < Math.min(30, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      // Check how many key terms this row contains
      const matchCount = row.filter(cell => 
        typeof cell === 'string' && 
        keyHeaderTerms.some(term => cell.includes(term))
      ).length;
      
      if (matchCount >= 2) { // At least 2 matches to consider it a header row
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.log('Header row not found in Scheme_Status sheet');
      return;
    }
    
    console.log(`Found header row at index ${headerRowIndex}:`);
    console.log(data[headerRowIndex]);
    
    // Find column indices for key fields
    const headerRow = data[headerRowIndex];
    const keyColumns = [
      { name: 'Scheme ID', possibleNames: ['Scheme ID', 'SchemeID', 'Scheme_ID'] },
      { name: 'Scheme Name', possibleNames: ['Scheme Name', 'SchemeName'] },
      { name: 'Total Villages Integrated', possibleNames: ['Total Villages Integrated', 'Villages Integrated'] },
      { name: 'Fully Completed Villages', possibleNames: ['Fully Completed Villages', 'Completed Villages'] },
      { name: 'Fully Scheme Completing Status', possibleNames: ['Fully completion Scheme Status', 'Fully Scheme Completing Status', 'Completion Status'] },
      { name: 'Total ESR Integrated', possibleNames: ['Total ESR Integrated', 'ESR Integrated'] },
      { name: 'Fully Completed ESR', possibleNames: ['Fully Completed ESR', 'Completed ESR'] },
      { name: 'Flow Meters Connected', possibleNames: ['Flow Meters Connected', 'Flow Meter'] },
      { name: 'Residual Chlorine Analyzer Connected', possibleNames: ['Residual Chlorine Analyzer Connected', 'Residual Chlorine'] },
      { name: 'Pressure Transmitter Connected', possibleNames: ['Pressure Transmitter Connected', 'Pressure Transmitter'] }
    ];
    
    const columnIndices = {};
    keyColumns.forEach(column => {
      const index = findColumnIndex(headerRow, column.possibleNames);
      columnIndices[column.name] = index;
    });
    
    console.log('\nKey column indices:');
    Object.entries(columnIndices).forEach(([name, index]) => {
      console.log(`- ${name}: ${index !== -1 ? index : 'Not found'}`);
      if (index !== -1) {
        console.log(`  (Header value: "${headerRow[index]}")`);
      }
    });
    
    // Show sample data for the first few rows
    console.log('\nSample data rows:');
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, data.length); i++) {
      const row = data[i];
      if (row.some(cell => cell)) { // Skip empty rows
        const sampleData = {};
        
        Object.entries(columnIndices).forEach(([name, index]) => {
          if (index !== -1) {
            sampleData[name] = row[index];
          }
        });
        
        console.log(`Row ${i}:`, sampleData);
      }
    }
    
    // Display unique values for the status column
    if (columnIndices['Fully Scheme Completing Status'] !== -1) {
      const statusIndex = columnIndices['Fully Scheme Completing Status'];
      const statusValues = new Set();
      
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (row && row[statusIndex]) {
          statusValues.add(row[statusIndex]);
        }
      }
      
      console.log('\nUnique values in "Fully Scheme Completing Status" column:');
      console.log(Array.from(statusValues));
    }
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

// Helper function to find column index based on possible names
function findColumnIndex(headerRow, possibleNames) {
  return headerRow.findIndex(cell => 
    cell && typeof cell === 'string' && 
    possibleNames.some(name => cell.includes(name))
  );
}

// Run the analysis
analyzeSchemeStatusSheet('attached_assets/scheme_level_datalink_report.xlsx');