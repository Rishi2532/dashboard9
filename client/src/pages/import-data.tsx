import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedCsvImporter from "@/components/admin/enhanced-csv-importer";
import CsvImporter from "@/components/admin/csv-importer";

export default function ImportDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("excel");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

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

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("excelFile", file);

      const response = await fetch("/api/admin/import-excel", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Data imported successfully",
        });
        toast({
          title: "Upload successful",
          description: "Excel data has been imported",
        });
      } else {
        setResult({
          success: false,
          message: data.message || "Failed to import data",
        });
        toast({
          title: "Upload failed",
          description: data.message || "Failed to import data",
          variant: "destructive",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "An error occurred during upload",
      });
      toast({
        title: "Upload error",
        description: "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Import Data</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="excel" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Excel Import
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="excel" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Upload Excel File</CardTitle>
              <CardDescription>
                Upload an Excel file to update scheme status data. The file should contain sheets for each region.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload an Excel file with sheets for each region: Amravati, Chhatrapati Sambhajinagar (CS), Konkan, Nagpur, Nashik, and Pune.
                  </p>
                </div>

                {result && (
                  <Alert variant={result.success ? "default" : "destructive"}>
                    <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="w-full sm:w-auto"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload and Import Data"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="csv" className="mt-0">
          <div className="flex flex-col space-y-4">
            <EnhancedCsvImporter />
            
            <div className="text-center p-4 bg-gray-50 rounded-lg mt-6">
              <h3 className="text-sm font-medium">Need help with CSV imports?</h3>
              <p className="text-xs text-gray-500 mt-1">
                The CSV importer supports various delimiters (comma, semicolon, tab) and can handle files with or without headers.
                Map your columns to database fields for precise control over data import.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}