import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface CombinedSchemeLpcdWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
}

const CombinedSchemeLpcdWidget: React.FC<CombinedSchemeLpcdWidgetProps> = ({ 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/scheme-lpcd-data/combined-lpcd', selectedRegion, selectedScheme],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedScheme && selectedScheme !== "all") {
        params.append("schemeId", selectedScheme);
      }
      
      const response = await fetch(`/api/scheme-lpcd-data/combined-lpcd?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch combined scheme LPCD status data: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleExportToExcel = async () => {
    if (!data?.data) return;

    try {
      const { schemesAbove55LPCD, schemesBelow55LPCD } = data.data;
      
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Schemes Above 55 LPCD
      const above55Sheet = workbook.addWorksheet("Schemes Above 55 LPCD");
      
      const above55Data = schemesAbove55LPCD.map((scheme: any) => ({
        "Scheme ID": scheme.scheme_id || "",
        "Scheme Name": scheme.scheme_name || "",
        "Region": scheme.region || "",
        "Block": scheme.block || "",
        "Total Population": scheme.total_population || 0,
        "Total Villages": scheme.total_villages || 0,
        "Villages Above 55 LPCD": scheme.villages_above_55 || 0,
        "Villages Below 55 LPCD": scheme.villages_below_55 || 0,
        "Villages Zero Supply": scheme.villages_zero_supply || 0,
        "Scheme LPCD": scheme.lpcd_value_day7 || 0,
        "MJP Commissioned": scheme.mjp_commissioned || "N/A",
        "Status": "Above 55 LPCD",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      if (above55Data.length > 0) {
        const above55Headers = Object.keys(above55Data[0]);
        above55Sheet.addRow(above55Headers);
        above55Data.forEach((row: any) => {
          above55Sheet.addRow(above55Headers.map((key) => row[key as keyof typeof row]));
        });

        const above55HeaderRow = above55Sheet.getRow(1);
        above55HeaderRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "22C55E" },
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

        above55Headers.forEach((_, index) => {
          const column = above55Sheet.getColumn(index + 1);
          column.width = 15;
        });
      }

      // Sheet 2: Schemes Below 55 LPCD
      const below55Sheet = workbook.addWorksheet("Schemes Below 55 LPCD");
      
      const below55Data = schemesBelow55LPCD.map((scheme: any) => ({
        "Scheme ID": scheme.scheme_id || "",
        "Scheme Name": scheme.scheme_name || "",
        "Region": scheme.region || "",
        "Block": scheme.block || "",
        "Total Population": scheme.total_population || 0,
        "Total Villages": scheme.total_villages || 0,
        "Villages Above 55 LPCD": scheme.villages_above_55 || 0,
        "Villages Below 55 LPCD": scheme.villages_below_55 || 0,
        "Villages Zero Supply": scheme.villages_zero_supply || 0,
        "Scheme LPCD": scheme.lpcd_value_day7 || 0,
        "MJP Commissioned": scheme.mjp_commissioned || "N/A",
        "Status": "Below 55 LPCD",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      if (below55Data.length > 0) {
        const below55Headers = Object.keys(below55Data[0]);
        below55Sheet.addRow(below55Headers);
        below55Data.forEach((row: any) => {
          below55Sheet.addRow(below55Headers.map((key) => row[key as keyof typeof row]));
        });

        const below55HeaderRow = below55Sheet.getRow(1);
        below55HeaderRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F97316" },
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

        below55Headers.forEach((_, index) => {
          const column = below55Sheet.getColumn(index + 1);
          column.width = 15;
        });
      }

      let scopeText = "";
      if (selectedScheme && selectedScheme !== "all") {
        scopeText = `_${selectedScheme.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (selectedRegion && selectedRegion !== "all") {
        scopeText = `_${selectedRegion}`;
      }
      const filename = `Combined_Scheme_LPCD_Status${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting combined scheme LPCD status to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return `${selectedScheme} - Scheme LPCD Statistics`;
    } else if (selectedRegion && selectedRegion !== "all") {
      return `${selectedRegion} Region - Scheme LPCD Statistics`;
    }
    return "Scheme LPCD Statistics";
  };

  if (isLoading) {
    return (
      <div className="combined-scheme-lpcd-widget mt-2 mb-2">
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
      <div className="combined-scheme-lpcd-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-red-600 text-sm" data-testid="text-error">
            Error loading combined scheme LPCD status data: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="combined-scheme-lpcd-widget mt-2 mb-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-gray-600 text-sm" data-testid="text-no-data">
            No scheme LPCD status data available.
          </p>
        </div>
      </div>
    );
  }

  const { schemesAbove55LPCD, schemesBelow55LPCD } = data.data;
  const { counts } = data;

  return (
    <div className="combined-scheme-lpcd-widget mt-2 mb-2">
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

        <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center" data-testid="stat-total">
              <div className="font-semibold text-blue-800">{counts.total}</div>
              <div className="text-blue-600">Total Schemes</div>
            </div>
            <div className="text-center" data-testid="stat-above-55">
              <div className="font-semibold text-green-800">{counts.above55LPCD}</div>
              <div className="text-green-600">Above 55 LPCD</div>
            </div>
            <div className="text-center" data-testid="stat-below-55">
              <div className="font-semibold text-orange-800">{counts.below55LPCD}</div>
              <div className="text-orange-600">Below 55 LPCD</div>
            </div>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          <div className="px-4 py-3 bg-green-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-green-800 mb-2" data-testid="heading-above-55">
              Schemes Above 55 LPCD ({counts.above55LPCD})
            </h4>
            {schemesAbove55LPCD.slice(0, 3).map((scheme: any, index: number) => (
              <div 
                key={`above-55-${scheme.scheme_id}-${scheme.block}-${index}`} 
                className={`py-2 ${index !== Math.min(2, schemesAbove55LPCD.length - 1) ? 'border-b border-green-200' : ''}`}
                data-testid={`card-scheme-above-55-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-green-700" data-testid={`text-scheme-name-above-55-${index}`}>
                      {scheme.scheme_name}
                    </h5>
                    <p className="text-xs text-green-600" data-testid={`text-scheme-id-above-55-${index}`}>
                      {scheme.scheme_id} • {scheme.region}
                    </p>
                    <p className="text-xs text-green-600" data-testid={`text-lpcd-above-55-${index}`}>
                      LPCD: {scheme.lpcd_value_day7} | Villages: {scheme.total_villages}
                    </p>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800"
                    data-testid={`status-scheme-above-55-${index}`}
                  >
                    ≥55 LPCD
                  </span>
                </div>
              </div>
            ))}
            {schemesAbove55LPCD.length > 3 && (
              <div className="pt-2 text-xs text-green-600" data-testid="text-more-above-55">
                +{schemesAbove55LPCD.length - 3} more schemes above 55 LPCD
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-orange-50">
            <h4 className="text-sm font-medium text-orange-800 mb-2" data-testid="heading-below-55">
              Schemes Below 55 LPCD ({counts.below55LPCD})
            </h4>
            {schemesBelow55LPCD.slice(0, 3).map((scheme: any, index: number) => (
              <div 
                key={`below-55-${scheme.scheme_id}-${scheme.block}-${index}`} 
                className={`py-2 ${index !== Math.min(2, schemesBelow55LPCD.length - 1) ? 'border-b border-orange-200' : ''}`}
                data-testid={`card-scheme-below-55-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-orange-700" data-testid={`text-scheme-name-below-55-${index}`}>
                      {scheme.scheme_name}
                    </h5>
                    <p className="text-xs text-orange-600" data-testid={`text-scheme-id-below-55-${index}`}>
                      {scheme.scheme_id} • {scheme.region}
                    </p>
                    <p className="text-xs text-orange-600" data-testid={`text-lpcd-below-55-${index}`}>
                      LPCD: {scheme.lpcd_value_day7} | Villages: {scheme.total_villages}
                    </p>
                  </div>
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-800"
                    data-testid={`status-scheme-below-55-${index}`}
                  >
                    &lt;55 LPCD
                  </span>
                </div>
              </div>
            ))}
            {schemesBelow55LPCD.length > 3 && (
              <div className="pt-2 text-xs text-orange-600" data-testid="text-more-below-55">
                +{schemesBelow55LPCD.length - 3} more schemes below 55 LPCD
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center" data-testid="text-export-note">
            Use the Excel export button above for the complete list with detailed scheme data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CombinedSchemeLpcdWidget;
