import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";
import AbovePressureWidget from "./AbovePressureWidget";
import OptimalPressureWidget from "./OptimalPressureWidget";
import BelowPressureWidget from "./BelowPressureWidget";

interface CombinePressureStatusWidgetProps {
  data: {
    abovePressure: any[];
    optimalPressure: any[];
    belowPressure: any[];
  };
  counts: {
    aboveOptimal: number;
    optimal: number;
    belowOptimal: number;
    total: number;
  };
  selectedRegion?: string;
  selectedScheme?: string;
}

const CombinePressureStatusWidget: React.FC<CombinePressureStatusWidgetProps> = ({ 
  data, 
  counts, 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  const handleCombinedExportToExcel = async () => {
    try {
      // Helper function to get pressure date headers
      const getPressureDateHeaders = (esr: any) => {
        const headers: any = {};
        for (let i = 1; i <= 7; i++) {
          const dateField = `pressure_date_day_${i}`;
          const valueField = `pressure_value_${i}`;
          const actualDate = esr[dateField] || `Day ${i}`;
          headers[`Pressure ${actualDate} (bar)`] = esr[valueField] || 0;
        }
        return headers;
      };

      // Create workbook with three worksheets
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Above Optimal Pressure (>0.7 bar)
      const aboveSheet = workbook.addWorksheet("Above Optimal Pressure");
      if (data.abovePressure.length > 0) {
        const aboveData = data.abovePressure.map((esr: any) => ({
          "Scheme ID": esr.scheme_id || "",
          "Scheme Name": esr.scheme_name || "",
          "Region": esr.region || "",
          "Village Name": esr.village_name || "",
          "ESR Name": esr.esr_name || "",
          ...getPressureDateHeaders(esr),
          "Average Pressure (bar)": ((Number(esr.pressure_value_1 || 0) + Number(esr.pressure_value_2 || 0) + 
                                      Number(esr.pressure_value_3 || 0) + Number(esr.pressure_value_4 || 0) + 
                                      Number(esr.pressure_value_5 || 0) + Number(esr.pressure_value_6 || 0) + 
                                      Number(esr.pressure_value_7 || 0)) / 7).toFixed(3),
          "Pressure Status": "Above Optimal (>0.7 bar)",
          "Last Updated": new Date().toLocaleDateString("en-IN"),
        }));

        const aboveHeaders = aboveData.length > 0 ? Object.keys(aboveData[0]) : [];
        aboveSheet.addRow(aboveHeaders);
        aboveData.forEach((row) => {
          aboveSheet.addRow(aboveHeaders.map((key) => row[key as keyof typeof row]));
        });

        // Style header row with red theme
        const aboveHeaderRow = aboveSheet.getRow(1);
        aboveHeaderRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F44336" } };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center" };
          cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        });
        aboveHeaders.forEach((_, index) => {
          const column = aboveSheet.getColumn(index + 1);
          column.width = 15;
        });
      }

      // Sheet 2: Optimal Pressure (0.2-0.7 bar)
      const optimalSheet = workbook.addWorksheet("Optimal Pressure");
      if (data.optimalPressure.length > 0) {
        const optimalData = data.optimalPressure.map((esr: any) => ({
          "Scheme ID": esr.scheme_id || "",
          "Scheme Name": esr.scheme_name || "",
          "Region": esr.region || "",
          "Village Name": esr.village_name || "",
          "ESR Name": esr.esr_name || "",
          ...getPressureDateHeaders(esr),
          "Average Pressure (bar)": ((Number(esr.pressure_value_1 || 0) + Number(esr.pressure_value_2 || 0) + 
                                      Number(esr.pressure_value_3 || 0) + Number(esr.pressure_value_4 || 0) + 
                                      Number(esr.pressure_value_5 || 0) + Number(esr.pressure_value_6 || 0) + 
                                      Number(esr.pressure_value_7 || 0)) / 7).toFixed(3),
          "Pressure Status": "Optimal (0.2-0.7 bar)",
          "Last Updated": new Date().toLocaleDateString("en-IN"),
        }));

        const optimalHeaders = optimalData.length > 0 ? Object.keys(optimalData[0]) : [];
        optimalSheet.addRow(optimalHeaders);
        optimalData.forEach((row) => {
          optimalSheet.addRow(optimalHeaders.map((key) => row[key as keyof typeof row]));
        });

        // Style header row with blue theme
        const optimalHeaderRow = optimalSheet.getRow(1);
        optimalHeaderRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2196F3" } };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center" };
          cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        });
        optimalHeaders.forEach((_, index) => {
          const column = optimalSheet.getColumn(index + 1);
          column.width = 15;
        });
      }

      // Sheet 3: Below Optimal Pressure (<0.2 bar)
      const belowSheet = workbook.addWorksheet("Below Optimal Pressure");
      if (data.belowPressure.length > 0) {
        const belowData = data.belowPressure.map((esr: any) => ({
          "Scheme ID": esr.scheme_id || "",
          "Scheme Name": esr.scheme_name || "",
          "Region": esr.region || "",
          "Village Name": esr.village_name || "",
          "ESR Name": esr.esr_name || "",
          ...getPressureDateHeaders(esr),
          "Average Pressure (bar)": ((Number(esr.pressure_value_1 || 0) + Number(esr.pressure_value_2 || 0) + 
                                      Number(esr.pressure_value_3 || 0) + Number(esr.pressure_value_4 || 0) + 
                                      Number(esr.pressure_value_5 || 0) + Number(esr.pressure_value_6 || 0) + 
                                      Number(esr.pressure_value_7 || 0)) / 7).toFixed(3),
          "Pressure Status": "Below Optimal (<0.2 bar)",
          "Last Updated": new Date().toLocaleDateString("en-IN"),
        }));

        const belowHeaders = belowData.length > 0 ? Object.keys(belowData[0]) : [];
        belowSheet.addRow(belowHeaders);
        belowData.forEach((row) => {
          belowSheet.addRow(belowHeaders.map((key) => row[key as keyof typeof row]));
        });

        // Style header row with orange theme
        const belowHeaderRow = belowSheet.getRow(1);
        belowHeaderRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9800" } };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center" };
          cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
        });
        belowHeaders.forEach((_, index) => {
          const column = belowSheet.getColumn(index + 1);
          column.width = 15;
        });
      }

      // Generate filename
      let scopeText = "";
      if (selectedScheme && selectedScheme !== "all") {
        scopeText = `_${selectedScheme.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (selectedRegion && selectedRegion !== "all") {
        scopeText = `_${selectedRegion}`;
      }
      const filename = `Complete_Pressure_Analysis${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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

      console.log(`✅ Successfully downloaded combined pressure analysis: ${filename}`);
    } catch (error) {
      console.error("Error exporting combined pressure analysis to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return `${selectedScheme} - Complete Pressure Analysis`;
    } else if (selectedRegion && selectedRegion !== "all") {
      return `${selectedRegion} Region - Complete Pressure Analysis`;
    }
    return "Complete Pressure Analysis";
  };

  return (
    <div className="combine-pressure-status-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        {/* Header with summary and combined export */}
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700" data-testid="text-widget-title">
                {getScopeTitle()}
              </h3>
              <p className="text-xs text-gray-500 mt-1" data-testid="text-summary-counts">
                Total ESRs: {counts.total} | Above: {counts.aboveOptimal} | Optimal: {counts.optimal} | Below: {counts.belowOptimal}
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={handleCombinedExportToExcel}
              className="text-xs px-3 py-1 h-7 bg-blue-600 hover:bg-blue-700"
              data-testid="button-export-combined"
            >
              <Download className="w-3 h-3 mr-1" />
              Export All
            </Button>
          </div>
        </div>

        {/* Individual widget sections */}
        <div className="space-y-0">
          {/* Above Pressure Section */}
          {data.abovePressure.length > 0 && (
            <div className="border-b border-gray-200">
              <AbovePressureWidget
                esrs={data.abovePressure}
                selectedRegion={selectedRegion}
                selectedScheme={selectedScheme}
              />
            </div>
          )}

          {/* Optimal Pressure Section */}
          {data.optimalPressure.length > 0 && (
            <div className="border-b border-gray-200">
              <OptimalPressureWidget
                esrs={data.optimalPressure}
                selectedRegion={selectedRegion}
                selectedScheme={selectedScheme}
              />
            </div>
          )}

          {/* Below Pressure Section */}
          {data.belowPressure.length > 0 && (
            <div>
              <BelowPressureWidget
                esrs={data.belowPressure}
                selectedRegion={selectedRegion}
                selectedScheme={selectedScheme}
              />
            </div>
          )}

          {/* No data message */}
          {counts.total === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 text-sm" data-testid="text-no-data">
                No pressure data available for the selected filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombinePressureStatusWidget;