import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

interface AreaCoverageWidgetProps {
  regions: any[];
}

const AreaCoverageWidget: React.FC<AreaCoverageWidgetProps> = ({ regions }) => {
  const handleExportToExcel = async () => {
    try {
      // Prepare export data with all fields from region table
      const exportData = regions.map((region: any) => ({
        "Region ID": region.region_id || "",
        "Region Name": region.region_name || "",
        "Total ESR Integrated": region.total_esr_integrated || 0,
        "Fully Completed ESR": region.fully_completed_esr || 0,
        "Partial ESR": region.partial_esr || 0,
        "Total Villages Integrated": region.total_villages_integrated || 0,
        "Fully Completed Villages": region.fully_completed_villages || 0,
        "Total Schemes Integrated": region.total_schemes_integrated || 0,
        "Fully Completed Schemes": region.fully_completed_schemes || 0,
        "Flow Meter Integrated": region.flow_meter_integrated || 0,
        "RCA Integrated": region.rca_integrated || 0,
        "Pressure Transmitter Integrated": region.pressure_transmitter_integrated || 0,
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("SWSM IoT Project Area Coverage");

      // Add header row
      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      exportData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      // Style header row (sky blue)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "87CEEB" },
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
        column.width = 18;
      });

      // Generate filename
      const filename = `SWSM_IoT_Area_Coverage_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting area coverage data to Excel:", error);
    }
  };

  return (
    <div className="area-coverage-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              SWSM IoT Project - Regional Coverage
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

        <div className="max-h-[400px] overflow-y-auto">
          {regions.map((region, index) => (
            <div 
              key={region.region_id} 
              className={`px-4 py-3 ${index !== regions.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-region-${region.region_id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-region-name-${region.region_id}`}>
                    {region.region_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-region-id-${region.region_id}`}>
                    Region ID: {region.region_id}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-schemes-${region.region_id}`}>
                  <span className="text-gray-500">Total Schemes:</span> {region.total_schemes_integrated || 0}
                </div>
                <div className="text-xs" data-testid={`text-schemes-completed-${region.region_id}`}>
                  <span className="text-gray-500">Completed Schemes:</span> {region.fully_completed_schemes || 0}
                </div>
                <div className="text-xs" data-testid={`text-villages-${region.region_id}`}>
                  <span className="text-gray-500">Total Villages:</span> {region.total_villages_integrated || 0}
                </div>
                <div className="text-xs" data-testid={`text-villages-completed-${region.region_id}`}>
                  <span className="text-gray-500">Completed Villages:</span> {region.fully_completed_villages || 0}
                </div>
                <div className="text-xs" data-testid={`text-esr-${region.region_id}`}>
                  <span className="text-gray-500">Total ESR:</span> {region.total_esr_integrated || 0}
                </div>
                <div className="text-xs" data-testid={`text-esr-completed-${region.region_id}`}>
                  <span className="text-gray-500">Completed ESR:</span> {region.fully_completed_esr || 0}
                </div>
                <div className="text-xs" data-testid={`text-flow-meters-${region.region_id}`}>
                  <span className="text-gray-500">Flow Meters:</span> {region.flow_meter_integrated || 0}
                </div>
                <div className="text-xs" data-testid={`text-rca-${region.region_id}`}>
                  <span className="text-gray-500">RCA:</span> {region.rca_integrated || 0}
                </div>
                <div className="text-xs" data-testid={`text-pressure-${region.region_id}`}>
                  <span className="text-gray-500">Pressure Transmitters:</span> {region.pressure_transmitter_integrated || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AreaCoverageWidget;