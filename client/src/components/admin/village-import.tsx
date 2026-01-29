import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  AlertCircle, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle,
  Info
} from 'lucide-react';

interface ImportResult {
  message: string;
  imported: number;
  updated: number;
  errors: number;
  errorDetails: string[];
  totalProcessed: number;
  clearedExisting: boolean;
}

export default function VillageImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/villages/import/csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Import failed');
      }

      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      toast({
        title: "Import successful",
        description: `${result.imported} villages imported, ${result.updated} updated`,
      });
      
      // Reset file selection
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/villages'] });
    },
    onError: (error: Error) => {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null); // Clear previous results
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('clearExisting', clearExisting.toString());

    importMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* CSV Format Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>CSV Format Requirements</AlertTitle>
        <AlertDescription>
          <div className="mt-2 text-sm">
            <p className="mb-2">Upload a CSV file with exactly 14 columns in this order (no headers):</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Region</li>
              <li>Circle</li>
              <li>Division</li>
              <li>Sub Division</li>
              <li>Block</li>
              <li>Scheme ID</li>
              <li>Scheme Name</li>
              <li>Village Name</li>
              <li>Number of ESR (integer)</li>
              <li>Connected ESR (integer)</li>
              <li>Not Connected ESR (integer)</li>
              <li>Village Functional Status</li>
              <li>Number of Fully Completion ESR (integer)</li>
              <li>Fully Completion Village Status</li>
            </ol>
          </div>
        </AlertDescription>
      </Alert>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Village Data</CardTitle>
          <CardDescription>
            Select a CSV file containing village data to import into the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              data-testid="input-village-csv-file"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="clear-existing"
              checked={clearExisting}
              onCheckedChange={(checked) => setClearExisting(checked as boolean)}
              data-testid="checkbox-clear-existing"
            />
            <Label htmlFor="clear-existing">
              Clear all existing village data before import
            </Label>
          </div>

          <Button
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
            className="w-full"
            data-testid="button-import-villages"
          >
            {importMutation.isPending ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Village Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Progress */}
      {importMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing village data...</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {importResult.errors > 0 ? (
                <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-sm text-gray-600">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                <div className="text-sm text-gray-600">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{importResult.totalProcessed}</div>
                <div className="text-sm text-gray-600">Total Processed</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${importResult.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {importResult.errors}
                </div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {importResult.clearedExisting && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  All existing village data was cleared before import
                </AlertDescription>
              </Alert>
            )}

            {importResult.errorDetails && importResult.errorDetails.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center">
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  Error Details
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResult.errorDetails.map((error, index) => (
                      <li key={index} className="break-words">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}