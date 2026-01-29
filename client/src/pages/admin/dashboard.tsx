import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  FileUp, 
  LogOut, 
  RefreshCw,
  Database,
  FileText,
  Trash2,
  Cog,
  List,
  Droplets,
  Gauge,
  HelpCircle
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import ProtectedRoute from '@/components/auth/protected-route';
import RegionImporter from '@/components/admin/region-importer';
import SchemeImporter from '@/components/admin/scheme-importer';
import LpcdImport from '@/pages/lpcd/LpcdImport';
import { ChlorineImport } from '@/pages/chlorine';
import { PressureImportContent } from '@/pages/pressure';
import EnhancedCsvImporter from '@/components/admin/enhanced-csv-importer';
import VillageImport from '@/components/admin/village-import';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

// Schema Manager component
function SchemeManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchSchemeId, setSearchSchemeId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [schemeToDelete, setSchemeToDelete] = useState<Scheme | null>(null);
  
  // Define region type
  interface Region {
    region_id: number;
    region_name: string;
  }
  
  // Fetch regions
  const regionsQuery = useQuery<Region[]>({
    queryKey: ['/api/regions'],
    queryFn: async () => {
      const response = await fetch('/api/regions');
      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }
      return response.json();
    },
    refetchOnWindowFocus: false
  });
  
  // Define scheme type
  interface Scheme {
    scheme_id: string;
    scheme_name: string;
    region_name: string;
    scheme_status: string;
    block?: string | null; // Added block field for handling block-specific schemes
    agency?: string;
    total_villages?: number;
    villages_integrated?: number;
    functional_villages?: number;
    partial_villages?: number;
    non_functional_villages?: number;
    fully_completed_villages?: number;
    total_esr?: number;
    esr_integrated_on_iot?: number;
    fully_completed_esr?: number;
    balance_esr?: number;
    flow_meters_connected?: number;
    pressure_transmitters_connected?: number;
    residual_chlorine_connected?: number;
  }
  
  // Fetch schemes based on selected region and status
  const schemesQuery = useQuery<Scheme[]>({
    queryKey: ['/api/schemes', selectedRegion, selectedStatus, searchSchemeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append('region', selectedRegion);
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.append('status', selectedStatus);
      }
      if (searchSchemeId) {
        params.append('scheme_id', searchSchemeId);
      }
      
      // Set the view_type to 'summary' to get the consolidated view by default
      params.append('view_type', 'summary');
      
      const response = await fetch(`/api/schemes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schemes');
      }
      return response.json();
    },
    refetchOnWindowFocus: false
  });
  
  // Delete scheme mutation - Updated to handle block parameter
  const deleteSchemeMutation = useMutation({
    mutationFn: async (params: { schemeId: string, block?: string | null }) => {
      // Build the URL with query parameters for the block
      let url = `/api/schemes/${params.schemeId}`;
      if (params.block) {
        url += `?block=${encodeURIComponent(params.block)}`;
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete scheme');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message || 'Scheme deleted successfully',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setSchemeToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete scheme: ${error.message}`,
        variant: 'destructive'
      });
    }
  });
  
  // Delete all schemes mutation
  const deleteAllSchemesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/schemes/all/confirm`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete all schemes');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `All schemes deleted successfully. Total deleted: ${data.deletedCount}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/regions/summary'] });
      
      // Close the dialog
      setDeleteAllDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete all schemes: ${error.message}`,
        variant: 'destructive'
      });
    }
  });
  
  const handleDelete = (scheme: Scheme) => {
    setSchemeToDelete(scheme);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (schemeToDelete) {
      deleteSchemeMutation.mutate({
        schemeId: schemeToDelete.scheme_id,
        block: schemeToDelete.block
      });
    }
  };
  
  const handleDeleteAll = () => {
    setDeleteAllDialogOpen(true);
  };
  
  const confirmDeleteAll = () => {
    deleteAllSchemesMutation.mutate();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Schemes</CardTitle>
        <CardDescription>
          View and manage schemes in the system. Use the filters to find specific schemes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/4">
              <label className="text-sm font-medium mb-1 block">Region</label>
              <Select
                value={selectedRegion}
                onValueChange={setSelectedRegion}
                disabled={regionsQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regionsQuery.data?.map((region: Region) => (
                    <SelectItem key={region.region_name} value={region.region_name}>
                      {region.region_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-1/4">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Fully Completed">Fully Completed</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Non-functional">Non-functional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-1/4">
              <label className="text-sm font-medium mb-1 block">Scheme ID</label>
              <Input
                placeholder="Enter scheme ID"
                value={searchSchemeId}
                onChange={(e) => setSearchSchemeId(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-1/4 flex items-end">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ 
                    queryKey: ['/api/schemes', selectedRegion, selectedStatus, searchSchemeId] 
                  });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAll}
              disabled={deleteAllSchemesMutation.isPending || schemesQuery.data?.length === 0}
              className="flex items-center gap-2"
            >
              {deleteAllSchemesMutation.isPending ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Deleting All Schemes...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete All Schemes
                </>
              )}
            </Button>
          </div>
          
          {/* Schemes Table */}
          {schemesQuery.isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : schemesQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load schemes. {(schemesQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : schemesQuery.data?.length === 0 ? (
            <Alert>
              <AlertTitle>No schemes found</AlertTitle>
              <AlertDescription>
                No schemes match the current filters. Try changing the region or scheme ID.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemesQuery.data?.map((scheme: Scheme) => (
                    <TableRow key={`${scheme.scheme_id}-${scheme.block || 'null'}`}>
                      <TableCell className="font-mono text-xs">{scheme.scheme_id}</TableCell>
                      <TableCell>{scheme.scheme_name}</TableCell>
                      <TableCell>{scheme.block || '-'}</TableCell>
                      <TableCell>{scheme.region_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          scheme.scheme_status === 'Fully Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : scheme.scheme_status === 'In Progress' || scheme.scheme_status === 'Partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {scheme.scheme_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(scheme)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the scheme "{schemeToDelete?.scheme_name}"
                {schemeToDelete?.block ? ` in block "${schemeToDelete.block}"` : ''}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteSchemeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteSchemeMutation.isPending}
              >
                {deleteSchemeMutation.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete All Schemes Confirmation Dialog */}
        <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete All Schemes</DialogTitle>
              <DialogDescription>
                <p className="mb-2">
                  Are you sure you want to delete <strong>ALL SCHEMES</strong> from the database? 
                </p>
                <p className="font-semibold text-red-500">
                  This action cannot be undone and will remove data for all {schemesQuery.data?.length} schemes.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteAllDialogOpen(false)}
                disabled={deleteAllSchemesMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteAll}
                disabled={deleteAllSchemesMutation.isPending}
              >
                {deleteAllSchemesMutation.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Deleting All Schemes...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Confirm Delete All
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('region-import');
  
  // Remove CSV Importer component import to match user request
  // We will only use the existing region and scheme importers with their CSV functionality
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
      // Redirect to the home page
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Logout failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Region summary update mutation
  const updateRegionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/update-region-summaries', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Update failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Region summaries have been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Update failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleUpdateRegionSummaries = () => {
    updateRegionMutation.mutate();
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Admin Header with gradient */}
        <div className="p-6 bg-gradient-to-r from-blue-500/10 to-blue-600/5 rounded-lg mb-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-blue-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-sm text-blue-700/80 font-medium">
                Import data and manage system settings
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Button 
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleUpdateRegionSummaries}
                disabled={updateRegionMutation.isPending}
              >
                {updateRegionMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Summaries
                  </>
                )}
              </Button>
              <Button 
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? 'Logging out...' : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6">
          <Tabs defaultValue="region-import" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-8 mb-6">
              <TabsTrigger value="region-import" className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Import Region Data
              </TabsTrigger>
              <TabsTrigger value="scheme-import" className="flex items-center">
                <FileUp className="h-4 w-4 mr-2" />
                Import Scheme Data
              </TabsTrigger>
              <TabsTrigger value="lpcd-import" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Import LPCD Data
              </TabsTrigger>
              <TabsTrigger value="chlorine-import" className="flex items-center">
                <Droplets className="h-4 w-4 mr-2" />
                Import Chlorine Data
              </TabsTrigger>
              <TabsTrigger value="pressure-import" className="flex items-center">
                <Gauge className="h-4 w-4 mr-2" />
                Import Pressure Data
              </TabsTrigger>
              <TabsTrigger value="water-consumption-import" className="flex items-center">
                <Droplets className="h-4 w-4 mr-2" />
                Water Consumption Data
              </TabsTrigger>
              <TabsTrigger value="village-import" className="flex items-center">
                <List className="h-4 w-4 mr-2" />
                Import Village Data
              </TabsTrigger>
              <TabsTrigger value="manage-schemes" className="flex items-center">
                <Cog className="h-4 w-4 mr-2" />
                Manage Schemes
              </TabsTrigger>
              <TabsTrigger value="manage-reports" className="flex items-center" onClick={() => window.location.href = '/admin/manage-reports'}>
                <FileText className="h-4 w-4 mr-2" />
                Manage Reports
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="region-import" className="mt-0">
              <RegionImporter />
            </TabsContent>
            
            <TabsContent value="scheme-import" className="mt-0">
              <SchemeImporter />
            </TabsContent>
            
            <TabsContent value="lpcd-import" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Import LPCD Data</CardTitle>
                  <CardDescription>
                    Upload Excel or CSV files containing LPCD (Liters Per Capita per Day) data for water schemes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LpcdImport />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="chlorine-import" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Import Chlorine Data</CardTitle>
                  <CardDescription>
                    Upload Excel or CSV files with chlorine measurements for ESRs (Elevated Storage Reservoirs).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChlorineImport />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="pressure-import" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Import Pressure Data</CardTitle>
                  <CardDescription>
                    Upload Excel or CSV files with pressure measurements (in bar) for ESRs (Elevated Storage Reservoirs).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PressureImportContent />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="water-consumption-import" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Import Water Consumption Data</CardTitle>
                  <CardDescription>
                    Upload CSV files with water consumption data including flow rates, daily water values, and consumption metrics for ESRs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedCsvImporter defaultTable="water_consumption" />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="village-import" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Import Village Data</CardTitle>
                  <CardDescription>
                    Upload CSV files with village information including 14 fields: region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, number_of_esr, connected_esr, not_connected_esr, village_functional_status, no_of_fully_completion_esr, fully_completion_village_status. CSV should have no headers - data mapping is based on column position (0-13).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VillageImport />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="manage-schemes" className="mt-0">
              <SchemeManager />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}