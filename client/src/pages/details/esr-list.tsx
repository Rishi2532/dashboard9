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

interface ESRDetailProps {
  village_name: string;
  esr_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_name: string;
  current_value?: number;
  sensor_status?: string;
  data_type: 'chlorine' | 'pressure';
  category: string;
}

export default function ESRListPage() {
  const [location, navigate] = useLocation();
  
  // Parse URL parameters
  const queryString = location.includes('?') ? location.split('?')[1] : '';
  const urlParams = new URLSearchParams(queryString);
  const region = urlParams.get('region') || '';
  const category = urlParams.get('category') || '';
  const dataType = urlParams.get('type') as 'chlorine' | 'pressure' || 'chlorine';
  
  // Debug URL parsing  
  console.log('ESR List Raw location:', location);
  console.log('ESR List Query string:', queryString);
  console.log('ESR List URL Params:', Object.fromEntries(urlParams.entries()));
  console.log('ESR List URL params:', { region, category, dataType, location });
  
  // Ensure we have valid parameters for filtering
  if (!region || !category || !dataType) {
    console.warn('ESR List: Missing required URL parameters - region:', region, 'category:', category, 'dataType:', dataType);
  }
  
  // Early return if we don't have the required parameters
  if (!category || category === '') {
    console.error('ESR List: No category specified, cannot filter ESRs');
  }
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Fetch sensor data based on type
  const { data: sensorData, isLoading } = useQuery({
    queryKey: dataType === 'chlorine' ? ["/api/chlorine"] : ["/api/pressure"],
    enabled: true,
  });
  
  // Fetch sensors with water data (same data source as dashboard mini-tables)
  const { data: sensorsWithWaterData } = useQuery({
    queryKey: dataType === 'chlorine' ? ["/api/chlorine/with-water-sensors"] : ["/api/pressure/with-water-sensors"],
    queryFn: async () => {
      const endpoint = dataType === 'chlorine' ? "/api/chlorine/with-water-sensors" : "/api/pressure/with-water-sensors";
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Failed to fetch ${dataType} sensors with water`);
      return response.json();
    },
    enabled: true,
  });

  // Filter ESRs based on category and region
  const filteredESRs: ESRDetailProps[] = useMemo(() => {
    if (!sensorData || !Array.isArray(sensorData) || !sensorsWithWaterData?.data?.withWaterSensors) {
      console.log('ESR List: Missing data - sensorData:', !!sensorData, 'sensorsWithWaterData:', !!sensorsWithWaterData?.data?.withWaterSensors);
      return [];
    }
    
    // Create a Set of sensor IDs that have water (same logic as dashboard mini-tables)
    const withWaterSensorIds = new Set(
      sensorsWithWaterData.data.withWaterSensors.map((sensor: any) => 
        `${sensor.scheme_id}|${sensor.village_name}|${sensor.esr_name}`
      )
    );
    
    console.log(`ESR List: Found ${withWaterSensorIds.size} ESRs with water for region ${region}`);
    console.log('ESR List: Filtering params:', { region, category, dataType });
    console.log('ESR List: Sample withWaterSensorIds:', Array.from(withWaterSensorIds).slice(0, 5));
    
    const finalResults = sensorData
      .filter((item: any) => {
        // Filter by region first (same as chlorine/pressure page approach)
        if (region && region !== 'TOTAL' && item.region !== region) return false;
        
        // Only include ESRs that have water (same logic as dashboard stats)
        const sensorKey = `${item.scheme_id}|${item.village_name}|${item.esr_name}`;
        const hasWater = withWaterSensorIds.has(sensorKey);
        if (!hasWater) return false;
        
        // Filter based on category and data type using EXACT dashboard logic
        if (dataType === 'chlorine') {
          const chlorineValue = item.chlorine_value_7 !== null ? parseFloat(String(item.chlorine_value_7)) : null;
          console.log(`ESR List: Checking ${item.village_name} - chlorine_value_7: ${item.chlorine_value_7}, parsed: ${chlorineValue}, category: ${category}`);
          
          switch (category) {
            case 'optimal':
              // OPTIMAL RANGE (0.2-0.5): chlorine_value_7 between 0.2 and 0.5
              const isOptimal = chlorineValue !== null && chlorineValue >= 0.2 && chlorineValue <= 0.5;
              console.log(`ESR List: ${item.village_name} optimal check: ${isOptimal}`);
              return isOptimal;
            case 'above-range':
              // ABOVE RANGE (>0.5): chlorine_value_7 > 0.5
              return chlorineValue !== null && chlorineValue > 0.5;
            case 'below-range':
              // BELOW RANGE (<0.2): chlorine_value_7 < 0.2 or null
              return chlorineValue === null || (chlorineValue >= 0 && chlorineValue < 0.2);
            case 'consistent-below':
              // CONSISTENT BELOW: All 7 days chlorine < 0.2
              const chlorineBelowValues = [
                item.chlorine_value_1, item.chlorine_value_2, item.chlorine_value_3,
                item.chlorine_value_4, item.chlorine_value_5, item.chlorine_value_6, item.chlorine_value_7
              ].filter(val => val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(String(val))))
               .map(val => parseFloat(String(val)));
              return chlorineBelowValues.length > 0 && chlorineBelowValues.every(val => val < 0.2);
            case 'consistent-optimal':
              // CONSISTENT OPTIMAL: All 7 days chlorine between 0.2-0.5
              const chlorineOptimalValues = [
                item.chlorine_value_1, item.chlorine_value_2, item.chlorine_value_3,
                item.chlorine_value_4, item.chlorine_value_5, item.chlorine_value_6, item.chlorine_value_7
              ].filter(val => val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(String(val))))
               .map(val => parseFloat(String(val)));
              return chlorineOptimalValues.length > 0 && chlorineOptimalValues.every(val => val >= 0.2 && val <= 0.5);
            case 'consistent-above':
              // CONSISTENT ABOVE: All 7 days chlorine > 0.5
              const chlorineAboveValues = [
                item.chlorine_value_1, item.chlorine_value_2, item.chlorine_value_3,
                item.chlorine_value_4, item.chlorine_value_5, item.chlorine_value_6, item.chlorine_value_7
              ].filter(val => val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(String(val))))
               .map(val => parseFloat(String(val)));
              return chlorineAboveValues.length > 0 && chlorineAboveValues.every(val => val > 0.5);
            default:
              console.log(`ESR List: Unknown chlorine category '${category}', rejecting item`);
              return false;
          }
        } else {
          // Pressure data filtering
          const pressureValue = item.pressure_value_7 !== null ? parseFloat(String(item.pressure_value_7)) : null;
          
          switch (category) {
            case 'optimal':
              // OPTIMAL RANGE (0.2-0.7): pressure_value_7 between 0.2 and 0.7
              return pressureValue !== null && pressureValue >= 0.2 && pressureValue <= 0.7;
            case 'above-range':
              // ABOVE RANGE (>0.7): pressure_value_7 > 0.7
              return pressureValue !== null && pressureValue > 0.7;
            case 'below-range':
              // BELOW RANGE (<0.2): pressure_value_7 < 0.2 or null
              return pressureValue === null || (pressureValue >= 0 && pressureValue < 0.2);
            case 'consistent-below':
              // CONSISTENT BELOW: All 7 days pressure < 0.2
              const pressureBelowValues = [
                item.pressure_value_1, item.pressure_value_2, item.pressure_value_3,
                item.pressure_value_4, item.pressure_value_5, item.pressure_value_6, item.pressure_value_7
              ].filter(val => val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(String(val))))
               .map(val => parseFloat(String(val)));
              return pressureBelowValues.length > 0 && pressureBelowValues.every(val => val < 0.2);
            case 'consistent-optimal':
              // CONSISTENT OPTIMAL: All 7 days pressure between 0.2-0.7
              const pressureOptimalValues = [
                item.pressure_value_1, item.pressure_value_2, item.pressure_value_3,
                item.pressure_value_4, item.pressure_value_5, item.pressure_value_6, item.pressure_value_7
              ].filter(val => val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(String(val))))
               .map(val => parseFloat(String(val)));
              return pressureOptimalValues.length > 0 && pressureOptimalValues.every(val => val >= 0.2 && val <= 0.7);
            case 'consistent-above':
              // CONSISTENT ABOVE: All 7 days pressure > 0.7
              const pressureAboveValues = [
                item.pressure_value_1, item.pressure_value_2, item.pressure_value_3,
                item.pressure_value_4, item.pressure_value_5, item.pressure_value_6, item.pressure_value_7
              ].filter(val => val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(String(val))))
               .map(val => parseFloat(String(val)));
              return pressureAboveValues.length > 0 && pressureAboveValues.every(val => val > 0.7);
            default:
              console.log(`ESR List: Unknown pressure category '${category}', rejecting item`);
              return false;
          }
        }
      })
      .map((item: any) => ({
        village_name: item.village_name || 'Unknown Village',
        esr_name: item.esr_name || 'Unknown ESR',
        region: item.region || 'Unknown Region',
        circle: item.circle || 'Unknown Circle',
        division: item.division || 'Unknown Division',
        sub_division: item.sub_division || 'Unknown Sub Division',
        block: item.block || 'Unknown Block',
        scheme_name: item.scheme_name || 'Unknown Scheme',
        current_value: dataType === 'chlorine' ? item.chlorine_value_7 : item.pressure_value_7,
        sensor_status: dataType === 'chlorine' ? item.chlorine_status : item.pressure_status,
        data_type: dataType,
        category,
      }));
      
    console.log(`ESR List: Final filtered results: ${finalResults.length} ESRs`);
    if (finalResults.length > 0) {
      console.log('ESR List: Sample results:', finalResults.slice(0, 2));
    }
    
    return finalResults;
  }, [sensorData, sensorsWithWaterData, region, category, dataType]);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredESRs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedESRs = filteredESRs.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [region, category, dataType]);

  const getCategoryTitle = () => {
    const sensorType = dataType === 'chlorine' ? 'Chlorine' : 'Pressure';
    
    switch (category) {
      case 'optimal':
        return `ESRs with Optimal ${sensorType} Range`;
      case 'above-range':
        return `ESRs with Above Range ${sensorType}`;
      case 'below-range':
        return `ESRs with Below Range ${sensorType}`;
      case 'consistent-below':
        return `ESRs with Consistent Below Range ${sensorType}`;
      case 'consistent-optimal':
        return `ESRs with Consistent Optimal ${sensorType}`;
      case 'consistent-above':
        return `ESRs with Consistent Above Range ${sensorType}`;
      default:
        return `${sensorType} ESR List`;
    }
  };

  const getBadgeVariant = (category: string) => {
    switch (category) {
      case 'optimal':
      case 'consistent-optimal':
        return 'default'; // green
      case 'below-range':
      case 'consistent-below':
        return 'destructive'; // red
      case 'above-range':
      case 'consistent-above':
        return 'secondary'; // orange
      default:
        return 'outline';
    }
  };

  const getValueDisplay = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return dataType === 'chlorine' ? `${value} mg/L` : `${value} kg/cm²`;
  };

  const handleExportCSV = () => {
    const headers = ['Village Name', 'ESR Name', 'Region', 'Circle', 'Division', 'Sub Division', 'Block', 'Scheme Name', `Current ${dataType === 'chlorine' ? 'Chlorine' : 'Pressure'}`, 'Sensor Status'];
    const csvContent = [
      headers.join(','),
      ...filteredESRs.map(esr => [
        `"${esr.village_name}"`,
        `"${esr.esr_name}"`,
        `"${esr.region}"`,
        `"${esr.circle}"`,
        `"${esr.division}"`,
        `"${esr.sub_division}"`,
        `"${esr.block}"`,
        `"${esr.scheme_name}"`,
        esr.current_value || 'N/A',
        `"${esr.sensor_status || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}-${dataType}-esrs-${region.toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const headers = ['Village Name', 'ESR Name', 'Region', 'Circle', 'Division', 'Sub Division', 'Block', 'Scheme Name', `Current ${dataType === 'chlorine' ? 'Chlorine' : 'Pressure'}`, 'Sensor Status'];
    const excelData = [
      headers,
      ...filteredESRs.map(esr => [
        esr.village_name,
        esr.esr_name,
        esr.region,
        esr.circle,
        esr.division,
        esr.sub_division,
        esr.block,
        esr.scheme_name,
        esr.current_value || 'N/A',
        esr.sensor_status || 'N/A'
      ])
    ];

    const tsvContent = excelData.map(row => row.join('\t')).join('\n');
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}-${dataType}-esrs-${region.toLowerCase()}.xls`;
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
                  {region && region !== 'TOTAL' ? `${region} Region` : 'All Regions'} • {filteredESRs.length} ESRs
                  {region && category && ` (Category: ${category})`}
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

          {/* ESRs Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold min-w-[140px] sticky left-0 bg-gray-50 z-10 border-r">Village Name</TableHead>
                    <TableHead className="font-semibold min-w-[160px]">ESR Name</TableHead>
                    <TableHead className="font-semibold min-w-[100px]">Region</TableHead>
                    <TableHead className="font-semibold min-w-[80px]">Circle</TableHead>
                    <TableHead className="font-semibold min-w-[100px]">Division</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Sub Division</TableHead>
                    <TableHead className="font-semibold min-w-[80px]">Block</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Current {dataType === 'chlorine' ? 'Chlorine' : 'Pressure'}</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Sensor Status</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Scheme Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedESRs.map((esr, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium min-w-[140px] sticky left-0 bg-white z-10 border-r">
                        {esr.village_name}
                      </TableCell>
                      <TableCell className="min-w-[160px]">{esr.esr_name}</TableCell>
                      <TableCell className="min-w-[100px]">{esr.region}</TableCell>
                      <TableCell className="min-w-[80px]">{esr.circle}</TableCell>
                      <TableCell className="min-w-[100px]">{esr.division}</TableCell>
                      <TableCell className="min-w-[120px]">{esr.sub_division}</TableCell>
                      <TableCell className="min-w-[80px]">{esr.block}</TableCell>
                      <TableCell className="min-w-[140px]">
                        <Badge variant={getBadgeVariant(category)}>
                          {getValueDisplay(esr.current_value)}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <span className="text-sm font-medium">{esr.sensor_status || 'N/A'}</span>
                      </TableCell>
                      <TableCell className="min-w-[200px]" title={esr.scheme_name}>
                        {esr.scheme_name}
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredESRs.length)} of {filteredESRs.length} ESRs
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

          {filteredESRs.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-gray-500">No ESRs found for the selected criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}