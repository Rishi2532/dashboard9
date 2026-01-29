import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Users, RefreshCw, Calendar, MapPin } from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface PopulationData {
  totalPopulation: number;
  date: string;
  change?: {
    currentPopulation: number;
    previousPopulation: number;
    change: number;
    changePercent: number;
  };
}

interface RegionalPopulation {
  id: number;
  date: string;
  region: string;
  total_population: number;
  created_at: string;
}

export default function PopulationDashboard() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Fetch current population data
  const { data: populationData, isLoading } = useQuery({
    queryKey: ["/api/population/current"],
  });

  // Fetch population history
  const { data: historyData } = useQuery({
    queryKey: ["/api/population/history?days=7"],
  });

  // Fetch regional population data
  const { data: regionalData } = useQuery({
    queryKey: ["/api/population/region/calculate-all"],
    enabled: false, // Only fetch when needed
  });

  // Mutation to calculate and store current population
  const calculatePopulationMutation = useMutation({
    mutationFn: () =>
      fetch("/api/population/calculate-and-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/population/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/population/history"] });
    },
  });

  // Mutation to calculate regional populations
  const calculateRegionalMutation = useMutation({
    mutationFn: () =>
      fetch("/api/population/region/calculate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json()),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/population/region/calculate-all"], data);
    },
  });

  const population: PopulationData = populationData?.data;
  const history = historyData?.data || [];
  const regionalPopulations: RegionalPopulation[] = regionalData?.data || [];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${formatNumber(change)}`;
  };

  const formatPercentage = (percent: number) => {
    const sign = percent >= 0 ? "+" : "";
    return `${sign}${percent.toFixed(2)}%`;
  };

  // Group regional populations by region
  const regionMap = new Map<string, number>();
  regionalPopulations.forEach(item => {
    const current = regionMap.get(item.region) || 0;
    regionMap.set(item.region, current + item.total_population);
  });

  const uniqueRegions = Array.from(regionMap.entries()).map(([region, population]) => ({
    region,
    population
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Population Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Total Population Covered
              </CardTitle>
              <CardDescription>
                Maharashtra Water Infrastructure Coverage as of {population?.date}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => calculatePopulationMutation.mutate()}
                disabled={calculatePopulationMutation.isPending}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${calculatePopulationMutation.isPending ? 'animate-spin' : ''}`} />
                Update
              </Button>
              <Button
                onClick={() => calculateRegionalMutation.mutate()}
                disabled={calculateRegionalMutation.isPending}
                variant="outline"
                size="sm"
              >
                <MapPin className={`h-4 w-4 mr-2 ${calculateRegionalMutation.isPending ? 'animate-spin' : ''}`} />
                Calculate Regional
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {population ? (
            <div className="space-y-4">
              <div className="text-4xl font-bold text-primary">
                {formatNumber(population.totalPopulation)}
              </div>
              
              {population.change && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {population.change.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-semibold ${population.change.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatChange(population.change.change)}
                    </span>
                  </div>
                  
                  {population.change.previousPopulation > 0 && (
                    <Badge variant="secondary">
                      {formatPercentage(population.change.changePercent)} from previous day
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                Previous population: {population.change ? formatNumber(population.change.previousPopulation) : 'N/A'}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No population data available</p>
              <Button onClick={() => calculatePopulationMutation.mutate()}>
                Calculate Current Population
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Breakdown */}
      {uniqueRegions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Regional Population Distribution
            </CardTitle>
            <CardDescription>
              Population coverage by Maharashtra regions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueRegions.map(({ region, population }) => (
                <Card key={region} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-sm mb-1">{region}</h3>
                        <p className="text-2xl font-bold text-primary">
                          {formatNumber(population)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {((population / (populationData?.data?.totalPopulation || 1)) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Population History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Population History (Last 7 Days)
            </CardTitle>
            <CardDescription>
              Daily population coverage tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry: any) => (
                <div key={entry.date} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <div className="font-medium">{entry.date}</div>
                  <div className="text-lg font-semibold">{formatNumber(entry.total_population)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Villages
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(Math.floor((populationData?.data?.totalPopulation || 0) / 1500))}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Population/Village
                </p>
                <p className="text-2xl font-bold">1,500</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Data Last Updated
                </p>
                <p className="text-lg font-bold">{population?.date || 'N/A'}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}