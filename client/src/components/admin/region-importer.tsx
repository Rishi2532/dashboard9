import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info, FileSpreadsheet, FileText } from 'lucide-react';
import FileUpload from './file-upload';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';

// Define the database fields for column mapping
const regionFields = [
  { value: 'region_name', label: 'Region Name' },
  { value: 'total_esr_integrated', label: 'Total ESR Integrated' },
  { value: 'fully_completed_esr', label: 'Fully Completed ESR' },
  { value: 'partial_esr', label: 'Partial ESR' },
  { value: 'total_villages_integrated', label: 'Total Villages Integrated' },
  { value: 'fully_completed_villages', label: 'Fully Completed Villages' },
  { value: 'total_schemes_integrated', label: 'Total Schemes Integrated' },
  { value: 'fully_completed_schemes', label: 'Fully Completed Schemes' },
  { value: 'flow_meter_integrated', label: 'Flow Meters Integrated' },
  { value: 'rca_integrated', label: 'RCA Integrated' },
  { value: 'pressure_transmitter_integrated', label: 'Pressure Transmitters' }
];

export default function RegionImporter() {
  const { toast } = useToast();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('excel');

  // Fixed column mappings for region CSV based on user specifications
  const fixedRegionMappings: Record<string, number> = {
    'region_name': 0,                     // Column 1
    'total_esr_integrated': 1,            // Column 2
    'fully_completed_esr': 2,             // Column 3
    'partial_esr': 3,                     // Column 4
    'total_villages_integrated': 4,       // Column 5
    'fully_completed_villages': 5,        // Column 6
    'total_schemes_integrated': 6,        // Column 7
    'fully_completed_schemes': 7,         // Column 8
    'flow_meter_integrated': 8,           // Column 9
    'rca_integrated': 9,                  // Column 10
    'pressure_transmitter_integrated': 10  // Column 11
  };

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [columnCount, setColumnCount] = useState(11); // Fixed to 11 columns for region
  const [columnMappings] = useState<Record<string, number>>(fixedRegionMappings); // Fixed mappings
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [uploadResult, setUploadResult] = useState<{ message: string; details?: string } | null>(null);

  const excelImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import/regions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import region data');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setUploadError(null);
      setUploadSuccess(true);
      toast({
        title: 'Import Successful',
        description: `${data.updatedCount || 0} regions updated successfully`,
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      setUploadSuccess(false);
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleExcelUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);
    await excelImportMutation.mutate(file);
  };

  // Handle CSV file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setCsvFile(selectedFile);

    if (selectedFile) {
      // Preview the file
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;

        // Simple CSV parsing for preview
        const rows = content.split('\n').slice(0, 5).map(row => 
          row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
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
        variant: "destructive"
      });
      return;
    }

    if (Object.keys(columnMappings).length === 0) {
      toast({
        title: "No column mappings",
        description: "Please map at least one column to a database field",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('columnMappings', JSON.stringify(columnMappings));
      formData.append('tableName', 'region');

      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, it will be set automatically with correct boundary
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        toast({
          title: "Upload successful",
          description: `${result.updatedCount} records were updated`,
          variant: "default"
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Upload failed",
          description: errorData.message || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("CSV upload error:", error);
      toast({
        title: "Upload error",
        description: "Failed to upload CSV file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Generate column options for the select dropdown
  const columnOptions = Array.from({ length: columnCount }, (_, i) => ({
    value: i.toString(),
    label: `Column ${i + 1}`
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Region Data</CardTitle>
        <CardDescription>
          Upload Excel or CSV files to update region data in the database
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
              <AlertTitle className="text-blue-800">Excel Format Requirements</AlertTitle>
              <AlertDescription className="text-blue-700">
                <p className="mb-2">Please ensure your Excel file follows the required format:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>The file must contain columns for region details</li>
                  <li><strong>Region Name</strong> should be one of: Amravati, Nashik, Nagpur, Pune, Konkan, or Chhatrapati Sambhajinagar</li>
                  <li>Include <strong>Fully Completed Villages</strong> column</li>
                  <li>Include columns for <strong>Flow Meter Integrated</strong>, <strong>RCA Integrated</strong> (Residual Chlorine Analyzer), and <strong>Pressure Transmitter Integrated</strong></li>
                  <li>Columns must include: Total ESR Integrated, Fully Completed ESR, Partial ESR, etc.</li>
                  <li>Data must begin from row 2 (row 1 is assumed to be headers)</li>
                  <li>Each region should have a unique name for proper updating</li>
                </ul>
              </AlertDescription>
            </Alert>

            <FileUpload
              onFileUpload={handleExcelUpload}
              uploading={excelImportMutation.isPending}
              error={uploadError}
              success={uploadSuccess}
              buttonText="Select Excel File"
              acceptTypes=".xlsx,.xls"
            />
          </TabsContent>

          <TabsContent value="csv">
            <Alert className="bg-blue-50 border-blue-200 mb-4">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-800">CSV Import Information</AlertTitle>
              <AlertDescription className="text-blue-700">
                <p className="mb-2">Upload CSV files without headers by mapping columns to database fields:</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>CSV data should be properly formatted with consistent delimiters</li>
                  <li>Map each column from your CSV to the corresponding database field</li>
                  <li><strong>Region Name</strong> is required and should be properly mapped</li>
                  <li>Numeric fields should contain only numbers (commas will be automatically removed)</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="upload" className="space-y-4">
              <TabsList>
                <TabsTrigger value="upload">Upload & Map</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                {uploadResult && <TabsTrigger value="result">Result</TabsTrigger>}
              </TabsList>

              <TabsContent value="upload">
                <form onSubmit={handleCsvSubmit} className="space-y-6">
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
                          onChange={(e) => setColumnCount(parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Column Mapping</h3>
                        <p className="text-sm text-muted-foreground">
                          Map each database field to a specific column in your CSV file.
                        </p>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
                          <h3 className="font-medium text-blue-800 mb-2">Predefined Column Mapping</h3>
                          <p className="text-sm text-blue-700 mb-3">
                            The following fixed mapping will be used for importing region data:
                          </p>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            {regionFields.map((field) => (
                              <div key={field.value} className="flex justify-between items-center">
                                <span className="text-xs font-medium">{field.label}</span>
                                <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                                  Column {(columnMappings[field.value] as number) + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button type="submit" disabled={!csvFile || isUploading}>
                          {isUploading ? <><Spinner className="mr-2" /> Importing Data...</> : 'Import Data'}
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
                          {Array.from({ length: Math.max(...previewData.map(row => row.length)) }, (_, i) => (
                            <th key={i} className="px-4 py-2 bg-muted text-left text-xs font-medium text-muted-foreground">
                              Column {i + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-muted/50"}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="border px-4 py-2 text-sm">
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
                    <p className="text-muted-foreground">Upload a file to preview its contents</p>
                  </div>
                )}
              </TabsContent>

              {uploadResult && (
                <TabsContent value="result">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h3 className="font-medium text-green-800">{uploadResult.message}</h3>
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
        Data will be processed and the database will be updated automatically.
      </CardFooter>
    </Card>
  );
}