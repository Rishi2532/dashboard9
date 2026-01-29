import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";
import { t, Language } from "@/lib/translations";

interface OptimalChlorineWidgetProps {
  esrs: any[];
  selectedRegion?: string;
  selectedScheme?: string;
  language?: Language;
}

const OptimalChlorineWidget: React.FC<OptimalChlorineWidgetProps> = ({ 
  esrs, 
  selectedRegion = "all",
  selectedScheme = "all",
  language = "en"
}) => {
  const esrsToDisplay = esrs.slice(0, 5);
  const hasMoreEsrs = esrs.length > 5;

  const handleExportToExcel = async () => {
    try {
      const getChlorineDateHeaders = (esr: any) => {
        const headers: any = {};
        for (let i = 1; i <= 7; i++) {
          const dateField = `chlorine_date_day_${i}`;
          const valueField = `chlorine_value_${i}`;
          const actualDate = esr[dateField] || `Day ${i}`;
          headers[`Chlorine ${actualDate} (mg/L)`] = esr[valueField] || 0;
        }
        return headers;
      };

      const exportData = esrs.map((esr: any) => ({
        [t("scheme.id", language)]: esr.scheme_id || "",
        [t("scheme.name", language)]: esr.scheme_name || "",
        [t("common.region", language)]: esr.region || "",
        [t("village.name", language)]: esr.village_name || "",
        [t("esr.name", language)]: esr.esr_name || "",
        ...getChlorineDateHeaders(esr),
        [t("chlorine.averageChlorine", language) + " (mg/L)"]: ((Number(esr.chlorine_value_1 || 0) + Number(esr.chlorine_value_2 || 0) + 
                                    Number(esr.chlorine_value_3 || 0) + Number(esr.chlorine_value_4 || 0) + 
                                    Number(esr.chlorine_value_5 || 0) + Number(esr.chlorine_value_6 || 0) + 
                                    Number(esr.chlorine_value_7 || 0)) / 7).toFixed(3),
        [t("chlorine.chlorineStatus", language)]: t("chlorine.optimalStatus", language),
        [t("chlorine.sensorId", language)]: esr.sensor_id || "",
        [t("chlorine.connectionStatus", language)]: esr.chlorine_connected || t("chlorine.unknown", language),
        [t("common.lastUpdated", language)]: new Date().toLocaleDateString("en-IN"),
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(t("chlorine.esrsOptimal", language));

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

      let scopeText = "";
      if (selectedScheme && selectedScheme !== "all") {
        scopeText = `_${selectedScheme.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } else if (selectedRegion && selectedRegion !== "all") {
        scopeText = `_${selectedRegion}`;
      }
      const filename = `ESRs_Optimal_Chlorine${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting ESRs with optimal chlorine to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedScheme && selectedScheme !== "all") {
      return t("chlorine.esrsOptimalForScheme", language, { scheme: selectedScheme });
    } else if (selectedRegion && selectedRegion !== "all") {
      return t("chlorine.esrsOptimalForRegion", language, { region: selectedRegion });
    }
    return t("chlorine.esrsOptimal", language);
  };

  return (
    <div className="optimal-chlorine-widget mt-2 mb-2">
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
          {esrsToDisplay.map((esr, index) => (
            <div 
              key={`${esr.scheme_id}-${esr.village_name}-${esr.esr_name}`} 
              className={`px-4 py-3 ${index !== esrsToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-esr-${index}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-esr-name-${index}`}>
                    {esr.village_name} - {esr.esr_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-scheme-name-${index}`}>
                    {esr.scheme_name}
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800"
                    data-testid={`status-esr-${index}`}
                  >
                    {t("chlorine.optimalStatus", language)}
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-region-${index}`}>
                  <span className="text-gray-500">{t("common.region", language)}:</span> {esr.region}
                </div>
                <div className="text-xs" data-testid={`text-latest-chlorine-${index}`}>
                  <span className="text-gray-500">{t("chlorine.latestChlorine", language)}:</span> {Number(esr.chlorine_value_7 || 0).toFixed(2)} mg/L
                </div>
                <div className="text-xs" data-testid={`text-sensor-id-${index}`}>
                  <span className="text-gray-500">{t("chlorine.sensorId", language)}:</span> {esr.sensor_id || t("chlorine.notAvailable", language)}
                </div>
                <div className="text-xs" data-testid={`text-connection-${index}`}>
                  <span className="text-gray-500">{t("chlorine.connection", language)}:</span> {esr.chlorine_connected || t("chlorine.unknown", language)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreEsrs && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center" data-testid="text-more-esrs">
              {esrs.length - 5} {t("common.moreEsrsNotShown", language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimalChlorineWidget;
