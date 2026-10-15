import { useState, useMemo } from "react";
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
  };
  schemes: SchemeEscalationItem[];
}

export default function EscalationPortalPage() {
  const { toast } = useToast();

  // Active layer view: "all" | "layer1" (DE/AE Daily) | "layer2" (EE >3 Days) | "layer3" (SE & CE Weekly) | "layer4" (MS 10+ Days) | "layer5" (PS 15+ Days)
  const [activeLayer, setActiveLayer] = useState<"all" | "layer1" | "layer2" | "layer3" | "layer4" | "layer5">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Notice preview modal
  const [previewScheme, setPreviewScheme] = useState<SchemeEscalationItem | null>(null);
  const [previewTier, setPreviewTier] = useState<"DE" | "EE" | "CE" | "MS" | "PS">("DE");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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

  // Active list filtered by search term and layer
  const displayedSchemes = useMemo(() => {
    let list: SchemeEscalationItem[] = [];
    if (activeLayer === "all") list = schemes;
    else if (activeLayer === "layer1") list = layer1Schemes;
    else if (activeLayer === "layer2") list = layer2Schemes;
    else if (activeLayer === "layer3") list = layer3Schemes;
    else if (activeLayer === "layer4") list = layer4Schemes;
    else if (activeLayer === "layer5") list = layer5Schemes;

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.scheme_name.toLowerCase().includes(term) ||
        s.scheme_id.toLowerCase().includes(term) ||
        (s.region && s.region.toLowerCase().includes(term)) ||
        (s.district && s.district.toLowerCase().includes(term)) ||
        (s.de_ae_civil_name && s.de_ae_civil_name.toLowerCase().includes(term)) ||
        (s.ee_civil_name && s.ee_civil_name.toLowerCase().includes(term)) ||
        (s.chief_engineer_name && s.chief_engineer_name.toLowerCase().includes(term)) ||
        (s.se_name && s.se_name.toLowerCase().includes(term))
    );
  }, [activeLayer, schemes, layer1Schemes, layer2Schemes, layer3Schemes, layer4Schemes, layer5Schemes, searchTerm]);

  // Totals for metrics
  const overallTotals = useMemo(() => {
    return schemes.reduce(
      (acc, s) => ({
        deSms: acc.deSms + (s.de_sms_count || 0),
        eeSms: acc.eeSms + (s.ee_sms_count || 0),
        ceSeSms: acc.ceSeSms + (s.ce_se_sms_count || 0),
        totalSms: acc.totalSms + (s.de_sms_count || 0) + (s.ee_sms_count || 0) + (s.ce_se_sms_count || 0),
        totalEmails: acc.totalEmails + (s.total_email_count || 0),
        totalIssues: acc.totalIssues + s.total_issues_count,
      }),
      { deSms: 0, eeSms: 0, ceSeSms: 0, totalSms: 0, totalEmails: 0, totalIssues: 0 }
    );
  }, [schemes]);

  const layer1Totals = useMemo(() => {
    return layer1Schemes.reduce(
      (acc, s) => ({
        sms: acc.sms + (s.de_sms_count || 0),
        emails: acc.emails + (s.total_email_count || 0),
      }),
      { sms: 0, emails: 0 }
    );
  }, [layer1Schemes]);

  const layer2Totals = useMemo(() => {
    return layer2Schemes.reduce(
      (acc, s) => ({
        sms: acc.sms + (s.ee_sms_count || 0),
        emails: acc.emails + (s.total_email_count || 0),
      }),
      { sms: 0, emails: 0 }
    );
  }, [layer2Schemes]);

  const layer3Totals = useMemo(() => {
    return layer3Schemes.reduce(
      (acc, s) => ({
        sms: acc.sms + (s.ce_se_sms_count || 0),
        emails: acc.emails + (s.total_email_count || 0),
      }),
      { sms: 0, emails: 0 }
    );
  }, [layer3Schemes]);

  const layer4Totals = useMemo(() => {
    return layer4Schemes.reduce(
      (acc, s) => ({
        sms: acc.sms + (s.ms_sms_count || s.ce_se_sms_count || 0),
        emails: acc.emails + (s.total_email_count || 0),
      }),
      { sms: 0, emails: 0 }
    );
  }, [layer4Schemes]);

  const layer5Totals = useMemo(() => {
    return layer5Schemes.reduce(
      (acc, s) => ({
        sms: acc.sms + (s.ps_sms_count || s.ms_sms_count || s.ce_se_sms_count || 0),
        emails: acc.emails + (s.total_email_count || 0),
      }),
      { sms: 0, emails: 0 }
    );
  }, [layer5Schemes]);

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
                Official Alert & Escalation Registry:
                <strong> Level 1 (DE/AE Civil)</strong> Daily Operational Alert (Day 1) •
                <strong> Level 2 (EE Civil)</strong> Escalated after 3 Days without resolution •
                <strong> Level 3 (CE & SE)</strong> Weekly Review Notice for issues pending 7+ Days •
                <strong> Level 4 (MS)</strong> Direct Notice to Member Secretary for issues pending 15+ Days.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={openExecutiveModal}
                className="h-8 text-xs border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold"
              >
                <User className="w-3.5 h-3.5 mr-1.5 text-purple-700" />
                Configure MS & PS Details
              </Button>

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

          {/* OFFICIAL KEY METRIC STRIP (Wide, Simple, Monospace Numbers) */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Schemes</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {schemes.length}
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 1 (Day 1)</div>
              <div className="text-lg font-bold font-mono text-blue-900 mt-0.5">
                {layer1Schemes.length}
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 2 (3+ Days)</div>
              <div className="text-lg font-bold font-mono text-amber-900 mt-0.5">
                {layer2Schemes.length}
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 3 (7+ Days)</div>
              <div className="text-lg font-bold font-mono text-red-900 mt-0.5">
                {layer3Schemes.length}
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 4 (10+ Days)</div>
              <div className="text-lg font-bold font-mono text-purple-900 mt-0.5">
                {layer4Schemes.length}
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 5 (15+ Days)</div>
              <div className="text-lg font-bold font-mono text-indigo-950 mt-0.5">
                {layer5Schemes.length}
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total SMS</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {overallTotals.totalSms}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Emails</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {overallTotals.totalEmails}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5 HIERARCHY CARDS: HORIZONTAL, CLEAN GOVERNMENT CARDS      */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          
          {/* CARD 1: LEVEL 1 - DE / AE */}
          <div
            onClick={() => setActiveLayer(activeLayer === "layer1" ? "all" : "layer1")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
              activeLayer === "layer1"
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

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Schemes</span>
                  <span className="font-bold font-mono text-blue-950 text-base">{layer1Schemes.length}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 font-mono">
                  <span>{layer1Totals.sms} SMS</span>
                  <span>{layer1Totals.emails} Emails</span>
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
            onClick={() => setActiveLayer(activeLayer === "layer2" ? "all" : "layer2")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
              activeLayer === "layer2"
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

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Schemes</span>
                  <span className="font-bold font-mono text-amber-900 text-base">{layer2Schemes.length}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 font-mono">
                  <span>{layer2Totals.sms} SMS</span>
                  <span>{layer2Totals.emails} Emails</span>
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
            onClick={() => setActiveLayer(activeLayer === "layer3" ? "all" : "layer3")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
              activeLayer === "layer3"
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

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Schemes</span>
                  <span className="font-bold font-mono text-red-900 text-base">{layer3Schemes.length}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 font-mono">
                  <span>{layer3Totals.sms} SMS</span>
                  <span>{layer3Totals.emails} Emails</span>
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

          {/* CARD 4: LEVEL 4 - MS */}
          <div
            onClick={() => setActiveLayer(activeLayer === "layer4" ? "all" : "layer4")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
              activeLayer === "layer4"
                ? "border-purple-900 ring-2 ring-purple-900/30 bg-purple-50/30"
                : "border-slate-300 hover:border-purple-400"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-950">
                  Level 4 • MS
                </span>
                <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-300 font-bold text-purple-900">
                  10+ Days
                </Badge>
              </div>

              <div className="bg-purple-50/50 p-2.5 rounded border border-purple-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Schemes</span>
                  <span className="font-bold font-mono text-purple-950 text-base">{layer4Schemes.length}</span>
                </div>
                <div className="flex justify-between text-[11px] text-purple-900 pt-1 border-t border-purple-200/80 font-mono">
                  <span>{layer4Totals.sms} SMS</span>
                  <span>{layer4Totals.emails} Emails</span>
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

          {/* CARD 5: LEVEL 5 - PS */}
          <div
            onClick={() => setActiveLayer(activeLayer === "layer5" ? "all" : "layer5")}
            className={`cursor-pointer bg-white border rounded-lg p-3.5 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
              activeLayer === "layer5"
                ? "border-indigo-950 ring-2 ring-indigo-950/30 bg-indigo-50/30"
                : "border-slate-300 hover:border-indigo-400"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  Level 5 • PS
                </span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 border-indigo-300 font-bold text-indigo-950">
                  15+ Days
                </Badge>
              </div>

              <div className="bg-indigo-50/50 p-2.5 rounded border border-indigo-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Schemes</span>
                  <span className="font-bold font-mono text-indigo-950 text-base">{layer5Schemes.length}</span>
                </div>
                <div className="flex justify-between text-[11px] text-indigo-950 pt-1 border-t border-indigo-200/80 font-mono">
                  <span>{layer5Totals.sms} SMS</span>
                  <span>{layer5Totals.emails} Emails</span>
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
        {/* FULL-WIDTH GOVERNMENT REGISTRY DATA TABLE & TOOLBAR       */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
          
          {/* Table Toolbar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Layer Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-300 flex-wrap">
              <button
                onClick={() => setActiveLayer("all")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Schemes ({schemes.length})
              </button>
              <button
                onClick={() => setActiveLayer("layer1")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "layer1"
                    ? "bg-blue-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Level 1: DE / AE ({layer1Schemes.length})
              </button>
              <button
                onClick={() => setActiveLayer("layer2")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "layer2"
                    ? "bg-amber-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Level 2: EE ({layer2Schemes.length})
              </button>
              <button
                onClick={() => setActiveLayer("layer3")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "layer3"
                    ? "bg-red-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Level 3: CE & SE ({layer3Schemes.length})
              </button>
              <button
                onClick={() => setActiveLayer("layer4")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "layer4"
                    ? "bg-purple-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Level 4: MS ({layer4Schemes.length})
              </button>
              <button
                onClick={() => setActiveLayer("layer5")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "layer5"
                    ? "bg-indigo-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Level 5: PS ({layer5Schemes.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by scheme name, ID, engineer, district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active Context Banner */}
          <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 text-xs text-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {activeLayer === "layer1" && "Level 1: Daily notice sent today to DE/AE Akshay Bhojane (Day 1 issue)"}
                {activeLayer === "layer2" && "Level 2: Escalated to Executive Engineer (EE) after 3 consecutive days without resolution"}
                {activeLayer === "layer3" && "Level 3: Weekly notice sent to Chief Engineer (CE) & Superintending Engineer (SE) for issues pending 7+ days"}
                {activeLayer === "layer4" && "Level 4: Notice sent to Member Secretary (MS), MJP every 10 days for persistent issues (10+ days)"}
                {activeLayer === "layer5" && "Level 5: Notice sent to Principal Secretary (PS) after 15 days if issues persist (15+ days)"}
                {activeLayer === "all" && "All Schemes: Multi-tier escalation status and message log (SMS & Email)"}
              </span>
            </div>
            <span className="font-mono text-slate-500">
              Showing {displayedSchemes.length} of {schemes.length} schemes
            </span>
          </div>

          {/* Loading or Empty State */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
              <p className="text-xs">Loading official registry data...</p>
            </div>
          ) : displayedSchemes.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-1">
              <p className="text-sm font-semibold text-slate-700">No schemes found</p>
              <p className="text-xs text-slate-400">There are currently no schemes matching this filter.</p>
            </div>
          ) : (
            /* WIDE GOVERNMENT DATA TABLE */
            <div className="overflow-x-auto w-full">
              <table className="w-full escalation-table text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[11px] tracking-wider !text-center">
                    <th style={{ textAlign: "center" }} className="py-2.5 px-3 border-r border-slate-200 w-12 !text-center">Sr.</th>
                    <th style={{ textAlign: "center" }} className="py-2.5 px-4 border-r border-slate-200 min-w-[200px] !text-center">Scheme & Region</th>
                    <th style={{ textAlign: "center" }} className="py-2.5 px-3 border-r border-slate-200 min-w-[130px] !text-center">Current Level</th>
                    <th style={{ textAlign: "center" }} className="py-2.5 px-3 border-r border-slate-200 min-w-[180px] !text-center">Days Unresolved</th>
                    <th style={{ textAlign: "center" }} className="py-2.5 px-4 border-r border-slate-200 min-w-[220px] !text-center">Designated Officer</th>
                    <th style={{ textAlign: "center" }} className="py-2.5 px-3 border-r border-slate-200 min-w-[190px] !text-center">Actual Dispatches</th>
                    <th style={{ textAlign: "center" }} className="py-2.5 px-3 border-r border-slate-200 min-w-[210px] !text-center">Active Issues</th>
                    <th style={{ textAlign: "center" }} className="py-2.5 px-3 !text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedSchemes.map((scheme, idx) => {
                    // Determine assigned officer & tier based on activeLayer or current scheme level
                    let targetTier: "DE" | "EE" | "CE" | "MS" | "PS" = "DE";
                    let officerName = scheme.de_ae_civil_name || "Akshay Bhojane";
                    let officerRole = "DE / AE (Civil)";
                    let officerMobile = scheme.de_ae_civil_mobile || "5596356782";
                    let officerEmail = scheme.de_ae_civil_email || "akshay.bhojane@cstech.ai";

                    if (activeLayer === "layer5" || (activeLayer === "all" && scheme.escalation_level === 5)) {
                      targetTier = "PS";
                      officerName = "Principal Secretary (PS)";
                      officerRole = "Principal Secretary, WSS";
                      officerMobile = "Secretariat";
                      officerEmail = "ps.wss@maharashtra.gov.in";
                    } else if (activeLayer === "layer4" || (activeLayer === "all" && scheme.escalation_level === 4)) {
                      targetTier = "MS";
                      officerName = "Member Secretary (MS)";
                      officerRole = "Member Secretary, MJP";
                      officerMobile = "Head Office";
                      officerEmail = "ms.mjp@gov.in";
                    } else if (activeLayer === "layer3" || (activeLayer === "all" && scheme.escalation_level === 3)) {
                      targetTier = "CE";
                      officerName = `${scheme.chief_engineer_name || "Deepak Ingale"} (CE) & ${scheme.se_name || "Rishikesh Salunkhe"} (SE)`;
                      officerRole = "Chief Engineer & SE";
                      officerMobile = `${scheme.chief_engineer_mobile || "8852634598"} / ${scheme.se_mobile || "9965253645"}`;
                      officerEmail = scheme.chief_engineer_email || "deepal.ingale@cstech.ai";
                    } else if (activeLayer === "layer2" || (activeLayer === "all" && scheme.escalation_level === 2)) {
                      targetTier = "EE";
                      officerName = scheme.ee_civil_name || "Rishikesh Salunke";
                      officerRole = "Executive Engineer (EE)";
                      officerMobile = scheme.ee_civil_mobile || "9834955236";
                      officerEmail = scheme.ee_civil_email || "salunkerishikesh@gmail.com";
                    }

                    return (
                      <tr
                        key={scheme.scheme_id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* Sr. No. */}
                        <td className="py-3 px-3 text-center border-r border-slate-200 font-mono text-slate-500 font-medium">
                          {idx + 1}
                        </td>

                        {/* Scheme Name & ID */}
                        <td className="py-3 px-4 border-r border-slate-200">
                          <div className="font-semibold text-slate-900 text-xs">
                            {scheme.scheme_name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-slate-700 bg-slate-100 px-1 rounded">
                              ID: {scheme.scheme_id}
                            </span>
                            <span>•</span>
                            <span>{scheme.region} Region</span>
                            {scheme.district && (
                              <>
                                <span>•</span>
                                <span>{scheme.district}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Current Level */}
                        <td className="py-3 px-3 border-r border-slate-200">
                          {scheme.escalation_level === 5 ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-indigo-950 text-white text-[10px] rounded font-bold">
                                Level 5 (PS)
                              </Badge>
                              <div className="text-[10px] text-indigo-950 font-semibold">15+ Days Notice</div>
                            </div>
                          ) : scheme.escalation_level === 4 ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-purple-900 text-white text-[10px] rounded font-bold">
                                Level 4 (MS)
                              </Badge>
                              <div className="text-[10px] text-purple-900 font-semibold">10+ Days Notice</div>
                            </div>
                          ) : scheme.escalation_level === 3 ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-red-800 text-white text-[10px] rounded font-bold">
                                Level 3 (CE & SE)
                              </Badge>
                              <div className="text-[10px] text-slate-500">CE & SE Weekly Notice</div>
                            </div>
                          ) : scheme.escalation_level === 2 ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-amber-700 text-white text-[10px] rounded font-bold">
                                Level 2 (EE)
                              </Badge>
                              <div className="text-[10px] text-slate-500">EE Escalation Notice</div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge className="bg-blue-900 text-white text-[10px] rounded font-bold">
                                Level 1 (DE)
                              </Badge>
                              <div className="text-[10px] text-slate-500">DE Daily Notice</div>
                            </div>
                          )}
                        </td>

                        {/* Days Unresolved */}
                        <td className="py-3 px-3 border-r border-slate-200">
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1">
                              <span>{scheme.max_streak_days} Days Unresolved</span>
                              <span className="text-[10px] text-slate-500 font-sans font-normal">
                                ({scheme.max_streak_days}d streak)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {scheme.max_streak_days >= 15 ? (
                                <span className="text-indigo-950 font-bold">15+ Days (Escalated to PS)</span>
                              ) : scheme.max_streak_days >= 10 ? (
                                <span className="text-purple-900 font-bold">10+ Days (Escalated to MS)</span>
                              ) : scheme.max_streak_days >= 7 ? (
                                <span className="text-red-700 font-medium">7+ Days (Escalated to CE & SE)</span>
                              ) : scheme.max_streak_days >= 3 ? (
                                <span className="text-amber-800 font-medium">3+ Days (Escalated to EE)</span>
                              ) : (
                                <span className="text-slate-600">Day 1 (Sent to DE / AE)</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Designated Officer */}
                        <td className="py-3 px-4 border-r border-slate-200">
                          <div className="font-semibold text-slate-900">
                            {officerName}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium">
                            {officerRole}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              {officerMobile}
                            </span>
                          </div>
                        </td>

                        {/* Actual Dispatches (SMS & Emails) */}
                        <td className="py-3 px-3 border-r border-slate-200">
                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="flex items-center justify-between bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <span className="text-slate-600 text-[10px] font-sans">DE SMS:</span>
                              <span className="font-bold text-slate-900">{scheme.de_sms_count}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <span className="text-slate-600 text-[10px] font-sans">EE SMS:</span>
                              <span className="font-bold text-slate-900">{scheme.ee_sms_count}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              <span className="text-slate-600 text-[10px] font-sans">CE/SE SMS:</span>
                              <span className="font-bold text-slate-900">{scheme.ce_se_sms_count}</span>
                            </div>
                            {scheme.ms_sms_count > 0 && (
                              <div className="flex items-center justify-between bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                <span className="text-purple-900 text-[10px] font-sans font-semibold">MS SMS:</span>
                                <span className="font-bold text-purple-900">{scheme.ms_sms_count}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              <span className="text-slate-700 text-[10px] font-sans font-medium">Emails:</span>
                              <span className="font-bold text-slate-900">{scheme.total_email_count}</span>
                            </div>
                          </div>
                        </td>

                        {/* Breach Points Breakdown */}
                        <td className="py-3 px-3 border-r border-slate-200">
                          <div className="space-y-1 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1 text-[10px]">
                              {scheme.lpcd_villages_count > 0 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800">
                                  LPCD: <strong>{scheme.lpcd_villages_count} Villages</strong>
                                </span>
                              )}
                              {scheme.chlorine_low_count > 0 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800">
                                  Low Cl: <strong>{scheme.chlorine_low_count} ESRs</strong>
                                </span>
                              )}
                              {scheme.pressure_low_count > 0 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800">
                                  Low Press: <strong>{scheme.pressure_low_count} ESRs</strong>
                                </span>
                              )}
                              {scheme.offline_count > 0 && (
                                <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-800">
                                  Offline: <strong>{scheme.offline_count} Sensors</strong>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-slate-900">
                              Total Issues: {scheme.total_issues_count}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPreview(scheme, targetTier)}
                            className="h-7 text-xs bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-600" />
                            View Notice
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <strong>Official Note:</strong> All SMS notifications are dispatched via Smartping DLT-approved templates. Official email digests are sent via automated notification queues.
            </div>
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
      </div>
    </DashboardLayout>
  );
}
