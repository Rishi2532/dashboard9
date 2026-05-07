import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ExcelJS from "exceljs";

interface ChartDataPoint {
  date: string;
  pressure: number;
  displayValue: string;
}

interface PressureESRData {
  esr_name: string;
  chartData: ChartDataPoint[];
  averagePressure: number;
  maxPressure: number;
  minPressure: number;
}

interface PressureAnalysisChartWidgetProps {
  villageData: any[]; // Array of ESR data for the village
  selectedRegion?: string;
  selectedScheme?: string;
}

const PressureAnalysisChartWidget: React.FC<PressureAnalysisChartWidgetProps> = ({ 
  villageData, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  // Prepare chart data for each ESR
  const esrChartData: PressureESRData[] = [];
  
  if (villageData && villageData.length > 0) {
    villageData.forEach((esr) => {
      const chartData: ChartDataPoint[] = [];
      
      for (let i = 1; i <= 7; i++) {
        const dateField = `pressure_date_day_${i}`;
        const valueField = `pressure_value_${i}`;
        const date = esr[dateField] || `Day ${i}`;
        const value = parseFloat(esr[valueField] || "0");
        
        chartData.push({
          date: date,
          pressure: value,
          displayValue: `${value.toFixed(2)} bar`
        });
      }
      
      const values = chartData.map(item => item.pressure);
      const averagePressure = values.length > 0 
        ? (values.reduce((sum, val) => sum + val, 0) / values.length)
        : 0;
      
      esrChartData.push({
        esr_name: esr.esr_name || `ESR ${esrChartData.length + 1}`,
        chartData,
        averagePressure,
        maxPressure: Math.max(...values),
        minPressure: Math.min(...values)
      });
    });
  }

  // Chart configuration for Recharts
  const chartConfig: ChartConfig = {
    pressure: {
      label: "Pressure Level (bar)",
      color: "#EF4444", // Red color for pressure
    },
  };

  const handleExportToExcel = async () => {
    try {
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("7-Day Pressure Analysis");

      if (villageData.length > 0) {
        // Add village information first
        worksheet.addRow(["Village Information"]);
        worksheet.addRow(["Village Name", villageData[0]?.village_name || "N/A"]);
        worksheet.addRow(["Scheme Name", villageData[0]?.scheme_name || "N/A"]);
        worksheet.addRow(["Region", villageData[0]?.region || "N/A"]);
        worksheet.addRow(["Total ESRs", villageData.length]);
        worksheet.addRow([]); // Empty row

        // Add data for each ESR
        esrChartData.forEach((esrData, esrIndex) => {
          worksheet.addRow([`ESR: ${esrData.esr_name}`]);
          worksheet.addRow(["Day", "Date", "Pressure Level (bar)"]);
          
          esrData.chartData.forEach((item, index) => {
            worksheet.addRow([`Day ${index + 1}`, item.date, item.pressure]);
          });
          
          // Add summary for this ESR
          worksheet.addRow(["Summary", "Average", esrData.averagePressure.toFixed(2)]);
          worksheet.addRow(["", "Maximum", esrData.maxPressure.toFixed(2)]);
          worksheet.addRow(["", "Minimum", esrData.minPressure.toFixed(2)]);
          worksheet.addRow([]); // Empty row
        });
      }

      // Style header rows (red theme for pressure)
      const infoHeaderRow = worksheet.getRow(1);
      infoHeaderRow.font = { bold: true, color: { argb: "FFEF4444" } };

      // Auto-fit column widths
      worksheet.columns.forEach((column) => {
        if (column) {
          let maxLength = 0;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        }
      });

      // Generate and download Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `7day_pressure_analysis_${villageData[0]?.village_name?.replace(/\s+/g, '_') || 'village'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  if (!villageData || villageData.length === 0) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>No pressure data available for this village.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      {/* Header with village information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100" data-testid="chart-title-pressure-analysis">
            7-Day Pressure Analysis
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300" data-testid="text-village-info-pressure">
            {villageData[0]?.village_name} • {villageData[0]?.scheme_name} • {villageData.length} ESR{villageData.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          variant="outline"
          size="sm"
          className="border-red-300 hover:bg-red-100 dark:border-red-600 dark:hover:bg-red-800"
          data-testid="button-export-pressure-analysis"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Charts for each ESR */}
      {esrChartData.map((esrData, index) => (
        <div key={index} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-300 dark:border-red-700">
          {/* ESR Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-red-800 dark:text-red-200" data-testid={`text-esr-name-pressure-${index}`}>
              {esrData.esr_name}
            </h4>
            <div className="text-xs text-red-600 dark:text-red-400">
              Avg: {esrData.averagePressure.toFixed(2)} bar
            </div>
          </div>

          {/* Chart */}
          <div className="h-64" data-testid={`chart-pressure-esr-${index}`}>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={esrData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#6B7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6B7280"
                    label={{ value: 'Pressure (bar)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #EF4444',
                      borderRadius: '2px',
                      fontSize: '12px'
                    }}
                    formatter={(value, name) => [`${value} bar`, 'Pressure Level']}
                    labelStyle={{ color: '#DC2626' }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="pressure" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#DC2626' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Summary Statistics for this ESR */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-red-200 dark:border-red-700">
            <div className="text-center">
              <p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid={`text-average-pressure-${index}`}>
                {esrData.averagePressure.toFixed(2)}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">Average (bar)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid={`text-max-pressure-${index}`}>
                {esrData.maxPressure.toFixed(2)}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">Peak (bar)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid={`text-min-pressure-${index}`}>
                {esrData.minPressure.toFixed(2)}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">Minimum (bar)</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PressureAnalysisChartWidget;