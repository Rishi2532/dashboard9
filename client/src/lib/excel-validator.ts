import { read, utils } from 'xlsx';

interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: {
    sheets: string[];
    schemeIdColumnPresent: boolean;
    requiredColumnsPresent: boolean;
    schemesFound: number;
    regionsFound: string[];
  };
}

/**
 * Validates an Excel file for importing scheme data
 * 
 * @param fileBuffer ArrayBuffer of the Excel file to validate
 * @returns ValidationResult with details about Excel structure
 */
export async function validateExcelFile(fileBuffer: ArrayBuffer): Promise<ValidationResult> {
  try {
    // Read the Excel file
    const workbook = read(fileBuffer, { type: 'array' });
    
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
    
    // Column patterns by field - exact match with template column names
    const COLUMN_PATTERNS = {
      // Scheme identification
      schemeId: [
        'Scheme ID',  // Template has this exact name
        'SchemeId', 
        'Scheme Id', 
        'scheme_id', 
        'SCHEME ID',
        'Scheme_Id', 
        'Scheme Code', 
        'SchemeID'
      ],
      
      // Basic fields
      serialNumber: [
        'Sr No.', 
        'SR No', 
        'sr_no', 
        'Serial Number'
      ],
      
      schemeName: [
        'Scheme Name',  // Template has this exact name
        'SchemeName', 
        'scheme_name', 
        'SCHEME NAME'
      ],
      
      // Region/Location fields
      region: [
        'Region',  // Template has this exact name 
        'Region Name', 
        'RegionName'
      ],
      
      circle: [
        'Circle',  // Template has this exact name
        'circle'
      ],
      
      division: [
        'Division',  // Template has this exact name
        'division'
      ],
      
      subDivision: [
        'Sub Division',  // Template has this exact name
        'sub_division', 
        'SubDivision'
      ],
      
      block: [
        'Block',  // Template has this exact name
        'block',
        'Block Name'
      ],
      
      // Villages related fields - exact matches from template
      totalVillages: [
        'Number of Village',  // Template has this exact name
        'No. of Village', 
        'Total Villages', 
        'Number of Villages', 
        'Villages',
        'total_villages'
      ],
      
      villagesIntegrated: [
        'Total Villages Integrated',  // Template has this exact name
        'Villages Integrated',
        'villages_integrated'
      ],
      
      functionalVillages: [
        'No. of Functional Village',  // Template has this exact name 
        'Functional Villages',
        'functional_villages'
      ],
      
      partialVillages: [
        'No. of Partial Village',  // Template has this exact name
        'Partial Villages',
        'partial_villages'
      ],
      
      nonFunctionalVillages: [
        'No. of Non- Functional Village',  // Template has this exact name
        'No. of Non-Functional Village',
        'Non-Functional Villages',
        'non_functional_villages'
      ],
      
      fullyCompletedVillages: [
        'Fully Completed Villages',  // Template has this exact name
        'fully_completed_villages'
      ],
      
      // ESR related fields - exact matches from template
      totalESR: [
        'Total Number of ESR',  // Template has this exact name
        'Total ESR', 
        'ESR Total',
        'total_esr'
      ],
      
      esrIntegrated: [
        'Total ESR Integrated',  // Template has this exact name
        'ESR Integrated',
        'esr_integrated_on_iot'
      ],
      
      fullyCompletedESR: [
        'No. Fully Completed ESR',  // Template has this exact name
        'Fully Completed ESR',
        'fully_completed_esr'
      ],
      
      balanceESR: [
        'Balance to Complete ESR',  // Template has this exact name
        'Balance ESR',
        'balance_esr'
      ],
      
      // Component related fields - exact matches from template
      flowMeters: [
        'Flow Meters Connected',  // Template has this exact name
        'Flow Meter Connected', 
        'Flow Meters', 
        'FM Connected',
        'flow_meters_connected'
      ],
      
      pressureTransmitters: [
        'Pressure Transmitter Connected',  // Template has this exact name
        'Pressure Transmitters Connected',
        'PT Connected', 
        'Pressure Transmitters',
        'pressure_transmitters_connected'
      ],
      
      residualChlorine: [
        'Residual Chlorine Analyzer Connected',  // Template has this exact name
        'Residual Chlorine Connected',
        'RCA Connected', 
        'Residual Chlorine',
        'residual_chlorine_connected'
      ],
      
      // Status fields - exact matches from template
      schemeFunctionalStatus: [
        'Scheme Functional Status',  // Template has this exact name
        'Functional Status',
        'scheme_functional_status'
      ],
      
      schemeCompletionStatus: [
        'Fully completion Scheme Status',  // Template has this exact name
        'Scheme Status', 
        'Status', 
        'Scheme status',
        'scheme_status'
      ]
    };
    
    const foundRegionSheets: string[] = [];
    const foundRegions: string[] = [];
    
    // Track if required columns are present
    let schemeIdColumnPresent = false;
    let requiredDataColumns = false;
    let schemesFound = 0;
    
    // Detect region from sheet name
    const detectRegionFromSheetName = (sheetName: string): string | null => {
      for (const { pattern, name } of REGION_PATTERNS) {
        if (pattern.test(sheetName)) {
          return name;
        }
      }
      return null;
    };
    
    // Analyze each sheet in the workbook
    for (const sheetName of workbook.SheetNames) {
      // Detect region from sheet name
      const regionName = detectRegionFromSheetName(sheetName);
      
      // Check sheet contents regardless of sheet name (we'll check for region column)
      const sheet = workbook.Sheets[sheetName];
      const data = utils.sheet_to_json(sheet, { defval: null }) as Record<string, any>[];
      
      if (regionName) {
        foundRegionSheets.push(sheetName);
        if (!foundRegions.includes(regionName)) {
          foundRegions.push(regionName);
        }
      }
      
      if (data && data.length > 0) {
        // Check each row for scheme ID and required columns
        for (const row of data) {
          let hasSchemeId = false;
          
          // Check for scheme ID using patterns
          for (const pattern of COLUMN_PATTERNS.schemeId) {
            if (row[pattern] !== undefined && row[pattern] !== null) {
              hasSchemeId = true;
              schemeIdColumnPresent = true;
              break;
            }
          }
          
          if (hasSchemeId) {
            schemesFound++;
            
            // Check for any required data column
            let hasRequiredDataColumn = false;
            
            // Helper function to check if any column from a category exists in the row
            const checkColumnCategory = (category: string[]) => {
              for (const pattern of category) {
                if (row[pattern] !== undefined && row[pattern] !== null) {
                  return true;
                }
              }
              return false;
            };
            
            // Check all data categories
            if (
              checkColumnCategory(COLUMN_PATTERNS.totalVillages) ||
              checkColumnCategory(COLUMN_PATTERNS.villagesIntegrated) ||
              checkColumnCategory(COLUMN_PATTERNS.fullyCompletedVillages) ||
              checkColumnCategory(COLUMN_PATTERNS.totalESR) ||
              checkColumnCategory(COLUMN_PATTERNS.esrIntegrated) ||
              checkColumnCategory(COLUMN_PATTERNS.fullyCompletedESR) ||
              checkColumnCategory(COLUMN_PATTERNS.flowMeters) ||
              checkColumnCategory(COLUMN_PATTERNS.pressureTransmitters) ||
              checkColumnCategory(COLUMN_PATTERNS.residualChlorine) ||
              checkColumnCategory(COLUMN_PATTERNS.schemeCompletionStatus) ||
              checkColumnCategory(COLUMN_PATTERNS.schemeFunctionalStatus)
            ) {
              requiredDataColumns = true;
            }
          }
        }
      }
    }
    
    // If no region sheets found, but we found scheme data, try to proceed
    if (foundRegionSheets.length === 0 && schemesFound > 0) {
      console.log('No region sheets detected, but scheme data found. Will attempt to import using region column values.');
      // We'll rely on the region column value instead
      foundRegionSheets.push(workbook.SheetNames[0]);
    } else if (foundRegionSheets.length === 0) {
      return {
        isValid: false,
        message: 'No region sheets found in the Excel file. Expected sheets containing Amravati, Nashik, Nagpur, Pune, Konkan, CS (Chhatrapati Sambhajinagar), or Sambhajinagar. Alternatively, the file should contain a Region column.',
        details: {
          sheets: workbook.SheetNames,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound,
          regionsFound: foundRegions
        }
      };
    }
    
    if (!schemeIdColumnPresent) {
      return {
        isValid: false,
        message: 'No Scheme ID column found in any sheet. Expected column name "Scheme ID" or similar.',
        details: {
          sheets: foundRegionSheets,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound,
          regionsFound: foundRegions
        }
      };
    }
    
    if (!requiredDataColumns) {
      return {
        isValid: false,
        message: 'Missing required data columns. The file needs columns for Villages, ESR, Flow Meters, etc.',
        details: {
          sheets: foundRegionSheets,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound,
          regionsFound: foundRegions
        }
      };
    }
    
    if (schemesFound === 0) {
      return {
        isValid: false,
        message: 'No scheme data found in the Excel file.',
        details: {
          sheets: foundRegionSheets,
          schemeIdColumnPresent,
          requiredColumnsPresent: requiredDataColumns,
          schemesFound,
          regionsFound: foundRegions
        }
      };
    }
    
    // All validation passed
    return {
      isValid: true,
      message: `Excel file valid. Found ${schemesFound} schemes across ${foundRegionSheets.length} sheets. Ready to import.`,
      details: {
        sheets: foundRegionSheets,
        schemeIdColumnPresent,
        requiredColumnsPresent: requiredDataColumns,
        schemesFound,
        regionsFound: foundRegions
      }
    };
    
  } catch (error) {
    return {
      isValid: false,
      message: `Failed to validate Excel file: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}