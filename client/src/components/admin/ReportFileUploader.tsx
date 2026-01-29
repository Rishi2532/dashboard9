import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ReportFileUploader() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const reportTypes = [
    { id: "esr_level", name: "ESR Level Datalink Report" },
    { id: "water_consumption", name: "Water Consumption Datalink Report" },
    { id: "lpcd_village", name: "LPCD Village Level Datalink Report" },
    { id: "chlorine", name: "Chlorine Datalink Report" },
    { id: "pressure", name: "Pressure Datalink Report" },
    { id: "village_level", name: "Village Level Datalink Report" },
    { id: "scheme_level", name: "Scheme Level Datalink Report" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      // Check if it's an Excel file
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExt !== 'xlsx' && fileExt !== 'xls') {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!reportType) {
      toast({
        title: "No report type selected",
        description: "Please select a report type",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("report_type", reportType);

      const response = await apiRequest("/api/reports/upload", {
        method: "POST",
        body: formData,
        // Don't set Content-Type, it will be set automatically with boundary
      });

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully.`,
        variant: "default",
      });

      // Reset form
      setFile(null);
      setReportType("");
      
      // Reset file input by clearing its value
      const fileInput = document.getElementById("report-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Invalidate reports query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Upload Report File</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select 
              value={reportType} 
              onValueChange={setReportType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="report-file">Excel File</Label>
            <div className="flex items-center gap-2">
              <input
                id="report-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".xlsx,.xls"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("report-file")?.click()}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet size={16} />
                Choose File
              </Button>
              <span className="text-sm text-gray-500">
                {file ? file.name : "No file selected"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Only Excel files (.xlsx, .xls) are accepted. Maximum file size: 15MB.
            </p>
          </div>

          {!file && !isUploading && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-md">
              <AlertTriangle size={16} />
              <span className="text-sm">Please select an Excel file to upload</span>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!file || !reportType || isUploading}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload size={16} />
                Upload Report
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}