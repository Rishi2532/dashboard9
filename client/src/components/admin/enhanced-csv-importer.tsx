import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

// Define the database fields for column mapping
const schemeFields = [
  { value: "scheme_id", label: "Scheme ID", required: true },
  { value: "scheme_name", label: "Scheme Name", required: true },
  { value: "region", label: "Region", required: true },
  { value: "sr_no", label: "Serial Number", required: false },
  { value: "circle", label: "Circle", required: false },
  { value: "division", label: "Division", required: false },
  { value: "sub_division", label: "Sub Division", required: false },
  { value: "block", label: "Block", required: false },
  { value: "agency", label: "Agency", required: false },
  { value: "number_of_village", label: "Number of Village", required: false },
  { value: "total_villages_integrated", label: "Total Villages Integrated", required: false },
  { value: "total_villages_in_scheme", label: "Total Villages in Scheme", required: false },
  { value: "no_of_functional_village", label: "No. of Functional Village", required: false },
  { value: "no_of_partial_village", label: "No. of Partial Village", required: false },
  { value: "no_of_non_functional_village", label: "No. of Non-Functional Village", required: false },
  { value: "fully_completed_villages", label: "Fully Completed Villages", required: false },
  { value: "total_number_of_esr", label: "Total Number of ESR", required: false },
  { value: "scheme_functional_status", label: "Scheme Functional Status", required: false },
  { value: "total_esr_integrated", label: "Total ESR Integrated", required: false },
  { value: "no_fully_completed_esr", label: "No. Fully Completed ESR", required: false },
  { value: "balance_to_complete_esr", label: "Balance to Complete ESR", required: false },
  { value: "flow_meters_connected", label: "Flow Meters Connected", required: false },
  { value: "fm_integrated", label: "Flow Meters Integrated (Alternative)", required: false },
  { value: "pressure_transmitter_connected", label: "Pressure Transmitter Connected", required: false },
  { value: "pt_integrated", label: "Pressure Transmitter Integrated (Alternative)", required: false },
  { value: "residual_chlorine_analyzer_connected", label: "Residual Chlorine Analyzer Connected", required: false },
  { value: "rca_integrated", label: "RCA Integrated (Alternative)", required: false },
  { value: "fully_completion_scheme_status", label: "Fully completion Scheme Status", required: false },
  { value: "mjp_commissioned", label: "MJP Commissioned", required: false },
  { value: "mjp_fully_completed", label: "MJP Fully Completed", required: false },
  { value: "water_supply", label: "Water Supply", required: false },
  { value: "agency_type", label: "Agency Type (MJP/ZP)", required: false },
  { value: "water_supply_status", label: "Water Supply Status", required: false },
];

const regionFields = [
  { value: "region_name", label: "Region Name", required: true },
  { value: "total_esr_integrated", label: "Total ESR Integrated", required: false },
  { value: "fully_completed_esr", label: "Fully Completed ESR", required: false },
  { value: "partial_esr", label: "Partial ESR", required: false },
  { value: "total_villages_integrated", label: "Total Villages Integrated", required: false },
  { value: "fully_completed_villages", label: "Fully Completed Villages", required: false },
  { value: "total_schemes_integrated", label: "Total Schemes Integrated", required: false },
  { value: "fully_completed_schemes", label: "Fully Completed Schemes", required: false },
  { value: "flow_meter_integrated", label: "Flow Meters Integrated", required: false },
  { value: "rca_integrated", label: "RCA Integrated", required: false },
  { value: "pressure_transmitter_integrated", label: "Pressure Transmitters", required: false },
];

const waterConsumptionFields = [
  { value: "region", label: "Region", required: true },
  { value: "circle", label: "Circle", required: false },
  { value: "division", label: "Division", required: false },
  { value: "sub_division", label: "Sub Division", required: false },
  { value: "block", label: "Block", required: false },
  { value: "scheme_id", label: "Scheme ID", required: true },
  { value: "scheme_name", label: "Scheme Name", required: true },
  { value: "village_name", label: "Village Name", required: true },
  { value: "esr_name", label: "ESR Name", required: true },
  { value: "flow_rate_m3", label: "Flow Rate (m³)", required: false },
  { value: "flow_meter_connected", label: "Flow Meter Connected", required: false },
  { value: "online_status", label: "Online Status", required: false },
  { value: "time_duration", label: "Time Duration", required: false },
  { value: "esr_capacity", label: "ESR Capacity", required: false },
  { value: "water_value_day1", label: "Water Value Day 1", required: false },
  { value: "water_value_day2", label: "Water Value Day 2", required: false },
  { value: "water_value_day3", label: "Water Value Day 3", required: false },
  { value: "water_value_day4", label: "Water Value Day 4", required: false },
  { value: "water_value_day5", label: "Water Value Day 5", required: false },
  { value: "water_value_day6", label: "Water Value Day 6", required: false },
  { value: "water_value_day7", label: "Water Value Day 7", required: false },
  { value: "water_date_day1", label: "Water Date Day 1", required: false },
  { value: "water_date_day2", label: "Water Date Day 2", required: false },
  { value: "water_date_day3", label: "Water Date Day 3", required: false },
  { value: "water_date_day4", label: "Water Date Day 4", required: false },
  { value: "water_date_day5", label: "Water Date Day 5", required: false },
  { value: "water_date_day6", label: "Water Date Day 6", required: false },
  { value: "water_date_day7", label: "Water Date Day 7", required: false },
  { value: "consistent_zero_consumption", label: "Consistent Zero Consumption", required: false },
  { value: "percentage_consumption_previous_day", label: "Percentage Consumption Previous Day", required: false },
];

const schemeProgressSummaryFields = [
  { value: "region", label: "Region", required: true },
  { value: "scheme_id", label: "Scheme ID", required: true },
  { value: "scheme_name", label: "Scheme Name", required: false },
  { value: "number_of_villages", label: "Number of Villages", required: false },
  { value: "number_of_completed_villages", label: "No. of Completed Villages", required: false },
  { value: "number_of_esr", label: "Number of ESR", required: false },
  { value: "number_of_completed_esr", label: "No. of Completed ESR", required: false },
  { value: "number_of_gsr", label: "Number of GSR", required: false },
  { value: "number_of_completed_gsr", label: "No. of Completed GSR", required: false },
  { value: "number_of_mbr", label: "Number of MBR", required: false },
  { value: "number_of_completed_mbr", label: "No. of Completed MBR", required: false },
  { value: "total_flowmeter_scope", label: "Total Flowmeter Scope", required: false },
  { value: "flowmeter_integrated", label: "Flowmeter Integrated", required: false },
  { value: "flowmeter_balance", label: "Flowmeter Balance", required: false },
  { value: "total_rca_scope", label: "Total RCA Scope", required: false },
  { value: "rca_integrated", label: "RCA Integrated", required: false },
  { value: "rca_balance", label: "RCA Balance", required: false },
  { value: "total_pt_scope", label: "Total PT Scope", required: false },
  { value: "pt_integrated", label: "PT Integrated", required: false },
  { value: "pt_balance", label: "PT Balance", required: false },
  { value: "completion_status", label: "Completion Status", required: false },
];

// Regions for the dropdown
const regions = [
  { value: "Nagpur", label: "Nagpur" },
  { value: "Pune", label: "Pune" },
  { value: "Konkan", label: "Konkan" },
  { value: "Amravati", label: "Amravati" },
  { value: "Nashik", label: "Nashik" },
  { value: "Chhatrapati Sambhajinagar", label: "Chhatrapati Sambhajinagar" },
];

// Table options
const tableOptions = [
  { value: "scheme_status", label: "Scheme Status Table" },
  { value: "region", label: "Region Table" },
  { value: "water_consumption", label: "Water Consumption Table" },
  { value: "scheme_progress_summary", label: "Scheme Progress Summary Table" },
];

interface EnhancedCsvImporterProps {
  defaultTable?: string;
}

export default function EnhancedCsvImporter({ defaultTable = "scheme_status" }: EnhancedCsvImporterProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileContents, setFileContents] = useState<string>("");
  const [columnCount, setColumnCount] = useState(5);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [tableName, setTableName] = useState(defaultTable);
  const [regionName, setRegionName] = useState("");
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    details?: string;
    updatedCount?: number;
  } | null>(null);
  const [delimiter, setDelimiter] = useState(",");
  const [hasHeader, setHasHeader] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const selectedFile = e.target.files?.[0] || null;
      setFile(selectedFile);
      setValidationErrors([]);

      if (selectedFile) {
        // Preview the file
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setFileContents(content);

          // Try to auto-detect delimiter
          const commaCount = (content.match(/,/g) || []).length;
          const semicolonCount = (content.match(/;/g) || []).length;
          const tabCount = (content.match(/\t/g) || []).length;

          let detectedDelimiter = ",";
          if (semicolonCount > commaCount && semicolonCount > tabCount) {
            detectedDelimiter = ";";
          } else if (tabCount > commaCount && tabCount > semicolonCount) {
            detectedDelimiter = "\t";
          }

          setDelimiter(detectedDelimiter);
          parsePreviewData(content, detectedDelimiter, hasHeader);
        };
        reader.readAsText(selectedFile);
      } else {
        setPreviewData([]);
        setFileContents("");
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      setValidationErrors([`Error parsing CSV file: ${(error as Error).message}`]);
    }
  };

  // Automatically update mappings when tableName or previewData changes
  useEffect(() => {
    if (previewData.length > 0) {
      updateInitialMappings(previewData, tableName, hasHeader);
    }
  }, [tableName, previewData, hasHeader]);

  const updateInitialMappings = (parsedRows: string[][], table: string, skipHeader: boolean) => {
    if (parsedRows.length === 0) return;

    // Default to empty mappings
    let newMappings: Record<string, string> = {};

    // 1. Check for predefined mappings based on column count and table
    if (table === "water_consumption" && parsedRows[0].length >= 30) {
      newMappings = {
        "region": "0", "circle": "1", "division": "2", "sub_division": "3", "block": "4",
        "scheme_id": "5", "scheme_name": "6", "village_name": "7", "esr_name": "8",
        "flow_rate_m3": "9", "flow_meter_connected": "10", "online_status": "11",
        "time_duration": "12", "esr_capacity": "13", "water_value_day1": "14",
        "water_value_day2": "15", "water_value_day3": "16", "water_value_day4": "17",
        "water_value_day5": "18", "water_value_day6": "19", "water_value_day7": "20",
        "water_date_day1": "21", "water_date_day2": "22", "water_date_day3": "23",
        "water_date_day4": "24", "water_date_day5": "25", "water_date_day6": "26",
        "water_date_day7": "27", "consistent_zero_consumption": "28",
        "percentage_consumption_previous_day": "29"
      };
    } else if (table === "scheme_progress_summary" && parsedRows[0].length >= 21) {
      newMappings = {
        "region": "0", "scheme_id": "1", "scheme_name": "2", "number_of_villages": "3",
        "number_of_completed_villages": "4", "number_of_esr": "5",
        "number_of_completed_esr": "6", "number_of_gsr": "7",
        "number_of_completed_gsr": "8", "number_of_mbr": "9",
        "number_of_completed_mbr": "10", "total_flowmeter_scope": "11",
        "flowmeter_integrated": "12", "flowmeter_balance": "13",
        "total_rca_scope": "14", "rca_integrated": "15", "rca_balance": "16",
        "total_pt_scope": "17", "pt_integrated": "18", "pt_balance": "19",
        "completion_status": "20"
      };
    } else if (skipHeader && parsedRows.length > 0) {
      // 2. Try to auto-match headers if no predefined mapping found
      const headers = parsedRows[0];
      let fields: any[] = [];
      if (table === "scheme_status") fields = schemeFields;
      else if (table === "region") fields = regionFields;
      else if (table === "scheme_progress_summary") fields = schemeProgressSummaryFields;
      else fields = waterConsumptionFields;

      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().trim().replace(/[_\s]/g, "");
        const matchedField = fields.find(field => {
          const val = field.value.toLowerCase().replace(/[_\s]/g, "");
          const lbl = field.label.toLowerCase().replace(/[_\s]/g, "");
          return val === lowerHeader || lbl === lowerHeader || 
                 (field.value === "scheme_id" && lowerHeader === "schemeid") ||
                 (field.value === "scheme_name" && lowerHeader === "schemename");
        });

        if (matchedField) {
          newMappings[matchedField.value] = index.toString();
        }
      });
    }

    setColumnMappings(newMappings);
  };

  // Parse preview data with the selected delimiter
  const parsePreviewData = (content: string, currentDelimiter: string, skipHeader: boolean) => {
    try {
      // Simple CSV parsing for preview (handles quoted cells)
      const rows = content.split(/\r?\n/).filter(row => row.trim() !== '');

      const parsedRows = rows.map(row => {
        // Handle quoted cells with embedded delimiters
        const cells: string[] = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
          const char = row[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === currentDelimiter && !inQuotes) {
            cells.push(currentCell.trim().replace(/^"|"$/g, ""));
            currentCell = '';
          } else {
            currentCell += char;
          }
        }

        // Add the last cell
        cells.push(currentCell.trim().replace(/^"|"$/g, ""));
        return cells;
      });

      // Set preview data (show max 10 rows)
      setPreviewData(parsedRows.slice(0, 10));

      // Automatically set the column count based on the first row
      if (parsedRows.length > 0) {
        setColumnCount(parsedRows[0].length);
      }
    } catch (error) {
      console.error("Error parsing preview data:", error);
      setValidationErrors(prev => [...prev, `Error parsing preview data: ${(error as Error).message}`]);
    }
  };

  // Update delimiter and reparse
  const handleDelimiterChange = (newDelimiter: string) => {
    setDelimiter(newDelimiter);
    if (fileContents) {
      parsePreviewData(fileContents, newDelimiter, hasHeader);
    }
  };

  // Toggle header row and reparse
  const handleHeaderToggle = (checked: boolean) => {
    setHasHeader(checked);
    if (fileContents) {
      parsePreviewData(fileContents, delimiter, checked);
    }
  };

  // Update column mapping
  const handleColumnMappingChange = (field: string, columnIndex: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [field]: columnIndex,
    }));
  };

  // Reset all mappings
  const resetMappings = () => {
    setColumnMappings({});
  };

  // Validate mappings before upload
  const validateMappings = (): boolean => {
    const errors: string[] = [];
    let fields;
    if (tableName === "scheme_status") {
      fields = schemeFields;
    } else if (tableName === "region") {
      fields = regionFields;
    } else if (tableName === "scheme_progress_summary") {
      fields = schemeProgressSummaryFields;
    } else {
      fields = waterConsumptionFields;
    }

    // Check required fields - but skip validation for water consumption if we have predefined mapping
    const requiredFields = fields.filter(field => field.required);
    
    // For water consumption with 30+ columns, we use predefined mapping which should cover all required fields
    const isWaterConsumptionWithPredefinedMapping = 
      tableName === "water_consumption" && 
      columnCount >= 30 && 
      Object.keys(columnMappings).length >= 5; // Should have at least the main required fields mapped
    
    if (!isWaterConsumptionWithPredefinedMapping) {
      const missingRequiredFields = requiredFields.filter(
        field => !columnMappings[field.value] || columnMappings[field.value] === "not_mapped"
      );

      if (missingRequiredFields.length > 0) {
        errors.push(
          `Missing required fields: ${missingRequiredFields.map(f => f.label).join(", ")}`
        );
      }
    }

    // Check for duplicate mappings
    const mappedColumns = Object.values(columnMappings).filter(
      val => val !== "not_mapped" && val !== undefined
    );
    const uniqueMappedColumns = new Set(mappedColumns);

    if (mappedColumns.length !== uniqueMappedColumns.size) {
      errors.push("Multiple fields are mapped to the same column");
    }

    // Update validation errors
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate the form data
    if (!validateMappings()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before uploading",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(columnMappings).length === 0) {
      toast({
        title: "No column mappings",
        description: "Please map at least one column to a database field",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("columnMappings", JSON.stringify(columnMappings));
      formData.append("tableName", tableName);
      formData.append("delimiter", delimiter);
      formData.append("hasHeader", hasHeader.toString());

      if (regionName && regionName !== "no_region") {
        formData.append("regionName", regionName);
      }

      // Determine the correct API endpoint based on table type
      let apiEndpoint;
      if (tableName === "water_consumption") {
        apiEndpoint = "/api/water-consumption/import-csv";
      } else {
        apiEndpoint = "/api/admin/import-csv";
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header, it will be set automatically with correct boundary
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        toast({
          title: "Upload successful",
          description: `${result.updatedCount} records were updated`,
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        setUploadResult({
          message: errorData.message || "Unknown error occurred",
          details: errorData.error || errorData.details || "No additional details available"
        });
        toast({
          title: "Upload failed",
          description: errorData.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("CSV upload error:", error);
      setUploadResult({
        message: "Upload error",
        details: `Failed to upload CSV file: ${(error as Error).message}`
      });
      toast({
        title: "Upload error",
        description: "Failed to upload CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Generate column options for the select dropdown
  const columnOptions = [
    { value: "not_mapped", label: "-- Not Mapped --" },
    ...Array.from({ length: columnCount }, (_, i) => ({
      value: i.toString(),
      label: `Column ${i + 1}${hasHeader && previewData.length > 0 ? ` (${previewData[0][i] || 'empty'})` : ''}`,
    })),
  ];

  // Get the appropriate fields for the selected table
  let fields;
  if (tableName === "scheme_status") {
    fields = schemeFields;
  } else if (tableName === "region") {
    fields = regionFields;
  } else if (tableName === "scheme_progress_summary") {
    fields = schemeProgressSummaryFields;
  } else {
    fields = waterConsumptionFields;
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Enhanced CSV Data Import</CardTitle>
        <CardDescription>
          Import data from CSV files with advanced options for better control and validation.
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="upload">
        <TabsList className="mx-6">
          <TabsTrigger value="upload">Upload & Configure</TabsTrigger>
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="preview">Data Preview</TabsTrigger>
          {uploadResult && <TabsTrigger value="result">Result</TabsTrigger>}
        </TabsList>

        <TabsContent value="upload" className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-4">
                <Label htmlFor="table-select">Select Target Table</Label>
                <Select
                  value={tableName}
                  onValueChange={(value) => {
                    setTableName(value);
                    setColumnMappings({}); // Reset mappings when table changes
                  }}
                >
                  <SelectTrigger id="table-select">
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tableName === "scheme_status" && (
                <div className="grid gap-4">
                  <Label htmlFor="region-select">
                    Select Region (Optional - Only if not in CSV)
                  </Label>
                  <Select
                    value={regionName}
                    onValueChange={setRegionName}
                  >
                    <SelectTrigger id="region-select">
                      <SelectValue placeholder="Select region (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_region">No region (use CSV values)</SelectItem>
                      {regions.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-4">
                <Label htmlFor="file-upload">Select CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="delimiter-select">CSV Delimiter</Label>
                  <Select
                    value={delimiter}
                    onValueChange={handleDelimiterChange}
                  >
                    <SelectTrigger id="delimiter-select">
                      <SelectValue placeholder="Select delimiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">Comma (,)</SelectItem>
                      <SelectItem value=";">Semicolon (;)</SelectItem>
                      <SelectItem value="\t">Tab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="header-checkbox"
                      checked={hasHeader}
                      onCheckedChange={handleHeaderToggle}
                    />
                    <Label htmlFor="header-checkbox">
                      File has header row
                    </Label>
                  </div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Spinner className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  "Upload and Import"
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="mapping" className="p-6">
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Column to Field Mapping</h3>
              <Button
                variant="outline"
                onClick={resetMappings}
                disabled={Object.keys(columnMappings).length === 0}
              >
                Reset All Mappings
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              Map each database field to the corresponding column in your CSV file.
              Required fields are marked with an asterisk (*).
            </p>

            <div className="max-h-96 overflow-y-auto border rounded-md p-4">
              <div className="grid gap-4">
                {fields.map((field) => (
                  <div
                    key={field.value}
                    className="grid grid-cols-2 gap-4 items-center pb-2 border-b"
                  >
                    <Label htmlFor={`field-${field.value}`} className="flex items-center">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Select
                      value={columnMappings[field.value] || "not_mapped"}
                      onValueChange={(value) =>
                        handleColumnMappingChange(field.value, value)
                      }
                    >
                      <SelectTrigger id={`field-${field.value}`}>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="p-6">
          <div className="grid gap-6">
            <h3 className="text-lg font-medium">Data Preview</h3>

            {previewData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewData[0].map((_, colIndex) => (
                        <TableHead key={colIndex}>
                          {hasHeader ? previewData[0][colIndex] : `Column ${colIndex + 1}`}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(hasHeader ? 1 : 0).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {cell || <span className="text-gray-400">(empty)</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {file ? "Parsing CSV data..." : "No file selected"}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium mb-2">CSV Import Tips</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Use UTF-8 encoding for your CSV files</li>
                <li>Ensure your column names match the expected fields</li>
                <li>For scheme status, "region" must match one of the 6 valid regions</li>
                <li>Use consistent format for status fields (e.g., "Fully Completed")</li>
                <li>Keep numeric fields as numbers without text or special characters</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {uploadResult && (
          <TabsContent value="result" className="p-6">
            <div className="grid gap-6">
              <Alert
                variant={
                  uploadResult.message.toLowerCase().includes("success")
                    ? "default"
                    : "destructive"
                }
              >
                <AlertTitle>{uploadResult.message}</AlertTitle>
                {uploadResult.updatedCount !== undefined && (
                  <AlertDescription>
                    Successfully processed {uploadResult.updatedCount} records.
                  </AlertDescription>
                )}
              </Alert>

              {uploadResult.details && (
                <div className="border rounded-md p-4">
                  <h4 className="font-medium mb-2">Details</h4>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-x-auto">
                    {uploadResult.details}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Spinner className="mr-2" />
              Uploading...
            </>
          ) : (
            "Upload and Import"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}