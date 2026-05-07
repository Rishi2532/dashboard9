import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CalendarIcon, Download, Info } from "lucide-react";
import { format, subDays } from "date-fns";

interface SchemeHistoricalDataPoint {
  id: number;
  data_date: string;
  water_value: number | null;
  lpcd_value: number | null;
  total_population: number;
  total_villages: number;
  villages_below_55: number;
  villages_above_55: number;
  villages_zero_supply: number;
}

interface SchemeHistoricalDataChartProps {
  schemeId: string;
  schemeName: string;
  region?: string;
  block?: string;
}

export function SchemeHistoricalDataChart({ schemeId, schemeName, region, block }: SchemeHistoricalDataChartProps) {
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const { data: historicalData = [], isLoading, refetch } = useQuery<SchemeHistoricalDataPoint[]>({
    queryKey: ["/api/scheme-lpcd-data/history", schemeId, startDate, endDate, region, block],
    queryFn: async () => {
      const params = new URLSearchParams({
        scheme_id: schemeId,
        start_date: startDate,
        end_date: endDate,
      });

      if (region) {
        params.append('region', region);
      }

      if (block) {
        params.append('block', block);
      }

      const response = await fetch(`/api/scheme-lpcd-data/history?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch historical data");
      }
      return response.json();
    },
    enabled: !!schemeId,
  });

  const handleDateRangeUpdate = () => {
    refetch();
  };

  const exportHistoricalData = async () => {
    try {
      const params = new URLSearchParams({
        scheme_id: schemeId,
        start_date: startDate,
        end_date: endDate,
        format: 'xlsx'
      });

      if (region) {
        params.append('region', region);
      }

      if (block) {
        params.append('block', block);
      }

      const response = await fetch(`/api/scheme-lpcd-data/export/history?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${schemeName}_historical_data_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Prepare chart data
  const chartData = historicalData.map(point => ({
    date: point.data_date,
    water: point.water_value,
    lpcd: point.lpcd_value,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading historical data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-800">Historical Trends for {schemeName}</h3>
        <Button onClick={exportHistoricalData} size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50" data-testid="button-export-scheme-history">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <div className="relative">
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-scheme-hist-start-date"
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <div className="relative">
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-scheme-hist-end-date"
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <Button onClick={handleDateRangeUpdate} variant="default" className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg font-bold shadow-sm" data-testid="button-update-scheme-hist-range">
          Update Date Range
        </Button>

        {chartData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => `Date: ${format(new Date(value), 'dd MMM yyyy')}`}
                  formatter={(value, name) => [
                    value ? Number(value).toFixed(2) : 'N/A',
                    name
                  ]}
                  contentStyle={{ 
                    borderRadius: '4px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="water"
                  stroke="#8884d8"
                  name="Water Value"
                  connectNulls={false}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="lpcd"
                  stroke="#82ca9d"
                  name="LPCD Value"
                  connectNulls={false}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No historical data available for the selected date range.
            <br />
            Historical data is automatically generated when new data is imported.
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400">
          <Info className="h-3 w-3" />
          <span>Showing {chartData.length} data points from {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}</span>
        </div>
      </div>
    );
  }
