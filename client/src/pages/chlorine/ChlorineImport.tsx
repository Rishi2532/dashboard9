import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, FileCheck, AlertCircle, XCircle, CheckCircle, Download, FileSpreadsheet } from 'lucide-react';

interface ImportResult {
  message?: string;
  inserted: number;
  updated: number;
  errors: string[];
}

const ChlorineImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Import Excel mutation
  const excelMutation = useMutation({
    mutationFn: async () => {
      if (!excelFile) {
        throw new Error('No Excel file selected');
      }
      
      const formData = new FormData();
      formData.append('file', excelFile);
      
      return apiRequest('/api/chlorine/import/excel', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, it will be automatically set with the boundary
        },
      });
    },
    onSuccess: (data: ImportResult) => {
      toast({
        title: 'Excel Import Successful',
        description: `Imported ${data.inserted} records, updated ${data.updated} records`,
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine/dashboard-stats'] });
      
      // Reset file input
      setExcelFile(null);
    },
    onError: (error) => {
      toast({
        title: 'Excel Import Failed',
        description: (error as Error)?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Import CSV mutation
  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile) {
        throw new Error('No CSV file selected');
      }
      
      const formData = new FormData();
      formData.append('file', csvFile);
      
      return apiRequest('/api/chlorine/import/csv', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, it will be automatically set with the boundary
        },
      });
    },
    onSuccess: (data: ImportResult) => {
      toast({
        title: 'CSV Import Successful',
        description: `Imported ${data.inserted} records, updated ${data.updated} records`,
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine/dashboard-stats'] });
      
      // Reset file input
      setCsvFile(null);
    },
    onError: (error) => {
      toast({
        title: 'CSV Import Failed',
        description: (error as Error)?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Handle file change for Excel
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setExcelFile(e.target.files[0]);
    }
  };
  
  // Handle file change for CSV
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };
  
  // Handle Excel import
  const handleExcelImport = () => {
    excelMutation.mutate();
  };
  
  // Handle CSV import
  const handleCsvImport = () => {
    csvMutation.mutate();
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Import Chlorine Data</CardTitle>
            <CardDescription>Upload Excel or CSV files to update chlorine measurements for ESRs</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="excel">
            <TabsList className="mb-6">
              <TabsTrigger value="excel">Excel (With Headers)</TabsTrigger>
              <TabsTrigger value="csv">CSV (Without Headers)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="excel">
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Excel File Requirements</AlertTitle>
                  <AlertDescription>
                    <p>Excel file must include headers with the following expected column names:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Region, Scheme ID, Scheme Name, Village Name, ESR Name</li>
                      <li>Chlorine Value Day 1-7, Chlorine Date Day 1-7</li>
                      <li>Sensor ID (optional)</li>
                    </ul>
                    <p className="mt-2 text-primary font-medium">
                      The most recent chlorine measurement should be in "Chlorine Value Day 7" with date in "Chlorine Date Day 7".
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col space-y-4">
                  <div>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileChange}
                      disabled={excelMutation.isPending}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {excelFile ? `Selected: ${excelFile.name}` : 'No file selected'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleExcelImport}
                    disabled={!excelFile || excelMutation.isPending}
                    className="w-fit"
                  >
                    {excelMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Import Excel
                      </>
                    )}
                  </Button>
                </div>
                
                {excelMutation.isSuccess && (
                  <div className="mt-4">
                    <Alert className="bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">Import Successful</AlertTitle>
                      <AlertDescription className="text-green-800">
                        <p>Chlorine data has been successfully imported.</p>
                        <p className="mt-2">
                          Created: {excelMutation.data.inserted} records | 
                          Updated: {excelMutation.data.updated} records
                        </p>
                        
                        {excelMutation.data.errors && excelMutation.data.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold">Errors ({excelMutation.data.errors.length}):</p>
                            <ul className="list-disc list-inside mt-1">
                              {excelMutation.data.errors.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-red-600">{error}</li>
                              ))}
                              {excelMutation.data.errors.length > 5 && (
                                <li>...and {excelMutation.data.errors.length - 5} more errors</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {excelMutation.isError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Import Failed</AlertTitle>
                    <AlertDescription>
                      {(excelMutation.error as Error)?.message || 'An unknown error occurred'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="csv">
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>CSV File Requirements</AlertTitle>
                  <AlertDescription>
                    <p>CSV file should <strong>NOT</strong> include headers. The column mapping is as follows:</p>
                    <div className="mt-2 text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-1">Column</th>
                            <th className="text-left p-1">Field</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">0</td><td className="p-1">region</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">1</td><td className="p-1">circle</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">2</td><td className="p-1">division</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">3</td><td className="p-1">sub_division</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">4</td><td className="p-1">block</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">5</td><td className="p-1">scheme_id</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">6</td><td className="p-1">scheme_name</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">7</td><td className="p-1">village_name</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">8</td><td className="p-1">esr_name</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">9-15</td><td className="p-1">Chlorine_value_1 through 7</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">16-22</td><td className="p-1">Chlorine_date_day_1 through 7</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">23</td><td className="p-1">number_of_consistent_zero_value_in_Chlorine</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">24</td><td className="p-1">Chlorine_less_than_02_mgl</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">25</td><td className="p-1">Chlorine_between_02__05_mgl</td></tr>
                          <tr className="border-b even:bg-gray-100"><td className="p-1">26</td><td className="p-1">Chlorine_greater_than_05_mgl</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-primary font-medium">
                      The most recent chlorine measurement should be in Column 15 (Chlorine_value_7) with date in Column 22 (Chlorine_date_day_7).
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col space-y-4">
                  <div className="bg-blue-50 p-3 rounded border border-blue-100 flex justify-between items-center">
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Need a template?</p>
                      <p className="text-xs">Download a sample CSV template with the correct column structure</p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-100"
                      size="sm"
                      onClick={() => {
                        // Generate sample CSV content
                        const sampleData = [
                          "Amravati,Circle1,Division1,SubDiv1,Block1,AMR2001,Sample Scheme,Village1,ESR1,0.3,0.4,0.5,0.3,0.4,0.2,0.5,2025-04-17,2025-04-18,2025-04-19,2025-04-20,2025-04-21,2025-04-22,2025-04-23,0,0,1,0",
                          "Nagpur,Circle2,Division2,SubDiv2,Block2,NAG2002,Sample Scheme 2,Village2,ESR2,0.1,0.2,0.1,0.3,0.1,0.1,0.2,2025-04-17,2025-04-18,2025-04-19,2025-04-20,2025-04-21,2025-04-22,2025-04-23,0,1,0,0"
                        ].join('\n');
                        
                        // Create blob and download
                        const blob = new Blob([sampleData], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'chlorine_data_template.csv';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Template
                    </Button>
                  </div>
                  
                  <div>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      disabled={csvMutation.isPending}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {csvFile ? `Selected: ${csvFile.name}` : 'No file selected'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleCsvImport}
                    disabled={!csvFile || csvMutation.isPending}
                    className="w-fit"
                  >
                    {csvMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Import CSV
                      </>
                    )}
                  </Button>
                </div>
                
                {csvMutation.isSuccess && (
                  <div className="mt-4">
                    <Alert className="bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">Import Successful</AlertTitle>
                      <AlertDescription className="text-green-800">
                        <p>Chlorine data has been successfully imported.</p>
                        <p className="mt-2">
                          Created: {csvMutation.data.inserted} records | 
                          Updated: {csvMutation.data.updated} records
                        </p>
                        
                        {csvMutation.data.errors && csvMutation.data.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold">Errors ({csvMutation.data.errors.length}):</p>
                            <ul className="list-disc list-inside mt-1">
                              {csvMutation.data.errors.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-red-600">{error}</li>
                              ))}
                              {csvMutation.data.errors.length > 5 && (
                                <li>...and {csvMutation.data.errors.length - 5} more errors</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {csvMutation.isError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Import Failed</AlertTitle>
                    <AlertDescription>
                      {(csvMutation.error as Error)?.message || 'An unknown error occurred'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChlorineImport;