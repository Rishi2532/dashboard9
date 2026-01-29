import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

interface AverageAboveChlorineWidgetProps {
  esrs: any[];
  selectedRegion?: string;
  selectedScheme?: string;
}

const AverageAboveChlorineWidget: React.FC<AverageAboveChlorineWidgetProps> = ({ 
  esrs, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  const esrsToDisplay = esrs.slice(0, 5);
  const hasMoreESRs = esrs.length > 5;

  const handleExportToExcel = async () => {
    try {
      const getChlorineDateHeaders = (esr: any) => {
        const headers: any = {};
        for (let i = 1; i <= 7; i++) {
          const dateField = `chlorine_date_day_${i}`;
          const valueField = `chlorine_value_${i}`;
          const actualDate = esr[dateField] || `Day ${i}`;
          headers[`Chlorine ${actualDate} (mg/L)`] = esr[valueField] || 0;
        }
        return headers;
      };

      const exportData = esrs.map((esr: any) => ({
        "Scheme ID": esr.scheme_id || "",
        "Scheme Name": esr.scheme_name || "",
        "Region": esr.region || "",
        "ESR Name": esr.esr_name || "",
        "Village Name": esr.village_name || "",
        ...getChlorineDateHeaders(esr),
        "7-Day Average Chlorine": ((Number(esr.chlorine_value_1 || 0) + Number(esr.chlorine_value_2 || 0) + 
                        Number(esr.chlorine_value_3 || 0) + Number(esr.chlorine_value_4 || 0) + 
                        Number(esr.chlorine_value_5 || 0) + Number(esr.chlorine_value_6 || 0) + 
                        Number(esr.chlorine_value_7 || 0)) / 7).toFixed(2),
        "Status": "Average Above Optimal Chlorine (>0.5 mg/L)",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Avg Above Chlorine");

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
          fgColor: { argb: "FF9800" },
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
      const filename = `ESRs_Avg_Above_Chlorine${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting average above chlorine to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return `${selectedScheme} - ESRs with Average Above Optimal Chlorine (>0.5 mg/L)`;
    } else if (selectedRegion && selectedRegion !== "all") {
      return `${selectedRegion} Region - ESRs with Average Above Optimal Chlorine (>0.5 mg/L)`;
    }
    return "ESRs with Average Above Optimal Chlorine (>0.5 mg/L)";
  };

  const calculateAverage = (esr: any) => {
    const sum = Number(esr.chlorine_value_1 || 0) + Number(esr.chlorine_value_2 || 0) + 
                Number(esr.chlorine_value_3 || 0) + Number(esr.chlorine_value_4 || 0) + 
                Number(esr.chlorine_value_5 || 0) + Number(esr.chlorine_value_6 || 0) + 
                Number(esr.chlorine_value_7 || 0);
    return (sum / 7).toFixed(2);
  };

  return (
    <div className="average-above-chlorine-widget mt-2 mb-2">
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
          {esrsToDisplay.map((esr, index) => (
            <div 
              key={`${esr.scheme_id}-${esr.esr_name}-${index}`} 
              className={`px-4 py-3 ${index !== esrsToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-esr-${index}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-esr-name-${index}`}>
                    {esr.esr_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-village-name-${index}`}>
                    {esr.village_name} - {esr.scheme_name}
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-800"
                    data-testid={`status-esr-${index}`}
                  >
                    Avg {calculateAverage(esr)} mg/L
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-region-${index}`}>
                  <span className="text-gray-500">Region:</span> {esr.region}
                </div>
                <div className="text-xs" data-testid={`text-average-chlorine-${index}`}>
                  <span className="text-gray-500">7-Day Avg:</span> {calculateAverage(esr)} mg/L
                </div>
                <div className="text-xs" data-testid={`text-latest-chlorine-${index}`}>
                  <span className="text-gray-500">Latest:</span> {esr.chlorine_value_7 || 0} mg/L
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreESRs && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center" data-testid="text-more-esrs">
              {esrs.length - 5} more ESRs not shown. Use the Excel export button above for the complete list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AverageAboveChlorineWidget;
