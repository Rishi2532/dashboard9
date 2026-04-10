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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TranslatedText } from "@/components/ui/translated-text";
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  MapPin,
  X,
  RefreshCw,
  Droplet,
  Activity,
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
} from "lucide-react";
import GeographicalFilters from "@/components/dashboard/GeographicalFilters";
import AgencyTypeFilter from "@/components/dashboard/AgencyTypeFilter";
import ExcelJS from "exceljs";

// Define types for Chlorine Data
interface ChlorineData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  village_name: string;
  esr_name: string;
  sensor_id?: string;
  chlorine_value_1?: number | null;
  chlorine_date_day_1?: string | null;
  chlorine_value_2?: number | null;
  chlorine_date_day_2?: string | null;
  chlorine_value_3?: number | null;
  chlorine_date_day_3?: string | null;
  chlorine_value_4?: number | null;
  chlorine_date_day_4?: string | null;
  chlorine_value_5?: number | null;
  chlorine_date_day_5?: string | null;
  chlorine_value_6?: number | null;
  chlorine_date_day_6?: string | null;
  chlorine_value_7?: number | null;
  chlorine_date_day_7?: string | null;
  // Additional analysis fields
  number_of_consistent_zero_value_in_chlorine?: number | null;
  chlorine_less_than_02_mgl?: number | null;
  chlorine_between_02_05_mgl?: number | null;
  chlorine_greater_than_05_mgl?: number | null;
  // Dashboard URL for PI Vision integration
  dashboard_url?: string;
  water_supply?: string;
  remark?: string;
}

interface RegionData {
  region_id: number;
  region_name: string;
}

interface ChlorineDashboardStats {
  totalSensors: number;
  belowRangeSensors: number;
  optimalRangeSensors: number;
  aboveRangeSensors: number;
  consistentZeroSensors: number;
  consistentBelowRangeSensors: number;
  consistentOptimalSensors: number;
  consistentAboveRangeSensors: number;
  noWaterSensors: number;
  lastImport?: {
    inserted: number;
    updated: number;
    totalProcessed: number;
    timestamp: string;
    errors: number;
  };
}

interface HistoricalChlorineData {
  scheme_id: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  measurement_date: string;
  chlorine_value: number;
  dashboard_url?: string;
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

interface ChlorineSensorStatus {
  connected: number;
  online: number;
  offline: number;
}

type ChlorineRange =
  | "all"
  | "below_0.2"
  | "between_0.2_0.5"
  | "above_0.5"
  | "consistent_zero"
  | "consistent_below"
  | "consistent_optimal"
  | "consistent_above";

type SensorStatusFilter =
  | "all"
  | "connected"
  | "online"
  | "offline"
  | "withWater";

const ChlorineDashboard: React.FC = () => {
  const { toast } = useToast();
  const {
    trackPageVisit,
    trackDataExport,
    trackFilterUsage,
    trackDashboardAccess,
  } = useComprehensiveActivityTracker();

  // Global filter state (affects both cards and table)
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [selectedAgencyType, setSelectedAgencyType] = useState<string>("ALL");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [schemeStatusFilter, setSchemeStatusFilter] = useState<string>("all");
  const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("commissioned");
  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");

  const schemeFilter = uiSchemeFilter === "commissioned" && waterSupplyStatus !== "All"
    ? `commissioned_${waterSupplyStatus.toLowerCase()}`
    : uiSchemeFilter;

  // Card-specific filter state (only affects table data, not card values)
  const [selectedCardFilter, setSelectedCardFilter] =
    useState<ChlorineRange>("all");

  // Separate selection states for with water and without water sections
  const [selectedWithWaterFilter, setSelectedWithWaterFilter] =
    useState<ChlorineRange>("all");

  // Sensor status filter state
  const [sensorStatusFilter, setSensorStatusFilter] =
    useState<SensorStatusFilter>("all");

  // Remove the old selectedCardFilter state entirely - we'll use selectedCardFilter instead

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selected ESR for detailed view
  const [selectedESR, setSelectedESR] = useState<ChlorineData | null>(null);

  // Historical data state
  const [showHistoricalData, setShowHistoricalData] = useState<boolean>(false);
  const [historicalStartDate, setHistoricalStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days ago
  );
  const [historicalEndDate, setHistoricalEndDate] = useState<string>(
    new Date().toISOString().split("T")[0], // Today
  );

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
      if (issue.scheme_id && issue.village_name && issue.esr_name && issue.problem_level === "ESR") {
        const key = `${issue.scheme_id}-${issue.village_name}-${issue.esr_name}`;
        if (!eMap.has(key)) {
          eMap.set(key, []);
        }
        eMap.get(key)?.push(issue);
      }
    });

    return { esrIssuesMap: eMap };
  }, [activeIssues]);

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Chlorine Dashboard");
  }, [trackPageVisit]);

  // Filter Handlers
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

  // Fetch cascading filter options
  const { data: filterOptions } = useQuery({
    queryKey: [
      "/api/chlorine/filters",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedDivision,
      selectedSubdivision,
      selectedAgencyType,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") params.append("region", selectedRegion);
      if (selectedCircle !== "all") params.append("circle", selectedCircle);
      if (selectedDivision !== "all")
        params.append("division", selectedDivision);
      if (selectedSubdivision !== "all")
        params.append("subdivision", selectedSubdivision);
      if (selectedAgencyType !== 'ALL') {
        params.append("agencyType", selectedAgencyType);
      }

      const response = await fetch(
        `/api/chlorine/filters?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch filter options");
      return response.json();
    },
  });

  // Parse URL parameters and set initial filters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get("region");
    const rangeParam = urlParams.get("range");

    console.log("Chlorine Dashboard: Parsing URL params:", {
      regionParam,
      rangeParam,
    });

    // Set region filter if provided
    if (regionParam && regionParam !== "all") {
      setSelectedRegion(regionParam);
      console.log("Chlorine Dashboard: Set region filter to:", regionParam);
    }

    // Set range filter if provided
    if (rangeParam && rangeParam !== "all") {
      setSelectedCardFilter(rangeParam as ChlorineRange);
      setSelectedWithWaterFilter(rangeParam as ChlorineRange);
      console.log("Chlorine Dashboard: Set range filter to:", rangeParam);
    }
  }, []); // Only run on component mount

  // Listen for filter changes from chatbot (moved after filteredData declaration)
  // This effect will be defined later after filteredData is declared

  // Fetch all chlorine data
  const {
    data: allChlorineData = [],
    isLoading: isLoadingChlorine,
    error: chlorineError,
    refetch,
  } = useQuery<ChlorineData[]>({
    queryKey: [
      "/api/chlorine",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
      selectedAgencyType,
      schemeFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all")
        params.append("region", selectedRegion);
      if (selectedCircle && selectedCircle !== "all")
        params.append("circle", selectedCircle);
      if (selectedDivision && selectedDivision !== "all")
        params.append("division", selectedDivision);
      if (selectedSubdivision && selectedSubdivision !== "all")
        params.append("sub_division", selectedSubdivision); // Corrected to sub_division
      if (selectedBlock && selectedBlock !== "all")
        params.append("block", selectedBlock);
      if (selectedAgencyType !== "ALL")
        params.append("agencyType", selectedAgencyType);

      if (schemeFilter !== "all") {
        params.append("filterType", schemeFilter);
      }
      if (schemeFilter === "fully_completed") {
        params.append("fullyCompleted", "true");
      }

      // No longer filtering API requests by card selection
      // This ensures we get all data for the region and can filter locally

      const queryString = params.toString();
      const url = `/api/chlorine${queryString ? `?${queryString}` : ""}`;

      console.log("Fetching chlorine data with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch chlorine data");
      }

      const data = await response.json();
      console.log(
        `Received ${data.length} chlorine records for region: ${selectedRegion}, filter: ${selectedCardFilter}`,
      );
      return data;
    },
  });

  // Fetch dashboard stats from API - we'll override these with local calculations
  const { data: apiDashboardStats, isLoading: isLoadingStats } =
    useQuery<ChlorineDashboardStats>({
      queryKey: ["/api/chlorine/dashboard-stats", selectedRegion, selectedAgencyType],
      queryFn: async () => {
        const params = new URLSearchParams();

        if (selectedRegion && selectedRegion !== "all") {
          params.append("region", selectedRegion);
        }
        if (selectedAgencyType !== 'ALL') {
          params.append("agencyType", selectedAgencyType);
        }

        const queryString = params.toString();
        const url = `/api/chlorine/dashboard-stats${queryString ? `?${queryString}` : ""}`;

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


  // Fetch chlorine sensors with water data
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
      chlorine_connected: string | null;
    }>;
  }>({
    queryKey: ["/api/chlorine/with-water-sensors", selectedRegion, selectedAgencyType],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedAgencyType !== 'ALL') {
        params.append("agencyType", selectedAgencyType);
      }

      const queryString = params.toString();
      const url = `/api/chlorine/with-water-sensors${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch chlorine sensors with water");
      }

      const result = await response.json();
      console.log(`Received chlorine with water sensors data:`, result);
      return result.data;
    },
  });

  // Fetch historical chlorine data when dates change
  const {
    data: historicalChlorineData = [],
    isLoading: isLoadingHistorical,
    error: historicalError,
    refetch: refetchHistorical,
  } = useQuery<HistoricalChlorineData[]>({
    queryKey: [
      "/api/chlorine/historical",
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
      const url = `/api/chlorine/historical?${queryString}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch historical chlorine data");
      }

      const result = await response.json();
      return result.data || [];
    },
    enabled: showHistoricalData, // Only fetch when historical view is enabled
  });

  // Get current chlorine value (day 7 only - no fallback to previous days)
  const getCurrentChlorineValue = (data: ChlorineData): number | null => {
    // Only use the current day (day 7) value - if it's null/blank, return null
    const currentValue = data.chlorine_value_7;
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

  // Get the CSS class and status text based on chlorine value
  const getChlorineStatusInfo = (value: number | null) => {
    if (value === null)
      return {
        className: "bg-red-50 border-red-200",
        statusText: "Below Range",
        textColor: "text-red-800",
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      };

    if (value < 0.2)
      return {
        className: "bg-red-50 border-red-200",
        statusText: "Below Range",
        textColor: "text-red-800",
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      };

    if (value >= 0.2 && value <= 0.5)
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

  // Handler for scheme status filter changes
  const handleSchemeStatusFilterChange = (value: string) => {
    setSchemeStatusFilter(value);

    // Track filter usage
    if (value !== "all") {
      trackFilterUsage(
        "iot_status",
        value,
        filteredData.length,
        "chlorine_dashboard",
      );
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
    trackFilterUsage("sensor_status", status, undefined, "chlorine_dashboard");

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Create scheme status map for filtering
  const schemeStatusMap = useMemo(() => {
    const map = new Map();
    if (schemeStatusData && schemeStatusData.length > 0) {
      schemeStatusData.forEach((status) => {
        map.set(status.scheme_id, status);
      });
    }
    return map;
  }, [schemeStatusData]);

  // Apply global filters to data for both cards and table
  const globallyFilteredData = useMemo(() => {
    let filtered = [...allChlorineData];

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
            return commStatus.chlorine_connected === "Connected";
          case "online":
            return (
              commStatus.chlorine_connected === "Connected" &&
              commStatus.chlorine_status === "Online"
            );
          case "offline":
            return (
              commStatus.chlorine_connected === "Connected" &&
              commStatus.chlorine_status === "Offline"
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

    // Apply commissioned status filter
    if (schemeFilter !== "all" || uiSchemeFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        const status = schemeStatusMap.get(scheme.scheme_id);
        if (!status) return false;

        if (uiSchemeFilter === "commissioned") {
          if (waterSupplyStatus !== "All") {
            return status.water_supply_status === waterSupplyStatus;
          }
          return status.water_supply === "Yes";
        }

        if (uiSchemeFilter === "fully_completed") {
          const statusValue = String(status.fully_completion_scheme_status || "").toLowerCase();
          return statusValue === "fully completed" || statusValue === "completed" || statusValue === "fully_completed";
        }

        if (uiSchemeFilter === "in_progress") {
          return status.fully_completion_scheme_status === "In Progress";
        }

        if (uiSchemeFilter === "common_filter") {
          const statusValue = String(status.fully_completion_scheme_status || "").toLowerCase();
          return (statusValue === "fully completed" || statusValue === "completed" || statusValue === "fully_completed") && status.water_supply === "Yes";
        }

        if (uiSchemeFilter === "mjp_commissioned_yes") {
          return status.mjp_commissioned === "Yes";
        }

        return true;
      });
    }

    // Apply scheme status filter
    if (schemeStatusFilter !== "all") {
      filtered = filtered.filter((scheme) => {
        // Get scheme status from the map using scheme_id
        const status = schemeStatusMap.get(scheme.scheme_id);
        if (!status) return false;

        if (schemeStatusFilter === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    return filtered;
  }, [
    allChlorineData,
    selectedRegion,
    searchQuery,
    schemeFilter,
    uiSchemeFilter,
    waterSupplyStatus,
    schemeStatusFilter,
    schemeStatusMap,
    withWaterSensorsData,
  ]);

  // Calculate sensor status counts for chlorine sensors using globally filtered data
  const calculateChlorineSensorStatus = useMemo((): ChlorineSensorStatus => {
    const status = { connected: 0, online: 0, offline: 0 };

    if (!globallyFilteredData || !communicationStatusData) {
      return status;
    }

    // Create a map of the full hierarchy from globally filtered chlorine data
    const chlorineLocationKeys = new Set(
      globallyFilteredData.map(
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

    // Use Sets to track unique ESR names
    const uniqueConnectedESRs = new Set<string>();
    const uniqueOnlineESRs = new Set<string>();
    const uniqueOfflineESRs = new Set<string>();

    filteredCommStatus.forEach((commStatus) => {
      const commLocationKey = `${commStatus.region}|${commStatus.circle}|${commStatus.division}|${commStatus.sub_division}|${commStatus.block}|${commStatus.village_name}|${commStatus.esr_name}`;

      if (chlorineLocationKeys.has(commLocationKey)) {
        if (commStatus.chlorine_connected === "Connected") {
          uniqueConnectedESRs.add(commLocationKey);

          if (commStatus.chlorine_status === "Online") {
            uniqueOnlineESRs.add(commLocationKey);
          } else if (commStatus.chlorine_status === "Offline") {
            uniqueOfflineESRs.add(commLocationKey);
          }
        }
      }
    });

    status.connected = uniqueConnectedESRs.size;

    status.online = uniqueOnlineESRs.size;
    status.offline = uniqueOfflineESRs.size;

    return status;
  }, [
    globallyFilteredData,
    communicationStatusData,
    selectedRegion,
    withWaterSensorsData,
  ]);

  // Calculate statistics for the "With Water" section
  const calculateWithWaterRangeStats = useMemo(() => {
    const stats = {
      total: 0,
      belowRange: 0,
      optimal: 0,
      above: 0,
      noData: 0,
      consistentZero: 0,
    };

    if (!withWaterSensorsData?.withWaterSensors || !globallyFilteredData) {
      return stats;
    }

    const withWaterLocationKeys = new Set(
      withWaterSensorsData.withWaterSensors.map(
        (sensor: any) =>
          `${sensor.region}|${sensor.circle}|${sensor.division}|${sensor.sub_division}|${sensor.block}|${sensor.village_name}|${sensor.esr_name}`,
      ),
    );

    const filteredWithWater = globallyFilteredData.filter((item) => {
      const locationKey = `${item.region}|${item.circle}|${item.division}|${item.sub_division}|${item.block}|${item.village_name}|${item.esr_name}`;
      return withWaterLocationKeys.has(locationKey);
    });

    stats.total = filteredWithWater.length;

    filteredWithWater.forEach((item) => {
      const latestValue = getCurrentChlorineValue(item);

      if (latestValue === null) {
        stats.noData++;
      } else if (latestValue < 0.2 && latestValue >= 0) {
        stats.belowRange++;
      } else if (latestValue >= 0.2 && latestValue <= 0.5) {
        stats.optimal++;
      } else if (latestValue > 0.5) {
        stats.above++;
      }

      if ((item.number_of_consistent_zero_value_in_chlorine || 0) === 7) {
        stats.consistentZero++;
      }
    });

    return stats;
  }, [withWaterSensorsData, globallyFilteredData, getCurrentChlorineValue]);


  // Handler for commissioned status filter changes (legacy, keeping for compatibility if needed elsewhere)
  const [commissionedFilter, setCommissionedFilter] = useState<string>("all");
  const handleCommissionedFilterChange = (value: string) => {
    setCommissionedFilter(value);
    if (value === "all") setUiSchemeFilter("all");
    else if (value === "Yes") setUiSchemeFilter("mjp_commissioned_yes");
    else if (value === "No") setUiSchemeFilter("all");
    else if (value === "Water Supply") setUiSchemeFilter("commissioned");
    setPage(1);
  };

  const [fullyCompletedFilter, setFullyCompletedFilter] = useState<string>("all");
  const handleFullyCompletedFilterChange = (value: string) => {
    setFullyCompletedFilter(value);
    if (value === "all") setUiSchemeFilter("all");
    else if (value === "Fully Completed") setUiSchemeFilter("fully_completed");
    else if (value === "In Progress") setUiSchemeFilter("in_progress");
    setPage(1);
  };
  const updatedCardStats = useMemo(() => {
    if (!apiDashboardStats) return null;

    // Start with a copy of the API stats
    const stats = { ...apiDashboardStats };

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

      const latestValue = getCurrentChlorineValue(item);

      // Treat null/blank current values as "below range"
      if (latestValue === null) {
        belowRangeSensors++;
      } else if (latestValue < 0.2 && latestValue >= 0) {
        belowRangeSensors++;
      } else if (latestValue >= 0.2 && latestValue <= 0.5) {
        optimalRangeSensors++;
      } else if (latestValue > 0.5) {
        aboveRangeSensors++;
      }

      // Count consistent readings
      if ((item.number_of_consistent_zero_value_in_chlorine || 0) === 7) {
        consistentZeroSensors++;
      }

      const values = [
        parseFloat(String(item.chlorine_value_1 || 0)),
        parseFloat(String(item.chlorine_value_2 || 0)),
        parseFloat(String(item.chlorine_value_3 || 0)),
        parseFloat(String(item.chlorine_value_4 || 0)),
        parseFloat(String(item.chlorine_value_5 || 0)),
        parseFloat(String(item.chlorine_value_6 || 0)),
        parseFloat(String(item.chlorine_value_7 || 0)),
      ];

      if (values.every((val) => val > 0 && val < 0.2)) {
        consistentBelowRangeSensors++;
      } else if (values.every((val) => val >= 0.2 && val <= 0.5)) {
        consistentOptimalSensors++;
      } else if (values.every((val) => val > 0.5)) {
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
  }, [apiDashboardStats, globallyFilteredData]);

  // Final data filtering - uses globally filtered data and applies card-specific filters
  const filteredData = useMemo(() => {
    // Start with the globally filtered data that affects both cards and table
    let filtered = [...globallyFilteredData];

    // Apply card-specific filter if selected (only affects table, not card values)
    if (selectedCardFilter && selectedCardFilter !== "all") {
      filtered = filtered.filter((item) => {
        const latestValue = getCurrentChlorineValue(item);

        switch (selectedCardFilter) {
          case "below_0.2":
            // Only include sensors with valid values < 0.2 (matching card calculation)
            return (
              latestValue !== null && !isNaN(latestValue) && latestValue < 0.2
            );
          case "between_0.2_0.5":
            return (
              latestValue !== null &&
              !isNaN(latestValue) &&
              latestValue >= 0.2 &&
              latestValue <= 0.5
            );
          case "above_0.5":
            return (
              latestValue !== null && !isNaN(latestValue) && latestValue > 0.5
            );
          case "consistent_zero":
            return (
              (item.number_of_consistent_zero_value_in_chlorine || 0) === 7
            );
          case "consistent_below":
            const belowValues = [
              parseFloat(String(item.chlorine_value_1 || 0)),
              parseFloat(String(item.chlorine_value_2 || 0)),
              parseFloat(String(item.chlorine_value_3 || 0)),
              parseFloat(String(item.chlorine_value_4 || 0)),
              parseFloat(String(item.chlorine_value_5 || 0)),
              parseFloat(String(item.chlorine_value_6 || 0)),
              parseFloat(String(item.chlorine_value_7 || 0)),
            ];
            return belowValues.every((val) => val > 0 && val < 0.2);
          case "consistent_optimal":
            const optimalValues = [
              parseFloat(String(item.chlorine_value_1 || 0)),
              parseFloat(String(item.chlorine_value_2 || 0)),
              parseFloat(String(item.chlorine_value_3 || 0)),
              parseFloat(String(item.chlorine_value_4 || 0)),
              parseFloat(String(item.chlorine_value_5 || 0)),
              parseFloat(String(item.chlorine_value_6 || 0)),
              parseFloat(String(item.chlorine_value_7 || 0)),
            ];
            return optimalValues.every((val) => val >= 0.2 && val <= 0.5);
          case "consistent_above":
            const aboveValues = [
              parseFloat(String(item.chlorine_value_1 || 0)),
              parseFloat(String(item.chlorine_value_2 || 0)),
              parseFloat(String(item.chlorine_value_3 || 0)),
              parseFloat(String(item.chlorine_value_4 || 0)),
              parseFloat(String(item.chlorine_value_5 || 0)),
              parseFloat(String(item.chlorine_value_6 || 0)),
              parseFloat(String(item.chlorine_value_7 || 0)),
            ];
            return aboveValues.every((val) => val > 0.5);
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [
    globallyFilteredData,
    selectedCardFilter,
  ]);

  // Listen for filter changes from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Chlorine Dashboard received region filter:", region);
      setSelectedRegion(region);
    };

    const handleMjpCommissionedFilterChange = (event: CustomEvent) => {
      const { mjpCommissioned } = event.detail;
      console.log(
        "Chlorine Dashboard received MJP commissioned filter:",
        mjpCommissioned,
      );
      setUiSchemeFilter(mjpCommissioned ? "commissioned" : "all");
      setPage(1);
    };

    const handleMjpFullyCompletedFilterChange = (event: CustomEvent) => {
      const { mjpFullyCompleted } = event.detail;
      console.log(
        "Chlorine Dashboard received MJP fully completed filter:",
        mjpFullyCompleted,
      );
      setUiSchemeFilter(mjpFullyCompleted ? "fully_completed" : "all");
      setPage(1);
    };

    const handleStatusFilterChange = (event: CustomEvent) => {
      const { status } = event.detail;
      console.log("Chlorine Dashboard received status filter:", status);
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

    // Add chatbot event handlers
    const handleChatbotRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Chlorine Dashboard received chatbot region filter:", region);
      setSelectedRegion(region);
      // Force refetch to ensure fresh data
      setTimeout(() => {
        refetch();
      }, 100);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Chlorine Dashboard received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "chlorine") {
        // Wait for data to be filtered properly
        setTimeout(() => {
          if (filteredData && filteredData.length > 0) {
            exportToExcel(
              filteredData,
              `Chlorine_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]}`,
            );
            console.log(
              "Excel export triggered for Chlorine data with",
              filteredData.length,
              "total records",
            );
          } else {
            console.log("No Chlorine data available for export");
          }
        }, 1500);
      }
    };

    window.addEventListener(
      "regionFilterChange",
      handleRegionFilterChange as EventListener,
    );
    window.addEventListener(
      "mjpCommissionedFilterChange",
      handleMjpCommissionedFilterChange as EventListener,
    );
    window.addEventListener(
      "mjpFullyCompletedFilterChange",
      handleMjpFullyCompletedFilterChange as EventListener,
    );
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
          `Chlorine_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]}`,
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
        "mjpCommissionedFilterChange",
        handleMjpCommissionedFilterChange as EventListener,
      );
      window.removeEventListener(
        "mjpFullyCompletedFilterChange",
        handleMjpFullyCompletedFilterChange as EventListener,
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
  }, [filteredData, selectedRegion, selectedCardFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, page, itemsPerPage]);

  // Get status filter title
  const getFilterTitle = (filter: ChlorineRange) => {
    switch (filter) {
      case "below_0.2":
        return "Below Range (<0.2mg/l)";
      case "between_0.2_0.5":
        return "Optimal Range (0.2-0.5mg/l)";
      case "above_0.5":
        return "Above Range (>0.5mg/l)";
      case "consistent_zero":
        return "Consistent Zero Chlorine (7 days)";
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
  const handleCardClick = (range: ChlorineRange) => {
    setSelectedCardFilter(range);

    // Track card filter usage
    if (range !== "all") {
      trackFilterUsage(
        "chlorine_range",
        getFilterTitle(range),
        filteredData.length,
        "chlorine_dashboard",
      );
    }

    setPage(1); // Reset to first page when filter changes
  };

  // Handler for "with water" section card clicks
  const handleWithWaterCardClick = (range: ChlorineRange) => {
    if (selectedWithWaterFilter === range) {
      // If same filter is clicked, clear the filter
      setSelectedWithWaterFilter("all");
      setSelectedCardFilter("all");
      setSensorStatusFilter("all");
    } else {
      // Apply the new filter
      setSelectedWithWaterFilter(range);
      setSelectedCardFilter(range); // Also set the main filter for table filtering

      // Set sensor status filter to withWater to show only sensors with water in table
      setSensorStatusFilter("withWater");

      // Track card filter usage
      if (range !== "all") {
        trackFilterUsage(
          "chlorine_range_with_water",
          getFilterTitle(range),
          filteredData.length,
          "chlorine_dashboard",
        );
      }
    }

    setPage(1); // Reset to first page when filter changes
  };

  // Handler for "without water" section card clicks
  const handleWithoutWaterCardClick = (range: ChlorineRange) => {
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

      // Track card filter usage
      if (range !== "all") {
        trackFilterUsage(
          "chlorine_range_without_water",
          getFilterTitle(range),
          filteredData.length,
          "chlorine_dashboard",
        );
      }
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
      setSelectedCardFilter("all");

      // Set sensor status filter to show only the selected water status
      setSensorStatusFilter(waterStatus);

      // Track card filter usage
      trackFilterUsage(
        "total_sensors",
        waterStatus === "withWater"
          ? "Sensors with Water"
          : "Sensors with No Water",
        filteredData.length,
        "chlorine_dashboard",
      );
    }

    setPage(1); // Reset to first page when filter changes
  };

  // Handler for exporting historical chlorine data
  const exportHistoricalData = async () => {
    try {
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const queryString = params.toString();
      const url = `/api/chlorine/export/historical?${queryString}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export historical data");
      }

      // Get the filename from response headers
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `Chlorine_Historical_Data_${historicalStartDate}_to_${historicalEndDate}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Track the export activity
      trackDataExport(
        "Chlorine Historical Data",
        filename,
        historicalChlorineData.length,
        {
          dateRange: `${historicalStartDate} to ${historicalEndDate}`,
          region: selectedRegion !== "all" ? selectedRegion : undefined,
        },
        {
          exportSource: "chlorine_historical_dashboard",
          startDate: historicalStartDate,
          endDate: historicalEndDate,
        },
      );

      toast({
        title: "Export Successful",
        description: `Historical chlorine data exported successfully`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export historical data",
        variant: "destructive",
      });
    }
  };

  // Function to export data to Excel
  const exportToExcel = async (data: ChlorineData[], filename: string) => {
    try {
      // Helper function to format date for better readability in Excel
      const formatDateForHeader = (dateStr: string | null | undefined) => {
        if (!dateStr) return "N/A";

        if (/^\d{1,2}[-/][a-zA-Z]{3}$/.test(dateStr)) {
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

      // Format data for Excel
      const worksheetData = data.map((item) => {
        const latestChlorine = getCurrentChlorineValue(item);
        const { statusText } = getChlorineStatusInfo(latestChlorine);

        // Format dates for headers
        const date1 = formatDateForHeader(item.chlorine_date_day_1);
        const date2 = formatDateForHeader(item.chlorine_date_day_2);
        const date3 = formatDateForHeader(item.chlorine_date_day_3);
        const date4 = formatDateForHeader(item.chlorine_date_day_4);
        const date5 = formatDateForHeader(item.chlorine_date_day_5);
        const date6 = formatDateForHeader(item.chlorine_date_day_6);
        const date7 = formatDateForHeader(item.chlorine_date_day_7);

        return {
          "Scheme ID": item.scheme_id,
          "Scheme Name": item.scheme_name || "N/A",
          Region: item.region || "N/A",
          "Agency Type": (item as any).agency_type || "N/A",
          "Village Name": item.village_name || "N/A",
          "ESR Name": item.esr_name || "N/A",
          "Water Supply": item.water_supply || "No",

          // Latest chlorine value
          "Latest Chlorine Value (mg/l)":
            latestChlorine !== null ? latestChlorine.toFixed(2) : "No data",
          Status: statusText,

          // Daily chlorine values with date headers
          [`Chlorine (${date1}) mg/l`]:
            item.chlorine_value_1 !== null &&
              item.chlorine_value_1 !== undefined
              ? Number(item.chlorine_value_1).toFixed(2)
              : "",
          [`Chlorine (${date2}) mg/l`]:
            item.chlorine_value_2 !== null &&
              item.chlorine_value_2 !== undefined
              ? Number(item.chlorine_value_2).toFixed(2)
              : "",
          [`Chlorine (${date3}) mg/l`]:
            item.chlorine_value_3 !== null &&
              item.chlorine_value_3 !== undefined
              ? Number(item.chlorine_value_3).toFixed(2)
              : "",
          [`Chlorine (${date4}) mg/l`]:
            item.chlorine_value_4 !== null &&
              item.chlorine_value_4 !== undefined
              ? Number(item.chlorine_value_4).toFixed(2)
              : "",
          [`Chlorine (${date5}) mg/l`]:
            item.chlorine_value_5 !== null &&
              item.chlorine_value_5 !== undefined
              ? Number(item.chlorine_value_5).toFixed(2)
              : "",
          [`Chlorine (${date6}) mg/l`]:
            item.chlorine_value_6 !== null &&
              item.chlorine_value_6 !== undefined
              ? Number(item.chlorine_value_6).toFixed(2)
              : "",
          [`Chlorine (${date7}) mg/l`]:
            item.chlorine_value_7 !== null &&
              item.chlorine_value_7 !== undefined
              ? Number(item.chlorine_value_7).toFixed(2)
              : "",

          // Analysis data
          "Days Below Range (<0.2 mg/l)": item.chlorine_less_than_02_mgl || 0,
          "Days Optimal Range (0.2-0.5 mg/l)":
            item.chlorine_between_02_05_mgl || 0,
          "Days Above Range (>0.5 mg/l)":
            item.chlorine_greater_than_05_mgl || 0,
          "Consistent Zero for 7 Days":
            item.number_of_consistent_zero_value_in_chlorine === 7
              ? "Yes"
              : "No",
        };
      });

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Chlorine Data");
      // Add header row
      const headerKeys =
        worksheetData.length > 0 ? Object.keys(worksheetData[0]) : [];
      worksheet.addRow(headerKeys);
      // Add data rows
      worksheetData.forEach((row) => {
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

      // Generate Excel file and trigger download
      const finalFilename = `${filename}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track the data export activity with detailed filter information
      const appliedFilters = {
        region: selectedRegion !== "all" ? selectedRegion : undefined,
        agencyType: selectedAgencyType !== 'ALL' ? selectedAgencyType : undefined,
        cardFilter:
          selectedCardFilter !== "all" ? selectedCardFilter : undefined,
        searchTerm: searchQuery || undefined,
        iotStatus:
          schemeStatusFilter !== "all" ? schemeStatusFilter : undefined,
      };

      // Clean up undefined values for tracking
      const cleanedFilters = Object.fromEntries(
        Object.entries(appliedFilters).filter(
          ([_, value]) => value !== undefined,
        ),
      );

      trackDataExport(
        "Chlorine Data",
        finalFilename,
        worksheetData.length,
        cleanedFilters,
        {
          exportSource: "chlorine_dashboard",
          totalRecordsAvailable: allChlorineData.length,
          filteredRecords: data.length,
        },
      );

      toast({
        title: "Export Successful",
        description: `${worksheetData.length} records exported to Excel`,
        duration: 3000,
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

  // Loading state for dashboard
  if (isLoadingChlorine || isLoadingStats || isLoadingRegions) {
    return (
      <div className="container mx-auto p-4">
        {/* <h1 className="text-2xl font-bold mb-6">Chlorine Monitoring Dashboard</h1> */}
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
  if (chlorineError) {
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">
            Failed to load chlorine data. Please try again later.
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
          <TranslatedText>Chlorine Dashboard</TranslatedText>
        </h1>
        <p className="text-gray-500 mt-1">
          <TranslatedText>
            Monitor residual chlorine levels across water schemes and ESRs
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

      {/* Filters Section - Grid-based layout like PressureDashboard */}
      <div className="bg-white rounded-xl shadow-sm mb-6 p-6 border border-blue-100">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">Agency Type</label>
          <AgencyTypeFilter
            selectedAgencyType={selectedAgencyType}
            onAgencyTypeChange={setSelectedAgencyType}
            className="w-full h-11"
          />
        </div>
      </div>

      {/* Search and Actions Row - Now part of its own container for consistency */}
      <div className="bg-white rounded-xl shadow-sm mb-6 p-6 border border-blue-100">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          {/* Search ESRs */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search ESRs
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                placeholder="Search by scheme, village or ESR name..."
                className="pl-9 pr-10 py-2 border-blue-200 focus:ring-blue-500 focus:border-blue-500 h-11"
                value={searchQuery}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchQuery(newValue);
                  setPage(1);
                  if (newValue.trim().length > 2) {
                    setTimeout(() => {
                      if (searchQuery === newValue) {
                        trackFilterUsage(
                          "search",
                          newValue,
                          filteredData.length,
                          "chlorine_dashboard",
                        );
                      }
                    }, 1000);
                  }
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

          {/* Action Buttons */}
          <div className="flex gap-2 md:self-end">
            <Button
              onClick={() =>
                exportToExcel(
                  filteredData,
                  `Chlorine_Data_${selectedRegion}_${selectedCardFilter}_${new Date().toISOString().split("T")[0]}`,
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

        {/* Historical Data Date Selection */}
        {showHistoricalData && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                  <span>Export to Excel ({historicalChlorineData.length})</span>
                </Button>
              </div>
            </div>

            {historicalChlorineData.length > 0 && (
              <div className="mt-3 text-sm text-green-700">
                Found {historicalChlorineData.length} historical records (
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
                {calculateChlorineSensorStatus.connected}
              </p>
              <p className="text-xs text-blue-600/70">
                Chlorine sensors connected
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
                {calculateChlorineSensorStatus.online}
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
                {calculateChlorineSensorStatus.offline}
              </p>
              <p className="text-xs text-orange-600/70">
                Connected but offline
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Sensors with Water Card - Clickable */}
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
                {calculateWithWaterRangeStats.total}
              </p>
              <p className="text-xs text-blue-600/70">
                Connected sensors with water
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Cards - Separated by Water Status */}
      <div className="grid gap-6 mb-8">
        {/* Main Range Cards - One Section */}
        <div className="grid gap-6 md:grid-cols-1">
          {/* With Water Section */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-blue-200">
            <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
              <Droplet className="h-6 w-6 text-blue-600 mr-2" />
              Sensors with Water
            </h3>
            <div className="grid gap-4 mb-4">
              {/* Total With Water - Now Clickable */}
              <div
                className={`cursor-pointer text-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-lg transition-all duration-200 ${sensorStatusFilter === "withWater" &&
                  selectedWithWaterFilter === "all"
                  ? "ring-2 ring-blue-500 ring-offset-2"
                  : ""
                  } transform hover:scale-[1.01]`}
                onClick={() => handleTotalCardClick("withWater")}
              >
                <p className="text-3xl font-bold text-blue-600">
                  {calculateWithWaterRangeStats.total}
                </p>
                <p className="text-sm text-blue-600/80 font-medium">
                  Total sensors with water
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {/* Below Range Card - With Water */}
              <Card
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedWithWaterFilter === "below_0.2"
                  ? "ring-2 ring-red-500 ring-offset-2"
                  : ""
                  } transform hover:scale-[1.01]`}
                onClick={() => handleWithWaterCardClick("below_0.2")}
              >
                <CardContent className="p-4 flex items-center">
                  <div className="bg-red-100 p-3 rounded-full mr-4">
                    <AlertTriangle className="h-5 w-5 text-red-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-800">Below Range</h4>
                    <p className="text-2xl font-bold text-red-600">
                      {calculateWithWaterRangeStats.belowRange || 0}
                    </p>
                    <p className="text-xs text-red-600/70">
                      Chlorine &lt;0.2mg/l
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Optimal Range Card - With Water */}
              <Card
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedWithWaterFilter === "between_0.2_0.5"
                  ? "ring-2 ring-green-500 ring-offset-2"
                  : ""
                  } transform hover:scale-[1.01]`}
                onClick={() => handleWithWaterCardClick("between_0.2_0.5")}
              >
                <CardContent className="p-4 flex items-center">
                  <div className="bg-green-100 p-3 rounded-full mr-4">
                    <CheckCircle className="h-5 w-5 text-green-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-800">
                      Optimal Range
                    </h4>
                    <p className="text-2xl font-bold text-green-600">
                      {calculateWithWaterRangeStats.optimal || 0}
                    </p>
                    <p className="text-xs text-green-600/70">
                      Chlorine 0.2-0.5mg/l
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Above Range Card - With Water */}
              <Card
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${selectedWithWaterFilter === "above_0.5"
                  ? "ring-2 ring-orange-500 ring-offset-2"
                  : ""
                  } transform hover:scale-[1.01]`}
                onClick={() => handleWithWaterCardClick("above_0.5")}
              >
                <CardContent className="p-4 flex items-center">
                  <div className="bg-orange-100 p-3 rounded-full mr-4">
                    <AlertCircle className="h-5 w-5 text-orange-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-800">
                      Above Range
                    </h4>
                    <p className="text-2xl font-bold text-orange-600">
                      {calculateWithWaterRangeStats.above || 0}
                    </p>
                    <p className="text-xs text-orange-600/70">
                      Chlorine &gt;0.5mg/l
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* No Data Info Card */}
              {calculateWithWaterRangeStats.noData > 0 && (
                <div
                  className="bg-gray-50 border border-gray-300 rounded-lg p-3"
                  data-testid="with-water-no-data-note"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-gray-500 mt-0.5">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-700">
                        <span className="font-bold">
                          {calculateWithWaterRangeStats.noData}
                        </span>{" "}
                        sensor
                        {calculateWithWaterRangeStats.noData !== 1
                          ? "s"
                          : ""}{" "}
                        with no chlorine data
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Numbers above exclude sensors with blank chlorine values
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Consistent Pattern Cards (For All Connected Sensors) */}

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
      <Card className="mb-6 shadow-md border-0">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col space-y-3">
            {/* Main Title */}
            <CardTitle className="flex items-center gap-2">
              {selectedCardFilter === "below_0.2" && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {selectedCardFilter === "between_0.2_0.5" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {selectedCardFilter === "above_0.5" && (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              {selectedCardFilter === "consistent_zero" && (
                <Activity className="h-5 w-5 text-gray-600" />
              )}
              {selectedCardFilter === "consistent_below" && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              {selectedCardFilter === "consistent_optimal" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {selectedCardFilter === "consistent_above" && (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              {getFilterTitle(selectedCardFilter)}
              <span className="ml-2 px-2 py-1 bg-blue-100 rounded-full text-blue-800 text-sm font-medium">
                {filteredData.length}{" "}
                {filteredData.length === 1 ? "ESR" : "ESRs"} found
              </span>
            </CardTitle>

            {/* Filter badges row */}
            {(commissionedFilter !== "all" ||
              fullyCompletedFilter !== "all" ||
              schemeStatusFilter !== "all") && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {commissionedFilter !== "all" && (
                    <div className="border px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                      {commissionedFilter === "Yes"
                        ? "Commissioned"
                        : commissionedFilter === "Water Supply"
                          ? "Water Supply"
                          : "Not Commissioned"}
                      :
                      <span className="font-bold ml-1">
                        {
                          filteredData.filter((item) => {
                            const status = schemeStatusData?.find(
                              (s) => s.scheme_id === item.scheme_id,
                            );
                            if (commissionedFilter === "Water Supply") {
                              return status && status.water_supply === "Yes";
                            }
                            return (
                              status &&
                              status.mjp_commissioned === commissionedFilter
                            );
                          }).length
                        }
                      </span>
                    </div>
                  )}

                  {fullyCompletedFilter !== "all" && (
                    <div className="border px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                      {fullyCompletedFilter}:
                      <span className="font-bold ml-1">
                        {
                          filteredData.filter((item) => {
                            const status = schemeStatusData?.find(
                              (s) => s.scheme_id === item.scheme_id,
                            );
                            return (
                              status &&
                              status.mjp_fully_completed === fullyCompletedFilter
                            );
                          }).length
                        }
                      </span>
                    </div>
                  )}

                  {schemeStatusFilter !== "all" && (
                    <div className="border px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
                      {schemeStatusFilter === "Connected"
                        ? "Connected"
                        : schemeStatusFilter}
                      :
                      <span className="font-bold ml-1">
                        {
                          filteredData.filter((item) => {
                            const status = schemeStatusData?.find(
                              (s) => s.scheme_id === item.scheme_id,
                            );
                            return (
                              status &&
                              (schemeStatusFilter === "Connected"
                                ? status.fully_completion_scheme_status !==
                                "Not-Connected"
                                : status.fully_completion_scheme_status ===
                                schemeStatusFilter)
                            );
                          }).length
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No Data Found
              </h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                No ESR data matching the selected criteria. Try changing your
                filters or search terms.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md">
                {/* Results count */}
                <div className="mb-4 text-sm text-gray-600 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  {!isLoadingChlorine && (
                    <>
                      <div className="flex items-center">
                        <span className="font-semibold">
                          {filteredData.length}
                        </span>
                        <span className="ml-1">
                          {filteredData.length === 1 ? "ESR" : "ESRs"} found
                        </span>
                        {(selectedCardFilter !== "all" ||
                          selectedRegion !== "all" ||
                          commissionedFilter !== "all" ||
                          fullyCompletedFilter !== "all" ||
                          schemeStatusFilter !== "all") && (
                            <span className="ml-1">with applied filters</span>
                          )}
                      </div>

                      {/* Filter details */}
                      <div className="mt-2 sm:mt-0 text-xs flex flex-wrap gap-2">
                        {commissionedFilter !== "all" && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                            {commissionedFilter === "Yes"
                              ? "Commissioned"
                              : "Not Commissioned"}
                            :
                            <span className="font-semibold ml-1">
                              {
                                filteredData.filter((item) => {
                                  const status = schemeStatusData?.find(
                                    (s) => s.scheme_id === item.scheme_id,
                                  );
                                  return (
                                    status &&
                                    status.mjp_commissioned ===
                                    commissionedFilter
                                  );
                                }).length
                              }
                            </span>
                          </span>
                        )}

                        {fullyCompletedFilter !== "all" && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md">
                            {fullyCompletedFilter}:
                            <span className="font-semibold ml-1">
                              {
                                filteredData.filter((item) => {
                                  const status = schemeStatusData?.find(
                                    (s) => s.scheme_id === item.scheme_id,
                                  );
                                  return (
                                    status &&
                                    status.mjp_fully_completed ===
                                    fullyCompletedFilter
                                  );
                                }).length
                              }
                            </span>
                          </span>
                        )}

                        {schemeStatusFilter !== "all" && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md">
                            {schemeStatusFilter === "Connected"
                              ? "Connected"
                              : schemeStatusFilter}
                            :
                            <span className="font-semibold ml-1">
                              {
                                filteredData.filter((item) => {
                                  const status = schemeStatusData?.find(
                                    (s) => s.scheme_id === item.scheme_id,
                                  );
                                  return (
                                    status &&
                                    (schemeStatusFilter === "Connected"
                                      ? status.fully_completion_scheme_status !==
                                      "Not-Connected"
                                      : status.fully_completion_scheme_status ===
                                      schemeStatusFilter)
                                  );
                                }).length
                              }
                            </span>
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Table className="border-collapse">
                  <TableHeader className="bg-blue-50">
                    <TableRow className="chlorine-item hover:bg-blue-100">
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
                        ESR Name
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Latest Chlorine (mg/l)
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        PI Vision
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Remark
                      </TableHead>
                      <TableHead className="font-semibold text-blue-800 border-b border-blue-200">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => {
                      const latestValue = getCurrentChlorineValue(item);
                      const { className, statusText, textColor, icon } =
                        getChlorineStatusInfo(latestValue);

                      // Get the latest date
                      let latestDate = null;
                      for (const day of [7, 6, 5, 4, 3, 2, 1]) {
                        const dateValue =
                          item[
                          `chlorine_date_day_${day}` as keyof ChlorineData
                          ];
                        if (dateValue) {
                          latestDate = dateValue;
                          break;
                        }
                      }

                      // Get row variant based on chlorine value
                      let rowVariantClass = "";
                      if (latestValue !== null) {
                        if (latestValue < 0.2)
                          rowVariantClass = "bg-red-50/40 hover:bg-red-50";
                        else if (latestValue >= 0.2 && latestValue <= 0.5)
                          rowVariantClass = "hover:bg-green-50";
                        else
                          rowVariantClass =
                            "bg-orange-50/40 hover:bg-orange-50";
                      }

                      // Add alternating row colors
                      const isEven = index % 2 === 0;
                      const baseRowClass = isEven ? "bg-white" : "bg-blue-50";

                      // Lookup active issues for this ESR
                      const esrKey = `${item.scheme_id}-${item.village_name}-${item.esr_name}`;
                      const esrIssues = esrIssuesMap?.get(esrKey) || [];

                      return (
                        <TableRow
                          key={`${item.scheme_id}-${item.village_name}-${item.esr_name}-${index}`}
                          className={`chlorine-item ${baseRowClass} hover:bg-blue-100`}
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
                              <span>{item.esr_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium border-b border-blue-200">
                            {latestValue !== null ? (
                              <span
                                className={
                                  latestValue < 0.2
                                    ? "text-red-600"
                                    : latestValue > 0.5
                                      ? "text-orange-600"
                                      : "text-green-600"
                                }
                              >
                                {latestValue.toFixed(2)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell className="border-b border-blue-200">
                            <Badge
                              className={`${className} ${textColor} flex items-center gap-1 w-fit shadow-sm border`}
                            >
                              {icon} {statusText}
                            </Badge>
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
                                    "PI Vision Chlorine Dashboard",
                                  );
                                  window.open(item.dashboard_url, "_blank");
                                }}
                              >
                                <BarChart className="h-3.5 w-3.5 mr-1" /> View
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">
                                Not available
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium border-b border-blue-200 max-w-[150px]">
                            {esrIssues.length > 0 ? (
                              <Button
                                variant="ghost"
                                className="h-auto p-1 max-w-full justify-start text-red-600 font-medium text-[11px] hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRemarkDetails({ issues: esrIssues, title: `Issues for ${item.esr_name}, ${item.village_name}` });
                                }}
                              >
                                <span className="truncate w-full text-left">
                                  {esrIssues.map((i: any) => i.reason).join(", ")}
                                </span>
                              </Button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="border-b border-blue-200">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-full"
                                  onClick={() => setSelectedESR(item)}
                                >
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto bg-white">
                                {selectedESR && (
                                  <>
                                    <DialogHeader>
                                      <DialogTitle className="text-xl font-bold flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                                            <span className="font-bold text-teal-600">
                                              Cl
                                            </span>
                                          </div>
                                          <span>
                                            {selectedESR.esr_name} -{" "}
                                            {selectedESR.village_name}
                                          </span>
                                          {selectedESR.dashboard_url && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="ml-2 text-xs"
                                              onClick={() => {
                                                trackDashboardAccess(
                                                  selectedESR.dashboard_url!,
                                                  "PI Vision Chlorine Dashboard Detail",
                                                );
                                                window.open(
                                                  selectedESR.dashboard_url,
                                                  "_blank",
                                                );
                                              }}
                                            >
                                              <BarChart className="h-4 w-4 mr-1" />{" "}
                                              PI Vision Dashboard
                                            </Button>
                                          )}
                                        </div>
                                      </DialogTitle>
                                      <DialogDescription>
                                        Detailed chlorine monitoring data for
                                        this ESR
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-teal-50/50 rounded-lg p-4 border border-teal-100">
                                          <h3 className="text-sm font-medium text-teal-800 mb-3">
                                            ESR Information
                                          </h3>

                                          <div className="space-y-3">
                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Region
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.region}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Scheme ID
                                              </span>
                                              <span className="font-medium font-mono">
                                                {selectedESR.scheme_id}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Scheme
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.scheme_name}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Village
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.village_name}
                                              </span>
                                            </div>

                                            <div className="flex justify-between items-center border-b border-teal-100 pb-2">
                                              <span className="text-sm text-teal-700">
                                                Sensor ID
                                              </span>
                                              <span className="font-medium">
                                                {selectedESR.sensor_id || "N/A"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-teal-50 to-white rounded-lg p-4 border border-teal-100 flex flex-col">
                                          <h3 className="text-sm font-medium text-teal-800 mb-3">
                                            Current Status
                                          </h3>

                                          {(() => {
                                            const latestValue =
                                              getCurrentChlorineValue(
                                                selectedESR,
                                              );
                                            const {
                                              className,
                                              statusText,
                                              textColor,
                                              icon,
                                            } =
                                              getChlorineStatusInfo(
                                                latestValue,
                                              );

                                            let statusBgClass = "bg-gray-100";
                                            let statusTextClass =
                                              "text-gray-800";

                                            if (latestValue !== null) {
                                              if (latestValue < 0.2) {
                                                statusBgClass = "bg-red-100";
                                                statusTextClass =
                                                  "text-red-800";
                                              } else if (
                                                latestValue >= 0.2 &&
                                                latestValue <= 0.5
                                              ) {
                                                statusBgClass = "bg-green-100";
                                                statusTextClass =
                                                  "text-green-800";
                                              } else {
                                                statusBgClass = "bg-orange-100";
                                                statusTextClass =
                                                  "text-orange-800";
                                              }
                                            }

                                            return (
                                              <div
                                                className={`${statusBgClass} rounded-lg p-4 flex-1 flex flex-col justify-center items-center`}
                                              >
                                                <div className="flex items-center gap-2 mb-2">
                                                  {icon}
                                                  <span
                                                    className={`text-lg font-bold ${statusTextClass}`}
                                                  >
                                                    {statusText}
                                                  </span>
                                                </div>

                                                <div className="text-4xl font-bold mb-2">
                                                  {latestValue !== null ? (
                                                    <span
                                                      className={
                                                        statusTextClass
                                                      }
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
                                                  mg/l
                                                </div>

                                                <div className="mt-4 text-xs text-gray-600">
                                                  Target Range: 0.2-0.5 mg/l
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      <div className="border-t border-gray-200 pt-6">
                                        <h3 className="font-medium text-lg mb-4 text-teal-800 flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                                            <div className="h-3 w-3 text-teal-600 text-[10px] font-bold">
                                              Cl
                                            </div>
                                          </div>
                                          7-Day Chlorine History
                                        </h3>
                                        <div className="grid grid-cols-7 gap-3">
                                          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                            const value =
                                              selectedESR[
                                              `chlorine_value_${day}` as keyof ChlorineData
                                              ];
                                            const numValue =
                                              value !== undefined &&
                                                value !== null
                                                ? Number(value)
                                                : null;
                                            const dateValue =
                                              selectedESR[
                                              `chlorine_date_day_${day}` as keyof ChlorineData
                                              ];
                                            const {
                                              className: dayClassName,
                                              statusText,
                                              textColor,
                                            } = getChlorineStatusInfo(numValue);

                                            let cardBgClass =
                                              "bg-white border-gray-200";
                                            let valueTextClass =
                                              "text-gray-400";

                                            if (numValue !== null) {
                                              if (numValue < 0.2) {
                                                cardBgClass =
                                                  "bg-gradient-to-br from-red-50 to-white border-red-200";
                                                valueTextClass = "text-red-600";
                                              } else if (
                                                numValue >= 0.2 &&
                                                numValue <= 0.5
                                              ) {
                                                cardBgClass =
                                                  "bg-gradient-to-br from-green-50 to-white border-green-200";
                                                valueTextClass =
                                                  "text-green-600";
                                              } else {
                                                cardBgClass =
                                                  "bg-gradient-to-br from-orange-50 to-white border-orange-200";
                                                valueTextClass =
                                                  "text-orange-600";
                                              }
                                            }

                                            return (
                                              <div
                                                key={`chlorine-day-${day}`}
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

                                      {/* Add 7-Day Analysis section */}
                                      <div className="border-t border-gray-200 pt-6 mt-6">
                                        <h3 className="font-medium text-lg mb-4 text-teal-800 flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                                            <div className="h-3 w-3 text-teal-600 text-[10px] font-bold">
                                              Cl
                                            </div>
                                          </div>
                                          7-Day Analysis
                                        </h3>
                                        <div className="grid grid-cols-4 gap-4">
                                          <div className="bg-red-50 p-4 rounded-md border border-red-100 text-center">
                                            <div className="text-sm text-red-700 mb-1">
                                              Below Range Days
                                            </div>
                                            <div className="font-semibold text-2xl text-red-600">
                                              {(() => {
                                                let count = 0;
                                                for (
                                                  let day = 1;
                                                  day <= 7;
                                                  day++
                                                ) {
                                                  const value =
                                                    selectedESR[
                                                    `chlorine_value_${day}` as keyof ChlorineData
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
                                            </div>
                                          </div>

                                          <div className="bg-green-50 p-4 rounded-md border border-green-100 text-center">
                                            <div className="text-sm text-green-700 mb-1">
                                              Optimal Range Days
                                            </div>
                                            <div className="font-semibold text-2xl text-green-600">
                                              {(() => {
                                                let count = 0;
                                                for (
                                                  let day = 1;
                                                  day <= 7;
                                                  day++
                                                ) {
                                                  const value =
                                                    selectedESR[
                                                    `chlorine_value_${day}` as keyof ChlorineData
                                                    ];
                                                  const numValue =
                                                    value !== undefined &&
                                                      value !== null
                                                      ? Number(value)
                                                      : null;
                                                  if (
                                                    numValue !== null &&
                                                    numValue >= 0.2 &&
                                                    numValue <= 0.5
                                                  ) {
                                                    count++;
                                                  }
                                                }
                                                return count;
                                              })()}
                                            </div>
                                          </div>

                                          <div className="bg-orange-50 p-4 rounded-md border border-orange-100 text-center">
                                            <div className="text-sm text-orange-700 mb-1">
                                              Above Range Days
                                            </div>
                                            <div className="font-semibold text-2xl text-orange-600">
                                              {(() => {
                                                let count = 0;
                                                for (
                                                  let day = 1;
                                                  day <= 7;
                                                  day++
                                                ) {
                                                  const value =
                                                    selectedESR[
                                                    `chlorine_value_${day}` as keyof ChlorineData
                                                    ];
                                                  const numValue =
                                                    value !== undefined &&
                                                      value !== null
                                                      ? Number(value)
                                                      : null;
                                                  if (
                                                    numValue !== null &&
                                                    numValue > 0.5
                                                  ) {
                                                    count++;
                                                  }
                                                }
                                                return count;
                                              })()}
                                            </div>
                                          </div>

                                          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-center">
                                            <div className="text-sm text-gray-700 mb-1">
                                              Zero Chlorine Days
                                            </div>
                                            <div className="font-semibold text-2xl text-gray-600">
                                              {(() => {
                                                let count = 0;
                                                for (
                                                  let day = 1;
                                                  day <= 7;
                                                  day++
                                                ) {
                                                  const value =
                                                    selectedESR[
                                                    `chlorine_value_${day}` as keyof ChlorineData
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
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Add PI Vision Dashboard section */}
                                      {selectedESR.dashboard_url && (
                                        <div className="border-t border-gray-200 pt-6 mt-6">
                                          <h3 className="font-medium text-lg mb-4 text-blue-800 flex items-center gap-2">
                                            <BarChart className="h-5 w-5 text-blue-600" />
                                            PI Vision Dashboard
                                          </h3>
                                          <p className="text-sm text-gray-600 mb-4">
                                            View detailed historical chlorine
                                            data in PI Vision
                                          </p>
                                          <Button
                                            variant="outline"
                                            onClick={() =>
                                              window.open(
                                                selectedESR.dashboard_url,
                                                "_blank",
                                              )
                                            }
                                            className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                          >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open Dashboard
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={
                            page === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          // Show first, last, current, and pages around current
                          let pageToShow;
                          if (totalPages <= 5) {
                            pageToShow = i + 1;
                          } else if (page <= 3) {
                            pageToShow = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageToShow = totalPages - 4 + i;
                          } else {
                            pageToShow = page - 2 + i;
                          }

                          if (pageToShow <= totalPages) {
                            return (
                              <PaginationItem key={pageToShow}>
                                <PaginationLink
                                  isActive={page === pageToShow}
                                  onClick={() => setPage(pageToShow)}
                                >
                                  {pageToShow}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          return null;
                        },
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={
                            page === totalPages
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

      {/* Remark Details Dialog */}
      {
        selectedRemarkDetails && (
          <Dialog
            open={!!selectedRemarkDetails}
            onOpenChange={(open) => !open && setSelectedRemarkDetails(null)}
          >
            <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-6 flex justify-between items-center text-white relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 flex-1 pr-6">
                  <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-200" />
                    <span className="tracking-tight">Issue Details</span>
                  </DialogTitle>
                  <DialogDescription className="text-red-100 mt-2 font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedRemarkDetails?.title}</span>
                  </DialogDescription>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50">
                <div className="space-y-4">
                  {selectedRemarkDetails?.issues.map((issue: any, index: number) => (
                    <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
                              {issue.problem_level ? `${issue.problem_level} Level`.toUpperCase() : (issue.category || "General")}
                            </span>
                          </div>
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }

    </div>

  );
};

export default ChlorineDashboard;