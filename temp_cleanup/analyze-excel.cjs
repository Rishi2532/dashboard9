const XLSX = require('xlsx');
const fs = require('fs');

function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    
    console.log('All sheets in workbook:');
    console.log(workbook.SheetNames);

    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n======= Analyzing sheet: ${sheetName} =======`);
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Find potential header row (search for known column names)
      let headerRowIndex = -1;
      const keyHeaderTerms = ['Scheme ID', 'Scheme Name', 'Total Villages Integrated', 'Fully Scheme Completing Status'];
      
      for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        if (!row) continue;
        
        // Check if any cell in this row contains our key terms
        const hasKeyTerms = row.some(cell => 
          typeof cell === 'string' && 
          keyHeaderTerms.some(term => cell.includes(term))
        );
        
        if (hasKeyTerms) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex !== -1) {
        console.log(`Found potential header row at index ${headerRowIndex}:`);
        console.log(data[headerRowIndex]);
        
        // Find column indices for important fields
        const headerRow = data[headerRowIndex];
        const schemeIdIdx = findColumnIndex(headerRow, ['Scheme ID', 'SchemeID']);
        const villagesIntegratedIdx = findColumnIndex(headerRow, ['Total Villages Integrated', 'Villages Integrated']);
        const statusIdx = findColumnIndex(headerRow, ['Fully Scheme Completing Status', 'Completion Status']);
        
        console.log('\nImportant columns found:');
        console.log(`- Scheme ID column index: ${schemeIdIdx}`);
        console.log(`- Total Villages Integrated column index: ${villagesIntegratedIdx}`);
        console.log(`- Status column index: ${statusIdx}`);
        
        // Show some sample data
        console.log('\nSample data rows:');
        for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, data.length); i++) {
          const row = data[i];
          if (row.some(cell => cell)) { // Skip empty rows
            const sampleData = {};
            if (schemeIdIdx !== -1) sampleData['Scheme ID'] = row[schemeIdIdx];
            if (villagesIntegratedIdx !== -1) sampleData['Total Villages Integrated'] = row[villagesIntegratedIdx];
            if (statusIdx !== -1) sampleData['Status'] = row[statusIdx];
            
            console.log(`Row ${i}:`, sampleData);
          }
        }
      } else {
        console.log('No identifiable header row found in this sheet');
      }
    }
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

// Helper function to find a column index based on possible names
function findColumnIndex(headerRow, possibleNames) {
  return headerRow.findIndex(cell => 
    cell && typeof cell === 'string' && 
    possibleNames.some(name => cell.includes(name))
  );
}

// Run the analysis
analyzeExcelFile('attached_assets/scheme_level_datalink_report.xlsx');