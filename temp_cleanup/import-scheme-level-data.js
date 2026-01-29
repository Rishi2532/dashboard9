import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current file directory with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection setup
const { Pool } = pg;

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Map column names to database fields based on the Excel's content
 * @param {Object} headers - The header row from Excel
 * @returns {Object} Mapping of Excel column headers to database field names
 */
function mapHeadersToFields(headers) {
  const mapping = {};
  const columnPatterns = {
    // Scheme identification
    scheme_id: [
      'Scheme ID', 'Scheme Id', 'scheme_id', 'SchemeId', 'SCHEME ID',
      'Scheme_Id', 'Scheme Code', 'SchemeID'
    ],
    scheme_name: [
      'Scheme Name', 'SchemeName', 'scheme_name', 'SCHEME NAME'
    ],
    
    // Villages related fields
    number_of_village: [
      'Number of Village', 'No. of Village', 'Total Villages', 
      'Number of Villages', 'Villages'
    ],
    fully_completed_villages: [
      'Fully completed Villages', 'Fully Completed Villages', 
      'No. of Functional Village', 'Functional Villages'
    ],
    total_villages_integrated: [
      'Total Villages Integrated', 'Villages Integrated'
    ],
    no_of_partial_village: [
      'No. of Partial Village', 'Partial Villages', 'Partial Village'
    ],
    no_of_non_functional_village: [
      'No. of Non- Functional Village', 'No. of Non-Functional Village',
      'Non-Functional Villages', 'Non Functional Villages'
    ],
    
    // ESR related fields
    total_number_of_esr: [
      'Total Number of ESR', 'Total ESR', 'ESR Total'
    ],
    total_esr_integrated: [
      'Total ESR Integrated', 'ESR Integrated', 'Total Number of ESR Integrated'
    ],
    no_fully_completed_esr: [
      'No. Fully Completed ESR', 'Fully Completed ESR', 'No. of Fully Completed ESR',
      'ESR Fully Completed'
    ],
    balance_to_complete_esr: [
      'Balance to Complete ESR', 'Balance ESR'
    ],
    
    // Component related fields
    flow_meters_connected: [
      'Flow Meters Connected', ' Flow Meters Connected', 'Flow Meters Conneted',
      'Flow Meter Connected', 'Flow Meters', 'FM Connected', 'FM Integrated'
    ],
    pressure_transmitters_connected: [
      'Pressure Transmitter Connected', 'Pressure Transmitters Connected',
      'Pressure Transmitter Conneted', 'PT Connected', 'Pressure Transmitters',
      'PT Integrated'
    ],
    residual_chlorine_connected: [
      'Residual Chlorine Connected', 'Residual Chlorine Analyzer Connected',
      'Residual Chlorine Conneted', 'RCA Connected', 'Residual Chlorine',
      'Residual Chlorine Analyzers', 'RCA Integrated'
    ],
    
    // Status fields
    fully_completion_scheme_status: [
      'Fully completion Scheme Status', 'Scheme Status', 'Status',
      'Scheme status', ' Scheme Status'
    ],
    scheme_functional_status: [
      'Scheme Functional Status', 'Functional Status'
    ],
    
    // Region and location identification
    region_name: [
      'Region', 'RegionName', 'Region Name', 'region'
    ],
    circle: [
      'Circle', 'circle', 'CIRCLE'
    ],
    division: [
      'Division', 'division', 'DIVISION'
    ],
    sub_division: [
      'Sub Division', 'sub_division', 'SUB DIVISION', 'SubDivision'
    ],
    block: [
      'Block', 'block', 'BLOCK'
    ],
    sr_no: [
      'Sr No.', 'Sr. No.', 'Sr.No.', 'SR NO', 'sr_no'
    ]
  };
  
  // Match headers to fields
  for (const header of Object.keys(headers)) {
    // Skip empty headers
    if (header.startsWith('__EMPTY')) continue;
    
    // Look for a match in the column patterns
    for (const [field, patterns] of Object.entries(columnPatterns)) {
      if (patterns.some(pattern => 
        header === pattern || 
        header.toLowerCase() === pattern.toLowerCase() ||
        header.toLowerCase().includes(pattern.toLowerCase())
      )) {
        mapping[header] = field;
        break;
      }
    }
  }
  
  console.log('Column Mapping:');
  for (const [header, field] of Object.entries(mapping)) {
    console.log(`  "${header}" → "${field}"`);
  }
  
  return mapping;
}

/**
 * Extract value from row based on field and handle type conversion
 * @param {Object} row - The data row
 * @param {String} field - The field to extract
 * @param {Object} mapping - The column mapping
 * @returns {*} The extracted value
 */
function extractValue(row, field, mapping) {
  // Find the Excel column that maps to the desired field
  const columnHeader = Object.keys(mapping).find(key => mapping[key] === field);
  
  if (!columnHeader || row[columnHeader] === undefined) {
    return null; // Return null if column not found or value is undefined
  }
  
  let value = row[columnHeader];
  
  // Handle data type conversions
  if (field === 'scheme_id') {
    return String(value || '').trim();
  } else if (field === 'sr_no') {
    // Convert to number, but allow null if not provided
    return value ? Number(value) : null;
  } else if ([
    'number_of_village',
    'fully_completed_villages',
    'total_villages_integrated',
    'no_of_partial_village',
    'no_of_non_functional_village',
    'total_number_of_esr',
    'total_esr_integrated',
    'no_fully_completed_esr',
    'balance_to_complete_esr',
    'flow_meters_connected',
    'pressure_transmitter_connected',
    'residual_chlorine_analyzer_connected'
  ].includes(field)) {
    // Convert to number, handling 0 and null cases
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  } else if (field === 'fully_completion_scheme_status') {
    // Standardize scheme status values
    const status = String(value || '').trim();
    if (!status || status === '') return 'Not-Connected';
    
    // Map status values to standardized format
    const statusMap = {
      'completed': 'Fully Completed',
      'fully completed': 'Fully Completed',
      'fully-completed': 'Fully Completed',
      'partial': 'Partial',
      'in progress': 'In Progress',
      'functional': 'Functional',
      'non functional': 'Non Functional',
      'non-functional': 'Non Functional',
      'not connected': 'Not-Connected'
    };
    
    // Try exact match first
    const lowerStatus = status.toLowerCase();
    if (statusMap[lowerStatus]) {
      return statusMap[lowerStatus];
    }
    
    // Then try patterns
    if (lowerStatus.includes('full') && lowerStatus.includes('complet')) return 'Fully Completed';
    if (lowerStatus.includes('partial')) return 'Partial';
    if (lowerStatus.includes('progress')) return 'In Progress';
    if (lowerStatus.includes('function') && !lowerStatus.includes('non')) return 'Functional';
    if ((lowerStatus.includes('non') || lowerStatus.includes('not')) && lowerStatus.includes('function')) 
      return 'Non Functional';
    
    return status;
  }
  
  // Return as is for other fields
  return value === null || value === undefined ? null : String(value).trim();
}

/**
 * Get the agency name for a region according to business rules
 * @param {String} regionName - The region name
 * @returns {String} The agency name
 */
function getAgencyByRegion(regionName) {
  if (!regionName) return null;
  
  // Correctly format agency name with small 's' in 'M/s'
  switch (regionName.trim()) {
    case 'Amravati':
      return 'M/s Ceinsys';
    case 'Nashik':
      return 'M/s Ceinsys';
    case 'Nagpur':
      return 'M/s Rite Water';
    case 'Chhatrapati Sambhajinagar':
      return 'M/s Rite Water';
    case 'Pune':
      return 'M/s Indo/Chetas';
    case 'Konkan':
      return 'M/s Indo/Chetas';
    default:
      return null;
  }
}

/**
 * Detect region from sheet name using predefined patterns
 * @param {String} sheetName - Name of the Excel sheet
 * @returns {String|null} Detected region name or null if not found
 */
function detectRegionFromSheetName(sheetName) {
  const regionPatterns = [
    { pattern: /\bamravati\b/i, name: 'Amravati' },
    { pattern: /\bnashik\b/i, name: 'Nashik' },
    { pattern: /\bnagpur\b/i, name: 'Nagpur' },
    { pattern: /\bpune\b/i, name: 'Pune' },
    { pattern: /\bkonkan\b/i, name: 'Konkan' },
    { pattern: /\bcs\b/i, name: 'Chhatrapati Sambhajinagar' },
    { pattern: /\bsambhajinagar\b/i, name: 'Chhatrapati Sambhajinagar' },
    { pattern: /\bchhatrapati\b/i, name: 'Chhatrapati Sambhajinagar' }
  ];
  
  for (const { pattern, name } of regionPatterns) {
    if (pattern.test(sheetName)) {
      return name;
    }
  }
  
  // If no match found, check for explicit "Region" word
  if (sheetName.includes('Region')) {
    const parts = sheetName.split('Region');
    if (parts.length > 1) {
      const regionPart = parts[1].trim().replace(/\s*-\s*/, '').trim();
      if (regionPart) return regionPart;
    }
  }
  
  return null;
}

/**
 * Find the header row in a sheet by looking for rows with many non-empty cells
 * @param {Object} sheet - The Excel sheet
 * @returns {Number} Index of the header row, or 0 if not found
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
 * Process Excel file and import scheme data
 * @param {String} filePath - Path to the Excel file
 */
async function processExcelFile(filePath) {
  console.log(`Processing Excel file: ${filePath}`);
  
  // Initialize counters
  let totalUpdated = 0;
  let totalCreated = 0;
  const processedIds = new Set();
  
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
    
    console.log(`Found ${workbook.SheetNames.length} sheets in the workbook`);
    
    // Process each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      // Try to detect region from sheet name
      let regionName = detectRegionFromSheetName(sheetName);
      
      console.log(`Processing sheet: ${sheetName}, detected region: ${regionName || 'Unknown'}`);
      
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
      
      // Create mapping of columns to database fields
      const columnMapping = mapHeadersToFields(jsonData[0]);
      
      // Check if we have the key fields we need
      const hasSchemeId = Object.values(columnMapping).includes('scheme_id');
      const hasSchemeName = Object.values(columnMapping).includes('scheme_name');
      
      if (!hasSchemeId && !hasSchemeName) {
        console.error(`Sheet ${sheetName} doesn't have scheme ID or name columns, skipping`);
        continue;
      }
      
      // Try to find region name in the data if we couldn't detect it from sheet name
      if (!regionName) {
        // Look for region in the column data
        const regionHeader = Object.keys(columnMapping).find(
          h => columnMapping[h] === 'region_name'
        );
        
        if (regionHeader && jsonData[0][regionHeader]) {
          regionName = String(jsonData[0][regionHeader]).trim();
          console.log(`Found region name in data: ${regionName}`);
        } else {
          console.error(`Could not determine region for sheet: ${sheetName}, skipping`);
          continue;
        }
      }
      
      // Validate region exists in the database
      try {
        const regionCheck = await pool.query(
          'SELECT region_id FROM region WHERE region_name = $1',
          [regionName]
        );
        
        if (regionCheck.rows.length === 0) {
          console.error(`Region "${regionName}" not found in database, creating it...`);
          
          // Create the region if it doesn't exist
          await pool.query(
            'INSERT INTO region (region_name) VALUES ($1)',
            [regionName]
          );
          
          console.log(`Created region: ${regionName}`);
        }
      } catch (error) {
        console.error(`Error validating region: ${error.message}`);
        continue;
      }
      
      // Process each row in the sheet
      for (const row of jsonData) {
        try {
          // Extract values for the scheme using our mapping
          const schemeData = {
            sr_no: extractValue(row, 'sr_no', columnMapping),
            scheme_id: extractValue(row, 'scheme_id', columnMapping),
            scheme_name: extractValue(row, 'scheme_name', columnMapping),
            region: regionName,
            circle: extractValue(row, 'circle', columnMapping),
            division: extractValue(row, 'division', columnMapping),
            sub_division: extractValue(row, 'sub_division', columnMapping),
            block: extractValue(row, 'block', columnMapping),
            number_of_village: extractValue(row, 'number_of_village', columnMapping),
            no_of_functional_village: extractValue(row, 'fully_completed_villages', columnMapping), // Functional villages maps to fully completed
            no_of_partial_village: extractValue(row, 'no_of_partial_village', columnMapping),
            no_of_non_functional_village: extractValue(row, 'no_of_non_functional_village', columnMapping),
            total_villages_integrated: extractValue(row, 'total_villages_integrated', columnMapping),
            fully_completed_villages: extractValue(row, 'fully_completed_villages', columnMapping),
            total_number_of_esr: extractValue(row, 'total_number_of_esr', columnMapping),
            total_esr_integrated: extractValue(row, 'total_esr_integrated', columnMapping),
            scheme_functional_status: extractValue(row, 'scheme_functional_status', columnMapping),
            no_fully_completed_esr: extractValue(row, 'no_fully_completed_esr', columnMapping),
            balance_to_complete_esr: extractValue(row, 'balance_to_complete_esr', columnMapping),
            flow_meters_connected: extractValue(row, 'flow_meters_connected', columnMapping),
            pressure_transmitter_connected: extractValue(row, 'pressure_transmitter_connected', columnMapping),
            residual_chlorine_analyzer_connected: extractValue(row, 'residual_chlorine_analyzer_connected', columnMapping),
            fully_completion_scheme_status: extractValue(row, 'fully_completion_scheme_status', columnMapping),
            agency: getAgencyByRegion(regionName)
          };
          
          // Skip if we don't have a scheme name or if it looks like a header row
          if (!schemeData.scheme_name) {
            console.log('Skipping row - no scheme name found');
            continue;
          }
          
          // Skip if the scheme_id or scheme_name looks like a header
          if (typeof schemeData.scheme_id === 'string' && 
             (schemeData.scheme_id.includes('Scheme ID') || 
              schemeData.scheme_id.includes('Scheme Name') ||
              schemeData.scheme_id.includes('Sr No') ||
              schemeData.scheme_id.toLowerCase() === 'scheme_id' ||
              schemeData.scheme_id.toLowerCase() === 'schemeid')) {
            console.log('Skipping row - scheme_id appears to be a header: ' + schemeData.scheme_id);
            continue;
          }
          
          if (typeof schemeData.scheme_name === 'string' && 
             (schemeData.scheme_name.includes('Scheme Name') ||
              schemeData.scheme_name.includes('Village') ||
              schemeData.scheme_name.toLowerCase() === 'scheme_name' ||
              schemeData.scheme_name.toLowerCase() === 'schemename')) {
            console.log('Skipping row - scheme_name appears to be a header: ' + schemeData.scheme_name);
            continue;
          }
          
          // Generate scheme ID if it's missing
          if (!schemeData.scheme_id) {
            // Query the maximum scheme ID and increment
            const maxIdResult = await pool.query(
              'SELECT MAX(CAST(scheme_id AS INTEGER)) FROM scheme_status'
            );
            
            const maxId = maxIdResult.rows[0].max || 20000000; // Start at 20M if no schemes exist
            schemeData.scheme_id = String(Number(maxId) + 1);
            console.log(`Generated new scheme ID: ${schemeData.scheme_id} for ${schemeData.scheme_name}`);
          }
          
          // Skip if we've already processed this scheme ID
          if (processedIds.has(schemeData.scheme_id)) {
            console.log(`Skipping duplicate scheme ID: ${schemeData.scheme_id}`);
            continue;
          }
          
          processedIds.add(schemeData.scheme_id);
          
          // Check if scheme exists in the database
          const schemeCheck = await pool.query(
            'SELECT * FROM scheme_status WHERE scheme_id = $1',
            [schemeData.scheme_id]
          );
          
          if (schemeCheck.rows.length > 0) {
            // Update existing scheme
            await pool.query(`
              UPDATE scheme_status SET
                sr_no = $1,
                scheme_name = $2,
                region = $3,
                circle = $4,
                division = $5,
                sub_division = $6,
                block = $7,
                number_of_village = $8,
                no_of_functional_village = $9,
                no_of_partial_village = $10,
                no_of_non_functional_village = $11,
                total_villages_integrated = $12,
                fully_completed_villages = $13,
                total_number_of_esr = $14,
                total_esr_integrated = $15,
                scheme_functional_status = $16,
                no_fully_completed_esr = $17,
                balance_to_complete_esr = $18,
                flow_meters_connected = $19,
                pressure_transmitter_connected = $20,
                residual_chlorine_analyzer_connected = $21,
                fully_completion_scheme_status = $22,
                agency = $23
              WHERE scheme_id = $24
            `, [
              schemeData.sr_no,
              schemeData.scheme_name,
              schemeData.region,
              schemeData.circle,
              schemeData.division,
              schemeData.sub_division,
              schemeData.block,
              schemeData.number_of_village,
              schemeData.no_of_functional_village,
              schemeData.no_of_partial_village,
              schemeData.no_of_non_functional_village,
              schemeData.total_villages_integrated,
              schemeData.fully_completed_villages,
              schemeData.total_number_of_esr,
              schemeData.total_esr_integrated,
              schemeData.scheme_functional_status,
              schemeData.no_fully_completed_esr,
              schemeData.balance_to_complete_esr,
              schemeData.flow_meters_connected,
              schemeData.pressure_transmitter_connected,
              schemeData.residual_chlorine_analyzer_connected,
              schemeData.fully_completion_scheme_status,
              schemeData.agency,
              schemeData.scheme_id
            ]);
            
            totalUpdated++;
            console.log(`Updated scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`);
          } else {
            // Create new scheme
            await pool.query(`
              INSERT INTO scheme_status (
                sr_no,
                scheme_id,
                scheme_name,
                region,
                circle,
                division,
                sub_division,
                block,
                number_of_village,
                no_of_functional_village,
                no_of_partial_village,
                no_of_non_functional_village,
                total_villages_integrated,
                fully_completed_villages,
                total_number_of_esr,
                total_esr_integrated,
                scheme_functional_status,
                no_fully_completed_esr,
                balance_to_complete_esr,
                flow_meters_connected,
                pressure_transmitter_connected,
                residual_chlorine_analyzer_connected,
                fully_completion_scheme_status,
                agency
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            `, [
              schemeData.sr_no,
              schemeData.scheme_id,
              schemeData.scheme_name,
              schemeData.region,
              schemeData.circle,
              schemeData.division,
              schemeData.sub_division,
              schemeData.block,
              schemeData.number_of_village,
              schemeData.no_of_functional_village,
              schemeData.no_of_partial_village,
              schemeData.no_of_non_functional_village,
              schemeData.total_villages_integrated,
              schemeData.fully_completed_villages,
              schemeData.total_number_of_esr,
              schemeData.total_esr_integrated,
              schemeData.scheme_functional_status,
              schemeData.no_fully_completed_esr,
              schemeData.balance_to_complete_esr,
              schemeData.flow_meters_connected,
              schemeData.pressure_transmitter_connected,
              schemeData.residual_chlorine_analyzer_connected,
              schemeData.fully_completion_scheme_status,
              schemeData.agency
            ]);
            
            totalCreated++;
            console.log(`Created new scheme: ${schemeData.scheme_name} (ID: ${schemeData.scheme_id})`);
          }
        } catch (rowError) {
          console.error(`Error processing row:`, rowError.message);
          // Continue with the next row
        }
      }
    }
    
    // Update region summaries
    await updateRegionSummaries();
    
    console.log(`Import completed: ${totalCreated} schemes created, ${totalUpdated} schemes updated`);
    return { totalCreated, totalUpdated };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
}

/**
 * Update region summary data based on scheme status data
 */
async function updateRegionSummaries() {
  console.log('Updating region summaries...');
  
  try {
    // Get all regions
    const regionsResult = await pool.query('SELECT * FROM region');
    const regions = regionsResult.rows;
    
    for (const region of regions) {
      // Get all schemes for this region
      const schemesResult = await pool.query(
        'SELECT * FROM scheme_status WHERE region = $1',
        [region.region_name]
      );
      
      const schemes = schemesResult.rows;
      
      // Calculate region totals
      const totals = {
        total_esr_integrated: schemes.reduce((sum, scheme) => sum + (scheme.total_esr_integrated || 0), 0),
        fully_completed_esr: schemes.reduce((sum, scheme) => sum + (scheme.no_fully_completed_esr || 0), 0),
        partial_esr: schemes.reduce((sum, scheme) => 
          sum + (scheme.total_esr_integrated || 0) - (scheme.no_fully_completed_esr || 0), 0),
        total_villages_integrated: schemes.reduce((sum, scheme) => sum + (scheme.total_villages_integrated || 0), 0),
        fully_completed_villages: schemes.reduce((sum, scheme) => sum + (scheme.fully_completed_villages || 0), 0),
        total_schemes_integrated: schemes.length,
        fully_completed_schemes: schemes.filter(s => {
          // Match any variant of 'Fully Completed'
          const status = (s.fully_completion_scheme_status || '').toLowerCase();
          return status.includes('fully') || status === 'completed' || status === 'fully completed';
        }).length,
        flow_meter_integrated: schemes.reduce((sum, scheme) => sum + (scheme.flow_meters_connected || 0), 0),
        rca_integrated: schemes.reduce((sum, scheme) => sum + (scheme.residual_chlorine_analyzer_connected || 0), 0),
        pressure_transmitter_integrated: schemes.reduce((sum, scheme) => sum + (scheme.pressure_transmitter_connected || 0), 0)
      };
      
      // Update the region record
      await pool.query(`
        UPDATE region SET
          total_esr_integrated = $1,
          fully_completed_esr = $2,
          partial_esr = $3,
          total_villages_integrated = $4,
          fully_completed_villages = $5,
          total_schemes_integrated = $6,
          fully_completed_schemes = $7,
          flow_meter_integrated = $8,
          rca_integrated = $9,
          pressure_transmitter_integrated = $10
        WHERE region_id = $11
      `, [
        totals.total_esr_integrated,
        totals.fully_completed_esr,
        totals.partial_esr,
        totals.total_villages_integrated,
        totals.fully_completed_villages,
        totals.total_schemes_integrated,
        totals.fully_completed_schemes,
        totals.flow_meter_integrated,
        totals.rca_integrated,
        totals.pressure_transmitter_integrated,
        region.region_id
      ]);
      
      console.log(`Updated summary for region: ${region.region_name}`);
    }
    
    console.log('All region summaries updated successfully');
  } catch (error) {
    console.error('Error updating region summaries:', error);
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Path to the Excel file
    const filePath = path.join(__dirname, 'attached_assets', 'scheme_level_datalink_report.xlsx');
    
    // Process the file
    await processExcelFile(filePath);
    
    // Close the database connection
    await pool.end();
    
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Error running script:', error);
    // Ensure we close the pool on error
    try {
      await pool.end();
    } catch (e) {
      console.error('Error closing database pool:', e);
    }
    process.exit(1);
  }
}

// Export functions for testing
export { processExcelFile, updateRegionSummaries };

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Run the main function
  main();
}