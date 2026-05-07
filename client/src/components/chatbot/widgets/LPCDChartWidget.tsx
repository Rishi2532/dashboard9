import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import ExcelJS from "exceljs";

interface LPCDChartDataPoint {
  date: string;
  lpcd: number;
  displayValue: string;
  status: string;
}

interface LPCDChartWidgetProps {
  villageData: any;
  selectedRegion?: string;
  selectedScheme?: string;
}

const LPCDChartWidget: React.FC<LPCDChartWidgetProps> = ({ 
  villageData, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  // Prepare chart data from village's 7-day LPCD values
  const chartData: LPCDChartDataPoint[] = [];
  if (villageData) {
    for (let i = 1; i <= 7; i++) {
      const dateField = `lpcd_date_day${i}`;
      const valueField = `lpcd_value_day${i}`;
      const date = villageData[dateField] || `Day ${i}`;
      const value = parseFloat(villageData[valueField] || "0");
      
      chartData.push({
        date: date,
        lpcd: value,
        displayValue: `${value.toFixed(2)} L`,
        status: value >= 55 ? "Good" : "Below Target"
      });
    }
  }

  // Calculate statistics
  const averageLPCD = chartData.length > 0 
    ? (chartData.reduce((sum, item) => sum + item.lpcd, 0) / chartData.length).toFixed(2)
    : "0";
  
  const daysAbove55 = chartData.filter(item => item.lpcd >= 55).length;
  const daysBelow55 = chartData.filter(item => item.lpcd < 55).length;

  // Chart configuration for Recharts
  const chartConfig: ChartConfig = {
    lpcd: {
      label: "LPCD (Liter Per Capita Day)",
      color: "#10B981", // Green color for good LPCD
    },
  };

  const handleExportToExcel = async () => {
    try {
      // Prepare export data
      const exportData = chartData.map((item, index) => ({
        "Day": `Day ${index + 1}`,
        "Date": item.date,
        "LPCD (L)": item.lpcd,
        "Status": item.status,
        "Meets Target (≥55L)": item.lpcd >= 55 ? "Yes" : "No"
      }));

      // Add summary data
      exportData.push(
        {
          "Day": "Summary",
          "Date": "Average",
          "LPCD (L)": parseFloat(averageLPCD),
          "Status": parseFloat(averageLPCD) >= 55 ? "Good" : "Below Target",
          "Meets Target (≥55L)": parseFloat(averageLPCD) >= 55 ? "Yes" : "No"
        },
        {
          "Day": "Analysis",
          "Date": "Days Above 55L",
          "LPCD (L)": daysAbove55,
          "Status": `${daysAbove55} out of 7 days`,
          "Meets Target (≥55L)": `${((daysAbove55/7)*100).toFixed(1)}%`
        }
      );

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("7-Day LPCD Analysis");

      // Add village information first
      worksheet.addRow(["Village LPCD Analysis"]);
      worksheet.addRow(["Village Name", villageData?.village_name || "N/A"]);
      worksheet.addRow(["Scheme Name", villageData?.scheme_name || "N/A"]);
      worksheet.addRow(["Region", villageData?.region || "N/A"]);
      worksheet.addRow(["Population", villageData?.population || "N/A"]);
      worksheet.addRow(["Target LPCD", "≥55 Liters per Capita per Day"]);
      worksheet.addRow([]); // Empty row

      // Add chart data header
      worksheet.addRow(["7-Day LPCD Analysis"]);
      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      exportData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      // Style header rows (green theme for LPCD)
      const infoHeaderRow = worksheet.getRow(1);
      infoHeaderRow.font = { bold: true, color: { argb: "FF10B981" } };
      
      const chartHeaderRow = worksheet.getRow(8);
      chartHeaderRow.font = { bold: true, color: { argb: "FF10B981" } };

      const dataHeaderRow = worksheet.getRow(9);
      dataHeaderRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF10B981" },
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

      // Color-code LPCD values based on target
      for (let rowIndex = 10; rowIndex <= 16; rowIndex++) {
        const lpcdCell = worksheet.getCell(rowIndex, 3); // LPCD column
        const lpcdValue = parseFloat(lpcdCell.value as string);
        if (!isNaN(lpcdValue)) {
          if (lpcdValue >= 55) {
            lpcdCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD1FAE5" }, // Light green
            };
          } else {
            lpcdCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFECACA" }, // Light red
            };
          }
        }
      }

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
      link.download = `7day_lpcd_analysis_${villageData?.village_name?.replace(/\s+/g, '_') || 'village'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  if (!villageData) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-center text-green-600 dark:text-green-400">
          <p>No village data available for LPCD chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      {/* Header with village information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100" data-testid="chart-title-lpcd">
            7-Day LPCD Analysis
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300" data-testid="text-village-lpcd-info">
            {villageData.village_name} • {villageData.scheme_name} • Population: {villageData.population?.toLocaleString() || 'N/A'}
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          variant="outline"
          size="sm"
          className="border-green-300 hover:bg-green-100 dark:border-green-600 dark:hover:bg-green-800"
          data-testid="button-export-lpcd"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Chart */}
      <div className="h-80" data-testid="chart-lpcd">
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
                label={{ value: 'LPCD (Liter Per Capita Day)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #10B981',
                  borderRadius: '2px',
                  fontSize: '12px'
                }}
                formatter={(value, name) => [`${value} L`, 'LPCD']}
                labelStyle={{ color: '#047857' }}
              />
              {/* Reference line for 55 LPCD target */}
              <ReferenceLine 
                y={55} 
                stroke="#F59E0B" 
                strokeDasharray="4 4" 
                label={{ value: "Target (55L)", position: "top", style: { fontSize: '12px', fill: '#F59E0B' } }}
              />
              <Bar 
                dataKey="lpcd" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]}
                stroke="#059669"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-green-200 dark:border-green-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-average-lpcd">
            {averageLPCD}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">Average LPCD</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-days-above-target">
            {daysAbove55}/7
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">Days ≥55L</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-max-lpcd">
            {Math.max(...chartData.map(item => item.lpcd)).toFixed(2)}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">Peak LPCD</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-min-lpcd">
            {Math.min(...chartData.map(item => item.lpcd)).toFixed(2)}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">Minimum LPCD</p>
        </div>
      </div>

      {/* Performance indicator */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Target Achievement
          </span>
          <span className={`text-sm font-bold ${daysAbove55 >= 5 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} data-testid="text-target-achievement">
            {((daysAbove55/7)*100).toFixed(1)}% ({daysAbove55}/7 days)
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${daysAbove55 >= 5 ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${(daysAbove55/7)*100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default LPCDChartWidget;