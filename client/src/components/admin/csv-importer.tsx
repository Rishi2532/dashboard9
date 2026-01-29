import React, { useState } from "react";
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

// Define the database fields for column mapping
const schemeFields = [
  { value: "scheme_id", label: "Scheme ID" },
  { value: "scheme_name", label: "Scheme Name" },
  { value: "region", label: "Region" },
  { value: "sr_no", label: "Serial Number" },
  { value: "circle", label: "Circle" },
  { value: "division", label: "Division" },
  { value: "sub_division", label: "Sub Division" },
  { value: "block", label: "Block" },
  { value: "agency", label: "Agency" },
  { value: "number_of_village", label: "Number of Village" },
  { value: "total_villages_integrated", label: "Total Villages Integrated" },
  { value: "no_of_functional_village", label: "No. of Functional Village" },
  { value: "no_of_partial_village", label: "No. of Partial Village" },
  {
    value: "no_of_non_functional_village",
    label: "No. of Non- Functional Village",
  },
  { value: "fully_completed_villages", label: "Fully Completed Villages" },
  { value: "total_number_of_esr", label: "Total Number of ESR" },
  { value: "scheme_functional_status", label: "Scheme Functional Status" },
  { value: "total_esr_integrated", label: "Total ESR Integrated" },
  { value: "no_fully_completed_esr", label: "No. Fully Completed ESR" },
  { value: "balance_to_complete_esr", label: "Balance to Complete ESR" },
  { value: "flow_meters_connected", label: "Flow Meters Connected" },
  {
    value: "pressure_transmitter_connected",
    label: "Pressure Transmitter Connected",
  },
  {
    value: "residual_chlorine_analyzer_connected",
    label: "Residual Chlorine Analyzer Connected",
  },
  {
    value: "fully_completion_scheme_status",
    label: "Fully completion Scheme Status",
  },
];

const regionFields = [
  { value: "region_name", label: "Region Name" },
  { value: "total_esr_integrated", label: "Total ESR Integrated" },
  { value: "fully_completed_esr", label: "Fully Completed ESR" },
  { value: "partial_esr", label: "Partial ESR" },
  { value: "total_villages_integrated", label: "Total Villages Integrated" },
  { value: "fully_completed_villages", label: "Fully Completed Villages" },
  { value: "total_schemes_integrated", label: "Total Schemes Integrated" },
  { value: "fully_completed_schemes", label: "Fully Completed Schemes" },
  { value: "flow_meter_integrated", label: "Flow Meters Integrated" },
  { value: "rca_integrated", label: "RCA Integrated" },
  { value: "pressure_transmitter_integrated", label: "Pressure Transmitters" },
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

export default function CsvImporter() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [columnCount, setColumnCount] = useState(5);
  const [columnMappings, setColumnMappings] = useState<Record<string, number>>(
    {},
  );
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [tableName, setTableName] = useState("fully_completion_scheme_status");
  const [regionName, setRegionName] = useState("");
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    details?: string;
  } | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

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

  // Update column mapping
  const handleColumnMappingChange = (field: string, columnIndex: number) => {
    setColumnMappings((prev) => ({
      ...prev,
      [field]: columnIndex,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      if (regionName) {
        formData.append("regionName", regionName);
      }

      const response = await fetch("/api/admin/import-csv", {
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

  // Get the appropriate fields for the selected table
  const fields =
    tableName === "fully_completion_scheme_status"
      ? schemeFields
      : regionFields;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>CSV Data Import</CardTitle>
        <CardDescription>
          Import data from CSV files without headers by mapping columns to
          database fields.
        </CardDescription>
      </CardHeader>

      <Tabs defaultValue="upload">
        <TabsList className="mx-6">
          <TabsTrigger value="upload">Upload & Map</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          {uploadResult && <TabsTrigger value="result">Result</TabsTrigger>}
        </TabsList>

        <CardContent>
          <TabsContent value="upload">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="table-select">Select Table</Label>
                <Select value={tableName} onValueChange={setTableName}>
                  <SelectTrigger id="table-select">
                    <SelectValue placeholder="Select target table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_completion_scheme_status">
                      Scheme Status
                    </SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tableName === "fully_completion_scheme_status" && (
                <div className="space-y-2">
                  <Label htmlFor="region-select">
                    Default Region (Optional)
                  </Label>
                  <Select value={regionName} onValueChange={setRegionName}>
                    <SelectTrigger id="region-select">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No default region</SelectItem>
                      {regions.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    If set, this region will be used for records that don't have
                    a region specified.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                />
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file without headers to import data.
                </p>
              </div>

              {file && (
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
                      Map each database field to a specific column in your CSV
                      file.
                    </p>

                    <div className="grid gap-4">
                      {fields.map((field) => (
                        <div
                          key={field.value}
                          className="grid grid-cols-2 gap-4 items-center"
                        >
                          <span className="text-sm font-medium">
                            {field.label}
                          </span>
                          <Select
                            value={columnMappings[field.value]?.toString()}
                            onValueChange={(value) =>
                              handleColumnMappingChange(
                                field.value,
                                parseInt(value),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Not mapped</SelectItem>
                              {columnOptions.map((col) => (
                                <SelectItem key={col.value} value={col.value}>
                                  {col.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={!file || isUploading}>
                  {isUploading ? (
                    <>
                      <Spinner className="mr-2" /> Importing Data...
                    </>
                  ) : (
                    "Import Data"
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="preview">
            {previewData.length > 0 ? (
              <div className="overflow-x-auto">
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
        </CardContent>
      </Tabs>
    </Card>
  );
}
