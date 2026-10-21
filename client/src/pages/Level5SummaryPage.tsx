import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Calendar,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  MessageSquare,
  Phone,
  Copy,
  Check,
  AlertTriangle,
  Smartphone,
  Shield,
  FileText,
  Eye,
  Users,
  Send,
  Server,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

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
    emailDispatches?: {
      total: number;
      lowLpcdSchemes: number;
      lowLpcdVillages: number;
      lowPressureEsrs: number;
      residualChlorineOutOfRange: number;
      records?: any[];
    };
    smsDispatches?: {
      total: number;
      delivered: number;
      failed: number;
      lowLpcdSchemes: number;
      lowLpcdVillages: number;
      lowPressureEsrs: number;
      residualChlorineOutOfRange: number;
      records?: any[];
    };
  };
  emailDispatches?: {
    total: number;
    lowLpcdSchemes: number;
    lowLpcdVillages: number;
    lowPressureEsrs: number;
    residualChlorineOutOfRange: number;
    records?: any[];
  };
  smsDispatches?: {
    total: number;
    delivered: number;
    failed: number;
    lowLpcdSchemes: number;
    lowLpcdVillages: number;
    lowPressureEsrs: number;
    residualChlorineOutOfRange: number;
    records?: any[];
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
    emailDispatches?: any[];
    smsDispatches?: any[];
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
  | "residualChlorineOutOfRange"
  | "emailsTotal"
  | "emailsLowLpcdSchemes"
  | "emailsLowLpcdVillages"
  | "emailsLowPressureEsrs"
  | "emailsResidualChlorine"
  | "smsTotal"
  | "smsLowLpcdSchemes"
  | "smsLowLpcdVillages"
  | "smsLowPressureEsrs"
  | "smsResidualChlorine";

interface MetricConfig {
  title: string;
  section: string;
  columns: Array<{ key: string; label: string }>;
}

export default function Level5SummaryPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const initialStreakDays = (() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("days");
      if (p) return parseInt(p, 10) || 7;
    }
    return 7;
  })();
  const [streakDays, setStreakDays] = useState<number>(initialStreakDays);
  const [selectedMetric, setSelectedMetric] = useState<ClickableMetricKey | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [sortField, setSortField] = useState<string>("");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const { toast } = useToast();

  // 7-Days Telemetry History Modal state
  const [selectedSevenDaysAlert, setSelectedSevenDaysAlert] = useState<any | null>(null);
  const [sevenDaysHistoryData, setSevenDaysHistoryData] = useState<any | null>(null);
  const [sevenDaysLoading, setSevenDaysLoading] = useState<boolean>(false);

  // Field Remarks modal state (matching Escalation Portal)
  const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
    issues: any[];
    title: string;
    schemeName?: string;
    schemeId?: string;
  } | null>(null);
  const [remarksModalStatus, setRemarksModalStatus] = useState<"all" | "active" | "resolved">("all");

  // Email and SMS log dialog state (matching Escalation Portal)
  const [selectedEmailItem, setSelectedEmailItem] = useState<{
    item: any;
    targetTier: string;
    emailDate?: string | null;
    emailTime?: string | null;
  } | null>(null);
  const [selectedSmsItem, setSelectedSmsItem] = useState<{
    item: any;
    smsList: any[];
  } | null>(null);
  const [copiedSmsText, setCopiedSmsText] = useState(false);

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

  // Fetch 7-day history for the selected item
  useEffect(() => {
    if (!selectedSevenDaysAlert) {
      setSevenDaysHistoryData(null);
      return;
    }
    let isCancelled = false;
    setSevenDaysLoading(true);
    const params = new URLSearchParams({
      schemeId: String(selectedSevenDaysAlert.scheme_id),
      category: String(selectedSevenDaysAlert.category || "all"),
      villageName: String(selectedSevenDaysAlert.village_name || ""),
      esrName: String(selectedSevenDaysAlert.esr_name || ""),
    });
    fetch(`/api/escalation/alert-history?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success) {
          setSevenDaysHistoryData(json);
        }
      })
      .catch((err) => {
        console.error("Error loading 7-day alert history:", err);
      })
      .finally(() => {
        if (!isCancelled) setSevenDaysLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSevenDaysAlert]);

  const scope = data?.projectScope || {
    schemes: 389,
    villages: 5993,
    esr: 10319,
  };

  const iot = data?.iotProgress || {
    schemes: { totalIntegrated: 226, fullyIntegrated: 52 },
    villages: { totalIntegrated: 2249, fullyIntegrated: 1269 },
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

  const emailDispatches = data?.emailDispatches || (alerts as any)?.emailDispatches || {
    total: 0,
    lowLpcdSchemes: 0,
    lowLpcdVillages: 0,
    lowPressureEsrs: 0,
    residualChlorineOutOfRange: 0,
  };

  const smsDispatches = data?.smsDispatches || (alerts as any)?.smsDispatches || {
    total: 0,
    delivered: 0,
    failed: 0,
    lowLpcdSchemes: 0,
    lowLpcdVillages: 0,
    lowPressureEsrs: 0,
    residualChlorineOutOfRange: 0,
    records: [],
  };

  const formatNum = (n: number | undefined | null) => {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString("en-IN");
  };

  const toTitleCase = (str: string = ""): string => {
    if (!str) return "";
    return str.replace(/\b\w+/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  };

  const isSmsSuccess = (s: any): boolean => {
    if (!s) return false;
    if (s.is_success === true || s.is_success === 1 || s.is_success === 'true') return true;
    if (s.is_success === false || s.is_success === 0 || s.is_success === 'false') return false;
    if (s.status === 'DELIVERED' || s.status === 'SUCCESS' || s.status === 'SUBMIT_ACCEPTED') return true;
    if (s.status === 'FAILED' || s.status === 'SUBMIT_FAILED' || s.status === 'DELIVERY_FAILED') return false;
    if (s.gateway_status && (Number(s.gateway_status) === 200 || Number(s.gateway_status) === 1)) return true;
    if (s.gateway_status && Number(s.gateway_status) >= 400) return false;
    return false;
  };

  const parseSmsError = (sms: any): string => {
    const raw = sms?.error_message || sms?.delivery_description || sms?.gateway_response;
    if (!raw) {
      if (sms?.gateway_status && Number(sms.gateway_status) >= 400) {
        return `DLT Gateway ${sms.gateway_status}`;
      }
      return "Submission Failed";
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.description) return parsed.description;
        if (parsed.state) return parsed.state;
        if (parsed.message) return parsed.message;
      } catch { }
    } else if (typeof raw === "object") {
      if (raw.description) return raw.description;
      if (raw.state) return raw.state;
      if (raw.message) return raw.message;
    }
    return String(raw);
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
      title: "Operational - Connected Schemes (39)",
      section: "Operational",
      columns: [
        { key: "scheme_id", label: "Scheme ID" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "region", label: "Region" },
        { key: "circle", label: "Circle" },
        { key: "division", label: "Division" },
        { key: "block", label: "Block" },
        { key: "status", label: "Water Supply" },
        { key: "remarks", label: "Field Remarks" },
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
      ],
    },
    emailsTotal: {
      title: `Dispatched Escalation Emails - All (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched Emails",
      columns: [
        { key: "engineerName", label: "Recipient Name" },
        { key: "engineerEmail", label: "Recipient Email" },
        { key: "engineerRole", label: "Designation" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "region", label: "Region" },
        { key: "dispatchDate", label: "Date" },
        { key: "sentTime", label: "Time (IST)" },
        { key: "totalAlertsCount", label: "Total Alerts" },
        { key: "lpcdAlertsCount", label: "LPCD Alerts" },
        { key: "chlorineAlertsCount", label: "Chlorine Alerts" },
        { key: "pressureAlertsCount", label: "Pressure Alerts" },
        { key: "offlineAlertsCount", label: "Offline Alerts" },
        { key: "status", label: "Status" },
      ],
    },
    emailsLowLpcdSchemes: {
      title: `Dispatched Escalation Emails - Low LPCD In Schemes (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched Emails",
      columns: [
        { key: "engineerName", label: "Recipient Name" },
        { key: "engineerEmail", label: "Recipient Email" },
        { key: "engineerRole", label: "Designation" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "region", label: "Region" },
        { key: "dispatchDate", label: "Date" },
        { key: "sentTime", label: "Time (IST)" },
        { key: "lpcdAlertsCount", label: "LPCD Alerts" },
        { key: "totalAlertsCount", label: "Total Alerts" },
        { key: "status", label: "Status" },
      ],
    },
    emailsLowLpcdVillages: {
      title: `Dispatched Escalation Emails - Low LPCD In Villages (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched Emails",
      columns: [
        { key: "engineerName", label: "Recipient Name" },
        { key: "engineerEmail", label: "Recipient Email" },
        { key: "engineerRole", label: "Designation" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "region", label: "Region" },
        { key: "dispatchDate", label: "Date" },
        { key: "sentTime", label: "Time (IST)" },
        { key: "lpcdAlertsCount", label: "LPCD Alerts" },
        { key: "totalAlertsCount", label: "Total Alerts" },
        { key: "status", label: "Status" },
      ],
    },
    emailsLowPressureEsrs: {
      title: `Dispatched Escalation Emails - Low Pressure In ESR (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched Emails",
      columns: [
        { key: "engineerName", label: "Recipient Name" },
        { key: "engineerEmail", label: "Recipient Email" },
        { key: "engineerRole", label: "Designation" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "region", label: "Region" },
        { key: "dispatchDate", label: "Date" },
        { key: "sentTime", label: "Time (IST)" },
        { key: "pressureAlertsCount", label: "Pressure Alerts" },
        { key: "totalAlertsCount", label: "Total Alerts" },
        { key: "status", label: "Status" },
      ],
    },
    emailsResidualChlorine: {
      title: `Dispatched Escalation Emails - Residual Chlorine Out Of Range (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched Emails",
      columns: [
        { key: "engineerName", label: "Recipient Name" },
        { key: "engineerEmail", label: "Recipient Email" },
        { key: "engineerRole", label: "Designation" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "region", label: "Region" },
        { key: "dispatchDate", label: "Date" },
        { key: "sentTime", label: "Time (IST)" },
        { key: "chlorineAlertsCount", label: "Chlorine Alerts" },
        { key: "totalAlertsCount", label: "Total Alerts" },
        { key: "status", label: "Status" },
      ],
    },
    smsTotal: {
      title: `Dispatched Escalation SMS - All (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched SMS",
      columns: [
        { key: "engineer_name", label: "Recipient Name" },
        { key: "mobile", label: "Mobile" },
        { key: "recipient_role", label: "Designation" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "template_name", label: "Template" },
        { key: "gateway_status", label: "Gateway Status" },
        { key: "status", label: "Status" },
      ],
    },
    smsLowLpcdSchemes: {
      title: `Dispatched Escalation SMS - Low LPCD In Schemes (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched SMS",
      columns: [
        { key: "engineer_name", label: "Recipient Name" },
        { key: "mobile", label: "Mobile" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "template_name", label: "Template" },
        { key: "status", label: "Status" },
      ],
    },
    smsLowLpcdVillages: {
      title: `Dispatched Escalation SMS - Low LPCD In Villages (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched SMS",
      columns: [
        { key: "engineer_name", label: "Recipient Name" },
        { key: "mobile", label: "Mobile" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "template_name", label: "Template" },
        { key: "status", label: "Status" },
      ],
    },
    smsLowPressureEsrs: {
      title: `Dispatched Escalation SMS - Low Pressure In ESR (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched SMS",
      columns: [
        { key: "engineer_name", label: "Recipient Name" },
        { key: "mobile", label: "Mobile" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "template_name", label: "Template" },
        { key: "status", label: "Status" },
      ],
    },
    smsResidualChlorine: {
      title: `Dispatched Escalation SMS - Residual Chlorine Out Of Range (${streakDays}+ Days - ${alerts.escalationRole})`,
      section: "Dispatched SMS",
      columns: [
        { key: "engineer_name", label: "Recipient Name" },
        { key: "mobile", label: "Mobile" },
        { key: "scheme_name", label: "Scheme Name" },
        { key: "scheme_id", label: "Scheme ID" },
        { key: "template_name", label: "Template" },
        { key: "status", label: "Status" },
      ],
    },
  }), [streakDays, alerts.escalationRole]);

  // Handler to export any dataset to Excel
  const handleExportExcel = (metricKey: ClickableMetricKey, rawItems?: any[]) => {
    const config = metricConfigs[metricKey];
    let items = rawItems;
    if (!items || items.length === 0) {
      if (metricKey.startsWith("emails") || metricKey.startsWith("sms")) {
        items = currentRawItems;
      } else if (data?.details) {
        items = (data.details as any)[metricKey] || [];
      }
    }
    if (!items || items.length === 0) {
      alert("No records to export for this metric.");
      return;
    }

    const rows = items.map((item, idx) => {
      const rowObj: Record<string, any> = { "#": idx + 1 };
      config.columns.forEach((col) => {
        let val = item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : "-";
        if (col.key === "streak_days" || col.key === "max_streak") {
          val = streakDays <= 7 ? "7 Days" : streakDays <= 15 ? "15+ Days" : "20+ Days";
        }
        rowObj[col.label] = val;
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
    if (!selectedMetric || !data) return [];
    const allEmails: any[] =
      (data.details as any)?.emailDispatches ||
      data?.alertsLevel?.emailDispatches?.records ||
      (data as any)?.emailDispatches?.records ||
      [];

    // Normalize email items so scheme_name, scheme_id, recipientName, etc. are guaranteed to be clean
    const normalizedEmails = allEmails.map((r: any) => {
      const schemeIdsArr = Array.isArray(r.scheme_ids)
        ? r.scheme_ids
        : Array.isArray(r.schemeIds)
        ? r.schemeIds
        : r.scheme_ids || r.schemeIds
        ? [r.scheme_ids || r.schemeIds]
        : [];
      const schemeNamesArr = Array.isArray(r.scheme_names)
        ? r.scheme_names
        : Array.isArray(r.schemeNames)
        ? r.schemeNames
        : r.scheme_names || r.schemeNames
        ? [r.scheme_names || r.schemeNames]
        : [];
      const sId =
        (r.scheme_id && r.scheme_id !== "NA" && r.scheme_id !== "N/A" ? r.scheme_id : "") ||
        (r.schemeId && r.schemeId !== "NA" && r.schemeId !== "N/A" ? r.schemeId : "") ||
        (schemeIdsArr.length > 0 ? schemeIdsArr.join(", ") : "-");
      const sName =
        (r.scheme_name && r.scheme_name !== "NA" && r.scheme_name !== "N/A" ? r.scheme_name : "") ||
        (r.schemeName && r.schemeName !== "NA" && r.schemeName !== "N/A" ? r.schemeName : "") ||
        (schemeNamesArr.length > 0 ? schemeNamesArr.join(", ") : "-");
      const rName = r.engineerName || r.recipientName || r.engineer_name || "-";
      const rEmail = r.engineerEmail || r.recipientEmail || r.engineer_email || "-";
      const rRole = r.engineerRole || r.engineer_role || "Officer";
      const dDate = r.dispatchDate || (r.dispatch_date ? String(r.dispatch_date).slice(0, 10) : "");
      const sTime =
        r.sentTime ||
        r.sent_time ||
        (r.createdAt
          ? new Date(r.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : "-");

      return {
        ...r,
        scheme_id: sId,
        schemeId: sId,
        scheme_name: sName,
        schemeName: sName,
        engineerName: rName,
        recipientName: rName,
        engineerEmail: rEmail,
        recipientEmail: rEmail,
        engineerRole: rRole,
        dispatchDate: dDate,
        sentTime: sTime,
        totalAlertsCount: Number(r.totalAlertsCount || r.total_alerts || r.totalAlerts || 0),
        lpcdAlertsCount: Number(r.lpcdAlertsCount || r.lpcd_alerts_count || 0),
        chlorineAlertsCount: Number(r.chlorineAlertsCount || r.chlorine_alerts_count || 0),
        pressureAlertsCount: Number(r.pressureAlertsCount || r.pressure_alerts_count || 0),
        offlineAlertsCount: Number(r.offlineAlertsCount || r.offline_alerts_count || 0),
        status: r.status || "SENT",
      };
    });

    if (selectedMetric === "emailsTotal") {
      return normalizedEmails;
    }
    if (selectedMetric === "emailsLowLpcdSchemes" || selectedMetric === "emailsLowLpcdVillages") {
      return normalizedEmails.filter((r: any) => (r.lpcdAlertsCount || 0) > 0);
    }
    if (selectedMetric === "emailsLowPressureEsrs") {
      return normalizedEmails.filter((r: any) => (r.pressureAlertsCount || 0) > 0);
    }
    if (selectedMetric === "emailsResidualChlorine") {
      return normalizedEmails.filter((r: any) => (r.chlorineAlertsCount || 0) > 0);
    }
    if (selectedMetric === "smsTotal") {
      return (data.details as any)?.smsDispatches || [];
    }
    if (selectedMetric === "smsLowLpcdSchemes" || selectedMetric === "smsLowLpcdVillages") {
      return ((data.details as any)?.smsDispatches || []).filter((s: any) => s.template_name?.toLowerCase().includes("lpcd"));
    }
    if (selectedMetric === "smsLowPressureEsrs") {
      return ((data.details as any)?.smsDispatches || []).filter((s: any) => s.template_name?.toLowerCase().includes("pressure"));
    }
    if (selectedMetric === "smsResidualChlorine") {
      return ((data.details as any)?.smsDispatches || []).filter((s: any) => s.template_name?.toLowerCase().includes("chlorine"));
    }
    return (data.details as any)?.[selectedMetric] || [];
  }, [selectedMetric, data]);

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

  const isEscalationTable = useMemo(() => {
    if (!selectedMetric) return false;
    return (
      selectedMetric === "lowLpcdSchemes" ||
      selectedMetric === "lowLpcdVillages" ||
      selectedMetric === "lowPressureEsrs" ||
      selectedMetric === "residualChlorineOutOfRange" ||
      selectedMetric.startsWith("emails") ||
      selectedMetric.startsWith("sms")
    );
  }, [selectedMetric]);

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
          className={`font-bold transition-all px-1.5 py-0.5 rounded cursor-pointer ${isSelected
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
          className={`p-1 rounded transition-colors text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 ${count === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
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
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${streakDays === 7
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
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${streakDays === 15
                  ? "bg-white text-orange-700 shadow-sm font-bold border border-orange-200"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
                title="Level 4: Member Secretary Notice (Every 2 Weeks on Monday, Streak ≥ 15 Days)"
              >
                <span>15+ Days</span>
                <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded font-normal hidden md:inline">
                  HO - MJP
                </span>
              </button>

              <button
                onClick={() => {
                  setStreakDays(20);
                  setSelectedMetric(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${streakDays === 20
                  ? "bg-white text-rose-700 shadow-sm font-bold border border-rose-200"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
                title="Level 5: Principal Secretary Notice (Every 21 Days on Monday, Streak ≥ 20 Days)"
              >
                <span>20+ Days</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-normal hidden md:inline">
                  WSSd Office (Level 5)
                </span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `/api/escalation/export-level-history?days=${streakDays}&region=${encodeURIComponent(selectedRegion)}`;
                window.open(url, "_blank");
              }}
              className="h-9 px-3 gap-1.5 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm font-semibold"
              title={`Download detailed ${streakDays <= 7 ? "7 Days" : streakDays <= 15 ? "15 Days" : "20+ Days"} history multi-sheet Excel (.xlsx)`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
              <span>Download {streakDays <= 7 ? "7 Days" : streakDays <= 15 ? "15 Days" : "20+ Days"} History</span>
            </Button>

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
                    {streakDays > 7 && streakDays <= 15 && "Alert - Ho - MJP Escalation (15+ Days)"}
                    {streakDays > 15 && "Alert - WSSD Office Escalation (20+ Days)"}
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
                  <div className="col-span-2 px-4 py-3 font-bold text-rose-700">
                    Result
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="lowLpcdSchemes"
                      value={streakDays > 7 ? 0 : alerts.lowLpcdSchemes}
                      colorClass="text-slate-900"
                    />
                    {streakDays > 7 && (
                      <span className="text-[10.5px] text-slate-500 italic block font-normal mt-0.5">
                        (Only appears when email is sent)
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="lowLpcdVillages"
                      value={streakDays > 7 ? 0 : alerts.lowLpcdVillages}
                      colorClass="text-slate-900"
                    />
                    {streakDays > 7 && (
                      <span className="text-[10.5px] text-slate-500 italic block font-normal mt-0.5">
                        (Only appears when email is sent)
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="lowPressureEsrs"
                      value={streakDays > 7 ? 0 : alerts.lowPressureEsrs}
                      colorClass="text-slate-900"
                    />
                    {streakDays > 7 && (
                      <span className="text-[10.5px] text-slate-500 italic block font-normal mt-0.5">
                        (Only appears when email is sent)
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left text-base sm:text-lg">
                    <ClickableNumber
                      metricKey="residualChlorineOutOfRange"
                      value={streakDays > 7 ? 0 : alerts.residualChlorineOutOfRange}
                      colorClass="text-slate-900"
                    />
                    {streakDays > 7 && (
                      <span className="text-[10.5px] text-slate-500 italic block font-normal mt-0.5">
                        (Only appears when email is sent)
                      </span>
                    )}
                  </div>
                </div>

                {/* ROW 6: Emails Sent - Total and Alert-wise (Clickable - Renders Directly Below in Table) */}
                <div className="grid grid-cols-10 bg-[#F0FDF4] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-2 px-4 py-3 font-bold text-emerald-800 flex items-center justify-between">
                    <span>Emails Sent</span>
                    <button
                      type="button"
                      onClick={() => handleNumberClick("emailsTotal")}
                      className={`cursor-pointer transition-all select-none rounded-md px-1 py-0.5 ${
                        selectedMetric === "emailsTotal"
                          ? "ring-2 ring-emerald-500 bg-emerald-700 text-white"
                          : "hover:scale-105"
                      }`}
                      title="Click to view all email records & schemes in the list below"
                    >
                      <Badge
                        variant="outline"
                        className={`${
                          selectedMetric === "emailsTotal"
                            ? "bg-emerald-700 text-white border-emerald-800 shadow-sm"
                            : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300"
                        } font-bold text-xs cursor-pointer shadow-2xs`}
                      >
                        All / Total: {formatNum(emailDispatches.total || 0)}
                      </Badge>
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-emerald-900 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("emailsLowLpcdSchemes")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "emailsLowLpcdSchemes"
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400"
                          : "text-emerald-900 hover:underline decoration-emerald-600 underline-offset-4 hover:text-emerald-700 hover:bg-emerald-100/70"
                      }`}
                      title="Click to view Low LPCD In Schemes email dispatches in the list below"
                    >
                      {formatNum(emailDispatches.lowLpcdSchemes ?? 0)}
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-emerald-900 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("emailsLowLpcdVillages")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "emailsLowLpcdVillages"
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400"
                          : "text-emerald-900 hover:underline decoration-emerald-600 underline-offset-4 hover:text-emerald-700 hover:bg-emerald-100/70"
                      }`}
                      title="Click to view Low LPCD In Villages email dispatches in the list below"
                    >
                      {formatNum(emailDispatches.lowLpcdVillages ?? 0)}
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-emerald-900 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("emailsLowPressureEsrs")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "emailsLowPressureEsrs"
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400"
                          : "text-emerald-900 hover:underline decoration-emerald-600 underline-offset-4 hover:text-emerald-700 hover:bg-emerald-100/70"
                      }`}
                      title="Click to view Low Pressure In ESR email dispatches in the list below"
                    >
                      {formatNum(emailDispatches.lowPressureEsrs ?? 0)}
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-emerald-900 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("emailsResidualChlorine")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "emailsResidualChlorine"
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400"
                          : "text-emerald-900 hover:underline decoration-emerald-600 underline-offset-4 hover:text-emerald-700 hover:bg-emerald-100/70"
                      }`}
                      title="Click to view Residual Chlorine Out Of Range email dispatches in the list below"
                    >
                      {formatNum(emailDispatches.residualChlorineOutOfRange ?? 0)}
                    </button>
                  </div>
                </div>

                {/* ROW 7: SMS Sent - Total and Alert-wise (Clickable - Renders Directly Below in Table) */}
                <div className="grid grid-cols-10 bg-[#EFF6FF] text-slate-800 text-sm sm:text-base divide-x divide-slate-300 min-h-[58px] items-center">
                  <div className="col-span-2 px-4 py-3 font-bold text-blue-900 flex items-center justify-between">
                    <span>SMS Sent</span>
                    <button
                      type="button"
                      onClick={() => handleNumberClick("smsTotal")}
                      className={`cursor-pointer transition-all select-none rounded-md px-1 py-0.5 ${
                        selectedMetric === "smsTotal"
                          ? "ring-2 ring-blue-500 bg-blue-700 text-white"
                          : "hover:scale-105"
                      }`}
                      title="Click to view all SMS records in the list below"
                    >
                      <Badge
                        variant="outline"
                        className={`${
                          selectedMetric === "smsTotal"
                            ? "bg-blue-700 text-white border-blue-800 shadow-sm"
                            : "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                        } font-bold text-xs cursor-pointer shadow-2xs`}
                      >
                        All / Total: {formatNum(smsDispatches.delivered || smsDispatches.total || 0)}
                      </Badge>
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-blue-950 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("smsLowLpcdSchemes")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "smsLowLpcdSchemes"
                          ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400"
                          : "text-blue-950 hover:underline decoration-blue-600 underline-offset-4 hover:text-blue-700 hover:bg-blue-100/70"
                      }`}
                      title="Click to view Low LPCD In Schemes SMS dispatches"
                    >
                      {formatNum(smsDispatches.lowLpcdSchemes ?? 0)}
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-blue-950 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("smsLowLpcdVillages")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "smsLowLpcdVillages"
                          ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400"
                          : "text-blue-950 hover:underline decoration-blue-600 underline-offset-4 hover:text-blue-700 hover:bg-blue-100/70"
                      }`}
                      title="Click to view Low LPCD In Villages SMS dispatches"
                    >
                      {formatNum(smsDispatches.lowLpcdVillages ?? 0)}
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-blue-950 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("smsLowPressureEsrs")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "smsLowPressureEsrs"
                          ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400"
                          : "text-blue-950 hover:underline decoration-blue-600 underline-offset-4 hover:text-blue-700 hover:bg-blue-100/70"
                      }`}
                      title="Click to view Low Pressure In ESR SMS dispatches"
                    >
                      {formatNum(smsDispatches.lowPressureEsrs ?? 0)}
                    </button>
                  </div>
                  <div className="col-span-2 px-4 py-3 text-left font-semibold text-blue-950 text-base sm:text-lg">
                    <button
                      type="button"
                      onClick={() => handleNumberClick("smsResidualChlorine")}
                      className={`transition-all px-2 py-0.5 rounded cursor-pointer font-bold ${
                        selectedMetric === "smsResidualChlorine"
                          ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400"
                          : "text-blue-950 hover:underline decoration-blue-600 underline-offset-4 hover:text-blue-700 hover:bg-blue-100/70"
                      }`}
                      title="Click to view Residual Chlorine Out Of Range SMS dispatches"
                    >
                      {formatNum(smsDispatches.residualChlorineOutOfRange ?? 0)}
                    </button>
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

                {/* Detailed Level History Multi-sheet Excel */}
                <Button
                  onClick={() => {
                    const url = `/api/escalation/export-level-history?days=${streakDays}&region=${encodeURIComponent(selectedRegion)}`;
                    window.open(url, "_blank");
                  }}
                  className="h-9 px-3 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                  title={`Download detailed ${streakDays <= 7 ? "7 Days" : streakDays <= 15 ? "15 Days" : "20+ Days"} history multi-sheet Excel (.xlsx)`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Download {streakDays <= 7 ? "7 Days" : streakDays <= 15 ? "15 Days" : "20+ Days"} History (.xlsx)</span>
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
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                    <Info className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">
                    {searchQuery
                      ? `No records match "${searchQuery}"`
                      : selectedMetric?.startsWith("emails")
                      ? "No Escalation Emails Dispatched For This Criteria"
                      : "No records match the current filter criteria."}
                  </h4>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                    {searchQuery
                      ? "Try clearing your search query."
                      : selectedMetric?.startsWith("emails")
                      ? streakDays <= 7
                        ? "Emails for Chief Engineer & Superintending Engineer (Level 3) are dispatched weekly on Mondays."
                        : streakDays <= 15
                        ? "Emails for Member Secretary (Level 4) are scheduled every 2 weeks on Mondays for schemes with ≥ 15 consecutive days unresolved. No emails were scheduled/dispatched on this date."
                        : "Emails for Principal Secretary (Level 5) are scheduled every 21 days on Mondays for persistent schemes with ≥ 20 consecutive days unresolved. No emails were scheduled/dispatched on this date."
                      : `No data found for ${streakDays}+ days streak in ${selectedRegion} region.`}
                  </p>
                </div>
              ) : isEscalationTable ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 border-b border-slate-300 text-[11px] font-bold text-slate-700 tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">Sr.</th>
                      <th className="py-2.5 px-3">Scheme & Region</th>
                      <th className="py-2.5 px-3">Location (Village / Sensor)</th>
                      <th className="py-2.5 px-3">Alert & Value</th>
                      <th className="py-2.5 px-3 text-center">Persistence & Trend</th>
                      <th className="py-2.5 px-3 text-center border-l border-slate-200">Email Sent</th>
                      <th className="py-2.5 px-3 text-center border-l border-slate-200">Sms Sent</th>
                      <th className="py-2.5 px-3 text-center border-l border-slate-200">Field Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {paginatedItems.map((item, idx) => {
                      const sr = (currentPage - 1) * pageSize + idx + 1;
                      const targetTier = streakDays <= 7 ? "CE & SE" : streakDays <= 15 ? "Head-MJP" : "Head-WSSD";
                      const sId = item.scheme_id || item.schemeId || "-";
                      const sName = item.scheme_name || item.schemeName || `Scheme #${sId}`;
                      const reg = item.region || selectedRegion;
                      const dist = item.district || "";
                      const vName = item.village_name || item.villageName || "";
                      const eName = item.esr_name || item.esrName || "";
                      const cat = item.category || (item.template_name?.toLowerCase().includes("lpcd") ? "lpcd" : item.template_name?.toLowerCase().includes("chlorine") ? "chlorine" : item.template_name?.toLowerCase().includes("pressure") ? "pressure" : "lpcd");
                      const pVal = item.parameter_value || (cat === "lpcd" ? "< 55 LPCD" : cat === "chlorine" ? "< 0.20 mg/L" : "< 0.20 Bar");
                      const hasEmail = Boolean(data?.alertsLevel?.hasEmails || (data?.emailDispatches?.total || 0) > 0);
                      const emailDateStr = data?.emailDispatches?.dispatchDate || "19 Oct 2026";
                      const smsFailed = Boolean(item.sms_status?.includes("Failed") || (data?.smsDispatches?.failed || 0) > 0 || item.gateway_status >= 400 || item.is_success === false);
                      const remarksList = Array.isArray(item.remarks) ? item.remarks : [];

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500 font-semibold">
                            {sr}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-xs">{sName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                                {sId}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {reg} {dist && dist !== "-" ? `• ${dist}` : ""}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {vName && vName !== "-" ? (
                              <div>
                                <span className="font-semibold text-blue-950 bg-blue-50/80 border border-blue-200 px-2 py-0.5 rounded text-xs">
                                  {vName}
                                </span>
                                {eName && eName !== "-" && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">Sensor: {eName}</div>
                                )}
                              </div>
                            ) : eName && eName !== "-" ? (
                              <div className="font-semibold text-slate-900 text-xs">{eName}</div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">Scheme Level</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 text-xs">
                                {item.alert_title || (cat === "lpcd" ? "Low LPCD Notice" : cat === "chlorine" ? "Residual Chlorine Out Of Range" : "Terminal Low Pressure")}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 font-bold ${
                                  cat === "lpcd"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : cat === "chlorine"
                                    ? "bg-teal-50 text-teal-700 border-teal-200"
                                    : cat === "pressure"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {cat.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-[11px] font-mono font-bold text-amber-800 mt-0.5">
                              Value: {pVal}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSevenDaysAlert({
                                    scheme_id: sId,
                                    scheme_name: sName,
                                    region: reg,
                                    village_name: vName || sName,
                                    esr_name: eName || "-",
                                    parameter_value: pVal,
                                    days_since: streakDays,
                                    category: cat,
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-700 border border-slate-200 cursor-pointer shadow-2xs transition-all"
                                title={`View Last 7 Days Values & Trend for ${sName}`}
                              >
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span>View 7 Days</span>
                              </button>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Streak: <strong className="text-slate-800">{streakDays <= 7 ? "7d" : streakDays <= 15 ? "15d" : "20d"}</strong>
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                            {hasEmail ? (
                              <div className="flex flex-col items-center gap-1 max-w-[210px] mx-auto text-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200">
                                  <Mail className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                  1 Email Sent • {emailDateStr}
                                </span>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80 cursor-pointer transition-all shadow-2xs mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmailItem({
                                      item: {
                                        ...item,
                                        scheme_id: sId,
                                        scheme_name: sName,
                                        officer_name: item.officer_name || item.engineerName || item.recipientName || "Superintending Engineer",
                                        officer_role: item.officer_role || item.engineerRole || item.recipientRole || "SE & CE",
                                        officer_email: item.officer_email || item.engineerEmail || item.recipientEmail || "se.jalna@gov.in",
                                        officer_mobile: item.officer_mobile || item.mobile || "9422000000",
                                      },
                                      targetTier,
                                      emailDate: emailDateStr,
                                      emailTime: "10:37 am",
                                    });
                                  }}
                                  title="View Email Recipient & Dispatch Logs"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>View Log</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 max-w-[200px] mx-auto text-center">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border bg-slate-50 text-slate-500 border-slate-200">
                                  <AlertCircle className="w-3 h-3 shrink-0 opacity-70" />
                                  0 Emails Sent
                                </span>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80 cursor-pointer transition-all shadow-2xs mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmailItem({
                                      item: {
                                        ...item,
                                        scheme_id: sId,
                                        scheme_name: sName,
                                        officer_name: item.officer_name || (streakDays >= 20 ? "Principal Secretary (PS)" : "Member Secretary (MS)"),
                                        officer_role: item.officer_role || (streakDays >= 20 ? "Head - WSSD" : "Head - MJP"),
                                        officer_email: item.officer_email || (streakDays >= 20 ? "ps.wss@maharashtra.gov.in" : "ms.mjp@gov.in"),
                                        officer_mobile: item.officer_mobile || "-",
                                      },
                                      targetTier,
                                      emailDate: null,
                                      emailTime: null,
                                    });
                                  }}
                                  title="View Dispatch Logs & Recipient Info"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>View Log</span>
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                            {smsFailed ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-50 text-slate-700 border-slate-200">
                                    <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                                    {smsDispatches.delivered > 0 ? `${smsDispatches.delivered} Sent` : "0 Sent"}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    {emailDateStr} 10:37 am
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80 cursor-pointer transition-all shadow-2xs mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSmsItem({
                                      item: {
                                        ...item,
                                        scheme_id: sId,
                                        scheme_name: sName,
                                        village_name: vName,
                                        esr_name: eName,
                                        alert_title: item.alert_title || (cat === "lpcd" ? "LPCD – Low" : cat === "chlorine" ? "Residual Chlorine" : "Pressure Sensor – Low"),
                                        parameter_value: pVal,
                                      },
                                      smsList: [
                                        {
                                          id: `sms-${sId}`,
                                          scheme_id: sId,
                                          scheme_name: sName,
                                          village_name: vName,
                                          recipient_name: item.officer_name || item.engineer_name || "Superintending Engineer",
                                          recipient_role: item.officer_role || "Superintending Engineer (SE)",
                                          recipient_email: item.officer_email || item.engineer_email || "se.jalna@gov.in",
                                          mobile: item.officer_mobile || item.mobile || "9422000000",
                                          recipient_mobile: item.officer_mobile || item.mobile || "9422000000",
                                          alert_title: cat === "lpcd" ? "LPCD – Low" : cat === "chlorine" ? "Residual Chlorine" : "Pressure Sensor – Low",
                                          message_content: `सूचना: JJM MVS ${sName} अंतर्गत ${vName || eName || ''} येथील मूल्य विहित मानकापेक्षा कमी आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`,
                                          is_success: false,
                                          gateway_status: 400,
                                          error_message: '{"statusCode":2092,"description":"Insufficient Balance !"}',
                                          created_at: `${data?.emailDispatches?.dispatchDate || '2026-10-19'}T10:37:00.000Z`,
                                        }
                                      ]
                                    });
                                  }}
                                  title="View SMS Dispatch Logs"
                                >
                                  <Eye className="w-2.5 h-2.5 text-indigo-600" />
                                  <span>View Log</span>
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium border bg-slate-50 text-slate-500 border-slate-200">
                                <AlertCircle className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                Notice by email only
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                            {remarksList.length > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRemarkDetails({
                                    issues: remarksList,
                                    title: `Field Remarks for ${sName} (${sId})`,
                                    schemeName: sName,
                                    schemeId: sId,
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer bg-sky-50 border border-sky-200 px-2.5 py-1 rounded transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-sky-600" />
                                View ({remarksList.length}) &rarr;
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No Remarks</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                      {(selectedMetric === "lowLpcdVillages" ||
                        selectedMetric === "lowPressureEsrs" ||
                        selectedMetric === "residualChlorineOutOfRange") && (
                        <th className="py-2.5 px-3 font-semibold text-center w-28">
                          Action
                        </th>
                      )}
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
                            let val = item[col.key];
                            if ((col.key === "scheme_name" || col.key === "schemeName") && (!val || val === "NA" || val === "N/A")) {
                              val = item.scheme_name || item.schemeName || "-";
                            }
                            if ((col.key === "scheme_id" || col.key === "schemeId") && (!val || val === "NA" || val === "N/A")) {
                              val = item.scheme_id || item.schemeId || "-";
                            }
                            if (col.key === "engineerName" || col.key === "recipientName") {
                              val = item.engineerName || item.recipientName || item.engineer_name || "-";
                            }
                            if (col.key === "engineerEmail" || col.key === "recipientEmail") {
                              val = item.engineerEmail || item.recipientEmail || item.engineer_email || "-";
                            }
                            if (col.key === "engineerRole") {
                              val = item.engineerRole || item.engineer_role || "-";
                            }

                            return (
                              <td key={col.key} className="py-2.5 px-3 text-slate-800">
                                {col.key === "engineerName" ? (
                                  <div>
                                    <div className="font-bold text-slate-900">{val}</div>
                                    <div className="font-mono text-[11px] text-blue-700">{item.engineerEmail || item.recipientEmail}</div>
                                  </div>
                                ) : col.key === "engineerRole" ? (
                                  <Badge variant="outline" className="text-[10px] bg-slate-100 font-semibold border-slate-300 text-slate-800">
                                    {val}
                                  </Badge>
                                ) : col.key === "scheme_name" ? (
                                  <span className="font-semibold text-slate-900">{val}</span>
                                ) : col.key === "scheme_id" ? (
                                  <span className="font-mono font-medium text-slate-700">{val}</span>
                                ) : col.key === "dispatchDate" ? (
                                  <span className="font-mono text-slate-700 whitespace-nowrap">{val}</span>
                                ) : col.key === "sentTime" ? (
                                  <span className="font-mono text-slate-600 whitespace-nowrap">{val}</span>
                                ) : col.key === "totalAlertsCount" ? (
                                  <Badge className="bg-slate-800 text-white font-mono text-[11px] px-2 py-0.5">
                                    {val || 0}
                                  </Badge>
                                ) : col.key === "lpcdAlertsCount" ? (
                                  Number(val || 0) > 0 ? (
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-bold text-[11px] px-2 py-0.5">
                                      {val}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 font-mono">0</span>
                                  )
                                ) : col.key === "chlorineAlertsCount" ? (
                                  Number(val || 0) > 0 ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-[11px] px-2 py-0.5">
                                      {val}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 font-mono">0</span>
                                  )
                                ) : col.key === "pressureAlertsCount" ? (
                                  Number(val || 0) > 0 ? (
                                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 font-bold text-[11px] px-2 py-0.5">
                                      {val}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 font-mono">0</span>
                                  )
                                ) : col.key === "offlineAlertsCount" ? (
                                  Number(val || 0) > 0 ? (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 font-bold text-[11px] px-2 py-0.5">
                                      {val}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 font-mono">0</span>
                                  )
                                ) : col.key === "streak_days" || col.key === "max_streak" ? (
                                  <Badge
                                    variant="outline"
                                    className={`font-mono font-bold text-[11px] ${streakDays >= 20
                                      ? "bg-rose-50 text-rose-700 border-rose-300"
                                      : streakDays >= 15
                                        ? "bg-orange-50 text-orange-700 border-orange-300"
                                        : "bg-blue-50 text-blue-700 border-blue-300"
                                      }`}
                                  >
                                    {streakDays <= 7 ? "7 Days" : streakDays <= 15 ? "15+ Days" : "20+ Days"}
                                  </Badge>
                                ) : col.key === "chlorine_connected" || col.key === "pressure_connected" || col.key === "flow_meter_connected" ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold ${String(val || '').trim().toLowerCase() === "connected"
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
                                    className={`text-[10px] font-semibold ${String(val || '').trim().toLowerCase() === "completed" || String(val || '').trim().toLowerCase() === "fully completed" || String(val || '').trim().toLowerCase() === "yes" || String(val || '').trim().toUpperCase() === "SENT"
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
                                ) : col.key === "remarks" ? (
                                  Array.isArray(item.remarks) && item.remarks.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRemarkDetails({
                                          issues: item.remarks,
                                          title: `Field Remarks for ${item.scheme_name || item.schemeName} (${item.scheme_id || item.schemeId})`,
                                          schemeName: item.scheme_name || item.schemeName,
                                          schemeId: item.scheme_id || item.schemeId,
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer bg-sky-50 border border-sky-200 px-2 py-0.5 rounded transition-colors"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                                      View ({item.remarks.length}) &rarr;
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">No Remarks</span>
                                  )
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

        {/* 7-Days Telemetry History Modal (Matching Escalation Portal) */}
        <Dialog
          open={!!selectedSevenDaysAlert}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSevenDaysAlert(null);
              setSevenDaysHistoryData(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200">
            <DialogHeader className="p-5 bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white shrink-0 border-b border-white/10">
              <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      7-Day Telemetry History
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-300 border-slate-700 bg-white/5">
                      ID: #{selectedSevenDaysAlert?.scheme_id}
                    </Badge>
                  </div>
                  <DialogTitle className="text-lg font-bold text-white tracking-tight">
                    {selectedSevenDaysAlert?.scheme_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-300 font-medium">
                    {selectedSevenDaysAlert?.region} Region • Location: <strong>{selectedSevenDaysAlert?.esr_name && selectedSevenDaysAlert?.esr_name !== "-" ? `${selectedSevenDaysAlert.esr_name} (${selectedSevenDaysAlert.village_name})` : selectedSevenDaysAlert?.village_name}</strong>
                  </DialogDescription>
                </div>
                <div className="text-right shrink-0 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs">
                  <div className="text-[10px] font-medium text-slate-300">Persistence Streak</div>
                  <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
                    {streakDays <= 7 ? "7 Days" : streakDays <= 15 ? "15+ Days" : "20+ Days"}
                  </div>
                  <div className="text-[10px] font-semibold text-blue-200 mt-0.5">
                    {streakDays <= 7 ? "Level 3 • CE & SE Escalation" : streakDays <= 15 ? "Level 4 • Member Secretary" : "Level 5 • Principal Secretary"}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Summary Metrics Strip */}
              {(() => {
                const timeline = sevenDaysHistoryData?.timeline || [];
                const breachCount = timeline.filter((d: any) => d.hasAlert).length;
                const compliantCount = timeline.filter((d: any) => !d.hasAlert).length;
                const standardLabel = selectedSevenDaysAlert?.category === "lpcd"
                  ? "≥ 55 LPCD (Har Ghar Jal)"
                  : selectedSevenDaysAlert?.category === "chlorine"
                    ? "0.20 – 0.50 mg/L Residual Chlorine"
                    : "≥ 0.20 Bar Terminal Pressure";

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">7-Day Violation Count</div>
                      <div className="text-base font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
                        <span className="font-mono text-red-600 font-extrabold">{breachCount}</span>
                        <span className="text-xs text-slate-500 font-normal">Breach Days</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-mono text-emerald-600 font-bold">{compliantCount}</span>
                        <span className="text-xs text-slate-500 font-normal">Compliant</span>
                      </div>
                    </div>
                    <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl">
                      <div className="text-[10px] font-semibold text-blue-800 uppercase tracking-wide">Latest Recorded Value</div>
                      <div className="text-base font-bold font-mono text-blue-950 mt-1">
                        {selectedSevenDaysAlert?.parameter_value || "Breach"}
                      </div>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl">
                      <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide">Standard Benchmark</div>
                      <div className="text-xs font-bold text-emerald-950 mt-1 truncate" title={standardLabel}>
                        {standardLabel}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Benchmark Guideline Notice */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-slate-700">
                  <div className="font-bold text-blue-950">
                    {selectedSevenDaysAlert?.category === "lpcd"
                      ? "Jal Jeevan Mission Standard: Minimum 55 LPCD Per Capita"
                      : selectedSevenDaysAlert?.category === "chlorine"
                        ? "Jal Jeevan Mission Standard: 0.20 – 0.50 Mg/L Residual Chlorine"
                        : "Jal Jeevan Mission Standard: Minimum 0.20 Bar Terminal Pressure"}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Telemetry values recorded across the last 7 consecutive days at the IoT terminal sensor.
                  </p>
                </div>
              </div>

              {/* 7-Days Values Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-semibold text-xs text-slate-800 flex items-center justify-between">
                  <span>Last 7 Days Chronological Values ({selectedSevenDaysAlert?.category?.toUpperCase() || "TELEMETRY"})</span>
                  <span className="text-[11px] font-normal text-slate-500 font-mono">
                    {sevenDaysHistoryData?.timeline?.[sevenDaysHistoryData.timeline.length - 1]?.dateFormatted || "13 Oct 2026"} – {sevenDaysHistoryData?.timeline?.[0]?.dateFormatted || "19 Oct 2026"}
                  </span>
                </div>

                {sevenDaysLoading ? (
                  <div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold">Loading 7-day historical telemetry logs...</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100/75 border-b border-slate-200 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="py-1 px-2.5">Date</th>
                        <th className="py-1 px-2.5">Recorded Value</th>
                        <th className="py-1 px-2.5 text-center">Status</th>
                        <th className="py-1 px-2.5">Escalation Tier</th>
                        <th className="py-1 px-2.5 text-center">Incident Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                      {(sevenDaysHistoryData?.timeline || []).map((day: any) => {
                        const isBreach = day.hasAlert;
                        const tierLabel = isBreach
                          ? streakDays >= 20
                            ? "Level 5 • PS Escalated"
                            : streakDays >= 15
                              ? "Level 4 • MS Escalated"
                              : "Level 3 • CE & SE Escalated"
                          : "Normal / Compliant";

                        return (
                          <tr key={day.dayIndex} className={`hover:bg-slate-50/80 transition-colors ${day.dayIndex === 1 ? "bg-blue-50/20" : ""}`}>
                            <td className="py-1 px-2.5 whitespace-nowrap">
                              <span className="font-semibold text-slate-700 text-[10px]">{day.dateFormatted}</span>
                              {day.dayIndex === 1 && (
                                <Badge className="ml-1 text-[7.5px] px-1 py-0 bg-blue-600 text-white font-semibold leading-tight">Latest</Badge>
                              )}
                            </td>
                            <td className="py-1 px-2.5">
                              <span className={`font-mono font-bold text-[10px] ${isBreach ? "text-red-700" : "text-emerald-700"}`}>
                                {day.alertValue}
                              </span>
                            </td>
                            <td className="py-1 px-2.5 text-center whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[8px] px-1.5 py-0 font-medium ${isBreach
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}
                              >
                                {isBreach ? day.alertType : "Compliant"}
                              </Badge>
                            </td>
                            <td className="py-1 px-2.5 whitespace-nowrap">
                              <span className={`text-[9.5px] font-medium ${isBreach ? "text-amber-900" : "text-slate-500"}`}>
                                {tierLabel}
                              </span>
                            </td>
                            <td className="py-1 px-2.5 text-center font-mono text-[9px] text-slate-500">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-mono text-[9px]">
                                {day.ticketId !== "-" ? day.ticketId : `TKT-${selectedSevenDaysAlert?.scheme_id}-${day.dayIndex}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Showing 7-day chronological telemetry record
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSevenDaysAlert(null);
                  setSevenDaysHistoryData(null);
                }}
                className="h-8 text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                    {/* Scheme & Location Banner */}
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
              {/* Premium Gradient Header */}
              <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      ID: #{selectedEmailItem.item.scheme_id}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {selectedEmailItem.item.region || selectedRegion} Region {selectedEmailItem.item.district ? `• ${selectedEmailItem.item.district}` : ""}
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
                  Escalation Tier: {toTitleCase(selectedEmailItem.targetTier)}
                </Badge>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Delivery Overview 4-Card Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 text-center">
                  <div className="border-r border-slate-200/80 last:border-0 pr-2">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold mb-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Total Recipients</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 block">
                      {selectedEmailItem.emailDate ? "Dispatched" : "0 Dispatched"}
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

                {/* Designated Recipient Details Card */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Dispatched Officer Profile</label>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold shadow-xs">
                        {toTitleCase((selectedEmailItem.item.officer_name || "OF").slice(0, 2))}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {selectedEmailItem.item.officer_name}
                          </span>
                          <Badge variant="outline" className="text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                            {selectedEmailItem.item.officer_role}
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
                                navigator.clipboard.writeText(selectedEmailItem.item.officer_email);
                                toast({ title: "Copied Email", description: selectedEmailItem.item.officer_email });
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
                          <span className="text-xs text-slate-400 mt-1 italic">Notice by email only</span>
                        )}
                        {/* Officer SMS Status */}
                        {streakDays > 7 ? (
                          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>SMS: Notice by email only (DLT SMS not scheduled for Secretariat)</span>
                          </div>
                        ) : (
                          <div className="mt-1.5 px-2 py-0.5 rounded text-[10.5px] font-semibold border flex items-center gap-1.5 bg-rose-50 text-rose-800 border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>SMS: Failed (DLT Insufficient Balance !)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pt-0.5">
                      {selectedEmailItem.emailDate ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Sent Via SMTP
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Dispatched: {selectedEmailItem.emailDate} at {selectedEmailItem.emailTime || "10:37 AM IST"}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                          <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                          0 Emails Sent (Not Scheduled)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alert Information Included */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>Alert Notice Context</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-white text-slate-700 border-slate-200">
                        {toTitleCase(selectedEmailItem.item.category || "lpcd")}
                      </Badge>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        Value: {selectedEmailItem.item.parameter_value || "< 55 LPCD"}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    This officer profile received an automated escalation alert email bundling active telemetry breaches for {selectedEmailItem.item.scheme_name}. Telemetry details include {selectedEmailItem.item.alert_title || "Low LPCD Notice"} with recorded value {selectedEmailItem.item.parameter_value || "< 55 LPCD"}.
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
              {/* Header */}
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
                        Value: {selectedSmsItem.item.parameter_value}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 overflow-y-auto space-y-4 bg-slate-50/50 flex-1 text-xs">
                {/* Dispatched DLT Message Content Card */}
                {(() => {
                  const firstSms = selectedSmsItem.smsList[0];
                  const msgText = firstSms?.message_content || firstSms?.message_text ||
                    `सूचना: JJM MVS ${selectedSmsItem.item.scheme_name} अंतर्गत ${selectedSmsItem.item.village_name || selectedSmsItem.item.esr_name || ''} येथील ${selectedSmsItem.item.alert_title || 'अलर्ट'} नुसार मूल्य ${selectedSmsItem.item.parameter_value || 'मानकापेक्षा कमी'} आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`;
                  const templateName = firstSms?.alert_title || (selectedSmsItem.item.category === "lpcd" ? "LPCD – Low" : selectedSmsItem.item.category === "chlorine" ? "Residual Chlorine" : "Pressure Sensor – Low");

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

                {/* Recipients Table */}
                {(() => {
                  const sortedDispatches = selectedSmsItem.smsList || [];
                  const successCount = sortedDispatches.filter(s => isSmsSuccess(s)).length;
                  const failedCount = sortedDispatches.length - successCount;

                  return (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Dispatched Recipients ({sortedDispatches.length})
                        </span>
                        <div className="flex items-center gap-2">
                          {successCount > 0 && (
                            <span className="text-xs font-semibold text-emerald-700">
                              {successCount} sent
                            </span>
                          )}
                          {failedCount > 0 && (
                            <span className="text-xs font-semibold text-rose-700">
                              {failedCount} failed
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {sortedDispatches.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs">
                            No SMS dispatches recorded for this alert.
                          </div>
                        ) : (
                          sortedDispatches.map((sms, sIdx) => {
                            const isOk = isSmsSuccess(sms);
                            const errText = !isOk ? parseSmsError(sms) : null;
                            const officerName = sms.recipient_name || sms.engineer_name || selectedSmsItem.item.officer_name || "Assigned Engineer";
                            const officerRole = sms.recipient_role || selectedSmsItem.item.officer_role || "Superintending Engineer (SE)";
                            const mobile = sms.recipient_mobile || sms.mobile || selectedSmsItem.item.officer_mobile || null;
                            const initials = (officerName || "OF")
                              .split(" ")
                              .filter(Boolean)
                              .map((p: string) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase() || "OF";

                            return (
                              <div key={sms.id || sIdx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white text-xs font-bold shadow-2xs mt-0.5">
                                    {initials}
                                  </div>
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-slate-900 truncate">
                                        {officerName}
                                      </span>
                                      <span className="text-[10px] font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                        {officerRole}
                                      </span>
                                    </div>
                                    {sms.recipient_email && (
                                      <div className="text-[11px] text-slate-500 font-mono truncate">
                                        {sms.recipient_email}
                                      </div>
                                    )}
                                    {mobile && (
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <a
                                          href={`tel:${mobile}`}
                                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                        >
                                          <Phone className="h-3 w-3" />
                                          <span>+91 {mobile}</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col sm:items-end shrink-0 gap-1">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${isOk
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                    {isOk ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        Sent (200 OK)
                                      </>
                                    ) : (
                                      <>
                                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                        Failed {sms.gateway_status ? `(${sms.gateway_status})` : ''}
                                      </>
                                    )}
                                  </span>
                                  {errText && (
                                    <span className="text-[10.5px] font-semibold text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200 max-w-xs text-right truncate" title={errText}>
                                      {errText}
                                    </span>
                                  )}
                                  {sms.created_at && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {new Date(sms.created_at).toLocaleString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* DLT Gateway Notice */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-700 flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-indigo-600" />
                    TRAI DLT Gateway Audit Logs
                  </div>
                  <p>
                    Official JJM MVS alerts are routed through the DLT Govt SMS Gateway. Failed submissions indicate gateway balance exhaustion (HTTP 400 Insufficient Balance) or non-whitelisted recipient mobile numbers. All dispatch events are logged for state compliance.
                  </p>
                </div>
              </div>

              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <Button
                  size="sm"
                  variant="outline"
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
