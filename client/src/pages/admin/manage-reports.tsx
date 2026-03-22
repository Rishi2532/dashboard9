import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, Plus, File, FileX, Check, X, ArrowLeft } from 'lucide-react';
import { apiRequest } from '../../lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';

// Report File Types
const REPORT_TYPES = [
  { id: 'esr_level', name: 'ESR Level Datalink Report' },
  { id: 'water_consumption', name: 'Water Consumption Datalink Report' },
  { id: 'lpcd_village', name: 'LPCD Village Level Datalink Report' },
  { id: 'chlorine', name: 'Chlorine Datalink Report' },
  { id: 'pressure', name: 'Pressure Datalink Report' },
  { id: 'village_level', name: 'Village Level Datalink Report' },
  { id: 'scheme_level', name: 'Scheme Level Datalink Report' },
  // Monthly Reports
  { id: 'water_consumption_esr_monthly', name: 'Water Consumption - ESR Level - Monthly' },
  { id: 'water_consumption_village_monthly', name: 'Water Consumption - Village Level - Monthly' },
  { id: 'water_consumption_scheme_monthly', name: 'Water Consumption - Scheme Level - Monthly' },
  { id: 'lpcd_village_monthly', name: 'LPCD - Village Level - Monthly' },
  { id: 'lpcd_scheme_monthly', name: 'LPCD - Scheme Level - Monthly' },
];

// Overall Report File Types (same functionality as above but for overall reports)
const OVERALL_REPORT_TYPES = [
  { id: 'overall_chlorine', name: 'Overall Chlorine Report' },
  { id: 'overall_pressure', name: 'Overall Pressure Report' },
  { id: 'overall_water_consumption', name: 'Overall Water Consumption Report' },
  { id: 'overall_lpcd', name: 'Overall LPCD Report' },
];

// Admin page for managing report files
const ManageReports = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Check if user is admin
  const { data: authData, isLoading: isAuthLoading } = useQuery<{ isAdmin?: boolean; isLoggedIn?: boolean }>({
    queryKey: ['/api/auth/status'],
    retry: 1,
  });

  // Redirect non-admin users to login
  useEffect(() => {
    if (!isAuthLoading && authData && !authData.isAdmin) {
      toast({
        title: "Access Denied",
        description: "You must be an administrator to access this page",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [authData, isAuthLoading, setLocation]);

  // Fetch all report files from the API
  const { data: reportFiles = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/reports'],
    retry: 1,
  });

  // Define mutation for file upload
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Using fetch directly instead of apiRequest to better control the request
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        // Parse error details from response
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Report file uploaded successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setIsUploading(false);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload report file',
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });

  // Define mutation for file deletion
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest(`/api/reports/${fileId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Report file deleted successfully',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setDeleteFileId(null);
      setConfirmDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion failed',
        description: error.message || 'Failed to delete report file',
        variant: 'destructive',
      });
      setDeleteFileId(null);
      setConfirmDialogOpen(false);
    },
  });

  // Handle file selection and upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, reportType: string) => {
    try {
      const file = event.target.files?.[0];
      if (!file) {
        toast({
          title: 'Error',
          description: 'Please select a file to upload',
          variant: 'destructive',
        });
        return;
      }

      console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an Excel file (.xlsx or .xls)',
          variant: 'destructive',
        });
        return;
      }

      // Create a new FormData instance
      const formData = new FormData();
      formData.append('file', file);
      formData.append('report_type', reportType);

      setIsUploading(true);
      await uploadMutation.mutate(formData);

      // Reset the file input
      event.target.value = '';
    } catch (error) {
      console.error('Error in file upload handler:', error);
      toast({
        title: 'Upload error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      setIsUploading(false);

      // Reset the file input
      event.target.value = '';
    }
  };

  // Handle delete confirmation
  const confirmDelete = (fileId: number) => {
    setDeleteFileId(fileId);
    setConfirmDialogOpen(true);
  };

  // Execute delete mutation
  const handleDelete = () => {
    if (deleteFileId !== null) {
      deleteMutation.mutate(deleteFileId);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Link href="/admin/dashboard" className="mr-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Manage Report Files</h1>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Upload Report Files</h2>
            <p className="text-gray-500 mb-4">
              Upload the standard Excel report files to make them available for users to download.
              Each file type can only have one active version at a time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPORT_TYPES.map((type) => (
              <div key={type.id} className="flex items-center p-4 border rounded-lg">
                <div className="flex-grow">
                  <p className="font-medium">{type.name}</p>
                  <p className="text-sm text-gray-500">
                    {Array.isArray(reportFiles) && reportFiles.some((file: any) => file.report_type === type.id)
                      ? 'File uploaded'
                      : 'No file uploaded'}
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor={`file-upload-${type.id}`}
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload
                  </Label>
                  <input
                    id={`file-upload-${type.id}`}
                    type="file"
                    accept=".xlsx,.xls"
                    className="sr-only"
                    onChange={(e) => handleFileUpload(e, type.id)}
                    disabled={isUploading}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Reports Upload Section */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Upload Overall Data Reports</h2>
          <p className="text-gray-600 mb-6">
            Upload Excel files for overall data reports (chlorine, pressure, water consumption, LPCD)
          </p>
          <div className="space-y-4">
            {OVERALL_REPORT_TYPES.map((type) => (
              <div key={type.id} className="flex items-center p-4 border rounded-lg">
                <div className="flex-grow">
                  <p className="font-medium">{type.name}</p>
                  <p className="text-sm text-gray-500">
                    {Array.isArray(reportFiles) && reportFiles.some((file: any) => file.report_type === type.id)
                      ? 'File uploaded'
                      : 'No file uploaded'}
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor={`file-upload-${type.id}`}
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload
                  </Label>
                  <input
                    id={`file-upload-${type.id}`}
                    type="file"
                    accept=".xlsx,.xls"
                    className="sr-only"
                    onChange={(e) => handleFileUpload(e, type.id)}
                    disabled={isUploading}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Uploaded Report Files</h2>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Failed to load report files: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          ) : Array.isArray(reportFiles) && reportFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No report files have been uploaded yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(reportFiles) && reportFiles.map((file: any) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      {REPORT_TYPES.find(t => t.id === file.report_type)?.name ||
                        OVERALL_REPORT_TYPES.find(t => t.id === file.report_type)?.name ||
                        file.report_type}
                    </TableCell>
                    <TableCell>{file.original_name}</TableCell>
                    <TableCell>{new Date(file.upload_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {file.is_active ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <a
                          href={`/api/reports/${file.id}`}
                          download
                        >
                          <Button size="sm" variant="outline">
                            <File className="h-4 w-4 mr-1" /> Download
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmDelete(file.id)}
                        >
                          <FileX className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageReports;