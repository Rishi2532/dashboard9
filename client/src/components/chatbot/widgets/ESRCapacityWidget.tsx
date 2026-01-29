import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface ESRCapacityWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
  selectedVillage?: string;
}

const ESRCapacityWidget: React.FC<ESRCapacityWidgetProps> = ({ 
  selectedRegion = "all",
  selectedScheme = "all",
  selectedVillage = "all"
}) => {
  // Fetch ESR capacity data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/category-data/esr-capacity', selectedRegion, selectedScheme, selectedVillage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedScheme && selectedScheme !== "all") {
        params.append("schemeId", selectedScheme);
      }
      if (selectedVillage && selectedVillage !== "all") {
        params.append("village", selectedVillage);
      }
      
      const response = await fetch(`/api/category-data/esr-capacity?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ESR capacity data: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleExportToExcel = async () => {
    if (!data?.esrData) return;

    try {
      const esrData = data.esrData;
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("ESR Capacity");

      // Prepare export data
      const exportData = esrData.map((esr: any) => ({
        "Region": esr.region || "",
        "Circle": esr.circle || "",
        "Division": esr.division || "",
        "Sub Division": esr.sub_division || "",
        "Block": esr.block || "",
        "Scheme ID": esr.scheme_id || "",
        "Scheme Name": esr.scheme_name || "",
        "Village Name": esr.village_name || "",
        "ESR Name": esr.esr_name || "",
        "ESR Capacity (LL)": esr.esr_capacity || "",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      // Add header row
      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      exportData.forEach((row: any) => {
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
        column.width = 20;
      });

      // Generate filename
      const regionText = selectedRegion && selectedRegion !== "all" ? `_${selectedRegion}` : "";
      const schemeText = selectedScheme && selectedScheme !== "all" ? `_${selectedScheme}` : "";
      const filename = `ESR_Capacity${regionText}${schemeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting ESR capacity to Excel:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="esr-capacity-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="esr-capacity-widget mt-2 mb-2">
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-red-700 text-sm">Error loading ESR capacity data: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data?.esrData || data.esrData.length === 0) {
    return (
      <div className="esr-capacity-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">No ESR capacity data available for the selected criteria.</p>
        </div>
      </div>
    );
  }

  const esrData = data.esrData;
  const totalCapacity = data.totalCapacity || 0;
  const totalEsrs = esrData.length;
  const sumByRegion = data.sumByRegion || {};
  const sumByScheme = data.sumByScheme || {};
  const sumByVillage = data.sumByVillage || {};

  return (
    <div className="esr-capacity-widget mt-2 mb-2" data-testid="widget-esr-capacity">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 shadow-sm">
        {/* Summary Section */}
        <div className="mb-4 pb-3 border-b border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-blue-900" data-testid="text-capacity-title">
              📊 ESR Capacity Summary
            </h3>
            <Button
              onClick={handleExportToExcel}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-blue-50 text-blue-600 border-blue-300"
              data-testid="button-export-capacity"
            >
              <Download className="h-4 w-4 mr-1" />
              Export to Excel
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Total ESRs</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="text-total-esrs">
                {totalEsrs}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Total Capacity</p>
              <p className="text-2xl font-bold text-indigo-600" data-testid="text-total-capacity">
                {totalCapacity.toFixed(2)} <span className="text-sm">LL</span>
              </p>
            </div>
          </div>

          {/* Aggregate Sums Section */}
          {(Object.keys(sumByRegion).length > 0 || Object.keys(sumByScheme).length > 0 || Object.keys(sumByVillage).length > 0) && (
            <div className="mt-4 space-y-3">
              {/* Sum by Region */}
              {Object.keys(sumByRegion).length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-2">📍 Capacity by Region:</p>
                  <div className="space-y-1">
                    {Object.entries(sumByRegion).map(([region, sum]) => (
                      <div key={region} className="flex justify-between items-center text-xs">
                        <span className="text-gray-700">{region}</span>
                        <span className="font-bold text-blue-700">{(sum as number).toFixed(2)} LL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sum by Scheme */}
              {Object.keys(sumByScheme).length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-indigo-800 mb-2">🏗️ Capacity by Scheme:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(sumByScheme).map(([scheme, sum]) => (
                      <div key={scheme} className="flex justify-between items-center text-xs">
                        <span className="text-gray-700 flex-1 mr-2">{scheme}</span>
                        <span className="font-bold text-indigo-700 whitespace-nowrap">{(sum as number).toFixed(2)} LL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sum by Village */}
              {Object.keys(sumByVillage).length > 0 && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-purple-800 mb-2">🏘️ Capacity by Village:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(sumByVillage).map(([village, sum]) => (
                      <div key={village} className="flex justify-between items-center text-xs">
                        <span className="text-gray-700 flex-1 mr-2">{village}</span>
                        <span className="font-bold text-purple-700 whitespace-nowrap">{(sum as number).toFixed(2)} LL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedRegion && selectedRegion !== "all" && (
            <p className="text-xs text-gray-600 mt-3">
              📍 Filtered by Region: <span className="font-semibold">{selectedRegion}</span>
            </p>
          )}
          {selectedScheme && selectedScheme !== "all" && (
            <p className="text-xs text-gray-600 mt-1">
              🏗️ Filtered by Scheme: <span className="font-semibold">{selectedScheme}</span>
            </p>
          )}
          {selectedVillage && selectedVillage !== "all" && (
            <p className="text-xs text-gray-600 mt-1">
              🏘️ Filtered by Village: <span className="font-semibold">{selectedVillage}</span>
            </p>
          )}
        </div>

        {/* ESR List - Show first 10 */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {esrData.slice(0, 10).map((esr: any, index: number) => (
            <div
              key={`${esr.scheme_id}-${esr.village_name}-${esr.esr_name}-${index}`}
              className="bg-white rounded-lg p-3 hover:shadow-md transition-shadow border border-gray-100"
              data-testid={`card-esr-${index}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 mb-1" data-testid={`text-esr-name-${index}`}>
                    {esr.esr_name}
                  </h4>
                  <p className="text-xs text-gray-600">
                    📍 {esr.village_name}, {esr.region}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    🏗️ {esr.scheme_name}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-lg font-bold text-indigo-600" data-testid={`text-capacity-${index}`}>
                    {esr.esr_capacity || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">lakh liters</p>
                </div>
              </div>
            </div>
          ))}
          
          {totalEsrs > 10 && (
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700">
                Showing 10 of {totalEsrs} ESRs. Export to Excel to see all data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ESRCapacityWidget;
