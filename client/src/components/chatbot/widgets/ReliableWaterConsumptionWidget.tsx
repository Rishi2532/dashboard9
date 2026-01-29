import { Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface ReliableWaterConsumptionWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
  selectedVillage?: string;
}

const ReliableWaterConsumptionWidget: React.FC<ReliableWaterConsumptionWidgetProps> = ({ 
  selectedRegion = "all",
  selectedScheme = "all",
  selectedVillage = "all"
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/category-data/reliable-water-consumption', selectedRegion, selectedScheme, selectedVillage],
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
      
      const response = await fetch(`/api/category-data/reliable-water-consumption?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch reliable water consumption data: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleExportToExcel = async () => {
    if (!data?.esrData) return;

    try {
      const esrData = data.esrData;
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Reliable Water Consumption");

      const exportData = esrData.map((esr: any) => ({
        "Region": esr.esr_region || "",
        "Circle": esr.esr_circle || "",
        "Division": esr.esr_division || "",
        "Sub Division": esr.esr_sub_division || "",
        "Block": esr.esr_block || "",
        "Scheme ID": esr.scheme_id || "",
        "Scheme Name": esr.scheme_name || "",
        "Village Name": esr.village_name || "",
        "Population": esr.population || "",
        "ESR Name": esr.esr_name || "",
        "ESR Capacity (LL)": esr.esr_capacity || "",
        "Flow Meter Connected": esr.flow_meter_connected || "",
        "Online Status": esr.online_status || "",
        [`Water ${esr.water_date_day1 || 'Day 1'} (LL)`]: esr.water_value_day1 || 0,
        [`Water ${esr.water_date_day2 || 'Day 2'} (LL)`]: esr.water_value_day2 || 0,
        [`Water ${esr.water_date_day3 || 'Day 3'} (LL)`]: esr.water_value_day3 || 0,
        [`Water ${esr.water_date_day4 || 'Day 4'} (LL)`]: esr.water_value_day4 || 0,
        [`Water ${esr.water_date_day5 || 'Day 5'} (LL)`]: esr.water_value_day5 || 0,
        [`Water ${esr.water_date_day6 || 'Day 6'} (LL)`]: esr.water_value_day6 || 0,
        [`Water ${esr.water_date_day7 || 'Day 7'} (LL)`]: esr.water_value_day7 || 0,
        "Consumption %": esr.consumption_percentage ? parseFloat(esr.consumption_percentage).toFixed(2) : 0,
        [`LPCD ${esr.lpcd_date_day1 || 'Day 1'}`]: esr.lpcd_value_day1 || 0,
        [`LPCD ${esr.lpcd_date_day2 || 'Day 2'}`]: esr.lpcd_value_day2 || 0,
        [`LPCD ${esr.lpcd_date_day3 || 'Day 3'}`]: esr.lpcd_value_day3 || 0,
        [`LPCD ${esr.lpcd_date_day4 || 'Day 4'}`]: esr.lpcd_value_day4 || 0,
        [`LPCD ${esr.lpcd_date_day5 || 'Day 5'}`]: esr.lpcd_value_day5 || 0,
        [`LPCD ${esr.lpcd_date_day6 || 'Day 6'}`]: esr.lpcd_value_day6 || 0,
        [`LPCD ${esr.lpcd_date_day7 || 'Day 7'}`]: esr.lpcd_value_day7 || 0,
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      exportData.forEach((row: any) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "4CAF50" },
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

      const regionText = selectedRegion && selectedRegion !== "all" ? `_${selectedRegion}` : "";
      const schemeText = selectedScheme && selectedScheme !== "all" ? `_${selectedScheme}` : "";
      const filename = `Reliable_Water_Consumption${regionText}${schemeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting reliable water consumption to Excel:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="reliable-water-consumption-widget mt-2 mb-2">
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
      <div className="reliable-water-consumption-widget mt-2 mb-2">
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-red-700 text-sm">Error loading reliable water consumption data: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data?.esrData || data.esrData.length === 0) {
    return (
      <div className="reliable-water-consumption-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm">No villages with reliable water consumption (≤200% ESR capacity + LPCD {'>'} 100) found.</p>
        </div>
      </div>
    );
  }

  const esrData = data.esrData;
  const esrToDisplay = esrData.slice(0, 10);
  const hasMoreESRs = esrData.length > 10;

  const totalESRs = esrData.length;
  const avgConsumptionPct = esrData.reduce((sum: number, esr: any) => sum + (parseFloat(esr.consumption_percentage) || 0), 0) / totalESRs;
  const avgLPCD = esrData.reduce((sum: number, esr: any) => sum + (parseFloat(esr.lpcd_value_day7) || 0), 0) / totalESRs;

  return (
    <div className="reliable-water-consumption-widget mt-2 mb-2">
      <div className="bg-green-50 rounded-lg border border-green-300 overflow-hidden">
        <div className="px-4 py-3 bg-green-100 border-b border-green-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-medium text-green-800">
                {selectedRegion !== "all" ? `${selectedRegion} Region - ` : ""}
                {selectedScheme !== "all" ? `${selectedScheme} Scheme - ` : ""}
                Reliable Water Consumption (≤200% Capacity + LPCD {'>'}100)
              </h3>
            </div>
            <Button 
              size="sm" 
              onClick={handleExportToExcel}
              className="text-xs px-2 py-1 h-6 bg-green-600 hover:bg-green-700"
              data-testid="button-export-excel-reliable"
            >
              <Download className="w-3 h-3 mr-1" />
              Excel
            </Button>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-green-700">
            <span data-testid="text-total-reliable-esrs">
              Total ESRs: {totalESRs}
            </span>
            <span data-testid="text-avg-consumption-pct-reliable" className="font-semibold">
              Avg Consumption: {avgConsumptionPct.toFixed(0)}%
            </span>
            <span data-testid="text-avg-lpcd-reliable" className="text-green-800">
              Avg LPCD: {avgLPCD.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {esrToDisplay.map((esr: any, index: number) => (
            <div 
              key={`${esr.scheme_id}-${esr.village_name}-${esr.esr_name}`}
              className="px-4 py-3 border-b border-green-200 hover:bg-green-50 transition-colors"
              data-testid={`esr-item-reliable-${index}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-green-900" data-testid={`text-esr-name-reliable-${index}`}>
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
                  <p className="text-xs text-gray-600 mt-1" data-testid={`text-esr-location-reliable-${index}`}>
                    {esr.village_name} | {esr.scheme_name}
                  </p>
                  <p className="text-xs text-gray-500" data-testid={`text-esr-region-reliable-${index}`}>
                    {esr.esr_region} {'>'} {esr.esr_circle} {'>'} {esr.esr_division} {'>'} {esr.esr_block}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Consumption</div>
                      <div className="text-lg font-bold text-green-700" data-testid={`text-consumption-pct-reliable-${index}`}>
                        {esr.consumption_percentage ? parseFloat(esr.consumption_percentage).toFixed(0) : 0}%
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-xs text-gray-500">LPCD</div>
                      <div className="text-lg font-bold text-blue-700" data-testid={`text-lpcd-reliable-${index}`}>
                        {parseFloat(esr.lpcd_value_day7 || 0).toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    <span data-testid={`text-water-day7-reliable-${index}`}>
                      {parseFloat(esr.water_value_day7 || 0).toFixed(2)} LL
                    </span>
                    <span className="text-gray-400"> / </span>
                    <span data-testid={`text-capacity-reliable-${index}`}>
                      {parseFloat(esr.esr_capacity || 0).toFixed(2)} LL
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {esr.water_date_day7}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium text-gray-700">7-Day Water Consumption (LL)</div>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div key={day} className="text-center">
                      <div className="text-gray-500 text-[10px]">
                        {esr[`water_date_day${day}`] ? new Date(esr[`water_date_day${day}`]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : `D${day}`}
                      </div>
                      <div className="font-medium text-gray-700">
                        {parseFloat(esr[`water_value_day${day}`] || 0).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <div className="text-xs font-medium text-gray-700">7-Day LPCD</div>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div key={day} className="text-center">
                      <div className="text-gray-500 text-[10px]">
                        {esr[`lpcd_date_day${day}`] ? new Date(esr[`lpcd_date_day${day}`]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : `D${day}`}
                      </div>
                      <div className="font-medium text-blue-700">
                        {parseFloat(esr[`lpcd_value_day${day}`] || 0).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {hasMoreESRs && (
            <div className="px-4 py-3 bg-green-50 border-t border-green-200 text-center">
              <p className="text-xs text-green-700">
                Showing {esrToDisplay.length} of {totalESRs} ESRs. Download Excel for complete data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReliableWaterConsumptionWidget;
