import React from "react";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface AbruptWaterConsumptionWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
  selectedVillage?: string;
}

const AbruptWaterConsumptionWidget: React.FC<AbruptWaterConsumptionWidgetProps> = ({ 
  selectedRegion = "all",
  selectedScheme = "all",
  selectedVillage = "all"
}) => {
  // Fetch abrupt water consumption data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/category-data/abrupt-water-consumption', selectedRegion, selectedScheme, selectedVillage],
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
      
      const response = await fetch(`/api/category-data/abrupt-water-consumption?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch abrupt water consumption data: ${response.status}`);
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
      const worksheet = workbook.addWorksheet("Abrupt Water Consumption");

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
        "Flow Rate (m³)": esr.flow_rate_m3 || "",
        "Flow Meter Connected": esr.flow_meter_connected || "",
        "Online Status": esr.online_status || "",
        "Water Day 1 (LL)": esr.water_value_day1 || 0,
        "Water Day 2 (LL)": esr.water_value_day2 || 0,
        "Water Day 3 (LL)": esr.water_value_day3 || 0,
        "Water Day 4 (LL)": esr.water_value_day4 || 0,
        "Water Day 5 (LL)": esr.water_value_day5 || 0,
        "Water Day 6 (LL)": esr.water_value_day6 || 0,
        "Water Day 7 (LL)": esr.water_value_day7 || 0,
        "Date Day 1": esr.water_date_day1 || "",
        "Date Day 2": esr.water_date_day2 || "",
        "Date Day 3": esr.water_date_day3 || "",
        "Date Day 4": esr.water_date_day4 || "",
        "Date Day 5": esr.water_date_day5 || "",
        "Date Day 6": esr.water_date_day6 || "",
        "Date Day 7": esr.water_date_day7 || "",
        "Consumption Percentage (%)": esr.consumption_percentage ? parseFloat(esr.consumption_percentage).toFixed(2) : 0,
        "Consistent Zero Consumption": esr.consistent_zero_consumption || 0,
        "Percentage Consumption Previous Day": esr.percentage_consumption_previous_day || 0,
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
        column.width = 15;
      });

      // Generate filename
      const regionText = selectedRegion && selectedRegion !== "all" ? `_${selectedRegion}` : "";
      const schemeText = selectedScheme && selectedScheme !== "all" ? `_${selectedScheme}` : "";
      const filename = `Abrupt_Water_Consumption${regionText}${schemeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting abrupt water consumption to Excel:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="abrupt-water-consumption-widget mt-2 mb-2">
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
      <div className="abrupt-water-consumption-widget mt-2 mb-2">
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-red-700 text-sm">Error loading abrupt water consumption data: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data?.esrData || data.esrData.length === 0) {
    return (
      <div className="abrupt-water-consumption-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">No ESRs with abrupt water consumption ({'>'}400%) found for the selected criteria.</p>
        </div>
      </div>
    );
  }

  const esrData = data.esrData;
  const esrToDisplay = esrData.slice(0, 10); // Show first 10 ESRs
  const hasMoreESRs = esrData.length > 10;

  // Calculate summary statistics
  const totalESRs = esrData.length;
  const totalWaterDay7 = esrData.reduce((sum: number, esr: any) => sum + (parseFloat(esr.water_value_day7) || 0), 0);
  const avgConsumptionPct = esrData.reduce((sum: number, esr: any) => sum + (parseFloat(esr.consumption_percentage) || 0), 0) / totalESRs;

  return (
    <div className="abrupt-water-consumption-widget mt-2 mb-2">
      <div className="bg-red-50 rounded-lg border border-red-300 overflow-hidden">
        <div className="px-4 py-3 bg-red-100 border-b border-red-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-medium text-red-800">
                {selectedRegion !== "all" ? `${selectedRegion} Region - ` : ""}
                {selectedScheme !== "all" ? `${selectedScheme} Scheme - ` : ""}
                Abrupt Water Consumption Alert ({'>'}400%)
              </h3>
            </div>
            <Button 
              size="sm" 
              onClick={handleExportToExcel}
              className="text-xs px-2 py-1 h-6 bg-red-600 hover:bg-red-700"
              data-testid="button-export-excel-abrupt"
            >
              <Download className="w-3 h-3 mr-1" />
              Excel
            </Button>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-red-700">
            <span data-testid="text-total-abrupt-esrs">
              Total Affected ESRs: {totalESRs}
            </span>
            <span data-testid="text-avg-consumption-pct" className="font-semibold">
              Avg Consumption: {avgConsumptionPct.toFixed(0)}%
            </span>
            <span data-testid="text-total-water-day7-abrupt" className="text-red-800">
              Total Water (Day 7): {totalWaterDay7.toFixed(2)} LL
            </span>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {esrToDisplay.map((esr: any, index: number) => (
            <div 
              key={`${esr.scheme_id}-${esr.village_name}-${esr.esr_name}`}
              className="px-4 py-3 border-b border-red-200 hover:bg-red-50 transition-colors"
              data-testid={`esr-item-abrupt-${index}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-red-900" data-testid={`text-esr-name-abrupt-${index}`}>
                      {esr.esr_name}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      esr.online_status === 'Online' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {esr.online_status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1" data-testid={`text-esr-location-abrupt-${index}`}>
                    {esr.village_name} | {esr.scheme_name}
                  </p>
                  <p className="text-xs text-gray-500" data-testid={`text-esr-region-abrupt-${index}`}>
                    {esr.region} {'>'} {esr.circle} {'>'} {esr.division} {'>'} {esr.block}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xl font-bold text-red-700" data-testid={`text-consumption-pct-abrupt-${index}`}>
                    {esr.consumption_percentage ? parseFloat(esr.consumption_percentage).toFixed(0) : 0}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    <span data-testid={`text-water-day7-abrupt-${index}`}>
                      {parseFloat(esr.water_value_day7 || 0).toFixed(2)} LL
                    </span>
                    <span className="text-gray-400"> / </span>
                    <span data-testid={`text-capacity-abrupt-${index}`}>
                      {parseFloat(esr.esr_capacity || 0).toFixed(2)} LL
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {esr.water_date_day7}
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 text-xs">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div key={day} className="text-center">
                    <div className="text-gray-500 text-[10px]">Day {day}</div>
                    <div className="font-medium text-gray-700">
                      {parseFloat(esr[`water_value_day${day}`] || 0).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {hasMoreESRs && (
            <div className="px-4 py-3 bg-red-50 border-t border-red-200 text-center">
              <p className="text-xs text-red-700">
                Showing {esrToDisplay.length} of {totalESRs} ESRs. Download Excel for complete data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbruptWaterConsumptionWidget;
