import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUp, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  updated: number;
  errors: string[];
}

export default function VillageImporter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/villages/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      if (data.success) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${data.imported} villages and updated ${data.updated} existing records.`,
        });
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/villages'] });
      } else {
        toast({
          title: "Import Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
      setImportResult({
        success: false,
        message: error.message || "An error occurred during import",
        imported: 0,
        updated: 0,
        errors: [error.message || "Unknown error"],
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate(selectedFile);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileUp className="h-5 w-5 mr-2" />
          Import Village Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="village-file">Select CSV File</Label>
            <Input
              id="village-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
              data-testid="input-village-file"
            />
          </div>
          
          {selectedFile && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <Button 
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
            className="w-full"
            data-testid="button-import-village"
          >
            {importMutation.isPending ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Villages
              </>
            )}
          </Button>
        </div>

        {/* CSV Format Information */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>CSV Format Requirements:</strong>
            <br />
            • CSV file should NOT have headers
            <br />
            • Columns must be in this exact order:
            <br />
            <span className="font-mono text-sm">
              1. Region → 2. Circle → 3. Division → 4. Sub Division → 5. Block → 6. Scheme ID → 7. Scheme Name → 8. Village Name → 9. Number of ESR → 10. Connected ESR → 11. Not Connected ESR → 12. Village Functional Status → 13. No of Fully Completion ESR → 14. Fully Completion Village Status
            </span>
          </AlertDescription>
        </Alert>

        {/* Import Results */}
        {importResult && (
          <Alert className={importResult.success ? "border-green-200 bg-green-50 dark:bg-green-950" : "border-red-200 bg-red-50 dark:bg-red-950"}>
            {importResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">
                  {importResult.success ? 'Import Completed Successfully' : 'Import Failed'}
                </div>
                <div>
                  {importResult.message}
                </div>
                {importResult.success && (
                  <div className="text-sm">
                    • Imported: {importResult.imported} new villages
                    <br />
                    • Updated: {importResult.updated} existing villages
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-sm">
                    <strong>Errors:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {importResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... and {importResult.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}