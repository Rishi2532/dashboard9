import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

interface FullyCompletedVillagesWidgetProps {
  villages: any[];
  selectedRegion?: string;
}

const FullyCompletedVillagesWidget: React.FC<FullyCompletedVillagesWidgetProps> = ({ 
  villages, 
  selectedRegion = "all" 
}) => {
  const villagesToDisplay = villages.slice(0, 5);
  const hasMoreVillages = villages.length > 5;

  const handleExportToExcel = async () => {
    try {
      // Get the agency mapping function
      const getAgencyByRegion = (regionName: string): string => {
        const regionAgencyMap: { [key: string]: string } = {
          "Amravati": "Maharashtra Jeevan Pradhikaran, Amravati",
          "Nagpur": "Maharashtra Jeevan Pradhikaran, Nagpur", 
          "Chhatrapati Sambhajinagar": "Maharashtra Jeevan Pradhikaran, Chhatrapati Sambhajinagar",
          "Nashik": "Maharashtra Jeevan Pradhikaran, Nashik",
          "Pune": "Maharashtra Jeevan Pradhikaran, Pune",
          "Konkan": "Maharashtra Jeevan Pradhikaran, Konkan"
        };
        return regionAgencyMap[regionName] || "Not Specified";
      };

      // Prepare export data starting from region field (excluding id and sr_no as requested)
      const exportData = villages.map((village: any) => ({
        "Region": village.region || "",
        "Circle": village.circle || "",
        "Division": village.division || "",
        "Sub Division": village.sub_division || "",
        "Block": village.block || "",
        "Scheme ID": village.scheme_id || "",
        "Scheme Name": village.scheme_name || "",
        "Village Name": village.village_name || "",
        "Agency": village.agency || (village.region ? getAgencyByRegion(village.region) : "Not Specified"),
        "Number of ESR": village.number_of_esr || 0,
        "Connected ESR": village.connected_esr || 0,
        "Not Connected ESR": village.not_connected_esr || 0,
        "Fully Completed ESR": village.no_of_fully_completion_esr || 0,
        "Village Functional Status": village.village_functional_status || "Unknown",
        "Fully Completion Village Status": village.fully_completion_village_status || "Unknown",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Fully Completed Villages");

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

      // Style rows with "fully completed" status in green (as requested)
      villages.forEach((village, index) => {
        const rowIndex = index + 2; // +2 because Excel is 1-indexed and we have header row
        const row = worksheet.getRow(rowIndex);
        
        // Check if village is fully completed - apply green coloring
        if (village.fully_completion_village_status && 
            village.fully_completion_village_status.toLowerCase().includes('completed')) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "90EE90" }, // Light green
            };
          });
        }
      });

      // Auto-fit columns
      headerKeys.forEach((_, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = 15;
      });

      // Generate filename
      const regionText = selectedRegion && selectedRegion !== "all" ? `_${selectedRegion}` : "";
      const filename = `Fully_Completed_Villages${regionText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting fully completed villages to Excel:", error);
    }
  };

  return (
    <div className="fully-completed-villages-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              {selectedRegion !== "all" ? `${selectedRegion} Region - Fully Completed Villages` : "Fully Completed Villages"}
            </h3>
            <Button 
              size="sm" 
              onClick={handleExportToExcel}
              className="text-xs px-2 py-1 h-6"
              data-testid="button-export-excel-villages"
            >
              <Download className="w-3 h-3 mr-1" />
              Excel
            </Button>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {villagesToDisplay.map((village, index) => (
            <div 
              key={`${village.scheme_id}-${village.village_name}`} 
              className={`px-4 py-3 ${index !== villagesToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-village-${village.scheme_id}-${village.village_name}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-village-name-${village.scheme_id}-${village.village_name}`}>
                    {village.village_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-scheme-info-${village.scheme_id}-${village.village_name}`}>
                    Scheme: {village.scheme_name} (ID: {village.scheme_id})
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800"
                    data-testid={`status-village-${village.scheme_id}-${village.village_name}`}
                  >
                    Fully Completed
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-region-${village.scheme_id}-${village.village_name}`}>
                  <span className="text-gray-500">Region:</span> {village.region}
                </div>
                <div className="text-xs" data-testid={`text-block-${village.scheme_id}-${village.village_name}`}>
                  <span className="text-gray-500">Block:</span> {village.block}
                </div>
                <div className="text-xs" data-testid={`text-esr-total-${village.scheme_id}-${village.village_name}`}>
                  <span className="text-gray-500">Total ESR:</span> {village.number_of_esr || 0}
                </div>
                <div className="text-xs" data-testid={`text-esr-completed-${village.scheme_id}-${village.village_name}`}>
                  <span className="text-gray-500">Completed ESR:</span> {village.no_of_fully_completion_esr || 0}
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

export default FullyCompletedVillagesWidget;