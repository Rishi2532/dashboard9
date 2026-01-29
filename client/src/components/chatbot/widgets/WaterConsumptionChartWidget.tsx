import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ExcelJS from "exceljs";

interface ChartDataPoint {
  date: string;
  consumption: number;
  displayValue: string;
}

interface WaterConsumptionChartWidgetProps {
  villageData: any;
  selectedRegion?: string;
  selectedScheme?: string;
}

const WaterConsumptionChartWidget: React.FC<WaterConsumptionChartWidgetProps> = ({ 
  villageData, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  // Prepare chart data from village's 7-day water consumption
  const chartData: ChartDataPoint[] = [];
  if (villageData) {
    for (let i = 1; i <= 7; i++) {
      const dateField = `water_date_day${i}`;
      const valueField = `water_value_day${i}`;
      const date = villageData[dateField] || `Day ${i}`;
      const value = parseFloat(villageData[valueField] || "0");
      
      chartData.push({
        date: date,
        consumption: value,
        displayValue: `${value.toFixed(2)} LL`
      });
    }
  }

  // Calculate average consumption
  const averageConsumption = chartData.length > 0 
    ? (chartData.reduce((sum, item) => sum + item.consumption, 0) / chartData.length).toFixed(2)
    : "0";

  // Chart configuration for Recharts
  const chartConfig: ChartConfig = {
    consumption: {
      label: "Water Consumption (LL)",
      color: "#3B82F6", // Blue color matching the attached image
    },
  };

  const handleExportToExcel = async () => {
    try {
      // Prepare export data
      const exportData = chartData.map((item, index) => ({
        "Day": `Day ${index + 1}`,
        "Date": item.date,
        "Water Consumption (LL)": item.consumption,
      }));

      // Add summary data
      exportData.push({
        "Day": "Summary",
        "Date": "Average",
        "Water Consumption (LL)": parseFloat(averageConsumption),
      });

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("7-Day Water Consumption");

      // Add village information first
      worksheet.addRow(["Village Information"]);
      worksheet.addRow(["Village Name", villageData?.village_name || "N/A"]);
      worksheet.addRow(["Scheme Name", villageData?.scheme_name || "N/A"]);
      worksheet.addRow(["Region", villageData?.region || "N/A"]);
      worksheet.addRow(["Population", villageData?.population || "N/A"]);
      worksheet.addRow([]); // Empty row

      // Add chart data header
      worksheet.addRow(["7-Day Water Consumption Analysis"]);
      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      exportData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      // Style header rows (blue theme for water)
      const infoHeaderRow = worksheet.getRow(1);
      infoHeaderRow.font = { bold: true, color: { argb: "FF3B82F6" } };
      
      const chartHeaderRow = worksheet.getRow(7);
      chartHeaderRow.font = { bold: true, color: { argb: "FF3B82F6" } };

      const dataHeaderRow = worksheet.getRow(8);
      dataHeaderRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3B82F6" },
        };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

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
      link.download = `7day_water_consumption_${villageData?.village_name?.replace(/\s+/g, '_') || 'village'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  if (!villageData) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="text-center text-blue-600 dark:text-blue-400">
          <p>No village data available for water consumption chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      {/* Header with village information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100" data-testid="chart-title-water-consumption">
            7-Day Water Consumption Analysis
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300" data-testid="text-village-info">
            {villageData.village_name} • {villageData.scheme_name} • Population: {villageData.population?.toLocaleString() || 'N/A'}
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          variant="outline"
          size="sm"
          className="border-blue-300 hover:bg-blue-100 dark:border-blue-600 dark:hover:bg-blue-800"
          data-testid="button-export-water-consumption"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Chart */}
      <div className="h-80" data-testid="chart-water-consumption">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#6B7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6B7280"
                label={{ value: 'Water Consumption (LL)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #3B82F6',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value, name) => [`${value} LL`, 'Water Consumption']}
                labelStyle={{ color: '#1E40AF' }}
              />
              <Bar 
                dataKey="consumption" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
                stroke="#2563EB"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-blue-200 dark:border-blue-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-total-consumption">
            {chartData.reduce((sum, item) => sum + item.consumption, 0).toFixed(2)}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">Total (LL)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-average-consumption">
            {averageConsumption}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">Average (LL)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-max-consumption">
            {Math.max(...chartData.map(item => item.consumption)).toFixed(2)}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">Peak (LL)</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-min-consumption">
            {Math.min(...chartData.map(item => item.consumption)).toFixed(2)}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">Minimum (LL)</p>
        </div>
      </div>
    </div>
  );
};

export default WaterConsumptionChartWidget;