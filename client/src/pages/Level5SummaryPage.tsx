import React, { useState, useMemo, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Download,
  RefreshCw,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  TableProperties,
} from "lucide-react";
import * as XLSX from "xlsx";

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
    escalationLevel?: number;
    escalationRole?: string;
    escalationTitle?: string;
    escalationNotice?: string;
  };
  alertsLevel?: {
    daysStreak: number;
    escalationLevel: number;
    escalationRole: string;
    escalationTitle: string;
    escalationNotice: string;
    lowLpcdSchemes: number;
    lowLpcdVillages: number;
    lowPressureEsrs: number;
    residualChlorineOutOfRange: number;
  };
  details?: {
    iotSchemesTotal?: any[];
    iotSchemesFully?: any[];
    iotVillagesTotal?: any[];
    iotVillagesFully?: any[];
    iotEsrTotal?: any[];
    iotEsrFully?: any[];
    operationalSchemes?: any[];
    operationalVillages?: any[];
    operationalEsr?: any[];
    lowLpcdSchemes?: any[];
    lowLpcdVillages?: any[];
    lowPressureEsrs?: any[];
    residualChlorineOutOfRange?: any[];
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

type ClickableMetricKey =
  | "iotSchemesTotal"
  | "iotSchemesFully"
  | "iotVillagesTotal"
  | "iotVillagesFully"
  | "iotEsrTotal"
  | "iotEsrFully"
  | "operationalSchemes"
  | "operationalVillages"
  | "operationalEsr"
  | "lowLpcdSchemes"
  | "lowLpcdVillages"
  | "lowPressureEsrs"
  | "residualChlorineOutOfRange";

interface MetricConfig {
  title: string;
  section: string;
  columns: Array<{ key: string; label: string }>;
}

export default function Level5SummaryPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [streakDays, setStreakDays] = useState<number>(20);
  const [selectedMetric, setSelectedMetric] = useState<ClickableMetricKey | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [sortField, setSortField] = useState<string>("");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const detailSectionRef = useRef<HTMLDivElement>(null);

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

  const alerts = data?.alertsLevel || data?.alertsLevel5 || {
    daysStreak: streakDays,
    escalationLevel: streakDays <= 7 ? 3 : streakDays <= 15 ? 4 : 5,
    escalationRole:
      streakDays <= 7
        ? "CE & SE Escalation"
        : streakDays <= 15
        ? "Member Secretary (MS) Escalation"
        : "Principal Secretary (PS) Escalation",
    escalationTitle:
      streakDays <= 7
        ? `Alert - Level 3 (CE & SE Escalation) - ${streakDays}+ Days`
        : streakDays <= 15
        ? `Alert - Level 4 (MS Escalation) - ${streakDays}+ Days`
        : `Alert - Level 5 (PS Escalation) - ${streakDays}+ Days`,
    escalationNotice:
      streakDays <= 7
        ? "Superintending Engineer & Chief Engineer escalation for issues persisting ≥ 7 consecutive days"
        : streakDays <= 15
        ? "Member Secretary (Head - MJP) escalation for persistent issues ≥ 15 consecutive days"
        : "Principal Secretary (Head - WSSD) escalation for critical long-term issues ≥ 20 consecutive days",
    lowLpcdSchemes: 0,
    lowLpcdVillages: 0,
    lowPressureEsrs: 0,
    residualChlorineOutOfRange: 0,
  };

  const formatNum = (n: number | undefined | null) => {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString("en-IN");
  };

  // Metrics definitions for detail view and excel download
  const metricConfigs: Record<ClickableMetricKey, MetricConfig> = useMemo(() => ({
    iotSchemesTotal: {
      title: "IoT Progress - Schemes (Total Integrated)",
      section: "IoT Progress",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "total_villages_integrated", label: "Villages Integrated" },
        { key: "total_esr_integrated", label: "ESRs Integrated" },
        { key: "status", label: "Completion Status" },
      ],
    },
    iotSchemesFully: {
      title: "IoT Progress - Schemes (Fully Integrated)",
      section: "IoT Progress",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "fully_completed_villages", label: "Villages Fully Completed" },
        { key: "no_fully_completed_esr", label: "ESRs Fully Completed" },
        { key: "status", label: "Completion Status" },
      ],
    },
    iotVillagesTotal: {
      title: "IoT Progress - Villages (Total Integrated)",
      section: "IoT Progress",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "population", label: "Population" },
        { key: "lpcd_value", label: "Latest LPCD" },
        { key: "status", label: "Status" },
      ],
    },
    iotVillagesFully: {
      title: "IoT Progress - Villages (Fully Integrated)",
      section: "IoT Progress",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "population", label: "Population" },
        { key: "lpcd_value", label: "Latest LPCD" },
        { key: "status", label: "Completion Status" },
      ],
    },
    iotEsrTotal: {
      title: "IoT Progress - ESR (Total Integrated)",
      section: "IoT Progress",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "esr_name", label: "ESR Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "chlorine_connected", label: "Chlorine Sensor" },
        { key: "pressure_connected", label: "Pressure Sensor" },
        { key: "flow_meter_connected", label: "Flow Meter" },
        { key: "status", label: "Overall Status" },
      ],
    },
    iotEsrFully: {
      title: "IoT Progress - ESR (Fully Integrated)",
      section: "IoT Progress",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "esr_name", label: "ESR Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "chlorine_connected", label: "Chlorine Sensor" },
        { key: "pressure_connected", label: "Pressure Sensor" },
        { key: "flow_meter_connected", label: "Flow Meter" },
        { key: "status", label: "Overall Status" },
      ],
    },
    operationalSchemes: {
      title: "Operational - Schemes (Water Supply = Yes)",
      section: "Operational",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "status", label: "Water Supply" },
      ],
    },
    operationalVillages: {
      title: "Operational - Villages (Water Supply = Yes)",
      section: "Operational",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "population", label: "Population" },
        { key: "lpcd_value", label: "Latest LPCD" },
        { key: "status", label: "Water Supply" },
      ],
    },
    operationalEsr: {
      title: "Operational - ESRs (Water Supply = Yes)",
      section: "Operational",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "esr_name", label: "ESR Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "status", label: "Water Supply" },
      ],
    },
    lowLpcdSchemes: {
      title: `Low LPCD In Schemes (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Escalation Alerts",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "region", label: "Region" },
        { key: "villages_count", label: "Affected Villages Count" },
        { key: "max_streak", label: `Max Continuous Days (<55 LPCD)` },
        { key: "villages_list", label: "Affected Villages List" },
      ],
    },
    lowLpcdVillages: {
      title: `Low LPCD In Villages (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Escalation Alerts",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "region", label: "Region" },
        { key: "parameter_value", label: "LPCD Value" },
        { key: "streak_days", label: "Continuous Days (<55)" },
        { key: "telemetry_date", label: "Telemetry Date" },
      ],
    },
    lowPressureEsrs: {
      title: `Low Pressure In ESR (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Escalation Alerts",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "esr_name", label: "ESR Name" },
        { key: "region", label: "Region" },
        { key: "parameter_value", label: "Pressure Value (Bar)" },
        { key: "streak_days", label: "Continuous Days (<0.2 Bar)" },
        { key: "telemetry_date", label: "Telemetry Date" },
      ],
    },
    residualChlorineOutOfRange: {
      title: `Residual Chlorine Out Of Range In ESR (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Escalation Alerts",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "village_name", label: "Village Name" },
        { key: "esr_name", label: "ESR Name" },
        { key: "region", label: "Region" },
        { key: "parameter_value", label: "Chlorine Value (mg/L)" },
        { key: "issue_type", label: "Issue Type" },
        { key: "streak_days", label: "Continuous Days Out of Range" },
        { key: "telemetry_date", label: "Telemetry Date" },
      ],
    },
  }), [streakDays, alerts.escalationRole]);

  // Handler to export any dataset to Excel
  const handleExportExcel = (metricKey: ClickableMetricKey, rawItems?: any[]) => {
    const config = metricConfigs[metricKey];
    const items = rawItems || (data?.details ? (data.details as any)[metricKey] : []) || [];
    if (!items || items.length === 0) {
      alert("No records to export for this metric.");
      return;
    }

    const rows = items.map((item, idx) => {
      const rowObj: Record<string, any> = { "#": idx + 1 };
      config.columns.forEach((col) => {
        rowObj[col.label] = item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : "-";
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const maxCols = config.columns.length + 1;
    const colWidths = [];
    for (let i = 0; i < maxCols; i++) {
      colWidths.push({ wch: 22 });
    }
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    const sheetTitle = config.title.slice(0, 31).replace(/[\/\\?*[\]]/g, "_");
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);

    const safeRegion = selectedRegion.replace(/[^a-zA-Z0-9]/g, "_");
    const safeMetric = metricKey.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${safeMetric}_${safeRegion}_Streak${streakDays}D_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Open detail view for a clicked number
  const handleNumberClick = (key: ClickableMetricKey) => {
    if (selectedMetric === key) {
      // Toggle close if clicked again
      setSelectedMetric(null);
    } else {
      setSelectedMetric(key);
      setSearchQuery("");
      setCurrentPage(1);
      setTimeout(() => {
        detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  // Active items for the selected metric
  const currentMetricConfig = selectedMetric ? metricConfigs[selectedMetric] : null;
  const currentRawItems = useMemo(() => {
    if (!selectedMetric || !data?.details) return [];
    return (data.details as any)[selectedMetric] || [];
  }, [selectedMetric, data?.details]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    if (!currentRawItems || currentRawItems.length === 0) return [];
    let list = [...currentRawItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) =>
        Object.values(item).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA || "").localeCompare(String(valB || ""))
          : String(valB || "").localeCompare(String(valA || ""));
      });
    }

    return list;
  }, [currentRawItems, searchQuery, sortField, sortAsc]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reusable component for Clickable Number Cell
  const ClickableNumber = ({
    metricKey,
    value,
    colorClass = "text-slate-900",
  }: {
    metricKey: ClickableMetricKey;
    value: number | undefined | null;
    colorClass?: string;
  }) => {
    const isSelected = selectedMetric === metricKey;
    const count = Number(value || 0);

    return (
      <div className="inline-flex items-center gap-1.5 group">
        <button
          type="button"
          onClick={() => handleNumberClick(metricKey)}
          className={`font-bold transition-all px-1.5 py-0.5 rounded cursor-pointer ${
            isSelected
              ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400"
              : `${colorClass} hover:text-blue-700 hover:bg-blue-50/80 hover:underline decoration-blue-500 underline-offset-4`
          }`}
          title="Click to view detailed itemized list below"
        >
          {formatNum(count)}
        </button>

        {/* Quick Excel export icon for each number */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleExportExcel(metricKey);
          }}
          disabled={count === 0}
          className={`p-1 rounded transition-colors text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 ${
            count === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
          }`}
          title={`Download ${metricConfigs[metricKey]?.title} Excel`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
        </button>
      </div>
    );
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
                onValueChange={(val) => {
                  setSelectedRegion(val);
                  setSelectedMetric(null);
                }}
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Escalation Level:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 text-xs font-semibold gap-1">
              <button
                onClick={() => {
                  setStreakDays(7);
                  setSelectedMetric(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  streakDays === 7
                    ? "bg-white text-blue-700 shadow-sm font-bold border border-blue-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Level 3: CE & SE Weekly Notice (Every Monday, Streak ≥ 7 Days)"
              >
                <span>7+ Days</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-normal hidden md:inline">
                  CE &amp; SE Escalation
                </span>
              </button>

              <button
                onClick={() => {
                  setStreakDays(15);
                  setSelectedMetric(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  streakDays === 15
                    ? "bg-white text-orange-700 shadow-sm font-bold border border-orange-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Level 4: Member Secretary Notice (1st & 3rd Monday, Streak ≥ 15 Days)"
              >
                <span>15+ Days</span>
                <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded font-normal hidden md:inline">
                  MS Escalation
                </span>
              </button>

              <button
                onClick={() => {
                  setStreakDays(20);
                  setSelectedMetric(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  streakDays === 20
                    ? "bg-white text-rose-700 shadow-sm font-bold border border-rose-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Level 5: Principal Secretary Notice (1st & 3rd Monday, Streak ≥ 20 Days)"
              >
                <span>20+ Days</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-normal hidden md:inline">
                  PS Escalation (Level 5)
                </span>
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

        {/* The Exact Summary Table Card matching user layout */}
        <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden">
          {/* Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              {/* SECTION 1: UPPER MATRIX (Project Scope, IoT Progress, Operational) */}
              <div className="border border-slate-300 m-3 rounded-lg overflow-hidden divide-y divide-slate-300">
                {/* ROW 1: Project Scope - NOT CLICKABLE (per instruction) */}
                <div className="grid grid-cols-12 bg-[#FDF4ED] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-3 px-4 py-3 font-bold text-slate-900">
                    Project Scope
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left">
                    <span className="text-slate-700">Scheme in Scope - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(scope.schemes)}
                    </span>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left">
                    <span className="text-slate-700">Village covered - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(scope.villages)}
                    </span>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left">
                    <span className="text-slate-700">ESR+ GSR+MBR - </span>
                    <span className="font-bold text-slate-900">
                      {formatNum(scope.esr)}
                    </span>
                  </div>
                </div>

                {/* ROW 2: IoT Progress - CLICKABLE NUMBERS */}
                <div className="grid grid-cols-12 bg-[#EAF3FC] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[72px] items-center">
                  <div className="col-span-3 px-4 py-3 font-bold text-slate-900">
                    IoT Progress
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left space-y-1">
                    <div>
                      <span className="text-slate-700">Total Integrated - </span>
                      <ClickableNumber
                        metricKey="iotSchemesTotal"
                        value={iot.schemes.totalIntegrated}
                      />
                    </div>
                    <div>
                      <span className="text-slate-700">Fully Integrated - </span>
                      <ClickableNumber
                        metricKey="iotSchemesFully"
                        value={iot.schemes.fullyIntegrated}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left space-y-1">
                    <div>
                      <span className="text-slate-700">Total Integrated - </span>
                      <ClickableNumber
                        metricKey="iotVillagesTotal"
                        value={iot.villages.totalIntegrated}
                      />
                    </div>
                    <div>
                      <span className="text-slate-700">Fully Integrated - </span>
                      <ClickableNumber
                        metricKey="iotVillagesFully"
                        value={iot.villages.fullyIntegrated}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left space-y-1">
                    <div>
                      <span className="text-slate-700">Total Integrated - </span>
                      <ClickableNumber
                        metricKey="iotEsrTotal"
                        value={iot.esr.totalIntegrated}
                      />
                    </div>
                    <div>
                      <span className="text-slate-700">Fully Integrated - </span>
                      <ClickableNumber
                        metricKey="iotEsrFully"
                        value={iot.esr.fullyIntegrated}
                      />
                    </div>
                  </div>
                </div>

                {/* ROW 3: Operational - CLICKABLE NUMBERS */}
                <div className="grid grid-cols-12 bg-[#EAF7EE] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-3 px-4 py-3 font-bold text-slate-900">
                    Operational
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left">
                    <span className="text-slate-700">Scheme - </span>
                    <ClickableNumber
                      metricKey="operationalSchemes"
                      value={operational.schemes}
                    />
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left">
                    <span className="text-slate-700">Villages - </span>
                    <ClickableNumber
                      metricKey="operationalVillages"
                      value={operational.villages}
                    />
                  </div>
                  <div className="col-span-3 px-4 py-3 text-left">
                    <span className="text-slate-700">No. Of ESR - </span>
                    <ClickableNumber
                      metricKey="operationalEsr"
                      value={operational.esr}
                    />
                  </div>
                </div>
              </div>

              {/* GAP / SEPARATOR */}
              <div className="h-3" />

              {/* SECTION 2: ALERT MATRIX (Dynamic CE & SE / MS / PS based on streak filter) */}
              <div className="border border-slate-300 m-3 rounded-lg overflow-hidden divide-y divide-slate-300">
                {/* ROW 4: Alert Header with dynamic Escalation Role title */}
                <div className="grid grid-cols-10 bg-[#FCECEF] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-2 px-4 py-3 font-bold text-rose-700">
                    {streakDays <= 7 && "Alert - CE & SE Escalation (7+ Days)"}
                    {streakDays > 7 && streakDays <= 15 && "Alert - MS Escalation (15+ Days)"}
                    {streakDays > 15 && "Alert - PS Escalation (20+ Days)"}
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-medium text-slate-800">
                    Low LPCD In schemes
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-medium text-slate-800">
                    Low LPCD In Villages
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-medium text-slate-800">
                    Low Pressure In ESR
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-medium text-slate-800">
                    Residual Chlorine Out Of Range In ESR
                  </div>
                </div>

                {/* ROW 5: Result - CLICKABLE NUMBERS */}
                <div className="grid grid-cols-10 bg-[#FEF9C3] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-2 px-4 py-3 font-bold text-rose-700 flex items-center justify-between">
                    <span>Result</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded shadow-sm">
                      {streakDays <= 7 ? "CE & SE Escalation" : streakDays <= 15 ? "MS Escalation" : "PS Escalation"}
                    </span>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="lowLpcdSchemes"
                      value={alerts.lowLpcdSchemes}
                      colorClass="text-slate-900"
                    />
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="lowLpcdVillages"
                      value={alerts.lowLpcdVillages}
                      colorClass="text-slate-900"
                    />
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="lowPressureEsrs"
                      value={alerts.lowPressureEsrs}
                      colorClass="text-slate-900"
                    />
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="residualChlorineOutOfRange"
                      value={alerts.residualChlorineOutOfRange}
                      colorClass="text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: CLICKED METRIC DETAILED LIST BELOW */}
        {selectedMetric && currentMetricConfig && (
          <div
            ref={detailSectionRef}
            className="bg-white rounded-xl shadow-md border-2 border-blue-400 overflow-hidden transition-all duration-300"
          >
            {/* Header with Title, Actions, and Excel Download */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TableProperties className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    {currentMetricConfig.title}
                  </h3>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-bold">
                    {formatNum(filteredItems.length)} Records
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Region: <span className="font-semibold text-slate-800">{selectedRegion}</span> •{" "}
                  Streak Filter: <span className="font-semibold text-slate-800">{streakDays}+ Days</span> •{" "}
                  Escalation Tier: <span className="font-semibold text-slate-800">{alerts.escalationRole}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Box */}
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search records..."
                    className="pl-8 h-9 text-xs bg-white border-slate-300 shadow-sm rounded-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Primary Excel Download Button */}
                <Button
                  onClick={() => handleExportExcel(selectedMetric, currentRawItems)}
                  disabled={currentRawItems.length === 0}
                  className="h-9 px-3 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                  title="Export this dataset to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Download Excel (.xlsx)</span>
                </Button>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMetric(null)}
                  className="h-9 w-9 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg"
                  title="Close list view"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto">
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <ShieldAlert className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-sm font-semibold">No records match the current filter criteria.</p>
                  <p className="text-xs text-slate-400">
                    {searchQuery
                      ? "Try clearing your search query."
                      : `No data found for ${streakDays}+ days streak in ${selectedRegion} region.`}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
                      {currentMetricConfig.columns.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (sortField === col.key) {
                              setSortAsc(!sortAsc);
                            } else {
                              setSortField(col.key);
                              setSortAsc(true);
                            }
                          }}
                          className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-200 transition-colors select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>{col.label}</span>
                            <ArrowUpDown className="h-3 w-3 text-slate-400" />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedItems.map((item, rowIdx) => {
                      const absoluteIdx = (currentPage - 1) * pageSize + rowIdx + 1;
                      return (
                        <tr
                          key={rowIdx}
                          className="hover:bg-blue-50/50 transition-colors odd:bg-white even:bg-slate-50/40"
                        >
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">
                            {absoluteIdx}
                          </td>
                          {currentMetricConfig.columns.map((col) => {
                            const val = item[col.key];
                            return (
                              <td key={col.key} className="py-2 px-3 text-slate-800">
                                {col.key === "streak_days" || col.key === "max_streak" ? (
                                  <Badge
                                    variant="outline"
                                    className={`font-mono font-bold text-[11px] ${
                                      Number(val) >= 20
                                        ? "bg-rose-50 text-rose-700 border-rose-300"
                                        : Number(val) >= 15
                                        ? "bg-orange-50 text-orange-700 border-orange-300"
                                        : "bg-blue-50 text-blue-700 border-blue-300"
                                    }`}
                                  >
                                    {val || 0} Days
                                  </Badge>
                                ) : col.key === "chlorine_connected" || col.key === "pressure_connected" || col.key === "flow_meter_connected" ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold ${
                                      String(val || '').trim().toLowerCase() === "connected"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                        : "bg-rose-50 text-rose-700 border-rose-300"
                                    }`}
                                  >
                                    {val || "Not Connected"}
                                  </Badge>
                                ) : col.key === "population" ? (
                                  <span className="font-mono text-slate-800">
                                    {val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val).toLocaleString("en-IN") : "-"}
                                  </span>
                                ) : col.key === "lpcd_value" ? (
                                  <span className="font-mono font-semibold text-slate-900">
                                    {val !== undefined && val !== null ? `${val} LPCD` : "-"}
                                  </span>
                                ) : col.key === "status" ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold ${
                                      String(val || '').trim().toLowerCase() === "completed" || String(val || '').trim().toLowerCase() === "fully completed" || String(val || '').trim().toLowerCase() === "yes"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                        : "bg-slate-100 text-slate-700 border-slate-300"
                                    }`}
                                  >
                                    {val || "Active"}
                                  </Badge>
                                ) : col.key === "parameter_value" ? (
                                  <span className="font-mono font-semibold text-slate-900">
                                    {val || "-"}
                                  </span>
                                ) : (
                                  <span>{val !== undefined && val !== null ? String(val) : "-"}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredItems.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>
                    Showing{" "}
                    <span className="font-semibold text-slate-800">
                      {(currentPage - 1) * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-800">
                      {Math.min(currentPage * pageSize, filteredItems.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-800">
                      {filteredItems.length}
                    </span>{" "}
                    records
                  </span>

                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="ml-2 h-7 px-2 bg-white border border-slate-300 rounded text-xs text-slate-700 font-medium"
                  >
                    <option value={15}>15 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage <= 1}
                    className="h-7 px-2 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <span className="px-2 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="h-7 px-2 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Information & Notes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Metric Definitions & Escalation Rules</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">
                Project Scope (Fixed)
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
                IoT Progress (Clickable)
              </span>
              <p>
                Total integrated and fully completed count of schemes, villages,
                and ESRs. Click any number to inspect itemized rosters or export to Excel.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">
                Operational Schemes (Clickable)
              </span>
              <p>
                The active operational schemes (Water Supply = Yes), comprising
                the villages and ESRs currently monitored on the Escalation Portal.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">
                Escalation Cadence (Clickable)
              </span>
              <p>
                <strong>7+ Days:</strong> Level 3 (CE &amp; SE Weekly Notice).<br />
                <strong>15+ Days:</strong> Level 4 (MS Bi-weekly Notice).<br />
                <strong>20+ Days:</strong> Level 5 (PS Escalation Notice).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
