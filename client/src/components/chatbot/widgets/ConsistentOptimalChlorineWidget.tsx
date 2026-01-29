import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface ConsistentOptimalChlorineWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
}

const ConsistentOptimalChlorineWidget: React.FC<ConsistentOptimalChlorineWidgetProps> = ({ 
  selectedRegion = "all",
  selectedScheme = "all"
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/category-data/chlorine/consistent-optimal', selectedRegion, selectedScheme],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedScheme && selectedScheme !== "all") {
        params.append("schemeId", selectedScheme);
      }
      
      const response = await fetch(`/api/category-data/chlorine/consistent-optimal?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch consistent optimal chlorine data: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleExportToExcel = async () => {
    if (!data?.data) return;

    try {
      const exportData = data.data.map((esr: any) => ({
        "ESR Name": esr.esr_name || "",
        "Village Name": esr.village_name || "",
        "Region": esr.region || "",
        "Scheme ID": esr.scheme_id || "",
        "Scheme Name": esr.scheme_name || "",
        "Day 1 Chlorine": esr.chlorine_value_1 || 0,
        "Day 1 Date": esr.chlorine_date_day_1 || "",
        "Day 2 Chlorine": esr.chlorine_value_2 || 0,
        "Day 2 Date": esr.chlorine_date_day_2 || "",
        "Day 3 Chlorine": esr.chlorine_value_3 || 0,
        "Day 3 Date": esr.chlorine_date_day_3 || "",
        "Day 4 Chlorine": esr.chlorine_value_4 || 0,
        "Day 4 Date": esr.chlorine_date_day_4 || "",
        "Day 5 Chlorine": esr.chlorine_value_5 || 0,
        "Day 5 Date": esr.chlorine_date_day_5 || "",
        "Day 6 Chlorine": esr.chlorine_value_6 || 0,
        "Day 6 Date": esr.chlorine_date_day_6 || "",
        "Day 7 Chlorine": esr.chlorine_value_7 || 0,
        "Day 7 Date": esr.chlorine_date_day_7 || "",
        "Status": "Optimal (0.2-0.5 mg/L) for all 7 days"
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Consistent Optimal Chlorine");

      const headers = Object.keys(exportData[0] || {});
      worksheet.addRow(headers);

      exportData.forEach((row: any) => {
        worksheet.addRow(headers.map((key) => row[key as keyof typeof row]));
      });

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
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

      headers.forEach((_, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = 15;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `consistent_optimal_chlorine_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error loading data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
            ✅ Consistent Optimal Chlorine (0.2-0.5 mg/L)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ESRs with optimal chlorine levels for all 7 days
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="button-export-consistent-optimal-chlorine"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-count-consistent-optimal-chlorine">
            {data?.count || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            ESRs with consistent optimal chlorine
          </div>
        </div>

        {data?.data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-green-50 dark:bg-green-900/20">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">ESR Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Village</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Region</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Scheme</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">7-Day Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((esr: any, idx: number) => (
                  <tr key={idx} data-testid={`row-esr-${idx}`}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{esr.esr_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{esr.village_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{esr.region}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{esr.scheme_name}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        All 7 days optimal
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsistentOptimalChlorineWidget;
