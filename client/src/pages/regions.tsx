import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Region } from "@/types";
import { calculatePercentage } from "@/lib/utils";

export default function Regions() {
  // ✅ Manually entered numbers for each region
  const manualSchemeTotals: Record<string, number> = {
    Nagpur: 27,
    Amravati: 70,
    "Chhatrapati Sambhajinagar": 49,
    Pune: 63,
    Nashik: 111,
    Konkan: 69,
  };

  // Fetch regions data
  const { data: regions, isLoading } = useQuery({
    queryKey: ["/api/regions"],
  });

  return (
    <DashboardLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-neutral-900">
          Regions Overview
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">
          Detailed stats for each region
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
          : (regions as Region[])?.map((region: Region) => {
              const esrCompletionPercentage = calculatePercentage(
                region.fully_completed_esr,
                region.total_esr_integrated,
              );

              const villageCompletionPercentage = calculatePercentage(
                region.fully_completed_villages,
                region.total_villages_integrated,
              );

              const schemeCompletionPercentage = calculatePercentage(
                region.fully_completed_schemes,
                region.total_schemes_integrated,
              );

              // ✅ Get the manual value based on region_name
              const manualTotalSchemes =
                manualSchemeTotals[region.region_name] || 0;

              return (
                <Card key={region.region_id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>{region.region_name}</CardTitle>
                      <span className="text-xs text-neutral-500">
                        Fully Completed / Integrated
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-neutral-500">
                            ESR Completion
                          </span>
                          <span className="text-sm font-medium">
                            {region.fully_completed_esr || 0} /{" "}
                            {region.total_esr_integrated || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                            style={{ width: `${esrCompletionPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-neutral-500">
                            Village Completion
                          </span>
                          <span className="text-sm font-medium">
                            {region.fully_completed_villages || 0} /{" "}
                            {region.total_villages_integrated || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                            style={{
                              width: `${villageCompletionPercentage}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-neutral-500">
                            Scheme Completion
                          </span>
                          <span className="text-sm font-medium">
                            {region.fully_completed_schemes || 0} /{" "}
                            {region.total_schemes_integrated || 0} /{" "}
                            {manualTotalSchemes}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                            style={{
                              width: `${schemeCompletionPercentage}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </DashboardLayout>
  );
}
