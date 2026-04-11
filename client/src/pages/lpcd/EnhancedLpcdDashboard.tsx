import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import GeographicalFilters from "@/components/dashboard/GeographicalFilters";
import AgencyTypeFilter from "@/components/dashboard/AgencyTypeFilter";
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  FilterX,
  RefreshCw,
  X,
  BarChart,
  BarChart2 as BarChart3,
  BarChartHorizontal as ChartBarOff,
  Droplets,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  History,
  TrendingUp,
  AlertCircle,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination } from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import FilterBar from "@/components/dashboard/FilterBar";

// Types
export interface WaterSchemeData {
  // ... existing types
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  population: number;
  number_of_esr: number;
  water_value_day1: number;
  water_value_day2: number;
  water_value_day3: number;
  water_value_day4: number;
  water_value_day5: number;
  water_value_day6: number;
  water_value_day7: number;
  lpcd_value_day1: number;
  lpcd_value_day2: number;
  lpcd_value_day3: number;
  lpcd_value_day4: number;
  lpcd_value_day5: number;
  lpcd_value_day6: number;
  lpcd_value_day7: number;
  water_date_day1: string;
  water_date_day2: string;
  water_date_day3: string;
  water_date_day4: string;
  water_date_day5: string;
  water_date_day6: string;
  water_date_day7: string;
  lpcd_date_day1: string;
  lpcd_date_day2: string;
  lpcd_date_day3: string;
  lpcd_date_day4: string;
  lpcd_date_day5: string;
  lpcd_date_day6: string;
  lpcd_date_day7: string;
  consistent_zero_lpcd_for_a_week: number;
  below_55_lpcd_count: number;
  above_55_lpcd_count: number;
  dashboard_url?: string;
  mjp_commissioned?: string;
  mjp_fully_completed?: string;
  fully_completion_scheme_status?: string;
  water_supply?: string;
  remark?: string;
}

export interface RegionData {
  region_id: number;
  region_name: string;
}

type LpcdRange =
  | "all"
  | "above55"
  | "below55"
  | "45to55"
  | "35to45"
  | "25to35"
  | "15to25"
  | "0to15"
  | "noSupply" // Filter for villages with 0 water supply
  | "consistentZeroWaterSupply" // Filter for villages with consistent 0 water supply for all 7 days
  | "consistentWaterSupply" // Filter for villages with consistent water supply (all days > 0)
  | "55to60"
  | "60to65"
  | "65to70"
  | "70to75" // Range for LPCD between 70-75
  | "75to80" // Range for LPCD between 75-80
  | "above80" // Range for LPCD above 80
  | "above70"
  | "consistentlyAbove55"
  | "consistentlyBelow55";

const EnhancedLpcdDashboard = () => {
  const { toast } = useToast();
  // ... existing hooks
  const {
    trackPageVisit,
    trackDataExport,
    trackFilterUsage,
    trackFileDownload,
  } = useComprehensiveActivityTracker();
  const [location] = useLocation();

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCircle, setSelectedCircle] = useState("all");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState("all");
  const [selectedAgencyType, setSelectedAgencyType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState<LpcdRange>("all");
  const [schemeStatusFilter, setSchemeStatusFilter] = useState("all");
  const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("commissioned");
  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");

  const schemeFilter = uiSchemeFilter === "commissioned" && waterSupplyStatus !== "All"
    ? `commissioned_${waterSupplyStatus.toLowerCase()}`
    : uiSchemeFilter;

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Historical data state
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [latestWaterDate, setLatestWaterDate] = useState<string | null>(null);
  const [historicalStartDate, setHistoricalStartDate] = useState("");
  const [historicalEndDate, setHistoricalEndDate] = useState("");
  const [isExportingHistorical, setIsExportingHistorical] = useState(false);
  const [isCountingRecords, setIsCountingRecords] = useState(false);
  const [historicalRecordCount, setHistoricalRecordCount] = useState(0);
  const [lastQueriedDates, setLastQueriedDates] = useState<{
    start: string;
    end: string;
    region: string;
  } | null>(null);

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
  const { schemeIssuesMap, villageIssuesMap } = useMemo(() => {
    const sMap = new Map<string, any[]>();
    const vMap = new Map<string, any[]>();

    activeIssues.forEach((issue: any) => {
      // Scheme level issues
      if (issue.scheme_id && issue.problem_level === "Scheme") {
        if (!sMap.has(issue.scheme_id)) {
          sMap.set(issue.scheme_id, []);
        }
        sMap.get(issue.scheme_id)?.push(issue);
      }
      // Village level issues only
      if (issue.scheme_id && issue.village_name && issue.problem_level === "Village") {
        const key = `${issue.scheme_id}-${issue.village_name}`;
        if (!vMap.has(key)) {
          vMap.set(key, []);
        }
        vMap.get(key)?.push(issue);
      }
    });

    return { schemeIssuesMap: sMap, villageIssuesMap: vMap };
  }, [activeIssues]);

  // ... existing code ...

  // ... inside TableBody ...

  useEffect(() => {
    const queryString = location.includes("?") ? location.split("?")[1] : "";
    const urlParams = new URLSearchParams(queryString);
    const regionParam = urlParams.get("region");
    const rangeParam = urlParams.get("range");

    console.log("LPCD Dashboard URL parsing:", {
      location,
      queryString,
      regionParam,
      rangeParam,
    });

    if (regionParam) {
      console.log("Setting region filter to:", regionParam);
      setSelectedRegion(regionParam);
    }

    if (rangeParam) {
      // Map dashboard categories to LPCD filter values
      const rangeMapping: { [key: string]: LpcdRange } = {
        "consistent-water": "consistentWaterSupply",
        "zero-water": "consistentZeroWaterSupply",
        "above-55-lpcd": "above55",
        "below-55-lpcd": "below55",
        "consistent-above-55": "consistentlyAbove55",
        "consistent-below-55": "consistentlyBelow55",
      };

      const mappedFilter = rangeMapping[rangeParam] || "all";
      console.log("Mapping range param:", rangeParam, "→", mappedFilter);
      setCurrentFilter(mappedFilter);
    }
  }, [location]);

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Village LPCD Dashboard");
  }, [trackPageVisit]);

  // Cascading Filter Handlers
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
      "/api/schemes/filters",
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
      if (selectedAgencyType !== "ALL")
        params.append("agencyType", selectedAgencyType);

      const response = await fetch(`/api/schemes/filters?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch filter options");
      return response.json();
    },
  });

  // Fetch all water scheme data
  const {
    data: allWaterSchemeData = [],
    isLoading: isLoadingSchemes,
    error: schemesError,
    refetch,
  } = useQuery<WaterSchemeData[]>({
    queryKey: [
      "/api/water-scheme-data",
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
      if (selectedAgencyType !== "ALL") {
        params.append("agencyType", selectedAgencyType);
      }

      if (schemeFilter !== "all") {
        params.append("filterType", schemeFilter);
      }
      if (schemeFilter === "fully_completed") {
        params.append("fullyCompleted", "true");
      }

      const queryString = params.toString();
      const url = `/api/water-scheme-data${queryString ? `?${queryString}` : ""
        }`;

      console.log("Fetching LPCD data with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch LPCD data");
      }

      const data = await response.json();
      console.log(`Received ${data.length} LPCD records`);
      return data;
    },
  });

  // Listen for filter changes from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Enhanced LPCD Dashboard received region filter:", region);
      const newRegion = region === "all" ? "all" : region;
      handleRegionChange(newRegion);
    };

    const handleMjpCommissionedFilterChange = (event: CustomEvent) => {
      const { mjpCommissioned } = event.detail;
      console.log(
        "Enhanced LPCD Dashboard received MJP commissioned filter:",
        mjpCommissioned,
      );
      setUiSchemeFilter(mjpCommissioned ? "commissioned" : "all");
      setPage(1);
    };

    const handleMjpFullyCompletedFilterChange = (event: CustomEvent) => {
      const { mjpFullyCompleted } = event.detail;
      console.log(
        "Enhanced LPCD Dashboard received MJP fully completed filter:",
        mjpFullyCompleted,
      );
      setUiSchemeFilter(mjpFullyCompleted ? "fully_completed" : "all");
      setPage(1);
    };

    const handleStatusFilterChange = (event: CustomEvent) => {
      const { status } = event.detail;
      console.log("Enhanced LPCD Dashboard received status filter:", status);
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
      setPage(1);
    };

    const handleChatbotRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log(
        "Enhanced LPCD Dashboard received chatbot region filter:",
        region,
      );
      handleRegionChange(region === "all" ? "all" : region);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Enhanced LPCD Dashboard received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "lpcd") {
        // Wait for data to be filtered properly
        setTimeout(() => {
          if (allWaterSchemeData && allWaterSchemeData.length > 0) {
            exportToExcel();
            console.log(
              "Excel export triggered for LPCD data with",
              allWaterSchemeData.length,
              "total records",
            );
          } else {
            console.log("No LPCD data available for export");
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
      "chatbot-region-filter",
      handleChatbotRegionFilter as EventListener,
    );
    window.addEventListener(
      "chatbot-export-excel",
      handleChatbotExcelExport as EventListener,
    );
    window.addEventListener(
      "mjpFullyCompletedFilterChange",
      handleMjpFullyCompletedFilterChange as EventListener,
    );
    window.addEventListener(
      "statusFilterChange",
      handleStatusFilterChange as EventListener,
    );

    // Expose export function globally for chatbot
    (window as any).triggerDashboardExport = () => {
      return new Promise<void>((resolve) => {
        exportToExcel();
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
  }, [allWaterSchemeData, selectedRegion, selectedCircle, selectedDivision, selectedSubdivision, selectedBlock, currentFilter, selectedAgencyType]);

  // Fetch region data
  const { data: regionsData = [], isLoading: isLoadingRegions } = useQuery<
    RegionData[]
  >({
    queryKey: ["/api/regions"],
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
        if (selectedAgencyType !== "ALL") {
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

  // Function to count historical records without loading all data
  const countHistoricalRecords = async () => {
    if (!historicalStartDate || !historicalEndDate) {
      return;
    }

    setIsCountingRecords(true);
    setHistoricalRecordCount(0);

    try {
      const params = new URLSearchParams();
      params.append("startDate", historicalStartDate);
      params.append("endDate", historicalEndDate);
      params.append("countOnly", "true"); // Special param to only get count

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      if (selectedAgencyType !== "ALL") {
        params.append("agencyType", selectedAgencyType);
      }

      const url = `/api/water-scheme-data/historical?${params.toString()}`;
      console.log("🔢 Counting historical LPCD records with URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to count historical LPCD data");
      }

      const data = await response.json();
      const count = data.count || 0;

      console.log(`✅ Found ${count} historical LPCD records for date range`);
      setHistoricalRecordCount(count);

      setLastQueriedDates({
        start: historicalStartDate,
        end: historicalEndDate,
        region: selectedRegion,
      });

      toast({
        title: "Records Found",
        description: `Found ${count.toLocaleString()} historical records ready to export`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error counting historical records:", error);
      toast({
        title: "Count Failed",
        description: "Failed to count historical records. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCountingRecords(false);
    }
  };

  // Get latest LPCD value
  const getLatestLpcdValue = (scheme: WaterSchemeData): number | null => {
    // Try to get the latest non-null value
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = scheme[`lpcd_value_day${day}` as keyof WaterSchemeData];
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isNaN(Number(value))
      ) {
        return Number(value);
      }
    }
    return null;
  };

  // Get latest water supply value
  const getLatestWaterSupplyValue = (
    scheme: WaterSchemeData,
  ): number | null => {
    // Try to get the latest non-null water supply value, starting with day 7
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = scheme[`water_value_day${day}` as keyof WaterSchemeData];
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isNaN(Number(value))
      ) {
        return Number(value);
      }
    }
    return null;
  };

  // Check if a scheme has zero water supply for the current day
  const hasNoCurrentWaterSupply = (scheme: WaterSchemeData): boolean => {
    // Get the most recent water supply value
    const currentWaterSupply = getLatestLpcdValue(scheme);

    // Return true if it's explicitly 0
    return currentWaterSupply !== null && currentWaterSupply === 0;
  };

  // Check if a scheme has consistent zero water supply for all 7 days
  const hasConsistentZeroWaterSupply = (scheme: WaterSchemeData): boolean => {
    const waterValues = [
      scheme.water_value_day1,
      scheme.water_value_day2,
      scheme.water_value_day3,
      scheme.water_value_day4,
      scheme.water_value_day5,
      scheme.water_value_day6,
      scheme.water_value_day7,
    ];

    // Check if all water values are 0 (excluding null/undefined)
    return waterValues.every((value) => {
      if (value === null || value === undefined) return false;
      return Number(value) === 0;
    });
  };

  // Check if a scheme has consistent water supply for all 7 days (all values > 0)
  const hasConsistentWaterSupply = (scheme: WaterSchemeData): boolean => {
    const waterValues = [
      scheme.water_value_day1,
      scheme.water_value_day2,
      scheme.water_value_day3,
      scheme.water_value_day4,
      scheme.water_value_day5,
      scheme.water_value_day6,
      scheme.water_value_day7,
    ];

    // Check if all water values are greater than 0 (excluding null/undefined)
    return waterValues.every((value) => {
      if (value === null || value === undefined) return false;
      return Number(value) > 0;
    });
  };

  // Extract all LPCD values
  const extractLpcdValues = (scheme: WaterSchemeData): number[] => {
    return [
      scheme.lpcd_value_day1,
      scheme.lpcd_value_day2,
      scheme.lpcd_value_day3,
      scheme.lpcd_value_day4,
      scheme.lpcd_value_day5,
      scheme.lpcd_value_day6,
      scheme.lpcd_value_day7,
    ]
      .filter((val) => val !== undefined && val !== null && !isNaN(Number(val)))
      .map((val) => Number(val));
  };

  // Check if all values are consistently above/below threshold
  const isConsistentlyAboveThreshold = (
    scheme: WaterSchemeData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val > threshold);
  };

  const isConsistentlyBelowThreshold = (
    scheme: WaterSchemeData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val < threshold);
  };

  // Get globally filtered data for card statistics
  const getGloballyFilteredSchemes = () => {
    if (!allWaterSchemeData) return [];

    let filtered = [...allWaterSchemeData];

    // Apply search query filter (for scheme name or village name)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (scheme) =>
          scheme.scheme_name?.toLowerCase().includes(query) ||
          scheme.village_name?.toLowerCase().includes(query),
      );
    }

    // Create a map of scheme IDs to their scheme status data for filtering
    const schemeStatusMap = new Map();
    if (schemeStatusData && schemeStatusData.length > 0) {
      schemeStatusData.forEach((status) => {
        schemeStatusMap.set(status.scheme_id, status);
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
  };

  // Apply filters for table display (global filters + card selection)
  const getFilteredSchemes = () => {
    // Start with globally filtered data
    let filtered = getGloballyFilteredSchemes();

    // Apply LPCD range filter based on card selection
    switch (currentFilter) {
      case "all":
        // No additional filtering needed
        break;
      case "above55":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 55;
        });
        break;
      case "below55":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue > 0 && lpcdValue < 55;
        });
        break;
      case "45to55":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 45 && lpcdValue < 55;
        });
        break;
      case "35to45":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 35 && lpcdValue < 45;
        });
        break;
      case "25to35":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 25 && lpcdValue < 35;
        });
        break;
      case "15to25":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 15 && lpcdValue < 25;
        });
        break;
      case "0to15":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 0 && lpcdValue < 15;
        });
        break;
      case "noSupply":
        filtered = filtered.filter((scheme) => hasNoCurrentWaterSupply(scheme));
        break;
      case "55to60":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 55 && lpcdValue < 60;
        });
        break;
      case "60to65":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 60 && lpcdValue < 65;
        });
        break;
      case "65to70":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 65 && lpcdValue < 70;
        });
        break;
      case "70to75":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 70 && lpcdValue < 75;
        });
        break;
      case "75to80":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 75 && lpcdValue < 80;
        });
        break;
      case "above80":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 80;
        });
        break;
      case "above70":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 70;
        });
        break;
      case "consistentlyAbove55":
        filtered = filtered.filter((scheme) =>
          isConsistentlyAboveThreshold(scheme, 55),
        );
        break;
      case "consistentlyBelow55":
        filtered = filtered.filter((scheme) =>
          isConsistentlyBelowThreshold(scheme, 55),
        );
        break;
      case "consistentZeroWaterSupply":
        filtered = filtered.filter((scheme) =>
          hasConsistentZeroWaterSupply(scheme),
        );
        break;
      case "consistentWaterSupply":
        filtered = filtered.filter((scheme) =>
          hasConsistentWaterSupply(scheme),
        );
        break;
    }

    return filtered;
  };

  // Calculate filter counts using globally filtered data without deduplication
  const getFilterCounts = () => {
    // Get the globally filtered data for calculating card statistics
    const globallyFilteredData = getGloballyFilteredSchemes();

    const counts = {
      total: 0,
      above55: 0,
      below55: 0,
      totalPopulation: 0,
      above55Population: 0,
      below55Population: 0,
      ranges: {
        "45to55": 0,
        "35to45": 0,
        "25to35": 0,
        "15to25": 0,
        "0to15": 0,
        "55to60": 0,
        "60to65": 0,
        "65to70": 0,
        "70to75": 0,
        "75to80": 0,
        above80: 0,
        above70: 0,
      },
      consistentlyAbove55: 0,
      consistentlyBelow55: 0,
      consistentZeroWaterSupply: 0,
      consistentWaterSupply: 0,
    };

    if (globallyFilteredData.length === 0) return counts;

    // Count all records (including duplicates from different blocks)
    counts.total = globallyFilteredData.length;

    // Count all village records in each category (no deduplication)
    globallyFilteredData.forEach((scheme) => {
      const lpcdValue = getLatestLpcdValue(scheme);
      const population = scheme.population ? Number(scheme.population) : 0;

      // Add to total population
      counts.totalPopulation += population;

      // Count all entries into above/below categories
      // If lpcdValue > 55, it's above55, otherwise (null, 0, or < 55) it's below55
      if (lpcdValue !== null && lpcdValue >= 55) {
        counts.above55++;
        counts.above55Population += population;
      } else {
        counts.below55++;
        counts.below55Population += population;
      }

      // Skip further categorization if null
      if (lpcdValue === null) return;

      // LPCD ranges (below 55)
      if (lpcdValue >= 45 && lpcdValue < 55) {
        counts.ranges["45to55"]++;
      } else if (lpcdValue >= 35 && lpcdValue < 45) {
        counts.ranges["35to45"]++;
      } else if (lpcdValue >= 25 && lpcdValue < 35) {
        counts.ranges["25to35"]++;
      } else if (lpcdValue >= 15 && lpcdValue < 25) {
        counts.ranges["15to25"]++;
      } else if (lpcdValue >= 0 && lpcdValue < 15) {
        counts.ranges["0to15"]++;
      }

      // LPCD ranges (above 55)
      if (lpcdValue >= 55 && lpcdValue < 60) {
        counts.ranges["55to60"]++;
      } else if (lpcdValue >= 60 && lpcdValue < 65) {
        counts.ranges["60to65"]++;
      } else if (lpcdValue >= 65 && lpcdValue < 70) {
        counts.ranges["65to70"]++;
      } else if (lpcdValue >= 70 && lpcdValue < 75) {
        counts.ranges["70to75"]++;
      } else if (lpcdValue >= 75 && lpcdValue < 80) {
        counts.ranges["75to80"]++;
      } else if (lpcdValue >= 80) {
        counts.ranges["above80"]++;
      }

      // Keep the above70 count for backward compatibility
      if (lpcdValue >= 70) {
        counts.ranges["above70"]++;
      }

      // Consistently above/below 55
      if (isConsistentlyAboveThreshold(scheme, 55)) {
        counts.consistentlyAbove55++;
      }
      if (isConsistentlyBelowThreshold(scheme, 55)) {
        counts.consistentlyBelow55++;
      }

      // Count consistent zero water supply
      if (hasConsistentZeroWaterSupply(scheme)) {
        counts.consistentZeroWaterSupply++;
      }

      // Count consistent water supply (all days > 0)
      if (hasConsistentWaterSupply(scheme)) {
        counts.consistentWaterSupply++;
      }
    });

    return counts;
  };

  const filteredSchemes = getFilteredSchemes();
  const filterCounts = getFilterCounts();

  // Pagination
  const paginatedSchemes = filteredSchemes.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const totalPages = Math.ceil(filteredSchemes.length / itemsPerPage);

  // Handle filter change
  const handleFilterChange = (filter: LpcdRange) => {
    setCurrentFilter(filter);
    setPage(1); // Reset to first page when filter changes
  };

  // Handler for scheme status filter changes
  const handleSchemeStatusFilterChange = (value: string) => {
    setSchemeStatusFilter(value);

    // Reset page to 1 when filter changes
    setPage(1);
  };

  // Get LPCD status badge color
  const getLpcdStatusColor = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "bg-gray-200 text-gray-700";
    if (lpcdValue > 80) return "bg-orange-500 text-white"; // High status (> 80L)
    if (lpcdValue > 70) return "bg-green-600 text-white"; // High status (> 70L)
    if (lpcdValue >= 55) return "bg-green-500 text-white"; // Good status (55-70L)
    if (lpcdValue >= 40) return "bg-yellow-500 text-black"; // Low but not critical
    if (lpcdValue >= 25) return "bg-orange-500 text-white"; // Very low
    if (lpcdValue > 0) return "bg-red-500 text-white"; // Critically low
    return "bg-gray-800 text-white"; // No water
  };

  // LPCD status text with High, Good, and Low categories
  const getLpcdStatusText = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "No Data";
    if (lpcdValue === 0) return "No Water";
    if (lpcdValue > 70) return "High";
    if (lpcdValue >= 55) return "Good";
    return "Low";
  };

  // Create LPCD badge component
  const LpcdBadge = ({ value }: { value: number | null }) => {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getLpcdStatusColor(
          value,
        )}`}
      >
        {value !== null ? `${value.toFixed(2)}L` : "N/A"}
      </span>
    );
  };

  // Export to Excel
  const exportToExcel = () => {
    // Create workbook
    import("xlsx")
      .then((XLSX) => {
        // Helper function to format date for better readability in Excel
        const formatDateForHeader = (dateStr: string | null | undefined) => {
          if (!dateStr) return "N/A";

          // If it's already in a format with a year (e.g., "01-Jan-2025" or "01-Jan-25"), return as is
          if (/^\d{1,2}[-/][a-zA-Z]{3}[-/]\d{2,4}$/.test(dateStr)) {
            return dateStr;
          }

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
            });
          } catch {
            return dateStr || "N/A";
          }
        };

        // Filter data based on current filters
        const dataToExport = filteredSchemes.map((scheme, index) => {
          const lpcdValue = getLatestLpcdValue(scheme);

          // Format dates for headers
          const date1 = formatDateForHeader(scheme.lpcd_date_day1);
          const date2 = formatDateForHeader(scheme.lpcd_date_day2);
          const date3 = formatDateForHeader(scheme.lpcd_date_day3);
          const date4 = formatDateForHeader(scheme.lpcd_date_day4);
          const date5 = formatDateForHeader(scheme.lpcd_date_day5);
          const date6 = formatDateForHeader(scheme.lpcd_date_day6);
          const date7 = formatDateForHeader(scheme.lpcd_date_day7);

          return {
            "No.": index + 1,
            Region: scheme.region,
            Circle: scheme.circle,
            Division: scheme.division,
            "Sub Division": scheme.sub_division,
            Block: scheme.block,
            "Scheme ID": scheme.scheme_id,
            "Scheme Name": scheme.scheme_name,
            "Village Name": scheme.village_name,
            Population: scheme.population,
            "Current LPCD": lpcdValue !== null ? lpcdValue.toFixed(2) : "N/A",
            Status: getLpcdStatusText(lpcdValue),
            "Days Above 55L": scheme.above_55_lpcd_count || 0,
            "Days Below 55L": scheme.below_55_lpcd_count || 0,

            // Water consumption values with dates as headers (only 6 days available)
            [`Water (${date1})`]:
              scheme.water_value_day1 !== null &&
                scheme.water_value_day1 !== undefined
                ? Number(scheme.water_value_day1).toFixed(4)
                : "N/A",
            [`Water (${date2})`]:
              scheme.water_value_day2 !== null &&
                scheme.water_value_day2 !== undefined
                ? Number(scheme.water_value_day2).toFixed(4)
                : "N/A",
            [`Water (${date3})`]:
              scheme.water_value_day3 !== null &&
                scheme.water_value_day3 !== undefined
                ? Number(scheme.water_value_day3).toFixed(4)
                : "N/A",
            [`Water (${date4})`]:
              scheme.water_value_day4 !== null &&
                scheme.water_value_day4 !== undefined
                ? Number(scheme.water_value_day4).toFixed(4)
                : "N/A",
            [`Water (${date5})`]:
              scheme.water_value_day5 !== null &&
                scheme.water_value_day5 !== undefined
                ? Number(scheme.water_value_day5).toFixed(4)
                : "N/A",
            [`Water (${date6})`]:
              scheme.water_value_day6 !== null &&
                scheme.water_value_day6 !== undefined
                ? Number(scheme.water_value_day6).toFixed(4)
                : "N/A",

            // LPCD values with dates as headers
            [`LPCD (${date1})`]:
              scheme.lpcd_value_day1 !== null &&
                scheme.lpcd_value_day1 !== undefined
                ? Number(scheme.lpcd_value_day1).toFixed(2)
                : "N/A",
            [`LPCD (${date2})`]:
              scheme.lpcd_value_day2 !== null &&
                scheme.lpcd_value_day2 !== undefined
                ? Number(scheme.lpcd_value_day2).toFixed(2)
                : "N/A",
            [`LPCD (${date3})`]:
              scheme.lpcd_value_day3 !== null &&
                scheme.lpcd_value_day3 !== undefined
                ? Number(scheme.lpcd_value_day3).toFixed(2)
                : "N/A",
            [`LPCD (${date4})`]:
              scheme.lpcd_value_day4 !== null &&
                scheme.lpcd_value_day4 !== undefined
                ? Number(scheme.lpcd_value_day4).toFixed(2)
                : "N/A",
            [`LPCD (${date5})`]:
              scheme.lpcd_value_day5 !== null &&
                scheme.lpcd_value_day5 !== undefined
                ? Number(scheme.lpcd_value_day5).toFixed(2)
                : "N/A",
            [`LPCD (${date6})`]:
              scheme.lpcd_value_day6 !== null &&
                scheme.lpcd_value_day6 !== undefined
                ? Number(scheme.lpcd_value_day6).toFixed(2)
                : "N/A",
            [`LPCD (${date7})`]:
              scheme.lpcd_value_day7 !== null &&
                scheme.lpcd_value_day7 !== undefined
                ? Number(scheme.lpcd_value_day7).toFixed(2)
                : "N/A",
          };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Set column widths
        const columns = [
          { wch: 5 }, // No.
          { wch: 12 }, // Region
          { wch: 12 }, // Circle
          { wch: 15 }, // Division
          { wch: 15 }, // Sub Division
          { wch: 12 }, // Block
          { wch: 12 }, // Scheme ID
          { wch: 25 }, // Scheme Name
          { wch: 20 }, // Village Name
          { wch: 12 }, // Population
          { wch: 15 }, // Current LPCD
          { wch: 10 }, // Status
          { wch: 12 }, // LPCD Day 1
          { wch: 12 }, // LPCD Day 2
          { wch: 12 }, // LPCD Day 3
          { wch: 12 }, // LPCD Day 4
          { wch: 12 }, // LPCD Day 5
          { wch: 12 }, // LPCD Day 6
          { wch: 12 }, // LPCD Day 7
        ];
        ws["!cols"] = columns;

        // Format the headers with sky blue background and white text
        const headerStyle = {
          fill: { fgColor: { rgb: "0000FF" } }, // Sky blue background
          font: { color: { rgb: "FFFFFF" }, bold: true }, // White bold text
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        };

        // Get all header cells (first row)
        const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!ws[cellAddress]) continue;

          // Apply header styling
          ws[cellAddress].s = headerStyle;
        }

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "LPCD Data");

        // Generate filename
        let filename = "LPCD_Data";
        if (selectedRegion !== "all") {
          filename += `_${selectedRegion}`;
        }
        if (currentFilter !== "all") {
          filename += `_${currentFilter}`;
        }
        filename += `_${new Date().toISOString().split("T")[0]}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename, {
          cellStyles: true,
          sheetStubs: false,
          bookType: "xlsx",
        });

        // Track the data export activity
        trackDataExport("village_lpcd_data", "xlsx", dataToExport.length, {
          region_filter: selectedRegion !== "all" ? selectedRegion : null,
          lpcd_filter: currentFilter !== "all" ? currentFilter : null,
          filename: filename,
        });

        toast({
          title: "Export Successful",
          description: `${dataToExport.length} records exported to Excel`,
        });
      })
      .catch((error) => {
        console.error("Error exporting to Excel:", error);
        toast({
          title: "Export Failed",
          description:
            "There was an error exporting to Excel. Please try again.",
          variant: "destructive",
        });
      });
  };

  // Export historical LPCD data to Excel from water_scheme_data_history table
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
        lastQueriedDates.region !== selectedRegion ||
        (lastQueriedDates as any).agencyType !== selectedAgencyType;

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
          if (selectedAgencyType !== "ALL") {
            params.append("agencyType", selectedAgencyType);
          }

          const url = `/api/water-scheme-data/historical?${params.toString()}`;
          console.log(
            "🔢 Counting historical LPCD records before export:",
            url,
          );

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Failed to count historical LPCD data");
          }

          const data = await response.json();
          const count = data.count || 0;

          console.log(`✅ Found ${count} historical LPCD records`);
          setHistoricalRecordCount(count);

          setLastQueriedDates({
            start: historicalStartDate,
            end: historicalEndDate,
            region: selectedRegion,
            agencyType: selectedAgencyType,
          } as any);

          if (count === 0) {
            toast({
              title: "No Records Found",
              description: `No historical LPCD records found for the date range ${historicalStartDate} to ${historicalEndDate}${selectedRegion !== "all" ? ` in ${selectedRegion}` : ""}. Try selecting a different date range or region - the system will export whatever data is available for any selected period.`,
              variant: "destructive",
              duration: 5000,
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

      // Now proceed with export
      if (historicalRecordCount === 0 || !lastQueriedDates) {
        toast({
          title: "No Records to Export",
          description:
            "No historical records found for the selected date range.",
          variant: "destructive",
        });
        return;
      }

      setIsExportingHistorical(true);

      // Build query parameters for the backend API that fetches from water_scheme_data_history
      const params = new URLSearchParams();
      params.append("startDate", lastQueriedDates.start);
      params.append("endDate", lastQueriedDates.end);
      params.append("format", "xlsx");

      if (lastQueriedDates.region && lastQueriedDates.region !== "all") {
        params.append("region", lastQueriedDates.region);
      }
      if ((lastQueriedDates as any).agencyType && (lastQueriedDates as any).agencyType !== "ALL") {
        params.append("agencyType", (lastQueriedDates as any).agencyType);
      }

      const queryString = params.toString();
      const url = `/api/water-scheme-data/download/village-lpcd-history?${queryString}`;

      console.log(
        "📥 Downloading historical LPCD data from water_scheme_data_history table:",
        url,
      );

      toast({
        title: "Export Started",
        description: `Preparing to export ${historicalRecordCount.toLocaleString()} records. This may take a moment...`,
        duration: 5000,
      });

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to export historical LPCD data",
        );
      }

      // Get the filename from response headers
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `Village_LPCD_History_${lastQueriedDates.start}_to_${lastQueriedDates.end}.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
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
        "Village LPCD Historical Data",
        filename,
        historicalRecordCount, // Use the count from counting step
        {
          dateRange: `${lastQueriedDates.start} to ${lastQueriedDates.end}`,
          region:
            lastQueriedDates.region !== "all"
              ? lastQueriedDates.region
              : undefined,
        },
        {
          exportSource: "lpcd_historical_dashboard",
          startDate: lastQueriedDates.start,
          endDate: lastQueriedDates.end,
          dataSource: "water_scheme_data_history",
        },
      );

      // Calculate number of days in the selected range
      const start = new Date(lastQueriedDates.start);
      const end = new Date(lastQueriedDates.end);
      const daysDifference =
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;

      toast({
        title: "Export Successful",
        description: `Successfully exported ${historicalRecordCount.toLocaleString()} historical records from ${lastQueriedDates.start} to ${lastQueriedDates.end} (${daysDifference} day${daysDifference !== 1 ? "s" : ""} range). The Excel file contains all available data for this period.`,
        duration: 4000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export historical LPCD data",
        variant: "destructive",
      });
    } finally {
      setIsExportingHistorical(false);
    }
  };

  const NoDataMessage = () => (
    <div className="text-center p-8">
      <h3 className="text-lg font-medium text-gray-600">
        No villages match the selected criteria
      </h3>
      <p className="text-gray-500 mt-2">
        {searchQuery ? "Try clearing your search query or " : "Try "}
        selecting a different filter or region
      </p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => {
          setSelectedRegion("all");
          setSelectedCircle("all");
          setSelectedDivision("all");
          setSelectedSubdivision("all");
          setSelectedBlock("all");
          setCurrentFilter("all");
          setSearchQuery("");
          setSelectedAgencyType("ALL");
          setUiSchemeFilter("all");
          setWaterSupplyStatus("All");
          setSchemeStatusFilter("all");
        }}
      >
        Reset All Filters
      </Button>
    </div>
  );

  // Check if there was an error loading the scheme data
  useEffect(() => {
    if (schemesError) {
      toast({
        title: "Error loading water scheme data",
        description:
          "There was a problem loading the water scheme data. Please try again.",
        variant: "destructive",
      });
    }
  }, [schemesError, toast]);

  // State for village details dialog
  const [selectedVillage, setSelectedVillage] =
    useState<WaterSchemeData | null>(null);
  const [villageDetailsOpen, setVillageDetailsOpen] = useState(false);

  // Chart visibility toggle
  const [showCharts, setShowCharts] = useState(true);

  // View village details
  const handleViewVillage = (scheme: WaterSchemeData) => {
    setSelectedVillage(scheme);
    setVillageDetailsOpen(true);
  };

  // Calculate weekly average LPCD function
  const calculateWeeklyAverageLpcd = (
    scheme: WaterSchemeData,
  ): number | null => {
    const lpcdValues: number[] = [];

    // Collect all LPCD values for the week
    for (let day = 1; day <= 7; day++) {
      const valueField = `lpcd_value_day${day}` as keyof WaterSchemeData;
      const value = scheme[valueField];

      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !isNaN(Number(value))
      ) {
        lpcdValues.push(Number(value));
      }
    }

    // Calculate average if we have any values
    if (lpcdValues.length > 0) {
      const sum = lpcdValues.reduce((acc, val) => acc + val, 0);
      return sum / lpcdValues.length; // Divide by actual number of days with data for true average
    }

    return null;
  };

  // Village Details Component
  const VillageDetailsDialog = () => {
    if (!selectedVillage) return null;

    const lpcdValue = getLatestLpcdValue(selectedVillage);
    const weeklyAverageLpcd = calculateWeeklyAverageLpcd(selectedVillage);
    const lpcdValues = [
      {
        day: 1,
        value: selectedVillage.lpcd_value_day1,
        date: selectedVillage.lpcd_date_day1,
      },
      {
        day: 2,
        value: selectedVillage.lpcd_value_day2,
        date: selectedVillage.lpcd_date_day2,
      },
      {
        day: 3,
        value: selectedVillage.lpcd_value_day3,
        date: selectedVillage.lpcd_date_day3,
      },
      {
        day: 4,
        value: selectedVillage.lpcd_value_day4,
        date: selectedVillage.lpcd_date_day4,
      },
      {
        day: 5,
        value: selectedVillage.lpcd_value_day5,
        date: selectedVillage.lpcd_date_day5,
      },
      {
        day: 6,
        value: selectedVillage.lpcd_value_day6,
        date: selectedVillage.lpcd_date_day6,
      },
      {
        day: 7,
        value: selectedVillage.lpcd_value_day7,
        date: selectedVillage.lpcd_date_day7,
      },
    ];

    // Count days above and below 55 LPCD and check for consistent zero LPCD
    const calculateDaysAboveBelow = () => {
      const validValues = lpcdValues.filter(
        (item) => item.value !== undefined && item.value !== null,
      );

      // Special handling for all-zero values - check if ALL values are 0
      const allZeros = validValues.every((item) => Number(item.value) === 0);

      let daysAbove = 0;
      let daysBelow = 0;
      // Only mark as consistent zero if we have exactly 7 days of data and all are zero
      let isConsistentZero = allZeros && validValues.length === 7 ? 1 : 0;

      if (allZeros && validValues.length > 0) {
        // If all values are zero, count all days as "below 55"
        daysAbove = 0;
        daysBelow = validValues.length;
      } else {
        // Normal calculation for non-zero values
        daysAbove = validValues.filter(
          (item) => Number(item.value) >= 55,
        ).length;
        daysBelow = validValues.filter(
          (item) => Number(item.value) < 55,
        ).length;
      }

      return {
        daysAbove,
        daysBelow,
        isConsistentZero,
        // For UI display, ALWAYS use calculated values to ensure accuracy
        daysAboveCount: daysAbove,
        daysBelowCount: daysBelow,
        consistentZeroLpcd: isConsistentZero,
      };
    };

    const {
      daysAbove,
      daysBelow,
      daysAboveCount,
      daysBelowCount,
      consistentZeroLpcd,
    } = calculateDaysAboveBelow();

    return (
      <Dialog open={villageDetailsOpen} onOpenChange={setVillageDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[100vh] bg-gradient-to-b from-blue-50 to-white">
          <DialogHeader className="bg-white p-4 rounded-lg">
            <DialogTitle className="text-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>{selectedVillage.village_name}</span>
                {selectedVillage.dashboard_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 text-xs"
                    onClick={() =>
                      window.open(selectedVillage.dashboard_url, "_blank")
                    }
                  >
                    <BarChart className="h-4 w-4 mr-1" /> PI Vision Dashboard
                  </Button>
                )}
              </div>
              <LpcdBadge value={weeklyAverageLpcd} />
            </DialogTitle>
            <DialogDescription>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-gray-500">Scheme:</span>{" "}
                  {selectedVillage.scheme_name}
                </div>
                <div>
                  <span className="text-gray-500">Scheme ID:</span>{" "}
                  {selectedVillage.scheme_id}
                </div>
                <div>
                  <span className="text-gray-500">Region:</span>{" "}
                  {selectedVillage.region}
                </div>
                <div>
                  <span className="text-gray-500">Population:</span>{" "}
                  {selectedVillage.population?.toLocaleString() || "N/A"}
                </div>
                <div>
                  <span className="text-gray-500">Block:</span>{" "}
                  {selectedVillage.block}
                </div>
                <div>
                  <span className="text-gray-500">ESR Count:</span>{" "}
                  {selectedVillage.number_of_esr || "N/A"}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="mt-4 max-h-[60vh]">
            <div className="space-y-6">
              {/* LPCD Values */}
              <div>
                <h3 className="text-lg font-semibold mb-3 bg-white p-2 rounded shadow-sm border border-blue-100">
                  LPCD Values (Last 7 Days)
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {lpcdValues.map((item, index) => {
                    const value =
                      item.value !== undefined && item.value !== null
                        ? Number(item.value)
                        : null;
                    return (
                      <div
                        key={`lpcd-day-${index + 1}`}
                        className={`p-3 rounded-md text-center ${value !== null
                          ? getLpcdStatusColor(value)
                          : "bg-gray-100"
                          }`}
                      >
                        <p className="text-xs opacity-80">Day {item.day}</p>
                        <p className="text-lg font-semibold">
                          {value !== null ? value.toFixed(2) : "-"}
                        </p>
                        <p className="text-xs opacity-80">{item.date || "-"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>



              {/* Cards for Summary Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-3 bg-white p-2 rounded shadow-sm border border-blue-100">
                  Water Consumption (LL)
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const waterValue =
                      selectedVillage[
                      `water_value_day${day}` as keyof WaterSchemeData
                      ];
                    const numValue =
                      waterValue !== undefined && waterValue !== null
                        ? Number(waterValue)
                        : null;
                    const dateValue =
                      selectedVillage[
                      `water_date_day${day}` as keyof WaterSchemeData
                      ];

                    return (
                      <div
                        key={`water-day-${day}`}
                        className="bg-white p-3 rounded-md text-center shadow-sm border border-blue-100"
                      >
                        <p className="text-xs text-blue-700">Day {day}</p>
                        <p className="text-lg font-semibold text-blue-700">
                          {numValue !== null ? numValue.toFixed(2) : "-"}
                        </p>
                        <p className="text-xs text-blue-700">
                          {dateValue || "-"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card
                  className={`${daysBelowCount > 0 ? "bg-red-50" : "bg-gray-50"
                    } border border-red-100`}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600">Days Below 55L LPCD</p>
                    <p
                      className={`text-2xl font-bold ${daysBelowCount > 0 ? "text-red-600" : "text-gray-600"
                        }`}
                    >
                      {daysBelowCount}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`${daysAboveCount > 0 ? "bg-green-50" : "bg-gray-50"
                    } border border-green-100`}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-600">Days Above 55L LPCD</p>
                    <p
                      className={`text-2xl font-bold ${daysAboveCount > 0 ? "text-green-600" : "text-gray-600"
                        }`}
                    >
                      {daysAboveCount}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`${consistentZeroLpcd === 1 ? "bg-gray-800" : "bg-gray-50"
                    }`}
                >
                  <CardContent className="p-4 text-center">
                    <p
                      className={`text-sm ${consistentZeroLpcd === 1
                        ? "text-gray-300"
                        : "text-gray-600"
                        }`}
                    >
                      Zero Water for Week
                    </p>
                    <p
                      className={`text-2xl font-bold ${consistentZeroLpcd === 1
                        ? "text-white"
                        : "text-gray-600"
                        }`}
                    >
                      {consistentZeroLpcd === 1 ? "Yes" : "No"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="w-full py-6 container mx-auto px-4 flex flex-col gap-6">
      <DashboardPageHeader
        title="LPCD Dashboard"
        subtitle="Monitor water supply and LPCD levels across villages"
        isLoading={isLoadingSchemes}
        onRefresh={() => refetch()}
        onExport={exportToExcel}
        exportCount={filteredSchemes.length}
        onToggleHistory={() => {
          setShowHistoricalData(!showHistoricalData);
          if (!showHistoricalData) trackFilterUsage("Historical Data View", "enabled");
        }}
        showHistoricalData={showHistoricalData}
        onToggleCharts={() => setShowCharts(!showCharts)}
        showCharts={showCharts}
      />

      <div className="w-full">
        <FilterBar
          filterOptions={filterOptions}
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
          selectedAgencyType={selectedAgencyType}
          onAgencyTypeChange={setSelectedAgencyType}
          searchQuery={searchQuery}
          onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
          searchPlaceholder="Search by scheme or village..."
          resultCount={filteredSchemes.length}
          resultLabel="schemes"
          extraFilters={
            uiSchemeFilter === "commissioned" ? (
              <div className="space-y-1 min-w-[120px]">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Water Supply</p>
                <Select value={waterSupplyStatus} onValueChange={setWaterSupplyStatus}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200 px-2">
                    <SelectValue placeholder="All Water Supply" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="All">All Water Supply</SelectItem>
                    <SelectItem value="Full">Full</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : undefined
          }
          rightActions={
            <div className="space-y-1 min-w-[120px]">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">IoT Status</p>
              <Select value={schemeStatusFilter} onValueChange={handleSchemeStatusFilterChange}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200 px-2">
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
          }
          onClearAll={() => {
            setSelectedRegion("all");
            setSelectedCircle("all");
            setSelectedDivision("all");
            setSelectedSubdivision("all");
            setSelectedBlock("all");
            setCurrentFilter("all");
            setSearchQuery("");
            setSelectedAgencyType("ALL");
            setUiSchemeFilter("all");
            setWaterSupplyStatus("All");
            setSchemeStatusFilter("all");
          }}
        />
      </div>

      {/* Scheme Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Scheme Filter</p>
          <Tabs value={uiSchemeFilter} onValueChange={(v) => { setUiSchemeFilter(v); setPage(1); }}>
            <TabsList className="h-8 p-0.5 bg-slate-100 border border-slate-200 gap-0.5">
              <TabsTrigger value="all" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-700 data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="commissioned" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">Commissioned</TabsTrigger>
              <TabsTrigger value="fully_completed" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-green-600 data-[state=active]:text-white">Fully Instrumented</TabsTrigger>
              <TabsTrigger value="in_progress" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white">In Progress</TabsTrigger>
              <TabsTrigger value="common_filter" className="h-7 px-3 text-xs font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white">Common Filter</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {uiSchemeFilter === "commissioned" && (
          <div className="px-4 py-3 bg-blue-50">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Water Supply Status</p>
            <Tabs value={waterSupplyStatus} onValueChange={(v) => { setWaterSupplyStatus(v); setPage(1); }}>
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

      {/* Historical Data Date Selection */}
      {
        showHistoricalData && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Select Date Range for Historical LPCD Data
                </span>
              </div>

              <div className="text-sm text-blue-600 bg-blue-100 px-3 py-2 rounded border border-blue-300">
                💡 <span className="font-medium">Quick Tip:</span> Select your
                date range and click "Export to Excel" to download any range of
                historical data - the system will automatically query and
                download the data for you!
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center mt-3">
              <div className="hidden md:block w-full md:w-auto"></div>

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
                  onClick={() => {
                    // Validate date range
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

                    // Count records without loading all data
                    countHistoricalRecords();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 mt-4 md:mt-0"
                  disabled={isCountingRecords}
                  data-testid="button-query-historical"
                >
                  {isCountingRecords ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  {isCountingRecords ? "Counting..." : "Count Records"}
                </Button>

                <Button
                  onClick={exportHistoricalData}
                  variant="default"
                  size="sm"
                  className={`flex items-center gap-2 mt-4 md:mt-0 transition-all ${historicalRecordCount > 0
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
                    <RefreshCw className="h-4 w-4 animate-spin" />
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
              <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-100 p-3 rounded-lg border border-blue-300">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="font-medium">
                  Counting historical records from {historicalStartDate} to{" "}
                  {historicalEndDate}...
                </span>
              </div>
            )}

            {!isCountingRecords &&
              historicalRecordCount > 0 &&
              lastQueriedDates && (
                <div className="mt-3 text-sm bg-green-50 p-3 rounded-lg border border-green-300">
                  <span className="text-green-700 font-semibold">
                    ✅ Ready to export {historicalRecordCount.toLocaleString()}{" "}
                    historical records
                  </span>
                  <span className="text-green-600 ml-2">
                    ({lastQueriedDates?.start} to {lastQueriedDates?.end})
                  </span>
                  <span className="text-green-600 ml-2 block mt-1">
                    Click the highlighted "Export to Excel" button to download
                  </span>
                </div>
              )}

            {isExportingHistorical && (
              <div className="mt-3 flex items-center gap-2 text-sm text-orange-700 bg-orange-100 p-3 rounded-lg border border-orange-300">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="font-medium">
                  Exporting {historicalRecordCount.toLocaleString()} records...
                  This may take a moment for large datasets.
                </span>
              </div>
            )}

            {!isCountingRecords &&
              historicalRecordCount === 0 &&
              showHistoricalData &&
              lastQueriedDates && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-300">
                  No historical data available for the selected date range. Try
                  adjusting the dates or click "Count Records" to search again.
                </div>
              )}
          </div>
        )
      }

      {/* Village details dialog */}
      < VillageDetailsDialog />

      {
        isLoadingSchemes || isLoadingRegions ? (
          <div className="flex justify-center items-center h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Main Dashboard Grid */}
            <div className="space-y-6">
              {/* Top Card - Total Villages */}
              <Card
                className="w-full max-w-md mx-auto cursor-pointer transition-all duration-300 transform hover:scale-[1.02] dashboard-card bg-gradient-to-b from-white to-blue-50 border border-blue-200 rounded-2xl shadow-lg"
                onClick={() => {
                  setCurrentFilter("all");
                  setSearchQuery("");
                }}
              >
                <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-50 border-b border-blue-200 rounded-t-2xl pb-3">
                  <CardTitle className="text-center text-2xl font-bold text-blue-900 tracking-wide">
                    Total Villages Covered Under LPCD
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-8 pb-6">
                  <p className="text-6xl font-extrabold text-center text-blue-700 drop-shadow-sm">
                    {filterCounts.total}
                  </p>

                  <div className="flex justify-center mt-6">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-full shadow-md">
                      <span className="font-medium">Total Population: </span>
                      <span className="font-bold">
                        {filterCounts.totalPopulation.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="text-center mt-6 text-blue-800">
                    <span className="font-medium">
                      Population Receiving Water Supply:
                    </span>{" "}
                    <span className="font-bold">
                      {(() => {
                        const noSupplyVillages =
                          getGloballyFilteredSchemes().filter((scheme) =>
                            hasNoCurrentWaterSupply(scheme),
                          );
                        const suppliedPopulation =
                          filterCounts.totalPopulation -
                          noSupplyVillages.reduce(
                            (sum, village) =>
                              sum +
                              (village.population
                                ? Number(village.population)
                                : 0),
                            0,
                          );
                        return suppliedPopulation.toLocaleString("en-IN");
                      })()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Main Cards Row - LPCD Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Villages with LPCD > 55L */}
                <Card className="border-green-200 dashboard-card card-shadow bg-gradient-to-b from-white to-green-50">
                  <CardHeader className="bg-gradient-to-r from-green-100 to-green-50 border-b border-green-200 pb-2">
                    <CardTitle className="text-center text-xl font-semibold text-green-800">
                      Villages with LPCD &gt; 55L
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-4">
                    <p className="text-5xl font-bold text-center text-green-600 drop-shadow-sm">
                      {filterCounts.above55}
                    </p>
                    <div className="flex justify-center mt-4">
                      <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-sm border border-green-200">
                        <span className="font-medium">Population:</span>{" "}
                        <span className="font-bold">
                          {filterCounts.above55Population.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-6 text-green-700 hover:text-green-800 hover:bg-green-100 border border-green-300 shadow-sm"
                      onClick={() => handleFilterChange("above55")}
                    >
                      <Eye className="h-4 w-4 mr-2" /> View Villages
                    </Button>
                  </CardContent>

                  {/* Subcategory cards for LPCD > 55L */}
                  {showCharts && (
                    <CardFooter className="pt-0 pb-4">
                      <div className="w-full grid grid-cols-1 gap-2">
                        <Card
                          className="border-green-100"
                          onClick={() => handleFilterChange("55to60")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                            <span className="text-sm text-green-700">
                              LPCD 55-60L
                            </span>
                            <span className="font-medium text-green-700">
                              {filterCounts.ranges["55to60"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-green-100"
                          onClick={() => handleFilterChange("60to65")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                            <span className="text-sm text-green-700">
                              LPCD 60-65L
                            </span>
                            <span className="font-medium text-green-700">
                              {filterCounts.ranges["60to65"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-green-100"
                          onClick={() => handleFilterChange("65to70")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                            <span className="text-sm text-green-700">
                              LPCD 65-70L
                            </span>
                            <span className="font-medium text-green-700">
                              {filterCounts.ranges["65to70"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-green-100"
                          onClick={() => handleFilterChange("70to75")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                            <span className="text-sm text-green-700">
                              LPCD 70-75L
                            </span>
                            <span className="font-medium text-green-700">
                              {filterCounts.ranges["70to75"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-green-100"
                          onClick={() => handleFilterChange("75to80")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-green-50">
                            <span className="text-sm text-green-700">
                              LPCD 75-80L
                            </span>
                            <span className="font-medium text-green-700">
                              {filterCounts.ranges["75to80"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-orange-100 rounded-lg overflow-hidden"
                          onClick={() => handleFilterChange("above80")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer bg-orange-500">
                            <span className="text-sm text-green-700">
                              LPCD &gt; 80L
                            </span>
                            <span className="font-medium text-green-700">
                              {filterCounts.ranges["above80"]}
                            </span>
                          </CardContent>
                        </Card>
                      </div>
                    </CardFooter>
                  )}
                </Card>

                {/* Villages with LPCD < 55L (but > 0) */}
                <Card className="border-yellow-200 dashboard-card card-shadow bg-gradient-to-b from-white to-yellow-50">
                  <CardHeader className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-b border-yellow-200 pb-2">
                    <CardTitle className="text-center text-xl font-semibold text-yellow-800">
                      Villages with LPCD &lt; 55L
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-4">
                    <p className="text-5xl font-bold text-center text-yellow-600 drop-shadow-sm">
                      {(() => {
                        // Calculate villages with LPCD < 55 but > 0 (excluding zero supply)
                        const below55ExcludingZero =
                          getGloballyFilteredSchemes().filter((scheme) => {
                            const lpcd = getLatestLpcdValue(scheme);
                            return lpcd !== null && lpcd > 0 && lpcd < 55;
                          });
                        return below55ExcludingZero.length;
                      })()}
                    </p>
                    <div className="flex justify-center mt-4">
                      <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-sm border border-yellow-200">
                        <span className="font-medium">Population:</span>{" "}
                        <span className="font-bold">
                          {(() => {
                            const below55ExcludingZero =
                              getGloballyFilteredSchemes().filter((scheme) => {
                                const lpcd = getLatestLpcdValue(scheme);
                                return lpcd !== null && lpcd > 0 && lpcd < 55;
                              });
                            const population = below55ExcludingZero.reduce(
                              (sum, scheme) =>
                                sum +
                                (scheme.population
                                  ? Number(scheme.population)
                                  : 0),
                              0,
                            );
                            return population.toLocaleString("en-IN");
                          })()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-6 text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100 border border-yellow-300 shadow-sm"
                      onClick={() => handleFilterChange("below55")}
                    >
                      <Eye className="h-4 w-4 mr-2" /> View Villages
                    </Button>
                  </CardContent>

                  {/* Subcategory cards for LPCD < 55L */}
                  {showCharts && (
                    <CardFooter className="pt-0 pb-4">
                      <div className="w-full grid grid-cols-1 gap-2">
                        <Card
                          className="border border-red-300 bg-red-50 hover:bg-red-100 transition"
                          onClick={() => handleFilterChange("noSupply")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer">
                            <span className="text-sm text-[#8B0000]">
                              No Water Supply for Village
                            </span>

                            <span className="font-medium text-red-900">
                              {(() => {
                                const noSupplyVillages =
                                  getGloballyFilteredSchemes().filter((scheme) =>
                                    hasNoCurrentWaterSupply(scheme),
                                  );
                                const totalPopulation = noSupplyVillages.reduce(
                                  (sum, village) =>
                                    sum +
                                    (village.population
                                      ? Number(village.population)
                                      : 0),
                                  0,
                                );
                                return `${noSupplyVillages.length
                                  } (Pop: ${totalPopulation.toLocaleString(
                                    "en-IN",
                                  )})`;
                              })()}
                            </span>
                          </CardContent>
                        </Card>

                        <Card
                          className="border-red-100"
                          onClick={() => handleFilterChange("45to55")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                            <span className="text-sm text-red-700">
                              LPCD 45-55L
                            </span>
                            <span className="font-medium text-red-700">
                              {filterCounts.ranges["45to55"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-red-100"
                          onClick={() => handleFilterChange("35to45")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                            <span className="text-sm text-red-700">
                              LPCD 35-45L
                            </span>
                            <span className="font-medium text-red-700">
                              {filterCounts.ranges["35to45"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-red-100"
                          onClick={() => handleFilterChange("25to35")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                            <span className="text-sm text-red-700">
                              LPCD 25-35L
                            </span>
                            <span className="font-medium text-red-700">
                              {filterCounts.ranges["25to35"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-red-100"
                          onClick={() => handleFilterChange("15to25")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                            <span className="text-sm text-red-700">
                              LPCD 15-25L
                            </span>
                            <span className="font-medium text-red-700">
                              {filterCounts.ranges["15to25"]}
                            </span>
                          </CardContent>
                        </Card>
                        <Card
                          className="border-red-100"
                          onClick={() => handleFilterChange("0to15")}
                        >
                          <CardContent className="p-3 flex justify-between items-center cursor-pointer hover:bg-red-50">
                            <span className="text-sm text-red-700">
                              LPCD 0-15L
                            </span>
                            <span className="font-medium text-red-700">
                              {filterCounts.ranges["0to15"]}
                            </span>
                          </CardContent>
                        </Card>
                      </div>
                    </CardFooter>
                  )}
                </Card>

                {/* No Water Supply for Village */}
                <Card className="border-gray-200 dashboard-card card-shadow bg-gradient-to-b from-white to-gray-50">
                  <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 pb-2">
                    <CardTitle className="text-center text-xl font-semibold text-gray-800">
                      No Water Supply for Village
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-4">
                    <p className="text-5xl font-bold text-center text-gray-600 drop-shadow-sm">
                      {(() => {
                        const noSupplyVillages =
                          getGloballyFilteredSchemes().filter((scheme) =>
                            hasNoCurrentWaterSupply(scheme),
                          );
                        return noSupplyVillages.length;
                      })()}
                    </p>
                    <div className="flex justify-center mt-4">
                      <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                        <span className="font-medium">Population:</span>{" "}
                        <span className="font-bold">
                          {(() => {
                            const noSupplyVillages =
                              getGloballyFilteredSchemes().filter((scheme) =>
                                hasNoCurrentWaterSupply(scheme),
                              );
                            const population = noSupplyVillages.reduce(
                              (sum, scheme) =>
                                sum +
                                (scheme.population
                                  ? Number(scheme.population)
                                  : 0),
                              0,
                            );
                            return population.toLocaleString("en-IN");
                          })()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-6 text-gray-700 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 shadow-sm"
                      onClick={() => handleFilterChange("noSupply")}
                    >
                      <Eye className="h-4 w-4 mr-2" /> View Villages
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Cards Row - Consistent Trends */}
              {showCharts && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Consistently Above 55L LPCD */}
                  <Card
                    className="border-blue-200 dashboard-card card-shadow bg-gradient-to-b from-white to-blue-50"
                    onClick={() => handleFilterChange("consistentlyAbove55")}
                  >
                    <CardContent className="p-5 flex items-center cursor-pointer hover:bg-blue-50 transition-all">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <BarChart3 className="h-6 w-6 text-blue-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-800 mb-1">
                          Consistent High Performance
                        </h3>
                        <p className="text-blue-700 text-sm">
                          Villages consistently above 55L LPCD for the week
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-blue-700 bg-blue-100 px-4 py-2 rounded-lg">
                        {filterCounts.consistentlyAbove55}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Consistently Below 55L LPCD */}
                  <Card
                    className="border-orange-200 dashboard-card card-shadow bg-gradient-to-b from-white to-orange-50"
                    onClick={() => handleFilterChange("consistentlyBelow55")}
                  >
                    <CardContent className="p-5 flex items-center cursor-pointer hover:bg-orange-50 transition-all">
                      <div className="bg-orange-100 p-3 rounded-full mr-4">
                        <ChartBarOff className="h-6 w-6 text-orange-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-orange-800 mb-1">
                          Needs Improvement
                        </h3>
                        <p className="text-orange-700 text-sm">
                          Villages consistently below 55L LPCD for the week
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-orange-700 bg-orange-100 px-4 py-2 rounded-lg">
                        {filterCounts.consistentlyBelow55}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Consistent Zero Water Supply */}
                  <Card
                    className="border-red-200 dashboard-card card-shadow bg-gradient-to-b from-white to-red-50"
                    onClick={() =>
                      handleFilterChange("consistentZeroWaterSupply")
                    }
                  >
                    <CardContent className="p-5 flex items-center cursor-pointer hover:bg-red-50 transition-all">
                      <div className="bg-red-100 p-3 rounded-full mr-4">
                        <Droplets className="h-6 w-6 text-red-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-800 mb-1">
                          Zero Water Supply
                        </h3>
                        <p className="text-red-700 text-sm">
                          Villages with zero water supply for entire week
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-red-700 bg-red-100 px-4 py-2 rounded-lg">
                        {filterCounts.consistentZeroWaterSupply}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Consistent Water Supply */}
                  <Card
                    className="border-green-200 dashboard-card card-shadow bg-gradient-to-b from-white to-green-50"
                    onClick={() => handleFilterChange("consistentWaterSupply")}
                  >
                    <CardContent className="p-5 flex items-center cursor-pointer hover:bg-green-50 transition-all">
                      <div className="bg-green-100 p-3 rounded-full mr-4">
                        <Droplets className="h-6 w-6 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-800 mb-1">
                          CONSISTENT WATER supply
                        </h3>
                        <p className="text-green-700 text-sm">
                          Villages with water supply for the entire week
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-green-700 bg-green-100 px-4 py-2 rounded-lg">
                        {filterCounts.consistentWaterSupply}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Results Table */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      {currentFilter === "all"
                        ? "All Villages"
                        : `Filtered Villages (${filteredSchemes.length})`}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="itemsPerPage">Show</Label>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(parseInt(value));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[80px]" id="itemsPerPage">
                          <SelectValue placeholder="10" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="ml-1">entries</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredSchemes.length > 0 ? (
                    <>
                      <div className="rounded-md border border-blue-200 overflow-hidden shadow-sm">
                        <Table className="border-collapse">
                          <TableHeader>
                            <TableRow className="bg-blue-600 hover:bg-blue-700">
                              <TableHead className="w-[50px] text-white font-semibold">
                                #
                              </TableHead>
                              <TableHead className="text-white font-semibold">
                                Region
                              </TableHead>
                              <TableHead className="text-white font-semibold">
                                Scheme Name
                              </TableHead>
                              <TableHead className="text-white font-semibold">
                                Village
                              </TableHead>
                              <TableHead className="text-white font-semibold text-center">
                                Population
                              </TableHead>
                              <TableHead className="text-white font-semibold text-center">
                                Weekly Average Lpcd
                              </TableHead>
                              <TableHead className="text-white font-semibold">
                                Current LPCD
                              </TableHead>
                              <TableHead className="text-white font-semibold">
                                Status
                              </TableHead>
                              <TableHead className="w-[150px] text-white font-semibold text-center">
                                Remark
                              </TableHead>
                              <TableHead className="w-[120px] text-white font-semibold">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSchemes.map((scheme, index) => {
                              const lpcdValue = getLatestLpcdValue(scheme);
                              const isEven = index % 2 === 0;

                              // Check for active issues — only village-level shown here
                              const villageLevelIssues = villageIssuesMap.get(`${scheme.scheme_id}-${scheme.village_name}`) || [];
                              const hasIssue = villageLevelIssues.length > 0;
                              return (
                                <TableRow
                                  // IMPORTANT: Key includes block field to handle duplicate villages across blocks
                                  // This ensures proper React rendering when same village exists in multiple blocks
                                  // (e.g., Shivrai village in both Gangapur and Vaijapur blocks)
                                  key={`${scheme.scheme_id}-${scheme.village_name}-${scheme.block}`}
                                  className={`village-item ${hasIssue
                                    ? "bg-red-50 hover:bg-red-100/50 border-l-4 border-l-red-500"
                                    : (isEven ? "bg-blue-50" : "bg-white") + " hover:bg-blue-100 transition-all"
                                    }`}
                                >
                                  <TableCell className="font-medium border-b border-blue-200 text-center align-middle">
                                    {(page - 1) * itemsPerPage + index + 1}
                                  </TableCell>
                                  <TableCell className="border-b border-blue-200 font-medium text-left align-middle">
                                    {scheme.region}
                                  </TableCell>
                                  <TableCell className="border-b border-blue-200 text-left align-middle">
                                    <div className="font-medium text-blue-800">
                                      {scheme.scheme_name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ID: {scheme.scheme_id}
                                    </div>
                                  </TableCell>
                                  <TableCell className="border-b border-blue-200 font-medium text-gray-800 text-left align-middle">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-800 truncate max-w-[150px]" title={scheme.village_name}>
                                        {scheme.village_name}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Block: {scheme.block}
                                    </div>
                                  </TableCell>
                                  <TableCell className="border-b border-blue-200 text-center font-mono font-medium align-middle">
                                    {scheme.population?.toLocaleString("en-IN") ||
                                      "N/A"}
                                  </TableCell>

                                  <TableCell className="border-b border-blue-200 text-center align-middle">
                                    <LpcdBadge
                                      value={calculateWeeklyAverageLpcd(scheme)}
                                    />
                                  </TableCell>
                                  <TableCell className="border-b border-blue-200 text-center align-middle">
                                    <LpcdBadge value={lpcdValue} />
                                  </TableCell>

                                  <TableCell className="border-b border-blue-200 text-center align-middle">
                                    <Badge
                                      variant="outline"
                                      className={`${getLpcdStatusColor(
                                        lpcdValue,
                                      )} border-0`}
                                    >
                                      {getLpcdStatusText(lpcdValue)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="border-b border-blue-200 text-center align-middle max-w-[150px]">
                                    {villageLevelIssues.length > 0 ? (
                                      <Button
                                        variant="ghost"
                                        className="h-auto p-1 max-w-full justify-start text-red-600 font-medium text-[11px] hover:text-red-700 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRemarkDetails({
                                            issues: villageLevelIssues,
                                            title: `Issues for ${scheme.village_name} (${scheme.scheme_name})`,
                                          });
                                        }}
                                      >
                                        <span className="truncate w-full text-left">
                                          {villageLevelIssues.map((i: any) => i.reason).join(", ")}
                                        </span>
                                      </Button>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="border-b border-blue-200 text-center align-middle">
                                    <div className="flex space-x-2 justify-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewVillage(scheme)}
                                        title="View Details"
                                        className="rounded-md bg-blue-50 hover:bg-blue-100 border-blue-200"
                                      >
                                        <Eye className="h-4 w-4 mr-1" /> View
                                      </Button>
                                      {scheme.dashboard_url && (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() =>
                                            window.open(
                                              scheme.dashboard_url,
                                              "_blank",
                                            )
                                          }
                                          title="Open PI Vision Dashboard"
                                          className="rounded-md bg-blue-50 hover:bg-blue-100 border-blue-200"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-6 gap-4">
                          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-md border border-blue-100 shadow-sm">
                            Showing{" "}
                            <span className="font-semibold text-blue-700">
                              {(page - 1) * itemsPerPage + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-blue-700">
                              {Math.min(
                                page * itemsPerPage,
                                filteredSchemes.length,
                              )}
                            </span>{" "}
                            of{" "}
                            <span className="font-semibold text-blue-700">
                              {filteredSchemes.length}
                            </span>{" "}
                            entries
                          </div>
                          <div className="flex items-center space-x-2 bg-white p-2 rounded-md border border-blue-100 shadow-sm">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page - 1)}
                              disabled={page === 1}
                              className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                // Show pages around the current page
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (page <= 3) {
                                  pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = page - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={
                                      page === pageNum ? "default" : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setPage(pageNum)}
                                    className={
                                      page === pageNum
                                        ? "bg-blue-600 hover:bg-blue-700"
                                        : "border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                                    }
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              },
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(page + 1)}
                              disabled={page === totalPages}
                              className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                            >
                              Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <NoDataMessage />
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )
      }

      {/* Remark Details Dialog */}
      {selectedRemarkDetails && (
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
                  <span>{selectedRemarkDetails.title}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50">
              <div className="space-y-4">
                {selectedRemarkDetails.issues.map((issue: any, index: number) => (
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
      )}

    </div>
  );
};

export default EnhancedLpcdDashboard;