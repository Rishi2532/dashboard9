import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/dashboard/header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Layers } from "lucide-react";

interface SummaryData {
  region: string;
  projectScope: {
    schemes: number;
    villages: number;
    esr: number;
  };
  iotProgress: {
    schemes: { totalIntegrated: number; fullyIntegrated: number };
    villages: { totalIntegrated: number; fullyIntegrated: number };
    esr: { totalIntegrated: number; fullyIntegrated: number };
  };
  operational: {
    schemes: number;
    villages: number;
    esr: number;
  };
  alertsLevel5: {
    daysStreak: number;
    lowLpcdSchemes: number;
    lowLpcdVillages: number;
    lowPressureEsrs: number;
    residualChlorineOutOfRange: number;
  };
}

const REGIONS = [
  "All",
  "Amravati",
  "Chhatrapati Sambhajinagar",
  "Konkan",
  "Nagpur",
  "Nashik",
  "Pune",
];

export default function Level5SummaryPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [streakDays, setStreakDays] = useState<number>(20);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<{ success: boolean } & SummaryData>({
    queryKey: ["/api/escalation/level5-summary", selectedRegion, streakDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "All") {
        params.append("region", selectedRegion);
      }
      params.append("days", String(streakDays));
      const res = await fetch(`/api/escalation/level5-summary?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load Level 5 summary");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const scope = data?.projectScope || {
    schemes: 389,
    villages: 5993,
    esr: 10319,
  };

  const iot = data?.iotProgress || {
    schemes: { totalIntegrated: 226, fullyIntegrated: 52 },
    villages: { totalIntegrated: 2249, fullyIntegrated: 1271 },
    esr: { totalIntegrated: 3018, fullyIntegrated: 2249 },
  };

  const operational = data?.operational || {
    schemes: 39,
    villages: 255,
    esr: 324,
  };

  const alerts = data?.alertsLevel5 || {
    daysStreak: streakDays,
    lowLpcdSchemes: 0,
    lowLpcdVillages: 0,
    lowPressureEsrs: 0,
    residualChlorineOutOfRange: 0,
  };

  const formatNum = (n: number | undefined | null) => {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString("en-IN");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Controls / Filter Bar matching the image */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label
              htmlFor="region-filter-select"
              className="text-base sm:text-lg font-bold text-slate-800 whitespace-nowrap"
            >
              Region -
            </label>
            <div className="w-56 sm:w-64">
              <Select
                value={selectedRegion}
                onValueChange={(val) => setSelectedRegion(val)}
              >
                <SelectTrigger
                  id="region-filter-select"
                  className="h-10 bg-white border-slate-300 font-medium text-slate-700 shadow-sm focus:ring-blue-500 rounded-lg text-sm"
                >
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-sm font-medium">
                      {r === "All" ? "All Regions (State-wide)" : r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Streak Selector & Refresh */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Streak Threshold:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 text-xs font-semibold">
              <button
                onClick={() => setStreakDays(20)}
                className={`px-3 py-1 rounded-md transition-all ${
                  streakDays === 20
                    ? "bg-white text-rose-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                20+ Days (Level 5)
              </button>
              <button
                onClick={() => setStreakDays(15)}
                className={`px-3 py-1 rounded-md transition-all ${
                  streakDays === 15
                    ? "bg-white text-orange-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                15+ Days
              </button>
              <button
                onClick={() => setStreakDays(7)}
                className={`px-3 py-1 rounded-md transition-all ${
                  streakDays === 7
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7+ Days
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="h-9 px-3 gap-1.5 text-xs text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              title="Refresh data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-blue-600" : ""}`}
              />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* The Exact Summary Table Card from the Image */}
        <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden">
          {/* Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              {/* SECTION 1: UPPER MATRIX (Project Scope, IoT Progress, Operational) */}
              <div className="border border-slate-300 m-3 rounded-lg overflow-hidden divide-y divide-slate-300">
                {/* ROW 1: Project Scope */}
                <div className="grid grid-cols-12 bg-[#FDF4ED] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-3 px-4 py-3 font-bold text-slate-900">
                    Project Scope
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center">
                    <span className="text-slate-700">Scheme in Scope - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(scope.schemes)}
                    </span>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center">
                    <span className="text-slate-700">Village covered - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(scope.villages)}
                    </span>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center">
                    <span className="text-slate-700">ESR+ GSR+MBR - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(scope.esr)}
                    </span>
                  </div>
                </div>

                {/* ROW 2: IoT Progress */}
                <div className="grid grid-cols-12 bg-[#EAF3FC] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[72px] items-center">
                  <div className="col-span-3 px-4 py-3 font-bold text-slate-900">
                    IoT Progress
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center space-y-1">
                    <div>
                      <span className="text-slate-700">Total Integrated - </span>
                      <span className="font-bold text-slate-900">
                        {formatNum(iot.schemes.totalIntegrated)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-700">Fully Integrated - </span>
                      <span className="font-bold text-slate-900">
                        {formatNum(iot.schemes.fullyIntegrated)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center space-y-1">
                    <div>
                      <span className="text-slate-700">Total Integrated - </span>
                      <span className="font-bold text-slate-900">
                        {formatNum(iot.villages.totalIntegrated)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-700">Fully Integrated - </span>
                      <span className="font-bold text-slate-900">
                        {formatNum(iot.villages.fullyIntegrated)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center space-y-1">
                    <div>
                      <span className="text-slate-700">Total Integrated - </span>
                      <span className="font-bold text-slate-900">
                        {formatNum(iot.esr.totalIntegrated)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-700">Fully Integrated - </span>
                      <span className="font-bold text-slate-900">
                        {formatNum(iot.esr.fullyIntegrated)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ROW 3: Operational */}
                <div className="grid grid-cols-12 bg-[#EAF7EE] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-3 px-4 py-3 font-bold text-slate-900">
                    Operational
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center">
                    <span className="text-slate-700">Scheme - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(operational.schemes)}
                    </span>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center">
                    <span className="text-slate-700">Villages - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(operational.villages)}
                    </span>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-center">
                    <span className="text-slate-700">No. Of ESR - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(operational.esr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* GAP / SEPARATOR matching image spacing */}
              <div className="h-3" />

              {/* SECTION 2: ALERT MATRIX (Alert - Level 5 -20+ Days & Result) */}
              <div className="border border-slate-300 m-3 rounded-lg overflow-hidden divide-y divide-slate-300">
                {/* ROW 4: Alert Header */}
                <div className="grid grid-cols-10 bg-[#FCECEF] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-2 px-4 py-3 font-bold text-rose-600">
                    Alert - Level 5 -{streakDays}+ Days
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-medium text-slate-800">
                    Low LPCD In schemes
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-medium text-slate-800">
                    Low LPCD In Villages
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-medium text-slate-800">
                    Low Pressure In ESR
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-medium text-slate-800">
                    Residual Chlorin Out Of Range
                  </div>
                </div>

                {/* ROW 5: Result */}
                <div className="grid grid-cols-10 bg-[#FEF9C3] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-2 px-4 py-3 font-bold text-rose-600">
                    Result
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-bold text-slate-900 text-base sm:text-lg">
                    {formatNum(alerts.lowLpcdSchemes)}
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-bold text-slate-900 text-base sm:text-lg">
                    {formatNum(alerts.lowLpcdVillages)}
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-bold text-slate-900 text-base sm:text-lg">
                    {formatNum(alerts.lowPressureEsrs)}
                  </div>
                  <div className="col-span-2 px-4 py-3 text-center font-bold text-slate-900 text-base sm:text-lg">
                    {formatNum(alerts.residualChlorineOutOfRange)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information & Notes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Metric Definitions & Escalation Rules</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">
                Project Scope
              </span>
              <p>
                Baseline scheme, village, and ESR scope drawn directly from{" "}
                <span className="font-medium text-slate-700">
                  scheme_progress_summary
                </span>{" "}
                (Dashboard Scope Overview).
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">
                IoT Progress
              </span>
              <p>
                Total integrated and fully completed count of schemes, villages,
                and ESRs matching the Schemes portal tracking.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">
                Operational Schemes
              </span>
              <p>
                The 39 active operational schemes (Water Supply = Yes), comprising
                255 villages and 324 ESRs currently monitored on the Escalation Portal.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">
                Level 5 Streak (20+ Days)
              </span>
              <p>
                Calculated strictly across continuous telemetry history days
                backwards from latest date for LPCD (&lt;55), Pressure (&lt;0.2 Bar),
                and Chlorine out of range.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
