import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ExcelJS from "exceljs";

interface ChartDataPoint {
  date: string;
  chlorine: number;
  displayValue: string;
}

interface ChlorineESRData {
  esr_name: string;
  chartData: ChartDataPoint[];
  averageChlorine: number;
  maxChlorine: number;
  minChlorine: number;
}

interface ChlorineAnalysisChartWidgetProps {
  villageData: any[]; // Array of ESR data for the village
  selectedRegion?: string;
  selectedScheme?: string;
}

const ChlorineAnalysisChartWidget: React.FC<ChlorineAnalysisChartWidgetProps> = ({ 
  villageData, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  // Prepare chart data for each ESR
  const esrChartData: ChlorineESRData[] = [];
  
  if (villageData && villageData.length > 0) {
    villageData.forEach((esr) => {
      const chartData: ChartDataPoint[] = [];
      
      for (let i = 1; i <= 7; i++) {
        const dateField = `chlorine_date_day_${i}`;
        const valueField = `chlorine_value_${i}`;
        const date = esr[dateField] || `Day ${i}`;
        const value = parseFloat(esr[valueField] || "0");
        
        chartData.push({
          date: date,
          chlorine: value,
          displayValue: `${value.toFixed(2)} mg/L`
        });
      }
      
      const values = chartData.map(item => item.chlorine);
      const averageChlorine = values.length > 0 
        ? (values.reduce((sum, val) => sum + val, 0) / values.length)
        : 0;
      
      esrChartData.push({
        esr_name: esr.esr_name || `ESR ${esrChartData.length + 1}`,
        chartData,
        averageChlorine,
        maxChlorine: Math.max(...values),
        minChlorine: Math.min(...values)
      });
    });
  }

  // Chart configuration for Recharts
  const chartConfig: ChartConfig = {
    chlorine: {
      label: "Chlorine Level (mg/L)",
      color: "#10B981", // Green color for chlorine
    },
  };

  const handleExportToExcel = async () => {
    try {
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("7-Day Chlorine Analysis");

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
          worksheet.addRow(["Day", "Date", "Chlorine Level (mg/L)"]);
          
          esrData.chartData.forEach((item, index) => {
            worksheet.addRow([`Day ${index + 1}`, item.date, item.chlorine]);
          });
          
          // Add summary for this ESR
          worksheet.addRow(["Summary", "Average", esrData.averageChlorine.toFixed(2)]);
          worksheet.addRow(["", "Maximum", esrData.maxChlorine.toFixed(2)]);
          worksheet.addRow(["", "Minimum", esrData.minChlorine.toFixed(2)]);
          worksheet.addRow([]); // Empty row
        });
      }

      // Style header rows (green theme for chlorine)
      const infoHeaderRow = worksheet.getRow(1);
      infoHeaderRow.font = { bold: true, color: { argb: "FF10B981" } };

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
      link.download = `7day_chlorine_analysis_${villageData[0]?.village_name?.replace(/\s+/g, '_') || 'village'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  if (!villageData || villageData.length === 0) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-center text-green-600 dark:text-green-400">
          <p>No chlorine data available for this village.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      {/* Header with village information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100" data-testid="chart-title-chlorine-analysis">
            7-Day Chlorine Analysis
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300" data-testid="text-village-info-chlorine">
            {villageData[0]?.village_name} • {villageData[0]?.scheme_name} • {villageData.length} ESR{villageData.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          variant="outline"
          size="sm"
          className="border-green-300 hover:bg-green-100 dark:border-green-600 dark:hover:bg-green-800"
          data-testid="button-export-chlorine-analysis"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Charts for each ESR */}
      {esrChartData.map((esrData, index) => (
        <div key={index} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-300 dark:border-green-700">
          {/* ESR Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-green-800 dark:text-green-200" data-testid={`text-esr-name-${index}`}>
              {esrData.esr_name}
            </h4>
            <div className="text-xs text-green-600 dark:text-green-400">
              Avg: {esrData.averageChlorine.toFixed(2)} mg/L
            </div>
          </div>

          {/* Chart */}
          <div className="h-64" data-testid={`chart-chlorine-esr-${index}`}>
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
                    label={{ value: 'Chlorine (mg/L)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #10B981',
                      borderRadius: '2px',
                      fontSize: '12px'
                    }}
                    formatter={(value, name) => [`${value} mg/L`, 'Chlorine Level']}
                    labelStyle={{ color: '#047857' }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="chlorine" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#059669' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Summary Statistics for this ESR */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-green-200 dark:border-green-700">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid={`text-average-chlorine-${index}`}>
                {esrData.averageChlorine.toFixed(2)}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">Average (mg/L)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid={`text-max-chlorine-${index}`}>
                {esrData.maxChlorine.toFixed(2)}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">Peak (mg/L)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid={`text-min-chlorine-${index}`}>
                {esrData.minChlorine.toFixed(2)}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">Minimum (mg/L)</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChlorineAnalysisChartWidget;