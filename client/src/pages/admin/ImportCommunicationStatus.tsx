import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ImportCommunicationStatus() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("/api/communication-status/import", {
        method: "POST",
        body: formData,
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.imported} communication status records`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communication-status"] });
      setFile(null);
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import communication status data",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    importMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Import Communication Status Data</h1>
        <p className="text-muted-foreground">Upload CSV file with communication infrastructure data</p>
      </div>

      <div className="grid gap-6">
        {/* File Format Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              CSV File Format Requirements
            </CardTitle>
            <CardDescription>
              Your CSV file must have exactly 22 columns in this order (no headers):
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Columns 1-11:</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>1. Region</li>
                  <li>2. Circle</li>
                  <li>3. Division</li>
                  <li>4. Sub Division</li>
                  <li>5. Block</li>
                  <li>6. Scheme ID</li>
                  <li>7. Scheme Name</li>
                  <li>8. Village Name</li>
                  <li>9. ESR Name</li>
                  <li>10. Chlorine Connected (Yes/No)</li>
                  <li>11. Pressure Connected (Yes/No)</li>
                </ul>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Columns 12-22:</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li>12. Flow Meter Connected (Yes/No)</li>
                  <li>13. Chlorine Status (Online/Offline)</li>
                  <li>14. Pressure Status (Online/Offline)</li>
                  <li>15. Flow Meter Status (Online/Offline)</li>
                  <li>16. Overall Status</li>
                  <li>17. Chlorine 0h-72h</li>
                  <li>18. Chlorine &gt;72h</li>
                  <li>19. Pressure 0h-72h</li>
                  <li>20. Pressure &gt;72h</li>
                  <li>21. Flow Meter 0h-72h</li>
                  <li>22. Flow Meter &gt;72h</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file containing communication status data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            {file && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  File selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleImport}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Communication Status Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-orange-700">
            <ul className="space-y-2">
              <li>• The CSV file should not contain headers</li>
              <li>• All existing communication status data will be replaced</li>
              <li>• Ensure all 22 columns are present in the correct order</li>
              <li>• The import process may take a few minutes for large files</li>
              <li>• You will receive a confirmation message upon successful import</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}