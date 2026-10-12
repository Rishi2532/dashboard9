import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Search,
  RefreshCw,
  BellRing,
  Users,
  Building2,
  CheckCircle2,
  Phone,
  Mail,
  Copy,
  Check,
  Send,
  Eye,
  Info,
  Calendar,
  Layers,
  Sparkles,
  SlidersHorizontal,
  X,
  AlertCircle,
  FileSpreadsheet,
  MessageSquare,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface SentAlertItem {
  id: number;
  channel: "sms" | "email";
  created_at: string;
  scheme_id: string;
  scheme_name: string;
  recipient_name: string;
  recipient_email?: string;
  recipient_mobile?: string;
  recipient_role: string;
  tier: 1 | 2 | 3;
  alert_title: string;
  message_content: string;
  status: string;
  dispatch_type?: string;
}

interface SentAlertsResponse {
  success: boolean;
  timestamp: string;
  timeRange: string;
  summary: {
    total_sent: number;
    sms_sent: number;
    email_sent: number;
    tier_1_sent: number;
    tier_2_sent: number;
    tier_3_sent: number;
    today_sent_count: number;
    last_dispatched_at: string | null;
  };
  alerts: SentAlertItem[];
}

export default function EscalationPortalPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [timeRange, setTimeRange] = useState<"today" | "7days" | "30days" | "all">("today");
  const [selectedTier, setSelectedTier] = useState<"all" | "1" | "2" | "3">("all");
  const [selectedChannel, setSelectedChannel] = useState<"all" | "sms" | "email">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMatrixRules, setShowMatrixRules] = useState(false);

  // Modal inspection
  const [inspectAlert, setInspectAlert] = useState<SentAlertItem | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Dispatch modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchDryRun, setDispatchDryRun] = useState(true);

  // Query actual sent alerts
  const { data, isLoading, refetch, isFetching } = useQuery<SentAlertsResponse>({
    queryKey: ["/api/escalation/sent-alerts", timeRange, selectedTier, selectedChannel, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("timeRange", timeRange);
      if (selectedTier !== "all") params.set("tier", selectedTier);
      if (selectedChannel !== "all") params.set("channel", selectedChannel);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/escalation/sent-alerts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load sent alerts");
      return res.json();
    },
  });

  // Manual Trigger Mutation
  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/escalation/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: dispatchDryRun }),
      });
      if (!res.ok) throw new Error("Dispatch failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: dispatchDryRun ? "Simulation Complete" : "Alerts Dispatched Successfully",
        description: `Dispatched ${data.results?.ee_count || 0} Tier 2 notices & ${data.results?.ce_count || 0} Tier 3 notices.`,
      });
      setDispatchModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/escalation/sent-alerts"] });
    },
    onError: (err: any) => {
      toast({
        title: "Dispatch Failed",
        description: err.message || "Failed to trigger alerts",
        variant: "destructive",
      });
    },
  });

  const summary = data?.summary || {
    total_sent: 0,
    sms_sent: 0,
    email_sent: 0,
    tier_1_sent: 0,
    tier_2_sent: 0,
    tier_3_sent: 0,
    today_sent_count: 0,
    last_dispatched_at: null,
  };

  const alerts = data?.alerts || [];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast({ title: "Copied to Clipboard", description: "Message content copied." });
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
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* ========================================================= */}
        {/* TOP BANNER: Simple, Clean & Transparent                   */}
        {/* ========================================================= */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 text-xs font-semibold">
                  <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Live Dispatches Audit Log
                </Badge>
                <Badge variant="outline" className="text-slate-300 border-slate-700 text-xs">
                  Smartping DLT & SMTP
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Sent Escalation Alerts
              </h1>
              <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
                Live audit trail showing only alerts that have <span className="font-semibold text-white">actually been dispatched</span> to Field (Tier 1), Division (Tier 2), and Regional Apex (Tier 3) engineers.
              </p>
            </div>

            {/* Quick Actions & Time Selector */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center">
                <Button
                  size="sm"
                  variant={timeRange === "today" ? "default" : "ghost"}
                  onClick={() => setTimeRange("today")}
                  className={`text-xs h-8 px-3 rounded-lg ${
                    timeRange === "today" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={timeRange === "7days" ? "default" : "ghost"}
                  onClick={() => setTimeRange("7days")}
                  className={`text-xs h-8 px-3 rounded-lg ${
                    timeRange === "7days" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Last 7 Days
                </Button>
                <Button
                  size="sm"
                  variant={timeRange === "30days" ? "default" : "ghost"}
                  onClick={() => setTimeRange("30days")}
                  className={`text-xs h-8 px-3 rounded-lg ${
                    timeRange === "30days" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  30 Days
                </Button>
                <Button
                  size="sm"
                  variant={timeRange === "all" ? "default" : "ghost"}
                  onClick={() => setTimeRange("all")}
                  className={`text-xs h-8 px-3 rounded-lg ${
                    timeRange === "all" ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  All Time
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 h-8 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin text-indigo-400" : ""}`} />
                Refresh
              </Button>

              <Button
                size="sm"
                onClick={() => setDispatchModalOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-xs h-8 shadow-md"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Trigger Dispatch
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TODAY EMPTY STATE ALERT (Clarifying why 0 alerts today)    */}
        {/* ========================================================= */}
        {timeRange === "today" && summary.total_sent === 0 && (
          <div className="rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/60 rounded-lg text-blue-700 dark:text-blue-300">
                <Info className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
                    No Escalation Alerts Dispatched Today
                  </h3>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Audit Clean
                  </Badge>
                </div>
                <p className="text-xs text-blue-800/80 dark:text-blue-300/80">
                  Automated daily alert dispatches are scheduled to run at <strong>10:00 AM</strong>. No alert dispatches have been executed yet today.
                  {summary.last_dispatched_at && (
                    <span> Last recorded dispatch occurred on <strong>{formatDate(summary.last_dispatched_at)}</strong>.</span>
                  )}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTimeRange("7days")}
                    className="h-7 text-xs bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    View Last 7 Days (Recent Dispatches)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTimeRange("all")}
                    className="h-7 text-xs bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    View All Time History
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDispatchModalOpen(true)}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Dispatch Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CREATIVE & SIMPLE KPI CARDS (THE NUMBERS)                 */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Alerts Sent */}
          <Card className="relative overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Dispatched
                </span>
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <BellRing className="w-4 h-4" />
                </span>
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white pt-1">
                {summary.total_sent.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>SMS: <strong>{summary.sms_sent.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Email: <strong>{summary.email_sent.toLocaleString()}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Tier 1 (Field DE/AE) */}
          <Card className="relative overflow-hidden border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Tier 1: Field Notice
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] py-0 px-1.5">
                  DE / AE Civil
                </Badge>
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-emerald-900 dark:text-emerald-100 pt-1">
                {summary.tier_1_sent.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Dispatched to Sub-Division & Field Civil Engineers (Akshay Bhojane & team)
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Tier 2 (Division EE Civil) */}
          <Card className="relative overflow-hidden border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Tier 2: Division Escalation
                </span>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] py-0 px-1.5">
                  EE Civil (&gt;3 Days)
                </Badge>
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-amber-900 dark:text-amber-100 pt-1">
                {summary.tier_2_sent.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                Dispatched to Executive Engineers for breaches persistent &gt;3 days (Rishikesh Salunke)
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Tier 3 (Apex Chief Engineer & SE) */}
          <Card className="relative overflow-hidden border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Tier 3: Apex Regional
                </span>
                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 text-[10px] py-0 px-1.5">
                  CE / SE (&gt;7 Days)
                </Badge>
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-rose-900 dark:text-rose-100 pt-1">
                {summary.tier_3_sent.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80">
                Dispatched to Chief Engineer & SE for unresolved chronic breaches &gt;7 days (Deepak Ingale)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* EXPANDABLE EXPLANATION OF ESCALATION RULES                */}
        {/* ========================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowMatrixRules(!showMatrixRules)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  How the 3-Tier Escalation Hierarchy Works
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                  (Field Notice Day 1 → EE Escalation Day &gt;3 → Chief Engineer Apex Day &gt;7)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <span>{showMatrixRules ? "Hide Details" : "Show Rules"}</span>
              {showMatrixRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showMatrixRules && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/40">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">1</span>
                    <h4 className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">Tier 1: Field Notice</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong>Trigger:</strong> Any breach today in LPCD (&lt;55), Chlorine (&lt;0.2 / &gt;0.5), Pressure (&lt;7m), or Sensor Offline.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <strong>Recipient:</strong> Deputy Engineer (DE) & Assistant Engineer (AE) Civil.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <strong>Channel:</strong> Daily SMS in Marathi (Smartping DLT) + Daily HTML Email.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/40">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center">2</span>
                    <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-300">Tier 2: Division Escalation</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong>Trigger:</strong> Same breach persists unresolved for <strong>&gt;3 consecutive days</strong>.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <strong>Recipient:</strong> Executive Engineer (EE Civil) of the Division.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <strong>Channel:</strong> Urgent Marathi SMS + Division Escalation Notice Email.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/40">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center">3</span>
                    <h4 className="font-semibold text-sm text-rose-800 dark:text-rose-300">Tier 3: Apex Regional</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong>Trigger:</strong> Chronic critical breach unresolved for <strong>&gt;7 consecutive days</strong>.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <strong>Recipient:</strong> Chief Engineer (CE) & Superintending Engineer (SE).
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <strong>Channel:</strong> Regional Digest Email + Scheme-wise Alert SMS.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* TABLE TOOLBAR: Search & Filters                           */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter Tier:
              </span>
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
                <Button
                  size="sm"
                  variant={selectedTier === "all" ? "default" : "ghost"}
                  onClick={() => setSelectedTier("all")}
                  className={`text-xs h-7 px-2.5 rounded-lg ${
                    selectedTier === "all" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  All ({summary.total_sent})
                </Button>
                <Button
                  size="sm"
                  variant={selectedTier === "1" ? "default" : "ghost"}
                  onClick={() => setSelectedTier("1")}
                  className={`text-xs h-7 px-2.5 rounded-lg ${
                    selectedTier === "1" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  Tier 1 (DE/AE)
                </Button>
                <Button
                  size="sm"
                  variant={selectedTier === "2" ? "default" : "ghost"}
                  onClick={() => setSelectedTier("2")}
                  className={`text-xs h-7 px-2.5 rounded-lg ${
                    selectedTier === "2" ? "bg-amber-600 text-white shadow-sm" : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  Tier 2 (EE)
                </Button>
                <Button
                  size="sm"
                  variant={selectedTier === "3" ? "default" : "ghost"}
                  onClick={() => setSelectedTier("3")}
                  className={`text-xs h-7 px-2.5 rounded-lg ${
                    selectedTier === "3" ? "bg-rose-600 text-white shadow-sm" : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  Tier 3 (CE/SE)
                </Button>
              </div>

              {/* Channel filter */}
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center ml-2">
                <Button
                  size="sm"
                  variant={selectedChannel === "all" ? "default" : "ghost"}
                  onClick={() => setSelectedChannel("all")}
                  className={`text-xs h-7 px-2.5 rounded-lg ${
                    selectedChannel === "all" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  All Channels
                </Button>
                <Button
                  size="sm"
                  variant={selectedChannel === "sms" ? "default" : "ghost"}
                  onClick={() => setSelectedChannel("sms")}
                  className={`text-xs h-7 px-2.5 rounded-lg ${
                    selectedChannel === "sms" ? "bg-blue-600 text-white shadow-sm" : "text-blue-700 dark:text-blue-400"
                  }`}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  SMS ({summary.sms_sent})
                </Button>
                <Button
                  size="sm"
                  variant={selectedChannel === "email" ? "default" : "ghost"}
                  onClick={() => setSelectedChannel("email")}
                  className={`text-xs h-7 px-2.5 rounded-lg ${
                    selectedChannel === "email" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-700 dark:text-indigo-400"
                  }`}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Email ({summary.email_sent})
                </Button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search scheme, engineer, issue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* SENT ALERTS TABLE                                         */}
          {/* ========================================================= */}
          {isLoading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-sm text-slate-500">Loading dispatched alerts audit log...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {timeRange === "today"
                  ? "No Alerts Sent Today"
                  : "No Dispatched Alerts Match Your Filter"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {timeRange === "today"
                  ? "Daily alert job runs at 10:00 AM. Since no alerts have been sent yet today, the table is empty."
                  : "Try clearing your search query or selecting a broader time range."}
              </p>
              {timeRange === "today" && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTimeRange("7days")}
                    className="text-xs"
                  >
                    View Last 7 Days ({summary.total_sent > 0 ? summary.total_sent : "Recent"})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-3">Escalation Tier</th>
                    <th className="py-3 px-4">Scheme</th>
                    <th className="py-3 px-4">Recipient Engineer</th>
                    <th className="py-3 px-3">Channel & Status</th>
                    <th className="py-3 px-4">Alert Title / Parameter</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {alerts.map((alert) => {
                    const isTier1 = alert.tier === 1;
                    const isTier2 = alert.tier === 2;
                    const isTier3 = alert.tier === 3;

                    return (
                      <tr
                        key={`${alert.channel}-${alert.id}`}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Time */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(alert.created_at)}
                          </div>
                        </td>

                        {/* Tier */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isTier1 && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-medium">
                              Tier 1: Field Notice
                            </Badge>
                          )}
                          {isTier2 && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-medium">
                              Tier 2: EE Civil
                            </Badge>
                          )}
                          {isTier3 && (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-medium">
                              Tier 3: Apex CE/SE
                            </Badge>
                          )}
                        </td>

                        {/* Scheme */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {alert.scheme_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            ID: {alert.scheme_id}
                          </div>
                        </td>

                        {/* Recipient */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {alert.recipient_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {alert.recipient_role}
                          </div>
                          {alert.recipient_mobile && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {alert.recipient_mobile}
                            </div>
                          )}
                          {alert.recipient_email && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-2.5 h-2.5" />
                              {alert.recipient_email}
                            </div>
                          )}
                        </td>

                        {/* Channel & Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {alert.channel === "sms" ? (
                              <Badge variant="outline" className="text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950 border-blue-200 text-[10px] px-2 py-0.5">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                SMS
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950 border-indigo-200 text-[10px] px-2 py-0.5">
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </Badge>
                            )}
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                              {alert.status || "SENT"}
                            </Badge>
                          </div>
                        </td>

                        {/* Alert Title */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                            {alert.alert_title}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">
                            {alert.message_content.slice(0, 70)}...
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInspectAlert(alert)}
                            className="h-7 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                            View Message
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODAL: VIEW SENT MESSAGE PREVIEW                          */}
        {/* ========================================================= */}
        <Dialog open={!!inspectAlert} onOpenChange={(open) => !open && setInspectAlert(null)}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            {inspectAlert && (
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    {inspectAlert.tier === 1 && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        Tier 1: Field Notice (DE/AE)
                      </Badge>
                    )}
                    {inspectAlert.tier === 2 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        Tier 2: Division Escalation (EE)
                      </Badge>
                    )}
                    {inspectAlert.tier === 3 && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300">
                        Tier 3: Apex Regional (CE/SE)
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs uppercase">
                      {inspectAlert.channel === "sms" ? "📱 Smartping DLT SMS" : "✉️ SMTP Email"}
                    </Badge>
                  </div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white pt-2">
                    Dispatched Message Content
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Dispatched to {inspectAlert.recipient_name} ({inspectAlert.recipient_role}) on {formatDate(inspectAlert.created_at)}
                  </DialogDescription>
                </DialogHeader>

                {/* Recipient Details Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheme:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{inspectAlert.scheme_name} ({inspectAlert.scheme_id})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recipient:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{inspectAlert.recipient_name}</span>
                  </div>
                  {inspectAlert.recipient_mobile && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mobile:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{inspectAlert.recipient_mobile}</span>
                    </div>
                  )}
                  {inspectAlert.recipient_email && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{inspectAlert.recipient_email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{inspectAlert.status}</span>
                  </div>
                </div>

                {/* Message Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {inspectAlert.channel === "sms" ? "Transmitted Marathi SMS Text (DLT Approved):" : "Email Message Summary:"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(inspectAlert.message_content)}
                      className="h-6 text-xs text-indigo-600 hover:text-indigo-700 p-1"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3 h-3 mr-1 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Text
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-sans text-xs leading-relaxed border border-slate-800 select-all whitespace-pre-wrap">
                    {inspectAlert.message_content}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInspectAlert(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ========================================================= */}
        {/* MODAL: MANUAL TRIGGER / TEST DISPATCH                     */}
        {/* ========================================================= */}
        <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                Trigger Escalation Dispatch
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Evaluate persistent failure streaks and dispatch SMS & Email notifications to Tier 2 (EE) and Tier 3 (CE) engineers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dispatch Mode:</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant={dispatchDryRun ? "default" : "outline"}
                    onClick={() => setDispatchDryRun(true)}
                    className={`text-xs h-8 ${dispatchDryRun ? "bg-indigo-600 text-white" : ""}`}
                  >
                    Simulation / Dry Run
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant={!dispatchDryRun ? "destructive" : "outline"}
                    onClick={() => setDispatchDryRun(false)}
                    className={`text-xs h-8 ${!dispatchDryRun ? "bg-rose-600 text-white" : ""}`}
                  >
                    Live Dispatch (SMS & Email)
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {dispatchDryRun
                    ? "Dry run logs the candidates without sending real SMS messages or emails."
                    : "Live mode will actively transmit SMS via Smartping DLT gateway and emails via SMTP."}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDispatchModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => dispatchMutation.mutate()}
                  disabled={dispatchMutation.isPending}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {dispatchMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {dispatchDryRun ? "Run Simulation" : "Send Live Alerts"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
