import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import VillageFilter from "@/components/dashboard/VillageFilter";
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

  if (acksList.length === 0 && validAcks.length > 0) {
    validAcks.forEach((a: any) => {
      acksList.push({
        name: a.engineer_name || "Assigned Engineer",
        email: a.engineer_email || "",
        acknowledged_at: a.acknowledged_at || ""
      });
    });
  }

  return {
    isAcknowledged,
    isFullyAcknowledged,
    ackCount: Math.max(ackCount, validAcks.length),
    totalRequired,
    acksList,
    recipients
  };
};

export default function AlertsProgressPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("lpcd");
  const [activeSubTab, setActiveSubTab] = useState<"current" | "previous" | "custom">("current");
  const [customDate, setCustomDate] = useState<string>("");
  const [schemeSearch, setSchemeSearch] = useState<string>("");
  const [ackStatusFilter, setAckStatusFilter] = useState<"all" | "acknowledged" | "pending">("all");
  const [villageFilter, setVillageFilter] = useState<"all" | "completed">("all");
  const { isVillageCompleted } = useVillageCompletion();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isDownloading, setIsDownloading] = useState(false);

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
      const url = customDate ? `/api/alerts-progress/lpcd?date=${customDate}` : "/api/alerts-progress/lpcd";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch LPCD alerts");
      return res.json();
    },
    enabled: !!isAdmin,
  });

  const { data: chlorineData = [], isLoading: isLoadingChlorine } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/chlorine", customDate],
    queryFn: async () => {
      const url = customDate ? `/api/alerts-progress/chlorine?date=${customDate}` : "/api/alerts-progress/chlorine";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch Chlorine alerts");
      return res.json();
    },
    enabled: !!isAdmin,
  });

  const { data: pressureData = [], isLoading: isLoadingPressure } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/pressure", customDate],
    queryFn: async () => {
      const url = customDate ? `/api/alerts-progress/pressure?date=${customDate}` : "/api/alerts-progress/pressure";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch Pressure alerts");
      return res.json();
    },
    enabled: !!isAdmin,
  });

  const { data: offlineData = [], isLoading: isLoadingOffline } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/offline"],
    queryFn: async () => {
      const res = await fetch("/api/alerts-progress/offline");
      if (!res.ok) throw new Error("Failed to fetch Offline alerts");
      return res.json();
    },
    enabled: !!isAdmin,
  });

  // Query total unique engineers in Engineers Directory
  const { data: rosterData } = useQuery<{ totalEngineers: number }>({
    queryKey: ["/api/alerts-progress/total-engineers"],
    queryFn: async () => {
      const res = await fetch("/api/alerts-progress/total-engineers");
      if (!res.ok) throw new Error("Failed to fetch total engineers");
      return res.json();
    },
    enabled: !!isAdmin,
  });
  const totalRosterEngineers = rosterData?.totalEngineers || 0;

  // Access check guard for non-admins
  if (!authLoading && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
            <div className="h-16 w-16 mx-auto bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shadow-inner">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Access Restricted</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The Alert Progress tracking portal is strictly restricted to platform administrators.
            </p>
            <Button
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow-md"
            >
              Return to Main Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Helper to filter data based on strict literal calendar dates
  const getFilteredData = (data: AlertData[], type: "lpcd" | "chlorine" | "pressure" | "offline") => {
    if (!Array.isArray(data) || data.length === 0) return [];
    if (type === "offline") return data;

    const todayStr = new Date().toDateString();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayYmd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const yesterdayYmd = `${yesterdayDate.getFullYear()}-${pad(yesterdayDate.getMonth() + 1)}-${pad(yesterdayDate.getDate())}`;

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
        <Button
          variant="outline"
          className="h-8 px-4 text-xs font-medium text-slate-500 border-slate-200 hover:bg-slate-50 rounded-full w-28 whitespace-nowrap"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRemarkDetails({ issues: [], title });
          }}
        >
          No Remarks
        </Button>
      );
    }

    const activeIssue = issues.find((i: any) => i.status === 'Active');
    const isResolved = !activeIssue;

    return (
      <Button
        variant="outline"
        className={`h-8 px-4 text-xs font-medium rounded-full border w-28 whitespace-nowrap overflow-hidden ${isResolved
          ? 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
          : 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100'
          }`}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedRemarkDetails({ issues, title });
        }}
      >
        <span className="truncate">
          {activeIssue ? "View Issue" : 'View Resolved'}
        </span>
      </Button>
    );
  };

  const renderDataTable = (
    rawData: AlertData[],
    type: "lpcd" | "chlorine" | "pressure" | "offline",
    isLoading: boolean
  ) => {
    if (isLoading) {
      return <div className="p-16 text-center text-slate-500 font-medium">Loading alerts data...</div>;
    }

    const baseData = getFilteredData(rawData, type);

    if (baseData.length === 0) {
      return (
        <div className="p-16 text-center flex flex-col items-center gap-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 m-6">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Everything is looking great!
          </h3>
          <p className="text-slate-500 max-w-sm text-sm">
            {type === "offline"
              ? "All IoT sensors are currently online. No communication dropouts reported."
              : activeSubTab === "current"
                ? "All parameters are perfectly within normal ranges today. No alerts were triggered."
                : activeSubTab === "previous"
                  ? "No emails were sent out yesterday. All systems were stable."
                  : "No emails were sent on this date. All systems were stable."}
          </p>
        </div>
      );
    }

    // Calculations for KPIs & Explicit Unit Indications
    const unitNoun = type === "lpcd"
      ? "Villages"
      : type === "chlorine"
        ? "Chlorine Sensors"
        : type === "pressure"
          ? "Pressure Sensors"
          : "Offline Sensors";

    const unitSingular = type === "lpcd"
      ? "Village"
      : type === "chlorine"
        ? "Chlorine Sensor"
        : type === "pressure"
          ? "Pressure Sensor"
          : "Offline Sensor";

    const firstKpiLabel = unitNoun;
    const firstKpiValue = type === "lpcd"
      ? baseData.reduce((acc, row) => {
        if (typeof row.village_name === 'string') {
          return acc + row.village_name.split(',').length;
        }
        return acc + 1;
      }, 0)
      : baseData.length;
    const alertValueLabel = type === "lpcd" ? "Village LPCD" : type === "chlorine" ? "Chlorine Sensor" : type === "pressure" ? "Pressure Sensor" : "Offline Sensors";

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
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">

        {/* Official Summary KPI Cards - Clean Government of India Portal Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 border-b border-slate-200 bg-slate-50/50">

          {/* Card 1: Total Active Alerts */}
          <div
            onClick={() => setAckStatusFilter("all")}
            className={`cursor-pointer flex flex-col justify-between p-3.5 rounded-lg border bg-white transition-all border-t-4 border-t-rose-600 ${ackStatusFilter === "all"
              ? "ring-2 ring-rose-300 border-rose-300 shadow-sm"
              : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            title={`Click to view all ${unitNoun}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {type === "lpcd"
                  ? "Villages < 55 LPCD"
                  : type === "chlorine"
                    ? "Chlorine Alerts"
                    : type === "pressure"
                      ? "Pressure Alerts"
                      : "Offline Sensors"}
              </span>
              <div className="h-7 w-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">{firstKpiValue}</span>
                <span className="text-xs font-bold text-rose-700">{unitNoun}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Across {baseData.length} Schemes
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-rose-700">Total Triggered</span>
              <span className="text-slate-400 font-medium">Click for All</span>
            </div>
          </div>

          {/* Card 2: Acknowledged Alerts */}
          <div
            onClick={() => {
              setAckModalData({
                title: `Acknowledged Alerts (${totalAcknowledged} ${unitNoun})`,
                type: "acknowledged",
                rows: acknowledgedRows
              });
              setModalSearch("");
            }}
            className={`cursor-pointer flex flex-col justify-between p-3.5 rounded-lg border bg-white transition-all border-t-4 border-t-emerald-600 ${ackStatusFilter === "acknowledged"
              ? "ring-2 ring-emerald-300 border-emerald-300 shadow-sm"
              : "border-slate-200 hover:border-emerald-300 hover:shadow-xs"
              }`}
            title={`Click to view list of acknowledged ${unitNoun}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Acknowledged
              </span>
              <div className="h-7 w-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700 font-mono">{totalAcknowledged}</span>
                <span className="text-xs font-bold text-emerald-700">{unitNoun}</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                {Math.round((totalAcknowledged / (baseData.length || 1)) * 100)}% of alerts confirmed
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-700">Engineer Confirmed</span>
              <span className="text-emerald-700 font-bold underline flex items-center">
                View List <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Pending Acknowledgements */}
          <div
            onClick={() => {
              setAckModalData({
                title: `Pending Acknowledgement Alerts (${totalPending} ${unitNoun})`,
                type: "pending",
                rows: pendingRows
              });
              setModalSearch("");
            }}
            className={`cursor-pointer flex flex-col justify-between p-3.5 rounded-lg border bg-white transition-all border-t-4 border-t-amber-500 ${ackStatusFilter === "pending"
              ? "ring-2 ring-amber-300 border-amber-300 shadow-sm"
              : "border-slate-200 hover:border-amber-300 hover:shadow-xs"
              }`}
            title={`Click to view list of pending acknowledgement ${unitNoun}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Pending Action
              </span>
              <div className="h-7 w-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-700 font-mono">{totalPending}</span>
                <span className="text-xs font-bold text-amber-700">{unitNoun}</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                Awaiting field response
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-amber-700">Action Required</span>
              <span className="text-amber-700 font-bold underline flex items-center">
                View List <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Card 4: Engineers Notified / Total Roster */}
          <div
            onClick={() => {
              setEngineersModalData({
                title: `Notified Engineers & Assigned Personnel (${totalEngineers})`,
                engineers: notifiedEngineersList
              });
              setEngineerModalSearch("");
              setEngineerFilterTab("all");
            }}
            className="cursor-pointer flex flex-col justify-between p-3.5 rounded-lg border bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all border-t-4 border-t-indigo-600"
            title="Click to view notified engineers and roster details"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Engineers Notified
              </span>
              <div className="h-7 w-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-700 font-mono">{totalEngineers}</span>
                <span className="text-sm font-bold text-slate-400">/</span>
                <span className="text-base font-extrabold text-slate-700 font-mono" title="Total registered engineers in Engineers Directory">
                  {totalRosterEngineers > 0 ? totalRosterEngineers : '—'}
                </span>
                <span className="text-[11px] font-bold text-indigo-600 ml-1">Engineers</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                Engineers Directory
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-indigo-700">
                {totalRosterEngineers > 0 ? `${Math.round((totalEngineers / totalRosterEngineers) * 100)}% Active` : 'Roster Active'}
              </span>
              <span className="text-indigo-700 font-bold underline flex items-center">
                Roster <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Card 5: Field Remarks Logged */}
          <div className="flex flex-col justify-between p-3.5 rounded-lg border border-slate-200 bg-white border-t-4 border-t-blue-600 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Action Reports
              </span>
              <div className="h-7 w-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">{totalRemarks}</span>
                <span className="text-xs font-bold text-slate-600">Logged</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                Field inspections recorded
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-700">Remarks Log</span>
              <span className="text-slate-400 font-medium">Issue Feedback</span>
            </div>
          </div>

        </div>

        {/* Active Filters Bar */}
        {(ackStatusFilter !== "all" || schemeSearch || villageFilter !== "all") && (
          <div className="px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-medium">Active Filter:</span>
              {ackStatusFilter !== "all" && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs border ${ackStatusFilter === "acknowledged"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}>
                  Status: {ackStatusFilter === "acknowledged" ? "Acknowledged Only" : "Pending Ack Only"}
                  <button onClick={() => setAckStatusFilter("all")} className="hover:opacity-75 ml-1">✕</button>
                </span>
              )}
              {villageFilter !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Village: Fully Completed Only
                  <button onClick={() => setVillageFilter("all")} className="hover:opacity-75 ml-1">✕</button>
                </span>
              )}
              {schemeSearch && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Search: "{schemeSearch}"
                  <button onClick={() => setSchemeSearch("")} className="hover:opacity-75 ml-1">✕</button>
                </span>
              )}
              <span className="text-slate-500 font-medium">({displayData.length} schemes displayed)</span>
            </div>
            <button
              onClick={() => {
                setAckStatusFilter("all");
                setVillageFilter("all");
                setSchemeSearch("");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline text-xs"
            >
              Reset to All Schemes
            </button>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          {displayData.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-medium">
              No schemes match your current search or status filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  <th className="py-4 px-3 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 w-12">#</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 min-w-[210px]">
                    Scheme & Location Details
                    <div className="text-[10px] font-normal text-slate-500 normal-case mt-0.5">
                      Scheme name, ID & Region
                    </div>
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-800 uppercase tracking-wider text-center border-x border-slate-200 min-w-[150px]">
                    Alert Value & Date
                    <div className="text-[10px] font-semibold text-rose-700 normal-case mt-0.5">
                      {type === "offline" ? "Sensors & Date" : `${unitNoun} (${type === "lpcd" ? "LPCD" : type === "chlorine" ? "mg/L" : "Bar"})`}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 min-w-[190px]">
                    Scheme Owner & Contact
                    <div className="text-[10px] font-semibold text-indigo-600 normal-case mt-0.5">
                      Assigned Engineers
                    </div>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 min-w-[180px]">
                    Email Sent
                    <div className="text-[10px] font-semibold text-blue-600 normal-case mt-0.5">
                      Email Dispatch & Logs
                    </div>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 min-w-[180px]">
                    SMS Sent

                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 min-w-[180px]">
                    Alert & Ack Status
                    <div className="text-[10px] font-semibold text-indigo-600 normal-case mt-0.5">
                      Acknowledge Status
                    </div>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 min-w-[120px]">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => {
                  const actualIndex = startIdx + idx + 1;
                  const failing = isStillFailing(row, type);

                  const rowDate = row.created_at ? new Date(row.created_at) : new Date();
                  const rowTodayStr = rowDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                  const ackInfo = getRowAckInfo(row);
                  const hasEngineers = ackInfo.recipients.length > 0;
                  const owner = getSchemeOwner(row);
                  const allContacts = getAllSchemeContacts(row);
                  const otherContactsCount = Math.max(0, allContacts.length - 1);

                  return (
                    <tr key={`${row.scheme_id}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 align-top text-center border-x border-slate-200">
                        <span className="text-sm font-medium text-slate-500">{actualIndex}</span>
                      </td>

                      <td className="py-4 px-6 align-top text-center border-x border-slate-200">
                        <div className="font-bold text-slate-900 text-sm">{row.scheme_name}</div>
                        <div className="flex items-center justify-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span>ID: {row.scheme_id}</span>
                          <MapPin className="h-3 w-3 text-slate-400 ml-1" />
                          <span>{row.region}</span>
                        </div>
                        {row.ticket_id && (
                          <div className="mt-2">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              Ticket: {row.ticket_id}
                            </span>
                          </div>
                        )}
                        {(row.village_name || row.esr_name) && (
                          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                            {type === "lpcd" && row.village_name && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                🏘️ Village: {row.village_name}
                              </span>
                            )}
                            {type === "chlorine" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                🧪 Chlorine Sensor: {row.esr_name || row.village_name || 'Main Line Sensor'}
                              </span>
                            )}
                            {type === "pressure" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                ⏱️ Pressure Sensor: {row.esr_name || row.village_name || 'Terminal Point'}
                              </span>
                            )}
                            {type === "offline" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                📡 Sensor: {row.esr_name || row.village_name || 'Telemetry Node'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Alert Value & Date - Shown ONCE with exact date */}
                      <td className="py-4 px-4 align-middle text-center border-x border-slate-200">
                        {type === "offline" ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex flex-wrap justify-center gap-1 max-w-[210px]">
                              {String(row.current_value || 'Telemetry Node').split(', ').map((sensor) => (
                                <span key={sensor} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  📡 {sensor}
                                </span>
                              ))}
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 mt-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatAlertDate(row)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <div className="inline-flex items-baseline gap-1 bg-rose-50 border border-rose-200 px-3 py-1 rounded-md shadow-2xs">
                              <span className="text-base font-black text-rose-700 font-mono tracking-tight">
                                {row.current_value ?? row.alert_value ?? row.historical_value ?? row.previous_value ?? "N/A"}
                              </span>
                              <span className="text-xs font-bold text-slate-700">
                                {type === "lpcd" ? "LPCD" : type === "chlorine" ? "mg/L" : "Bar"}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium mt-1.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatAlertDate(row)}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Scheme Owner & Contact from Engineers Directory */}
                      <td className="py-4 px-4 align-top text-center border-x border-slate-200">
                        {owner ? (
                          <div className="flex flex-col items-center text-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                              {owner.shortRole}
                            </span>
                            <div className="text-xs font-bold text-slate-900 leading-snug">
                              {owner.name}
                            </div>
                            {owner.mobile ? (
                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                <a
                                  href={`tel:${owner.mobile}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                                  title="Call Scheme Owner"
                                >
                                  <Phone className="h-3 w-3 text-indigo-600" />
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
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                                  title="Copy Mobile Number"
                                >
                                  {copiedMobile === owner.mobile ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No mobile registered</span>
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
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline mt-0.5 cursor-pointer"
                              >
                                +{otherContactsCount} other assigned engineer{otherContactsCount > 1 ? 's' : ''}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-xs text-slate-400 italic py-2">
                            Unassigned in Directory
                          </div>
                        )}
                      </td>

                      {/* Email Sent Status & Log Details */}
                      <td className="py-4 px-4 align-top text-center border-x border-slate-200">
                        {(() => {
                          const isSent = Boolean(row.created_at || row.sent_date || row.ticket_id);
                          const emailDate = row.created_at
                            ? new Date(row.created_at)
                            : (row.sent_date ? new Date(row.sent_date) : null);
                          const timeStr = emailDate && !isNaN(emailDate.getTime())
                            ? emailDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                            : null;
                          const emailRecipientsCount = ackInfo.recipients.filter(r => !!r.email).length || ackInfo.recipients.length;

                          if (isSent) {
                            return (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                                  Sent {emailRecipientsCount > 0 ? `(${emailRecipientsCount} recipients)` : ''}
                                </span>

                                {timeStr && (
                                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-medium">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{timeStr}</span>
                                  </div>
                                )}

                                {row.ticket_id && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {row.ticket_id}
                                  </span>
                                )}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold flex items-center gap-1 mt-0.5 border border-blue-100/60"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEngineers({ title: row.scheme_name, row });
                                  }}
                                  title="View Dispatched Email Recipients & Delivery Logs"
                                >
                                  <Eye className="w-3 h-3" /> View Email Log
                                </Button>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col items-center justify-center py-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Not Sent
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* SMS Dispatched Status & Log Details */}
                      <td className="py-4 px-4 align-top text-center border-x border-slate-200">
                        {row.sms_dispatches && row.sms_dispatches.length > 0 ? (
                          (() => {
                            const smsList = row.sms_dispatches!;
                            const successCount = smsList.filter(s => s.is_success).length;
                            const isFullSuccess = successCount === smsList.length;
                            const latestSms = smsList[0];
                            const smsDate = latestSms?.created_at ? new Date(latestSms.created_at) : null;
                            const timeStr = smsDate && !isNaN(smsDate.getTime())
                              ? smsDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                              : null;

                            return (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs ${isFullSuccess
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : successCount > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                  <MessageSquare className="w-3.5 h-3.5 text-current" />
                                  {isFullSuccess
                                    ? `Dispatched (${successCount}/${smsList.length})`
                                    : successCount > 0
                                      ? `Partial (${successCount}/${smsList.length})`
                                      : `Failed (${smsList.length})`}
                                </span>

                                {timeStr && (
                                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-medium">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{timeStr}</span>
                                  </div>
                                )}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-semibold flex items-center gap-1 mt-0.5 border border-indigo-100/60"
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
                                  <Eye className="w-3 h-3" /> View SMS Log
                                </Button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="flex flex-col items-center justify-center py-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Not Dispatched
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 align-top text-center border-x border-slate-200">
                        {type === "offline" ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-900">
                              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                              Offline
                            </div>
                            <div className="text-xs text-slate-500 mt-1 font-semibold">Sensor Dropout</div>
                          </div>
                        ) : failing ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-900">
                              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                              Threshold Violated
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Action Required</div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-900">
                              <div className="h-2 w-2 rounded-full bg-emerald-500" />
                              Resolved
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-center gap-2 mt-2">
                          {hasEngineers ? (
                            <>
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${ackInfo.isFullyAcknowledged
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : ackInfo.isAcknowledged
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                {ackInfo.ackCount > 0 ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                )}
                                {ackInfo.totalRequired > 0
                                  ? `${ackInfo.ackCount}/${ackInfo.totalRequired} Acknowledged`
                                  : ackInfo.isAcknowledged ? 'Acknowledged' : 'Pending'}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 shrink-0 border border-indigo-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEngineers({ title: row.scheme_name, row });
                                }}
                                title="View Assigned Personnel & Status"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 border border-slate-100 px-2.5 py-1 rounded-md bg-slate-50">
                              None Assigned
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 align-top text-center border-x border-slate-200">
                        <div className="flex justify-center">
                          {renderRemarkCell(row.remarks, `Remarks for ${row.esr_name || row.village_name || row.scheme_name}`)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-sm text-slate-500 font-medium">
            Showing {startItem} to {endItem} of {displayData.length} entries
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">Rows per page:</span>
              <select
                className="text-sm border-slate-200 rounded-md py-1 pl-2 pr-6 outline-none focus:ring-2 focus:ring-indigo-500 border bg-white cursor-pointer"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-slate-500 border-slate-200"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let p = i + 1;
                if (totalPages > 5 && page > 3) {
                  p = page - 2 + i;
                  if (p > totalPages) return null;
                }

                return (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    className={`h-8 w-8 text-sm ${page === p ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-slate-600 border-slate-200'}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}

              {totalPages > 5 && page < totalPages - 2 && (
                <>
                  <span className="px-2 text-slate-400">...</span>
                  <Button
                    variant="outline"
                    className="h-8 w-8 text-sm text-slate-600 border-slate-200"
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-slate-500 border-slate-200"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
      <div className="min-h-screen bg-slate-50/30">
        <div className="container mx-auto p-6 space-y-6">

          {/* Official Government of Maharashtra / Jal Jeevan Mission Portal Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-slate-100 to-emerald-600 w-full" />
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                  <img
                    src="/images/jal-jeevan-mission-logo.png"
                    alt="Jal Jeevan Mission"
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      Govt. of Maharashtra
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      Water Supply & Sanitation Department
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
                    Jal Jeevan Mission — Alert Dispatch & Escalation Portal
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-3xl">
                    Official monitoring of village LPCD deficits, water potability (residual chlorine), terminal pipeline pressure, and IoT sensor communication status with automated Email and DLT SMS dispatch logs.
                  </p>
                </div>
              </div>

              {/* Official Status Badges */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-left">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Engineers Roster</div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{totalRosterEngineers > 0 ? `${totalRosterEngineers} Total Engineers` : 'Engineers Directory'}</span>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-left">
                  <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">DLT SMS Gateway</div>
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Gateway</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs with Official GoI Styling */}
          <div className="w-full">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val);
                setPage(1);
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 mb-4 p-1.5 bg-slate-100 border border-slate-200 rounded-xl h-auto">
                <TabsTrigger
                  value="lpcd"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-b-blue-600 text-slate-700 hover:text-slate-900 transition-all"
                >
                  <Waves className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="truncate">Village LPCD Alerts</span>
                  {lpcdData.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                      {lpcdData.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="chlorine"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-b-emerald-600 text-slate-700 hover:text-slate-900 transition-all"
                >
                  <Droplets className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Chlorine Sensor Alerts</span>
                  {chlorineData.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {chlorineData.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="pressure"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-b-amber-600 text-slate-700 hover:text-slate-900 transition-all"
                >
                  <GaugeCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="truncate">Pressure Sensor Alerts</span>
                  {pressureData.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                      {pressureData.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="offline"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-rose-900 data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-b-rose-600 text-slate-700 hover:text-slate-900 transition-all"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span className="truncate">Offline Sensor Alerts</span>
                  {offlineData.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                      {offlineData.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Metric Context & Indication Banner */}
          <div className="rounded-xl p-4 bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                {activeTab === "lpcd" ? (
                  <Waves className="h-5 w-5 text-blue-600" />
                ) : activeTab === "chlorine" ? (
                  <Droplets className="h-5 w-5 text-emerald-600" />
                ) : activeTab === "pressure" ? (
                  <GaugeCircle className="h-5 w-5 text-amber-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base md:text-lg font-bold text-slate-900">
                    {activeTab === "lpcd"
                      ? "Village LPCD Alerts Tracking"
                      : activeTab === "chlorine"
                        ? "Chlorine Sensor Alerts Tracking"
                        : activeTab === "pressure"
                          ? "Pressure Sensor Alerts Tracking"
                          : "Offline Sensor Alerts Tracking"}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    Indication: {activeTab === "lpcd" ? "Villages" : activeTab === "chlorine" ? "Chlorine Sensors" : activeTab === "pressure" ? "Pressure Sensors" : "Offline Sensors"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {activeTab === "lpcd"
                    ? "Shows villages receiving water supply below 55 LPCD. Daily alerts dispatched to assigned Executive and Section Engineers."
                    : activeTab === "chlorine"
                      ? "Shows chlorine sensors reporting residual chlorine outside safe potability standard (0.20 – 0.50 mg/L)."
                      : activeTab === "pressure"
                        ? "Shows terminal pressure sensors outside required head range (0.20 – 0.70 Bar)."
                        : "Shows IoT sensors currently experiencing telemetry dropout / communication failure."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500">Unit:</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                {activeTab === "lpcd" ? "🏘️ Villages (<55 LPCD)" : activeTab === "chlorine" ? "🧪 Chlorine Sensors" : activeTab === "pressure" ? "⏱️ Pressure Sensors" : "📡 Offline Sensors"}
              </span>
            </div>
          </div>

          {/* Action Toolbar: Search, Date Selection & Excel Download */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === "lpcd" ? "Search by scheme name, ID, village, or region..." : "Search by scheme name, ID, sensor location, or region..."}
                value={schemeSearch}
                onChange={(e) => {
                  setSchemeSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/70 hover:bg-white border border-slate-200 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400 transition-colors"
              />
              {schemeSearch && (
                <button
                  onClick={() => {
                    setSchemeSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Village Filter */}
            <div className="w-full sm:w-auto">
              <VillageFilter
                value={villageFilter}
                onChange={(val) => {
                  setVillageFilter(val);
                  setPage(1);
                }}
                showLabel={false}
                triggerClassName="h-8 text-xs bg-slate-50/70 border-slate-200"
              />
            </div>

            {/* Date Filters & Download */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {activeTab !== "offline" && (
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-inner">
                  <Button
                    variant={activeSubTab === "current" ? "default" : "ghost"}
                    className={`h-8 px-3 text-xs font-semibold rounded-md transition-colors ${activeSubTab === "current" ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs' : 'text-slate-600 hover:bg-white/80'}`}
                    onClick={() => {
                      setActiveSubTab("current");
                      setPage(1);
                    }}
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Current Day
                  </Button>
                  <Button
                    variant={activeSubTab === "previous" ? "default" : "ghost"}
                    className={`h-8 px-3 text-xs font-semibold rounded-md transition-colors ${activeSubTab === "previous" ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs' : 'text-slate-600 hover:bg-white/80'}`}
                    onClick={() => {
                      setActiveSubTab("previous");
                      setPage(1);
                    }}
                  >
                    <History className="mr-1.5 h-3.5 w-3.5" />
                    Previous Day
                  </Button>

                  <div className="h-5 w-px bg-slate-300 mx-1"></div>

                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      if (e.target.value) {
                        setActiveSubTab("custom");
                        setPage(1);
                      } else {
                        setActiveSubTab("current");
                        setPage(1);
                      }
                    }}
                    className={`h-8 px-2.5 text-xs font-medium rounded-md border-0 outline-none cursor-pointer transition-colors ${activeSubTab === "custom" ? 'bg-indigo-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:bg-white/80'}`}
                  />
                </div>
              )}

              <Button
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs border border-emerald-700/50 rounded-lg text-xs"
                title="Download Excel report containing all alert data"
              >
                {isDownloading ? (
                  <span className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Excel...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download Alerts Excel
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full">
            {activeTab === "lpcd" && renderDataTable(lpcdData, "lpcd", isLoadingLpcd)}
            {activeTab === "chlorine" && renderDataTable(chlorineData, "chlorine", isLoadingChlorine)}
            {activeTab === "pressure" && renderDataTable(pressureData, "pressure", isLoadingPressure)}
            {activeTab === "offline" && renderDataTable(offlineData, "offline", isLoadingOffline)}
          </div>

          {/* On-Click Modal Dialog for Acknowledged / Pending List */}
          {ackModalData && (
            <Dialog open={!!ackModalData} onOpenChange={(open) => !open && setAckModalData(null)}>
              <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl">
                {/* Header */}
                <div className={`p-5 border-b text-white flex items-center justify-between ${ackModalData.type === "acknowledged"
                  ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700"
                  : "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700"
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
                                    <span className="text-slate-400 italic">Confirmed</span>
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
                                  ackInfo.acksList[0]?.acknowledged_at ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      {new Date(ackInfo.acksList[0].acknowledged_at).toLocaleString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-semibold">Acknowledged</span>
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
                  const headerGradient = hasActive
                    ? "from-red-600 via-rose-600 to-red-700"
                    : "from-emerald-600 via-teal-600 to-emerald-700";
                  return (
                    <>
                      <div className={`p-6 pb-4 border-b border-white/10 flex justify-between items-center relative overflow-hidden bg-gradient-to-br ${headerGradient}`}>
                        <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
                        <div className="relative z-10 flex-1 pr-6">
                          <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-3 text-white">
                            <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-white/90" />
                            <span className="tracking-tight text-white drop-shadow-sm">Issue Details & Remarks History</span>
                          </DialogTitle>
                          <DialogDescription className="text-white/90 mt-2 font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-white/70" />
                            <span className="drop-shadow-sm">{selectedRemarkDetails.title}</span>
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
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 text-xs font-bold shadow-inner">
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
                <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                      <MessageSquare className="h-5 w-5 text-white" />
                      SMS Dispatch Logs & Delivery Status
                    </DialogTitle>
                    <DialogDescription className="text-emerald-100 text-xs mt-1">
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
                <div className="p-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white">
                  <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Phone className="h-4 w-4 text-white" />
                    Scheme Engineers & Phone Numbers
                  </DialogTitle>
                  <DialogDescription className="text-indigo-100 text-xs mt-1">
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
                <DialogHeader className="p-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2.5 text-white">
                        <Users className="h-5 w-5 text-indigo-200 shrink-0" />
                        <span>{engineersModalData.title}</span>
                      </DialogTitle>
                      <DialogDescription className="text-indigo-100 text-xs mt-1">
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
                      <div className="text-[10px] font-medium text-indigo-200 uppercase tracking-wider">Total in Roster</div>
                      <div className="text-base font-extrabold text-indigo-100">
                        {totalRosterEngineers > 0 ? totalRosterEngineers : '—'}
                      </div>
                      <div className="text-[9px] text-indigo-200/80 truncate">Registered Personnel</div>
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
