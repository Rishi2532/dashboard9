import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/dashboard/header";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Droplets,
  Gauge,
  HelpCircle,
  Layers,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  Building2,
  RefreshCw,
  Calendar,
  Check,
  Laptop,
  BellRing,
  Loader2,
  CheckCheck,
  X,
  Send,
  Filter,
} from "lucide-react";

interface VillageSummary {
  village_name: string;
  lpcd_value: number | null;
  water_value: number | null;
  population: number;
  number_of_esr: number;
  is_compliant: boolean;
}

interface SensorReading {
  esr_name: string;
  village_name: string;
  value: string | null;
  date: string | null;
  status: "ok" | "critical" | "high" | "low" | "no_data";
}

interface SchemeSummary {
  scheme_id: string;
  scheme_name: string;
  region?: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  engineer_role?: string;
  engineer_name?: string;
  total_esrs: number;
  total_villages: number;
  villages: VillageSummary[];
  villages_compliant_count: number;
  villages_non_compliant_count: number;
  water_supply?: string;
  completion_status?: string;
  avg_chlorine?: string | null;
  chlorine_status?: string;
  has_chlorine_issue?: boolean;
  chlorine_count?: number;
  chlorine_ok_count: number;
  chlorine_critical_count: number;
  chlorine_high_count: number;
  chlorine_nodata_count: number;
  chlorine_sensors: SensorReading[];
  avg_pressure?: string | null;
  pressure_status?: string;
  has_pressure_issue?: boolean;
  pressure_count?: number;
  pressure_ok_count: number;
  pressure_low_count: number;
  pressure_high_count: number;
  pressure_nodata_count: number;
  pressure_sensors: SensorReading[];
  avg_lpcd?: number | null;
  is_lpcd_compliant?: boolean;
  online_sensors: number;
  offline_sensors: number;
  active_alerts: any[];
  recent_alert_count: number;
}

interface LoginRecord {
  id: number;
  user_id: string;
  username: string;
  user_name?: string;
  login_time: string;
  logout_time?: string | null;
  session_duration?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  is_active?: boolean;
}

interface SchemesSummaryResponse {
  schemes: SchemeSummary[];
  totalSchemes: number;
  totalEsrs: number;
  totalVillages: number;
  villageLpcdCompliantCount: number;
  villageLpcdNonCompliantCount: number;
  totalChlorineSensors: number;
  chlorineOkCount: number;
  chlorineCriticalCount: number;
  chlorineHighCount: number;
  chlorineNoDataCount: number;
  chlorineNonOptimalCount: number;
  totalPressureSensors: number;
  pressureOkCount: number;
  pressureLowCount: number;
  pressureHighCount: number;
  pressureNoDataCount: number;
  pressureNonOptimalCount: number;
  totalSensorsCount: number;
  lpcdCompliantCount: number;
  lpcdNonCompliantCount: number;
  onlineSensorsCount: number;
  offlineSensorsCount: number;
  activeAlertsCount: number;
  totalAlertsCount: number;
  recentLogins?: LoginRecord[];
}

export default function EngineerDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, engineerProfile, assignedSchemes, isEngineer, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Alert filter state
  const [dateFilterMode, setDateFilterMode] = useState<"today" | "all" | "custom">("today");
  const [customSelectedDate, setCustomSelectedDate] = useState<string>("");
  const [alertSearchTerm, setAlertSearchTerm] = useState("");

  // Local state to track acknowledged alert keys for instant optimistic feedback
  const [acknowledgedAlertKeys, setAcknowledgedAlertKeys] = useState<Set<string>>(new Set());

  const getAlertKey = (a: any) => {
    if (a.id) return `alert-id-${a.id}`;
    if (a.ticket_id) return `ticket-${a.ticket_id}`;
    return `alert-${a.scheme_id}-${a.alert_type}-${a.esr_name || ''}-${a.village_name || ''}-${a.sent_date ? String(a.sent_date).slice(0, 10) : ''}-${a.alert_value || ''}`;
  };

  // Login logs modal state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Fetch summary data for assigned schemes
  const { data, isLoading, isRefetching, refetch } = useQuery<SchemesSummaryResponse>({
    queryKey: ["/api/engineer/schemes-summary"],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const schemes = data?.schemes || [];

  // Filter schemes by search term and tab
  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      s.scheme_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scheme_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.block && s.block.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.division && s.division.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "critical") {
      return s.has_chlorine_issue || s.has_pressure_issue || !s.is_lpcd_compliant || s.offline_sensors > 0;
    }
    if (activeTab === "healthy") {
      return !s.has_chlorine_issue && !s.has_pressure_issue && s.is_lpcd_compliant && s.offline_sensors === 0;
    }
    return true;
  });

  // Collect all active alerts across all assigned schemes (exclude water value 0 / zero water supply as LPCD covers it)
  const allAlerts = schemes.flatMap((s) =>
    (s.active_alerts || [])
      .filter((a: any) => {
        const rawType = (a.alert_type || "").trim().toLowerCase();
        return rawType !== "water" && rawType !== "zero water supply";
      })
      .map((a: any) => ({ ...a, parentSchemeName: s.scheme_name, region: a.region || s.region }))
  );

  // Identify latest alert date (defaulting to current day / most recent log date)
  const latestAlertDate =
    allAlerts.length > 0 && allAlerts[0]?.sent_date
      ? String(allAlerts[0].sent_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  // Filter alerts by date mode
  const displayedAlerts = allAlerts.filter((a) => {
    const alertDateStr = a.sent_date ? String(a.sent_date).slice(0, 10) : "";
    if (dateFilterMode === "today") {
      return alertDateStr === latestAlertDate;
    }
    if (dateFilterMode === "custom" && customSelectedDate) {
      return alertDateStr === customSelectedDate;
    }
    return true; // 'all'
  });

  // Filter alerts by search term
  const filteredDisplayedAlerts = displayedAlerts.filter((a) => {
    if (!alertSearchTerm.trim()) return true;
    const q = alertSearchTerm.toLowerCase().trim();
    const sName = (a.parentSchemeName || a.scheme_name || "").toLowerCase();
    const sId = (a.scheme_id || "").toLowerCase();
    const esr = (a.esr_name || "").toLowerCase();
    const vName = (a.village_name || "").toLowerCase();
    const aType = getFormattedAlertType(a).toLowerCase();
    const aVal = String(a.alert_value || "").toLowerCase();
    const reg = String(a.region || "").toLowerCase();
    return sName.includes(q) || sId.includes(q) || esr.includes(q) || vName.includes(q) || aType.includes(q) || aVal.includes(q) || reg.includes(q);
  });

  // Pending alerts to acknowledge
  const pendingAlertsToAck = displayedAlerts.filter((a) => {
    const alertKey = getAlertKey(a);
    return !Boolean(a.is_acknowledged) && !Boolean(a.acknowledged) && !Boolean(a.acknowledged_at) && !acknowledgedAlertKeys.has(alertKey);
  });

  // Offline alerts list
  const offlineAlertsList = displayedAlerts.filter((a) => getFormattedAlertType(a) === "Offline");

  const getFormattedAlertType = (alert: any) => {
    const rawType = (alert.alert_type || "").trim();
    if (rawType.toLowerCase() === "offline") return "Offline";

    if (rawType.toLowerCase() === "lpcd" || rawType.toLowerCase() === "low lpcd") {
      return "Low LPCD";
    }

    if (rawType.toLowerCase() === "pressure" || rawType.toLowerCase() === "low pressure") {
      return "Low Pressure";
    }

    if (rawType.toLowerCase().includes("chlorine")) {
      if (rawType.toLowerCase() === "high chlorine") return "High Chlorine";
      if (rawType.toLowerCase() === "low chlorine") return "Low Chlorine";
      const cleaned = String(alert.alert_value || "0").replace(/[^0-9.]/g, '');
      const numVal = parseFloat(cleaned);
      if (!isNaN(numVal) && numVal > 0.5) {
        return "High Chlorine";
      }
      return "Low Chlorine";
    }

    if (rawType.toLowerCase() === "water" || rawType.toLowerCase() === "zero water supply") {
      return "Zero Water Supply";
    }

    return rawType;
  };

  const getAlertBadgeClass = (formattedType: string) => {
    switch (formattedType) {
      case "Offline":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-medium";
      case "Low LPCD":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800 font-medium";
      case "Low Pressure":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-medium";
      case "Low Chlorine":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800 font-medium";
      case "High Chlorine":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-medium";
      case "Zero Water Supply":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-medium";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium";
    }
  };

  const formatOfflineSensorsValue = (rawVal: string): string => {
    const val = String(rawVal ?? "").trim();
    if (!val || val === "null" || val === "undefined") return "Sensor Offline";
    const lower = val.toLowerCase();
    const hasChlorine = lower.includes("chlorine");
    const hasFlow = lower.includes("flow");
    const hasPressure = lower.includes("pressure");

    if (hasChlorine && hasFlow && hasPressure) {
      return "Flow, Pressure and Chlorine Sensor Offline";
    }
    if (hasFlow && hasPressure) {
      return "Flow and Pressure Sensor Offline";
    }
    if (hasChlorine && hasFlow) {
      return "Chlorine and Flow Sensor Offline";
    }
    if (hasChlorine && hasPressure) {
      return "Chlorine and Pressure Sensor Offline";
    }
    if (hasChlorine) {
      return "Chlorine Sensor Offline";
    }
    if (hasFlow) {
      return "Flow Sensor Offline";
    }
    if (hasPressure) {
      return "Pressure Sensor Offline";
    }
    if (lower.includes("sensor offline")) return val;
    return `${val} Sensor Offline`;
  };

  const getAlertValueDisplay = (alert: any, formattedType: string) => {
    const val = String(alert.alert_value ?? "").trim();
    if (!val || val === "null" || val === "undefined") return "-";
    if (formattedType === "Offline") {
      return formatOfflineSensorsValue(val);
    }
    if (formattedType === "Low Chlorine" || formattedType === "High Chlorine") {
      return val.toLowerCase().includes("mg/l") ? val : `${val} mg/L`;
    }
    if (formattedType === "Low Pressure") {
      return val.toLowerCase().includes("bar") ? val : `${val} Bar`;
    }
    return val;
  };

  // Helper for formatting login timestamps
  const formatLoginTime = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(dateStr);
    }
  };

  const getDeviceLabel = (ua?: string | null) => {
    if (!ua) return "Desktop";
    if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) return "Mobile";
    if (ua.includes("Chrome")) return "Chrome (PC)";
    if (ua.includes("Firefox")) return "Firefox (PC)";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari (Mac)";
    if (ua.includes("Edge")) return "Edge (PC)";
    return "Web Browser";
  };

  // Performance calculations
  const totalVillages = data?.totalVillages ?? 0;
  const compliantVillages = data?.villageLpcdCompliantCount ?? 0;
  const nonCompliantVillages = data?.villageLpcdNonCompliantCount ?? 0;
  const villagePercent = totalVillages > 0 ? Math.round((compliantVillages / totalVillages) * 100) : 0;

  const totalChlorineSensors = data?.totalChlorineSensors ?? ((data?.chlorineOkCount ?? 0) + (data?.chlorineCriticalCount ?? 0) + (data?.chlorineHighCount ?? 0) + (data?.chlorineNoDataCount ?? 0));
  const chlorineOk = data?.chlorineOkCount ?? 0;
  const chlorineNonOptimal = data?.chlorineNonOptimalCount ?? ((data?.chlorineCriticalCount ?? 0) + (data?.chlorineHighCount ?? 0) + (data?.chlorineNoDataCount ?? 0));
  const chlorinePercent = totalChlorineSensors > 0 ? Math.round((chlorineOk / totalChlorineSensors) * 100) : 0;

  const totalPressureSensors = data?.totalPressureSensors ?? ((data?.pressureOkCount ?? 0) + (data?.pressureLowCount ?? 0) + (data?.pressureHighCount ?? 0) + (data?.pressureNoDataCount ?? 0));
  const pressureOk = data?.pressureOkCount ?? 0;
  const pressureNonOptimal = data?.pressureNonOptimalCount ?? ((data?.pressureLowCount ?? 0) + (data?.pressureHighCount ?? 0) + (data?.pressureNoDataCount ?? 0));
  const pressurePercent = totalPressureSensors > 0 ? Math.round((pressureOk / totalPressureSensors) * 100) : 0;

  const onlineSensors = data?.onlineSensorsCount ?? 0;
  const offlineSensors = data?.offlineSensorsCount ?? 0;
  const totalSensors = data?.totalSensorsCount ?? (onlineSensors + offlineSensors);
  const sensorOnlinePercent = totalSensors > 0 ? Math.round((onlineSensors / totalSensors) * 100) : 0;

  // Acknowledge Alert Mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (alert: any) => {
      // Optimistically add to state immediately
      const alertKey = getAlertKey(alert);
      setAcknowledgedAlertKeys((prev) => {
        const next = new Set(prev);
        next.add(alertKey);
        return next;
      });

      const res = await fetch("/api/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: alert.id,
          ticket_id: alert.ticket_id,
          esr_name: alert.esr_name,
          scheme_id: alert.scheme_id,
          alert_type: alert.alert_type,
          sent_date: alert.sent_date,
          engineer_email: engineerProfile?.email || user?.email,
          engineer_name: engineerProfile?.name || user?.name || user?.username,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to acknowledge alert");
      }
      return res.json();
    },
    onSuccess: (resData, variables) => {
      const alertKey = getAlertKey(variables);
      setAcknowledgedAlertKeys((prev) => {
        const next = new Set(prev);
        next.add(alertKey);
        return next;
      });

      toast({
        title: "Alert Acknowledged",
        description: `Alert ${variables.ticket_id ? `#${variables.ticket_id}` : `ID ${variables.id || ''}`} (${getFormattedAlertType(variables)}${variables.esr_name ? ` - ${variables.esr_name}` : ''}) has been marked as acknowledged.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/engineer/schemes-summary"] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Acknowledgement Error",
        description: err.message || "Failed to record acknowledgement.",
        variant: "destructive",
      });
    },
  });

  // Batch Acknowledge All Mutation
  const batchAcknowledgeMutation = useMutation({
    mutationFn: async (alertsToAck: any[]) => {
      alertsToAck.forEach((a) => {
        setAcknowledgedAlertKeys((prev) => new Set(prev).add(getAlertKey(a)));
      });

      const res = await fetch("/api/acknowledge/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alerts: alertsToAck.map((alert) => ({
            alert_id: alert.id,
            ticket_id: alert.ticket_id,
            esr_name: alert.esr_name,
            scheme_id: alert.scheme_id,
            alert_type: alert.alert_type,
            sent_date: alert.sent_date,
            engineer_email: engineerProfile?.email || user?.email,
            engineer_name: engineerProfile?.name || user?.name || user?.username,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to batch acknowledge alerts");
      }
      return res.json();
    },
    onSuccess: (resData, variables) => {
      variables.forEach((a) => {
        setAcknowledgedAlertKeys((prev) => new Set(prev).add(getAlertKey(a)));
      });
      toast({
        title: "All Alerts Acknowledged",
        description: `Successfully acknowledged ${variables.length} active alerts.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/engineer/schemes-summary"] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Batch Acknowledgement Error",
        description: err.message || "Failed to batch acknowledge alerts.",
        variant: "destructive",
      });
    },
  });

  // Send All Offline Reminders Mutation (Consolidated 1 mail per vendor)
  const sendAllRemindersMutation = useMutation({
    mutationFn: async (offlineAlerts: any[]) => {
      const res = await fetch("/api/engineer/send-all-offline-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alerts: offlineAlerts.map((alert) => ({
            alert_id: alert.id,
            ticket_id: alert.ticket_id,
            scheme_id: alert.scheme_id,
            scheme_name: alert.parentSchemeName || alert.scheme_name,
            village_name: alert.village_name,
            esr_name: alert.esr_name,
            offline_sensors: formatOfflineSensorsValue(alert.alert_value),
            region: alert.region,
            alertKey: getAlertKey(alert),
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send batch offline reminders");
      }
      return res.json();
    },
    onSuccess: (resData) => {
      if (resData.reminderRecords) {
        setReminderSentRecords((prev) => ({
          ...prev,
          ...resData.reminderRecords,
        }));
      }
      toast({
        title: "All Reminders Dispatched",
        description: resData.message || `Consolidated offline reminder emails sent to regional vendors.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/engineer/schemes-summary"] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Batch Reminder Error",
        description: err.message || "Failed to send batch offline reminders.",
        variant: "destructive",
      });
    },
  });

  // Helper for formatting reminder timestamps
  const formatReminderTime = (dateStr?: string | null) => {
    if (!dateStr) return "recently";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(dateStr);
    }
  };

  // Local state to track reminders sent in the current session for immediate UI reflection
  const [reminderSentRecords, setReminderSentRecords] = useState<
    Record<string, { vendor_name?: string; vendor_email?: string; sent_at?: string }>
  >({});
  const [sendingReminderKey, setSendingReminderKey] = useState<string | null>(null);

  const sendReminderMutation = useMutation({
    mutationFn: async (alert: any) => {
      const alertKey = getAlertKey(alert);
      setSendingReminderKey(alertKey);
      const res = await fetch("/api/engineer/send-offline-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: alert.id,
          ticket_id: alert.ticket_id,
          scheme_id: alert.scheme_id,
          scheme_name: alert.parentSchemeName || alert.scheme_name,
          village_name: alert.village_name,
          esr_name: alert.esr_name,
          offline_sensors: formatOfflineSensorsValue(alert.alert_value),
          region: alert.region,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send offline reminder");
      }
      return res.json();
    },
    onSuccess: (resData, variables) => {
      const alertKey = getAlertKey(variables);
      setSendingReminderKey(null);
      setReminderSentRecords((prev) => ({
        ...prev,
        [alertKey]: {
          vendor_name: resData.vendor_name,
          vendor_email: resData.vendor_email,
          sent_at: resData.sent_at || new Date().toISOString(),
        },
      }));
      toast({
        title: "Reminder Sent Successfully",
        description: resData.message || `Offline reminder email sent to ${resData.vendor_name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/engineer/schemes-summary"] });
      refetch();
    },
    onError: (err: any) => {
      setSendingReminderKey(null);
      toast({
        title: "Failed to Send Reminder",
        description: err.message || "Could not send reminder email to vendor.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Profile & Designation Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-blue-800/40">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-3 py-1 font-semibold text-xs flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                  {engineerProfile?.role || (isEngineer ? "Assigned Engineer" : "Scheme Supervisor")}
                </Badge>
                {engineerProfile?.region && (
                  <Badge variant="outline" className="text-white/80 border-white/20 text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {engineerProfile.region} Region
                  </Badge>
                )}
                {engineerProfile?.division && (
                  <Badge variant="outline" className="text-white/80 border-white/20 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    {engineerProfile.division} Division
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Welcome, {engineerProfile?.name || user?.name || user?.username || "Engineer"}</span>
              </h1>

              <p className="text-blue-100/80 text-sm max-w-2xl">
                Dedicated Scheme Operations Portal. Real-time telemetry monitoring, critical parameter compliance, and field alerts for your assigned water schemes.
              </p>

              {/* Contact metadata */}
              <div className="flex items-center gap-4 text-xs text-blue-200/70 pt-1 flex-wrap">
                {(engineerProfile?.email || user?.email) && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-300" />
                    {engineerProfile?.email || user?.email}
                  </span>
                )}
                {(engineerProfile?.phone || user?.phone) && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-300" />
                    {engineerProfile?.phone || user?.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 mr-2 text-emerald-300" />
                Login Activity ({data?.recentLogins?.length || 0})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
                {isRefetching ? "Refreshing..." : "Refresh Live Data"}
              </Button>
              <Link href="/helpdesk/raise-issue">
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white shadow-md">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Raise Field Issue
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Catchy Scheme Performance Section Header */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {(data?.totalSchemes ?? assignedSchemes?.length ?? 0) > 1
                    ? "Overall Scheme Performance & Compliance Overview"
                    : "Scheme Performance & Compliance Overview"}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {(data?.totalSchemes ?? assignedSchemes?.length ?? 0) > 1
                  ? `Combined aggregate telemetry performance metrics across all ${data?.totalSchemes ?? assignedSchemes?.length ?? 0} assigned schemes`
                  : "Real-time telemetry performance and compliance metrics for your assigned scheme"}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {(data?.totalSchemes ?? assignedSchemes?.length ?? 0) > 1 && (
                <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800 text-[11px] font-semibold px-2.5 py-1">
                  Overall Combined
                </Badge>
              )}
              <Badge variant="outline" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1">
                <Layers className="w-3.5 h-3.5 mr-1 text-blue-600" />
                {data?.totalSchemes ?? assignedSchemes?.length ?? 0} Schemes
              </Badge>
              <Badge variant="outline" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1">
                <Building2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                {data?.totalEsrs ?? 0} ESR Reservoirs
              </Badge>
            </div>
          </div>

          {/* 4 Catchy Performance Cards: Village LPCD, Chlorine, Pressure, IoT Connectivity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Village LPCD (55 L Target) */}
            <Card className="relative overflow-hidden bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200/70 dark:border-emerald-900/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Village LPCD (55 L)
                  </span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    JJM 55 LPCD Benchmark
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-none text-[10px] font-bold">
                  {villagePercent}% Pass
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                {/* Total Villages */}
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {totalVillages}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Total Villages</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${villagePercent}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${100 - villagePercent}%` }}
                  />
                </div>

                {/* Breakdown pills */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                      Achieving ≥ 55
                    </div>
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      {compliantVillages}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <div className="text-[10px] font-medium text-amber-800 dark:text-amber-300">
                      Not Achieving (&lt;55)
                    </div>
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      {nonCompliantVillages}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Chlorine Telemetry (0.2 - 0.5 mg/L) */}
            <Card className="relative overflow-hidden bg-gradient-to-b from-cyan-50/50 to-white dark:from-cyan-950/20 dark:to-slate-900 border-cyan-200/70 dark:border-cyan-900/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                    Chlorine Sensors (CL)
                  </span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Optimal: 0.20 - 0.50 mg/L
                  </div>
                </div>
                <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 border-none text-[10px] font-bold">
                  {chlorinePercent}% Optimal
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                {/* Total Chlorine Sensors */}
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {totalChlorineSensors}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Total CL Sensors</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-500"
                    style={{ width: `${chlorinePercent}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${100 - chlorinePercent}%` }}
                  />
                </div>

                {/* Breakdown pills */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-cyan-100/60 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
                    <div className="text-[10px] font-medium text-cyan-800 dark:text-cyan-300">
                      Optimal (0.2-0.5)
                    </div>
                    <div className="text-lg font-bold text-cyan-700 dark:text-cyan-400">
                      {chlorineOk}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <div className="text-[10px] font-medium text-rose-800 dark:text-rose-300">
                      Not in Optimal Range
                    </div>
                    <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {chlorineNonOptimal}
                    </div>
                  </div>
                </div>

                {/* Sub-breakdown details */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-0.5">
                  <span className="text-rose-600 font-semibold">{data?.chlorineCriticalCount ?? 0} &lt;0.2</span>
                  <span>•</span>
                  <span className="text-amber-600 font-semibold">{data?.chlorineHighCount ?? 0} &gt;0.5</span>
                  <span>•</span>
                  <span>{data?.chlorineNoDataCount ?? 0} No Data</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Pressure Telemetry (0.2 - 0.7 Bar) */}
            <Card className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-indigo-200/70 dark:border-indigo-900/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                    Pressure Sensors (PT)
                  </span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Optimal: 0.20 - 0.70 Bar
                  </div>
                </div>
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-none text-[10px] font-bold">
                  {pressurePercent}% Optimal
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                {/* Total Pressure Sensors */}
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {totalPressureSensors}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Total PT Sensors</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${pressurePercent}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${100 - pressurePercent}%` }}
                  />
                </div>

                {/* Breakdown pills */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-indigo-100/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                    <div className="text-[10px] font-medium text-indigo-800 dark:text-indigo-300">
                      Optimal (0.2-0.7)
                    </div>
                    <div className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                      {pressureOk}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <div className="text-[10px] font-medium text-rose-800 dark:text-rose-300">
                      Not in Optimal Range
                    </div>
                    <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {pressureNonOptimal}
                    </div>
                  </div>
                </div>

                {/* Sub-breakdown details */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-0.5">
                  <span className="text-rose-600 font-semibold">{data?.pressureLowCount ?? 0} &lt;0.2 Low</span>
                  <span>•</span>
                  <span className="text-amber-600 font-semibold">{data?.pressureHighCount ?? 0} &gt;0.7 High</span>
                  <span>•</span>
                  <span>{data?.pressureNoDataCount ?? 0} No Data</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: IoT Sensor Connectivity (Online / Offline) */}
            <Card className="relative overflow-hidden bg-gradient-to-b from-teal-50/50 to-white dark:from-teal-950/20 dark:to-slate-900 border-teal-200/70 dark:border-teal-900/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-teal-600" />
                    IoT Sensors Network
                  </span>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live Telemetry Connectivity
                  </div>
                </div>
                <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 border-none text-[10px] font-bold">
                  {sensorOnlinePercent}% Online
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                {/* Total Sensors */}
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {totalSensors}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Total Transmitters</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-teal-500 h-full transition-all duration-500"
                    style={{ width: `${sensorOnlinePercent}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${100 - sensorOnlinePercent}%` }}
                  />
                </div>

                {/* Breakdown pills */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-teal-100/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                    <div className="text-[10px] font-medium text-teal-800 dark:text-teal-300">
                      Online & Active
                    </div>
                    <div className="text-lg font-bold text-teal-700 dark:text-teal-400">
                      {onlineSensors}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <div className="text-[10px] font-medium text-rose-800 dark:text-rose-300">
                      Offline / Stalled
                    </div>
                    <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {offlineSensors}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-0.5">
                  <span className="text-teal-600 font-medium">Auto-polling live</span>
                  <span>•</span>
                  <span>Flow, CL & PT nodes</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Scheme Explorer Section */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                My Assigned Schemes Overview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live monitoring cards for all schemes under your supervision
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search scheme, block, division..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="bg-slate-200/70 dark:bg-slate-800">
                  <TabsTrigger value="all" className="text-xs">
                    All ({schemes.length})
                  </TabsTrigger>
                  <TabsTrigger value="critical" className="text-xs text-rose-600 dark:text-rose-400">
                    Needs Action
                  </TabsTrigger>
                  <TabsTrigger value="healthy" className="text-xs text-emerald-600 dark:text-emerald-400">
                    Healthy
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading your assigned schemes telemetry...</p>
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Layers className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {searchTerm ? "No matching schemes found" : "No schemes assigned yet"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm
                  ? "Try refining your search keyword."
                  : "Your user account is not mapped to any schemes in scheme_engineer_details. Please contact your system administrator."}
              </p>
            </div>
          ) : (
                <div className="space-y-6">
              {filteredSchemes.map((scheme) => {
                const hasAnyIssue =
                  scheme.has_chlorine_issue ||
                  scheme.has_pressure_issue ||
                  (scheme.avg_lpcd !== null && !scheme.is_lpcd_compliant) ||
                  scheme.offline_sensors > 0;

                // Scheme specific performance metrics
                const schTotalVillages = scheme.total_villages || (scheme.villages?.length ?? 0);
                const schCompliantVillages = scheme.villages_compliant_count ?? 0;
                const schNonCompliantVillages = scheme.villages_non_compliant_count ?? Math.max(0, schTotalVillages - schCompliantVillages);
                const schVillagePercent = schTotalVillages > 0 ? Math.round((schCompliantVillages / schTotalVillages) * 100) : (scheme.is_lpcd_compliant ? 100 : 0);

                const schTotalCl = scheme.chlorine_count ?? ((scheme.chlorine_ok_count ?? 0) + (scheme.chlorine_critical_count ?? 0) + (scheme.chlorine_high_count ?? 0) + (scheme.chlorine_nodata_count ?? 0));
                const schClOk = scheme.chlorine_ok_count ?? 0;
                const schClNonOptimal = (scheme.chlorine_critical_count ?? 0) + (scheme.chlorine_high_count ?? 0) + (scheme.chlorine_nodata_count ?? 0);
                const schClPercent = schTotalCl > 0 ? Math.round((schClOk / schTotalCl) * 100) : 0;

                const schTotalPr = scheme.pressure_count ?? ((scheme.pressure_ok_count ?? 0) + (scheme.pressure_low_count ?? 0) + (scheme.pressure_high_count ?? 0) + (scheme.pressure_nodata_count ?? 0));
                const schPrOk = scheme.pressure_ok_count ?? 0;
                const schPrNonOptimal = (scheme.pressure_low_count ?? 0) + (scheme.pressure_high_count ?? 0) + (scheme.pressure_nodata_count ?? 0);
                const schPrPercent = schTotalPr > 0 ? Math.round((schPrOk / schTotalPr) * 100) : 0;

                const schOnlineSensors = scheme.online_sensors ?? 0;
                const schOfflineSensors = scheme.offline_sensors ?? 0;
                const schTotalSensors = schOnlineSensors + schOfflineSensors;
                const schSensorOnlinePercent = schTotalSensors > 0 ? Math.round((schOnlineSensors / schTotalSensors) * 100) : 0;

                return (
                  <Card
                    key={scheme.scheme_id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl ${
                      hasAnyIssue
                        ? "border-rose-200 dark:border-rose-900/60 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 shadow-sm"
                    }`}
                  >
                    {/* Card Header */}
                    <CardHeader className="p-5 pb-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                              {scheme.scheme_id}
                            </span>
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                              {scheme.scheme_name}
                            </CardTitle>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap">
                            {scheme.region && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {scheme.region} Region
                              </span>
                            )}
                            {scheme.division && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {scheme.division} Div
                              </span>
                            )}
                            {scheme.block && (
                              <span className="flex items-center gap-1">
                                <span>Block:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{scheme.block}</span>
                              </span>
                            )}
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <Badge variant="outline" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium py-0">
                              {scheme.total_esrs} ESR Reservoirs
                            </Badge>
                            {schTotalVillages > 0 && (
                              <Badge variant="outline" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium py-0">
                                {schTotalVillages} Villages
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {scheme.recent_alert_count > 0 && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 text-xs font-semibold px-2.5 py-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              {scheme.recent_alert_count} Active Alerts
                            </Badge>
                          )}
                          {hasAnyIssue ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 text-xs font-semibold px-2.5 py-1">
                              Needs Attention
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold px-2.5 py-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Optimal & Healthy
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {/* Card Body - 4 Individual Scheme Performance Cards */}
                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {/* Scheme Card 1: Village LPCD */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-200/70 dark:border-emerald-900/50 shadow-sm space-y-2.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                                Village LPCD (55 L)
                              </span>
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-none text-[10px] font-bold px-1.5 py-0">
                                {schVillagePercent}% Pass
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-baseline justify-between">
                              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {schTotalVillages}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {scheme.avg_lpcd !== null ? `Avg ${scheme.avg_lpcd} L` : "Total Villages"}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex mt-2">
                              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${schVillagePercent}%` }} />
                              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${100 - schVillagePercent}%` }} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-xs pt-1">
                            <div className="p-1.5 rounded-md bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                              <div className="text-[9px] font-medium text-emerald-800 dark:text-emerald-300">Achieving ≥ 55</div>
                              <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">{schCompliantVillages}</div>
                            </div>
                            <div className="p-1.5 rounded-md bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                              <div className="text-[9px] font-medium text-amber-800 dark:text-amber-300">Not Achieving</div>
                              <div className="text-base font-bold text-amber-700 dark:text-amber-400">{schNonCompliantVillages}</div>
                            </div>
                          </div>
                        </div>

                        {/* Scheme Card 2: Chlorine Sensors */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-b from-cyan-50/60 to-white dark:from-cyan-950/20 dark:to-slate-900 border border-cyan-200/70 dark:border-cyan-900/50 shadow-sm space-y-2.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-400 flex items-center gap-1">
                                <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                                Chlorine (CL)
                              </span>
                              <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 border-none text-[10px] font-bold px-1.5 py-0">
                                {schClPercent}% Optimal
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-baseline justify-between">
                              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {schTotalCl}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {scheme.avg_chlorine !== null ? `Avg ${scheme.avg_chlorine} mg/L` : "Total CL Sensors"}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex mt-2">
                              <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${schClPercent}%` }} />
                              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${100 - schClPercent}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                              <div className="p-1.5 rounded-md bg-cyan-100/60 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
                                <div className="text-[9px] font-medium text-cyan-800 dark:text-cyan-300">Optimal (0.2-0.5)</div>
                                <div className="text-base font-bold text-cyan-700 dark:text-cyan-400">{schClOk}</div>
                              </div>
                              <div className="p-1.5 rounded-md bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                                <div className="text-[9px] font-medium text-rose-800 dark:text-rose-300">Non-Optimal</div>
                                <div className="text-base font-bold text-rose-600 dark:text-rose-400">{schClNonOptimal}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 px-0.5">
                              <span className="text-rose-600 font-medium">{scheme.chlorine_critical_count ?? 0} &lt;0.2</span>
                              <span>•</span>
                              <span className="text-amber-600 font-medium">{scheme.chlorine_high_count ?? 0} &gt;0.5</span>
                              <span>•</span>
                              <span>{scheme.chlorine_nodata_count ?? 0} N/D</span>
                            </div>
                          </div>
                        </div>

                        {/* Scheme Card 3: Pressure Sensors */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-b from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-200/70 dark:border-indigo-900/50 shadow-sm space-y-2.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                                <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                                Pressure (PT)
                              </span>
                              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-none text-[10px] font-bold px-1.5 py-0">
                                {schPrPercent}% Optimal
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-baseline justify-between">
                              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {schTotalPr}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {scheme.avg_pressure !== null ? `Avg ${scheme.avg_pressure} Bar` : "Total PT Sensors"}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex mt-2">
                              <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${schPrPercent}%` }} />
                              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${100 - schPrPercent}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                              <div className="p-1.5 rounded-md bg-indigo-100/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                                <div className="text-[9px] font-medium text-indigo-800 dark:text-indigo-300">Optimal (0.2-0.7)</div>
                                <div className="text-base font-bold text-indigo-700 dark:text-indigo-400">{schPrOk}</div>
                              </div>
                              <div className="p-1.5 rounded-md bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                                <div className="text-[9px] font-medium text-rose-800 dark:text-rose-300">Non-Optimal</div>
                                <div className="text-base font-bold text-rose-600 dark:text-rose-400">{schPrNonOptimal}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 px-0.5">
                              <span className="text-rose-600 font-medium">{scheme.pressure_low_count ?? 0} Low</span>
                              <span>•</span>
                              <span className="text-amber-600 font-medium">{scheme.pressure_high_count ?? 0} High</span>
                              <span>•</span>
                              <span>{scheme.pressure_nodata_count ?? 0} N/D</span>
                            </div>
                          </div>
                        </div>

                        {/* Scheme Card 4: IoT Sensors Connectivity */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-b from-teal-50/60 to-white dark:from-teal-950/20 dark:to-slate-900 border border-teal-200/70 dark:border-teal-900/50 shadow-sm space-y-2.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 flex items-center gap-1">
                                <Wifi className="w-3.5 h-3.5 text-teal-600" />
                                IoT Sensors Network
                              </span>
                              <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 border-none text-[10px] font-bold px-1.5 py-0">
                                {schSensorOnlinePercent}% Online
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-baseline justify-between">
                              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {schTotalSensors}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                Total Transmitters
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex mt-2">
                              <div className="bg-teal-500 h-full transition-all duration-500" style={{ width: `${schSensorOnlinePercent}%` }} />
                              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${100 - schSensorOnlinePercent}%` }} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-xs pt-1">
                            <div className="p-1.5 rounded-md bg-teal-100/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                              <div className="text-[9px] font-medium text-teal-800 dark:text-teal-300">Online & Active</div>
                              <div className="text-base font-bold text-teal-700 dark:text-teal-400">{schOnlineSensors}</div>
                            </div>
                            <div className="p-1.5 rounded-md bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                              <div className="text-[9px] font-medium text-rose-800 dark:text-rose-300">Offline / Stale</div>
                              <div className="text-base font-bold text-rose-600 dark:text-rose-400">{schOfflineSensors}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Active Alerts Banner if any */}
                      {scheme.recent_alert_count > 0 && (
                        <div className="p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 font-medium text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                            This scheme currently has {scheme.recent_alert_count} active critical alerts requiring field inspection.
                          </span>
                          <Link href={`/helpdesk/issue-reporting?scheme_id=${scheme.scheme_id}`}>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs bg-rose-100/80 hover:bg-rose-200 text-rose-800 border-rose-300">
                              Submit Field Remark <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>

                    {/* Card Footer - Deep Links */}
                    <CardFooter className="p-3.5 px-5 bg-slate-50/60 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link href={`/chlorine?scheme_id=${scheme.scheme_id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900 hover:bg-cyan-50">
                            <Droplets className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
                            Chlorine Telemetry
                          </Button>
                        </Link>
                        <Link href={`/pressure?scheme_id=${scheme.scheme_id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50">
                            <Gauge className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                            Pressure Telemetry
                          </Button>
                        </Link>
                        <Link href={`/scheme-lpcd?scheme_id=${scheme.scheme_id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50">
                            <Activity className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                            LPCD Metrics
                          </Button>
                        </Link>
                      </div>

                      <Link href={`/scheme/${scheme.scheme_id}/${scheme.block || ""}`}>
                        <Button size="sm" className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5">
                          View Scheme Details <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Center - Active Critical Alerts Table */}
        <div className="space-y-4 pt-4">
          {/* Catchy Top Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Recent Critical Alerts on Your Schemes
                  </h3>
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-400/40 text-[11px] font-bold px-2 py-0.5">
                    {displayedAlerts.length} Active
                  </Badge>
                  {pendingAlertsToAck.length > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-[11px] font-bold px-2 py-0.5">
                      {pendingAlertsToAck.length} Pending Ack
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Real-time telemetry incidents requiring field verification and restoration
                </p>
              </div>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                size="sm"
                onClick={() => batchAcknowledgeMutation.mutate(pendingAlertsToAck)}
                disabled={pendingAlertsToAck.length === 0 || batchAcknowledgeMutation.isPending}
                className="h-9 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={pendingAlertsToAck.length > 0 ? `Acknowledge all ${pendingAlertsToAck.length} unacknowledged alerts` : "All alerts already acknowledged"}
              >
                {batchAcknowledgeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-100" />
                    Acknowledge All ({pendingAlertsToAck.length})
                  </>
                )}
              </Button>

              <Button
                size="sm"
                onClick={() => sendAllRemindersMutation.mutate(offlineAlertsList)}
                disabled={offlineAlertsList.length === 0 || sendAllRemindersMutation.isPending}
                className="h-9 px-3.5 text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-semibold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={offlineAlertsList.length > 0 ? `Send consolidated offline reminder email(s) to regional vendors for ${offlineAlertsList.length} locations` : "No offline alerts"}
              >
                {sendAllRemindersMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Sending All Reminders...
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4 text-amber-100" />
                    Send All Reminders ({offlineAlertsList.length})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Toolbar: Search + Date pills + Date Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search alerts by scheme, ESR, village, type..."
                value={alertSearchTerm}
                onChange={(e) => setAlertSearchTerm(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-1"
              />
              {alertSearchTerm && (
                <button
                  type="button"
                  onClick={() => setAlertSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setDateFilterMode("today")}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-all ${
                    dateFilterMode === "today"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Current Day ({latestAlertDate || "Today"})
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("all")}
                  className={`px-3 py-1 rounded-md font-semibold text-xs transition-all ${
                    dateFilterMode === "all"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  All ({allAlerts.length})
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={customSelectedDate}
                  onChange={(e) => {
                    setCustomSelectedDate(e.target.value);
                    if (e.target.value) setDateFilterMode("custom");
                  }}
                  className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer font-medium"
                />
              </div>
            </div>
          </div>

          {filteredDisplayedAlerts.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500 mb-2" />
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {alertSearchTerm
                  ? `No alerts match "${alertSearchTerm}"`
                  : dateFilterMode === "today"
                  ? "No critical alerts recorded for today"
                  : dateFilterMode === "custom" && customSelectedDate
                  ? `No critical alerts found for ${customSelectedDate}`
                  : "All schemes are within normal operating parameters"}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {alertSearchTerm ? "Try clearing your search query." : "Zero telemetry thresholds breached for this selection."}
              </p>
            </div>
          ) : (
            <Card className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">#</th>
                      <th className="py-3 px-4 text-left min-w-[220px]">Scheme & Location</th>
                      <th className="py-3 px-4 text-left min-w-[170px]">ESR Reservoir</th>
                      <th className="py-3 px-3 text-center min-w-[130px]">Alert Type</th>
                      <th className="py-3 px-4 text-left min-w-[240px]">Recorded Value</th>
                      <th className="py-3 px-3 text-center min-w-[100px]">Date</th>
                      <th className="py-3 px-3 text-center min-w-[110px]">Status</th>
                      <th className="py-3 px-4 text-right min-w-[210px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredDisplayedAlerts.map((alert, idx) => {
                      const alertKey = getAlertKey(alert);
                      const isAcked =
                        Boolean(alert.is_acknowledged) ||
                        Boolean(alert.acknowledged) ||
                        Boolean(alert.acknowledged_at) ||
                        acknowledgedAlertKeys.has(alertKey);
                      const formattedType = getFormattedAlertType(alert);
                      const reminderRecord = reminderSentRecords[alertKey] || (alert.reminder_sent_at ? {
                        vendor_name: alert.reminder_vendor_name,
                        vendor_email: alert.reminder_vendor_email,
                        sent_at: alert.reminder_sent_at,
                      } : null);

                      return (
                        <tr
                          key={alert.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                        >
                          {/* 1. Index */}
                          <td className="py-3.5 px-3 text-center font-medium text-slate-400 group-hover:text-slate-600 align-middle">
                            {idx + 1}
                          </td>

                          {/* 2. Scheme & Location */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-bold text-slate-900 dark:text-white leading-snug">
                              {alert.parentSchemeName || alert.scheme_name || alert.scheme_id}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                ID: {alert.scheme_id}
                              </span>
                              {alert.region && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                                  {alert.region}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. ESR Reservoir */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {alert.esr_name || "-"}
                            </div>
                            {alert.village_name && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {alert.village_name}
                              </div>
                            )}
                          </td>

                          {/* 4. Alert Type Badge */}
                          <td className="py-3.5 px-3 text-center align-middle">
                            <Badge className={`${getAlertBadgeClass(formattedType)} px-2.5 py-1 text-[11px] font-bold shadow-xs whitespace-nowrap`}>
                              {formattedType}
                            </Badge>
                          </td>

                          {/* 5. Recorded Value Column */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-bold text-rose-600 dark:text-rose-400 text-xs leading-tight">
                              {getAlertValueDisplay(alert, formattedType)}
                            </div>
                            {formattedType === "Offline" && reminderRecord && (
                              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-medium shadow-xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Reminder sent: {reminderRecord.vendor_name || reminderRecord.vendor_email}</span>
                              </div>
                            )}
                          </td>

                          {/* 6. Date & Ticket */}
                          <td className="py-3.5 px-3 text-center align-middle">
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                              {alert.sent_date ? String(alert.sent_date).slice(0, 10) : "-"}
                            </div>
                            {alert.ticket_id && (
                              <div className="font-mono text-[9px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                                #{alert.ticket_id}
                              </div>
                            )}
                          </td>

                          {/* 7. Status Badge */}
                          <td className="py-3.5 px-3 text-center align-middle">
                            {isAcked ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 inline-flex items-center gap-1 shadow-xs">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending Ack
                              </Badge>
                            )}
                          </td>

                          {/* 8. Actions */}
                          <td className="py-3.5 px-4 text-right align-middle">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {formattedType === "Offline" && (
                                  <Button
                                    size="sm"
                                    onClick={() => sendReminderMutation.mutate(alert)}
                                    disabled={sendingReminderKey === alertKey || sendReminderMutation.isPending}
                                    className={`h-7 px-2.5 text-xs font-semibold shadow-xs flex items-center gap-1 transition-all ${
                                      reminderRecord
                                        ? "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
                                        : "bg-amber-600 hover:bg-amber-700 text-white"
                                    }`}
                                    title={
                                      reminderRecord
                                        ? `Reminder previously sent to ${reminderRecord.vendor_name || reminderRecord.vendor_email}. Click to resend.`
                                        : "Send offline reminder email to regional vendor"
                                    }
                                  >
                                    {sendingReminderKey === alertKey ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <BellRing className="w-3.5 h-3.5 mr-1" />
                                        {reminderRecord ? "Resend" : "Send Reminder"}
                                      </>
                                    )}
                                  </Button>
                                )}
                                {!isAcked && (
                                  <Button
                                    size="sm"
                                    onClick={() => acknowledgeMutation.mutate(alert)}
                                    disabled={acknowledgeMutation.isPending}
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Acknowledge
                                  </Button>
                                )}
                                <Link href={`/helpdesk/issue-reporting?scheme_id=${alert.scheme_id}`}>
                                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-300 font-medium">
                                    Remark
                                  </Button>
                                </Link>
                              </div>
                              {formattedType === "Offline" && reminderRecord && (
                                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Reminder sent to {reminderRecord.vendor_name || reminderRecord.vendor_email} ({formatReminderTime(reminderRecord.sent_at)})</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Recent 5 Logins Activity Dialog Modal */}
        <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
          <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader className="p-4 pb-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 pr-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                      Recent Login Activity
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Last 5 authenticated engineer portal sessions & access logs
                    </DialogDescription>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Session
                </Badge>
              </div>
            </DialogHeader>

            <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {data?.recentLogins && data.recentLogins.length > 0 ? (
                data.recentLogins.slice(0, 5).map((log, index) => {
                  const isFirst = index === 0;
                  return (
                    <div
                      key={log.id || index}
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                        isFirst
                          ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-slate-900 dark:text-white"
                          : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isFirst
                              ? "bg-emerald-500 animate-pulse ring-2 ring-emerald-200 dark:ring-emerald-950"
                              : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        />
                        <div className="truncate">
                          <div className="font-semibold text-xs flex items-center gap-2">
                            <span>{formatLoginTime(log.login_time)}</span>
                            {isFirst && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[9px] px-1.5 py-0 border-none font-semibold">
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Laptop className="w-3 h-3 text-slate-400" />
                              {getDeviceLabel(log.user_agent)}
                            </span>
                            {log.ip_address && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px]">{log.ip_address}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono font-medium ${
                            isFirst
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {isFirst ? "Active Now" : log.session_duration ? `${log.session_duration}m` : "Logged Out"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Clock className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  No prior login records found.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
