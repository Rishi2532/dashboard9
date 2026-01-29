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
  message: string;
  inserted: number;
  updated: number;
  errors: string[];
}

const LpcdImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [amravatiFile, setAmravatiFile] = useState<File | null>(null);
  
  // Import Excel mutation
  const excelMutation = useMutation({
    mutationFn: async () => {
      if (!excelFile) {
        throw new Error('No Excel file selected');
      }
      
      const formData = new FormData();
      formData.append('file', excelFile);
      
      return apiRequest('/api/water-scheme-data/import/excel', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, it will be automatically set with the boundary
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Excel Import Successful',
        description: data.message,
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/water-scheme-data'] });
      
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
      
      return apiRequest('/api/water-scheme-data/import/csv', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, it will be automatically set with the boundary
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'CSV Import Successful',
        description: data.message,
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/water-scheme-data'] });
      
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
  
  // Import Amravati Excel mutation
  const amravatiMutation = useMutation({
    mutationFn: async () => {
      if (!amravatiFile) {
        throw new Error('No Excel file selected');
      }
      
      const formData = new FormData();
      formData.append('file', amravatiFile);
      
      return apiRequest('/api/water-scheme-data/import/amravati', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, it will be automatically set with the boundary
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Amravati Excel Import Successful',
        description: data.message,
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/water-scheme-data'] });
      
      // Reset file input
      setAmravatiFile(null);
    },
    onError: (error) => {
      toast({
        title: 'Amravati Excel Import Failed',
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
  
  // Handle file change for Amravati Excel
  const handleAmravatiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAmravatiFile(e.target.files[0]);
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
  
  // Handle Amravati Excel import
  const handleAmravatiImport = () => {
    amravatiMutation.mutate();
  };
  
  // Handle template download
  const handleTemplateDownload = () => {
    // Create a link to download the template
    window.open('/api/water-scheme-data/template', '_blank');
    
    toast({
      title: 'Template Download',
      description: 'LPCD data template is being downloaded. Please use this template for importing your data.',
      variant: 'default',
    });
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Import Water Scheme Data</CardTitle>
            <CardDescription>Upload Excel or CSV files to update water scheme data</CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={handleTemplateDownload} 
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="excel">
            <TabsList className="mb-6">
              <TabsTrigger value="excel">Excel (With Headers)</TabsTrigger>
              <TabsTrigger value="csv">CSV (No Headers)</TabsTrigger>
              <TabsTrigger value="amravati">Amravati Format</TabsTrigger>
            </TabsList>
            
            <TabsContent value="excel">
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Excel File Requirements</AlertTitle>
                  <AlertDescription>
                    <p>Excel file must include headers with the following expected column names:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Region, Circle, Division, Sub-Division, Block</li>
                      <li>Scheme ID, Scheme Name, Village Name, Population, Number of ESR</li>
                      <li>Water Value Day 1-7, LPCD Value Day 1-7</li>
                      <li>Water Date Day 1-6, LPCD Date Day 1-7</li>
                    </ul>
                    <p className="mt-2 font-medium text-primary">
                      Use the "Download Template" button above to get a properly formatted Excel file.
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
                        <p>{excelMutation.data.message}</p>
                        <p className="mt-2">
                          Created: {excelMutation.data.inserted} records | 
                          Updated: {excelMutation.data.updated} records
                        </p>
                        
                        {excelMutation.data.errors.length > 0 && (
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
                    <p>CSV file must have no headers and follow this column order:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Region</li>
                      <li>Circle</li>
                      <li>Division</li>
                      <li>Sub-Division</li>
                      <li>Block</li>
                      <li>Scheme ID</li>
                      <li>Scheme Name</li>
                      <li>Village Name</li>
                      <li>Population</li>
                      <li>Number of ESR</li>
                      <li>Water Value Day 1-6</li>
                      <li>LPCD Value Day 1-7</li>
                      <li>Water Date Day 1-6</li>
                      <li>LPCD Date Day 1-7</li>
                      <li>Consistent Zero LPCD For A Week</li>
                      <li>Below 55 LPCD Count</li>
                      <li>Above 55 LPCD Count</li>
                    </ol>
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col space-y-4">
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
                        <p>{csvMutation.data.message}</p>
                        <p className="mt-2">
                          Created: {csvMutation.data.inserted} records | 
                          Updated: {csvMutation.data.updated} records
                        </p>
                        
                        {csvMutation.data.errors.length > 0 && (
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
            
            <TabsContent value="amravati">
              <div className="space-y-6">
                <Alert className="bg-amber-50 border-amber-200">
                  <FileSpreadsheet className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="text-amber-800">Special Amravati Excel Format</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    <p>This import option is specially designed for Amravati Excel file format with the following structure:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Columns 1-6:</strong> Region, Circle, Division, Sub-Division, Block, Scheme ID</li>
                      <li><strong>Column 7:</strong> Scheme Name</li>
                      <li><strong>Column 8:</strong> Village Name</li>
                      <li><strong>Column 9:</strong> Population</li>
                      <li><strong>Column 10:</strong> Number of ESR</li>
                      <li><strong>Columns 11-16:</strong> Water values (day 1-6)</li>
                      <li><strong>Columns 17-23:</strong> LPCD values (day 1-7)</li>
                      <li><strong>Columns 38-40:</strong> Consistency statistics</li>
                    </ul>
                    <p className="mt-2 font-medium text-amber-900">
                      Use this option if your Excel file matches this exact layout from Amravati region.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col space-y-4">
                  <div>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleAmravatiFileChange}
                      disabled={amravatiMutation.isPending}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-600 file:text-white hover:file:bg-amber-700"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {amravatiFile ? `Selected: ${amravatiFile.name}` : 'No file selected'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleAmravatiImport}
                    disabled={!amravatiFile || amravatiMutation.isPending}
                    className="w-fit bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {amravatiMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Import Amravati Excel
                      </>
                    )}
                  </Button>
                </div>
                
                {amravatiMutation.isSuccess && (
                  <div className="mt-4">
                    <Alert className="bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">Import Successful</AlertTitle>
                      <AlertDescription className="text-green-800">
                        <p>{amravatiMutation.data.message}</p>
                        <p className="mt-2">
                          Created: {amravatiMutation.data.inserted} records | 
                          Updated: {amravatiMutation.data.updated} records
                        </p>
                        
                        {amravatiMutation.data.errors && amravatiMutation.data.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold">Errors ({amravatiMutation.data.errors.length}):</p>
                            <ul className="list-disc list-inside mt-1">
                              {amravatiMutation.data.errors.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-red-600">{error}</li>
                              ))}
                              {amravatiMutation.data.errors.length > 5 && (
                                <li>...and {amravatiMutation.data.errors.length - 5} more errors</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {amravatiMutation.isError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Import Failed</AlertTitle>
                    <AlertDescription>
                      {(amravatiMutation.error as Error)?.message || 'An unknown error occurred'}
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

export default LpcdImport;