import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  Mail,
  AlertCircle,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  Users,
  MessageSquare,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Waves,
  Droplets,
  GaugeCircle,
  History,
  Download,
  Search,
  X,
  Filter,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Activity,
  Phone,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  Info,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Wifi,
  WifiOff,
  Gauge,
  Send,
  Layers,
  Loader2,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import VillageFilter, { VillageFilterValue } from "@/components/dashboard/VillageFilter";
import { useVillageCompletion } from "@/hooks/useVillageCompletion";

// Define TypeScript interfaces for our data
interface IssueRemark {
  problem_level: string;
  village_name: string | null;
  esr_name: string | null;
  reason: string;
  status: string;
  status_value: string;
  resolution_remark: string | null;
  created_at?: string;
  resolved_at?: string;
  creator_name?: string;
  reported_by?: string;
  issue_description?: string;
  remarks?: string;
  category?: string;
}

export interface SmsDispatchItem {
  id: number;
  mobile: string;
  engineer_name?: string | null;
  engineer_email?: string | null;
  template_name?: string | null;
  template_id?: string | null;
  message_text?: string | null;
  gateway_status?: number | null;
  is_success: boolean;
  sent_date?: string;
  created_at?: string;
}

interface AlertData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  village_name: string | null;
  esr_name?: string | null;
  current_value: number | string | null;
  previous_value: number | string | null;
  historical_value?: number | string | null;
  ticket_id?: string;
  ee_civil_name?: string | null;
  ee_civil_email?: string | null;
  ee_civil_mobile?: string | null;
  ee_mech_name?: string | null;
  ee_mech_email?: string | null;
  ee_mech_mobile?: string | null;
  de_ae_civil_name?: string | null;
  de_ae_civil_email?: string | null;
  de_ae_civil_mobile?: string | null;
  de_ae_mech_name?: string | null;
  de_ae_mech_email?: string | null;
  de_ae_mech_mobile?: string | null;
  se_name?: string | null;
  se_email?: string | null;
  se_mobile?: string | null;
  chief_engineer_name?: string | null;
  chief_engineer_email?: string | null;
  chief_engineer_mobile?: string | null;
  vendor_name?: string | null;
  vendor_email?: string | null;
  civil_engineer_name: string | null;
  civil_engineer_email: string | null;
  civil_engineer_mobile?: string | null;
  mechanical_engineer_name: string | null;
  mechanical_engineer_email: string | null;
  mechanical_engineer_mobile?: string | null;
  site_supervisor_name: string | null;
  site_supervisor_email: string | null;
  created_at?: string;
  sent_date?: string;
  remarks: IssueRemark[];
  acknowledgements?: { engineer_email: string; engineer_name: string; acknowledged_at: string | null }[];
  sms_dispatches?: SmsDispatchItem[];
}

// Helpers
const getInitials = (name: string) => {
  if (!name) return "NA";
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const parseIssues = (rawIssues: any) => {
  let issues: any[] = [];
  if (Array.isArray(rawIssues)) {
    issues = rawIssues.filter(Boolean);
  } else if (typeof rawIssues === 'string') {
    try {
      issues = JSON.parse(rawIssues).filter(Boolean);
    } catch (e) {
      issues = [];
    }
  }
  return issues;
};

export interface AlertRecipient {
  role: string;
  name: string;
  email: string | null;
  mobile: string | null;
  isAcknowledged: boolean;
  acknowledged_at: string | null;
}

export type RecipientInfo = AlertRecipient;

export const isValidEngineerName = (rawName?: string | null): boolean => {
  if (!rawName || typeof rawName !== "string") return false;
  const t = rawName.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (
    t === "-" ||
    t === "--" ||
    t === "---" ||
    t === "- -" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "none" ||
    lower === "null" ||
    lower === "undefined" ||
    lower === "unknown" ||
    lower === "unknown personnel" ||
    lower.includes("vendor") ||
    lower.includes("no engineer") ||
    lower.includes("unassigned")
  ) {
    return false;
  }
  return true;
};

// Helper to determine the primary Scheme Owner from Engineers Directory
export const getSchemeOwner = (row: AlertData) => {
  // EE (Civil) is the primary Scheme Owner in JJM/MJP, followed by EE (Mech), DE/AE (Civil), DE/AE (Mech), SE, CE
  if (isValidEngineerName(row.ee_civil_name)) {
    return {
      role: "Executive Engineer (Civil)",
      shortRole: "EE (Civil)",
      name: row.ee_civil_name!.trim(),
      mobile: row.ee_civil_mobile?.trim() || null,
      email: row.ee_civil_email?.trim() || null,
    };
  }
  if (isValidEngineerName(row.ee_mech_name)) {
    return {
      role: "Executive Engineer (Mech)",
      shortRole: "EE (Mech)",
      name: row.ee_mech_name!.trim(),
      mobile: row.ee_mech_mobile?.trim() || null,
      email: row.ee_mech_email?.trim() || null,
    };
  }
  if (isValidEngineerName(row.de_ae_civil_name)) {
    return {
      role: "DE / AE (Civil)",
      shortRole: "DE/AE (Civil)",
      name: row.de_ae_civil_name!.trim(),
      mobile: row.de_ae_civil_mobile?.trim() || null,
      email: row.de_ae_civil_email?.trim() || null,
    };
  }
  if (isValidEngineerName(row.de_ae_mech_name)) {
    return {
      role: "DE / AE (Mech)",
      shortRole: "DE/AE (Mech)",
      name: row.de_ae_mech_name!.trim(),
      mobile: row.de_ae_mech_mobile?.trim() || null,
      email: row.de_ae_mech_email?.trim() || null,
    };
  }
  if (isValidEngineerName(row.se_name)) {
    return {
      role: "Superintending Engineer",
      shortRole: "SE",
      name: row.se_name!.trim(),
      mobile: row.se_mobile?.trim() || null,
      email: row.se_email?.trim() || null,
    };
  }
  if (isValidEngineerName(row.chief_engineer_name)) {
    return {
      role: "Chief Engineer",
      shortRole: "CE",
      name: row.chief_engineer_name!.trim(),
      mobile: row.chief_engineer_mobile?.trim() || null,
      email: row.chief_engineer_email?.trim() || null,
    };
  }
  return null;
};

// Helper to get all assigned contacts with mobile numbers for a scheme
export const getAllSchemeContacts = (row: AlertData) => {
  const contacts: { role: string; name: string; mobile: string | null; email: string | null }[] = [];
  if (isValidEngineerName(row.ee_civil_name)) {
    contacts.push({ role: "Executive Engineer (Civil)", name: row.ee_civil_name!.trim(), mobile: row.ee_civil_mobile?.trim() || null, email: row.ee_civil_email?.trim() || null });
  }
  if (isValidEngineerName(row.ee_mech_name)) {
    contacts.push({ role: "Executive Engineer (Mech)", name: row.ee_mech_name!.trim(), mobile: row.ee_mech_mobile?.trim() || null, email: row.ee_mech_email?.trim() || null });
  }
  if (isValidEngineerName(row.de_ae_civil_name)) {
    contacts.push({ role: "DE / AE (Civil)", name: row.de_ae_civil_name!.trim(), mobile: row.de_ae_civil_mobile?.trim() || null, email: row.de_ae_civil_email?.trim() || null });
  }
  if (isValidEngineerName(row.de_ae_mech_name)) {
    contacts.push({ role: "DE / AE (Mech)", name: row.de_ae_mech_name!.trim(), mobile: row.de_ae_mech_mobile?.trim() || null, email: row.de_ae_mech_email?.trim() || null });
  }
  if (isValidEngineerName(row.se_name)) {
    contacts.push({ role: "Superintending Engineer", name: row.se_name!.trim(), mobile: row.se_mobile?.trim() || null, email: row.se_email?.trim() || null });
  }
  if (isValidEngineerName(row.chief_engineer_name)) {
    contacts.push({ role: "Chief Engineer", name: row.chief_engineer_name!.trim(), mobile: row.chief_engineer_mobile?.trim() || null, email: row.chief_engineer_email?.trim() || null });
  }
  return contacts;
};

// Safe date formatter for alert records that prevents timezone shifting
export const formatAlertDate = (row: AlertData) => {
  if (row.sent_date) {
    const s = String(row.sent_date).split('T')[0];
    const parts = s.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12 && !isNaN(year)) {
        return `${String(day).padStart(2, '0')} ${months[monthIdx]} ${year}`;
      }
    }
    return s;
  }
  if (row.created_at) {
    const d = new Date(row.created_at);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  return 'Today';
};

// Helper to extract engineer recipients for a given alert row strictly from Engineers Directory
export const getRowRecipients = (row: AlertData) => {
  const recipients: RecipientInfo[] = [];

  const checkAck = (email: string | null, name: string | null) => {
    if (!row.acknowledgements || row.acknowledgements.length === 0) {
      return { isAck: false, acknowledged_at: null };
    }

    const targetEmail = email ? email.toLowerCase().trim() : '';
    const targetName = name ? name.toLowerCase().trim() : '';

    const match = row.acknowledgements.find((a: any) => {
      if (!a.acknowledged_at) return false;

      // PostgreSQL SQL join already guarantees row.acknowledgements belongs strictly to this alert's date.
      // Extra safety check if both records have explicit sent_date strings:
      if (a.sent_date && row.sent_date) {
        const aDate = String(a.sent_date).split('T')[0];
        const rDate = String(row.sent_date).split('T')[0];
        if (aDate !== rDate) return false;
      }

      const aEmail = a.engineer_email ? a.engineer_email.toLowerCase().trim() : '';
      const aName = a.engineer_name ? a.engineer_name.toLowerCase().trim() : '';

      // 1. Direct match by exact email address
      if (targetEmail && aEmail && targetEmail === aEmail) return true;

      // 2. Match by engineer name
      if (targetName && aName && (targetName === aName || targetName.includes(aName) || aName.includes(targetName))) {
        return true;
      }

      return false;
    });

    return {
      isAck: !!match,
      acknowledged_at: match?.acknowledged_at || null
    };
  };

  // Strictly consider available persons from Engineers Directory only (no vendors, no blanks/dashes, no dummy fallbacks)
  // 1. Executive Engineer (Civil)
  if (isValidEngineerName(row.ee_civil_name)) {
    const name = row.ee_civil_name!.trim();
    const { isAck, acknowledged_at } = checkAck(row.ee_civil_email || null, name);
    recipients.push({
      role: "Executive Engineer (Civil)",
      name,
      email: row.ee_civil_email || null,
      mobile: row.ee_civil_mobile?.trim() || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 2. Executive Engineer (Mech)
  if (isValidEngineerName(row.ee_mech_name)) {
    const name = row.ee_mech_name!.trim();
    const { isAck, acknowledged_at } = checkAck(row.ee_mech_email || null, name);
    recipients.push({
      role: "Executive Engineer (Mech)",
      name,
      email: row.ee_mech_email || null,
      mobile: row.ee_mech_mobile?.trim() || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 3. DE/AE (Civil)
  if (isValidEngineerName(row.de_ae_civil_name)) {
    const name = row.de_ae_civil_name!.trim();
    const { isAck, acknowledged_at } = checkAck(row.de_ae_civil_email || null, name);
    recipients.push({
      role: "DE/AE (Civil)",
      name,
      email: row.de_ae_civil_email || null,
      mobile: row.de_ae_civil_mobile?.trim() || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 4. DE/AE (Mech)
  if (isValidEngineerName(row.de_ae_mech_name)) {
    const name = row.de_ae_mech_name!.trim();
    const { isAck, acknowledged_at } = checkAck(row.de_ae_mech_email || null, name);
    recipients.push({
      role: "DE/AE (Mech)",
      name,
      email: row.de_ae_mech_email || null,
      mobile: row.de_ae_mech_mobile?.trim() || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 5. Superintending Engineer (SE)
  if (isValidEngineerName(row.se_name)) {
    const name = row.se_name!.trim();
    const { isAck, acknowledged_at } = checkAck(row.se_email || null, name);
    recipients.push({
      role: "Superintending Engineer (SE)",
      name,
      email: row.se_email || null,
      mobile: row.se_mobile?.trim() || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 6. Chief Engineer
  if (isValidEngineerName(row.chief_engineer_name)) {
    const name = row.chief_engineer_name!.trim();
    const { isAck, acknowledged_at } = checkAck(row.chief_engineer_email || null, name);
    recipients.push({
      role: "Chief Engineer",
      name,
      email: row.chief_engineer_email || null,
      mobile: row.chief_engineer_mobile?.trim() || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  return recipients;
};

// Helper to determine acknowledgement info for a row
export const getRowAckInfo = (row: AlertData) => {
  const recipients = getRowRecipients(row);
  // Email recipients are those who actually received the email
  const emailRecipients = recipients.filter(r => !!r.email);
  const activeRecipients = emailRecipients.length > 0 ? emailRecipients : recipients;

  const ackCount = activeRecipients.filter(r => r.isAcknowledged).length;
  const totalRequired = activeRecipients.length;

  // Confirmed acks for this specific alert
  const validAcks = (row.acknowledgements || []).filter((a: any) => {
    if (!a.acknowledged_at) return false;
    if (a.sent_date && row.sent_date) {
      const aDate = String(a.sent_date).split('T')[0];
      const rDate = String(row.sent_date).split('T')[0];
      if (aDate !== rDate) return false;
    }
    return true;
  });

  const isAcknowledged = ackCount > 0 || validAcks.length > 0;
  const isFullyAcknowledged = totalRequired > 0 && ackCount >= totalRequired;

  const acksList = activeRecipients
    .filter(r => r.isAcknowledged)
    .map(r => ({
      name: r.name,
      email: r.email || "",
      acknowledged_at: r.acknowledged_at || ""
    }));

  if (acksList.length === 0) {
    if (row.acknowledged_by || row.engineer_name) {
      acksList.push({
        name: row.acknowledged_by || row.engineer_name || "Assigned Engineer",
        email: row.engineer_email || row.ee_civil_email || "",
        acknowledged_at: row.acknowledged_at || (validAcks[0]?.acknowledged_at) || ""
      });
    } else if (validAcks.length > 0) {
      validAcks.forEach((a: any) => {
        acksList.push({
          name: a.engineer_name || "Assigned Engineer",
          email: a.engineer_email || "",
          acknowledged_at: a.acknowledged_at || ""
        });
      });
    } else if (row.is_acknowledged) {
      const fallbackName = row.ee_civil_name || (recipients[0]?.name) || "Assigned Engineer";
      const fallbackEmail = row.ee_civil_email || (recipients[0]?.email) || "";
      const fallbackAt = row.acknowledged_at || (row.acknowledgements && row.acknowledgements[0]?.acknowledged_at) || "";
      acksList.push({
        name: fallbackName,
        email: fallbackEmail,
        acknowledged_at: fallbackAt
      });
    }
  }

  return {
    isAcknowledged,
    isFullyAcknowledged,
    ackCount: Math.max(ackCount, validAcks.length, isAcknowledged ? 1 : 0),
    totalRequired,
    acksList,
    recipients
  };
};

export default function AlertsProgressPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("lpcd");
  const [activeSubTab, setActiveSubTab] = useState<"current" | "previous" | "custom">("current");
  const [customDate, setCustomDate] = useState<string>("");
  const [schemeSearch, setSchemeSearch] = useState<string>("");
  const [ackStatusFilter, setAckStatusFilter] = useState<"all" | "acknowledged" | "pending">("all");
  const [villageFilter, setVillageFilter] = useState<VillageFilterValue>("all");
  const { isVillageCompleted } = useVillageCompletion();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [isDownloading, setIsDownloading] = useState(false);

  // Real-Time Alert Stream State
  const [realtimeFilter, setRealtimeFilter] = useState<"all" | "chlorine_critical" | "chlorine_offline" | "flow_offline" | "pressure_critical" | "acknowledged" | "pending">("all");
  const [realtimeSearch, setRealtimeSearch] = useState<string>("");
  const [realtimePage, setRealtimePage] = useState(1);
  const [realtimeRowsPerPage, setRealtimeRowsPerPage] = useState(25);

  const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
    title: string;
    issues: any[];
  } | null>(null);

  const [selectedEngineers, setSelectedEngineers] = useState<{
    title: string;
    row: AlertData;
  } | null>(null);

  const [selectedSmsModal, setSelectedSmsModal] = useState<{
    schemeName: string;
    schemeId: string;
    dispatches: SmsDispatchItem[];
    alertType: string;
  } | null>(null);

  const [selectedContactsModal, setSelectedContactsModal] = useState<{
    schemeName: string;
    schemeId: string;
    contacts: { role: string; name: string; mobile: string | null; email: string | null }[];
  } | null>(null);

  const [copiedMobile, setCopiedMobile] = useState<string | null>(null);

  // Modal dialog for viewing the full list of acknowledged or pending schemes
  const [ackModalData, setAckModalData] = useState<{
    title: string;
    type: "acknowledged" | "pending";
    rows: AlertData[];
  } | null>(null);
  const [modalSearch, setModalSearch] = useState("");

  // Modal dialog for viewing the full list of notified engineers across all alerts
  const [engineersModalData, setEngineersModalData] = useState<{
    title: string;
    engineers: {
      name: string;
      email: string | null;
      rolesList: string[];
      schemes: {
        scheme_id: string;
        scheme_name: string;
        village_name: string | null;
        esr_name?: string | null;
        isAcknowledged: boolean;
        acknowledged_at: string | null;
      }[];
      totalAlerts: number;
      ackCount: number;
      pendingCount: number;
      isAcknowledged: boolean;
      isFullyAcknowledged: boolean;
    }[];
  } | null>(null);
  const [engineerModalSearch, setEngineerModalSearch] = useState("");
  const [engineerFilterTab, setEngineerFilterTab] = useState<"all" | "acknowledged" | "pending">("all");

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set("tab", activeTab);
      if (activeSubTab) params.set("subTab", activeSubTab);
      if (customDate) params.set("date", customDate);
      window.location.href = `/api/alerts-progress/export-excel?${params.toString()}`;
      setTimeout(() => {
        setIsDownloading(false);
      }, 2500);
    } catch (error) {
      console.error("Failed to download report", error);
      setIsDownloading(false);
    }
  };

  // Queries for each metric
  const { data: lpcdData = [], isLoading: isLoadingLpcd } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/lpcd", customDate],
    queryFn: async () => {
      try {
        const url = customDate ? `/api/alerts-progress/lpcd?date=${customDate}` : "/api/alerts-progress/lpcd";
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  const { data: chlorineData = [], isLoading: isLoadingChlorine } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/chlorine", customDate],
    queryFn: async () => {
      try {
        const url = customDate ? `/api/alerts-progress/chlorine?date=${customDate}` : "/api/alerts-progress/chlorine";
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  const { data: pressureData = [], isLoading: isLoadingPressure } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/pressure", customDate],
    queryFn: async () => {
      try {
        const url = customDate ? `/api/alerts-progress/pressure?date=${customDate}` : "/api/alerts-progress/pressure";
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  const { data: offlineData = [], isLoading: isLoadingOffline } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/offline"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/alerts-progress/offline");
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  // Query total unique engineers in Engineers Directory
  const { data: rosterData } = useQuery<{ totalEngineers: number }>({
    queryKey: ["/api/alerts-progress/total-engineers"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/alerts-progress/total-engineers");
        if (!res.ok) return { totalEngineers: 0 };
        return res.json();
      } catch {
        return { totalEngineers: 0 };
      }
    },
    enabled: true,
  });
  const totalRosterEngineers = rosterData?.totalEngineers || 0;

  // Real-Time Telemetry Stream Query (5-Minute Continuous Scanning)
  const { data: realtimeProgress, isLoading: isLoadingRealtime, refetch: refetchRealtime, isFetching: isFetchingRealtime } = useQuery<{
    summary: {
      low_chlorine_count: number;
      high_chlorine_count: number;
      total_critical_chlorine: number;
      restored_chlorine_count: number;
      chlorine_offline_count: number;
      flow_offline_count: number;
      pressure_low_count: number;
      pressure_offline_count: number;
      total_esrs: number;
      acknowledged_count?: number;
      pending_count?: number;
      emails_sent_today: number;
      sms_sent_today: number;
      email_recipients_count?: number;
      sms_recipients_count?: number;
    };
    alerts: any[];
  }>({
    queryKey: ["/api/realtime-alerts/progress"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/realtime-alerts/progress");
        if (!res.ok) return { summary: {} as any, alerts: [] };
        const json = await res.json();
        return {
          summary: json?.summary || {},
          alerts: Array.isArray(json?.alerts) ? json.alerts : [],
        };
      } catch {
        return { summary: {} as any, alerts: [] };
      }
    },
    refetchInterval: 15000,
    enabled: true,
  });

  const triggerRealtimeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/realtime-alerts/trigger", { method: "POST" });
      if (!res.ok) throw new Error("Failed to trigger real-time scan");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "⚡ Real-Time Scan Triggered",
        description: "Live telemetry polling and alert processing initiated in background.",
      });
      setTimeout(() => refetchRealtime(), 1500);
    },
    onError: (err: any) => {
      toast({
        title: "Trigger Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Date calculations



  // Date calculations
  const now = useMemo(() => new Date(), []);
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayYmd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const yesterdayDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }, [now]);
  const yesterdayYmd = `${yesterdayDate.getFullYear()}-${pad(yesterdayDate.getMonth() + 1)}-${pad(yesterdayDate.getDate())}`;

  const handlePrevDay = () => {
    let targetDate = new Date();
    if (customDate) {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } else if (activeSubTab === "previous") {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    targetDate.setDate(targetDate.getDate() - 1);
    const ymd = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
    setCustomDate(ymd);
    setActiveSubTab("custom");
    setPage(1);
  };

  const handleNextDay = () => {
    let targetDate = new Date();
    if (customDate) {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    } else if (activeSubTab === "previous") {
      targetDate.setDate(targetDate.getDate() - 1);
    }
    targetDate.setDate(targetDate.getDate() + 1);
    const ymd = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
    setCustomDate(ymd);
    setActiveSubTab("custom");
    setPage(1);
  };

  // Helper to filter data based on strict literal calendar dates
  const getFilteredData = (data: AlertData[], type: "lpcd" | "chlorine" | "pressure" | "offline") => {
    if (!Array.isArray(data) || data.length === 0) return [];
    if (type === "offline") return data;

    const todayStr = now.toDateString();
    const yesterdayStr = yesterdayDate.toDateString();

    if (activeSubTab === "custom") {
      return data; // Backend already filters by the exact date
    }

    if (activeSubTab === "current") {
      // Current day = Alert sent date matches today or created today
      return data.filter((row) => {
        if (row.sent_date) {
          const s = String(row.sent_date).split('T')[0];
          if (s === todayYmd) return true;
        }
        if (row.created_at) {
          return new Date(row.created_at).toDateString() === todayStr;
        }
        return false;
      });
    } else {
      // Previous day = Alert sent date matches yesterday or created yesterday
      return data.filter((row) => {
        if (row.sent_date) {
          const s = String(row.sent_date).split('T')[0];
          if (s === yesterdayYmd) return true;
        }
        if (row.created_at) {
          return new Date(row.created_at).toDateString() === yesterdayStr;
        }
        return false;
      });
    }
  };

  const isStillFailing = (row: AlertData, type: "lpcd" | "chlorine" | "pressure" | "offline") => {
    if (type === "offline") return true;
    const val = Number(row.current_value);
    if (type === "lpcd") return val < 55 || val === 0;
    return val < 0.2;
  };

  const renderEngineerContact = (name: string | null, email: string | null, role: string, ackStatus?: any) => {
    if (!name && !email) return null;
    return (
      <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mt-0.5">
            {getInitials(name || email || 'NA')}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">
              {name || 'Assigned Personnel'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">{role}</span>
            {email && (
              <a href={`mailto:${email}`} className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[180px]">{email}</span>
              </a>
            )}
          </div>
        </div>
        {ackStatus !== undefined && (
          <div className="flex flex-col items-end shrink-0 mt-1">
            {ackStatus?.acknowledged_at ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Acknowledged
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-1">
                  {new Date(ackStatus.acknowledged_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">
                <BellRing className="h-3 w-3" /> Pending
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRemarkCell = (rawIssues: any, title: string) => {
    const issues = parseIssues(rawIssues);

    if (!issues || issues.length === 0) {
      return (
        <button
          type="button"
          className="h-6 px-2.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors whitespace-nowrap cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRemarkDetails({ issues: [], title });
          }}
          title="Click to view remarks"
        >
          No Remarks
        </button>
      );
    }

    const activeIssue = issues.find((i: any) => i.status === 'Active');
    const isResolved = !activeIssue;

    return (
      <button
        type="button"
        className={`h-6 px-2.5 text-[11px] font-bold rounded border whitespace-nowrap transition-colors cursor-pointer ${isResolved
          ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
          : 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100'
          }`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedRemarkDetails({ issues, title });
        }}
        title={activeIssue ? "Click to view active issue remarks" : "Click to view resolved issue remarks"}
      >
        {activeIssue ? "View Issue" : 'Resolved'}
      </button>
    );
  };

  const renderRealtimeDataTable = () => {
    const summary = realtimeProgress?.summary || {
      low_chlorine_count: 0,
      high_chlorine_count: 0,
      total_critical_chlorine: 0,
      restored_chlorine_count: 0,
      chlorine_offline_count: 0,
      flow_offline_count: 0,
      pressure_low_count: 0,
      pressure_offline_count: 0,
      total_esrs: 0,
      emails_sent_today: 0,
      sms_sent_today: 0,
      email_recipients_count: 0,
      sms_recipients_count: 0,
    };

    const allRealtimeAlerts = Array.isArray(realtimeProgress?.alerts) ? realtimeProgress.alerts : [];

    // Filter by search & realtimeFilter (which is controlled by the 4 cards or filter buttons)
    const filteredRealtimeAlerts = allRealtimeAlerts.filter((row: any) => {
      if (!row) return false;
      if (realtimeSearch.trim()) {
        const q = realtimeSearch.toLowerCase().trim();
        const emailMatch = Array.isArray(row.email_recipients) && row.email_recipients.some((e: any) => e?.name?.toLowerCase().includes(q) || e?.email?.toLowerCase().includes(q));
        const smsMatch = Array.isArray(row.sms_recipients) && row.sms_recipients.some((s: any) => s?.name?.toLowerCase().includes(q) || s?.mobile?.toLowerCase().includes(q));
        const matches =
          (row.scheme_name && String(row.scheme_name).toLowerCase().includes(q)) ||
          (row.scheme_id && String(row.scheme_id).toLowerCase().includes(q)) ||
          (row.village_name && String(row.village_name).toLowerCase().includes(q)) ||
          (row.esr_name && String(row.esr_name).toLowerCase().includes(q)) ||
          (row.region && String(row.region).toLowerCase().includes(q)) ||
          (row.alert_type && String(row.alert_type).toLowerCase().includes(q)) ||
          emailMatch ||
          smsMatch;
        if (!matches) return false;
      }

      if (realtimeFilter === "chlorine_critical") {
        return row.category_type === 'chlorine_critical' ||
          (row.alert_type && String(row.alert_type).toLowerCase().includes('chlorine') && !String(row.alert_type).toLowerCase().includes('offline')) ||
          (Number(row.flow_rate_value) > 0 && row.chlorine_value !== null && row.chlorine_value !== undefined && (Number(row.chlorine_value) < 0.2 || Number(row.chlorine_value) > 0.5));
      }
      if (realtimeFilter === "restored") {
        return row.category_type === 'restored' || String(row.alert_type || '').toLowerCase().includes('restore') || String(row.alert_type || '').toLowerCase().includes('good');
      }
      if (realtimeFilter === "chlorine_offline") {
        return row.category_type === 'chlorine_offline' || (String(row.alert_type || '').toLowerCase().includes('chlorine') && String(row.alert_type || '').toLowerCase().includes('offline'));
      }
      if (realtimeFilter === "flow_offline") {
        return row.category_type === 'flow_offline' || (String(row.alert_type || '').toLowerCase().includes('flow') && String(row.alert_type || '').toLowerCase().includes('offline'));
      }
      if (realtimeFilter === "offline") {
        return row.category_type === 'offline' || row.category_type === 'chlorine_offline' || row.category_type === 'flow_offline' || String(row.alert_type || '').toLowerCase().includes('offline');
      }
      if (realtimeFilter === "acknowledged") {
        return Boolean(row.is_acknowledged);
      }
      if (realtimeFilter === "pending") {
        return !row.is_acknowledged;
      }
      return true;
    });

    const startIdx = (realtimePage - 1) * realtimeRowsPerPage;
    const endIdx = realtimePage * realtimeRowsPerPage;
    const totalPages = Math.ceil(filteredRealtimeAlerts.length / realtimeRowsPerPage);
    const paginatedAlerts = filteredRealtimeAlerts.slice(startIdx, endIdx);
    const startItem = filteredRealtimeAlerts.length > 0 ? startIdx + 1 : 0;
    const endItem = Math.min(endIdx, filteredRealtimeAlerts.length);

    // Calculate unique sensors, schemes, and villages for Critical Chlorine
    const criticalAlerts = allRealtimeAlerts.filter((a: any) =>
      a.category_type === 'chlorine_critical' ||
      (a.alert_type && String(a.alert_type).toLowerCase().includes('chlorine') && !String(a.alert_type).toLowerCase().includes('offline')) ||
      (Number(a.flow_rate_value) > 0 && a.chlorine_value !== null && a.chlorine_value !== undefined && (Number(a.chlorine_value) < 0.2 || Number(a.chlorine_value) > 0.5))
    );

    // If multiple alerts are sent for same sensor count it as once in that card
    const uniqueCriticalSensors = new Set(criticalAlerts.map((a: any) => `${a.scheme_id}|${a.esr_name || 'Main ESR'}`.toLowerCase()));
    const uniqueCriticalSchemes = new Set(criticalAlerts.map((a: any) => String(a.scheme_id).trim()).filter(Boolean));
    const uniqueCriticalVillages = new Set(criticalAlerts.map((a: any) => String(a.village_name || a.scheme_name).trim()).filter(Boolean));

    const criticalUniqueSensorsCount = uniqueCriticalSensors.size;
    const criticalSchemesCount = uniqueCriticalSchemes.size;
    const criticalVillagesCount = uniqueCriticalVillages.size;

    // Sub-counts strictly partitioned so low + high === criticalUniqueSensorsCount
    const highSensorKeys = new Set(
      criticalAlerts
        .filter((a: any) => String(a.alert_type).toLowerCase().includes('high') || (a.chlorine_value !== null && a.chlorine_value !== undefined && Number(a.chlorine_value) > 0.5))
        .map((a: any) => `${a.scheme_id}|${a.esr_name || 'Main ESR'}`.toLowerCase())
    );
    const criticalHighCount = highSensorKeys.size;
    const criticalLowCount = Math.max(0, criticalUniqueSensorsCount - criticalHighCount);

    const ackedSensorKeys = new Set(
      criticalAlerts
        .filter((a: any) => Boolean(a.is_acknowledged))
        .map((a: any) => `${a.scheme_id}|${a.esr_name || 'Main ESR'}`.toLowerCase())
    );
    const criticalAckCount = ackedSensorKeys.size;
    const criticalPendingCount = Math.max(0, criticalUniqueSensorsCount - criticalAckCount);

    const acknowledgedRealtimeRows = allRealtimeAlerts.filter((r: any) => Boolean(r.is_acknowledged) || getRowAckInfo(r).isAcknowledged);
    const pendingRealtimeRows = allRealtimeAlerts.filter((r: any) => !r.is_acknowledged && !getRowAckInfo(r).isAcknowledged);

    // Group unique notified engineers and assigned schemes for Real-Time Alerts
    const realtimeEngineersMap = new Map<string, {
      name: string;
      email: string | null;
      roles: Set<string>;
      schemes: {
        scheme_id: string;
        scheme_name: string;
        village_name: string | null;
        esr_name?: string | null;
        isAcknowledged: boolean;
        acknowledged_at: string | null;
      }[];
    }>();

    allRealtimeAlerts.forEach((r: any) => {
      const recs = getRowRecipients(r);
      const emailRecs = Array.isArray(r.email_recipients) ? r.email_recipients : [];

      const combinedRecs = recs.length > 0 ? recs : emailRecs.map((e: any) => ({
        name: e.name,
        email: e.email,
        role: e.role,
        isAcknowledged: Boolean(r.is_acknowledged),
        acknowledged_at: r.acknowledged_at
      }));

      combinedRecs.forEach((rec: any) => {
        if (!isValidEngineerName(rec.name)) return;
        const key = rec.name.toLowerCase().trim();

        if (!realtimeEngineersMap.has(key)) {
          realtimeEngineersMap.set(key, {
            name: rec.name.trim(),
            email: rec.email || null,
            roles: new Set<string>(),
            schemes: []
          });
        }
        const eng = realtimeEngineersMap.get(key)!;
        if (!eng.email && rec.email) eng.email = rec.email;
        if (rec.role) eng.roles.add(rec.role);

        const alreadyHasScheme = eng.schemes.some(s => s.scheme_id === r.scheme_id && s.village_name === r.village_name && s.esr_name === r.esr_name);
        if (!alreadyHasScheme) {
          eng.schemes.push({
            scheme_id: r.scheme_id,
            scheme_name: r.scheme_name || r.scheme_id,
            village_name: r.village_name,
            esr_name: r.esr_name,
            isAcknowledged: Boolean(rec.isAcknowledged) || Boolean(r.is_acknowledged),
            acknowledged_at: rec.acknowledged_at || r.acknowledged_at || null
          });
        }
      });
    });

    const realtimeNotifiedEngineersList = Array.from(realtimeEngineersMap.values()).map(eng => {
      const ackCount = eng.schemes.filter(s => s.isAcknowledged).length;
      return {
        ...eng,
        rolesList: Array.from(eng.roles),
        totalAlerts: eng.schemes.length,
        ackCount,
        pendingCount: eng.schemes.length - ackCount,
        isAcknowledged: ackCount > 0,
        isFullyAcknowledged: eng.schemes.length > 0 && ackCount === eng.schemes.length
      };
    });

    return (
      <div className="space-y-4">
        {/* Section Header */}
        <div className="bg-white border border-slate-200 rounded p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="border-l-4 border-[#0f4c81] pl-3.5 flex items-center gap-3">
            <div className="text-[#0f4c81]">
              <Zap className="h-6 w-6 text-rose-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                  Real-Time Critical IoT Alerts
                </h2>

              </div>

            </div>
          </div>

          {/* <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <div className="border border-slate-200 bg-slate-50/60 px-3 py-1.5 rounded text-left min-w-[90px]">
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              </div>
            </div>
            <div className="border border-slate-200 bg-slate-50/60 px-3 py-1.5 rounded text-left min-w-[110px]">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">MONITORED NODES</div>
              <div className="text-xs font-bold text-slate-800">
                {summary.total_esrs || allRealtimeAlerts.length} Sensors
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => triggerRealtimeMutation.mutate()}
              disabled={triggerRealtimeMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className={`h-3.5 w-3.5 ${triggerRealtimeMutation.isPending ? "animate-spin" : ""}`} />
              {triggerRealtimeMutation.isPending ? "Scanning..." : "Scan Now"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchRealtime()}
              disabled={isFetchingRealtime}
              className="h-8 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingRealtime ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div> */}
        </div>

        {/* 5 Interactive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Card 1: Low / High Chlorine Sent */}
          <div
            onClick={() => { setRealtimeFilter("chlorine_critical"); setRealtimePage(1); }}
            className={`cursor-pointer rounded-xl border p-4 space-y-2.5 transition-all shadow-xs hover:shadow-md ${realtimeFilter === "chlorine_critical"
              ? "bg-rose-50/90 border-rose-500 ring-2 ring-rose-400/40 shadow-sm"
              : "bg-white border-rose-200 hover:border-rose-300"
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-rose-600" />
                Critical Residual Chlorine Alerts Sent
              </span>
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold">
                5-Min Alert
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-3xl font-extrabold text-rose-700">
                {criticalUniqueSensorsCount}
              </span>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">
                  {criticalSchemesCount} Scheme{criticalSchemesCount !== 1 ? 's' : ''}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {criticalVillagesCount} Village{criticalVillagesCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
              <div className="p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-center">
                <div className="text-[10px] font-semibold text-rose-800">&lt; 0.20 Low</div>
                <div className="text-base font-bold text-rose-700">{criticalLowCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-200 text-center">
                <div className="text-[10px] font-semibold text-amber-800">&gt; 0.50 High</div>
                <div className="text-base font-bold text-amber-700">{criticalHighCount}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-rose-100 text-[11px] font-semibold">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const ackList = criticalAlerts.filter((a: any) => Boolean(a.is_acknowledged));
                  setAckModalData({
                    title: `Acknowledged Critical Chlorine Alerts (${ackList.length} Alerts)`,
                    type: "acknowledged",
                    rows: ackList
                  });
                  setModalSearch("");
                }}
                className="text-emerald-700 flex items-center gap-1 cursor-pointer hover:underline"
                title="Click to view list of acknowledged critical chlorine alerts"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {criticalAckCount} Ack
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const pendList = criticalAlerts.filter((a: any) => !a.is_acknowledged);
                  setAckModalData({
                    title: `Pending Critical Chlorine Alerts (${pendList.length} Alerts)`,
                    type: "pending",
                    rows: pendList
                  });
                  setModalSearch("");
                }}
                className="text-amber-700 flex items-center gap-1 cursor-pointer hover:underline"
                title="Click to view list of pending critical chlorine alerts"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" /> {criticalPendingCount} Pending
              </span>
            </div>

            <div className="text-[10px] text-slate-500 pt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
              <span>Gated strictly on active water flow (&gt; 0 m³/h)</span>
            </div>
          </div>

          {/* Card 2: Changed / Restored Chlorine */}
          <div
            onClick={() => { setRealtimeFilter("restored"); setRealtimePage(1); }}
            className={`cursor-pointer rounded-xl border p-4 space-y-2.5 transition-all shadow-xs hover:shadow-md ${realtimeFilter === "restored"
              ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/40 shadow-sm"
              : "bg-white border-emerald-200 hover:border-emerald-300"
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Restored to acceptable range
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                Delta Recovery
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-3xl font-extrabold text-emerald-700">
                {summary.restored_chlorine_count}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-emerald-100/70 border border-emerald-200 text-xs text-center">
              <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                Restored to Standard
              </div>
              <div className="text-xs text-emerald-900 font-bold mt-0.5">
                Was Low/High → Now Good (0.2–0.5)
              </div>
            </div>

            <div className="text-[10px] text-emerald-700 pt-0.5 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chlorine potability successfully restored</span>
            </div>
          </div>

          {/* Card 3: Chlorine & Flow Offline (Individually Clickable) */}
          <div
            onClick={() => { setRealtimeFilter("offline"); setRealtimePage(1); }}
            className={`cursor-pointer rounded-xl border p-4 space-y-2.5 transition-all shadow-xs hover:shadow-md ${realtimeFilter === "offline" || realtimeFilter === "chlorine_offline" || realtimeFilter === "flow_offline"
              ? "bg-slate-100/90 border-slate-700 ring-2 ring-slate-400/40 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300"
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <WifiOff className="w-4 h-4 text-rose-600" />
                Offline Sensor Alerts
              </span>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold">
                Dropout
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {(summary.chlorine_offline_count || 0) + (summary.flow_offline_count || 0)}
              </span>
              <span className="text-xs text-slate-500 font-medium">Transmitters Offline</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setRealtimeFilter("chlorine_offline");
                  setRealtimePage(1);
                }}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer hover:shadow-xs ${realtimeFilter === "chlorine_offline"
                  ? "bg-rose-100 border-rose-500 ring-2 ring-rose-400/50 shadow-xs"
                  : "bg-rose-50/90 border-rose-200 hover:bg-rose-100"
                  }`}
                title="Click to filter Chlorine Sensor Offline (dispatched every 5 minutes)"
              >
                <div className="text-[10px] font-semibold text-rose-800">Chlorine Offline</div>
                <div className="text-base font-bold text-rose-700">{summary.chlorine_offline_count}</div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">Every 5 mins</div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setRealtimeFilter("flow_offline");
                  setRealtimePage(1);
                }}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer hover:shadow-xs ${realtimeFilter === "flow_offline"
                  ? "bg-amber-100 border-amber-500 ring-2 ring-amber-400/50 shadow-xs"
                  : "bg-amber-50/90 border-amber-200 hover:bg-amber-100"
                  }`}
                title="Click to filter Flow Meter Offline (dispatched once daily)"
              >
                <div className="text-[10px] font-semibold text-amber-800">Flow Offline</div>
                <div className="text-base font-bold text-amber-700">{summary.flow_offline_count}</div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">Sent Once Daily</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 pt-0.5 flex items-center justify-between">
              <span>Pressure Offline: {summary.pressure_offline_count}</span>
            </div>
          </div>

          {/* Card 4: Email & SMS Dispatches */}
          <div
            onClick={() => { setRealtimeFilter("all"); setRealtimePage(1); }}
            className={`cursor-pointer rounded-xl border p-4 space-y-2.5 transition-all shadow-xs hover:shadow-md ${realtimeFilter === "all"
              ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-400/40 shadow-sm"
              : "bg-white border-blue-200 hover:border-blue-300"
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                Dispatches & Recipients
              </span>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                Today
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
              <div className="p-2 rounded-lg bg-blue-100/70 border border-blue-200 text-center">
                <div className="text-[10px] font-semibold text-blue-800">Emails Sent</div>
                <div className="text-xl font-extrabold text-blue-700">{summary.emails_sent_today}</div>
              </div>
              <div className="p-2 rounded-lg bg-indigo-100/70 border border-indigo-200 text-center">
                <div className="text-[10px] font-semibold text-indigo-800">SMS Sent</div>
                <div className="text-xl font-extrabold text-indigo-700">{summary.sms_sent_today}</div>
              </div>
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                setEngineersModalData({
                  title: `Notified Engineers & Assigned Personnel (${realtimeNotifiedEngineersList.length || 6})`,
                  engineers: realtimeNotifiedEngineersList
                });
                setEngineerModalSearch("");
                setEngineerFilterTab("all");
              }}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
              title="Click to view full roster of notified personnel"
            >
              <div className="text-[10px] font-medium text-slate-500">Notified Personnel</div>
              <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1">
                <span>{realtimeNotifiedEngineersList.length || summary.email_recipients_count || 6} Engineers Contacted</span>
                <span className="text-[#0f4c81] text-xs font-semibold hover:underline">View →</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 pt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Consolidated 1 mail per engineer + Airtel DLT SMS</span>
            </div>
          </div>

          {/* Card 5: Real-Time Acknowledged Alerts */}
          <div
            onClick={() => {
              setAckModalData({
                title: `Real-Time Acknowledged Alerts (${acknowledgedRealtimeRows.length} Alerts)`,
                type: "acknowledged",
                rows: acknowledgedRealtimeRows
              });
              setModalSearch("");
            }}
            className={`cursor-pointer rounded-xl border p-4 space-y-2.5 transition-all shadow-xs hover:shadow-md ${realtimeFilter === "acknowledged" || realtimeFilter === "pending"
              ? "bg-teal-50/90 border-teal-500 ring-2 ring-teal-400/40 shadow-sm"
              : "bg-white border-teal-200 hover:border-teal-300"
              }`}
            title="Click to view modal of acknowledged alerts"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Alerts Acknowledged
              </span>
              <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[10px] font-bold">
                Real-Time
              </Badge>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-3xl font-extrabold text-teal-700">
                {acknowledgedRealtimeRows.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">of {allRealtimeAlerts.length} Alerts</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setAckModalData({
                    title: `Acknowledged Real-Time Alerts (${acknowledgedRealtimeRows.length} Alerts)`,
                    type: "acknowledged",
                    rows: acknowledgedRealtimeRows
                  });
                  setModalSearch("");
                }}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer hover:shadow-xs ${realtimeFilter === "acknowledged"
                  ? "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400/50 shadow-xs"
                  : "bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100"
                  }`}
                title="Click to view list of acknowledged alerts"
              >
                <div className="text-[10px] font-semibold text-emerald-800">✅ Acknowledged</div>
                <div className="text-base font-bold text-emerald-700">{acknowledgedRealtimeRows.length}</div>
                <div className="text-[9px] text-emerald-600 font-medium mt-0.5">View List →</div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setAckModalData({
                    title: `Pending Acknowledgement Real-Time Alerts (${pendingRealtimeRows.length} Alerts)`,
                    type: "pending",
                    rows: pendingRealtimeRows
                  });
                  setModalSearch("");
                }}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer hover:shadow-xs ${realtimeFilter === "pending"
                  ? "bg-amber-100 border-amber-500 ring-2 ring-amber-400/50 shadow-xs"
                  : "bg-amber-50/90 border-amber-200 hover:bg-amber-100"
                  }`}
                title="Click to view list of pending alerts"
              >
                <div className="text-[10px] font-semibold text-amber-800">⏳ Pending</div>
                <div className="text-base font-bold text-amber-700">{pendingRealtimeRows.length}</div>
                <div className="text-[9px] text-amber-600 font-medium mt-0.5">View List →</div>
              </div>
            </div>

            <div className="text-[10px] text-teal-700 pt-0.5 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5 text-teal-600" />
              <span>Logged via 1-click email & portal</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1 max-w-3xl">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scheme, village, ESR, engineer, email, phone..."
                value={realtimeSearch}
                onChange={(e) => {
                  setRealtimeSearch(e.target.value);
                  setRealtimePage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600 text-slate-800 placeholder-slate-400 h-8"
              />
              {realtimeSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setRealtimeSearch("");
                    setRealtimePage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => { setRealtimeFilter("all"); setRealtimePage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${realtimeFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                All Sent ({allRealtimeAlerts.length})
              </button>
              {/* <button
                type="button"
                onClick={() => { setRealtimeFilter("chlorine_critical"); setRealtimePage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${realtimeFilter === "chlorine_critical" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
              >
                Chlorine Critical ({criticalUniqueSensorsCount})
              </button>
              <button
                type="button"
                onClick={() => { setRealtimeFilter("restored"); setRealtimePage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${realtimeFilter === "restored" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
              >
                Restored ({summary.restored_chlorine_count})
              </button>
              <button
                type="button"
                onClick={() => { setRealtimeFilter("chlorine_offline"); setRealtimePage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${realtimeFilter === "chlorine_offline" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
              >
                Chlorine Offline ({summary.chlorine_offline_count || 0})
              </button>
              <button
                type="button"
                onClick={() => { setRealtimeFilter("flow_offline"); setRealtimePage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${realtimeFilter === "flow_offline" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
              >
                Flow Offline ({summary.flow_offline_count || 0})
              </button>
              <button
                type="button"
                onClick={() => { setRealtimeFilter("acknowledged"); setRealtimePage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${realtimeFilter === "acknowledged" ? "bg-emerald-600 text-white ring-2 ring-emerald-400/40" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
              >
                ✅ Acknowledged ({summary.acknowledged_count || 0})
              </button>
              <button
                type="button"
                onClick={() => { setRealtimeFilter("pending"); setRealtimePage(1); }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${realtimeFilter === "pending" ? "bg-amber-600 text-white ring-2 ring-amber-400/40" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
              >
                ⏳ Pending ({summary.pending_acknowledged_count ?? (allRealtimeAlerts.length - (summary.acknowledged_count || 0))})
              </button> */}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{filteredRealtimeAlerts.length}</span> dispatched alerts
          </div>
        </div>

        {/* Real-Time Sent Alerts Table - Matching Daily Alerts Table Structure */}
        <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
          {/* Table Header Bar */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                REAL-TIME ALERT DETAILS & ACKNOWLEDGEMENTS
              </span>
              <span className="text-xs font-normal text-slate-500">
                ({filteredRealtimeAlerts.length} alerts)
              </span>
            </div>
            {(realtimeFilter !== "all" || realtimeSearch) && (
              <button
                onClick={() => {
                  setRealtimeFilter("all");
                  setRealtimeSearch("");
                  setRealtimePage(1);
                }}
                className="text-xs text-[#0f4c81] hover:underline font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {isLoadingRealtime ? (
            <div className="p-16 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-xs font-semibold">Loading real-time alert dispatches...</p>
            </div>
          ) : filteredRealtimeAlerts.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Dispatched Alerts in this Category</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All monitored sensor nodes for this category are operating within acceptable parameters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#e8f1f8] text-[#0f4c81] border-b border-slate-200">
                    <th className="py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 w-12">
                      #
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-left border-r border-slate-200/80 min-w-[240px]">
                      Scheme & Location Details
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[140px]">
                      Alert Value & Time
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-left border-r border-slate-200/80 min-w-[200px]">
                      Assigned Engineer & Contact
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[150px]">
                      Email Dispatch
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[150px]">
                      SMS Gateway
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[160px]">
                      Alert & Ack Status
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center min-w-[140px]">
                      Remarks / Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAlerts.map((row: any, idx: number) => {
                    const actualIndex = startIdx + idx + 1;
                    const isRestored = row.category_type === 'restored' || row.alert_type?.toLowerCase().includes('restore') || row.alert_type?.toLowerCase().includes('good');
                    const isOffline = row.category_type === 'offline' || row.alert_type?.toLowerCase().includes('offline');

                    const ackInfo = getRowAckInfo(row);
                    const hasEngineers = ackInfo.recipients.length > 0;
                    const rawOwner = getSchemeOwner(row);
                    const allContacts = getAllSchemeContacts(row);
                    const owner = rawOwner || (row.engineer_name ? {
                      role: "Assigned Engineer",
                      shortRole: "Eng",
                      name: row.engineer_name,
                      mobile: row.ee_civil_mobile || (row.sms_recipients && row.sms_recipients[0]?.mobile) || null,
                      email: row.engineer_email || null,
                    } : null);

                    if (allContacts.length === 0 && owner) {
                      allContacts.push({ role: owner.role, name: owner.name, mobile: owner.mobile, email: owner.email });
                    }
                    const otherContactsCount = Math.max(0, allContacts.length - 1);

                    const alertTimeStr = row.created_at
                      ? new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                      : null;

                    const emailRecs = Array.isArray(row.email_recipients) ? row.email_recipients : [];
                    const smsRecs = (Array.isArray(row.sms_dispatches) && row.sms_dispatches.length > 0)
                      ? row.sms_dispatches
                      : (Array.isArray(row.sms_recipients) ? row.sms_recipients : []);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. # */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-100 align-middle">
                          <span className="text-xs font-semibold text-slate-600">{actualIndex}</span>
                        </td>

                        {/* 2. Scheme & Location Details */}
                        <td className="py-2.5 px-3 border-r border-slate-100 align-middle">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 leading-tight">
                                {row.scheme_name || row.scheme_id}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                (#{row.scheme_id})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5 flex items-center gap-1 flex-wrap">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0 inline" />
                              <span>
                                Sensor: <strong>{row.esr_name || "Main ESR"}</strong>
                                {row.village_name && ` • Village: ${row.village_name}`}
                              </span>
                              {row.region && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span>{row.region}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Alert Value & Time */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          <div className="space-y-1 inline-flex flex-col items-center">
                            <Badge className={`text-[10px] font-bold px-2 py-0.5 ${isRestored
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : isOffline
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-rose-50 text-rose-800 border-rose-300"
                              }`}>
                              {isRestored ? (
                                <Sparkles className="w-3 h-3 mr-1 inline text-emerald-600" />
                              ) : isOffline ? (
                                <WifiOff className="w-3 h-3 mr-1 inline text-amber-600" />
                              ) : (
                                <Droplets className="w-3 h-3 mr-1 inline text-rose-600" />
                              )}
                              {row.alert_type}
                            </Badge>

                            <div className="font-mono font-bold text-xs text-rose-600">
                              {row.alert_value || (row.chlorine_value !== null && row.chlorine_value !== undefined ? `${Number(row.chlorine_value).toFixed(2)} mg/L` : '-')}
                            </div>

                            {row.flow_rate_value !== null && Number(row.flow_rate_value) > 0 && (
                              <div className="text-[10px] text-emerald-700 font-semibold">
                                Flow: {Number(row.flow_rate_value).toFixed(2)} m³/h
                              </div>
                            )}

                            {alertTimeStr && (
                              <div className="text-[10px] text-slate-500 font-normal flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{alertTimeStr}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Assigned Engineer & Contact */}
                        <td className="py-2.5 px-3 border-r border-slate-100 align-middle">
                          {owner ? (
                            <div>
                              <div className="font-bold text-xs text-slate-800 leading-tight">
                                <span className="text-slate-500 font-semibold">{owner.shortRole}</span> {owner.name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                {owner.mobile ? (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={`tel:${owner.mobile}`}
                                      className="text-xs text-[#0f4c81] font-medium hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="h-3 w-3" />
                                      <span>{owner.mobile}</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(owner.mobile!);
                                        setCopiedMobile(owner.mobile!);
                                        setTimeout(() => setCopiedMobile(null), 2000);
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                      title="Copy mobile number"
                                    >
                                      {copiedMobile === owner.mobile ? (
                                        <Check className="h-3 w-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No mobile</span>
                                )}
                                {otherContactsCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedContactsModal({
                                        schemeName: row.scheme_name || row.scheme_id,
                                        schemeId: row.scheme_id,
                                        contacts: allContacts
                                      });
                                    }}
                                    className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
                                  >
                                    +{otherContactsCount} other{otherContactsCount > 1 ? "s" : ""}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned in Directory</span>
                          )}
                        </td>

                        {/* 5. Email Dispatch */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          {(() => {
                            const isSent = Boolean(row.created_at || row.sent_date || row.ticket_id || emailRecs.length > 0);
                            const emailDate = row.created_at
                              ? new Date(row.created_at)
                              : (row.sent_date ? new Date(row.sent_date) : null);
                            const timeStr = emailDate && !isNaN(emailDate.getTime())
                              ? emailDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                              : null;
                            const emailRecipientsCount = ackInfo.recipients.filter(r => !!r.email).length || (emailRecs.length > 0 ? emailRecs.length : (ackInfo.recipients.length || 1));

                            if (isSent) {
                              return (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      <Mail className="w-2.5 h-2.5 text-blue-600" />
                                      Sent ({emailRecipientsCount})
                                    </span>
                                    {timeStr && (
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        {timeStr}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEngineers({ title: row.scheme_name || row.scheme_id, row });
                                    }}
                                    title="View Email Recipients & Delivery Logs"
                                  >
                                    &lt; View Log
                                  </button>
                                </div>
                              );
                            }

                            return <span className="text-[11px] text-slate-400 italic">Not Sent</span>;
                          })()}
                        </td>

                        {/* 6. SMS Gateway */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          {smsRecs.length > 0 ? (
                            (() => {
                              const successCount = smsRecs.filter((s: any) => s.is_success !== false).length;
                              const isFullSuccess = successCount === smsRecs.length;
                              const latestSms = smsRecs[0];
                              const smsDate = latestSms?.created_at ? new Date(latestSms.created_at) : null;
                              const timeStr = smsDate && !isNaN(smsDate.getTime())
                                ? smsDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                                : null;

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
                                        ? `Delivered (${successCount}/${smsRecs.length})`
                                        : successCount > 0
                                          ? `Partial (${successCount}/${smsRecs.length})`
                                          : `Failed (${smsRecs.length})`}
                                    </span>
                                    {timeStr && (
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        {timeStr}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSmsModal({
                                        schemeName: row.scheme_name || row.scheme_id,
                                        schemeId: row.scheme_id,
                                        dispatches: smsRecs,
                                        alertType: String(row.alert_type || "REALTIME").toUpperCase()
                                      });
                                    }}
                                  >
                                    View Log
                                  </button>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not Dispatched</span>
                          )}
                        </td>

                        {/* 7. Alert & Ack Status */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          {hasEngineers || row.is_acknowledged ? (
                            <div className="inline-flex items-center justify-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${ackInfo.isFullyAcknowledged || row.is_acknowledged
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : ackInfo.isAcknowledged
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                {ackInfo.ackCount > 0 || row.is_acknowledged ? (
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-1" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block mr-1" />
                                )}
                                {ackInfo.totalRequired > 0
                                  ? `${ackInfo.ackCount}/${ackInfo.totalRequired} Ack`
                                  : (ackInfo.isAcknowledged || row.is_acknowledged) ? 'Acknowledged' : 'Pending Action'}
                              </span>
                              <button
                                type="button"
                                className="p-0.5 text-slate-400 hover:text-[#0f4c81] cursor-pointer rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEngineers({ title: row.scheme_name || row.scheme_id, row });
                                }}
                                title="View Acknowledgement & Personnel Details"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None Assigned</span>
                          )}
                        </td>

                        {/* 8. Remarks / Action */}
                        <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                          {row.remarks ? (
                            <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200 italic leading-tight max-w-[150px] truncate mx-auto" title={row.remarks}>
                              <span className="font-semibold text-slate-600 not-italic text-[10px]">Note: </span>
                              "{row.remarks}"
                            </div>
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

          {/* Pagination */}
          {filteredRealtimeAlerts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 bg-white text-xs text-slate-600">
              <div className="font-normal text-slate-500">
                Showing <span className="font-semibold text-slate-800">{startItem}</span> – <span className="font-semibold text-slate-800">{endItem}</span> of <span className="font-semibold text-slate-800">{filteredRealtimeAlerts.length}</span> alerts
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Rows per page:</span>
                  <select
                    className="text-xs border border-slate-200 rounded py-1 px-2 outline-none focus:border-[#0f4c81] bg-white cursor-pointer font-medium text-slate-700"
                    value={realtimeRowsPerPage}
                    onChange={(e) => {
                      setRealtimeRowsPerPage(Number(e.target.value));
                      setRealtimePage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRealtimePage(p => Math.max(1, p - 1))}
                    disabled={realtimePage === 1}
                    className="h-7 px-2.5 text-xs bg-white text-slate-700 border-slate-200"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
                  </Button>
                  <span className="font-semibold text-slate-800 px-1">
                    Page {realtimePage} of {totalPages || 1}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRealtimePage(p => Math.min(totalPages, p + 1))}
                    disabled={realtimePage >= totalPages}
                    className="h-7 px-2.5 text-xs bg-white text-slate-700 border-slate-200"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDataTable = (
    rawData: AlertData[],
    type: "lpcd" | "chlorine" | "pressure" | "offline",
    isLoading: boolean
  ) => {
    const baseData = getFilteredData(rawData, type);

    // Calculations for KPIs & Explicit Unit Indications
    const unitNoun = type === "lpcd"
      ? "Villages"
      : type === "chlorine"
        ? "Chlorine Sensors"
        : type === "pressure"
          ? "Pressure Sensors"
          : "Offline Sensors";

    const firstKpiValue = type === "lpcd"
      ? baseData.reduce((acc, row) => {
        if (typeof row.village_name === 'string') {
          return acc + row.village_name.split(',').length;
        }
        return acc + 1;
      }, 0)
      : baseData.length;

    // Acknowledgement lists over all base date records
    const acknowledgedRows = baseData.filter((r) => getRowAckInfo(r).isAcknowledged);
    const pendingRows = baseData.filter((r) => !getRowAckInfo(r).isAcknowledged);
    const totalAcknowledged = acknowledgedRows.length;
    const totalPending = pendingRows.length;

    // Group unique notified engineers and their assigned alert schemes
    const engineersMap = new Map<string, {
      name: string;
      email: string | null;
      roles: Set<string>;
      schemes: {
        scheme_id: string;
        scheme_name: string;
        village_name: string | null;
        esr_name?: string | null;
        isAcknowledged: boolean;
        acknowledged_at: string | null;
      }[];
    }>();

    baseData.forEach(r => {
      const recs = getRowRecipients(r);
      recs.forEach(rec => {
        if (!isValidEngineerName(rec.name)) return;
        const key = rec.name.toLowerCase().trim();

        if (!engineersMap.has(key)) {
          engineersMap.set(key, {
            name: rec.name.trim(),
            email: rec.email || null,
            roles: new Set<string>(),
            schemes: []
          });
        }
        const eng = engineersMap.get(key)!;
        if (!eng.email && rec.email) eng.email = rec.email;
        if (rec.role) eng.roles.add(rec.role);

        const alreadyHasScheme = eng.schemes.some(s => s.scheme_id === r.scheme_id && s.village_name === r.village_name && s.esr_name === r.esr_name);
        if (!alreadyHasScheme) {
          eng.schemes.push({
            scheme_id: r.scheme_id,
            scheme_name: r.scheme_name || r.scheme_id,
            village_name: r.village_name,
            esr_name: r.esr_name,
            isAcknowledged: rec.isAcknowledged,
            acknowledged_at: rec.acknowledged_at
          });
        }
      });
    });

    const notifiedEngineersList = Array.from(engineersMap.values()).map(eng => {
      const ackCount = eng.schemes.filter(s => s.isAcknowledged).length;
      return {
        ...eng,
        rolesList: Array.from(eng.roles),
        totalAlerts: eng.schemes.length,
        ackCount,
        pendingCount: eng.schemes.length - ackCount,
        isAcknowledged: ackCount > 0,
        isFullyAcknowledged: eng.schemes.length > 0 && ackCount === eng.schemes.length
      };
    });

    const totalEngineers = notifiedEngineersList.length;

    // Count remarks added
    const totalRemarks = baseData.filter(r => parseIssues(r.remarks).length > 0).length;

    // Filter by Scheme Search & Acknowledgement status
    const displayData = baseData.filter((row) => {
      if (schemeSearch.trim()) {
        const q = schemeSearch.toLowerCase().trim();
        const matches =
          (row.scheme_name && row.scheme_name.toLowerCase().includes(q)) ||
          (row.scheme_id && row.scheme_id.toLowerCase().includes(q)) ||
          (row.village_name && row.village_name.toLowerCase().includes(q)) ||
          (row.esr_name && row.esr_name.toLowerCase().includes(q)) ||
          (row.region && row.region.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (ackStatusFilter === "acknowledged") {
        return getRowAckInfo(row).isAcknowledged;
      }
      if (ackStatusFilter === "pending") {
        return !getRowAckInfo(row).isAcknowledged;
      }
      if (villageFilter === "completed") {
        return isVillageCompleted(row.village_name, row.scheme_id, row.scheme_name);
      }
      if (villageFilter === "in_progress") {
        return !isVillageCompleted(row.village_name, row.scheme_id, row.scheme_name);
      }
      return true;
    });

    // Pagination Logic
    const startIdx = (page - 1) * rowsPerPage;
    const endIdx = page * rowsPerPage;
    const totalPages = Math.ceil(displayData.length / rowsPerPage);
    const paginatedData = displayData.slice(startIdx, endIdx);
    const startItem = displayData.length > 0 ? startIdx + 1 : 0;
    const endItem = Math.min(endIdx, displayData.length);

    return (
      <div className="space-y-3.5">
        {/* 4. Section Header */}
        <div className="bg-white border border-slate-200 rounded p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="border-l-4 border-[#0f4c81] pl-3.5 flex items-center gap-3">
            <div className="text-[#0f4c81]">
              {type === "lpcd" && <Waves className="h-6 w-6" />}
              {type === "chlorine" && <Droplets className="h-6 w-6" />}
              {type === "pressure" && <GaugeCircle className="h-6 w-6" />}
              {type === "offline" && <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
                {type === "lpcd"
                  ? "Village LPCD Alerts"
                  : type === "chlorine"
                    ? "Chlorine Sensor Alerts"
                    : type === "pressure"
                      ? "Pressure Sensor Alerts"
                      : "Offline Sensor Alerts"}
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                {type === "lpcd"
                  ? "Shows villages receiving water supply below 55 LPCD. Daily alerts dispatched to assigned Executive and Section Engineers."
                  : type === "chlorine"
                    ? "Shows chlorine sensors reporting residual chlorine outside safe potability standard (0.20 – 0.50 mg/L)."
                    : type === "pressure"
                      ? "Shows terminal pressure sensors outside required head range (0.20 – 0.70 Bar)."
                      : "Shows IoT sensors currently experiencing telemetry dropout / communication failure."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="border border-slate-200 bg-slate-50/60 px-3 py-1.5 rounded text-left min-w-[90px]">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">INDICATION</div>
              <div className="text-xs font-bold text-slate-800">
                {unitNoun}
              </div>
            </div>
            <div className="border border-slate-200 bg-slate-50/60 px-3 py-1.5 rounded text-left min-w-[120px]">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">UNIT</div>
              <div className="text-xs font-bold text-slate-800">
                {type === "lpcd" ? "Villages (< 55 LPCD)" : type === "chlorine" ? "Sensors (0.20-0.50 mg/L)" : type === "pressure" ? "Sensors (0.20-0.70 Bar)" : "Offline Sensors"}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Filter / Search Toolbar */}
        <div className="bg-white border border-slate-200 rounded p-3 flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="w-full sm:w-[280px] lg:w-[320px]">
            <label className="text-xs font-semibold text-slate-700 block mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={type === "lpcd" ? "Search by scheme name, ID, village, or region..." : "Search by scheme name, ID, sensor, or region..."}
                value={schemeSearch}
                onChange={(e) => {
                  setSchemeSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-[#0f4c81] text-slate-800 placeholder-slate-400 h-8"
              />
              {schemeSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setSchemeSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Region / Village */}
          <div className="w-full sm:w-[180px]">
            <label className="text-xs font-semibold text-slate-700 block mb-1">Region / Village</label>
            <VillageFilter
              value={villageFilter}
              onChange={(val) => {
                setVillageFilter(val);
                setPage(1);
              }}
              showLabel={false}
              triggerClassName="h-8 text-xs bg-white border-slate-200"
            />
          </div>

          {/* Date */}
          {type !== "offline" && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                value={customDate || (activeSubTab === "previous" ? yesterdayYmd : todayYmd)}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) {
                    setActiveSubTab("custom");
                  } else {
                    setActiveSubTab("current");
                  }
                  setPage(1);
                }}
                className="h-8 px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 font-medium outline-none focus:border-[#0f4c81] cursor-pointer"
              />
            </div>
          )}

          {/* Date Selector Group */}
          {type !== "offline" && (
            <div className="flex items-center rounded border border-slate-200 overflow-hidden h-8">
              <button
                type="button"
                onClick={handlePrevDay}
                className="px-2.5 h-full text-slate-600 hover:bg-slate-50 border-r border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("previous");
                  setCustomDate("");
                  setPage(1);
                }}
                className={`px-3 h-full text-xs font-medium border-r border-slate-200 transition-colors cursor-pointer ${activeSubTab === "previous" && !customDate
                  ? "bg-[#0f4c81] text-white font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                Previous Day
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab("current");
                  setCustomDate("");
                  setPage(1);
                }}
                className={`px-3 h-full text-xs font-medium border-r border-slate-200 transition-colors cursor-pointer ${activeSubTab === "current" && !customDate
                  ? "bg-[#0f4c81] text-white font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
              >
                Current Day
              </button>
              <button
                type="button"
                onClick={handleNextDay}
                className="px-2.5 h-full text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Download Excel Button */}
          <div className="ml-auto">
            <Button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="h-8 px-3.5 bg-[#107c41] hover:bg-[#0e6b37] text-white font-semibold rounded text-xs shadow-none flex items-center gap-1.5 cursor-pointer"
              title="Download Excel report containing all alert data"
            >
              {isDownloading ? (
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Alerts Excel
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* 6. Alert Summary */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                ALERT SUMMARY
              </span>
              <button
                type="button"
                onClick={() => setAckStatusFilter("all")}
                className="text-xs text-slate-500 underline hover:text-[#0f4c81] cursor-pointer"
              >
                Across {baseData.length} Schemes
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
              <span>
                Engineers Notified <strong className="text-[#0f4c81] font-bold text-sm ml-1">{totalEngineers} / {totalRosterEngineers || 81}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-[#0f4c81]">
                {totalRosterEngineers > 0 ? `${Math.round((totalEngineers / totalRosterEngineers) * 100)}%` : '99%'} Active
              </span>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setEngineersModalData({
                    title: `Notified Engineers & Assigned Personnel (${totalEngineers})`,
                    engineers: notifiedEngineersList
                  });
                  setEngineerModalSearch("");
                  setEngineerFilterTab("all");
                }}
                className="text-[#0f4c81] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                View Engineers →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-3.5">
            {/* Card 1: Total Triggered */}
            <div
              onClick={() => setAckStatusFilter("all")}
              className="bg-[#fff5f5] border border-red-200 rounded p-3.5 flex items-center gap-3.5 cursor-pointer hover:border-red-300 transition-colors"
              title={`Click to view all ${unitNoun}`}
            >
              <AlertTriangle className="h-8 w-8 text-red-600 shrink-0" />
              <div>
                <div className="text-xs font-medium text-slate-700">
                  {type === "lpcd"
                    ? "Villages < 55 LPCD"
                    : type === "chlorine"
                      ? "Chlorine Alerts"
                      : type === "pressure"
                        ? "Pressure Alerts"
                        : "Offline Sensors"}
                </div>
                <div className="text-2xl font-black text-red-600 font-mono leading-tight mt-0.5">
                  {firstKpiValue}
                </div>
                <div className="text-[11px] text-red-700 font-medium">
                  Total Triggered
                </div>
              </div>
            </div>

            {/* Card 2: Acknowledged */}
            <div
              onClick={() => {
                setAckModalData({
                  title: `Acknowledged Alerts (${totalAcknowledged} ${unitNoun})`,
                  type: "acknowledged",
                  rows: acknowledgedRows
                });
                setModalSearch("");
              }}
              className="bg-[#f0fdf4] border border-emerald-200 rounded p-3.5 flex items-center gap-3.5 cursor-pointer hover:border-emerald-300 transition-colors"
              title={`Click to view list of acknowledged ${unitNoun}`}
            >
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-medium text-slate-700">
                  Acknowledged
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono leading-tight mt-0.5">
                  {totalAcknowledged}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {Math.round((totalAcknowledged / (baseData.length || 1)) * 100)}% of alerts confirmed
                </div>
              </div>
            </div>

            {/* Card 3: Pending Action */}
            <div
              onClick={() => {
                setAckModalData({
                  title: `Pending Acknowledgement Alerts (${totalPending} ${unitNoun})`,
                  type: "pending",
                  rows: pendingRows
                });
                setModalSearch("");
              }}
              className="bg-[#fffbeb] border border-amber-200 rounded p-3.5 flex items-center gap-3.5 cursor-pointer hover:border-amber-300 transition-colors"
              title={`Click to view list of pending acknowledgement ${unitNoun}`}
            >
              <Clock className="h-8 w-8 text-amber-600 shrink-0" />
              <div>
                <div className="text-xs font-medium text-slate-700">
                  Pending Action
                </div>
                <div className="text-2xl font-black text-amber-600 font-mono leading-tight mt-0.5">
                  {totalPending}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Awaiting field response
                </div>
              </div>
            </div>

            {/* Card 4: Action Reports */}
            <div
              className="bg-[#f0f9ff] border border-sky-200 rounded p-3.5 flex items-center gap-3.5 hover:border-sky-300 transition-colors"
            >
              <FileText className="h-8 w-8 text-sky-600 shrink-0" />
              <div>
                <div className="text-xs font-medium text-slate-700">
                  Action Reports
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono leading-tight mt-0.5">
                  {totalRemarks}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Field inspections recorded
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Alert Details Table */}
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                ALERT DETAILS
              </span>
              <span className="text-xs font-normal text-slate-500">
                ({displayData.length} {unitNoun})
              </span>
            </div>
            {(ackStatusFilter !== "all" || schemeSearch || villageFilter !== "all") && (
              <button
                onClick={() => {
                  setAckStatusFilter("all");
                  setVillageFilter("all");
                  setSchemeSearch("");
                }}
                className="text-xs text-[#0f4c81] hover:underline font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-16 text-center text-slate-500 font-medium text-xs">
                Loading alerts data...
              </div>
            ) : displayData.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-medium">
                {baseData.length === 0
                  ? "All parameters are within normal thresholds. No active alerts reported."
                  : "No schemes match your current search or status filter."}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#e8f1f8] text-[#0f4c81] border-b border-slate-200">
                    <th className="py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 w-12">
                      #
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-left border-r border-slate-200/80 min-w-[240px]">
                      Scheme & Location Details
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[130px]">
                      Alert Value & Date
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-left border-r border-slate-200/80 min-w-[200px]">
                      Assigned Engineer & Contact
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[150px]">
                      Email Dispatch
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[150px]">
                      SMS Gateway
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center border-r border-slate-200/80 min-w-[140px]">
                      Alert & Ack Status
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-center min-w-[120px]">
                      Remarks / Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedData.map((row, idx) => {
                    const actualIndex = startIdx + idx + 1;
                    const ackInfo = getRowAckInfo(row);
                    const hasEngineers = ackInfo.recipients.length > 0;
                    const owner = getSchemeOwner(row);
                    const allContacts = getAllSchemeContacts(row);
                    const otherContactsCount = Math.max(0, allContacts.length - 1);

                    return (
                      <tr
                        key={`${row.scheme_id}-${idx}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* 1. # */}
                        <td className="py-2.5 px-2 text-center border-r border-slate-100 align-middle">
                          <span className="text-xs font-semibold text-slate-600">{actualIndex}</span>
                        </td>

                        {/* 2. Scheme & Location Details */}
                        <td className="py-2.5 px-3 border-r border-slate-100 align-middle">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 leading-tight">
                                {row.scheme_name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                (#{row.scheme_id})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5 flex items-center gap-1 flex-wrap">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0 inline" />
                              <span>
                                {type === "lpcd"
                                  ? `Village: ${row.village_name || row.scheme_name}`
                                  : type === "chlorine"
                                    ? `Sensor: ${row.esr_name || row.village_name || "Main Line Sensor"}`
                                    : type === "pressure"
                                      ? `Sensor: ${row.esr_name || row.village_name || "Terminal Point"}`
                                      : `Sensor: ${row.esr_name || row.village_name || "Telemetry Node"}`}
                              </span>
                              {row.region && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span>{row.region}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Alert Value & Date */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          <div>
                            <div className="text-xs font-bold text-red-600 font-mono">
                              {row.current_value ?? row.alert_value ?? row.historical_value ?? row.previous_value ?? "0"}{" "}
                              {type === "lpcd" ? "LPCD" : type === "chlorine" ? "mg/L" : type === "pressure" ? "Bar" : "Offline"}
                            </div>
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5 flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{formatAlertDate(row)}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Assigned Engineer & Contact */}
                        <td className="py-2.5 px-3 border-r border-slate-100 align-middle">
                          {owner ? (
                            <div>
                              <div className="font-bold text-xs text-slate-800 leading-tight">
                                <span className="text-slate-500 font-semibold">{owner.shortRole}</span> {owner.name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                {owner.mobile ? (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={`tel:${owner.mobile}`}
                                      className="text-xs text-[#0f4c81] font-medium hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="h-3 w-3" />
                                      <span>{owner.mobile}</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(owner.mobile!);
                                        setCopiedMobile(owner.mobile!);
                                        setTimeout(() => setCopiedMobile(null), 2000);
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                      title="Copy mobile number"
                                    >
                                      {copiedMobile === owner.mobile ? (
                                        <Check className="h-3 w-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No mobile</span>
                                )}
                                {otherContactsCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedContactsModal({
                                        schemeName: row.scheme_name,
                                        schemeId: row.scheme_id,
                                        contacts: allContacts
                                      });
                                    }}
                                    className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
                                  >
                                    +{otherContactsCount} other{otherContactsCount > 1 ? "s" : ""}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned in Directory</span>
                          )}
                        </td>

                        {/* 5. Email Dispatch */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          {(() => {
                            const isSent = Boolean(row.created_at || row.sent_date || row.ticket_id);
                            const emailDate = row.created_at
                              ? new Date(row.created_at)
                              : (row.sent_date ? new Date(row.sent_date) : null);
                            const timeStr = emailDate && !isNaN(emailDate.getTime())
                              ? emailDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                              : null;
                            const emailRecipientsCount = ackInfo.recipients.filter(r => !!r.email).length || ackInfo.recipients.length;

                            if (isSent) {
                              return (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      <Mail className="w-2.5 h-2.5 text-blue-600" />
                                      Sent ({emailRecipientsCount})
                                    </span>
                                    {timeStr && (
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        {timeStr}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEngineers({ title: row.scheme_name, row });
                                    }}
                                    title="View Email Recipients & Delivery Logs"
                                  >
                                    &lt; View Log
                                  </button>
                                </div>
                              );
                            }

                            return <span className="text-[11px] text-slate-400 italic">Not Sent</span>;
                          })()}
                        </td>

                        {/* 6. SMS Gateway */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          {row.sms_dispatches && row.sms_dispatches.length > 0 ? (
                            (() => {
                              const smsList = row.sms_dispatches!;
                              const successCount = smsList.filter(s => s.is_success).length;
                              const isFullSuccess = successCount === smsList.length;
                              const latestSms = smsList[0];
                              const smsDate = latestSms?.created_at ? new Date(latestSms.created_at) : null;
                              const timeStr = smsDate && !isNaN(smsDate.getTime())
                                ? smsDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
                                : null;

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
                                        ? `Delivered (${successCount}/${smsList.length})`
                                        : successCount > 0
                                          ? `Partial (${successCount}/${smsList.length})`
                                          : `Failed (${smsList.length})`}
                                    </span>
                                    {timeStr && (
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        {timeStr}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSmsModal({
                                        schemeName: row.scheme_name,
                                        schemeId: row.scheme_id,
                                        dispatches: smsList,
                                        alertType: type.toUpperCase()
                                      });
                                    }}
                                  >
                                    View Log
                                  </button>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not Dispatched</span>
                          )}
                        </td>

                        {/* 7. Alert & Ack Status - NO VIOLATED TAG! */}
                        <td className="py-2.5 px-3 text-center border-r border-slate-100 align-middle whitespace-nowrap">
                          {hasEngineers ? (
                            <div className="inline-flex items-center justify-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${ackInfo.isFullyAcknowledged
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : ackInfo.isAcknowledged
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                {ackInfo.ackCount > 0 ? (
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-1" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block mr-1" />
                                )}
                                {ackInfo.totalRequired > 0
                                  ? `${ackInfo.ackCount}/${ackInfo.totalRequired} Ack`
                                  : ackInfo.isAcknowledged ? 'Acknowledged' : 'Pending'}
                              </span>
                              <button
                                type="button"
                                className="p-0.5 text-slate-400 hover:text-[#0f4c81] cursor-pointer rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEngineers({ title: row.scheme_name, row });
                                }}
                                title="View Acknowledgement & Personnel Details"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None Assigned</span>
                          )}
                        </td>

                        {/* 8. Remarks / Action */}
                        <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const issues = parseIssues(row.remarks);
                              setSelectedRemarkDetails({ issues, title: `Remarks for ${row.esr_name || row.village_name || row.scheme_name}` });
                            }}
                            className="text-xs font-semibold text-[#0f4c81] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                          >
                            View Issue →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 8. Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 bg-white text-xs text-slate-600">
            <div className="font-normal text-slate-500">
              Showing <span className="font-semibold text-slate-800">{startItem}</span> – <span className="font-semibold text-slate-800">{endItem}</span> of <span className="font-semibold text-slate-800">{displayData.length}</span> alerts
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  className="text-xs border border-slate-200 rounded py-1 px-2 outline-none focus:border-[#0f4c81] bg-white cursor-pointer font-medium text-slate-700"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer font-medium"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  &lt; Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && page > 3) {
                    p = page - 2 + i;
                    if (p > totalPages) return null;
                  }

                  return (
                    <button
                      key={p}
                      type="button"
                      className={`h-7 w-7 text-xs font-semibold rounded flex items-center justify-center transition-colors cursor-pointer ${page === p
                        ? "bg-[#0f4c81] text-white"
                        : "text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}

                {totalPages > 5 && page < totalPages - 2 && (
                  <>
                    <span className="px-1 text-slate-400">...</span>
                    <button
                      type="button"
                      className="h-7 w-7 text-xs text-slate-700 border border-slate-200 bg-white rounded flex items-center justify-center hover:bg-slate-50 cursor-pointer"
                      onClick={() => setPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="px-2 py-1 text-xs text-[#0f4c81] hover:underline font-semibold disabled:opacity-40 cursor-pointer"
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter rows inside the Acknowledged / Pending Modal dialog
  const modalFilteredRows = useMemo(() => {
    if (!ackModalData) return [];
    if (!modalSearch.trim()) return ackModalData.rows;
    const q = modalSearch.toLowerCase().trim();
    return ackModalData.rows.filter(row =>
      (row.scheme_name && row.scheme_name.toLowerCase().includes(q)) ||
      (row.scheme_id && row.scheme_id.toLowerCase().includes(q)) ||
      (row.village_name && row.village_name.toLowerCase().includes(q)) ||
      (row.esr_name && row.esr_name.toLowerCase().includes(q)) ||
      (row.region && row.region.toLowerCase().includes(q))
    );
  }, [ackModalData, modalSearch]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f4f6f9]">
        <div className="w-full px-4 sm:px-6 py-4 space-y-3.5">

          {/* 1. Portal Information Header */}
          <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded bg-white border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
                <img
                  src="/images/jal-jeevan-mission-logo.png"
                  alt="Jal Jeevan Mission"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  Jal Jeevan Mission
                </h1>
                <div className="text-base md:text-lg font-bold text-[#0f4c81] mt-1 leading-snug">
                  Alert Dispatch & Escalation Portal
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Water Supply & Sanitation Department, Government of Maharashtra
                </p>
              </div>
            </div>

            {/* Official Status Badges on Right */}
            <div className="flex items-center gap-6 shrink-0 self-start md:self-center">
              {/* Engineers */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Engineers</div>
                  <div className="text-sm font-bold text-slate-900 leading-tight">
                    {totalRosterEngineers > 0 ? `${totalRosterEngineers} Total` : "81 Total"}
                  </div>
                  {/* <a
                    href="/engineers"
                    className="text-xs text-[#0f4c81] font-semibold hover:underline flex items-center gap-0.5 mt-0.5"
                  >
                    View Directory →
                  </a> */}
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 hidden sm:block" />

              {/* DLT SMS Gateway */}
              {/* <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 relative">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    DLT SMS GATEWAY
                  </div>
                  <div className="text-sm font-bold text-emerald-700 leading-tight mt-0.5">
                    Active Gateway
                  </div>
                </div>
              </div> */}

              <div className="h-10 w-px bg-slate-200 hidden sm:block" />

              {/* Last Updated */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Last Updated</div>
                  <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
                    {now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Alert Category Tabs */}
          <div className="bg-white border border-slate-200 rounded px-4 py-0 flex items-center overflow-x-auto shadow-2xs">
            <span className="text-xs font-bold text-slate-500 tracking-wider uppercase pr-6 whitespace-nowrap shrink-0">
              ALERT CATEGORY
            </span>
            <div className="flex items-center gap-1 overflow-x-auto">
              {/* Tab 1: LPCD */}
              <button
                type="button"
                onClick={() => { setActiveTab("lpcd"); setPage(1); }}
                className={`py-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === "lpcd"
                  ? "border-[#0f4c81] text-[#0f4c81] font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Waves className="h-4 w-4 text-[#0f4c81]" />
                <span>Village LPCD Alerts (Daily)</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "lpcd" ? "bg-blue-100 text-[#0f4c81]" : "bg-slate-100 text-slate-600"
                  }`}>
                  {lpcdData.length}
                </span>
              </button>

              {/* Tab 2: Chlorine */}
              <button
                type="button"
                onClick={() => { setActiveTab("chlorine"); setPage(1); }}
                className={`py-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === "chlorine"
                  ? "border-[#0f4c81] text-[#0f4c81] font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Droplets className="h-4 w-4 text-emerald-600" />
                <span>Chlorine Sensor Alerts (Daily)</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "chlorine" ? "bg-emerald-100 text-emerald-800" : "bg-emerald-50 text-emerald-700"
                  }`}>
                  {chlorineData.length}
                </span>
              </button>

              {/* Tab 3: Pressure */}
              <button
                type="button"
                onClick={() => { setActiveTab("pressure"); setPage(1); }}
                className={`py-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === "pressure"
                  ? "border-[#0f4c81] text-[#0f4c81] font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
              >
                <GaugeCircle className="h-4 w-4 text-amber-600" />
                <span>Pressure Sensor Alerts (Daily)</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "pressure" ? "bg-amber-100 text-amber-800" : "bg-amber-50 text-amber-700"
                  }`}>
                  {pressureData.length}
                </span>
              </button>

              {/* Tab 4: Offline */}
              <button
                type="button"
                onClick={() => { setActiveTab("offline"); setPage(1); }}
                className={`py-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === "offline"
                  ? "border-[#0f4c81] text-[#0f4c81] font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
              >
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Offline Sensor Alerts (Daily)</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "offline" ? "bg-rose-100 text-rose-800" : "bg-rose-50 text-rose-700"
                  }`}>
                  {offlineData.length}
                </span>
              </button>

              {/* Tab 5: ⚡ Real-Time Critical Alerts (Placed at the end) */}
              <button
                type="button"
                onClick={() => { setActiveTab("realtime"); setRealtimePage(1); }}
                className={`py-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === "realtime"
                  ? "border-rose-600 text-rose-700 font-bold bg-rose-50/60"
                  : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
              >
                <div className="relative flex items-center">
                  <span className="flex h-2 w-2 relative mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <Zap className="h-4 w-4 text-rose-600" />
                </div>
                <span>⚡ Real-Time Critical Alerts</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === "realtime" ? "bg-rose-100 text-rose-800" : "bg-rose-50 text-rose-700"
                  }`}>
                  {realtimeProgress?.alerts?.length ?? 0}
                </span>
              </button>
            </div>
          </div>

          {/* 3. Section Render */}
          {activeTab === "realtime" && renderRealtimeDataTable()}
          {activeTab === "lpcd" && renderDataTable(lpcdData, "lpcd", isLoadingLpcd)}
          {activeTab === "chlorine" && renderDataTable(chlorineData, "chlorine", isLoadingChlorine)}
          {activeTab === "pressure" && renderDataTable(pressureData, "pressure", isLoadingPressure)}
          {activeTab === "offline" && renderDataTable(offlineData, "offline", isLoadingOffline)}

          {/* On-Click Modal Dialog for Acknowledged / Pending List */}
          {ackModalData && (
            <Dialog open={!!ackModalData} onOpenChange={(open) => !open && setAckModalData(null)}>
              <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl">
                {/* Header */}
                <div className={`p-5 border-b text-white flex items-center justify-between ${ackModalData.type === "acknowledged"
                  ? "bg-emerald-700 border-emerald-800"
                  : "bg-amber-600 border-amber-700"
                  }`}>
                  <div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                      {ackModalData.type === "acknowledged" ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : (
                        <Clock className="h-5 w-5 text-white" />
                      )}
                      {ackModalData.title}
                    </DialogTitle>
                    <DialogDescription className="text-white/90 text-xs mt-1">
                      {ackModalData.type === "acknowledged"
                        ? "Schemes where alert notifications have been confirmed and acknowledged by engineers."
                        : "Schemes awaiting confirmation and acknowledgement from assigned engineers."}
                    </DialogDescription>
                  </div>
                </div>

                {/* Sub-search bar inside modal */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Search ${ackModalData.type} ${activeTab === "lpcd" ? "villages" : "sensors"}...`}
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {modalFilteredRows.length} of {ackModalData.rows.length} {activeTab === "lpcd" ? "villages / schemes" : "sensors / schemes"}
                  </span>
                </div>

                {/* List Table */}
                <div className="overflow-y-auto flex-1 p-4">
                  {modalFilteredRows.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs font-medium">
                      No matching records found.
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center w-10">#</th>
                          <th className="p-2.5">Scheme Details</th>
                          <th className="p-2.5 text-center">
                            {activeTab === "lpcd" ? "Village Name" : "Sensor / ESR Location"}
                          </th>
                          <th className="p-2.5 text-center">
                            {activeTab === "lpcd" ? "Alert LPCD (<55)" : activeTab === "chlorine" ? "Chlorine (mg/L)" : activeTab === "pressure" ? "Pressure (Bar)" : "Offline Sensor"}
                          </th>
                          <th className="p-2.5">
                            {ackModalData.type === "acknowledged" ? "Acknowledged By" : "Assigned Engineers"}
                          </th>
                          <th className="p-2.5 text-right">
                            {ackModalData.type === "acknowledged" ? "Acknowledged At" : "Status"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {modalFilteredRows.map((row, idx) => {
                          const ackInfo = getRowAckInfo(row);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-2.5 text-center text-slate-500 font-medium">{idx + 1}</td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900">{row.scheme_name}</div>
                                <div className="text-[11px] text-slate-500">ID: {row.scheme_id} • {row.region}</div>
                              </td>
                              <td className="p-2.5 text-center text-slate-700 font-medium">
                                {activeTab === "lpcd" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700">
                                    🏘️ {row.village_name || row.scheme_name}
                                  </span>
                                ) : activeTab === "chlorine" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                                    🧪 {row.esr_name || row.village_name || "-"}
                                  </span>
                                ) : activeTab === "pressure" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700">
                                    ⏱️ {row.esr_name || row.village_name || "-"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700">
                                    📡 {row.esr_name || row.village_name || "-"}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-bold text-rose-600">
                                {row.current_value || row.historical_value || "-"}
                              </td>
                              <td className="p-2.5">
                                {ackModalData.type === "acknowledged" ? (
                                  ackInfo.acksList.length > 0 ? (
                                    ackInfo.acksList.map((a, i) => (
                                      <div key={i} className="mb-1 last:mb-0">
                                        <div className="font-semibold text-slate-800">{a.name}</div>
                                        <div className="text-[10px] text-slate-500">{a.email}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <div>
                                      <div className="font-semibold text-slate-800">
                                        {row.acknowledged_by || row.ee_civil_name || (row.email_recipients && row.email_recipients[0]?.name) || "Assigned Engineer"}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {row.engineer_email || row.ee_civil_email || (row.email_recipients && row.email_recipients[0]?.email) || ""}
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div className="space-y-1">
                                    {getRowRecipients(row).map((rec, rIdx) => (
                                      <div key={rIdx} className="text-[11px] text-slate-700 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="font-semibold text-slate-900 truncate">{rec.name}</span>
                                          <span className="text-[10px] text-slate-500 shrink-0">({rec.role})</span>
                                        </div>
                                        {rec.isAcknowledged ? (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                                            ✓ Ack
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                                            Pending
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                    {getRowRecipients(row).length === 0 && (
                                      <span className="text-slate-400 italic text-xs">No engineer assigned</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-medium text-slate-600 whitespace-nowrap">
                                {ackModalData.type === "acknowledged" ? (
                                  (ackInfo.acksList[0]?.acknowledged_at || row.acknowledged_at) ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      {new Date(ackInfo.acksList[0]?.acknowledged_at || row.acknowledged_at).toLocaleString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      Acknowledged
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                    <Clock className="h-3 w-3" /> Pending Ack
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAckStatusFilter(ackModalData.type);
                      setAckModalData(null);
                    }}
                    className={`text-xs font-semibold ${ackModalData.type === "acknowledged"
                      ? "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      : "text-amber-700 border-amber-300 hover:bg-amber-50"
                      }`}
                  >
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    Filter Page Table to {ackModalData.type === "acknowledged" ? "Acknowledged" : "Pending"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setAckModalData(null)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4"
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Remark Details Dialog */}
          {selectedRemarkDetails && (
            <Dialog
              open={!!selectedRemarkDetails}
              onOpenChange={(open) => !open && setSelectedRemarkDetails(null)}
            >
              <DialogContent className="max-w-2xl bg-white border-none shadow-2xl p-0 overflow-hidden">
                {(() => {
                  const hasActive = selectedRemarkDetails.issues.some((i: any) => i.status === 'Active');
                  const headerBg = hasActive ? "bg-rose-700" : "bg-[#0f4c81]";
                  return (
                    <>
                      <div className={`p-5 pb-4 border-b border-white/10 flex justify-between items-center ${headerBg} text-white`}>
                        <div className="flex-1 pr-6">
                          <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                            <AlertCircle className="h-6 w-6 text-white" />
                            <span className="tracking-tight text-white">Issue Details & Remarks History</span>
                          </DialogTitle>
                          <DialogDescription className="text-white/90 mt-1.5 font-medium flex items-center gap-2 text-xs">
                            <MapPin className="h-4 w-4 text-white/70" />
                            <span>{selectedRemarkDetails.title}</span>
                          </DialogDescription>
                        </div>
                      </div>

                      <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50">
                        {selectedRemarkDetails.issues.length === 0 ? (
                          <div className="text-center p-8 text-slate-500 border-2 border-dashed rounded-lg border-slate-200 font-medium">
                            No issues or remarks have been reported for this scheme yet.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedRemarkDetails.issues.map((issue: any, index: number) => (
                              <div
                                key={index}
                                className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 ${issue.status === 'Resolved'
                                  ? 'border-l-4 border-l-emerald-500'
                                  : 'border-l-4 border-l-red-500'
                                  }`}
                              >
                                <div className="flex justify-between items-start mb-3 gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
                                        {issue.problem_level ? `${issue.problem_level} Level`.toUpperCase() : (issue.category || "General")}
                                      </span>
                                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${issue.status === 'Resolved'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {issue.status || 'Active'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                    <div className="text-sm font-bold text-slate-900">
                                      {issue.creator_name || issue.reported_by || "Field Engineer"}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap font-medium">
                                      {issue.created_at ? new Date(issue.created_at).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric',
                                        hour: 'numeric', minute: '2-digit', hour12: true
                                      }) : "N/A"}
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                                    {issue.reason || issue.issue_description}
                                  </p>
                                  {issue.remarks && (
                                    <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-200">
                                      <span className="font-bold text-slate-800">Additional Remarks:</span> {issue.remarks}
                                    </p>
                                  )}
                                  {issue.status === 'Resolved' && (
                                    <div className="text-sm text-emerald-700 mt-3 pt-3 border-t border-emerald-100/50 bg-emerald-50/50 -mx-3.5 -mb-3.5 p-3.5 rounded-b-lg">
                                      <span className="font-bold text-emerald-900">Resolution Remark:</span> {issue.resolution_remark || 'Resolved'}
                                      {issue.resolved_at && (
                                        <span className="block text-[10px] text-emerald-600 font-semibold mt-1.5 uppercase tracking-wider">
                                          Resolved on: {new Date(issue.resolved_at).toLocaleString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                            hour: 'numeric', minute: '2-digit', hour12: true
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>
          )}

          {/* Engineers Details Dialog */}
          {selectedEngineers && (
            <Dialog open={!!selectedEngineers} onOpenChange={(open) => !open && setSelectedEngineers(null)}>
              <DialogContent className="max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
                <DialogHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      Email Alert Dispatch Logs & Acknowledgement
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-slate-600 font-medium text-xs mt-1">
                    Scheme: <span className="font-semibold text-slate-800">{selectedEngineers.title}</span>
                    {selectedEngineers.row.village_name && (
                      <span className="text-slate-400 ml-1.5">• Village: {selectedEngineers.row.village_name}</span>
                    )}
                    {selectedEngineers.row.ticket_id && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-mono font-bold text-blue-700 border border-blue-200">
                        Ticket: {selectedEngineers.row.ticket_id}
                      </span>
                    )}
                  </DialogDescription>
                  {(selectedEngineers.row.created_at || selectedEngineers.row.sent_date) && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Mail className="h-3 w-3 text-blue-600" />
                        Dispatched
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {new Date(selectedEngineers.row.created_at || selectedEngineers.row.sent_date!).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  )}
                </DialogHeader>

                {(() => {
                  const ackInfo = getRowAckInfo(selectedEngineers.row);
                  const recipients = ackInfo.recipients;

                  const getRoleBadgeStyle = (role: string) => {
                    if (role.includes("Chief")) return "bg-rose-50 text-rose-700 border-rose-200";
                    if (role.includes("Superintending") || role.includes("SE")) return "bg-purple-50 text-purple-700 border-purple-200";
                    if (role.includes("Executive") || role.includes("EE")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
                    if (role.includes("Civil")) return "bg-sky-50 text-sky-700 border-sky-200";
                    if (role.includes("Mech")) return "bg-blue-50 text-blue-700 border-blue-200";
                    return "bg-teal-50 text-teal-700 border-teal-200";
                  };

                  return (
                    <div className="flex flex-col space-y-4 py-2">
                      {/* Summary Badges Bar */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-semibold text-slate-500">Recipients</span>
                          <span className="text-base font-bold text-slate-800">{recipients.length}</span>
                        </div>
                        <div className="flex flex-col items-center border-x border-slate-200">
                          <span className="text-[11px] font-semibold text-emerald-600">Acknowledged</span>
                          <span className="text-base font-bold text-emerald-700">{ackInfo.ackCount}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-semibold text-amber-600">Pending</span>
                          <span className="text-base font-bold text-amber-700">{Math.max(0, recipients.length - ackInfo.ackCount)}</span>
                        </div>
                      </div>

                      {/* Recipient Cards List */}
                      <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                        {recipients.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-sm">
                            No assigned personnel found for this scheme.
                          </div>
                        ) : (
                          recipients.map((rec, idx) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/70 transition-colors shadow-sm"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
                                  {getInitials(rec.name || rec.email || "NA")}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-bold text-slate-900 truncate">
                                      {rec.name}
                                    </span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeStyle(rec.role)}`}>
                                      {rec.role}
                                    </span>
                                  </div>
                                  {rec.email ? (
                                    <a
                                      href={`mailto:${rec.email}`}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 mt-1 truncate"
                                    >
                                      <Mail className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{rec.email}</span>
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400 mt-1 italic">No email address on record</span>
                                  )}
                                  {rec.mobile && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <a
                                        href={`tel:${rec.mobile}`}
                                        className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1"
                                      >
                                        <Phone className="h-3 w-3 text-indigo-600 shrink-0" />
                                        <span>{rec.mobile}</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end shrink-0 pt-0.5">
                                {rec.isAcknowledged ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      Acknowledged
                                    </span>
                                    {rec.acknowledged_at && (
                                      <span className="text-[10px] font-medium text-slate-500 mt-1">
                                        {new Date(rec.acknowledged_at).toLocaleString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>
          )}

          {/* SMS Dispatch Details Dialog */}
          {selectedSmsModal && (
            <Dialog open={!!selectedSmsModal} onOpenChange={(open) => !open && setSelectedSmsModal(null)}>
              <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden">
                <div className="p-5 bg-[#0f4c81] text-white flex items-center justify-between border-b border-white/10">
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                      <MessageSquare className="h-5 w-5 text-white" />
                      SMS Dispatch Logs & Delivery Status
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 text-xs mt-1">
                      Scheme: <span className="font-semibold text-white">{selectedSmsModal.schemeName}</span> (ID: {selectedSmsModal.schemeId}) • {selectedSmsModal.alertType} Alert
                    </DialogDescription>
                  </div>
                </div>

                <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4 bg-slate-50/50">
                  {/* Dispatched DLT Message Content Card */}
                  {selectedSmsModal.dispatches.length > 0 && selectedSmsModal.dispatches[0].message_text && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          DLT Approved SMS Content
                        </span>
                        {selectedSmsModal.dispatches[0].template_name && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {selectedSmsModal.dispatches[0].template_name}
                          </span>
                        )}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-slate-800 leading-relaxed font-sans">
                        {selectedSmsModal.dispatches[0].message_text}
                      </div>
                      {selectedSmsModal.dispatches[0].template_id && (
                        <div className="mt-2 text-[10px] text-slate-400 font-mono">
                          DLT Template ID: {selectedSmsModal.dispatches[0].template_id}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recipients Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Dispatched Recipients ({selectedSmsModal.dispatches.length})
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        {selectedSmsModal.dispatches.filter(s => s.is_success).length} Delivered
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {selectedSmsModal.dispatches.map((sms, sIdx) => (
                        <div key={sms.id || sIdx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {sms.engineer_name || "Assigned Engineer"}
                            </div>
                            {sms.engineer_email && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {sms.engineer_email}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${sms.mobile}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{sms.mobile}</span>
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${sms.is_success
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                              {sms.is_success ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  Delivered
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                  Failed {sms.gateway_status ? `(${sms.gateway_status})` : ''}
                                </>
                              )}
                            </span>
                            {sms.created_at && (
                              <span className="text-[10px] text-slate-400 font-medium mt-1">
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
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setSelectedSmsModal(null)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4"
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Scheme All Assigned Contacts Modal */}
          {selectedContactsModal && (
            <Dialog open={!!selectedContactsModal} onOpenChange={(open) => !open && setSelectedContactsModal(null)}>
              <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden">
                <div className="p-5 bg-[#0f4c81] text-white border-b border-white/10">
                  <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Phone className="h-4 w-4 text-white" />
                    Scheme Engineers & Phone Numbers
                  </DialogTitle>
                  <DialogDescription className="text-blue-100 text-xs mt-1">
                    {selectedContactsModal.schemeName} ({selectedContactsModal.schemeId})
                  </DialogDescription>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                  {selectedContactsModal.contacts.map((c, cIdx) => (
                    <div key={cIdx} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                          {c.role}
                        </span>
                        <div className="text-xs font-bold text-slate-900 mt-1">{c.name}</div>
                        {c.email && <div className="text-[11px] text-slate-500 truncate">{c.email}</div>}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 pt-1">
                        {c.mobile ? (
                          <>
                            <a
                              href={`tel:${c.mobile}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                            >
                              <Phone className="h-3 w-3 text-indigo-600" />
                              <span>{c.mobile}</span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(c.mobile!);
                                setCopiedMobile(c.mobile!);
                                setTimeout(() => setCopiedMobile(null), 2000);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                              title="Copy phone number"
                            >
                              {copiedMobile === c.mobile ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No mobile</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setSelectedContactsModal(null)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4"
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Full Notified Engineers List Dialog (when clicking Card 4: Engineers / Assigned personnel) */}
          {engineersModalData && (
            <Dialog
              open={!!engineersModalData}
              onOpenChange={(open) => !open && setEngineersModalData(null)}
            >
              <DialogContent className="max-w-3xl bg-white border border-slate-200 shadow-2xl p-0 overflow-hidden rounded-2xl">
                <DialogHeader className="p-5 pb-4 border-b border-white/10 bg-[#0f4c81] text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2.5 text-white">
                        <Users className="h-5 w-5 text-blue-200 shrink-0" />
                        <span>{engineersModalData.title}</span>
                      </DialogTitle>
                      <DialogDescription className="text-blue-100 text-xs mt-1">
                        Engineers & supervisors notified via email alerts for active {activeTab === "lpcd" ? "Village LPCD" : activeTab === "chlorine" ? "Chlorine Sensor" : activeTab === "pressure" ? "Pressure Sensor" : "Offline Sensor"} alerts ({engineersModalData.engineers.length} notified / {totalRosterEngineers > 0 ? totalRosterEngineers : 'all'} total in Engineers Directory).
                      </DialogDescription>
                    </div>
                  </div>

                  {/* Summary Metric Pills inside Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/20 text-center">
                    <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                      <div className="text-[10px] font-medium text-indigo-200 uppercase tracking-wider">Notified in Alerts</div>
                      <div className="text-base font-extrabold text-white">{engineersModalData.engineers.length}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                      <div className="text-[10px] font-medium text-blue-200 uppercase tracking-wider">Total in Roster</div>
                      <div className="text-base font-extrabold text-white">
                        {totalRosterEngineers > 0 ? totalRosterEngineers : '—'}
                      </div>
                      <div className="text-[9px] text-blue-200/80 truncate">Registered Personnel</div>
                    </div>
                    <div className="bg-emerald-500/20 border border-emerald-300/30 rounded-lg p-2 backdrop-blur-sm">
                      <div className="text-[10px] font-medium text-emerald-200 uppercase tracking-wider">Fully Acknowledged</div>
                      <div className="text-base font-extrabold text-emerald-100">
                        {engineersModalData.engineers.filter(e => e.isFullyAcknowledged).length}
                      </div>
                    </div>
                    <div className="bg-amber-500/20 border border-amber-300/30 rounded-lg p-2 backdrop-blur-sm">
                      <div className="text-[10px] font-medium text-amber-200 uppercase tracking-wider">Pending Action</div>
                      <div className="text-base font-extrabold text-amber-100">
                        {engineersModalData.engineers.filter(e => !e.isFullyAcknowledged).length}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* Filter and Search Bar */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, role, or scheme..."
                      value={engineerModalSearch}
                      onChange={(e) => setEngineerModalSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
                    />
                    {engineerModalSearch && (
                      <button
                        onClick={() => setEngineerModalSearch("")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 shrink-0 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setEngineerFilterTab("all")}
                      className={`px-2.5 py-1 rounded-md transition-colors ${engineerFilterTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                      All ({engineersModalData.engineers.length})
                    </button>
                    <button
                      onClick={() => setEngineerFilterTab("acknowledged")}
                      className={`px-2.5 py-1 rounded-md transition-colors ${engineerFilterTab === "acknowledged" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-emerald-700"
                        }`}
                    >
                      Ack ({engineersModalData.engineers.filter(e => e.isAcknowledged).length})
                    </button>
                    <button
                      onClick={() => setEngineerFilterTab("pending")}
                      className={`px-2.5 py-1 rounded-md transition-colors ${engineerFilterTab === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-amber-700"
                        }`}
                    >
                      Pending ({engineersModalData.engineers.filter(e => e.pendingCount > 0).length})
                    </button>
                  </div>
                </div>

                {/* Engineers List */}
                <div className="p-4 overflow-y-auto max-h-[58vh] space-y-2.5 bg-slate-50/50">
                  {(() => {
                    const q = engineerModalSearch.toLowerCase().trim();
                    const filteredEngineers = engineersModalData.engineers.filter(eng => {
                      if (engineerFilterTab === "acknowledged" && !eng.isAcknowledged) return false;
                      if (engineerFilterTab === "pending" && eng.pendingCount === 0) return false;

                      if (q) {
                        const nameMatch = eng.name.toLowerCase().includes(q);
                        const emailMatch = eng.email ? eng.email.toLowerCase().includes(q) : false;
                        const roleMatch = eng.rolesList.some(r => r.toLowerCase().includes(q));
                        const schemeMatch = eng.schemes.some(s =>
                          s.scheme_name.toLowerCase().includes(q) || s.scheme_id.toLowerCase().includes(q)
                        );
                        return nameMatch || emailMatch || roleMatch || schemeMatch;
                      }
                      return true;
                    });

                    if (filteredEngineers.length === 0) {
                      return (
                        <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                          {engineerModalSearch
                            ? `No personnel found matching "${engineerModalSearch}"`
                            : "No notified engineers found for this category."}
                        </div>
                      );
                    }

                    const getRoleBadgeStyle = (role: string) => {
                      if (role.includes("Chief")) return "bg-rose-50 text-rose-700 border-rose-200";
                      if (role.includes("Superintending") || role.includes("SE")) return "bg-purple-50 text-purple-700 border-purple-200";
                      if (role.includes("Executive") || role.includes("EE")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
                      if (role.includes("Civil")) return "bg-sky-50 text-sky-700 border-sky-200";
                      if (role.includes("Mech")) return "bg-blue-50 text-blue-700 border-blue-200";
                      return "bg-teal-50 text-teal-700 border-teal-200";
                    };

                    return filteredEngineers.map((eng, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 shadow-inner">
                              {getInitials(eng.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900 truncate">
                                  {eng.name}
                                </span>
                                {eng.rolesList.map((role, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeStyle(role)}`}
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>

                              {eng.email ? (
                                <a
                                  href={`mailto:${eng.email}`}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 mt-1"
                                >
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{eng.email}</span>
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 mt-1 italic">No email address recorded</span>
                              )}
                            </div>
                          </div>

                          {/* Ack Status Badge */}
                          <div className="flex flex-col items-end shrink-0">
                            {eng.isFullyAcknowledged ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                All Acknowledged ({eng.ackCount}/{eng.totalAlerts})
                              </span>
                            ) : eng.ackCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                                {eng.ackCount}/{eng.totalAlerts} Acknowledged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                Pending ({eng.totalAlerts} Alert{eng.totalAlerts > 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assigned Schemes Pills */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                            Assigned Alert Schemes ({eng.schemes.length}):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {eng.schemes.map((s, sIdx) => (
                              <div
                                key={sIdx}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${s.isAcknowledged
                                  ? "bg-emerald-50/80 text-emerald-800 border-emerald-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                                  }`}
                              >
                                {s.isAcknowledged ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                                )}
                                <span className="font-semibold text-slate-900">{s.scheme_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({s.scheme_id})</span>
                                {s.village_name && (
                                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-semibold">
                                    Village: {s.village_name}
                                  </span>
                                )}
                                {s.esr_name && (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-semibold">
                                    Sensor: {s.esr_name}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Footer */}
                <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{engineersModalData.engineers.length}</span> assigned personnel
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setEngineersModalData(null)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4"
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
