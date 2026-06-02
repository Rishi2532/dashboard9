import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  Zap,
  Droplets,
  BarChart3,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Gauge,
  Search,
  Download,
  Filter,
  Info,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import AgencyTypeFilter from "@/components/dashboard/AgencyTypeFilter";
import ExcelJS from "exceljs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import FilterBar from "@/components/dashboard/FilterBar";
interface CommunicationOverview {
  total_esrs: number;
  total_schemes: number;
  chlorine_online: number;
  pressure_online: number;
  flow_meter_online: number;
  chlorine_connected: number;
  pressure_connected: number;
  flow_meter_connected: number;
  chlorine_offline: number;
  pressure_offline: number;
  flow_meter_offline: number;
  chlorine_less_72h: number;
  chlorine_more_72h: number;
  pressure_less_72h: number;
  pressure_more_72h: number;
  flow_meter_less_72h: number;
  flow_meter_more_72h: number;
}

interface CommunicationStats {
  region: string;
  total_records: number;
  total_schemes: number;
  total_villages: number;
  online_chlorine: number;
  online_pressure: number;
  online_flow_meter: number;
}

interface CommunicationScheme {
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  chlorine_connected: string;
  pressure_connected: string;
  flow_meter_connected: string;
  chlorine_status: string;
  pressure_status: string;
  flow_meter_status: string;
  overall_status: string;
  chlorine_0h_72h: string;
  chlorine_72h: string;
  pressure_0h_72h: string;
  pressure_72h: string;
  flow_meter_0h_72h: string;
  flow_meter_72h: string;
  lpcd_value_day7?: number;
  chlorine_value_7?: number;
  pressure_value_7?: number;
  agencyType?: string;
}

interface FilterOptions {
  regions: string[];
  circles: string[];
  divisions: string[];
  subdivisions: string[];
  blocks: string[];
}

export default function CommunicationStatusPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedAgencyType, setSelectedAgencyType] = useState<string>("ALL");
  const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("commissioned");
  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");
  const [selectedWaterSupply, setSelectedWaterSupply] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeListTab, setActiveListTab] = useState<"esr" | "scheme">("esr");
  const itemsPerPage = 10;

  const schemeFilter = uiSchemeFilter !== "all" && waterSupplyStatus !== "All"
    ? `${uiSchemeFilter}_${waterSupplyStatus.toLowerCase()}`
    : uiSchemeFilter;

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: [
      "/api/communication-status/overview",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
      selectedAgencyType,
      selectedWaterSupply,
      schemeFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedCircle !== "all") params.set("circle", selectedCircle);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (selectedSubdivision !== "all")
        params.set("subdivision", selectedSubdivision);
      if (selectedBlock !== "all") params.set("block", selectedBlock);
      if (selectedAgencyType !== 'ALL') params.set("agencyType", selectedAgencyType);
      if (selectedWaterSupply !== "all") params.set("waterSupply", selectedWaterSupply);

      if (schemeFilter !== 'all') {
        params.set("filterType", schemeFilter);
      }
      if (schemeFilter === "fully_completed") {
        params.set("fullyCompleted", "true");
      }

      const response = await fetch(
        `/api/communication-status/overview?${params.toString()}`,
      );
      return response.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/communication-status/stats"],
  });

  const {
    data: schemes,
    isLoading: schemesLoading,
    refetch: refetchSchemes,
  } = useQuery({
    queryKey: [
      "/api/communication-status/schemes",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
      selectedAgencyType,
      selectedWaterSupply,
      schemeFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.set("region", selectedRegion);
      if (selectedCircle !== "all") params.set("circle", selectedCircle);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (selectedSubdivision !== "all")
        params.set("subdivision", selectedSubdivision);
      if (selectedBlock !== "all") params.set("block", selectedBlock);
      if (selectedAgencyType !== 'ALL') params.set("agencyType", selectedAgencyType);
      if (selectedWaterSupply !== "all") params.set("waterSupply", selectedWaterSupply);

      if (schemeFilter !== 'all') {
        params.set("filterType", schemeFilter);
      }
      if (schemeFilter === "fully_completed") {
        params.set("fullyCompleted", "true");
      }

      const response = await fetch(
        `/api/communication-status/schemes?${params.toString()}`,
      );
      return response.json();
    },
  });

  const { data: filters } = useQuery({
    queryKey: [
      "/api/communication-status/filters",
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
      if (selectedAgencyType !== 'ALL') params.set("agencyType", selectedAgencyType);

      const response = await fetch(
        `/api/communication-status/filters?${params.toString()}`,
      );
      return response.json();
    },
  });

  // Listen for chatbot events
  useEffect(() => {
    const handleChatbotRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log(
        "Communication Status page received chatbot region filter:",
        region,
      );
      setSelectedRegion(region);
      // Force refetch to ensure fresh data
      setTimeout(() => {
        refetchSchemes();
      }, 100);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Communication Status page received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "communication" || pageType === "communication-status") {
        // Wait for data to be filtered properly (same timing as chlorine page)
        setTimeout(() => {
          if (searchFilteredSchemes && searchFilteredSchemes.length > 0) {
            handleExcelDownload();
            console.log(
              "Excel export triggered for Communication Status data with",
              searchFilteredSchemes.length,
              "total records",
            );
          } else {
            console.log("No Communication Status data available for export");
          }
        }, 1500);
      }
    };

    window.addEventListener(
      "chatbot-region-filter",
      handleChatbotRegionFilter as EventListener,
    );
    window.addEventListener(
      "chatbot-export-excel",
      handleChatbotExcelExport as EventListener,
    );

    // Expose export function globally for chatbot
    (window as any).triggerDashboardExport = () => {
      return new Promise<void>((resolve) => {
        if (searchFilteredSchemes && searchFilteredSchemes.length > 0) {
          handleExcelDownload();
          console.log(
            "Global export triggered for Communication Status data with",
            searchFilteredSchemes.length,
            "total records",
          );
        } else {
          console.log(
            "No Communication Status data available for global export",
          );
        }
        // Small delay to ensure export starts
        setTimeout(resolve, 100);
      });
    };

    return () => {
      window.removeEventListener(
        "chatbot-region-filter",
        handleChatbotRegionFilter as EventListener,
      );
      window.removeEventListener(
        "chatbot-export-excel",
        handleChatbotExcelExport as EventListener,
      );

      // Clean up global export function
      if ((window as any).triggerDashboardExport) {
        (window as any).triggerDashboardExport = undefined;
      }
    };
  }, [refetchSchemes]);

  // Filter schemes based on search term
  const filteredSchemes = useMemo(() => {
    if (!schemes || !searchTerm.trim()) return schemes || [];

    const searchLower = searchTerm.toLowerCase().trim();
    return schemes.filter(
      (scheme: CommunicationScheme) =>
        scheme.scheme_name?.toLowerCase().includes(searchLower) ||
        scheme.village_name?.toLowerCase().includes(searchLower) ||
        scheme.esr_name?.toLowerCase().includes(searchLower) ||
        scheme.scheme_id?.toLowerCase().includes(searchLower) ||
        scheme.region?.toLowerCase().includes(searchLower) ||
        scheme.circle?.toLowerCase().includes(searchLower) ||
        scheme.division?.toLowerCase().includes(searchLower),
    );
  }, [schemes, searchTerm]);

  // Excel download functionality - optimized for speed
  const handleExcelDownload = async () => {
    try {
      // Get the current data to export
      const dataToExport = searchFilteredSchemes;

      if (dataToExport.length === 0) {
        toast({
          title: "No Data To Export",
          description:
            "There are no communication status records matching your current filter criteria.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Preparing Export",
        description: `Processing ${dataToExport.length} communication status records...`,
      });

      // Generate filename first
      const region =
        selectedRegion === "all"
          ? "All_Regions"
          : selectedRegion.replace(/\s+/g, "_");
      const today = new Date().toISOString().split("T")[0];
      const filename = `Communication_Status_${region}_${today}.xlsx`;

      // Process data in a web worker-like approach using setTimeout to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Communication Status");

      // Define headers
      const headers = [
        "Region",
        "Circle",
        "Division",
        "Sub Division",
        "Block",
        "Scheme ID",
        "Scheme Name",
        "Village Name",
        "ESR Name",

        "Chlorine Connected",
        "Pressure Connected",
        "Flow Meter Connected",
        "Chlorine Status",
        "Pressure Status",
        "Flow Meter Status",
        "Overall Status",
        "Chlorine <72h",
        "Chlorine >72h",
        "Pressure <72h",
        "Pressure >72h",
        "Flow Meter <72h",
        "Flow Meter >72h",
        "Export Date",
      ];

      // Add header row first
      worksheet.addRow(headers);

      // Batch process data rows for better performance
      const batchSize = 500;
      const exportDate = new Date().toLocaleDateString("en-IN");

      for (let i = 0; i < dataToExport.length; i += batchSize) {
        const batch = dataToExport.slice(i, i + batchSize);
        const rows = batch.map((scheme: CommunicationScheme) => [
          scheme.region || "",
          scheme.circle || "",
          scheme.division || "",
          scheme.sub_division || "",
          scheme.block || "",
          scheme.scheme_id || "",
          scheme.scheme_name || "",
          scheme.village_name || "",
          scheme.esr_name || "",

          scheme.chlorine_connected || "NA",
          scheme.pressure_connected || "NA",
          scheme.flow_meter_connected || "NA",
          scheme.chlorine_status || "NA",
          scheme.pressure_status || "NA",
          scheme.flow_meter_status || "NA",
          scheme.overall_status || "NA",
          scheme.chlorine_0h_72h === "1" ? "Yes" : "No",
          scheme.chlorine_72h === "1" ? "Yes" : "No",
          scheme.pressure_0h_72h === "1" ? "Yes" : "No",
          scheme.pressure_72h === "1" ? "Yes" : "No",
          scheme.flow_meter_0h_72h === "1" ? "Yes" : "No",
          scheme.flow_meter_72h === "1" ? "Yes" : "No",
          exportDate,
        ]);

        worksheet.addRows(rows);

        // Yield control to prevent UI blocking
        if (i + batchSize < dataToExport.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Apply styles efficiently in batch
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell: any) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "4472C4" },
        };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { horizontal: "center" };
      });

      // Set column widths efficiently (added 3 new columns for connection status)
      const colWidths = [
        15, 35, 25, 25, 12, 12, 12, 12, 12, 18, 18, 18, 15, 15, 15, 15, 12, 12,
        12, 12, 12, 12, 15,
      ];
      colWidths.forEach((width, idx) => {
        worksheet.getColumn(idx + 1).width = width;
      });

      toast({
        title: "Generating File",
        description: "Creating Excel file...",
      });

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
        description: `${dataToExport.length} communication status records exported to ${filename}`,
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

  // Excel download for 72+ hours offline sensors
  const handle72HoursOfflineExport = async () => {
    try {
      const dataToExport = searchFilteredSchemes;

      if (dataToExport.length === 0) {
        toast({
          title: "No Data To Export",
          description: "There are no communication status records available.",
          variant: "destructive",
        });
        return;
      }

      // Filter sensors offline for more than 72 hours
      const chlorineOffline = dataToExport.filter(
        (scheme: CommunicationScheme) => scheme.chlorine_72h === "1",
      );
      const pressureOffline = dataToExport.filter(
        (scheme: CommunicationScheme) => scheme.pressure_72h === "1",
      );
      const flowMeterOffline = dataToExport.filter(
        (scheme: CommunicationScheme) => scheme.flow_meter_72h === "1",
      );

      const totalOffline =
        chlorineOffline.length +
        pressureOffline.length +
        flowMeterOffline.length;

      if (totalOffline === 0) {
        toast({
          title: "No Offline Sensors",
          description: "There are no sensors offline for more than 72 hours.",
          variant: "default",
        });
        return;
      }

      toast({
        title: "Preparing Export",
        description: `Processing ${totalOffline} offline sensors...`,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const region =
        selectedRegion === "all"
          ? "All_Regions"
          : selectedRegion.replace(/\s+/g, "_");
      const today = new Date().toISOString().split("T")[0];
      const filename = `Sensors_Offline_72hrs_${region}_${today}.xlsx`;
      const exportDate = new Date().toLocaleDateString("en-IN");

      // Common headers for all sheets
      const headers = [
        "Region",
        "Circle",
        "Division",
        "Sub Division",
        "Block",
        "Scheme ID",
        "Scheme Name",
        "Village Name",
        "ESR Name",

        "Sensor Status",
        "Days Offline",
        "Export Date",
      ];

      // Sheet 1: Chlorine Sensors Offline >72h
      if (chlorineOffline.length > 0) {
        const chlorineSheet = workbook.addWorksheet("Chlorine Offline 72h+");
        chlorineSheet.addRow(headers);

        const chlorineRows = chlorineOffline.map(
          (scheme: CommunicationScheme) => [
            scheme.region || "",
            scheme.circle || "",
            scheme.division || "",
            scheme.sub_division || "",
            scheme.block || "",
            scheme.scheme_id || "",
            scheme.scheme_name || "",
            scheme.village_name || "",
            scheme.esr_name || "",

            scheme.chlorine_status || "Offline",
            ">72 hours",
            exportDate,
          ],
        );

        chlorineSheet.addRows(chlorineRows);

        // Style header
        const chlorineHeader = chlorineSheet.getRow(1);
        chlorineHeader.eachCell((cell: any) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF0066CC" },
          };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center" };
        });

        // Set column widths
        [15, 35, 25, 25, 12, 12, 12, 12, 12, 15, 15, 15].forEach(
          (width, idx) => {
            chlorineSheet.getColumn(idx + 1).width = width;
          },
        );
      }

      // Sheet 2: Pressure Sensors Offline >72h
      if (pressureOffline.length > 0) {
        const pressureSheet = workbook.addWorksheet("Pressure Offline 72h+");
        pressureSheet.addRow(headers);

        const pressureRows = pressureOffline.map(
          (scheme: CommunicationScheme) => [
            scheme.region || "",
            scheme.circle || "",
            scheme.division || "",
            scheme.sub_division || "",
            scheme.block || "",
            scheme.scheme_id || "",
            scheme.scheme_name || "",
            scheme.village_name || "",
            scheme.esr_name || "",

            scheme.pressure_status || "Offline",
            ">72 hours",
            exportDate,
          ],
        );

        pressureSheet.addRows(pressureRows);

        // Style header
        const pressureHeader = pressureSheet.getRow(1);
        pressureHeader.eachCell((cell: any) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFF6600" },
          };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center" };
        });

        // Set column widths
        [15, 35, 25, 25, 12, 12, 12, 12, 12, 15, 15, 15].forEach(
          (width, idx) => {
            pressureSheet.getColumn(idx + 1).width = width;
          },
        );
      }

      // Sheet 3: Flow Meter Sensors Offline >72h
      if (flowMeterOffline.length > 0) {
        const flowSheet = workbook.addWorksheet("Flow Meter Offline 72h+");
        flowSheet.addRow(headers);

        const flowRows = flowMeterOffline.map((scheme: CommunicationScheme) => [
          scheme.region || "",
          scheme.circle || "",
          scheme.division || "",
          scheme.sub_division || "",
          scheme.block || "",
          scheme.scheme_id || "",
          scheme.scheme_name || "",
          scheme.village_name || "",
          scheme.esr_name || "",

          scheme.flow_meter_status || "Offline",
          ">72 hours",
          exportDate,
        ]);

        flowSheet.addRows(flowRows);

        // Style header
        const flowHeader = flowSheet.getRow(1);
        flowHeader.eachCell((cell: any) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF009933" },
          };
          cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
          cell.alignment = { horizontal: "center" };
        });

        // Set column widths
        [15, 35, 25, 25, 12, 12, 12, 12, 12, 15, 15, 15].forEach(
          (width, idx) => {
            flowSheet.getColumn(idx + 1).width = width;
          },
        );
      }

      toast({
        title: "Generating File",
        description: "Creating Excel file with separate sheets...",
      });

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
        description: `${totalOffline} offline sensors exported (Chlorine: ${chlorineOffline.length}, Pressure: ${pressureOffline.length}, Flow: ${flowMeterOffline.length})`,
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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "online":
        return (
          <Badge variant="default" className="bg-green-500">
            <Wifi className="w-3 h-3 mr-1" />
            Online
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="destructive">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
      default:
        return <Badge variant="secondary">NA</Badge>;
    }
  };

  const getTimeBadge = (lessThan72h: string, moreThan72h: string) => {
    const has72h = moreThan72h === "1";
    const hasLess72h = lessThan72h === "1";

    if (has72h && hasLess72h) {
      return (
        <div className="flex space-x-1">
          <Badge variant="outline" className="text-orange-600">
            <Clock className="w-3 h-3 mr-1" />
            &lt;72h
          </Badge>
          <Badge variant="outline" className="text-red-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            &gt;72h
          </Badge>
        </div>
      );
    } else if (has72h) {
      return (
        <Badge variant="outline" className="text-red-600">
          <AlertTriangle className="w-3 h-3 mr-1" />
          &gt;72h
        </Badge>
      );
    } else if (hasLess72h) {
      return (
        <Badge variant="outline" className="text-orange-600">
          <Clock className="w-3 h-3 mr-1" />
          &lt;72h
        </Badge>
      );
    }
    return <Badge variant="secondary">No Data</Badge>;
  };

  // Get unique schemes to avoid duplicates
  const uniqueSchemes = Array.isArray(schemes)
    ? schemes.reduce(
      (acc: CommunicationScheme[], current: CommunicationScheme) => {
        const existing = acc.find(
          (item) =>
            item.scheme_id === current.scheme_id &&
            item.village_name === current.village_name &&
            item.esr_name === current.esr_name,
        );
        if (!existing) {
          acc.push(current);
        }
        return acc;
      },
      [],
    )
    : [];

  // Apply search filter to unique schemes
  const searchFilteredSchemes = useMemo(() => {
    if (!searchTerm.trim()) return uniqueSchemes;

    const searchLower = searchTerm.toLowerCase().trim();
    return uniqueSchemes.filter(
      (scheme: CommunicationScheme) =>
        scheme.scheme_name?.toLowerCase().includes(searchLower) ||
        scheme.village_name?.toLowerCase().includes(searchLower) ||
        scheme.esr_name?.toLowerCase().includes(searchLower) ||
        scheme.scheme_id?.toLowerCase().includes(searchLower) ||
        scheme.region?.toLowerCase().includes(searchLower) ||
        scheme.circle?.toLowerCase().includes(searchLower) ||
        scheme.division?.toLowerCase().includes(searchLower),
    );
  }, [uniqueSchemes, searchTerm]);

  // Aggregated scheme communication data
  const aggregatedSchemes = useMemo(() => {
    const map = new Map<string, {
      scheme_id: string;
      scheme_name: string;
      flow_meter_online: number;
      chlorine_online: number;
      pressure_online: number;
      flow_meter_offline: number;
      chlorine_offline: number;
      pressure_offline: number;
      flow_meter_offline_72h: number;
      chlorine_offline_72h: number;
      pressure_offline_72h: number;
      total_esrs: number;
    }>();

    searchFilteredSchemes.forEach((item) => {
      const key = item.scheme_id || 'unknown';
      let agg = map.get(key);
      if (!agg) {
        agg = {
          scheme_id: item.scheme_id,
          scheme_name: item.scheme_name || 'N/A',
          flow_meter_online: 0,
          chlorine_online: 0,
          pressure_online: 0,
          flow_meter_offline: 0,
          chlorine_offline: 0,
          pressure_offline: 0,
          flow_meter_offline_72h: 0,
          chlorine_offline_72h: 0,
          pressure_offline_72h: 0,
          total_esrs: 0,
        };
        map.set(key, agg);
      }

      agg.total_esrs += 1;

      // Online status checks
      if (item.flow_meter_status === 'Online') agg.flow_meter_online += 1;
      if (item.chlorine_status === 'Online') agg.chlorine_online += 1;
      if (item.pressure_status === 'Online') agg.pressure_online += 1;

      // Offline status checks
      if (item.flow_meter_status === 'Offline') agg.flow_meter_offline += 1;
      if (item.chlorine_status === 'Offline') agg.chlorine_offline += 1;
      if (item.pressure_status === 'Offline') agg.pressure_offline += 1;

      // Offline > 72h status checks
      if (item.flow_meter_72h === '1') agg.flow_meter_offline_72h += 1;
      if (item.chlorine_72h === '1') agg.chlorine_offline_72h += 1;
      if (item.pressure_72h === '1') agg.pressure_offline_72h += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.scheme_name.localeCompare(b.scheme_name));
  }, [searchFilteredSchemes]);

  // Excel download for scheme-wise aggregated summary
  const handleSchemeExcelDownload = async () => {
    try {
      const dataToExport = aggregatedSchemes;

      if (dataToExport.length === 0) {
        toast({
          title: "No Data To Export",
          description: "There are no aggregated scheme records matching your current filter criteria.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Preparing Export",
        description: `Processing ${dataToExport.length} scheme summaries...`,
      });

      const region = selectedRegion === "all" ? "All_Regions" : selectedRegion.replace(/\s+/g, "_");
      const today = new Date().toISOString().split("T")[0];
      const filename = `Scheme_Communication_Summary_${region}_${today}.xlsx`;

      await new Promise((resolve) => setTimeout(resolve, 100));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Scheme Communication Summary");

      const headers = [
        "Scheme ID",
        "Scheme Name",
        "Total ESRs",
        "Flow Meter Online",
        "Chlorine Online",
        "Pressure Online",
        "Flow Meter Offline",
        "Chlorine Offline",
        "Pressure Offline",
        "Flow Meter Offline >72h",
        "Chlorine Offline >72h",
        "Pressure Offline >72h",
        "Total Offline >72h",
        "Export Date"
      ];

      worksheet.addRow(headers);

      const exportDate = new Date().toLocaleDateString("en-IN");
      const rows = dataToExport.map((item) => [
        item.scheme_id || "",
        item.scheme_name || "",
        item.total_esrs,
        item.flow_meter_online,
        item.chlorine_online,
        item.pressure_online,
        item.flow_meter_offline,
        item.chlorine_offline,
        item.pressure_offline,
        item.flow_meter_offline_72h,
        item.chlorine_offline_72h,
        item.pressure_offline_72h,
        item.flow_meter_offline_72h + item.chlorine_offline_72h + item.pressure_offline_72h,
        exportDate
      ]);

      worksheet.addRows(rows);

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell: any) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "6200EE" },
        };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { horizontal: "center" };
      });

      const colWidths = [15, 35, 12, 18, 18, 18, 18, 18, 18, 22, 22, 22, 22, 15];
      colWidths.forEach((width, idx) => {
        worksheet.getColumn(idx + 1).width = width;
      });

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
        description: `${dataToExport.length} scheme summaries exported to ${filename}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the scheme summary. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Pagination calculations
  const totalItems = activeListTab === "esr" ? searchFilteredSchemes.length : aggregatedSchemes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSchemes = activeListTab === "esr" ? searchFilteredSchemes.slice(startIndex, endIndex) : [];
  const currentAggregated = activeListTab === "scheme" ? aggregatedSchemes.slice(startIndex, endIndex) : [];

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);

  return (
    <DashboardLayout>

      <div className="container mx-auto p-4">
        <DashboardPageHeader
          title={
            <div className="flex items-center gap-3">
              <span>Communication Status</span>
              {!overviewLoading && overview && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-3 py-1">
                  {overview.total_schemes} Schemes
                </Badge>
              )}
            </div>
          }
          subtitle="Real-time monitoring of IoT device connectivity and communication performance across ESR regions"
          isLoading={schemesLoading}
          onRefresh={() => refetchSchemes()}
          rightActions={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleExcelDownload}
                variant="outline"
                className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 gap-2 h-10 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Export ({filteredSchemes.length})</span>
              </Button>
              <Button
                onClick={handle72HoursOfflineExport}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 gap-2 h-10 shadow-sm"
                title="Download report of devices offline for more than 72 hours"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Offline 72h+</span>
              </Button>
            </div>
          }
        />

        <FilterBar
          filterOptions={filters}
          selectedRegion={selectedRegion}
          selectedCircle={selectedCircle}
          selectedDivision={selectedDivision}
          selectedSubdivision={selectedSubdivision}
          selectedBlock={selectedBlock}
          onRegionChange={(val) => { setSelectedRegion(val); resetPage(); }}
          onCircleChange={(val) => { setSelectedCircle(val); resetPage(); }}
          onDivisionChange={(val) => { setSelectedDivision(val); resetPage(); }}
          onSubdivisionChange={(val) => { setSelectedSubdivision(val); resetPage(); }}
          onBlockChange={(val) => { setSelectedBlock(val); resetPage(); }}
          selectedAgencyType={selectedAgencyType}
          onAgencyTypeChange={(val) => { setSelectedAgencyType(val); resetPage(); }}
          searchQuery={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); resetPage(); }}
          searchPlaceholder="Search scheme name or ID..."
          resultCount={filteredSchemes.length}
          resultLabel="Connected schemes"
          extraFilters={
            <div className="flex flex-wrap items-center gap-4 w-full">
              {(uiSchemeFilter === "commissioned" || uiSchemeFilter === "fully_completed") && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Water Supply Status</label>
                  <Tabs value={waterSupplyStatus} onValueChange={(val) => { setWaterSupplyStatus(val); resetPage(); }} className="m-0">
                    <TabsList className="h-11 bg-white border border-gray-200 p-1 shadow-sm">
                      <TabsTrigger value="All" className="px-3 py-2 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">All</TabsTrigger>
                      <TabsTrigger value="Full" className="px-3 py-2 text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Fully Operational</TabsTrigger>
                      <TabsTrigger value="Partial" className="px-3 py-2 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white">Partially Operational</TabsTrigger>
                      <TabsTrigger value="No" className="px-3 py-2 text-xs font-medium data-[state=active]:bg-red-500 data-[state=active]:text-white">Not Operational</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
          }
          onClearAll={() => {
            setSelectedRegion("all");
            setSelectedCircle("all");
            setSelectedDivision("all");
            setSelectedSubdivision("all");
            setSelectedBlock("all");
            setSelectedAgencyType("ALL");
            setSearchTerm("");
            setSelectedWaterSupply("all");
            setUiSchemeFilter("commissioned");
            setWaterSupplyStatus("All");
            resetPage();
          }}
        />

        {/* Data Correspondence Info Label */}
        {uiSchemeFilter === "commissioned" && !overviewLoading && overview && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 shadow-sm">
              <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-medium text-blue-800">
                The data corresponds to{" "}
                <span className="inline-flex items-center justify-center bg-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-full mx-0.5 shadow-sm">
                  {overview.total_schemes}
                </span>{" "}
                schemes where civil work is 100% complete.
              </span>
            </div>
          </div>
        )}

        {/* Enhanced Overview Cards */}
        {!overviewLoading && overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total ESRs Card */}
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 via-white to-blue-50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-blue-900">Total ESRs</span>
                  </div>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {overview.total_esrs}
                </div>
                <div className="text-sm text-blue-600/70">
                  Infrastructure Units
                </div>
              </CardContent>
            </Card>

            {/* Flow Meters Card */}
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 via-white to-green-50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-500/10 rounded-lg mr-3">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-green-900">Flow Meters</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    {/* <span className="text-xs text-green-600 font-medium">
                      {(
                        (overview.flow_meter_online /
                          (overview.flow_meter_online +
                            overview.flow_meter_offline) *
                        100
                      ).toFixed(0)}
                      %
                    </span> */}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <span className="text-xl font-bold text-black-600">
                      {overview.flow_meter_connected}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Online</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {overview.flow_meter_online}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium">Offline</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">
                      {overview.flow_meter_offline}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-600">
                        &gt; 72h: {overview.flow_meter_less_72h}
                      </span>
                      <span className="text-red-600">
                        &lt; 72h: {overview.flow_meter_more_72h}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chlorine Sensors Card */}
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-cyan-50 via-white to-cyan-50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full -mr-10 -mt-10"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-cyan-500/10 rounded-lg mr-3">
                      <Droplets className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="text-cyan-900">Chlorine Sensors</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />

                    {/* <span className="text-xs text-green-600 font-medium">
                      {(
                        (overview.chlorine_online /
                          (overview.chlorine_online +
                            overview.chlorine_offline)) *
                        100
                      )}

                    </span> */}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <span className="text-xl font-bold text-black-600">
                      {overview.chlorine_connected}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Online</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {overview.chlorine_online}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium">Offline</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">
                      {overview.chlorine_offline}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-600">
                        &gt; 72h: {overview.chlorine_less_72h}
                      </span>
                      <span className="text-red-600">
                        {" "}
                        &lt; 72h: {overview.chlorine_more_72h}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pressure Sensors Card */}
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 via-white to-orange-50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10"></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-500/10 rounded-lg mr-3">
                      <Gauge className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-orange-900">Pressure Sensors</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    {/* <span className="text-xs text-green-600 font-medium">
                      {(
                        (overview.pressure_online /
                          (overview.pressure_online +
                            overview.pressure_offline) *
                        100
                      ).toFixed(0)}
                      %
                    </span> */}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <span className="text-xl font-bold text-black-600">
                      {overview.pressure_connected}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Online</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {overview.pressure_online}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium">Offline</span>
                    </div>
                    <span className="text-xl font-bold text-red-600">
                      {overview.pressure_offline}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-600">
                        &gt; 72h: {overview.pressure_less_72h}
                      </span>
                      <span className="text-red-600">
                        &lt; 72h: {overview.pressure_more_72h}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Regional Statistics */}
        {/* {!statsLoading && Array.isArray(stats) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat: CommunicationStats) => (
              <Card
                key={stat.region}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{stat.region}</CardTitle>
                  <CardDescription>
                    {stat.total_schemes} schemes, {stat.total_villages} villages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center">
                        <Droplets className="w-4 h-4 mr-1 text-blue-400" />
                        Chlorine
                      </span>
                      <span className="text-sm font-medium">
                        {stat.online_chlorine}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center">
                        <Activity className="w-4 h-4 mr-1 text-orange-400" />
                        Pressure
                      </span>
                      <span className="text-sm font-medium">
                        {stat.online_pressure}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center">
                        <Zap className="w-4 h-4 mr-1 text-green-400" />
                        Flow Meter
                      </span>
                      <span className="text-sm font-medium">
                        {stat.online_flow_meter}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )} */}

        {/* Schemes List with Pagination */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <span>Scheme Communication Status</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({totalItems} records)
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            </CardTitle>
            <CardDescription>
              Detailed view of communication status for each scheme and ESR
            </CardDescription>

            {/* Tab Switcher for ESR vs Scheme View */}
            <div className="mt-4">
              <Tabs value={activeListTab} onValueChange={(val) => { setActiveListTab(val as "esr" | "scheme"); setCurrentPage(1); }} className="m-0">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <TabsTrigger value="esr" className="px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-lg shadow-sm" data-testid="tab-esr-view">ESR View</TabsTrigger>
                  <TabsTrigger value="scheme" className="px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 rounded-lg shadow-sm" data-testid="tab-scheme-view">Scheme View</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Search and Download Controls */}
            <div className="flex gap-4 items-center mt-4">
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search schemes, villages, ESRs..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset to first page when searching
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="min-w-[200px]">
                  <Select value={uiSchemeFilter} onValueChange={(value) => { setUiSchemeFilter(value); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full bg-white border-blue-200">
                      <SelectValue placeholder="Scheme Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schemes</SelectItem>
                      <SelectItem value="commissioned">Commissioned (100% Civil)</SelectItem>
                      <SelectItem value="fully_completed">Fully Instrumented (100% IoT)</SelectItem>
                      <SelectItem value="in_progress">Partially Instrumented (In Progress)</SelectItem>
                      <SelectItem value="common_filter">Common (Civil + IoT Done)</SelectItem>
                      <SelectItem value="mjp_commissioned_yes">MJP Commissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeListTab === "scheme" ? (
                <Button
                  onClick={handleSchemeExcelDownload}
                  variant="outline"
                  className="flex items-center gap-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold"
                  data-testid="button-export-scheme-summary"
                >
                  <Download className="h-4 w-4" />
                  Export Scheme Summary
                </Button>
              ) : (
                <Button
                  onClick={handleExcelDownload}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-export-all"
                >
                  <Download className="h-4 w-4" />
                  Export All Data
                </Button>
              )}

              <Button
                onClick={handle72HoursOfflineExport}
                variant="outline"
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                data-testid="button-export-72h-offline"
              >
                <AlertTriangle className="h-4 w-4" />
                Export 72h+ Offline
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {schemesLoading ? (
              <div className="text-center py-8">Loading scheme data...</div>
            ) : (
              <>
                {activeListTab === "esr" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scheme Name</TableHead>
                        <TableHead>Village</TableHead>
                        <TableHead>LPCD Value</TableHead>
                        <TableHead>ESR Name</TableHead>
                        <TableHead>Chlorine</TableHead>
                        <TableHead>Chlorine Value</TableHead>
                        <TableHead>Pressure</TableHead>
                        <TableHead>Pressure Value</TableHead>
                        <TableHead>Flow Meter</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentSchemes.length > 0 ? (
                        currentSchemes.map(
                          (scheme: CommunicationScheme, index: number) => (
                            <TableRow
                              key={`${scheme.scheme_id}-${scheme.village_name}-${scheme.esr_name}-${index}`}
                            >
                              <TableCell className="font-medium">
                                {scheme.scheme_name}
                              </TableCell>
                              <TableCell>{scheme.village_name}</TableCell>
                              <TableCell>{scheme.lpcd_value_day7 !== undefined && scheme.lpcd_value_day7 !== null ? Number(scheme.lpcd_value_day7).toFixed(1) : "N/A"}</TableCell>
                              <TableCell>{scheme.esr_name}</TableCell>
                              <TableCell>
                                {getStatusBadge(scheme.chlorine_status)}
                              </TableCell>
                              <TableCell>{scheme.chlorine_value_7 !== undefined && scheme.chlorine_value_7 !== null ? Number(scheme.chlorine_value_7).toFixed(2) : "N/A"}</TableCell>
                              <TableCell>
                                {getStatusBadge(scheme.pressure_status)}
                              </TableCell>
                              <TableCell>{scheme.pressure_value_7 !== undefined && scheme.pressure_value_7 !== null ? Number(scheme.pressure_value_7).toFixed(2) : "N/A"}</TableCell>
                              <TableCell>
                                {getStatusBadge(scheme.flow_meter_status)}
                              </TableCell>
                            </TableRow>
                          ),
                        )
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No communication data found for the selected filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                        <TableHead className="font-bold">Scheme Name</TableHead>
                        <TableHead className="text-center font-bold">Total ESRs</TableHead>
                        <TableHead className="text-center font-bold text-green-700 dark:text-green-400">Flow Meter Online</TableHead>
                        <TableHead className="text-center font-bold text-green-700 dark:text-green-400">Chlorine Online</TableHead>
                        <TableHead className="text-center font-bold text-green-700 dark:text-green-400">Pressure Online</TableHead>
                        <TableHead className="text-center font-bold text-slate-600 dark:text-slate-400">Flow Meter Offline</TableHead>
                        <TableHead className="text-center font-bold text-slate-600 dark:text-slate-400">Chlorine Offline</TableHead>
                        <TableHead className="text-center font-bold text-slate-600 dark:text-slate-400">Pressure Offline</TableHead>
                        <TableHead className="text-center font-bold text-red-600 dark:text-red-400">Flow Meter Offline &gt;72h</TableHead>
                        <TableHead className="text-center font-bold text-red-600 dark:text-red-400">Chlorine Offline &gt;72h</TableHead>
                        <TableHead className="text-center font-bold text-red-600 dark:text-red-400">Pressure Offline &gt;72h</TableHead>
                        <TableHead className="text-center font-bold text-red-700 dark:text-red-500 bg-red-50/10 dark:bg-red-950/5">Total Offline &gt;72h</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentAggregated.length > 0 ? (
                        currentAggregated.map(
                          (scheme, index: number) => {
                            const totalOffline72h = scheme.flow_meter_offline_72h + scheme.chlorine_offline_72h + scheme.pressure_offline_72h;
                            return (
                              <TableRow
                                key={`${scheme.scheme_id}-${index}`}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                              >
                                <TableCell className="font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                                  {scheme.scheme_name}
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{scheme.scheme_id}</div>
                                </TableCell>
                                <TableCell className="text-center font-medium">{scheme.total_esrs}</TableCell>
                                <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                  {scheme.flow_meter_online > 0 ? (
                                    <Badge className="bg-green-100 hover:bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 font-bold border-green-200">
                                      {scheme.flow_meter_online}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                  {scheme.chlorine_online > 0 ? (
                                    <Badge className="bg-green-100 hover:bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 font-bold border-green-200">
                                      {scheme.chlorine_online}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                  {scheme.pressure_online > 0 ? (
                                    <Badge className="bg-green-100 hover:bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 font-bold border-green-200">
                                      {scheme.pressure_online}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center text-slate-600 dark:text-slate-400 font-medium">
                                  {scheme.flow_meter_offline > 0 ? (
                                    <Badge variant="secondary" className="font-semibold">
                                      {scheme.flow_meter_offline}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center text-slate-600 dark:text-slate-400 font-medium">
                                  {scheme.chlorine_offline > 0 ? (
                                    <Badge variant="secondary" className="font-semibold">
                                      {scheme.chlorine_offline}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center text-slate-600 dark:text-slate-400 font-medium">
                                  {scheme.pressure_offline > 0 ? (
                                    <Badge variant="secondary" className="font-semibold">
                                      {scheme.pressure_offline}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center text-red-600 dark:text-red-400 font-bold">
                                  {scheme.flow_meter_offline_72h > 0 ? (
                                    <Badge variant="destructive" className="font-bold">
                                      {scheme.flow_meter_offline_72h}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center text-red-600 dark:text-red-400 font-bold">
                                  {scheme.chlorine_offline_72h > 0 ? (
                                    <Badge variant="destructive" className="font-bold">
                                      {scheme.chlorine_offline_72h}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center text-red-600 dark:text-red-400 font-bold">
                                  {scheme.pressure_offline_72h > 0 ? (
                                    <Badge variant="destructive" className="font-bold">
                                      {scheme.pressure_offline_72h}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                                <TableCell className="text-center text-red-700 dark:text-red-400 font-bold bg-red-50/20 dark:bg-red-950/10">
                                  {totalOffline72h > 0 ? (
                                    <Badge variant="destructive" className="font-bold bg-red-600 dark:bg-red-700">
                                      {totalOffline72h}
                                    </Badge>
                                  ) : "0"}
                                </TableCell>
                              </TableRow>
                            );
                          }
                        )
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={12}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No aggregated scheme data found for the selected filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, totalItems)} of {totalItems} entries
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <PaginationItem key={`page-${pageNum}`}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNum)}
                                  isActive={currentPage === pageNum}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          },
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
