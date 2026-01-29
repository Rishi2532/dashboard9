const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Analyzes a scheme status Excel file to check its structure and compatibility
 * with the import requirements.
 * 
 * @param {string} filePath - Path to the Excel file to analyze
 */
async function analyzeSchemeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    
    // Read the Excel file with full options for maximum compatibility
    const workbook = XLSX.read(fs.readFileSync(filePath), { 
      type: 'buffer',
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
    
    console.log(`File loaded successfully. Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
    
    // Expected column patterns for scheme status data
    const COLUMN_PATTERNS = {
      // Required columns for scheme identification
      required: [
        'Scheme ID', 'scheme_id', 'SchemeId',
        'Scheme Name', 'scheme_name',
        'Region', 'Region Name', 'region_name'
      ],
      // Geographic hierarchy columns
      geographic: [
        'Circle', 'circle',
        'Division', 'division',
        'Sub Division', 'sub_division',
        'Block', 'block'
      ],
      // Status and count columns
      status: [
        'Scheme Status', 'scheme_status',
        'Scheme Functional Status', 'scheme_functional_status',
        'Fully completion Scheme Status',
        'Status'
      ],
      // Village statistics
      villages: [
        'Total Villages', 'total_villages',
        'Villages Integrated', 'villages_integrated',
        'Functional Villages', 'functional_villages',
        'Fully Completed Villages', 'fully_completed_villages',
        'Partial Villages', 'partial_villages',
        'Non-Functional Villages', 'non_functional_villages'
      ],
      // ESR statistics
      esr: [
        'Total ESR', 'total_esr',
        'ESR Integrated', 'esr_integrated_on_iot',
        'Fully Completed ESR', 'fully_completed_esr',
        'Balance ESR', 'balance_esr'
      ],
      // Component related fields
      components: [
        'Flow Meters Connected', 'flow_meters_connected',
        'Pressure Transmitter Connected', 'pressure_transmitters_connected',
        'Residual Chlorine Analyzer Connected', 'residual_chlorine_connected'
      ]
    };
    
    // Region name patterns for detection
    const REGION_PATTERNS = [
      { pattern: /\bamravati\b/i, name: 'Amravati' },
      { pattern: /\bnashik\b/i, name: 'Nashik' },
      { pattern: /\bnagpur\b/i, name: 'Nagpur' },
      { pattern: /\bpune\b/i, name: 'Pune' },
      { pattern: /\bkonkan\b/i, name: 'Konkan' },
      { pattern: /\bcs\b/i, name: 'Chhatrapati Sambhajinagar' },
      { pattern: /\bsambhajinagar\b/i, name: 'Chhatrapati Sambhajinagar' },
      { pattern: /\bchhatrapati\b/i, name: 'Chhatrapati Sambhajinagar' }
    ];
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\nAnalyzing sheet: ${sheetName}`);
      
      // Detect region from sheet name
      let detectedRegion = null;
      for (const { pattern, name } of REGION_PATTERNS) {
        if (pattern.test(sheetName)) {
          detectedRegion = name;
          break;
        }
      }
      
      if (detectedRegion) {
        console.log(`Detected region: ${detectedRegion}`);
      } else {
        console.log(`No region detected from sheet name: ${sheetName}`);
      }
      
      // Get sheet data
      const sheet = workbook.Sheets[sheetName];
      
      // Get sheet range
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      console.log(`Sheet range: ${sheet['!ref']}`);
      
      // Convert to JSON with default values
      const data = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
        header: 1, // Use 1-based indices for row headers
        raw: true
      });
      
      if (data.length === 0) {
        console.log(`No data found in sheet: ${sheetName}`);
        continue;
      }
      
      // Find header row - headers are typically in the first few rows
      let headerRow = -1;
      let headerCells = [];
      
      // Check first 10 rows for a header row (has multiple non-empty cells)
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        const nonEmptyCells = row.filter(cell => cell !== null && cell !== '').length;
        
        // A header row typically has multiple cells filled
        if (nonEmptyCells > 5) {
          headerRow = i;
          headerCells = row;
          break;
        }
      }
      
      if (headerRow === -1) {
        console.log(`Could not find a header row in sheet: ${sheetName}`);
        continue;
      }
      
      console.log(`Found header row at position ${headerRow + 1}`);
      console.log(`Header cells: ${headerCells.join(', ')}`);
      
      // Check for required column patterns
      const foundColumns = {
        required: [],
        geographic: [],
        status: [],
        villages: [],
        esr: [],
        components: []
      };
      
      // Check each header against our patterns
      headerCells.forEach((header, index) => {
        if (!header) return;
        
        const headerStr = String(header).trim();
        
        // Check for each category of columns
        for (const [category, patterns] of Object.entries(COLUMN_PATTERNS)) {
          for (const pattern of patterns) {
            if (headerStr.toLowerCase() === pattern.toLowerCase() || 
                headerStr.toLowerCase().includes(pattern.toLowerCase())) {
              foundColumns[category].push({ header: headerStr, index });
              break;
            }
          }
        }
      });
      
      // Log found columns by category
      for (const [category, columns] of Object.entries(foundColumns)) {
        console.log(`\n${category.toUpperCase()} columns found (${columns.length}):`);
        columns.forEach(col => {
          console.log(`- Column "${col.header}" at position ${col.index + 1}`);
        });
      }
      
      // Check specifically for Scheme ID
      const schemeIdColumns = headerCells.map((header, index) => {
        if (!header) return null;
        const headerStr = String(header).trim();
        if (headerStr.toLowerCase().includes('scheme') && 
            (headerStr.toLowerCase().includes('id') || headerStr.toLowerCase().includes('code'))) {
          return { header: headerStr, index };
        }
        return null;
      }).filter(Boolean);
      
      if (schemeIdColumns.length > 0) {
        console.log(`\nFound Scheme ID column(s):`);
        schemeIdColumns.forEach(col => {
          console.log(`- ${col.header} at position ${col.index + 1}`);
        });
        
        // Sample the first few scheme IDs
        const sampleSize = Math.min(5, data.length - headerRow - 1);
        if (sampleSize > 0) {
          console.log(`\nSample Scheme IDs from first ${sampleSize} rows:`);
          for (let i = 0; i < sampleSize; i++) {
            const rowIndex = headerRow + 1 + i;
            if (rowIndex < data.length) {
              const row = data[rowIndex];
              for (const col of schemeIdColumns) {
                if (col.index < row.length) {
                  const value = row[col.index];
                  if (value !== null && value !== '') {
                    console.log(`Row ${rowIndex + 1}: ${value}`);
                  }
                }
              }
            }
          }
        }
      } else {
        console.log(`\nWARNING: No Scheme ID columns found!`);
      }
      
      // Check if we have all required columns for proper import
      const missingRequired = [];
      if (foundColumns.required.filter(col => 
          col.header.toLowerCase().includes('scheme') && 
          (col.header.toLowerCase().includes('id') || col.header.toLowerCase().includes('code'))
      ).length === 0) {
        missingRequired.push('Scheme ID');
      }
      
      if (foundColumns.required.filter(col => 
          col.header.toLowerCase().includes('scheme') && 
          col.header.toLowerCase().includes('name')
      ).length === 0) {
        missingRequired.push('Scheme Name');
      }
      
      // Check if we have any data columns for updating
      const hasDataColumns = 
        foundColumns.villages.length > 0 || 
        foundColumns.esr.length > 0 || 
        foundColumns.components.length > 0 || 
        foundColumns.status.length > 0;
      
      if (missingRequired.length > 0) {
        console.log(`\nWARNING: Missing required columns: ${missingRequired.join(', ')}`);
      } else if (!hasDataColumns) {
        console.log(`\nWARNING: No data columns found for updating scheme status`);
      } else {
        console.log(`\nSheet ${sheetName} looks valid for import`);
      }
    }
    
    console.log('\nAnalysis complete');
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error);
  }
}

// Run the analyzer on a specified file
const filePath = process.argv[2];
if (filePath) {
  analyzeSchemeExcelFile(filePath);
} else {
  console.log('Please provide a path to an Excel file as an argument');
}