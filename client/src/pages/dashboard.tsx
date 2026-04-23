import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import RegionFilter from "@/components/dashboard/region-filter";
import StatsCards from "@/components/dashboard/stats-cards";
import ScopeOverview from "@/components/dashboard/scope-overview";
import RegionComparisonChart from "@/components/dashboard/region-comparison-chart";
import SimpleMaharashtraMap from "@/components/dashboard/simple-maharashtra-map";
import MetricSelector from "@/components/dashboard/metric-selector";
import DailyUpdates from "@/components/dashboard/daily-updates";
import FlipPopulationCards from "@/components/dashboard/flip-population-cards";
import SchemeTable from "@/components/dashboard/scheme-table";
import SchemeDetailsModal from "@/components/dashboard/scheme-details-modal";
import ComponentTypeFilter from "@/components/dashboard/ComponentTypeFilter";
import HistoricalDownloadModal from "@/components/dashboard/HistoricalDownloadModal";

// import ZoomableSunburst from "@/components/dashboard/zoomable-sunburst";

import ChatbotComponent, {
  FilterContextProvider,
} from "@/components/chatbot/ChatbotComponent";
import { Button } from "@/components/ui/button";
import {
  Download,
  RefreshCw,
  Map,
  Filter,
  GitBranchPlus,
  MapPin,
  BarChart2,
  PieChart,
  Droplet,
  Flame,
  Gauge,
  Wifi,
  Settings,
} from "lucide-react";
import { Region, RegionSummary, SchemeStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useComprehensiveActivityTracker } from "@/hooks/use-comprehensive-activity-tracker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, ChevronRight } from "lucide-react";
import ExcelJS from "exceljs";
// Import our map components
import { GitHubStyleMapPreview } from "@/components/maps";
// Import Enhanced GeoFilter Map
import EnhancedGeoFilterMap, {
  MapLocation,
} from "@/components/maps/EnhancedGeoFilterMap";
// Import GeoFilter context
import { useGeoFilter } from "@/contexts/GeoFilterContext";
// Import data hooks for geographic filtering
import { useGeographicFilteredSchemes } from "@/hooks/useGeographicFilteredData";
// Import GeoJSON data for our map
import getMaharashtraGeoJson from "@/lib/maharashtra-geojson";
// Import the new Figma-based Maharashtra map
import { Maharashtra } from "./Maharashtra";

// Interface for mini table data
interface VillageData {
  village_name: string;
  population: number;
  water_value_day7?: number;
  lpcd_value_day7?: number;
  number_of_esr?: number;
  fully_completion_village_status?: string;
}

interface ESRData {
  village_name: string;
  esr_name: string;
  chlorine_value_1?: number;
  pressure_value_1?: number;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
}

// Helper functions for LPCD colors and status
const getLPCDColor = (lpcdValue: number | null): string => {
  if (lpcdValue === null) return "text-gray-500";
  if (lpcdValue > 80) return "text-orange-500 font-semibold"; // High status (> 80L)
  if (lpcdValue > 70) return "text-green-600 font-semibold"; // High status (> 70L)
  if (lpcdValue >= 55) return "text-green-500 font-semibold"; // Good status (55-70L)
  if (lpcdValue >= 40) return "text-yellow-600 font-semibold"; // Low but not critical
  if (lpcdValue >= 25) return "text-orange-600 font-semibold"; // Very low
  if (lpcdValue > 0) return "text-red-500 font-semibold"; // Critical
  return "text-gray-500"; // No data
};

const getChlorineStatus = (
  value: number | null,
): "good" | "warning" | "danger" => {
  if (value === null || value === undefined) return "danger";
  if (value >= 0.2 && value <= 0.5) return "good";
  return "danger";
};

const getPressureStatus = (
  value: number | null,
): "good" | "warning" | "danger" => {
  if (value === null || value === undefined) return "danger";
  if (value >= 0.2 && value <= 0.7) return "good";
  if (value === 0) return "warning";
  return "danger";
};

const getStatusColor = (status: "good" | "warning" | "danger") => {
  switch (status) {
    case "good":
      return "text-green-600 font-semibold";
    case "warning":
      return "text-yellow-600 font-semibold";
    case "danger":
      return "text-red-500 font-semibold";
    default:
      return "text-gray-500";
  }
};

// Mini Table Component - Compact Version
function MiniTable({
  title,
  data,
  columns,
}: {
  title: string;
  data: any[];
  columns: Array<{
    key: string;
    header: string;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-3 py-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed" style={{ minWidth: "100%" }}>
          <thead style={{ backgroundColor: "#3b2e7d" }}>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{
                    backgroundColor: "#3b2e7d",
                    color: "white",
                    textAlign: "left",
                    padding: "4px 4px",
                    border: "none",
                    fontSize: "10px",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                    borderRadius: "0",
                    width:
                      index === 0 ? "18%" : `${82 / (columns.length - 1)}%`,
                    lineHeight: "1.2",
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const isTotal = row.region === "TOTAL";
              return (
                <tr
                  key={index}
                  style={{
                    backgroundColor: isTotal ? "#f8f9fa" : "white",
                    fontWeight: isTotal ? "600" : "normal",
                    borderTop: isTotal ? "2px solid #dee2e6" : "none",
                  }}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.key}
                      style={{
                        textAlign: "left",
                        padding: "3px 4px",
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: isTotal ? "#f8f9fa" : "white",
                        fontSize: "10px",
                        width:
                          colIndex === 0
                            ? "18%"
                            : `${82 / (columns.length - 1)}%`,
                        fontFamily: "Poppins, sans-serif",
                        borderRadius: "0",
                        fontWeight: isTotal ? "600" : "normal",
                        lineHeight: "1.2",
                      }}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] || "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Regional statistics interfaces
interface RegionalLPCDStats {
  region: string;
  consistentWaterSupply: number;
  consistentZeroWater: number;
  consistentAbove55LPCD: number;
  consistentBelow55LPCD: number;
  trueConsistentAbove55LPCD: number;
  trueConsistentBelow55LPCD: number;
}

interface RegionalChlorineStats {
  region: string;
  optimalChlorine: number;
  aboveRangeChlorine: number;
  belowRangeChlorine: number;
  consistentBelowChlorine: number;
  consistentOptimalChlorine: number;
  consistentAboveChlorine: number;
}

interface RegionalPressureStats {
  region: string;
  optimalPressure: number;
  aboveRangePressure: number;
  belowRangePressure: number;
  consistentBelowPressure: number;
  consistentOptimalPressure: number;
  consistentAbovePressure: number;
}

// Mini Tables Section Component
function MiniTablesSection({ selectedRegion }: { selectedRegion: string }) {
  const [, navigate] = useLocation();

  // Maharashtra regions
  const maharashtraRegions = [
    "Nagpur",
    "Pune",
    "Nashik",
    "Amravati",
    "Chhatrapati Sambhajinagar",
    "Konkan",
  ];

  // Fetch water scheme data for LPCD analysis
  const { data: waterSchemeData = [] } = useQuery<VillageData[]>({
    queryKey: ["/api/water-scheme-data"],
    queryFn: async () => {
      const response = await fetch("/api/water-scheme-data");
      if (!response.ok) throw new Error("Failed to fetch water scheme data");
      return response.json();
    },
  });

  // Fetch chlorine dashboard stats for each region
  const { data: chlorineDashboardStats } = useQuery({
    queryKey: ["/api/chlorine/dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/chlorine/dashboard-stats");
      if (!response.ok)
        throw new Error("Failed to fetch chlorine dashboard stats");
      return response.json();
    },
  });

  // Fetch pressure data (use same as pressure page to get accurate stats)
  const { data: allPressureData } = useQuery({
    queryKey: ["/api/pressure"],
    enabled: true,
  });

  // Fetch pressure sensors with water data for accurate filtering
  const { data: pressureWithWaterData } = useQuery({
    queryKey: ["/api/pressure/with-water-sensors"],
    enabled: true,
  });

  // Fetch chlorine data (use same as chlorine page to get accurate stats)
  const { data: allChlorineData } = useQuery({
    queryKey: ["/api/chlorine"],
    enabled: true,
  });

  // Fetch chlorine sensors with water data for accurate filtering
  const { data: chlorineWithWaterData } = useQuery({
    queryKey: ["/api/chlorine/with-water-sensors"],
    enabled: true,
  });

  // Calculate pressure regional stats using the same logic as pressure page
  const pressureRegionalStats: RegionalPressureStats[] = useMemo(() => {
    if (
      !allPressureData ||
      !Array.isArray(allPressureData) ||
      !pressureWithWaterData?.data?.withWaterSensors
    ) {
      return maharashtraRegions.map((region) => ({
        region,
        optimalPressure: 0,
        aboveRangePressure: 0,
        belowRangePressure: 0,
        consistentBelowPressure: 0,
        consistentOptimalPressure: 0,
        consistentAbovePressure: 0,
      }));
    }

    // Get sensor IDs that have water (same logic as pressure dashboard)
    const withWaterSensorIds = new Set(
      pressureWithWaterData.data.withWaterSensors.map(
        (sensor: any) =>
          `${sensor.scheme_id}|${sensor.village_name}|${sensor.esr_name}`,
      ),
    );

    return maharashtraRegions.map((region) => {
      // Filter pressure data for this region AND only include sensors with water
      const regionPressureData = (
        Array.isArray(allPressureData) ? allPressureData : []
      ).filter((item: any) => {
        if (item.region !== region) return false;

        // Only count sensors that have water (same check as pressure dashboard)
        const sensorKey = `${item.scheme_id}|${item.village_name}|${item.esr_name}`;
        return withWaterSensorIds.has(sensorKey);
      });

      // Calculate stats using same logic as pressure page
      let optimalPressure = 0;
      let aboveRangePressure = 0;
      let belowRangePressure = 0;
      let consistentBelowPressure = 0;
      let consistentOptimalPressure = 0;
      let consistentAbovePressure = 0;

      regionPressureData.forEach((item: any) => {
        // Get latest pressure value (pressure_value_7)
        const latestValue =
          item.pressure_value_7 !== null && item.pressure_value_7 !== undefined
            ? parseFloat(String(item.pressure_value_7))
            : null;

        // Current value categorization (same logic as pressure dashboard)
        if (latestValue === null || latestValue < 0.2) {
          belowRangePressure++;
        } else if (latestValue >= 0.2 && latestValue <= 0.7) {
          optimalPressure++;
        } else if (latestValue > 0.7) {
          aboveRangePressure++;
        }

        // Consistent range calculations (same logic as pressure page)
        const values = [
          parseFloat(String(item.pressure_value_1 || 0)),
          parseFloat(String(item.pressure_value_2 || 0)),
          parseFloat(String(item.pressure_value_3 || 0)),
          parseFloat(String(item.pressure_value_4 || 0)),
          parseFloat(String(item.pressure_value_5 || 0)),
          parseFloat(String(item.pressure_value_6 || 0)),
          parseFloat(String(item.pressure_value_7 || 0)),
        ];

        // Use same logic as pressure dashboard (excludes zeros from consistent below)
        if (values.every((val) => val > 0 && val < 0.2)) {
          consistentBelowPressure++;
        } else if (values.every((val) => val >= 0.2 && val <= 0.7)) {
          consistentOptimalPressure++;
        } else if (values.every((val) => val > 0.7)) {
          consistentAbovePressure++;
        }
      });

      return {
        region,
        optimalPressure,
        aboveRangePressure,
        belowRangePressure,
        consistentBelowPressure,
        consistentOptimalPressure,
        consistentAbovePressure,
      };
    });
  }, [allPressureData, pressureWithWaterData]);

  // Helper functions for consistent LPCD calculation (matching village LPCD page logic)
  const getLatestLpcdValue = (village: any): number | null => {
    // Try to get the latest non-null LPCD value, starting with day 7
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
      const value = village[`lpcd_value_day${day}`];
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

  const hasConsistentZeroWaterSupply = (village: any): boolean => {
    const waterValues = [
      village.water_value_day1,
      village.water_value_day2,
      village.water_value_day3,
      village.water_value_day4,
      village.water_value_day5,
      village.water_value_day6,
      village.water_value_day7,
    ];
    // Check if all water values are explicitly 0 (excluding null/undefined) - matches LPCD page logic
    return waterValues.every((value) => {
      if (value === null || value === undefined) return false;
      return Number(value) === 0;
    });
  };

  const isConsistentlyAboveThreshold = (
    village: any,
    threshold: number,
  ): boolean => {
    const lpcdValues = [
      village.lpcd_value_day1,
      village.lpcd_value_day2,
      village.lpcd_value_day3,
      village.lpcd_value_day4,
      village.lpcd_value_day5,
      village.lpcd_value_day6,
      village.lpcd_value_day7,
    ]
      .filter(
        (val) =>
          val !== undefined &&
          val !== null &&
          val !== "" &&
          !isNaN(Number(val)),
      )
      .map((val) => Number(val));

    if (lpcdValues.length === 0) return false;
    return lpcdValues.every((val) => val >= threshold);
  };

  const isConsistentlyBelowThreshold = (
    village: any,
    threshold: number,
  ): boolean => {
    const lpcdValues = [
      village.lpcd_value_day1,
      village.lpcd_value_day2,
      village.lpcd_value_day3,
      village.lpcd_value_day4,
      village.lpcd_value_day5,
      village.lpcd_value_day6,
      village.lpcd_value_day7,
    ]
      .filter(
        (val) =>
          val !== undefined &&
          val !== null &&
          val !== "" &&
          !isNaN(Number(val)),
      )
      .map((val) => Number(val));

    if (lpcdValues.length === 0) return false;
    return lpcdValues.every((val) => val < threshold);
  };

  // Calculate LPCD regional statistics
  const lpcdRegionalStats: RegionalLPCDStats[] = maharashtraRegions.map(
    (region) => {
      const regionVillages = waterSchemeData.filter(
        (village: any) => village.region === region,
      );

      const consistentWaterSupply = regionVillages.filter((village: any) => {
        // Check if village has consistent water supply for 7 days (water_value_day1 to day7 > 0)
        return (
          village.water_value_day1 > 0 &&
          village.water_value_day2 > 0 &&
          village.water_value_day3 > 0 &&
          village.water_value_day4 > 0 &&
          village.water_value_day5 > 0 &&
          village.water_value_day6 > 0 &&
          village.water_value_day7 > 0
        );
      }).length;

      const consistentZeroWater = regionVillages.filter((village: any) => {
        // Use the correct zero water logic that matches village LPCD page
        return hasConsistentZeroWaterSupply(village);
      }).length;

      const consistentAbove55LPCD = regionVillages.filter((village: any) => {
        // Match village LPCD page logic: use latest LPCD value > 55 instead of all 7 days
        const lpcdValue = getLatestLpcdValue(village);
        return lpcdValue !== null && lpcdValue > 55;
      }).length;

      const consistentBelow55LPCD = regionVillages.filter((village: any) => {
        // Match village LPCD page logic: use latest LPCD value <= 55 (excluding null/zero)
        const lpcdValue = getLatestLpcdValue(village);
        return lpcdValue !== null && lpcdValue > 0 && lpcdValue <= 55;
      }).length;

      // Add true 7-day consistent calculations for separate tracking
      const trueConsistentAbove55LPCD = regionVillages.filter(
        (village: any) => {
          return isConsistentlyAboveThreshold(village, 55);
        },
      ).length;

      const trueConsistentBelow55LPCD = regionVillages.filter(
        (village: any) => {
          return isConsistentlyBelowThreshold(village, 55);
        },
      ).length;

      return {
        region,
        consistentWaterSupply,
        consistentZeroWater,
        consistentAbove55LPCD,
        consistentBelow55LPCD,
        trueConsistentAbove55LPCD,
        trueConsistentBelow55LPCD,
      };
    },
  );

  // Calculate chlorine regional stats using the same logic as chlorine page
  const chlorineRegionalStats: RegionalChlorineStats[] = useMemo(() => {
    if (
      !allChlorineData ||
      !Array.isArray(allChlorineData) ||
      !chlorineWithWaterData?.data?.withWaterSensors
    ) {
      return maharashtraRegions.map((region) => ({
        region,
        optimalChlorine: 0,
        aboveRangeChlorine: 0,
        belowRangeChlorine: 0,
        consistentBelowChlorine: 0,
        consistentOptimalChlorine: 0,
        consistentAboveChlorine: 0,
      }));
    }

    // Get sensor IDs that have water (same logic as chlorine dashboard)
    const withWaterSensorIds = new Set(
      chlorineWithWaterData.data.withWaterSensors.map(
        (sensor: any) =>
          `${sensor.scheme_id}|${sensor.village_name}|${sensor.esr_name}`,
      ),
    );

    return maharashtraRegions.map((region) => {
      // Filter chlorine data for this region AND only include sensors with water
      const regionChlorineData = (
        Array.isArray(allChlorineData) ? allChlorineData : []
      ).filter((item: any) => {
        if (item.region !== region) return false;

        // Only count sensors that have water (same check as chlorine dashboard)
        const sensorKey = `${item.scheme_id}|${item.village_name}|${item.esr_name}`;
        return withWaterSensorIds.has(sensorKey);
      });

      // Calculate stats using same logic as chlorine page
      let optimalChlorine = 0;
      let aboveRangeChlorine = 0;
      let belowRangeChlorine = 0;
      let consistentBelowChlorine = 0;
      let consistentOptimalChlorine = 0;
      let consistentAboveChlorine = 0;

      regionChlorineData.forEach((item: any) => {
        // Get latest chlorine value (chlorine_value_7)
        const latestValue =
          item.chlorine_value_7 !== null && item.chlorine_value_7 !== undefined
            ? parseFloat(String(item.chlorine_value_7))
            : null;

        // Current value categorization (same logic as chlorine dashboard)
        if (latestValue === null || latestValue < 0.2) {
          belowRangeChlorine++;
        } else if (latestValue >= 0.2 && latestValue <= 0.5) {
          optimalChlorine++;
        } else if (latestValue > 0.5) {
          aboveRangeChlorine++;
        }

        // Consistent range calculations (same logic as chlorine page)
        const values = [
          parseFloat(String(item.chlorine_value_1 || 0)),
          parseFloat(String(item.chlorine_value_2 || 0)),
          parseFloat(String(item.chlorine_value_3 || 0)),
          parseFloat(String(item.chlorine_value_4 || 0)),
          parseFloat(String(item.chlorine_value_5 || 0)),
          parseFloat(String(item.chlorine_value_6 || 0)),
          parseFloat(String(item.chlorine_value_7 || 0)),
        ];

        // Use same logic as chlorine dashboard (excludes zeros from consistent below)
        if (values.every((val) => val > 0 && val < 0.2)) {
          consistentBelowChlorine++;
        } else if (values.every((val) => val >= 0.2 && val <= 0.5)) {
          consistentOptimalChlorine++;
        } else if (values.every((val) => val > 0.5)) {
          consistentAboveChlorine++;
        }
      });

      return {
        region,
        optimalChlorine,
        aboveRangeChlorine,
        belowRangeChlorine,
        consistentBelowChlorine,
        consistentOptimalChlorine,
        consistentAboveChlorine,
      };
    });
  }, [allChlorineData, chlorineWithWaterData]);

  // Filter regional stats based on selected region and add totals
  const filteredLPCDStats =
    selectedRegion !== "all"
      ? lpcdRegionalStats.filter((stat) => stat.region === selectedRegion)
      : lpcdRegionalStats;

  const filteredChlorineStats =
    selectedRegion !== "all"
      ? chlorineRegionalStats.filter((stat) => stat.region === selectedRegion)
      : chlorineRegionalStats;

  const filteredPressureStats =
    selectedRegion !== "all"
      ? pressureRegionalStats.filter((stat) => stat.region === selectedRegion)
      : pressureRegionalStats;

  // Calculate totals for each category
  const lpcdTotals = {
    region: "TOTAL",
    consistentWaterSupply: filteredLPCDStats.reduce(
      (sum, stat) => sum + stat.consistentWaterSupply,
      0,
    ),
    consistentZeroWater: filteredLPCDStats.reduce(
      (sum, stat) => sum + stat.consistentZeroWater,
      0,
    ),
    consistentAbove55LPCD: filteredLPCDStats.reduce(
      (sum, stat) => sum + stat.consistentAbove55LPCD,
      0,
    ),
    consistentBelow55LPCD: filteredLPCDStats.reduce(
      (sum, stat) => sum + stat.consistentBelow55LPCD,
      0,
    ),
    trueConsistentAbove55LPCD: filteredLPCDStats.reduce(
      (sum, stat) => sum + stat.trueConsistentAbove55LPCD,
      0,
    ),
    trueConsistentBelow55LPCD: filteredLPCDStats.reduce(
      (sum, stat) => sum + stat.trueConsistentBelow55LPCD,
      0,
    ),
  };

  const chlorineTotals = {
    region: "TOTAL",
    optimalChlorine: filteredChlorineStats.reduce(
      (sum, stat) => sum + stat.optimalChlorine,
      0,
    ),
    aboveRangeChlorine: filteredChlorineStats.reduce(
      (sum, stat) => sum + stat.aboveRangeChlorine,
      0,
    ),
    belowRangeChlorine: filteredChlorineStats.reduce(
      (sum, stat) => sum + stat.belowRangeChlorine,
      0,
    ),
    consistentBelowChlorine: filteredChlorineStats.reduce(
      (sum, stat) => sum + stat.consistentBelowChlorine,
      0,
    ),
    consistentOptimalChlorine: filteredChlorineStats.reduce(
      (sum, stat) => sum + stat.consistentOptimalChlorine,
      0,
    ),
    consistentAboveChlorine: filteredChlorineStats.reduce(
      (sum, stat) => sum + stat.consistentAboveChlorine,
      0,
    ),
  };

  const pressureTotals = {
    region: "TOTAL",
    optimalPressure: filteredPressureStats.reduce(
      (sum, stat) => sum + stat.optimalPressure,
      0,
    ),
    aboveRangePressure: filteredPressureStats.reduce(
      (sum, stat) => sum + stat.aboveRangePressure,
      0,
    ),
    belowRangePressure: filteredPressureStats.reduce(
      (sum, stat) => sum + stat.belowRangePressure,
      0,
    ),
    consistentBelowPressure: filteredPressureStats.reduce(
      (sum, stat) => sum + stat.consistentBelowPressure,
      0,
    ),
    consistentOptimalPressure: filteredPressureStats.reduce(
      (sum, stat) => sum + stat.consistentOptimalPressure,
      0,
    ),
    consistentAbovePressure: filteredPressureStats.reduce(
      (sum, stat) => sum + stat.consistentAbovePressure,
      0,
    ),
  };

  // Add totals to the filtered data
  const lpcdStatsWithTotals = [...filteredLPCDStats, lpcdTotals];
  const chlorineStatsWithTotals = [...filteredChlorineStats, chlorineTotals];
  const pressureStatsWithTotals = [...filteredPressureStats, pressureTotals];

  // Create navigation functions
  const navigateToVillageList = (region: string, category: string) => {
    console.log("Navigating to village list:", { region, category });
    const params = new URLSearchParams({
      region: region,
      category: category,
      type: "water",
    });
    const url = `/details/villages?${params.toString()}`;
    console.log("Navigation URL:", url);
    navigate(url);
  };

  const navigateToChlorinePage = (region: string, category: string) => {
    // Map category to chlorine range filter
    const rangeMapping: { [key: string]: string } = {
      optimal: "between_0.2_0.5",
      "above-range": "above_0.5",
      "below-range": "below_0.2",
      "consistent-below": "consistent_below",
      "consistent-optimal": "consistent_optimal",
      "consistent-above": "consistent_above",
    };

    const params = new URLSearchParams();
    if (region !== "TOTAL") {
      params.append("region", region);
    }
    if (rangeMapping[category]) {
      params.append("range", rangeMapping[category]);
    }

    const url = `/chlorine${params.toString() ? "?" + params.toString() : ""}`;
    console.log("Dashboard: Navigating to chlorine page with URL:", url);
    console.log("Dashboard: Navigation params:", {
      region,
      category,
      mappedRange: rangeMapping[category],
    });
    navigate(url);
  };

  const navigateToPressurePage = (region: string, category: string) => {
    // Map category to pressure range filter (using similar mapping as chlorine)
    const rangeMapping: { [key: string]: string } = {
      optimal: "between_0.2_0.7",
      "above-range": "above_0.7",
      "below-range": "below_0.2",
      "consistent-below": "consistent_below",
      "consistent-optimal": "consistent_optimal",
      "consistent-above": "consistent_above",
    };

    const params = new URLSearchParams();
    if (region !== "TOTAL") {
      params.append("region", region);
    }
    if (rangeMapping[category]) {
      params.append("range", rangeMapping[category]);
    }

    const url = `/pressure${params.toString() ? "?" + params.toString() : ""}`;
    console.log("Dashboard: Navigating to pressure page with URL:", url);
    console.log("Dashboard: Navigation params:", {
      region,
      category,
      mappedRange: rangeMapping[category],
    });
    navigate(url);
  };

  const navigateToLpcdPage = (region: string, category: string) => {
    // Map category to EnhancedLpcdDashboard range parameter format
    const rangeMapping: { [key: string]: string } = {
      "consistent-water": "consistent-water",
      "zero-water": "zero-water",
      "above-55-lpcd": "above-55-lpcd",
      "below-55-lpcd": "below-55-lpcd",
      "consistent-above-55": "consistent-above-55",
      "consistent-below-55": "consistent-below-55",
    };

    const params = new URLSearchParams();
    if (region !== "TOTAL") {
      params.append("region", region);
    }
    if (rangeMapping[category]) {
      params.append("range", rangeMapping[category]); // Use 'range' parameter for LPCD dashboard
    }

    const url = `/lpcd${params.toString() ? "?" + params.toString() : ""}`;
    console.log("Dashboard: Navigating to LPCD Dashboard with URL:", url);
    console.log("Dashboard: Navigation params:", {
      region,
      category,
      mappedRange: rangeMapping[category],
    });
    navigate(url);
  };

  // LPCD Regional Statistics Table
  const lpcdColumns = [
    {
      key: "region",
      header: "REGION",
    },
    {
      key: "consistentWaterSupply",
      header: "CONSISTENT WATER (7 DAYS)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToLpcdPage(row.region, "consistent-water")}
          className="text-green-600 font-semibold hover:text-green-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentZeroWater",
      header: "ZERO WATER (7 DAYS)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToLpcdPage(row.region, "zero-water")}
          className="text-red-500 font-semibold hover:text-red-700 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentAbove55LPCD",
      header: "ABOVE 55 LPCD",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToLpcdPage(row.region, "above-55-lpcd")}
          className="text-green-500 font-semibold hover:text-green-700 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentBelow55LPCD",
      header: "BELOW 55 LPCD",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToLpcdPage(row.region, "below-55-lpcd")}
          className="text-orange-600 font-semibold hover:text-orange-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "trueConsistentAbove55LPCD",
      header: "CONSISTENT ABOVE 55 LPCD",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToLpcdPage(row.region, "consistent-above-55")}
          className="text-green-700 font-semibold hover:text-green-900 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "trueConsistentBelow55LPCD",
      header: "CONSISTENT BELOW 55 LPCD",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToLpcdPage(row.region, "consistent-below-55")}
          className="text-orange-700 font-semibold hover:text-orange-900 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
  ];

  // Chlorine Regional Statistics Table
  const chlorineColumns = [
    {
      key: "region",
      header: "REGION",
    },
    {
      key: "optimalChlorine",
      header: "OPTIMAL RANGE (0.2-0.5)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToChlorinePage(row.region, "optimal")}
          className="text-green-600 font-semibold hover:text-green-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "aboveRangeChlorine",
      header: "ABOVE RANGE (>0.5)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToChlorinePage(row.region, "above-range")}
          className="text-orange-600 font-semibold hover:text-orange-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "belowRangeChlorine",
      header: "BELOW RANGE (<0.2)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToChlorinePage(row.region, "below-range")}
          className="text-red-500 font-semibold hover:text-red-700 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentBelowChlorine",
      header: "CONSISTENT BELOW",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToChlorinePage(row.region, "consistent-below")}
          className="text-red-600 font-semibold hover:text-red-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentOptimalChlorine",
      header: "CONSISTENT OPTIMAL",
      render: (value: number, row: any) => (
        <button
          onClick={() =>
            navigateToChlorinePage(row.region, "consistent-optimal")
          }
          className="text-green-700 font-semibold hover:text-green-900 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentAboveChlorine",
      header: "CONSISTENT ABOVE",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToChlorinePage(row.region, "consistent-above")}
          className="text-orange-700 font-semibold hover:text-orange-900 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
  ];

  // Pressure Regional Statistics Table
  const pressureColumns = [
    {
      key: "region",
      header: "REGION",
    },
    {
      key: "optimalPressure",
      header: "OPTIMAL RANGE (0.2-0.7)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToPressurePage(row.region, "optimal")}
          className="text-green-600 font-semibold hover:text-green-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "aboveRangePressure",
      header: "ABOVE RANGE (>0.7)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToPressurePage(row.region, "above-range")}
          className="text-orange-600 font-semibold hover:text-orange-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "belowRangePressure",
      header: "BELOW RANGE (<0.2)",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToPressurePage(row.region, "below-range")}
          className="text-red-500 font-semibold hover:text-red-700 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentBelowPressure",
      header: "CONSISTENT BELOW",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToPressurePage(row.region, "consistent-below")}
          className="text-red-600 font-semibold hover:text-red-800 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentOptimalPressure",
      header: "CONSISTENT OPTIMAL",
      render: (value: number, row: any) => (
        <button
          onClick={() =>
            navigateToPressurePage(row.region, "consistent-optimal")
          }
          className="text-green-700 font-semibold hover:text-green-900 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
    {
      key: "consistentAbovePressure",
      header: "CONSISTENT ABOVE",
      render: (value: number, row: any) => (
        <button
          onClick={() => navigateToPressurePage(row.region, "consistent-above")}
          className="text-orange-700 font-semibold hover:text-orange-900 hover:underline cursor-pointer transition-colors"
          disabled={value === 0}
        >
          {value}
        </button>
      ),
    },
  ];

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 p-4 rounded-lg border border-blue-100 shadow-md">
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-semibold text-blue-800 flex items-center">
            <span className="w-2 h-6 bg-blue-500 rounded-sm mr-3"></span>
            Village Data Overview
          </h2>
          {selectedRegion !== "all" && (
            <span className="ml-3 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              {selectedRegion} Region
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <MiniTable
            title="LPCD & Water Supply Regional Statistics"
            data={lpcdStatsWithTotals}
            columns={lpcdColumns}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MiniTable
              title="Chlorine Regional Statistics (ESR Count with Water)"
              data={chlorineStatsWithTotals}
              columns={chlorineColumns}
            />
            <MiniTable
              title="Pressure Regional Statistics (ESR Count with Water)"
              data={pressureStatsWithTotals}
              columns={pressureColumns}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedScheme, setSelectedScheme] = useState<SchemeStatus | null>(
    null,
  );
  const [schemeView, setSchemeView] = useState<"ALL" | "INSTRUMENTED">(
    "INSTRUMENTED",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEnhancedMap, setShowEnhancedMap] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { trackPageVisit, trackDataExport, trackFilterUsage } =
    useComprehensiveActivityTracker();

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Main Dashboard", window.location.href);
  }, [trackPageVisit]);

  // Fetch regions data (moved before useEffect that uses it)
  const {
    data: regions = [],
    isLoading: isRegionsLoading,
    refetch: refetchRegions,
  } = useQuery<Region[]>({
    queryKey: ["/api/regions", schemeView],
    queryFn: () =>
      fetch(`/api/regions?view=${schemeView}`).then((res) => res.json()),
  });

  // Listen for region filter changes and export commands from chatbot
  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      console.log("Main Dashboard received region filter:", region);
      setSelectedRegion(region === "all" ? "all" : region);
    };

    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Dashboard received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type
      if (pageType === "dashboard") {
        // Wait for data to be filtered properly
        setTimeout(() => {
          if (regions && regions.length > 0) {
            handleExport();
            console.log(
              "Excel export triggered for Dashboard data with",
              regions.length,
              "total records",
            );
          } else {
            console.log("No Dashboard data available for export");
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
        handleExport();
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
  }, [regions]);

  // Map configuration
  const mapRef = useRef(null);

  // Get geographic filter context
  const { filter, isFiltering, clearFilter } = useGeoFilter();

  // Use our geographic filtered schemes
  const {
    data: geoFilteredSchemes = [],
    isLoading: isGeoFilteredSchemesLoading,
  } = useGeographicFilteredSchemes();

  // Maharashtra major 6 regions with verified accurate coordinates - names exactly match database
  const [sampleLocations, setSampleLocations] = useState<MapLocation[]>([
    // Pune Region
    {
      name: "Pune",
      latitude: 18.52,
      longitude: 73.85,
      type: "scheme",
      details: {
        Schemes: "36",
        Villages: "426",
        ESRs: "156",
      },
    },

    // Nashik Region
    {
      name: "Nashik",
      latitude: 20.0,
      longitude: 73.78,
      type: "scheme",
      details: {
        Schemes: "29",
        Villages: "342",
        ESRs: "124",
      },
    },

    // Amravati Region
    {
      name: "Amravati",
      latitude: 20.93,
      longitude: 77.75,
      type: "scheme",
      details: {
        Schemes: "21",
        Villages: "197",
        ESRs: "86",
      },
    },

    // Chhatrapati Sambhajinagar Region
    {
      name: "Chhatrapati Sambhajinagar",
      latitude: 19.87,
      longitude: 75.34,
      type: "scheme",
      details: {
        Schemes: "26",
        Villages: "280",
        ESRs: "102",
      },
    },

    // Nagpur Region
    {
      name: "Nagpur",
      latitude: 21.15,
      longitude: 79.09,
      type: "scheme",
      details: {
        Schemes: "30",
        Villages: "364",
        ESRs: "146",
      },
    },

    // Konkan Region - adjusted position for better visibility
    {
      name: "Konkan",
      latitude: 18.1,
      longitude: 73.1,
      type: "scheme",
      details: {
        Schemes: "18",
        Villages: "163",
        ESRs: "76",
      },
    },
  ]);

  // Fetch region summary data (total stats based on selected region)
  const {
    data: regionSummary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery<RegionSummary>({
    queryKey: ["/api/regions/summary", selectedRegion, schemeView],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      params.append("view", schemeView);
      return fetch(`/api/regions/summary?${params.toString()}`).then((res) =>
        res.json(),
      );
    },
  });

  // State for status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mapMetric, setMapMetric] = useState<
    "completion" | "esr" | "villages" | "flow_meter"
  >("completion");

  // Fetch schemes data with region and status filters
  const {
    data: schemes = [],
    isLoading: isSchemesLoading,
    refetch: refetchSchemes,
  } = useQuery<SchemeStatus[]>({
    queryKey: ["/api/schemes", selectedRegion, statusFilter],
    queryFn: () => {
      let url = `/api/schemes`;
      const params = new URLSearchParams();

      if (selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      return fetch(url).then((res) => res.json());
    },
  });

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };

  const handleRefresh = () => {
    refetchRegions();
    refetchSummary();
    refetchSchemes();
    toast({
      title: "Dashboard Refreshed",
      description: "Data has been updated successfully.",
    });
  };

  // State to track the currently filtered schemes from SchemeTable
  const [currentFilteredSchemes, setCurrentFilteredSchemes] = useState<
    SchemeStatus[]
  >([]);

  // Callback to receive filtered schemes from SchemeTable
  const handleFilteredSchemesChange = (filteredSchemes: SchemeStatus[]) => {
    setCurrentFilteredSchemes(filteredSchemes);
    console.log(
      `Received ${filteredSchemes.length} filtered schemes from SchemeTable`,
    );
  };

  // Export function
  const handleExport = async () => {
    try {
      // Fetch data directly from region table instead of using scheme data
      if (!regions || regions.length === 0) {
        toast({
          title: "No Data To Export",
          description: "No region data available for export.",
          variant: "destructive",
        });
        return;
      }

      console.log(`Exporting ${regions.length} regions from region table`);

      // Show loading toast
      toast({
        title: "Preparing Export",
        description: `Gathering ${regions.length} regions for export...`,
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

      // Define the specific region order as requested
      const regionOrder = [
        "Nagpur",
        "Chhatrapati Sambhajinagar",
        "Pune",
        "Konkan",
        "Amravati",
        "Nashik",
      ];

      // Sort regions according to the specified order
      const sortedRegions = [...regions].sort((a, b) => {
        const aIndex = regionOrder.indexOf(a.region_name);
        const bIndex = regionOrder.indexOf(b.region_name);

        // If region not found in order, put it at the end
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;

        return aIndex - bIndex;
      });

      // Convert region data to export format
      const exportData = sortedRegions.map((region) => ({
        "Region Name": region.region_name,
        "Fully Completed Schemes": region.fully_completed_schemes || 0,
        "Fully Completed Villages": region.fully_completed_villages || 0,
        "Fully Completed ESR": region.fully_completed_esr || 0,
        "Partially Completed Schemes":
          (region.total_schemes_integrated || 0) -
          (region.fully_completed_schemes || 0),
        "Partially Completed Villages":
          (region.total_villages_integrated || 0) -
          (region.fully_completed_villages || 0),
        "Partially Completed ESR": region.partial_esr || 0,
        "No. of Flowmeters Integrated": region.flow_meter_integrated || 0,
        "No. of Residual Chlorine Analyzers Integrated":
          region.rca_integrated || 0,
        "No. of Pressure Transmitters Integrated":
          region.pressure_transmitter_integrated || 0,
      }));

      // Create workbook and worksheet using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Region Summary");
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

      // Generate filename based on filters
      let filename = "region-summary";
      if (selectedRegion !== "all") {
        filename += `-${selectedRegion}`;
      }
      if (statusFilter !== "all") {
        filename += `-${statusFilter}`;
      }
      filename += ".xlsx";

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

      // Track the data export activity with detailed filter information
      const appliedFilters = {
        region: selectedRegion !== "all" ? selectedRegion : undefined,
        statusFilter: statusFilter !== "all" ? statusFilter : undefined,
        geoFilter: isFiltering ? "Geographic Filter Applied" : undefined,
      };

      // Clean up undefined values for tracking
      const cleanedFilters = Object.fromEntries(
        Object.entries(appliedFilters).filter(
          ([_, value]) => value !== undefined,
        ),
      );

      trackDataExport(
        "Region Summary",
        filename,
        exportData.length,
        cleanedFilters,
        {
          exportSource: "main_dashboard",
          totalRegions: exportData.length,
          totalRegionsExported: regions.length,
        },
      );

      toast({
        title: "Export Complete",
        description: `Exported ${exportData.length} regions summary to Excel with data from region table.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewSchemeDetails = (scheme: SchemeStatus) => {
    setSelectedScheme(scheme);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handler for status filter changes
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    // Track filter usage
    if (status !== "all") {
      trackFilterUsage("status", status, undefined, "main_dashboard");
    }
  };

  // Track page visit on component mount
  useEffect(() => {
    trackPageVisit("Main Dashboard");
  }, [trackPageVisit]);

  // Make export function globally accessible and add chatbot event listeners
  useEffect(() => {
    // Handler for chatbot-triggered Excel exports
    const handleChatbotExcelExport = (event: CustomEvent) => {
      const { region, pageType } = event.detail;
      console.log("Dashboard page received excel export command:", {
        region,
        pageType,
      });

      // Only respond if this is the right page type or default dashboard
      if (
        pageType === "dashboard" ||
        pageType === "main" ||
        pageType === "main-dashboard"
      ) {
        // Wait for data to be available, then export
        setTimeout(() => {
          handleExport();
          console.log("Excel export triggered for Dashboard data");
        }, 1500); // Wait longer for queries to refetch
      }
    };

    // Add event listener for chatbot exports
    window.addEventListener(
      "chatbot-export-excel",
      handleChatbotExcelExport as EventListener,
    );

    // Expose the export function to window for the chatbot to use
    // We need to make sure the function is properly bound to the component
    // and its filters, so we create a new function that calls our export
    (window as any).triggerDashboardExport = () => {
      console.log("Global Excel export triggered with filters:", {
        region: selectedRegion,
        status: statusFilter,
      });

      // Execute the export function directly (not as a Promise)
      handleExport();

      // Return a resolved promise for API consistency
      return Promise.resolve();
    };

    // Clean up when component unmounts
    return () => {
      window.removeEventListener(
        "chatbot-export-excel",
        handleChatbotExcelExport as EventListener,
      );
      (window as any).triggerDashboardExport = undefined;
    };
  }, [selectedRegion, statusFilter, handleExport]); // Re-bind when filters or the handler changes

  return (
    <DashboardLayout>
      {/* Add ComponentTypeFilter for highlighting components when asked about through chatbot */}
      <ComponentTypeFilter
        onFilterChange={(componentType) => {
          console.log(
            `Dashboard received component filter change: ${componentType}`,
          );
          // You can add additional logic here if needed
        }}
      />

      {/* Enhanced Dashboard Header with water-themed gradient */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-600/20 via-blue-400/15 to-blue-700/10 rounded-lg mb-4 sm:mb-6 shadow-md border border-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500">
              SWSM IoT Project Progress Dashboard
            </h1>
            <p className="mt-1 sm:mt-2 text-sm text-blue-700/80 font-medium flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Integration Dashboard for Jal Jeevan Mission
              <span className="ml-3 py-0.5 px-2 text-xs bg-blue-100 text-blue-700 rounded-full">
                Live Data
              </span>
            </p>
          </div>
          <div className="mt-4 flex sm:mt-0 sm:ml-4 space-x-3">
            <HistoricalDownloadModal selectedRegion={selectedRegion} />
            <Button
              variant="outline"
              size="sm"
              className="border-blue-300 hover:bg-blue-50 transition-all text-xs sm:text-sm shadow-sm"
              onClick={handleExport}
            >
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={handleRefresh}
              className="bg-[#05529c] hover:bg-blue-700 transition-all text-xs sm:text-sm shadow-sm"
            >
              <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Daily Updates */}
      <DailyUpdates isLoading={false} />

      {/* Quick Navigation Cards */}

      {/* Filter Dashboard Card */}
      <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-white rounded-xl border border-gray-200 shadow-sm relative z-10">
        <h2 className="text-sm sm:text-base font-semibold mb-4 text-blue-800 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter Dashboard
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          {/* Region Selection */}
          <div className="md:col-span-7 lg:col-span-8">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
              Filter by Region
            </label>
            <RegionFilter
              regions={regions || []}
              selectedRegion={selectedRegion}
              onChange={handleRegionChange}
            />
          </div>

          {/* Scheme View Mode Toggle */}
          <div className="md:col-span-5 lg:col-span-4">
            <label className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1.5 block">
              Scheme View Mode
            </label>
            <div className="flex items-center p-1 bg-gray-100/50 rounded-lg border border-gray-200 w-full">
              <button
                onClick={() => setSchemeView("ALL")}
                className={`flex-1 px-4 py-2 text-xs font-bold rounded-md transition-all ${schemeView === "ALL"
                  ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                All Schemes
              </button>
              <button
                onClick={() => setSchemeView("INSTRUMENTED")}
                className={`flex-1 px-4 py-2 text-xs font-bold rounded-md transition-all ${schemeView === "INSTRUMENTED"
                  ? "bg-white text-purple-700 shadow-sm border border-purple-100"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                100% Civil Work Completed Schemes(MVS)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Map and Stats Cards Layout (stacked on mobile, side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Scope Overview - Full width on mobile, 5/12 on desktop */}
        <div className="lg:col-span-5 flex flex-col">
          <ScopeOverview selectedRegion={selectedRegion} />
        </div>

        {/* Stats Cards Area - Full width on mobile, 7/12 on desktop */}
        <div className="lg:col-span-7">
          <StatsCards
            data={regionSummary}
            isLoading={isSummaryLoading}
            layout="compact"
            selectedRegion={selectedRegion}
            schemeView={schemeView}
          />
        </div>
      </div>

      {/* Mini Tables Section */}
      {/*<MiniTablesSection selectedRegion={selectedRegion} />*/}

      {/* Full-width Population Cards Section */}
      {/*<div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200 shadow-md">
          <div className="flex items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 flex items-center">
              <span className="w-2 h-6 bg-blue-500 rounded-sm mr-3"></span>
              Population Water Coverage Overview
            </h2>
            {selectedRegion !== "all" && (
              <span className="ml-3 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                {selectedRegion} Region
              </span>
            )}
          </div>
          <FlipPopulationCards selectedRegion={selectedRegion} />
        </div>
      </div>*/}

      {/* Region Comparison Chart - Full Width */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100 shadow-md hover:shadow-lg transition-all">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3">
            <h2 className="text-sm sm:text-base font-semibold text-blue-800 flex items-center mb-2 sm:mb-0">
              <span className="w-1.5 h-6 bg-blue-500 rounded-sm mr-2"></span>
              Region Wise IoT Project Status
            </h2>
            <div className="flex flex-wrap space-x-2 items-center text-[8px] sm:text-[10px]">
              <span className="flex items-center">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-green-500 mr-1"></span>
                <span className="text-green-700">ESR</span>
              </span>
              <span className="flex items-center">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-pink-500 mr-1"></span>
                <span className="text-pink-700">Villages</span>
              </span>
              <span className="flex items-center">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-sm bg-red-500 mr-1"></span>
                <span className="text-red-700">Schemes</span>
              </span>
            </div>
          </div>
          <div className="w-full overflow-hidden flex-1 flex flex-col bg-white rounded-lg p-2">
            <div className="w-full flex-1 flex flex-col h-[40vh]">
              <RegionComparisonChart
                regions={regions || []}
                isLoading={isRegionsLoading}
                schemeView={schemeView}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Zoomable Sunburst Visualization */}
      {/* <div className="mb-4 sm:mb-6">
        <ZoomableSunburst />
      </div> */}

      {/* Enhanced Schemes Table with title and styling */}
      <div className="bg-white p-3 sm:p-5 rounded-lg border border-blue-100 shadow-md mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-blue-800 flex items-center">
              <span className="w-1.5 h-6 bg-blue-500 rounded-sm mr-2"></span>
              Water Scheme Details
              {selectedRegion !== "all" && !isFiltering && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full region-selected">
                  {selectedRegion} Region
                </span>
              )}
              {isFiltering && (
                <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full geo-filter-badge flex items-center">
                  <Filter className="h-3 w-3 mr-1" />
                  Geographic Filter: {filter.level}
                  {filter.block && (
                    <span className="ml-1">- {filter.block}</span>
                  )}
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 sm:mt-2">
              {isFiltering
                ? `Showing schemes filtered by ${filter.level} level geographic filter`
                : selectedRegion === "all"
                  ? "Click on any scheme to view detailed integration status and progress information"
                  : `Showing water schemes in ${selectedRegion} region. Use the chatbot to filter other regions.`}
            </p>
          </div>
          {/* <span className="hidden sm:flex items-center text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <span className="font-medium">
              {isFiltering ? geoFilteredSchemes.length : schemes.length}
            </span>
            <span className="ml-1">
              scheme
              {(isFiltering ? geoFilteredSchemes.length : schemes.length) !== 1
                ? "s"
                : ""}{" "}
              found
            </span>
          </span> */}
        </div>
        <div className="w-full overflow-x-auto bg-gradient-to-r from-blue-50/30 via-white to-blue-50/30 rounded-lg p-2">
          <div className="min-w-[650px]">
            <SchemeTable
              schemes={isFiltering ? geoFilteredSchemes : schemes || []}
              isLoading={
                isFiltering ? isGeoFilteredSchemesLoading : isSchemesLoading
              }
              onViewDetails={handleViewSchemeDetails}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onFilteredSchemesChange={handleFilteredSchemesChange}
              selectedRegion={selectedRegion}
            />
          </div>
        </div>
      </div>

      {/* Scheme Details Modal */}
      <SchemeDetailsModal
        scheme={selectedScheme}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* AI Assistant Chatbot is now managed globally in App.tsx */}
    </DashboardLayout>
  );
}
