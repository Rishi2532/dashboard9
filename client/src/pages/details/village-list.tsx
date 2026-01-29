import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/components/dashboard/header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VillageDetailProps {
  village_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_name: string;
  esr_name: string;
  current_lpcd?: number;
  water_status?: string;
  consistent_days?: number;
}

export default function VillageListPage() {
  const [location, navigate] = useLocation();
  
  // Parse URL parameters - be more explicit about URL parsing
  const queryString = location.includes('?') ? location.split('?')[1] : '';
  const urlParams = new URLSearchParams(queryString);
  const region = urlParams.get('region') || '';
  const category = urlParams.get('category') || '';
  const dataType = urlParams.get('type') || 'water';
  
  // Debug URL parsing
  console.log('Raw location:', location);
  console.log('Query string:', queryString);
  console.log('URL Params object:', Object.fromEntries(urlParams.entries()));
  
  console.log('Village List URL params:', { region, category, dataType, location });
  console.log('Full URL:', window.location.href);
  console.log('Current search params:', window.location.search);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Fetch filtered water scheme data directly from server
  const { data: waterData, isLoading } = useQuery({
    queryKey: ["/api/water-scheme-data/villages/filtered", region, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      if (category) params.append('category', category);
      
      const url = `/api/water-scheme-data/villages/filtered?${params.toString()}`;
      console.log('Fetching village data from:', url);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch village data');
      return response.json();
    },
    enabled: true,
  });

  // Helper functions that match the dashboard logic
  const getLatestLpcdValue = (village: any): number | null => {
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = village[`lpcd_value_day${day}`];
      if (value !== undefined && value !== null && value !== "" && !isNaN(Number(value))) {
        return Number(value);
      }
    }
    return null;
  };

  const hasConsistentZeroWaterSupply = (village: any): boolean => {
    const waterValues = [
      village.water_value_day1, village.water_value_day2, village.water_value_day3,
      village.water_value_day4, village.water_value_day5, village.water_value_day6, village.water_value_day7,
    ];
    return waterValues.every((value) => {
      if (value === null || value === undefined) return true; // null/undefined means no data = 0
      const numVal = Number(value);
      return !isNaN(numVal) && numVal === 0;
    });
  };

  const isConsistentlyAboveThreshold = (village: any, threshold: number): boolean => {
    const lpcdValues = [
      village.lpcd_value_day1, village.lpcd_value_day2, village.lpcd_value_day3,
      village.lpcd_value_day4, village.lpcd_value_day5, village.lpcd_value_day6, village.lpcd_value_day7,
    ]
      .filter(val => val !== undefined && val !== null && val !== "" && !isNaN(Number(val)))
      .map(val => Number(val));
    
    if (lpcdValues.length === 0) return false;
    return lpcdValues.every(val => val >= threshold);
  };

  const isConsistentlyBelowThreshold = (village: any, threshold: number): boolean => {
    const lpcdValues = [
      village.lpcd_value_day1, village.lpcd_value_day2, village.lpcd_value_day3,
      village.lpcd_value_day4, village.lpcd_value_day5, village.lpcd_value_day6, village.lpcd_value_day7,
    ]
      .filter(val => val !== undefined && val !== null && val !== "" && !isNaN(Number(val)))
      .map(val => Number(val));
    
    if (lpcdValues.length === 0) return false;
    return lpcdValues.every(val => val < threshold);
  };

  // Use server-filtered data directly (backend already does the filtering)
  const filteredVillages: VillageDetailProps[] = useMemo(() => {
    // Handle server response format: { success: true, data: array, count: number }
    const actualData = waterData?.data || waterData;
    if (!actualData || !Array.isArray(actualData)) {
      console.log("No server-filtered data available or data is not an array");
      console.log("Received waterData:", waterData);
      return [];
    }

    console.log(`Received ${actualData.length} pre-filtered villages from server for region: '${region}', category: '${category}'`);
    console.log('First few items:', actualData.slice(0, 3).map(item => ({ village: item.village_name, region: item.region })));
    
    // Server has already applied all filtering, just transform the data for display
    return actualData.map((item: any) => ({
      village_name: item.village_name || 'Unknown Village',
      region: item.region || 'Unknown Region',
      circle: item.circle || 'Unknown Circle',
      division: item.division || 'Unknown Division',
      sub_division: item.sub_division || 'Unknown Sub Division',
      block: item.block || 'Unknown Block',
      scheme_name: item.scheme_name || 'Unknown Scheme',
      esr_name: item.esr_name || 'Unknown ESR',
      current_lpcd: getLatestLpcdValue(item) || 0,
      water_status: item.water_status || (parseFloat(item.water_value_day7 || 0) > 0 ? `${parseFloat(item.water_value_day7 || 0).toFixed(2)} LL` : '0.00 LL'),
      consistent_days: item.consistent_water_days || 0,
    }));
  }, [waterData, region, category]);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredVillages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVillages = filteredVillages.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [region, category]);

  const getCategoryTitle = () => {
    switch (category) {
      case 'consistent-water':
        return 'Villages with Consistent Water Supply (7 Days)';
      case 'zero-water':
        return 'Villages with Zero Water Supply (7 Days)';
      case 'above-55-lpcd':
        return 'Villages Above 55 LPCD';
      case 'below-55-lpcd':
        return 'Villages Below 55 LPCD';
      case 'consistent-above-55':
        return 'Villages Consistently Above 55 LPCD';
      case 'consistent-below-55':
        return 'Villages Consistently Below 55 LPCD';
      default:
        return 'Village List';
    }
  };

  const getBadgeVariant = (category: string) => {
    switch (category) {
      case 'consistent-water':
      case 'above-55-lpcd':
      case 'consistent-above-55':
        return 'default'; // green
      case 'zero-water':
        return 'destructive'; // red
      case 'below-55-lpcd':
      case 'consistent-below-55':
        return 'secondary'; // orange
      default:
        return 'outline';
    }
  };

  const handleExportCSV = () => {
    const headers = ['Village Name', 'Region', 'Circle', 'Division', 'Sub Division', 'Block', 'Scheme Name', 'ESR Name', 'Current LPCD', 'Water Status'];
    const csvContent = [
      headers.join(','),
      ...filteredVillages.map(village => [
        `"${village.village_name}"`,
        `"${village.region}"`,
        `"${village.circle}"`,
        `"${village.division}"`,
        `"${village.sub_division}"`,
        `"${village.block}"`,
        `"${village.scheme_name}"`,
        `"${village.esr_name}"`,
        village.current_lpcd || 'N/A',
        `"${village.water_status || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}-villages-${region.toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    // Create Excel-compatible data
    const headers = ['Village Name', 'Region', 'Circle', 'Division', 'Sub Division', 'Block', 'Scheme Name', 'ESR Name', 'Current LPCD', 'Water Status'];
    const excelData = [
      headers,
      ...filteredVillages.map(village => [
        village.village_name,
        village.region,
        village.circle,
        village.division,
        village.sub_division,
        village.block,
        village.scheme_name,
        village.esr_name,
        village.current_lpcd || 'N/A',
        village.water_status || 'N/A'
      ])
    ];

    // Convert to TSV format (Tab-separated values work better for Excel)
    const tsvContent = excelData.map(row => row.join('\t')).join('\n');
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}-villages-${region.toLowerCase()}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
        <Header />
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {getCategoryTitle()}
                </h1>
                <p className="text-gray-600">
                  {region && region !== 'TOTAL' ? `${region} Region` : 'All Regions'} • {filteredVillages.length} villages
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={handleExportExcel}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {/* Villages Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold min-w-[140px] sticky left-0 bg-gray-50 z-10 border-r">Village Name</TableHead>
                    <TableHead className="font-semibold min-w-[100px]">Region</TableHead>
                    <TableHead className="font-semibold min-w-[80px]">Circle</TableHead>
                    <TableHead className="font-semibold min-w-[100px]">Division</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Sub Division</TableHead>
                    <TableHead className="font-semibold min-w-[80px]">Block</TableHead>
                    <TableHead className="font-semibold min-w-[160px]">ESR Name</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Current LPCD</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Water Status</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Scheme Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVillages.map((village, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium min-w-[140px] sticky left-0 bg-white z-10 border-r">
                        {village.village_name}
                      </TableCell>
                      <TableCell className="min-w-[100px]">{village.region}</TableCell>
                      <TableCell className="min-w-[80px]">{village.circle}</TableCell>
                      <TableCell className="min-w-[100px]">{village.division}</TableCell>
                      <TableCell className="min-w-[120px]">{village.sub_division}</TableCell>
                      <TableCell className="min-w-[80px]">{village.block}</TableCell>
                      <TableCell className="min-w-[160px]">{village.esr_name}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <Badge variant={getBadgeVariant(category)}>
                          {village.current_lpcd ? `${village.current_lpcd} LPCD` : 'No Data'}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <span className="text-sm font-medium">{village.water_status || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="min-w-[200px]" title={village.scheme_name}>
                        {village.scheme_name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredVillages.length)} of {filteredVillages.length} villages
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {filteredVillages.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-gray-500">No villages found for the selected criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}