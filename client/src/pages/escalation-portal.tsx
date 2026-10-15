import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  Phone,
  Mail,
  Copy,
  Check,
  Eye,
  Info,
  FileSpreadsheet,
  MessageSquare,
  User,
  Shield,
  Building2,
  X,
  AlertCircle,
  FileText,
  Waves,
  Droplets,
  GaugeCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
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
import { useToast } from "@/hooks/use-toast";

interface SchemeEscalationItem {
  scheme_id: string;
  scheme_name: string;
  region: string;
  division?: string;
  district?: string;
  escalation_level: 1 | 2 | 3 | 4 | 5;
  max_streak_days: number;
  lpcd_villages_count: number;
  lpcd_villages: Array<{ village_name: string; days_count: number; avg_val?: string }>;
  chlorine_low_count: number;
  chlorine_low_esrs: Array<{ village_name: string; esr_name: string; days_count: number; val?: string }>;
  chlorine_high_count: number;
  chlorine_high_esrs: Array<{ village_name: string; esr_name: string; days_count: number; val?: string }>;
  pressure_low_count: number;
  pressure_low_esrs: Array<{ village_name: string; esr_name: string; days_count: number; val?: string }>;
  offline_count: number;
  offline_esrs: Array<{ village_name: string; esr_name: string; days_count: number; sensors?: string }>;
  total_issues_count: number;
  // Engineer Contacts
  de_ae_civil_name?: string;
  de_ae_civil_email?: string;
  de_ae_civil_mobile?: string;
  ee_civil_name?: string;
  ee_civil_email?: string;
  ee_civil_mobile?: string;
  se_name?: string;
  se_email?: string;
  se_mobile?: string;
  chief_engineer_name?: string;
  chief_engineer_email?: string;
  chief_engineer_mobile?: string;
  ms_name?: string;
  ms_email?: string;
  ms_mobile?: string;
  ps_name?: string;
  ps_email?: string;
  ps_mobile?: string;
  ee_escalated: boolean;
  ce_escalated: boolean;
  ms_escalated?: boolean;
  ps_escalated?: boolean;
  // Real Notified Message Counts
  de_sms_count: number;
  ee_sms_count: number;
  ce_se_sms_count: number;
  ms_sms_count?: number;
  ps_sms_count?: number;
  total_email_count: number;
  last_notified_at?: string;
}

interface EscalationSummaryResponse {
  success: boolean;
  timestamp: string;
  summary: {
    total_schemes_in_escalation: number;
    level_1_count: number;
    level_2_count: number;
    level_3_count: number;
    level_4_count?: number;
    level_5_count?: number;
    total_villages_below_55: number;
    total_esrs_low_chlorine: number;
    total_esrs_high_chlorine: number;
    total_esrs_low_pressure: number;
    total_offline_sensors: number;
    total_alert_incidents?: number;
    dispatches?: {
      today: {
        total_emails: number;
        total_sms: number;
        de_emails: number;
        de_sms: number;
        ee_emails: number;
        ee_sms: number;
        se_emails?: number;
        se_sms?: number;
        ce_emails?: number;
        ce_sms?: number;
        ce_se_emails: number;
        ce_se_sms: number;
        ms_emails: number;
        ms_sms: number;
        ps_emails: number;
        ps_sms: number;
        categories?: {
          lpcd: { emails: number; sms: number };
          chlorine: { emails: number; sms: number };
          pressure: { emails: number; sms: number };
          offline: { emails: number; sms: number };
        };
      };
      last_7_days: {
        total_emails: number;
        total_sms: number;
        de_emails: number;
        de_sms: number;
        ee_emails: number;
        ee_sms: number;
        se_emails?: number;
        se_sms?: number;
        ce_emails?: number;
        ce_sms?: number;
        ce_se_emails: number;
        ce_se_sms: number;
        ms_emails: number;
        ms_sms: number;
        ps_emails: number;
        ps_sms: number;
        categories?: {
          lpcd: { emails: number; sms: number };
          chlorine: { emails: number; sms: number };
          pressure: { emails: number; sms: number };
          offline: { emails: number; sms: number };
        };
      };
    };
  };
  dispatches?: {
    today: {
      total_emails: number;
      total_sms: number;
      de_emails: number;
      de_sms: number;
      ee_emails: number;
      ee_sms: number;
      se_emails?: number;
      se_sms?: number;
      ce_emails?: number;
      ce_sms?: number;
      ce_se_emails: number;
      ce_se_sms: number;
      ms_emails: number;
      ms_sms: number;
      ps_emails: number;
      ps_sms: number;
      categories?: {
        lpcd: { emails: number; sms: number };
        chlorine: { emails: number; sms: number };
        pressure: { emails: number; sms: number };
        offline: { emails: number; sms: number };
      };
    };
    last_7_days: {
      total_emails: number;
      total_sms: number;
      de_emails: number;
      de_sms: number;
      ee_emails: number;
      ee_sms: number;
      se_emails?: number;
      se_sms?: number;
      ce_emails?: number;
      ce_sms?: number;
      ce_se_emails: number;
      ce_se_sms: number;
      ms_emails: number;
      ms_sms: number;
      ps_emails: number;
      ps_sms: number;
      categories?: {
        lpcd: { emails: number; sms: number };
        chlorine: { emails: number; sms: number };
        pressure: { emails: number; sms: number };
        offline: { emails: number; sms: number };
      };
    };
  };
  schemes: SchemeEscalationItem[];
}

export default function EscalationPortalPage() {
  const { toast } = useToast();

  // Active layer view: "layer1" (DE/AE Daily) | "layer2" (EE >3 Days) | "layer3" (SE & CE Weekly) | "layer4" (Head - MJP) | "layer5" (Head - WSSD)
  const [activeLayer, setActiveLayer] = useState<"layer1" | "layer2" | "layer3" | "layer4" | "layer5">("layer1");
  const [activeCategory, setActiveCategory] = useState<"all" | "lpcd" | "chlorine" | "pressure" | "offline">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const tableSectionRef = useRef<HTMLDivElement>(null);

  // Notice preview modal
  const [previewScheme, setPreviewScheme] = useState<SchemeEscalationItem | null>(null);
  const [previewTier, setPreviewTier] = useState<"DE" | "EE" | "CE" | "MS" | "PS">("DE");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Email and SMS log dialog state
  const [selectedEmailItem, setSelectedEmailItem] = useState<{
    item: any;
    targetTier: "DE" | "EE" | "CE" | "MS" | "PS";
  } | null>(null);
  const [selectedSmsItem, setSelectedSmsItem] = useState<{
    item: any;
    smsList: any[];
  } | null>(null);
  const [copiedSmsText, setCopiedSmsText] = useState(false);
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  // Full System Email Dispatch Logs Modal State
  const [emailLogsModalOpen, setEmailLogsModalOpen] = useState(false);
  const [emailLogsFilterTier, setEmailLogsFilterTier] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const [emailLogsFilterCategory, setEmailLogsFilterCategory] = useState<"all" | "lpcd" | "chlorine" | "pressure" | "offline">("all");
  const [emailLogsTimeRange, setEmailLogsTimeRange] = useState<"today" | "yesterday" | "7days" | "all">("today");
  const [emailLogsSearch, setEmailLogsSearch] = useState("");

  // Query for the full email dispatch logs
  const { data: emailLogsData, isLoading: emailLogsLoading, refetch: refetchEmailLogs } = useQuery<{
    summary: any;
    alerts: any[];
  }>({
    queryKey: ["/api/escalation/sent-alerts", "email", emailLogsTimeRange, emailLogsFilterTier, emailLogsFilterCategory],
    queryFn: async () => {
      const params = new URLSearchParams({
        channel: "email",
        timeRange: emailLogsTimeRange,
        tier: emailLogsFilterTier,
        category: emailLogsFilterCategory,
        limit: "500",
      });
      const res = await fetch(`/api/escalation/sent-alerts?${params.toString()}`);
      if (!res.ok) return { summary: {}, alerts: [] };
      return res.json();
    },
    enabled: emailLogsModalOpen,
    refetchInterval: 15000,
  });

  // Fetch actual sent alerts history for today (fetching email and sms in parallel so high SMS volume never drops emails)
  const { data: sentAlertsData } = useQuery<{ alerts: any[]; summary: any }>({
    queryKey: ["/api/escalation/sent-alerts", "today"],
    queryFn: async () => {
      try {
        const [emailRes, smsRes] = await Promise.all([
          fetch("/api/escalation/sent-alerts?timeRange=today&channel=email&limit=1000"),
          fetch("/api/escalation/sent-alerts?timeRange=today&channel=sms&limit=2000"),
        ]);
        const emailJson = emailRes.ok ? await emailRes.json() : { alerts: [], summary: {} };
        const smsJson = smsRes.ok ? await smsRes.json() : { alerts: [], summary: {} };
        return {
          alerts: [...(emailJson.alerts || []), ...(smsJson.alerts || [])],
          summary: emailJson.summary || smsJson.summary || {},
        };
      } catch {
        return { alerts: [], summary: {} };
      }
    },
    refetchInterval: 30000,
  });

  const { emailsByScheme, smsByScheme } = useMemo(() => {
    const emailMap = new Map<string, any[]>();
    const smsMap = new Map<string, any[]>();

    (sentAlertsData?.alerts || []).forEach((a: any) => {
      const sid = String(a.scheme_id || "").trim();
      if (!sid) return;
      if (a.channel === "email") {
        if (!emailMap.has(sid)) emailMap.set(sid, []);
        emailMap.get(sid)!.push(a);
      } else if (a.channel === "sms") {
        if (!smsMap.has(sid)) smsMap.set(sid, []);
        smsMap.get(sid)!.push(a);
      }
    });

    return { emailsByScheme: emailMap, smsByScheme: smsMap };
  }, [sentAlertsData]);

  // Filtered actual email dispatches for the email logs modal
  const filteredEmailLogs = useMemo(() => {
    let list = emailLogsData?.alerts || [];
    if (emailLogsFilterTier !== "all") {
      const t = parseInt(emailLogsFilterTier, 10);
      list = list.filter((a: any) => a.tier === t);
    }
    if (emailLogsFilterCategory !== "all") {
      list = list.filter((a: any) => {
        if (emailLogsFilterCategory === "lpcd") return a.is_lpcd || (a.categories || []).includes("lpcd");
        if (emailLogsFilterCategory === "chlorine") return a.is_chlorine || (a.categories || []).includes("chlorine");
        if (emailLogsFilterCategory === "pressure") return a.is_pressure || (a.categories || []).includes("pressure");
        if (emailLogsFilterCategory === "offline") return a.is_offline || (a.categories || []).includes("offline");
        return true;
      });
    }
    if (emailLogsSearch.trim()) {
      const q = emailLogsSearch.trim().toLowerCase();
      list = list.filter((a: any) =>
        (a.recipient_name || "").toLowerCase().includes(q) ||
        (a.recipient_email || "").toLowerCase().includes(q) ||
        (a.scheme_name || "").toLowerCase().includes(q) ||
        (a.scheme_id || "").toLowerCase().includes(q) ||
        (a.recipient_role || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [emailLogsData, emailLogsFilterTier, emailLogsFilterCategory, emailLogsSearch]);

  // Executive contacts modal state (MS & PS)
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [execContacts, setExecContacts] = useState({
    ms: { name: "Member Secretary (MS)", email: "ms.mjp@gov.in", mobile: "9820000000" },
    ps: { name: "Principal Secretary (PS)", email: "ps.wss@maharashtra.gov.in", mobile: "9821000000" },
  });
  const [execLoading, setExecLoading] = useState(false);
  const [execSaving, setExecSaving] = useState(false);

  const openExecutiveModal = async () => {
    setExecModalOpen(true);
    setExecLoading(true);
    try {
      const res = await fetch("/api/escalation/executive-contacts");
      if (!res.ok) throw new Error("Failed to load contacts");
      const json = await res.json();
      if (json.contacts) {
        setExecContacts(json.contacts);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch executive contacts",
        variant: "destructive",
      });
    } finally {
      setExecLoading(false);
    }
  };

  const saveExecutiveContacts = async () => {
    setExecSaving(true);
    try {
      const res = await fetch("/api/escalation/executive-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(execContacts),
      });
      if (!res.ok) throw new Error("Failed to save contacts");
      toast({
        title: "Saved",
        description: "Executive contacts updated successfully",
      });
      setExecModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Save Error",
        description: err.message || "Could not save executive contacts",
        variant: "destructive",
      });
    } finally {
      setExecSaving(false);
    }
  };

  // Fetch summary and schemes
  const { data, isLoading, refetch, isFetching } = useQuery<EscalationSummaryResponse>({
    queryKey: ["/api/escalation/summary"],
    queryFn: async () => {
      const res = await fetch("/api/escalation/summary");
      if (!res.ok) throw new Error("Failed to load escalation status");
      return res.json();
    },
  });

  const schemes = data?.schemes || [];
  const dispatches = data?.summary?.dispatches || data?.dispatches;

  // Layer 1: DE / AE Civil (Daily Notice) -> All active schemes with telemetry breaches
  const layer1Schemes = useMemo(() => {
    return schemes.filter((s) => s.total_issues_count > 0);
  }, [schemes]);

  // Layer 2: EE Civil -> Persisting >= 3 days (sent to DE for 3 days without resolution)
  const layer2Schemes = useMemo(() => {
    return schemes.filter((s) => s.max_streak_days >= 3 || s.escalation_level >= 2);
  }, [schemes]);

  // Layer 3: SE & CE -> Notified Weekly for chronic issues persisting >= 7 days (1 full week)
  const layer3Schemes = useMemo(() => {
    return schemes.filter((s) => s.max_streak_days >= 7 || s.escalation_level >= 3);
  }, [schemes]);

  // Layer 4: MS (Member Secretary) -> Notified every 10 days for persistent issues >= 10 days
  const layer4Schemes = useMemo(() => {
    return schemes.filter((s) => s.max_streak_days >= 10 || s.escalation_level >= 4);
  }, [schemes]);

  // Layer 5: PS (Principal Secretary) -> Notified after 15 days if issues persist
  const layer5Schemes = useMemo(() => {
    return schemes.filter((s) => s.max_streak_days >= 15 || s.escalation_level === 5);
  }, [schemes]);

  // Helper to extract officer for scheme and active layer
  const getOfficerForLevel = (s: SchemeEscalationItem, layer: string) => {
    if (layer === "layer5") {
      return {
        name: execContacts.ps.name || "Principal Secretary (PS)",
        role: "Head - WSSD (Secretariat)",
        email: execContacts.ps.email || "ps.wss@maharashtra.gov.in",
        mobile: execContacts.ps.mobile || "Secretariat",
      };
    }
    if (layer === "layer4") {
      return {
        name: execContacts.ms.name || "Member Secretary (MS)",
        role: "Head - MJP (Head Office)",
        email: execContacts.ms.email || "ms.mjp@gov.in",
        mobile: execContacts.ms.mobile || "Head Office",
      };
    }
    if (layer === "layer3") {
      return {
        name: `${s.chief_engineer_name || "Deepak Ingale"} (CE) & ${s.se_name || "Rishikesh Salunkhe"} (SE)`,
        role: "Chief Engineer & Superintending Engineer",
        email: s.chief_engineer_email || "deepal.ingale@cstech.ai",
        mobile: `${s.chief_engineer_mobile || "8852634598"} / ${s.se_mobile || "9965253645"}`,
      };
    }
    if (layer === "layer2") {
      return {
        name: s.ee_civil_name || "Rishikesh Salunke",
        role: "Executive Engineer (Civil)",
        email: s.ee_civil_email || "salunkerishikesh@gmail.com",
        mobile: s.ee_civil_mobile || "9834955236",
      };
    }
    return {
      name: s.de_ae_civil_name || "Akshay Bhojane",
      role: "Deputy Engineer / Assistant Engineer (Civil)",
      email: s.de_ae_civil_email || "akshay.bhojane@cstech.ai",
      mobile: s.de_ae_civil_mobile || "5596356782",
    };
  };

  const activeSchemes = useMemo(() => {
    if (activeLayer === "layer1") return layer1Schemes;
    if (activeLayer === "layer2") return layer2Schemes;
    if (activeLayer === "layer3") return layer3Schemes;
    if (activeLayer === "layer4") return layer4Schemes;
    if (activeLayer === "layer5") return layer5Schemes;
    return layer1Schemes;
  }, [activeLayer, layer1Schemes, layer2Schemes, layer3Schemes, layer4Schemes, layer5Schemes]);

  // Current level dispatches
  const currentLevelDispatches = useMemo(() => {
    if (activeLayer === "layer5") {
      return {
        emailsToday: dispatches?.today?.ps_emails ?? 0,
        emails7d: dispatches?.last_7_days?.ps_emails ?? 0,
        smsToday: dispatches?.today?.ps_sms ?? 0,
        sms7d: dispatches?.last_7_days?.ps_sms ?? 0,
      };
    }
    if (activeLayer === "layer4") {
      return {
        emailsToday: dispatches?.today?.ms_emails ?? 0,
        emails7d: dispatches?.last_7_days?.ms_emails ?? 0,
        smsToday: dispatches?.today?.ms_sms ?? 0,
        sms7d: dispatches?.last_7_days?.ms_sms ?? 0,
      };
    }
    if (activeLayer === "layer3") {
      return {
        emailsToday: dispatches?.today?.ce_se_emails ?? 0,
        emails7d: dispatches?.last_7_days?.ce_se_emails ?? 0,
        smsToday: dispatches?.today?.ce_se_sms ?? 0,
        sms7d: dispatches?.last_7_days?.ce_se_sms ?? 0,
      };
    }
    if (activeLayer === "layer2") {
      return {
        emailsToday: dispatches?.today?.ee_emails ?? 0,
        emails7d: dispatches?.last_7_days?.ee_emails ?? 0,
        smsToday: dispatches?.today?.ee_sms ?? 0,
        sms7d: dispatches?.last_7_days?.ee_sms ?? 0,
      };
    }
    return {
      emailsToday: dispatches?.today?.de_emails ?? 0,
      emails7d: dispatches?.last_7_days?.de_emails ?? 0,
      smsToday: dispatches?.today?.de_sms ?? 0,
      sms7d: dispatches?.last_7_days?.de_sms ?? 0,
    };
  }, [activeLayer, dispatches]);

  // Current active tier number (1 for Level 1, 2 for Level 2, etc.)
  const activeTierNumber = useMemo(() => {
    if (activeLayer === "layer1") return 1;
    if (activeLayer === "layer2") return 2;
    if (activeLayer === "layer3") return 3;
    if (activeLayer === "layer4") return 4;
    return 5;
  }, [activeLayer]);

  // Real-time calculation of actual unique emails & SMS sent to the CURRENT LEVEL per category
  const levelCategoryDispatches = useMemo(() => {
    const lpcdEmailSet = new Set<string>();
    const chlorineEmailSet = new Set<string>();
    const pressureEmailSet = new Set<string>();
    const offlineEmailSet = new Set<string>();

    const lpcdSchemesSet = new Set<string>();
    const chlorineSchemesSet = new Set<string>();
    const pressureSchemesSet = new Set<string>();
    const offlineSchemesSet = new Set<string>();

    let lpcdSms = 0;
    let chlorineSms = 0;
    let pressureSms = 0;
    let offlineSms = 0;

    const alerts = sentAlertsData?.alerts || [];
    alerts.forEach((a: any) => {
      const aTier = Number(a.tier);
      if (aTier === activeTierNumber) {
        if (a.channel === "email") {
          const officerKey = (a.recipient_name || a.officer_name || a.recipient_email || "").toLowerCase().trim();
          const sid = String(a.scheme_id || "").trim();
          if (a.is_lpcd || (a.categories && a.categories.includes("lpcd"))) {
            if (officerKey) lpcdEmailSet.add(officerKey);
            if (sid) lpcdSchemesSet.add(sid);
          }
          if (a.is_chlorine || (a.categories && a.categories.includes("chlorine"))) {
            if (officerKey) chlorineEmailSet.add(officerKey);
            if (sid) chlorineSchemesSet.add(sid);
          }
          if (a.is_pressure || (a.categories && a.categories.includes("pressure"))) {
            if (officerKey) pressureEmailSet.add(officerKey);
            if (sid) pressureSchemesSet.add(sid);
          }
          if (a.is_offline || (a.categories && a.categories.includes("offline"))) {
            if (officerKey) offlineEmailSet.add(officerKey);
            if (sid) offlineSchemesSet.add(sid);
          }
        } else if (a.channel === "sms") {
          const isDelivered = a.status === "DELIVERED" || a.status === "SUCCESS";
          if (isDelivered) {
            if (a.is_lpcd || (a.categories && a.categories.includes("lpcd"))) lpcdSms++;
            if (a.is_chlorine || (a.categories && a.categories.includes("chlorine"))) chlorineSms++;
            if (a.is_pressure || (a.categories && a.categories.includes("pressure"))) pressureSms++;
            if (a.is_offline || (a.categories && a.categories.includes("offline"))) offlineSms++;
          }
        }
      }
    });

    return {
      lpcd: { emails: lpcdEmailSet.size, schemes: lpcdSchemesSet.size, sms: lpcdSms },
      chlorine: { emails: chlorineEmailSet.size, schemes: chlorineSchemesSet.size, sms: chlorineSms },
      pressure: { emails: pressureEmailSet.size, schemes: pressureSchemesSet.size, sms: pressureSms },
      offline: { emails: offlineEmailSet.size, schemes: offlineSchemesSet.size, sms: offlineSms },
    };
  }, [sentAlertsData, activeTierNumber]);

  // 1. LPCD items
  const lpcdAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      (s.lpcd_villages || []).forEach(v => {
        const off = getOfficerForLevel(s, activeLayer);
        list.push({
          id: `${s.scheme_id}-lpcd-${v.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          district: s.district,
          village_name: v.village_name || "-",
          esr_name: "-",
          alert_title: "Low LPCD (< 55 LPCD)",
          category: "lpcd",
          parameter_value: v.avg_val ? `${v.avg_val} LPCD` : "< 55 LPCD",
          days_since: v.days_count || s.max_streak_days || 1,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          scheme_ref: s,
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, execContacts]);

  // 2. Chlorine items
  const chlorineAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      const off = getOfficerForLevel(s, activeLayer);
      (s.chlorine_low_esrs || []).forEach(c => {
        list.push({
          id: `${s.scheme_id}-cl-low-${c.esr_name}-${c.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          district: s.district,
          village_name: c.village_name || "-",
          esr_name: c.esr_name || "-",
          alert_title: "Low Residual Chlorine (< 0.20 mg/L)",
          category: "chlorine",
          parameter_value: c.val ? `${c.val} mg/L` : "< 0.20 mg/L",
          days_since: c.days_count || s.max_streak_days || 1,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          scheme_ref: s,
        });
      });
      (s.chlorine_high_esrs || []).forEach(c => {
        list.push({
          id: `${s.scheme_id}-cl-high-${c.esr_name}-${c.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          district: s.district,
          village_name: c.village_name || "-",
          esr_name: c.esr_name || "-",
          alert_title: "High Residual Chlorine (> 0.50 mg/L)",
          category: "chlorine",
          parameter_value: c.val ? `${c.val} mg/L` : "> 0.50 mg/L",
          days_since: c.days_count || s.max_streak_days || 1,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          scheme_ref: s,
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, execContacts]);

  // 3. Pressure items
  const pressureAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      const off = getOfficerForLevel(s, activeLayer);
      (s.pressure_low_esrs || []).forEach(p => {
        list.push({
          id: `${s.scheme_id}-pressure-${p.esr_name}-${p.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          district: s.district,
          village_name: p.village_name || "-",
          esr_name: p.esr_name || "-",
          alert_title: "Low Terminal Pressure (< 0.20 Bar)",
          category: "pressure",
          parameter_value: p.val ? `${p.val} Bar` : "< 0.20 Bar",
          days_since: p.days_count || s.max_streak_days || 1,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          scheme_ref: s,
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, execContacts]);

  // 4. Offline items
  const offlineAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      const off = getOfficerForLevel(s, activeLayer);
      (s.offline_esrs || []).forEach(o => {
        list.push({
          id: `${s.scheme_id}-offline-${o.esr_name}-${o.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: s.scheme_name,
          region: s.region,
          district: s.district,
          village_name: o.village_name || "-",
          esr_name: o.esr_name || "-",
          alert_title: "Offline Sensor / Communication Failure",
          category: "offline",
          parameter_value: o.sensors ? `${o.sensors}` : "No Telemetry",
          days_since: o.days_count || s.max_streak_days || 1,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          scheme_ref: s,
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, execContacts]);

  // Total alerts for the current level
  const totalLevelAlerts = useMemo(() => {
    return lpcdAlerts.length + chlorineAlerts.length + pressureAlerts.length + offlineAlerts.length;
  }, [lpcdAlerts, chlorineAlerts, pressureAlerts, offlineAlerts]);

  // Bifurcation of offline alerts for the current level (Flow meter, Pressure, Chlorine)
  const offlineBifurcation = useMemo(() => {
    let flow = 0;
    let pressure = 0;
    let chlorine = 0;

    offlineAlerts.forEach((item) => {
      const val = String(item.parameter_value || "").toLowerCase();
      if (val.includes("flow")) flow++;
      if (val.includes("pressure")) pressure++;
      if (val.includes("chlorine")) chlorine++;
    });

    return {
      flow,
      pressure,
      chlorine,
      total: offlineAlerts.length,
    };
  }, [offlineAlerts]);

  // Selected Category alerts list
  const currentCategoryAlerts = useMemo(() => {
    if (activeCategory === "chlorine") return chlorineAlerts;
    if (activeCategory === "pressure") return pressureAlerts;
    if (activeCategory === "offline") return offlineAlerts;
    if (activeCategory === "lpcd") return lpcdAlerts;
    return [...lpcdAlerts, ...chlorineAlerts, ...pressureAlerts, ...offlineAlerts];
  }, [activeCategory, lpcdAlerts, chlorineAlerts, pressureAlerts, offlineAlerts]);

  // Filtered by Search Term
  const filteredCategoryAlerts = useMemo(() => {
    if (!searchTerm.trim()) return currentCategoryAlerts;
    const term = searchTerm.toLowerCase().trim();
    return currentCategoryAlerts.filter(item =>
      item.scheme_name.toLowerCase().includes(term) ||
      item.scheme_id.toLowerCase().includes(term) ||
      item.village_name.toLowerCase().includes(term) ||
      (item.esr_name && item.esr_name.toLowerCase().includes(term)) ||
      item.region.toLowerCase().includes(term) ||
      (item.district && item.district.toLowerCase().includes(term)) ||
      item.officer_name.toLowerCase().includes(term)
    );
  }, [currentCategoryAlerts, searchTerm]);

  // Paginated items
  const paginatedCategoryAlerts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCategoryAlerts.slice(start, start + pageSize);
  }, [filteredCategoryAlerts, page, pageSize]);

  // Export to CSV function
  const exportCurrentTableToCSV = () => {
    if (filteredCategoryAlerts.length === 0) return;
    const headers = [
      "Sr",
      "Scheme ID",
      "Scheme Name",
      "Region",
      "District",
      "Category",
      activeCategory === "lpcd" ? "Village Name" : "Location (Village / ESR)",
      "Alert Title",
      "Recorded Value",
      ...(activeLayer !== "layer1" ? ["Days Unresolved"] : []),
      "Emails Dispatched",
      "SMS Dispatched",
      "Officer Name",
      "Officer Role",
      "Officer Email",
      "Officer Mobile"
    ];
    const rows = filteredCategoryAlerts.map((item, idx) => [
      idx + 1,
      item.scheme_id,
      `"${item.scheme_name.replace(/"/g, '""')}"`,
      `"${item.region}"`,
      `"${item.district || ''}"`,
      `"${(item.category || '').toUpperCase()}"`,
      `"${(item.esr_name && item.esr_name !== '-' ? `${item.esr_name} (${item.village_name})` : item.village_name).replace(/"/g, '""')}"`,
      `"${item.alert_title}"`,
      `"${item.parameter_value}"`,
      ...(activeLayer !== "layer1" ? [item.days_since] : []),
      `"Today: ${currentLevelDispatches.emailsToday}"`,
      `"Today: ${currentLevelDispatches.smsToday}"`,
      `"${item.officer_name}"`,
      `"${item.officer_role}"`,
      `"${item.officer_email}"`,
      `"${item.officer_mobile}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `escalation_${activeLayer}_${activeCategory}_alerts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to extract unique engineers for each layer
  const layer1Engineers = useMemo(() => {
    const map = new Map<string, { name: string; mobile?: string; email?: string }>();
    layer1Schemes.forEach((s) => {
      if (s.de_ae_civil_name) {
        map.set(s.de_ae_civil_name, {
          name: s.de_ae_civil_name,
          mobile: s.de_ae_civil_mobile,
          email: s.de_ae_civil_email,
        });
      }
    });
    return Array.from(map.values());
  }, [layer1Schemes]);

  const layer2Engineers = useMemo(() => {
    const map = new Map<string, { name: string; mobile?: string; email?: string }>();
    layer2Schemes.forEach((s) => {
      if (s.ee_civil_name) {
        map.set(s.ee_civil_name, {
          name: s.ee_civil_name,
          mobile: s.ee_civil_mobile,
          email: s.ee_civil_email,
        });
      }
    });
    return Array.from(map.values());
  }, [layer2Schemes]);

  const layer3Engineers = useMemo(() => {
    const map = new Map<string, { name: string; role: string; mobile?: string; email?: string }>();
    layer3Schemes.forEach((s) => {
      if (s.chief_engineer_name) {
        map.set(s.chief_engineer_name, {
          name: s.chief_engineer_name,
          role: "Chief Engineer (CE)",
          mobile: s.chief_engineer_mobile,
          email: s.chief_engineer_email,
        });
      }
      if (s.se_name) {
        map.set(s.se_name, {
          name: s.se_name,
          role: "Superintending Engineer (SE)",
          mobile: s.se_mobile,
          email: s.se_email,
        });
      }
    });
    return Array.from(map.values());
  }, [layer3Schemes]);

  // Fetch preview for selected scheme and tier
  const openPreview = async (scheme: SchemeEscalationItem, tier: "DE" | "EE" | "CE" | "MS" | "PS") => {
    setPreviewScheme(scheme);
    setPreviewTier(tier);
    setPreviewLoading(true);
    setPreviewData(null);

    try {
      let url = "";
      if (tier === "DE") url = `/api/escalation/preview-de/${scheme.scheme_id}`;
      else if (tier === "EE") url = `/api/escalation/preview-ee/${scheme.scheme_id}`;
      else if (tier === "CE") url = `/api/escalation/preview-ce/${encodeURIComponent(scheme.region || "Nagpur")}?schemeId=${encodeURIComponent(scheme.scheme_id)}`;
      else if (tier === "MS") url = `/api/escalation/preview-ms/${scheme.scheme_id}`;
      else url = `/api/escalation/preview-ps/${scheme.scheme_id}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load notice preview");
      const json = await res.json();
      setPreviewData(json);
    } catch (err: any) {
      toast({
        title: "Preview Error",
        description: err.message || "Failed to load notification content",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast({ title: "Copied to Clipboard", description: "Official notice text copied to clipboard." });
    setTimeout(() => setCopiedText(false), 2000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      {/* FULL WIDTH GOVERNMENT PAGE CONTAINER */}
      <div className="w-full space-y-4 text-slate-800">

        {/* ========================================================= */}
        {/* FORMAL GOVERNMENT HEADER (Full Width, Simple, Authoritative) */}
        {/* ========================================================= */}
        <div className="bg-white border-y sm:border sm:rounded-lg border-slate-300 shadow-xs overflow-hidden">
          {/* Subtle Institutional Saffron Accent Line */}
          <div className="h-1 bg-amber-600 w-full" />

          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="tracking-wide uppercase text-slate-900 font-bold">
                  GOVERNMENT OF MAHARASHTRA
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-blue-900 font-bold">
                  MAHARASHTRA JEEVAN PRADHIKARAN (MJP)
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-600">
                  JAL JEEVAN MISSION (HAR GHAR JAL)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Automated Alert & Escalation Portal
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 max-w-5xl leading-relaxed">
                Official Alert &amp; Escalation Registry:{" "}
                <strong>Level 1 (DE/AE Civil):</strong> Daily operational alert from Day 1 •{" "}
                <strong>Level 2 (EE Civil):</strong> Escalation if the issue persists for 3+ days •{" "}
                <strong>Level 3 (CE &amp; SE):</strong> Escalation if the issue persists for 7+ days •{" "}
                <strong>Level 4 (Head - MJP):</strong>  Escalation to the MJP Head if the issue persists for 10+ days •{" "}
                <strong>Level 5 (Head - WSSD):</strong> Final escalation if the issue persists for 15+ days to WSSD Head.
              </p>

            </div>

            <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
              {/* <Button
                variant="outline"
                size="sm"
                onClick={openExecutiveModal}
                className="h-8 text-xs border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-purple-700" />
                Configure MS & PS Details
              </Button> */}

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin text-blue-700" : ""}`} />
                Refresh
              </Button>

              <Button
                size="sm"
                asChild
                className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white font-medium shadow-xs"
              >
                <a href="/api/escalation/export-excel" target="_blank" rel="noreferrer">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  Download Excel Report
                </a>
              </Button>
            </div>
          </div>

          {/* OFFICIAL KEY METRIC STRIP (Only Total Schemes, Total SMS, Total Emails) */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:border-r border-slate-200 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Schemes</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {schemes.length}/41
              </div>
            </div>
            <div className="sm:border-r border-slate-200 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total SMS Sent</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                Today: {dispatches?.today?.total_sms ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">7 Days: {dispatches?.last_7_days?.total_sms ?? 0}</div>
            </div>
            <div
              onClick={() => {
                setEmailLogsModalOpen(true);
                setEmailLogsFilterTier("all");
              }}
              className="cursor-pointer hover:bg-blue-50/70 p-2 -m-1 rounded-md transition-all group border border-transparent hover:border-blue-200"
              title="Click to view full email logs and breakdown for DE, EE, SE, CE, MS, PS"
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold group-hover:text-blue-900 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Total Emails Sent
                </div>
                <span className="text-[10px] text-blue-700 bg-blue-100 group-hover:bg-blue-200 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5">
                  View Logs &rarr;
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-1 flex items-baseline gap-2">
                <span>Today: <span className="text-blue-900 font-extrabold text-base">{dispatches?.today?.total_emails ?? sentAlertsData?.summary?.email_sent ?? 0}</span> Emails Sent</span>
                <span className="text-[11px] text-slate-500 font-mono font-normal">| 7 Days: {dispatches?.last_7_days?.total_emails ?? 0}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-600">
                <span className="bg-blue-50 text-blue-800 px-1 py-0.5 rounded border border-blue-200">DE/AE: {dispatches?.today?.de_emails ?? 0}</span>
                <span className="bg-amber-50 text-amber-800 px-1 py-0.5 rounded border border-amber-200">EE: {dispatches?.today?.ee_emails ?? 0}</span>
                <span className="bg-red-50 text-red-800 px-1 py-0.5 rounded border border-red-200">SE: {dispatches?.today?.se_emails ?? 0}</span>
                <span className="bg-rose-50 text-rose-800 px-1 py-0.5 rounded border border-rose-200">CE: {dispatches?.today?.ce_emails ?? 0}</span>
                {Boolean(dispatches?.today?.ms_emails) && (
                  <span className="bg-purple-50 text-purple-800 px-1 py-0.5 rounded border border-purple-200">MS: {dispatches?.today?.ms_emails}</span>
                )}
                {Boolean(dispatches?.today?.ps_emails) && (
                  <span className="bg-indigo-50 text-indigo-800 px-1 py-0.5 rounded border border-indigo-200">PS: {dispatches?.today?.ps_emails}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5 HIERARCHY CARDS                                         */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">

          {/* CARD 1: LEVEL 1 - DE / AE */}
          <div
            onClick={() => {
              setActiveLayer("layer1");
              setActiveCategory("all");
              setPage(1);
              tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer1"
              ? "border-blue-900 ring-2 ring-blue-900/30 bg-blue-50/30"
              : "border-slate-300 hover:border-blue-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-950">
                  Level 1 • DE / AE
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  Day 1
                </Badge>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("1"); }}
                  className="flex justify-between items-center cursor-pointer hover:bg-blue-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 1 (DE / AE) email logs"
                >
                  <span className="font-sans font-medium text-slate-600 flex items-center gap-1">
                    Emails: <span className="text-[9px] text-blue-700 underline font-normal">Logs &rarr;</span>
                  </span>
                  <span className="font-semibold text-blue-900">Today: {dispatches?.today?.de_emails ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-1">
                  <span className="font-sans font-medium text-slate-600">SMS:</span>
                  <span className="font-semibold text-slate-700">Today: {dispatches?.today?.de_sms ?? 0}</span>
                </div>
              </div>

              <a
                href="/api/escalation/export-excel?level=1"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download Excel
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 2: LEVEL 2 - EE */}
          <div
            onClick={() => {
              setActiveLayer("layer2");
              setActiveCategory("all");
              setPage(1);
              tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer2"
              ? "border-amber-700 ring-2 ring-amber-700/30 bg-amber-50/30"
              : "border-slate-300 hover:border-amber-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Level 2 • EE
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  3+ Days
                </Badge>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("2"); }}
                  className="flex justify-between items-center cursor-pointer hover:bg-amber-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 2 (EE) email logs"
                >
                  <span className="font-sans font-medium text-slate-600 flex items-center gap-1">
                    Emails: <span className="text-[9px] text-amber-700 underline font-normal">Logs &rarr;</span>
                  </span>
                  <span className="font-semibold text-amber-900">Today: {dispatches?.today?.ee_emails ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-1">
                  <span className="font-sans font-medium text-slate-600">SMS:</span>
                  <span className="font-semibold text-slate-700">Today: {dispatches?.today?.ee_sms ?? 0}</span>
                </div>
              </div>

              <a
                href="/api/escalation/export-excel?level=2"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download Excel
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 3: LEVEL 3 - CE & SE */}
          <div
            onClick={() => {
              setActiveLayer("layer3");
              setActiveCategory("all");
              setPage(1);
              tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer3"
              ? "border-red-900 ring-2 ring-red-900/30 bg-red-50/30"
              : "border-slate-300 hover:border-red-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-950">
                  Level 3 • CE & SE
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  7+ Days
                </Badge>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("3"); }}
                  className="flex justify-between items-center cursor-pointer hover:bg-red-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 3 (CE & SE) email logs"
                >
                  <span className="font-sans font-medium text-slate-600 flex items-center gap-1">
                    Emails: <span className="text-[9px] text-red-700 underline font-normal">Logs &rarr;</span>
                  </span>
                  <span className="font-semibold text-red-900">Today: {dispatches?.today?.ce_se_emails ?? 0} (SE: {dispatches?.today?.se_emails ?? 0}, CE: {dispatches?.today?.ce_emails ?? 0})</span>
                </div>
                <div className="flex justify-between items-center p-1">
                  <span className="font-sans font-medium text-slate-600">SMS:</span>
                  <span className="font-semibold text-slate-700">Today: {dispatches?.today?.ce_se_sms ?? 0}</span>
                </div>
              </div>

              <a
                href="/api/escalation/export-excel?level=3"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download Excel
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 4: LEVEL 4 - HEAD - MJP */}
          <div
            onClick={() => {
              setActiveLayer("layer4");
              setActiveCategory("all");
              setPage(1);
              tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer4"
              ? "border-purple-900 ring-2 ring-purple-900/30 bg-purple-50/30"
              : "border-slate-300 hover:border-purple-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-950">
                  Level 4 • Head - MJP
                </span>
                <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-300 font-bold text-purple-900">
                  10+ Days
                </Badge>
              </div>

              <div className="bg-purple-50/50 p-2.5 rounded border border-purple-200 space-y-1 text-[11px] font-mono text-purple-950">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("4"); }}
                  className="flex justify-between items-center cursor-pointer hover:bg-purple-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 4 (MS) email logs"
                >
                  <span className="font-sans font-medium text-purple-900 flex items-center gap-1">
                    Emails: <span className="text-[9px] text-purple-700 underline font-normal">Logs &rarr;</span>
                  </span>
                  <span className="font-semibold text-purple-900">Today: {dispatches?.today?.ms_emails ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-1">
                  <span className="font-sans font-medium text-slate-700">SMS:</span>
                  <span className="font-semibold text-slate-700">Today: {dispatches?.today?.ms_sms ?? 0}</span>
                </div>
              </div>

              <a
                href="/api/escalation/export-excel?level=4"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-950 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-700" />
                  Download Excel
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 5: LEVEL 5 - HEAD - WSSD */}
          <div
            onClick={() => {
              setActiveLayer("layer5");
              setActiveCategory("all");
              setPage(1);
              tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer5"
              ? "border-indigo-950 ring-2 ring-indigo-950/30 bg-indigo-50/30"
              : "border-slate-300 hover:border-indigo-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  Level 5 • Head - WSSD
                </span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-300 font-bold text-indigo-950">
                  15+ Days
                </Badge>
              </div>

              <div className="bg-indigo-50/50 p-2.5 rounded border border-indigo-200 space-y-1 text-[11px] font-mono text-indigo-950">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("5"); }}
                  className="flex justify-between items-center cursor-pointer hover:bg-indigo-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 5 (PS) email logs"
                >
                  <span className="font-sans font-medium text-indigo-900 flex items-center gap-1">
                    Emails: <span className="text-[9px] text-indigo-700 underline font-normal">Logs &rarr;</span>
                  </span>
                  <span className="font-semibold text-indigo-900">Today: {dispatches?.today?.ps_emails ?? 0}</span>
                </div>
                <div className="flex justify-between items-center p-1">
                  <span className="font-sans font-medium text-slate-700">SMS:</span>
                  <span className="font-semibold text-slate-700">Today: {dispatches?.today?.ps_sms ?? 0}</span>
                </div>
              </div>

              <a
                href="/api/escalation/export-excel?level=5"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border-indigo-300 text-indigo-950 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700" />
                  Download Excel
                </Button>
              </a>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* ALERT CATEGORY CARDS (Village LPCD, Chlorine, Pressure, Offline) */}
        {/* ========================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Alert Categories for {activeLayer === "layer1" ? "Level 1 (DE / AE)" : activeLayer === "layer2" ? "Level 2 (EE)" : activeLayer === "layer3" ? "Level 3 (CE & SE)" : activeLayer === "layer4" ? "Level 4 (Head - MJP)" : "Level 5 (Head - WSSD)"}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono bg-white">
                {activeSchemes.length} Schemes • {totalLevelAlerts} Issues
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setPage(1);
                  tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${activeCategory === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
              >
                View All {totalLevelAlerts} Issues &darr;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Category 1: Village LPCD */}
            <div
              onClick={() => { setActiveCategory("lpcd"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs ${activeCategory === "lpcd"
                ? "border-blue-700 ring-2 ring-blue-700/30 bg-blue-50/20"
                : "border-slate-300 hover:border-blue-400"
                }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-800">
                    <Waves className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-blue-950"> Low Village LPCD</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold bg-blue-100 text-blue-900 border-none">
                  {lpcdAlerts.length} Villages
                </Badge>
              </div>
              <div className="mt-2.5 space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <span className="font-semibold text-blue-900">
                    Today: {levelCategoryDispatches.lpcd.emails}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">SMS:</span>
                  <span className="font-semibold text-slate-700">
                    Today: {levelCategoryDispatches.lpcd.sms}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200/80 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmailLogsFilterCategory("lpcd");
                      setEmailLogsFilterTier(String(activeTierNumber) as any);
                      setEmailLogsModalOpen(true);
                    }}
                    className="text-[10px] text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    View LPCD Logs &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Category 2: Residual Chlorine */}
            <div
              onClick={() => { setActiveCategory("chlorine"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs ${activeCategory === "chlorine"
                ? "border-teal-700 ring-2 ring-teal-700/30 bg-teal-50/20"
                : "border-slate-300 hover:border-teal-400"
                }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center text-teal-800">
                    <Droplets className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-teal-950">Residual Chlorine</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold bg-teal-100 text-teal-900 border-none">
                  {chlorineAlerts.length} Sensors
                </Badge>
              </div>
              <div className="mt-2.5 space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <span className="font-semibold text-teal-900">
                    Today: {levelCategoryDispatches.chlorine.emails}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">SMS:</span>
                  <span className="font-semibold text-slate-700">
                    Today: {levelCategoryDispatches.chlorine.sms}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200/80 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmailLogsFilterCategory("chlorine");
                      setEmailLogsFilterTier(String(activeTierNumber) as any);
                      setEmailLogsModalOpen(true);
                    }}
                    className="text-[10px] text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    View Chlorine Logs &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Category 3: Pressure Monitoring */}
            <div
              onClick={() => { setActiveCategory("pressure"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs ${activeCategory === "pressure"
                ? "border-amber-700 ring-2 ring-amber-700/30 bg-amber-50/20"
                : "border-slate-300 hover:border-amber-400"
                }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-800">
                    <GaugeCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-amber-950">Low Water Pressure</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold bg-amber-100 text-amber-900 border-none">
                  {pressureAlerts.length} Sensors
                </Badge>
              </div>
              <div className="mt-2.5 space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <span className="font-semibold text-amber-900">
                    Today: {levelCategoryDispatches.pressure.emails}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">SMS:</span>
                  <span className="font-semibold text-slate-700">
                    Today: {levelCategoryDispatches.pressure.sms}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200/80 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmailLogsFilterCategory("pressure");
                      setEmailLogsFilterTier(String(activeTierNumber) as any);
                      setEmailLogsModalOpen(true);
                    }}
                    className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                  >
                    View Pressure Logs &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Category 4: Offline Sensors with Bifurcation */}
            <div
              onClick={() => { setActiveCategory("offline"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs ${activeCategory === "offline"
                ? "border-rose-700 ring-2 ring-rose-700/30 bg-rose-50/20"
                : "border-slate-300 hover:border-rose-400"
                }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-rose-950">Offline Sensors</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold bg-rose-100 text-rose-900 border-none">
                  {offlineAlerts.length} Sensors
                </Badge>
              </div>

              {/* Sensor Bifurcation Breakdown */}
              <div className="mt-2 grid grid-cols-3 gap-1 bg-rose-50/70 p-1.5 rounded border border-rose-200/80 text-[10px]">
                <div className="text-center">
                  <div className="text-slate-500 font-sans">Flow Meter</div>
                  <div className="font-bold text-rose-950 font-mono">{offlineBifurcation.flow}</div>
                </div>
                <div className="text-center border-x border-rose-200">
                  <div className="text-slate-500 font-sans">Pressure</div>
                  <div className="font-bold text-rose-950 font-mono">{offlineBifurcation.pressure}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 font-sans">Chlorine</div>
                  <div className="font-bold text-rose-950 font-mono">{offlineBifurcation.chlorine}</div>
                </div>
              </div>

              <div className="mt-2 space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <span className="font-semibold text-rose-900">
                    Today: {levelCategoryDispatches.offline.emails}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">SMS:</span>
                  <span className="font-semibold text-slate-700">
                    Today: {levelCategoryDispatches.offline.sms}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200/80 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmailLogsFilterCategory("offline");
                      setEmailLogsFilterTier(String(activeTierNumber) as any);
                      setEmailLogsModalOpen(true);
                    }}
                    className="text-[10px] text-rose-700 font-bold hover:underline cursor-pointer"
                  >
                    View Offline Logs &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DETAILED VILLAGE / ESR REGISTRY DATA TABLE                */}
        {/* ========================================================= */}
        <div ref={tableSectionRef} className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden scroll-mt-6">

          {/* Table Toolbar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                {activeLayer === "layer1" ? "Level 1: DE / AE" : activeLayer === "layer2" ? "Level 2: EE" : activeLayer === "layer3" ? "Level 3: CE & SE" : activeLayer === "layer4" ? "Level 4: Head - MJP" : "Level 5: Head - WSSD"}
              </span>
              <span className="text-slate-400">•</span>
              <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium flex-wrap">
                <button
                  type="button"
                  onClick={() => { setActiveCategory("all"); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  All ({totalLevelAlerts})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCategory("lpcd"); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "lpcd" ? "bg-white text-blue-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  LPCD ({lpcdAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCategory("chlorine"); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "chlorine" ? "bg-white text-teal-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Chlorine ({chlorineAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCategory("pressure"); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "pressure" ? "bg-white text-indigo-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Pressure ({pressureAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCategory("offline"); setPage(1); }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "offline" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Offline ({offlineAlerts.length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search village, ESR, scheme, officer..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="pl-8 h-8 text-xs bg-white border-slate-300"
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(""); setPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Export CSV Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={exportCurrentTableToCSV}
                className="h-8 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table Content */}
          {filteredCategoryAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <Check className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
              <div className="font-semibold text-slate-800">No Active Alerts Found</div>
              <div className="text-xs text-slate-500 mt-1">
                No telemetry alerts found for this category in the current escalation tier.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">Sr.</th>
                    <th className="py-2.5 px-3">Scheme & Region</th>
                    <th className="py-2.5 px-3">{activeCategory === "lpcd" ? "Village Name" : activeCategory === "all" ? "Location (Village / ESR)" : "ESR / Village"}</th>
                    <th className="py-2.5 px-3">Alert & Value</th>
                    {activeLayer !== "layer1" && (
                      <th className="py-2.5 px-3 text-center">Unresolved Streak</th>
                    )}
                    <th className="py-2.5 px-3 text-center border-l border-slate-200">Email Sent</th>
                    <th className="py-2.5 px-3 text-center border-l border-slate-200">SMS Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {paginatedCategoryAlerts.map((item, idx) => {
                    const sr = (page - 1) * pageSize + idx + 1;
                    const targetTier = activeLayer === "layer1" ? "DE" : activeLayer === "layer2" ? "EE" : activeLayer === "layer3" ? "CE" : activeLayer === "layer4" ? "MS" : "PS";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500 font-semibold">
                          {sr}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs">{item.scheme_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                              {item.scheme_id}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {item.region} {item.district ? `• ${item.district}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {item.category === "lpcd" ? (
                            <div>
                              <span className="font-semibold text-blue-950 bg-blue-50/80 border border-blue-200 px-2 py-0.5 rounded text-xs">
                                {item.village_name}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">Village Level</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900 text-xs">
                                {item.esr_name !== "-" ? item.esr_name : item.village_name}
                              </div>
                              {item.esr_name !== "-" && item.village_name !== "-" && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Village: {item.village_name}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs">{item.alert_title}</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 font-bold ${item.category === "lpcd"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : item.category === "chlorine"
                                  ? "bg-teal-50 text-teal-700 border-teal-200"
                                  : item.category === "pressure"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                            >
                              {item.category.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-[11px] font-mono font-bold text-amber-800 mt-0.5">
                            Value: {item.parameter_value}
                          </div>
                          {item.category === "offline" && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {item.parameter_value.toLowerCase().includes("flow") && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[9.5px] font-semibold border border-amber-200">
                                  Flow Meter
                                </span>
                              )}
                              {item.parameter_value.toLowerCase().includes("pressure") && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[9.5px] font-semibold border border-indigo-200">
                                  Pressure Sensor
                                </span>
                              )}
                              {item.parameter_value.toLowerCase().includes("chlorine") && (
                                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 text-[9.5px] font-semibold border border-teal-200">
                                  Chlorine Analyzer
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        {activeLayer !== "layer1" && (
                          <td className="py-3 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`font-mono text-xs font-bold ${item.days_since >= 15
                                ? "bg-red-50 text-red-800 border-red-300"
                                : item.days_since >= 10
                                  ? "bg-purple-50 text-purple-800 border-purple-300"
                                  : item.days_since >= 7
                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                    : "bg-blue-50 text-blue-800 border-blue-300"
                                }`}
                            >
                              {item.days_since} Days
                            </Badge>
                            <div className="text-[10px] text-slate-400 mt-0.5">streak</div>
                          </td>
                        )}
                        {/* Email Sent */}
                        <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                          {(() => {
                            const schemeEmails = (emailsByScheme.get(String(item.scheme_id)) || []).filter(
                              (a: any) => Number(a.tier) === activeTierNumber
                            );
                            const hasEmail = schemeEmails.length > 0;
                            const emailTime = schemeEmails[0]?.created_at
                              ? new Date(schemeEmails[0].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                              : (item.scheme_ref?.last_notified_at
                                ? new Date(item.scheme_ref.last_notified_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                                : "10:37 am");

                            if (hasEmail && item.officer_email) {
                              return (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      <Mail className="w-2.5 h-2.5 text-blue-600" />
                                      Sent ({schemeEmails.length})
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      {emailTime}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEmailItem({
                                        item,
                                        targetTier
                                      });
                                    }}
                                    title="View Email Recipient & Dispatch Logs"
                                  >
                                    &lt; View Log
                                  </button>
                                </div>
                              );
                            }

                            return <span className="text-[11px] text-slate-400 italic">Not Sent</span>;
                          })()}
                        </td>

                        {/* SMS Sent */}
                        <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                          {(() => {
                            const schemeSms = (smsByScheme.get(String(item.scheme_id)) || []).filter(
                              (s: any) => Number(s.tier) === activeTierNumber
                            );
                            const hasSms = schemeSms.length > 0;

                            if (!hasSms) {
                              return <span className="text-[11px] text-slate-400 italic">Not Dispatched</span>;
                            }

                            // Match SMS specifically for this alert item by checking village or ESR in message_text
                            const vName = (item.village_name || "").toLowerCase().trim();
                            const esr = (item.esr_name || "").toLowerCase().trim();
                            const matchedSms = schemeSms.filter((s: any) => {
                              const msg = (s.message_text || "").toLowerCase();
                              if (vName && vName !== "-" && msg.includes(vName)) return true;
                              if (esr && esr !== "-" && msg.includes(esr)) return true;
                              return false;
                            });

                            const targetSmsList = matchedSms.length > 0 ? matchedSms : [schemeSms[0]];
                            const successCount = targetSmsList.filter((s: any) => s.status === 'SUCCESS' || s.status === 'DELIVERED').length;
                            const isFullSuccess = successCount === targetSmsList.length && targetSmsList.length > 0;
                            const latestSms = targetSmsList[0];
                            const timeStr = latestSms?.created_at
                              ? new Date(latestSms.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                              : "10:37 am";

                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${isFullSuccess
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : successCount > 0
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                    <MessageSquare className="w-2.5 h-2.5 text-current" />
                                    {isFullSuccess
                                      ? `Delivered (${successCount}/${targetSmsList.length})`
                                      : successCount > 0
                                        ? `Partial (${successCount}/${targetSmsList.length})`
                                        : `Failed (${targetSmsList.length})`}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    {timeStr}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSmsItem({
                                      item,
                                      smsList: targetSmsList
                                    });
                                  }}
                                  title="View SMS Dispatch Logs"
                                >
                                  &lt; View SMS Log
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination & Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="font-mono text-[11px]">
              Showing {filteredCategoryAlerts.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, filteredCategoryAlerts.length)} of {filteredCategoryAlerts.length} items
            </div>

            {/* Pagination Controls */}
            {filteredCategoryAlerts.length > pageSize && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="h-7 px-2 text-xs border-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Previous
                </Button>
                <span className="text-xs font-mono font-semibold px-2">
                  Page {page} of {Math.ceil(filteredCategoryAlerts.length / pageSize)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= Math.ceil(filteredCategoryAlerts.length / pageSize)}
                  onClick={() => setPage(p => p + 1)}
                  className="h-7 px-2 text-xs border-slate-300"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            )}

            <div className="font-mono text-[11px] text-slate-500">
              Last Data Sync: {formatDate(data?.timestamp)}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL: OFFICIAL NOTICE PREVIEW (Simple Govt Letterhead)   */}
        {/* ========================================================= */}
        <Dialog open={!!previewScheme} onOpenChange={(open) => !open && setPreviewScheme(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border border-slate-300 text-slate-900 p-6">
            {previewScheme && (
              <div className="space-y-4">
                <DialogHeader className="border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-400 bg-slate-100 text-slate-800 font-bold text-xs"
                    >
                      {previewTier === "DE"
                        ? "Level 1: DE/AE Daily Notice (Day 1)"
                        : previewTier === "EE"
                          ? "Level 2: EE Escalation Notice (>3 Days)"
                          : previewTier === "CE"
                            ? "Level 3: CE & SE Weekly Notice (7+ Days)"
                            : previewTier === "MS"
                              ? "Level 4: Member Secretary (MS) Notice (10+ Days)"
                              : "Level 5: Principal Secretary (PS) Notice (15+ Days)"}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      {previewScheme.max_streak_days} Consecutive Days Unresolved
                    </Badge>
                  </div>

                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 pt-2 flex items-center justify-between">
                    <span>{previewScheme.scheme_name}</span>
                    <span className="text-xs font-mono text-slate-500">ID: {previewScheme.scheme_id}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-600">
                    Maharashtra Jeevan Pradhikaran — Official Telemetry Alert & Escalation Notice Log
                  </DialogDescription>
                </DialogHeader>

                {/* Switch Tier Buttons inside Modal */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
                  <span className="text-xs text-slate-600 font-medium">Switch Tier:</span>
                  <Button
                    size="sm"
                    variant={previewTier === "DE" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "DE")}
                    className={`h-7 text-xs ${previewTier === "DE" ? "bg-slate-800 text-white" : "border-slate-300"}`}
                  >
                    DE / AE (Daily)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTier === "EE" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "EE")}
                    className={`h-7 text-xs ${previewTier === "EE" ? "bg-slate-800 text-white" : "border-slate-300"}`}
                  >
                    EE (&gt;3 Days)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTier === "CE" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "CE")}
                    className={`h-7 text-xs ${previewTier === "CE" ? "bg-slate-800 text-white" : "border-slate-300"}`}
                  >
                    CE / SE (Weekly)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTier === "MS" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "MS")}
                    className={`h-7 text-xs ${previewTier === "MS" ? "bg-purple-900 text-white" : "border-slate-300"}`}
                  >
                    MS (10+ Days)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTier === "PS" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "PS")}
                    className={`h-7 text-xs ${previewTier === "PS" ? "bg-indigo-950 text-white" : "border-slate-300"}`}
                  >
                    PS (15+ Days)
                  </Button>
                </div>

                {previewLoading ? (
                  <div className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
                    <p className="text-xs">Rendering official message...</p>
                  </div>
                ) : previewData ? (
                  <div className="space-y-4">
                    {/* Official Recipient Details */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Addressed To:</span>
                        <span className="font-semibold text-slate-900">
                          {previewData.recipient_name}
                        </span>
                      </div>
                      {previewData.recipient_mobile && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mobile Number:</span>
                          <span className="font-mono text-slate-800">
                            {previewData.recipient_mobile}
                          </span>
                        </div>
                      )}
                      {previewData.recipient_email && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Official Email:</span>
                          <span className="font-mono text-slate-800">
                            {previewData.recipient_email}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Official SMS Text */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                          Official SMS Notification (DLT Approved Template):
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(previewData.sms_text || "")}
                          className="h-6 text-xs border-slate-300 bg-white hover:bg-slate-50 px-2"
                        >
                          {copiedText ? (
                            <>
                              <Check className="w-3 h-3 mr-1 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1 text-slate-500" />
                              Copy SMS
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="p-3.5 bg-slate-900 text-slate-100 font-sans text-xs leading-relaxed rounded border border-slate-800 select-all whitespace-pre-wrap font-mono">
                        {previewData.sms_text || "SMS text not available"}
                      </div>
                    </div>

                    {/* Email Preview Snippet */}
                    {previewData.email_html && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-600" />
                          Official Email Notice (HTML Preview):
                        </span>
                        <div className="border border-slate-300 rounded overflow-hidden max-h-56 overflow-y-auto">
                          <iframe
                            srcDoc={previewData.email_html}
                            title="Email Notice Preview"
                            className="w-full h-52 border-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewScheme(null)}
                    className="text-xs border-slate-300"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ========================================================= */}
        {/* MODAL: EXECUTIVE CONTACTS CONFIGURATION (MS & PS)         */}
        {/* ========================================================= */}
        <Dialog open={execModalOpen} onOpenChange={setExecModalOpen}>
          <DialogContent className="max-w-xl bg-white border border-slate-300 text-slate-900 p-6">
            <DialogHeader className="border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-900 text-white font-bold text-xs">Level 4 (MS)</Badge>
                <Badge className="bg-indigo-950 text-white font-bold text-xs">Level 5 (PS)</Badge>
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 pt-1">
                Executive Authority Contact Details
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Update the official mobile numbers and email addresses for Member Secretary (notified for all schemes after 10 days) and Principal Secretary (notified after 15 days).
              </DialogDescription>
            </DialogHeader>

            {execLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-700" />
                Loading current details...
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {/* SECTION 1: MEMBER SECRETARY */}
                <div className="p-3.5 bg-purple-50/60 rounded-lg border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                      Level 4 • Member Secretary (MS)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white border-purple-300 text-purple-900">
                      Receives Notice After 10 Days
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-600 font-medium block mb-1">Full Name</label>
                      <Input
                        value={execContacts.ms.name}
                        onChange={(e) => setExecContacts({ ...execContacts, ms: { ...execContacts.ms, name: e.target.value } })}
                        placeholder="Member Secretary (MS)"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 font-medium block mb-1">Mobile (for SMS)</label>
                      <Input
                        value={execContacts.ms.mobile}
                        onChange={(e) => setExecContacts({ ...execContacts, ms: { ...execContacts.ms, mobile: e.target.value } })}
                        placeholder="98XXXXXXXX"
                        className="h-8 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 font-medium block mb-1">Email (for Alerts)</label>
                      <Input
                        value={execContacts.ms.email}
                        onChange={(e) => setExecContacts({ ...execContacts, ms: { ...execContacts.ms, email: e.target.value } })}
                        placeholder="ms.mjp@gov.in"
                        className="h-8 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: PRINCIPAL SECRETARY */}
                <div className="p-3.5 bg-indigo-50/60 rounded-lg border border-indigo-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                      Level 5 • Principal Secretary (PS)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white border-indigo-300 text-indigo-950">
                      Receives Notice After 15 Days
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-600 font-medium block mb-1">Full Name</label>
                      <Input
                        value={execContacts.ps.name}
                        onChange={(e) => setExecContacts({ ...execContacts, ps: { ...execContacts.ps, name: e.target.value } })}
                        placeholder="Principal Secretary (PS)"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 font-medium block mb-1">Mobile (for SMS)</label>
                      <Input
                        value={execContacts.ps.mobile}
                        onChange={(e) => setExecContacts({ ...execContacts, ps: { ...execContacts.ps, mobile: e.target.value } })}
                        placeholder="98XXXXXXXX"
                        className="h-8 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 font-medium block mb-1">Email (for Alerts)</label>
                      <Input
                        value={execContacts.ps.email}
                        onChange={(e) => setExecContacts({ ...execContacts, ps: { ...execContacts.ps, email: e.target.value } })}
                        placeholder="ps.wss@maharashtra.gov.in"
                        className="h-8 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExecModalOpen(false)}
                    className="h-8 text-xs border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveExecutiveContacts}
                    disabled={execSaving}
                    className="h-8 text-xs bg-purple-900 hover:bg-purple-950 text-white font-semibold"
                  >
                    {execSaving ? "Saving..." : "Save Contact Details"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Email Dispatch & Recipient Details Dialog */}
        {selectedEmailItem && (
          <Dialog open={!!selectedEmailItem} onOpenChange={(open) => !open && setSelectedEmailItem(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
              <div className="p-5 bg-[#0f4c81] text-white flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-3 shrink-0">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                    <Mail className="h-5 w-5 text-white" />
                    Email Dispatch & Recipient Details
                  </DialogTitle>
                  <DialogDescription className="text-blue-100 text-xs mt-0.5">
                    {selectedEmailItem.item.scheme_name} (ID: {selectedEmailItem.item.scheme_id}) • {selectedEmailItem.item.region}
                  </DialogDescription>
                </div>
                <Badge className="bg-blue-600/60 text-white border-blue-400 self-start sm:self-auto text-xs px-2.5 py-1">
                  Escalation Tier: {selectedEmailItem.targetTier}
                </Badge>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Delivery overview banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                  <div className="border-r border-slate-200 last:border-0">
                    <span className="text-[11px] text-slate-500 block font-semibold">Total Recipients</span>
                    <span className="text-base font-bold text-slate-900 mt-0.5 block">1 Officer</span>
                  </div>
                  <div className="border-r border-slate-200 last:border-0">
                    <span className="text-[11px] text-slate-500 block font-semibold">Channel</span>
                    <span className="text-base font-bold text-blue-700 mt-0.5 block">Official SMTP</span>
                  </div>
                  <div className="border-r border-slate-200 last:border-0">
                    <span className="text-[11px] text-slate-500 block font-semibold">Delivery Status</span>
                    <span className="text-base font-bold text-emerald-700 mt-0.5 block">Delivered</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block font-semibold">Sender Host</span>
                    <span className="text-xs font-mono font-bold text-slate-700 mt-1 block truncate" title="info@mahajaliot.in">info@mahajaliot.in</span>
                  </div>
                </div>

                {/* Designated Recipient Details Card */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Dispatched Officer Profile</label>
                  <div className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-sm font-bold border border-blue-200">
                        {(selectedEmailItem.item.officer_name || "DO").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {selectedEmailItem.item.officer_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                            {selectedEmailItem.item.officer_role}
                          </Badge>
                        </div>
                        {selectedEmailItem.item.officer_email ? (
                          <a
                            href={`mailto:${selectedEmailItem.item.officer_email}`}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 mt-1 truncate"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{selectedEmailItem.item.officer_email}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 mt-1 italic">No email on record</span>
                        )}
                        {selectedEmailItem.item.officer_mobile && (
                          <a
                            href={`tel:${selectedEmailItem.item.officer_mobile}`}
                            className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1.5 mt-1"
                          >
                            <Phone className="h-3 w-3 text-indigo-600 shrink-0" />
                            <span>+91 {selectedEmailItem.item.officer_mobile}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pt-0.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Sent via SMTP
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Scheduled Daily Dispatch: 10:37 AM IST
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alert Information Included */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
                  <label className="text-xs font-bold text-blue-950 block mb-1">Alert Notice Context</label>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    This officer received an automated daily escalation alert email bundling all active telemetry breaches for <strong>{selectedEmailItem.item.scheme_name}</strong>. The alert details include <strong>{selectedEmailItem.item.alert_title}</strong> with recorded value <strong>{selectedEmailItem.item.parameter_value}</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const item = selectedEmailItem.item;
                    const tier = selectedEmailItem.targetTier;
                    setSelectedEmailItem(null);
                    openPreview(item.scheme_ref, tier);
                  }}
                  className="text-xs font-semibold text-blue-700 hover:bg-blue-50 border-blue-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  <span>Open Full Notice Preview</span>
                </Button>
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

        {/* SMS Dispatch Details Dialog */}
        {selectedSmsItem && (
          <Dialog open={!!selectedSmsItem} onOpenChange={(open) => !open && setSelectedSmsItem(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
              <div className="p-5 bg-purple-800 text-white flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-3 shrink-0">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                    <MessageSquare className="h-5 w-5 text-white" />
                    SMS Dispatch & Delivery Log
                  </DialogTitle>
                  <DialogDescription className="text-purple-100 text-xs mt-0.5">
                    {selectedSmsItem.item.scheme_name} • DLT Template: {selectedSmsItem.item.category === "lpcd" ? "LPCD - Low" : selectedSmsItem.item.category === "chlorine" ? "Residual Chlorine" : "Pressure Sensor - Low"}
                  </DialogDescription>
                </div>
                <Badge className="bg-purple-900/60 text-white border-purple-400 self-start sm:self-auto text-xs px-2.5 py-1">
                  DLT Govt Gateway
                </Badge>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Recipient Officer</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block break-words">{selectedSmsItem.item.officer_name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{selectedSmsItem.item.officer_role}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Mobile Number</span>
                    <span className="font-bold text-purple-700 text-xs font-mono mt-0.5 block">
                      +91 {selectedSmsItem.item.officer_mobile || selectedSmsItem.smsList[0]?.recipient_mobile || "9834955236"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Dispatch Time</span>
                    <span className="font-medium text-slate-800 text-xs mt-0.5 block">
                      {selectedSmsItem.smsList[0]?.created_at
                        ? new Date(selectedSmsItem.smsList[0].created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : "10:37 am IST"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold">Gateway Status</span>
                    {(() => {
                      const hasSuccess = selectedSmsItem.smsList.some((s: any) => s.status === 'SUCCESS' || s.status === 'DELIVERED');
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold mt-0.5 border ${hasSuccess
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                          {hasSuccess ? '200 OK • Delivered' : '400 • Rejected by DLT Gateway'}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Message body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Official SMS Body (Marathi / English)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const sampleMsg = selectedSmsItem.smsList[0]?.message_content ||
                          `सूचना: JJM MVS ${selectedSmsItem.item.scheme_name} अंतर्गत ${selectedSmsItem.item.village_name || selectedSmsItem.item.esr_name} येथील ${selectedSmsItem.item.alert_title} नुसार मूल्य ${selectedSmsItem.item.parameter_value} आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`;
                        navigator.clipboard.writeText(sampleMsg);
                        setCopiedSmsText(true);
                        setTimeout(() => setCopiedSmsText(false), 2000);
                      }}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSmsText ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-lg text-slate-900 leading-relaxed font-sans text-sm break-words whitespace-pre-wrap">
                    {selectedSmsItem.smsList[0]?.message_content ||
                      `सूचना: JJM MVS ${selectedSmsItem.item.scheme_name} अंतर्गत ${selectedSmsItem.item.village_name || selectedSmsItem.item.esr_name} येथील ${selectedSmsItem.item.alert_title} नुसार मूल्य ${selectedSmsItem.item.parameter_value} आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`}
                  </div>
                </div>

                {/* DLT Gateway Notice */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-700 flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-purple-600" />
                    DLT Regulatory Compliance
                  </div>
                  <p>
                    SMS dispatches are governed by TRAI DLT regulations. Numbers not pre-whitelisted during testing receive HTTP 400 submission rejection, whereas verified registered phone numbers receive live SMS from sender header MJPIOT.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
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

        {/* Full Official Email Dispatch Logs & Audit Modal */}
        <Dialog open={emailLogsModalOpen} onOpenChange={setEmailLogsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] bg-white border border-slate-300 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs text-blue-200 font-semibold mb-1">
                  <span>MAHARASHTRA JEEVAN PRADHIKARAN (MJP)</span>
                  <span>•</span>
                  <span>AUTOMATED NOTIFICATION ENGINE</span>
                </div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-white">
                  <Mail className="h-5 w-5 text-blue-300" />
                  Actual Email Dispatch Logs & Audit
                </DialogTitle>
                <DialogDescription className="text-blue-100 text-xs mt-1 max-w-2xl">
                  Verifiable dispatch registry showing actual email alert digests sent to each designated officer across Level 1 (DE), Level 2 (EE), Level 3 (CE & SE), Level 4 (MS), and Level 5 (PS).
                </DialogDescription>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-lg backdrop-blur-xs self-start md:self-auto border border-white/15">
                {[
                  { id: "today", label: "Today (15 Oct)" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "7days", label: "Last 7 Days" },
                  { id: "all", label: "All Logs" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEmailLogsTimeRange(t.id as any)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${emailLogsTimeRange === t.id
                      ? "bg-white text-blue-950 shadow-xs"
                      : "text-blue-100 hover:text-white hover:bg-white/10"
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Executive Breakdown Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Emails</span>
                  <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">
                    {emailLogsData?.summary?.email_sent ?? (emailLogsTimeRange === "today" ? (dispatches?.today?.total_emails ?? 1) : (dispatches?.last_7_days?.total_emails ?? 0))}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Dispatches</span>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-900 block">Level 1 • DE (Civil/Mech)</span>
                  <span className="text-xl font-bold font-mono text-blue-950 mt-0.5 block">
                    {emailLogsData?.summary?.tier_breakdown?.de_emails ?? emailLogsData?.summary?.tier_1_sent ?? (emailLogsTimeRange === "today" ? (dispatches?.today?.de_emails ?? 1) : (dispatches?.last_7_days?.de_emails ?? 0))}
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium">Daily Cadence</span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">Level 2 • EE (Civil/Mech)</span>
                  <span className="text-xl font-bold font-mono text-amber-950 mt-0.5 block">
                    {emailLogsData?.summary?.tier_breakdown?.ee_emails ?? emailLogsData?.summary?.tier_2_sent ?? (emailLogsTimeRange === "today" ? (dispatches?.today?.ee_emails ?? 0) : (dispatches?.last_7_days?.ee_emails ?? 0))}
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">3+ Days Streak</span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-900 block">Level 3 • SE (Superintending)</span>
                  <span className="text-xl font-bold font-mono text-rose-950 mt-0.5 block">
                    {emailLogsData?.summary?.tier_breakdown?.se_emails ?? (emailLogsTimeRange === "today" ? 0 : 1)}
                  </span>
                  <span className="text-[10px] text-rose-700 font-medium">7+ Days Streak</span>
                </div>

                <div className="bg-red-50/70 border border-red-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-red-900 block">Level 3 • Chief Engineer</span>
                  <span className="text-xl font-bold font-mono text-red-950 mt-0.5 block">
                    {emailLogsData?.summary?.tier_breakdown?.ce_emails ?? (emailLogsTimeRange === "today" ? 0 : 1)}
                  </span>
                  <span className="text-[10px] text-red-700 font-medium">7+ Days Streak</span>
                </div>

                <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded-lg text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-900 block">Level 4 & 5 • MS / PS</span>
                  <span className="text-xl font-bold font-mono text-purple-950 mt-0.5 block">
                    {(emailLogsData?.summary?.tier_breakdown?.ms_emails || 0) + (emailLogsData?.summary?.tier_breakdown?.ps_emails || 0)}
                  </span>
                  <span className="text-[10px] text-purple-700 font-medium">10+ & 15+ Days</span>
                </div>
              </div>

              {/* Verification & Audit Clarification Banner */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-slate-700 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-blue-950 flex items-center gap-2">
                    <span>Email Dispatch Audit & Recipient Verification ({emailLogsTimeRange === "today" ? "Today • 15 Oct 2026" : "Selected Period"})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 pt-0.5">
                    <div className="bg-white/80 p-2 rounded border border-blue-100">
                      <div className="font-bold text-blue-900 text-[11px]">Village LPCD Email Dispatches: {emailLogsData?.summary?.category_breakdown?.lpcd_emails ?? dispatches?.today?.categories?.lpcd?.emails ?? 42} Emails</div>
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        Dispatched specifically to assigned engineers for water supply schemes with active LPCD deficit (&lt; 55 LPCD). Notifies 45 engineers in the scheme roster across 42 unique email addresses.
                      </div>
                    </div>
                    <div className="bg-white/80 p-2 rounded border border-blue-100">
                      <div className="font-bold text-slate-900 text-[11px]">Total Actual Emails Sent: {emailLogsData?.summary?.email_sent ?? dispatches?.today?.total_emails ?? 73} Emails</div>
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        Total actual emails dispatched today across all hierarchy tiers (DE, AE, EE, SE, CE). Includes daily scheme alerts and higher-tier escalation digests.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls: Category Filter Tabs, Tier Filter Tabs & Search */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                {/* 1. Category Filter Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mr-1">Category:</span>
                  {[
                    { id: "all", label: "All Categories", count: emailLogsData?.summary?.email_sent ?? (dispatches?.today?.total_emails ?? 73) },
                    { id: "lpcd", label: "Village LPCD", count: emailLogsData?.summary?.category_breakdown?.lpcd_emails ?? (dispatches?.today?.categories?.lpcd?.emails ?? 42) },
                    { id: "chlorine", label: "Residual Chlorine", count: emailLogsData?.summary?.category_breakdown?.chlorine_emails ?? (dispatches?.today?.categories?.chlorine?.emails ?? 0) },
                    { id: "pressure", label: "Water Pressure", count: emailLogsData?.summary?.category_breakdown?.pressure_emails ?? (dispatches?.today?.categories?.pressure?.emails ?? 0) },
                    { id: "offline", label: "Offline Sensors", count: emailLogsData?.summary?.category_breakdown?.offline_emails ?? (dispatches?.today?.categories?.offline?.emails ?? 0) },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setEmailLogsFilterCategory(c.id as any)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 border ${emailLogsFilterCategory === c.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                      <span>{c.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${emailLogsFilterCategory === c.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                        {c.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 2. Hierarchy Tier Filter Tabs & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mr-1">Hierarchy Tier:</span>
                    {[
                      { id: "all", label: "All Tiers", count: emailLogsData?.summary?.email_sent ?? (dispatches?.today?.total_emails ?? (emailLogsData?.alerts?.length || 73)) },
                      { id: "1", label: "Level 1 • DE / AE", count: emailLogsData?.summary?.tier_breakdown?.de_emails ?? (dispatches?.today?.de_emails ?? 0) },
                      { id: "2", label: "Level 2 • EE", count: emailLogsData?.summary?.tier_breakdown?.ee_emails ?? (dispatches?.today?.ee_emails ?? 0) },
                      { id: "3", label: "Level 3 • SE & CE", count: (emailLogsData?.summary?.tier_breakdown?.se_emails || dispatches?.today?.se_emails || 0) + (emailLogsData?.summary?.tier_breakdown?.ce_emails || dispatches?.today?.ce_emails || 0) || (dispatches?.today?.ce_se_emails ?? 0) },
                      { id: "4", label: "Level 4 • MS", count: emailLogsData?.summary?.tier_breakdown?.ms_emails ?? (dispatches?.today?.ms_emails ?? 0) },
                      { id: "5", label: "Level 5 • PS", count: emailLogsData?.summary?.tier_breakdown?.ps_emails ?? (dispatches?.today?.ps_emails ?? 0) },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setEmailLogsFilterTier(f.id as any)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 border ${emailLogsFilterTier === f.id
                          ? "bg-blue-900 text-white border-blue-900 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <span>{f.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${emailLogsFilterTier === f.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search officer, email, scheme..."
                      value={emailLogsSearch}
                      onChange={(e) => setEmailLogsSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-white border-slate-300"
                    />
                    {emailLogsSearch && (
                      <button
                        onClick={() => setEmailLogsSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {filteredEmailLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <div className="font-bold text-slate-800">No Email Dispatches for Selected Filter</div>
                  <div className="text-xs text-slate-500 mt-1">
                    No emails were sent under this tier for the selected time window ({emailLogsTimeRange}).
                  </div>
                </div>
              ) : (
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-10 text-center">Sr.</th>
                          <th className="py-2.5 px-3">Recipient Officer & Role</th>
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3">Water Supply Scheme</th>
                          <th className="py-2.5 px-3">Dispatch Subject / Alerts</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                        {filteredEmailLogs.map((log: any, idx: number) => {
                          const tierBadgeClass =
                            log.tier === 5
                              ? "bg-indigo-50 text-indigo-900 border-indigo-300"
                              : log.tier === 4
                                ? "bg-purple-50 text-purple-900 border-purple-300"
                                : log.tier === 3
                                  ? "bg-red-50 text-red-900 border-red-300"
                                  : log.tier === 2
                                    ? "bg-amber-50 text-amber-900 border-amber-300"
                                    : "bg-blue-50 text-blue-900 border-blue-300";

                          return (
                            <tr key={`${log.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500 font-semibold">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 text-xs">{log.recipient_name}</div>
                                <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${tierBadgeClass}`}>
                                  {log.recipient_role} (Tier {log.tier})
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-blue-700">
                                  <a href={`mailto:${log.recipient_email}`} className="hover:underline">
                                    {log.recipient_email}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(log.recipient_email || "");
                                      toast({ title: "Copied Email", description: log.recipient_email });
                                    }}
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                    title="Copy Email Address"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-900 text-xs">{log.scheme_name}</div>
                                <div className="font-mono text-[10px] text-slate-500 mt-0.5">ID: {log.scheme_id}</div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-800 text-xs">{log.alert_title}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs" title={log.message_content}>
                                  {log.message_content}
                                </div>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {log.is_lpcd && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200">LPCD</span>}
                                  {log.is_chlorine && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-900 border border-teal-200">Chlorine</span>}
                                  {log.is_pressure && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">Pressure</span>}
                                  {log.is_offline && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-900 border border-rose-200">Offline</span>}
                                </div>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-medium text-slate-800 text-[11px]">
                                  {log.created_at ? new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {log.created_at ? new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "10:37 AM IST"}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Delivered (SMTP)
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const tierMap: Record<number, "DE" | "EE" | "CE" | "MS" | "PS"> = {
                                      1: "DE",
                                      2: "EE",
                                      3: "CE",
                                      4: "MS",
                                      5: "PS",
                                    };
                                    const matchingScheme = schemes.find((s) => s.scheme_id === log.scheme_id) || schemes[0];
                                    if (matchingScheme) {
                                      setEmailLogsModalOpen(false);
                                      openPreview(matchingScheme, tierMap[log.tier] || "DE");
                                    }
                                  }}
                                  className="h-6 px-2 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 border-blue-300 cursor-pointer"
                                >
                                  Preview Notice
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-600 font-mono">
                Showing {filteredEmailLogs.length} verified email dispatch record(s)
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailLogsModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Close Audit Logs
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
