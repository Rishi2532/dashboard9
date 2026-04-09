import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
import { TranslatedText } from "@/components/ui/translated-text";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  X,
  BarChart,
  BarChart2 as BarChart3,
  BarChartHorizontal as ChartBarOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  History,
  Calendar,
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

import { AlertCircle, MapPin, Users, Activity, Zap, Layers, Award, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchemeHistoricalDataChart } from "@/components/dashboard/SchemeHistoricalDataChart";
import { Pagination } from "@/components/ui/pagination";
import ExcelJS from "exceljs";
import GeographicalFilters from "@/components/dashboard/GeographicalFilters";
import AgencyTypeFilter from "@/components/dashboard/AgencyTypeFilter";

// Types
export interface SchemeLpcdData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  total_population: number;
  total_villages: number;
  villages_below_55: number;
  villages_above_55: number;
  villages_zero_supply: number;
  total_water_day1: number;
  total_water_day2: number;
  total_water_day3: number;
  total_water_day4: number;
  total_water_day5: number;
  total_water_day6: number;
  total_water_day7: number;
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
  mjp_commissioned: string;
  mjp_fully_completed?: string;
  fully_completion_scheme_status?: string;
  dashboard_url?: string;
  water_supply?: string;
  agency_type?: string;
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
  | "45-55"
  | "35-45"
  | "25-35"
  | "15-25"
  | "0-15"
  | "noSupply" // Filter for schemes with 0 water supply
  | "55-60"
  | "60-65"
  | "65-70"
  | "70-75"
  | "75-80"
  | "above80"
  | "mjpYes"
  | "mjpNo"
  | "waterSupply";

const SchemeLpcdDashboard = () => {
  const { toast } = useToast();
  const { trackPageVisit, trackDataExport, trackFilterUsage } =
    useComprehensiveActivityTracker();

  // Filter state - moved before useEffect hooks
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedCircle, setSelectedCircle] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [currentFilter, setCurrentFilter] = useState<LpcdRange>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [schemeStatusFilter, setSchemeStatusFilter] = useState<string>("all");
  const [selectedAgencyType, setSelectedAgencyType] = useState<string>("ALL");
  const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("commissioned");
  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");

  const schemeFilter = uiSchemeFilter === "commissioned" && waterSupplyStatus !== "All"
    ? `commissioned_${waterSupplyStatus.toLowerCase()}`
    : uiSchemeFilter;

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Historical data state
  const [showHistoricalDialog, setShowHistoricalDialog] = useState(false);
  const [historicalStartDate, setHistoricalStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to 30 days ago
    return date.toISOString().split("T")[0];
  });
  const [historicalEndDate, setHistoricalEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });
  const [isExportingHistorical, setIsExportingHistorical] = useState(false);

  const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
    title: string;
    issues: any[];
  } | null>(null);

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

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Scheme LPCD Dashboard");
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

  // Listen for region filter changes and export commands from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Scheme LPCD Dashboard received region filter:", region);
      handleRegionChange(region === "all" ? "all" : region);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Scheme LPCD Dashboard received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "lpcd" || pageType === "schemes") {
        // Wait for data to be filtered properly
        setTimeout(() => {
          if (allSchemeLpcdData && allSchemeLpcdData.length > 0) {
            exportToExcel();
            console.log(
              "Excel export triggered for Scheme LPCD data with",
              allSchemeLpcdData.length,
              "total records",
            );
          } else {
            console.log("No Scheme LPCD data available for export");
          }
        }, 1500);
      }
    };

    window.addEventListener(
      "regionFilterChange",
      handleRegionFilterChange as EventListener,
    );
    window.addEventListener(
      "chatbot-export-excel",
      handleChatbotExcelExport as EventListener,
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
        "chatbot-export-excel",
        handleChatbotExcelExport as EventListener,
      );

      // Clean up global export function
      if ((window as any).triggerDashboardExport) {
        (window as any).triggerDashboardExport = undefined;
      }
    };
  }, [
    selectedRegion,
    selectedCircle,
    selectedDivision,
    selectedSubdivision,
    selectedBlock,
    currentFilter,
    selectedAgencyType,
  ]);

  // Fetch all scheme LPCD data
  const {
    data: allSchemeLpcdData = [],
    isLoading: isLoadingSchemes,
    error: schemesError,
    refetch,
  } = useQuery<SchemeLpcdData[]>({
    queryKey: [
      "/api/scheme-lpcd-data",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
      selectedAgencyType,
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
        params.append("subdivision", selectedSubdivision);
      if (selectedBlock && selectedBlock !== "all")
        params.append("block", selectedBlock);
      if (selectedAgencyType !== "ALL")
        params.append("agencyType", selectedAgencyType);

      const queryString = params.toString();
      const url = `/api/scheme-lpcd-data${queryString ? `?${queryString}` : ""}`;

      console.log("Fetching Scheme LPCD data with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch Scheme LPCD data");
      }

      const data = await response.json();
      console.log(`Received ${data.length} Scheme LPCD records`);
      return data;
    },
  });

  // Fetch region data
  const { data: regionsData = [], isLoading: isLoadingRegions } = useQuery<
    RegionData[]
  >({
    queryKey: ["/api/regions"],
  });

  // Fetch scheme status data for filtering
  const { data: schemeStatusData = [], isLoading: isLoadingSchemeStatus } =
    useQuery<any[]>({
      queryKey: [
        "/api/schemes",
        selectedRegion,
        selectedCircle,
        selectedDivision,
        selectedSubdivision,
        selectedBlock,
        selectedAgencyType,
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
          params.append("subdivision", selectedSubdivision);
        if (selectedBlock && selectedBlock !== "all")
          params.append("block", selectedBlock);
        if (selectedAgencyType !== "ALL")
          params.append("agencyType", selectedAgencyType);

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

  // Fetch scheme counts with both filtered and total counts
  const { data: schemeCounts, isLoading: isLoadingSchemeCounts } = useQuery<{
    filteredCount: number;
    totalCount: number;
    region: string;
  }>({
    queryKey: [
      "/api/schemes/counts",
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubdivision,
      selectedBlock,
      selectedAgencyType,
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
        params.append("subdivision", selectedSubdivision);
      if (selectedBlock && selectedBlock !== "all")
        params.append("block", selectedBlock);
      if (selectedAgencyType !== "ALL")
        params.append("agencyType", selectedAgencyType);

      const queryString = params.toString();
      const url = `/api/schemes/counts${queryString ? `?${queryString}` : ""}`;

      console.log("Fetching scheme counts with URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch scheme counts");
      }

      const data = await response.json();
      console.log(`Received scheme counts:`, data);
      return data;
    },
  });

  // Fetch active issues for dashboard visualization
  const { data: activeIssues = [] } = useQuery({
    queryKey: ["/api/issue-reporting/active"],
    queryFn: async () => {
      const response = await fetch("/api/issue-reporting/active");
      if (!response.ok) throw new Error("Failed to fetch active issues");
      return response.json();
    },
    // Refresh every minute to keep statuses up to date
    refetchInterval: 60000,
  });

  // Create a map for quick lookup of active issues by scheme_id
  const activeIssuesMap = React.useMemo(() => {
    const map = new Map<string, any[]>();
    activeIssues.forEach((issue: any) => {
      // Filter for Scheme-level issues only
      if (issue.scheme_id && issue.problem_level === "Scheme") {
        if (!map.has(issue.scheme_id)) {
          map.set(issue.scheme_id, []);
        }
        map.get(issue.scheme_id)?.push(issue);
      }
    });
    return map;
  }, [activeIssues]);

  // Get latest LPCD value
  const getLatestLpcdValue = (scheme: SchemeLpcdData): number | null => {
    // Try to get the latest non-null value
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = scheme[`lpcd_value_day${day}` as keyof SchemeLpcdData];
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
  const getLatestWaterSupplyValue = (scheme: SchemeLpcdData): number | null => {
    // Try to get the latest non-null water supply value
    for (const day of [6, 5, 4, 3, 2, 1]) {
      const value = scheme[`total_water_day${day}` as keyof SchemeLpcdData];
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
  const hasNoCurrentWaterSupply = (scheme: SchemeLpcdData): boolean => {
    // Get the most recent water supply value
    const currentWaterSupply = getLatestWaterSupplyValue(scheme);

    // Return true if it's explicitly 0
    return currentWaterSupply !== null && currentWaterSupply === 0;
  };

  // Extract all LPCD values
  const extractLpcdValues = (scheme: SchemeLpcdData): number[] => {
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
    scheme: SchemeLpcdData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val > threshold);
  };

  const isConsistentlyBelowThreshold = (
    scheme: SchemeLpcdData,
    threshold: number,
  ): boolean => {
    const values = extractLpcdValues(scheme);
    if (values.length === 0) return false;
    return values.every((val) => val < threshold);
  };

  // Apply filters
  const getFilteredSchemes = () => {
    if (!allSchemeLpcdData) return [];

    let filtered = [...allSchemeLpcdData];

    // Apply search query filter (for scheme name)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (scheme) =>
          scheme.scheme_name?.toLowerCase().includes(query) ||
          scheme.scheme_id?.toLowerCase().includes(query),
      );
    }

    // Apply scheme status filters using the scheme status data
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
        // Get scheme status from the map
        const status = schemeStatusMap.get(scheme.scheme_id);
        if (!status) return false;

        if (schemeStatusFilter === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    // Apply LPCD range filter
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
          return lpcdValue !== null && lpcdValue < 55;
        });
        break;
      case "45-55":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 45 && lpcdValue < 55;
        });
        break;
      case "35-45":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 35 && lpcdValue < 45;
        });
        break;
      case "25-35":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 25 && lpcdValue < 35;
        });
        break;
      case "15-25":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 15 && lpcdValue < 25;
        });
        break;
      case "0-15":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 0 && lpcdValue < 15;
        });
        break;
      case "noSupply":
        filtered = filtered.filter((scheme) => hasNoCurrentWaterSupply(scheme));
        break;
      case "55-60":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 55 && lpcdValue < 60;
        });
        break;
      case "60-65":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 60 && lpcdValue < 65;
        });
        break;
      case "65-70":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 65 && lpcdValue < 70;
        });
        break;
      case "70-75":
        filtered = filtered.filter((scheme) => {
          const lpcdValue = getLatestLpcdValue(scheme);
          return lpcdValue !== null && lpcdValue >= 70 && lpcdValue < 75;
        });
        break;
      case "75-80":
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
      case "mjpYes":
        filtered = filtered.filter((scheme) => {
          const status = schemeStatusMap.get(scheme.scheme_id);
          return status && status.mjp_commissioned === "Yes";
        });
        break;
      case "mjpNo":
        filtered = filtered.filter((scheme) => {
          const status = schemeStatusMap.get(scheme.scheme_id);
          return status && status.mjp_commissioned === "No";
        });
        break;
      case "waterSupply":
        filtered = filtered.filter((scheme) => {
          const status = schemeStatusMap.get(scheme.scheme_id);
          return status && status.water_supply === "Yes";
        });
        break;
    }

    // Remove duplicate scheme names from filtered results
    const uniqueFilteredSchemes: SchemeLpcdData[] = [];
    const seenSchemeNames = new Set();

    filtered.forEach((scheme) => {
      if (!seenSchemeNames.has(scheme.scheme_name)) {
        seenSchemeNames.add(scheme.scheme_name);
        uniqueFilteredSchemes.push(scheme);
      }
    });

    return uniqueFilteredSchemes;
  };

  // Get data with global filters applied for cards
  const getGloballyFilteredSchemes = () => {
    if (!allSchemeLpcdData) return [];

    let filtered = [...allSchemeLpcdData];

    // Apply search query filter (for scheme name)
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (scheme) =>
          scheme.scheme_name?.toLowerCase().includes(query) ||
          scheme.scheme_id?.toLowerCase().includes(query),
      );
    }

    // Apply scheme status filters using the scheme status data
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
        // Get scheme status from the map
        const status = schemeStatusMap.get(scheme.scheme_id);
        if (!status) return false;

        if (schemeStatusFilter === "Connected") {
          return status.fully_completion_scheme_status !== "Not-Connected";
        }
        return status.fully_completion_scheme_status === schemeStatusFilter;
      });
    }

    // Remove duplicate scheme names from globally filtered results
    const uniqueGloballyFilteredSchemes: SchemeLpcdData[] = [];
    const seenGlobalSchemeNames = new Set();

    filtered.forEach((scheme) => {
      if (!seenGlobalSchemeNames.has(scheme.scheme_name)) {
        seenGlobalSchemeNames.add(scheme.scheme_name);
        uniqueGloballyFilteredSchemes.push(scheme);
      }
    });

    return uniqueGloballyFilteredSchemes;
  };

  // Calculate filter counts based on globally filtered data with unique scheme counting
  const getFilterCounts = () => {
    // Get data with global filters applied
    const globallyFilteredData = getGloballyFilteredSchemes();

    // Create a map to count unique schemes by scheme_id
    const uniqueSchemeIds = new Set();
    const uniqueSchemes = globallyFilteredData.filter((scheme) => {
      if (!uniqueSchemeIds.has(scheme.scheme_id)) {
        uniqueSchemeIds.add(scheme.scheme_id);
        return true;
      }
      return false;
    });

    const counts = {
      total: uniqueSchemes.length,
      above55: 0,
      below55: 0,
      totalPopulation: 0,
      above55Population: 0,
      below55Population: 0,
      mjpCommissioned: 0,
      mjpNotCommissioned: 0,
      waterSupply: 0,
      ranges: {
        "45to55": 0,
        "35to45": 0,
        "25to35": 0,
        "15to25": 0,
        "0to15": 0,
        "55to60": 0,
        "60to65": 0,
        "65to70": 0,
        above70: 0,
      },
    };

    if (uniqueSchemes.length === 0) return counts;

    // Count unique schemes in each category
    uniqueSchemes.forEach((scheme) => {
      const lpcdValue = getLatestLpcdValue(scheme);
      const population = scheme.total_population
        ? Number(scheme.total_population)
        : 0;

      // Add to total population
      counts.totalPopulation += population;

      // Count MJP commissioned schemes
      if (scheme.mjp_commissioned === "Yes") {
        counts.mjpCommissioned++;
      } else {
        counts.mjpNotCommissioned++;
      }

      // Count water supply schemes
      if (scheme.water_supply === "Yes") {
        counts.waterSupply++;
      }

      // Count all entries into above/below categories
      // If lpcdValue > 55, it's above55, otherwise (null, 0, or < 55) it's below55
      if (lpcdValue !== null && lpcdValue >= 55) {
        counts.above55++;
        counts.above55Population += population;
      } else if (lpcdValue !== null) {
        // Only count defined values, not nulls
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
      } else if (lpcdValue >= 70) {
        counts.ranges["above70"]++;
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

  // Get LPCD status badge color
  const getLpcdStatusColor = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "bg-gray-200 text-gray-700";
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

  // Format LPCD date values (handle old date formats)
  const formatLpcdDate = (dateString: string): string => {
    const currentYear = new Date().getFullYear();

    // If the date already has slashes (e.g., "5/10/2025"), return it as is
    if (dateString.includes("/")) {
      // Replace 2001 with current year if needed (legacy hack)
      if (dateString.includes("2001")) {
        return dateString.replace("2001", currentYear.toString());
      }
      return dateString;
    }

    // Handle dates like "29-Apr", "30-Apr", etc.
    if (dateString.includes("-")) {
      const parts = dateString.split("-");
      if (parts.length === 2) {
        const day = parts[0];
        const month = parts[1];

        // Map of month abbreviations to month numbers
        const monthMap: { [key: string]: string } = {
          Jan: "1",
          Feb: "2",
          Mar: "3",
          Apr: "4",
          May: "5",
          Jun: "6",
          Jul: "7",
          Aug: "8",
          Sep: "9",
          Oct: "10",
          Nov: "11",
          Dec: "12",
        };

        if (monthMap[month]) {
          return `${monthMap[month]}/${day}/${currentYear}`;
        }
      }
    }

    // For any other format, try to parse it
    try {
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        // Use the actual year from the date, or fallback to current year if it's 2001 (legacy)
        if (parsedDate.getFullYear() === 2001) {
          parsedDate.setFullYear(currentYear);
        }
        return parsedDate.toLocaleDateString();
      }

      // If all else fails, return with current date
      const currentDate = new Date();
      return currentDate.toLocaleDateString();
    } catch (e) {
      // If parsing fails, return with current date
      const currentDate = new Date();
      return currentDate.toLocaleDateString();
    }
  };

  // Get correct dashboard URL based on scheme details
  const getDashboardUrlForScheme = (scheme: SchemeLpcdData) => {
    // Check if it's the 105 Villages RRWSS scheme
    if (
      scheme.scheme_name === "105 Villages RRWSS" &&
      scheme.scheme_id === "20003791"
    ) {
      // Base URL for PI Vision dashboard
      const BASE_URL =
        "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD";

      // Standard parameters for the dashboard
      const STANDARD_PARAMS = "hidetoolbar=true&hidesidebar=true&mode=kiosk";

      // Handle the special case for Amravati region (change to Amaravati in the URL)
      const regionDisplay =
        scheme.region === "Amravati" ? "Amaravati" : scheme.region;

      // Create the path without URL encoding
      const path = `\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${scheme.circle}\\Division-${scheme.division}\\Sub Division-${scheme.sub_division}\\Block-${scheme.block}\\Scheme-${scheme.scheme_id} - ${scheme.scheme_name}`;

      // URL encode the path
      const encodedPath = encodeURIComponent(path);

      // Combine all parts to create the complete URL
      return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
    }

    // Return the original dashboard URL for other schemes
    return scheme.dashboard_url || "";
  };

  // Create LPCD badge component
  const LpcdBadge = ({ value }: { value: number | null }) => {
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getLpcdStatusColor(value)}`}
      >
        {value === null
          ? "N/A"
          : value === 0
            ? "0L"
            : `${Number(value).toFixed(2)}L`}
      </span>
    );
  };

  // Export to Excel using ExcelJS for chatbot compatibility
  const exportToExcel = async () => {
    try {
      const dataToExport = filteredSchemes;
      if (dataToExport.length === 0) {
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
        description: `Gathering ${dataToExport.length} schemes for export...`,
      });

      // Helper function to format dates for headers
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
            year: "numeric"
          });
        } catch {
          return dateStr || "N/A";
        }
      };

      // Format data for Excel
      const worksheetData = dataToExport.map((scheme, index) => {
        const latestLpcd = getLatestLpcdValue(scheme);
        const statusText = getLpcdStatusText(latestLpcd);

        return {
          "No.": index + 1,
          "Scheme ID": scheme.scheme_id,
          "Scheme Name": scheme.scheme_name || "N/A",
          Region: scheme.region || "N/A",
          Circle: scheme.circle || "N/A",
          Division: scheme.division || "N/A",
          "Sub Division": scheme.sub_division || "N/A",
          Block: scheme.block || "N/A",
          "Total Population": scheme.total_population || 0,
          "Total Villages": scheme.total_villages || 0,
          "Villages Below 55 LPCD": scheme.villages_below_55 || 0,
          "Villages Above 55 LPCD": scheme.villages_above_55 || 0,
          "Villages Zero Supply": scheme.villages_zero_supply || 0,
          "Latest LPCD Value (L)": latestLpcd !== null ? latestLpcd.toFixed(2) : "No data",
          "LPCD Status": statusText,
          "Agency Type": scheme.agency_type || "N/A",
          [`LPCD ${formatDateForHeader(scheme.lpcd_date_day1)}`]: scheme.lpcd_value_day1 || "N/A",
          [`LPCD ${formatDateForHeader(scheme.lpcd_date_day2)}`]: scheme.lpcd_value_day2 || "N/A",
          [`LPCD ${formatDateForHeader(scheme.lpcd_date_day3)}`]: scheme.lpcd_value_day3 || "N/A",
          [`LPCD ${formatDateForHeader(scheme.lpcd_date_day4)}`]: scheme.lpcd_value_day4 || "N/A",
          [`LPCD ${formatDateForHeader(scheme.lpcd_date_day5)}`]: scheme.lpcd_value_day5 || "N/A",
          [`LPCD ${formatDateForHeader(scheme.lpcd_date_day6)}`]: scheme.lpcd_value_day6 || "N/A",
          [`LPCD ${formatDateForHeader(scheme.lpcd_date_day7)}`]: scheme.lpcd_value_day7 || "N/A",
          [`Water ${formatDateForHeader(scheme.water_date_day1)}`]: scheme.total_water_day1 || 0,
          [`Water ${formatDateForHeader(scheme.water_date_day2)}`]: scheme.total_water_day2 || 0,
          [`Water ${formatDateForHeader(scheme.water_date_day3)}`]: scheme.total_water_day3 || 0,
          [`Water ${formatDateForHeader(scheme.water_date_day4)}`]: scheme.total_water_day4 || 0,
          [`Water ${formatDateForHeader(scheme.water_date_day5)}`]: scheme.total_water_day5 || 0,
          [`Water ${formatDateForHeader(scheme.water_date_day6)}`]: scheme.total_water_day6 || 0,
          [`Water ${formatDateForHeader(scheme.water_date_day7)}`]: scheme.total_water_day7 || 0,
          "MJP Commissioned": scheme.mjp_commissioned || "No",
          "Water Supply": scheme.water_supply || "No",
          "MJP Fully Completed": scheme.mjp_fully_completed || "In Progress",
          "Scheme Status": scheme.fully_completion_scheme_status || "Unknown",
        };
      });

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Scheme LPCD Data");

      // Add header row
      const headerKeys = worksheetData.length > 0 ? Object.keys(worksheetData[0]) : [];
      worksheet.addRow(headerKeys);

      // Add data rows
      worksheetData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key as keyof typeof row]));
      });

      // Style header row (sky blue)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell: any) => {
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

      // Auto-size columns
      worksheet.columns.forEach((column: any) => {
        let maxLength = 0;
        if (column.eachCell) {
          column.eachCell({ includeEmpty: true }, (cell: any) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
        }
        column.width = Math.min(maxLength < 10 ? 10 : maxLength + 2, 30);
      });

      // Generate filename
      const region = selectedRegion === "all" ? "All_Regions" : selectedRegion.replace(/\s+/g, "_");
      const filter = currentFilter === "all" ? "All_LPCD" : currentFilter.replace(/\s+/g, "_");
      const today = new Date().toISOString().split("T")[0];
      const filename = `Scheme_LPCD_${region}_${filter}_${today}.xlsx`;

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

      // Track the export
      trackDataExport(
        "Scheme LPCD Data",
        filename,
        dataToExport.length,
        {
          region: selectedRegion !== "all" ? selectedRegion : undefined,
          filter: currentFilter !== "all" ? currentFilter : undefined,
        },
        {
          exportSource: "scheme_lpcd_dashboard",
          filterApplied: currentFilter,
          searchQuery: searchQuery || undefined,
        }
      );

      toast({
        title: "Export Successful",
        description: `${dataToExport.length} schemes exported to ${filename}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }
  };

  // Export historical scheme LPCD data
  const exportHistoricalData = async () => {
    try {
      // Validate date range to prevent crashes with very large datasets
      const start = new Date(historicalStartDate);
      const end = new Date(historicalEndDate);
      const daysDifference = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      /* Range limit removed to allow full-year exports */


      setIsExportingHistorical(true);

      const params = new URLSearchParams({
        start_date: historicalStartDate,
        end_date: historicalEndDate,
        format: 'xlsx'
      });

      if (selectedRegion && selectedRegion !== 'all') {
        params.append('region', selectedRegion);
      }
      if (selectedAgencyType !== 'ALL') {
        params.append('agencyType', selectedAgencyType);
      }

      const response = await fetch(`/api/scheme-lpcd-data/export/history?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `scheme_lpcd_history_${historicalStartDate}_to_${historicalEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Historical data exported from ${historicalStartDate} to ${historicalEndDate}`,
        duration: 3000,
      });

      setShowHistoricalDialog(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export historical data",
        variant: "destructive",
      });
    } finally {
      setIsExportingHistorical(false);
    }
  };

  // Fetch water scheme data to calculate population correctly
  const { data: waterSchemeData = [], isLoading: isLoadingWaterData } =
    useQuery<any[]>({
      queryKey: [
        "/api/water-scheme-data",
        selectedRegion,
        selectedCircle,
        selectedDivision,
        selectedSubdivision,
        selectedBlock,
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
          params.append("subdivision", selectedSubdivision);
        if (selectedBlock && selectedBlock !== "all")
          params.append("block", selectedBlock);
        if (selectedAgencyType !== "ALL")
          params.append("agencyType", selectedAgencyType);

        const queryString = params.toString();
        const url = `/api/water-scheme-data${queryString ? `?${queryString}` : ""}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch water scheme data");
        }
        return await response.json();
      },
    });

  // Calculate detailed LPCD statistics - simplified to count unique schemes only
  const calculateDetailedLpcdStats = () => {
    const stats = {
      total: 0,
      above55: 0,
      below55: 0,
      noSupply: 0,
      lpcdRanges: {
        "55-60": 0,
        "60-65": 0,
        "65-70": 0,
        "70-75": 0,
        "75-80": 0,
        above80: 0,
        "45-55": 0,
        "35-45": 0,
        "25-35": 0,
        "15-25": 0,
        "0-15": 0,
      },
    };

    // Create a map to track unique schemes by scheme name only
    const uniqueSchemes = new Map();

    // Use globally filtered schemes to apply all active filters
    const globallyFilteredData = getGloballyFilteredSchemes();

    globallyFilteredData.forEach((scheme) => {
      const uniqueKey = scheme.scheme_name;

      // Only count each unique scheme name once
      if (!uniqueSchemes.has(uniqueKey)) {
        uniqueSchemes.set(uniqueKey, scheme);
        stats.total++;

        const lpcdValue = getLatestLpcdValue(scheme);

        if (lpcdValue === null || lpcdValue === 0) {
          stats.noSupply++;
        } else if (lpcdValue > 55) {
          stats.above55++;

          // Categorize into detailed ranges
          if (lpcdValue >= 80) {
            stats.lpcdRanges.above80++;
          } else if (lpcdValue >= 75) {
            stats.lpcdRanges["75-80"]++;
          } else if (lpcdValue >= 70) {
            stats.lpcdRanges["70-75"]++;
          } else if (lpcdValue >= 65) {
            stats.lpcdRanges["65-70"]++;
          } else if (lpcdValue >= 60) {
            stats.lpcdRanges["60-65"]++;
          } else {
            stats.lpcdRanges["55-60"]++;
          }
        } else {
          stats.below55++;

          // Categorize into detailed ranges
          if (lpcdValue >= 45) {
            stats.lpcdRanges["45-55"]++;
          } else if (lpcdValue >= 35) {
            stats.lpcdRanges["35-45"]++;
          } else if (lpcdValue >= 25) {
            stats.lpcdRanges["25-35"]++;
          } else if (lpcdValue >= 15) {
            stats.lpcdRanges["15-25"]++;
          } else {
            stats.lpcdRanges["0-15"]++;
          }
        }
      }
    });

    return stats;
  };

  const detailedStats = calculateDetailedLpcdStats();

  // Handle LPCD range filtering
  const handleLpcdRangeFilter = (rangeType: string) => {
    switch (rangeType) {
      case "55-60":
      case "60-65":
      case "65-70":
      case "70-75":
      case "75-80":
      case "above80":
        setCurrentFilter(rangeType as LpcdRange);
        break;
      case "45-55":
      case "35-45":
      case "25-35":
      case "15-25":
      case "0-15":
        setCurrentFilter(rangeType as LpcdRange);
        break;
      default:
        setCurrentFilter("all");
    }
    setPage(1);
    trackFilterUsage("scheme_lpcd_range", rangeType);
  };

  // Render the enhanced LPCD filter cards section - exactly like village LPCD dashboard
  const renderSummaryCards = () => {
    return (
      <div className="space-y-6 mb-6">
        {/* Total Schemes Covered Card - Top center card */}
        <div className="flex justify-center">
          <Card className="bg-blue-50 border-blue-200 shadow-lg w-80">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-blue-800 text-lg font-semibold">
                Total Schemes Covered Under LPCD
              </CardTitle>
              <div className="text-5xl font-bold text-blue-600 mt-3">
                {detailedStats.total}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Three main filter cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Schemes with LPCD > 55L */}
          <Card className="bg-green-50 border-green-200 shadow-lg">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-green-800 text-lg font-semibold">
                Schemes with LPCD &gt; 55L
              </CardTitle>
              <div className="text-4xl font-bold text-green-600 mt-2">
                {detailedStats.above55}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-green-700 border-green-300 hover:bg-green-100 mt-3 w-full"
                onClick={() => handleFilterChange("above55")}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Schemes
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {[
                  { range: "55-60", label: "LPCD 55-60L" },
                  { range: "60-65", label: "LPCD 60-65L" },
                  { range: "65-70", label: "LPCD 65-70L" },
                  { range: "70-75", label: "LPCD 70-75L" },
                  { range: "75-80", label: "LPCD 75-80L" },
                  { range: "above80", label: "LPCD > 80L" },
                ].map(({ range, label }) => (
                  <div
                    key={range}
                    className={`flex justify-between items-center text-sm p-2 rounded cursor-pointer transition-colors ${range === "above80"
                      ? "bg-orange-100 hover:bg-orange-200"
                      : "hover:bg-green-100"
                      }`}
                    onClick={() => handleLpcdRangeFilter(range)}
                  >
                    <span
                      className={
                        range === "above80"
                          ? "text-orange-700"
                          : "text-green-700"
                      }
                    >
                      {label}
                    </span>
                    <span
                      className={`font-medium ${range === "above80" ? "text-orange-800" : "text-green-800"}`}
                    >
                      {
                        detailedStats.lpcdRanges[
                        range as keyof typeof detailedStats.lpcdRanges
                        ]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schemes with LPCD < 55L */}
          <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-yellow-800 text-lg font-semibold">
                Schemes with LPCD &lt; 55L
              </CardTitle>
              <div className="text-4xl font-bold text-yellow-600 mt-2">
                {detailedStats.below55}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100 mt-3 w-full"
                onClick={() => handleFilterChange("below55")}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Schemes
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <div
                  className="flex justify-between items-center text-sm p-2 rounded hover:bg-red-100 cursor-pointer transition-colors"
                  onClick={() => handleFilterChange("noSupply")}
                >
                  <span className="text-red-700">
                    No Water Supply for Scheme
                  </span>
                  <span className="font-medium text-red-800">
                    {detailedStats.noSupply}
                  </span>
                </div>
                {[
                  { range: "45-55", label: "LPCD 45-55L" },
                  { range: "35-45", label: "LPCD 35-45L" },
                  { range: "25-35", label: "LPCD 25-35L" },
                  { range: "15-25", label: "LPCD 15-25L" },
                  { range: "0-15", label: "LPCD 0-15L" },
                ].map(({ range, label }) => (
                  <div
                    key={range}
                    className="flex justify-between items-center text-sm p-2 rounded hover:bg-yellow-100 cursor-pointer transition-colors"
                    onClick={() => handleLpcdRangeFilter(range)}
                  >
                    <span className="text-yellow-700">{label}</span>
                    <span className="font-medium text-yellow-800">
                      {
                        detailedStats.lpcdRanges[
                        range as keyof typeof detailedStats.lpcdRanges
                        ]
                      }
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* No Water Supply for Scheme */}
          <Card className="bg-gray-50 border-gray-200 shadow-lg">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-gray-800 text-lg font-semibold">
                No Water Supply for Scheme
              </CardTitle>
              <div className="text-4xl font-bold text-gray-600 mt-2">
                {detailedStats.noSupply}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-100 mt-3 w-full"
                onClick={() => handleFilterChange("noSupply")}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Schemes
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-gray-600 text-center py-4">
                <div className="flex justify-between items-center p-2 rounded bg-gray-100">
                  <span>No Water Supply for Scheme</span>
                  <span className="font-medium text-gray-800">
                    {detailedStats.noSupply}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render filter buttons
  const renderFilterButtons = () => {
    return (
      <div className="mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={currentFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("all")}
              className="whitespace-nowrap"
            >
              All Schemes ({filterCounts.total})
            </Button>
            <Button
              variant={currentFilter === "above55" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("above55")}
              className="whitespace-nowrap"
            >
              Above 55 LPCD ({filterCounts.above55})
            </Button>
            <Button
              variant={currentFilter === "below55" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("below55")}
              className="whitespace-nowrap"
            >
              Below 55 LPCD ({filterCounts.below55})
            </Button>
            <Button
              variant={currentFilter === "noSupply" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("noSupply")}
              className="whitespace-nowrap"
            >
              No Water Supply
            </Button>
            <Button
              variant={currentFilter === "mjpYes" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("mjpYes")}
              className="whitespace-nowrap"
            >
              MJP Commissioned ({filterCounts.mjpCommissioned})
            </Button>
            <Button
              variant={currentFilter === "mjpNo" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("mjpNo")}
              className="whitespace-nowrap"
            >
              MJP Not Commissioned ({filterCounts.mjpNotCommissioned})
            </Button>
            <Button
              variant={currentFilter === "waterSupply" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("waterSupply")}
              className="whitespace-nowrap"
            >
              Water Supply ({filterCounts.waterSupply})
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="w-full py-6 container mx-auto px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border-l-4 border-blue-600 shadow-sm">
          <h1 className="text-3xl font-bold text-blue-900">
            <TranslatedText>Scheme LPCD Dashboard</TranslatedText>
          </h1>
          <p className="text-blue-700 font-medium mt-1">
            <TranslatedText>
              Monitor water supply at scheme level (Litres Per Capita per Day)
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

        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-4 text-blue-800">
            <Filter className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Geographical Filters</h3>
          </div>
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
          <div className="mt-4 border-t border-blue-100 pt-4 flex items-center gap-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Agency Type</p>
            <AgencyTypeFilter
              selectedAgencyType={selectedAgencyType}
              onAgencyTypeChange={setSelectedAgencyType}
              className="w-48 bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative w-64">
            <Input
              type="search"
              placeholder="Search scheme name or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset page on search
              }}
              className="pr-8 border-blue-200 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Unified Scheme Filter */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border border-blue-200 shadow-sm">
            <span className="text-sm font-medium text-blue-700 ml-1">Filter:</span>
            <Select value={uiSchemeFilter} onValueChange={(val) => {
              setUiSchemeFilter(val);
              setPage(1);
            }}>
              <SelectTrigger className="w-[220px] bg-white border-blue-200">
                <SelectValue placeholder="Select Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schemes</SelectItem>
                <SelectItem value="commissioned">100% Civil work Completed</SelectItem>
                <SelectItem value="fully_completed">Fully Instrumented Schemes</SelectItem>
                <SelectItem value="in_progress">Partially instrumented schemes</SelectItem>
                <SelectItem value="common_filter">Common filter</SelectItem>
                <SelectItem value="mjp_commissioned_yes">Commissioned</SelectItem>
              </SelectContent>
            </Select>


            <div className="h-6 w-px bg-blue-200 mx-1"></div>
            <Select
              value={schemeStatusFilter}
              onValueChange={(value) => {
                setSchemeStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] bg-white border-blue-200">
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

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Refresh data"
            className="border-blue-200 shadow-sm text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={exportToExcel}
            title="Export to Excel"
            className="border-blue-200 shadow-sm text-blue-700 hover:bg-blue-50"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistoricalDialog(true)}
            title="Export Historical Data"
            className="border-blue-200 shadow-sm text-blue-700 hover:bg-blue-50"
            data-testid="button-export-historical"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCharts(!showCharts)}
            className="border-blue-200 shadow-sm text-blue-700 hover:bg-blue-50"
          >
            {showCharts ? (
              <>
                <ChartBarOff className="h-4 w-4 mr-2" /> Hide Charts
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" /> Show Charts
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingSchemes && (
        <div className="flex justify-center my-12">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-blue-700">Loading scheme data...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {schemesError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md my-6">
          <h3 className="text-red-800 font-medium">Error loading data</h3>
          <p className="text-red-600 mt-1">
            {schemesError instanceof Error
              ? schemesError.message
              : "Unknown error"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-2 text-red-700 border-red-300 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      )}

      {/* Content - only show if not loading and no error */}
      {!isLoadingSchemes && !schemesError && (
        <>
          {/* Summary cards */}
          {renderSummaryCards()}

          {/* Filter buttons */}
          {renderFilterButtons()}

          {/* Data table */}
          <Card className="shadow-sm border-blue-100">
            <CardHeader className="bg-blue-50/50 px-6 py-4 border-b border-blue-100">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                <CardTitle className="text-blue-900">
                  {filteredSchemes.length} Scheme
                  {filteredSchemes.length !== 1 ? "s" : ""}{" "}
                  {currentFilter !== "all" ? `• ${currentFilter}` : ""}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <Label
                    htmlFor="rowsPerPage"
                    className="text-sm text-blue-700"
                  >
                    Rows:
                  </Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setPage(1); // Reset to first page
                    }}
                  >
                    <SelectTrigger
                      id="rowsPerPage"
                      className="w-[70px] h-8 text-sm bg-white"
                    >
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto rounded-md">
                <Table>
                  <TableHeader className="bg-blue-50/50">
                    <TableRow className="hover:bg-blue-50/80">
                      <TableHead className="w-[60px] font-medium">
                        No.
                      </TableHead>
                      <TableHead className="font-medium">Scheme Name</TableHead>
                      <TableHead className="font-medium">Region</TableHead>
                      <TableHead className="font-medium">Block</TableHead>
                      <TableHead className="font-medium">Villages</TableHead>
                      <TableHead className="font-medium">Population</TableHead>
                      <TableHead className="font-medium">LPCD</TableHead>
                      <TableHead className="font-medium">MJP</TableHead>

                      <TableHead className="font-medium w-[150px]">Remark</TableHead>
                      <TableHead className="font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSchemes.length > 0 ? (
                      paginatedSchemes.map((scheme, index) => {
                        const lpcdValue = getLatestLpcdValue(scheme);
                        const currentIndex =
                          (page - 1) * itemsPerPage + index + 1;

                        // Check for active issues
                        const schemeIssues = activeIssuesMap.get(scheme.scheme_id);
                        const hasIssue = schemeIssues && schemeIssues.length > 0;

                        return (
                          <TableRow
                            key={`${scheme.scheme_id}-${index}`}
                            className={`hover:bg-blue-50/50 ${hasIssue ? "bg-red-50 hover:bg-red-100/50 border-l-4 border-l-red-500" : ""}`}
                          >
                            <TableCell className="text-gray-500 font-medium">
                              {currentIndex}
                            </TableCell>
                            <TableCell className="font-medium text-blue-800">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[200px]" title={scheme.scheme_name || "Unnamed Scheme"}>
                                  {scheme.scheme_name || "Unnamed Scheme"}
                                </span>
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                ID: {scheme.scheme_id || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {scheme.region || "N/A"}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {scheme.circle || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>{scheme.block || "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {scheme.total_villages || "0"}
                                </span>
                                <div className="text-xs flex gap-1 mt-1">
                                  <span className="text-green-600">
                                    ↑{scheme.villages_above_55}
                                  </span>
                                  <span className="text-red-600">
                                    ↓{scheme.villages_below_55}
                                  </span>
                                  {scheme.villages_zero_supply > 0 && (
                                    <span className="text-gray-500">
                                      0:{scheme.villages_zero_supply}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {scheme.total_population?.toLocaleString() ||
                                  "0"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <LpcdBadge value={lpcdValue} />
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`${scheme.agency_type === "MJP"
                                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  : scheme.agency_type === "ZP"
                                    ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                  }`}
                              >
                                {scheme.agency_type || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              {schemeIssues && schemeIssues.length > 0 ? (
                                <Button
                                  variant="ghost"
                                  className="h-auto p-1 max-w-full justify-start text-red-600 font-medium text-[11px] hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRemarkDetails({ issues: schemeIssues, title: `Issues for ${scheme.scheme_name}` });
                                  }}
                                >
                                  <span className="truncate w-full text-left">
                                    {schemeIssues.map((i: any) => i.reason).join(", ")}
                                  </span>
                                </Button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xls bg-white rounded-xl">
                                    {/* Premium Header */}
                                    <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-8 rounded-t-xl text-white overflow-hidden">
                                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
                                      
                                      <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                              <span className="bg-blue-400/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-blue-100 border border-blue-400/30">
                                               Scheme Details
                                              </span>
                                              <Badge className={`${scheme.mjp_commissioned === "Yes" ? "bg-emerald-400/20 text-emerald-100 border-emerald-400/30" : "bg-amber-400/20 text-amber-100 border-amber-400/30"} backdrop-blur-sm`}>
                                                {scheme.mjp_commissioned === "Yes" ? "Commissioned" : "Not Commissioned"}
                                              </Badge>
                                            </div>
                                            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                                              {scheme.scheme_name || "Unnamed Scheme"}
                                            </h2>
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-blue-100/90 text-sm font-medium">
                                              <div className="flex items-center gap-2">
                                                <Info className="h-4 w-4 text-blue-300" />
                                                ID: <span className="text-white">{scheme.scheme_id}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-blue-300" />
                                                <span className="text-white">{scheme.region}</span> • <span className="text-white">{scheme.block}</span>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {scheme.dashboard_url && (
                                            <Button asChild className="bg-white text-blue-800 hover:bg-blue-50 font-bold shadow-lg h-12 px-6 rounded-xl shrink-0 transition-all hover:scale-105 active:scale-95">
                                              <a href={getDashboardUrlForScheme(scheme)} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-5 w-5 mr-2" />
                                                View Live Dashboard
                                              </a>
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-8">
                                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                                        {/* Left Side: Detail Cards */}
                                        <div className="lg:col-span-8 space-y-6">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* card: Location */}
                                            <Card className="border-none shadow-sm bg-slate-50/50 overflow-hidden group hover:shadow-md transition-shadow duration-300">
                                              <div className="bg-blue-600 h-1.5 w-full"></div>
                                              <CardHeader className="pb-2">
                                                <div className="flex items-center gap-2 text-blue-700 mb-1">
                                                  <Layers className="h-4 w-4" />
                                                  <CardTitle className="text-xs font-bold uppercase tracking-wider">Geographic Scope</CardTitle>
                                                </div>
                                              </CardHeader>
                                              <CardContent className="space-y-3">
                                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                                                  <span className="text-sm font-medium text-slate-500">Circle</span>
                                                  <span className="text-sm font-bold text-slate-800">{scheme.circle || "N/A"}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                                                  <span className="text-sm font-medium text-slate-500">Division</span>
                                                  <span className="text-sm font-bold text-slate-800">{scheme.division || "N/A"}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                                                  <span className="text-sm font-medium text-slate-500">Sub-Division</span>
                                                  <span className="text-sm font-bold text-slate-800">{scheme.sub_division || "N/A"}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                  <span className="text-sm font-medium text-slate-500">Block</span>
                                                  <span className="text-sm font-bold text-slate-800">{scheme.block || "N/A"}</span>
                                                </div>
                                              </CardContent>
                                            </Card>

                                            {/* card: Population & Metrics */}
                                            <Card className="border-none shadow-sm bg-slate-50/50 overflow-hidden group hover:shadow-md transition-shadow duration-300">
                                              <div className="bg-indigo-600 h-1.5 w-full"></div>
                                              <CardHeader className="pb-2">
                                                <div className="flex items-center gap-2 text-indigo-700 mb-1">
                                                  <Users className="h-4 w-4" />
                                                  <CardTitle className="text-xs font-bold uppercase tracking-wider">Demographics & Reach</CardTitle>
                                                </div>
                                              </CardHeader>
                                              <CardContent className="space-y-3">
                                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                                                  <span className="text-sm font-medium text-slate-500">Total Population</span>
                                                  <span className="text-sm font-bold text-slate-800">{scheme.total_population?.toLocaleString() || "0"}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                                                  <span className="text-sm font-medium text-slate-500">Total Villages</span>
                                                  <span className="text-sm font-bold text-slate-800">{scheme.total_villages}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                                                  <span className="text-sm font-medium text-slate-500">Supply Above 55 LPCD</span>
                                                  <span className="text-sm font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded italic">{scheme.villages_above_55} Villages</span>
                                                </div>
                                                <div className="flex justify-between items-center py-1">
                                                  <span className="text-sm font-medium text-slate-500">Supply Below 55 LPCD</span>
                                                  <span className="text-sm font-bold text-red-600 px-2 py-0.5 bg-red-50 rounded italic">{scheme.villages_below_55} Villages</span>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          </div>

                                          {/* Key Status & Performance */}
                                          <Card className="border-none shadow-sm bg-slate-50/50 overflow-hidden">
                                            <div className="bg-emerald-600 h-1.5 w-full"></div>
                                            <div className="p-6">
                                              <div className="flex items-center gap-2 text-emerald-700 mb-6">
                                                <Activity className="h-4 w-4" />
                                                <CardTitle className="text-xs font-bold uppercase tracking-wider">Live Performance Status</CardTitle>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="flex flex-col gap-1 border-r border-slate-200 last:border-0">
                                                  <span className="text-xs font-semibold text-slate-400 uppercase">Agency Type</span>
                                                  <span className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                                    <Award className="h-5 w-5 text-amber-500" />
                                                    {scheme.agency_type || "N/A"}
                                                  </span>
                                                </div>
                                                <div className="flex flex-col gap-1 border-r border-slate-200 last:border-0">
                                                  <span className="text-xs font-semibold text-slate-400 uppercase">Current LPCD</span>
                                                  <span className={`text-xl font-extrabold flex items-center gap-2 ${Number(lpcdValue) >= 55 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    <Zap className="h-5 w-5" />
                                                    {lpcdValue !== null ? Number(lpcdValue).toFixed(2) + " L" : "N/A"}
                                                  </span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                  <span className="text-xs font-semibold text-slate-400 uppercase">Water Supply</span>
                                                  <div className="flex items-center gap-2">
                                                    <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${Number(lpcdValue) >= 55 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                    <span className={`text-lg font-bold ${Number(lpcdValue) >= 55 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                      {getLpcdStatusText(lpcdValue)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </Card>
                                        </div>

                                        {/* Right Side: History Sidebar */}
                                        <div className="lg:col-span-4 gap-6">
                                          <Card className="h-full border-none shadow-sm bg-slate-50/50 flex flex-col">
                                            <div className="bg-slate-700 h-1.5 w-full"></div>
                                            <CardHeader className="pb-4">
                                              <div className="flex items-center gap-2 text-slate-700 mb-1">
                                                <Calendar className="h-4 w-4" />
                                                <CardTitle className="text-xs font-bold uppercase tracking-wider">7-Day LPCD History</CardTitle>
                                              </div>
                                            </CardHeader>
                                            <CardContent className="flex-1 px-4 overflow-hidden">
                                              <div className="space-y-3 overflow-y-auto pr-2 max-h-[350px] custom-scrollbar">
                                                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                                  const value = scheme[`lpcd_value_day${day}` as keyof SchemeLpcdData] as number;
                                                  const date = scheme[`lpcd_date_day${day}` as keyof SchemeLpcdData] as string;
                                                  if (value === undefined || value === null) return null;

                                                  return (
                                                    <div key={`day-${day}`} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm group hover:border-blue-200 transition-colors">
                                                      <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Day {day}</span>
                                                        <span className="text-sm font-semibold text-slate-700">
                                                          {date ? formatLpcdDate(date) : `Reading ${day}`}
                                                        </span>
                                                      </div>
                                                      <LpcdBadge value={value} />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </div>
                                      </div>

                                      {/* Historical Data Chart */}
                                      <div className="mt-8 pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-3 mb-6">
                                          <div className="p-2 bg-blue-100 rounded-lg">
                                            <BarChart3 className="h-5 w-5 text-blue-700" />
                                          </div>
                                          <div>
                                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Supply Trends Analysis</h3>
                                            <p className="text-xs text-slate-500 font-medium italic">Visualize water supply distribution and historical performance over time.</p>
                                          </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                          <SchemeHistoricalDataChart
                                            schemeId={scheme.scheme_id}
                                            schemeName={scheme.scheme_name}
                                            region={scheme.region}
                                            block={scheme.block}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                {scheme.dashboard_url && (
                                  <a
                                    href={scheme.dashboard_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Open PI Vision Dashboard"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
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
                          {searchQuery
                            ? "No schemes match the search criteria"
                            : "No schemes available for the selected filter"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            {/* Pagination */}
            {filteredSchemes.length > 0 && (
              <CardFooter className="flex justify-between px-6 py-4 border-t border-blue-100">
                <div className="text-sm text-blue-600">
                  Showing {(page - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(page * itemsPerPage, filteredSchemes.length)} of{" "}
                  {filteredSchemes.length} schemes
                </div>
                <Pagination>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-blue-800">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Pagination>
              </CardFooter>
            )}
          </Card>
        </>
      )}

      {/* Historical Export Dialog */}
      <Dialog open={showHistoricalDialog} onOpenChange={setShowHistoricalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Export Historical Scheme LPCD Data</DialogTitle>
            <DialogDescription>
              Select a date range to export historical scheme LPCD data
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hist-start-date">Start Date</Label>
              <div className="relative">
                <Input
                  id="hist-start-date"
                  type="date"
                  value={historicalStartDate}
                  onChange={(e) => setHistoricalStartDate(e.target.value)}
                  data-testid="input-hist-start-date"
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hist-end-date">End Date</Label>
              <div className="relative">
                <Input
                  id="hist-end-date"
                  type="date"
                  value={historicalEndDate}
                  onChange={(e) => setHistoricalEndDate(e.target.value)}
                  data-testid="input-hist-end-date"
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            {selectedRegion && selectedRegion !== 'all' && (
              <div className="text-sm text-muted-foreground">
                Exporting data for region: <strong>{selectedRegion}</strong>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowHistoricalDialog(false)}
              disabled={isExportingHistorical}
              data-testid="button-cancel-hist-export"
            >
              Cancel
            </Button>
            <Button
              onClick={exportHistoricalData}
              disabled={isExportingHistorical}
              data-testid="button-confirm-hist-export"
            >
              {isExportingHistorical ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

export default SchemeLpcdDashboard;
