import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

interface AverageBelow55LpcdWidgetProps {
  villages: any[];
  selectedRegion?: string;
  selectedScheme?: string;
}

const AverageBelow55LpcdWidget: React.FC<AverageBelow55LpcdWidgetProps> = ({ 
  villages, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  const villagesToDisplay = villages.slice(0, 5);
  const hasMoreVillages = villages.length > 5;

  const handleExportToExcel = async () => {
    try {
      const getLpcdDateHeaders = (village: any) => {
        const headers: any = {};
        for (let i = 1; i <= 7; i++) {
          const dateField = `lpcd_date_day${i}`;
          const valueField = `lpcd_value_day${i}`;
          const actualDate = village[dateField] || `Day ${i}`;
          headers[`LPCD ${actualDate} (L)`] = village[valueField] || 0;
        }
        return headers;
      };

      const exportData = villages.map((village: any) => ({
        "Scheme ID": village.scheme_id || "",
        "Scheme Name": village.scheme_name || "",
        "Region": village.region || "",
        "Village Name": village.village_name || "",
        ...getLpcdDateHeaders(village),
        "7-Day Average LPCD": ((Number(village.lpcd_value_day1 || 0) + Number(village.lpcd_value_day2 || 0) + 
                        Number(village.lpcd_value_day3 || 0) + Number(village.lpcd_value_day4 || 0) + 
                        Number(village.lpcd_value_day5 || 0) + Number(village.lpcd_value_day6 || 0) + 
                        Number(village.lpcd_value_day7 || 0)) / 7).toFixed(2),
        "Population": village.population || 0,
        "Status": "Average Below 55 LPCD",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Avg Below 55 LPCD");

      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      exportData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F44336" },
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

      headerKeys.forEach((_, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = 15;
      });

      let scopeText = "";
      if (selectedScheme && selectedScheme !== "all") {
        scopeText = `_${selectedScheme.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (selectedRegion && selectedRegion !== "all") {
        scopeText = `_${selectedRegion}`;
      }
      const filename = `Villages_Avg_Below_55_LPCD${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Successfully downloaded: ${filename}`);
    } catch (error) {
      console.error("Error exporting average below 55 LPCD to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return `${selectedScheme} - Villages with Average LPCD Below 55`;
    } else if (selectedRegion && selectedRegion !== "all") {
      return `${selectedRegion} Region - Villages with Average LPCD Below 55`;
    }
    return "Villages with Average LPCD Below 55";
  };

  const calculateAverage = (village: any) => {
    const sum = Number(village.lpcd_value_day1 || 0) + Number(village.lpcd_value_day2 || 0) + 
                Number(village.lpcd_value_day3 || 0) + Number(village.lpcd_value_day4 || 0) + 
                Number(village.lpcd_value_day5 || 0) + Number(village.lpcd_value_day6 || 0) + 
                Number(village.lpcd_value_day7 || 0);
    return (sum / 7).toFixed(2);
  };

  return (
    <div className="average-below-55-lpcd-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              {getScopeTitle()}
            </h3>
            <Button 
              size="sm" 
              onClick={handleExportToExcel}
              className="text-xs px-2 py-1 h-6"
              data-testid="button-export-excel"
            >
              <Download className="w-3 h-3 mr-1" />
              Excel
            </Button>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {villagesToDisplay.map((village, index) => (
            <div 
              key={`${village.scheme_id}-${village.village_name}-${index}`} 
              className={`px-4 py-3 ${index !== villagesToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-village-${index}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-village-name-${index}`}>
                    {village.village_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-scheme-name-${index}`}>
                    {village.scheme_name}
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800"
                    data-testid={`status-village-${index}`}
                  >
                    Avg {calculateAverage(village)} LPCD
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-region-${index}`}>
                  <span className="text-gray-500">Region:</span> {village.region}
                </div>
                <div className="text-xs" data-testid={`text-population-${index}`}>
                  <span className="text-gray-500">Population:</span> {village.population || 0}
                </div>
                <div className="text-xs" data-testid={`text-average-lpcd-${index}`}>
                  <span className="text-gray-500">7-Day Avg LPCD:</span> {calculateAverage(village)} L
                </div>
                <div className="text-xs" data-testid={`text-latest-lpcd-${index}`}>
                  <span className="text-gray-500">Latest LPCD:</span> {village.lpcd_value_day7 || 0} L
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreVillages && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center" data-testid="text-more-villages">
              {villages.length - 5} more villages not shown. Use the Excel export button above for the complete list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AverageBelow55LpcdWidget;
