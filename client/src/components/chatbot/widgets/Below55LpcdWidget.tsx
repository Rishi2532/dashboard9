import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";
import { t, Language } from "@/lib/translations";

interface Below55LpcdWidgetProps {
  villages: any[];
  selectedRegion?: string;
  selectedScheme?: string;
  language?: Language;
}

const Below55LpcdWidget: React.FC<Below55LpcdWidgetProps> = ({ 
  villages, 
  selectedRegion = "all",
  selectedScheme = "all",
  language = "en"
}) => {
  const villagesToDisplay = villages.slice(0, 5);
  const hasMoreVillages = villages.length > 5;

  const handleExportToExcel = async () => {
    try {
      const exportData = villages.map((village: any) => ({
        [t("scheme.id", language)]: village.scheme_id || "",
        [t("scheme.name", language)]: village.scheme_name || "",
        [t("common.region", language)]: village.region || "",
        [t("village.name", language)]: village.village_name || "",
        [t("esr.name", language)]: village.esr_name || "",
        "LPCD Day 1": village.lpcd_value_day1 || 0,
        "LPCD Day 2": village.lpcd_value_day2 || 0,
        "LPCD Day 3": village.lpcd_value_day3 || 0,
        "LPCD Day 4": village.lpcd_value_day4 || 0,
        "LPCD Day 5": village.lpcd_value_day5 || 0,
        "LPCD Day 6": village.lpcd_value_day6 || 0,
        "LPCD Day 7": village.lpcd_value_day7 || 0,
        [t("lpcd.averageLpcd", language)]: ((Number(village.lpcd_value_day1 || 0) + Number(village.lpcd_value_day2 || 0) + 
                        Number(village.lpcd_value_day3 || 0) + Number(village.lpcd_value_day4 || 0) + 
                        Number(village.lpcd_value_day5 || 0) + Number(village.lpcd_value_day6 || 0) + 
                        Number(village.lpcd_value_day7 || 0)) / 7).toFixed(2),
        [t("common.population", language)]: village.population || 0,
        [t("esr.capacityInLL", language)]: village.esr_capacity || 0,
        [t("common.status", language)]: t("lpcd.below55", language),
        [t("common.lastUpdated", language)]: new Date().toLocaleDateString("en-IN"),
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(t("lpcd.villagesBelow55", language));

      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      exportData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF9800" },
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

      let scopeText = "";
      if (selectedScheme && selectedScheme !== "all") {
        scopeText = `_${selectedScheme.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (selectedRegion && selectedRegion !== "all") {
        scopeText = `_${selectedRegion}`;
      }
      const filename = `Villages_Below_55_LPCD${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting villages below 55 LPCD to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return t("lpcd.villagesBelow55ForScheme", language, { scheme: selectedScheme });
    } else if (selectedRegion && selectedRegion !== "all") {
      return t("lpcd.villagesBelow55ForRegion", language, { region: selectedRegion });
    }
    return t("lpcd.villagesBelow55", language);
  };

  return (
    <div className="below-55-lpcd-widget mt-2 mb-2">
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
              {t("common.excel", language)}
            </Button>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {villagesToDisplay.map((village, index) => (
            <div 
              key={`${village.scheme_id}-${village.village_name}-${village.esr_name}`} 
              className={`px-4 py-3 ${index !== villagesToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-village-${index}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-village-name-${index}`}>
                    {village.village_name} - {village.esr_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-scheme-name-${index}`}>
                    {village.scheme_name}
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-800"
                    data-testid={`status-village-${index}`}
                  >
                    {t("lpcd.below55", language)}
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-region-${index}`}>
                  <span className="text-gray-500">{t("common.region", language)}:</span> {village.region}
                </div>
                <div className="text-xs" data-testid={`text-population-${index}`}>
                  <span className="text-gray-500">{t("common.population", language)}:</span> {village.population || 0}
                </div>
                <div className="text-xs" data-testid={`text-latest-lpcd-${index}`}>
                  <span className="text-gray-500">{t("lpcd.latestLpcd", language)}:</span> {village.lpcd_value_day7 || 0} L
                </div>
                <div className="text-xs" data-testid={`text-capacity-${index}`}>
                  <span className="text-gray-500">{t("esr.capacity", language)}:</span> {village.esr_capacity || 0} LL
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreVillages && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center" data-testid="text-more-villages">
              {villages.length - 5} {t("common.moreNotShown", language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Below55LpcdWidget;
