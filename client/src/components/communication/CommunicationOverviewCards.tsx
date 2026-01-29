import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Activity, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface CommunicationOverviewCardsProps {
  region: string;
  circle: string;
  division: string;
  subDivision: string;
  block: string;
  dataFreshness: string;
}

export default function CommunicationOverviewCards({
  region,
  circle,
  division,
  subDivision,
  block,
  dataFreshness,
}: CommunicationOverviewCardsProps) {
  // Fetch communication overview data
  const { data: overview, isLoading } = useQuery({
    queryKey: ["/api/communication/overview", region, circle, division, subDivision, block, dataFreshness],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (region !== "all") params.append("region", region);
      if (circle !== "all") params.append("circle", circle);
      if (division !== "all") params.append("division", division);
      if (subDivision !== "all") params.append("sub_division", subDivision);
      if (block !== "all") params.append("block", block);
      if (dataFreshness !== "all") params.append("data_freshness", dataFreshness);
      
      const response = await fetch(`/api/communication/overview?${params}`);
      if (!response.ok) throw new Error("Failed to fetch communication overview");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>No communication data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (online: number, total: number) => {
    if (total === 0) return "text-gray-500";
    const percentage = (online / total) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Equipment Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chlorine Analyzers */}
        <Card className="relative overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Activity className="h-5 w-5" />
              Chlorine Analyzers
            </CardTitle>
            <CardDescription>
              Connection and operational status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Online/Offline Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Online</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getStatusColor(overview.chlorine_analyzers.online, overview.chlorine_analyzers.online + overview.chlorine_analyzers.offline)}`}>
                    {overview.chlorine_analyzers.online}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(overview.chlorine_analyzers.online, overview.chlorine_analyzers.online + overview.chlorine_analyzers.offline)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {overview.chlorine_analyzers.offline}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(overview.chlorine_analyzers.offline, overview.chlorine_analyzers.online + overview.chlorine_analyzers.offline)}
                  </div>
                </div>
              </div>

              {/* Data Freshness */}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Data Freshness</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Fresh: {overview.chlorine_analyzers.fresh_data}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Stale: {overview.chlorine_analyzers.stale_data}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pressure Transmitters */}
        <Card className="relative overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Activity className="h-5 w-5" />
              Pressure Transmitters
            </CardTitle>
            <CardDescription>
              Connection and operational status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Online/Offline Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Online</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getStatusColor(overview.pressure_transmitters.online, overview.pressure_transmitters.online + overview.pressure_transmitters.offline)}`}>
                    {overview.pressure_transmitters.online}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(overview.pressure_transmitters.online, overview.pressure_transmitters.online + overview.pressure_transmitters.offline)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {overview.pressure_transmitters.offline}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(overview.pressure_transmitters.offline, overview.pressure_transmitters.online + overview.pressure_transmitters.offline)}
                  </div>
                </div>
              </div>

              {/* Data Freshness */}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Data Freshness</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Fresh: {overview.pressure_transmitters.fresh_data}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Stale: {overview.pressure_transmitters.stale_data}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flow Meters */}
        <Card className="relative overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Activity className="h-5 w-5" />
              Flow Meters
            </CardTitle>
            <CardDescription>
              Connection and operational status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Online/Offline Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Online</span>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getStatusColor(overview.flow_meters.online, overview.flow_meters.online + overview.flow_meters.offline)}`}>
                    {overview.flow_meters.online}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(overview.flow_meters.online, overview.flow_meters.online + overview.flow_meters.offline)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {overview.flow_meters.offline}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPercentage(overview.flow_meters.offline, overview.flow_meters.online + overview.flow_meters.offline)}
                  </div>
                </div>
              </div>

              {/* Data Freshness */}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Data Freshness</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Fresh: {overview.flow_meters.fresh_data}
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Stale: {overview.flow_meters.stale_data}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Summary
          </CardTitle>
          <CardDescription>
            Communication status summary for filtered area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{overview.total_esrs}</div>
              <div className="text-sm text-muted-foreground">Total ESRs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overview.completion_status.fully_completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{overview.completion_status.in_progress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{overview.completion_status.na}</div>
              <div className="text-sm text-muted-foreground">N/A</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}