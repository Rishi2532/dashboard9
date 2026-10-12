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
  escalation_level: 1 | 2 | 3;
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
  ee_escalated: boolean;
  ce_escalated: boolean;
  // Real Notified Message Counts
  de_sms_count: number;
  ee_sms_count: number;
  ce_se_sms_count: number;
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

  // Active layer view: "all" | "layer1" (DE/AE Daily) | "layer2" (EE >3 Days) | "layer3" (SE & CE Weekly)
  const [activeLayer, setActiveLayer] = useState<"all" | "layer1" | "layer2" | "layer3">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Notice preview modal
  const [previewScheme, setPreviewScheme] = useState<SchemeEscalationItem | null>(null);
  const [previewTier, setPreviewTier] = useState<"DE" | "EE" | "CE">("DE");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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
    return schemes.filter((s) => s.max_streak_days >= 7 || s.escalation_level === 3);
  }, [schemes]);

  // Active list filtered by search term and layer
  const displayedSchemes = useMemo(() => {
    let list: SchemeEscalationItem[] = [];
    if (activeLayer === "all") list = schemes;
    else if (activeLayer === "layer1") list = layer1Schemes;
    else if (activeLayer === "layer2") list = layer2Schemes;
    else if (activeLayer === "layer3") list = layer3Schemes;

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
  }, [activeLayer, schemes, layer1Schemes, layer2Schemes, layer3Schemes, searchTerm]);

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
  const openPreview = async (scheme: SchemeEscalationItem, tier: "DE" | "EE" | "CE") => {
    setPreviewScheme(scheme);
    setPreviewTier(tier);
    setPreviewLoading(true);
    setPreviewData(null);

    try {
      let url = "";
      if (tier === "DE") url = `/api/escalation/preview-de/${scheme.scheme_id}`;
      else if (tier === "EE") url = `/api/escalation/preview-ee/${scheme.scheme_id}`;
      else url = `/api/escalation/preview-ce/${scheme.region || "Nagpur"}`;

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
                Three-Tier Automated Alert & Escalation Vigilance Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-5xl leading-relaxed">
                Official Multi-Tier Alert Dispatch Registry:
                <strong> Level 1 (DE/AE Civil)</strong> Daily Operational Alert (Day 1) •
                <strong> Level 2 (EE Civil)</strong> Escalated after 3 Days without resolution •
                <strong> Level 3 (CE & SE)</strong> Weekly Apex Review Notice for 1 full week (7+ Days) chronic persistence.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center">
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
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Schemes</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {schemes.length} <span className="text-[11px] font-sans font-normal text-slate-500">Schemes</span>
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 1 (DE / AE Daily)</div>
              <div className="text-lg font-bold font-mono text-blue-900 mt-0.5">
                {layer1Schemes.length} <span className="text-[11px] font-sans font-normal text-slate-500">Active</span>
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 2 (EE &gt;3 Days)</div>
              <div className="text-lg font-bold font-mono text-amber-900 mt-0.5">
                {layer2Schemes.length} <span className="text-[11px] font-sans font-normal text-slate-500">Escalated</span>
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Level 3 (CE/SE Weekly)</div>
              <div className="text-lg font-bold font-mono text-red-900 mt-0.5">
                {layer3Schemes.length} <span className="text-[11px] font-sans font-normal text-slate-500">Chronic</span>
              </div>
            </div>
            <div className="border-r border-slate-200 last:border-0 pr-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total SMS Sent</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {overallTotals.totalSms} <span className="text-[11px] font-sans font-normal text-slate-500">SMS</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Emails Sent</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {overallTotals.totalEmails} <span className="text-[11px] font-sans font-normal text-slate-500">Emails</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3 HIERARCHY CARDS: SIMPLE, GOVERNMENT TABLE-STYLE CARDS   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CARD 1: LAYER 1 - DE / AE Civil (Daily Notice) */}
          <div
            onClick={() => setActiveLayer("layer1")}
            className={`cursor-pointer bg-white border rounded-lg p-4 transition-colors relative flex flex-col justify-between ${
              activeLayer === "layer1"
                ? "border-blue-900 ring-2 ring-blue-900/20 bg-blue-50/20"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-900 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-950">
                    Level 1: Sub-Division (DE / AE Civil)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  Daily Alert (Day 1)
                </Badge>
              </div>

              {/* Cadence rule note */}
              <div className="text-[11px] text-slate-600 leading-snug">
                <strong>Rule:</strong> Dispatched immediately on Day 1 to the Deputy Engineer when any telemetry threshold is breached (LPCD &lt;55, Low/High Chlorine, Low Pressure, or Offline).
              </div>

              {/* Dynamic Schemes in Layer 1 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                  <span>Active Schemes ({layer1Schemes.length}):</span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {layer1Schemes.map((s) => (
                    <div
                      key={s.scheme_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm(s.scheme_name);
                      }}
                      className="text-[11px] p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center justify-between"
                      title="Click to filter table"
                    >
                      <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {s.scheme_name}
                      </span>
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 border border-slate-200 rounded font-bold text-slate-700">
                        {s.max_streak_days} {s.max_streak_days === 1 ? "day" : "days"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notified Officers */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div className="text-[11px] font-semibold text-slate-700">
                  Designated Field Engineers:
                </div>
                {layer1Engineers.map((eng) => (
                  <div key={eng.name} className="flex items-center justify-between text-[11px] text-slate-700">
                    <span className="font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {eng.name} (DE/AE)
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">{eng.mobile}</span>
                  </div>
                ))}
              </div>

              {/* Actual Notification Counts */}
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <MessageSquare className="w-3 h-3 text-slate-500" /> SMS Sent to DE/AE:
                  </span>
                  <span className="font-mono font-bold text-slate-900">{layer1Totals.sms} SMS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <Mail className="w-3 h-3 text-slate-500" /> Emails Sent:
                  </span>
                  <span className="font-mono font-bold text-slate-900">{layer1Totals.emails} Emails</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-blue-900 font-medium">
              <span>{layer1Schemes.length} schemes with active breaches</span>
              <span className="underline">View Schemes in Table →</span>
            </div>
          </div>

          {/* CARD 2: LAYER 2 - EE Civil (Escalated After 3 Days) */}
          <div
            onClick={() => setActiveLayer("layer2")}
            className={`cursor-pointer bg-white border rounded-lg p-4 transition-colors relative flex flex-col justify-between ${
              activeLayer === "layer2"
                ? "border-amber-700 ring-2 ring-amber-700/20 bg-amber-50/20"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-amber-700 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                    Level 2: Division (EE Civil)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  3-Day Escalation (&gt;3 Days)
                </Badge>
              </div>

              {/* Cadence rule note */}
              <div className="text-[11px] text-slate-600 leading-snug">
                <strong>Rule:</strong> Alert sent to DE for 3 consecutive days without resolution $\rightarrow$ Automatically escalated to Executive Engineer.
              </div>

              {/* Dynamic Schemes in Layer 2 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                  <span>Escalated Schemes ({layer2Schemes.length}):</span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {layer2Schemes.map((s) => (
                    <div
                      key={s.scheme_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm(s.scheme_name);
                      }}
                      className="text-[11px] p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center justify-between"
                      title="Click to filter table"
                    >
                      <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {s.scheme_name}
                      </span>
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 border border-slate-200 rounded font-bold text-amber-900">
                        {s.max_streak_days} days streak
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notified Officers */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div className="text-[11px] font-semibold text-slate-700">
                  Designated Division Head:
                </div>
                {layer2Engineers.map((eng) => (
                  <div key={eng.name} className="flex items-center justify-between text-[11px] text-slate-700">
                    <span className="font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {eng.name} (EE)
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">{eng.mobile}</span>
                  </div>
                ))}
              </div>

              {/* Actual Notification Counts */}
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <MessageSquare className="w-3 h-3 text-slate-500" /> SMS Sent to EE:
                  </span>
                  <span className="font-mono font-bold text-slate-900">{layer2Totals.sms} SMS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <Mail className="w-3 h-3 text-slate-500" /> Division Emails Sent:
                  </span>
                  <span className="font-mono font-bold text-slate-900">{layer2Totals.emails} Emails</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-amber-900 font-medium">
              <span>Sent to DE 3 days without fix $\rightarrow$ EE Escalation</span>
              <span className="underline">View Schemes in Table →</span>
            </div>
          </div>

          {/* CARD 3: LAYER 3 - SE & CE Apex (Weekly Notice) */}
          <div
            onClick={() => setActiveLayer("layer3")}
            className={`cursor-pointer bg-white border rounded-lg p-4 transition-colors relative flex flex-col justify-between ${
              activeLayer === "layer3"
                ? "border-red-900 ring-2 ring-red-900/20 bg-red-50/20"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-red-900 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-950">
                    Level 3: Apex Regional (CE & SE)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-300 font-semibold text-slate-700">
                  Weekly Notice (1 Wk+)
                </Badge>
              </div>

              {/* Cadence rule note */}
              <div className="text-[11px] text-slate-600 leading-snug">
                <strong>Rule:</strong> Chronic issue unresolved for 1 full week (7+ days) despite DE & EE alerts $\rightarrow$ Weekly apex vigilance notice sent to Chief Engineer & Superintending Engineer.
              </div>

              {/* Dynamic Schemes in Layer 3 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                  <span>Chronic Schemes ({layer3Schemes.length}):</span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {layer3Schemes.map((s) => (
                    <div
                      key={s.scheme_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm(s.scheme_name);
                      }}
                      className="text-[11px] p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center justify-between"
                      title="Click to filter table"
                    >
                      <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {s.scheme_name}
                      </span>
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 border border-slate-200 rounded font-bold text-red-900">
                        {s.max_streak_days} days (1 Wk+)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notified Officers */}
              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div className="text-[11px] font-semibold text-slate-700">
                  Apex Regional Authorities:
                </div>
                {layer3Engineers.map((eng) => (
                  <div key={eng.name} className="flex items-center justify-between text-[11px] text-slate-700">
                    <span className="font-medium flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {eng.name} ({eng.role.includes("Chief") ? "CE" : "SE"})
                    </span>
                    <span className="font-mono text-slate-500 text-[10px]">{eng.mobile}</span>
                  </div>
                ))}
              </div>

              {/* Actual Notification Counts */}
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <MessageSquare className="w-3 h-3 text-slate-500" /> Weekly SMS to CE & SE:
                  </span>
                  <span className="font-mono font-bold text-slate-900">{layer3Totals.sms} SMS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <Mail className="w-3 h-3 text-slate-500" /> Regional Digest Emails:
                  </span>
                  <span className="font-mono font-bold text-slate-900">{layer3Totals.emails} Emails</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-red-900 font-medium">
              <span>Unimproved for 1 Week $\rightarrow$ Weekly Apex Notice</span>
              <span className="underline">View Schemes in Table →</span>
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
            <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-300">
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
                Level 1: DE/AE Daily ({layer1Schemes.length})
              </button>
              <button
                onClick={() => setActiveLayer("layer2")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "layer2"
                    ? "bg-amber-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Level 2: EE &gt;3 Days ({layer2Schemes.length})
              </button>
              <button
                onClick={() => setActiveLayer("layer3")}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                  activeLayer === "layer3"
                    ? "bg-red-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Level 3: CE/SE Weekly ({layer3Schemes.length})
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
                {activeLayer === "layer1" && "Level 1: Daily operational notice dispatched today to Sub-Division DE/AE Akshay Bhojane (Day 1 breach)"}
                {activeLayer === "layer2" && "Level 2: Escalated to Executive Engineer (EE) after 3 consecutive days without resolution"}
                {activeLayer === "layer3" && "Level 3: Weekly apex notice issued to Chief Engineer (CE) & Superintending Engineer (SE) for 7+ days chronic persistence"}
                {activeLayer === "all" && "All Schemes: Multi-tier escalation status and actual transmitted messages registry (SMS & Email Log)"}
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
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center">Sr.</th>
                    <th className="py-2.5 px-4 border-r border-slate-200 min-w-[200px]">Scheme & Region</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">Current Level</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">Persistence & Cadence</th>
                    <th className="py-2.5 px-4 border-r border-slate-200 min-w-[220px]">Designated Officer</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[190px]">Actual Dispatches</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[210px] text-center">Technical Breach Points</th>
                    <th className="py-2.5 px-3 text-right w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedSchemes.map((scheme, idx) => {
                    // Determine assigned officer & tier based on activeLayer or current scheme level
                    let targetTier: "DE" | "EE" | "CE" = "DE";
                    let officerName = scheme.de_ae_civil_name || "Akshay Bhojane";
                    let officerRole = "DE / AE (Civil)";
                    let officerMobile = scheme.de_ae_civil_mobile || "5596356782";
                    let officerEmail = scheme.de_ae_civil_email || "akshay.bhojane@cstech.ai";

                    if (activeLayer === "layer2" || (activeLayer === "all" && scheme.escalation_level === 2)) {
                      targetTier = "EE";
                      officerName = scheme.ee_civil_name || "Rishikesh Salunke";
                      officerRole = "Executive Engineer (EE)";
                      officerMobile = scheme.ee_civil_mobile || "9834955236";
                      officerEmail = scheme.ee_civil_email || "salunkerishikesh@gmail.com";
                    } else if (activeLayer === "layer3" || (activeLayer === "all" && scheme.escalation_level === 3)) {
                      targetTier = "CE";
                      officerName = `${scheme.chief_engineer_name || "Deepak Ingale"} (CE) & ${scheme.se_name || "Rishikesh Salunkhe"} (SE)`;
                      officerRole = "Chief Engineer & SE";
                      officerMobile = `${scheme.chief_engineer_mobile || "8852634598"} / ${scheme.se_mobile || "9965253645"}`;
                      officerEmail = scheme.chief_engineer_email || "deepal.ingale@cstech.ai";
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
                          {scheme.escalation_level === 3 ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-red-800 text-white text-[10px] rounded font-bold">
                                Level 3 (Apex)
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

                        {/* Streak & Cadence */}
                        <td className="py-3 px-3 border-r border-slate-200">
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1">
                              <span>{scheme.max_streak_days} Days Unresolved</span>
                              <span className="text-[10px] text-slate-500 font-sans font-normal">
                                ({scheme.max_streak_days}d streak)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {scheme.max_streak_days >= 7 ? (
                                <span className="text-red-700 font-medium">Over 1 Full Week (Weekly Notice)</span>
                              ) : scheme.max_streak_days >= 3 ? (
                                <span className="text-amber-800 font-medium">DE notified 3 days $\rightarrow$ Escalated to EE</span>
                              ) : (
                                <span className="text-slate-600">Daily Notice Cadence (Day 1)</span>
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
                        <td className="py-3 px-3 text-right">
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
                        ? "Level 1: Sub-Division DE/AE Daily Notice (Day 1)"
                        : previewTier === "EE"
                        ? "Level 2: Division EE Escalation Notice (>3 Days)"
                        : "Level 3: Apex Regional CE/SE Weekly Notice (1 Week+)"}
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
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
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
      </div>
    </DashboardLayout>
  );
}
