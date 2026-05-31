import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TranslatedText } from "@/components/ui/translated-text";
import { useAuth } from "@/hooks/use-auth";
import GeographicalFilters from "@/components/dashboard/GeographicalFilters";
import AgencyTypeFilter from "@/components/dashboard/AgencyTypeFilter";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  MapPin,
  X,
  RefreshCw,
  Gauge,
  Download,
  BarChart,
  BarChart3,
  ExternalLink,
  Calendar,
  History,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
  Power,
  Info,
  Droplet,
  Activity,
} from "lucide-react";
import ExcelJS from "exceljs";

// Define types for Pressure Data
interface PressureData {
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  sensor_id?: string;
  pressure_value_1?: number | null;
  pressure_date_day_1?: string | null;
  pressure_value_2?: number | null;
  pressure_date_day_2?: string | null;
  pressure_value_3?: number | null;
  pressure_date_day_3?: string | null;
  pressure_value_4?: number | null;
  pressure_date_day_4?: string | null;
  pressure_value_5?: number | null;
  pressure_date_day_5?: string | null;
  pressure_value_6?: number | null;
  pressure_date_day_6?: string | null;
  pressure_value_7?: number | null;
  pressure_date_day_7?: string | null;
  agency_type?: string;
  // Additional analysis fields
  number_of_consistent_zero_value_in_pressure?: number | null;
  pressure_less_than_02_bar?: number | null;
  pressure_between_02_07_bar?: number | null;
  pressure_greater_than_07_bar?: number | null;
  pressure_less_than_05_bar?: number | null;
  pressure_between_05_10_bar?: number | null;
  pressure_greater_than_10_bar?: number | null;
  // Dashboard URL for PI Vision integration
  dashboard_url?: string;
  water_supply?: string;
  remark?: string;
}

interface RegionData {
  region_id: number;
  region_name: string;
}

interface HistoricalPressureData {
  id: number;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  measurement_date: string;
  pressure_value: number;
  upload_batch_id: string;
  dashboard_url?: string;
  recorded_at: string;
}

interface CommunicationStatus {
  id?: number;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  chlorine_connected: string;
  pressure_connected: string;
  flow_meter_connected: string;
  chlorine_status: string;
  pressure_status: string;
  flow_meter_status: string;
  overall_status: string;
}

interface PressureSensorStatus {
  connected: number;
  online: number;
  offline: number;
  noWater: number;
}

interface ImportStats {
  inserted: number;
  updated: number;
  totalProcessed: number;
  timestamp: string;
  errors: number;
}

interface PressureDashboardStats {
  totalSensors: number;
  belowRangeSensors: number;
  optimalRangeSensors: number;
  aboveRangeSensors: number;
  consistentZeroSensors: number;
  consistentBelowRangeSensors: number;
  consistentOptimalSensors: number;
  consistentAboveRangeSensors: number;
  noWaterSensors: number;
  lastImport?: ImportStats;
}

type PressureRange =
  | "all"
  | "below_0.2"
  | "between_0.2_0.7"
  | "above_0.7"
  | "consistent_zero"
  | "consistent_below"
  | "consistent_optimal"
  | "consistent_above";

type SensorStatusFilter =
  | "all"
  | "connected"
  | "online"
  | "offline"
  | "noWater"
  | "withWater";

const PressureDashboard: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const {
    trackPageVisit,
    trackDataExport,
    trackFilterUsage,
    trackDashboardAccess,
  } = useComprehensiveActivityTracker();

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Pressure Dashboard");
  }, [trackPageVisit]);

  // Parse URL parameters and set initial filters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get("region");
    const rangeParam = urlParams.get("range");

    console.log("Pressure Dashboard: Parsing URL params:", {
      regionParam,
      rangeParam,
    });

    // Set region filter if provided
    if (regionParam && regionParam !== "all") {
      setSelectedRegion(regionParam);
      console.log("Pressure Dashboard: Set region filter to:", regionParam);
    }

    // Set range filter if provided
    if (rangeParam && rangeParam !== "all") {
      setSelectedCardFilter(rangeParam as PressureRange);
      setSelectedWithWaterFilter(rangeParam as PressureRange);
      console.log("Pressure Dashboard: Set range filter to:", rangeParam);
    }
  }, []); // Only run on component mount

  // Fetch active and resolved issues
  const { data: allIssues = [] } = useQuery({
    queryKey: ["/api/issue-reporting/all"],
    queryFn: async () => {
      const response = await fetch("/api/issue-reporting/all");
      if (!response.ok) throw new Error("Failed to fetch all issues");
      const data = await response.json();
      return data;
    },
    // Refresh every minute to keep statuses up to date
    refetchInterval: 60000,
  });

  // Create lookup maps for issues
  const { esrIssuesMap } = useMemo(() => {
    const eMap = new Map<string, any[]>();

    allIssues.forEach((issue: any) => {
      // ESR level issues only
      if (issue.scheme_id && issue.village_name && issue.esr_name && issue.problem_level === "ESR") {
        const key = `${issue.scheme_id}-${issue.village_name}-${issue.esr_name}`;
        if (!eMap.has(key)) {
          eMap.set(key, []);
        }
        eMap.get(key)?.push(issue);
      }
    });

    return { esrIssuesMap: eMap };
  }, [allIssues]);

  // Listen for filter changes from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Pressure Dashboard received region filter:", region);
      setSelectedRegion(region);
    };

    const handleMjpCommissionedFilterChange = (event: CustomEvent) => {
      const { mjpCommissioned } = event.detail;
      console.log(
        "Pressure Dashboard received MJP commissioned filter:",
        mjpCommissioned,
      );
      setUiSchemeFilter(mjpCommissioned ? "commissioned" : "all");
    };

    const handleMjpFullyCompletedFilterChange = (event: CustomEvent) => {
      const { mjpFullyCompleted } = event.detail;
      console.log(
        "Pressure Dashboard received MJP fully completed filter:",
        mjpFullyCompleted,
      );
      setUiSchemeFilter(mjpFullyCompleted ? "fully_completed" : "all");
    };

    const handleStatusFilterChange = (event: CustomEvent) => {
      const { status } = event.detail;
      console.log("Pressure Dashboard received status filter:", status);
      if (status === "fully_completed") {
        setSchemeStatusFilter("Fully Completed");
      } else if (status === "in_progress") {
        setSchemeStatusFilter("In Progress");
      } else if (status === "connected") {
        setSchemeStatusFilter("Connected");
      } else if (status === "not_connected") {
        setSchemeStatusFilter("Not-Connected");
      } else {
        setSchemeStatusFilter("all");
      }
    };

    window.addEventListener(
      "regionFilterChange",
      handleRegionFilterChange as EventListener,
    );
    // Add chatbot event handlers
    const handleChatbotRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Pressure Dashboard received chatbot region filter:", region);
      setSelectedRegion(region);
      // Force refetch to ensure fresh data
      setTimeout(() => {
        refetch();
      }, 100);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Pressure Dashboard received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "pressure") {
        // Wait for data to be filtered properly
        setTimeout(() => {
          if (filteredData && filteredData.length > 0) {
            exportToExcel(
              filteredData,
              `Pressure_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]}`,
            );
          }
        }, 1500);
      }
    };

    window.addEventListener(
      "statusFilterChange",
      handleStatusFilterChange as EventListener,
    );
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
        exportToExcel(
          filteredData,
          `Pressure_Data_${selectedRegion}_${new Date().toISOString().split("T")[0]}`,
        );
        // Small delay to ensure export starts
        setTimeout(resolve, 100);
      });
    };

    return () => {
      window.removeEventListener(
        "regionFilterChange",
        handleRegionFilterChange as EventListener,
      );
      window.removeEventListener(
        "statusFilterChange",
        handleStatusFilterChange as EventListener,
      );
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
  }, []);

  // Global filter state (affects both cards and table data)
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("commissioned");
  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");
  const [schemeStatusFilter, setSchemeStatusFilter] = useState<string>("all");
  const [selectedAgencyType, setSelectedAgencyType] = useState<string>("ALL");

  // Card-specific filter state (only affects table data, not card counts)
  const [selectedCardFilter, setSelectedCardFilter] =
    useState<PressureRange>("all");

  // Separate selection states for with water and without water sections
  const [selectedWithWaterFilter, setSelectedWithWaterFilter] =
    useState<PressureRange>("all");
  const [selectedWithoutWaterFilter, setSelectedWithoutWaterFilter] =
    useState<PressureRange>("all");

  // Sensor status filter state
  const [sensorStatusFilter, setSensorStatusFilter] =
    useState<SensorStatusFilter>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected ESR for detailed view
  const [selectedESR, setSelectedESR] = useState<PressureData | null>(null);

  const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
    title: string;
    issues: any[];
  } | null>(null);

  // Historical data state
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [historicalStartDate, setHistoricalStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date.toISOString().split("T")[0];
  });
  const [historicalEndDate, setHistoricalEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
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

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: [
      "/api/pressure/filters",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedAgencyType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.append("region", selectedRegion);
      if (selectedCircle !== "all") params.append("circle", selectedCircle);
      if (selectedDivision !== "all") params.append("division", selectedDivision);
      if (selectedSubdivision !== "all")
        params.append("subdivision", selectedSubdivision);
      if (selectedAgencyType !== 'ALL') {
        params.append("agencyType", selectedAgencyType);
      }

      const response = await fetch(`/api/pressure/filters?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch filter options");
      return response.json();
    },
  });

  // Fetch all pressure data
  const {
    data: allPressureData = [],
    isLoading: isLoadingPressure,
    error: pressureError,
    refetch,
  } = useQuery<PressureData[]>({
    queryKey: ["/api/pressure", selectedRegion, selectedCircle, selectedDivision, selectedSubdivision, selectedBlock, uiSchemeFilter, waterSupplyStatus, schemeStatusFilter, selectedAgencyType],
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

      if (uiSchemeFilter && uiSchemeFilter !== "all") {
        params.append("uiSchemeFilter", uiSchemeFilter);
      }
      if (waterSupplyStatus && waterSupplyStatus !== "All") {
        params.append("waterSupplyStatus", waterSupplyStatus);
      }

      if (schemeStatusFilter && schemeStatusFilter !== "all") {
        let backendFilter = schemeStatusFilter;
        if (schemeStatusFilter === "Fully Completed") backendFilter = "fully_completed";
        else if (schemeStatusFilter === "In Progress") backendFilter = "in_progress";
        else if (schemeStatusFilter === "Commissioned") backendFilter = "commissioned";
        else if (schemeStatusFilter === "Partially Commissioned") backendFilter = "partially_commissioned";
        else if (schemeStatusFilter === "Connected") backendFilter = "connected";
        else if (schemeStatusFilter === "Not-Connected") backendFilter = "not_connected";

        params.append("filterType", backendFilter);
      }

      if (selectedAgencyType !== 'ALL') {
        params.append("agencyType", selectedAgencyType);
      }

      const queryString = params.toString();
      const url = `/api/pressure${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch pressure data");
      }

      return response.json();
    },
  });

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: isLoadingStats } =
    useQuery<PressureDashboardStats>({
      queryKey: ["/api/pressure/dashboard-stats", selectedRegion, uiSchemeFilter, waterSupplyStatus, schemeStatusFilter, selectedAgencyType],
      queryFn: async () => {
        const params = new URLSearchParams();

        if (selectedRegion && selectedRegion !== "all") {
          params.append("region", selectedRegion);
        }

        // Pass unified filter states to backend
        if (uiSchemeFilter !== "all") {
          params.append("filterType", uiSchemeFilter);
        }
        if (waterSupplyStatus !== "All") {
          params.append("waterSupplyStatus", waterSupplyStatus);
        }

        if (schemeStatusFilter && schemeStatusFilter !== "all") {
          let backendFilter = schemeStatusFilter;
          if (schemeStatusFilter === "Fully Completed") backendFilter = "fully_completed";
          else if (schemeStatusFilter === "In Progress") backendFilter = "in_progress";
          else if (schemeStatusFilter === "Commissioned") backendFilter = "commissioned";
          else if (schemeStatusFilter === "Partially Commissioned") backendFilter = "partially_commissioned";
          else if (schemeStatusFilter === "Connected") backendFilter = "connected";
          else if (schemeStatusFilter === "Not-Connected") backendFilter = "not_connected";

          params.append("schemeStatus", backendFilter);
        }

        if (selectedAgencyType !== 'ALL') {
          params.append("agencyType", selectedAgencyType);
        }

        const queryString = params.toString();
        const url = `/api/pressure/dashboard-stats${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        return response.json();
      },
    });

  // Fetch region data
  const { data: regionsData = [], isLoading: isLoadingRegions } = useQuery<
    RegionData[]
  >({
    queryKey: ["/api/regions"],
  });

  // Fetch communication status data
  const {
    data: communicationStatusData = [],
    isLoading: communicationStatusLoading,
    error: communicationStatusError,
  } = useQuery<CommunicationStatus[]>({
    queryKey: ["/api/communication-status/schemes"],
  });

  // Fetch pressure sensors with no water data
  const { data: noWaterSensorsData } = useQuery<{
    totalNoWaterSensors: number;
    noWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      pressure_connected: string | null;
    }>;
  }>({
    queryKey: ["/api/pressure/no-water-sensors", selectedRegion, uiSchemeFilter, waterSupplyStatus, schemeStatusFilter, selectedAgencyType],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      if (uiSchemeFilter !== "all") {
        params.append("filterType", uiSchemeFilter);
      }
      if (waterSupplyStatus !== "All") {
        params.append("waterSupplyStatus", waterSupplyStatus);
      }

      if (schemeStatusFilter && schemeStatusFilter !== "all") {
        let backendFilter = schemeStatusFilter;
        if (schemeStatusFilter === "Fully Completed") backendFilter = "fully_completed";
        else if (schemeStatusFilter === "In Progress") backendFilter = "in_progress";
        else if (schemeStatusFilter === "Commissioned") backendFilter = "commissioned";
        else if (schemeStatusFilter === "Partially Commissioned") backendFilter = "partially_commissioned";
        else if (schemeStatusFilter === "Connected") backendFilter = "connected";
        else if (schemeStatusFilter === "Not-Connected") backendFilter = "not_connected";

        params.append("schemeStatus", backendFilter);
      }

      if (selectedAgencyType !== 'ALL') {
        params.append("agencyType", selectedAgencyType);
      }

      const queryString = params.toString();
      const url = `/api/pressure/no-water-sensors${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch pressure sensors with no water");
      }

      const result = await response.json();
      return result.data;
    },
  });

  // Fetch pressure sensors with water data
  const { data: withWaterSensorsData } = useQuery<{
    totalWithWaterSensors: number;
    withWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      pressure_connected: string | null;
    }>;
  }>({
    queryKey: ["/api/pressure/with-water-sensors", selectedRegion, uiSchemeFilter, waterSupplyStatus, schemeStatusFilter, selectedAgencyType],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      if (uiSchemeFilter && uiSchemeFilter !== "all") {
        params.append("filterType", uiSchemeFilter);
      }
      if (waterSupplyStatus && waterSupplyStatus !== "All") {
        params.append("waterSupplyStatus", waterSupplyStatus);
      }

      if (schemeStatusFilter && schemeStatusFilter !== "all") {
        let backendFilter = schemeStatusFilter;
        if (schemeStatusFilter === "Fully Completed") backendFilter = "fully_completed";
        else if (schemeStatusFilter === "In Progress") backendFilter = "in_progress";
        else if (schemeStatusFilter === "Commissioned") backendFilter = "commissioned";
        else if (schemeStatusFilter === "Partially Commissioned") backendFilter = "partially_commissioned";
        else if (schemeStatusFilter === "Connected") backendFilter = "connected";
        else if (schemeStatusFilter === "Not-Connected") backendFilter = "not_connected";

        params.append("filterType", backendFilter);
      }

      if (selectedAgencyType !== 'ALL') {
        params.append("agencyType", selectedAgencyType);
      }

      const queryString = params.toString();
      const url = `/api/pressure/with-water-sensors${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch pressure sensors with water");
      }

      const result = await response.json();
      return result.data;
    },
  });

  // Fetch scheme status data for filtering
  const { data: schemeStatusData = [], isLoading: isLoadingSchemeStatus } =
    useQuery<any[]>({
      queryKey: ["/api/schemes", selectedRegion, selectedAgencyType],
      queryFn: async () => {
        const params = new URLSearchParams();

        if (selectedRegion && selectedRegion !== "all") {
          params.append("region", selectedRegion);
        }
        if (selectedAgencyType !== 'ALL') {
          params.append("agencyType", selectedAgencyType);
        }

        const queryString = params.toString();
        const url = `/api/schemes${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch scheme status data");
        }

        return response.json();
      },
    });

  // Fetch historical pressure data when dates change
  const {
    data: historicalPressureData = [],
    isLoading: isLoadingHistorical,
    error: historicalError,
    refetch: refetchHistorical,
  } = useQuery<HistoricalPressureData[]>({
    queryKey: [
      "/api/pressure/historical",
      historicalStartDate,
      historicalEndDate,
      selectedRegion,
      selectedAgencyType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedAgencyType !== 'ALL') {
        params.append("agencyType", selectedAgencyType);
      }

      const queryString = params.toString();
      const url = `/api/pressure/historical?${queryString}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch historical pressure data");
      }

      const result = await response.json();
      return result || [];
    },
    enabled: showHistoricalData, // Only fetch when historical view is enabled
  });

  // Get current pressure value (day 7 only - no fallback to previous days)
  const getCurrentPressureValue = (data: PressureData): number | null => {
    // Only use the current day (day 7) value - if it's null/blank, return null
    const currentValue = data.pressure_value_7;
    if (
      currentValue !== undefined &&
      currentValue !== null &&
      String(currentValue) !== "" &&
      !isNaN(Number(currentValue))
    ) {
      return Number(currentValue);
    }
    return null;
  };

  // Calculate sensor status counts for pressure sensors
  // Temporary placeholder - will be moved after globallyFilteredData is defined

  // Calculate range statistics for sensors WITH water
  const calculateWithWaterRangeStats = useMemo(() => {
    if (!allPressureData || !withWaterSensorsData?.withWaterSensors) {
      return { belowRange: 0, optimal: 0, above: 0, totalCount: 0, noData: 0 };
    }

    // Get sensor IDs that have water
    const withWaterSensorIds = new Set(
      withWaterSensorsData.withWaterSensors.map(
        (sensor: any) =>
          `${sensor.region}|${sensor.circle}|${sensor.division}|${sensor.sub_division}|${sensor.block}|${sensor.village_name}|${sensor.esr_name}`,
      ),
    );

    let belowRange = 0,
      optimal = 0,
      above = 0,
      filteredWithWaterCount = 0;

    allPressureData.forEach((data) => {
      const sensorKey = `${data.region}|${data.circle}|${data.division}|${data.sub_division}|${data.block}|${data.village_name}|${data.esr_name}`;

      // Only count sensors that have water
      if (withWaterSensorIds.has(sensorKey)) {
        filteredWithWaterCount++;
        const currentValue = getCurrentPressureValue(data);
        if (currentValue !== null && !isNaN(currentValue)) {
          if (currentValue < 0.2) {
            belowRange++;
          } else if (currentValue >= 0.2 && currentValue <= 0.7) {
            optimal++;
          } else {
            above++;
          }
        }
        // Null/blank values are NOT counted in any range category
      }
    });

    const totalCount = filteredWithWaterCount;
    const sumRanges = belowRange + optimal + above;
    const noData = Math.max(totalCount - sumRanges, 0);

    console.log("With water range calculations:", {
      belowRange,
      optimal,
      above,
      totalCount,
      sumRanges,
      noData,
    });
    return { belowRange, optimal, above, totalCount, noData };
  }, [allPressureData, withWaterSensorsData]);

  // Calculate range statistics for sensors WITHOUT water
  const calculateWithoutWaterRangeStats = useMemo(() => {
    if (!allPressureData || !noWaterSensorsData?.noWaterSensors) {
      return { belowRange: 0, optimal: 0, above: 0, totalCount: 0, noData: 0 };
    }

    // Get sensor IDs that have no water
    const noWaterSensorIds = new Set(
      noWaterSensorsData.noWaterSensors.map(
        (sensor: any) =>
          `${sensor.region}|${sensor.circle}|${sensor.division}|${sensor.sub_division}|${sensor.block}|${sensor.village_name}|${sensor.esr_name}`,
      ),
    );

    let belowRange = 0,
      optimal = 0,
      above = 0;

    allPressureData.forEach((data) => {
      const sensorKey = `${data.region}|${data.circle}|${data.division}|${data.sub_division}|${data.block}|${data.village_name}|${data.esr_name}`;

      // Only count sensors that have no water
      if (noWaterSensorIds.has(sensorKey)) {
        const currentValue = getCurrentPressureValue(data);
        if (currentValue !== null && !isNaN(currentValue)) {
          if (currentValue < 0.2) {
            belowRange++;
          } else if (currentValue >= 0.2 && currentValue <= 0.7) {
            optimal++;
          } else {
            above++;
          }
        }
        // Null/blank values are NOT counted in any range category
      }
    });

    const totalCount = noWaterSensorIds.size;
    const sumRanges = belowRange + optimal + above;
    const noData = Math.max(totalCount - sumRanges, 0);

    console.log("Without water range calculations:", {
      belowRange,
      optimal,
      above,
      totalCount,
      sumRanges,
      noData,
    });
    return { belowRange, optimal, above, totalCount, noData };
  }, [allPressureData, noWaterSensorsData]);

  // Get the CSS class and status text based on pressure value
  const getPressureStatusInfo = (value: number | null) => {
    if (value === null)
      return { className: "bg-gray-100", statusText: "No Data" };

    if (value < 0.2)
      return {
        className: "bg-red-50 border-red-200",
        statusText: "Below Range",
        textColor: "text-red-800",
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      };

    if (value >= 0.2 && value <= 0.7)
      return {
        className: "bg-green-50 border-green-200",
        statusText: "Optimal",
        textColor: "text-green-800",
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      };

    return {
      className: "bg-orange-50 border-orange-200",
      statusText: "Above Range",
      textColor: "text-orange-800",
      icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
    };
  };

  // Handler for Universal Filter changes
  const handleUniversalFilterChange = (value: string) => {
    setUiSchemeFilter(value);
    setPage(1);

    // Clear water supply status if not in commissioned mode
    if (value !== "commissioned") {
      setWaterSupplyStatus("All");
    }
  };

  // Handler for Water Supply status changes
  const handleWaterSupplyStatusChange = (value: string) => {
    setWaterSupplyStatus(value);
    setPage(1);
  };

  // Handler for scheme status filter changes
  const handleSchemeStatusFilterChange = (value: string) => {
    setSchemeStatusFilter(value);

    // Track filter usage
    if (value !== "all") {
      trackFilterUsage("schemeStatus", value, undefined, "pressure_dashboard");
    }

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Handler for sensor status card clicks
  const handleSensorStatusClick = (status: SensorStatusFilter) => {
    if (sensorStatusFilter === status) {
      // If same filter is clicked, clear the filter
      setSensorStatusFilter("all");
    } else {
      // Apply the new filter
      setSensorStatusFilter(status);
    }

    // Track filter usage
    trackFilterUsage("sensor_status", status, undefined, "pressure_dashboard");

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Pressure Dashboard");
  }, [trackPageVisit]);

  // Shared map of scheme IDs to their status data for efficient filtering
  const schemeStatusMap = useMemo(() => {
    const map = new Map();
    if (schemeStatusData && schemeStatusData.length > 0) {
      schemeStatusData.forEach((status) => {
        map.set(status.scheme_id, status);
      });
    }
    return map;
  }, [schemeStatusData]);

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

  // Calculate local dashboard stats based on filtered data
  const calculateLocalDashboardStats = (
    data: PressureData[],
  ): PressureDashboardStats => {
    const stats: PressureDashboardStats = {
      totalSensors: data.length,
      belowRangeSensors: 0,
      optimalRangeSensors: 0,
      aboveRangeSensors: 0,
      consistentZeroSensors: 0,
      consistentBelowRangeSensors: 0,
      consistentOptimalSensors: 0,
      consistentAboveRangeSensors: 0,
      noWaterSensors: 0,
    };

    // Count by category
    data.forEach((item) => {
      const latestValue = getCurrentPressureValue(item);

      // Include both null/blank values and 0.00 values as "below range"
      if (latestValue === null || (latestValue < 0.2 && latestValue >= 0)) {
        stats.belowRangeSensors++;
      } else if (latestValue >= 0.2 && latestValue <= 0.7) {
        stats.optimalRangeSensors++;
      } else if (latestValue > 0.7) {
        stats.aboveRangeSensors++;
      }

      // Count consistent readings
      if ((item.number_of_consistent_zero_value_in_pressure || 0) === 7) {
        stats.consistentZeroSensors++;
      }

      const values = [
        parseFloat(String(item.pressure_value_1 || 0)),
        parseFloat(String(item.pressure_value_2 || 0)),
        parseFloat(String(item.pressure_value_3 || 0)),
        parseFloat(String(item.pressure_value_4 || 0)),
        parseFloat(String(item.pressure_value_5 || 0)),
        parseFloat(String(item.pressure_value_6 || 0)),
        parseFloat(String(item.pressure_value_7 || 0)),
      ];

      if (values.every((val) => val > 0 && val < 0.2)) {
        stats.consistentBelowRangeSensors++;
      } else if (values.every((val) => val >= 0.2 && val <= 0.7)) {
        stats.consistentOptimalSensors++;
      } else if (values.every((val) => val > 0.7)) {
        stats.consistentAboveRangeSensors++;
      }
    });

    // Preserve import statistics if available
    if (dashboardStats?.lastImport) {
      stats.lastImport = dashboardStats.lastImport;
    }

    return stats;
  };

  // Apply global filters to data for both cards and table
  const globallyFilteredData = useMemo(() => {
    let filtered = [...allPressureData];

    // Apply search filter if query exists
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.scheme_name?.toLowerCase().includes(query) ||
          item.region?.toLowerCase().includes(query) ||
          item.village_name?.toLowerCase().includes(query) ||
          item.esr_name?.toLowerCase().includes(query),
      );
    }

    // Double-check region filtering to ensure only data from selected region is shown
    if (selectedRegion && selectedRegion !== "all") {
      filtered = filtered.filter((item) => item.region === selectedRegion);
    }

    // Apply sensor status filter
    if (sensorStatusFilter !== "all") {
      // Create a map of ESR location keys to their communication status
      const commStatusMap = new Map<string, CommunicationStatus>();
      communicationStatusData?.forEach((status) => {
        const key = `${status.region}|${status.circle}|${status.division}|${status.sub_division}|${status.block}|${status.village_name}|${status.esr_name}`;
        commStatusMap.set(key, status);
      });

      filtered = filtered.filter((item) => {
        const key = `${item.region}|${item.circle}|${item.division}|${item.sub_division}|${item.block}|${item.village_name}|${item.esr_name}`;
        const commStatus = commStatusMap.get(key);

        if (!commStatus) return false;

        switch (sensorStatusFilter) {
          case "connected":
            return commStatus.pressure_connected === "Connected";
          case "online":
            return (
              commStatus.pressure_connected === "Connected" &&
              commStatus.pressure_status === "Online"
            );
          case "offline":
            return (
              commStatus.pressure_connected === "Connected" &&
              commStatus.pressure_status === "Offline"
            );
          case "noWater":
            // Check if this ESR is in the no-water sensors list
            if (noWaterSensorsData?.noWaterSensors) {
              return noWaterSensorsData.noWaterSensors.some(
                (sensor) =>
                  sensor.region === item.region &&
                  sensor.circle === item.circle &&
                  sensor.division === item.division &&
                  sensor.sub_division === item.sub_division &&
                  sensor.block === item.block &&
                  sensor.scheme_id === item.scheme_id &&
                  sensor.village_name === item.village_name &&
                  sensor.esr_name === item.esr_name,
              );
            }
            return false;
          case "withWater":
            // Check if this ESR is in the with-water sensors list
            if (withWaterSensorsData?.withWaterSensors) {
              return withWaterSensorsData.withWaterSensors.some(
                (sensor) =>
                  sensor.region === item.region &&
                  sensor.circle === item.circle &&
                  sensor.division === item.division &&
                  sensor.sub_division === item.sub_division &&
                  sensor.block === item.block &&
                  sensor.scheme_id === item.scheme_id &&
                  sensor.village_name === item.village_name &&
                  sensor.esr_name === item.esr_name,
              );
            }
            return false;
          default:
            return true;
        }
      });
    }

    // Use the shared schemeStatusMap for filtering logic
    if (uiSchemeFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        const status = schemeStatusMap.get(scheme.scheme_id);
        if (!status) return true;

        if (uiSchemeFilter === "commissioned") {
          // 100% Civil work Completed means water_supply = Yes
          const isCivilCompleted = status.water_supply === "Yes";
          if (!isCivilCompleted) return false;

          // If civil completed, check specific water supply status tabs
          if (waterSupplyStatus === "All") return true;
          return status.water_supply_status === waterSupplyStatus;
        }

        if (uiSchemeFilter === "fully_completed") {
          // Fully Instrumented Schemes: fully_completion_scheme_status = Fully Completed or Completed
          const statusValue = String(status.fully_completion_scheme_status || "");
          return statusValue === "Fully Completed" || statusValue === "Completed";
        }

        if (uiSchemeFilter === "in_progress") {
          // Partially instrumented: fully_completion_scheme_status = In Progress
          return status.fully_completion_scheme_status === "In Progress";
        }

        if (uiSchemeFilter === "common_filter") {
          // Common filter: fully_completion_scheme_status = Fully Completed or Completed AND water_supply = Yes
          const statusValue = String(status.fully_completion_scheme_status || "");
          const isInstrumented = statusValue === "Fully Completed" || statusValue === "Completed";
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

    // Apply scheme status filter
    if (schemeStatusFilter !== "all") {
      filtered = filtered.filter((item) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(item.scheme_id);
        if (!status) return false;

        if (schemeStatusFilter === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    return filtered;
  }, [
    allPressureData,
    selectedRegion,
    searchQuery,
    sensorStatusFilter,
    communicationStatusData,
    schemeStatusMap,
    uiSchemeFilter,
    waterSupplyStatus,
    schemeStatusFilter,
  ]);

  // Calculate data for summary cards (excludes sensor status and range filters)
  const summaryStatsData = useMemo(() => {
    let filtered = [...allPressureData];

    // Apply search filter if query exists
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.scheme_name?.toLowerCase().includes(query) ||
          item.region?.toLowerCase().includes(query) ||
          item.village_name?.toLowerCase().includes(query) ||
          item.esr_name?.toLowerCase().includes(query),
      );
    }

    // Double-check region filtering to ensure only data from selected region is shown
    if (selectedRegion && selectedRegion !== "all") {
      filtered = filtered.filter((item) => item.region === selectedRegion);
    }

    // Apply Universal Filter logic to summary stats
    if (uiSchemeFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        const status = schemeStatusMap.get(scheme.scheme_id);
        if (!status) return true;

        if (uiSchemeFilter === "commissioned") {
          const isCivilCompleted = status.water_supply === "Yes";
          if (!isCivilCompleted) return false;
          if (waterSupplyStatus === "All") return true;
          return status.water_supply_status === waterSupplyStatus;
        }

        if (uiSchemeFilter === "fully_completed") {
          const statusValue = String(status.fully_completion_scheme_status || "");
          return statusValue === "Fully Completed" || statusValue === "Completed";
        }

        if (uiSchemeFilter === "in_progress") {
          return status.fully_completion_scheme_status === "In Progress";
        }

        if (uiSchemeFilter === "common_filter") {
          const statusValue = String(status.fully_completion_scheme_status || "");
          const isInstrumented = statusValue === "Fully Completed" || statusValue === "Completed";
          const isCivilCompleted = status.water_supply === "Yes";
          return isInstrumented && isCivilCompleted;
        }

        if (uiSchemeFilter === "mjp_commissioned_yes") {
          return status.mjp_commissioned === "Yes";
        }

        return true;
      });
    }

    // Apply scheme status filter
    if (schemeStatusFilter !== "all") {
      filtered = filtered.filter((item) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(item.scheme_id);
        if (!status) return false;

        if (schemeStatusFilter === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    // NOTE: Do NOT apply sensor status filter here - this data is for summary cards only

    return filtered;
  }, [
    allPressureData,
    selectedRegion,
    searchQuery,
    uiSchemeFilter,
    waterSupplyStatus,
    schemeStatusFilter,
    schemeStatusMap,
  ]);

  // Calculate sensor status counts for pressure sensors using summary stats data (excludes range/sensor filters)
  const calculatePressureSensorStatus = useMemo((): PressureSensorStatus => {
    const status = { connected: 0, online: 0, offline: 0, noWater: 0 };

    if (!summaryStatsData || !communicationStatusData) {
      return status;
    }

    // Create a map of the full hierarchy from summary filtered pressure data for exact matching
    const pressureLocationKeys = new Set(
      summaryStatsData.map(
        (item) =>
          `${item.region}|${item.circle}|${item.division}|${item.sub_division}|${item.block}|${item.village_name}|${item.esr_name}`,
      ),
    );

    // Filter communication status for regions if selected
    const filteredCommStatus =
      selectedRegion === "all"
        ? communicationStatusData
        : communicationStatusData.filter(
          (comm) => comm.region === selectedRegion,
        );

    // Use Sets to track unique ESR names to avoid double counting
    const uniqueConnectedESRs = new Set<string>();
    const uniqueOnlineESRs = new Set<string>();
    const uniqueOfflineESRs = new Set<string>();

    filteredCommStatus.forEach((commStatus) => {
      // Create the location key for this communication status record
      const commLocationKey = `${commStatus.region}|${commStatus.circle}|${commStatus.division}|${commStatus.sub_division}|${commStatus.block}|${commStatus.village_name}|${commStatus.esr_name}`;

      // Only count if this exact location hierarchy has pressure data
      if (pressureLocationKeys.has(commLocationKey)) {
        // Count connected sensors (match exact database values)
        if (commStatus.pressure_connected === "Connected") {
          uniqueConnectedESRs.add(commLocationKey);

          // Count online/offline status for connected sensors (match exact database values)
          if (commStatus.pressure_status === "Online") {
            uniqueOnlineESRs.add(commLocationKey);
          } else if (commStatus.pressure_status === "Offline") {
            uniqueOfflineESRs.add(commLocationKey);
          }
        }
      }
    });

    status.connected = uniqueConnectedESRs.size;
    status.online = uniqueOnlineESRs.size;
    status.offline = uniqueOfflineESRs.size;

    // Calculate no water sensors count from the filtered data
    // Count sensors from filtered data that appear in the no water sensors list
    if (noWaterSensorsData?.noWaterSensors) {
      const noWaterLocationKeys = new Set(
        noWaterSensorsData.noWaterSensors.map(
          (sensor: any) =>
            `${sensor.region}|${sensor.circle}|${sensor.division}|${sensor.sub_division}|${sensor.block}|${sensor.village_name}|${sensor.esr_name}`,
        ),
      );

      // Count how many of our summary filtered pressure sensors have no water
      status.noWater = summaryStatsData.filter((item) => {
        const locationKey = `${item.region}|${item.circle}|${item.division}|${item.sub_division}|${item.block}|${item.village_name}|${item.esr_name}`;
        return noWaterLocationKeys.has(locationKey);
      }).length;
    }

    return status;
  }, [
    summaryStatsData,
    communicationStatusData,
    selectedRegion,
    noWaterSensorsData,
  ]);

  // Calculate card statistics based on the globally filtered data
  const cardStats = useMemo(() => {
    return calculateLocalDashboardStats(globallyFilteredData);
  }, [globallyFilteredData]);

  // Apply card selection filter for table display only
  const filteredData = useMemo(() => {
    let filtered = [...globallyFilteredData];
    if (selectedCardFilter !== "all") {
      switch (selectedCardFilter) {
        case "below_0.2":
          filtered = filtered.filter((item) => {
            const latestValue = getCurrentPressureValue(item);
            // Only include sensors with valid values < 0.2 (matching card calculation)
            return (
              latestValue !== null && !isNaN(latestValue) && latestValue < 0.2
            );
          });
          break;
        case "between_0.2_0.7":
          filtered = filtered.filter((item) => {
            const latestValue = getCurrentPressureValue(item);
            return (
              latestValue !== null &&
              !isNaN(latestValue) &&
              latestValue >= 0.2 &&
              latestValue <= 0.7
            );
          });
          break;
        case "above_0.7":
          filtered = filtered.filter((item) => {
            const latestValue = getCurrentPressureValue(item);
            return (
              latestValue !== null && !isNaN(latestValue) && latestValue > 0.7
            );
          });
          break;
        case "consistent_zero":
          filtered = filtered.filter((item) => {
            return (
              (item.number_of_consistent_zero_value_in_pressure || 0) === 7
            );
          });
          break;
        case "consistent_below":
          // ESRs with consistent below range pressure (<0.2 bar) for 7 days
          filtered = filtered.filter((item) => {
            const values = [
              parseFloat(String(item.pressure_value_1 || 0)),
              parseFloat(String(item.pressure_value_2 || 0)),
              parseFloat(String(item.pressure_value_3 || 0)),
              parseFloat(String(item.pressure_value_4 || 0)),
              parseFloat(String(item.pressure_value_5 || 0)),
              parseFloat(String(item.pressure_value_6 || 0)),
              parseFloat(String(item.pressure_value_7 || 0)),
            ];
            return values.every((val) => val > 0 && val < 0.2);
          });
          break;
        case "consistent_optimal":
          // ESRs with consistent optimal range pressure (0.2-0.7 bar) for 7 days
          filtered = filtered.filter((item) => {
            const values = [
              parseFloat(String(item.pressure_value_1 || 0)),
              parseFloat(String(item.pressure_value_2 || 0)),
              parseFloat(String(item.pressure_value_3 || 0)),
              parseFloat(String(item.pressure_value_4 || 0)),
              parseFloat(String(item.pressure_value_5 || 0)),
              parseFloat(String(item.pressure_value_6 || 0)),
              parseFloat(String(item.pressure_value_7 || 0)),
            ];
            return values.every((val) => val >= 0.2 && val <= 0.7);
          });
          break;
        case "consistent_above":
          // ESRs with consistent above range pressure (>0.7 bar) for 7 days
          filtered = filtered.filter((item) => {
            const values = [
              parseFloat(String(item.pressure_value_1 || 0)),
              parseFloat(String(item.pressure_value_2 || 0)),
              parseFloat(String(item.pressure_value_3 || 0)),
              parseFloat(String(item.pressure_value_4 || 0)),
              parseFloat(String(item.pressure_value_5 || 0)),
              parseFloat(String(item.pressure_value_6 || 0)),
              parseFloat(String(item.pressure_value_7 || 0)),
            ];
            return values.every((val) => val > 0.7);
          });
          break;
      }
    }

    // Apply sensor status filter for table only
    if (sensorStatusFilter && sensorStatusFilter !== "all") {
      filtered = filtered.filter((item) => {
        const commStatus = communicationStatusData.find(
          (comm) =>
            comm.region === item.region &&
            comm.circle === item.circle &&
            comm.division === item.division &&
            comm.sub_division === item.sub_division &&
            comm.block === item.block &&
            comm.village_name === item.village_name &&
            comm.esr_name === item.esr_name,
        );

        if (!commStatus) return false;

        if (sensorStatusFilter === "connected") {
          return commStatus.pressure_connected === "Connected";
        } else if (sensorStatusFilter === "online") {
          return (
            commStatus.pressure_connected === "Connected" &&
            commStatus.pressure_status === "Online"
          );
        } else if (sensorStatusFilter === "offline") {
          return (
            commStatus.pressure_connected === "Connected" &&
            commStatus.pressure_status === "Offline"
          );
        } else if (sensorStatusFilter === "noWater") {
          // Check if this ESR is in the no-water sensors list
          if (noWaterSensorsData?.noWaterSensors) {
            return noWaterSensorsData.noWaterSensors.some(
              (sensor) =>
                sensor.region === item.region &&
                sensor.circle === item.circle &&
                sensor.division === item.division &&
                sensor.sub_division === item.sub_division &&
                sensor.block === item.block &&
                sensor.scheme_id === item.scheme_id &&
                sensor.village_name === item.village_name &&
                sensor.esr_name === item.esr_name,
            );
          }
          return false;
        } else if (sensorStatusFilter === "withWater") {
          // Check if this ESR is in the with-water sensors list
          if (withWaterSensorsData?.withWaterSensors) {
            return withWaterSensorsData.withWaterSensors.some(
              (sensor) =>
                sensor.region === item.region &&
                sensor.circle === item.circle &&
                sensor.division === item.division &&
                sensor.sub_division === item.sub_division &&
                sensor.block === item.block &&
                sensor.scheme_id === item.scheme_id &&
                sensor.village_name === item.village_name &&
                sensor.esr_name === item.esr_name,
            );
          }
          return false;
        }

        return false;
      });
    }

    return filtered;
  }, [
    allPressureData,
    searchQuery,
    selectedRegion,
    uiSchemeFilter,
    waterSupplyStatus,
    schemeStatusFilter,
    schemeStatusData,
    selectedCardFilter,
    sensorStatusFilter,
    communicationStatusData,
    noWaterSensorsData, // Add this dependency for noWater filtering
    withWaterSensorsData, // Add this dependency for withWater filtering
  ]);

  // Listen for filter changes from chatbot and set up export functionality
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Pressure Dashboard received region filter:", region);
      setSelectedRegion(region);
    };

    const handleChatbotRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Pressure Dashboard received chatbot region filter:", region);
      setSelectedRegion(region);
      // Force refetch to ensure fresh data
      setTimeout(() => {
        refetch();
      }, 100);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Pressure Dashboard received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "pressure") {
        // Wait for data to be filtered properly
        setTimeout(() => {
          if (filteredData && filteredData.length > 0) {
            exportToExcel(
              filteredData,
              `Pressure_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]}`,
            );
            console.log(
              "Excel export triggered for Pressure data with",
              filteredData.length,
              "total records",
            );
          } else {
            console.log("No Pressure data available for export");
          }
        }, 1500);
      }
    };

    window.addEventListener(
      "regionFilterChange",
      handleRegionFilterChange as EventListener,
    );
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
        exportToExcel(
          filteredData,
          `Pressure_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]}`,
        );
        // Small delay to ensure export starts
        setTimeout(resolve, 100);
      });
    };

    return () => {
      window.removeEventListener(
        "regionFilterChange",
        handleRegionFilterChange as EventListener,
      );
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
  }, [filteredData, selectedRegion, selectedCardFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, page, itemsPerPage]);

  // Update card values to use the globally filtered data (before card-specific filtering)
  const updatedCardStats = useMemo(() => {
    if (!dashboardStats) return null;

    // Start with a copy of the API stats
    const stats = { ...dashboardStats };

    // Count values by category from the globally filtered data (respects all global filters)
    let totalSensors = 0;
    let belowRangeSensors = 0;
    let optimalRangeSensors = 0;
    let aboveRangeSensors = 0;
    let consistentZeroSensors = 0;
    let consistentBelowRangeSensors = 0;
    let consistentOptimalSensors = 0;
    let consistentAboveRangeSensors = 0;

    globallyFilteredData.forEach((item) => {
      totalSensors++;

      const latestValue = getCurrentPressureValue(item);

      // Treat null/blank current values as "below range"
      if (latestValue === null) {
        belowRangeSensors++;
      } else if (latestValue < 0.2 && latestValue >= 0) {
        belowRangeSensors++;
      } else if (latestValue >= 0.2 && latestValue <= 0.7) {
        optimalRangeSensors++;
      } else if (latestValue > 0.7) {
        aboveRangeSensors++;
      }

      // Count consistent readings
      if ((item.number_of_consistent_zero_value_in_pressure || 0) === 7) {
        consistentZeroSensors++;
      }

      const values = [
        parseFloat(String(item.pressure_value_1 || 0)),
        parseFloat(String(item.pressure_value_2 || 0)),
        parseFloat(String(item.pressure_value_3 || 0)),
        parseFloat(String(item.pressure_value_4 || 0)),
        parseFloat(String(item.pressure_value_5 || 0)),
        parseFloat(String(item.pressure_value_6 || 0)),
        parseFloat(String(item.pressure_value_7 || 0)),
      ];

      if (values.every((val) => val > 0 && val < 0.2)) {
        consistentBelowRangeSensors++;
      } else if (values.every((val) => val >= 0.2 && val <= 0.7)) {
        consistentOptimalSensors++;
      } else if (values.every((val) => val > 0.7)) {
        consistentAboveRangeSensors++;
      }
    });

    return {
      ...stats,
      totalSensors,
      belowRangeSensors,
      optimalRangeSensors,
      aboveRangeSensors,
      consistentZeroSensors,
      consistentBelowRangeSensors,
      consistentOptimalSensors,
      consistentAboveRangeSensors,
    };
  }, [dashboardStats, globallyFilteredData]);

  // Get status filter title
  const getFilterTitle = (filter: PressureRange) => {
    switch (filter) {
      case "below_0.2":
        return "Below Range (<0.2 bar)";
      case "between_0.2_0.7":
        return "Optimal Range (0.2-0.7 bar)";
      case "above_0.7":
        return "Above Range (>0.7 bar)";
      case "consistent_zero":
        return "Consistent Zero Pressure (7 days)";
      case "consistent_below":
        return "Consistent Below Range (7 days)";
      case "consistent_optimal":
        return "Consistent Optimal Range (7 days)";
      case "consistent_above":
        return "Consistent Above Range (7 days)";
      default:
        return "All ESRs";
    }
  };

  // Handler for dashboard card clicks
  const handleCardClick = (range: PressureRange) => {
    // Only update the selected card filter - this affects the table display
    // but not the card values which come from dashboardStats
    setSelectedCardFilter(range);
    setPage(1); // Reset to first page when filter changes
  };

  // Handler for "with water" section card clicks
  const handleWithWaterCardClick = (range: PressureRange) => {
    if (selectedWithWaterFilter === range) {
      // If same filter is clicked, clear the filter
      setSelectedWithWaterFilter("all");
      setSelectedCardFilter("all");
      setSensorStatusFilter("all");
    } else {
      // Apply the new filter
      setSelectedWithWaterFilter(range);
      setSelectedWithoutWaterFilter("all"); // Clear selection in other section
      setSelectedCardFilter(range); // Also set the main filter for table filtering

      // Set sensor status filter to withWater to show only sensors with water in table
      setSensorStatusFilter("withWater");
    }

    setPage(1); // Reset to first page when filter changes
  };

  // Handler for "without water" section card clicks
  const handleWithoutWaterCardClick = (range: PressureRange) => {
    if (selectedWithoutWaterFilter === range) {
      // If same filter is clicked, clear the filter
      setSelectedWithoutWaterFilter("all");
      setSelectedCardFilter("all");
      setSensorStatusFilter("all");
    } else {
      // Apply the new filter
      setSelectedWithoutWaterFilter(range);
      setSelectedWithWaterFilter("all"); // Clear selection in other section
      setSelectedCardFilter(range); // Also set the main filter for table filtering

      // Set sensor status filter to noWater to show only sensors without water in table
      setSensorStatusFilter("noWater");
    }

    setPage(1); // Reset to first page when filter changes
  };

  // Handler for total cards (with water and without water totals)
  const handleTotalCardClick = (waterStatus: "withWater" | "noWater") => {
    if (
      sensorStatusFilter === waterStatus &&
      selectedWithWaterFilter === "all" &&
      selectedWithoutWaterFilter === "all"
    ) {
      // If same filter is clicked and no range selected, clear the filter
      setSensorStatusFilter("all");
      setSelectedCardFilter("all");
    } else {
      // Apply the new filter
      // Clear range selections in both sections
      setSelectedWithWaterFilter("all");
      setSelectedWithoutWaterFilter("all");
      setSelectedCardFilter("all");

      // Set sensor status filter to show only the selected water status
      setSensorStatusFilter(waterStatus);
    }

    setPage(1); // Reset to first page when filter changes
  };

  // Function to export data to Excel - optimized for performance
  const exportToExcel = async (data: PressureData[], filename: string) => {
    try {
      toast({
        title: "Preparing Export",
        description: `Processing ${data.length} pressure monitoring records...`,
      });

      // Process in web worker-like approach to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 100));

      const formatDateForHeader = (dateStr: string | null | undefined) => {
        if (!dateStr) return "N/A";

        // If it's already a short date format like "15-Feb" or "15/02" without a year
        if (/^\d{1,2}[-/][a-zA-Z]{3}$/.test(dateStr)) {
          // Append the current year to ensure accuracy instead of JS defaulting to 2001
          const currentYear = new Date().getFullYear();
          return `${dateStr}-${currentYear}`;
        }

        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return dateStr;

          if (date.getFullYear() === 2001 && !dateStr.includes("2001")) {
            const currentYear = new Date().getFullYear();
            return `${dateStr}-${currentYear}`;
          }

          return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {
          return dateStr || "N/A";
        }
      };

      // Pre-build scheme status map for faster lookups
      const schemeStatusMap = new Map();
      if (schemeStatusData && schemeStatusData.length > 0) {
        schemeStatusData.forEach((status) => {
          schemeStatusMap.set(status.scheme_id, status);
        });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Pressure Data");

      // Get first item to extract date headers
      const firstItem = data[0];
      const dateHeaders: string[] = [];

      if (firstItem) {
        for (let day = 1; day <= 7; day++) {
          const dateKey = `pressure_date_day_${day}` as keyof PressureData;
          const dateValue = firstItem[dateKey];
          dateHeaders.push(formatDateForHeader(dateValue as string));
        }
      }

      // Define headers with actual dates
      const headers = [
        "Region",
        "Circle",
        "Division",
        "Sub Division",
        "Block",
        "Scheme ID",
        "Scheme Name",
        "Agency Type",
        "Village Name",
        "ESR Name",
        "Water Supply",
        ...dateHeaders.map((date, idx) => `Pressure ${date}`),
        "Latest Pressure Value (bar)",
        "Status",
        "Dashboard Link",
      ];

      // Add header row
      worksheet.addRow(headers);

      // Batch process data for better performance
      const batchSize = 500;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const rows = batch.map((item) => {
          const latestPressure = getCurrentPressureValue(item);
          const { statusText } = getPressureStatusInfo(latestPressure);

          // Get all 7 days of pressure values
          const pressureValues: (string | number)[] = [];
          for (let day = 1; day <= 7; day++) {
            const valueKey = `pressure_value_${day}` as keyof PressureData;
            const value = item[valueKey];
            pressureValues.push(
              value !== null && value !== undefined && !isNaN(Number(value))
                ? Number(value).toFixed(2)
                : "",
            );
          }

          return [
            item.region || "N/A",
            item.circle || "N/A",
            item.division || "N/A",
            item.sub_division || "N/A",
            item.block || "N/A",
            item.scheme_id,
            item.scheme_name || "N/A",
            item.agency_type || "N/A",
            item.village_name || "N/A",
            item.esr_name || "N/A",
            (schemeStatusMap.get(item.scheme_id)?.water_supply) || "No",
            ...pressureValues,
            latestPressure !== null ? latestPressure.toFixed(2) : "No data",
            statusText,
            item.dashboard_url || "N/A",
          ];
        });

        worksheet.addRows(rows);

        // Yield control to prevent UI blocking
        if (i + batchSize < data.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Apply styles efficiently
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell: any) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "0066CC" },
        };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { horizontal: "center" };
      });

      // Auto-fit columns efficiently
      worksheet.columns.forEach((column: any) => {
        if (column.header) {
          column.width = Math.max(12, Math.min(35, column.header.length + 5));
        }
      });

      toast({
        title: "Generating File",
        description: "Creating Excel file...",
      });

      // Write and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      // Ensure proper .xlsx extension
      link.download = filename.endsWith(".xlsx")
        ? filename
        : `${filename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `${data.length} pressure records exported successfully!`,
      });

      // Track export event
      trackDataExport("pressure_monitoring", filename, data.length, {
        region: selectedRegion,
        agencyType: selectedAgencyType,
        cardFilter: selectedCardFilter
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

  // Function to export historical pressure data to Excel
  const exportHistoricalData = async () => {
    try {
      // Build query parameters for the API request
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const url = `/api/pressure/export/historical?${params.toString()}`;

      // Trigger the download
      const link = document.createElement("a");
      link.href = url;
      link.download = `Pressure_Historical_Data_${historicalStartDate}_to_${historicalEndDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Started",
        description: "Historical pressure data export is being prepared...",
      });
    } catch (error) {
      console.error("Error exporting historical data:", error);
      toast({
        title: "Export Failed",
        description:
          "There was an error exporting historical data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state for dashboard
  if (isLoadingPressure || isLoadingStats || isLoadingRegions) {
    return (
      <div className="container mx-auto p-4">
        {/* <h1 className="text-2xl font-bold mb-6">Pressure Monitoring Dashboard</h1> */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (pressureError) {
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">
            Failed to load pressure data. Please try again later.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header with Date */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          <TranslatedText>Pressure Dashboard</TranslatedText>
        </h1>
        <p className="text-gray-500 mt-1">
          <TranslatedText>
            Monitor water pressure levels across water schemes and ESRs
          </TranslatedText>
        </p>
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
      </div>

      <div className="bg-white rounded-xl shadow-sm mb-6 border border-slate-200 overflow-hidden">
        {/* Geographical Filters */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
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
        </div>

        {/* Agency Type + Water Supply Status on one line */}
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-x-6 gap-y-3 items-end">
          <div>
            <AgencyTypeFilter
              selectedAgencyType={selectedAgencyType}
              onAgencyTypeChange={(value) => {
                setSelectedAgencyType(value);
                setPage(1);
                trackFilterUsage("agency_type_filter", value, undefined, "pressure_dashboard");
              }}
            />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Water Supply Status</p>
            <Tabs value={waterSupplyStatus} onValueChange={(v) => handleWaterSupplyStatusChange(v)}>
              <TabsList className="h-8 p-0.5 bg-white border border-blue-200 gap-0.5">
                <TabsTrigger value="All" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">All</TabsTrigger>
                <TabsTrigger value="Full" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Fully Operational</TabsTrigger>
                <TabsTrigger value="Partial" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white">Partially Operational</TabsTrigger>
                <TabsTrigger value="No" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-red-500 data-[state=active]:text-white">Not Operational</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* IoT Status + Search + Actions Row */}
        <div className="px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">IoT Status</label>
              <Select value={schemeStatusFilter} onValueChange={handleSchemeStatusFilterChange}>
                <SelectTrigger className="w-full bg-white border-slate-200">
                  <SelectValue placeholder="IoT Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All IoT Status</SelectItem>
                  <SelectItem value="Connected">Connected</SelectItem>
                  <SelectItem value="Fully Completed">Fully Completed</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Not-Connected">Not Connected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Search ESRs */}
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Search ESRs
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  placeholder="Search by scheme, village or ESR name..."
                  className="pl-9 pr-10 py-2 border-blue-200 focus:ring-blue-500 focus:border-blue-500 h-11"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  data-testid="input-search-esr"
                />
                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchQuery("")}
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="min-w-[200px]">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">Scheme Category (Admin)</p>
                <Select value={uiSchemeFilter} onValueChange={(value) => { setUiSchemeFilter(value); setPage(1); }}>
                  <SelectTrigger className="w-full bg-white border-blue-200 h-11">
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

            {/* Action Buttons */}
            <div className="flex gap-2 md:self-end">
              <Button
                onClick={() =>
                  exportToExcel(
                    filteredData,
                    `Pressure_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]
                    }`,
                  )
                }
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 gap-2 h-11 px-4"
                data-testid="button-export-excel"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export to Excel</span>
                <span className="sm:hidden">Export</span>
                {filteredData.length > 0 ? ` (${filteredData.length})` : ""}
              </Button>
              <Button
                onClick={() => setShowHistoricalData(!showHistoricalData)}
                variant={showHistoricalData ? "default" : "outline"}
                className="flex items-center gap-2 h-11 px-4"
                data-testid="button-historical-data"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {showHistoricalData ? "Current Data" : "Historical Data"}
                </span>
                <span className="sm:hidden">History</span>
              </Button>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 gap-2 h-11 px-4"
                data-testid="button-refresh-data"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh Data</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
            </div>
          </div>
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

        {/* Historical Data Date Selection */}
        {showHistoricalData && (
          <div className="mt-4 p-4 mx-4 mb-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Select Date Range for Historical Data
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Start Date</label>
                  <Input
                    type="date"
                    value={historicalStartDate}
                    onChange={(e) => setHistoricalStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">End Date</label>
                  <Input
                    type="date"
                    value={historicalEndDate}
                    onChange={(e) => setHistoricalEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>

                <Button
                  onClick={() => refetchHistorical()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 mt-4 md:mt-0"
                  disabled={isLoadingHistorical}
                >
                  <TrendingUp className="h-4 w-4" />
                  Query Historical Data
                </Button>

                <Button
                  onClick={exportHistoricalData}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2 mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoadingHistorical}
                >
                  <Download className="h-4 w-4" />
                  Export to Excel ({updatedCardStats?.totalSensors || 0})
                </Button>
              </div>
            </div>

            {historicalPressureData.length > 0 && (
              <div className="mt-3 text-sm text-green-700">
                Found {historicalPressureData.length} historical records (
                {historicalStartDate} to {historicalEndDate})
              </div>
            )}

            {historicalError && (
              <div className="mt-3 text-sm text-red-700">
                Error loading historical data. Please try again.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Statistics Card */}
      {/* {dashboardStats?.lastImport && (
        <div className="bg-white rounded-xl shadow-md mb-6 p-4 border border-blue-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Last Import Statistics</h3>
              <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-2">
                <div>
                  <span className="text-sm text-gray-500">Total ESRs in Database:</span>
                  <p className="text-lg font-medium text-blue-800">{dashboardStats.totalSensors}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Records Processed:</span>
                  <p className="text-lg font-medium text-blue-800">{dashboardStats.lastImport.totalProcessed}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">New Records:</span>
                  <p className="text-lg font-medium text-green-700">{dashboardStats.lastImport.inserted}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Updated Records:</span>
                  <p className="text-lg font-medium text-orange-600">{dashboardStats.lastImport.updated}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Last Import:</p>
              <p className="text-sm font-medium text-gray-800">
                {new Date(dashboardStats.lastImport.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {/* Connected Sensors Card */}
        <Card
          className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${sensorStatusFilter === "connected"
            ? "ring-2 ring-blue-500 ring-offset-2"
            : ""
            } transform hover:scale-[1.02]`}
          onClick={() => handleSensorStatusClick("connected")}
        >
          <CardContent className="p-4 flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <Wifi className="h-6 w-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800 mb-1">
                Connected Sensors
              </h3>
              <p className="text-2xl font-bold text-blue-600">
                {calculatePressureSensorStatus.connected}
              </p>
              <p className="text-xs text-blue-600/70">
                Pressure sensors connected
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Online Sensors Card */}
        <Card
          className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${sensorStatusFilter === "online"
            ? "ring-2 ring-green-500 ring-offset-2"
            : ""
            } transform hover:scale-[1.02]`}
          onClick={() => handleSensorStatusClick("online")}
        >
          <CardContent className="p-4 flex items-center">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <Zap className="h-6 w-6 text-green-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 mb-1">
                Online Sensors
              </h3>
              <p className="text-2xl font-bold text-green-600">
                {calculatePressureSensorStatus.online}
              </p>
              <p className="text-xs text-green-600/70">
                Currently online & active
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Offline Sensors Card */}
        <Card
          className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${sensorStatusFilter === "offline"
            ? "ring-2 ring-orange-500 ring-offset-2"
            : ""
            } transform hover:scale-[1.02]`}
          onClick={() => handleSensorStatusClick("offline")}
        >
          <CardContent className="p-4 flex items-center">
            <div className="bg-orange-100 p-3 rounded-full mr-4">
              <WifiOff className="h-6 w-6 text-orange-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 mb-1">
                Offline Sensors
              </h3>
              <p className="text-2xl font-bold text-orange-600">
                {calculatePressureSensorStatus.offline}
              </p>
              <p className="text-xs text-orange-600/70">
                Connected but offline
              </p>
            </div>
          </CardContent>
        </Card>



        {/* Sensors with Water Card */}
        <Card
          className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${sensorStatusFilter === "withWater"
            ? "ring-2 ring-blue-500 ring-offset-2"
            : ""
            } transform hover:scale-[1.02]`}
          onClick={() => handleSensorStatusClick("withWater")}
        >
          <CardContent className="p-4 flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <Droplet className="h-6 w-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800 mb-1">
                Sensors with Water
              </h3>
              <p className="text-2xl font-bold text-blue-600">
                {(() => {
                  // Calculate "with water" count from filtered data for top card
                  if (!withWaterSensorsData?.withWaterSensors) return 0;

                  const withWaterLocationKeys = new Set(
                    withWaterSensorsData.withWaterSensors.map(
                      (sensor: any) =>
                        `${sensor.region}|${sensor.circle}|${sensor.division}|${sensor.sub_division}|${sensor.block}|${sensor.village_name}|${sensor.esr_name}`,
                    ),
                  );

                  return globallyFilteredData.filter((item) => {
                    const locationKey = `${item.region}|${item.circle}|${item.division}|${item.sub_division}|${item.block}|${item.village_name}|${item.esr_name}`;
                    return withWaterLocationKeys.has(locationKey);
                  }).length;
                })()}
              </p>
              <p className="text-xs text-blue-600/70">
                Connected sensors with water
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sensors with Water — Redesigned */}
      <div className="mb-8">
        <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 rounded-xl shadow-md p-5 border border-blue-200">

          {/* Header: title on left, total badge on right */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-xl shadow-sm">
                <Droplet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-blue-900">Sensors with Water</h3>
                <p className="text-xs text-blue-500/80">Pressure readings from water-active sensors</p>
              </div>
            </div>
            <div
              className={`cursor-pointer text-center px-5 py-2.5 bg-white rounded-xl border-2 hover:shadow-md transition-all duration-200 min-w-[88px] ${sensorStatusFilter === "withWater" && selectedWithWaterFilter === "all"
                ? "border-blue-500 ring-2 ring-blue-400 ring-offset-2"
                : "border-blue-200 hover:border-blue-400"
                }`}
              onClick={() => handleTotalCardClick("withWater")}
            >
              <p className="text-3xl font-bold text-blue-700">
                {(() => {
                  if (!withWaterSensorsData?.withWaterSensors) return 0;
                  const withWaterLocationKeys = new Set(
                    withWaterSensorsData.withWaterSensors.map(
                      (sensor: any) =>
                        `${sensor.region}|${sensor.circle}|${sensor.division}|${sensor.sub_division}|${sensor.block}|${sensor.village_name}|${sensor.esr_name}`,
                    ),
                  );
                  return globallyFilteredData.filter((item) => {
                    const locationKey = `${item.region}|${item.circle}|${item.division}|${item.sub_division}|${item.block}|${item.village_name}|${item.esr_name}`;
                    return withWaterLocationKeys.has(locationKey);
                  }).length;
                })()}
              </p>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Total</p>
            </div>
          </div>

          {/* 3-column range cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Below Range */}
            <div
              className={`cursor-pointer bg-white rounded-xl border border-red-100 border-t-4 border-t-red-500 p-4 text-center hover:shadow-md transition-all duration-200 ${selectedWithWaterFilter === "below_0.2" ? "ring-2 ring-red-400 ring-offset-2" : ""
                }`}
              onClick={() => handleWithWaterCardClick("below_0.2")}
            >
              <div className="flex justify-center mb-2">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600 mb-1">{calculateWithWaterRangeStats.belowRange || 0}</p>
              <p className="text-xs font-semibold text-red-700">Below Range</p>
              <p className="text-[10px] text-red-400 mt-0.5">&lt;0.2 bar</p>
            </div>

            {/* Optimal Range */}
            <div
              className={`cursor-pointer bg-white rounded-xl border border-green-100 border-t-4 border-t-green-500 p-4 text-center hover:shadow-md transition-all duration-200 ${selectedWithWaterFilter === "between_0.2_0.7" ? "ring-2 ring-green-400 ring-offset-2" : ""
                }`}
              onClick={() => handleWithWaterCardClick("between_0.2_0.7")}
            >
              <div className="flex justify-center mb-2">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600 mb-1">{calculateWithWaterRangeStats.optimal || 0}</p>
              <p className="text-xs font-semibold text-green-700">Optimal Range</p>
              <p className="text-[10px] text-green-400 mt-0.5">0.2–0.7 bar</p>
            </div>

            {/* Above Range */}
            <div
              className={`cursor-pointer bg-white rounded-xl border border-orange-100 border-t-4 border-t-orange-500 p-4 text-center hover:shadow-md transition-all duration-200 ${selectedWithWaterFilter === "above_0.7" ? "ring-2 ring-orange-400 ring-offset-2" : ""
                }`}
              onClick={() => handleWithWaterCardClick("above_0.7")}
            >
              <div className="flex justify-center mb-2">
                <div className="bg-orange-100 p-2 rounded-full">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-600 mb-1">{calculateWithWaterRangeStats.above || 0}</p>
              <p className="text-xs font-semibold text-orange-700">Above Range</p>
              <p className="text-[10px] text-orange-400 mt-0.5">&gt;0.7 bar</p>
            </div>
          </div>

          {/* No Data note */}
          {calculateWithWaterRangeStats.noData > 0 && (
            <div
              className="mt-3 flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2 border border-gray-200"
              data-testid="with-water-no-data-note"
            >
              <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-gray-500">
                <span className="font-bold text-gray-700">{calculateWithWaterRangeStats.noData}</span>{" "}
                sensor{calculateWithWaterRangeStats.noData !== 1 ? "s" : ""} with no pressure data — excluded from range counts above
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Consistent Pattern Cards (For All Connected Sensors) */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Activity className="h-6 w-6 text-gray-600 mr-2" />
          Consistent Patterns (All Connected Sensors)
        </h3>
        <div className="grid gap-4 md:grid-cols-5">
          {/* Consistent Zero Card */}
          <Card
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedCardFilter === "consistent_zero"
              ? "ring-2 ring-gray-500 ring-offset-2"
              : ""
              } transform hover:scale-[1.01]`}
            onClick={() => handleCardClick("consistent_zero")}
          >
            <CardContent className="p-4 flex items-center">
              <div className="bg-gray-100 p-3 rounded-full mr-4">
                <div className="h-5 w-5 text-gray-700 flex items-center justify-center text-xs font-bold">
                  0
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">
                  Consistent Zero
                </h4>
                <p className="text-2xl font-bold text-gray-700">
                  {updatedCardStats?.consistentZeroSensors || 0}
                </p>
                <p className="text-xs text-gray-600/70">
                  Zero pressure 7 days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Consistent Below Range Card */}
          <Card
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedCardFilter === "consistent_below"
              ? "ring-2 ring-red-500 ring-offset-2"
              : ""
              } transform hover:scale-[1.01]`}
            onClick={() => handleCardClick("consistent_below")}
          >
            <CardContent className="p-4 flex items-center">
              <div className="bg-red-100 p-3 rounded-full mr-4">
                <AlertTriangle className="h-5 w-5 text-red-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-red-800">
                  Consistent Below
                </h4>
                <p className="text-2xl font-bold text-red-600">
                  {updatedCardStats?.consistentBelowRangeSensors || 0}
                </p>
                <p className="text-xs text-red-600/70">
                  &lt;0.2 bar for 7 days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Consistent Optimal Range Card */}
          <Card
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedCardFilter === "consistent_optimal"
              ? "ring-2 ring-green-500 ring-offset-2"
              : ""
              } transform hover:scale-[1.01]`}
            onClick={() => handleCardClick("consistent_optimal")}
          >
            <CardContent className="p-4 flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-800">
                  Consistent Optimal
                </h4>
                <p className="text-2xl font-bold text-green-600">
                  {updatedCardStats?.consistentOptimalSensors || 0}
                </p>
                <p className="text-xs text-green-600/70">
                  0.2-0.7 bar for 7 days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Consistent Above Range Card */}
          <Card
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedCardFilter === "consistent_above"
              ? "ring-2 ring-orange-500 ring-offset-2"
              : ""
              } transform hover:scale-[1.01]`}
            onClick={() => handleCardClick("consistent_above")}
          >
            <CardContent className="p-4 flex items-center">
              <div className="bg-orange-100 p-3 rounded-full mr-4">
                <AlertCircle className="h-5 w-5 text-orange-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-800">
                  Consistent Above
                </h4>
                <p className="text-2xl font-bold text-orange-600">
                  {updatedCardStats?.consistentAboveRangeSensors || 0}
                </p>
                <p className="text-xs text-orange-600/70">
                  &gt;0.7 bar for 7 days
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Show All Sensors */}
          <Card
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedCardFilter === "all"
              ? "ring-2 ring-blue-500 ring-offset-2"
              : ""
              } transform hover:scale-[1.01]`}
            onClick={() => handleCardClick("all")}
          >
            <CardContent className="p-4 flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Gauge className="h-5 w-5 text-blue-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800">All Sensors</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {updatedCardStats?.totalSensors || 0}
                </p>
                <p className="text-xs text-blue-600/70">
                  Total connected sensors
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Current Filter Label */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {getFilterTitle(selectedCardFilter)}
          <Badge
            variant="outline"
            className="ml-2 text-blue-600 border-blue-200 bg-blue-50"
          >
            {filteredData.length} ESR Records
          </Badge>
        </h2>
      </div>

      {/* Regional Summary Mini-Table - Always Visible */}
      {(() => {
        const summary: Record<string, number> = {};

        // Use the filtered data to calculate regional summary
        filteredData.forEach((record) => {
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

        const regionalSummary = Object.entries(summary)
          .map(([region, count]) => ({ region, count }))
          .sort((a, b) => {
            const aIndex = regionOrder.indexOf(a.region);
            const bIndex = regionOrder.indexOf(b.region);
            // If region not found in order, put it at the end
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });

        return regionalSummary.length > 0 ? (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Regional Summary -{" "}
                {selectedCardFilter === "all"
                  ? "All ESR Locations"
                  : getFilterTitle(selectedCardFilter)}
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
        ) : null;
      })()}

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-blue-50">
              <TableRow className="pressure-item">
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  Region
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  Scheme ID
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  Scheme Name
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  Village
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  ESR
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  Latest Pressure (bar)
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                  PI Vision
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200 text-center w-[120px]">
                  Remark
                </TableHead>
                <TableHead className="font-semibold text-blue-800 border-b border-blue-200 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => {
                  const latestPressure = getCurrentPressureValue(item);
                  const statusInfo = getPressureStatusInfo(latestPressure);
                  const esrKey = `${item.scheme_id}-${item.village_name}-${item.esr_name}`;
                  const issues = esrIssuesMap?.get(esrKey) || [];
                  const hasActiveIssue = issues.some((i: any) => i.status === 'Active');
                  return (
                    <TableRow
                      key={`${item.scheme_id}-${item.village_name}-${item.esr_name}-${idx}`}
                      className={`pressure-item ${statusInfo.className} hover:bg-blue-100 border-b border-blue-200 ${hasActiveIssue ? "border-l-4 border-l-red-500 bg-red-50/30" : ""}`}
                    >
                      <TableCell className="font-medium border-b border-blue-200">
                        {item.region}
                      </TableCell>
                      <TableCell className="font-mono text-sm border-b border-blue-200">
                        {item.scheme_id}
                      </TableCell>
                      <TableCell className="border-b border-blue-200">
                        {item.scheme_name}
                      </TableCell>
                      <TableCell className="border-b border-blue-200">
                        {item.village_name}
                      </TableCell>
                      <TableCell className="border-b border-blue-200">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-900 truncate max-w-[150px]" title={item.esr_name}>
                            {item.esr_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="border-b border-blue-200">
                        {latestPressure !== null ? (
                          <span className="font-semibold">
                            {typeof latestPressure === "number"
                              ? latestPressure.toFixed(2)
                              : latestPressure}{" "}
                            bar
                          </span>
                        ) : (
                          <span className="text-gray-400">No data</span>
                        )}
                      </TableCell>
                      <TableCell className="border-b border-blue-200">
                        <div className="flex items-center">
                          {statusInfo.icon && statusInfo.icon}
                          <span
                            className={`ml-1 ${statusInfo.textColor || "text-gray-500"
                              }`}
                          >
                            {statusInfo.statusText}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="border-b border-blue-200">
                        {item.dashboard_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="py-1 px-2 h-8 text-xs"
                            onClick={() => {
                              // Track external dashboard access
                              trackDashboardAccess(
                                item.dashboard_url!,
                                "PI Vision Pressure Dashboard",
                              );
                              window.open(item.dashboard_url, "_blank");
                            }}
                          >
                            <Gauge className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not available
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="border-b border-blue-200 text-center max-w-[150px]">
                        {issues.length > 0 ? (
                          (() => {
                            const activeIssue = issues.find((i: any) => i.status === 'Active');
                            const textColor = activeIssue ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50';
                            const displayText = activeIssue ? activeIssue.reason : 'Resolved';
                            return (
                              <Button
                                variant="ghost"
                                className={`h-auto p-1 max-w-full justify-start font-semibold text-[11px] ${textColor}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRemarkDetails({ issues, title: `Remarks/Issues for ${item.esr_name}, ${item.village_name}` });
                                }}
                              >
                                <span className="truncate w-full text-left">
                                  {displayText}
                                </span>
                              </Button>
                            );
                          })()                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right border-b border-blue-200">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => setSelectedESR(item)}
                            >
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto bg-white">
                            {selectedESR && (
                              <>
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Gauge className="h-5 w-5 text-blue-600" />
                                    </div>
                                    {selectedESR.esr_name} -{" "}
                                    {selectedESR.village_name}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Detailed pressure monitoring data for this
                                    ESR
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="py-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                                      <h3 className="text-sm font-medium text-blue-800 mb-3">
                                        ESR Information
                                      </h3>

                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">
                                            Region
                                          </span>
                                          <span className="font-medium">
                                            {selectedESR.region}
                                          </span>
                                        </div>

                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">
                                            Scheme ID
                                          </span>
                                          <span className="font-medium font-mono">
                                            {selectedESR.scheme_id}
                                          </span>
                                        </div>

                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">
                                            Scheme
                                          </span>
                                          <span className="font-medium">
                                            {selectedESR.scheme_name}
                                          </span>
                                        </div>

                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                          <span className="text-sm text-blue-700">
                                            Village
                                          </span>
                                          <span className="font-medium">
                                            {selectedESR.village_name}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-100 flex flex-col">
                                      <h3 className="text-sm font-medium text-blue-800 mb-3">
                                        Current Status
                                      </h3>

                                      {(() => {
                                        const latestValue =
                                          getCurrentPressureValue(selectedESR);
                                        const statusInfo =
                                          getPressureStatusInfo(latestValue);

                                        let statusBgClass = "bg-gray-100";
                                        let statusTextClass = "text-gray-800";

                                        if (latestValue !== null) {
                                          if (latestValue < 0.2) {
                                            statusBgClass = "bg-red-100";
                                            statusTextClass = "text-red-800";
                                          } else if (
                                            latestValue >= 0.2 &&
                                            latestValue <= 0.7
                                          ) {
                                            statusBgClass = "bg-green-100";
                                            statusTextClass = "text-green-800";
                                          } else {
                                            statusBgClass = "bg-orange-100";
                                            statusTextClass = "text-orange-800";
                                          }
                                        }

                                        return (
                                          <div
                                            className={`${statusBgClass} rounded-lg p-4 flex-1 flex flex-col justify-center items-center`}
                                          >
                                            <div className="flex items-center gap-2 mb-2">
                                              {statusInfo.icon}
                                              <span
                                                className={`text-lg font-bold ${statusTextClass}`}
                                              >
                                                {statusInfo.statusText}
                                              </span>
                                            </div>

                                            <div className="text-4xl font-bold mb-2">
                                              {latestValue !== null ? (
                                                <span
                                                  className={statusTextClass}
                                                >
                                                  {latestValue.toFixed(2)}
                                                </span>
                                              ) : (
                                                "—"
                                              )}
                                            </div>

                                            <div
                                              className={`text-sm ${statusTextClass}`}
                                            >
                                              bar
                                            </div>

                                            <div className="mt-4 text-xs text-gray-600">
                                              Target Range: 0.2-0.7 bar
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  <div className="border-t border-gray-200 pt-6">
                                    <h3 className="font-medium text-lg mb-4 text-blue-800 flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                        <AlertCircle className="h-3 w-3 text-blue-600" />
                                      </div>
                                      7-Day Pressure History
                                    </h3>
                                    <div className="grid grid-cols-7 gap-3">
                                      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                        const value =
                                          selectedESR[
                                          `pressure_value_${day}` as keyof PressureData
                                          ];
                                        const numValue =
                                          value !== undefined && value !== null
                                            ? Number(value)
                                            : null;
                                        const dateValue =
                                          selectedESR[
                                          `pressure_date_day_${day}` as keyof PressureData
                                          ];
                                        const { className: dayClassName } =
                                          getPressureStatusInfo(numValue);

                                        let cardBgClass =
                                          "bg-white border-gray-200";
                                        let valueTextClass = "text-gray-400";

                                        if (numValue !== null) {
                                          if (numValue < 0.2) {
                                            cardBgClass =
                                              "bg-gradient-to-br from-red-50 to-white border-red-200";
                                            valueTextClass = "text-red-600";
                                          } else if (
                                            numValue >= 0.2 &&
                                            numValue <= 0.7
                                          ) {
                                            cardBgClass =
                                              "bg-gradient-to-br from-green-50 to-white border-green-200";
                                            valueTextClass = "text-green-600";
                                          } else {
                                            cardBgClass =
                                              "bg-gradient-to-br from-orange-50 to-white border-orange-200";
                                            valueTextClass = "text-orange-600";
                                          }
                                        }

                                        return (
                                          <div
                                            key={`pressure-day-${day}`}
                                            className={`${cardBgClass} p-3 rounded-md text-center shadow-sm border relative overflow-hidden`}
                                          >
                                            <div className="relative">
                                              <p className="text-xs text-gray-700 font-medium">
                                                Day {day}
                                              </p>
                                              <p
                                                className={`text-xl font-bold ${valueTextClass}`}
                                              >
                                                {numValue !== null
                                                  ? numValue.toFixed(2)
                                                  : "—"}
                                              </p>
                                              <p className="text-xs text-gray-500 truncate">
                                                {dateValue || "No data"}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="mt-6 bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                                    <h4 className="font-medium text-blue-800 mb-3">
                                      7-Day Analysis
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="bg-white p-3 rounded border border-red-100">
                                        <p className="text-sm text-red-700 mb-1">
                                          Below Range Days
                                        </p>
                                        <p className="text-xl font-bold text-red-600">
                                          {(() => {
                                            let count = 0;
                                            for (let day = 1; day <= 7; day++) {
                                              const value =
                                                selectedESR[
                                                `pressure_value_${day}` as keyof PressureData
                                                ];
                                              const numValue =
                                                value !== undefined &&
                                                  value !== null
                                                  ? Number(value)
                                                  : null;
                                              if (
                                                numValue !== null &&
                                                numValue >= 0 &&
                                                numValue < 0.2
                                              ) {
                                                count++;
                                              }
                                            }
                                            return count;
                                          })()}
                                        </p>
                                      </div>
                                      <div className="bg-white p-3 rounded border border-green-100">
                                        <p className="text-sm text-green-700 mb-1">
                                          Optimal Range Days
                                        </p>
                                        <p className="text-xl font-bold text-green-600">
                                          {(() => {
                                            let count = 0;
                                            for (let day = 1; day <= 7; day++) {
                                              const value =
                                                selectedESR[
                                                `pressure_value_${day}` as keyof PressureData
                                                ];
                                              const numValue =
                                                value !== undefined &&
                                                  value !== null
                                                  ? Number(value)
                                                  : null;
                                              if (
                                                numValue !== null &&
                                                numValue >= 0.2 &&
                                                numValue <= 0.7
                                              ) {
                                                count++;
                                              }
                                            }
                                            return count;
                                          })()}
                                        </p>
                                      </div>
                                      <div className="bg-white p-3 rounded border border-orange-100">
                                        <p className="text-sm text-orange-700 mb-1">
                                          Above Range Days
                                        </p>
                                        <p className="text-xl font-bold text-orange-600">
                                          {(() => {
                                            let count = 0;
                                            for (let day = 1; day <= 7; day++) {
                                              const value =
                                                selectedESR[
                                                `pressure_value_${day}` as keyof PressureData
                                                ];
                                              const numValue =
                                                value !== undefined &&
                                                  value !== null
                                                  ? Number(value)
                                                  : null;
                                              if (
                                                numValue !== null &&
                                                numValue > 0.7
                                              ) {
                                                count++;
                                              }
                                            }
                                            return count;
                                          })()}
                                        </p>
                                      </div>
                                      <div className="bg-white p-3 rounded border border-gray-200">
                                        <p className="text-sm text-gray-700 mb-1">
                                          Zero Pressure Days
                                        </p>
                                        <p className="text-xl font-bold text-gray-600">
                                          {(() => {
                                            let count = 0;
                                            for (let day = 1; day <= 7; day++) {
                                              const value =
                                                selectedESR[
                                                `pressure_value_${day}` as keyof PressureData
                                                ];
                                              const numValue =
                                                value !== undefined &&
                                                  value !== null
                                                  ? Number(value)
                                                  : null;
                                              if (numValue === 0) {
                                                count++;
                                              }
                                            }
                                            return count;
                                          })()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* PI Vision Dashboard Link */}
                                  <div className="mt-6 pt-6 border-t border-gray-200">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <h3 className="font-medium text-blue-800">
                                          PI Vision Dashboard
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                          View detailed historical pressure data
                                          in PI Vision
                                        </p>
                                      </div>
                                      {selectedESR.dashboard_url ? (
                                        <Button
                                          variant="outline"
                                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                          onClick={() =>
                                            window.open(
                                              selectedESR.dashboard_url,
                                              "_blank",
                                            )
                                          }
                                        >
                                          <Gauge className="h-4 w-4 mr-2" />{" "}
                                          Open Dashboard
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          disabled
                                          className="opacity-50"
                                        >
                                          <Gauge className="h-4 w-4 mr-2" />{" "}
                                          Dashboard Not Available
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-gray-500"
                  >
                    {allPressureData.length === 0 ? (
                      <>No pressure data available for this region</>
                    ) : (
                      <>No results match your search criteria</>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {
        filteredData.length > itemsPerPage && (
          <div className="flex justify-center mb-8">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page === 1 ? "opacity-50 pointer-events-none" : ""}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Logic to show 5 pages around the current page
                  let pageNumber = page;
                  if (page < 3) {
                    pageNumber = i + 1;
                  } else if (page > totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = page - 2 + i;
                  }

                  // Ensure page number is within bounds
                  if (pageNumber < 1) pageNumber = 1;
                  if (pageNumber > totalPages) pageNumber = totalPages;

                  return (
                    <PaginationItem key={`page-${pageNumber}`}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNumber);
                        }}
                        isActive={page === pageNumber}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={
                      page === totalPages ? "opacity-50 pointer-events-none" : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )
      }

      {selectedRemarkDetails && (
        <Dialog
          open={!!selectedRemarkDetails}
          onOpenChange={(open) => !open && setSelectedRemarkDetails(null)}
        >
          <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 overflow-hidden">
            {(() => {
              const hasActive = selectedRemarkDetails.issues.some((i: any) => i.status === 'Active');
              const headerGradient = hasActive
                ? "from-red-600 via-rose-600 to-red-700"
                : "from-emerald-600 via-teal-600 to-emerald-700";
              return (
                <>
                  <div className={`bg-gradient-to-r ${headerGradient} p-6 flex justify-between items-center text-white relative`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10 flex-1 pr-6">
                      <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
                        <span className="tracking-tight">Issue Details & Remarks History</span>
                      </DialogTitle>
                      <DialogDescription className="text-white/90 mt-2 font-medium flex items-center gap-2">                        <MapPin className="h-4 w-4" />
                        <span>{selectedRemarkDetails.title}</span>
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50">
                    <div className="space-y-4">
                      {selectedRemarkDetails.issues.map((issue: any, index: number) => (
                        <div
                          key={index}
                          className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 ${
                            issue.status === 'Resolved'
                              ? 'border-l-4 border-l-emerald-500'
                              : 'border-l-4 border-l-red-500'
                          }`}
                        >                          <div className="flex justify-between items-start mb-3 gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
                                  {issue.problem_level ? `${issue.problem_level} Level`.toUpperCase() : (issue.category || "General")}
                                </span>
                                <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                                  issue.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {issue.status || 'Active'}
                                </span>                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <div className="text-sm font-medium text-slate-900">
                                {issue.creator_name || issue.reported_by || "Field Engineer"}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                                {new Date(issue.created_at || new Date()).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                  hour: 'numeric', minute: '2-digit', hour12: true
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
                            {issue.status === 'Resolved' && (
                              <div className="text-sm text-emerald-700 mt-2 pt-2 border-t border-slate-200">
                                <span className="font-semibold text-emerald-900">Resolution Remark:</span> {issue.resolution_remark || 'Resolved'}
                                {issue.resolved_at && (
                                  <span className="block text-[10px] text-emerald-600 mt-1">
                                    Resolved on: {new Date(issue.resolved_at).toLocaleString('en-US', {
                                      month: 'short', day: 'numeric', year: 'numeric',
                                      hour: 'numeric', minute: '2-digit', hour12: true
                                    })}
                                  </span>                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
};

export default PressureDashboard;