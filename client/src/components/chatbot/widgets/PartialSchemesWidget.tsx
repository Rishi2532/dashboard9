import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelJS from "exceljs";

interface PartialSchemesWidgetProps {
  schemes: any[];
  selectedRegion?: string;
  schemeType?: string;
}

const PartialSchemesWidget: React.FC<PartialSchemesWidgetProps> = ({ 
  schemes, 
  selectedRegion = "all",
  schemeType = "partial"
}) => {
  const schemesToDisplay = schemes.slice(0, 5);
  const hasMoreSchemes = schemes.length > 5;

  const handleExportToExcel = async () => {
    try {
      // Get the agency mapping function like in schemes.tsx
      const getAgencyByRegion = (regionName: string): string => {
        const regionAgencyMap: { [key: string]: string } = {
          "Amravati": "Maharashtra Jeevan Pradhikaran, Amravati",
          "Nagpur": "Maharashtra Jeevan Pradhikaran, Nagpur", 
          "Chhatrapati Sambhajinagar": "Maharashtra Jeevan Pradhikaran, Chhatrapati Sambhajinagar",
          "Nashik": "Maharashtra Jeevan Pradhikaran, Nashik",
          "Pune": "Maharashtra Jeevan Pradhikaran, Pune",
          "Konkan": "Maharashtra Jeevan Pradhikaran, Konkan"
        };
        return regionAgencyMap[regionName] || "Not Specified";
      };

      // Prepare export data in the same format as schemes.tsx
      const exportData = schemes.map((scheme: any) => ({
        "Scheme ID": scheme.scheme_id || "",
        "Scheme Name": scheme.scheme_name || "",
        "Region": scheme.region || "",
        "Circle": scheme.circle || "",
        "Division": scheme.division || "",
        "Sub Division": scheme.sub_division || "",
        "Block": scheme.block || "",
        "Agency": scheme.agency || (scheme.region ? getAgencyByRegion(scheme.region) : "Not Specified"),
        "Total Villages": scheme.number_of_village || 0,
        "Villages Integrated": scheme.total_villages_integrated || 0,
        "Villages Completed": scheme.fully_completed_villages || 0,
        "Total ESR": scheme.total_number_of_esr || 0,
        "ESR Integrated": scheme.total_esr_integrated || 0,
        "ESR Completed": scheme.no_fully_completed_esr || 0,
        "Partial ESR": (scheme.total_esr_integrated || 0) - (scheme.no_fully_completed_esr || 0),
        "Flow Meters": scheme.flow_meters_connected || 0,
        "Pressure Transmitters": scheme.pressure_transmitter_connected || 0,
        "Residual Chlorine Analyzers": scheme.residual_chlorine_analyzer_connected || 0,
        "MJP Commissioned": scheme.mjp_commissioned || "No",
        "MJP Fully Completed": scheme.mjp_fully_completed || "In Progress",
        "Status": scheme.fully_completion_scheme_status || scheme.scheme_functional_status || "Not-Connected",
        "Scheme Status": scheme.scheme_functional_status || "Unknown",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const schemeTypeCapitalized = schemeType.charAt(0).toUpperCase() + schemeType.slice(1);
      const worksheet = workbook.addWorksheet(`${schemeTypeCapitalized} Schemes`);

      // Add header row
      const headerKeys = exportData.length > 0 ? Object.keys(exportData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      exportData.forEach((row) => {
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
      const filename = `${schemeTypeCapitalized}_Schemes${regionText}_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;

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
      console.error("Error exporting partial/in progress schemes to Excel:", error);
    }
  };

  const getStatusColor = (status: string) => {
    if (status?.toLowerCase().includes('progress') || status?.toLowerCase().includes('partial')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="partial-schemes-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              {selectedRegion !== "all" ? `${selectedRegion} Region - ${schemeType.charAt(0).toUpperCase() + schemeType.slice(1)} Schemes` : `${schemeType.charAt(0).toUpperCase() + schemeType.slice(1)} Schemes`}
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
              key={scheme.scheme_id} 
              className={`px-4 py-3 ${index !== schemesToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
              data-testid={`card-scheme-${scheme.scheme_id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700" data-testid={`text-scheme-name-${scheme.scheme_id}`}>
                    {scheme.scheme_name}
                  </h4>
                  <p className="text-xs text-gray-500" data-testid={`text-scheme-id-${scheme.scheme_id}`}>
                    ID: {scheme.scheme_id}
                  </p>
                </div>
                <div className="flex items-center">
                  <span 
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(scheme.fully_completion_scheme_status)}`}
                    data-testid={`status-scheme-${scheme.scheme_id}`}
                  >
                    {scheme.fully_completion_scheme_status || 'In Progress'}
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs" data-testid={`text-region-${scheme.scheme_id}`}>
                  <span className="text-gray-500">Region:</span> {scheme.region}
                </div>
                <div className="text-xs" data-testid={`text-agency-${scheme.scheme_id}`}>
                  <span className="text-gray-500">Agency:</span> {scheme.agency || 'Not Specified'}
                </div>
                <div className="text-xs" data-testid={`text-villages-${scheme.scheme_id}`}>
                  <span className="text-gray-500">Villages:</span> {scheme.fully_completed_villages}/{scheme.total_villages_integrated}
                </div>
                <div className="text-xs" data-testid={`text-esr-${scheme.scheme_id}`}>
                  <span className="text-gray-500">ESR:</span> {scheme.no_fully_completed_esr}/{scheme.total_esr_integrated}
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

export default PartialSchemesWidget;