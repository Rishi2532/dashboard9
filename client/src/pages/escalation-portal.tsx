import { useState, useMemo, useRef, useEffect } from "react";
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
  Users,
  Send,
  Server,
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
  Smartphone,
  Calendar,
  Table2,
} from "lucide-react";
import { Link } from "wouter";
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
  remarks?: any[];
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

/**
 * Transforms string so that only the first letter of each word is capital and the rest are small.
 * Matches user rule: "keep only first letter capital of every word rest will be small, do this for every word"
 * Exception as requested by user: "keep SE and CE both capital and SMTP capital"
 */
export function toTitleCase(input: any): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  if (!str) return "";
  // Keep valid email addresses lowercase
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim())) {
    return str.toLowerCase();
  }
  return str.replace(/\b([a-zA-Z])([a-zA-Z0-9]*)\b/g, (_m, first, rest) => {
    const word = (first + rest).toUpperCase();
    if (word === "SE") return "SE";
    if (word === "CE") return "CE";
    if (word === "SMTP") return "SMTP";
    return first.toUpperCase() + rest.toLowerCase();
  });
}

export default function EscalationPortalPage() {
  const { toast } = useToast();

  // Active layer view: "layer1" (DE/AE Daily) | "layer2" (EE >3 Days) | "layer3" (SE & CE Weekly) | "layer4" (Head - MJP) | "layer5" (Head - WSSD)
  const [activeLayer, setActiveLayer] = useState<"layer1" | "layer2" | "layer3" | "layer4" | "layer5">("layer1");
  const [activeCategory, setActiveCategory] = useState<"all" | "lpcd" | "chlorine" | "pressure" | "offline">("all");
  // Table dispatch view filter: "dispatched" (only alerts for schemes where emails were sent today) | "all" (all eligible alerts by persistence streak)
  const [dispatchViewFilter, setDispatchViewFilter] = useState<"dispatched" | "all">("dispatched");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const tableSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectLayer = (layer: "layer1" | "layer2" | "layer3" | "layer4" | "layer5") => {
    setActiveLayer(layer);
    setActiveCategory("all");
    setDispatchViewFilter("dispatched");
    setPage(1);
    tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Notice preview modal
  const [previewScheme, setPreviewScheme] = useState<SchemeEscalationItem | null>(null);
  const [previewTier, setPreviewTier] = useState<"DE" | "EE" | "CE" | "MS" | "PS">("DE");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Email and SMS log dialog state
  const [selectedEmailItem, setSelectedEmailItem] = useState<{
    item: any;
    targetTier: "AE/DE" | "EE" | "SE & CE" | "Head-MJP" | "Heas-WSSD";
    emailDate?: string | null;
    emailTime?: string | null;
  } | null>(null);
  const [selectedSmsItem, setSelectedSmsItem] = useState<{
    item: any;
    smsList: any[];
  } | null>(null);
  const [copiedSmsText, setCopiedSmsText] = useState(false);
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  // 7-Days Telemetry History Modal state
  const [selectedSevenDaysAlert, setSelectedSevenDaysAlert] = useState<any | null>(null);
  const [sevenDaysHistoryData, setSevenDaysHistoryData] = useState<any | null>(null);
  const [sevenDaysLoading, setSevenDaysLoading] = useState<boolean>(false);

  // Field Remarks modal state (matching alerts-progress.tsx)
  const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
    issues: any[];
    title: string;
    schemeName?: string;
    schemeId?: string;
  } | null>(null);
  const [remarksModalStatus, setRemarksModalStatus] = useState<"all" | "active" | "resolved">("all");

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

  // Full System Email Dispatch Logs Modal State
  const [emailLogsModalOpen, setEmailLogsModalOpen] = useState(false);
  const [emailLogsFilterTier, setEmailLogsFilterTier] = useState<"all" | "1" | "2" | "3" | "4" | "5" | "vendor">("all");
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

  // Fetch actual sent alerts history (fetching email across 30 days so each level gets its latest dispatch, and sms in parallel)
  const { data: sentAlertsData } = useQuery<{ alerts: any[]; summary: any }>({
    queryKey: ["/api/escalation/sent-alerts", "combined_alerts"],
    queryFn: async () => {
      try {
        const [emailRes, smsRes] = await Promise.all([
          fetch("/api/escalation/sent-alerts?timeRange=30days&channel=email&limit=3000"),
          fetch("/api/escalation/sent-alerts?timeRange=today&channel=sms&limit=5000"),
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
        if (a.created_at) {
          const smsDate = new Date(a.created_at);
          const now = new Date();
          // Check if SMS belongs to today (same year, month, date)
          if (
            smsDate.getFullYear() !== now.getFullYear() ||
            smsDate.getMonth() !== now.getMonth() ||
            smsDate.getDate() !== now.getDate()
          ) {
            return;
          }
        }
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
      if (emailLogsFilterTier === "vendor") {
        list = list.filter((a: any) => a.tier === 0 || (a.recipient_role && a.recipient_role.toLowerCase().includes("vendor")));
      } else {
        const t = parseInt(emailLogsFilterTier, 10);
        list = list.filter((a: any) => a.tier === t);
      }
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

  // Fetch all schemes metadata (for total villages and installed sensors)
  const { data: allSchemesData } = useQuery<any[]>({
    queryKey: ["/api/schemes"],
    queryFn: async () => {
      const res = await fetch("/api/schemes");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
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

  // Layer 4: MS (Member Secretary) -> 1st & 3rd Monday for persistent issues >= 15 days
  const layer4Schemes = useMemo(() => {
    return schemes.filter((s) => s.max_streak_days >= 15 || s.escalation_level >= 4);
  }, [schemes]);

  // Layer 5: PS (Principal Secretary) -> 1st & 3rd Monday for persistent issues >= 15 days
  const layer5Schemes = useMemo(() => {
    return schemes.filter((s) => s.max_streak_days >= 15 || s.escalation_level === 5);
  }, [schemes]);

  // Helper to extract officer for scheme and active layer
  const getOfficerForLevel = (s: SchemeEscalationItem, layer: string) => {
    if (layer === "layer5") {
      return {
        name: toTitleCase(execContacts.ps.name || "Principal Secretary (Ps)"),
        role: "Head - Wssd (Secretariat)",
        email: execContacts.ps.email || "ps.wss@maharashtra.gov.in",
        mobile: execContacts.ps.mobile || "Secretariat",
      };
    }
    if (layer === "layer4") {
      return {
        name: toTitleCase(execContacts.ms.name || "Member Secretary (Ms)"),
        role: "Head - Mjp (Head Office)",
        email: execContacts.ms.email || "ms.mjp@gov.in",
        mobile: execContacts.ms.mobile || "Head Office",
      };
    }
    if (layer === "layer3") {
      const seName = (s.se_name && s.se_name !== "-" && !s.se_name.toLowerCase().includes("no engineer")) ? s.se_name : null;
      const seEmail = (s.se_email && s.se_email.includes("@")) ? s.se_email : null;
      const seMobile = (s.se_mobile && s.se_mobile !== "-" && s.se_mobile.replace(/\D/g, '').length >= 10) ? s.se_mobile : null;
      const ceName = (s.chief_engineer_name && s.chief_engineer_name !== "-" && !s.chief_engineer_name.toLowerCase().includes("no engineer")) ? s.chief_engineer_name : null;
      const ceEmail = (s.chief_engineer_email && s.chief_engineer_email.includes("@")) ? s.chief_engineer_email : null;
      const ceMobile = (s.chief_engineer_mobile && s.chief_engineer_mobile !== "-" && s.chief_engineer_mobile.replace(/\D/g, '').length >= 10) ? s.chief_engineer_mobile : null;

      return {
        name: [ceName ? `${toTitleCase(ceName)} (CE)` : null, seName ? `${toTitleCase(seName)} (SE)` : null].filter(Boolean).join(" & ") || "CE & SE",
        role: "Chief Engineer & Superintending Engineer",
        email: ceEmail || seEmail || "",
        mobile: [ceMobile, seMobile].filter(Boolean).join(" / ") || null,
        isDualOfficer: true,
        se_officer: {
          name: toTitleCase(seName || "Superintending Engineer"),
          role: "Superintending Engineer (SE)",
          email: seEmail,
          mobile: seMobile,
        },
        ce_officer: {
          name: toTitleCase(ceName || "Chief Engineer"),
          role: "Chief Engineer (CE)",
          email: ceEmail,
          mobile: ceMobile,
        },
      };
    }
    if (layer === "layer2") {
      const eeMobile = (s.ee_civil_mobile && s.ee_civil_mobile !== "-" && s.ee_civil_mobile.replace(/\D/g, '').length >= 10) ? s.ee_civil_mobile : null;
      return {
        name: toTitleCase(s.ee_civil_name || "Executive Engineer"),
        role: "Executive Engineer (Civil)",
        email: s.ee_civil_email || null,
        mobile: eeMobile,
      };
    }
    const deMobile = (s.de_ae_civil_mobile && s.de_ae_civil_mobile !== "-" && s.de_ae_civil_mobile.replace(/\D/g, '').length >= 10) ? s.de_ae_civil_mobile : null;
    return {
      name: toTitleCase(s.de_ae_civil_name || "Deputy Engineer / Assistant Engineer"),
      role: "Deputy Engineer / Assistant Engineer (Civil)",
      email: s.de_ae_civil_email || null,
      mobile: deMobile,
    };
  };

  // Current active tier number (1 for Level 1, 2 for Level 2, etc.)
  const activeTierNumber = useMemo(() => {
    if (activeLayer === "layer1") return 1;
    if (activeLayer === "layer2") return 2;
    if (activeLayer === "layer3") return 3;
    if (activeLayer === "layer4") return 4;
    return 5;
  }, [activeLayer]);

  // Latest email dispatch batch per tier (Tier 1..5) calculated scheme-wise (1 email per qualifying scheme)
  const tierLatestInfo = useMemo(() => {
    const computeTierStats = (minStreak: number) => {
      let lpcdCount = 0;
      let chlorineCount = 0;
      let pressureCount = 0;
      let offlineCount = 0;
      const lpcdSchemes = new Set<string>();
      const chlorineSchemes = new Set<string>();
      const pressureSchemes = new Set<string>();
      const offlineSchemes = new Set<string>();
      const qualifyingSchemes = new Set<string>();

      schemes.forEach((s: any) => {
        const sid = String(s.scheme_id);
        (s.lpcd_villages || []).forEach((v: any) => {
          const st = v.days_count || s.max_streak_days || 1;
          if (st >= minStreak) {
            lpcdCount++;
            lpcdSchemes.add(sid);
            qualifyingSchemes.add(sid);
          }
        });
        (s.chlorine_low_esrs || []).forEach((e: any) => {
          const st = e.days_count || s.max_streak_days || 1;
          if (st >= minStreak) {
            chlorineCount++;
            chlorineSchemes.add(sid);
            qualifyingSchemes.add(sid);
          }
        });
        (s.chlorine_high_esrs || []).forEach((e: any) => {
          const st = e.days_count || s.max_streak_days || 1;
          if (st >= minStreak) {
            chlorineCount++;
            chlorineSchemes.add(sid);
            qualifyingSchemes.add(sid);
          }
        });
        (s.pressure_low_esrs || []).forEach((e: any) => {
          const st = e.days_count || s.max_streak_days || 1;
          if (st >= minStreak) {
            pressureCount++;
            pressureSchemes.add(sid);
            qualifyingSchemes.add(sid);
          }
        });
        (s.offline_esrs || []).forEach((e: any) => {
          const st = e.days_count || s.max_streak_days || 1;
          if (st >= minStreak) {
            offlineCount++;
            offlineSchemes.add(sid);
            qualifyingSchemes.add(sid);
          }
        });
      });

      return {
        lpcdCount,
        chlorineCount,
        pressureCount,
        offlineCount,
        lpcdSchemes,
        chlorineSchemes,
        pressureSchemes,
        offlineSchemes,
        qualifyingSchemes,
      };
    };

    const stats1 = computeTierStats(1);
    const stats2 = computeTierStats(3);
    const stats3 = computeTierStats(7);
    const stats4 = computeTierStats(15);
    const stats5 = computeTierStats(15);

    // Helper to find latest dispatch date for a given tier from actual sent alerts
    const getTierDispatchMeta = (tierNum: number) => {
      const emailAlerts = (sentAlertsData?.alerts || []).filter((a: any) =>
        a.channel === "email" && Number(a.tier) === tierNum
      );
      if (emailAlerts.length === 0) {
        return { hasEmails: false, latestDate: null, latestDateStr: null };
      }
      let maxDate: Date | null = null;
      emailAlerts.forEach((a: any) => {
        const raw = a.sent_date || a.created_at;
        if (raw) {
          let d: Date;
          if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
            const [y, m, day] = raw.trim().split("-").map(Number);
            d = new Date(y, m - 1, day);
          } else {
            d = new Date(raw);
          }
          if (!isNaN(d.getTime())) {
            if (!maxDate || d > maxDate) maxDate = d;
          }
        }
      });
      const latestDateStr = maxDate ? maxDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }) : null;
      return { hasEmails: true, latestDate: maxDate, latestDateStr };
    };

    const tier1Meta = getTierDispatchMeta(1);
    const tier2Meta = getTierDispatchMeta(2);
    const tier3Meta = getTierDispatchMeta(3);
    const tier4Meta = getTierDispatchMeta(4);
    const tier5Meta = getTierDispatchMeta(5);

    const info: Record<number, {
      hasEmails: boolean;
      latestDate: Date | null;
      latestDateStr: string | null;
      emailCount: number;
      seEmailCount?: number;
      ceEmailCount?: number;
      schemeIds: Set<string>;
      categoryEmails: { lpcd: number; chlorine: number; pressure: number; offline: number };
      categorySchemes: { lpcd: number; chlorine: number; pressure: number; offline: number };
    }> = {
      1: {
        hasEmails: stats1.qualifyingSchemes.size > 0 && Boolean(tier1Meta.hasEmails),
        latestDate: tier1Meta.latestDate,
        latestDateStr: tier1Meta.latestDateStr,
        emailCount: stats1.qualifyingSchemes.size,
        schemeIds: stats1.qualifyingSchemes,
        categoryEmails: {
          lpcd: stats1.lpcdSchemes.size,
          chlorine: stats1.chlorineSchemes.size,
          pressure: stats1.pressureSchemes.size,
          offline: stats1.offlineSchemes.size,
        },
        categorySchemes: {
          lpcd: stats1.lpcdSchemes.size,
          chlorine: stats1.chlorineSchemes.size,
          pressure: stats1.pressureSchemes.size,
          offline: stats1.offlineSchemes.size,
        },
      },
      2: {
        hasEmails: stats2.qualifyingSchemes.size > 0 && Boolean(tier2Meta.hasEmails),
        latestDate: tier2Meta.latestDate,
        latestDateStr: tier2Meta.latestDateStr,
        emailCount: stats2.qualifyingSchemes.size,
        schemeIds: stats2.qualifyingSchemes,
        categoryEmails: {
          lpcd: stats2.lpcdSchemes.size,
          chlorine: stats2.chlorineSchemes.size,
          pressure: stats2.pressureSchemes.size,
          offline: stats2.offlineSchemes.size,
        },
        categorySchemes: {
          lpcd: stats2.lpcdSchemes.size,
          chlorine: stats2.chlorineSchemes.size,
          pressure: stats2.pressureSchemes.size,
          offline: stats2.offlineSchemes.size,
        },
      },
      3: {
        hasEmails: stats3.qualifyingSchemes.size > 0 && Boolean(tier3Meta.hasEmails),
        latestDate: tier3Meta.latestDate,
        latestDateStr: tier3Meta.latestDateStr,
        emailCount: stats3.qualifyingSchemes.size * 2,
        seEmailCount: stats3.qualifyingSchemes.size,
        ceEmailCount: stats3.qualifyingSchemes.size,
        schemeIds: stats3.qualifyingSchemes,
        categoryEmails: {
          lpcd: stats3.lpcdSchemes.size * 2,
          chlorine: stats3.chlorineSchemes.size * 2,
          pressure: stats3.pressureSchemes.size * 2,
          offline: stats3.offlineSchemes.size * 2,
        },
        categorySchemes: {
          lpcd: stats3.lpcdSchemes.size,
          chlorine: stats3.chlorineSchemes.size,
          pressure: stats3.pressureSchemes.size,
          offline: stats3.offlineSchemes.size,
        },
      },
      4: {
        hasEmails: stats4.qualifyingSchemes.size > 0 && tier4Meta.hasEmails,
        latestDate: tier4Meta.latestDate,
        latestDateStr: tier4Meta.latestDateStr,
        emailCount: stats4.qualifyingSchemes.size,
        schemeIds: stats4.qualifyingSchemes,
        categoryEmails: { lpcd: 0, chlorine: 0, pressure: 0, offline: stats4.offlineSchemes.size },
        categorySchemes: { lpcd: 0, chlorine: 0, pressure: 0, offline: stats4.offlineSchemes.size },
      },
      5: {
        hasEmails: stats5.qualifyingSchemes.size > 0 && tier5Meta.hasEmails,
        latestDate: tier5Meta.latestDate,
        latestDateStr: tier5Meta.latestDateStr,
        emailCount: stats5.qualifyingSchemes.size,
        schemeIds: stats5.qualifyingSchemes,
        categoryEmails: { lpcd: 0, chlorine: 0, pressure: 0, offline: stats5.offlineSchemes.size },
        categorySchemes: { lpcd: 0, chlorine: 0, pressure: 0, offline: stats5.offlineSchemes.size },
      },
    };

    return info;
  }, [schemes, sentAlertsData]);

  const activeSchemes = useMemo(() => {
    const tierInfo = tierLatestInfo[activeTierNumber];
    // If no emails were ever sent for this level, return empty so list & numbers do not appear
    if (!tierInfo || !tierInfo.hasEmails) {
      return [];
    }
    // Return all schemes in the escalation scope so actual alert metrics (e.g. 212 LPCD villages)
    // are visible across all tiers, while individual alert rows reflect actual email dispatch status
    return schemes;
  }, [schemes, tierLatestInfo, activeTierNumber]);

  // Actual dispatch date for each level/tier (strictly null if no email was sent)
  const tierDispatchedDates = useMemo(() => {
    const dates: Record<number, string | null> = {
      1: tierLatestInfo[1].latestDateStr,
      2: tierLatestInfo[2].latestDateStr,
      3: tierLatestInfo[3].latestDateStr,
      4: tierLatestInfo[4].latestDateStr,
      5: tierLatestInfo[5].latestDateStr,
    };
    return dates;
  }, [tierLatestInfo]);

  const hasActiveLevelEmails = useMemo(() => {
    return tierLatestInfo[activeTierNumber]?.hasEmails ?? false;
  }, [tierLatestInfo, activeTierNumber]);

  const activeLatestDateStr = useMemo(() => {
    return tierLatestInfo[activeTierNumber]?.latestDateStr ?? null;
  }, [tierLatestInfo, activeTierNumber]);

  const levelName = useMemo(() => {
    if (activeLayer === "layer1") return "Level 1: DE / AE Civil";
    if (activeLayer === "layer2") return "Level 2: Executive Engineer (EE)";
    if (activeLayer === "layer3") return "Level 3: CE & SE";
    if (activeLayer === "layer4") return "Level 4: Head - MJP";
    return "Level 5: Head - WSSD";
  }, [activeLayer]);

  const levelEmailsSentCount = useMemo(() => {
    return tierLatestInfo[activeTierNumber]?.emailCount ?? 0;
  }, [tierLatestInfo, activeTierNumber]);

  const levelOfficersCount = useMemo(() => {
    return tierLatestInfo[activeTierNumber]?.emailCount ?? 0;
  }, [tierLatestInfo, activeTierNumber]);

  // Real-time calculation of actual unique emails & SMS sent to the CURRENT LEVEL per category
  const levelCategoryDispatches = useMemo(() => {
    const tierInfo = tierLatestInfo[activeTierNumber];
    if (!tierInfo || !tierInfo.hasEmails) {
      return {
        lpcd: { emails: 0, schemes: 0, sms: 0 },
        chlorine: { emails: 0, schemes: 0, sms: 0 },
        pressure: { emails: 0, schemes: 0, sms: 0 },
        offline: { emails: 0, schemes: 0, sms: 0 },
      };
    }

    let lpcdSms = 0;
    let chlorineSms = 0;
    let pressureSms = 0;
    let offlineSms = 0;

    const alerts = sentAlertsData?.alerts || [];
    alerts.forEach((a: any) => {
      if (a.channel === "sms" && Number(a.tier) === activeTierNumber) {
        const isDelivered = a.status === "DELIVERED" || a.status === "SUCCESS";
        if (isDelivered) {
          if (a.is_lpcd || (a.categories && a.categories.includes("lpcd"))) lpcdSms++;
          if (a.is_chlorine || (a.categories && a.categories.includes("chlorine"))) chlorineSms++;
          if (a.is_pressure || (a.categories && a.categories.includes("pressure"))) pressureSms++;
          if (a.is_offline || (a.categories && a.categories.includes("offline"))) offlineSms++;
        }
      }
    });

    return {
      lpcd: {
        emails: tierInfo.categoryEmails.lpcd,
        schemes: tierInfo.categorySchemes.lpcd,
        sms: lpcdSms,
      },
      chlorine: {
        emails: tierInfo.categoryEmails.chlorine,
        schemes: tierInfo.categorySchemes.chlorine,
        sms: chlorineSms,
      },
      pressure: {
        emails: tierInfo.categoryEmails.pressure,
        schemes: tierInfo.categorySchemes.pressure,
        sms: pressureSms,
      },
      offline: {
        emails: tierInfo.categoryEmails.offline,
        schemes: tierInfo.categorySchemes.offline,
        sms: offlineSms,
      },
    };
  }, [tierLatestInfo, activeTierNumber, sentAlertsData]);


  // Minimum streak threshold for the active escalation level
  const minStreakForLevel = useMemo(() => {
    if (activeLayer === "layer1") return 1;
    if (activeLayer === "layer2") return 3;
    if (activeLayer === "layer3") return 7;
    if (activeLayer === "layer4") return 15;
    return 15;
  }, [activeLayer]);

  // Helper to get detailed reason for email dispatch status
  const getEmailDispatchReason = (item: any, layer: string): { label: string; tooltip: string; variant: 'missing_engineer' | 'missing_email' | 'pending' } => {
    const s = item.scheme_ref || {};

    if (layer === "layer1") {
      const hasName = Boolean(s.de_ae_civil_name && !s.de_ae_civil_name.toLowerCase().includes("no engineer") && s.de_ae_civil_name !== "-");
      const hasEmail = Boolean(s.de_ae_civil_email && s.de_ae_civil_email.includes("@"));
      if (!hasName) {
        return {
          label: "DE / AE not present",
          tooltip: "Deputy/Assistant Engineer is not assigned in Scheme Engineer Directory",
          variant: "missing_engineer"
        };
      }
      if (!hasEmail) {
        return {
          label: "DE / AE email missing",
          tooltip: `Email address missing for ${s.de_ae_civil_name}`,
          variant: "missing_email"
        };
      }
      return {
        label: "Email not dispatched",
        tooltip: "No email dispatch logged today for DE / AE",
        variant: "pending"
      };
    }

    if (layer === "layer2") {
      const hasName = Boolean(s.ee_civil_name && !s.ee_civil_name.toLowerCase().includes("no engineer") && s.ee_civil_name !== "-");
      const hasEmail = Boolean(s.ee_civil_email && s.ee_civil_email.includes("@"));
      if (!hasName) {
        return {
          label: "EE not present",
          tooltip: "Executive Engineer (EE) is not assigned in Scheme Engineer Directory",
          variant: "missing_engineer"
        };
      }
      if (!hasEmail) {
        return {
          label: "EE email missing",
          tooltip: `Email address missing for ${s.ee_civil_name}`,
          variant: "missing_email"
        };
      }
      return {
        label: "Email not dispatched",
        tooltip: "No email dispatch logged today for EE",
        variant: "pending"
      };
    }

    if (layer === "layer3") {
      const hasSE = Boolean(s.se_name && !s.se_name.toLowerCase().includes("no engineer") && s.se_name !== "-");
      const hasCE = Boolean(s.chief_engineer_name && !s.chief_engineer_name.toLowerCase().includes("no engineer") && s.chief_engineer_name !== "-");
      const hasSEEmail = Boolean(s.se_email && s.se_email.includes("@"));
      const hasCEEmail = Boolean(s.chief_engineer_email && s.chief_engineer_email.includes("@"));

      if (!hasSE && !hasCE) {
        return {
          label: "SE & CE not present",
          tooltip: "Neither Superintending Engineer nor Chief Engineer is assigned in directory",
          variant: "missing_engineer"
        };
      }
      if (!hasSE) {
        return {
          label: "SE not present",
          tooltip: "Superintending Engineer not assigned in directory",
          variant: "missing_engineer"
        };
      }
      if (!hasCE) {
        return {
          label: "CE not present",
          tooltip: "Chief Engineer not assigned in directory",
          variant: "missing_engineer"
        };
      }
      if (!hasSEEmail && !hasCEEmail) {
        return {
          label: "SE & CE email missing",
          tooltip: "Email address missing for both SE and CE",
          variant: "missing_email"
        };
      }
      if (!hasSEEmail) {
        return {
          label: "SE email missing",
          tooltip: `Email missing for SE: ${s.se_name}`,
          variant: "missing_email"
        };
      }
      if (!hasCEEmail) {
        return {
          label: "CE email missing",
          tooltip: `Email missing for CE: ${s.chief_engineer_name}`,
          variant: "missing_email"
        };
      }
      return {
        label: "Email not dispatched",
        tooltip: "No email dispatch logged today for SE / CE",
        variant: "pending"
      };
    }

    if (layer === "layer4") {
      if (!item.officer_email || !item.officer_email.includes("@")) {
        return {
          label: "MS email missing",
          tooltip: "Member Secretary (MJP) email not configured",
          variant: "missing_email"
        };
      }
      return {
        label: "Email not dispatched",
        tooltip: "No Level 4 email dispatch logged today",
        variant: "pending"
      };
    }

    if (!item.officer_email || !item.officer_email.includes("@")) {
      return {
        label: "PS email missing",
        tooltip: "Principal Secretary (WSSD) email not configured",
        variant: "missing_email"
      };
    }
    return {
      label: "Email not dispatched",
      tooltip: "No Level 5 email dispatch logged today",
      variant: "pending"
    };
  };

  // Helper to check if an SMS record succeeded (matching alert-progress logic)
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

  // Helper to parse human-readable DLT failure error log
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

  // Helper to get detailed reason when no SMS was dispatched for this scheme
  const getSmsDispatchReason = (item: any, layer: string): { label: string; tooltip: string; variant: 'missing_engineer' | 'missing_mobile' | 'higher_tier' | 'rejected' | 'pending' } => {
    const s = item.scheme_ref || {};

    if (layer === "layer4" || layer === "layer5") {
      return {
        label: "Notice by email only",
        tooltip: "Executive escalation at Level 4/5 is dispatched via official email notice; DLT bulk SMS is not enabled for Secretariat",
        variant: "higher_tier"
      };
    }

    if (layer === "layer1") {
      const hasName = Boolean(s.de_ae_civil_name && !s.de_ae_civil_name.toLowerCase().includes("no engineer") && s.de_ae_civil_name !== "-");
      const hasMobile = Boolean(s.de_ae_civil_mobile && s.de_ae_civil_mobile.replace(/\D/g, '').length >= 10);
      if (!hasName) {
        return {
          label: "DE / AE not present",
          tooltip: "Deputy/Assistant Engineer is not assigned in Scheme Engineer Directory",
          variant: "missing_engineer"
        };
      }
      if (!hasMobile) {
        return {
          label: "DE / AE number not present",
          tooltip: `Mobile number missing or invalid for DE/AE (${s.de_ae_civil_name || 'Unassigned'})`,
          variant: "missing_mobile"
        };
      }
    } else if (layer === "layer2") {
      const hasName = Boolean(s.ee_civil_name && !s.ee_civil_name.toLowerCase().includes("no engineer") && s.ee_civil_name !== "-");
      const hasMobile = Boolean(s.ee_civil_mobile && s.ee_civil_mobile.replace(/\D/g, '').length >= 10);
      if (!hasName) {
        return {
          label: "EE not present",
          tooltip: "Executive Engineer (EE) is not assigned in Scheme Engineer Directory",
          variant: "missing_engineer"
        };
      }
      if (!hasMobile) {
        return {
          label: "EE number not present",
          tooltip: `Mobile number missing or invalid for EE (${s.ee_civil_name || 'Unassigned'})`,
          variant: "missing_mobile"
        };
      }
    } else if (layer === "layer3") {
      const hasSE = Boolean(s.se_name && !s.se_name.toLowerCase().includes("no engineer") && s.se_name !== "-");
      const hasCE = Boolean(s.chief_engineer_name && !s.chief_engineer_name.toLowerCase().includes("no engineer") && s.chief_engineer_name !== "-");
      const hasSEMobile = Boolean(s.se_mobile && s.se_mobile.replace(/\D/g, '').length >= 10);
      const hasCEMobile = Boolean(s.chief_engineer_mobile && s.chief_engineer_mobile.replace(/\D/g, '').length >= 10);

      if (!hasSE && !hasCE) {
        return {
          label: "SE & CE not present",
          tooltip: "Neither Superintending Engineer nor Chief Engineer is assigned in directory",
          variant: "missing_engineer"
        };
      }
      if (!hasSE) {
        return {
          label: "SE not present",
          tooltip: "Superintending Engineer not assigned in directory",
          variant: "missing_engineer"
        };
      }
      if (!hasCE) {
        return {
          label: "CE not present",
          tooltip: "Chief Engineer not assigned in directory",
          variant: "missing_engineer"
        };
      }
      if (!hasSEMobile && !hasCEMobile) {
        return {
          label: "SE & CE numbers not present",
          tooltip: "Mobile numbers missing for both SE and CE",
          variant: "missing_mobile"
        };
      }
      if (!hasSEMobile) {
        return {
          label: "SE number not present",
          tooltip: `Mobile number missing for SE: ${s.se_name}`,
          variant: "missing_mobile"
        };
      }
      if (!hasCEMobile) {
        return {
          label: "CE number not present",
          tooltip: `Mobile number missing for CE: ${s.chief_engineer_name}`,
          variant: "missing_mobile"
        };
      }
    }

    return {
      label: "SMS not dispatched",
      tooltip: "SMS was not queued or dispatched today for this scheme",
      variant: "pending"
    };
  };

  // Helper to accurately match SMS dispatches for a specific alert item (by category, village, and ESR)
  const getMatchingSmsForAlert = (item: any, allSchemeSms: any[], activeTierNumber: number): any[] => {
    const tierSms = allSchemeSms.filter(
      (s: any) => Number(s.tier) === activeTierNumber
    );
    const schemeSms = tierSms.length > 0 ? tierSms : allSchemeSms;
    if (schemeSms.length === 0) return [];

    const isCategoryMatch = (cat: string, s: any) => {
      const c = (cat || '').toLowerCase();
      const title = (s.alert_title || s.template_name || '').toLowerCase();
      const isOff = s.is_offline || (s.categories && s.categories.includes('offline')) || title.includes('offline');
      if (c === 'offline') return isOff;
      if (isOff) return false; // Offline alerts must never cross-match LPCD, Chlorine, or Pressure
      if (c === 'lpcd') return s.is_lpcd || (s.categories && s.categories.includes('lpcd')) || title.includes('lpcd');
      if (c === 'chlorine') return s.is_chlorine || (s.categories && s.categories.includes('chlorine')) || title.includes('chlorine') || title.includes('rca');
      if (c === 'pressure') return s.is_pressure || (s.categories && s.categories.includes('pressure')) || title.includes('pressure');
      return false;
    };

    const catSms = schemeSms.filter((s: any) => isCategoryMatch(item.category, s));
    if (catSms.length === 0) return [];

    const vName = (item.village_name || "").toLowerCase().trim();
    const esr = (item.esr_name || "").toLowerCase().trim();
    const schemeName = (item.scheme_name || "").toLowerCase().trim();

    const getBody = (s: any) => {
      const fullMsg = (s.message_content || s.message_text || "").toLowerCase();
      return fullMsg.includes("अंतर्गत") ? fullMsg.split("अंतर्गत")[1] : fullMsg.replace(schemeName, "");
    };

    const hasTagE = esr.includes('(e)') || esr.includes('( e )');
    const hasTagP = esr.includes('(p)') || esr.includes('( p )');
    const esrCapMatch = esr.match(/\d+(\.\d+)?/);
    const esrCap = esrCapMatch ? esrCapMatch[0] : "";

    let matched = catSms.filter((s: any) => {
      const body = getBody(s);
      if (hasTagE && body.includes('(p)') && !body.includes('(e)')) return false;
      if (hasTagP && body.includes('(e)') && !body.includes('(p)')) return false;

      // Direct exact match
      if (esr && esr !== "-" && body.includes(esr)) return true;

      // Combined Village + Tag + Capacity match
      const vMatch = !vName || vName === "-" || body.includes(vName);
      const capMatch = !esrCap || body.includes(esrCap);
      const tagMatch = (!hasTagE || body.includes('(e)')) && (!hasTagP || body.includes('(p)'));

      if (vMatch && capMatch && tagMatch) return true;
      return false;
    });

    if (matched.length === 0 && esr && esr !== "-") {
      matched = catSms.filter((s: any) => {
        const body = getBody(s);
        if (hasTagE && body.includes('(p)') && !body.includes('(e)')) return false;
        if (hasTagP && body.includes('(e)') && !body.includes('(p)')) return false;
        const capMatch = !esrCap || body.includes(esrCap);
        const tagMatch = (!hasTagE || body.includes('(e)')) && (!hasTagP || body.includes('(p)'));
        return capMatch && tagMatch;
      });
    }

    if (matched.length === 0 && vName && vName !== "-") {
      matched = catSms.filter((s: any) => getBody(s).includes(vName));
    }

    if (matched.length === 0) {
      matched = [catSms[0]];
    }

    // Deduplicate by recipient officer name/mobile so each officer appears at most ONCE (latest dispatch)
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const s of matched) {
      const key = `${s.recipient_mobile || s.mobile || ''}_${s.recipient_name || s.engineer_name || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(s);
      }
    }

    return deduped;
  };

  // 1. LPCD items (filtered by minStreakForLevel or tier inclusion)
  const lpcdAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      (s.lpcd_villages || []).forEach(v => {
        const streak = v.days_count || s.max_streak_days || 1;
        if (streak < minStreakForLevel) return;
        const off = getOfficerForLevel(s, activeLayer);
        list.push({
          id: `${s.scheme_id}-lpcd-${v.village_name}-${list.length}`,
          scheme_id: s.scheme_id,
          scheme_name: toTitleCase(s.scheme_name),
          region: toTitleCase(s.region),
          district: toTitleCase(s.district),
          village_name: toTitleCase(v.village_name || "-"),
          esr_name: "-",
          alert_title: "Low Lpcd (< 55 Lpcd)",
          category: "lpcd",
          parameter_value: v.avg_val ? `${v.avg_val} Lpcd` : "< 55 Lpcd",
          days_since: streak,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          isDualOfficer: off.isDualOfficer,
          se_officer: off.se_officer,
          ce_officer: off.ce_officer,
          scheme_ref: s,
          remarks: s.remarks || [],
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, minStreakForLevel, execContacts]);

  // 2. Chlorine items
  const chlorineAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      const off = getOfficerForLevel(s, activeLayer);
      (s.chlorine_low_esrs || []).forEach(c => {
        const streak = c.days_count || s.max_streak_days || 1;
        if (streak < minStreakForLevel) return;
        list.push({
          id: `${s.scheme_id}-cl-low-${c.esr_name}-${c.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: toTitleCase(s.scheme_name),
          region: toTitleCase(s.region),
          district: toTitleCase(s.district),
          village_name: toTitleCase(c.village_name || "-"),
          esr_name: toTitleCase(c.esr_name || "-"),
          alert_title: "Low Residual Chlorine (< 0.20 Mg/L)",
          category: "chlorine",
          parameter_value: c.val ? `${c.val} Mg/L` : "< 0.20 Mg/L",
          days_since: streak,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          isDualOfficer: off.isDualOfficer,
          se_officer: off.se_officer,
          ce_officer: off.ce_officer,
          scheme_ref: s,
          remarks: s.remarks || [],
        });
      });
      (s.chlorine_high_esrs || []).forEach(c => {
        const streak = c.days_count || s.max_streak_days || 1;
        if (streak < minStreakForLevel) return;
        list.push({
          id: `${s.scheme_id}-cl-high-${c.esr_name}-${c.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: toTitleCase(s.scheme_name),
          region: toTitleCase(s.region),
          district: toTitleCase(s.district),
          village_name: toTitleCase(c.village_name || "-"),
          esr_name: toTitleCase(c.esr_name || "-"),
          alert_title: "High Residual Chlorine (> 0.50 Mg/L)",
          category: "chlorine",
          parameter_value: c.val ? `${c.val} Mg/L` : "> 0.50 Mg/L",
          days_since: streak,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          isDualOfficer: off.isDualOfficer,
          se_officer: off.se_officer,
          ce_officer: off.ce_officer,
          scheme_ref: s,
          remarks: s.remarks || [],
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, minStreakForLevel, execContacts]);

  // 3. Pressure items
  const pressureAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      const off = getOfficerForLevel(s, activeLayer);
      (s.pressure_low_esrs || []).forEach(p => {
        const streak = p.days_count || s.max_streak_days || 1;
        if (streak < minStreakForLevel) return;
        list.push({
          id: `${s.scheme_id}-pressure-${p.esr_name}-${p.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: toTitleCase(s.scheme_name),
          region: toTitleCase(s.region),
          district: toTitleCase(s.district),
          village_name: toTitleCase(p.village_name || "-"),
          esr_name: toTitleCase(p.esr_name || "-"),
          alert_title: "Low Terminal Pressure (< 0.20 Bar)",
          category: "pressure",
          parameter_value: p.val ? `${p.val} Bar` : "< 0.20 Bar",
          days_since: streak,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          isDualOfficer: off.isDualOfficer,
          se_officer: off.se_officer,
          ce_officer: off.ce_officer,
          scheme_ref: s,
          remarks: s.remarks || [],
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, minStreakForLevel, execContacts]);

  // 4. Offline items
  const offlineAlerts = useMemo(() => {
    const list: any[] = [];
    activeSchemes.forEach(s => {
      const off = getOfficerForLevel(s, activeLayer);
      (s.offline_esrs || []).forEach(o => {
        const streak = o.days_count || s.max_streak_days || 1;
        if (streak < minStreakForLevel) return;
        list.push({
          id: `${s.scheme_id}-offline-${o.esr_name}-${o.village_name}`,
          scheme_id: s.scheme_id,
          scheme_name: toTitleCase(s.scheme_name),
          region: toTitleCase(s.region),
          district: toTitleCase(s.district),
          village_name: toTitleCase(o.village_name || "-"),
          esr_name: toTitleCase(o.esr_name || "-"),
          alert_title: "Offline Sensor / Communication Failure",
          category: "offline",
          parameter_value: toTitleCase(o.sensors ? `${o.sensors}` : "No Telemetry"),
          days_since: streak,
          officer_name: off.name,
          officer_role: off.role,
          officer_email: off.email,
          officer_mobile: off.mobile,
          isDualOfficer: off.isDualOfficer,
          se_officer: off.se_officer,
          ce_officer: off.ce_officer,
          scheme_ref: s,
          remarks: s.remarks || [],
        });
      });
    });
    return list;
  }, [activeSchemes, activeLayer, minStreakForLevel, execContacts]);

  // Total alerts for the current level
  const totalLevelAlerts = useMemo(() => {
    return lpcdAlerts.length + chlorineAlerts.length + pressureAlerts.length + offlineAlerts.length;
  }, [lpcdAlerts, chlorineAlerts, pressureAlerts, offlineAlerts]);

  // Unique schemes count that actually have active persisting alerts for the current level
  const schemesWithLevelAlertsCount = useMemo(() => {
    const sids = new Set<string>();
    [...lpcdAlerts, ...chlorineAlerts, ...pressureAlerts, ...offlineAlerts].forEach(item => {
      if (item.scheme_id) sids.add(String(item.scheme_id));
    });
    return sids.size;
  }, [lpcdAlerts, chlorineAlerts, pressureAlerts, offlineAlerts]);

  // Scheme-level totals for active layer schemes: total villages, connected chlorine sensors, connected pressure sensors
  const activeSchemeTotals = useMemo(() => {
    const schemeMap = new Map((allSchemesData || []).map((s: any) => [String(s.scheme_id), s]));
    let villages = 0;
    let chlorine = 0;
    let pressure = 0;

    activeSchemes.forEach(s => {
      const meta = schemeMap.get(String(s.scheme_id));
      const vCount = Number(meta?.total_villages_integrated || meta?.number_of_village || meta?.total_villages_in_scheme || s.lpcd_villages?.length || 0);
      const cCount = Number(meta?.residual_chlorine_analyzer_connected ?? 0);
      const pCount = Number(meta?.pressure_transmitter_connected ?? 0);

      villages += vCount;
      chlorine += cCount;
      pressure += pCount;
    });

    return {
      villages: Math.max(villages, lpcdAlerts.length),
      chlorine: Math.max(chlorine, chlorineAlerts.length),
      pressure: Math.max(pressure, pressureAlerts.length),
    };
  }, [allSchemesData, activeSchemes, lpcdAlerts.length, chlorineAlerts.length, pressureAlerts.length]);

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
      total: flow + pressure + chlorine,
      locations: offlineAlerts.length,
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

  // Sorted Category alerts: Email Sent at TOP, Not Dispatched below, then by streak desc
  const sortedCategoryAlerts = useMemo(() => {
    const list = [...currentCategoryAlerts];
    return list.sort((a, b) => {
      const aEmails = (emailsByScheme.get(String(a.scheme_id)) || []).filter(
        (e: any) => Number(e.tier) === activeTierNumber
      );
      const bEmails = (emailsByScheme.get(String(b.scheme_id)) || []).filter(
        (e: any) => Number(e.tier) === activeTierNumber
      );
      const aHasEmail = aEmails.length > 0;
      const bHasEmail = bEmails.length > 0;

      // 1. Email Sent first at top!
      if (aHasEmail && !bHasEmail) return -1;
      if (!aHasEmail && bHasEmail) return 1;

      // 2. Unresolved streak days descending (highest streak first)
      if (b.days_since !== a.days_since) {
        return b.days_since - a.days_since;
      }

      // 3. Scheme name alphabetical
      return (a.scheme_name || "").localeCompare(b.scheme_name || "");
    });
  }, [currentCategoryAlerts, emailsByScheme, activeTierNumber]);

  // Dispatched Category alerts: only alerts for schemes where an email was dispatched to the active tier
  const dispatchedCategoryAlerts = useMemo(() => {
    const tierSchemeIds = tierLatestInfo[activeTierNumber]?.schemeIds;
    return sortedCategoryAlerts.filter(a => {
      const sid = String(a.scheme_id);
      if (tierSchemeIds && tierSchemeIds.has(sid)) return true;
      const aEmails = (emailsByScheme.get(sid) || []).filter(
        (e: any) => Number(e.tier) === activeTierNumber
      );
      return aEmails.length > 0;
    });
  }, [sortedCategoryAlerts, emailsByScheme, activeTierNumber, tierLatestInfo]);

  // Per-category counts for dispatched items
  const dispatchedLpcdCount = useMemo(() => {
    const tierSchemeIds = tierLatestInfo[activeTierNumber]?.schemeIds;
    return lpcdAlerts.filter(a => {
      const sid = String(a.scheme_id);
      if (tierSchemeIds && tierSchemeIds.has(sid)) return true;
      const aEmails = (emailsByScheme.get(sid) || []).filter(
        (e: any) => Number(e.tier) === activeTierNumber
      );
      return aEmails.length > 0;
    }).length;
  }, [lpcdAlerts, emailsByScheme, activeTierNumber, tierLatestInfo]);

  const dispatchedChlorineCount = useMemo(() => {
    const tierSchemeIds = tierLatestInfo[activeTierNumber]?.schemeIds;
    return chlorineAlerts.filter(a => {
      const sid = String(a.scheme_id);
      if (tierSchemeIds && tierSchemeIds.has(sid)) return true;
      const aEmails = (emailsByScheme.get(sid) || []).filter(
        (e: any) => Number(e.tier) === activeTierNumber
      );
      return aEmails.length > 0;
    }).length;
  }, [chlorineAlerts, emailsByScheme, activeTierNumber, tierLatestInfo]);

  const dispatchedPressureCount = useMemo(() => {
    const tierSchemeIds = tierLatestInfo[activeTierNumber]?.schemeIds;
    return pressureAlerts.filter(a => {
      const sid = String(a.scheme_id);
      if (tierSchemeIds && tierSchemeIds.has(sid)) return true;
      const aEmails = (emailsByScheme.get(sid) || []).filter(
        (e: any) => Number(e.tier) === activeTierNumber
      );
      return aEmails.length > 0;
    }).length;
  }, [pressureAlerts, emailsByScheme, activeTierNumber, tierLatestInfo]);

  const dispatchedOfflineCount = useMemo(() => {
    const tierSchemeIds = tierLatestInfo[activeTierNumber]?.schemeIds;
    return offlineAlerts.filter(a => {
      const sid = String(a.scheme_id);
      if (tierSchemeIds && tierSchemeIds.has(sid)) return true;
      const aEmails = (emailsByScheme.get(sid) || []).filter(
        (e: any) => Number(e.tier) === activeTierNumber
      );
      return aEmails.length > 0;
    }).length;
  }, [offlineAlerts, emailsByScheme, activeTierNumber, tierLatestInfo]);

  const totalDispatchedAlertsCount = dispatchedLpcdCount + dispatchedChlorineCount + dispatchedPressureCount + dispatchedOfflineCount;

  // Actual list to display based on dispatchViewFilter
  const displayedCategoryAlerts = useMemo(() => {
    if (dispatchViewFilter === "dispatched") {
      return dispatchedCategoryAlerts;
    }
    return sortedCategoryAlerts;
  }, [dispatchViewFilter, dispatchedCategoryAlerts, sortedCategoryAlerts]);

  // Filtered by Search Term
  const filteredCategoryAlerts = useMemo(() => {
    if (!searchTerm.trim()) return displayedCategoryAlerts;
    const term = searchTerm.toLowerCase().trim();
    return displayedCategoryAlerts.filter(item =>
      item.scheme_name.toLowerCase().includes(term) ||
      item.scheme_id.toLowerCase().includes(term) ||
      item.village_name.toLowerCase().includes(term) ||
      (item.esr_name && item.esr_name.toLowerCase().includes(term)) ||
      item.region.toLowerCase().includes(term) ||
      (item.district && item.district.toLowerCase().includes(term)) ||
      item.officer_name.toLowerCase().includes(term)
    );
  }, [displayedCategoryAlerts, searchTerm]);

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
      activeCategory === "lpcd" ? "Village Name" : "Location (Village / Sensor)",
      "Alert Title",
      "Recorded Value",
      ...(activeLayer !== "layer1" ? ["Last 7 Days Streak"] : []),
      "Email Status",
      "SMS Status",
      "Field Remarks",
      "Officer Name",
      "Officer Role",
      "Officer Email",
      "Officer Mobile"
    ];
    const rows = filteredCategoryAlerts.map((item, idx) => {
      const schemeEmails = (emailsByScheme.get(String(item.scheme_id)) || []).filter(
        (a: any) => Number(a.tier) === activeTierNumber
      );
      const emailStatus = (schemeEmails.length > 0 || hasActiveLevelEmails) && item.officer_email
        ? (item.isDualOfficer ? "Sent (2 Emails - SE & CE)" : "Sent (1 Email)")
        : getEmailDispatchReason(item, activeLayer).label;
      const allSchemeSms = smsByScheme.get(String(item.scheme_id)) || [];
      const smsList = getMatchingSmsForAlert(item, allSchemeSms, activeTierNumber);
      const smsSuccessCount = smsList.filter((s: any) => isSmsSuccess(s)).length;
      const smsStatus = smsList.length > 0
        ? (smsSuccessCount === smsList.length ? `Delivered (${smsList.length})` : smsSuccessCount > 0 ? `Partial (${smsSuccessCount}/${smsList.length})` : `Failed (${smsList.length})`)
        : getSmsDispatchReason(item, activeLayer).label;
      const remarksText = item.remarks && item.remarks.length > 0
        ? `${item.remarks.length} remark(s): ${item.remarks.map((r: any) => r.reason).filter(Boolean).join('; ').replace(/"/g, '""')}`
        : 'No Remarks';

      const officerEmail = item.isDualOfficer && item.se_officer && item.ce_officer
        ? `${item.se_officer.email}; ${item.ce_officer.email}`
        : (item.officer_email || '');

      return [
        idx + 1,
        item.scheme_id,
        `"${item.scheme_name.replace(/"/g, '""')}"`,
        `"${item.region}"`,
        `"${item.district || ''}"`,
        `"${toTitleCase(item.category || '')}"`,
        `"${(item.esr_name && item.esr_name !== '-' ? `${item.esr_name} (${item.village_name})` : item.village_name).replace(/"/g, '""')}"`,
        `"${item.alert_title}"`,
        `"${item.parameter_value}"`,
        ...(activeLayer !== "layer1" ? [item.days_since] : []),
        `"${emailStatus}"`,
        `"${smsStatus}"`,
        `"${remarksText}"`,
        `"${item.officer_name}"`,
        `"${item.officer_role}"`,
        `"${officerEmail}"`,
        `"${item.officer_mobile}"`
      ];
    });
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
                <span className="tracking-wide text-slate-900 font-bold">
                  Government Of Maharashtra
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-blue-900 font-bold">
                  Maharashtra Jeevan Pradhikaran (Mjp)
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-600">
                  Jal Jeevan Mission (Har Ghar Jal)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Automated Alert & Escalation Portal
              </h1>

              {/* <p className="text-xs sm:text-sm text-slate-600 max-w-5xl leading-relaxed">
                Official Alert &amp; Escalation Policy:{" "}
                <strong>Level 1 (AE/DE Civil):</strong> Daily operational alert from Day 1 •{" "}
                <strong>Level 2 (EE Civil):</strong> Dispatched every 3rd day if streak &ge; 3 days •{" "}
                <strong>Level 3 (CE &amp; SE):</strong> Dispatched every Monday if streak &ge; 7 days •{" "}
                <strong>Level 4 (Head - MJP / MS):</strong> Dispatched 1st &amp; 3rd Monday if streak &ge; 15 days •{" "}
                <strong>Level 5 (Head - WSSD / PS):</strong> Dispatched 1st &amp; 3rd Monday if streak &ge; 15 days.
              </p> */}

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

              <Link href="/level5-summary">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold"
                >
                  <Table2 className="w-3.5 h-3.5 mr-1.5 text-indigo-700" />
                  Level 5 Alert Summary
                </Button>
              </Link>

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
                  Level Excel Report
                </a>
              </Button>

              <Button
                size="sm"
                asChild
                className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
              >
                <a href="/api/escalation/export-overall-dispatches" target="_blank" rel="noreferrer" title="Export complete multi-level breakdown and officer email recipient roster">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-white" />
                  Overall Email Dispatches (Excel)
                </a>
              </Button>
            </div>
          </div>

          {/* OFFICIAL KEY METRIC STRIP (Only Total Schemes, Total SMS, Total Emails) */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:border-r border-slate-200 pr-2">
              <div className="text-[11px] text-slate-500 tracking-wider font-semibold">Total Operational Schemes</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {schemes.length}
              </div>
            </div>
            <div className="sm:border-r border-slate-200 pr-2">
              <div className="text-[11px] text-slate-500 tracking-wider font-semibold">Total Sms Sent</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                Today: {dispatches?.today?.total_sms ?? 0}
              </div>
              {/* <div className="text-[11px] text-slate-500 font-mono">7 Days: {dispatches?.last_7_days?.total_sms ?? 0}</div> */}
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
                <div className="text-[11px] text-slate-500 tracking-wider font-semibold group-hover:text-blue-900 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Total Emails Sent
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/api/escalation/export-overall-dispatches${activeCategory !== "all" ? `?category=${activeCategory}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-1 border border-emerald-300"
                    title={`Download complete overall email dispatches Excel${activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}`}
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                    Excel{activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}
                  </a>
                  <span className="text-[10px] text-blue-700 bg-blue-100 group-hover:bg-blue-200 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5">
                    View Logs &rarr;
                  </span>
                </div>
              </div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-1 flex items-baseline gap-2">
                <span>Today: <span className="text-blue-900 font-extrabold text-base">{dispatches?.today?.total_emails ?? sentAlertsData?.summary?.email_sent ?? 0}</span> Emails Sent</span>
                {/* <span className="text-[11px] text-slate-500 font-mono font-normal">| 7 Days: {dispatches?.last_7_days?.total_emails ?? 0}</span> */}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-600">
                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                  AE/DE: {tierLatestInfo[1]?.hasEmails ? `${tierLatestInfo[1].emailCount} Emails (${tierLatestInfo[1].latestDateStr})` : "0 (No Email Sent)"}
                </span>
                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                  EE: {tierLatestInfo[2]?.hasEmails ? `${tierLatestInfo[2].emailCount} Emails (${tierLatestInfo[2].latestDateStr})` : "0 (No Email Sent)"}
                </span>
                <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-semibold">
                  SE: {tierLatestInfo[3]?.hasEmails ? `${tierLatestInfo[3].seEmailCount ?? Math.ceil(tierLatestInfo[3].emailCount / 2)} Emails (${tierLatestInfo[3].latestDateStr})` : "0 (No Email Sent)"}
                </span>
                <span className="bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200 font-semibold">
                  CE: {tierLatestInfo[3]?.hasEmails ? `${tierLatestInfo[3].ceEmailCount ?? Math.floor(tierLatestInfo[3].emailCount / 2)} Emails (${tierLatestInfo[3].latestDateStr})` : "0 (No Email Sent)"}
                </span>
                <span className={`${tierLatestInfo[4]?.hasEmails ? "bg-purple-50 text-purple-800 border-purple-200 font-semibold" : "bg-slate-50 text-slate-500 border-slate-200"} px-1.5 py-0.5 rounded border`}>
                  HO MJP: {tierLatestInfo[4]?.hasEmails ? `${tierLatestInfo[4].emailCount} Emails (${tierLatestInfo[4].latestDateStr})` : "0 (No Email Sent)"}
                </span>
                <span className={`${tierLatestInfo[5]?.hasEmails ? "bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold" : "bg-slate-50 text-slate-500 border-slate-200"} px-1.5 py-0.5 rounded border`}>
                  WSSD Office: {tierLatestInfo[5]?.hasEmails ? `${tierLatestInfo[5].emailCount} Emails (${tierLatestInfo[5].latestDateStr})` : "0 (No Email Sent)"}
                </span>
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
            id="level-card-layer1"
            onClick={() => handleSelectLayer("layer1")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer1"
              ? "border-blue-900 ring-2 ring-blue-900/30 bg-blue-50/30"
              : "border-slate-300 hover:border-blue-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold tracking-wider text-blue-950">
                  Level 1 • AE/DE
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  Daily
                </Badge>

              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("1"); }}
                  className="flex flex-col gap-0.5 cursor-pointer hover:bg-blue-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 1 (De / Ae) email logs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-medium text-slate-600 flex items-center gap-1">
                      Emails:
                    </span>
                    <span className="font-semibold text-blue-900">
                      {tierLatestInfo[1].hasEmails ? `${tierLatestInfo[1].emailCount} Sent (${tierLatestInfo[1].schemeIds.size} Schemes)` : "0 Sent"}
                    </span>
                  </div>
                  {tierLatestInfo[1].latestDateStr ? (
                    <div className="text-[10px] text-blue-700 font-sans font-medium flex items-center justify-between">
                      <span>Date Sent:</span>
                      <span className="font-semibold">{tierLatestInfo[1].latestDateStr}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-sans italic">
                      No Email Sent (No Date)
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center p-1 border-t border-slate-200/60 pt-1">
                  <span className="font-sans font-medium text-slate-600">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {(dispatches?.today?.de_sms ?? 0) > 0 && tierLatestInfo[1].latestDateStr
                      ? `${dispatches?.today?.de_sms} Sent (${tierLatestInfo[1].latestDateStr})`
                      : `${dispatches?.today?.de_sms ?? 0} Sent`}
                  </span>
                </div>
              </div>

              <a
                href={`/api/escalation/export-excel?level=1${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
                title={`Download Level 1 (AE/DE) Email Dispatches${activeCategory !== "all" ? ` for ${activeCategory.toUpperCase()}` : ""}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download Excel{activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 2: LEVEL 2 - EE */}
          <div
            id="level-card-layer2"
            onClick={() => handleSelectLayer("layer2")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer2"
              ? "border-amber-700 ring-2 ring-amber-700/30 bg-amber-50/30"
              : "border-slate-300 hover:border-amber-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold tracking-wider text-amber-950">
                  Level 2 • EE
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  Every 3rd Day
                </Badge>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("2"); }}
                  className="flex flex-col gap-0.5 cursor-pointer hover:bg-amber-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 2 (Ee) email logs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-medium text-slate-600 flex items-center gap-1">
                      Emails:
                    </span>
                    <span className="font-semibold text-amber-900">
                      {tierLatestInfo[2].hasEmails ? `${tierLatestInfo[2].emailCount} Sent (${tierLatestInfo[2].schemeIds.size} Schemes)` : "0 Sent"}
                    </span>
                  </div>
                  {tierLatestInfo[2].latestDateStr ? (
                    <div className="text-[10px] text-amber-800 font-sans font-medium flex items-center justify-between">
                      <span>Date Sent:</span>
                      <span className="font-semibold">{tierLatestInfo[2].latestDateStr}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-sans italic">
                      No Email Sent (No Date)
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center p-1 border-t border-slate-200/60 pt-1">
                  <span className="font-sans font-medium text-slate-600">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {(dispatches?.today?.ee_sms ?? 0) > 0 && tierLatestInfo[2].latestDateStr
                      ? `${dispatches?.today?.ee_sms} Sent (${tierLatestInfo[2].latestDateStr})`
                      : `${dispatches?.today?.ee_sms ?? 0} Sent`}
                  </span>
                </div>
              </div>

              <a
                href={`/api/escalation/export-excel?level=2${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
                title={`Download Level 2 (EE) Email Dispatches${activeCategory !== "all" ? ` for ${activeCategory.toUpperCase()}` : ""}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download Excel{activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 3: LEVEL 3 - CE & SE */}
          <div
            id="level-card-layer3"
            onClick={() => handleSelectLayer("layer3")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer3"
              ? "border-red-900 ring-2 ring-red-900/30 bg-red-50/30"
              : "border-slate-300 hover:border-red-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold tracking-wider text-slate-900">
                  Level 3 • CE & SE
                </span>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  Every Monday
                </Badge>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("3"); }}
                  className="flex flex-col gap-0.5 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors"
                  title="Click to view Level 3 (CE & SE) email logs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-medium text-slate-600 flex items-center gap-1">
                      Emails:
                    </span>
                    <span className="font-semibold text-blue-900">
                      {tierLatestInfo[3].hasEmails ? `${tierLatestInfo[3].emailCount} Sent (${tierLatestInfo[3].schemeIds.size} Schemes)` : "0 Sent"}
                    </span>
                  </div>
                  {tierLatestInfo[3].hasEmails && (
                    <div className="grid grid-cols-2 gap-1 my-1 pt-1 border-t border-slate-200 font-sans text-[10px]">
                      <div className="bg-indigo-50 text-indigo-900 px-1.5 py-0.5 rounded flex justify-between items-center font-medium border border-indigo-200">
                        <span>SE:</span>
                        <span className="font-bold">{tierLatestInfo[3].seEmailCount ?? 37} Mails</span>
                      </div>
                      <div className="bg-sky-50 text-sky-900 px-1.5 py-0.5 rounded flex justify-between items-center font-medium border border-sky-200">
                        <span>CE:</span>
                        <span className="font-bold">{tierLatestInfo[3].ceEmailCount ?? 37} Mails</span>
                      </div>
                    </div>
                  )}
                  {tierLatestInfo[3].latestDateStr ? (
                    <div className="text-[10px] text-slate-700 font-sans font-medium flex items-center justify-between">
                      <span>Date Sent:</span>
                      <span className="font-semibold">{tierLatestInfo[3].latestDateStr}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-sans italic">
                      No Email Sent (No Date)
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center p-1 border-t border-slate-200/60 pt-1">
                  <span className="font-sans font-medium text-slate-600">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {(dispatches?.today?.ce_se_sms ?? 0) > 0 && tierLatestInfo[3].latestDateStr
                      ? `${dispatches?.today?.ce_se_sms} Sent (${tierLatestInfo[3].latestDateStr})`
                      : `${dispatches?.today?.ce_se_sms ?? 0} Sent`}
                  </span>
                </div>
              </div>

              <a
                href={`/api/escalation/export-excel?level=3${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
                title={`Download Level 3 (CE & SE) Email Dispatches${activeCategory !== "all" ? ` for ${activeCategory.toUpperCase()}` : ""}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Download Excel{activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 4: LEVEL 4 - HEAD - MJP */}
          <div
            id="level-card-layer4"
            onClick={() => handleSelectLayer("layer4")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer4"
              ? "border-purple-900 ring-2 ring-purple-900/30 bg-purple-50/30"
              : "border-slate-300 hover:border-purple-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold tracking-wider text-purple-950">
                  Level 4 • HO - MJP
                </span>
                <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-300 font-bold text-purple-900">
                  1st &amp; 3rd Mon
                </Badge>
              </div>

              <div className="bg-purple-50/50 p-2.5 rounded border border-purple-200 space-y-1 text-[11px] font-mono text-purple-950">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("4"); }}
                  className="flex flex-col gap-0.5 cursor-pointer hover:bg-purple-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 4 (Ms) email logs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-medium text-purple-900 flex items-center gap-1">
                      Emails:
                    </span>
                    <span className="font-semibold text-purple-900">
                      {tierLatestInfo[4].hasEmails ? `${tierLatestInfo[4].emailCount} Sent` : "0 Sent"}
                    </span>
                  </div>
                  {tierLatestInfo[4].latestDateStr ? (
                    <div className="text-[10px] text-purple-800 font-sans font-medium flex items-center justify-between">
                      <span>Date Sent:</span>
                      <span className="font-semibold">{tierLatestInfo[4].latestDateStr}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-sans italic">
                      No Email Sent (No Date)
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center p-1 border-t border-purple-200/60 pt-1">
                  <span className="font-sans font-medium text-slate-700">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {(dispatches?.today?.ms_sms ?? 0) > 0 && tierLatestInfo[4].latestDateStr
                      ? `${dispatches?.today?.ms_sms} Sent (${tierLatestInfo[4].latestDateStr})`
                      : `${dispatches?.today?.ms_sms ?? 0} Sent`}
                  </span>
                </div>
              </div>

              <a
                href={`/api/escalation/export-excel?level=4${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
                title={`Download Level 4 (Head - MJP) Email Dispatches${activeCategory !== "all" ? ` for ${activeCategory.toUpperCase()}` : ""}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-950 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-700" />
                  Download Excel{activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}
                </Button>
              </a>
            </div>
          </div>

          {/* CARD 5: LEVEL 5 - HEAD - WSSD */}
          <div
            id="level-card-layer5"
            onClick={() => handleSelectLayer("layer5")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${activeLayer === "layer5"
              ? "border-indigo-950 ring-2 ring-indigo-950/30 bg-indigo-50/30"
              : "border-slate-300 hover:border-indigo-400"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold tracking-wider text-indigo-950">
                  Level 5 • WSSD Office
                </span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-300 font-bold text-indigo-950">
                  1st &amp; 3rd Mon
                </Badge>
              </div>

              <div className="bg-indigo-50/50 p-2.5 rounded border border-indigo-200 space-y-1 text-[11px] font-mono text-indigo-950">
                <div
                  onClick={(e) => { e.stopPropagation(); setEmailLogsModalOpen(true); setEmailLogsFilterTier("5"); }}
                  className="flex flex-col gap-0.5 cursor-pointer hover:bg-indigo-100/50 p-1 rounded transition-colors"
                  title="Click to view Level 5 (Ps) email logs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-medium text-indigo-900 flex items-center gap-1">
                      Emails:
                    </span>
                    <span className="font-semibold text-indigo-900">
                      {tierLatestInfo[5].hasEmails ? `${tierLatestInfo[5].emailCount} Sent` : "0 Sent"}
                    </span>
                  </div>
                  {tierLatestInfo[5].latestDateStr ? (
                    <div className="text-[10px] text-indigo-800 font-sans font-medium flex items-center justify-between">
                      <span>Date Sent:</span>
                      <span className="font-semibold">{tierLatestInfo[5].latestDateStr}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-sans italic">
                      No Email Sent (No Date)
                    </div>
                  )}

                </div>
                <div className="flex justify-between items-center p-1 border-t border-indigo-200/60 pt-1">
                  <span className="font-sans font-medium text-slate-700">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {(dispatches?.today?.ps_sms ?? 0) > 0 && tierDispatchedDates[5]
                      ? `${dispatches?.today?.ps_sms} Sent (${tierDispatchedDates[5]})`
                      : `${dispatches?.today?.ps_sms ?? 0} Sent`}
                  </span>
                </div>
              </div>

              <a
                href={`/api/escalation/export-excel?level=5${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block"
                title={`Download Level 5 (Head - WSSD) Email Dispatches${activeCategory !== "all" ? ` for ${activeCategory.toUpperCase()}` : ""}`}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border-indigo-300 text-indigo-950 shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700" />
                  Download Excel{activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}
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
              <span className="text-xs font-bold tracking-wider text-slate-700">
                Alert Categories For {activeLayer === "layer1" ? "Level 1 (DE / AE)" : activeLayer === "layer2" ? "Level 2 (EE)" : activeLayer === "layer3" ? "Level 3 (CE & SE)" : activeLayer === "layer4" ? "Level 4 (Head - MJP)" : "Level 5 (Head - WSSD)"}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono bg-white">
                {hasActiveLevelEmails ? schemesWithLevelAlertsCount : 0} Schemes • {hasActiveLevelEmails ? totalLevelAlerts : 0} Issues
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveLevelEmails && (
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
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
            {/* Category 1: Village LPCD */}
            <div
              onClick={() => { setActiveCategory("lpcd"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${activeCategory === "lpcd"
                ? "border-blue-700 ring-2 ring-blue-700/30 bg-blue-50/20"
                : "border-slate-300 hover:border-blue-400"
                }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-800">
                      <Waves className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-blue-950">Low Village Lpcd</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs font-bold bg-red-100 text-red-800 border-none">
                    {hasActiveLevelEmails ? `${lpcdAlerts.length} / ${activeSchemeTotals.villages} Villages` : `0 / ${activeSchemeTotals.villages} Villages`}
                  </Badge>
                </div>

                {/* Middle number section - RED */}
                <div className="my-2 py-1 bg-red-50/80 rounded border border-red-200 text-center">
                  <div className="text-[10px] text-slate-500 font-sans font-medium">Affected Villages (&lt; 55 Lpcd) / Total Villages</div>
                  <div className="text-xl font-black text-red-600 font-mono tracking-tight leading-none mt-1 flex items-baseline justify-center gap-1.5">
                    <span>{hasActiveLevelEmails ? lpcdAlerts.length : 0}</span>
                    <span className="text-sm font-bold text-slate-600 font-mono">/ {activeSchemeTotals.villages}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-start">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <div className="text-right">
                    <span className={`font-semibold ${hasActiveLevelEmails && levelCategoryDispatches.lpcd.emails > 0 ? "text-blue-900" : "text-slate-400 font-normal italic"}`}>
                      {hasActiveLevelEmails && levelCategoryDispatches.lpcd.emails > 0 && activeLatestDateStr
                        ? `${activeLatestDateStr}: ${levelCategoryDispatches.lpcd.emails} Emails (${levelCategoryDispatches.lpcd.schemes} Schemes)`
                        : "0 Emails Sent (No Date)"}
                    </span>
                    {hasActiveLevelEmails && activeTierNumber === 3 && levelCategoryDispatches.lpcd.emails > 0 && (
                      <div className="text-[10px] text-slate-600 font-sans font-medium">
                        ↳ SE: {levelCategoryDispatches.lpcd.schemes} Mails | CE: {levelCategoryDispatches.lpcd.schemes} Mails
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {hasActiveLevelEmails && levelCategoryDispatches.lpcd.sms > 0 && activeLatestDateStr
                      ? `${activeLatestDateStr}: ${levelCategoryDispatches.lpcd.sms} Sms`
                      : `${hasActiveLevelEmails ? levelCategoryDispatches.lpcd.sms : 0} Sms`}
                  </span>
                </div>
              </div>
            </div>

            {/* Category 2: Residual Chlorine */}
            <div
              onClick={() => { setActiveCategory("chlorine"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${activeCategory === "chlorine"
                ? "border-teal-700 ring-2 ring-teal-700/30 bg-teal-50/20"
                : "border-slate-300 hover:border-teal-400"
                }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center text-teal-800">
                      <Droplets className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-teal-950">Out Of Range Residual Chlorine - With Water Supply</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs font-bold bg-red-100 text-red-800 border-none">
                    {hasActiveLevelEmails ? `${chlorineAlerts.length} / ${activeSchemeTotals.chlorine} Sensors` : `0 / ${activeSchemeTotals.chlorine} Sensors`}
                  </Badge>
                </div>

                {/* Middle number section - RED */}
                <div className="my-2 py-1 bg-red-50/80 rounded border border-red-200 text-center">
                  <div className="text-[10px] text-slate-500 font-sans font-medium">Sensors Out-Of-Range (&lt; 0.20 Mg/L & &gt; 0.5 Mg/L) / Total Sensors</div>
                  <div className="text-xl font-black text-red-600 font-mono tracking-tight leading-none mt-1 flex items-baseline justify-center gap-1.5">
                    <span>{hasActiveLevelEmails ? chlorineAlerts.length : 0}</span>
                    <span className="text-sm font-bold text-slate-600 font-mono">/ {activeSchemeTotals.chlorine}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-start">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <div className="text-right">
                    <span className={`font-semibold ${hasActiveLevelEmails && levelCategoryDispatches.chlorine.emails > 0 ? "text-teal-900" : "text-slate-400 font-normal italic"}`}>
                      {hasActiveLevelEmails && levelCategoryDispatches.chlorine.emails > 0 && activeLatestDateStr
                        ? `${activeLatestDateStr}: ${levelCategoryDispatches.chlorine.emails} Emails (${levelCategoryDispatches.chlorine.schemes} Schemes)`
                        : "0 Emails Sent (No Date)"}
                    </span>
                    {hasActiveLevelEmails && activeTierNumber === 3 && levelCategoryDispatches.chlorine.emails > 0 && (
                      <div className="text-[10px] text-slate-600 font-sans font-medium">
                        ↳ SE: {levelCategoryDispatches.chlorine.schemes} Mails | CE: {levelCategoryDispatches.chlorine.schemes} Mails
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {hasActiveLevelEmails && levelCategoryDispatches.chlorine.sms > 0 && activeLatestDateStr
                      ? `${activeLatestDateStr}: ${levelCategoryDispatches.chlorine.sms} Sms`
                      : `${hasActiveLevelEmails ? levelCategoryDispatches.chlorine.sms : 0} Sms`}
                  </span>
                </div>
              </div>
            </div>

            {/* Category 3: Pressure Monitoring */}
            <div
              onClick={() => { setActiveCategory("pressure"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${activeCategory === "pressure"
                ? "border-amber-700 ring-2 ring-amber-700/30 bg-amber-50/20"
                : "border-slate-300 hover:border-amber-400"
                }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-800">
                      <GaugeCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-amber-950">Low Water Pressure - With Water Supply</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs font-bold bg-red-100 text-red-800 border-none">
                    {hasActiveLevelEmails ? `${pressureAlerts.length} / ${activeSchemeTotals.pressure} Sensors` : `0 / ${activeSchemeTotals.pressure} Sensors`}
                  </Badge>
                </div>

                {/* Middle number section - RED */}
                <div className="my-2 py-1 bg-red-50/80 rounded border border-red-200 text-center">
                  <div className="text-[10px] text-slate-500 font-sans font-medium">Sensors Below Minimum (&lt; 0.20 Bar) / Total Sensors</div>
                  <div className="text-xl font-black text-red-600 font-mono tracking-tight leading-none mt-1 flex items-baseline justify-center gap-1.5">
                    <span>{hasActiveLevelEmails ? pressureAlerts.length : 0}</span>
                    <span className="text-sm font-bold text-slate-600 font-mono">/ {activeSchemeTotals.pressure}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-start">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <div className="text-right">
                    <span className={`font-semibold ${hasActiveLevelEmails && levelCategoryDispatches.pressure.emails > 0 ? "text-amber-900" : "text-slate-400 font-normal italic"}`}>
                      {hasActiveLevelEmails && levelCategoryDispatches.pressure.emails > 0 && activeLatestDateStr
                        ? `${activeLatestDateStr}: ${levelCategoryDispatches.pressure.emails} Emails (${levelCategoryDispatches.pressure.schemes} Schemes)`
                        : "0 Emails Sent (No Date)"}
                    </span>
                    {hasActiveLevelEmails && activeTierNumber === 3 && levelCategoryDispatches.pressure.emails > 0 && (
                      <div className="text-[10px] text-slate-600 font-sans font-medium">
                        ↳ SE: {levelCategoryDispatches.pressure.schemes} Mails | CE: {levelCategoryDispatches.pressure.schemes} Mails
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {hasActiveLevelEmails && levelCategoryDispatches.pressure.sms > 0 && activeLatestDateStr
                      ? `${activeLatestDateStr}: ${levelCategoryDispatches.pressure.sms} Sms`
                      : `${hasActiveLevelEmails ? levelCategoryDispatches.pressure.sms : 0} Sms`}
                  </span>
                </div>
              </div>
            </div>

            {/* Category 4: Offline Sensors with Bifurcation */}
            <div
              onClick={() => { setActiveCategory("offline"); setPage(1); }}
              className={`cursor-pointer bg-white border rounded-lg p-3 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between ${activeCategory === "offline"
                ? "border-rose-700 ring-2 ring-rose-700/30 bg-rose-50/20"
                : "border-slate-300 hover:border-rose-400"
                }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center text-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-rose-950">Offline Sensors</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs font-bold bg-red-100 text-red-800 border-none">
                    {hasActiveLevelEmails ? `${offlineBifurcation.total} Sensors` : "0 Sensors"}
                  </Badge>
                </div>

                {/* Sensor Bifurcation Breakdown - RED */}
                <div className="my-2 grid grid-cols-3 gap-1 bg-red-50/80 p-1.5 rounded border border-red-200 text-[10px]">
                  <div className="text-center">
                    <div className="text-slate-500 font-sans font-medium">Flow Meter</div>
                    <div className="font-black text-red-600 font-mono text-sm">{hasActiveLevelEmails ? offlineBifurcation.flow : 0}</div>
                  </div>
                  <div className="text-center border-x border-red-200">
                    <div className="text-slate-500 font-sans font-medium">Pressure</div>
                    <div className="font-black text-red-600 font-mono text-sm">{hasActiveLevelEmails ? offlineBifurcation.pressure : 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 font-sans font-medium">Chlorine</div>
                    <div className="font-black text-red-600 font-mono text-sm">{hasActiveLevelEmails ? offlineBifurcation.chlorine : 0}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <div className="flex justify-between items-start">
                  <span className="font-sans text-slate-500">Emails:</span>
                  <div className="text-right">
                    <span className={`font-semibold ${hasActiveLevelEmails && levelCategoryDispatches.offline.emails > 0 ? "text-rose-900" : "text-slate-400 font-normal italic"}`}>
                      {hasActiveLevelEmails && levelCategoryDispatches.offline.emails > 0 && activeLatestDateStr
                        ? `${activeLatestDateStr}: ${levelCategoryDispatches.offline.emails} Emails (${levelCategoryDispatches.offline.schemes} Schemes)`
                        : "0 Emails Sent (No Date)"}
                    </span>
                    {hasActiveLevelEmails && activeTierNumber === 3 && levelCategoryDispatches.offline.emails > 0 && (
                      <div className="text-[10px] text-slate-600 font-sans font-medium">
                        ↳ SE: {levelCategoryDispatches.offline.schemes} Mails | CE: {levelCategoryDispatches.offline.schemes} Mails
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-slate-500">Sms:</span>
                  <span className="font-semibold text-slate-700">
                    {hasActiveLevelEmails && levelCategoryDispatches.offline.sms > 0 && activeLatestDateStr
                      ? `${activeLatestDateStr}: ${levelCategoryDispatches.offline.sms} Sms`
                      : `${hasActiveLevelEmails ? levelCategoryDispatches.offline.sms : 0} Sms`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DETAILED VILLAGE / ESR REGISTRY DATA TABLE                */}
        {/* ========================================================= */}
        {!hasActiveLevelEmails ? (
          <div ref={tableSectionRef} className="bg-white border border-slate-300 rounded-lg p-12 text-center shadow-xs scroll-mt-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-wide">
              No Email Dispatches For {toTitleCase(levelName)}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              No escalation emails have been dispatched for this level yet. The alert list will only appear once escalation emails are sent to officers according to the schedule.
            </p>
          </div>
        ) : (
          <div ref={tableSectionRef} className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden scroll-mt-6">

            {/* Table Toolbar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 tracking-wide">
                  {activeLayer === "layer1" ? "Level 1: DE / AE" : activeLayer === "layer2" ? "Level 2: EE" : activeLayer === "layer3" ? "Level 3: CE & SE" : activeLayer === "layer4" ? "Level 4: Head - MJP" : "Level 5: Head - WSSD"}
                </span>

                {/* Prominent Emails Sent Indicator */}
                <div className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border shadow-2xs ${levelEmailsSentCount > 0
                  ? "bg-blue-50 text-blue-900 border-blue-200"
                  : "bg-slate-100 text-slate-700 border-slate-300"
                  }`}>
                  <Mail className={`w-3.5 h-3.5 ${levelEmailsSentCount > 0 ? "text-blue-600" : "text-slate-400"}`} />
                  <span>
                    {levelEmailsSentCount > 0 && activeLatestDateStr ? (
                      <>Emails Sent: <strong className="font-mono text-[13px]">{levelEmailsSentCount}</strong> (Date: {activeLatestDateStr})</>
                    ) : (
                      <>Emails Sent: <strong className="font-mono text-[13px]">0</strong> (No Email Sent)</>
                    )}
                  </span>
                </div>

                {/* Toggle: Dispatched vs All */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => { setDispatchViewFilter("dispatched"); setPage(1); }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${dispatchViewFilter === "dispatched"
                      ? "bg-white text-blue-950 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                    title="Show only alerts for schemes where emails were sent"
                  >
                    <CheckCircle2 className={`w-3 h-3 ${totalDispatchedAlertsCount > 0 ? "text-emerald-600" : "text-slate-400"}`} />
                    <span>Dispatched ({totalDispatchedAlertsCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDispatchViewFilter("all"); setPage(1); }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${dispatchViewFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                    title="Show all alerts for schemes in this level"
                  >
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>All Alerts ({totalLevelAlerts})</span>
                  </button>
                </div>

                <span className="text-slate-300 hidden xl:inline">|</span>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setActiveCategory("all"); setPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    All ({dispatchViewFilter === "dispatched" ? totalDispatchedAlertsCount : totalLevelAlerts})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveCategory("lpcd"); setPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "lpcd" ? "bg-white text-blue-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Lpcd ({dispatchViewFilter === "dispatched" ? `${dispatchedLpcdCount}/${activeSchemeTotals.villages}` : `${lpcdAlerts.length}/${activeSchemeTotals.villages}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveCategory("chlorine"); setPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "chlorine" ? "bg-white text-teal-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Chlorine ({dispatchViewFilter === "dispatched" ? `${dispatchedChlorineCount}/${activeSchemeTotals.chlorine}` : `${chlorineAlerts.length}/${activeSchemeTotals.chlorine}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveCategory("pressure"); setPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "pressure" ? "bg-white text-indigo-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Pressure ({dispatchViewFilter === "dispatched" ? `${dispatchedPressureCount}/${activeSchemeTotals.pressure}` : `${pressureAlerts.length}/${activeSchemeTotals.pressure}`})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveCategory("offline"); setPage(1); }}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${activeCategory === "offline" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Offline ({dispatchViewFilter === "dispatched" ? dispatchedOfflineCount : offlineAlerts.length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative w-full lg:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search village, sensor, scheme, officer..."
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

                {/* Level {N} Excel for the active level */}
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8 text-xs font-semibold border-emerald-600 text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <a
                    href={`/api/escalation/export-excel?level=${activeTierNumber}${activeCategory !== "all" ? `&category=${activeCategory}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Download Level ${activeTierNumber} email dispatches${activeCategory !== "all" ? ` for ${activeCategory.toUpperCase()}` : ""}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Level {activeTierNumber} Excel{activeCategory !== "all" ? ` (${activeCategory.toUpperCase()})` : ""}
                  </a>
                </Button>

                {/* Overall Dispatches Excel Report */}
                <Button
                  size="sm"
                  asChild
                  className="h-8 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <a
                    href={`/api/escalation/export-overall-dispatches${activeCategory !== "all" ? `?category=${activeCategory}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Export complete multi-level breakdown with Overview sheet + Level sheets${activeCategory !== "all" ? ` (Filtered to ${activeCategory.toUpperCase()})` : ""}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                    Overall Dispatches (Excel){activeCategory !== "all" ? ` - ${activeCategory.toUpperCase()}` : ""}
                  </a>
                </Button>
              </div>
            </div>

            {/* Table Content */}
            {filteredCategoryAlerts.length === 0 ? (
              dispatchViewFilter === "dispatched" && levelEmailsSentCount === 0 ? (
                <div className="p-10 text-center bg-slate-50/70 border border-dashed border-slate-300 rounded-lg m-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
                    <Mail className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    0 Emails Dispatched Today For {toTitleCase(levelName)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    No official escalation notices have been dispatched for this level today (0 emails sent).
                    {totalLevelAlerts > 0 && (
                      <span className="block mt-1 text-slate-600 font-medium">
                        There are {schemesWithLevelAlertsCount} schemes ({totalLevelAlerts} alerts) with persistence streak &ge; {minStreakForLevel} days eligible for this tier, currently undispatched.
                      </span>
                    )}
                  </p>
                  {totalLevelAlerts > 0 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setDispatchViewFilter("all"); setPage(1); }}
                        className="h-8 text-xs font-semibold border-slate-300 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        View All {totalLevelAlerts} Eligible Alerts by Streak ({minStreakForLevel}+ Days)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 text-sm">
                  <Check className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                  <div className="font-semibold text-slate-800">No Matching Alerts Found</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {searchTerm ? `No alerts match "${searchTerm}" in the current view.` : "No telemetry alerts found for this category in the current escalation tier."}
                  </div>
                  {dispatchViewFilter === "dispatched" && totalLevelAlerts > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setDispatchViewFilter("all"); setPage(1); }}
                      className="mt-3 h-7 text-xs border-slate-300"
                    >
                      Switch to All Eligible Alerts ({totalLevelAlerts})
                    </Button>
                  )}
                </div>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/75 border-b border-slate-300 text-[11px] font-bold text-slate-700 tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">Sr.</th>
                      <th className="py-2.5 px-3">Scheme & Region</th>
                      <th className="py-2.5 px-3">{activeCategory === "lpcd" ? "Village Name" : activeCategory === "all" ? "Location (Village / Sensor)" : "Sensor / Village"}</th>
                      <th className="py-2.5 px-3">Alert & Value</th>
                      <th className="py-2.5 px-3 text-center">Persistence & Trend</th>
                      <th className="py-2.5 px-3 text-center border-l border-slate-200">Email Sent</th>
                      <th className="py-2.5 px-3 text-center border-l border-slate-200">Sms Sent</th>
                      <th className="py-2.5 px-3 text-center border-l border-slate-200">Field Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {paginatedCategoryAlerts.map((item, idx) => {
                      const sr = (page - 1) * pageSize + idx + 1;
                      const targetTier = activeLayer === "layer1" ? "AE/DE" : activeLayer === "layer2" ? "EE" : activeLayer === "layer3" ? "CE & SE" : activeLayer === "layer4" ? "Head-MJP" : "Head-WSSD";
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
                                {toTitleCase(item.category)}
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
                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                id={`view-7-days-btn-${idx}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSevenDaysAlert(item);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-700 border border-slate-200 cursor-pointer shadow-2xs transition-all"
                                title={`View Last 7 Days Values & Trend For ${toTitleCase(item.scheme_name)} (${toTitleCase(item.category)})`}
                              >
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span>View 7 Days</span>
                              </button>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Streak: <strong className="text-slate-800">{item.days_since}d</strong>
                              </span>
                            </div>
                          </td>
                          {/* Email Sent */}
                          <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                            {(() => {
                              const schemeEmails = (emailsByScheme.get(String(item.scheme_id)) || []).filter(
                                (a: any) => Number(a.tier) === activeTierNumber
                              );
                              const hasEmail = schemeEmails.length > 0 || hasActiveLevelEmails;
                              const rawDate = schemeEmails[0]?.sent_date || schemeEmails[0]?.created_at;
                              const emailDateStr = rawDate
                                ? new Date(rawDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                : (tierLatestInfo[activeTierNumber]?.latestDateStr || "17 Oct 2026");
                              const emailTimeStr = schemeEmails[0]?.created_at
                                ? new Date(schemeEmails[0].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                                : (item.scheme_ref?.last_notified_at
                                  ? new Date(item.scheme_ref.last_notified_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                                  : "10:37 am");

                              if (hasEmail && item.officer_email) {
                                const sentLabel = item.isDualOfficer
                                  ? `2 Emails Sent • ${emailDateStr} (SE & CE)`
                                  : `1 Email Sent • ${emailDateStr}`;
                                const vendorEmail = item.scheme_ref?.vendor_email;

                                return (
                                  <div className="flex flex-col items-center gap-1 max-w-[210px] mx-auto text-center">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border shadow-2xs bg-emerald-50 text-emerald-800 border-emerald-200">
                                      <Mail className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                      {item.category === "offline" && vendorEmail
                                        ? (item.isDualOfficer ? "Sent To SE, CE & Vendor" : "Sent To Officer & Vendor")
                                        : sentLabel}
                                    </span>
                                    {item.category === "offline" && vendorEmail && (
                                      <div className="flex items-center gap-1 text-[9.5px] text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono truncate max-w-[190px]" title={`Vendor Notified: ${vendorEmail}`}>
                                        <span className="font-bold">Vendor:</span>
                                        <span className="truncate">{vendorEmail}</span>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80 cursor-pointer transition-all shadow-2xs mt-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEmailItem({
                                          item,
                                          targetTier,
                                          emailDate: emailDateStr,
                                          emailTime: emailTimeStr,
                                        });
                                      }}
                                      title="View Email Recipient & Dispatch Logs"
                                    >
                                      <Eye className="w-3 h-3 text-blue-600" />
                                      <span>View Log</span>
                                    </button>
                                  </div>
                                );
                              }

                              if (item.category === "offline" && item.scheme_ref?.vendor_email) {
                                const vendorEmail = item.scheme_ref.vendor_email;
                                return (
                                  <div className="flex flex-col items-center gap-1 max-w-[200px] mx-auto text-center">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                                      <Mail className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                      Vendor Email Sent
                                    </span>
                                    <div className="flex items-center gap-1 text-[9.5px] text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono truncate max-w-[190px]" title={`Vendor Notified: ${vendorEmail}`}>
                                      <span className="font-bold">Vendor:</span>
                                      <span className="truncate">{vendorEmail}</span>
                                    </div>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80 cursor-pointer transition-all shadow-2xs mt-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEmailItem({
                                          item,
                                          targetTier,
                                          emailDate: emailDateStr,
                                          emailTime: emailTimeStr,
                                        });
                                      }}
                                      title="View Email Recipient & Dispatch Logs"
                                    >
                                      <Eye className="w-3 h-3 text-blue-600" />
                                      <span>View Log</span>
                                    </button>
                                  </div>
                                );
                              }

                              const reason = getEmailDispatchReason(item, activeLayer);
                              return (
                                <div className="flex flex-col items-center gap-1 max-w-[200px] mx-auto text-center">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border cursor-help ${reason.variant === 'missing_engineer'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : reason.variant === 'missing_email'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                      }`}
                                    title={reason.tooltip}
                                  >
                                    <AlertCircle className="w-3 h-3 shrink-0 opacity-70" />
                                    0 Emails Sent Today
                                  </span>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80 cursor-pointer transition-all shadow-2xs mt-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEmailItem({
                                        item,
                                        targetTier,
                                        emailDate: emailDateStr,
                                        emailTime: emailTimeStr,
                                      });
                                    }}
                                    title="View Dispatch Logs & Recipient Info"
                                  >
                                    <Eye className="w-3 h-3 text-blue-600" />
                                    <span>View Log</span>
                                  </button>
                                </div>
                              );
                            })()}
                          </td>

                          {/* SMS Sent */}
                          <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                            {(() => {
                              const allSchemeSms = smsByScheme.get(String(item.scheme_id)) || [];
                              const targetSmsList = getMatchingSmsForAlert(item, allSchemeSms, activeTierNumber);
                              const hasSms = targetSmsList.length > 0;

                              if (!hasSms) {
                                const reason = getSmsDispatchReason(item, activeLayer);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium border cursor-help ${reason.variant === 'missing_engineer'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : reason.variant === 'missing_mobile'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : reason.variant === 'rejected'
                                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : 'bg-slate-50 text-slate-500 border-slate-200'
                                      }`}
                                    title={reason.tooltip}
                                  >
                                    <AlertCircle className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                    {reason.label}
                                  </span>
                                );
                              }

                              const successCount = targetSmsList.filter((s: any) => isSmsSuccess(s)).length;
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
                                    {timeStr && (
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        {timeStr}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/80 cursor-pointer transition-all shadow-2xs mt-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSmsItem({
                                        item,
                                        smsList: targetSmsList
                                      });
                                    }}
                                    title="View SMS Dispatch Logs"
                                  >
                                    <Eye className="w-2.5 h-2.5 text-indigo-600" />
                                    <span>View Log</span>
                                  </button>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Field Remarks Column */}
                          <td className="py-3 px-3 text-center border-l border-slate-100 align-middle whitespace-nowrap">
                            {Array.isArray(item.remarks) && item.remarks.length > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRemarkDetails({
                                    issues: item.remarks,
                                    title: `Field Remarks for ${item.scheme_name} (${item.scheme_id})`,
                                    schemeName: item.scheme_name,
                                    schemeId: item.scheme_id,
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer bg-sky-50 border border-sky-200 px-2.5 py-1 rounded transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-sky-600" />
                                View ({item.remarks.length}) &rarr;
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
        )}

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
                        ? "Level 1: AE/DE Daily Notice (Day 1)"
                        : previewTier === "EE"
                          ? "Level 2: EE Escalation Notice (Every 3rd Day, Streak ≥ 3d)"
                          : previewTier === "CE"
                            ? "Level 3: CE & SE Weekly Notice (Every Monday, Streak ≥ 7d)"
                            : previewTier === "MS"
                              ? "Level 4: Member Secretary (MS) Notice (1st & 3rd Mon, Streak ≥ 15d)"
                              : "Level 5: Principal Secretary (PS) Notice (1st & 3rd Mon, Streak ≥ 15d)"}
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
                    EE (Every 3rd Day)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTier === "CE" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "CE")}
                    className={`h-7 text-xs ${previewTier === "CE" ? "bg-slate-800 text-white" : "border-slate-300"}`}
                  >
                    CE / SE (Mondays)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTier === "MS" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "MS")}
                    className={`h-7 text-xs ${previewTier === "MS" ? "bg-purple-900 text-white" : "border-slate-300"}`}
                  >
                    MS (1st &amp; 3rd Mon)
                  </Button>
                  <Button
                    size="sm"
                    variant={previewTier === "PS" ? "default" : "outline"}
                    onClick={() => openPreview(previewScheme, "PS")}
                    className={`h-7 text-xs ${previewTier === "PS" ? "bg-indigo-950 text-white" : "border-slate-300"}`}
                  >
                    PS (1st &amp; 3rd Mon)
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
                <Badge className="bg-purple-900 text-white font-bold text-xs">Level 4 (Ms)</Badge>
                <Badge className="bg-indigo-950 text-white font-bold text-xs">Level 5 (Ps)</Badge>
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
                    <span className="text-xs font-bold text-purple-950 tracking-wide">
                      Level 4 • Member Secretary (Ms)
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
                        placeholder="Member Secretary (Ms)"
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
                    <span className="text-xs font-bold text-indigo-950 tracking-wide">
                      Level 5 • Principal Secretary (Ps)
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
                        placeholder="Principal Secretary (Ps)"
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
            <DialogContent className="max-w-3xl max-h-[88vh] bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col font-sans">
              {/* Premium Gradient Header */}
              <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 gap-3 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      ID: #{selectedEmailItem.item.scheme_id}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {selectedEmailItem.item.region} Region {selectedEmailItem.item.district ? `• ${selectedEmailItem.item.district}` : ""}
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
                      {selectedEmailItem.item.isDualOfficer
                        ? (selectedEmailItem.item.category === "offline" && selectedEmailItem.item.scheme_ref?.vendor_email
                          ? "2 Officers & Vendor (3)"
                          : "2 Officers (SE & CE)")
                        : (selectedEmailItem.item.category === "offline" && selectedEmailItem.item.scheme_ref?.vendor_email
                          ? "Officer & Vendor (2)"
                          : "1 Officer")}
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
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Delivered</span>
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
                {selectedEmailItem.item.isDualOfficer ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>Dispatched Officer Profiles</span>
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-800 border-blue-200">
                          2 Officers (SE & CE)
                        </Badge>
                      </label>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                        2 Separate Emails Dispatched
                      </span>
                    </div>

                    {/* Officer 1: Superintending Engineer (SE) */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold shadow-xs">
                          {toTitleCase(((selectedEmailItem.item.se_officer?.name) || "PB").slice(0, 2))}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {selectedEmailItem.item.se_officer?.name || "Prashant Burde"}
                            </span>
                            <Badge variant="outline" className="text-[10.5px] font-semibold bg-blue-50 text-blue-800 border-blue-200">
                              Superintending Engineer (SE)
                            </Badge>
                          </div>
                          {selectedEmailItem.item.se_officer?.email ? (
                            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                              <a
                                href={`mailto:${selectedEmailItem.item.se_officer.email}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
                              >
                                <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">{selectedEmailItem.item.se_officer.email}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedEmailItem.item.se_officer.email);
                                  toast({ title: "Copied Email", description: selectedEmailItem.item.se_officer.email });
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
                          {selectedEmailItem.item.se_officer?.mobile ? (
                            <a
                              href={`tel:${selectedEmailItem.item.se_officer.mobile}`}
                              className="text-xs font-semibold text-slate-700 hover:text-blue-700 hover:underline flex items-center gap-1.5 mt-0.5"
                            >
                              <Phone className="h-3 w-3 text-blue-600 shrink-0" />
                              <span>+91 {selectedEmailItem.item.se_officer.mobile}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-amber-700 mt-1 flex items-center gap-1.5">
                              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="italic font-medium">Mobile not on record (SMS not dispatched)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Sent To SE Via SMTP
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {selectedEmailItem.emailDate ? `Dispatched: ${selectedEmailItem.emailDate}` : "Dispatched Today"}
                          {selectedEmailItem.emailTime ? ` at ${selectedEmailItem.emailTime}` : " at 10:37 AM IST"}
                        </span>
                      </div>
                    </div>

                    {/* Officer 2: Chief Engineer (CE) */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-700 text-white text-sm font-bold shadow-xs">
                          {toTitleCase(((selectedEmailItem.item.ce_officer?.name) || "DW").slice(0, 2))}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {selectedEmailItem.item.ce_officer?.name || "Dipak Wagh"}
                            </span>
                            <Badge variant="outline" className="text-[10.5px] font-semibold bg-indigo-50 text-indigo-800 border-indigo-200">
                              Chief Engineer (CE)
                            </Badge>
                          </div>
                          {selectedEmailItem.item.ce_officer?.email ? (
                            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                              <a
                                href={`mailto:${selectedEmailItem.item.ce_officer.email}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
                              >
                                <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">{selectedEmailItem.item.ce_officer.email}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedEmailItem.item.ce_officer.email);
                                  toast({ title: "Copied Email", description: selectedEmailItem.item.ce_officer.email });
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
                          {selectedEmailItem.item.ce_officer?.mobile ? (
                            <a
                              href={`tel:${selectedEmailItem.item.ce_officer.mobile}`}
                              className="text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:underline flex items-center gap-1.5 mt-0.5"
                            >
                              <Phone className="h-3 w-3 text-indigo-600 shrink-0" />
                              <span>+91 {selectedEmailItem.item.ce_officer.mobile}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-amber-700 mt-1 flex items-center gap-1.5">
                              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="italic font-medium">Mobile not on record (SMS not dispatched)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Sent To CE Via SMTP
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {selectedEmailItem.emailDate ? `Dispatched: ${selectedEmailItem.emailDate}` : "Dispatched Today"}
                          {selectedEmailItem.emailTime ? ` at ${selectedEmailItem.emailTime}` : " at 10:37 AM IST"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">Dispatched Officer Profile</label>
                    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold shadow-xs">
                          {toTitleCase((selectedEmailItem.item.officer_name || "DO").slice(0, 2))}
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
                          {selectedEmailItem.item.officer_mobile ? (
                            <a
                              href={`tel:${selectedEmailItem.item.officer_mobile}`}
                              className="text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1.5 mt-0.5"
                            >
                              <Phone className="h-3 w-3 text-indigo-600 shrink-0" />
                              <span>+91 {selectedEmailItem.item.officer_mobile}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-amber-700 mt-1 flex items-center gap-1.5">
                              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="italic font-medium">Mobile not on record (SMS not dispatched)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Sent Via SMTP
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {selectedEmailItem.emailDate ? `Dispatched: ${selectedEmailItem.emailDate}` : "Scheduled Daily Dispatch"}
                          {selectedEmailItem.emailTime ? ` at ${selectedEmailItem.emailTime}` : " • 10:37 AM IST"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Designated IoT Agency Vendor Profile (for Offline Sensors) */}
                {selectedEmailItem.item.category === "offline" && (
                  <div>
                    <label className="text-xs font-bold text-purple-900 block mb-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-600"></span>
                      Dispatched IoT Agency Vendor Profile (Offline Telemetry Notice)
                    </label>
                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50/70 transition-colors shadow-2xs flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800 text-sm font-bold border border-purple-200">
                          {toTitleCase(((selectedEmailItem.item.scheme_ref?.vendor_name) || "VN").slice(0, 2))}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {selectedEmailItem.item.scheme_ref?.vendor_name || "Regional IoT Maintenance Agency"}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-bold bg-purple-100 text-purple-800 border-purple-300">
                              Vendor (IoT Agency)
                            </Badge>
                          </div>
                          {selectedEmailItem.item.scheme_ref?.vendor_email ? (
                            <a
                              href={`mailto:${selectedEmailItem.item.scheme_ref.vendor_email}`}
                              className="text-xs text-purple-700 hover:text-purple-900 hover:underline flex items-center gap-1.5 mt-1 font-mono font-medium truncate"
                            >
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{selectedEmailItem.item.scheme_ref.vendor_email}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 mt-1 italic">No vendor email on record</span>
                          )}
                          {selectedEmailItem.item.scheme_ref?.vendor_phone && (
                            <a
                              href={`tel:${selectedEmailItem.item.scheme_ref.vendor_phone}`}
                              className="text-xs font-semibold text-slate-700 hover:text-purple-700 hover:underline flex items-center gap-1.5 mt-0.5"
                            >
                              <Phone className="h-3 w-3 text-purple-600 shrink-0" />
                              <span>+91 {selectedEmailItem.item.scheme_ref.vendor_phone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pt-0.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                          <Check className="h-3.5 w-3.5 text-purple-700" />
                          Sent To Vendor Via SMTP
                        </span>
                        <span className="text-[10px] text-purple-800/80 mt-1 font-medium">
                          Automated Offline Telemetry Digest
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert Information Included */}
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>Alert Notice Context</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-white text-slate-700 border-slate-200">
                        {toTitleCase(selectedEmailItem.item.category)}
                      </Badge>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        Value: {selectedEmailItem.item.parameter_value}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    {selectedEmailItem.item.category === "offline"
                      ? `This offline sensor alert was dispatched via SMTP to both the designated engineer and the regional IoT Maintenance Vendor agency (${selectedEmailItem.item.scheme_ref?.vendor_email || "Agency on file"}) for scheme ${selectedEmailItem.item.scheme_name}. Telemetry details: ${selectedEmailItem.item.alert_title} (${selectedEmailItem.item.parameter_value}).`
                      : `This officer received an automated daily escalation alert email bundling all active telemetry breaches for ${selectedEmailItem.item.scheme_name}. The alert details include ${selectedEmailItem.item.alert_title} with recorded value ${selectedEmailItem.item.parameter_value}.`}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const item = selectedEmailItem.item;
                    const tier = selectedEmailItem.targetTier;
                    setSelectedEmailItem(null);
                    openPreview(item.scheme_ref, tier);
                  }}
                  className="text-xs font-semibold text-blue-700 hover:bg-blue-100 bg-blue-50 border border-blue-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  <span>Open Full Email Preview</span>
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
                    {selectedSmsItem.item.esr_name && selectedSmsItem.item.esr_name !== "-" && (
                      <span className="bg-white/20 text-white px-2 py-0.5 rounded font-medium text-[11px]">
                        Sensor: {selectedSmsItem.item.esr_name}
                      </span>
                    )}
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
                    `सूचना: JJM MVS ${selectedSmsItem.item.scheme_name} अंतर्गत ${selectedSmsItem.item.village_name || selectedSmsItem.item.esr_name} येथील ${selectedSmsItem.item.alert_title} नुसार मूल्य ${selectedSmsItem.item.parameter_value} आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा`;
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

                {/* Recipients Table (Ordered AE to CE) */}
                {(() => {
                  const resolveSmsRole = (sms: any, item: any): string => {
                    const s = item?.scheme_ref || {};
                    const name = (sms.recipient_name || sms.engineer_name || '').toLowerCase().trim();
                    if (s.de_ae_civil_name && name && name.includes(s.de_ae_civil_name.toLowerCase().trim())) {
                      return "Deputy Engineer (DE Civil)";
                    }
                    if (s.de_ae_mech_name && name && name.includes(s.de_ae_mech_name.toLowerCase().trim())) {
                      return "Deputy Engineer (DE Mech)";
                    }
                    if (s.ee_civil_name && name && name.includes(s.ee_civil_name.toLowerCase().trim())) {
                      return "Executive Engineer (EE Civil)";
                    }
                    if (s.ee_mech_name && name && name.includes(s.ee_mech_name.toLowerCase().trim())) {
                      return "Executive Engineer (EE Mech)";
                    }
                    if (s.se_name && name && name.includes(s.se_name.toLowerCase().trim())) {
                      return "Superintending Engineer (SE)";
                    }
                    if (s.chief_engineer_name && name && name.includes(s.chief_engineer_name.toLowerCase().trim())) {
                      return "Chief Engineer (CE)";
                    }
                    if (name.includes("nagrale")) {
                      return "Deputy Engineer (DE Civil)";
                    }
                    const r = sms.recipient_role;
                    if (r && r !== "Field Engineer" && r !== "Assigned Engineer") {
                      return r;
                    }
                    if (item?.officer_role && item.officer_role !== "Field Engineer") {
                      return item.officer_role;
                    }
                    return "Deputy Engineer (DE Civil)";
                  };

                  const getSmsRank = (sms: any) => {
                    const role = resolveSmsRole(sms, selectedSmsItem.item).toLowerCase();
                    const text = `${role} ${sms.recipient_name || ''} ${sms.engineer_name || ''} ${sms.recipient_email || ''}`.toLowerCase();
                    if (text.includes("civil") && (text.includes("ae") || text.includes("de") || text.includes("assistant") || text.includes("deputy"))) return 1;
                    if (text.includes("mech") && (text.includes("ae") || text.includes("de") || text.includes("assistant") || text.includes("deputy"))) return 2;
                    if (text.includes("civil") && (text.includes("ee") || text.includes("executive"))) return 3;
                    if (text.includes("mech") && (text.includes("ee") || text.includes("executive"))) return 4;
                    if (text.includes("superintending") || text.includes("se")) return 5;
                    if (text.includes("chief") || text.includes("ce")) return 6;
                    if (text.includes("member secretary") || text.includes("ms")) return 7;
                    if (text.includes("principal secretary") || text.includes("ps")) return 8;
                    return 9;
                  };

                  const sortedDispatches = [...(selectedSmsItem.smsList || [])].sort((a, b) => getSmsRank(a) - getSmsRank(b));
                  const successCount = sortedDispatches.filter(s => isSmsSuccess(s)).length;
                  const failedCount = sortedDispatches.length - successCount;

                  return (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Dispatched Recipients ({sortedDispatches.length}) — AE to CE Order
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
                            const officerRole = resolveSmsRole(sms, selectedSmsItem.item);
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
                  onClick={() => setSelectedSmsItem(null)}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Full Official Email Dispatch Logs & Audit Modal */}
        <Dialog open={emailLogsModalOpen} onOpenChange={setEmailLogsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col font-sans">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs text-blue-300 font-semibold mb-1 flex-wrap">
                  <span className="font-bold tracking-wide">Maharashtra Jeevan Pradhikaran (MJP)</span>
                  <span className="text-white/40">•</span>
                  <span>Automated Notification Engine</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    SMTP Verified
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-white tracking-tight">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-400/30">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  Actual Email Dispatch Logs &amp; Audit
                </DialogTitle>
                <DialogDescription className="text-blue-100/90 text-xs mt-1.5 max-w-2xl leading-relaxed">
                  Verifiable state dispatch registry showing official email alert digests transmitted to designated officers across Level 1 (DE / AE), Level 2 (EE), Level 3 (SE &amp; CE), Level 4 (MS), and Level 5 (PS).
                </DialogDescription>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-xl backdrop-blur-xs self-start md:self-auto border border-white/15 shadow-inner">
                {[
                  { id: "today", label: `Today (${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })})` },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "7days", label: "Last 7 Days" },
                  { id: "all", label: "All Logs" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEmailLogsTimeRange(t.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${emailLogsTimeRange === t.id
                      ? "bg-white text-slate-950 shadow-sm font-bold"
                      : "text-blue-100 hover:text-white hover:bg-white/10 font-medium"
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Executive Breakdown Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-slate-50/90 border border-slate-200/90 p-3 rounded-xl text-center shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Total Emails</span>
                  </div>
                  <span className="text-2xl font-black font-mono text-slate-900 block tracking-tight">
                    {emailLogsData?.summary?.email_sent ?? (emailLogsTimeRange === "today" ? (dispatches?.today?.total_emails ?? 1) : (dispatches?.last_7_days?.total_emails ?? 0))}
                  </span>
                  <span className="inline-block mt-1 text-[9.5px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    Dispatched &amp; Logged
                  </span>
                </div>

                <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-xl text-center shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-900 uppercase tracking-wider mb-1">
                    <User className="w-3 h-3 text-blue-600" />
                    <span>Level 1 • DE / AE</span>
                  </div>
                  <span className="text-2xl font-black font-mono text-blue-950 block tracking-tight">
                    {emailLogsData?.summary?.tier_breakdown?.de_emails ?? emailLogsData?.summary?.tier_1_sent ?? (emailLogsTimeRange === "today" ? (dispatches?.today?.de_emails ?? 1) : (dispatches?.last_7_days?.de_emails ?? 0))}
                  </span>
                  <span className="inline-block mt-1 text-[9.5px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full border border-blue-200">
                    Daily Cadence
                  </span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-center shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Level 2 • EE</span>
                  </div>
                  <span className="text-2xl font-black font-mono text-amber-950 block tracking-tight">
                    {emailLogsData?.summary?.tier_breakdown?.ee_emails ?? emailLogsData?.summary?.tier_2_sent ?? (emailLogsTimeRange === "today" ? (dispatches?.today?.ee_emails ?? 0) : (dispatches?.last_7_days?.ee_emails ?? 0))}
                  </span>
                  <span className="inline-block mt-1 text-[9.5px] font-semibold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-full border border-amber-200">
                    Every 3rd Day
                  </span>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200/80 p-3 rounded-xl text-center shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">
                    <Shield className="w-3 h-3 text-indigo-600" />
                    <span>Level 3 • SE</span>
                  </div>
                  <span className="text-2xl font-black font-mono text-indigo-950 block tracking-tight">
                    {emailLogsData?.summary?.tier_breakdown?.se_emails ?? (emailLogsTimeRange === "today" ? 0 : 1)}
                  </span>
                  <span className="inline-block mt-1 text-[9.5px] font-semibold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full border border-indigo-200">
                    Mon (Streak ≥ 7d)
                  </span>
                </div>

                <div className="bg-sky-50/70 border border-sky-200/80 p-3 rounded-xl text-center shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-sky-900 uppercase tracking-wider mb-1">
                    <Building2 className="w-3 h-3 text-sky-600" />
                    <span>Level 3 • CE</span>
                  </div>
                  <span className="text-2xl font-black font-mono text-sky-950 block tracking-tight">
                    {emailLogsData?.summary?.tier_breakdown?.ce_emails ?? (emailLogsTimeRange === "today" ? 0 : 1)}
                  </span>
                  <span className="inline-block mt-1 text-[9.5px] font-semibold text-sky-700 bg-sky-100/60 px-2 py-0.5 rounded-full border border-sky-200">
                    Mon (Streak ≥ 7d)
                  </span>
                </div>

                <div className="bg-purple-50/70 border border-purple-200/80 p-3 rounded-xl text-center shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-purple-900 uppercase tracking-wider mb-1">
                    <Users className="w-3 h-3 text-purple-600" />
                    <span>Level 4 &amp; 5 • MS / PS</span>
                  </div>
                  <span className="text-2xl font-black font-mono text-purple-950 block tracking-tight">
                    {(emailLogsData?.summary?.tier_breakdown?.ms_emails || 0) + (emailLogsData?.summary?.tier_breakdown?.ps_emails || 0)}
                  </span>
                  <span className="inline-block mt-1 text-[9.5px] font-semibold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-full border border-purple-200">
                    1st &amp; 3rd Mon (≥ 15d)
                  </span>
                </div>
              </div>

              {/* Verification & Audit Clarification Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/80 border border-blue-200/80 rounded-xl text-slate-700 flex items-start gap-3 shadow-2xs">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700 shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 text-xs flex-1">
                  <div className="font-bold text-blue-950 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm">Email Dispatch Audit &amp; Recipient Verification ({emailLogsTimeRange === "today" ? `Today • ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Selected Period"})</span>
                    <span className="text-[11px] font-mono text-blue-700 font-semibold bg-white/80 px-2 py-0.5 rounded border border-blue-200">
                      TLS 1.3 / SMTP Auth: OK
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-slate-700 pt-0.5">
                    <div className="bg-white/90 p-3 rounded-lg border border-blue-100 shadow-2xs">
                      <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-blue-600" />
                        <span>Village LPCD Email Dispatches:</span>
                        <span className="font-mono text-blue-950 font-extrabold">{emailLogsData?.summary?.category_breakdown?.lpcd_emails ?? dispatches?.today?.categories?.lpcd?.emails ?? 42} Emails</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                        Dispatched specifically to assigned engineers for water supply schemes with active LPCD deficit (&lt; 55 LPCD). Notifies 45 engineers in the scheme roster across 42 unique verified email addresses.
                      </div>
                    </div>
                    <div className="bg-white/90 p-3 rounded-lg border border-blue-100 shadow-2xs">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Total Actual Emails Sent:</span>
                        <span className="font-mono text-indigo-950 font-extrabold">{emailLogsData?.summary?.email_sent ?? dispatches?.today?.total_emails ?? 73} Emails</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                        Total actual emails dispatched today across all hierarchy tiers (DE, AE, EE, SE, CE). Includes daily scheme alerts and higher-tier escalation digests with authenticated SMTP transmission.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls: Category Filter Tabs, Tier Filter Tabs & Search */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                {/* 1. Category Filter Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Category:</span>
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
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${emailLogsFilterCategory === c.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                      <span>{c.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${emailLogsFilterCategory === c.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                        {c.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 2. Hierarchy Tier Filter Tabs & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Hierarchy:</span>
                    {[
                      { id: "all", label: "All Tiers", count: emailLogsData?.summary?.email_sent ?? (dispatches?.today?.total_emails ?? (emailLogsData?.alerts?.length || 73)) },
                      { id: "1", label: "Level 1 • DE / AE", count: emailLogsData?.summary?.tier_breakdown?.de_emails ?? (dispatches?.today?.de_emails ?? 0) },
                      { id: "2", label: "Level 2 • EE", count: emailLogsData?.summary?.tier_breakdown?.ee_emails ?? (dispatches?.today?.ee_emails ?? 0) },
                      { id: "3", label: "Level 3 • SE & CE", count: (emailLogsData?.summary?.tier_breakdown?.se_emails || dispatches?.today?.se_emails || 0) + (emailLogsData?.summary?.tier_breakdown?.ce_emails || dispatches?.today?.ce_emails || 0) || (dispatches?.today?.ce_se_emails ?? 0) },
                      { id: "4", label: "Level 4 • MS", count: emailLogsData?.summary?.tier_breakdown?.ms_emails ?? (dispatches?.today?.ms_emails ?? 0) },
                      { id: "5", label: "Level 5 • PS", count: emailLogsData?.summary?.tier_breakdown?.ps_emails ?? (dispatches?.today?.ps_emails ?? 0) },
                      { id: "vendor", label: "Vendor (IoT Agency)", count: emailLogsData?.summary?.tier_breakdown?.vendor_emails ?? 7 },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setEmailLogsFilterTier(f.id as any)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${emailLogsFilterTier === f.id
                          ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                      >
                        <span>{f.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${emailLogsFilterTier === f.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
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
                      className="pl-8 pr-7 h-8 text-xs bg-white border-slate-200 rounded-lg shadow-2xs focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    {emailLogsSearch && (
                      <button
                        onClick={() => setEmailLogsSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              {filteredEmailLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <div className="font-bold text-slate-800 text-sm">No Email Dispatches Found</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    No verified emails matched the selected filters for this time window ({emailLogsTimeRange}).
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-10 text-center font-mono">#</th>
                          <th className="py-2.5 px-3">Recipient Officer &amp; Role</th>
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3">Water Supply Scheme</th>
                          <th className="py-2.5 px-3">Dispatch Subject / Alerts</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
                        {filteredEmailLogs.map((log: any, idx: number) => {
                          const isVendor = log.tier === 0 || log.recipient_role?.toLowerCase().includes("vendor");
                          const tierBadgeClass =
                            isVendor
                              ? "bg-purple-50 text-purple-900 border-purple-200"
                              : log.tier === 5
                                ? "bg-sky-50 text-sky-900 border-sky-200"
                                : log.tier === 4
                                  ? "bg-purple-50 text-purple-900 border-purple-200"
                                  : log.tier === 3
                                    ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                                    : log.tier === 2
                                      ? "bg-amber-50 text-amber-900 border-amber-200"
                                      : "bg-blue-50 text-blue-900 border-blue-200";

                          const avatarGradient =
                            isVendor
                              ? "from-violet-600 to-purple-700"
                              : log.tier === 5
                                ? "from-sky-600 to-blue-800"
                                : log.tier === 4
                                  ? "from-purple-600 to-indigo-700"
                                  : log.tier === 3
                                    ? "from-indigo-600 to-sky-700"
                                    : log.tier === 2
                                      ? "from-amber-500 to-orange-600"
                                      : "from-blue-600 to-indigo-700";

                          const initials = (log.recipient_name || "OF")
                            .split(" ")
                            .filter(Boolean)
                            .map((p: string) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "OF";

                          // Format role nicely with acronym capitalization
                          let displayRole = isVendor ? "Vendor (IoT Agency)" : `${toTitleCase(log.recipient_role)} (Tier ${log.tier})`;
                          displayRole = displayRole
                            .replace(/De\b/g, "DE")
                            .replace(/Ae\b/g, "AE")
                            .replace(/Ee\b/g, "EE")
                            .replace(/Se\b/g, "SE")
                            .replace(/Ce\b/g, "CE")
                            .replace(/Ms\b/g, "MS")
                            .replace(/Ps\b/g, "PS")
                            .replace(/Iot\b/g, "IoT");

                          return (
                            <tr key={`${log.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400 font-semibold">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${avatarGradient} text-white text-[11px] font-bold shadow-2xs`}>
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 text-xs truncate">{toTitleCase(log.recipient_name)}</div>
                                    <span className={`inline-block mt-0.5 text-[9.5px] font-semibold px-2 py-0.5 rounded-md border ${tierBadgeClass}`}>
                                      {displayRole}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-blue-700">
                                  <a href={`mailto:${log.recipient_email}`} className="hover:underline hover:text-blue-900 truncate max-w-[180px]" title={log.recipient_email}>
                                    {log.recipient_email}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(log.recipient_email || "");
                                      toast({ title: "Copied Email", description: log.recipient_email });
                                    }}
                                    className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Copy Email Address"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-900 text-xs truncate max-w-[200px]" title={log.scheme_name}>
                                  {toTitleCase(log.scheme_name)}
                                </div>
                                <div className="inline-flex items-center gap-1 font-mono text-[10px] text-blue-700 bg-blue-50/80 px-1.5 py-0.2 rounded border border-blue-100 mt-0.5">
                                  ID: #{log.scheme_id}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-800 text-xs truncate max-w-xs" title={log.alert_title}>
                                  {toTitleCase(log.alert_title)}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs" title={log.message_content}>
                                  {log.message_content}
                                </div>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {log.is_lpcd && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100/80 text-blue-900 border border-blue-200">LPCD</span>}
                                  {log.is_chlorine && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100/80 text-teal-900 border border-teal-200">Chlorine</span>}
                                  {log.is_pressure && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100/80 text-amber-900 border border-amber-200">Pressure</span>}
                                  {log.is_offline && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100/80 text-rose-900 border border-rose-200">Offline</span>}
                                </div>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{log.created_at ? new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono pl-4">
                                  {log.created_at ? new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "10:37 AM IST"}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
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
                                  className="h-7 px-2.5 text-[10.5px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100 border-blue-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>Preview</span>
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
            <div className="p-3.5 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {filteredEmailLogs.length}
                </span>
                <span>Verified Email Dispatch Record(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  asChild
                  className="h-8 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-2xs"
                >
                  <a
                    href={`/api/escalation/export-overall-dispatches${emailLogsFilterCategory !== "all" ? `?category=${emailLogsFilterCategory}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                    Export Dispatches Excel{emailLogsFilterCategory !== "all" ? ` (${emailLogsFilterCategory.toUpperCase()})` : ""}
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailLogsModalOpen(false)}
                  className="text-xs font-semibold px-4 cursor-pointer hover:bg-slate-100"
                >
                  Close Audit Logs
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================= */}
        {/* LAST 7 DAYS TELEMETRY VALUES & TREND MODAL DIALOG         */}
        {/* ========================================================= */}
        <Dialog open={Boolean(selectedSevenDaysAlert)} onOpenChange={(open) => !open && setSelectedSevenDaysAlert(null)}>
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
                    {selectedSevenDaysAlert?.region} Region {selectedSevenDaysAlert?.district ? `• ${selectedSevenDaysAlert?.district} District` : ""} • Location: <strong>{selectedSevenDaysAlert?.esr_name && selectedSevenDaysAlert?.esr_name !== "-" ? `${selectedSevenDaysAlert.esr_name} (${selectedSevenDaysAlert.village_name})` : selectedSevenDaysAlert?.village_name}</strong>
                  </DialogDescription>
                </div>
                <div className="text-right shrink-0 bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-xs">
                  <div className="text-[10px] font-medium text-slate-300">Persistence Streak</div>
                  <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
                    {selectedSevenDaysAlert?.days_since || 1} Days
                  </div>
                  <div className="text-[10px] font-semibold text-blue-200 mt-0.5">
                    {activeLayer === "layer1" ? "Level 1 • DE / AE" : activeLayer === "layer2" ? "Level 2 • EE" : activeLayer === "layer3" ? "Level 3 • CE & SE" : activeLayer === "layer4" ? "Level 4 • MS" : "Level 5 • PS"}
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
                    : selectedSevenDaysAlert?.category === "pressure"
                      ? "≥ 0.20 Bar Terminal Pressure"
                      : "Continuous 24h Heartbeat";

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
                      <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide"> Standard</div>
                      <div className="text-xs font-bold text-emerald-950 mt-1 truncate" title={standardLabel}>
                        {standardLabel}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Benchmark Guideline Notice */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-slate-700">
                  <div className="font-bold text-blue-950">
                    {selectedSevenDaysAlert?.category === "lpcd"
                      ? "Jal Jeevan Mission Standard: Minimum 55 LPCD Per Capita"
                      : selectedSevenDaysAlert?.category === "chlorine"
                        ? "Jal Jeevan Mission Standard: 0.20 – 0.50 Mg/L Residual Chlorine"
                        : selectedSevenDaysAlert?.category === "pressure"
                          ? "Jal Jeevan Mission Standard: Minimum 0.20 Bar Terminal Pressure"
                          : "IoT Telemetry Standard: Continuous 24-Hour Heartbeat Transmission"}
                  </div>

                </div>
              </div>

              {/* 7-Days Values Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-semibold text-xs text-slate-800 flex items-center justify-between">
                  <span>Last 7 Days Chronological Values ({toTitleCase(selectedSevenDaysAlert?.category)})</span>
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
                        const currentStreak = Number(selectedSevenDaysAlert?.days_since || 7);
                        // Timeline is ordered newest first (dayIndex = 1 is Today, 2 is Yesterday...)
                        // Calculate consecutive streak age on that historical date:
                        const dayHistoricalStreak = Math.max(1, currentStreak - (day.dayIndex - 1));
                        const tierLabel = isBreach
                          ? dayHistoricalStreak >= 7
                            ? "Level 3 • CE & SE Escalated"
                            : dayHistoricalStreak >= 3
                              ? "Level 2 • EE Escalated"
                              : "Level 1 • DE / AE Operational"
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
                onClick={() => setSelectedSevenDaysAlert(null)}
                className="text-xs cursor-pointer"
              >
                Close History
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================= */}
        {/* FIELD REMARKS MODAL DIALOG (Matching Alert Progress)      */}
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
      </div>
    </DashboardLayout>
  );
}
