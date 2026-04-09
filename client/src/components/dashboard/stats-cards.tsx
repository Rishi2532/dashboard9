import { Card, CardContent } from "@/components/ui/card";
import { calculatePercentage } from "@/lib/utils";
import { RegionSummary } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  GitBranchPlus,
  Home,
  Droplet,
  BarChart3,
  Gauge,
  Activity,
  Cpu,
} from "lucide-react";

interface StatsCardsProps {
  data?: RegionSummary;
  isLoading: boolean;
  layout?: "normal" | "compact"; // Add layout option for different display modes
  selectedRegion?: string; // Add selectedRegion prop
  schemeView?: "ALL" | "INSTRUMENTED";
}

export default function StatsCards({
  data,
  isLoading,
  layout = "normal",
  selectedRegion = "all",
  schemeView = "ALL",
}: StatsCardsProps) {
  const isInstrumented = schemeView === "INSTRUMENTED";

  // Fetch scheme counts with both filtered and total counts
  const { data: schemeCounts } = useQuery<{
    filteredCount: number;
    totalCount: number;
    region: string;
  }>({
    queryKey: ["/api/schemes/counts", selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }

      const queryString = params.toString();
      const url = `/api/schemes/counts${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch scheme counts");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  if (isLoading || !data) {
    return (
      <div
        className={
          layout === "compact"
            ? "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" // Compact layout (1 col on mobile, 2x2 grid on tablet+)
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" // Normal layout
        }
      >
        {[...Array(4)].map((_, i) => (
          <Card
            key={i}
            className="bg-white overflow-hidden rounded-lg border-0 shadow-sm"
          >
            <CardContent className="p-3 sm:p-4">
              <div className="h-16 sm:h-24 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 h-3 sm:h-4 w-3/4 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSchemes = isInstrumented
    ? data.total_schemes || 0
    : data.total_schemes_integrated || 0;
  const completedSchemes = isInstrumented
    ? data.schemes_operational || 0
    : data.fully_completed_schemes || 0;
  const bottomSchemesIntegrated = isInstrumented
    ? data.schemes_operational || 0
    : totalSchemes;
  const bottomFullyCompletedSchemes = isInstrumented
    ? data.schemes_fully_completed || 0
    : completedSchemes;

  const totalVillages = isInstrumented
    ? data.total_villages || 0
    : data.total_villages_integrated || 0;
  const completedVillages = isInstrumented
    ? data.villages_operational || 0
    : data.fully_completed_villages || 0;
  const bottomVillagesIntegrated = isInstrumented
    ? data.villages_operational || 0
    : totalVillages;
  const bottomFullyCompletedVillages = isInstrumented
    ? data.villages_fully_completed || 0
    : completedVillages;

  const totalEsr = isInstrumented
    ? data.total_esr || 0
    : data.total_esr_integrated || 0;
  const completedEsr = isInstrumented
    ? data.esr_operational || 0
    : data.fully_completed_esr || 0;
  const bottomEsrIntegrated = isInstrumented
    ? data.esr_operational || 0
    : totalEsr;
  const bottomFullyCompletedEsr = isInstrumented
    ? data.esr_fully_completed || 0
    : completedEsr;

  const partialEsr = data.partial_esr || 0;
  const flowMeterIntegrated = isInstrumented
    ? data.flow || 0
    : data.flow_meter_integrated || 0;
  const rcaIntegrated = isInstrumented
    ? data.rca || 0
    : data.rca_integrated || 0;
  const pressureTransmitterIntegrated = isInstrumented
    ? data.pressure || 0
    : data.pressure_transmitter_integrated || 0;

  const schemeCompletionPercentage = calculatePercentage(
    completedSchemes,
    totalSchemes,
  );

  const villageCompletionPercentage = totalVillages > 0
    ? Number(((completedVillages / totalVillages) * 100).toFixed(2))
    : 0;

  const esrCompletionPercentage = totalEsr > 0
    ? Number(((completedEsr / totalEsr) * 100).toFixed(2))
    : 0;

  return (
    <div
      className={
        layout === "compact"
          ? "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" // Compact layout with 1 col on mobile, 2x2 on larger screens
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" // Normal layout
      }
    >
      {/* Total Schemes Card */}
      <Card className="bg-white overflow-hidden rounded-lg border-0 shadow-sm">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-full w-full text-blue-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 12h6m-2 2v6m-4-8V4m0 0h16m0 0v8m0-8h4v16H2" />
            <circle cx="16" cy="16" r="6" />
            <path d="M16 14v4m-2-2h4" />
          </svg>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-md">
              <GitBranchPlus className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm xl:text-base font-medium text-blue-800">
                  {isInstrumented ? "MJP Approved MVS Schemes(389)" : "Total Schemes"}{" "}
                  {selectedRegion === "all" ? (isInstrumented ? "" : "(389)") : ""}
                </h3>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isInstrumented
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}>

                </span>
              </div>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-blue-900">
                  {totalSchemes}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-blue-600">
                  {isInstrumented ? "100% Civil Work Completed Schemes(MVS)" : "water schemes"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-blue-800">
                Fully Completion Rate
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-bold text-blue-900">
                {schemeCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2.5 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-700 h-2.5 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${schemeCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-green-600 font-medium">
                <b>
                  {completedSchemes}{" "}
                  {isInstrumented ? "Connected to IoT" : "Fully Completed"}
                </b>
              </span>
              <span className="text-yellow-600 font-medium">
                {totalSchemes - completedSchemes}{" "}
                {isInstrumented ? "Not Connected" : "Partially Completed"}
              </span>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-blue-100">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Schemes in Operation</span>
                <span className="font-semibold">{bottomSchemesIntegrated}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-700 mt-1">
                <span>Fully Operational Schemes:</span>
                <span className="font-semibold">{bottomFullyCompletedSchemes}</span>
              </div>
              {/* <div className="flex justify-between text-sm text-blue-700 mt-1">
                <span>Completion Rate:</span>
                <span className="font-semibold">
                  {calculatePercentage(bottomFullyCompletedSchemes, bottomSchemesIntegrated)}%
                </span>
              </div> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Villages Card */}
      <Card className="bg-white overflow-hidden rounded-lg border-0 shadow-sm">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-full w-full text-amber-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 10l9-7 9 7v11H3z" />
            <path d="M12 3v7h7" />
            <path d="M9 21v-8H5v8" />
            <path d="M19 21v-6h-4v6" />
          </svg>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-md">
              <Home className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-amber-800">
                Total Villages
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-amber-900">
                  {totalVillages}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-amber-600">
                  {isInstrumented
                    ? "Villages in 100% Civil Work Completed Schemes(MVS)"
                    : "Villages Integrated"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-amber-800">
                Fully Completion Rate
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-bold text-amber-900">
                {villageCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-2.5 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-700 h-2.5 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${villageCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-green-600 font-medium">
                <b>
                  {completedVillages}{" "}
                  {isInstrumented
                    ? "Operational Villages"
                    : "Fully Completed"}
                </b>
              </span>
              <span className="text-yellow-600 font-medium">
                {totalVillages - completedVillages} {" "}

                <b>{isInstrumented
                  ? "Not Connected"
                  : "Partially Completed"}</b>
              </span>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-amber-100">
              <div className="flex justify-between text-sm text-amber-700">
                <span>
                  {isInstrumented
                    ? "Villages In Operation:"
                    : "Villages Integrated"}
                  :
                </span>
                <span className="font-semibold">{bottomVillagesIntegrated}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700 mt-1">
                <span>
                  {isInstrumented
                    ? "Fully Operational Villages"
                    : "Fully Completed"}
                  :
                </span>
                <span className="font-semibold">{bottomFullyCompletedVillages}</span>
              </div>
              {/* <div className="flex justify-between text-sm text-amber-700 mt-1">
                <span>Fully Completion Rate:</span>
                <span className="font-semibold">
                  {calculatePercentage(bottomFullyCompletedVillages, bottomVillagesIntegrated)}%
                </span>
              </div> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total ESR Card */}
      <Card className="bg-white overflow-hidden rounded-lg border-0 shadow-sm">
        <div
          className="absolute top-0 right-0 h-24 w-24 sm:h-32 sm:w-32 xl:h-40 xl:w-40"
          style={{ opacity: 0.15 }}
        >
          <img
            src="/images/esr-water-tank.png"
            alt="ESR"
            className="h-full w-full text-purple-700 object-contain"
          />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-0.5 sm:p-1 xl:p-1.5 shadow-md flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 xl:w-14 xl:h-14">
              <img
                src="/images/esr-water-tank.png"
                alt="ESR Tank"
                className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 xl:h-12 xl:w-12 object-contain"
              />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-purple-800">
                Total ESR
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-teal-900">
                  {totalEsr}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-teal-600">
                  {isInstrumented
                    ? "ESR In 100% Civil Work Completed Schemes(MVS)"
                    : "ESR Integrated"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-purple-800">
                Fully Completion Rate
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-bold text-purple-900">
                {esrCompletionPercentage}%
              </span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2.5 sm:h-3 xl:h-4 mt-1 sm:mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-700 h-2.5 sm:h-3 xl:h-4 rounded-full shadow-inner"
                style={{ width: `${esrCompletionPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs xl:text-sm mt-1 xl:mt-2">
              <span className="text-green-600 font-medium">
                <b>{completedEsr}{" "}
                  {isInstrumented
                    ? "Operational ESRs"
                    : "Fully Completed"}
                  :</b>
              </span>
              <span className="text-yellow-600 font-medium">
                <b>{totalEsr - completedEsr}{" "}

                  {isInstrumented
                    ? "Not Connected"
                    : "Partially Completed"}</b>

              </span>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-purple-100">
              <div className="flex justify-between text-sm text-purple-700">
                <span>
                  {isInstrumented
                    ? "ESRs In Operation"
                    : "ESRs Integrated"}
                  :
                </span>
                <span className="font-semibold">{bottomEsrIntegrated}</span>
              </div>
              <div className="flex justify-between text-sm text-purple-700 mt-1">
                <span>
                  {isInstrumented
                    ? "Fully Operational ESRs"
                    : "Fully Completed ESRs"}
                  :
                </span>
                <span className="font-semibold">{bottomFullyCompletedEsr}</span>
              </div>
              {/* <div className="flex justify-between text-sm text-purple-700 mt-1">
                <span>Fully Completion Rate:</span>
                <span className="font-semibold">
                  {calculatePercentage(bottomFullyCompletedEsr, bottomEsrIntegrated)}%
                </span>
              </div> */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure Components Card */}
      <Card className="bg-white overflow-hidden rounded-lg border-0 shadow-sm">
        <div className="absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 xl:h-24 xl:w-24 opacity-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-full w-full text-emerald-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <line x1="6" y1="6" x2="6" y2="6" strokeLinecap="round" />
            <line x1="10" y1="6" x2="10" y2="6" strokeLinecap="round" />
            <line x1="6" y1="18" x2="6" y2="18" strokeLinecap="round" />
            <line x1="10" y1="18" x2="10" y2="18" strokeLinecap="round" />
            <line x1="14" y1="6" x2="18" y2="6" strokeLinecap="round" />
            <line x1="14" y1="18" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-2 sm:p-3 xl:p-4 shadow-md">
              <Cpu className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 xl:h-7 xl:w-7 text-white" />
            </div>
            <div className="ml-3 sm:ml-4 md:ml-5 xl:ml-6 flex-1">
              <h3 className="text-xs sm:text-sm xl:text-base font-medium text-emerald-800">
                Connected Sensors on IoT Platform
              </h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold text-emerald-900">
                  {Number(flowMeterIntegrated) +
                    Number(rcaIntegrated) +
                    Number(pressureTransmitterIntegrated)}
                </p>
                <p className="ml-1 sm:ml-2 text-xs sm:text-sm xl:text-base text-emerald-600">
                  components
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 md:mt-6 xl:mt-8">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm xl:text-base font-medium text-emerald-800">
                Monitoring Systems
              </span>
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="7"
                      fill="rgba(186, 230, 253, 0.3)"
                    />
                    <path d="M12 6L12 8" />
                    <path d="M16 10L14.5 11" />
                    <path d="M18 14L16 14" />
                    <path d="M8 10L9.5 11" />
                    <path d="M6 14L8 14" />
                    <path d="M12 12L15 15" strokeWidth="2" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                    <path d="M5 18L8 21M19 18L16 21" />
                    <path d="M5 21L19 21" />
                  </svg>
                  <span className="text-xs sm:text-sm text-emerald-800">
                    Flow Meters
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-emerald-900">
                  {flowMeterIntegrated}
                </span>
              </div>
              <div
                className="flex justify-between items-center"
                data-component-type="chlorine"
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="5"
                      y="3"
                      width="14"
                      height="3"
                      rx="1"
                      fill="rgba(107, 114, 128, 0.3)"
                      stroke="currentColor"
                    />
                    <rect
                      x="7"
                      y="6"
                      width="10"
                      height="9"
                      rx="1"
                      fill="white"
                      stroke="currentColor"
                    />
                    <rect
                      x="5"
                      y="15"
                      width="14"
                      height="3"
                      rx="1"
                      fill="rgba(107, 114, 128, 0.3)"
                      stroke="currentColor"
                    />
                    <path d="M10 8.5h1M10 10h1M10 11.5h1" strokeWidth="1" />
                    <path d="M14 7.5L15 10L14 12.5" strokeWidth="2.5" />
                    <rect
                      x="8.5"
                      y="18"
                      width="2"
                      height="2"
                      rx="1"
                      fill="currentColor"
                    />
                    <rect
                      x="13.5"
                      y="18"
                      width="2"
                      height="2"
                      rx="1"
                      fill="currentColor"
                    />
                    <path d="M9.5 20L9.5 22.5" strokeWidth="1" />
                    <path d="M14.5 20L14.5 22.5" strokeWidth="1" />
                    <rect
                      x="7"
                      y="15"
                      width="10"
                      height="1.5"
                      fill="rgba(59, 130, 246, 0.5)"
                      stroke="none"
                    />
                    <rect
                      x="11.5"
                      y="9"
                      width="1.5"
                      height="1.5"
                      fill="rgba(59, 130, 246, 0.5)"
                      stroke="none"
                    />
                    <path d="M7 22.5L17 22.5" strokeWidth="1" />
                  </svg>
                  <span className="text-xs sm:text-sm text-emerald-800">
                    Residual Chlorine Analyzer
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded-md">
                  {rcaIntegrated}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle
                      cx="12"
                      cy="7"
                      r="5"
                      fill="rgba(186, 230, 253, 0.4)"
                      stroke="currentColor"
                    />
                    <path d="M12 4.5 A0.5,0.5 0 1,1 12,4 A0.5,0.5 0 1,1 12,4.5 Z" />
                    <path d="M14.5 5 A0.5,0.5 0 1,1 14.5,4.5 A0.5,0.5 0 1,1 14.5,5 Z" />
                    <path d="M9.5 5 A0.5,0.5 0 1,1 9.5,4.5 A0.5,0.5 0 1,1 9.5,5 Z" />
                    <path d="M15.5 7 A0.5,0.5 0 1,1 15.5,6.5 A0.5,0.5 0 1,1 15.5,7 Z" />
                    <path d="M8.5 7 A0.5,0.5 0 1,1 8.5,6.5 A0.5,0.5 0 1,1 8.5,7 Z" />
                    <path d="M14.5 9 A0.5,0.5 0 1,1 14.5,8.5 A0.5,0.5 0 1,1 14.5,9 Z" />
                    <path d="M9.5 9 A0.5,0.5 0 1,1 9.5,8.5 A0.5,0.5 0 1,1 9.5,9 Z" />
                    <path d="M12 10 A0.5,0.5 0 1,1 12,9.5 A0.5,0.5 0 1,1 12,10 Z" />
                    <rect
                      x="11"
                      y="10"
                      width="2"
                      height="3"
                      fill="rgba(186, 230, 253, 0.6)"
                      stroke="currentColor"
                    />
                    <path
                      d="M12 7L12 9"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      fill="rgba(75, 85, 99, 0.4)"
                    />
                    <rect
                      x="8"
                      y="13"
                      width="8"
                      height="4"
                      rx="1"
                      fill="rgba(219, 234, 254, 0.6)"
                      stroke="currentColor"
                    />
                    <rect
                      x="5"
                      y="15"
                      width="3"
                      height="2"
                      fill="rgba(219, 234, 254, 0.4)"
                      stroke="currentColor"
                    />
                    <rect
                      x="16"
                      y="15"
                      width="3"
                      height="2"
                      fill="rgba(219, 234, 254, 0.4)"
                      stroke="currentColor"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm text-emerald-800">
                    Pressure Transmitters
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-emerald-900">
                  {pressureTransmitterIntegrated}
                </span>
              </div>
            </div>

            {/* Additional large-screen details */}
            <div className="hidden 2xl:block mt-4 pt-4 border-t border-emerald-100">
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Total Components:</span>
                <span className="font-semibold">
                  {Number(flowMeterIntegrated) +
                    Number(rcaIntegrated) +
                    Number(pressureTransmitterIntegrated)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-emerald-700 mt-1">
                {/* <span>Coverage Rate:</span>
                <span className="font-semibold">
                  {Math.round(
                    ((Number(flowMeterIntegrated) +
                      Number(rcaIntegrated) +
                      Number(pressureTransmitterIntegrated)) /
                      (totalEsr * 3)) *
                      100,
                  )}
                  %
                </span> */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
