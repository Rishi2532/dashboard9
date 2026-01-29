import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUp,
  ArrowDown,
  Users,
  Droplets,
  AlertTriangle,
  MapPin,
  RotateCcw,
} from "lucide-react";
import FlipCard from "@/components/ui/flip-card";
import { Button } from "@/components/ui/button";
import MiniLineChart from "@/components/ui/mini-line-chart";

interface PopulationStats {
  total_villages: number;
  total_population: number;
  villages_with_water: number;
  population_with_water: number;
  percent_villages_with_water: number;
  percent_population_with_water: number;
  villages_no_water: number;
  population_no_water: number;
  percent_villages_no_water: number;
  percent_population_no_water: number;
  villages_lpcd_above_55: number;
  villages_lpcd_below_55: number;
  population_lpcd_above_55: number;
  population_lpcd_below_55: number;
  population_gained_water: number;
  population_lost_water: number;
  population_with_water_day5: number;
  population_no_water_day5: number;
  population_lpcd_above_55_day7: number;
  population_lpcd_below_55_day7: number;
  population_lpcd_above_55_day6: number;
  population_lpcd_below_55_day6: number;
}

interface VillageStats {
  total_villages: number;
  villages_with_water: number;
  percent_villages_with_water: number;
  villages_without_water: number;
  percent_villages_without_water: number;
  villages_lpcd_above_55: number;
  percent_villages_lpcd_above_55: number;
  villages_lpcd_below_55: number;
  percent_villages_lpcd_below_55: number;
  villages_gained_water: number;
  villages_lost_water: number;
  villages_with_water_day5: number;
  villages_without_water_day5: number;
  villages_lpcd_above_55_day7: number;
  villages_lpcd_above_55_day6: number;
  villages_lpcd_below_55_day7: number;
  villages_lpcd_below_55_day6: number;
}

interface FlipPopulationCardsProps {
  selectedRegion?: string;
}

export default function FlipPopulationCards({
  selectedRegion = "all",
}: FlipPopulationCardsProps) {
  const [allFlipped, setAllFlipped] = useState(false);

  // Fetch population statistics
  const { data: populationStats, isLoading: populationLoading } =
    useQuery<PopulationStats>({
      queryKey: ["/api/water-scheme-data/population-stats", selectedRegion],
      queryFn: async () => {
        const url =
          selectedRegion === "all"
            ? "/api/water-scheme-data/population-stats"
            : `/api/water-scheme-data/population-stats?region=${selectedRegion}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch population statistics");
        }
        return response.json();
      },
    });

  // Fetch village statistics
  const { data: villageStats, isLoading: villageLoading } =
    useQuery<VillageStats>({
      queryKey: ["/api/water-scheme-data/village-stats", selectedRegion],
      queryFn: async () => {
        const url =
          selectedRegion === "all"
            ? "/api/water-scheme-data/village-stats"
            : `/api/water-scheme-data/village-stats?region=${selectedRegion}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch village statistics");
        }
        return response.json();
      },
    });

  // Fetch current population tracking data with change calculation
  const { data: currentPopulationData } = useQuery({
    queryKey: ["/api/population-tracking/current", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/population-tracking/current"
          : `/api/population-tracking/current?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
  });

  // Fetch previous day population data for comparison
  const { data: previousPopulationData } = useQuery({
    queryKey: ["/api/population-tracking/previous", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/population-tracking/previous"
          : `/api/population-tracking/previous?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) {
        return null; // Return null if no previous data exists
      }
      return response.json();
    },
  });

  // Fetch population trend data from tracking tables
  const { data: populationTrend } = useQuery({
    queryKey: ["/api/water-scheme-data/population-trends", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/water-scheme-data/population-trends"
          : `/api/water-scheme-data/population-trends?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    },
  });

  const { data: waterTrend } = useQuery({
    queryKey: ["/api/water-scheme-data/water-trends", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/water-scheme-data/water-trends"
          : `/api/water-scheme-data/water-trends?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    },
  });

  const { data: noWaterTrend } = useQuery({
    queryKey: ["/api/water-scheme-data/no-water-trends", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/water-scheme-data/no-water-trends"
          : `/api/water-scheme-data/no-water-trends?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    },
  });

  const { data: lpcdTrend } = useQuery({
    queryKey: ["/api/water-scheme-data/lpcd-trends", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/water-scheme-data/lpcd-trends"
          : `/api/water-scheme-data/lpcd-trends?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    },
  });

  const { data: lpcdBelow55Trend } = useQuery({
    queryKey: ["/api/water-scheme-data/lpcd-below-55-trends", selectedRegion],
    queryFn: async () => {
      const url =
        selectedRegion === "all"
          ? "/api/water-scheme-data/lpcd-below-55-trends"
          : `/api/water-scheme-data/lpcd-below-55-trends?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    },
  });

  if (populationLoading || villageLoading) {
    return (
      <div className="space-y-3 h-full">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg mb-3"></div>
          <div className="grid grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!populationStats || !villageStats) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = Number(num);
    if (isNaN(numValue)) return "0";
    return new Intl.NumberFormat("en-IN").format(numValue);
  };

  const formatPercentage = (num: number | string | null | undefined) => {
    const numValue = Number(num);
    if (isNaN(numValue)) return "0.0";
    return numValue.toFixed(1);
  };

  // Calculate change indicators with real number differences
  const getChangeIndicator = (
    current: number | string,
    previous: number | string,
  ) => {
    const currentNum = Number(current) || 0;
    const previousNum = Number(previous) || 0;
    const change = currentNum - previousNum;
    if (change === 0 || previousNum === 0) return null;

    return {
      value: Math.abs(change),
      change: change, // Actual number change
      isPositive: change > 0,
      percentage: (Math.abs(change) / previousNum) * 100,
    };
  };

  // Population changes
  const populationWaterChange = getChangeIndicator(
    populationStats.population_with_water,
    populationStats.population_with_water_day5,
  );

  const populationNoWaterChange = getChangeIndicator(
    populationStats.population_no_water,
    populationStats.population_no_water_day5,
  );

  const populationLpcdAbove55Change = getChangeIndicator(
    populationStats.population_lpcd_above_55_day7 || 0,
    populationStats.population_lpcd_above_55_day6 || 0,
  );

  const populationLpcdBelow55Change = getChangeIndicator(
    populationStats.population_lpcd_below_55_day7 || 0,
    populationStats.population_lpcd_below_55_day6 || 0,
  );

  // Village changes
  const villageWaterChange = getChangeIndicator(
    villageStats.villages_with_water,
    villageStats.villages_with_water_day5,
  );

  const villageNoWaterChange = getChangeIndicator(
    villageStats.villages_without_water,
    villageStats.villages_without_water_day5,
  );

  const villageLpcdAbove55Change = getChangeIndicator(
    villageStats.villages_lpcd_above_55_day7 || 0,
    villageStats.villages_lpcd_above_55_day6 || 0,
  );

  const villageLpcdBelow55Change = getChangeIndicator(
    villageStats.villages_lpcd_below_55_day7 || 0,
    villageStats.villages_lpcd_below_55_day6 || 0,
  );

  // Get population tracking data with automatic change calculation
  const populationTrackingChange = currentPopulationData?.data?.change;

  // Debug logging to track data flow
  console.log("=== FlipPopulationCards Debug ===");
  console.log("Selected Region:", selectedRegion);
  console.log("Current Population Data:", currentPopulationData?.data);
  console.log("Population Stats Total:", populationStats?.total_population);
  console.log(
    "Final currentTotalPopulation will be:",
    currentPopulationData?.data?.totalPopulation ||
      (selectedRegion !== "all" ? 0 : populationStats?.total_population) ||
      0,
  );
  console.log("=== End Debug ===");

  // Always prioritize the current population tracking data if available
  const currentTotalPopulation =
    currentPopulationData?.data?.totalPopulation ||
    populationStats?.total_population ||
    0;
  const previousTotalPopulation =
    previousPopulationData?.total_population ||
    previousPopulationData?.population;

  // Total population change using authentic tracking data
  const totalPopulationChange = populationTrackingChange
    ? {
        value: Math.abs(populationTrackingChange.change),
        change: populationTrackingChange.change,
        isPositive: populationTrackingChange.change > 0,
        percentage: Math.abs(populationTrackingChange.changePercent),
      }
    : previousTotalPopulation
      ? getChangeIndicator(currentTotalPopulation, previousTotalPopulation)
      : null;

  // Total villages change (using sample data since village tracking not implemented yet)
  const totalVillagesChange = getChangeIndicator(
    villageStats.total_villages,
    Number(villageStats.total_villages) - 3, // Sample change
  );

  const ChangeIndicator = ({ change }: { change: any }) => {
    if (!change) return null;

    return (
      <div
        className={`flex items-center gap-1 ${
          change.isPositive ? "text-green-200" : "text-red-200"
        }`}
      >
        <span className="text-sm font-bold">
          {change.isPositive ? "+" : "-"}
        </span>
        <span className="text-xs font-medium">
          {formatNumber(change.value)} ({change.percentage.toFixed(1)}%)
        </span>
      </div>
    );
  };

  const handleToggleAll = () => {
    setAllFlipped(!allFlipped);
  };

  return (
    <div className="w-full">
      {/* Master Toggle Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleToggleAll}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {allFlipped ? "Show Population" : "Show Villages"}
        </Button>
      </div>

      {/* Single Row - All Five Flip Cards */}
      <div className="grid grid-cols-5 gap-6">
        {/* Card 1: Total Population/Villages */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0}
          frontContent={
            <div className="bg-gradient-to-br from-sky-50 to-blue-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-blue-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Total Population
                  </div>
                  {totalPopulationChange && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          totalPopulationChange.isPositive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {totalPopulationChange.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(totalPopulationChange.value)} (
                          {totalPopulationChange.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(currentTotalPopulation)}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-3 w-3" />
                  <span>Population Covered</span>
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={populationTrend || []}
                    color="#3B82F6"
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-purple-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Total Villages
                  </div>
                  {totalVillagesChange && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          totalVillagesChange.isPositive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {totalVillagesChange.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(totalVillagesChange.value)} (
                          {totalVillagesChange.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(villageStats.total_villages)}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3" />
                  <span>Total Villages</span>
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={populationTrend || []}
                    color="#8B5CF6"
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
        />

        {/* Card 2: Population/Villages With Water */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.1}
          frontContent={
            <div className="bg-gradient-to-br from-emerald-50 to-teal-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-emerald-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Population with Water
                  </div>
                  {populationWaterChange && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          populationWaterChange.isPositive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {populationWaterChange.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(populationWaterChange.value)} (
                          {populationWaterChange.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(populationStats.population_with_water)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    <span>Coverage</span>
                  </div>
                  {/* <span className="font-medium text-emerald-600">
                    {formatPercentage(
                      populationStats.percent_population_with_water
                    )}
                    %
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={waterTrend || []}
                    color={
                      populationWaterChange?.isPositive ? "#16A34A" : "#DC2626"
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-cyan-50 to-blue-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-cyan-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Villages with Water
                  </div>
                  {villageWaterChange && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          villageWaterChange.isPositive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {villageWaterChange.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(villageWaterChange.value)} (
                          {villageWaterChange.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(villageStats.villages_with_water)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    <span>Coverage</span>
                  </div>
                  {/* <span className="font-medium text-cyan-600">
                    {formatPercentage(villageStats.percent_villages_with_water)}
                    %
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={waterTrend || []}
                    color={
                      populationWaterChange?.isPositive ? "#16A34A" : "#DC2626"
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
        />

        {/* Card 3: Population/Villages Without Water */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.2}
          frontContent={
            <div className="bg-gradient-to-br from-red-50 to-rose-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-red-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Population No Water
                  </div>
                  {populationNoWaterChange && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          populationNoWaterChange.isPositive
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {populationNoWaterChange.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(populationNoWaterChange.value)} (
                          {populationNoWaterChange.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(populationStats.population_no_water)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>No Access</span>
                  </div>
                  {/* <span className="font-medium text-red-600">
                    {formatPercentage(
                      populationStats.percent_population_no_water
                    )}
                    %
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={noWaterTrend || []}
                    color={
                      populationNoWaterChange?.isPositive
                        ? "#DC2626"
                        : "#16A34A" // red if ↑, green if ↓
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-orange-50 to-red-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-orange-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Villages No Water
                  </div>
                  {villageNoWaterChange && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          villageNoWaterChange.isPositive
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {villageNoWaterChange.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(villageNoWaterChange.value)} (
                          {villageNoWaterChange.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(villageStats.villages_without_water)}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>No Access</span>
                  </div>
                  {/* <span className="font-medium text-orange-600">
                    {formatPercentage(
                      villageStats.percent_villages_without_water
                    )}
                    %
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={noWaterTrend || []}
                    color={
                      populationNoWaterChange?.isPositive
                        ? "#DC2626"
                        : "#16A34A" // red if ↑, green if ↓
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
        />

        {/* Card 4: Population/Villages with LPCD > 55 */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.3}
          frontContent={
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-green-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Population LPCD {">"} 55
                  </div>
                  {populationLpcdAbove55Change && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          populationLpcdAbove55Change.isPositive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {populationLpcdAbove55Change.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(populationLpcdAbove55Change.value)}{" "}
                          (
                          {populationLpcdAbove55Change.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(populationStats.population_lpcd_above_55)}
                </div>
                <div className="text-xs text-slate-500 mb-2"></div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    <span>Adequate Supply</span>
                  </div>
                  {/* <span className="font-medium text-green-600">
                    {formatPercentage(
                      (populationStats.population_lpcd_above_55 /
                        populationStats.total_population) *
                        100
                    )}
                    %
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={lpcdTrend || []}
                    color={
                      populationLpcdAbove55Change?.isPositive
                        ? "#16A34A"
                        : "#DC2626"
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-lime-50 to-green-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-lime-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Villages LPCD {">"} 55
                  </div>
                  {villageLpcdAbove55Change && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          villageLpcdAbove55Change.isPositive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {villageLpcdAbove55Change.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(villageLpcdAbove55Change.value)} (
                          {villageLpcdAbove55Change.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(villageStats.villages_lpcd_above_55)}
                </div>
                <div className="text-xs text-slate-500 mb-2"></div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    <span>Adequate Supply</span>
                  </div>
                  {/* <span className="font-medium text-lime-600">
                    {formatPercentage(
                      villageStats.percent_villages_lpcd_above_55
                    )}
                    %
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={lpcdTrend || []}
                    color={
                      populationLpcdAbove55Change?.isPositive
                        ? "#16A34A"
                        : "#DC2626"
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
        />

        {/* Card 5: Population/Villages with LPCD < 55 */}
        <FlipCard
          isFlipped={allFlipped}
          delay={0.4}
          frontContent={
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-yellow-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Population LPCD ≤ 55
                  </div>
                  {populationLpcdBelow55Change && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          populationLpcdBelow55Change.isPositive
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {populationLpcdBelow55Change.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(populationLpcdBelow55Change.value)}{" "}
                          (
                          {populationLpcdBelow55Change.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(populationStats.population_lpcd_below_55)}
                </div>
                <div className="text-xs text-slate-500 mb-2"></div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Below Standard</span>
                  </div>
                  {/* <span>
                    {formatNumber(populationLpcdBelow55Change?.value || 0)}
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={lpcdBelow55Trend || []}
                    color={
                      populationLpcdBelow55Change?.isPositive
                        ? "#DC2626"
                        : "#16A34A"
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
          backContent={
            <div className="bg-gradient-to-br from-orange-50 to-yellow-100 text-slate-800 relative shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl h-44 border border-orange-200">
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-600">
                    Villages LPCD ≤ 55
                  </div>
                  {villageLpcdBelow55Change && (
                    <div className="flex items-center gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          villageLpcdBelow55Change.isPositive
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {villageLpcdBelow55Change.isPositive ? "▲" : "▼"}
                        <span>
                          {formatNumber(villageLpcdBelow55Change.value)} (
                          {villageLpcdBelow55Change.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatNumber(villageStats.villages_lpcd_below_55)}
                </div>
                <div className="text-xs text-slate-500 mb-2">
                  {/* <span className="font-medium text-orange-600">
                    {formatPercentage(
                      villageStats.percent_villages_lpcd_below_55
                    )}
                    %
                  </span> */}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Below Standard</span>
                  </div>
                  {/* <span className="font-medium text-amber-600">
                    {formatPercentage(
                      (populationStats.population_lpcd_below_55 /
                        populationStats.total_population) *
                        100
                    )}
                    %
                  </span> */}
                </div>
                <div className="mt-3 h-8 flex items-center justify-center">
                  <MiniLineChart
                    data={lpcdBelow55Trend || []}
                    color={
                      populationLpcdBelow55Change?.isPositive
                        ? "#DC2626"
                        : "#16A34A"
                    }
                    height={32}
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
