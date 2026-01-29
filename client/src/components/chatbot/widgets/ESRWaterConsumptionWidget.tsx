import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface ESRWaterConsumptionWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
  selectedVillage?: string;
}

const ESRWaterConsumptionWidget: React.FC<ESRWaterConsumptionWidgetProps> = ({ 
  selectedRegion = "all",
  selectedScheme = "all",
  selectedVillage = "all"
}) => {
  // Fetch ESR water consumption data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/category-data/esr-water-consumption', selectedRegion, selectedScheme, selectedVillage],
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
      
      const response = await fetch(`/api/category-data/esr-water-consumption?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ESR water consumption data: ${response.status}`);
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
      const worksheet = workbook.addWorksheet("ESR Water Consumption");

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
      const filename = `ESR_Water_Consumption${regionText}${schemeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting ESR water consumption to Excel:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="esr-water-consumption-widget mt-2 mb-2">
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
      <div className="esr-water-consumption-widget mt-2 mb-2">
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-red-700 text-sm">Error loading ESR water consumption data: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data?.esrData || data.esrData.length === 0) {
    return (
      <div className="esr-water-consumption-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">No ESR water consumption data available for the selected criteria.</p>
        </div>
      </div>
    );
  }

  const esrData = data.esrData;
  const esrToDisplay = esrData.slice(0, 10); // Show first 10 ESRs
  const hasMoreESRs = esrData.length > 10;

  // Calculate summary statistics
  const totalESRs = esrData.length;
  const functionalESRs = esrData.filter((esr: any) => esr.online_status === 'Online').length;
  const totalWaterDay7 = esrData.reduce((sum: number, esr: any) => sum + (parseFloat(esr.water_value_day7) || 0), 0);

  return (
    <div className="esr-water-consumption-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              {selectedRegion !== "all" ? `${selectedRegion} Region - ` : ""}
              {selectedScheme !== "all" ? `${selectedScheme} Scheme - ` : ""}
              ESR Water Consumption Analysis
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
          <div className="mt-2 flex gap-4 text-xs text-gray-600">
            <span data-testid="text-total-esrs">
              Total ESRs: {totalESRs}
            </span>
            <span data-testid="text-functional-esrs" className="text-green-700">
              Online: {functionalESRs}
            </span>
            <span data-testid="text-total-water-day7" className="text-blue-700">
              Total Water (Day 7): {totalWaterDay7.toFixed(2)} LL
            </span>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {esrToDisplay.map((esr: any, index: number) => (
            <div 
              key={`${esr.scheme_id}-${esr.village_name}-${esr.esr_name}`}
              className={`px-4 py-3 ${index !== esrToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-esr-${esr.scheme_id}-${esr.village_name}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-esr-name-${index}`}>
                    {esr.esr_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-village-scheme-${index}`}>
                    {esr.village_name} - {esr.scheme_name}
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      esr.online_status === 'Online' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                    data-testid={`status-esr-${index}`}
                  >
                    {esr.online_status || 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-capacity-${index}`}>
                  <span className="text-gray-500">Capacity:</span> {esr.esr_capacity || 'N/A'} LL
                </div>
                <div className="text-xs" data-testid={`text-flow-rate-${index}`}>
                  <span className="text-gray-500">Flow Rate:</span> {esr.flow_rate_m3 || 'N/A'} m³
                </div>
              </div>

              {/* 7-day water consumption chart */}
              <div className="mt-3">
                <h5 className="text-xs font-medium text-gray-600 mb-2">7-Day Water Consumption (LL)</h5>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }, (_, day) => {
                    const value = parseFloat(esr[`water_value_day${day + 1}`]) || 0;
                    const date = esr[`water_date_day${day + 1}`] || `D${day + 1}`;
                    const maxValue = Math.max(
                      ...Array.from({ length: 7 }, (_, d) => parseFloat(esr[`water_value_day${d + 1}`]) || 0)
                    );
                    const height = maxValue > 0 ? Math.max((value / maxValue) * 40, 2) : 2;
                    
                    return (
                      <div 
                        key={day} 
                        className="text-center"
                        data-testid={`water-day-${day + 1}-${index}`}
                      >
                        <div className="text-xs mb-1 text-gray-500 truncate" title={date}>
                          {date}
                        </div>
                        <div 
                          className={`w-full mx-auto rounded-t ${
                            value > 0 ? 'bg-blue-500' : 'bg-gray-200'
                          }`}
                          style={{ height: `${height}px` }}
                          title={`${value} LL`}
                        ></div>
                        <div className="text-xs mt-1 font-medium">
                          {value.toFixed(1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreESRs && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center" data-testid="text-more-esrs">
              {esrData.length - 10} more ESRs not shown. Use the Excel export button above for the complete list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ESRWaterConsumptionWidget;