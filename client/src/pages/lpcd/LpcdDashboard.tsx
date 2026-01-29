import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useComprehensiveActivityTracker } from '@/hooks/use-comprehensive-activity-tracker';
import { MoreHorizontal, ChevronDown, Filter, Info } from 'lucide-react';

// Define TypeScript interfaces
interface WaterSchemeData {
  scheme_id: string;
  region?: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  scheme_name?: string;
  village_name?: string;
  population?: number;
  number_of_esr?: number;
  water_value_day1?: number | string;
  water_value_day2?: number | string;
  water_value_day3?: number | string;
  water_value_day4?: number | string;
  water_value_day5?: number | string;
  water_value_day6?: number | string;
  lpcd_value_day1?: number | string;
  lpcd_value_day2?: number | string;
  lpcd_value_day3?: number | string;
  lpcd_value_day4?: number | string;
  lpcd_value_day5?: number | string;
  lpcd_value_day6?: number | string;
  lpcd_value_day7?: number | string;
  consistent_zero_lpcd_for_a_week?: number | boolean;
  below_55_lpcd_count?: number;
  above_55_lpcd_count?: number;
}

interface RegionData {
  region_id: number;
  region_name: string;
}

const LpcdDashboard: React.FC = () => {
  const { toast } = useToast();
  const { trackPageVisit, trackDataExport, trackFilterUsage } = useComprehensiveActivityTracker();
  
  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Village LPCD Dashboard");
  }, [trackPageVisit]);

  // Listen for region filter changes from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("LPCD Dashboard received region filter:", region);
      const newRegion = region === 'all' ? '' : region;
      setFilters(prev => ({
        ...prev,
        region: newRegion
      }));
      // Reset pagination when filter changes
      setPage(1);
    };

    window.addEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    
    // Expose export function globally for chatbot
    (window as any).triggerDashboardExport = () => {
      return new Promise<void>((resolve) => {
        exportToExcel();
        // Small delay to ensure export starts
        setTimeout(resolve, 100);
      });
    };
    
    return () => {
      window.removeEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
      
      // Clean up global export function
      if ((window as any).triggerDashboardExport) {
        (window as any).triggerDashboardExport = undefined;
      }
    };
  }, []);
  
  // Filter state
  const [filters, setFilters] = useState({
    region: '',
    minLpcd: '',
    maxLpcd: '',
    zeroSupplyForWeek: false
  });
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Water scheme data query - Get ALL data then filter client-side
  const { 
    data: allWaterSchemeData = [], 
    isLoading: isLoadingSchemes, 
    isError: isSchemesError, 
    error: schemesError,
    refetch
  } = useQuery<WaterSchemeData[]>({
    queryKey: ['/api/water-scheme-data', filters.region],
    queryFn: async () => {
      // Only apply region filter on server-side for performance
      const params = new URLSearchParams();
      
      if (filters.region && filters.region !== 'all') {
        params.append('region', filters.region);
      }
      
      const queryString = params.toString();
      const url = `/api/water-scheme-data${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch water scheme data');
      }
      
      return response.json();
    }
  });

  // Apply global filters (region only) for card statistics
  const globallyFilteredData = useMemo(() => {
    let filteredData = [...allWaterSchemeData];
    
    // Apply region filter only
    if (filters.region && filters.region !== 'all') {
      filteredData = filteredData.filter(scheme => scheme.region === filters.region);
    }
    
    return filteredData;
  }, [allWaterSchemeData, filters.region]);
  
  // Apply card-specific filters for table data display
  const waterSchemeData = useMemo(() => {
    let filteredData = [...globallyFilteredData]; // Start with globally filtered data
    
    // Apply LPCD minimum filter
    if (filters.minLpcd) {
      const minValue = parseFloat(filters.minLpcd);
      
      // Special handling for Between 40-55 range (handled together with max filter)
      if (minValue === 40 && filters.maxLpcd === '55') {
        // This case will be handled with the maxLpcd filter - do nothing here
      }
      // For "Above 55 LPCD" filter: Ensure at least one day has LPCD >= 55 AND no zero supply for week
      else if (minValue >= 55) {
        filteredData = filteredData.filter(scheme => {
          // First check if this is NOT a zero-supply village
          if (scheme.consistent_zero_lpcd_for_a_week === 1) {
            return false;
          }
          
          // Then check if at least one day has LPCD value >= 55
          const lpcdValues = [
            scheme.lpcd_value_day1,
            scheme.lpcd_value_day2,
            scheme.lpcd_value_day3,
            scheme.lpcd_value_day4,
            scheme.lpcd_value_day5,
            scheme.lpcd_value_day6,
            scheme.lpcd_value_day7
          ].map(val => Number(val) || 0);
          
          // Check if any value is >= 55
          return lpcdValues.some(val => val >= minValue);
        });
      } else {
        // For other min values
        filteredData = filteredData.filter(scheme => {
          // Exclude zero-supply villages unless specifically looking for them
          if (scheme.consistent_zero_lpcd_for_a_week === 1 && !filters.zeroSupplyForWeek) {
            return false;
          }
          
          const lpcdValues = [
            scheme.lpcd_value_day1,
            scheme.lpcd_value_day2,
            scheme.lpcd_value_day3,
            scheme.lpcd_value_day4,
            scheme.lpcd_value_day5,
            scheme.lpcd_value_day6,
            scheme.lpcd_value_day7
          ].map(val => Number(val) || 0);
          
          return lpcdValues.some(val => val > 0 && val >= minValue);
        });
      }
    }
    
    // Apply LPCD maximum filter
    if (filters.maxLpcd) {
      const maxValue = parseFloat(filters.maxLpcd);
      
      // Special case for "Between 40-55 LPCD" filter
      if (filters.minLpcd === '40' && maxValue === 55) {
        filteredData = filteredData.filter(scheme => {
          // Exclude zero-supply villages
          if (scheme.consistent_zero_lpcd_for_a_week === 1) {
            return false;
          }
          
          const lpcdValues = [
            scheme.lpcd_value_day1,
            scheme.lpcd_value_day2,
            scheme.lpcd_value_day3,
            scheme.lpcd_value_day4,
            scheme.lpcd_value_day5,
            scheme.lpcd_value_day6,
            scheme.lpcd_value_day7
          ].map(val => Number(val) || 0);
          
          // Must have at least one value between 40 and 55 (inclusive)
          return lpcdValues.some(val => val >= 40 && val <= 55);
        });
      }
      // For "Below 55 LPCD" filter: Exclude zero supply villages
      else if (maxValue <= 55 && !filters.zeroSupplyForWeek) {
        filteredData = filteredData.filter(scheme => {
          // Exclude zero-supply villages
          if (scheme.consistent_zero_lpcd_for_a_week === 1) {
            return false;
          }
          
          const lpcdValues = [
            scheme.lpcd_value_day1,
            scheme.lpcd_value_day2,
            scheme.lpcd_value_day3,
            scheme.lpcd_value_day4,
            scheme.lpcd_value_day5,
            scheme.lpcd_value_day6,
            scheme.lpcd_value_day7
          ].map(val => Number(val) || 0);
          
          // Must have at least one NON-ZERO value <= maxValue
          return lpcdValues.some(val => val > 0 && val <= maxValue);
        });
      } else {
        // For other max values
        filteredData = filteredData.filter(scheme => {
          const lpcdValues = [
            scheme.lpcd_value_day1,
            scheme.lpcd_value_day2,
            scheme.lpcd_value_day3,
            scheme.lpcd_value_day4,
            scheme.lpcd_value_day5,
            scheme.lpcd_value_day6,
            scheme.lpcd_value_day7
          ].map(val => Number(val) || 0);
          
          return lpcdValues.some(val => val <= maxValue);
        });
      }
    }
    
    // Apply zero supply filter
    if (filters.zeroSupplyForWeek) {
      filteredData = filteredData.filter(scheme => scheme.consistent_zero_lpcd_for_a_week === 1);
    }
    
    return filteredData;
  }, [globallyFilteredData, filters]);
  
  // Regions data query
  const { 
    data: regionsData = [], 
    isLoading: isLoadingRegions 
  } = useQuery<RegionData[]>({
    queryKey: ['/api/regions'],
  });
  
  // Handle filter changes
  const handleFilterChange = (field: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset to first page when filters change
    setPage(1);
    
    // Refetch data with new filters
    setTimeout(() => {
      refetch();
    }, 0);
  };
  
  // LPCD range selection with clear labels
  const handleLpcdRangeSelect = (range: string) => {
    // Reset all filters first
    let newFilters = {
      ...filters,
      minLpcd: '',
      maxLpcd: '',
      zeroSupplyForWeek: false
    };
    
    // Set specific filters based on selection
    if (range === 'above55') {
      newFilters.minLpcd = '55';
      // Client-side filtering will handle excluding zero values
    } else if (range === 'below55') {
      newFilters.maxLpcd = '55';
      newFilters.minLpcd = '0.1'; // Ensure we exclude zero values
    } else if (range === '40to55') {
      newFilters.minLpcd = '40';
      newFilters.maxLpcd = '55';
    } else if (range === 'zerosupply') {
      newFilters.zeroSupplyForWeek = true;
      // Clear other filters when selecting zero supply
      newFilters.minLpcd = '';
      newFilters.maxLpcd = '';
    }
    
    setFilters(newFilters);
    setPage(1);
    
    // Refetch data with new filters
    setTimeout(() => {
      refetch();
    }, 0);
  };
  
  // Calculate pagination data
  const paginationData = useMemo(() => {
    const totalItems = waterSchemeData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentPageData = waterSchemeData.slice(startIndex, endIndex);
    
    return { totalItems, totalPages, startIndex, endIndex, currentPageData };
  }, [waterSchemeData, page, itemsPerPage]);
  
  const { totalItems, totalPages, startIndex, endIndex, currentPageData } = paginationData;
  
  // Get status badge for LPCD value
  const getLpcdStatusBadge = (lpcdValue?: number | string | null) => {
    if (lpcdValue === undefined || lpcdValue === null || lpcdValue === '' || isNaN(Number(lpcdValue))) 
      return <Badge variant="outline">No data</Badge>;
    
    const numValue = Number(lpcdValue);
    
    if (numValue >= 55) {
      return <Badge className="bg-green-500">Good ({'>'}55L)</Badge>;
    } else if (numValue >= 40) {
      return <Badge className="bg-yellow-500">Average (40-55L)</Badge>;
    } else if (numValue > 0) {
      return <Badge className="bg-red-500">Low ({'<'}40L)</Badge>;
    } else {
      return <Badge className="bg-gray-500">Zero Supply</Badge>;
    }
  };
  
  // Calculate correct LPCD counts for display in detail view
  const calculateLpcdCounts = (scheme: WaterSchemeData) => {
    // Extract and convert all LPCD values
    const lpcdValues = [
      scheme.lpcd_value_day1,
      scheme.lpcd_value_day2,
      scheme.lpcd_value_day3,
      scheme.lpcd_value_day4,
      scheme.lpcd_value_day5,
      scheme.lpcd_value_day6,
      scheme.lpcd_value_day7
    ].map(val => {
      if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
        return null;
      }
      return Number(val);
    }).filter(val => val !== null) as number[];
    
    // Count days above and below 55 LPCD, exclude zero values
    const daysAbove55 = lpcdValues.filter(val => val > 0 && val >= 55).length;
    const daysBelow55 = lpcdValues.filter(val => val > 0 && val < 55).length;
    
    // Check for consistent zero supply
    const zeroCount = lpcdValues.filter(val => val === 0).length;
    const hasConsistentZeroSupply = zeroCount === 7;
    
    return {
      daysAbove55,
      daysBelow55,
      hasConsistentZeroSupply
    };
  };
  
  // Refresh data when filters change
  useEffect(() => {
    refetch();
  }, [filters, refetch]);
  
  // Show error toast if data fetching fails
  useEffect(() => {
    if (isSchemesError && schemesError) {
      toast({
        title: "Error fetching water scheme data",
        description: (schemesError as Error)?.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [isSchemesError, schemesError, toast]);

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      
      // Prepare data for export
      const exportData = waterSchemeData.map((scheme, index) => ({
        "No.": index + 1,
        "Region": scheme.region,
        "Circle": scheme.circle || "",
        "Division": scheme.division || "",
        "Sub Division": scheme.sub_division || "",
        "Block": scheme.block || "",
        "Scheme ID": scheme.scheme_id,
        "Scheme Name": scheme.scheme_name,
        "Village Name": scheme.village_name,
        "Population": scheme.population || 0,
        "Water Consumption (Latest)": getLatestWaterValue(scheme) || 0,
        "LPCD (Latest)": getLatestLpcdValue(scheme) || 0,
        "LPCD Day 1": scheme.lpcd_value_day1 || "",
        "LPCD Day 2": scheme.lpcd_value_day2 || "",
        "LPCD Day 3": scheme.lpcd_value_day3 || "",
        "LPCD Day 4": scheme.lpcd_value_day4 || "",
        "LPCD Day 5": scheme.lpcd_value_day5 || "",
        "LPCD Day 6": scheme.lpcd_value_day6 || "",
        "LPCD Day 7": scheme.lpcd_value_day7 || "",
        "Days Above 55 LPCD": scheme.above_55_lpcd_count || 0,
        "Days Below 55 LPCD": scheme.below_55_lpcd_count || 0,
        "Zero Supply Week": scheme.consistent_zero_lpcd_for_a_week ? 'Yes' : 'No'
      }));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LPCD Data');

      // Add header row
      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      exportData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4F46E5' }
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (column.header) {
          column.width = Math.max(column.header.toString().length + 2, 12);
        }
      });

      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const filename = `village_lpcd_data_${filters.region || 'all_regions'}_${new Date().toISOString().split('T')[0]}`;
      link.download = `${filename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `LPCD data exported to ${filename}.xlsx`,
      });

      // Track the export
      trackDataExport('village_lpcd_dashboard', 'Excel', waterSchemeData.length.toString());
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export LPCD data to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to get latest water value
  const getLatestWaterValue = (scheme: WaterSchemeData): number | null => {
    const values = [
      scheme.water_value_day6,
      scheme.water_value_day5,
      scheme.water_value_day4,
      scheme.water_value_day3,
      scheme.water_value_day2,
      scheme.water_value_day1,
    ];

    for (const value of values) {
      if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          return numValue;
        }
      }
    }

    return null;
  };

  // Helper function to get latest LPCD value
  const getLatestLpcdValue = (scheme: WaterSchemeData): number | null => {
    const values = [
      scheme.lpcd_value_day7,
      scheme.lpcd_value_day6,
      scheme.lpcd_value_day5,
      scheme.lpcd_value_day4,
      scheme.lpcd_value_day3,
      scheme.lpcd_value_day2,
      scheme.lpcd_value_day1,
    ];

    for (const value of values) {
      if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          return numValue;
        }
      }
    }

    return null;
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>LPCD Dashboard</CardTitle>
          <CardDescription>View and analyze LPCD (Liters Per Capita per Day) metrics for water schemes</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select 
                value={filters.region}
                onValueChange={(value) => handleFilterChange('region', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regionsData.map((region) => (
                    <SelectItem key={region.region_id} value={region.region_name}>
                      {region.region_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    LPCD Range
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by LPCD</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('all')}>
                    All LPCD values
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('above55')}>
                    Above 55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('below55')}>
                    Below 55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('40to55')}>
                    Between 40-55 LPCD
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleLpcdRangeSelect('zerosupply')}>
                    Zero supply for a week
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex gap-2">
              <div className="w-28">
                <Input 
                  type="number"
                  placeholder="Min LPCD" 
                  value={filters.minLpcd}
                  onChange={(e) => handleFilterChange('minLpcd', e.target.value)}
                />
              </div>
              <div className="w-28">
                <Input 
                  type="number"
                  placeholder="Max LPCD" 
                  value={filters.maxLpcd}
                  onChange={(e) => handleFilterChange('maxLpcd', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Data Table Section */}
          {isLoadingSchemes ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-12" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableCaption>
                  {totalItems === 0 ? 'No water scheme data available' : `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} water schemes`}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Scheme ID</TableHead>
                    <TableHead>Scheme Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead className="text-right">Water Consumption (Latest)</TableHead>
                    <TableHead className="text-right">LPCD (Latest)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageData.map((scheme) => (
                    <TableRow key={`${scheme.scheme_id}-${scheme.village_name || 'unknown'}`}>
                      <TableCell>{scheme.region || 'N/A'}</TableCell>
                      <TableCell>{scheme.scheme_id.split('-')[0]}</TableCell>
                      <TableCell>{scheme.scheme_name || 'N/A'}</TableCell>
                      <TableCell>{scheme.village_name || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        {scheme.water_value_day6 !== null && scheme.water_value_day6 !== undefined && scheme.water_value_day6 !== '' 
                          ? parseFloat(String(scheme.water_value_day6)) 
                          : (scheme.water_value_day5 !== null && scheme.water_value_day5 !== undefined && scheme.water_value_day5 !== '' 
                            ? parseFloat(String(scheme.water_value_day5))
                            : (scheme.water_value_day4 !== null && scheme.water_value_day4 !== undefined && scheme.water_value_day4 !== '' 
                              ? parseFloat(String(scheme.water_value_day4))
                              : (
                                <Badge variant="outline" className="bg-gray-100">
                                  <span className="text-gray-600 text-sm">No data recorded</span>
                                </Badge>
                              )
                            )
                          )
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {scheme.lpcd_value_day7 !== null && scheme.lpcd_value_day7 !== undefined && scheme.lpcd_value_day7 !== '' 
                          ? parseFloat(String(scheme.lpcd_value_day7)) 
                          : (scheme.lpcd_value_day6 !== null && scheme.lpcd_value_day6 !== undefined && scheme.lpcd_value_day6 !== '' 
                            ? parseFloat(String(scheme.lpcd_value_day6))
                            : (scheme.lpcd_value_day5 !== null && scheme.lpcd_value_day5 !== undefined && scheme.lpcd_value_day5 !== '' 
                              ? parseFloat(String(scheme.lpcd_value_day5))
                              : (
                                <Badge variant="outline" className="bg-gray-100">
                                  <span className="text-gray-600 text-sm">No data recorded</span>
                                </Badge>
                              )
                            )
                          )
                        }
                      </TableCell>
                      <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day7 || scheme.lpcd_value_day6 || scheme.lpcd_value_day5)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <Dialog>
                              <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  View Weekly Data
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl bg-blue-50">
                                <DialogHeader className="bg-blue-100 p-4 rounded-t-lg">
                                  <DialogTitle className="text-blue-800">
                                    {scheme.scheme_name || scheme.scheme_id.split('-')[0]} - {scheme.village_name} Weekly LPCD Data
                                  </DialogTitle>
                                  <DialogDescription className="text-blue-600">
                                    Water consumption and LPCD data for the past week (April 11-17, 2025)
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="mt-4">
                                  <Table>
                                    <TableHeader className="bg-blue-100">
                                      <TableRow>
                                        <TableHead className="text-blue-800">Metric</TableHead>
                                        <TableHead className="text-blue-800">Day 1 (Apr 11)</TableHead>
                                        <TableHead className="text-blue-800">Day 2 (Apr 12)</TableHead>
                                        <TableHead className="text-blue-800">Day 3 (Apr 13)</TableHead>
                                        <TableHead className="text-blue-800">Day 4 (Apr 14)</TableHead>
                                        <TableHead className="text-blue-800">Day 5 (Apr 15)</TableHead>
                                        <TableHead className="text-blue-800">Day 6 (Apr 16)</TableHead>
                                        <TableHead className="text-blue-800">Day 7 (Apr 17)</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody className="bg-white">
                                      <TableRow className="hover:bg-blue-50">
                                        <TableCell className="font-medium text-blue-800">Water Consumption</TableCell>
                                        <TableCell>
                                          {scheme.water_value_day1 !== null && scheme.water_value_day1 !== undefined && scheme.water_value_day1 !== '' 
                                            ? parseFloat(String(scheme.water_value_day1)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day2 !== null && scheme.water_value_day2 !== undefined && scheme.water_value_day2 !== '' 
                                            ? parseFloat(String(scheme.water_value_day2)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day3 !== null && scheme.water_value_day3 !== undefined && scheme.water_value_day3 !== '' 
                                            ? parseFloat(String(scheme.water_value_day3)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day4 !== null && scheme.water_value_day4 !== undefined && scheme.water_value_day4 !== '' 
                                            ? parseFloat(String(scheme.water_value_day4)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day5 !== null && scheme.water_value_day5 !== undefined && scheme.water_value_day5 !== '' 
                                            ? parseFloat(String(scheme.water_value_day5)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.water_value_day6 !== null && scheme.water_value_day6 !== undefined && scheme.water_value_day6 !== '' 
                                            ? parseFloat(String(scheme.water_value_day6)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell><span className="text-gray-500 text-sm">No data</span></TableCell>
                                      </TableRow>
                                      <TableRow className="hover:bg-blue-50">
                                        <TableCell className="font-medium text-blue-800">LPCD</TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day1 !== null && scheme.lpcd_value_day1 !== undefined && scheme.lpcd_value_day1 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day1)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day2 !== null && scheme.lpcd_value_day2 !== undefined && scheme.lpcd_value_day2 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day2)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day3 !== null && scheme.lpcd_value_day3 !== undefined && scheme.lpcd_value_day3 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day3)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day4 !== null && scheme.lpcd_value_day4 !== undefined && scheme.lpcd_value_day4 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day4)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day5 !== null && scheme.lpcd_value_day5 !== undefined && scheme.lpcd_value_day5 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day5)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day6 !== null && scheme.lpcd_value_day6 !== undefined && scheme.lpcd_value_day6 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day6)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                        <TableCell>
                                          {scheme.lpcd_value_day7 !== null && scheme.lpcd_value_day7 !== undefined && scheme.lpcd_value_day7 !== '' 
                                            ? parseFloat(String(scheme.lpcd_value_day7)) 
                                            : <span className="text-gray-500 text-sm">No data</span>}
                                        </TableCell>
                                      </TableRow>
                                      <TableRow className="hover:bg-blue-50">
                                        <TableCell className="font-medium text-blue-800">Status</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day1)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day2)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day3)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day4)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day5)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day6)}</TableCell>
                                        <TableCell>{getLpcdStatusBadge(scheme.lpcd_value_day7)}</TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                  
                                  <div className="mt-6 flex justify-between bg-blue-100 p-4 rounded-lg">
                                    <div className="text-blue-800">
                                      <p className="mb-2"><strong>Village:</strong> {scheme.village_name}</p>
                                      <p className="mb-2"><strong>Region:</strong> {scheme.region}</p>
                                      <p className="mb-2"><strong>Population:</strong> {scheme.population || 'N/A'}</p>
                                    </div>
                                    <div className="text-blue-800">
                                      {(() => {
                                        // Calculate accurate counts on-the-fly
                                        const { daysAbove55, daysBelow55, hasConsistentZeroSupply } = calculateLpcdCounts(scheme);
                                        
                                        return (
                                          <>
                                            <p className="mb-2">
                                              <strong>Days above 55 LPCD:</strong> <span className="text-green-600 font-semibold">{daysAbove55}</span>
                                            </p>
                                            <p className="mb-2">
                                              <strong>Days below 55 LPCD:</strong> <span className="text-red-600 font-semibold">{daysBelow55}</span>
                                            </p>
                                            <p className="mb-2">
                                              <strong>Zero supply for a week:</strong> <span className={hasConsistentZeroSupply ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                                {hasConsistentZeroSupply ? 'Yes' : 'No'}
                                              </span>
                                            </p>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                        className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum: number;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                        if (i === 4) pageNum = totalPages;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                        if (i === 0) pageNum = 1;
                      } else {
                        pageNum = page - 2 + i;
                        if (i === 0) pageNum = 1;
                        if (i === 4) pageNum = totalPages;
                      }
                      
                      if ((i === 1 && pageNum !== 2) || (i === 3 && pageNum !== totalPages - 1)) {
                        return (
                          <PaginationItem key={i}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={page === pageNum}
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                        className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LpcdDashboard;