import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Droplets, AlertTriangle } from "lucide-react";

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
}

interface PopulationCardsProps {
  selectedRegion?: string;
}

export default function PopulationCards({ selectedRegion = "all" }: PopulationCardsProps) {
  // Fetch population statistics from water_scheme_data
  const { data: populationStats, isLoading } = useQuery<PopulationStats>({
    queryKey: ["/api/water-scheme-data/population-stats", selectedRegion],
    queryFn: async () => {
      const url = selectedRegion === "all" 
        ? "/api/water-scheme-data/population-stats"
        : `/api/water-scheme-data/population-stats?region=${selectedRegion}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch population statistics");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!populationStats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No population data available</p>
      </div>
    );
  }

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = Number(num);
    if (isNaN(numValue)) return '0';
    return new Intl.NumberFormat('en-IN').format(numValue);
  };

  const formatPercentage = (num: number | string | null | undefined) => {
    const numValue = Number(num);
    if (isNaN(numValue)) return '0.0';
    return numValue.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Card - Total Population Covered */}
      <Card className="w-full max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200 rounded-t-lg">
          <CardTitle className="text-center text-2xl font-bold text-blue-900 flex items-center justify-center gap-2">
            <Users className="h-6 w-6" />
            Population Covered
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <div className="text-center">
            <p className="text-6xl font-extrabold text-blue-700 mb-2">
              {formatNumber(populationStats.total_population)}
            </p>
            <p className="text-lg text-gray-600">
              Across {formatNumber(populationStats.total_villages)} villages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Second Row - Two Cards Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card - Population Receiving Water Supply */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b border-green-200 rounded-t-lg">
            <CardTitle className="text-center text-xl font-bold text-green-900 flex items-center justify-center gap-2">
              <Droplets className="h-5 w-5" />
              Population with Water Supply
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-4">
              <p className="text-5xl font-extrabold text-green-700 mb-1">
                {formatNumber(populationStats.population_with_water)}
              </p>
              <p className="text-sm text-gray-600">
                ({formatPercentage(populationStats.percent_population_with_water)}% coverage)
              </p>
            </div>
            
            {/* Village Counts Below */}
            <div className="space-y-3 border-t border-green-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Villages Receiving Water:</span>
                <span className="text-lg font-bold text-green-700">
                  {formatNumber(populationStats.villages_with_water)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Villages LPCD {'>'}55:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatNumber(populationStats.villages_lpcd_above_55)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Villages LPCD ≤ 55:</span>
                <span className="text-lg font-bold text-orange-600">
                  {formatNumber(populationStats.villages_lpcd_below_55)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Card - Population Receiving No Water */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-100 to-orange-100 border-b border-red-200 rounded-t-lg">
            <CardTitle className="text-center text-xl font-bold text-red-900 flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Population with No Water
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-4">
              <p className="text-5xl font-extrabold text-red-700 mb-1">
                {formatNumber(populationStats.population_no_water)}
              </p>
              <p className="text-sm text-gray-600">
                ({formatPercentage(populationStats.percent_population_no_water)}% coverage)
              </p>
            </div>
            
            {/* Village Count Below */}
            <div className="space-y-3 border-t border-red-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Villages with No Water:</span>
                <span className="text-lg font-bold text-red-700">
                  {formatNumber(populationStats.villages_no_water)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}