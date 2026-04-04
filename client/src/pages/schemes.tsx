import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import GeographicalFilters from "@/components/dashboard/GeographicalFilters";
import AgencyTypeFilter from "@/components/dashboard/AgencyTypeFilter";
import SchemeTable from "@/components/dashboard/scheme-table";
import SchemeDetailsModal from "@/components/dashboard/scheme-details-modal";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SchemeStatus, Region } from "@/types";

export default function Schemes() {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCircle, setSelectedCircle] = useState("all");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState("all");
  const [selectedAgencyType, setSelectedAgencyType] = useState("ALL");
  const [selectedScheme, setSelectedScheme] = useState<SchemeStatus | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentFilteredSchemes, setCurrentFilteredSchemes] = useState<
    SchemeStatus[]
  >([]);
  const { toast } = useToast();

  // Fetch regions data
  const { data: regions, isLoading: isRegionsLoading } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  // Fetch cascading filter options
  const { data: filterOptions } = useQuery({
    queryKey: [
      "/api/schemes/filters",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedAgencyType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedCircle !== "all") params.set("circle", selectedCircle);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (selectedSubdivision !== "all")
        params.set("subdivision", selectedSubdivision);
      if (selectedAgencyType !== "ALL")
        params.set("agencyType", selectedAgencyType);

      const response = await fetch(`/api/schemes/filters?${params.toString()}`);
      return response.json();
    },
  });

  // Fetch schemes data with region and status filters
  const { data: schemes, isLoading: isSchemesLoading } = useQuery({
    queryKey: [
      "/api/schemes",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
      statusFilter,
      selectedAgencyType,
    ],
    queryFn: () => {
      let url = `/api/schemes`;
      const params = new URLSearchParams();

      if (selectedRegion !== "" && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      if (selectedCircle !== "all") {
        params.append("circle", selectedCircle);
      }

      if (selectedDivision !== "all") {
        params.append("division", selectedDivision);
      }

      if (selectedSubdivision !== "all") {
        params.append("subdivision", selectedSubdivision);
      }

      if (selectedBlock !== "all") {
        params.append("block", selectedBlock);
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (selectedAgencyType !== "ALL") {
        params.append("agencyType", selectedAgencyType);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      return fetch(url).then((res) => res.json());
    },
  });

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setSelectedCircle("all");
    setSelectedDivision("all");
    setSelectedSubdivision("all");
    setSelectedBlock("all");
  };

  const handleCircleChange = (circle: string) => {
    setSelectedCircle(circle);
    setSelectedDivision("all");
    setSelectedSubdivision("all");
    setSelectedBlock("all");
  };

  const handleDivisionChange = (division: string) => {
    setSelectedDivision(division);
    setSelectedSubdivision("all");
    setSelectedBlock("all");
  };

  const handleSubdivisionChange = (subdivision: string) => {
    setSelectedSubdivision(subdivision);
    setSelectedBlock("all");
  };

  const handleBlockChange = (block: string) => {
    setSelectedBlock(block);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
  };

  const handleViewSchemeDetails = (scheme: SchemeStatus) => {
    setSelectedScheme(scheme);
    setIsModalOpen(true);
  };

  const handleNavigateToSchemeDetails = (scheme: SchemeStatus) => {
    console.log("Navigating to scheme details page for:", scheme);
    const encodedSchemeId = encodeURIComponent(scheme.scheme_id);
    // For multi-block schemes, don't pass block parameter
    const isMultiBlock =
      scheme.block === "All Blocks" || scheme.block === "Multiple Blocks";
    const url =
      isMultiBlock || !scheme.block
        ? `/scheme/${encodedSchemeId}`
        : `/scheme/${encodedSchemeId}/${encodeURIComponent(scheme.block)}`;
    window.location.href = url;
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Listen for chatbot events
  useEffect(() => {
    const handleChatbotRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Schemes page received chatbot region filter:", region);
      setSelectedRegion(region);
      // Also reset status filter to ensure proper filtering
      setStatusFilter("all");
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Schemes page received excel export command:", { region, pageType });

      // Only respond if this is the right page type
      if (pageType === 'schemes') {
        // Wait for data to be available, then export
        setTimeout(() => {
          if (currentFilteredSchemes && currentFilteredSchemes.length > 0) {
            exportToExcel();
            console.log("Excel export triggered for Schemes data with", currentFilteredSchemes.length, "records");
          } else {
            console.log("No filtered schemes data available for export");
          }
        }, 1500); // Wait longer for queries to refetch
      }
    };

    window.addEventListener('chatbot-region-filter', handleChatbotRegionFilter as EventListener);
    window.addEventListener('chatbot-export-excel', handleChatbotExcelExport as EventListener);

    // Expose export function globally for chatbot
    (window as any).triggerDashboardExport = () => {
      return new Promise<void>((resolve) => {
        exportToExcel();
        // Small delay to ensure export starts
        setTimeout(resolve, 100);
      });
    };

    return () => {
      window.removeEventListener('chatbot-region-filter', handleChatbotRegionFilter as EventListener);
      window.removeEventListener('chatbot-export-excel', handleChatbotExcelExport as EventListener);

      // Clean up global export function
      if ((window as any).triggerDashboardExport) {
        (window as any).triggerDashboardExport = undefined;
      }
    };
  }, [currentFilteredSchemes]);

  const exportComprehensiveReport = async () => {
    try {
      const allFilteredSchemes = currentFilteredSchemes;
      if (allFilteredSchemes.length === 0) {
        toast({
          title: "No Data To Export",
          description:
            "There are no schemes matching your current filter criteria.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Preparing Comprehensive Report",
        description: `Gathering comprehensive data for ${allFilteredSchemes.length} schemes...`,
      });

      // Prepare API call parameters based on current filters
      let apiParams = new URLSearchParams();
      if (selectedRegion !== "" && selectedRegion !== "all") {
        apiParams.append("region", selectedRegion);
      }
      if (selectedAgencyType !== "ALL") {
        apiParams.append("agencyType", selectedAgencyType);
      }

      // Fetch comprehensive data from multiple endpoints
      const [waterSchemeData, chlorineData, pressureData, communicationData] = await Promise.all([
        fetch(`/api/water-scheme-data?${apiParams.toString()}`).then(res => res.json()),
        fetch(`/api/chlorine?${apiParams.toString()}`).then(res => res.json()),
        fetch(`/api/pressure?${apiParams.toString()}`).then(res => res.json()),
        fetch(`/api/communication?${apiParams.toString()}`).then(res => res.json())
      ]);

      // Create comprehensive Excel with merged headers and color coding
      await generateComprehensiveExcel(allFilteredSchemes, waterSchemeData, chlorineData, pressureData, communicationData);

    } catch (error) {
      console.error("Comprehensive export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the comprehensive report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateComprehensiveExcel = async (schemes: SchemeStatus[], waterData: any[], chlorineData: any[], pressureData: any[], communicationData: any[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Comprehensive Report");

    // Define colors for different ranges (matching your image)
    const colors = {
      green: { argb: "FF00B050" },    // Green for optimal/good values
      yellow: { argb: "FFFF9900" },   // Yellow/Orange for suboptimal  
      red: { argb: "FFFF0000" },      // Red for problematic
      header: { argb: "FF4472C4" }    // Blue for headers
    };

    // Helper function to safely convert values to numbers
    const toNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    };

    // Create header structure with merged cells - Row 1: Main headers
    worksheet.mergeCells('A1:A2'); // Region
    worksheet.mergeCells('B1:B2'); // Scheme Name  
    worksheet.mergeCells('C1:C2'); // Status
    worksheet.mergeCells('D1:D2'); // Total Flow Sensor
    worksheet.mergeCells('E1:E2'); // No. Sensor Online
    worksheet.mergeCells('F1:G1'); // 55LPCD Village Achievement (spans 2 columns)
    worksheet.mergeCells('H1:H2'); // No. of ESR
    worksheet.mergeCells('I1:I2'); // No. CL Sensor Online
    worksheet.mergeCells('J1:J2'); // Total CL Sensor
    worksheet.mergeCells('K1:M1'); // Chlorin Range (spans 3 columns)
    worksheet.mergeCells('N1:N2'); // No Pressure Sensor Online
    worksheet.mergeCells('O1:O2'); // Total Pressure Sensor
    worksheet.mergeCells('P1:R1'); // Pressure Range (spans 3 columns)

    // Set main headers
    const mainHeaders = [
      'Region', 'Scheme Name', 'Status', 'Total Flow\nSensor', 'No. Sensor\nOnline',
      '55LPCD Village Achievement', '', 'No. of\nESR', 'No. CL\nSensor Online', 'Total CL\nSensor',
      'Chlorin Range', '', '', 'No\nPressure\nSensor Online', 'Total\nPressure Sensor',
      'Pressure', '', ''
    ];
    worksheet.getRow(1).values = mainHeaders;

    // Row 2: Sub headers
    const subHeaders = [
      '', '', '', '', '', 'Yes', 'No', '', '', '',
      '0.2 - 0.5\nMg/l', '<0.2 Mg/l', '>0.5 Mg/l', '', '',
      '0.2 - 0.7\nBar', '<0.2\nBar', '>0.7\nBar'
    ];
    worksheet.getRow(2).values = subHeaders;

    // Style headers
    [1, 2].forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: colors.header };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" }
        };
      });
      row.height = 30;
    });

    // Process data for each scheme
    let rowIndex = 3;
    for (const scheme of schemes) {
      // Filter data by scheme_id (more reliable than scheme_name)
      const schemeWaterData = waterData.filter(w => w.scheme_id === scheme.scheme_id);
      const schemeChlorineData = chlorineData.filter(c => c.scheme_id === scheme.scheme_id);
      const schemePressureData = pressureData.filter(p => p.scheme_id === scheme.scheme_id);
      const schemeCommunicationData = communicationData.filter(comm => comm.scheme_id === scheme.scheme_id);

      // Calculate 55LPCD Achievement counts - use water_value_day7 and handle null/string values
      const lpcdYes = schemeWaterData.filter(w => {
        const waterVal = toNumber(w.water_value_day7);
        return waterVal >= 55;
      }).length;

      const lpcdNo = schemeWaterData.filter(w => {
        const waterVal = toNumber(w.water_value_day7);
        return waterVal > 0 && waterVal < 55;
      }).length;

      // Calculate sensor online counts from communication_status aggregated data
      const commData = schemeCommunicationData[0]; // Get the first (and only) record for this scheme
      const flowSensorsOnline = commData?.communication_status?.flow_meter_online || 0;
      const clSensorsOnline = commData?.communication_status?.chlorine_online || 0;
      const pressureSensorsOnline = commData?.communication_status?.pressure_online || 0;

      // Calculate chlorine ranges - handle null/string values properly
      const chlorine02to05 = schemeChlorineData.filter(c => {
        const chlorineVal = toNumber(c.chlorine_value_7);
        return chlorineVal >= 0.2 && chlorineVal <= 0.5;
      }).length;

      const chlorineLess02 = schemeChlorineData.filter(c => {
        const chlorineVal = toNumber(c.chlorine_value_7);
        return chlorineVal > 0 && chlorineVal < 0.2;
      }).length;

      const chlorineGreater05 = schemeChlorineData.filter(c => {
        const chlorineVal = toNumber(c.chlorine_value_7);
        return chlorineVal > 0.5;
      }).length;

      // Calculate pressure ranges - handle null/string values properly  
      const pressure02to07 = schemePressureData.filter(p => {
        const pressureVal = toNumber(p.pressure_value_7);
        return pressureVal >= 0.2 && pressureVal <= 0.7;
      }).length;

      const pressureLess02 = schemePressureData.filter(p => {
        const pressureVal = toNumber(p.pressure_value_7);
        return pressureVal > 0 && pressureVal < 0.2;
      }).length;

      const pressureGreater07 = schemePressureData.filter(p => {
        const pressureVal = toNumber(p.pressure_value_7);
        return pressureVal > 0.7;
      }).length;

      // Add data row
      const rowData = [
        scheme.region || '',
        scheme.scheme_name || '',
        scheme.fully_completion_scheme_status || scheme.scheme_functional_status || '',
        scheme.flow_meters_connected || 0,
        flowSensorsOnline,
        lpcdYes,
        lpcdNo,
        scheme.total_number_of_esr || 0,
        clSensorsOnline,
        scheme.residual_chlorine_analyzer_connected || 0,
        chlorine02to05,
        chlorineLess02,
        chlorineGreater05,
        pressureSensorsOnline,
        scheme.pressure_transmitter_connected || 0,
        pressure02to07,
        pressureLess02,
        pressureGreater07
      ];

      const row = worksheet.getRow(rowIndex);
      row.values = rowData;

      // Apply color coding exactly as shown in your image
      row.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: colors.green }; // LPCD Yes - Green
      row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: colors.red };   // LPCD No - Red

      row.getCell(11).fill = { type: "pattern", pattern: "solid", fgColor: colors.green }; // Chlorine 0.2-0.5 - Green
      row.getCell(12).fill = { type: "pattern", pattern: "solid", fgColor: colors.yellow }; // Chlorine <0.2 - Yellow
      row.getCell(13).fill = { type: "pattern", pattern: "solid", fgColor: colors.red };   // Chlorine >0.5 - Red

      row.getCell(16).fill = { type: "pattern", pattern: "solid", fgColor: colors.green }; // Pressure 0.2-0.7 - Green
      row.getCell(17).fill = { type: "pattern", pattern: "solid", fgColor: colors.yellow }; // Pressure <0.2 - Yellow
      row.getCell(18).fill = { type: "pattern", pattern: "solid", fgColor: colors.red };   // Pressure >0.7 - Red

      // Apply borders and alignment
      row.eachCell(cell => {
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" }
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      rowIndex++;
    }

    // Set column widths
    const columnWidths = [12, 25, 15, 10, 10, 8, 8, 8, 10, 10, 10, 10, 10, 12, 12, 10, 8, 8];
    columnWidths.forEach((width, idx) => {
      worksheet.getColumn(idx + 1).width = width;
    });

    // Generate filename and download
    const region = selectedRegion === "all" ? "All_Regions" : selectedRegion.replace(/\s+/g, "_");
    const status = statusFilter === "all" ? "All_Status" : statusFilter.replace(/\s+/g, "_");
    const today = new Date().toISOString().split("T")[0];
    const filename = `Comprehensive_Report_${region}_${status}_${today}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Comprehensive report exported: ${filename}`,
      variant: "default",
    });
  };

  const exportToExcel = async () => {
    try {
      const allFilteredSchemes = currentFilteredSchemes;
      if (allFilteredSchemes.length === 0) {
        toast({
          title: "No Data To Export",
          description:
            "There are no schemes matching your current filter criteria.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Preparing Export",
        description: `Gathering ${allFilteredSchemes.length} schemes for export...`,
      });
      // Helper function to get appropriate agency based on region
      const getAgencyByRegion = (regionName: string): string => {
        const regionAgencyMap: Record<string, string> = {
          Nagpur: "M/s Rite Water",
          Amravati: "M/s Ceinsys",
          Nashik: "M/s Ceinsys",
          Pune: "M/s Indo/Chetas",
          Konkan: "M/s Indo/Chetas",
          "Chhatrapati Sambhajinagar": "M/s Rite Water",
        };
        return regionAgencyMap[regionName] || "Not Specified";
      };
      // Prepare data
      const exportData = allFilteredSchemes.map((scheme: SchemeStatus) => ({
        "Scheme ID": scheme.scheme_id || "",
        "Scheme Name": scheme.scheme_name || "",
        Region: scheme.region || "",
        Circle: scheme.circle || "",
        Division: scheme.division || "",
        "Sub Division": scheme.sub_division || "",
        Block: scheme.block || "",
        Agency:
          scheme.agency ||
          (scheme.region ? getAgencyByRegion(scheme.region) : "Not Specified"),
        "Total Villages": scheme.number_of_village || 0,
        "Villages Integrated": scheme.total_villages_integrated || 0,
        "Villages Completed": scheme.fully_completed_villages || 0,
        "Total ESR": scheme.total_number_of_esr || 0,
        "ESR Integrated": scheme.total_esr_integrated || 0,
        "ESR Completed": scheme.no_fully_completed_esr || 0,
        "Partial ESR":
          (scheme.total_esr_integrated || 0) -
          (scheme.no_fully_completed_esr || 0),
        "Flow Meters": scheme.flow_meters_connected || 0,
        "Pressure Transmitters": scheme.pressure_transmitter_connected || 0,
        "Residual Chlorine Analyzers":
          scheme.residual_chlorine_analyzer_connected || 0,
        "MJP Commissioned": scheme.mjp_commissioned || "No",
        "MJP Fully Completed": scheme.mjp_fully_completed || "In Progress",
        Status:
          scheme.fully_completion_scheme_status ||
          scheme.scheme_functional_status ||
          "Not-Connected",
        "Scheme Status": scheme.scheme_functional_status || "Unknown",
        "Last Updated": new Date().toLocaleDateString("en-IN"),
      }));
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Schemes Data");
      // Add header row
      const headerKeys =
        exportData.length > 0 ? Object.keys(exportData[0]) : [];
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
      // Set column widths
      const colWidths = [
        15, 30, 12, 12, 12, 12, 12, 18, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15,
        15, 18, 15, 15,
      ];
      colWidths.forEach((width, idx) => {
        if (worksheet.getColumn(idx + 1))
          worksheet.getColumn(idx + 1).width = width;
      });
      // Download file
      const region =
        selectedRegion === "all"
          ? "All_Regions"
          : selectedRegion.replace(/\s+/g, "_");
      const status =
        statusFilter === "all"
          ? "All_Status"
          : statusFilter.replace(/\s+/g, "_");
      const today = new Date().toISOString().split("T")[0];
      const filename = `Schemes_${region}_${status}_${today}.xlsx`;
      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Export Successful",
        description: `${allFilteredSchemes.length} schemes exported to ${filename}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Schemes Management
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              View and manage all water schemes across regions
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={exportComprehensiveReport}
              disabled={isSchemesLoading || currentFilteredSchemes.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-comprehensive-excel"
            >
              <Download className="w-4 h-4 mr-2" />
              Comprehensive Excel Report ({currentFilteredSchemes.length})
            </Button>
            <Button
              onClick={exportToExcel}
              disabled={isSchemesLoading || currentFilteredSchemes.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel ({currentFilteredSchemes.length})
            </Button>
          </div>
        </div>
      </div>

      <GeographicalFilters
        filters={filterOptions}
        selectedRegion={selectedRegion}
        selectedCircle={selectedCircle}
        selectedDivision={selectedDivision}
        selectedSubdivision={selectedSubdivision}
        selectedBlock={selectedBlock}
        onRegionChange={handleRegionChange}
        onCircleChange={handleCircleChange}
        onDivisionChange={handleDivisionChange}
        onSubdivisionChange={handleSubdivisionChange}
        onBlockChange={handleBlockChange}
      />

      <div className="mt-4 mb-6">
        <AgencyTypeFilter
          selectedAgencyType={selectedAgencyType}
          onAgencyTypeChange={setSelectedAgencyType}
          className="w-full md:w-64"
        />
      </div>

      <SchemeTable
        schemes={schemes || []}
        isLoading={isSchemesLoading}
        onViewDetails={handleViewSchemeDetails}
        onNavigateToDetails={handleNavigateToSchemeDetails}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        selectedRegion={selectedRegion}
        onFilteredSchemesChange={setCurrentFilteredSchemes}
      />

      <SchemeDetailsModal
        scheme={selectedScheme}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </DashboardLayout>
  );
}
