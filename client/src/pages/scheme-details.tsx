import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Droplets,
  Building,
  Gauge,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardLayout from "@/components/dashboard/dashboard-layout";

// Custom styles for sharp corners
const sharpTableStyles = `
  .sharp-table * {
    border-radius: 0 !important;
    font-family: 'Poppins', sans-serif !important;
    font-size: 14px !important;
  }
  .sharp-table table {
    border-collapse: separate !important;
    border-spacing: 0 !important;
  }
  .sharp-table th,
  .sharp-table td {
    border-radius: 0 !important;
  }
`;

export default function SchemeDetailsPage() {
  const [location, setLocation] = useLocation();
  const pathParts = location.split("/").slice(2);
  const schemeId = pathParts[0];
  const block = pathParts[1]; // May be undefined for multi-block schemes
  const [expandedVillages, setExpandedVillages] = useState<Set<string>>(
    new Set(),
  );

  // Fetch scheme information - use aggregate endpoint for multi-block schemes
  const { data: scheme, isLoading: isLoadingScheme } = useQuery({
    queryKey: ["/api/schemes", schemeId],
    queryFn: async () => {
      // First try to get individual scheme data using the correct endpoint
      let response = await fetch(`/api/schemes/${schemeId}`);
      if (response.ok) {
        const singleScheme = await response.json();
        // If this is a multi-block scheme, get aggregated data
        if (singleScheme.scheme_name) {
          const aggregateResponse = await fetch(
            `/api/schemes/aggregate/${encodeURIComponent(
              singleScheme.scheme_name,
            )}`,
          );
          if (aggregateResponse.ok) {
            return aggregateResponse.json();
          }
        }
        return singleScheme;
      }
      throw new Error("Failed to fetch scheme data");
    },
    enabled: !!schemeId,
  });

  // Fetch water scheme data (don't pass block parameter for multi-block schemes)
  const { data: villages, isLoading: isLoadingVillages } = useQuery({
    queryKey: ["/api/water-scheme-data/by-scheme", schemeId],
    queryFn: async () => {
      const url = `/api/water-scheme-data/by-scheme/${schemeId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch village data");
      return response.json();
    },
    enabled: !!schemeId,
  });

  // Fetch ESR data (chlorine and pressure combined)
  const { data: esrData, isLoading: isLoadingESR } = useQuery({
    queryKey: ["/api/scheme-esr-data", schemeId],
    queryFn: async () => {
      const url = `/api/scheme-esr-data/${schemeId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch ESR data");
      return response.json();
    },
    enabled: !!schemeId,
  });

  // Fetch water consumption data for this scheme
  const { data: waterConsumptionData, isLoading: isLoadingWaterConsumption } =
    useQuery({
      queryKey: ["/api/water-consumption", schemeId],
      queryFn: async () => {
        const url = `/api/water-consumption?region=${scheme?.region || "all"}`;
        const response = await fetch(url);
        if (!response.ok)
          throw new Error("Failed to fetch water consumption data");
        const allData = await response.json();
        // Filter by scheme ID
        return allData.filter((record: any) => record.scheme_id === schemeId);
      },
      enabled: !!schemeId && !!scheme?.region,
    });

  // Fetch block-specific dashboard URLs for multi-block schemes
  const { data: blockDashboards } = useQuery({
    queryKey: ["/api/schemes/block-dashboards", schemeId],
    queryFn: async () => {
      const url = `/api/schemes/block-dashboards/${schemeId}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!schemeId && !!scheme,
  });

  // Fetch communication status data to determine fully completed villages
  const { data: communicationStatusData } = useQuery({
    queryKey: ["/api/communication-status", schemeId],
    queryFn: async () => {
      const url = `/api/communication-status/schemes?scheme_id=${schemeId}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      const allData = await response.json();
      // Filter by scheme ID if needed
      return Array.isArray(allData)
        ? allData.filter((record: any) => record.scheme_id === schemeId)
        : [];
    },
    enabled: !!schemeId,
  });

  const handleGoBack = () => {
    setLocation("/schemes");
  };

  const toggleVillageExpansion = (villageId: string) => {
    const newExpanded = new Set(expandedVillages);
    if (newExpanded.has(villageId)) {
      newExpanded.delete(villageId);
    } else {
      newExpanded.add(villageId);
    }
    setExpandedVillages(newExpanded);
  };

  const getStatusColor = (status: "good" | "warning" | "danger") => {
    switch (status) {
      case "good":
        return "bg-green-100 text-green-800 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "danger":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLPCDStatus = (
    lpcd: number | null,
  ): "good" | "warning" | "danger" => {
    if (!lpcd) return "danger";
    if (lpcd >= 55) return "good";
    if (lpcd >= 40) return "warning";
    return "danger";
  };

  // Function to get LPCD color classes based on value (text color only)
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

  // Function to get LPCD color for the top card (background color)
  const getLPCDCardColor = (lpcdValue: number | null): string => {
    if (lpcdValue === null) return "bg-gray-200 text-gray-700";
    if (lpcdValue > 80) return "bg-orange-500 text-white"; // High status (> 80L)
    if (lpcdValue > 70) return "bg-green-600 text-white"; // High status (> 70L)
    if (lpcdValue >= 55) return "bg-green-500 text-white"; // Good status (55-70L)
    if (lpcdValue >= 40) return "bg-yellow-500 text-black"; // Low but not critical
    if (lpcdValue >= 25) return "bg-orange-500 text-white"; // Very low
    if (lpcdValue > 0) return "bg-red-500 text-white"; // Critical
    return "bg-gray-200 text-gray-700"; // No data
  };

  // Function to check if village is fully completed based on village table status
  const isVillageFullyCompleted = (village: any): boolean => {
    // Use the fully_completion_village_status field from village table
    // Only return true if the status is explicitly "Completed"
    return village.fully_completion_village_status === "Completed";
  };

  const getChlorineStatus = (
    value: number | null | string,
  ): "good" | "warning" | "danger" => {
    if (value === null || value === undefined || value === "") return "danger";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "danger";
    if (numValue >= 0.2 && numValue <= 0.5) return "good";
    return "danger";
  };

  const getPressureStatus = (
    value: number | null | string,
  ): "good" | "warning" | "danger" => {
    if (value === null || value === undefined || value === "") return "danger";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "danger";
    // Accept 0 as a valid value, only return danger for truly missing data
    if (numValue >= 0.2 && numValue <= 0.7) return "good";
    if (numValue === 0) return "warning"; // 0 pressure is a warning, not danger
    return "danger";
  };

  const formatPressureValue = (value: number | null | string): string => {
    if (value === null || value === undefined || value === "") return "No data";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "No data";
    // Show 0.00 bar when value is 0, not "No data"
    return `${numValue.toFixed(2)} bar`;
  };

  const formatChlorineValue = (value: number | null | string): string => {
    if (value === null || value === undefined || value === "") return "No data";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "No data";
    return `${numValue.toFixed(2)} mg/L`;
  };

  // Calculate villages achieving 55 LPCD
  const calculateVillagesAchieving55LPCD = (villagesList: any[]) => {
    return villagesList.filter((village) => {
      const lpcdValue = village.lpcd_value_day7
        ? parseFloat(village.lpcd_value_day7)
        : null;
      return lpcdValue && lpcdValue >= 55;
    }).length;
  };

  if (isLoadingScheme) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scheme details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!scheme) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Scheme Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The requested scheme could not be found.
          </p>
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schemes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate total statistics for the blue header
  const totalWaterConsumption =
    villages?.reduce((sum: number, village: any) => {
      const waterValue = village.water_value_day7 || village.water_value || 0;
      return (
        sum +
        (typeof waterValue === "number"
          ? waterValue
          : parseFloat(waterValue) || 0)
      );
    }, 0) || 0;

  const totalPopulation =
    villages?.reduce((sum: number, village: any) => {
      const population = village.population || 0;
      return (
        sum +
        (typeof population === "number"
          ? population
          : parseFloat(population) || 0)
      );
    }, 0) || 0;

  const totalVillages = villages?.length || 0;
  const totalESRs = esrData?.length || 0;

  // Calculate scheme LPCD (total water consumption * 100000 / total population)
  const schemeLPCD =
    totalPopulation > 0
      ? (totalWaterConsumption * 100000) / totalPopulation
      : 0;

  // Calculate villages achieving 55 LPCD for the whole scheme
  const totalVillagesAchieving55LPCD = villages
    ? calculateVillagesAchieving55LPCD(villages)
    : 0;

  // Get sensor counts from ESR data
  const flowMeterCount = scheme?.flow_meters_connected || 0;
  const pressureSensorCount = scheme?.pressure_transmitter_connected || 0;
  const chlorineAnalyzerCount =
    scheme?.residual_chlorine_analyzer_connected || 0;

  return (
    <DashboardLayout>
      <style>{sharpTableStyles}</style>
      <div className="space-y-6">
        {/* Enhanced Header - Stock Market Style */}
        <div className="space-y-4">
          {/* Back Button */}
          <Button onClick={handleGoBack} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schemes
          </Button>

          {/* Orange Box - Scheme Information */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white font-bold">{scheme.scheme_name}</h1>

                <p className="text-orange-100 mt-1">ID: {scheme.scheme_id}</p>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  // Check if we have block-specific dashboard URLs
                  if (blockDashboards && blockDashboards.length > 1) {
                    // Multiple blocks - show dropdown
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Pi Vision Dashboard
                            <ChevronDown className="w-4 h-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          {blockDashboards.map((blockDash: any) => (
                            <DropdownMenuItem
                              key={blockDash.block}
                              onClick={() =>
                                window.open(blockDash.dashboard_url, "_blank")
                              }
                              className="flex items-center gap-2 cursor-pointer py-3"
                            >
                              <ExternalLink className="w-4 h-4" />
                              {blockDash.block} Block Dashboard
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  } else if (blockDashboards && blockDashboards.length === 1) {
                    // Single block from API
                    return (
                      <Button
                        onClick={() =>
                          window.open(
                            blockDashboards[0].dashboard_url,
                            "_blank",
                          )
                        }
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Pi Vision Dashboard
                      </Button>
                    );
                  } else if (scheme?.dashboard_url) {
                    // Fallback to scheme's main dashboard URL
                    return (
                      <Button
                        onClick={() =>
                          window.open(scheme.dashboard_url, "_blank")
                        }
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Pi Vision Dashboard
                      </Button>
                    );
                  } else {
                    // Use original fallback logic
                    return (
                      <Button
                        onClick={() => {
                          if (scheme.pi_vision_dashboard_url) {
                            window.open(
                              scheme.pi_vision_dashboard_url,
                              "_blank",
                            );
                          } else {
                            // Fallback URL construction if needed
                            const dashboardUrl = `https://dashboard.pi-vision.com/scheme/${scheme.scheme_id}`;
                            window.open(dashboardUrl, "_blank");
                          }
                        }}
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Pi Vision Dashboard
                      </Button>
                    );
                  }
                })()}
                <Badge
                  variant="secondary"
                  className={`px-3 py-1 text-sm font-semibold ${
                    scheme.fully_completion_scheme_status === "Fully Completed"
                      ? "bg-green-500 text-white"
                      : scheme.fully_completion_scheme_status === "In Progress"
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-500 text-white"
                  }`}
                >
                  {scheme.fully_completion_scheme_status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Blue Box - Key Statistics */}
          <div className="bg-[#3b2e7d] text-white rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Water Consumption & LPCD - Blue */}
              <div className="bg-[#00000066] backdrop-blur-sm rounded-xl p-4 border-2 border-[#00000066] text-center shadow-lg">
                <div className="text-2xl font-bold text-blue-200">
                  {totalWaterConsumption.toFixed(2)}L
                </div>
                <div className="text-blue-100 text-xs">Water Consumption</div>
                <div style={{ height: "24px" }}></div>
                <div
                  className={`text-2xl font-bold mt-2 ${getLPCDColor(
                    schemeLPCD,
                  )}`}
                >
                  {schemeLPCD.toFixed(2)}L
                </div>
                <div className="text-blue-100 text-xs">LPCD</div>
              </div>

              {/* Villages Achieving 55 LPCD - Green */}
              <div className="bg-[#00000066] backdrop-blur-sm rounded-xl p-4 border-2 border-[#00000066] text-center shadow-lg">
                <div className="text-2xl font-bold text-green-500">
                  {totalVillagesAchieving55LPCD}
                </div>
                <div className="text-green-100 text-xs">Villages</div>
                <div className="text-green-100 text-xs">Achieving 55 LPCD</div>
                <div style={{ height: "24px" }}></div>
                <div className="text-2xl font-bold mt-2 text-red-600">
                  {scheme?.total_villages_integrated &&
                  scheme.total_villages_integrated > 0
                    ? `${
                        scheme.total_villages_integrated -
                        totalVillagesAchieving55LPCD
                      }`
                    : 0}
                </div>

                <div className="text-green-100 text-xs">not achieving</div>
              </div>

              {/* Integrated Villages - Purple */}
              <div className="bg-[#00000066] backdrop-blur-sm rounded-xl p-4 border-2 border-[#00000066] text-center shadow-lg">
                <div className="text-2xl font-bold">
                  {scheme?.total_villages_integrated || 0}
                </div>
                <div className="text-purple-100 text-xs">Integrated</div>
                <div style={{ height: "24px" }}></div>
                <div className="text-2xl font-bold mt-2">
                  {scheme?.number_of_village || totalVillages}
                </div>
                <div className="text-purple-100 text-xs">Total Villages</div>
              </div>

              {/* Integrated ESRs - Orange */}
              <div className="bg-[#00000066] backdrop-blur-sm rounded-xl p-4 border-2 border-[#00000066] text-center shadow-lg">
                <div className="text-2xl font-bold">
                  {scheme?.total_esr_integrated || 0}
                </div>
                <div className="text-orange-100 text-xs">Integrated</div>
                <div style={{ height: "24px" }}></div>
                <div className="text-2xl font-bold mt-2">
                  {scheme?.total_number_of_esr || totalESRs}
                </div>
                <div className="text-orange-100 text-xs">Total ESRs</div>
              </div>

              {/* Sensors Combined - Enhanced Cyan */}
              <div className="bg-gradient-to-br from-cyan-500/40 to-cyan-600/40 backdrop-blur-sm rounded-xl p-4 border-2 border-cyan-300/40 text-center shadow-lg">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center bg-cyan-400/20 rounded-lg p-2">
                    <div className="text-xl font-bold text-white">
                      {flowMeterCount}
                    </div>
                    <div className="text-cyan-100 text-xs font-medium">
                      Flow Meters
                    </div>
                  </div>
                  <div className="text-center bg-cyan-400/20 rounded-lg p-2">
                    <div className="text-xl font-bold text-white">
                      {pressureSensorCount}
                    </div>
                    <div className="text-cyan-100 text-xs font-medium">
                      Pressure
                    </div>
                  </div>
                  <div className="text-center bg-cyan-400/20 rounded-lg p-2">
                    <div className="text-xl font-bold text-white">
                      {chlorineAnalyzerCount}
                    </div>
                    <div className="text-cyan-100 text-xs font-medium">
                      Chlorine
                    </div>
                  </div>
                </div>
                <div className="text-cyan-100 text-sm font-semibold mt-2">
                  Connected Sensors
                </div>
                <div className="text-2xl font-bold text-white mt-2">
                  {flowMeterCount + pressureSensorCount + chlorineAnalyzerCount}
                </div>
                <div className="text-cyan-100 text-xs">Total Active</div>
              </div>
            </div>

            {/* Location Information */}
            <div className="mt-3 pt-3 border-t border-blue-500">
              <p className="text-blue-100 text-sm">
                {scheme.region} • {scheme.circle} • {scheme.division} •{" "}
                {scheme.block}
              </p>
            </div>
          </div>
        </div>

        {/* Scheme Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Villages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {scheme?.fully_completed_villages || 0}/
                {scheme?.total_villages_integrated || villages?.length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Completed/Integrated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                ESRs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {scheme?.no_fully_completed_esr || 0}/
                {scheme?.total_esr_integrated || esrData?.length || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Completed/Integrated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Village Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {scheme?.total_villages_integrated &&
                scheme.total_villages_integrated > 0
                  ? Math.round(
                      ((scheme.fully_completed_villages || 0) /
                        scheme.total_villages_integrated) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-gray-500 mt-1">Completion Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                ESR Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {scheme?.total_esr_integrated && scheme.total_esr_integrated > 0
                  ? Math.round(
                      ((scheme.no_fully_completed_esr || 0) /
                        scheme.total_esr_integrated) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-gray-500 mt-1">Completion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Villages Section - Table Format */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Villages ({villages?.length || 0})
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500" />
              <span>= Fully Completed</span>
            </div>
          </div>

          {isLoadingVillages ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="h-12 bg-gray-100"></div>
                    {[...Array(3)].map((_, j) => (
                      <div
                        key={j}
                        className="h-12 bg-white border-t border-gray-200"
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : villages && villages.length > 0 ? (
            (() => {
              // Group villages by block
              const villagesByBlock = villages.reduce(
                (acc: any, village: any) => {
                  const blockName = village.block || "Unknown Block";
                  if (!acc[blockName]) {
                    acc[blockName] = [];
                  }
                  acc[blockName].push(village);
                  return acc;
                },
                {},
              );

              const blockEntries = Object.entries(villagesByBlock);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {blockEntries.map(
                    ([blockName, blockVillages]: [string, any]) => (
                      <div
                        key={blockName}
                        className="bg-white border border-gray-200"
                        style={{ borderRadius: "0" }}
                      >
                        {/* Compact Block Header */}
                        <div
                          className="bg-gray-50 px-4 py-3 border-b border-gray-200"
                          style={{ borderRadius: "0" }}
                        >
                          <div className="flex items-center justify-between">
                            <h3
                              className="text-md font-semibold text-gray-900 flex items-center"
                              style={{
                                fontSize: "14px",
                                fontFamily: "Poppins, sans-serif",
                                textAlign: "left",
                              }}
                            >
                              <Building className="w-4 h-4 mr-2 text-blue-600" />
                              Block: {blockName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                                style={{
                                  fontSize: "14px",
                                  fontFamily: "Poppins, sans-serif",
                                  borderRadius: "0",
                                }}
                              >
                                {calculateVillagesAchieving55LPCD(
                                  blockVillages,
                                )}
                                /{blockVillages.length} achieving 55 LPCD
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                                style={{
                                  fontSize: "14px",
                                  fontFamily: "Poppins, sans-serif",
                                  borderRadius: "0",
                                }}
                              >
                                {blockVillages.length} village
                                {blockVillages.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-4" style={{ borderRadius: "0" }}>
                          {/* Compact Villages Table */}
                          <div
                            className="bg-white shadow-sm overflow-hidden sharp-table"
                            style={{ border: "none", borderRadius: "0" }}
                          >
                            <div className="table-responsive">
                              <table
                                className="village-table"
                                style={{
                                  width: "100%",
                                  border: "none",
                                  borderCollapse: "separate",
                                  borderSpacing: "0",
                                  fontFamily: "Poppins, sans-serif",
                                  fontSize: "14px",
                                }}
                              >
                                <thead style={{ backgroundColor: "#3b2e7d" }}>
                                  <tr>
                                    <th
                                      scope="col"
                                      style={{
                                        backgroundColor: "#3b2e7d",
                                        color: "white",
                                        textAlign: "left",
                                        padding: "8px",
                                        border: "none",
                                        fontSize: "14px",
                                        fontFamily: "Poppins, sans-serif",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.025em",
                                        borderRadius: "0",
                                      }}
                                    >
                                      VILLAGE
                                    </th>
                                    <th
                                      scope="col"
                                      style={{
                                        backgroundColor: "#3b2e7d",
                                        color: "white",
                                        textAlign: "left",
                                        padding: "8px",
                                        border: "none",
                                        fontSize: "14px",
                                        fontFamily: "Poppins, sans-serif",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.025em",
                                        borderRadius: "0",
                                      }}
                                    >
                                      POP
                                    </th>
                                    <th
                                      scope="col"
                                      style={{
                                        backgroundColor: "#3b2e7d",
                                        color: "white",
                                        textAlign: "left",
                                        padding: "8px",
                                        border: "none",
                                        fontSize: "14px",
                                        fontFamily: "Poppins, sans-serif",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.025em",
                                        borderRadius: "0",
                                      }}
                                    >
                                      WATER CONSUMPTION
                                    </th>
                                    <th
                                      scope="col"
                                      style={{
                                        backgroundColor: "#3b2e7d",
                                        color: "white",
                                        textAlign: "left",
                                        padding: "8px",
                                        border: "none",
                                        fontSize: "14px",
                                        fontFamily: "Poppins, sans-serif",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.025em",
                                        borderRadius: "0",
                                      }}
                                    >
                                      LPCD
                                    </th>
                                    <th
                                      scope="col"
                                      style={{
                                        backgroundColor: "#3b2e7d",
                                        color: "white",
                                        textAlign: "left",
                                        padding: "8px",
                                        border: "none",
                                        fontSize: "14px",
                                        fontFamily: "Poppins, sans-serif",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.025em",
                                        borderRadius: "0",
                                      }}
                                    >
                                      ESR
                                    </th>
                                    <th
                                      scope="col"
                                      style={{
                                        backgroundColor: "#3b2e7d",
                                        color: "white",
                                        textAlign: "left",
                                        padding: "8px",
                                        border: "none",
                                        fontSize: "14px",
                                        fontFamily: "Poppins, sans-serif",
                                        fontWeight: "600",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.025em",
                                        borderRadius: "0",
                                      }}
                                    >
                                      ACTION
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {blockVillages.map(
                                    (village: any, index: number) => {
                                      const villageId = `${blockName}-${village.village_name}-${index}`;
                                      const isExpanded =
                                        expandedVillages.has(villageId);
                                      const villageESRs =
                                        esrData?.filter(
                                          (esr: any) =>
                                            esr.village_name ===
                                            village.village_name,
                                        ) || [];

                                      const waterValue =
                                        village.water_value_day7 ||
                                        village.water_value ||
                                        0;
                                      const lpcdValue = village.lpcd_value_day7
                                        ? parseFloat(village.lpcd_value_day7)
                                        : null;
                                      const lpcdStatus =
                                        getLPCDStatus(lpcdValue);
                                      const population =
                                        village.population || 0;

                                      // Check if this village is fully completed using village table status
                                      const isFullyCompleted =
                                        isVillageFullyCompleted(village);

                                      return (
                                        <>
                                          <tr
                                            key={index}
                                            className={
                                              isFullyCompleted
                                                ? "animate-pulse"
                                                : ""
                                            }
                                            style={{
                                              backgroundColor: isFullyCompleted
                                                ? "#f0f9ff"
                                                : "white",
                                              border: "none",
                                              boxShadow: isFullyCompleted
                                                ? "0 0 10px rgba(34, 197, 94, 0.3)"
                                                : "none",
                                              borderLeft: isFullyCompleted
                                                ? "4px solid #22c55e"
                                                : "none",
                                            }}
                                          >
                                            <td
                                              style={{
                                                textAlign: "left",
                                                padding: "8px",
                                                borderBottom:
                                                  "1px solid #e5e7eb",
                                                backgroundColor:
                                                  isFullyCompleted
                                                    ? "#f0f9ff"
                                                    : "white",
                                                fontSize: "14px",
                                                fontFamily:
                                                  "Poppins, sans-serif",
                                                borderRadius: "0",
                                              }}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className="village-name"
                                                  style={{
                                                    fontSize: "14px",
                                                    fontFamily:
                                                      "Poppins, sans-serif",
                                                    fontWeight: isFullyCompleted
                                                      ? "600"
                                                      : "normal",
                                                  }}
                                                >
                                                  {village.village_name}
                                                </span>
                                                {isFullyCompleted && (
                                                  <div className="flex items-center">
                                                    <Check className="w-5 h-5 text-green-500 font-bold" />
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td
                                              style={{
                                                textAlign: "left",
                                                padding: "8px",
                                                borderBottom:
                                                  "1px solid #e5e7eb",
                                                backgroundColor:
                                                  isFullyCompleted
                                                    ? "#f0f9ff"
                                                    : "white",
                                                fontSize: "14px",
                                                fontFamily:
                                                  "Poppins, sans-serif",
                                                fontWeight: "500",
                                                borderRadius: "0",
                                              }}
                                            >
                                              {population > 1000
                                                ? `${Math.round(population)}`
                                                : population.toLocaleString()}
                                            </td>
                                            <td
                                              style={{
                                                textAlign: "left",
                                                padding: "8px",
                                                borderBottom:
                                                  "1px solid #e5e7eb",
                                                backgroundColor:
                                                  isFullyCompleted
                                                    ? "#f0f9ff"
                                                    : "white",
                                                fontSize: "14px",
                                                fontFamily:
                                                  "Poppins, sans-serif",
                                                fontWeight: "500",
                                                borderRadius: "0",
                                                color: "#2563eb",
                                              }}
                                            >
                                              {waterValue
                                                ? `${parseFloat(
                                                    waterValue.toString(),
                                                  ).toFixed(2)} LL`
                                                : "-"}
                                            </td>
                                            <td
                                              style={{
                                                textAlign: "left",
                                                padding: "8px",
                                                borderBottom:
                                                  "1px solid #e5e7eb",
                                                backgroundColor:
                                                  isFullyCompleted
                                                    ? "#f0f9ff"
                                                    : "white",
                                                fontSize: "14px",
                                                fontFamily:
                                                  "Poppins, sans-serif",
                                                borderRadius: "0",
                                              }}
                                            >
                                              <span
                                                className={getLPCDColor(
                                                  lpcdValue,
                                                )}
                                                style={{
                                                  fontSize: "14px",
                                                  fontFamily:
                                                    "Poppins, sans-serif",
                                                }}
                                              >
                                                {lpcdValue
                                                  ? `${lpcdValue.toFixed(2)}L`
                                                  : "-"}
                                              </span>
                                            </td>
                                            <td
                                              style={{
                                                textAlign: "left",
                                                padding: "8px",
                                                borderBottom:
                                                  "1px solid #e5e7eb",
                                                backgroundColor:
                                                  isFullyCompleted
                                                    ? "#f0f9ff"
                                                    : "white",
                                                fontSize: "14px",
                                                fontFamily:
                                                  "Poppins, sans-serif",
                                                fontWeight: "500",
                                                borderRadius: "0",
                                              }}
                                            >
                                              {villageESRs.length}
                                            </td>
                                            <td
                                              style={{
                                                textAlign: "left",
                                                padding: "8px",
                                                borderBottom:
                                                  "1px solid #e5e7eb",
                                                backgroundColor:
                                                  isFullyCompleted
                                                    ? "#f0f9ff"
                                                    : "white",
                                                fontSize: "14px",
                                                fontFamily:
                                                  "Poppins, sans-serif",
                                                borderRadius: "0",
                                              }}
                                            >
                                              <button
                                                onClick={() =>
                                                  toggleVillageExpansion(
                                                    villageId,
                                                  )
                                                }
                                                className="p-1 hover:bg-gray-100 transition-colors rounded-sm"
                                                style={{
                                                  fontSize: "16px",
                                                  fontFamily:
                                                    "Poppins, sans-serif",
                                                  border: "none",
                                                  background: "transparent",
                                                }}
                                              >
                                                {isExpanded ? (
                                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                                ) : (
                                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                                )}
                                              </button>
                                            </td>
                                          </tr>

                                          {/* Expanded ESR Details Row */}
                                          {isExpanded && (
                                            <tr
                                              style={{
                                                backgroundColor: "#f1f5f9",
                                                border: "none",
                                              }}
                                            >
                                              <td
                                                colSpan={6}
                                                style={{
                                                  padding: "16px",
                                                  border: "none",
                                                  borderBottom: "none",
                                                  backgroundColor: "#f1f5f9",
                                                }}
                                              >
                                                <div
                                                  className="bg-white p-3"
                                                  style={{
                                                    borderRadius: "0",
                                                    fontFamily:
                                                      "Poppins, sans-serif",
                                                  }}
                                                >
                                                  <h4
                                                    className="font-semibold text-gray-700 mb-3 flex items-center"
                                                    style={{
                                                      fontSize: "14px",
                                                      fontFamily:
                                                        "Poppins, sans-serif",
                                                    }}
                                                  >
                                                    <Building className="w-4 h-4 mr-2" />
                                                    ESR Details for{" "}
                                                    {village.village_name} (
                                                    {villageESRs.length} ESRs)
                                                  </h4>

                                                  {isLoadingESR ? (
                                                    <div className="animate-pulse space-y-2">
                                                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                                                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                                    </div>
                                                  ) : villageESRs.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                      {villageESRs.map(
                                                        (
                                                          esr: any,
                                                          esrIndex: number,
                                                        ) => (
                                                          <div
                                                            key={esrIndex}
                                                            className="bg-gray-50 p-3 border border-gray-200"
                                                            style={{
                                                              borderRadius: "0",
                                                            }}
                                                          >
                                                            <div className="flex items-center justify-between mb-2">
                                                              <span className="font-medium text-gray-900 text-sm">
                                                                {esr.esr_name ||
                                                                  `ESR ${
                                                                    esrIndex + 1
                                                                  }`}
                                                              </span>
                                                            </div>

                                                            <div className="space-y-2">
                                                              <div className="flex items-center justify-between">
                                                                <span className="flex items-center text-xs text-gray-600">
                                                                  <Droplets className="w-3 h-3 mr-1 text-blue-500" />
                                                                  Chlorine
                                                                </span>
                                                                <Badge
                                                                  className={`${getStatusColor(
                                                                    getChlorineStatus(
                                                                      esr.chlorine_value,
                                                                    ),
                                                                  )} text-xs px-2 py-1`}
                                                                >
                                                                  {formatChlorineValue(
                                                                    esr.chlorine_value,
                                                                  )}
                                                                </Badge>
                                                              </div>

                                                              <div className="flex items-center justify-between">
                                                                <span className="flex items-center text-xs text-gray-600">
                                                                  <Gauge className="w-3 h-3 mr-1 text-orange-500" />
                                                                  Pressure
                                                                </span>
                                                                <Badge
                                                                  className={`${getStatusColor(
                                                                    getPressureStatus(
                                                                      esr.pressure_value,
                                                                    ),
                                                                  )} text-xs px-2 py-1`}
                                                                >
                                                                  {formatPressureValue(
                                                                    esr.pressure_value,
                                                                  )}
                                                                </Badge>
                                                              </div>

                                                              <div className="flex items-center justify-between">
                                                                <span className="flex items-center text-xs text-gray-600">
                                                                  <Droplets className="w-3 h-3 mr-1 text-green-500" />
                                                                  Water
                                                                  Consumption
                                                                </span>
                                                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-1">
                                                                  {(() => {
                                                                    // Find matching water consumption data
                                                                    const waterConsumption =
                                                                      villages?.find(
                                                                        (
                                                                          v: any,
                                                                        ) =>
                                                                          v.village_name ===
                                                                          village.village_name,
                                                                      );

                                                                    // Find matching water consumption data from the water_consumption table
                                                                    const waterRecord =
                                                                      waterConsumptionData?.find(
                                                                        (
                                                                          w: any,
                                                                        ) =>
                                                                          w.esr_name ===
                                                                            esr.esr_name &&
                                                                          w.village_name ===
                                                                            village.village_name,
                                                                      );

                                                                    if (
                                                                      waterRecord
                                                                    ) {
                                                                      const waterValue =
                                                                        waterRecord.water_value_day7 ||
                                                                        waterRecord.water_value_day6 ||
                                                                        waterRecord.water_value_day5 ||
                                                                        waterRecord.water_value_day4 ||
                                                                        waterRecord.water_value_day3 ||
                                                                        waterRecord.water_value_day2 ||
                                                                        waterRecord.water_value_day1 ||
                                                                        0;

                                                                      if (
                                                                        waterValue ===
                                                                        0
                                                                      )
                                                                        return "0 LL";
                                                                      return waterValue
                                                                        ? `${parseFloat(
                                                                            waterValue.toString(),
                                                                          ).toFixed(
                                                                            2,
                                                                          )} LL`
                                                                        : "No data";
                                                                    }
                                                                    return "No data";
                                                                  })()}
                                                                </Badge>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        ),
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div
                                                      className="bg-gray-50 p-3 border border-gray-200 text-center text-sm text-gray-500"
                                                      style={{
                                                        borderRadius: "0",
                                                      }}
                                                    >
                                                      No ESR data available for
                                                      this village
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              );
            })()
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Villages Found
                </h3>
                <p className="text-gray-500">
                  No village data is available for this scheme.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
