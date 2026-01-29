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
import { AlertCircle, CheckCircle, Database, FileText, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function SqlImporter() {
  const { toast } = useToast();
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importDetails, setImportDetails] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async () => {
      // Reset any previous state
      setImportSuccess(false);
      setImportError(null);
      setImportDetails(null);
      
      const response = await fetch('/api/admin/import/sql', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import SQL data');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setImportError(null);
      setImportSuccess(true);
      setImportDetails(data);
      toast({
        title: 'SQL Import Successful',
        description: data.message || 'SQL data imported successfully',
      });
    },
    onError: (error: Error) => {
      setImportError(error.message);
      setImportSuccess(false);
      setImportDetails(null);
      toast({
        title: 'SQL Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleImport = async () => {
    // Confirm with the user before proceeding
    if (window.confirm('This will import scheme data from the SQL file stored on the server. Continue?')) {
      await importMutation.mutate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          Import Scheme Data From SQL
        </CardTitle>
        <CardDescription>
          Import scheme status data from SQL file stored on the server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-purple-50 border-purple-200">
          <Info className="h-4 w-4 text-purple-500" />
          <AlertTitle className="text-purple-800">SQL Import Information</AlertTitle>
          <AlertDescription className="text-purple-700">
            <p className="mb-2">This process will:</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Import scheme data from the SQL file at <code>attached_assets/insert_scheme_status.sql</code></li>
              <li>Automatically map SQL column names to database field names</li>
              <li>Update existing schemes with new values from the SQL file</li>
              <li>Skip any rows with invalid or missing data</li>
              <li>Update region summaries after import is complete</li>
            </ul>
            <p className="mt-2 text-xs italic">Note: The SQL file must match the expected format with INSERT statements for the scheme_status table.</p>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="w-full sm:w-auto"
            variant="outline"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing SQL Data...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Import SQL Data
              </>
            )}
          </Button>
          
          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Failed</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
          
          {importSuccess && importDetails && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <div className="flex-col space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  <AlertTitle className="text-green-800">Import Successful</AlertTitle>
                </div>
                <AlertDescription>
                  <p className="font-medium">{importDetails.message}</p>
                  
                  <div className="mt-2 text-sm space-y-1">
                    <div className="bg-white/70 rounded-md px-3 py-1 border border-green-100 flex justify-between">
                      <span>Schemes Processed:</span>
                      <span className="font-semibold">{importDetails.schemeCount || 0}</span>
                    </div>
                    
                    {importDetails.errors && importDetails.errors.length > 0 && (
                      <Accordion type="single" collapsible className="mt-2">
                        <AccordionItem value="errors">
                          <AccordionTrigger className="text-sm font-medium text-amber-700">
                            Show Errors ({importDetails.errors.length})
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="text-sm p-2 bg-amber-50 rounded border border-amber-100 text-xs max-h-48 overflow-y-auto">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(importDetails.errors, null, 2)}</pre>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                    
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="details">
                        <AccordionTrigger className="text-sm font-medium text-green-700">View Import Log</AccordionTrigger>
                        <AccordionContent>
                          <div className="text-sm p-2 bg-white/50 rounded border border-green-100 text-xs max-h-48 overflow-y-auto font-mono">
                            <pre className="whitespace-pre-wrap">{importDetails.details || "No detailed log available"}</pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 text-xs text-gray-500 rounded-b-lg py-3">
        The SQL import process will transform the column names to match the database schema.
        Scheme status values will be preserved exactly as in the SQL file.
      </CardFooter>
    </Card>
  );
}