import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegionSummary } from "@/types";
import { GitBranchPlus, Target, CheckCircle2, Home, Droplet } from "lucide-react";

interface ScopeResultsCardProps {
  data?: RegionSummary;
  isLoading: boolean;
  schemeView?: "ALL" | "INSTRUMENTED";
}

export default function ScopeResultsCard({
  data,
  isLoading,
  schemeView = "ALL",
}: ScopeResultsCardProps) {
  const isInstrumented = schemeView === "INSTRUMENTED";

  if (isLoading || !data) {
    return (
      <Card className="bg-white overflow-hidden rounded-lg border-0 shadow-sm h-full flex flex-col">
        <CardHeader className="p-4 border-b border-gray-100 flex-none gap-2">
          <div className="animate-pulse bg-gray-200 h-6 w-1/3 rounded"></div>
        </CardHeader>
        <CardContent className="p-4 flex-1">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="animate-pulse bg-gray-100 rounded-lg h-full min-h-[200px]"></div>
            <div className="animate-pulse bg-emerald-50 rounded-lg h-full min-h-[200px]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSchemes = isInstrumented
    ? data.total_schemes || 0
    : data.total_schemes_integrated || 0;
  const completedSchemes = isInstrumented
    ? data.schemes_operational || 0
    : data.fully_completed_schemes || 0;

  const totalVillages = isInstrumented
    ? data.total_villages || 0
    : data.total_villages_integrated || 0;
  const completedVillages = isInstrumented
    ? data.villages_operational || 0
    : data.fully_completed_villages || 0;

  const totalEsr = isInstrumented
    ? data.total_esr || 0
    : data.total_esr_integrated || 0;
  const completedEsr = isInstrumented
    ? data.esr_operational || 0
    : data.fully_completed_esr || 0;

  return (
    <Card className="bg-white overflow-hidden rounded-lg border-0 shadow-sm h-full flex flex-col">
      <CardHeader className="px-4 py-4 md:px-5 md:py-4 flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white">
        <CardTitle className="text-base sm:text-lg font-bold text-slate-800 flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-600" />
          Project Delivery Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 h-full">
          {/* LEFT SIDE: SCOPE */}
          <div className="bg-blue-50/40 rounded-xl p-3 sm:p-4 border border-blue-100/50 flex flex-col justify-center">
            <h3 className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-widest mb-4 flex items-center">
              Scope
            </h3>
            
            <div className="space-y-4 sm:space-y-6">
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-900 leading-none">
                  {totalSchemes}
                </p>
                <div className="flex items-center mt-1 sm:mt-1.5">
                  <GitBranchPlus className="w-3.5 h-3.5 text-blue-500 mr-1.5" />
                  <p className="text-[10px] sm:text-xs text-blue-700 font-medium leading-tight">
                    {isInstrumented ? "MJP Approved MVS Schemes" : "Total Schemes"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-800 leading-none">
                  {totalVillages}
                </p>
                <div className="flex items-center mt-1">
                  <Home className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
                  <p className="text-[10px] sm:text-xs text-blue-600 font-medium leading-tight">
                    Total Villages
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-800 leading-none">
                  {totalEsr}
                </p>
                <div className="flex items-center mt-1">
                  <Droplet className="w-3.5 h-3.5 text-purple-500 mr-1.5" />
                  <p className="text-[10px] sm:text-xs text-blue-600 font-medium leading-tight">
                    Total ESR
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: RESULTS */}
          <div className="bg-emerald-50/40 rounded-xl p-3 sm:p-4 border border-emerald-100/50 flex flex-col justify-center shadow-inner">
            <h3 className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-widest mb-4 flex items-center">
              Results
            </h3>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <p className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-700 leading-none">
                  {completedSchemes}
                </p>
                <div className="flex items-start mt-1 sm:mt-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5 shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs text-emerald-800 font-bold leading-tight drop-shadow-sm">
                    {isInstrumented 
                      ? "100% Civil Work Completed Schemes(MVS)" 
                      : "Fully Completed Schemes"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700 leading-none">
                  {completedVillages}
                </p>
                <div className="flex items-start mt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mr-1.5 shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs text-emerald-700 font-semibold leading-tight">
                    Fully Operational Villages
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700 leading-none">
                  {completedEsr}
                </p>
                <div className="flex items-start mt-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mr-1.5 shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs text-emerald-700 font-semibold leading-tight">
                    Fully Completed ESR
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
