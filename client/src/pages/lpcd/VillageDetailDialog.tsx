import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye } from 'lucide-react';

// Import the interface type from parent component
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
  water_value_day7?: number | string;
  lpcd_value_day1?: number | string;
  lpcd_value_day2?: number | string;
  lpcd_value_day3?: number | string;
  lpcd_value_day4?: number | string;
  lpcd_value_day5?: number | string;
  lpcd_value_day6?: number | string;
  lpcd_value_day7?: number | string;
  // Date fields
  water_date_day1?: string;
  water_date_day2?: string;
  water_date_day3?: string;
  water_date_day4?: string;
  water_date_day5?: string;
  water_date_day6?: string;
  water_date_day7?: string;
  lpcd_date_day1?: string;
  lpcd_date_day2?: string;
  lpcd_date_day3?: string;
  lpcd_date_day4?: string;
  lpcd_date_day5?: string;
  lpcd_date_day6?: string;
  lpcd_date_day7?: string;
  consistent_zero_lpcd_for_a_week?: number | boolean;
  below_55_lpcd_count?: number;
  above_55_lpcd_count?: number;
}

interface VillageDetailDialogProps {
  scheme: WaterSchemeData;
  latestLpcd: number | null;
  getLatestLpcdValue: (scheme: WaterSchemeData) => number | null;
  calculateLpcdCounts: (scheme: WaterSchemeData) => {
    daysAbove55: number;
    daysBelow55: number;
    hasConsistentZeroSupply: boolean;
  };
  getLpcdStatusBadge: (lpcdValue: number | null) => React.ReactNode;
}

const VillageDetailDialog: React.FC<VillageDetailDialogProps> = ({
  scheme,
  latestLpcd,
  getLatestLpcdValue,
  calculateLpcdCounts,
  getLpcdStatusBadge,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[90vw]">
        <DialogHeader className="bg-blue-100 p-4 rounded-t-lg">
          <DialogTitle className="text-blue-800 text-xl">
            {scheme.village_name} - {scheme.scheme_name}
          </DialogTitle>
          <DialogDescription className="text-blue-700">
            Scheme ID: {scheme.scheme_id.split('-')[0]}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 bg-gradient-to-b from-blue-50 to-white">
          {/* Water Scheme Details Section */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-700">Water Scheme Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Region</p>
                <p className="font-medium">{scheme.region || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Circle</p>
                <p className="font-medium">{scheme.circle || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Division</p>
                <p className="font-medium">{scheme.division || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Sub Division</p>
                <p className="font-medium">{scheme.sub_division || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Block</p>
                <p className="font-medium">{scheme.block || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-500">Population</p>
                <p className="font-medium">{scheme.population || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* LPCD Statistics Section */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-700">LPCD Statistics</h3>

            {(() => {
              const { daysAbove55, daysBelow55, hasConsistentZeroSupply } = calculateLpcdCounts(scheme);

              return (
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px] bg-green-50 p-3 rounded-md border border-green-100">
                    <p className="text-sm text-gray-600">Days above 55 LPCD</p>
                    <p className="font-medium text-xl text-green-600">{daysAbove55}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] bg-yellow-50 p-3 rounded-md border border-yellow-100">
                    <p className="text-sm text-gray-600">Days below 55 LPCD</p>
                    <p className="font-medium text-xl text-yellow-600">{daysBelow55}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] bg-gray-50 p-3 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-600">Zero supply for a week</p>
                    <p className="font-medium text-xl">{hasConsistentZeroSupply ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] bg-blue-50 p-3 rounded-md border border-blue-100">
                    <p className="text-sm text-gray-600">Current Status</p>
                    <div className="font-medium mt-1">{getLpcdStatusBadge(latestLpcd)}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* LPCD Values & Water Consumption Section */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-700">LPCD Values & Water Consumption (Last 7 Days)</h3>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Water Consumption</TableHead>
                    <TableHead className="text-right">LPCD Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // First, get all LPCD dates and create a mapping from date to values
                    const dateToLpcdValue: Record<string, number | null> = {};
                    const dateToWaterValue: Record<string, number | null> = {};
                    const allDates: string[] = [];

                    // Process LPCD values and dates
                    for (let day = 1; day <= 7; day++) {
                      const dateField = `lpcd_date_day${day}` as keyof WaterSchemeData;
                      const valueField = `lpcd_value_day${day}` as keyof WaterSchemeData;

                      // Safely extract date string
                      const dateValue = scheme[dateField];
                      const dateStr = typeof dateValue === 'string' ? dateValue : '';

                      // Safely extract value 
                      const valueRaw = scheme[valueField];
                      const valueStr = valueRaw !== undefined ? String(valueRaw) : '';

                      if (dateStr) {
                        // Store the date
                        if (!allDates.includes(dateStr)) {
                          allDates.push(dateStr);
                        }

                        // Parse and store the LPCD value
                        const numValue = Number(valueStr);
                        if (valueStr && !isNaN(numValue)) {
                          dateToLpcdValue[dateStr] = numValue;
                        } else {
                          dateToLpcdValue[dateStr] = null;
                        }
                      }
                    }

                    // Process water consumption values
                    for (let day = 1; day <= 7; day++) {
                      const dateField = `water_date_day${day}` as keyof WaterSchemeData;
                      const valueField = `water_value_day${day}` as keyof WaterSchemeData;

                      // Safely extract date string
                      const dateValue = scheme[dateField];
                      const dateStr = typeof dateValue === 'string' ? dateValue : '';

                      // Safely extract value
                      const valueRaw = scheme[valueField];
                      const valueStr = valueRaw !== undefined ? String(valueRaw) : '';

                      if (dateStr) {
                        // Store the date if not already stored
                        if (!allDates.includes(dateStr)) {
                          allDates.push(dateStr);
                        }

                        // Parse and store the water consumption value for its CORRECT date
                        const numValue = Number(valueStr);
                        if (valueStr && !isNaN(numValue)) {
                          dateToWaterValue[dateStr] = numValue;
                        } else {
                          dateToWaterValue[dateStr] = null;
                        }
                      }
                    }

                    // Sort dates in chronological order (oldest first)
                    allDates.sort((a, b) => {
                      // Simple string comparison works for DD-MMM format
                      return a.localeCompare(b);
                    });

                    // Generate table rows for each date
                    return allDates.map((dateStr, index) => {
                      const lpcdValue = dateToLpcdValue[dateStr] !== undefined ? dateToLpcdValue[dateStr] : null;
                      const waterValue = dateToWaterValue[dateStr] !== undefined ? dateToWaterValue[dateStr] : null;

                      return (
                        <TableRow key={`date-${dateStr}-${index}`}>
                          <TableCell>{dateStr}</TableCell>
                          <TableCell className="text-right">
                            {waterValue !== null ? waterValue : (
                              <Badge variant="outline" className="bg-gray-100">
                                <span className="text-gray-600 text-sm">No data</span>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {lpcdValue !== null ? lpcdValue : (
                              <Badge variant="outline" className="bg-gray-100">
                                <span className="text-gray-600 text-sm">No data</span>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{getLpcdStatusBadge(lpcdValue)}</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VillageDetailDialog;