import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

interface Above55SchemeWidgetProps {
  schemes: any[];
  selectedRegion?: string;
}

const Above55SchemeWidget: React.FC<Above55SchemeWidgetProps> = ({ 
  schemes, 
  selectedRegion = "all"
}) => {
  const schemesToDisplay = schemes.slice(0, 5);
  const hasMoreSchemes = schemes.length > 5;

  const handleExportToExcel = async () => {
    try {
      const exportData = schemes.map((scheme: any) => ({
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

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Schemes Above 55 LPCD");

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
      if (selectedRegion && selectedRegion !== "all") {
        scopeText = `_${selectedRegion}`;
      }
      const filename = `Schemes_Above_55_LPCD${scopeText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting schemes above 55 LPCD to Excel:", error);
    }
  };

  const getScopeTitle = () => {
    if (selectedRegion && selectedRegion !== "all") {
      return `${selectedRegion} Region - Schemes Above 55 LPCD`;
    }
    return "Schemes Above 55 LPCD";
  };

  return (
    <div className="above-55-scheme-widget mt-2 mb-2">
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

        <div className="max-h-[300px] overflow-y-auto">
          {schemesToDisplay.map((scheme, index) => (
            <div 
              key={`${scheme.scheme_id}-${scheme.block}`} 
              className={`px-4 py-3 ${index !== schemesToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-scheme-${index}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-scheme-name-${index}`}>
                    {scheme.scheme_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-scheme-id-${index}`}>
                    ID: {scheme.scheme_id}
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800"
                    data-testid={`status-scheme-${index}`}
                  >
                    Above 55 LPCD
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-region-${index}`}>
                  <span className="text-gray-500">Region:</span> {scheme.region}
                </div>
                <div className="text-xs" data-testid={`text-population-${index}`}>
                  <span className="text-gray-500">Population:</span> {scheme.total_population?.toLocaleString() || 0}
                </div>
                <div className="text-xs" data-testid={`text-scheme-lpcd-${index}`}>
                  <span className="text-gray-500">Scheme LPCD:</span> {scheme.lpcd_value_day7 || 0} L
                </div>
                <div className="text-xs" data-testid={`text-villages-${index}`}>
                  <span className="text-gray-500">Villages:</span> {scheme.total_villages || 0}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreSchemes && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center" data-testid="text-more-schemes">
              {schemes.length - 5} more schemes not shown. Use the Excel export button above for the complete list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Above55SchemeWidget;
