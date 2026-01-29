import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

interface ConsistentBelow55LpcdWidgetProps {
  villages: any[];
  selectedRegion?: string;
  selectedScheme?: string;
}

const ConsistentBelow55LpcdWidget: React.FC<ConsistentBelow55LpcdWidgetProps> = ({ 
  villages, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  const villagesToDisplay = villages.slice(0, 5);
  const hasMoreVillages = villages.length > 5;

  const handleExportToExcel = async () => {
    try {
      // Prepare export data
      const exportData = villages.map((village: any) => ({
        "Scheme ID": village.scheme_id || "",
        "Scheme Name": village.scheme_name || "",
        "Region": village.region || "",
        "Village Name": village.village_name || "",
        "ESR Name": village.esr_name || "",
        "LPCD Day 1": village.lpcd_value_day1 || 0,
        "LPCD Day 2": village.lpcd_value_day2 || 0,
        "LPCD Day 3": village.lpcd_value_day3 || 0,
        "LPCD Day 4": village.lpcd_value_day4 || 0,
        "LPCD Day 5": village.lpcd_value_day5 || 0,
        "LPCD Day 6": village.lpcd_value_day6 || 0,
        "LPCD Day 7": village.lpcd_value_day7 || 0,
        "Average LPCD": ((Number(village.lpcd_value_day1 || 0) + Number(village.lpcd_value_day2 || 0) + 
                        Number(village.lpcd_value_day3 || 0) + Number(village.lpcd_value_day4 || 0) + 
                        Number(village.lpcd_value_day5 || 0) + Number(village.lpcd_value_day6 || 0) + 
                        Number(village.lpcd_value_day7 || 0)) / 7).toFixed(2),
        "Population": village.population || 0,
        "ESR Capacity (LL)": village.esr_capacity || 0,
        "Status": "Consistently Below 55 LPCD",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Villages Consistently Below 55 LPCD");

      // Add header row
      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      exportData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      // Style header row (red theme for concerning LPCD)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "D32F2F" },
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

      // Auto-fit columns
      headerKeys.forEach((_, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = 15;
      });

      // Generate filename
      let scopeText = "";
      if (selectedScheme && selectedScheme !== "all") {
        scopeText = `_${selectedScheme.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (selectedRegion && selectedRegion !== "all") {
        scopeText = `_${selectedRegion}`;
      }
      const filename = `Villages_Consistently_Below_55_LPCD${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

      // Save and download
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
      console.error("Error exporting villages consistently below 55 LPCD to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return `${selectedScheme} - Villages Consistently Below 55 LPCD`;
    } else if (selectedRegion && selectedRegion !== "all") {
      return `${selectedRegion} Region - Villages Consistently Below 55 LPCD`;
    }
    return "Villages Consistently Below 55 LPCD";
  };

  return (
    <div className="consistent-below-55-lpcd-widget mt-2 mb-2">
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
              key={`${village.scheme_id}-${village.village_name}-${village.esr_name}`} 
              className={`px-4 py-3 ${index !== villagesToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-village-${index}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-village-name-${index}`}>
                    {village.village_name} - {village.esr_name}
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
                    Consistently Below 55
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
                <div className="text-xs" data-testid={`text-latest-lpcd-${index}`}>
                  <span className="text-gray-500">Latest LPCD:</span> {village.lpcd_value_day7 || 0} L
                </div>
                <div className="text-xs" data-testid={`text-consistent-days-${index}`}>
                  <span className="text-gray-500">Below 55:</span> 7/7 days
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

export default ConsistentBelow55LpcdWidget;