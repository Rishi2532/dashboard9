import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { validateExcelFile } from "@/lib/excel-validator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

// Define the database fields for column mapping
const schemeFields = [
  { value: "scheme_id", label: "Scheme ID" },
  { value: "scheme_name", label: "Scheme Name" },
  { value: "region", label: "Region Name" },
  { value: "sr_no", label: "Serial Number" },
  { value: "circle", label: "Circle" },
  { value: "division", label: "Division" },
  { value: "sub_division", label: "Sub Division" },
  { value: "block", label: "Block" },
  { value: "agency", label: "Agency" },
  { value: "number_of_village", label: "Total Villages" },
  { value: "total_villages_integrated", label: "Villages Integrated" },
  { value: "no_of_functional_village", label: "Functional Villages" },
  { value: "no_of_partial_village", label: "Partial Villages" },
  { value: "no_of_non_functional_village", label: "Non-Functional Villages" },
  { value: "fully_completed_villages", label: "Fully Completed Villages" },
  { value: "total_number_of_esr", label: "Total ESR" },
  { value: "scheme_functional_status", label: "Scheme Functional Status" },
  { value: "total_esr_integrated", label: "ESR Integrated on IoT" },
  { value: "no_fully_completed_esr", label: "Fully Completed ESR" },
  { value: "balance_to_complete_esr", label: "Balance ESR" },
  { value: "flow_meters_connected", label: "Flow Meters Connected" },
  { value: "pressure_transmitter_connected", label: "Pressure Transmitters" },
  {
    value: "residual_chlorine_analyzer_connected",
    label: "Residual Chlorine Analyzers",
  },
  { value: "fully_completion_scheme_status", label: "Scheme Status" },
  { value: "mjp_commissioned", label: "MJP Commissioned" },
  { value: "mjp_fully_completed", label: "MJP Fully Completed" },
  { value: "water_supply", label: "Water Supply" },
  { value: "agency_type", label: "Agency Type (MJP/ZP)" },
  { value: "water_supply_status", label: "Water Supply Status" },
];

// Regions for the dropdown with agency mapping
const regions = [
  { value: "all_regions", label: "All Regions (CSV contains region column)" },
  { value: "no_region", label: "Not Applicable / Unknown" },
  { value: "Nagpur", label: "Nagpur - M/s Rite" },
  { value: "Pune", label: "Pune - M/s Indo/Chetas" },
  { value: "Konkan", label: "Konkan - M/s Indo/Chetas" },
  { value: "Amravati", label: "Amravati - M/s Ceinsys" },
  { value: "Nashik", label: "Nashik - M/s Ceinsys" },
  {
    value: "Chhatrapati Sambhajinagar",
    label: "Chhatrapati Sambhajinagar - M/s Rite Water",
  },
];

// Agency mapping by region
const agencyMapping: Record<string, string> = {
  Amravati: "M/s Ceinsys",
  Nashik: "M/s Ceinsys",
  Nagpur: "M/s Rite Water",
  "Chhatrapati Sambhajinagar": "M/s Rite Water",
  Konkan: "M/s Indo/Chetas",
  Pune: "M/s Indo/Chetas",
};

export default function SchemeImporter() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("excel");

  // Excel import state
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [importDetails, setImportDetails] = useState<any>(null);

  // Fixed column mappings for scheme CSV based on user specifications
  const fixedSchemeMappings: Record<string, number> = {
    sr_no: 0, // Column 1
    region: 1, // Column 2
    circle: 2, // Column 3
    division: 3, // Column 4
    sub_division: 4, // Column 5
    block: 5, // Column 6
    scheme_id: 6, // Column 7
    scheme_name: 7, // Column 8
    number_of_village: 8, // Column 9
    total_villages_integrated: 9, // Column 10
    no_of_functional_village: 10, // Column 11
    no_of_partial_village: 11, // Column 12
    no_of_non_functional_village: 12, // Column 13
    fully_completed_villages: 13, // Column 14
    total_number_of_esr: 14, // Column 15
    scheme_functional_status: 15, // Column 16
    total_esr_integrated: 16, // Column 17
    no_fully_completed_esr: 17, // Column 18
    balance_to_complete_esr: 18, // Column 19
    flow_meters_connected: 19, // Column 20
    pressure_transmitter_connected: 20, // Column 21
    residual_chlorine_analyzer_connected: 21, // Column 22
    fully_completion_scheme_status: 22, // Column 23
    mjp_commissioned: 23, // Column 24
    mjp_fully_completed: 24, // Column 25
    water_supply: 25, // Column 26
    agency_type: 26, // Column 27
    water_supply_status: 27, // Column 28
  };

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [columnCount, setColumnCount] = useState(28); // Fixed to 28 columns (including water_supply_status)
  const [columnMappings] =
    useState<Record<string, number | string>>(fixedSchemeMappings); // Fixed mappings
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    details?: string;
  } | null>(null);
  const [regionName, setRegionName] = useState("all_regions"); // Default to all regions option

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("excelFile", file);

      const response = await fetch("/api/admin/import-excel", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to import scheme data");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setUploadError(null);
      setUploadSuccess(true);
      setImportDetails(data);
      toast({
        title: "Import Successful",
        description: `${data.updatedCount || 0} schemes updated successfully`,
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      setUploadSuccess(false);
      setImportDetails(null);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
      setUploadSuccess(false);
      setImportDetails(null);
    }
  };

  const [validating, setValidating] = useState(false);
  const [validationDetails, setValidationDetails] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload",
        variant: "destructive",
      });
      return;
    }

    // Check file extension
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (fileExt !== "xlsx" && fileExt !== "xls") {
      toast({
        title: "Invalid file type",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    // Validate Excel structure before uploading
    try {
      setValidating(true);
      setValidationDetails(null);

      // Read the file as ArrayBuffer
      const fileBuffer = await file.arrayBuffer();

      // Validate the Excel file structure
      const validationResult = await validateExcelFile(fileBuffer);
      setValidationDetails(validationResult);

      if (!validationResult.isValid) {
        setUploadError(validationResult.message);
        toast({
          title: "Invalid Excel File",
          description: validationResult.message,
          variant: "destructive",
        });
        setValidating(false);
        return;
      }

      // Continue with upload if validation passes
      setValidating(false);
      await importMutation.mutate(file);
    } catch (error) {
      setValidating(false);
      setUploadError(
        `Error validating Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      toast({
        title: "Validation Error",
        description: `Could not validate Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // Handle CSV file selection
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setCsvFile(selectedFile);

    if (selectedFile) {
      // Preview the file
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;

        // Simple CSV parsing for preview
        const rows = content
          .split("\n")
          .slice(0, 5)
          .map((row) =>
            row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
          );

        setPreviewData(rows);

        // Automatically set the column count based on the first row
        if (rows[0]) {
          setColumnCount(rows[0].length);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      setPreviewData([]);
    }
  };

  // Column mappings are fixed, this function is no longer needed
  // but kept as a no-op for future reference
  const handleColumnMappingChange = (field: string, columnIndex: number) => {
    // No-op as we're using fixed column mappings
    console.log(`Column mapping change disabled: ${field} -> ${columnIndex}`);
  };

  // Handle CSV form submission
  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csvFile) {
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
      formData.append("file", csvFile);
      formData.append("columnMappings", JSON.stringify(columnMappings));
      formData.append("tableName", "scheme_status");

      if (regionName) {
        formData.append("regionName", regionName);
      }

      const response = await fetch("/api/admin/import-csv", {
        method: "POST",
        body: formData,
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
        toast({
          title: "Upload failed",
          description: errorData.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("CSV upload error:", error);
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
  const columnOptions = Array.from({ length: columnCount }, (_, i) => ({
    value: i.toString(),
    label: `Column ${i + 1}`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Import Scheme Data
        </CardTitle>
        <CardDescription>
          Upload Excel or CSV files to update scheme status data in the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="excel" className="flex items-center">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel (with headers)
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              CSV (no headers)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-800">
                Excel Format Requirements
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                <p className="mb-2">
                  The Excel file should match the standard template with these
                  columns:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>
                    Basic information:
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        <strong>Sr No.</strong> - Serial number
                      </li>
                      <li>
                        <strong>Scheme ID</strong> - Required for identifying
                        schemes
                      </li>
                      <li>
                        <strong>Scheme Name</strong> - Name of the water scheme
                      </li>
                    </ul>
                  </li>
                  <li>
                    Location hierarchy:
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        <strong>Region</strong> - Main region (Amravati, Nashik,
                        Nagpur, Pune, etc.)
                      </li>
                      <li>
                        <strong>Circle</strong> - Administrative circle
                      </li>
                      <li>
                        <strong>Division</strong> - Administrative division
                      </li>
                      <li>
                        <strong>Sub Division</strong> - Administrative
                        sub-division
                      </li>
                      <li>
                        <strong>Block</strong> - Administrative block
                      </li>
                    </ul>
                  </li>
                  <li>
                    Village statistics:
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        <strong>Number of Village</strong> - Total villages in
                        scheme
                      </li>
                      <li>
                        <strong>Total Villages Integrated</strong> - Villages
                        integrated with IoT
                      </li>
                      <li>
                        <strong>No. of Functional Village</strong> - Count of
                        functional villages
                      </li>
                      <li>
                        <strong>No. of Partial Village</strong> - Count of
                        partially functional villages
                      </li>
                      <li>
                        <strong>No. of Non- Functional Village</strong> - Count
                        of non-functional villages
                      </li>
                      <li>
                        <strong>Fully Completed Villages</strong> - Villages
                        with full completion
                      </li>
                    </ul>
                  </li>
                  <li>
                    ESR statistics:
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        <strong>Total Number of ESR</strong> - Total ESRs in
                        scheme
                      </li>
                      <li>
                        <strong>Total ESR Integrated</strong> - ESRs integrated
                        with IoT
                      </li>
                      <li>
                        <strong>No. Fully Completed ESR</strong> - ESRs with
                        full completion
                      </li>
                      <li>
                        <strong>Balance to Complete ESR</strong> - Remaining
                        ESRs to complete
                      </li>
                    </ul>
                  </li>
                  <li>
                    Component statistics:
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        <strong>Flow Meters Connected</strong> - Count of flow
                        meters
                      </li>
                      <li>
                        <strong>Pressure Transmitter Connected</strong> - Count
                        of pressure transmitters
                      </li>
                      <li>
                        <strong>Residual Chlorine Analyzer Connected</strong> -
                        Count of RCAs
                      </li>
                    </ul>
                  </li>
                  <li>
                    Status information:
                    <ul className="list-disc pl-5 mt-1">
                      <li>
                        <strong>Scheme Functional Status</strong> - Functional
                        state (Functional, Partial, Non-Functional)
                      </li>
                      <li>
                        <strong>Fully completion Scheme Status</strong> -
                        Overall status (values will be automatically adjusted:
                        "Partial" → "In Progress")
                      </li>
                    </ul>
                  </li>
                </ul>
                <p className="mt-2 text-xs italic">
                  Note: You can have one sheet with all regions or separate
                  sheets with region names (Amravati, Nashik, Nagpur, Pune,
                  Konkan, CS, etc.)
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  id="excel-file"
                  onChange={handleFileChange}
                  disabled={importMutation.isPending}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500">
                  Select the updated Excel file with scheme data
                </p>
              </div>

              {file && (
                <div className="flex items-center px-3 py-1 text-sm rounded-md bg-green-50 text-green-700 border border-green-200 max-w-sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                  <span className="truncate">{file.name}</span>
                  <span className="ml-2 text-xs text-green-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || importMutation.isPending || validating}
                className="w-full sm:w-auto"
              >
                {importMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </>
                ) : validating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating Excel...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload and Process Excel
                  </>
                )}
              </Button>

              {validationDetails &&
                validationDetails.isValid &&
                !uploadSuccess &&
                !uploadError && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-800">
                      Excel File Validated
                    </AlertTitle>
                    <AlertDescription className="text-green-700 text-sm">
                      {validationDetails.message}
                    </AlertDescription>
                  </Alert>
                )}

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Upload Failed</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {uploadSuccess && importDetails && (
                <Alert
                  variant="default"
                  className="bg-green-50 border-green-200 text-green-800"
                >
                  <div className="flex-col space-y-2">
                    <div className="flex items-center">
                      <svg
                        className="h-5 w-5 mr-2 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      <AlertTitle className="text-green-800">
                        Import Successful
                      </AlertTitle>
                    </div>
                    <AlertDescription>
                      <p>{importDetails.message}</p>
                      <Accordion type="single" collapsible className="mt-2">
                        <AccordionItem value="details">
                          <AccordionTrigger className="text-sm font-medium text-green-700">
                            View Details
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="text-sm">
                              <p>
                                <span className="font-medium">
                                  Total Updated:
                                </span>{" "}
                                {importDetails.updatedCount} schemes
                              </p>
                              {importDetails.schemasProcessed &&
                                importDetails.schemasProcessed.length > 0 && (
                                  <div className="mt-2">
                                    <p className="font-medium">
                                      Processed Scheme IDs:
                                    </p>
                                    <div className="max-h-24 overflow-y-auto mt-1 p-2 bg-white/50 rounded border border-green-100 text-xs">
                                      {importDetails.schemasProcessed
                                        .slice(0, 20)
                                        .map((id: string, index: number) => (
                                          <span
                                            key={index}
                                            className="inline-block px-1.5 py-0.5 mr-1 mb-1 rounded bg-green-100 text-green-800"
                                          >
                                            {id}
                                          </span>
                                        ))}
                                      {importDetails.schemasProcessed.length >
                                        20 && (
                                        <span className="text-green-600 italic">
                                          ...and{" "}
                                          {importDetails.schemasProcessed
                                            .length - 20}{" "}
                                          more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="csv">
            <Alert className="bg-blue-50 border-blue-200 mb-4">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-800">
                CSV Import Information
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                <p className="mb-2">
                  Upload CSV files without headers by mapping columns to
                  database fields:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>
                    CSV data should be properly formatted with consistent
                    delimiters
                  </li>
                  <li>
                    Map each column from your CSV to the corresponding database
                    field
                  </li>
                  <li>
                    <strong>Region Name</strong> is required but can be set as a
                    default if all schemes belong to the same region
                  </li>
                  <li>
                    Numeric fields should contain only numbers (commas will be
                    automatically removed)
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="upload" className="space-y-4">
              <TabsList>
                <TabsTrigger value="upload">Upload & Map</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                {uploadResult && (
                  <TabsTrigger value="result">Result</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="upload">
                <form onSubmit={handleCsvSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="region-select">
                      Default Region (Optional)
                    </Label>
                    <Select value={regionName} onValueChange={setRegionName}>
                      <SelectTrigger id="region-select">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_region">
                          No default region
                        </SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      If set, this region will be used for records that don't
                      have a region specified in the CSV.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload CSV File</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file without headers to import data.
                    </p>
                  </div>

                  {csvFile && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="column-count">Number of Columns</Label>
                        <Input
                          id="column-count"
                          type="number"
                          min={1}
                          max={30}
                          value={columnCount}
                          onChange={(e) =>
                            setColumnCount(parseInt(e.target.value) || 1)
                          }
                        />
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Column Mapping</h3>
                        <p className="text-sm text-muted-foreground">
                          Map each database field to a specific column in your
                          CSV file.
                        </p>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
                          <h3 className="font-medium text-blue-800 mb-2">
                            Predefined Column Mapping
                          </h3>
                          <p className="text-sm text-blue-700 mb-3">
                            The following fixed mapping will be used for
                            importing scheme data:
                          </p>

                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 max-h-[400px] overflow-y-auto pr-2">
                            {schemeFields.map((field) => (
                              <div
                                key={field.value}
                                className="flex justify-between items-center"
                              >
                                <span className="text-xs font-medium">
                                  {field.label}
                                </span>
                                <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                                  Column{" "}
                                  {(columnMappings[field.value] as number) + 1}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 pt-4 border-t border-blue-200">
                            <h4 className="font-medium text-blue-800 mb-2">
                              Agency Assignment
                            </h4>
                            <p className="text-xs text-blue-700 mb-2">
                              For your reference, agencies will be automatically
                              assigned based on region:
                            </p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                              {Object.entries(agencyMapping).map(
                                ([region, agency]) => (
                                  <div
                                    key={region}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="font-medium">
                                      {region}
                                    </span>
                                    <span className="bg-blue-100 px-2 py-1 rounded">
                                      {agency}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          type="submit"
                          disabled={!csvFile || isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Spinner className="mr-2" /> Importing Data...
                            </>
                          ) : (
                            "Import Data"
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="preview">
                {previewData.length > 0 ? (
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {Array.from(
                            {
                              length: Math.max(
                                ...previewData.map((row) => row.length),
                              ),
                            },
                            (_, i) => (
                              <th
                                key={i}
                                className="px-4 py-2 bg-muted text-left text-xs font-medium text-muted-foreground"
                              >
                                Column {i + 1}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className={
                              rowIndex % 2 === 0 ? "bg-white" : "bg-muted/50"
                            }
                          >
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="border px-4 py-2 text-sm"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-muted-foreground">
                      Upload a file to preview its contents
                    </p>
                  </div>
                )}
              </TabsContent>

              {uploadResult && (
                <TabsContent value="result">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h3 className="font-medium text-green-800">
                        {uploadResult.message}
                      </h3>
                    </div>

                    {uploadResult.details && (
                      <div className="p-4 bg-muted rounded-md">
                        <h4 className="font-medium mb-2">Import Details</h4>
                        <pre className="text-xs overflow-auto p-2 bg-muted/50 rounded h-[200px]">
                          {uploadResult.details}
                        </pre>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-gray-50 text-xs text-gray-500 rounded-b-lg py-3">
        Existing schemes will be updated with new values from the file. Scheme
        status values will be automatically updated (Partial → In Progress).
      </CardFooter>
    </Card>
  );
}
