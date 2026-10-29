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
    AlertCircle,
    MapPin,
    Phone,
    Copy,
    Check,
    Droplets,
    Gauge,
    FlaskConical,
    Activity,
    Send,
    FileText,
    Smartphone,
    Server,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    "ZP-Shikarsamiti",
    "ZP-Self",
    "GP",
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

    // Default to current date (Alert Date)
    const [dataDate, setDataDate] = useState<string>(todayIso);
    const [filterDateInput, setFilterDateInput] = useState<string>(todayDisplay);
    const [isTriggeringAlerts, setIsTriggeringAlerts] = useState<boolean>(false);

    // Modal / Detail state for inspecting records behind any cell
    const [selectedCellDetails, setSelectedCellDetails] = useState<{
        title: string;
        metric: string;
        category: string;
        count: number | string;
        items: any[];
        colType?: "operator" | "escalation" | "resolved";
        scopeType?: "scheme" | "village" | "esr";
    } | null>(null);

    const [modalSearch, setModalSearch] = useState<string>("");
    const [modalRegionFilter, setModalRegionFilter] = useState<string>("All");
    const [modalConnectionFilter, setModalConnectionFilter] = useState<"all" | "connected" | "not_connected">("all");
    const [modalPage, setModalPage] = useState<number>(1);
    const modalPageSize = 10;
    const [copiedMobile, setCopiedMobile] = useState<string | null>(null);

    // Modal state for Field Remarks (matching Escalation Portal)
    const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
        issues: any[];
        title: string;
        schemeId?: string | number;
    } | null>(null);
    const [remarksModalStatus, setRemarksModalStatus] = useState<"all" | "active" | "resolved">("all");

    // Modal state for SMS Dispatch Logs (matching Escalation Portal)
    const [selectedSmsItem, setSelectedSmsItem] = useState<{
        item: any;
        smsList: any[];
    } | null>(null);
    const [copiedSmsText, setCopiedSmsText] = useState<boolean>(false);

    // Modal state for Email Dispatch Details (matching Escalation Portal)
    const [selectedEmailItem, setSelectedEmailItem] = useState<{
        item: any;
        emailDate?: string;
        emailTime?: string;
        targetTier?: string;
    } | null>(null);

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
            params.append("agency", selectedAgency === "ALL Agency" ? "ALL" : selectedAgency);
            params.append("refresh", "true");
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

    // Format date display for table headers (Alert Date evaluates previous day's telemetry)
    const headerDateInfo = useMemo(() => {
        if (data?.dateMeta?.dayWithOrdinal && data?.dateMeta?.month) {
            return {
                dayWithOrdinal: data.dateMeta.dayWithOrdinal.toLowerCase(),
                month: data.dateMeta.month,
                year: data.dateMeta.year,
                displayDate: `${data.dateMeta.dayWithOrdinal} ${data.dateMeta.month} ${data.dateMeta.year}`,
                formattedShort: `${data.dateMeta.dayWithOrdinal.toLowerCase()} ${data.dateMeta.month.toLowerCase()}`,
            };
        }
        const dObj = new Date(dataDate);
        dObj.setDate(dObj.getDate() - 1);
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
    }, [dataDate, data?.dateMeta]);

    // Handle manual date input submission (e.g. 21/10/2026 or 2026-10-22)
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
        schemes: 0,
        villages: 0,
        esr: 0,
    };

    const physicalProgress = data?.physicalProgress || {
        schemes: { partial: 340, fully: 49 },
        villages: { partial: 5579, fully: 391 },
        esr: { partial: 9628, fully: 612 },
    };

    const operational = data?.operational || {
        schemes: 47,
        villages: 346,
        esr: 407,
    };

    const diffCounts = data?.diffCounts || {
        schemes: Math.max(0, (physicalProgress.schemes?.fully || 0) - (operational.schemes || 0)),
        villages: Math.max(0, (physicalProgress.villages?.fully || 0) - (operational.villages || 0)),
        esr: Math.max(0, (physicalProgress.esr?.fully || 0) - (operational.esr || 0)),
    };

    const renderScopeCount = (val: number | undefined | null) => {
        if (val === undefined || val === null || val === 0) return "-";
        return val.toLocaleString();
    };

    const alertMatrix = data?.alertMatrix || {
        lpcd: { reported: 0, resolved: 0, unresolved: 0, unresolvedEE: 0, unresolvedTillDate: 0, items: [], unresolvedItems: [], escalatedEEItems: [] },
        pressure: { reported: 0, resolved: 0, unresolved: 0, unresolvedEE: 0, unresolvedTillDate: 0, items: [], unresolvedItems: [], escalatedEEItems: [] },
        chlorine: { reported: 0, resolved: 0, unresolved: 0, unresolvedEE: 0, unresolvedTillDate: 0, items: [], unresolvedItems: [], escalatedEEItems: [] },
    };

    // Helper to render interactive count cell matching palette
    const renderCellCount = (
        val: number | string | undefined,
        metricKey: string,
        catKey: string,
        cellItems: any[] = [],
        colType: "operator" | "escalation" | "resolved" = "operator"
    ) => {
        const displayVal = val !== undefined && val !== null ? val : 0;
        const isPending = typeof displayVal === "string" && displayVal.startsWith("Will be displayed");

        if (isPending) {
            return (
                <div className="w-full h-full min-h-[44px] flex items-center justify-center px-2 sm:px-3 py-1.5 select-none text-center" title="Awaiting forward date comparison data">
                    <span className="inline-block px-2.5 py-1 rounded bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] text-[11px] sm:text-xs font-semibold italic max-w-full leading-snug">
                        {displayVal}
                    </span>
                </div>
            );
        }

        return (
            <div
                onClick={() => {
                    const fallbackItems = alertMatrix[catKey as keyof typeof alertMatrix]?.items || [];
                    setSelectedCellDetails({
                        title: `${metricKey} - ${catKey.toUpperCase()}`,
                        metric: metricKey,
                        category: catKey,
                        count: displayVal,
                        items: cellItems && cellItems.length > 0 ? cellItems : fallbackItems,
                        colType,
                    });
                    setModalPage(1);
                    setModalSearch("");
                    setModalRegionFilter("All");
                    setModalConnectionFilter("all");
                }}
                className="w-full h-full min-h-[44px] flex items-center justify-center font-bold text-base sm:text-lg text-[#0A2540] cursor-pointer hover:bg-[#EBF3FB] hover:text-[#0B3558] transition-colors select-none"
                title="Click to inspect date-wise notifications"
            >
                {displayVal}
            </div>
        );
    };

    // Clickable Upper Scope helper
    const handleScopeClick = (title: string, itemsKey: string, countVal: number | string) => {
        const details = data?.details || {};
        const items = details[itemsKey] || [];
        const isScheme = itemsKey.toLowerCase().includes("scheme");
        const isVillage = itemsKey.toLowerCase().includes("village");
        const isEsr = itemsKey.toLowerCase().includes("esr");
        setSelectedCellDetails({
            title,
            metric: itemsKey,
            category: "scope",
            scopeType: isScheme ? "scheme" : isVillage ? "village" : "esr",
            count: countVal,
            items,
        });
        setModalPage(1);
        setModalSearch("");
        setModalRegionFilter("All");
        setModalConnectionFilter("all");
    };

    // Trigger daily alerts dispatch on demand (strictly uses scheme_operator_details)
    const handleTriggerDailyAlerts = async () => {
        setIsTriggeringAlerts(true);
        try {
            const res = await fetch("/api/alert-tracker/escalate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: dataDate, force: true }),
            });
            const json = await res.json();
            if (json.success) {
                toast({
                    title: "Daily Alerts Dispatched",
                    description: `Processed ${json.totalAlerts || 0} alerts. Operators notified: ${json.operatorsNotified || 0}, EE SMS sent: ${json.eeSmsSent || 0}, EE Emails sent: ${json.eeEmailsSent || 0}.`,
                });
            } else {
                toast({
                    title: "Dispatch Completed with Warning",
                    description: json.error || "Alert dispatch completed with partial notices.",
                    variant: "destructive",
                });
            }
            refetch();
        } catch (err: any) {
            toast({
                title: "Dispatch Failed",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsTriggeringAlerts(false);
        }
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
                ["Physical progress", `Partial completed schemes - ${(physicalProgress.schemes?.partial ?? 340).toLocaleString()} / Fully Completed Schemes - ${(physicalProgress.schemes?.fully ?? 49).toLocaleString()}`, `Villages covered in Partial schemes - ${(physicalProgress.villages?.partial ?? 5579).toLocaleString()} / Villages covered in fully completed schemes - ${(physicalProgress.villages?.fully ?? 391).toLocaleString()}`, `ESRs covered in Partial schemes - ${(physicalProgress.esr?.partial ?? 9628).toLocaleString()} / ESRs covered in fully completed schemes - ${(physicalProgress.esr?.fully ?? 612).toLocaleString()}`],
                ["Operational", `Scheme - ${operational.schemes || 39}`, `Villages - ${operational.villages || 255}`, `No. Of ESR - ${operational.esr || 325}`],
                [],
                ["Alert Date :", filterDateInput],
                [],
                [
                    `(Display result for ${headerDateInfo.dayWithOrdinal} ${headerDateInfo.month.toLowerCase()} as per date )`,
                    "Resolution in 24 hrs at operator level",
                    "Unresolved and escalated to EE",
                    "Resolution after escalation at EE level",
                    "Pending resolution at EE level"
                ],
                ["Low LPCD In Villages Reported", "Low LPCD In Villages", "Low LPCD In Villages", "Low LPCD In Villages", "Low LPCD In Villages"],
                [alertMatrix.lpcd.reported, alertMatrix.lpcd.resolved || 0, alertMatrix.lpcd.unresolvedEE, alertMatrix.lpcd.subsequentResolved || 0, alertMatrix.lpcd.unresolvedTillDate || alertMatrix.lpcd.unresolved],
                ["Low Pressure In ESR", "Low Pressure In ESR", "Low Pressure In ESR", "Low Pressure In ESR", "Low Pressure In ESR"],
                [alertMatrix.pressure.reported, alertMatrix.pressure.resolved || 0, alertMatrix.pressure.unresolvedEE, alertMatrix.pressure.subsequentResolved || 0, alertMatrix.pressure.unresolvedTillDate || alertMatrix.pressure.unresolved],
                ["Residual Chlorine Out Of Range", "Residual Chlorine Out Of Range", "Residual Chlorine Out Of Range", "Residual Chlorine Out Of Range", "Residual Chlorine Out Of Range"],
                [alertMatrix.chlorine.reported, alertMatrix.chlorine.resolved || 0, alertMatrix.chlorine.unresolvedEE, alertMatrix.chlorine.subsequentResolved || 0, alertMatrix.chlorine.unresolvedTillDate || alertMatrix.chlorine.unresolved],
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

    // Filtered modal items based on search term, list-specific region filter, and connection status filter
    const filteredModalItems = useMemo(() => {
        if (!selectedCellDetails?.items) return [];
        let items = selectedCellDetails.items;

        // Apply list-specific region filter if selected
        if (modalRegionFilter && modalRegionFilter !== "All") {
            const rLower = modalRegionFilter.toLowerCase().trim();
            const normRegion = rLower.includes("sambhajinagar") ? "sambhajinagar" : rLower;
            items = items.filter((item: any) => {
                const itemRegion = String(item.region || "").toLowerCase();
                return itemRegion.includes(normRegion) || itemRegion.includes(rLower);
            });
        }

        // Apply list-specific connection status filter if selected
        if (modalConnectionFilter !== "all") {
            items = items.filter((item: any) => {
                const status = String(item.fully_completion_scheme_status || item.status || "").trim();
                const isNotConnectedScheme = status === "Not-Connected" || status.toLowerCase() === "not connected";

                let isConn = false;
                if (status === "Not-Connected" || status.toLowerCase() === "not connected") {
                    isConn = false;
                } else if (item.is_connected !== undefined && item.is_connected !== null) {
                    isConn = item.is_connected === "Connected" || String(item.is_connected).toLowerCase() === "yes";
                } else {
                    isConn = Number(item.connected_villages || 0) > 0 || Number(item.connected_esrs || 0) > 0;
                }

                return modalConnectionFilter === "connected" ? isConn : !isConn;
            });
        }

        if (!modalSearch.trim()) return items;
        const q = modalSearch.toLowerCase().trim();
        return items.filter((item: any) => {
            return (
                String(item.scheme_id || "").toLowerCase().includes(q) ||
                String(item.scheme_name || "").toLowerCase().includes(q) ||
                String(item.village_name || "").toLowerCase().includes(q) ||
                String(item.reservoir_name || item.esr_name || "").toLowerCase().includes(q) ||
                String(item.recipient_name || item.operator_name || item.ee_name || "").toLowerCase().includes(q) ||
                String(item.recipient_contact || item.operator_number || item.ee_number || "").toLowerCase().includes(q) ||
                String(item.ee_email || item.recipient_email || "").toLowerCase().includes(q) ||
                String(item.region || "").toLowerCase().includes(q) ||
                String(item.division || "").toLowerCase().includes(q) ||
                String(item.block || "").toLowerCase().includes(q) ||
                String(item.total_villages || "").toLowerCase().includes(q) ||
                String(item.connected_villages || "").toLowerCase().includes(q) ||
                String(item.total_esrs || "").toLowerCase().includes(q) ||
                String(item.completed_esrs || "").toLowerCase().includes(q) ||
                String(item.population || "").toLowerCase().includes(q) ||
                String(item.is_connected || "").toLowerCase().includes(q) ||
                String(item.flow_meter_connected || "").toLowerCase().includes(q) ||
                String(item.pressure_connected || "").toLowerCase().includes(q) ||
                String(item.chlorine_connected || "").toLowerCase().includes(q) ||
                String(item.reading_value || item.telemetry_value || "").toLowerCase().includes(q) ||
                String(item.latest_lpcd || "").toLowerCase().includes(q) ||
                String(item.latest_water || "").toLowerCase().includes(q) ||
                String(item.agency_type || item.operated_by || "").toLowerCase().includes(q)
            );
        });
    }, [selectedCellDetails, modalSearch, modalRegionFilter, modalConnectionFilter]);

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
                                Escalation Portal
                            </h1>
                            <p className="text-xs text-[#475569] font-medium">
                                Water Infrastructure Telemetry & Continuous Escalation Matrix
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Auto Schedule Status Badge */}
                        {/* <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border border-emerald-300 rounded-md text-xs shadow-xs">
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
                        </div> */}

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

                        {/* <Button
                            size="sm"
                            onClick={handleTriggerDailyAlerts}
                            disabled={isTriggeringAlerts}
                            className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center gap-1.5 font-semibold transition-colors"
                            title="Trigger daily SMS to operators and escalation to EEs immediately"
                        >
                            <Send className={`w-3.5 h-3.5 ${isTriggeringAlerts ? "animate-pulse" : ""}`} />
                            {isTriggeringAlerts ? "Sending..." : "Send Daily Alerts"}
                        </Button> */}

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
                                <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedCellDetails(null); }}>
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
                                        <div
                                            onClick={() => handleScopeClick("Partial Completed Schemes", "iotSchemesTotal", physicalProgress.schemes?.partial ?? 340)}
                                            className="cursor-pointer hover:text-[#0B3558] hover:underline"
                                        >
                                            Partial completed schemes - {renderScopeCount(physicalProgress.schemes?.partial)}
                                        </div>
                                        <div
                                            onClick={() => handleScopeClick("Fully Completed Schemes", "iotSchemesFully", physicalProgress.schemes?.fully ?? 49)}
                                            className="cursor-pointer hover:text-[#0B3558] hover:underline"
                                        >
                                            Fully Completed Schemes - {renderScopeCount(physicalProgress.schemes?.fully)}
                                        </div>
                                    </td>
                                    <td className="p-2 sm:p-2.5 border-r border-[#4A6484] bg-white w-1/4 text-xs sm:text-sm leading-snug text-[#1E293B]">
                                        <div
                                            onClick={() => handleScopeClick("Villages covered in Partial schemes", "iotVillagesTotal", physicalProgress.villages?.partial ?? 5579)}
                                            className="cursor-pointer hover:text-[#0B3558] hover:underline"
                                        >
                                            Villages covered in Partial schemes - {renderScopeCount(physicalProgress.villages?.partial)}
                                        </div>
                                        <div
                                            onClick={() => handleScopeClick("Villages covered in fully completed schemes", "iotVillagesFully", physicalProgress.villages?.fully ?? 391)}
                                            className="cursor-pointer hover:text-[#0B3558] hover:underline"
                                        >
                                            Villages covered in fully completed schemes - {renderScopeCount(physicalProgress.villages?.fully)}
                                        </div>
                                    </td>
                                    <td className="p-2 sm:p-2.5 bg-white w-1/4 text-xs sm:text-sm leading-snug text-[#1E293B]">
                                        <div
                                            onClick={() => handleScopeClick("ESRs covered in Partial schemes", "iotEsrTotal", physicalProgress.esr?.partial ?? 9628)}
                                            className="cursor-pointer hover:text-[#0B3558] hover:underline"
                                        >
                                            ESRs covered in Partial schemes - {renderScopeCount(physicalProgress.esr?.partial)}
                                        </div>
                                        <div
                                            onClick={() => handleScopeClick("ESRs covered in fully completed schemes", "iotEsrFully", physicalProgress.esr?.fully ?? 612)}
                                            className="cursor-pointer hover:text-[#0B3558] hover:underline"
                                        >
                                            ESRs covered in fully completed schemes - {renderScopeCount(physicalProgress.esr?.fully)}
                                        </div>
                                    </td>
                                </tr>

                                {/* Row 3: Operational */}
                                <tr>
                                    <td className="p-2 sm:p-2.5 font-bold border-r border-[#4A6484] bg-[#EBF3FB] text-[#0A2540] w-1/4 text-center sm:text-left align-middle">
                                        IoT Operational
                                    </td>
                                    <td
                                        onClick={() => handleScopeClick("Operational Connected Schemes", "operationalSchemes", operational.schemes || 39)}
                                        className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white border-r border-[#4A6484] w-1/4 cursor-pointer hover:text-[#0B3558] hover:underline"
                                        title="Click to view IoT operational schemes"
                                    >
                                        Scheme - {operational.schemes || 39}
                                    </td>
                                    <td
                                        onClick={() => handleScopeClick("Operational Connected Villages", "operationalVillages", operational.villages || 255)}
                                        className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white border-r border-[#4A6484] w-1/4 cursor-pointer hover:text-[#0B3558] hover:underline"
                                        title="Click to view IoT operational villages"
                                    >
                                        Villages - {operational.villages || 255}
                                    </td>
                                    <td
                                        onClick={() => handleScopeClick("Operational Connected ESRs", "operationalEsr", operational.esr || 325)}
                                        className="p-2 sm:p-2.5 font-semibold text-[#1E293B] bg-white w-1/4 cursor-pointer hover:text-[#0B3558] hover:underline"
                                        title="Click to view IoT operational ESRs"
                                    >
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
                                            onClick={() => { setSelectedAgency(agency); setSelectedCellDetails(null); }}
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
                                Alert Date :
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
                    </div>

                    {/* MAIN ALERT TRACKER TABLE */}
                    <div className="w-full overflow-x-auto border border-[#4A6484] rounded-sm text-xs sm:text-sm bg-white mb-4">
                        <table className="w-full border-collapse border border-[#4A6484] text-center min-w-[650px]">
                            {/* Header Row */}
                            <thead>
                                <tr className="border-b border-[#4A6484]">
                                    {/* Col 1: Display result */}
                                    <th className="p-2.5 sm:p-3 border-r border-[#4A6484] bg-[#EBF3FB] font-bold text-[#0A2540] w-1/5">
                                        Data for {headerDateInfo.dayWithOrdinal} {headerDateInfo.month.toLowerCase()}
                                    </th>

                                    {/* Col 2: Resolution in 24 hrs at operator level */}
                                    <th className="p-2.5 sm:p-3 border-r border-[#4A6484] bg-[#EBF3FB] font-bold text-[#0A2540] w-1/5">
                                        Resolution in 24 hrs at operator level
                                    </th>

                                    {/* Col 3: Unresolved and escalated to EE */}
                                    <th className="p-2.5 sm:p-3 border-r border-[#4A6484] bg-[#EBF3FB] font-bold text-[#0A2540] w-1/5">
                                        Unresolved and escalated to EE
                                    </th>

                                    {/* Col 4: Resolution after escalation at EE level */}
                                    <th className="p-2.5 sm:p-3 border-r border-[#4A6484] bg-[#EBF3FB] font-bold text-[#0A2540] w-1/5">
                                        Resolution after escalation at EE level
                                    </th>

                                    {/* Col 5: Pending resolution at EE level */}
                                    <th className="p-2.5 sm:p-3 bg-[#EBF3FB] font-bold text-[#0A2540] w-1/5">
                                        Pending resolution at EE level
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
                                            alertMatrix.lpcd?.items || [],
                                            "operator"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.lpcd?.resolved !== undefined ? alertMatrix.lpcd.resolved : 0,
                                            "Low LPCD In Villages (Resolution in 24 hrs at operator level)",
                                            "lpcd",
                                            alertMatrix.lpcd?.resolvedItems || [],
                                            "resolved"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.lpcd?.unresolvedEE,
                                            "Low LPCD In Villages (Unresolved and escalated to EE)",
                                            "lpcd",
                                            alertMatrix.lpcd?.escalatedEEItems && alertMatrix.lpcd.escalatedEEItems.length > 0
                                                ? alertMatrix.lpcd.escalatedEEItems
                                                : (alertMatrix.lpcd?.items || []).filter((x: any) => x.escalated_to_ee || x.recipient_designation === "Executive Engineer"),
                                            "escalation"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.lpcd?.subsequentResolved !== undefined ? alertMatrix.lpcd.subsequentResolved : 0,
                                            "Low LPCD In Villages (Resolution after escalation at EE level)",
                                            "lpcd",
                                            alertMatrix.lpcd?.subsequentResolvedItems || [],
                                            "resolved"
                                        )}
                                    </td>
                                    <td className="p-0">
                                        {renderCellCount(
                                            alertMatrix.lpcd?.unresolvedTillDate !== undefined ? alertMatrix.lpcd?.unresolvedTillDate : alertMatrix.lpcd?.unresolved,
                                            "Low LPCD In Villages (Pending resolution at EE level)",
                                            "lpcd",
                                            alertMatrix.lpcd?.unresolvedTillDateItems && alertMatrix.lpcd.unresolvedTillDateItems.length > 0
                                                ? alertMatrix.lpcd.unresolvedTillDateItems
                                                : (alertMatrix.lpcd?.unresolvedItems || []),
                                            "escalation"
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
                                            alertMatrix.pressure?.items || [],
                                            "operator"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.pressure?.resolved !== undefined ? alertMatrix.pressure.resolved : 0,
                                            "Low Pressure In ESR (Resolution in 24 hrs at operator level)",
                                            "pressure",
                                            alertMatrix.pressure?.resolvedItems || [],
                                            "resolved"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.pressure?.unresolvedEE,
                                            "Low Pressure In ESR (Unresolved and escalated to EE)",
                                            "pressure",
                                            alertMatrix.pressure?.escalatedEEItems && alertMatrix.pressure.escalatedEEItems.length > 0
                                                ? alertMatrix.pressure.escalatedEEItems
                                                : (alertMatrix.pressure?.items || []).filter((x: any) => x.escalated_to_ee || x.recipient_designation === "Executive Engineer"),
                                            "escalation"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.pressure?.subsequentResolved !== undefined ? alertMatrix.pressure.subsequentResolved : 0,
                                            "Low Pressure In ESR (Resolution after escalation at EE level)",
                                            "pressure",
                                            alertMatrix.pressure?.subsequentResolvedItems || [],
                                            "resolved"
                                        )}
                                    </td>
                                    <td className="p-0">
                                        {renderCellCount(
                                            alertMatrix.pressure?.unresolvedTillDate !== undefined ? alertMatrix.pressure?.unresolvedTillDate : alertMatrix.pressure?.unresolved,
                                            "Low Pressure In ESR (Pending resolution at EE level)",
                                            "pressure",
                                            alertMatrix.pressure?.unresolvedTillDateItems && alertMatrix.pressure.unresolvedTillDateItems.length > 0
                                                ? alertMatrix.pressure.unresolvedTillDateItems
                                                : (alertMatrix.pressure?.unresolvedItems || []),
                                            "escalation"
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
                                            alertMatrix.chlorine?.items || [],
                                            "operator"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.chlorine?.resolved !== undefined ? alertMatrix.chlorine.resolved : 0,
                                            "Residual Chlorine Out Of Range (Resolution in 24 hrs at operator level)",
                                            "chlorine",
                                            alertMatrix.chlorine?.resolvedItems || [],
                                            "resolved"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.chlorine?.unresolvedEE,
                                            "Residual Chlorine Out Of Range (Unresolved and escalated to EE)",
                                            "chlorine",
                                            alertMatrix.chlorine?.escalatedEEItems && alertMatrix.chlorine.escalatedEEItems.length > 0
                                                ? alertMatrix.chlorine.escalatedEEItems
                                                : (alertMatrix.chlorine?.items || []).filter((x: any) => x.escalated_to_ee || x.recipient_designation === "Executive Engineer"),
                                            "escalation"
                                        )}
                                    </td>
                                    <td className="border-r border-[#4A6484] p-0">
                                        {renderCellCount(
                                            alertMatrix.chlorine?.subsequentResolved !== undefined ? alertMatrix.chlorine.subsequentResolved : 0,
                                            "Residual Chlorine Out Of Range (Resolution after escalation at EE level)",
                                            "chlorine",
                                            alertMatrix.chlorine?.subsequentResolvedItems || [],
                                            "resolved"
                                        )}
                                    </td>
                                    <td className="p-0">
                                        {renderCellCount(
                                            alertMatrix.chlorine?.unresolvedTillDate !== undefined ? alertMatrix.chlorine?.unresolvedTillDate : alertMatrix.chlorine?.unresolved,
                                            "Residual Chlorine Out Of Range (Pending resolution at EE level)",
                                            "chlorine",
                                            alertMatrix.chlorine?.unresolvedTillDateItems && alertMatrix.chlorine.unresolvedTillDateItems.length > 0
                                                ? alertMatrix.chlorine.unresolvedTillDateItems
                                                : (alertMatrix.chlorine?.unresolvedItems || []),
                                            "escalation"
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
                        className="bg-white p-4 sm:p-6 rounded-md shadow-sm border border-[#4A6484] transition-all scroll-mt-4 mt-6"
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

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Status Filter (All / Connected / Not Connected) */}
                                <div className="flex items-center gap-1.5 border border-[#4A6484] rounded-md px-2.5 py-1 bg-white text-xs font-semibold shadow-2xs">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0B3558]" />
                                    <span className="text-[#64748B]">Status:</span>
                                    <Select
                                        value={modalConnectionFilter}
                                        onValueChange={(val: "all" | "connected" | "not_connected") => {
                                            setModalConnectionFilter(val);
                                            setModalPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-6 w-32 sm:w-36 border-none text-xs font-bold text-[#0A2540] p-0 focus:ring-0 shadow-none">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border border-[#4A6484] text-xs font-medium z-[9999]">
                                            <SelectItem value="all" className="cursor-pointer text-xs">
                                                All Status
                                            </SelectItem>
                                            <SelectItem value="connected" className="cursor-pointer text-xs">
                                                Connected
                                            </SelectItem>
                                            <SelectItem value="not_connected" className="cursor-pointer text-xs">
                                                Not Connected
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Region Filter */}
                                <div className="flex items-center gap-1.5 border border-[#4A6484] rounded-md px-2.5 py-1 bg-white text-xs font-semibold shadow-2xs">
                                    <MapPin className="h-3.5 w-3.5 text-[#0B3558]" />
                                    <span className="text-[#64748B]">Region:</span>
                                    <Select
                                        value={modalRegionFilter}
                                        onValueChange={(val) => {
                                            setModalRegionFilter(val);
                                            setModalPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-6 w-36 sm:w-48 border-none text-xs font-bold text-[#0A2540] p-0 focus:ring-0 shadow-none">
                                            <SelectValue placeholder="All Regions" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border border-[#4A6484] text-xs font-medium z-[9999]">
                                            {REGIONS.map((r) => (
                                                <SelectItem key={r} value={r} className="cursor-pointer text-xs">
                                                    {r === "All" ? "All Regions (Statewide)" : r}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="text-xs text-[#475569] font-medium">
                                    Page <span className="font-bold text-[#0A2540]">{modalPage}</span> of <span className="font-bold text-[#0A2540]">{totalModalPages}</span>
                                </div>
                            </div>
                        </div>

                        {/* Table Content - Date-Wise Details for Operator and EE Notifications */}
                        <div className="w-full overflow-x-auto border border-[#4A6484] rounded-md shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#EBF3FB] text-[#0A2540] font-bold border-b border-[#4A6484]">
                                    {selectedCellDetails?.category === "scope" ? (
                                        <tr>
                                            <th className="py-2.5 px-2 text-[11px] font-bold text-center border-r border-[#4A6484] w-14">
                                                Sr. No.
                                            </th>
                                            <th className="py-2.5 px-3 text-[11px] font-bold text-left border-r border-[#4A6484] min-w-[240px]">
                                                {selectedCellDetails?.scopeType === "scheme"
                                                    ? "Scheme & Location Details"
                                                    : selectedCellDetails?.scopeType === "village"
                                                        ? "Village & Scheme Details"
                                                        : "ESR & Scheme Details"}
                                            </th>
                                            <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[110px]">
                                                IoT Status
                                            </th>
                                            {selectedCellDetails?.scopeType === "scheme" && (
                                                <>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[110px]">
                                                        Total Villages
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[120px]">
                                                        Connected Villages
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[110px]">
                                                        Total ESRs
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[120px]">
                                                        Completed ESRs
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[110px]">
                                                        Total Population
                                                    </th>
                                                </>
                                            )}
                                            {selectedCellDetails?.scopeType === "village" && (
                                                <>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[110px]">
                                                        Total ESRs
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[120px]">
                                                        Completed ESRs
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[110px]">
                                                        Population
                                                    </th>
                                                </>
                                            )}
                                            {selectedCellDetails?.scopeType === "esr" && (
                                                <>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[120px]">
                                                        Flow Meters
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[120px]">
                                                        Pressure Sensors
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[120px]">
                                                        Chlorine Analyzers
                                                    </th>
                                                </>
                                            )}
                                            <th className="py-2.5 px-3 text-[11px] font-bold text-left min-w-[220px]">
                                                Operator & Executive Engineer
                                            </th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th className="py-2.5 px-2 text-[11px] font-bold text-center border-r border-[#4A6484] w-14">
                                                Sr. No.
                                            </th>
                                            <th className="py-2.5 px-3 text-[11px] font-bold text-left border-r border-[#4A6484] min-w-[240px]">
                                                Scheme & Location Details
                                            </th>
                                            {selectedCellDetails?.colType === "resolved" ? (
                                                <>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[140px]">
                                                        Alert Value
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[180px]">
                                                        {selectedCellDetails?.title?.includes("Resolution after escalation") || selectedCellDetails?.metric?.includes("Resolution after escalation")
                                                            ? "Resolution after escalation at EE level"
                                                            : "Resolution in 24 hrs at operator level"}
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-left border-r border-[#4A6484] min-w-[180px]">
                                                        Assigned Operator & Contact
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-left min-w-[180px]">
                                                        Executive Engineer & Contact
                                                    </th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[140px]">
                                                        Date of Value ({data?.dateMeta?.evalDisplayDate || filterDateInput})
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-left border-r border-[#4A6484] min-w-[180px]">
                                                        {selectedCellDetails?.colType === "escalation"
                                                            ? "Executive Engineer & Contact"
                                                            : "Assigned Operator  & Contact Details"}
                                                    </th>
                                                    {selectedCellDetails?.colType === "escalation" && (
                                                        <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[150px]">
                                                            Email Sent
                                                        </th>
                                                    )}
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center border-r border-[#4A6484] min-w-[150px]">
                                                        SMS Sent
                                                    </th>
                                                    <th className="py-2.5 px-3 text-[11px] font-bold text-center min-w-[140px]">
                                                        Field Remarks
                                                    </th>
                                                </>
                                            )}
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-[#CBD5E1]">
                                    {paginatedModalItems.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    selectedCellDetails?.category === "scope"
                                                        ? (selectedCellDetails?.scopeType === "village" ? 7 : selectedCellDetails?.scopeType === "scheme" ? 9 : 8)
                                                        : (selectedCellDetails?.colType === "resolved" ? 6 : selectedCellDetails?.colType === "escalation" ? 7 : 6)
                                                }
                                                className="p-8 text-center text-[#64748B] font-medium bg-white"
                                            >
                                                No itemized records found for this filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedModalItems.map((item: any, idx: number) => {
                                            const rowNum = (modalPage - 1) * modalPageSize + idx + 1;
                                            const isScope = selectedCellDetails?.category === "scope";
                                            const scopeType = selectedCellDetails?.scopeType || (selectedCellDetails?.metric?.toLowerCase().includes("scheme") ? "scheme" : selectedCellDetails?.metric?.toLowerCase().includes("village") ? "village" : "esr");

                                            if (isScope) {
                                                const rawOpName = item.operator_name && item.operator_name !== "-" ? item.operator_name.trim() : null;
                                                const isGenericName = !rawOpName || rawOpName.toLowerCase() === "village operator";
                                                const opNumber = item.operator_number && item.operator_number !== "-" ? item.operator_number.trim() : null;
                                                const opName = !isGenericName ? rawOpName : (opNumber ? "Assigned Operator" : null);

                                                return (
                                                    <tr
                                                        key={item.id || `${item.scheme_id}-${item.village_name || ""}-${item.esr_name || ""}-${idx}`}
                                                        className="hover:bg-[#EBF3FB]/50 transition-colors bg-white even:bg-[#F8FAFC]"
                                                    >
                                                        {/* 1. Sr. No. */}
                                                        <td className="py-2.5 px-2 text-center border-r border-[#CBD5E1] align-middle">
                                                            <span className="text-xs font-semibold text-[#0A2540]">{rowNum}</span>
                                                        </td>

                                                        {/* 2. Entity Details */}
                                                        <td className="py-2.5 px-3 border-r border-[#CBD5E1] align-middle">
                                                            {scopeType === "scheme" && (
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                            {item.scheme_name || `Scheme #${item.scheme_id}`}
                                                                        </span>
                                                                        <span className="text-[11px] text-[#64748B] font-mono">
                                                                            (#{item.scheme_id})
                                                                        </span>
                                                                        {(item.agency_type || item.operated_by) && (
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-[#0B3558] border border-[#CBD5E1]">
                                                                                {item.agency_type || item.operated_by}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] text-[#64748B] font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                                        <MapPin className="h-3 w-3 text-[#4A6484] shrink-0 inline" />
                                                                        {item.region && <span>Region: <strong className="text-[#0A2540] font-semibold">{item.region}</strong></span>}
                                                                        {item.division && (
                                                                            <>
                                                                                <span className="text-[#94A3B8]">•</span>
                                                                                <span>Div: <strong className="text-[#0A2540] font-semibold">{item.division}</strong></span>
                                                                            </>
                                                                        )}
                                                                        {item.block && (
                                                                            <>
                                                                                <span className="text-[#94A3B8]">•</span>
                                                                                <span>Block: <strong className="text-[#0A2540] font-semibold">{item.block}</strong></span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {scopeType === "village" && (
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                            {item.village_name}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[11px] text-[#64748B] font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                                        <MapPin className="h-3 w-3 text-[#4A6484] shrink-0 inline" />
                                                                        <span>Scheme: <strong className="text-[#0A2540] font-semibold">{item.scheme_name || item.scheme_id}</strong> <span className="font-mono text-[10px] text-[#64748B]">({item.scheme_id})</span></span>
                                                                        {item.region && (
                                                                            <>
                                                                                <span className="text-[#94A3B8]">•</span>
                                                                                <span>{item.region}</span>
                                                                            </>
                                                                        )}
                                                                        {item.block && (
                                                                            <>
                                                                                <span className="text-[#94A3B8]">•</span>
                                                                                <span>{item.block}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {scopeType === "esr" && (
                                                                <div>
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                            {item.esr_name || item.reservoir_name || "ESR"}
                                                                        </span>
                                                                        {item.village_name && (
                                                                            <span className="text-[11px] text-[#0B3558] font-medium">
                                                                                ({item.village_name})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] text-[#64748B] font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                                        <MapPin className="h-3 w-3 text-[#4A6484] shrink-0 inline" />
                                                                        <span>Scheme: <strong className="text-[#0A2540] font-semibold">{item.scheme_name || item.scheme_id}</strong> <span className="font-mono text-[10px] text-[#64748B]">({item.scheme_id})</span></span>
                                                                        {item.region && (
                                                                            <>
                                                                                <span className="text-[#94A3B8]">•</span>
                                                                                <span>{item.region}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Connected Status Column */}
                                                        <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                            {(() => {
                                                                const status = String(item.fully_completion_scheme_status || item.status || "").trim();
                                                                const isNotConn = status === "Not-Connected" || status.toLowerCase() === "not connected";
                                                                const isConnected = !isNotConn && (
                                                                    item.is_connected === "Connected" ||
                                                                    String(item.is_connected).toLowerCase() === "yes" ||
                                                                    Number(item.connected_villages || 0) > 0 ||
                                                                    Number(item.connected_esrs || 0) > 0
                                                                );
                                                                return isConnected ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Connected
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                        Not Connected
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>

                                                        {/* Scheme Columns: Total Villages, Connected Villages, Total ESRs, Completed ESRs, Total Population */}
                                                        {scopeType === "scheme" && (
                                                            <>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-[#0A2540]">
                                                                        {Number(item.total_villages || 0).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#64748B]">Total Villages</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-emerald-700">
                                                                        {Number(item.connected_villages || 0).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#64748B]">Connected</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-[#0A2540]">
                                                                        {Number(item.total_esrs || 0).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#64748B]">Total ESRs</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-blue-700">
                                                                        {Number(item.completed_esrs || 0).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#64748B]">Completed</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-[#0A2540]">
                                                                        {Number(item.population || 0).toLocaleString()}
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}

                                                        {/* Village Columns: Total ESRs, Completed ESRs, Population (NO Beneficiaries word) */}
                                                        {scopeType === "village" && (
                                                            <>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-[#0A2540]">
                                                                        {Number(item.total_esrs || 0).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#64748B]">Total ESRs</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-blue-700">
                                                                        {Number(item.completed_esrs || 0).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#64748B]">Completed ESRs</div>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    <div className="font-bold text-xs text-[#0A2540]">
                                                                        {Number(item.population || 0).toLocaleString()}
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}

                                                        {/* ESR Columns: Flow Meters, Pressure Sensors, Chlorine Analyzers */}
                                                        {scopeType === "esr" && (
                                                            <>
                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    {(() => {
                                                                        const isConnected = String(item.flow_meter_connected || "").toLowerCase().includes("connect") || String(item.flow_meter_connected || "").toLowerCase() === "yes" || String(item.flow_meter_connected || "") === "1";
                                                                        return isConnected ? (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Connected (1)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                                0 Connected
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>

                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    {(() => {
                                                                        const isConnected = String(item.pressure_connected || "").toLowerCase().includes("connect") || String(item.pressure_connected || "").toLowerCase() === "yes" || String(item.pressure_connected || "") === "1";
                                                                        return isConnected ? (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Connected (1)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                                0 Connected
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>

                                                                <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                                    {(() => {
                                                                        const isConnected = String(item.chlorine_connected || "").toLowerCase().includes("connect") || String(item.chlorine_connected || "").toLowerCase() === "yes" || String(item.chlorine_connected || "") === "1";
                                                                        return isConnected ? (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Connected (1)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                                0 Connected
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>
                                                            </>
                                                        )}

                                                        {/* Operator & Executive Engineer Details */}
                                                        <td className="py-2.5 px-3 align-middle">
                                                            <div className="space-y-1.5">
                                                                <div>
                                                                    {opName ? (
                                                                        <div className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                            <span className="text-[#64748B] font-semibold">[Operator]</span> {opName}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-slate-400 font-normal italic leading-tight">
                                                                            Operator: Not Assigned
                                                                        </div>
                                                                    )}
                                                                    {opNumber && (
                                                                        <div className="mt-0.5 flex items-center gap-1">
                                                                            <a
                                                                                href={`tel:${opNumber}`}
                                                                                className="text-xs text-[#0B3558] font-medium hover:underline flex items-center gap-1"
                                                                            >
                                                                                <Phone className="h-3 w-3" />
                                                                                <span>{opNumber}</span>
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    navigator.clipboard.writeText(opNumber);
                                                                                    setCopiedMobile(opNumber);
                                                                                    setTimeout(() => setCopiedMobile(null), 2000);
                                                                                }}
                                                                                className="p-0.5 text-[#64748B] hover:text-[#0A2540] rounded cursor-pointer"
                                                                                title="Copy mobile number"
                                                                            >
                                                                                {copiedMobile === opNumber ? (
                                                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                                                ) : (
                                                                                    <Copy className="h-3 w-3" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {item.ee_name && item.ee_name !== "-" && item.ee_name.toLowerCase() !== "executive engineer" && (
                                                                    <div className="border-t border-slate-100 pt-1">
                                                                        <div className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                            <span className="text-[#64748B] font-semibold">[EE]</span> {item.ee_name}
                                                                        </div>
                                                                        {item.ee_number && item.ee_number !== "-" && (
                                                                            <div className="mt-0.5 flex items-center gap-1">
                                                                                <a
                                                                                    href={`tel:${item.ee_number}`}
                                                                                    className="text-xs text-[#0B3558] font-medium hover:underline flex items-center gap-1"
                                                                                >
                                                                                    <Phone className="h-3 w-3" />
                                                                                    <span>{item.ee_number}</span>
                                                                                </a>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        navigator.clipboard.writeText(item.ee_number);
                                                                                        setCopiedMobile(item.ee_number);
                                                                                        setTimeout(() => setCopiedMobile(null), 2000);
                                                                                    }}
                                                                                    className="p-0.5 text-[#64748B] hover:text-[#0A2540] rounded cursor-pointer"
                                                                                    title="Copy mobile number"
                                                                                >
                                                                                    {copiedMobile === item.ee_number ? (
                                                                                        <Check className="h-3 w-3 text-emerald-600" />
                                                                                    ) : (
                                                                                        <Copy className="h-3 w-3" />
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {item.ee_email && item.ee_email !== "-" && (
                                                                            <div className="text-[10px] text-[#475569] font-mono truncate max-w-[200px]" title={item.ee_email}>
                                                                                {item.ee_email}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            const isEscalationModal = selectedCellDetails?.colType === "escalation";
                                            const isResolvedModal = selectedCellDetails?.colType === "resolved";
                                            const isEE = isEscalationModal;
                                            const alertTypeLower = (item.alert_type || selectedCellDetails?.category || "").toLowerCase();
                                            const isLpcd = alertTypeLower.includes("lpcd");
                                            const isPres = alertTypeLower.includes("pres");
                                            const isChl = alertTypeLower.includes("chlor") || alertTypeLower.includes("chl");

                                            const alertBadgeText = isLpcd ? "Low LPCD" : isPres ? "Low Pressure" : isChl ? "Residual Chlorine" : (item.alert_type || "Active Alert");
                                            const alertValue = item.reading_value || item.telemetry_value || item.alert_value || (item.val_today !== undefined ? String(item.val_today) : "-");

                                            const formattedTime = item.sent_time
                                                ? (() => {
                                                    const parts = String(item.sent_time).split(':');
                                                    if (parts.length >= 2) {
                                                        let h = parseInt(parts[0], 10);
                                                        const m = parts[1];
                                                        const ampm = h >= 12 ? 'pm' : 'am';
                                                        h = h % 12 || 12;
                                                        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                                                    }
                                                    return item.sent_time;
                                                })()
                                                : (item.sent_at
                                                    ? new Date(item.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                                                    : "11:00 am");

                                            const actualEeName = item.ee_name && item.ee_name !== "-" && item.ee_name.toLowerCase() !== "executive engineer"
                                                ? item.ee_name
                                                : null;
                                            const actualOperatorName = item.operator_name && item.operator_name !== "-" && item.operator_name.toLowerCase() !== "village operator"
                                                ? item.operator_name
                                                : (item.recipient_name && item.recipient_name !== "-" && item.recipient_name.toLowerCase() !== "village operator" && item.recipient_name.toLowerCase() !== "executive engineer"
                                                    ? item.recipient_name
                                                    : null);

                                            const contactName = isEscalationModal ? actualEeName : actualOperatorName;
                                            const contactMobile = isEscalationModal
                                                ? (item.ee_number && item.ee_number !== "-" ? item.ee_number : null)
                                                : (item.operator_number && item.operator_number !== "-" ? item.operator_number : (item.recipient_contact && item.recipient_contact !== "-" ? item.recipient_contact : null));
                                            const shortRole = isEscalationModal ? "EE" : "Operator";

                                            const rawDeliveryStatus = String(item.sms_delivery_status || item.delivery_status || "").toUpperCase();
                                            const isDispatched = rawDeliveryStatus && rawDeliveryStatus !== "NOT_DISPATCHED" && rawDeliveryStatus !== "NONE" && rawDeliveryStatus !== "-";
                                            const isSmsDelivered = isDispatched && (rawDeliveryStatus === "DELIVERY_SUCCESS" || rawDeliveryStatus === "SUCCESS");
                                            const isSmsFailed = isDispatched && (rawDeliveryStatus.includes("FAIL") || rawDeliveryStatus.includes("SUBMIT_FAILED") || rawDeliveryStatus.includes("FAILED"));
                                            const emailSentDateStr = (isEE && (item.ee_dispatch_date || data?.dateMeta?.eeEscalationDateStr))
                                                ? (item.ee_dispatch_date || data?.dateMeta?.eeEscalationDateStr)
                                                : (() => {
                                                    const raw = item.sent_date || item.sent_at || filterDateInput;
                                                    const ddmmyyyy = String(raw).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
                                                    let d = 27, m = 9;
                                                    if (ddmmyyyy) {
                                                        d = parseInt(ddmmyyyy[1], 10);
                                                        m = parseInt(ddmmyyyy[2], 10) - 1;
                                                    } else {
                                                        const yyyymmdd = String(raw).match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
                                                        if (yyyymmdd) {
                                                            d = parseInt(yyyymmdd[3], 10);
                                                            m = parseInt(yyyymmdd[2], 10) - 1;
                                                        } else {
                                                            const dt = new Date(raw);
                                                            if (!isNaN(dt.getTime())) {
                                                                d = dt.getDate();
                                                                m = dt.getMonth();
                                                            }
                                                        }
                                                    }
                                                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                    const s = ["th", "st", "nd", "rd"];
                                                    const v = d % 100;
                                                    const ordinal = d + (s[(v - 20) % 10] || s[v] || s[0]);
                                                    return `${ordinal} ${months[m] || 'Oct'}`;
                                                })();

                                            const smsSentDateStr = emailSentDateStr;
                                            const isEmailSent = Boolean(item.email_sent && actualEeName);

                                            return (
                                                <tr
                                                    key={item.id || `${item.scheme_id}-${idx}`}
                                                    className="hover:bg-[#EBF3FB]/50 transition-colors bg-white even:bg-[#F8FAFC]"
                                                >
                                                    {/* 1. Sr. No. */}
                                                    <td className="py-2.5 px-2 text-center border-r border-[#CBD5E1] align-middle">
                                                        <span className="text-xs font-semibold text-[#0A2540]">{rowNum}</span>
                                                    </td>

                                                    {/* 2. Scheme & Location Details */}
                                                    <td className="py-2.5 px-3 border-r border-[#CBD5E1] align-middle">
                                                        <div>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                    {item.scheme_name || item.scheme_id}
                                                                </span>
                                                                <span className="text-[11px] text-[#64748B] font-mono">
                                                                    (#{item.scheme_id})
                                                                </span>
                                                                {(item.agency_type || item.operated_by) && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-[#0B3558] border border-[#CBD5E1]">
                                                                        {item.agency_type || item.operated_by}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-[#64748B] font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                                <MapPin className="h-3 w-3 text-[#4A6484] shrink-0 inline" />
                                                                {item.village_name && item.village_name !== "-" && (
                                                                    <span>
                                                                        Village: <strong className="text-[#0A2540] font-semibold">{item.village_name}</strong>
                                                                    </span>
                                                                )}
                                                                {item.village_name && item.village_name !== "-" && (item.reservoir_name || item.esr_name) && (item.reservoir_name !== "-" && item.esr_name !== "-") && (
                                                                    <span className="text-[#94A3B8]">•</span>
                                                                )}
                                                                {(item.reservoir_name || item.esr_name) && (item.reservoir_name !== "-" && item.esr_name !== "-") && (
                                                                    <span>
                                                                        ESR: <strong className="text-[#0A2540] font-semibold">{item.reservoir_name || item.esr_name}</strong>
                                                                    </span>
                                                                )}
                                                                {item.region && (
                                                                    <>
                                                                        <span className="text-[#94A3B8]">|</span>
                                                                        <span>{item.region}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 3. Alert Value & Time */}
                                                    <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                        <div className="space-y-1 inline-flex flex-col items-center">
                                                            <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${isLpcd
                                                                ? "bg-rose-50 text-rose-800 border-rose-300"
                                                                : isPres
                                                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                                                    : isChl
                                                                        ? "bg-red-50 text-red-800 border-red-300"
                                                                        : "bg-[#EBF3FB] text-[#0B3558] border-[#4A6484]/40"
                                                                }`}>
                                                                {isLpcd ? (
                                                                    <Droplets className="w-3 h-3 mr-1 inline text-rose-600" />
                                                                ) : isPres ? (
                                                                    <Gauge className="w-3 h-3 mr-1 inline text-amber-600" />
                                                                ) : isChl ? (
                                                                    <FlaskConical className="w-3 h-3 mr-1 inline text-red-600" />
                                                                ) : (
                                                                    <Activity className="w-3 h-3 mr-1 inline text-[#0B3558]" />
                                                                )}
                                                                {alertBadgeText}
                                                            </Badge>

                                                            <div className="font-mono font-bold text-xs text-rose-600">
                                                                {alertValue}
                                                            </div>

                                                            <div className="text-[10px] text-[#64748B] font-normal flex items-center justify-center gap-1">
                                                                <Calendar className="h-3 w-3 text-[#4A6484] shrink-0" />
                                                                <span>{data?.dateMeta?.evalDisplayDate || filterDateInput}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 3B. Resolved Value (Only shown when colType === "resolved") */}
                                                    {isResolvedModal && (
                                                        <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap bg-emerald-50/25">
                                                            <div className="space-y-1 inline-flex flex-col items-center">
                                                                <Badge className="text-[10px] font-bold px-2 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-300">
                                                                    <CheckCircle2 className="w-3 h-3 mr-1 inline text-emerald-600" />
                                                                    Resolved
                                                                </Badge>

                                                                <div className="font-mono font-bold text-xs text-emerald-700">
                                                                    {(() => {
                                                                        const isSubsequent = selectedCellDetails?.metric === "subsequentResolved" || selectedCellDetails?.title?.includes("Resolution after escalation") || selectedCellDetails?.title?.endsWith("(Resolved)");
                                                                        const val = isSubsequent
                                                                            ? ((item.val_latest !== null && item.val_latest !== undefined) ? item.val_latest : item.val_next)
                                                                            : ((item.val_next !== null && item.val_next !== undefined) ? item.val_next : item.val_latest);
                                                                        if (val !== null && val !== undefined) {
                                                                            if (isLpcd) return `${Number(val).toFixed(1)} LPCD`;
                                                                            if (isPres) return `${Number(val).toFixed(2)} Bar`;
                                                                            if (isChl) return `${Number(val).toFixed(2)} mg/L`;
                                                                            return String(val);
                                                                        }
                                                                        return "No Data";
                                                                    })()}
                                                                </div>

                                                                <div className="text-[10px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                                                                    <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                    <span>
                                                                        {(() => {
                                                                            const isSubsequent = selectedCellDetails?.metric === "subsequentResolved" || selectedCellDetails?.title?.includes("Resolution after escalation") || selectedCellDetails?.title?.endsWith("(Resolved)");
                                                                            if (isSubsequent) {
                                                                                return data?.dateMeta?.col4DisplayDate || data?.dateMeta?.nextDayDisplayDate || "Resolved";
                                                                            }
                                                                            return data?.dateMeta?.nextDayDisplayDate || "Resolution Day";
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}

                                                    {/* 4. Contact Columns */}
                                                    {isResolvedModal ? (
                                                        <>
                                                            {/* 4A. Operator Column */}
                                                            <td className="py-2.5 px-3 align-middle border-r border-[#CBD5E1]">
                                                                <div>
                                                                    {actualOperatorName ? (
                                                                        <div className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                            <span className="text-[#64748B] font-semibold">[Operator]</span> {actualOperatorName}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-slate-400 font-normal italic leading-tight">
                                                                            -
                                                                        </div>
                                                                    )}
                                                                    {item.operator_number && item.operator_number !== "-" && (
                                                                        <div className="mt-0.5 flex items-center gap-1">
                                                                            <a
                                                                                href={`tel:${item.operator_number}`}
                                                                                className="text-xs text-[#0B3558] font-medium hover:underline flex items-center gap-1"
                                                                            >
                                                                                <Phone className="h-3 w-3" />
                                                                                <span>{item.operator_number}</span>
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (item.operator_number) {
                                                                                        navigator.clipboard.writeText(item.operator_number);
                                                                                        setCopiedMobile(item.operator_number);
                                                                                        setTimeout(() => setCopiedMobile(null), 2000);
                                                                                    }
                                                                                }}
                                                                                className="p-0.5 text-[#64748B] hover:text-[#0A2540] rounded cursor-pointer"
                                                                                title="Copy mobile number"
                                                                            >
                                                                                {copiedMobile === item.operator_number ? (
                                                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                                                ) : (
                                                                                    <Copy className="h-3 w-3" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* 4B. Executive Engineer Column (Added in both resolution columns) */}
                                                            <td className="py-2.5 px-3 align-middle">
                                                                <div>
                                                                    {actualEeName ? (
                                                                        <div className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                            <span className="text-[#64748B] font-semibold">[EE]</span> {actualEeName}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-slate-400 font-normal italic leading-tight">
                                                                            -
                                                                        </div>
                                                                    )}
                                                                    {item.ee_number && item.ee_number !== "-" && (
                                                                        <div className="mt-0.5 flex items-center gap-1">
                                                                            <a
                                                                                href={`tel:${item.ee_number}`}
                                                                                className="text-xs text-[#0B3558] font-medium hover:underline flex items-center gap-1"
                                                                            >
                                                                                <Phone className="h-3 w-3" />
                                                                                <span>{item.ee_number}</span>
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (item.ee_number) {
                                                                                        navigator.clipboard.writeText(item.ee_number);
                                                                                        setCopiedMobile(item.ee_number);
                                                                                        setTimeout(() => setCopiedMobile(null), 2000);
                                                                                    }
                                                                                }}
                                                                                className="p-0.5 text-[#64748B] hover:text-[#0A2540] rounded cursor-pointer"
                                                                                title="Copy mobile number"
                                                                            >
                                                                                {copiedMobile === item.ee_number ? (
                                                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                                                ) : (
                                                                                    <Copy className="h-3 w-3" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    {item.ee_email && item.ee_email !== "-" && (
                                                                        <div className="text-[10px] text-[#475569] font-mono truncate max-w-[200px]" title={item.ee_email}>
                                                                            {item.ee_email}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <td className="py-2.5 px-3 align-middle border-r border-[#CBD5E1]">
                                                            <div>
                                                                {contactName ? (
                                                                    <div className="font-bold text-xs text-[#0A2540] leading-tight">
                                                                        <span className="text-[#64748B] font-semibold">[{shortRole}]</span> {contactName}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-slate-400 font-normal italic leading-tight">
                                                                        -
                                                                    </div>
                                                                )}
                                                                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                                                    {contactMobile && contactMobile !== "-" ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <a
                                                                                href={`tel:${contactMobile}`}
                                                                                className="text-xs text-[#0B3558] font-medium hover:underline flex items-center gap-1"
                                                                            >
                                                                                <Phone className="h-3 w-3" />
                                                                                <span>{contactMobile}</span>
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (contactMobile) {
                                                                                        navigator.clipboard.writeText(contactMobile);
                                                                                        setCopiedMobile(contactMobile);
                                                                                        setTimeout(() => setCopiedMobile(null), 2000);
                                                                                    }
                                                                                }}
                                                                                className="p-0.5 text-[#64748B] hover:text-[#0A2540] rounded cursor-pointer"
                                                                                title="Copy mobile number"
                                                                            >
                                                                                {copiedMobile === contactMobile ? (
                                                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                                                ) : (
                                                                                    <Copy className="h-3 w-3" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        contactName ? <span className="text-[10px] text-slate-400 italic">No mobile</span> : null
                                                                    )}
                                                                    {isEE && contactName && (item.ee_email || item.recipient_email) && (
                                                                        <span className="text-[10px] text-[#475569] font-mono">
                                                                            {item.ee_email || item.recipient_email}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}

                                                    {/* 5. Email Sent (Only shown for Escalation / EE when not in resolved view) */}
                                                    {!isResolvedModal && isEscalationModal && (
                                                        <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                            {!actualEeName ? (
                                                                <span className="text-slate-400 font-bold select-none">-</span>
                                                            ) : isEmailSent ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedEmailItem({
                                                                            item: {
                                                                                ...item,
                                                                                category: selectedCellDetails?.category || "lpcd",
                                                                                alert_title: alertBadgeText,
                                                                                parameter_value: alertValue,
                                                                                officer_name: contactName,
                                                                                officer_role: "Executive Engineer",
                                                                                officer_email: item.ee_email || item.recipient_email || "ee.mjp@mahagov.in",
                                                                                officer_mobile: contactMobile,
                                                                            },
                                                                            emailDate: emailSentDateStr,
                                                                            emailTime: "",
                                                                            targetTier: "Tier 1 - Executive Engineer",
                                                                        });
                                                                    }}
                                                                    className="flex flex-col items-center gap-0.5 mx-auto group cursor-pointer"
                                                                    title="Click to view Email dispatch details"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-blue-100 transition-colors shadow-2xs">
                                                                            <Mail className="w-2.5 h-2.5 text-blue-600" />
                                                                            Sent
                                                                        </span>
                                                                        <span className="text-[11px] text-[#0A2540] font-semibold">
                                                                            {emailSentDateStr}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] font-medium text-slate-500 group-hover:text-blue-700">
                                                                        EE Office &rarr;
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">Not Sent</span>
                                                            )}
                                                        </td>
                                                    )}

                                                    {/* 6. SMS Sent (Hidden in resolved view) */}
                                                    {!isResolvedModal && (
                                                        <td className="py-2.5 px-3 text-center border-r border-[#CBD5E1] align-middle whitespace-nowrap">
                                                            {isEscalationModal && !actualEeName ? (
                                                                <span className="text-slate-400 font-bold select-none">-</span>
                                                            ) : (() => {
                                                                const openSmsModal = () => {
                                                                    const defaultSms = {
                                                                        recipient_name: contactName || "-",
                                                                        recipient_role: isEE ? "Executive Engineer" : "Village Operator",
                                                                        recipient_mobile: contactMobile,
                                                                        message_content: (() => {
                                                                            const schemeName = item.scheme_name || `Scheme #${item.scheme_id}`;
                                                                            const villageName = item.village_name || "-";
                                                                            const esrName = item.reservoir_name || item.esr_name;
                                                                            const vAndE = villageName && esrName && esrName !== "-" ? `${villageName} (${esrName})` : villageName;
                                                                            const numOnly = parseFloat(String(alertValue).replace(/[^0-9.]/g, '')) || 0;
                                                                            const bLower = (alertBadgeText || item.alert_type || selectedCellDetails?.category || "").toLowerCase();
                                                                            const isPressure = bLower.includes("pressure") || bLower.includes("दाब") || isPres;
                                                                            const isChlorine = bLower.includes("chlorine") || bLower.includes("क्लोरिन") || isChl;

                                                                            if (isEE) {
                                                                                if (item.ee_message_text) return item.ee_message_text;
                                                                                if (isPressure) {
                                                                                    return `सूचना: JJM MVS ${schemeName} अंतर्गत ${vAndE} येथील वितरण व्यवस्थेतील पाण्याचा दाब 0.2 bar पेक्षा कमी असून सध्याचा दाब ${numOnly.toFixed(2)} bar इतका आहे. तसेच, तांत्रिक बाबी प्रलंबित आहेत. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`;
                                                                                }
                                                                                if (isChlorine) {
                                                                                    return `सूचना: JJM MVS ${schemeName} अंतर्गत ${vAndE} येथील वितरण व्यवस्थेत Residual Chlorine ची मात्रा विहित मर्यादेबाहेर असून सध्याची मात्रा ${numOnly.toFixed(2)} mg/l इतकी आहे. तसेच, तांत्रिक बाबी प्रलंबित आहेत. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`;
                                                                                }
                                                                                return `सूचना: JJM MVS ${schemeName} अंतर्गत मागील 1 दिवसांपासून 55 LPCD पेक्षा कमी पाणीपुरवठा असलेली 1 गावे आहेत. तसेच, तांत्रिक बाबी प्रलंबित आहेत. कृपया तपासणी करून त्वरित आवश्यक कार्यवाही करावी. – मजीप्रा`;
                                                                            }

                                                                            // Operator SMS Content
                                                                            if (item.operator_message_text) return item.operator_message_text;
                                                                            if (isPressure) {
                                                                                return `सूचना: JJM MVS ${schemeName} अंतर्गत ${vAndE} येथील वितरण व्यवस्थेतील Pressure Sensor नुसार पाण्याचा दाब 0.2 bar पेक्षा कमी असून सध्याचा दाब ${numOnly.toFixed(2)} bar इतका आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`;
                                                                            }
                                                                            if (isChlorine) {
                                                                                if (numOnly > 0.50) {
                                                                                    return `सूचना: JJM MVS ${schemeName} अंतर्गत ${vAndE} येथील वितरण व्यवस्थेत Residual Chlorine ची मात्रा 0.5 mg/l पेक्षा जास्त असून सध्याची मात्रा ${numOnly.toFixed(2)} mg/l इतकी आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`;
                                                                                }
                                                                                return `सूचना: JJM MVS ${schemeName} अंतर्गत ${vAndE} येथील वितरण व्यवस्थेत Residual Chlorine ची मात्रा 0.2 mg/l पेक्षा कमी असून सध्याची मात्रा ${numOnly.toFixed(2)} mg/l इतकी आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`;
                                                                            }
                                                                            return `सूचना: JJM MVS ${schemeName} अंतर्गत ${villageName} येथील पाणीपुरवठ्याचा दर 55 LPCD पेक्षा कमी असून सध्याचा पाणीपुरवठ्याचा दर ${numOnly.toFixed(1)} LPCD आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`;
                                                                        })(),
                                                                        alert_title: alertBadgeText,
                                                                        delivery_status: rawDeliveryStatus,
                                                                        sent_time: "",
                                                                        sent_date: smsSentDateStr,
                                                                    };
                                                                    setSelectedSmsItem({
                                                                        item: {
                                                                            ...item,
                                                                            alert_title: alertBadgeText,
                                                                            parameter_value: alertValue,
                                                                            officer_name: contactName || "-",
                                                                            officer_role: isEE ? "Executive Engineer" : "Village Operator",
                                                                            officer_mobile: contactMobile,
                                                                            sms_date: smsSentDateStr,
                                                                        },
                                                                        smsList: [defaultSms],
                                                                    });
                                                                };

                                                                if (isSmsDelivered) {
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={openSmsModal}
                                                                            className="flex flex-col items-center gap-0.5 mx-auto group cursor-pointer"
                                                                            title="Click to view SMS dispatch logs"
                                                                        >
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200 group-hover:bg-emerald-100 transition-colors shadow-2xs">
                                                                                    <MessageSquare className="w-2.5 h-2.5 text-current" />
                                                                                    Delivered (1/1)
                                                                                </span>
                                                                                <span className="text-[11px] text-[#0A2540] font-semibold">
                                                                                    {smsSentDateStr}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-[10px] text-slate-500 group-hover:text-emerald-800">
                                                                                {isEE ? "EE SMS" : "Operator SMS"} &rarr;
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                }

                                                                if (isSmsFailed) {
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={openSmsModal}
                                                                            className="flex flex-col items-center gap-0.5 mx-auto group cursor-pointer"
                                                                            title="Click to view SMS failure details"
                                                                        >
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-rose-50 text-rose-800 border-rose-200 group-hover:bg-rose-100 transition-colors shadow-2xs">
                                                                                    <MessageSquare className="w-2.5 h-2.5 text-current" />
                                                                                    Failed (1)
                                                                                </span>
                                                                                <span className="text-[11px] text-[#0A2540] font-semibold">
                                                                                    {smsSentDateStr}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-[10px] text-rose-600 font-medium">
                                                                                Delivery Failed &rarr;
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                }

                                                                if (!contactMobile || contactMobile === "-") {
                                                                    return <span className="text-[11px] text-slate-400 italic">No Mobile</span>;
                                                                }

                                                                return <span className="text-[11px] text-slate-400 italic font-medium">-</span>;
                                                            })()}
                                                        </td>
                                                    )}

                                                    {/* 7. Remarks / Action (Hidden in resolved view) */}
                                                    {!isResolvedModal && (
                                                        <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                                                            {item.remarks_list && item.remarks_list.length > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedRemarkDetails({
                                                                            issues: item.remarks_list,
                                                                            title: `Field Incident Remarks for ${item.scheme_name || item.scheme_id}`,
                                                                            schemeId: item.scheme_id,
                                                                        });
                                                                        setRemarksModalStatus("all");
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#EBF3FB] hover:bg-sky-100 text-[#0B3558] font-bold text-xs border border-[#4A6484]/40 hover:border-[#0B3558] transition-all cursor-pointer shadow-2xs"
                                                                    title="Click to view field incident reports and engineer feedback"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 text-[#0B3558]" />
                                                                    <span>View ({item.remarks_list.length}) &rarr;</span>
                                                                </button>
                                                            ) : false ? (
                                                                <div className="text-[11px] text-amber-900 bg-amber-50/80 px-2 py-1 rounded border border-amber-200 leading-tight max-w-[150px] truncate mx-auto" title={item.unresolved_since}>
                                                                    <span className="font-semibold text-amber-800 text-[10px]">Unresolved: </span>
                                                                    {item.unresolved_since}
                                                                </div>
                                                            ) : item.remarks ? (
                                                                <div className="text-[11px] text-[#334155] bg-slate-50 p-1.5 rounded border border-slate-200 italic leading-tight max-w-[150px] truncate mx-auto" title={item.remarks}>
                                                                    <span className="font-semibold text-slate-600 not-italic text-[10px]">Note: </span>
                                                                    "{item.remarks}"
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">No Remarks</span>
                                                            )}
                                                        </td>
                                                    )}
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

                {/* ========================================================= */}
                {/* MODAL: FIELD REMARKS (Matching Escalation Portal)         */}
                {/* ========================================================= */}
                <Dialog open={Boolean(selectedRemarkDetails)} onOpenChange={(open) => !open && setSelectedRemarkDetails(null)}>
                    <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
                        <DialogHeader className="p-5 bg-slate-900 text-white shrink-0">
                            <div className="flex items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-sky-500/30 text-sky-200 border border-sky-400/40">
                                            Field Incident Remarks
                                        </span>
                                        {selectedRemarkDetails?.schemeId && (
                                            <Badge variant="outline" className="text-[10px] font-mono text-slate-300 border-slate-700">
                                                ID: #{selectedRemarkDetails.schemeId}
                                            </Badge>
                                        )}
                                    </div>
                                    <DialogTitle className="text-lg font-bold text-white tracking-tight">
                                        {selectedRemarkDetails?.title || "Field Engineer Remarks"}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-300 font-medium">
                                        Verified field incident reports and engineer feedback logged from the ground.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Status Filter Tabs */}
                        {selectedRemarkDetails && selectedRemarkDetails.issues.length > 0 && (
                            <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-600 mr-1">Filter Status:</span>
                                    <button
                                        type="button"
                                        onClick={() => setRemarksModalStatus("all")}
                                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${remarksModalStatus === "all" ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-300" : "text-slate-600 hover:text-slate-900"
                                            }`}
                                    >
                                        All ({selectedRemarkDetails.issues.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRemarksModalStatus("active")}
                                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${remarksModalStatus === "active" ? "bg-white text-red-700 shadow-2xs font-bold border border-red-300" : "text-slate-600 hover:text-red-700"
                                            }`}
                                    >
                                        Active ({selectedRemarkDetails.issues.filter((i: any) => i.status !== "Resolved").length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRemarksModalStatus("resolved")}
                                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${remarksModalStatus === "resolved" ? "bg-white text-emerald-700 shadow-2xs font-bold border border-emerald-300" : "text-slate-600 hover:text-emerald-700"
                                            }`}
                                    >
                                        Resolved ({selectedRemarkDetails.issues.filter((i: any) => i.status === "Resolved").length})
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-5 overflow-y-auto max-h-[60vh] bg-slate-50 space-y-3">
                            {(() => {
                                const issues = (selectedRemarkDetails?.issues || []).filter((i: any) => {
                                    if (remarksModalStatus === "active") return i.status !== "Resolved";
                                    if (remarksModalStatus === "resolved") return i.status === "Resolved";
                                    return true;
                                });

                                if (issues.length === 0) {
                                    return (
                                        <div className="p-8 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-lg text-xs font-medium">
                                            No remarks match the selected filter.
                                        </div>
                                    );
                                }

                                return issues.map((issue: any, index: number) => (
                                    <div
                                        key={index}
                                        className={`bg-white p-4 rounded-xl shadow-2xs border border-slate-200 ${issue.status === "Resolved"
                                            ? "border-l-4 border-l-emerald-500"
                                            : "border-l-4 border-l-red-500"
                                            }`}
                                    >
                                        {(issue.village_name || issue.esr_name) && (
                                            <div className="mb-2 pb-2 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {issue.village_name && issue.village_name !== "-" && (
                                                        <span className="text-slate-700">Village: <strong>{issue.village_name}</strong></span>
                                                    )}
                                                    {issue.esr_name && issue.esr_name !== "-" && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-slate-700">Sensor: <strong>{issue.esr_name}</strong></span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-2 gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10.5px] font-bold">
                                                        {issue.problem_level ? `${issue.problem_level} Level` : (issue.category || "General")}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${issue.status === "Resolved"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                        }`}>
                                                        {issue.status || "Active"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="text-xs font-bold text-slate-900">
                                                    {issue.creator_name || issue.reported_by || "Field Engineer"}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                    {issue.created_at ? new Date(issue.created_at).toLocaleString("en-IN", {
                                                        month: "short", day: "numeric", year: "numeric",
                                                        hour: "numeric", minute: "2-digit", hour12: true
                                                    }) : "N/A"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                                            <p className="text-slate-800 font-medium leading-relaxed">
                                                {issue.reason || issue.issue_description || "Issue noted during field inspection."}
                                            </p>
                                            {issue.remarks && (
                                                <p className="text-slate-600 mt-2 pt-2 border-t border-slate-200">
                                                    <span className="font-bold text-slate-800">Additional Remarks:</span> {issue.remarks}
                                                </p>
                                            )}
                                            {issue.status === "Resolved" && (
                                                <div className="text-emerald-800 mt-2 pt-2 border-t border-emerald-100 bg-emerald-50/50 -mx-3 -mb-3 p-3 rounded-b-lg">
                                                    <span className="font-bold text-emerald-950">Resolution Remark:</span> {issue.resolution_remark || "Resolved on ground"}
                                                    {issue.resolved_at && (
                                                        <span className="block text-[10px] text-emerald-700 font-semibold mt-1">
                                                            Resolved on: {new Date(issue.resolved_at).toLocaleString("en-IN", {
                                                                month: "short", day: "numeric", year: "numeric",
                                                                hour: "numeric", minute: "2-digit", hour12: true
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">
                                Total {selectedRemarkDetails?.issues?.length || 0} Incident Remarks Registered
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRemarkDetails(null)}
                                className="text-xs cursor-pointer"
                            >
                                Close Remarks
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ========================================================= */}
                {/* MODAL: EMAIL DISPATCH LOG & RECIPIENTS DETAILS           */}
                {/* ========================================================= */}
                {selectedEmailItem && (
                    <Dialog open={!!selectedEmailItem} onOpenChange={(open) => !open && setSelectedEmailItem(null)}>
                        <DialogContent className="max-w-3xl max-h-[88vh] bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col font-sans">
                            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-3 shrink-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                            ID: #{selectedEmailItem.item.scheme_id}
                                        </span>
                                        <span className="text-xs text-slate-300 font-medium">
                                            {selectedEmailItem.item.region || selectedRegion} Region
                                        </span>
                                    </div>
                                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white tracking-tight">
                                        <Mail className="h-5 w-5 text-blue-400" />
                                        Email Dispatch & Recipient Details
                                    </DialogTitle>
                                    <DialogDescription className="text-blue-100/90 text-xs font-medium">
                                        {selectedEmailItem.item.scheme_name}
                                    </DialogDescription>
                                </div>
                                <Badge className="bg-white/10 text-white border-white/20 self-start sm:self-auto text-xs px-3 py-1 font-semibold backdrop-blur-xs rounded-full">
                                    {selectedEmailItem.targetTier || "Tier 1 - Executive Engineer"}
                                </Badge>
                            </div>

                            <div className="p-5 overflow-y-auto space-y-4 text-xs">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 text-center">
                                    <div className="border-r border-slate-200/80 last:border-0 pr-2">
                                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold mb-0.5">
                                            <Users className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Total Recipients</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 block">
                                            {selectedEmailItem.emailDate ? "1 Dispatched" : "0 Dispatched"}
                                        </span>
                                    </div>
                                    <div className="border-r border-slate-200/80 last:border-0 pr-2">
                                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold mb-0.5">
                                            <Send className="w-3.5 h-3.5 text-blue-500" />
                                            <span>Channel</span>
                                        </div>
                                        <span className="text-sm font-bold text-blue-700 block">Official SMTP</span>
                                    </div>
                                    <div className="border-r border-slate-200/80 last:border-0 pr-2">
                                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold mb-0.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Delivery Status</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700">
                                            {selectedEmailItem.emailDate ? (
                                                <>
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    <span>Delivered</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-500 font-medium text-xs">Not Dispatched</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold mb-0.5">
                                            <Server className="w-3.5 h-3.5 text-indigo-500" />
                                            <span>Sender Host</span>
                                        </div>
                                        <span className="text-xs font-mono font-semibold text-slate-700 block truncate" title="info@mahajaliot.in">
                                            info@mahajaliot.in
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-2">Dispatched Officer Profile</label>
                                    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-3">
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold shadow-xs">
                                                EE
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {selectedEmailItem.item.officer_name || "Executive Engineer"}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                                                        {selectedEmailItem.item.officer_role || "Executive Engineer"}
                                                    </Badge>
                                                </div>
                                                {selectedEmailItem.item.officer_email ? (
                                                    <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                                                        <a
                                                            href={`mailto:${selectedEmailItem.item.officer_email}`}
                                                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
                                                        >
                                                            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                                                            <span className="truncate">{selectedEmailItem.item.officer_email}</span>
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (selectedEmailItem.item.officer_email) {
                                                                    navigator.clipboard.writeText(selectedEmailItem.item.officer_email);
                                                                    toast({ title: "Copied Email", description: selectedEmailItem.item.officer_email });
                                                                }
                                                            }}
                                                            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                                                            title="Copy Email"
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 mt-1 italic">No email on record</span>
                                                )}
                                                {selectedEmailItem.item.officer_mobile && selectedEmailItem.item.officer_mobile !== "-" ? (
                                                    <a
                                                        href={`tel:${selectedEmailItem.item.officer_mobile}`}
                                                        className="text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1.5 mt-0.5"
                                                    >
                                                        <Phone className="h-3 w-3 text-indigo-600 shrink-0" />
                                                        <span>+91 {selectedEmailItem.item.officer_mobile}</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-500 mt-0.5">Mobile: Not available</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end shrink-0 pt-0.5">
                                            {selectedEmailItem.emailDate ? (
                                                <>
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                        Success (Sent Via SMTP)
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        Dispatched: {selectedEmailItem.emailDate}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                                    <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                                                    Not Dispatched
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-1.5">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Alert Notice Context</span>
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px] font-semibold bg-white text-slate-700 border-slate-200">
                                                {selectedEmailItem.item.alert_title || "Telemetry Alert"}
                                            </Badge>
                                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                                Value: {selectedEmailItem.item.parameter_value || "-"}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 leading-relaxed text-xs">
                                        Automated escalation email notification dispatched for scheme <strong>{selectedEmailItem.item.scheme_name}</strong> (ID #{selectedEmailItem.item.scheme_id}) with recorded parameter value <strong>{selectedEmailItem.item.parameter_value || "-"}</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedEmailItem(null)}
                                    className="text-xs cursor-pointer"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* ========================================================= */}
                {/* MODAL: SMS DISPATCH LOGS (Matching Escalation Portal)     */}
                {/* ========================================================= */}
                {selectedSmsItem && (
                    <Dialog open={!!selectedSmsItem} onOpenChange={(open) => !open && setSelectedSmsItem(null)}>
                        <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800/40 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                                        <MessageSquare className="h-5 w-5 text-indigo-300" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                                            SMS Dispatch Logs
                                        </DialogTitle>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-indigo-200">
                                            <span className="font-semibold text-white">{selectedSmsItem.item.scheme_name}</span>
                                            {selectedSmsItem.item.village_name && selectedSmsItem.item.village_name !== "-" && (
                                                <>
                                                    <span>•</span>
                                                    <span>{selectedSmsItem.item.village_name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 text-right">
                                    <span className="text-[10px] font-semibold tracking-wider text-indigo-300">
                                        Targeted Alert
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                        {selectedSmsItem.item.alert_title}
                                        {selectedSmsItem.item.parameter_value && selectedSmsItem.item.parameter_value !== "-" && (
                                            <span className="bg-rose-500 text-white px-2 py-0.5 rounded font-bold shadow-xs text-[11px]">
                                                Value: {String(selectedSmsItem.item.parameter_value).replace(/\s*ppm/gi, ' mg/L')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 overflow-y-auto space-y-4 bg-slate-50/50 flex-1 text-xs">
                                {(() => {
                                    const firstSms = selectedSmsItem.smsList[0];
                                    const msgText = firstSms?.message_content || selectedSmsItem.item.message_text || "-";
                                    const templateName = selectedSmsItem.item.alert_title || "Alert Notification";

                                    return (
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                                    <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                                                    DLT Approved SMS Content (Dispatched Marathi Text)
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    {templateName}
                                                </span>
                                            </div>
                                            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 leading-relaxed font-sans select-all break-words">
                                                {msgText}
                                            </div>
                                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                                                <span>DLT Approved Header: MJPIOT (MJP-ALERT)</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(msgText);
                                                        setCopiedSmsText(true);
                                                        setTimeout(() => setCopiedSmsText(false), 2000);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 font-sans font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    {copiedSmsText ? (
                                                        <>
                                                            <Check className="h-3 w-3 text-emerald-600" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-3 w-3" />
                                                            Copy SMS
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Dispatched Recipient Details */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">
                                            Dispatched Recipient Details
                                        </span>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                                <div className="font-bold text-slate-900 text-xs">
                                                    {selectedSmsItem.item.officer_name || "Assigned Engineer"}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    Role: {selectedSmsItem.item.officer_role || "Designated Contact"}
                                                </div>
                                            </div>
                                            <div>
                                                {selectedSmsItem.item.delivery_status === "DELIVERY_SUCCESS" || selectedSmsItem.item.delivery_status === "SUCCESS" ? (
                                                    <span className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        Delivered (1/1)
                                                    </span>
                                                ) : String(selectedSmsItem.item.delivery_status || "").includes("FAIL") ? (
                                                    <span className="px-2 py-1 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                                        Failed (1)
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                                        Not Dispatched
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-1 font-mono">
                                                <Phone className="h-3 w-3 text-slate-400" />
                                                <span>+91 {selectedSmsItem.item.officer_mobile || "Not available"}</span>
                                            </div>
                                            <span className="text-slate-300">•</span>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                <span className="font-semibold text-slate-700">{selectedSmsItem.item.sms_date || selectedSmsItem.item.sent_date || "26th Oct"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedSmsItem(null)}
                                    className="text-xs cursor-pointer"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </main>
        </div>
    );
}
