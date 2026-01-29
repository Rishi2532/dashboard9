import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface CombinedWaterStatusWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
}

const CombinedWaterStatusWidget: React.FC<CombinedWaterStatusWidgetProps> = ({ 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  // Fetch combined water status data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/category-data/villages/combined-water', selectedRegion, selectedScheme],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedScheme && selectedScheme !== "all") {
        params.append("schemeId", selectedScheme);
      }
      
      const response = await fetch(`/api/category-data/villages/combined-water?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch combined water status data: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleExportToExcel = async () => {
    if (!data?.data) return;

    try {
      const { villagesWithWater, villagesNoWater } = data.data;
      
      // Create workbook with two sheets
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Villages with Water
      const withWaterSheet = workbook.addWorksheet("Villages with Water");
      
      // Helper function to get date headers for water data
      const getWaterDateHeaders = (village: any) => {
        const headers: any = {};
        for (let i = 1; i <= 7; i++) {
          const dateField = `water_date_day${i}`;
          const valueField = `water_value_day${i}`;
          const actualDate = village[dateField] || `Day ${i}`;
          headers[`Water ${actualDate} (LL)`] = village[valueField] || 0;
        }
        return headers;
      };

      // Prepare data for villages with water
      const withWaterData = villagesWithWater.map((village: any) => ({
        "Region": village.region || "",
        "Scheme ID": village.scheme_id || "",
        "Scheme Name": village.scheme_name || "",
        "Village Name": village.village_name || "",
        "ESR Name": village.esr_name || "",
        ...getWaterDateHeaders(village),
        "Population": village.population || "",
        "Number of ESR": village.number_of_esr || "",
        "ESR Capacity (LL)": village.has_esr_data && village.esr_capacity ? village.esr_capacity : "N/A",
        "Flow Meter Connected": village.has_esr_data && village.flow_meter_connected ? village.flow_meter_connected : "N/A",
        "Status": "Has Water Supply",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      // Add headers and data for villages with water
      if (withWaterData.length > 0) {
        const withWaterHeaders = Object.keys(withWaterData[0]);
        withWaterSheet.addRow(withWaterHeaders);
        withWaterData.forEach((row: any) => {
          withWaterSheet.addRow(withWaterHeaders.map((key) => row[key as keyof typeof row]));
        });

        // Style header row (green)
        const withWaterHeaderRow = withWaterSheet.getRow(1);
        withWaterHeaderRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "22C55E" }, // Green
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
        withWaterHeaders.forEach((_, index) => {
          const column = withWaterSheet.getColumn(index + 1);
          column.width = 15;
        });
      }

      // Sheet 2: Villages with No Water
      const noWaterSheet = workbook.addWorksheet("Villages with No Water");
      
      // Prepare data for villages with no water
      const noWaterData = villagesNoWater.map((village: any) => ({
        "Region": village.region || "",
        "Scheme ID": village.scheme_id || "",
        "Scheme Name": village.scheme_name || "",
        "Village Name": village.village_name || "",
        "Water Value Day 7 (LL)": village.water_value_day7 || 0,
        "Status": "No Water Supply",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      // Add headers and data for villages with no water
      if (noWaterData.length > 0) {
        const noWaterHeaders = Object.keys(noWaterData[0]);
        noWaterSheet.addRow(noWaterHeaders);
        noWaterData.forEach((row: any) => {
          noWaterSheet.addRow(noWaterHeaders.map((key) => row[key as keyof typeof row]));
        });

        // Style header row (red)
        const noWaterHeaderRow = noWaterSheet.getRow(1);
        noWaterHeaderRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "EF4444" }, // Red
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
        noWaterHeaders.forEach((_, index) => {
          const column = noWaterSheet.getColumn(index + 1);
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
      const filename = `Combined_Water_Status${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting combined water status to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return `${selectedScheme} - Water Consumption Analysis`;
    } else if (selectedRegion && selectedRegion !== "all") {
      return `${selectedRegion} Region - Water Consumption Analysis`;
    }
    return "Water Consumption Analysis";
  };

  if (isLoading) {
    return (
      <div className="combined-water-status-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="combined-water-status-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-red-600 text-sm" data-testid="text-error">
            Error loading combined water status data: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="combined-water-status-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm" data-testid="text-no-data">
            No water status data available.
          </p>
        </div>
      </div>
    );
  }

  const { villagesWithWater, villagesNoWater } = data.data;
  const { counts } = data;

  return (
    <div className="combined-water-status-widget mt-2 mb-2">
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

        {/* Summary Stats */}
        <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center" data-testid="stat-total">
              <div className="font-semibold text-blue-800">{counts.total}</div>
              <div className="text-blue-600">Total Villages</div>
            </div>
            <div className="text-center" data-testid="stat-with-water">
              <div className="font-semibold text-green-800">{counts.withWater}</div>
              <div className="text-green-600">With Water</div>
            </div>
            <div className="text-center" data-testid="stat-no-water">
              <div className="font-semibold text-red-800">{counts.noWater}</div>
              <div className="text-red-600">No Water</div>
            </div>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {/* Villages with Water Section */}
          <div className="px-4 py-3 bg-green-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-green-800 mb-2" data-testid="heading-with-water">
              Villages with Water ({counts.withWater})
            </h4>
            {villagesWithWater.slice(0, 3).map((village: any, index: number) => (
              <div 
                key={`with-water-${village.scheme_id}-${village.village_name}-${index}`} 
                className={`py-2 ${index !== Math.min(2, villagesWithWater.length - 1) ? 'border-b border-green-200' : ''}`}
                data-testid={`card-village-with-water-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-green-700" data-testid={`text-village-name-with-water-${index}`}>
                      {village.village_name}{village.esr_name ? ` - ${village.esr_name}` : ''}
                    </h5>
                    <p className="text-xs text-green-600" data-testid={`text-scheme-name-with-water-${index}`}>
                      {village.scheme_name}
                    </p>
                    <p className="text-xs text-green-600" data-testid={`text-region-with-water-${index}`}>
                      {village.region} • Latest: {village.water_value_day7 || 0} LL
                    </p>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800"
                    data-testid={`status-village-with-water-${index}`}
                  >
                    Has Water
                  </span>
                </div>
              </div>
            ))}
            {villagesWithWater.length > 3 && (
              <div className="pt-2 text-xs text-green-600" data-testid="text-more-with-water">
                +{villagesWithWater.length - 3} more villages with water
              </div>
            )}
          </div>

          {/* Villages with No Water Section */}
          <div className="px-4 py-3 bg-red-50">
            <h4 className="text-sm font-medium text-red-800 mb-2" data-testid="heading-no-water">
              Villages with No Water ({counts.noWater})
            </h4>
            {villagesNoWater.slice(0, 3).map((village: any, index: number) => (
              <div 
                key={`no-water-${village.scheme_id}-${village.village_name}-${index}`} 
                className={`py-2 ${index !== Math.min(2, villagesNoWater.length - 1) ? 'border-b border-red-200' : ''}`}
                data-testid={`card-village-no-water-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-red-700" data-testid={`text-village-name-no-water-${index}`}>
                      {village.village_name}
                    </h5>
                    <p className="text-xs text-red-600" data-testid={`text-scheme-name-no-water-${index}`}>
                      {village.scheme_name}
                    </p>
                    <p className="text-xs text-red-600" data-testid={`text-region-no-water-${index}`}>
                      {village.region} • Latest: {village.water_value_day7 || 0} LL
                    </p>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800"
                    data-testid={`status-village-no-water-${index}`}
                  >
                    No Water
                  </span>
                </div>
              </div>
            ))}
            {villagesNoWater.length > 3 && (
              <div className="pt-2 text-xs text-red-600" data-testid="text-more-no-water">
                +{villagesNoWater.length - 3} more villages without water
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center" data-testid="text-export-note">
            Use the Excel export button above for the complete list with all 7-day water consumption data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CombinedWaterStatusWidget;