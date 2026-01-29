import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Droplets, Activity, Gauge, MapPin, Building } from "lucide-react";
import DashboardLayout from "@/components/dashboard/dashboard-layout";

interface SchemeStatus {
  scheme_id: string;
  scheme_name: string;
  region: string;
  block: string;
  number_of_village: number;
  fully_completed_villages: number;
  total_number_of_esr: number;
  fully_completion_scheme_status: string;
}

interface VillageData {
  village_name: string;
  population: number;
  water_value_day7: number | null;
  lpcd_value_day7: number | null;
  number_of_esr: number;
  esrs: ESRData[];
}

interface ESRData {
  esr_name: string;
  chlorine_value: number | null;
  pressure_value: number | null;
  chlorine_status: "good" | "warning" | "danger";
  pressure_status: "good" | "warning" | "danger";
}

export default function SchemeDetailsPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const schemeId = params.schemeId as string;
  const block = params.block as string;

  // Fetch scheme details
  const { data: scheme, isLoading: isLoadingScheme } = useQuery({
    queryKey: ["/api/schemes", schemeId],
    queryFn: async () => {
      const response = await fetch(`/api/schemes/${schemeId}`);
      if (!response.ok) throw new Error("Failed to fetch scheme");
      return response.json() as SchemeStatus;
    },
  });

  // Fetch villages in the scheme with their water consumption and LPCD
  const { data: villages, isLoading: isLoadingVillages } = useQuery({
    queryKey: ["/api/water-scheme-data/by-scheme", schemeId, block],
    queryFn: async () => {
      let url = `/api/water-scheme-data/by-scheme/${schemeId}`;
      if (block && block !== "undefined") {
        url += `?block=${block}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch village data");
      return response.json();
    },
  });

  // Fetch ESR data for chlorine and pressure
  const { data: esrData, isLoading: isLoadingESR } = useQuery({
    queryKey: ["/api/scheme-esr-data", schemeId, block],
    queryFn: async () => {
      let url = `/api/scheme-esr-data/${schemeId}`;
      if (block && block !== "undefined") {
        url += `?block=${block}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch ESR data");
      return response.json();
    },
  });

  const handleGoBack = () => {
    setLocation("/schemes");
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

  const getLPCDStatus = (lpcd: number | null): "good" | "warning" | "danger" => {
    if (!lpcd) return "danger";
    if (lpcd >= 55) return "good";
    if (lpcd >= 40) return "warning";
    return "danger";
  };

  const getChlorineStatus = (value: number | null): "good" | "warning" | "danger" => {
    if (!value) return "danger";
    if (value >= 0.2 && value <= 0.5) return "good";
    return "danger";
  };

  const getPressureStatus = (value: number | null): "good" | "warning" | "danger" => {
    if (!value) return "danger";
    if (value >= 0.2 && value <= 0.7) return "good";
    return "danger";
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Scheme Not Found</h2>
          <p className="text-gray-600 mb-6">The requested scheme could not be found.</p>
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schemes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button onClick={handleGoBack} variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Schemes
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{scheme.scheme_name}</h1>
            <p className="text-gray-600 mt-1">
              {scheme.region} • {scheme.block} • ID: {scheme.scheme_id}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`px-3 py-1 ${
              scheme.fully_completion_scheme_status === "Fully Completed"
                ? "bg-green-100 text-green-800"
                : scheme.fully_completion_scheme_status === "In Progress"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {scheme.fully_completion_scheme_status}
          </Badge>
        </div>

        {/* Scheme Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Villages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {scheme.fully_completed_villages}/{scheme.number_of_village}
              </div>
              <p className="text-xs text-gray-500 mt-1">Completed/Total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">ESRs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {scheme.total_number_of_esr}
              </div>
              <p className="text-xs text-gray-500 mt-1">Total ESRs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((scheme.fully_completed_villages / scheme.number_of_village) * 100)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Completion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Villages Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Villages ({villages?.length || 0})
          </h2>

          {isLoadingVillages ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : villages && villages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {villages.map((village: any, index: number) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium text-gray-900 flex items-center justify-between">
                      <span className="truncate">{village.village_name}</span>
                      <Badge
                        className={`${getStatusColor(
                          getLPCDStatus(parseFloat(village.lpcd_value_day7))
                        )} text-xs`}
                      >
                        {village.lpcd_value_day7 
                          ? `${Math.round(parseFloat(village.lpcd_value_day7))}L`
                          : "No data"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Village Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Droplets className="w-4 h-4 mr-2 text-blue-500" />
                        <div>
                          <p className="text-gray-500">Water Consumption</p>
                          <p className="font-medium">
                            {village.water_value_day7 
                              ? `${Math.round(parseFloat(village.water_value_day7))} L`
                              : "No data"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-gray-500" />
                        <div>
                          <p className="text-gray-500">Population</p>
                          <p className="font-medium">{village.population || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* ESRs in this village */}
                    {isLoadingESR ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const villageESRs = esrData?.filter(
                            (esr: any) => esr.village_name === village.village_name
                          ) || [];
                          
                          return (
                            <>
                              <h4 className="text-sm font-medium text-gray-700">
                                ESRs ({villageESRs.length || 0})
                              </h4>
                              {villageESRs.length > 0 ? (
                                <div className="space-y-2">
                                  {villageESRs.map((esr: any, esrIndex: number) => (
                                    <div
                                      key={esrIndex}
                                      className="p-3 bg-gray-50 rounded-lg border"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">
                                          {esr.esr_name}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center">
                                            <Activity className="w-3 h-3 mr-1 text-blue-500" />
                                            Chlorine
                                          </span>
                                          <Badge 
                                            className={`${getStatusColor(
                                              getChlorineStatus(esr.chlorine_value)
                                            )} text-xs`}
                                          >
                                            {esr.chlorine_value 
                                              ? `${esr.chlorine_value.toFixed(2)} mg/L`
                                              : "No data"}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center">
                                            <Gauge className="w-3 h-3 mr-1 text-orange-500" />
                                            Pressure
                                          </span>
                                          <Badge 
                                            className={`${getStatusColor(
                                              getPressureStatus(esr.pressure_value)
                                            )} text-xs`}
                                          >
                                            {esr.pressure_value 
                                              ? `${esr.pressure_value.toFixed(2)} bar`
                                              : "No data"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-3 bg-gray-50 rounded-lg border text-center text-sm text-gray-500">
                                  No ESR data available for this village
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Villages Found</h3>
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