import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Building, 
  ChevronDown, 
  ChevronRight,
  Database 
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CommunicationSchemesListProps {
  region: string;
  circle: string;
  division: string;
  subDivision: string;
  block: string;
  dataFreshness: string;
}

interface Scheme {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  completion_status: string;
  total_esrs: number;
  village_count: number;
  communication_status: {
    chlorine_online: number;
    chlorine_offline: number;
    pressure_online: number;
    pressure_offline: number;
    flow_meter_online: number;
    flow_meter_offline: number;
    fresh_data_count: number;
    stale_data_count: number;
  };
}

export default function CommunicationSchemesList({
  region,
  circle,
  division,
  subDivision,
  block,
  dataFreshness,
}: CommunicationSchemesListProps) {
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set());

  // Fetch schemes data
  const { data: schemes, isLoading } = useQuery({
    queryKey: ["/api/communication/schemes", region, circle, division, subDivision, block, dataFreshness],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (region !== "all") params.append("region", region);
      if (circle !== "all") params.append("circle", circle);
      if (division !== "all") params.append("division", division);
      if (subDivision !== "all") params.append("sub_division", subDivision);
      if (block !== "all") params.append("block", block);
      if (dataFreshness !== "all") params.append("data_freshness", dataFreshness);
      
      const response = await fetch(`/api/communication/schemes?${params}`);
      if (!response.ok) throw new Error("Failed to fetch schemes");
      return response.json();
    },
  });

  // Fetch detailed ESR data for expanded schemes
  const { data: schemeDetails } = useQuery({
    queryKey: ["/api/communication/scheme-details", Array.from(expandedSchemes), dataFreshness],
    queryFn: async () => {
      if (expandedSchemes.size === 0) return {};
      
      const detailsPromises = Array.from(expandedSchemes).map(async (schemeId) => {
        const params = new URLSearchParams();
        if (dataFreshness !== "all") params.append("data_freshness", dataFreshness);
        
        const response = await fetch(`/api/communication/schemes/${schemeId}?${params}`);
        if (!response.ok) throw new Error(`Failed to fetch details for scheme ${schemeId}`);
        const data = await response.json();
        return { [schemeId]: data };
      });
      
      const results = await Promise.all(detailsPromises);
      return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    },
    enabled: expandedSchemes.size > 0,
  });

  const toggleSchemeExpansion = (schemeId: string) => {
    const newExpanded = new Set(expandedSchemes);
    if (newExpanded.has(schemeId)) {
      newExpanded.delete(schemeId);
    } else {
      newExpanded.add(schemeId);
    }
    setExpandedSchemes(newExpanded);
  };

  const getStatusIcon = (online: number, total: number) => {
    if (total === 0) return <Activity className="h-4 w-4 text-gray-500" />;
    const percentage = (online / total) * 100;
    if (percentage >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = (online: number, total: number) => {
    if (total === 0) return "text-gray-500";
    const percentage = (online / total) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getCompletionStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "fully completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!schemes || schemes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Schemes Communication Status
          </CardTitle>
          <CardDescription>
            Unique schemes with their ESR communication details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Database className="h-8 w-8 mx-auto mb-2" />
            <p>No schemes found for the selected filters</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Schemes Communication Status
        </CardTitle>
        <CardDescription>
          {schemes.length} unique schemes with ESR communication details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {schemes.map((scheme: Scheme) => (
            <Collapsible 
              key={scheme.scheme_id || `${scheme.scheme_name}-${scheme.region}`}
              open={expandedSchemes.has(scheme.scheme_id)}
              onOpenChange={() => toggleSchemeExpansion(scheme.scheme_id)}
            >
              <Card className="border">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full p-0 h-auto">
                    <CardHeader className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedSchemes.has(scheme.scheme_id) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                          <div className="text-left">
                            <CardTitle className="text-base font-semibold">
                              {scheme.scheme_name || 'Unnamed Scheme'}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{scheme.region} • {scheme.circle} • {scheme.division}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={getCompletionStatusColor(scheme.completion_status)}>
                            {scheme.completion_status || 'N/A'}
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium">{scheme.total_esrs} ESRs</div>
                            <div className="text-xs text-muted-foreground">{scheme.village_count} Villages</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Equipment Status Summary */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {/* Chlorine Status */}
                        <div className="flex items-center gap-2">
                          {getStatusIcon(
                            scheme.communication_status.chlorine_online,
                            scheme.communication_status.chlorine_online + scheme.communication_status.chlorine_offline
                          )}
                          <div>
                            <div className="text-xs font-medium">Chlorine</div>
                            <div className={`text-sm ${getStatusColor(
                              scheme.communication_status.chlorine_online,
                              scheme.communication_status.chlorine_online + scheme.communication_status.chlorine_offline
                            )}`}>
                              {scheme.communication_status.chlorine_online}/{scheme.communication_status.chlorine_online + scheme.communication_status.chlorine_offline} Online
                            </div>
                          </div>
                        </div>

                        {/* Pressure Status */}
                        <div className="flex items-center gap-2">
                          {getStatusIcon(
                            scheme.communication_status.pressure_online,
                            scheme.communication_status.pressure_online + scheme.communication_status.pressure_offline
                          )}
                          <div>
                            <div className="text-xs font-medium">Pressure</div>
                            <div className={`text-sm ${getStatusColor(
                              scheme.communication_status.pressure_online,
                              scheme.communication_status.pressure_online + scheme.communication_status.pressure_offline
                            )}`}>
                              {scheme.communication_status.pressure_online}/{scheme.communication_status.pressure_online + scheme.communication_status.pressure_offline} Online
                            </div>
                          </div>
                        </div>

                        {/* Flow Meter Status */}
                        <div className="flex items-center gap-2">
                          {getStatusIcon(
                            scheme.communication_status.flow_meter_online,
                            scheme.communication_status.flow_meter_online + scheme.communication_status.flow_meter_offline
                          )}
                          <div>
                            <div className="text-xs font-medium">Flow Meter</div>
                            <div className={`text-sm ${getStatusColor(
                              scheme.communication_status.flow_meter_online,
                              scheme.communication_status.flow_meter_online + scheme.communication_status.flow_meter_offline
                            )}`}>
                              {scheme.communication_status.flow_meter_online}/{scheme.communication_status.flow_meter_online + scheme.communication_status.flow_meter_offline} Online
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Data Freshness */}
                      <div className="flex gap-2 mt-3">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Fresh: {scheme.communication_status.fresh_data_count}
                        </Badge>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Stale: {scheme.communication_status.stale_data_count}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">ESR Details</h4>
                      {schemeDetails?.[scheme.scheme_id] ? (
                        <div className="space-y-3">
                          {schemeDetails[scheme.scheme_id].esrs?.map((esr: any, index: number) => (
                            <Card key={index} className="bg-gray-50">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <div className="font-medium">{esr.esr_name}</div>
                                    <div className="text-sm text-muted-foreground">{esr.village_name}</div>
                                  </div>
                                  <Badge variant="outline" className={getCompletionStatusColor(esr.completion_status)}>
                                    {esr.completion_status || 'N/A'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                  {/* Chlorine Equipment */}
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-blue-700">Chlorine Analyzer</div>
                                    <div className="flex items-center gap-1">
                                      {esr.chlorine_status === 'Online' ? 
                                        <Wifi className="h-3 w-3 text-green-600" /> : 
                                        <WifiOff className="h-3 w-3 text-red-600" />
                                      }
                                      <span className={`text-xs ${esr.chlorine_status === 'Online' ? 'text-green-600' : 'text-red-600'}`}>
                                        {esr.chlorine_status || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {esr.chlorine_connected || 'N/A'}
                                    </div>
                                    <div className="flex gap-1">
                                      {esr.chlorine_fresh_data === 1 && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          Fresh
                                        </Badge>
                                      )}
                                      {esr.chlorine_stale_data === 1 && (
                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                          Stale
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Pressure Equipment */}
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-purple-700">Pressure Transmitter</div>
                                    <div className="flex items-center gap-1">
                                      {esr.pressure_status === 'Online' ? 
                                        <Wifi className="h-3 w-3 text-green-600" /> : 
                                        <WifiOff className="h-3 w-3 text-red-600" />
                                      }
                                      <span className={`text-xs ${esr.pressure_status === 'Online' ? 'text-green-600' : 'text-red-600'}`}>
                                        {esr.pressure_status || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {esr.pressure_connected || 'N/A'}
                                    </div>
                                    <div className="flex gap-1">
                                      {esr.pressure_fresh_data === 1 && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          Fresh
                                        </Badge>
                                      )}
                                      {esr.pressure_stale_data === 1 && (
                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                          Stale
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Flow Meter Equipment */}
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-green-700">Flow Meter</div>
                                    <div className="flex items-center gap-1">
                                      {esr.flow_meter_status === 'Online' ? 
                                        <Wifi className="h-3 w-3 text-green-600" /> : 
                                        <WifiOff className="h-3 w-3 text-red-600" />
                                      }
                                      <span className={`text-xs ${esr.flow_meter_status === 'Online' ? 'text-green-600' : 'text-red-600'}`}>
                                        {esr.flow_meter_status || 'N/A'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {esr.flow_meter_connected || 'N/A'}
                                    </div>
                                    <div className="flex gap-1">
                                      {esr.flow_meter_fresh_data === 1 && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          Fresh
                                        </Badge>
                                      )}
                                      {esr.flow_meter_stale_data === 1 && (
                                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                          Stale
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          <div className="animate-pulse">Loading ESR details...</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}