import { Request, Response } from "express";
import { storage } from "../../storage";
import { parse } from "csv-parse/sync";
import { updateRegionSummaries } from "../../db";
import { type InsertSchemeStatus, type SchemeStatus, type InsertRegion, type InsertSchemeProgressSummary } from "@shared/schema";
import { generateDashboardUrl } from "../../auto-generate-dashboard-urls";

/**
 * Handle CSV import with column mapping and advanced configuration options
 */
export async function importCsvHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Extract parameters from request body
    let { columnMappings, regionName, tableName, delimiter, hasHeader } =
      req.body;

    if (!columnMappings || !tableName) {
      return res.status(400).json({
        message: "Missing required parameters",
        details: "Column mappings and table name are required",
      });
    }

    // Apply defaults if not provided
    delimiter = delimiter || ",";
    hasHeader = hasHeader === "true" || hasHeader === true;

    // Handle 'no_region' value from SelectItem to actual null/empty value
    if (regionName === "no_region" || regionName === "") {
      regionName = null;
    }

    // Read CSV data from the uploaded file
    const csvData = req.file.buffer.toString("utf-8");

    console.log(
      `Importing CSV with delimiter: '${delimiter}', hasHeader: ${hasHeader}, tableName: ${tableName}`,
    );
    console.log(`[Import Request] Column Mappings (Raw):`, columnMappings);

    // Parse CSV data according to mappings and options
    const parsedData = parseCsvData(
      csvData,
      JSON.parse(columnMappings),
      delimiter,
      hasHeader,
    );

    // Update database records based on the table name
    const result = await updateDatabaseRecords(
      parsedData,
      tableName,
      regionName,
    );

    // Update region summaries after import to reflect changes
    await updateRegionSummaries();

    // Return success response with details
    return res.status(200).json({
      message: "CSV data imported successfully",
      updatedCount: result.updatedCount,
      details: result.details,
    });
  } catch (error) {
    console.error("Error importing CSV data:", error);
    return res.status(500).json({
      message: "Failed to import CSV data",
      error: (error as Error).message,
    });
  }
}

/**
 * Parse CSV data using provided column mappings and options
 */
function parseCsvData(
  csvData: string,
  columnMappings: Record<string, string | number>,
  delimiter: string = ",",
  hasHeader: boolean = false,
): any[] {
  // Parse options
  const parseOptions = {
    delimiter: delimiter,
    skip_empty_lines: true,
    trim: true,
    from_line: hasHeader ? 2 : 1, // Skip header row if present
  };

  // Parse the CSV into records (array of arrays)
  const records = parse(csvData, parseOptions);

  // Transform records based on column mappings
  return records.map((row: string[]) => {
    const mappedRecord: Record<string, any> = {};

    // Apply each column mapping
    for (const [fieldName, columnIndexValue] of Object.entries(
      columnMappings,
    )) {
      // Skip "not_mapped" values that were added to fix the SelectItem empty value error
      if (columnIndexValue === "not_mapped") {
        mappedRecord[fieldName] = null;
        continue;
      }

      // Convert columnIndex to number if it's a string representation of a number
      const colIndex =
        typeof columnIndexValue === "string"
          ? parseInt(columnIndexValue)
          : columnIndexValue;

      // Check if colIndex is a valid number and within row bounds
      if (!isNaN(colIndex) && colIndex >= 0 && colIndex < row.length) {
        mappedRecord[fieldName] = parseFieldValue(fieldName, row[colIndex]);
      } else {
        mappedRecord[fieldName] = null; // Set null for unmapped columns
      }
    }

    return mappedRecord;
  });
}

/**
 * Parse field value based on expected data type
 */
function parseFieldValue(fieldName: string, value: string): any {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Apply specific parsing rules based on field name patterns
  if (
    fieldName === "region" ||
    fieldName === "scheme_name" ||
    fieldName === "scheme_id" ||
    fieldName === "district" ||
    fieldName === "implementing_agency" ||
    fieldName === "completion_status"
  ) {
    return String(value).trim();
  } else if (
    fieldName === "fully_completion_scheme_status" ||
    fieldName === "scheme_functional_status"
  ) {
    // Handle status fields specially - keep the original text values
    const trimmedValue = String(value).trim();
    const lowerValue = trimmedValue.toLowerCase();

    // Map common status values to standardized ones
    const statusMap: Record<string, string> = {
      completed: "Fully Completed",
      "fully completed": "Fully Completed",
      "fully-completed": "Fully Completed",
      complete: "Fully Completed",
      yes: "Fully Completed",
      true: "Fully Completed",
      "1": "Fully Completed",
      y: "Fully Completed",
      partial: "Partial",
      "in progress": "In Progress",
      "in-progress": "In Progress",
      no: "In Progress",
      false: "In Progress",
      "0": "In Progress",
      n: "In Progress",
      functional: "Functional",
      "non functional": "Non Functional",
      "non-functional": "Non Functional",
      "not functional": "Non Functional",
      "not connected": "Not-Connected",
      "not-connected": "Not-Connected",
      disconnected: "Not-Connected",
    };

    // Special handling for functional status field
    if (fieldName === "scheme_functional_status") {
      // Ensure correct mapping for functional status
      const functionalStatusMap: Record<string, string> = {
        ...statusMap,
        complete: "Functional", // Override for functional status
        completed: "Functional",
        "fully completed": "Functional",
        "fully-completed": "Functional",
        yes: "Functional",
        true: "Functional",
        "1": "Functional",
        y: "Functional",
      };
      return functionalStatusMap[lowerValue] || trimmedValue;
    }

    // Return mapped value if it exists, otherwise return the original value
    return statusMap[lowerValue] || trimmedValue;
  } else if (fieldName === "mjp_commissioned") {
    // For MJP columns, use exactly the values from the CSV without normalizing
    return String(value).trim();
  } else if (fieldName === "mjp_fully_completed") {
    // For MJP columns, use exactly the values from the CSV without normalizing
    return String(value).trim();
  } else if (fieldName === "water_supply") {
    return String(value).trim();
  } else if (fieldName === "agency_type") {
    // For agency_type, accept MJP or ZP values exactly as entered
    return String(value).trim();
  } else if (fieldName === "water_supply_status") {
    return String(value).trim();
  } else if (fieldName.includes("date")) {
    // Try to parse as date if it looks like a date
    const dateValue = new Date(value);
    return isNaN(dateValue.getTime()) ? value : dateValue.toISOString();
  } else if (
    fieldName.includes("is_") ||
    fieldName.includes("has_") ||
    (fieldName.includes("_status") &&
      fieldName !== "fully_completion_scheme_status" &&
      fieldName !== "scheme_functional_status") ||
    fieldName === "active"
  ) {
    return parseBoolean(value);
  } else {
    // Default to number if it looks like a number, otherwise keep as string
    return parseNumber(value) ?? String(value).trim();
  }
}

/**
 * Parse string to boolean
 */
function parseBoolean(value: string): boolean {
  const lowerValue = String(value).toLowerCase().trim();
  return (
    lowerValue === "yes" ||
    lowerValue === "true" ||
    lowerValue === "1" ||
    lowerValue === "y" ||
    lowerValue === "completed" ||
    lowerValue === "fully completed"
  );
}

/**
 * Parse string to number
 */
function parseNumber(value: string): number | null {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const trimmedValue = String(value).trim();

  // Skip values that clearly aren't numbers (contain letters other than 'e' for scientific notation)
  if (/[a-df-zA-DF-Z]/.test(trimmedValue)) {
    return null;
  }

  // Remove any commas, spaces, or currency symbols
  const cleanValue = trimmedValue
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "");

  const parsedNumber = Number(cleanValue);

  // Additional validation to ensure we don't return NaN or Infinity
  if (isNaN(parsedNumber) || !isFinite(parsedNumber)) {
    return null;
  }

  return parsedNumber;
}

/**
 * Robustly coerce a value to a number or null
 */
function coerceNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  
  const str = String(value).trim().replace(/,/g, "");
  if (str === "") return null;
  
  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Update records in the database using efficient batch operations
 */
async function updateDatabaseRecords(
  data: Record<string, any>[],
  tableName: string,
  regionName?: string,
): Promise<{ updatedCount: number; details: string }> {
  let details = "";

  if (data.length === 0) {
    return { updatedCount: 0, details: "No data to process" };
  }

  console.log(`Processing ${data.length} records for table: ${tableName}`);

  if (
    tableName === "fully_completion_scheme_status" ||
    tableName === "scheme_status"
  ) {
    // Process scheme status updates using batch operations
    const schemesToUpsert: InsertSchemeStatus[] = [];
    let skippedCount = 0;

    // Pre-process and validate all scheme data
    for (const item of data) {
      try {
        // Add region name if provided via form
        if (regionName && !item.region_name) {
          item.region_name = regionName;
        }

        // Skip items without region name
        if (!item.region_name) {
          details += `Skipped item - missing region name\n`;
          skippedCount++;
          continue;
        }

        // Set default scheme ID if not provided
        if (!item.scheme_id) {
          const timestamp = Date.now();
          const randomPart = Math.floor(Math.random() * 1000);
          item.scheme_id = `${item.region_name.substring(0, 3).toUpperCase()}-${timestamp}-${randomPart}`;
        }

        // Assign agency based on region if not specified
        if (!item.agency) {
          const regionAgencyMap: Record<string, string> = {
            Amravati: "M/s Ceinsys",
            Nashik: "M/s Ceinsys",
            Nagpur: "M/s Rite Water",
            "Chhatrapati Sambhajinagar": "M/s Rite Water",
            Konkan: "M/s Indo/Chetas",
            Pune: "M/s Indo/Chetas",
          };
          item.agency = regionAgencyMap[item.region_name] || null;
        }

        // Prepare scheme data for batch upsert
        // IMPORTANT: For scheme_status table, we use undefined for blank fields
        // so that existing values are preserved during upsert (not overwritten with defaults)
        const schemeData: InsertSchemeStatus = {
          scheme_id: String(item.scheme_id),
          scheme_name: item.scheme_name || `Scheme ${item.scheme_id}`,
          region: item.region || item.region_name,
          sr_no: typeof item.sr_no === "number" ? item.sr_no : undefined,
          circle: item.circle || undefined,
          division: item.division || undefined,
          sub_division: item.sub_division || undefined,
          block: item.block || undefined,
          agency: item.agency || undefined,
          number_of_village:
            typeof item.number_of_village === "number"
              ? item.number_of_village
              : undefined,
          total_villages_integrated:
            typeof item.total_villages_integrated === "number"
              ? item.total_villages_integrated
              : undefined,
          no_of_functional_village:
            typeof item.no_of_functional_village === "number"
              ? item.no_of_functional_village
              : undefined,
          no_of_partial_village:
            typeof item.no_of_partial_village === "number"
              ? item.no_of_partial_village
              : undefined,
          no_of_non_functional_village:
            typeof item.no_of_non_functional_village === "number"
              ? item.no_of_non_functional_village
              : undefined,
          fully_completed_villages:
            typeof item.fully_completed_villages === "number"
              ? item.fully_completed_villages
              : undefined,
          total_number_of_esr:
            typeof item.total_number_of_esr === "number"
              ? item.total_number_of_esr
              : undefined,
          scheme_functional_status:
            item.scheme_functional_status || undefined,
          total_esr_integrated:
            typeof item.total_esr_integrated === "number"
              ? item.total_esr_integrated
              : undefined,
          no_fully_completed_esr:
            typeof item.no_fully_completed_esr === "number"
              ? item.no_fully_completed_esr
              : undefined,
          balance_to_complete_esr:
            typeof item.balance_to_complete_esr === "number"
              ? item.balance_to_complete_esr
              : undefined,
          flow_meters_connected:
            typeof item.flow_meters_connected === "number"
              ? item.flow_meters_connected
              : undefined,
          pressure_transmitter_connected:
            typeof item.pressure_transmitter_connected === "number"
              ? item.pressure_transmitter_connected
              : undefined,
          residual_chlorine_analyzer_connected:
            typeof item.residual_chlorine_analyzer_connected === "number"
              ? item.residual_chlorine_analyzer_connected
              : undefined,
          fully_completion_scheme_status:
            item.fully_completion_scheme_status || undefined,
          mjp_commissioned: item.mjp_commissioned || undefined,
          mjp_fully_completed: item.mjp_fully_completed || undefined,
          water_supply: item.water_supply || undefined,
          agency_type: item.agency_type || undefined,
          water_supply_status: item.water_supply_status || undefined,
          dashboard_url: generateDashboardUrl(item) || item.dashboard_url || undefined,
        };

        if (item.water_supply) {
           console.log(`[Import Debug] Found water_supply for scheme ${schemeData.scheme_id}:`, item.water_supply);
        }

        schemesToUpsert.push(schemeData);
      } catch (itemError) {
        console.error("Error processing scheme item:", itemError);
        details += `Error processing item: ${(itemError as Error).message}\n`;
        skippedCount++;
      }
    }

    // Use batch upsert for dramatic performance improvement
    if (schemesToUpsert.length > 0) {
      try {
        console.log(`Batch upserting ${schemesToUpsert.length} schemes...`);
        const batchResult = await storage.batchUpsertSchemes(schemesToUpsert);
        details += `Batch processed ${schemesToUpsert.length} schemes (${batchResult.inserted} inserted, ${batchResult.updated} updated)\n`;

        if (skippedCount > 0) {
          details += `Skipped ${skippedCount} invalid records\n`;
        }

        return { updatedCount: schemesToUpsert.length, details };
      } catch (batchError) {
        console.error("Batch upsert failed:", batchError);
        details += `Batch operation failed: ${(batchError as Error).message}\n`;
        return { updatedCount: 0, details };
      }
    } else {
      return {
        updatedCount: 0,
        details: details || "No valid schemes to process",
      };
    }
  } else if (tableName === "region") {
    // Process region updates using batch operations
    const regionsToUpsert: InsertRegion[] = [];
    let skippedCount = 0;

    // Pre-process and validate all region data
    for (const item of data) {
      try {
        // Skip items without region name
        if (!item.region_name) {
          details += `Skipped region - missing region name\n`;
          skippedCount++;
          continue;
        }

        // Prepare region data for batch upsert
        const regionData: InsertRegion = {
          region_name: item.region_name,
          total_esr_integrated:
            typeof item.total_esr_integrated === "number"
              ? item.total_esr_integrated
              : null,
          fully_completed_esr:
            typeof item.fully_completed_esr === "number"
              ? item.fully_completed_esr
              : null,
          partial_esr:
            typeof item.partial_esr === "number" ? item.partial_esr : null,
          total_villages_integrated:
            typeof item.total_villages_integrated === "number"
              ? item.total_villages_integrated
              : null,
          fully_completed_villages:
            typeof item.fully_completed_villages === "number"
              ? item.fully_completed_villages
              : null,
          total_schemes_integrated:
            typeof item.total_schemes_integrated === "number"
              ? item.total_schemes_integrated
              : null,
          fully_completed_schemes:
            typeof item.fully_completed_schemes === "number"
              ? item.fully_completed_schemes
              : null,
          flow_meter_integrated:
            typeof item.flow_meter_integrated === "number"
              ? item.flow_meter_integrated
              : null,
          rca_integrated:
            typeof item.rca_integrated === "number"
              ? item.rca_integrated
              : null,
          pressure_transmitter_integrated:
            typeof item.pressure_transmitter_integrated === "number"
              ? item.pressure_transmitter_integrated
              : null,
        };

        regionsToUpsert.push(regionData);
      } catch (itemError) {
        console.error("Error processing region item:", itemError);
        details += `Error processing item: ${(itemError as Error).message}\n`;
        skippedCount++;
      }
    }

    // Use batch upsert for dramatic performance improvement
    if (regionsToUpsert.length > 0) {
      try {
        console.log(`Batch upserting ${regionsToUpsert.length} regions...`);
        const batchResult = await storage.batchUpsertRegions(regionsToUpsert);
        details += `Batch processed ${regionsToUpsert.length} regions (${batchResult.inserted} inserted, ${batchResult.updated} updated)\n`;

        if (skippedCount > 0) {
          details += `Skipped ${skippedCount} invalid records\n`;
        }

        return { updatedCount: regionsToUpsert.length, details };
      } catch (batchError) {
        console.error("Batch upsert failed:", batchError);
        details += `Batch operation failed: ${(batchError as Error).message}\n`;
        return { updatedCount: 0, details };
      }
    } else {
      return {
        updatedCount: 0,
        details: details || "No valid regions to process",
      };
    }
  } else if (tableName === "scheme_progress_summary") {
    // Process scheme progress summary updates using batch operations
    const summaryData: InsertSchemeProgressSummary[] = [];
    let skippedCount = 0;
    const skippedRows: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      try {
        if (!item.scheme_id) {
          skippedCount++;
          skippedRows.push({ row: i + 1, reason: "missing scheme_id", data: item });
          continue;
        }

        const summaryRecord: InsertSchemeProgressSummary = {
          scheme_id: item.scheme_id, // Will be converted to BigInt in storage
          scheme_name: item.scheme_name || null,
          region: item.region || null,
          number_of_villages: coerceNumber(item.number_of_villages),
          number_of_completed_villages: coerceNumber(item.number_of_completed_villages),
          number_of_esr: coerceNumber(item.number_of_esr),
          number_of_completed_esr: coerceNumber(item.number_of_completed_esr),
          number_of_gsr: coerceNumber(item.number_of_gsr),
          number_of_completed_gsr: coerceNumber(item.number_of_completed_gsr),
          number_of_mbr: coerceNumber(item.number_of_mbr),
          number_of_completed_mbr: coerceNumber(item.number_of_completed_mbr),
          total_flowmeter_scope: coerceNumber(item.total_flowmeter_scope),
          flowmeter_integrated: coerceNumber(item.flowmeter_integrated),
          flowmeter_balance: coerceNumber(item.flowmeter_balance),
          total_rca_scope: coerceNumber(item.total_rca_scope),
          rca_integrated: coerceNumber(item.rca_integrated),
          rca_balance: coerceNumber(item.rca_balance),
          total_pt_scope: coerceNumber(item.total_pt_scope),
          pt_integrated: coerceNumber(item.pt_integrated),
          pt_balance: coerceNumber(item.pt_balance),
          completion_status: item.completion_status || null,
        };

        summaryData.push(summaryRecord);
      } catch (itemError) {
        console.error("Error processing summary item:", itemError);
        details += `Error processing item: ${(itemError as Error).message}\n`;
        skippedCount++;
      }
    }

    if (summaryData.length > 0) {
      try {
        console.log(`Processing ${data.length} total rows. Valid records: ${summaryData.length}. Skipped: ${skippedCount}`);
        if (skippedRows.length > 0) {
          console.log("Skipped rows details:", JSON.stringify(skippedRows.slice(0, 5), null, 2));
        }

        console.log("First record preview:", JSON.stringify(summaryData[0], null, 2));
        
        console.log(`Batch upserting ${summaryData.length} scheme progress summary records...`);
        const batchResult = await storage.batchUpsertSchemeProgressSummary(summaryData);
        details += `Batch processed ${summaryData.length} summary records (${batchResult.inserted} inserted, ${batchResult.updated} updated)\n`;

        if (skippedCount > 0) {
          details += `Skipped ${skippedCount} invalid records\n`;
        }

        return { updatedCount: summaryData.length, details };
      } catch (batchError) {
        console.error("Batch upsert summary failed:", batchError);
        details += `Batch operation failed: ${(batchError as Error).message}\n`;
        return { updatedCount: 0, details };
      }
    } else {
      return {
        updatedCount: 0,
        details: details || "No valid summary records to process",
      };
    }
  } else {
    throw new Error(`Unsupported table name: ${tableName}`);
  }
}
