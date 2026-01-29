import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import ExcelJS from "exceljs";

interface OfflineSensorWidgetProps {
  selectedRegion?: string;
  selectedScheme?: string;
  type: "chlorine" | "pressure";
  days: number;
}

const OfflineSensorWidget: React.FC<OfflineSensorWidgetProps> = ({
  selectedRegion = "all",
  selectedScheme = "all",
  type,
  days
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/category-data/${type}/offline`, selectedRegion, selectedScheme, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedScheme && selectedScheme !== "all") {
        params.append("schemeId", selectedScheme);
      }
      params.append("days", days.toString());

      const response = await fetch(`/api/category-data/${type}/offline?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch offline ${type} sensor data: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleExportToExcel = async () => {
    if (!data?.data) return;

    try {
      const exportData = data.data.map((item: any) => ({
        "ESR Name": item.esr_name || "",
        "Village Name": item.village_name || "",
        "Region": item.region || "",
        "Scheme ID": item.scheme_id || "",
        "Scheme Name": item.scheme_name || "",
        "Last Seen": item.last_seen ? new Date(item.last_seen).toLocaleString() : "Unknown",
        [`${type === "chlorine" ? "Chlorine" : "Pressure"} Status`]: type === "chlorine" ? item.chlorine_status : item.pressure_status,
        "Status": `Offline for ${days}+ days`
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Offline ${type === "chlorine" ? "Chlorine" : "Pressure"} Sensors`);

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
          fgColor: { argb: "EF4444" },
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
        column.width = 20;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `offline_${type}_sensors_${days}days_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error loading data: {(error as Error).message}</p>
      </div>
    );
  }

  const title = type === "chlorine"
    ? `⚠️ Chlorine Sensors Offline for ${days}+ Days`
    : `⚠️ Pressure Sensors Offline for ${days}+ Days`;

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sensors not communicating for more than {days} days
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {data?.count || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Offline Sensors Found
          </div>
        </div>

        {data?.data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-red-50 dark:bg-red-900/20">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">ESR Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Village</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Region</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Last Seen</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.esr_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.village_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.region}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {item.last_seen ? new Date(item.last_seen).toLocaleDateString() : "Unknown"}
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

export default OfflineSensorWidget;
