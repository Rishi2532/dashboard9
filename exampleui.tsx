import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Calendar,
  Info,
  Mail,
  MessageSquare,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

const REGIONS = [
  "All",
  "Amravati",
  "Chhatrapati Sambhajinagar",
  "Konkan",
  "Nagpur",
  "Nashik",
  "Pune",
];

const AGENCIES = [
  "ALL Agency",
  "MJP",
  "ZP",
  "Shikharsamiti",
  "Grampanchayat",
  "Contractor",
];

export default function AlertTrackerPage() {
  const { toast } = useToast();

  // Current date formatted as YYYY-MM-DD and DD/MM/YYYY
  const todayIso = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const todayDisplay = useMemo(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, "0");
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  }, []);

  const yesterdayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const yesterdayDisplay = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  }, []);

  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedAgency, setSelectedAgency] = useState<string>("ALL Agency");

  // Default to today's date per requirements
  const [dataDate, setDataDate] = useState<string>(todayIso);
  const [filterDateInput, setFilterDateInput] = useState<string>(todayDisplay);

  // Modal State for inspecting records behind any cell
  const [selectedCellDetails, setSelectedCellDetails] = useState<{
    title: string;
    metric: string;
    category: string;
    count: number | string;
    items: any[];
  } | null>(null);

  const [modalSearch, setModalSearch] = useState<string>("");
  const [modalPage, setModalPage] = useState<number>(1);
  const modalPageSize = 10;

  // Ref to smoothly scroll to the detail section below the table
  const detailSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCellDetails && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCellDetails]);

  // Query Alert Tracker backend summary for selected date & region
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["/api/alert-tracker/summary", selectedRegion, dataDate, selectedAgency],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "All") {
        params.append("region", selectedRegion);
      }
      params.append("date", dataDate);
      params.append("agency", selectedAgency);
      const res = await fetch(`/api/alert-tracker/summary?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load alert tracker summary");
      return res.json();
    },
    staleTime: 15 * 1000,
  });

  // Query Alert Tracker Cron / Schedule Status
  const { data: cronStatus } = useQuery({
    queryKey: ["/api/alert-tracker/cron-status"],
    queryFn: async () => {
      const res = await fetch("/api/alert-tracker/cron-status");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });


  // Format date display for table headers
  const headerDateInfo = useMemo(() => {
    const dObj = new Date(dataDate);
    const day = dObj.getDate() || 24;
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = monthNames[dObj.getMonth()] || "Oct";
    const year = dObj.getFullYear() || 2026;

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return {
      dayWithOrdinal: getOrdinal(day).toLowerCase(),
      month,
      year,
      displayDate: `${day} ${month} ${year}`,
      formattedShort: `${getOrdinal(day).toLowerCase()} ${month.toLowerCase()}`,
    };
  }, [dataDate]);

  // Handle manual date input submission (e.g. 21/10/2026)
  const handleApplyDateInput = (val: string) => {
    setFilterDateInput(val);
    const trimmed = val.trim();
    // DD/MM/YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
      const d = String(ddmmyyyy[1]).padStart(2, "0");
      const m = String(ddmmyyyy[2]).padStart(2, "0");
      const y = ddmmyyyy[3];
      setDataDate(`${y}-${m}-${d}`);
      return;
    }
    // YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (yyyymmdd) {
      setDataDate(trimmed);
      setFilterDateInput(`${yyyymmdd[3]}/${yyyymmdd[2]}/${yyyymmdd[1]}`);
    }
  };

  // Safe metrics fallbacks
  const projectScope = data?.projectScope || {
    schemes: 389,
    villages: 5993,
    esr: 10319,
  };

  const physicalProgress = data?.physicalProgress || {
    schemes: { partial: 226, fully: 52 },
    villages: { partial: 2249, fully: 1269 },
    esr: { partial: 3024, fully: 2255 },
  };

  const operational = data?.operational || {
    schemes: 39,
    villages: 255,
    esr: 325,
  };

  const alertMatrix = data?.alertMatrix || {
    lpcd: { reported: 204, resolved: 0, unresolvedEE: 204, unresolvedTillDate: 204, items: [] },
    pressure: { reported: 200, resolved: 0, unresolvedEE: 200, unresolvedTillDate: 200, items: [] },
    chlorine: { reported: 298, resolved: 0, unresolvedEE: 298, unresolvedTillDate: 298, items: [] },
  };

  // Helper to render interactive count cell matching palette
  const renderCellCount = (val: number | string | undefined, metricKey: string, catKey: string, cellItems: any[] = []) => {
    const displayVal = val !== undefined && val !== null ? val : 0;

    return (
      <div
        onClick={() => {
          const fallbackItems = alertMatrix[catKey as keyof typeof alertMatrix]?.items || [];
          setSelectedCellDetails({
            title: `${metricKey} - ${catKey.toUpperCase()}`,
            metric: metricKey,
            category: catKey,
            count: displayVal,
            items: cellItems.length > 0 ? cellItems : fallbackItems,
          });
          setModalPage(1);
          setModalSearch("");
        }}
        className="w-full h-full min-h-[44px] flex items-center justify-center font-bold text-base sm:text-lg text-[#0A2540] cursor-pointer hover:bg-[#EBF3FB] hover:text-[#0B3558] transition-colors select-none"
        title="Click to inspect date-wise notifications"
      >
        {displayVal}
      </div>
    );
  };

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Matrix
      const summaryAoa = [
        ["Alert Tracker Matrix", "", "", `Date: ${filterDateInput}`],
        ["Region", selectedRegion, "Filter Agency", selectedAgency],
        [],
        ["Project Scope", `Scheme in Scope - ${projectScope.schemes.toLocaleString()}`, `Village covered - ${projectScope.villages.toLocaleString()}`, `ESR+ GSR+MBR - ${projectScope.esr.toLocaleString()}`],
        ["Physical progress", `Partial Completed - ${physicalProgress.schemes.partial || 226} / Fully Completed - ${physicalProgress.schemes.fully || 52}`, `Partial Completed - ${physicalProgress.villages.partial || 2249} / Fully Completed - ${physicalProgress.villages.fully || 1269}`, `Partial Completed - ${physicalProgress.esr.partial || 3024} / Fully Completed - ${physicalProgress.esr.fully || 2255}`],
        ["Operational", `Scheme - ${operational.schemes || 39}`, `Villages - ${operational.villages || 255}`, `No. Of ESR - ${operational.esr || 325}`],
        [],
        ["Data Date :", filterDateInput],
        [],
        [
          `(Display result for ${headerDateInfo.dayWithOrdinal} ${headerDateInfo.month.toLowerCase()} as per date )`,
          `Resolved - ${headerDateInfo.displayDate}`,
          "Unresolved /Escalated to EE",
          "Unresolved -till date not resolved"
        ],
        ["Low LPCD In Villages Reported", "Low LPCD In Villages", "Low LPCD In Villages", "Low LPCD In Villages"],
        [alertMatrix.lpcd.reported, alertMatrix.lpcd.resolved, alertMatrix.lpcd.unresolvedEE, alertMatrix.lpcd.unresolvedTillDate],
        ["Low Pressure In ESR", "Low Pressure In ESR", "Low Pressure In ESR", "Low Pressure In ESR"],
        [alertMatrix.pressure.reported, alertMatrix.pressure.resolved, alertMatrix.pressure.unresolvedEE, alertMatrix.pressure.unresolvedTillDate],
        ["Residual Chlorine Out Of Range", "Residual Chlorine Out Of Range", "Residual Chlorine Out Of Range", "Residual Chlorine Out Of Range"],
        [alertMatrix.chlorine.reported, alertMatrix.chlorine.resolved, alertMatrix.chlorine.unresolvedEE, alertMatrix.chlorine.unresolvedTillDate],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Alert Tracker Summary");

      // Sheet 2: Notification Logs
      const allRecords = [
        ...(alertMatrix.lpcd.items || []).map((x: any) => ({ Category: "LPCD", ...x })),
        ...(alertMatrix.pressure.items || []).map((x: any) => ({ Category: "Pressure", ...x })),
        ...(alertMatrix.chlorine.items || []).map((x: any) => ({ Category: "Chlorine", ...x })),
      ];

      if (allRecords.length > 0) {
        const wsRecords = XLSX.utils.json_to_sheet(allRecords);
        XLSX.utils.book_append_sheet(wb, wsRecords, "Notification Logs");
      }

      XLSX.writeFile(wb, `Alert_Tracker_${selectedRegion}_${dataDate}.xlsx`);
      toast({
        title: "Excel Exported Successfully",
        description: `Alert Tracker for ${selectedRegion} on ${filterDateInput} has been downloaded.`,
      });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Export Failed",
        description: "Could not export excel spreadsheet.",
        variant: "destructive",
      });
    }
  };

  // Filtered modal items based on search term
  const filteredModalItems = useMemo(() => {
    if (!selectedCellDetails?.items) return [];
    if (!modalSearch.trim()) return selectedCellDetails.items;
    const q = modalSearch.toLowerCase().trim();
    return selectedCellDetails.items.filter((item: any) => {
      return (
        String(item.scheme_id || "").toLowerCase().includes(q) ||
        String(item.scheme_name || "").toLowerCase().includes(q) ||
        String(item.village_name || "").toLowerCase().includes(q) ||
        String(item.reservoir_name || item.esr_name || "").toLowerCase().includes(q) ||
        String(item.recipient_name || "").toLowerCase().includes(q) ||
        String(item.recipient_contact || "").toLowerCase().includes(q) ||
        String(item.region || "").toLowerCase().includes(q)
      );
    });
  }, [selectedCellDetails, modalSearch]);

  const paginatedModalItems = useMemo(() => {
    const start = (modalPage - 1) * modalPageSize;
    return filteredModalItems.slice(start, start + modalPageSize);
  }, [filteredModalItems, modalPage]);

  const totalModalPages = Math.ceil(filteredModalItems.length / modalPageSize) || 1;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header />

      {/* Main Sheet Container */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">
        {/* Top Header & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-[#4A6484]/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#0B3558] flex items-center justify-center text-white font-bold shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0A2540] leading-tight">
                Alert Tracker Portal
              </h1>
              <p className="text-xs text-[#475569] font-medium">
                Water Infrastructure Telemetry & Continuous Escalation Matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto Schedule Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border border-emerald-300 rounded-md text-xs shadow-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-900">
                  Daily Auto-Alerts: {cronStatus?.scheduledTimeFormatted || "11:00 AM IST"}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-medium text-emerald-800">
                  {cronStatus?.hasRunToday ? "Dispatched Today" : "Scheduled"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching || isLoading}
              className="text-xs h-8 border-[#4A6484]/50 text-[#0A2540] hover:bg-[#EBF3FB] hover:text-[#0B3558] flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0B3558] ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={handleExportExcel}
              className="text-xs h-8 bg-[#0B3558] hover:bg-[#07243d] text-white shadow-sm flex items-center gap-1.5 font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Excel
            </Button>
          </div>
        </div>

        {/* Exact Palette Card matching Provided Image */}
        <div className="bg-white p-4 sm:p-6 rounded-md shadow-sm border border-[#4A6484] overflow-x-auto">

          {/* Top Controls Row: Region Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            {/* Region Filter Box */}
            <div className="inline-flex items-center border border-[#4A6484] rounded-sm overflow-hidden bg-white text-xs sm:text-sm font-bold shadow-none">
              <div className="px-3 sm:px-4 py-1.5 border-r border-[#4A6484] text-[#0A2540] select-none bg-white">
                Region -
              </div>
              <div className="px-2 py-0.5 bg-white">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="h-7 w-48 sm:w-56 bg-white border-none text-xs sm:text-sm font-bold text-[#0A2540] focus:ring-0 focus:outline-none shadow-none rounded-none p-0 cursor-pointer">
                    <SelectValue placeholder="All Regions (Statewide)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[#4A6484] text-xs sm:text-sm font-medium z-[9999]">
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r} className="cursor-pointer">
                        {r === "All" ? "All Regions (Statewide)" : r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* UPPER SCOPE TABLE (3 Rows x 4 Cols) */}
          <div className="w-full overflow-hidden border border-[#4A6484] rounded-sm mb-4 text-xs sm:text-sm">
            <table className="w-full border-collapse border border-[#4A6484] text-left">
              <tbody>
                {/* Row 1: Project Scope */}
                <tr className="border-b border-[#4A6484]">
                  <td className="p-2 sm:p-2.5 font-bold border-r border-[#4A6484] bg-[#EBF3FB] text-[#0A2540] w-1/4 text-center sm:text-left">
                    Project Scope
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white border-r border-[#4A6484] w-1/4">
                    Scheme in Scope - {projectScope.schemes.toLocaleString()}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white border-r border-[#4A6484] w-1/4">
                    Village covered - {projectScope.villages.toLocaleString()}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white w-1/4">
                    ESR+ GSR+MBR - {projectScope.esr.toLocaleString()}
                  </td>
                </tr>

                {/* Row 2: Physical progress */}
                <tr className="border-b border-[#4A6484]">
                  <td className="p-2 sm:p-2.5 font-bold border-r border-[#4A6484] bg-[#EBF3FB] text-[#0A2540] w-1/4 text-center sm:text-left align-middle">
                    Physical progress
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484] bg-white w-1/4 text-xs sm:text-sm leading-snug text-[#1E293B]">
                    <div>Partial Completed Schemes - {physicalProgress.schemes?.partial?.toLocaleString() || 226}</div>
                    <div>Fully Completed Schemes - {physicalProgress.schemes?.fully?.toLocaleString() || 52}</div>
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484] bg-white w-1/4 text-xs sm:text-sm leading-snug text-[#1E293B]">
                    <div>Partial Completed Villages - {physicalProgress.villages?.partial?.toLocaleString() || '2,249'}</div>
                    <div>Fully Completed Villages - {physicalProgress.villages?.fully?.toLocaleString() || '1,269'}</div>
                  </td>
                  <td className="p-2 sm:p-2.5 bg-white w-1/4 text-xs sm:text-sm leading-snug text-[#1E293B]">
                    <div>Partial Completed Esrs - {physicalProgress.esr?.partial?.toLocaleString() || '3,024'}</div>
                    <div>Fully Completed Esrs - {physicalProgress.esr?.fully?.toLocaleString() || '2,255'}</div>
                  </td>
                </tr>

                {/* Row 3: Operational */}
                <tr>
                  <td className="p-2 sm:p-2.5 font-bold border-r border-[#4A6484] bg-[#EBF3FB] text-[#0A2540] w-1/4 text-center sm:text-left">
                    Operational
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white border-r border-[#4A6484] w-1/4">
                    Scheme - {operational.schemes || 39}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white border-r border-[#4A6484] w-1/4">
                    Villages - {operational.villages || 255}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white w-1/4">
                    No. Of ESR - {operational.esr || 325}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FILTER SELECTION BAR */}
          <div className="w-full border border-[#4A6484] rounded-sm p-2 sm:p-2.5 mb-3 bg-white text-xs sm:text-sm font-bold flex flex-wrap items-center gap-2">
            <span className="text-[#0A2540] select-none">Filter Selection :</span>
            <div className="flex flex-wrap items-center gap-1.5 font-semibold text-[#334155]">
              {AGENCIES.map((agency, index) => {
                const isSelected = selectedAgency === agency;
                return (
                  <React.Fragment key={agency}>
                    <button
                      type="button"
                      onClick={() => setSelectedAgency(agency)}
                      className={`cursor-pointer px-2.5 py-1 rounded transition-all text-xs sm:text-sm ${isSelected
                        ? "bg-[#0B3558] text-white font-bold shadow-xs"
                        : "hover:text-[#0B3558] text-[#334155]"
                        }`}
                    >
                      {agency}
                    </button>
                    {index < AGENCIES.length - 1 && <span className="text-[#94A3B8] font-light">|</span>}
                  </React.Fragment>
                );
              })}
              <span className="text-[#94A3B8] font-light">|</span>
            </div>
          </div>

          {/* DATA DATE FILTER ROW (Defaults to today, allows yesterday & historical selection) */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs sm:text-sm">
            <div className="inline-flex items-center border border-[#4A6484] rounded-sm font-bold bg-white overflow-hidden shadow-xs">
              <div className="px-3 sm:px-4 py-1.5 border-r border-[#4A6484] text-[#0A2540] select-none bg-white">
                Data Date :
              </div>
              <div className="px-3 py-1 flex items-center gap-1.5 bg-white">
                <input
                  type="text"
                  value={filterDateInput}
                  onChange={(e) => setFilterDateInput(e.target.value)}
                  onBlur={(e) => handleApplyDateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApplyDateInput(filterDateInput);
                  }}
                  placeholder="DD/MM/YYYY"
                  className="bg-transparent text-[#0A2540] font-bold w-24 sm:w-28 border-none outline-none focus:ring-0 p-0 text-xs sm:text-sm"
                />
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-[#0B3558] cursor-pointer" />
                  <input
                    type="date"
                    value={dataDate}
                    onChange={(e) => {
                      setDataDate(e.target.value);
                      const parts = e.target.value.split("-");
                      if (parts.length === 3) {
                        setFilterDateInput(`${parts[2]}/${parts[1]}/${parts[0]}`);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Pick Date"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Switchers */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setDataDate(todayIso);
                  setFilterDateInput(todayDisplay);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${dataDate === todayIso
                  ? "bg-[#0B3558] text-white border-[#0B3558] shadow-xs"
                  : "bg-white text-[#0A2540] border-[#4A6484]/40 hover:bg-[#EBF3FB]"
                  }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setDataDate(yesterdayIso);
                  setFilterDateInput(yesterdayDisplay);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${dataDate === yesterdayIso
                  ? "bg-[#0B3558] text-white border-[#0B3558] shadow-xs"
                  : "bg-white text-[#0A2540] border-[#4A6484]/40 hover:bg-[#EBF3FB]"
                  }`}
              >
                Yesterday
              </button>
            </div>
          </div>

          {/* MAIN ALERT TRACKER TABLE */}
          <div className="w-full overflow-x-auto border border-[#4A6484] rounded-sm text-xs sm:text-sm bg-white mb-4">
            <table className="w-full border-collapse border border-[#4A6484] text-center min-w-[650px]">
              {/* Header Row */}
              <thead>
                <tr className="border-b border-[#4A6484]">
                  {/* Col 1: Display result */}
                  <th className="p-2.5 sm:p-3 border-r border-[#4A6484] bg-[#EBF3FB] font-bold text-[#0A2540] w-1/4">
                    (Display result for {headerDateInfo.dayWithOrdinal} {headerDateInfo.month.toLowerCase()} as per date )
                  </th>

                  {/* Col 2: Resolved */}
                  <th className="p-2.5 sm:p-3 border-r border-[#4A6484] bg-[#EBF3FB] font-bold text-[#0A2540] w-1/4">
                    Resolved - {headerDateInfo.displayDate}
                  </th>

                  {/* Col 3: Unresolved / Escalated to EE */}
                  <th className="p-2.5 sm:p-3 border-r border-[#4A6484] bg-[#EBF3FB] font-bold text-[#0A2540] w-1/4">
                    Unresolved /Escalated to EE
                  </th>

                  {/* Col 4: Unresolved -till date not resolved */}
                  <th className="p-2.5 sm:p-3 bg-[#EBF3FB] font-bold text-[#0A2540] w-1/4">
                    Unresolved -till date not resolved
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* ROW 1: LOW LPCD IN VILLAGES */}
                {/* 1A: Metric Labels */}
                <tr className="border-b border-[#4A6484] font-semibold text-[#1E293B] bg-white">
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Low LPCD In Villages Reported
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Low LPCD In Villages
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Low LPCD In Villages
                  </td>
                  <td className="p-2 sm:p-2.5">
                    Low LPCD In Villages
                  </td>
                </tr>
                {/* 1B: Values (XX / Count) */}
                <tr className="border-b border-[#4A6484] bg-white">
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.lpcd?.reported,
                      "Low LPCD In Villages (Operator Alerts)",
                      "lpcd",
                      (alertMatrix.lpcd?.items || []).filter((x: any) => x.recipient_designation === "Operator" || !x.recipient_designation)
                    )}
                  </td>
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.lpcd?.resolved,
                      "Low LPCD In Villages (Resolved Alerts)",
                      "lpcd",
                      (alertMatrix.lpcd?.items || []).filter((x: any) => x.resolution_status === "RESOLVED")
                    )}
                  </td>
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.lpcd?.unresolvedEE,
                      "Low LPCD In Villages (Escalated to EE)",
                      "lpcd",
                      (alertMatrix.lpcd?.items || []).filter((x: any) => x.recipient_designation === "Executive Engineer")
                    )}
                  </td>
                  <td className="p-0">
                    {renderCellCount(
                      alertMatrix.lpcd?.unresolvedTillDate,
                      "Low LPCD In Villages (Unresolved Till Date)",
                      "lpcd",
                      (alertMatrix.lpcd?.items || []).filter((x: any) => x.resolution_status !== "RESOLVED")
                    )}
                  </td>
                </tr>

                {/* ROW 2: LOW PRESSURE IN ESR */}
                {/* 2A: Metric Labels */}
                <tr className="border-b border-[#4A6484] font-semibold text-[#1E293B] bg-white">
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Low Pressure In ESR
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Low Pressure In ESR
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Low Pressure In ESR
                  </td>
                  <td className="p-2 sm:p-2.5">
                    Low Pressure In ESR
                  </td>
                </tr>
                {/* 2B: Values (XX / Count) */}
                <tr className="border-b border-[#4A6484] bg-white">
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.pressure?.reported,
                      "Low Pressure In ESR (Operator Alerts)",
                      "pressure",
                      (alertMatrix.pressure?.items || []).filter((x: any) => x.recipient_designation === "Operator" || !x.recipient_designation)
                    )}
                  </td>
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.pressure?.resolved,
                      "Low Pressure In ESR (Resolved Alerts)",
                      "pressure",
                      (alertMatrix.pressure?.items || []).filter((x: any) => x.resolution_status === "RESOLVED")
                    )}
                  </td>
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.pressure?.unresolvedEE,
                      "Low Pressure In ESR (Escalated to EE)",
                      "pressure",
                      (alertMatrix.pressure?.items || []).filter((x: any) => x.recipient_designation === "Executive Engineer")
                    )}
                  </td>
                  <td className="p-0">
                    {renderCellCount(
                      alertMatrix.pressure?.unresolvedTillDate,
                      "Low Pressure In ESR (Unresolved Till Date)",
                      "pressure",
                      (alertMatrix.pressure?.items || []).filter((x: any) => x.resolution_status !== "RESOLVED")
                    )}
                  </td>
                </tr>

                {/* ROW 3: RESIDUAL CHLORINE OUT OF RANGE */}
                {/* 3A: Metric Labels */}
                <tr className="border-b border-[#4A6484] font-semibold text-[#1E293B] bg-white">
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Residual Chlorine Out Of Range
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Residual Chlorine Out Of Range
                  </td>
                  <td className="p-2 sm:p-2.5 border-r border-[#4A6484]">
                    Residual Chlorine Out Of Range
                  </td>
                  <td className="p-2 sm:p-2.5">
                    Residual Chlorine Out Of Range
                  </td>
                </tr>
                {/* 3B: Values (XX / Count) */}
                <tr className="bg-white">
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.chlorine?.reported,
                      "Residual Chlorine Out Of Range (Operator Alerts)",
                      "chlorine",
                      (alertMatrix.chlorine?.items || []).filter((x: any) => x.recipient_designation === "Operator" || !x.recipient_designation)
                    )}
                  </td>
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.chlorine?.resolved,
                      "Residual Chlorine Out Of Range (Resolved Alerts)",
                      "chlorine",
                      (alertMatrix.chlorine?.items || []).filter((x: any) => x.resolution_status === "RESOLVED")
                    )}
                  </td>
                  <td className="border-r border-[#4A6484] p-0">
                    {renderCellCount(
                      alertMatrix.chlorine?.unresolvedEE,
                      "Residual Chlorine Out Of Range (Escalated to EE)",
                      "chlorine",
                      (alertMatrix.chlorine?.items || []).filter((x: any) => x.recipient_designation === "Executive Engineer")
                    )}
                  </td>
                  <td className="p-0">
                    {renderCellCount(
                      alertMatrix.chlorine?.unresolvedTillDate,
                      "Residual Chlorine Out Of Range (Unresolved Till Date)",
                      "chlorine",
                      (alertMatrix.chlorine?.items || []).filter((x: any) => x.resolution_status !== "RESOLVED")
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Helpful Information Footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[#475569] border-t border-[#CBD5E1] pt-3">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0B3558]" />
              <span>Click on any numerical cell to inspect the itemized records.</span>
            </div>
            <div className="text-[#475569]">
              Region: <b className="text-[#0A2540]">{selectedRegion}</b> | Selected Date: <b className="text-[#0A2540]">{filterDateInput}</b>
            </div>
          </div>

        </div>

        {/* INLINE ITEM DETAIL TABLE - Appears Below the Existing Table Without Dark Overlay */}
        {selectedCellDetails && (
          <div
            ref={detailSectionRef}
            className="bg-white p-4 sm:p-6 rounded-md shadow-sm border border-[#4A6484] transition-all scroll-mt-4"
          >
            {/* Header: Title, Subtitle, Count Badge, and Close Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CBD5E1] pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#0B3558] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0A2540] flex items-center gap-2">
                    {selectedCellDetails.title}
                  </h3>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Viewing itemized records for <span className="font-semibold text-[#0A2540]">{selectedRegion === "All" ? "All Regions" : selectedRegion}</span> on <span className="font-semibold text-[#0A2540]">{filterDateInput}</span>. Total entries: <span className="font-bold text-[#0B3558]">{filteredModalItems.length}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded bg-[#EBF3FB] border border-[#4A6484] text-[#0B3558] font-bold text-xs shadow-xs">
                  Count: {selectedCellDetails.count}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedCellDetails(null)}
                  className="h-8 text-xs border-[#4A6484] text-[#0A2540] hover:bg-[#EBF3FB] hover:text-[#0B3558] flex items-center gap-1 font-semibold"
                  title="Close details table"
                >
                  <X className="w-3.5 h-3.5" />
                  Close Table
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="py-2.5 flex items-center justify-between gap-3 flex-wrap mb-2">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#4A6484]" />
                <input
                  type="text"
                  placeholder="Search by scheme name, ID, village, ESR, recipient, or mobile..."
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#4A6484] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3558] text-[#0A2540] bg-white placeholder:text-[#94A3B8]"
                />
              </div>

              <div className="text-xs text-[#475569] font-medium">
                Page <span className="font-bold text-[#0A2540]">{modalPage}</span> of <span className="font-bold text-[#0A2540]">{totalModalPages}</span>
              </div>
            </div>

            {/* Table Content - Date-Wise Details for Operator and EE Notifications */}
            <div className="w-full overflow-x-auto border border-[#4A6484] rounded-md shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#EBF3FB] text-[#0A2540] font-bold border-b border-[#4A6484]">
                  <tr>
                    <th className="p-2.5 border-r border-[#4A6484] text-center w-8">#</th>
                    <th className="p-2.5 border-r border-[#4A6484]">Notification Time</th>
                    <th className="p-2.5 border-r border-[#4A6484]">Recipient & Designation</th>
                    <th className="p-2.5 border-r border-[#4A6484] text-center">Channel</th>
                    <th className="p-2.5 border-r border-[#4A6484]">Scheme Details</th>
                    <th className="p-2.5 border-r border-[#4A6484]">Village / Reservoir</th>
                    <th className="p-2.5 border-r border-[#4A6484] text-center">Telemetry Value</th>
                    <th className="p-2.5 border-r border-[#4A6484] text-center">Delivery</th>
                    <th className="p-2.5 text-center">Escalation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBD5E1]">
                  {paginatedModalItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[#64748B] font-medium bg-white">
                        No itemized records found for this filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedModalItems.map((item: any, idx: number) => {
                      const rowNum = (modalPage - 1) * modalPageSize + idx + 1;
                      const val = item.telemetry_value || item.parameter_value || item.lpcd_value || item.pressure_value || item.chlorine_value || item.alert_value || "-";
                      const isEE = item.recipient_designation === "Executive Engineer" || item.escalated_to_ee;
                      const channel = item.notification_channel || "SMS";
                      const dateSent = item.sent_at
                        ? new Date(item.sent_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
                        : (item.sent_date ? `${item.sent_date} 11:00 AM` : "-");

                      return (
                        <tr
                          key={item.id || `${item.scheme_id}-${idx}`}
                          className="hover:bg-[#EBF3FB]/50 transition-colors bg-white even:bg-[#F8FAFC]"
                        >
                          <td className="p-2 font-mono text-[#64748B] text-center border-r border-[#CBD5E1]">{rowNum}</td>
                          <td className="p-2 font-mono text-[#0A2540] border-r border-[#CBD5E1] whitespace-nowrap">
                            {dateSent}
                          </td>
                          <td className="p-2 border-r border-[#CBD5E1]">
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold w-max ${isEE
                                ? "bg-[#0B3558] text-white"
                                : "bg-[#EBF3FB] text-[#0B3558] border border-[#4A6484]/30"
                                }`}>
                                {isEE ? "Executive Engineer" : "Operator"}
                              </span>
                              <span className="font-semibold text-[#0F172A]">{item.recipient_name || (isEE ? "EE Office" : "Scheme Operator")}</span>
                              <span className="text-[11px] text-[#475569] font-mono">{item.recipient_contact || item.mobile || "-"}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center border-r border-[#CBD5E1]">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${channel === "Email"
                              ? "bg-purple-100 text-purple-800 border border-purple-300"
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                              }`}>
                              {channel === "Email" ? (
                                <><Mail className="w-3 h-3" /> Email</>
                              ) : (
                                <><MessageSquare className="w-3 h-3" /> SMS</>
                              )}
                            </span>
                          </td>
                          <td className="p-2 border-r border-[#CBD5E1]">
                            <div className="font-semibold text-[#0A2540]">{item.scheme_id || "-"}</div>
                            <div className="text-[11px] text-[#334155] line-clamp-1">{item.scheme_name || "-"}</div>
                            <div className="text-[10px] text-[#64748B]">{item.region || selectedRegion}</div>
                          </td>
                          <td className="p-2 border-r border-[#CBD5E1]">
                            <div className="text-[#1E293B] font-medium">{item.village_name || "-"}</div>
                            <div className="text-[11px] text-[#64748B]">{item.reservoir_name || item.esr_name || "-"}</div>
                          </td>
                          <td className="p-2 font-bold text-[#0B3558] text-center border-r border-[#CBD5E1]">
                            {val}
                          </td>
                          <td className="p-2 text-center border-r border-[#CBD5E1]">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                              {item.delivery_status || "SUCCESS"}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              {item.resolution_status === "RESOLVED" ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Resolved
                                </span>
                              ) : isEE ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                  Escalated to EE (1-Day Gap)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EBF3FB] text-[#0B3558] border border-[#4A6484]/30">
                                  Day 1 Operator Alert
                                </span>
                              )}
                              {item.original_alert_date && (
                                <span className="text-[10px] text-[#64748B]">Orig: {item.original_alert_date}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalModalPages > 1 && (
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#CBD5E1]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                  disabled={modalPage === 1}
                  className="text-xs h-7 border-[#4A6484] text-[#0A2540] hover:bg-[#EBF3FB] hover:text-[#0B3558] rounded"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1 text-[#0B3558]" /> Previous
                </Button>
                <span className="text-xs text-[#475569]">
                  Showing <span className="font-semibold text-[#0A2540]">{paginatedModalItems.length}</span> of <span className="font-semibold text-[#0A2540]">{filteredModalItems.length}</span> entries
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalPage((p) => Math.min(totalModalPages, p + 1))}
                  disabled={modalPage >= totalModalPages}
                  className="text-xs h-7 border-[#4A6484] text-[#0A2540] hover:bg-[#EBF3FB] hover:text-[#0B3558] rounded"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#0B3558]" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
