import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TranslatedText } from "@/components/ui/translated-text";
import { useAuth } from "@/hooks/use-auth";
import {
  Filter,
  Download,
  FileSpreadsheet,
  MoreHorizontal,
  ChevronDown,
  Calendar,
  Download as DownloadIcon,
  Eye,
  Search,
  Droplets,
  Gauge,
  AlertTriangle,
  Ban,
  BarChart3,
  Waves,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Info,
} from "lucide-react";
import ExcelJS from "exceljs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import GeographicalFilters from "@/components/dashboard/GeographicalFilters";
import AgencyTypeFilter from "@/components/dashboard/AgencyTypeFilter";

// Define interface for water consumption data
interface WaterConsumptionRecord {
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  flow_rate_m3?: number;
  flow_meter_connected?: boolean | string;
  online_status?: string;
  time_duration?: string;
  esr_capacity?: number;
  water_value_day1?: number;
  water_value_day2?: number;
  water_value_day3?: number;
  water_value_day4?: number;
  water_value_day5?: number;
  water_value_day6?: number;
  water_value_day7?: number;
  water_date_day1?: string;
  water_date_day2?: string;
  water_date_day3?: string;
  water_date_day4?: string;
  water_date_day5?: string;
  water_date_day6?: string;
  water_date_day7?: string;
  consistent_zero_consumption?: number;
  percentage_consumption_previous_day?: number;
  dashboard_url?: string;
  // Scheme status fields for filtering
  mjp_commissioned?: string;
  mjp_fully_completed?: string;
  fully_completion_scheme_status?: string;
  water_supply?: string;
  agency_type?: string;
  lremark?: string;
}

// Define interface for region data
interface RegionData {
  region_id: number;
  region_name: string;
}

// Define filter types
type WaterConsumptionFilterType =
  | "all"
  | "connected"
  | "not_connected"
  | "high_consumption"
  | "low_consumption"
  | "zero_consumption"
  | "has_water_latest"
  | "no_water_latest"
  | "continuous_water_week"
  | "continuous_no_water_week"
  | "abrupt_consumption"
  | "percentage_0_25"
  | "percentage_25_50"
  | "percentage_50_75"
  | "percentage_75_100"
  | "percentage_100_125"
  | "percentage_125_150"
  | "percentage_150_200"
  | "percentage_200_300"
  | "percentage_300_400"
  | "percentage_400_500"
  | "percentage_500_600"
  | "percentage_600_700"
  | "percentage_700_800"
  | "percentage_800_900"
  | "percentage_900_1000"
  | "percentage_above_1000";

const WaterConsumptionPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedAgencyType, setSelectedAgencyType] = useState<string>("ALL");
  const [currentFilter, setCurrentFilter] =
    useState<WaterConsumptionFilterType>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Historical data state
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [historicalStartDate, setHistoricalStartDate] = useState("");
  const [historicalEndDate, setHistoricalEndDate] = useState("");
  const [historicalRecordCount, setHistoricalRecordCount] = useState(0);
  const [isCountingRecords, setIsCountingRecords] = useState(false);
  const [isExportingHistorical, setIsExportingHistorical] = useState(false);
  const [lastQueriedDates, setLastQueriedDates] = useState<{
    start: string;
    end: string;
    region: string;
  } | null>(null);
  const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("commissioned");
  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");
  const [iotStatus, setIotStatus] = useState<string>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRecord, setSelectedRecord] =
    useState<WaterConsumptionRecord | null>(null);
  const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
    title: string;
    issues: any[];
  } | null>(null);

  // Fetch active issues
  const { data: activeIssues = [] } = useQuery({
    queryKey: ["/api/issue-reporting/active"],
    queryFn: async () => {
      const response = await fetch("/api/issue-reporting/active");
      if (!response.ok) throw new Error("Failed to fetch active issues");
      const data = await response.json();
      return data;
    },
    // Refresh every minute to keep statuses up to date
    refetchInterval: 60000,
  });

  // Create lookup maps for issues
  const { esrIssuesMap } = useMemo(() => {
    const eMap = new Map<string, any[]>();

    activeIssues.forEach((issue: any) => {
      // ESR level issues only
      if (
        issue.scheme_id &&
        issue.village_name &&
        issue.esr_name &&
        issue.problem_level === "ESR"
      ) {
        const key = `${issue.scheme_id}-${issue.village_name}-${issue.esr_name}`;
        if (!eMap.has(key)) {
          eMap.set(key, []);
        }
        eMap.get(key)?.push(issue);
      }
    });

    return { esrIssuesMap: eMap };
  }, [activeIssues]);

  // Fetch all water consumption data
  const {
    data: allWaterConsumptionData = [],
    isLoading: isLoadingConsumption,
    error: consumptionError,
  } = useQuery<WaterConsumptionRecord[]>({
    queryKey: [
      "/api/water-consumption",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
      selectedAgencyType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedCircle && selectedCircle !== "all") {
        params.append("circle", selectedCircle);
      }
      if (selectedDivision && selectedDivision !== "all") {
        params.append("division", selectedDivision);
      }
      if (selectedSubdivision && selectedSubdivision !== "all") {
        params.append("subdivision", selectedSubdivision);
      }
      if (selectedBlock && selectedBlock !== "all") {
        params.append("block", selectedBlock);
      }
      if (selectedAgencyType && selectedAgencyType !== "ALL") {
        params.append("agencyType", selectedAgencyType);
      }

      const queryString = params.toString();
      const url = `/api/water-consumption${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch water consumption data");
      }
      return response.json();
    },
  });

  // Fetch filter options for geographic filters
  const { data: filterOptions } = useQuery<any>({
    queryKey: [
      "/api/water-consumption/filters",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedAgencyType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedCircle && selectedCircle !== "all") {
        params.append("circle", selectedCircle);
      }
      if (selectedDivision && selectedDivision !== "all") {
        params.append("division", selectedDivision);
      }
      if (selectedSubdivision && selectedSubdivision !== "all") {
        params.append("subdivision", selectedSubdivision);
      }

      const queryString = params.toString();
      const url = `/api/water-consumption/filters${queryString ? `?${queryString}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch filter options");
      }
      return response.json();
    },
  });

  // Fetch region data
  const { data: regionsData = [] } = useQuery<RegionData[]>({
    queryKey: ["/api/regions"],
  });

  // Fetch scheme status data for filtering (like other dashboards)
  const { data: schemeStatusData = [], isLoading: isLoadingSchemeStatus } =
    useQuery<any[]>({
      queryKey: ["/api/schemes", selectedRegion, selectedAgencyType],
      queryFn: async () => {
        const params = new URLSearchParams();

        if (selectedRegion && selectedRegion !== "all") {
          params.append("region", selectedRegion);
        }
        if (selectedAgencyType && selectedAgencyType !== "ALL") {
          params.append("agencyType", selectedAgencyType);
        }

        const queryString = params.toString();
        const url = `/api/schemes${queryString ? `?${queryString}` : ""}`;

        console.log("Fetching scheme status data with URL:", url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch scheme status data");
        }

        const data = await response.json();
        console.log(`Received ${data.length} scheme status records`);
        return data;
      },
    });

  // Cascading filter handlers
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value);
    setSelectedCircle("all");
    setSelectedDivision("all");
    setSelectedSubdivision("all");
    setSelectedBlock("all");
    setPage(1);
  };

  const handleCircleChange = (value: string) => {
    setSelectedCircle(value);
    setSelectedDivision("all");
    setSelectedSubdivision("all");
    setSelectedBlock("all");
    setPage(1);
  };

  const handleDivisionChange = (value: string) => {
    setSelectedDivision(value);
    setSelectedSubdivision("all");
    setSelectedBlock("all");
    setPage(1);
  };

  const handleSubdivisionChange = (value: string) => {
    setSelectedSubdivision(value);
    setSelectedBlock("all");
    setPage(1);
  };

  const handleBlockChange = (value: string) => {
    setSelectedBlock(value);
    setPage(1);
  };

  // Listen for chatbot events
  useEffect(() => {
    const handleChatbotRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log(
        "Water Consumption page received chatbot region filter:",
        region,
      );
      setSelectedRegion(region);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Water Consumption page received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "water-consumption") {
        // Wait for data to be filtered properly
        setTimeout(() => {
          // Get current globally filtered data using the same logic as the component
          const currentData = allWaterConsumptionData.filter((record) => {
            // Apply region filter
            if (selectedRegion !== "all") {
              if (record.region !== selectedRegion) return false;
            }

            // Apply search term filter
            if (searchTerm.trim()) {
              const searchLower = searchTerm.toLowerCase().trim();
              const matchesSearch =
                record.scheme_id?.toLowerCase().includes(searchLower) ||
                record.scheme_name?.toLowerCase().includes(searchLower) ||
                record.village_name?.toLowerCase().includes(searchLower) ||
                record.esr_name?.toLowerCase().includes(searchLower) ||
                record.region?.toLowerCase().includes(searchLower);
              if (!matchesSearch) return false;
            }

            return true;
          });

          if (currentData.length > 0) {
            const filename = `Water_Consumption_${selectedRegion}_${currentFilter}_${new Date().toISOString().split("T")[0]}`;
            exportToExcel(currentData, filename);
            console.log(
              "Excel export triggered for Water Consumption data with",
              currentData.length,
              "records",
            );
          } else {
            console.log(
              "No water consumption data available for export for region:",
              selectedRegion,
            );
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
        // Get current filtered data based on all filters
        const filteredData = getGloballyFilteredData.filter((record) => {
          if (currentFilter === "all") return true;
          const latestConsumption = getLatestWaterValue(record);
          // Apply the current filter logic
          switch (currentFilter) {
            case "connected":
              return (
                record.flow_meter_connected === true ||
                record.flow_meter_connected === "Connected"
              );
            case "not_connected":
              return (
                record.flow_meter_connected === false ||
                record.flow_meter_connected === "Not Connected" ||
                !record.flow_meter_connected
              );
            case "zero_consumption":
              return latestConsumption === null || latestConsumption === 0;
            case "has_water_latest":
              return latestConsumption !== null && latestConsumption > 0;
            default:
              return true;
          }
        });
        const filename = `water_consumption_${selectedRegion !== "all" ? selectedRegion : "all_regions"}_${new Date().toISOString().split("T")[0]}`;
        exportToExcel(filteredData, filename);
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
  }, [allWaterConsumptionData, selectedRegion, searchTerm, currentFilter]);

  // Helper function to get latest water value
  const getLatestWaterValue = (
    record: WaterConsumptionRecord,
  ): number | null => {
    const values = [
      record.water_value_day7,
      record.water_value_day6,
      record.water_value_day5,
      record.water_value_day4,
      record.water_value_day3,
      record.water_value_day2,
      record.water_value_day1,
    ];

    for (const value of values) {
      if (value !== null && value !== undefined) {
        const numValue = Number(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          return numValue; // Return exact value, including 0 or small decimals like 0.08
        }
      }
    }

    return null;
  };

  // Calculate percentage consumption based on ESR capacity
  const calculateConsumptionPercentage = (
    consumption: number | null,
    capacity: number | string | null,
  ): number | null => {
    if (consumption === null || capacity === null) return null;
    const numCapacity =
      typeof capacity === "string" ? parseFloat(capacity) : capacity;
    if (isNaN(numCapacity) || numCapacity === 0) return null;
    return (consumption / numCapacity) * 100;
  };

  // Helper function to check if ESR has continuous water supply for a week
  const hasContinuousWaterForWeek = (
    record: WaterConsumptionRecord,
  ): boolean => {
    const values = [
      record.water_value_day1,
      record.water_value_day2,
      record.water_value_day3,
      record.water_value_day4,
      record.water_value_day5,
      record.water_value_day6,
      record.water_value_day7,
    ];

    return values.every((value) => {
      if (value === null || value === undefined) return false;
      const numValue = Number(value);
      return !isNaN(numValue) && isFinite(numValue) && numValue > 0;
    });
  };

  // Helper function to check if ESR has continuous no water for a week
  const hasContinuousNoWaterForWeek = (
    record: WaterConsumptionRecord,
  ): boolean => {
    const values = [
      record.water_value_day1,
      record.water_value_day2,
      record.water_value_day3,
      record.water_value_day4,
      record.water_value_day5,
      record.water_value_day6,
      record.water_value_day7,
    ];

    return values.every((value) => {
      if (value === null || value === undefined) return true;
      const numValue = Number(value);
      return isNaN(numValue) || !isFinite(numValue) || numValue === 0;
    });
  };

  // Helper function to check if ESR has abrupt consumption (>1000%)
  const hasAbruptConsumption = (record: WaterConsumptionRecord): boolean => {
    const latestConsumption = getLatestWaterValue(record);
    const percentage = calculateConsumptionPercentage(
      latestConsumption,
      record.esr_capacity || null,
    );
    return percentage !== null && percentage > 1000;
  };

  // Apply global filters (region, search, and status filters) - same logic as EnhancedLpcdDashboard
  const getGloballyFilteredData = useMemo(() => {
    let filtered = [...allWaterConsumptionData];

    // Apply region filter
    if (selectedRegion !== "all") {
      filtered = filtered.filter((record) => record.region === selectedRegion);
    }

    // Apply circle filter
    if (selectedCircle !== "all") {
      filtered = filtered.filter((record) => record.circle === selectedCircle);
    }

    // Apply division filter
    if (selectedDivision !== "all") {
      filtered = filtered.filter(
        (record) => record.division === selectedDivision,
      );
    }

    // Apply subdivision filter
    if (selectedSubdivision !== "all") {
      filtered = filtered.filter(
        (record) => record.sub_division === selectedSubdivision,
      );
    }

    // Apply block filter
    if (selectedBlock !== "all") {
      filtered = filtered.filter((record) => record.block === selectedBlock);
    }

    // Apply search term filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (record) =>
          record.scheme_id?.toLowerCase().includes(searchLower) ||
          record.scheme_name?.toLowerCase().includes(searchLower) ||
          record.village_name?.toLowerCase().includes(searchLower) ||
          record.esr_name?.toLowerCase().includes(searchLower) ||
          record.region?.toLowerCase().includes(searchLower),
      );
    }

    // Create a map of scheme IDs to their scheme status data for filtering (frontend join)
    const schemeStatusMap = new Map();
    if (schemeStatusData && schemeStatusData.length > 0) {
      schemeStatusData.forEach((status) => {
        schemeStatusMap.set(status.scheme_id, status);
      });
    }

    // Universal scheme filter logic with exact requirements
    if (uiSchemeFilter !== "all") {
      filtered = filtered.filter((record) => {
        const status = schemeStatusMap.get(record.scheme_id);
        if (!status) return true;

        if (uiSchemeFilter === "commissioned") {
          // 100% Civil work Completed: water_supply = Yes
          const isCivilCompleted = status.water_supply === "Yes";
          if (!isCivilCompleted) return false;

          // Water supply status tabs: Full, Partial, No
          if (waterSupplyStatus === "All") return true;
          return status.water_supply_status === waterSupplyStatus;
        }

        if (uiSchemeFilter === "fully_completed") {
          // Fully Instrumented: fully_completion_scheme_status = Fully Completed or Completed
          const statusValue = String(
            status.fully_completion_scheme_status || "",
          );
          return (
            statusValue === "Fully Completed" || statusValue === "Completed"
          );
        }

        if (uiSchemeFilter === "in_progress") {
          // Partially instrumented: fully_completion_scheme_status = In Progress
          return status.fully_completion_scheme_status === "In Progress";
        }

        if (uiSchemeFilter === "common_filter") {
          // Common filter: (fully_completion_scheme_status = Fully Completed or Completed) AND water_supply = Yes
          const statusValue = String(
            status.fully_completion_scheme_status || "",
          );
          const isInstrumented =
            statusValue === "Fully Completed" || statusValue === "Completed";
          const isCivilCompleted = status.water_supply === "Yes";
          return isInstrumented && isCivilCompleted;
        }

        if (uiSchemeFilter === "mjp_commissioned_yes") {
          // Commissioned: mjp_commissioned = Yes
          return status.mjp_commissioned === "Yes";
        }

        return true;
      });
    }

    // Apply IoT status filter - check fully_completion_scheme_status field from scheme_status table
    if (iotStatus !== "all") {
      filtered = filtered.filter((record) => {
        if (iotStatus === "Fully Completed") {
          // "Fully Completed" in scheme_status maps to "Fully Completed" in IoT status
          return record.fully_completion_scheme_status === "Fully Completed";
        } else if (iotStatus === "In Progress") {
          // "In Progress" in scheme_status maps to "In Progress" in IoT status
          return record.fully_completion_scheme_status === "In Progress";
        }
        return true;
      });
    }

    return filtered;
  }, [
    allWaterConsumptionData,
    selectedRegion,
    selectedCircle,
    selectedDivision,
    selectedSubdivision,
    selectedBlock,
    searchTerm,
    uiSchemeFilter,
    waterSupplyStatus,
    iotStatus,
    schemeStatusData,
  ]);

  // Count schemes where civil work is done (water_supply=Yes) AND IoT is active/in-progress
  const qualifyingSchemeCount = useMemo(() => {
    if (!schemeStatusData || schemeStatusData.length === 0) return 0;
    const validStatuses = ["fully completed", "completed", "in progress"];
    return schemeStatusData.filter(
      (s) =>
        s.water_supply === "Yes" &&
        validStatuses.includes(String(s.fully_completion_scheme_status || "").toLowerCase())
    ).length;
  }, [schemeStatusData]);

  // Apply consumption filters for table display (global filters + consumption filter)
  const filteredData = useMemo(() => {
    // Start with globally filtered data
    let filtered = [...getGloballyFilteredData];

    // Apply consumption filter based on card selection
    if (currentFilter !== "all") {
      filtered = filtered.filter((record) => {
        const latestConsumption = getLatestWaterValue(record);

        switch (currentFilter) {
          case "connected":
            return (
              record.flow_meter_connected === true ||
              record.flow_meter_connected === "Connected"
            );
          case "not_connected":
            return (
              record.flow_meter_connected === false ||
              record.flow_meter_connected === "Not Connected" ||
              !record.flow_meter_connected
            );
          case "high_consumption":
            return latestConsumption !== null && latestConsumption > 1000; // Above 1000 LL
          case "low_consumption":
            return (
              latestConsumption !== null &&
              latestConsumption > 0 &&
              latestConsumption <= 500
            ); // 0-500 LL
          case "zero_consumption":
            return latestConsumption === null || latestConsumption === 0;
          case "has_water_latest":
            return latestConsumption !== null && latestConsumption > 0;
          case "no_water_latest":
            return latestConsumption === null || latestConsumption === 0;
          case "continuous_water_week":
            return hasContinuousWaterForWeek(record);
          case "continuous_no_water_week":
            return hasContinuousNoWaterForWeek(record);
          case "abrupt_consumption":
            return hasAbruptConsumption(record);
          // Percentage-based filters
          case "percentage_0_25": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage >= 0 && percentage <= 25;
          }
          case "percentage_25_50": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 25 && percentage <= 50;
          }
          case "percentage_50_75": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 50 && percentage <= 75;
          }
          case "percentage_75_100": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 75 && percentage <= 100;
          }
          case "percentage_100_125": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 100 && percentage <= 125;
          }
          case "percentage_125_150": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 125 && percentage <= 150;
          }
          case "percentage_150_200": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 150 && percentage <= 200;
          }
          case "percentage_200_300": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 200 && percentage <= 300;
          }
          case "percentage_300_400": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 300 && percentage <= 400;
          }
          case "percentage_400_500": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 400 && percentage <= 500;
          }
          case "percentage_500_600": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 500 && percentage <= 600;
          }
          case "percentage_600_700": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 600 && percentage <= 700;
          }
          case "percentage_700_800": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 700 && percentage <= 800;
          }
          case "percentage_800_900": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 800 && percentage <= 900;
          }
          case "percentage_900_1000": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return (
              percentage !== null && percentage > 900 && percentage <= 1000
            );
          }
          case "percentage_above_1000": {
            const percentage = calculateConsumptionPercentage(
              latestConsumption,
              record.esr_capacity || null,
            );
            return percentage !== null && percentage > 1000;
          }
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [getGloballyFilteredData, currentFilter]);

  // Calculate card metrics based on globally filtered data (same data used for cards in EnhancedLpcdDashboard)
  const cardMetrics = useMemo(() => {
    // Use globally filtered data for card metrics (includes region, search, and status filters but NOT consumption filters)
    const baseData = getGloballyFilteredData;

    const totalIntegrated = baseData.length;
    const withWaterLatest = baseData.filter((record) => {
      const latestValue = getLatestWaterValue(record);
      return latestValue !== null && latestValue > 0;
    }).length;
    const withoutWaterLatest = totalIntegrated - withWaterLatest;
    const continuousWaterWeek = baseData.filter(
      hasContinuousWaterForWeek,
    ).length;
    const continuousNoWaterWeek = baseData.filter(
      hasContinuousNoWaterForWeek,
    ).length;
    const abruptConsumption = baseData.filter(hasAbruptConsumption).length;

    return {
      totalIntegrated,
      withWaterLatest,
      withoutWaterLatest,
      continuousWaterWeek,
      continuousNoWaterWeek,
      abruptConsumption,
    };
  }, [getGloballyFilteredData]);

  // Helper function to get status badge
  const getStatusBadge = (record: WaterConsumptionRecord) => {
    const isConnected =
      record.flow_meter_connected === true ||
      record.flow_meter_connected === "Connected";
    const isOnline = record.online_status === "Online";

    if (isConnected && isOnline) {
      return (
        <Badge variant="default" className="bg-green-500">
          Fully Connected
        </Badge>
      );
    } else if (isConnected || isOnline) {
      return (
        <Badge variant="secondary" className="bg-yellow-500">
          Partially Connected
        </Badge>
      );
    } else {
      return <Badge variant="destructive">Not Connected</Badge>;
    }
  };

  // Helper function to get consumption status badge based on percentage
  const getConsumptionStatusBadge = (percentage: number | null) => {
    if (percentage === null) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-600">
          No Data
        </Badge>
      );
    } else if (percentage === 0) {
      return <Badge variant="destructive">Zero Consumption</Badge>;
    } else if (percentage <= 25) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Very Low (&lt;25%)
        </Badge>
      );
    } else if (percentage <= 50) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          Low (25-50%)
        </Badge>
      );
    } else if (percentage <= 75) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
          Normal (50-75%)
        </Badge>
      );
    } else if (percentage <= 100) {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          High (75-100%)
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-700">
          Over Capacity (&gt;100%)
        </Badge>
      );
    }
  };

  // Format water value for display in LL (Lakh Liters)
  const formatWaterValue = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const numValue =
      typeof value === "string" ? parseFloat(value) : Number(value);
    if (isNaN(numValue) || !isFinite(numValue)) return "N/A";
    // Show exact decimal values without rounding, but with max 2 decimal places
    if (numValue === 0) return "0";
    return numValue.toFixed(2).replace(/\.?0+$/, ""); // Remove trailing zeros
  };

  // Format percentage for display
  const formatPercentage = (percentage: number | null | undefined) => {
    if (
      percentage === null ||
      percentage === undefined ||
      isNaN(percentage) ||
      !isFinite(percentage)
    )
      return "N/A";
    return `${percentage.toFixed(1)}%`;
  };

  // Handle filter change
  const handleFilterChange = (filter: WaterConsumptionFilterType) => {
    setCurrentFilter(filter);
    setPage(1); // Reset pagination when filter changes
  };

  // Handle Universal Filter change
  const handleUniversalFilterChange = (val: string) => {
    setUiSchemeFilter(val);
    setPage(1);
    // Reset water supply status if not in commissioned mode
    if (val !== "commissioned") {
      setWaterSupplyStatus("All");
    }
  };

  // Handle Water Supply status change
  const handleWaterSupplyStatusChange = (val: string) => {
    setWaterSupplyStatus(val);
    setPage(1);
  };

  // Handle IoT status filter change (same logic as EnhancedLpcdDashboard)
  const handleIotStatusFilterChange = (status: string) => {
    setIotStatus(status);

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Handle IoT status change
  const handleIotStatusChange = (status: string) => {
    setIotStatus(status);
    setPage(1);
  };

  // Handle search term change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  // Helper to format date for column header
  const formatDateHeader = (dateStr: string | undefined): string => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  };

  // Export to Excel function
  const exportToExcel = async (
    data: WaterConsumptionRecord[],
    filename: string,
  ) => {
    try {
      // Get dates from first record with valid dates for column headers
      const sampleRecord = data.find(
        (r) => r.water_date_day1 || r.water_date_day2 || r.water_date_day7,
      );
      const dateHeaders = [
        formatDateHeader(sampleRecord?.water_date_day1),
        formatDateHeader(sampleRecord?.water_date_day2),
        formatDateHeader(sampleRecord?.water_date_day3),
        formatDateHeader(sampleRecord?.water_date_day4),
        formatDateHeader(sampleRecord?.water_date_day5),
        formatDateHeader(sampleRecord?.water_date_day6),
        formatDateHeader(sampleRecord?.water_date_day7),
      ];

      const exportData = data.map((record) => {
        const latestConsumption = getLatestWaterValue(record);
        const esrCapacityPercentage = calculateConsumptionPercentage(
          latestConsumption,
          record.esr_capacity || null,
        );

        return {
          Region: record.region || "",
          Circle: record.circle || "",
          Division: record.division || "",
          "Sub Division": record.sub_division || "",
          Block: record.block || "",
          "Agency Type": record.agency_type || "NA",
          "Scheme ID": record.scheme_id || "",
          "Scheme Name": record.scheme_name || "",
          "Village Name": record.village_name || "",
          "ESR Name": record.esr_name || "",
          "ESR Capacity (LL)": record.esr_capacity || 0,
          "Flow Rate (LL)": record.flow_rate_m3 || 0,
          "Online Status": record.online_status || "Offline",
          [`${dateHeaders[0]} (LL)`]: formatWaterValue(record.water_value_day1),
          [`${dateHeaders[1]} (LL)`]: formatWaterValue(record.water_value_day2),
          [`${dateHeaders[2]} (LL)`]: formatWaterValue(record.water_value_day3),
          [`${dateHeaders[3]} (LL)`]: formatWaterValue(record.water_value_day4),
          [`${dateHeaders[4]} (LL)`]: formatWaterValue(record.water_value_day5),
          [`${dateHeaders[5]} (LL)`]: formatWaterValue(record.water_value_day6),
          [`${dateHeaders[6]} (LL)`]: formatWaterValue(record.water_value_day7),
          "Consistent Zero Consumption":
            record.consistent_zero_consumption || 0,
          "Percentage Change from Previous Day":
            record.percentage_consumption_previous_day || 0,
          "% of ESR Capacity (Latest)":
            esrCapacityPercentage !== null
              ? `${esrCapacityPercentage.toFixed(2)}%`
              : "N/A",
          "Water Supply": record.water_supply || "No",
        };
      });

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Water Consumption Data");
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
      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}.xlsx`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Export historical water consumption data to Excel from water_consumption_history table
  const exportHistoricalData = async () => {
    if (isExportingHistorical) return; // Prevent double-click

    // Validate date range first
    if (!historicalStartDate || !historicalEndDate) {
      toast({
        title: "Invalid Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(historicalStartDate);
    const end = new Date(historicalEndDate);
    const daysDifference = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDifference < 0) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    try {
      // If we haven't counted yet OR dates changed, count first
      const datesChanged =
        !lastQueriedDates ||
        lastQueriedDates.start !== historicalStartDate ||
        lastQueriedDates.end !== historicalEndDate ||
        lastQueriedDates.region !== selectedRegion;

      if (datesChanged) {
        // Count records first
        setIsCountingRecords(true);

        try {
          const params = new URLSearchParams();
          params.append("startDate", historicalStartDate);
          params.append("endDate", historicalEndDate);
          params.append("countOnly", "true");

          if (selectedRegion && selectedRegion !== "all") {
            params.append("region", selectedRegion);
          }

          const url = `/api/water-consumption/historical?${params.toString()}`;
          console.log(
            "🔢 Counting historical Water Consumption records before export:",
            url,
          );

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              "Failed to count historical Water Consumption data",
            );
          }

          const data = await response.json();
          const count = data.count || 0;

          console.log(`✅ Found ${count} historical Water Consumption records`);
          setHistoricalRecordCount(count);

          setLastQueriedDates({
            start: historicalStartDate,
            end: historicalEndDate,
            region: selectedRegion,
          });

          if (count === 0) {
            toast({
              title: "No Records Found",
              description:
                "No historical records found for the selected date range.",
              variant: "destructive",
            });
            setIsCountingRecords(false);
            return;
          }

          toast({
            title: "Records Found",
            description: `Found ${count.toLocaleString()} historical records. Starting export...`,
            duration: 2000,
          });
        } catch (error) {
          console.error("Error counting historical records:", error);
          toast({
            title: "Count Failed",
            description:
              "Failed to count historical records. Please try again.",
            variant: "destructive",
          });
          setIsCountingRecords(false);
          return;
        } finally {
          setIsCountingRecords(false);
        }
      }

      // Now proceed with export (we know lastQueriedDates is set from counting above)
      if (!lastQueriedDates) {
        console.error("lastQueriedDates is null unexpectedly");
        return;
      }

      setIsExportingHistorical(true);

      // Build query parameters for the backend API
      const params = new URLSearchParams();
      params.append("startDate", lastQueriedDates.start);
      params.append("endDate", lastQueriedDates.end);
      params.append("format", "xlsx");

      if (lastQueriedDates.region && lastQueriedDates.region !== "all") {
        params.append("region", lastQueriedDates.region);
      }

      const queryString = params.toString();
      const url = `/api/water-consumption/download/water-consumption-history?${queryString}`;

      console.log("📥 Downloading historical Water Consumption data:", url);

      // Download the Excel file
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to download historical data");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "water_consumption_history.xlsx";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        } else {
          // Fallback for unquoted filenames
          const fallbackMatch = contentDisposition.match(/filename=([^\s;]+)/);
          if (fallbackMatch) {
            filename = fallbackMatch[1].replace(/["'_]+$/g, ""); // Remove trailing quotes/underscores
          }
        }
      }

      // Convert response to blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log(`✅ Successfully downloaded ${filename}`);

      toast({
        title: "Export Successful",
        description: `Downloaded ${historicalRecordCount.toLocaleString()} historical records`,
      });
    } catch (error) {
      console.error("Error exporting historical data:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export historical data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingHistorical(false);
    }
  };

  // Calculate regional summary based on current filter
  const regionalSummary = useMemo(() => {
    const summary: Record<string, number> = {};

    // Use the globally filtered data for the card metrics
    const dataToSummarize = getGloballyFilteredData.filter((record) => {
      if (currentFilter === "all") return true;

      const latestConsumption = getLatestWaterValue(record);

      switch (currentFilter) {
        case "connected":
          return (
            record.flow_meter_connected === true ||
            record.flow_meter_connected === "Connected"
          );
        case "not_connected":
          return (
            record.flow_meter_connected === false ||
            record.flow_meter_connected === "Not Connected" ||
            !record.flow_meter_connected
          );
        case "high_consumption":
          return latestConsumption !== null && latestConsumption > 1000;
        case "low_consumption":
          return (
            latestConsumption !== null &&
            latestConsumption > 0 &&
            latestConsumption <= 500
          );
        case "zero_consumption":
          return latestConsumption === null || latestConsumption === 0;
        case "has_water_latest":
          return latestConsumption !== null && latestConsumption > 0;
        case "no_water_latest":
          return latestConsumption === null || latestConsumption === 0;
        case "continuous_water_week":
          return hasContinuousWaterForWeek(record);
        case "continuous_no_water_week":
          return hasContinuousNoWaterForWeek(record);
        case "abrupt_consumption":
          return hasAbruptConsumption(record);
        // Percentage-based filters for regional summary
        case "percentage_0_25": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage >= 0 && percentage <= 25;
        }
        case "percentage_25_50": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 25 && percentage <= 50;
        }
        case "percentage_50_75": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 50 && percentage <= 75;
        }
        case "percentage_75_100": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 75 && percentage <= 100;
        }
        case "percentage_100_125": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 100 && percentage <= 125;
        }
        case "percentage_125_150": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 125 && percentage <= 150;
        }
        case "percentage_150_200": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 150 && percentage <= 200;
        }
        case "percentage_200_300": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 200 && percentage <= 300;
        }
        case "percentage_300_400": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 300 && percentage <= 400;
        }
        case "percentage_400_500": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 400 && percentage <= 500;
        }
        case "percentage_500_600": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 500 && percentage <= 600;
        }
        case "percentage_600_700": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 600 && percentage <= 700;
        }
        case "percentage_700_800": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 700 && percentage <= 800;
        }
        case "percentage_800_900": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 800 && percentage <= 900;
        }
        case "percentage_900_1000": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 900 && percentage <= 1000;
        }
        case "percentage_above_1000": {
          const percentage = calculateConsumptionPercentage(
            latestConsumption,
            record.esr_capacity || null,
          );
          return percentage !== null && percentage > 1000;
        }
        default:
          return true;
      }
    });

    dataToSummarize.forEach((record) => {
      const region = record.region || "Unknown";
      summary[region] = (summary[region] || 0) + 1;
    });

    // Define the regional hierarchy order as requested
    const regionOrder = [
      "Amravati",
      "Nashik",
      "Nagpur",
      "Chhatrapati Sambhajinagar",
      "Pune",
      "Konkan",
    ];

    return Object.entries(summary)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => {
        const aIndex = regionOrder.indexOf(a.region);
        const bIndex = regionOrder.indexOf(b.region);
        // If region not found in order, put it at the end
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [getGloballyFilteredData, currentFilter]);

  // Get filter display name
  const getFilterDisplayName = (filter: WaterConsumptionFilterType) => {
    switch (filter) {
      case "all":
        return "All ESR Locations";
      case "connected":
        return "Flow Meter Connected";
      case "not_connected":
        return "Flow Meter Not Connected";
      case "high_consumption":
        return "High Consumption (>1000 LL)";
      case "low_consumption":
        return "Low Consumption (0-500 LL)";
      case "zero_consumption":
        return "Zero Consumption";
      case "has_water_latest":
        return "ESR with Water (Latest)";
      case "no_water_latest":
        return "ESR without Water (Latest)";
      case "continuous_water_week":
        return "Continuous Water (Week)";
      case "continuous_no_water_week":
        return "Continuous No Water (Week)";
      case "abrupt_consumption":
        return "Abrupt Consumption Changes";
      case "percentage_0_25":
        return "0-25% Consumption";
      case "percentage_25_50":
        return "25-50% Consumption";
      case "percentage_50_75":
        return "50-75% Consumption";
      case "percentage_75_100":
        return "75-100% Consumption";
      case "percentage_100_125":
        return "100-125% Consumption";
      case "percentage_125_150":
        return "125-150% Consumption";
      case "percentage_150_200":
        return "150-200% Consumption";
      case "percentage_200_300":
        return "200-300% Consumption";
      case "percentage_300_400":
        return "300-400% Consumption";
      case "percentage_400_500":
        return "400-500% Consumption";
      case "percentage_500_600":
        return "500-600% Consumption";
      case "percentage_600_700":
        return "600-700% Consumption";
      case "percentage_700_800":
        return "700-800% Consumption";
      case "percentage_800_900":
        return "800-900% Consumption";
      case "percentage_900_1000":
        return "900-1000% Consumption";
      case "percentage_above_1000":
        return ">1000% Consumption";
      default:
        return "Unknown Filter";
    }
  };

  // Pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageData = filteredData.slice(startIndex, endIndex);

  return (
    <DashboardLayout>
      <div className="w-full py-6">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              <TranslatedText>Water Consumption Dashboard</TranslatedText>
            </CardTitle>
            <CardDescription>
              <TranslatedText>
                Monitor and analyze water consumption data across ESR locations
                with real-time IoT status tracking
              </TranslatedText>
            </CardDescription>
            <p className="text-sm text-blue-600 font-medium mt-2">
              <TranslatedText>Dashboard Updated</TranslatedText>:{" "}
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              <TranslatedText>at</TranslatedText>{" "}
              {new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </CardHeader>
          <CardContent>
            {/* ESR Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {/* Total ESR Integrated */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 via-white to-blue-50"
                onClick={() => handleFilterChange("all")}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardContent className="p-4 text-center relative">
                  <div className="p-2 bg-blue-500/10 rounded-lg mx-auto mb-2 w-fit">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {cardMetrics.totalIntegrated}
                  </div>
                  <div className="text-blue-900 text-sm font-medium">
                    Total ESR
                  </div>
                  <div className="text-blue-700 text-xs">Integrated</div>
                </CardContent>
              </Card>

              {/* ESR with Water (Latest Day) */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 via-white to-green-50"
                onClick={() => handleFilterChange("has_water_latest")}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardContent className="p-4 text-center relative">
                  <div className="p-2 bg-green-500/10 rounded-lg mx-auto mb-2 w-fit">
                    <Droplets className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {cardMetrics.withWaterLatest}
                  </div>
                  <div className="text-green-900 text-sm font-medium">
                    ESR with Water
                  </div>
                  {/* <div className="text-green-700 text-xs">Latest Day</div> */}
                </CardContent>
              </Card>

              {/* ESR without Water (Latest Day) */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-50 via-white to-red-50"
                onClick={() => handleFilterChange("no_water_latest")}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardContent className="p-4 text-center relative">
                  <div className="p-2 bg-red-500/10 rounded-lg mx-auto mb-2 w-fit">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {cardMetrics.withoutWaterLatest}
                  </div>
                  <div className="text-red-900 text-sm font-medium">
                    ESR with no Water
                  </div>
                  {/* <div className="text-red-700 text-xs">Latest Day</div> */}
                </CardContent>
              </Card>

              {/* Continuous Water Supply (Week) */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-teal-50 via-white to-teal-50"
                onClick={() => handleFilterChange("continuous_water_week")}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardContent className="p-4 text-center relative">
                  <div className="p-2 bg-teal-500/10 rounded-lg mx-auto mb-2 w-fit">
                    <Waves className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="text-2xl font-bold text-teal-600">
                    {cardMetrics.continuousWaterWeek}
                  </div>
                  <div className="text-teal-900 text-sm font-medium">
                    Consisten Water Supply{" "}
                  </div>
                  <div className="text-teal-700 text-xs">For a Week</div>
                </CardContent>
              </Card>

              {/* Continuous No Water (Week) */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 via-white to-orange-50"
                onClick={() => handleFilterChange("continuous_no_water_week")}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardContent className="p-4 text-center relative">
                  <div className="p-2 bg-orange-500/10 rounded-lg mx-auto mb-2 w-fit">
                    <Ban className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {cardMetrics.continuousNoWaterWeek}
                  </div>
                  <div className="text-orange-900 text-sm font-medium">
                    {" "}
                    Consistent Zero Water Suppy
                  </div>
                  <div className="text-orange-700 text-xs">For a Week</div>
                </CardContent>
              </Card>

              {/* Abrupt Consumption (>1000%) */}
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 via-white to-purple-50"
                onClick={() => handleFilterChange("abrupt_consumption")}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardContent className="p-4 text-center relative">
                  <div className="p-2 bg-purple-500/10 rounded-lg mx-auto mb-2 w-fit">
                    <Gauge className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {cardMetrics.abruptConsumption}
                  </div>
                  <div className="text-purple-900 text-sm font-medium">
                    Abrupt
                  </div>
                  <div className="text-purple-700 text-xs">
                    water Consumption &gt;1000% of ESR Capacity
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Unified Filter Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
              {/* Row 1: Geographical Filters */}
              <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                <GeographicalFilters
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
                  filters={filterOptions}
                />
              </div>

              {/* Row 2: Agency Selection + Water Supply Status */}
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-x-6 gap-y-3 items-end">
                <div>
                  <AgencyTypeFilter
                    selectedAgencyType={selectedAgencyType}
                    onAgencyTypeChange={(value) => {
                      setSelectedAgencyType(value);
                      setPage(1);
                    }}
                  />
                </div>
                {uiSchemeFilter === "commissioned" && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Water Supply Status</p>
                    <Tabs value={waterSupplyStatus} onValueChange={(v) => { handleWaterSupplyStatusChange(v); }}>
                      <TabsList className="h-8 p-0.5 bg-white border border-blue-200 gap-0.5">
                        <TabsTrigger value="All" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">All</TabsTrigger>
                        <TabsTrigger value="Full" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Fully Operational</TabsTrigger>
                        <TabsTrigger value="Partial" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white">Partially Operational</TabsTrigger>
                        <TabsTrigger value="No" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-red-500 data-[state=active]:text-white">Not Operational</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}
              </div>

              {/* Row 3: Search + IoT Status + Consumption Filter + Clear All */}
              <div className="px-4 py-3 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-[180px]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Search</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search schemes, villages, ESRs..."
                      value={searchTerm}
                      onChange={(e) => { handleSearchChange(e.target.value); }}
                      className="border-slate-200 bg-white pl-9 w-full"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-44">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">IoT Status</p>
                  <Select
                    value={iotStatus}
                    onValueChange={(val) => {
                      setIotStatus(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="border-slate-200 bg-white h-9">
                      <SelectValue placeholder="IoT Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All IoT Status</SelectItem>
                      <SelectItem value="Fully Completed">Fully Completed</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="min-w-[200px]">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">Scheme Category (Admin)</p>
                    <Select value={uiSchemeFilter} onValueChange={(value) => { setUiSchemeFilter(value); setPage(1); }}>
                      <SelectTrigger className="w-full bg-white border-blue-200 h-9">
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

                {isAdmin && (
                  <div className="min-w-[200px]">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">Scheme Category (Admin)</p>
                    <Select value={uiSchemeFilter} onValueChange={(value) => { setUiSchemeFilter(value); setPage(1); }}>
                      <SelectTrigger className="w-full bg-white border-blue-200 h-9">
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

                <div className="w-full sm:w-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Consumption Filter</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 border-slate-200 bg-white text-slate-600 text-xs gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Consumption Filter
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-[400px] overflow-y-auto">
                      <DropdownMenuLabel>
                        Filter by Consumption Percentage
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("all")}
                      >
                        All ESR Locations
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Percentage-based filters */}
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_0_25")}
                      >
                        0-25% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_25_50")}
                      >
                        25-50% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_50_75")}
                      >
                        50-75% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_75_100")}
                      >
                        75-100% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_100_125")}
                      >
                        100-125% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_125_150")}
                      >
                        125-150% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_150_200")}
                      >
                        150-200% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_200_300")}
                      >
                        200-300% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_300_400")}
                      >
                        300-400% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_400_500")}
                      >
                        400-500% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_500_600")}
                      >
                        500-600% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_600_700")}
                      >
                        600-700% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_700_800")}
                      >
                        700-800% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("percentage_800_900")}
                      >
                        800-900% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleFilterChange("percentage_900_1000")
                        }
                      >
                        900-1000% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleFilterChange("percentage_above_1000")
                        }
                      >
                        &gt;1000% Consumption
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Original filters */}
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("zero_consumption")}
                      >
                        Zero Consumption
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("connected")}
                      >
                        Flow Meter Connected
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleFilterChange("not_connected")}
                      >
                        Flow Meter Not Connected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs border-slate-200 text-slate-500 hover:text-slate-700 self-end"
                  onClick={() => {
                    setSelectedRegion("all");
                    setSelectedCircle("all");
                    setSelectedDivision("all");
                    setSelectedSubdivision("all");
                    setSelectedBlock("all");
                    setSearchTerm("");
                    setSelectedAgencyType("ALL");
                    setIotStatus("all");
                    handleWaterSupplyStatusChange("All");
                    handleFilterChange("all");
                    setPage(1);
                  }}
                >
                  Clear All
                </Button>
              </div>

              {/* Qualifying Schemes Info Footer */}
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                  Live Data Feed
                </div>
                <div className="flex items-center gap-2 flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 shadow-sm">
                  <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-blue-800">
                    The data corresponds to{" "}
                    <span className="inline-flex items-center justify-center bg-blue-600 text-white font-bold text-xs px-2 py-0.5 rounded-full mx-0.5 shadow-sm">
                      {qualifyingSchemeCount}
                    </span>{" "}
                    schemes where civil work is 100% complete.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
                {/* Excel Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Excel
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        exportToExcel(
                          filteredData,
                          `Water_Consumption_${currentFilter}_${selectedRegion}_${
                            new Date().toISOString().split("T")[0]
                          }`,
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Filtered Data
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        exportToExcel(
                          allWaterConsumptionData,
                          `Water_Consumption_All_ESR_${
                            new Date().toISOString().split("T")[0]
                          }`,
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export All ESR Locations
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Historical Data Button */}
                <Button
                  onClick={() => setShowHistoricalData(!showHistoricalData)}
                  variant="outline"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  data-testid="button-toggle-historical"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Historical Data
                </Button>
              </div>

            {/* Historical Data Date Selection */}
            {showHistoricalData && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      Select Date Range for Historical Water Consumption Data
                    </span>
                  </div>

                  <div className="text-sm text-blue-600 bg-blue-100 px-3 py-2 rounded border border-blue-300">
                    💡 <span className="font-medium">Quick Tip:</span> Select
                    your date range and click "Export to Excel" to download any
                    range of historical data - the system will automatically
                    query and download the data for you!
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center mt-3">
                  <div className="hidden md:block w-full md:w-auto"></div>

                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        value={historicalStartDate}
                        onChange={(e) => setHistoricalStartDate(e.target.value)}
                        className="w-[160px]"
                        data-testid="input-historical-start-date"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-600">End Date</label>
                      <Input
                        type="date"
                        value={historicalEndDate}
                        onChange={(e) => setHistoricalEndDate(e.target.value)}
                        className="w-[160px]"
                        data-testid="input-historical-end-date"
                      />
                    </div>

                    <Button
                      onClick={exportHistoricalData}
                      variant="default"
                      size="sm"
                      className={`flex items-center gap-2 mt-4 md:mt-0 transition-all ${
                        historicalRecordCount > 0
                          ? "bg-green-600 hover:bg-green-700 shadow-lg scale-105"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      disabled={
                        isCountingRecords ||
                        isExportingHistorical ||
                        !historicalStartDate ||
                        !historicalEndDate
                      }
                      data-testid="button-export-historical"
                    >
                      {isExportingHistorical || isCountingRecords ? (
                        <Download className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {isCountingRecords
                        ? "Counting..."
                        : isExportingHistorical
                          ? "Exporting..."
                          : "Export to Excel"}
                      {!isCountingRecords &&
                        !isExportingHistorical &&
                        historicalRecordCount > 0 && (
                          <span className="ml-1 font-bold text-white">
                            ({historicalRecordCount.toLocaleString()})
                          </span>
                        )}
                    </Button>
                  </div>
                </div>

                {isCountingRecords && (
                  <div className="mt-3 text-sm text-blue-700 flex items-center gap-2">
                    <Download className="h-4 w-4 animate-spin" />
                    Counting historical records...
                  </div>
                )}

                {!isCountingRecords &&
                  historicalRecordCount > 0 &&
                  lastQueriedDates && (
                    <div className="mt-3 text-sm bg-green-50 p-3 rounded-lg border border-green-300">
                      <span className="text-green-700 font-semibold">
                        ✅ Ready to export{" "}
                        {historicalRecordCount.toLocaleString()} historical
                        records
                      </span>
                      <span className="text-green-600 ml-2">
                        ({lastQueriedDates.start} to {lastQueriedDates.end})
                      </span>
                      <span className="text-green-600 ml-2 block mt-1">
                        Click the highlighted "Export to Excel" button to
                        download
                      </span>
                    </div>
                  )}

                {isExportingHistorical && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-100 p-3 rounded-lg border border-orange-300">
                    <Download className="h-4 w-4 animate-spin" />
                    <span className="font-semibold">
                      Preparing download for{" "}
                      {historicalRecordCount.toLocaleString()} records...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Regional Summary Mini-Table - Always Visible */}
            {regionalSummary.length > 0 && (
              <div className="mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Regional Summary -{" "}
                    {currentFilter === "all"
                      ? "All ESR Locations"
                      : getFilterDisplayName(currentFilter)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {regionalSummary.map(({ region, count }) => (
                      <div
                        key={region}
                        className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {count.toLocaleString()}
                          </div>
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            {region}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-blue-600 font-medium">
                    Total ESR Count:{" "}
                    {regionalSummary
                      .reduce((sum, item) => sum + item.count, 0)
                      .toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Data Table Section */}
            {isLoadingConsumption ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="w-full h-12" />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  {totalItems === 0
                    ? "No water consumption data available"
                    : `Showing ${
                        startIndex + 1
                      } to ${endIndex} of ${totalItems} ESR locations`}
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: "Poppins, sans-serif",
                    fontSize: "14px",
                  }}
                >
                  <thead style={{ backgroundColor: "#3b2e7d" }}>
                    <tr>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        REGION
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        SCHEME
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        VILLAGE
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        ESR NAME
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        CAPACITY (LL)
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        CONSUMPTION (LL)
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        CONSUMPTION %
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        STATUS
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        REMARK
                      </th>
                      <th
                        scope="col"
                        style={{
                          backgroundColor: "#3b2e7d",
                          color: "white",
                          textAlign: "left",
                          padding: "8px",
                          border: "none",
                          fontSize: "14px",
                          fontFamily: "Poppins, sans-serif",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.025em",
                          borderRadius: "0",
                        }}
                      >
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageData.map((record, index) => {
                      const latestConsumption = getLatestWaterValue(record);
                      const consumptionPercentage =
                        calculateConsumptionPercentage(
                          latestConsumption,
                          record.esr_capacity || null,
                        );

                      // Check for active issues
                      // User Request: Only show ESR level issues on Water Consumption page
                      const allIssues =
                        esrIssuesMap.get(
                          `${record.scheme_id}-${record.village_name}-${record.esr_name}`,
                        ) || [];
                      const hasActiveIssue = allIssues.some((i: any) => i.status !== "Resolved");
                      const hasResolvedIssue = allIssues.some((i: any) => i.status === "Resolved");
                      const hasIssue = allIssues.length > 0;

                      return (
                        <tr
                          key={`${record.scheme_id}-${record.esr_name}-${index}`}
                          style={{
                            backgroundColor: hasActiveIssue ? "#fef2f2" : "white", // Red-50 if active issue
                            borderLeft: hasActiveIssue ? "4px solid #ef4444" : "none", // Red border if active issue
                            transition: "all 0.2s",
                          }}
                          className={hasActiveIssue ? "hover:bg-red-100/50" : ""}
                        >
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              borderRadius: "0",
                            }}
                          >
                            {record.region || "N/A"}
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              borderRadius: "0",
                            }}
                          >
                            {record.scheme_name || "N/A"}
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              borderRadius: "0",
                            }}
                          >
                            {record.village_name || "N/A"}
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              fontWeight: "500",
                              borderRadius: "0",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span>{record.esr_name || "N/A"}</span>
                              {hasActiveIssue ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 p-0 hover:bg-red-100 rounded-full"
                                    >
                                      <AlertCircle className="h-5 w-5 text-red-600 animate-pulse cursor-pointer" />
                                      <span className="sr-only">
                                        View Issues
                                      </span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-80 p-0 border-red-200 shadow-xl"
                                    collisionPadding={16}
                                  >
                                    <div className="bg-red-50 px-4 py-3 border-b border-red-100 rounded-t-lg">
                                      <h4 className="font-semibold text-red-900 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Reported Issues
                                      </h4>
                                    </div>
                                    <div className="p-4 max-h-[300px] overflow-y-auto">
                                      <ul className="space-y-3">
                                        {allIssues.map((issue: any) => (
                                          <li
                                            key={issue.id}
                                            className="text-sm bg-white p-3 rounded-md border border-red-100 shadow-sm"
                                          >
                                            <div className="font-medium text-gray-900 mb-1">
                                              {issue.esr_name ? (
                                                <Badge
                                                  variant="outline"
                                                  className="mr-2 border-purple-200 text-purple-700 bg-purple-50"
                                                >
                                                  ESR
                                                </Badge>
                                              ) : issue.village_name ? (
                                                <Badge
                                                  variant="outline"
                                                  className="mr-2 border-red-200 text-red-700 bg-red-50"
                                                >
                                                  Village
                                                </Badge>
                                              ) : (
                                                <Badge
                                                  variant="outline"
                                                  className="mr-2 border-blue-200 text-blue-700 bg-blue-50"
                                                >
                                                  Scheme
                                                </Badge>
                                              )}
                                              <span className="text-red-800 font-semibold uppercase text-xs tracking-wider">
                                                {issue.status === "Resolved" ? "RESOLVED" : "ACTIVE"} ISSUE
                                              </span>
                                            </div>
                                            <div className="bg-red-50 p-2.5 rounded-md border border-red-100 mb-2">
                                              <p className="text-red-900 font-medium text-sm leading-relaxed">
                                                {issue.reason}
                                              </p>
                                            </div>
                                            <div className="text-xs text-gray-500 flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
                                              <span>
                                                By:{" "}
                                                <span className="font-medium">
                                                  {issue.creator_name}
                                                </span>
                                              </span>
                                              <span>
                                                {new Date(
                                                  issue.created_at,
                                                ).toLocaleDateString()}
                                              </span>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : hasResolvedIssue ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 p-0 hover:bg-green-100 rounded-full"
                                    >
                                      <CheckCircle2 className="h-5 w-5 text-green-600 cursor-pointer" />
                                      <span className="sr-only">
                                        View Resolved Issues
                                      </span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-80 p-0 border-green-200 shadow-xl"
                                    collisionPadding={16}
                                  >
                                    <div className="bg-green-50 px-4 py-3 border-b border-green-100 rounded-t-lg">
                                      <h4 className="font-semibold text-green-900 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Resolved Issues
                                      </h4>
                                    </div>
                                    <div className="p-4 max-h-[300px] overflow-y-auto">
                                      <ul className="space-y-3">
                                        {allIssues.map((issue: any) => (
                                          <li
                                            key={issue.id}
                                            className="text-sm bg-white p-3 rounded-md border border-green-100 shadow-sm"
                                          >
                                            <div className="font-medium text-gray-900 mb-1">
                                              <Badge
                                                variant="outline"
                                                className="mr-2 border-green-200 text-green-700 bg-green-50"
                                              >
                                                Resolved
                                              </Badge>
                                              <span className="text-green-800 font-semibold uppercase text-xs tracking-wider">
                                                RESOLVED ISSUE
                                              </span>
                                            </div>
                                            <div className="bg-green-50 p-2.5 rounded-md border border-green-100 mb-2">
                                              <p className="text-green-900 font-medium text-sm leading-relaxed">
                                                {issue.reason}
                                              </p>
                                            </div>
                                            {issue.resolution_remark && (
                                              <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-2">
                                                <p className="text-xs text-slate-500 font-semibold">Resolution Comments:</p>
                                                <p className="text-xs text-slate-700 italic">"{issue.resolution_remark}"</p>
                                              </div>
                                            )}
                                            <div className="text-xs text-gray-500 flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
                                              <span>
                                                By:{" "}
                                                <span className="font-medium">
                                                  {issue.creator_name}
                                                </span>
                                              </span>
                                              <span>
                                                {new Date(
                                                  issue.created_at,
                                                ).toLocaleDateString()}
                                              </span>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : null}
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              fontWeight: "500",
                              borderRadius: "0",
                              color: "#2563eb",
                            }}
                          >
                            {record.esr_capacity
                              ? `${formatWaterValue(record.esr_capacity)} LL`
                              : "N/A"}
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              fontWeight: "500",
                              borderRadius: "0",
                              color: "#2563eb",
                            }}
                          >
                            {latestConsumption !== null ? (
                              `${formatWaterValue(latestConsumption)} LL`
                            ) : (
                              <span style={{ color: "#6b7280" }}>No data</span>
                            )}
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              fontWeight: "500",
                              borderRadius: "0",
                              color:
                                consumptionPercentage !== null &&
                                consumptionPercentage > 75
                                  ? "#dc2626"
                                  : "#2563eb",
                            }}
                          >
                            {consumptionPercentage !== null ? (
                              `${consumptionPercentage.toFixed(1)}%`
                            ) : (
                              <span style={{ color: "#6b7280" }}>-</span>
                            )}
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              borderRadius: "0",
                            }}
                          >
                            <div style={{ display: "inline-block" }}>
                              {getConsumptionStatusBadge(consumptionPercentage)}
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              borderRadius: "0",
                              maxWidth: "150px",
                            }}
                          >
                            {allIssues.length > 0 ? (
                              <Button
                                variant="ghost"
                                className={`h-auto p-1 max-w-full justify-start font-medium text-[11px] hover:bg-slate-50 ${
                                  hasActiveIssue
                                    ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                                    : "text-green-600 hover:text-green-700 hover:bg-green-50"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRemarkDetails({
                                    issues: allIssues,
                                    title: `Issues for ${record.esr_name}, ${record.village_name}`,
                                  });
                                }}
                              >
                                <span className="truncate w-full text-left">
                                  {allIssues
                                    .map((i: any) => i.status === "Resolved" ? `[Resolved] ${i.reason}` : i.reason)
                                    .join(", ")}
                                </span>
                              </Button>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            )}
                          </td>
                          <td
                            style={{
                              textAlign: "left",
                              padding: "8px",
                              borderBottom: "1px solid #e5e7eb",
                              backgroundColor: "white",
                              fontSize: "14px",
                              fontFamily: "Poppins, sans-serif",
                              borderRadius: "0",
                            }}
                          >
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRecord(record)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Water Consumption Details: {record.esr_name}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">
                                        Location Information
                                      </h4>
                                      <div className="space-y-1 text-sm">
                                        <p>
                                          <span className="font-medium">
                                            Region:
                                          </span>{" "}
                                          {record.region}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Circle:
                                          </span>{" "}
                                          {record.circle}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Division:
                                          </span>{" "}
                                          {record.division}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Sub Division:
                                          </span>{" "}
                                          {record.sub_division}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Block:
                                          </span>{" "}
                                          {record.block}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Village:
                                          </span>{" "}
                                          {record.village_name}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Scheme:
                                          </span>{" "}
                                          {record.scheme_name}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Scheme ID:
                                          </span>{" "}
                                          {record.scheme_id}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">
                                        ESR & Flow Information
                                      </h4>
                                      <div className="space-y-1 text-sm">
                                        <p>
                                          <span className="font-medium">
                                            ESR Name:
                                          </span>{" "}
                                          {record.esr_name}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            ESR Capacity:
                                          </span>{" "}
                                          {record.esr_capacity
                                            ? `${record.esr_capacity} LL`
                                            : "N/A"}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Flow Rate:
                                          </span>{" "}
                                          {record.flow_rate_m3
                                            ? `${record.flow_rate_m3} LL`
                                            : "N/A"}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Online Status:
                                          </span>{" "}
                                          {record.online_status || "Offline"}
                                        </p>
                                        <p>
                                          <span className="font-medium">
                                            Time Duration:
                                          </span>{" "}
                                          {record.time_duration || "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <Separator />
                                  <div>
                                    <h4 className="font-semibold mb-2">
                                      7-Day Water Consumption Data
                                    </h4>
                                    <div className="grid grid-cols-7 gap-2">
                                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                        <div
                                          key={day}
                                          className="text-center p-2 border rounded"
                                        >
                                          <div className="text-xs text-gray-500 mb-1">
                                            Day {day}
                                          </div>
                                          <div className="font-medium">
                                            {formatWaterValue(
                                              record[
                                                `water_value_day${day}` as keyof WaterConsumptionRecord
                                              ] as number,
                                            )}{" "}
                                            LL
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {(record[
                                              `water_date_day${day}` as keyof WaterConsumptionRecord
                                            ] as string) || "N/A"}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {record.dashboard_url && (
                                    <div className="text-center">
                                      <Button
                                        asChild
                                        className="bg-blue-500 hover:bg-blue-600"
                                      >
                                        <a
                                          href={record.dashboard_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          View Dashboard
                                        </a>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Enhanced Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center mt-6 space-y-4">
                    <div className="flex justify-center items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((page) => Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>

                      <div className="flex items-center space-x-1">
                        {(() => {
                          const pageButtons = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(
                            1,
                            page - Math.floor(maxVisiblePages / 2),
                          );
                          let endPage = Math.min(
                            totalPages,
                            startPage + maxVisiblePages - 1,
                          );

                          // Adjust start page if we're near the end
                          if (endPage - startPage < maxVisiblePages - 1) {
                            startPage = Math.max(
                              1,
                              endPage - maxVisiblePages + 1,
                            );
                          }

                          // Create number buttons
                          for (let i = startPage; i <= endPage; i++) {
                            pageButtons.push(
                              <Button
                                key={`page-${i}`}
                                variant={page === i ? "default" : "outline"}
                                size="sm"
                                className="w-9 px-0"
                                onClick={() => setPage(i)}
                              >
                                {i}
                              </Button>,
                            );
                          }

                          return pageButtons;
                        })()}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((page) => Math.min(totalPages, page + 1))
                        }
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                      >
                        Last
                      </Button>
                    </div>

                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1} to {endIndex} of {totalItems} ESR
                      locations
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Remark Details Dialog */}
      {selectedRemarkDetails && (
        <Dialog
          open={!!selectedRemarkDetails}
          onOpenChange={(open) => !open && setSelectedRemarkDetails(null)}
        >
          <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 overflow-hidden">
            {(() => {
              const hasAnyActive = selectedRemarkDetails.issues.some((i: any) => i.status !== "Resolved");
              return (
                <>
                  <div className={`bg-gradient-to-r ${hasAnyActive ? "from-red-600 via-rose-600 to-red-700" : "from-green-600 via-emerald-600 to-green-700"} p-6 flex justify-between items-center text-white relative`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10 flex-1 pr-6">
                      <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-3">
                        {hasAnyActive ? (
                          <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-200" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 md:h-8 md:w-8 text-green-200" />
                        )}
                        <span className="tracking-tight">{hasAnyActive ? "Issue Details" : "Resolved Issue Details"}</span>
                      </DialogTitle>
                      <DialogDescription className={`${hasAnyActive ? "text-red-100" : "text-green-100"} mt-2 font-medium flex items-center gap-2`}>
                        <MapPin className="h-4 w-4" />
                        <span>{selectedRemarkDetails.title}</span>
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50">
                    <div className="space-y-4">
                      {selectedRemarkDetails.issues.map(
                        (issue: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"
                          >
                            <div className="flex justify-between items-start mb-3 gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
                                    {issue.problem_level
                                      ? `${issue.problem_level} Level`.toUpperCase()
                                      : issue.category || "General"}
                                  </span>
                                  {issue.status === "Resolved" ? (
                                    <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-green-600" /> Resolved
                                    </span>
                                  ) : (
                                    <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3 text-red-600" /> Active
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <div className="text-sm font-medium text-slate-900">
                                  {issue.creator_name ||
                                    issue.reported_by ||
                                    "Field Engineer"}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                                  {new Date(
                                    issue.created_at || new Date(),
                                  ).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                              <p className="text-sm text-slate-700 font-medium">
                                {issue.reason || issue.issue_description}
                              </p>
                              {issue.remarks && (
                                <p className="text-sm text-slate-600 mt-2 pt-2 border-t border-slate-200">
                                  <span className="font-semibold text-slate-800">Additional Remarks:</span> {issue.remarks}
                                </p>
                              )}
                              {issue.status === "Resolved" && (
                                <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-800">
                                  <p className="font-semibold">Resolution Comments:</p>
                                  <p className="italic">"{issue.resolution_remark || "No resolution remark provided."}"</p>
                                  {issue.resolved_at && (
                                    <p className="text-[10px] text-green-600 mt-1">
                                      Resolved on: {new Date(issue.resolved_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default WaterConsumptionPage;