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
  ArrowRight
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
  ee_mech_name?: string | null;
  ee_mech_email?: string | null;
  de_ae_civil_name?: string | null;
  de_ae_civil_email?: string | null;
  de_ae_mech_name?: string | null;
  de_ae_mech_email?: string | null;
  se_name?: string | null;
  se_email?: string | null;
  chief_engineer_name?: string | null;
  chief_engineer_email?: string | null;
  vendor_name?: string | null;
  vendor_email?: string | null;
  civil_engineer_name: string | null;
  civil_engineer_email: string | null;
  mechanical_engineer_name: string | null;
  mechanical_engineer_email: string | null;
  site_supervisor_name: string | null;
  site_supervisor_email: string | null;
  created_at?: string;
  sent_date?: string;
  remarks: IssueRemark[];
  acknowledgements?: { engineer_email: string; engineer_name: string; acknowledged_at: string | null }[];
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
  isAcknowledged: boolean;
  acknowledged_at: string | null;
}

// Helper to gather all recipients for a scheme who received or are assigned the alert email
export const getRowRecipients = (row: AlertData): AlertRecipient[] => {
  const recipients: AlertRecipient[] = [];

  const checkAck = (email: string | null, name: string | null) => {
    if (!row.acknowledgements || !Array.isArray(row.acknowledgements)) {
      return { isAck: false, acknowledged_at: null };
    }
    const targetEmail = email ? email.toLowerCase().trim() : '';
    const targetName = name ? name.toLowerCase().trim() : '';

    const match = row.acknowledgements.find((a: any) => {
      if (!a.acknowledged_at) return false;
      const aEmail = a.engineer_email ? a.engineer_email.toLowerCase().trim() : '';
      const aName = a.engineer_name ? a.engineer_name.toLowerCase().trim() : '';
      if (targetEmail && aEmail && aEmail === targetEmail) return true;
      if (targetName && aName && aName === targetName) return true;
      return false;
    });

    return {
      isAck: !!match,
      acknowledged_at: match?.acknowledged_at || null
    };
  };

  // 1. Executive Engineer (Civil)
  if (row.ee_civil_name || row.ee_civil_email) {
    const { isAck, acknowledged_at } = checkAck(row.ee_civil_email || null, row.ee_civil_name || null);
    recipients.push({
      role: "Executive Engineer (Civil)",
      name: row.ee_civil_name || "EE (Civil)",
      email: row.ee_civil_email || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 2. Executive Engineer (Mech)
  if (row.ee_mech_name || row.ee_mech_email) {
    const { isAck, acknowledged_at } = checkAck(row.ee_mech_email || null, row.ee_mech_name || null);
    recipients.push({
      role: "Executive Engineer (Mech)",
      name: row.ee_mech_name || "EE (Mech)",
      email: row.ee_mech_email || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 3. DE/AE (Civil)
  const civilName = row.de_ae_civil_name || row.civil_engineer_name;
  const civilEmail = row.de_ae_civil_email || row.civil_engineer_email;
  const isVendorCivil = !row.de_ae_civil_name && civilName && (civilName.toLowerCase().includes("vendor") || civilName === "No Engineer/Vendor Assigned");
  if ((civilName || civilEmail) && !isVendorCivil) {
    const { isAck, acknowledged_at } = checkAck(civilEmail || null, civilName || null);
    recipients.push({
      role: "DE/AE (Civil)",
      name: civilName || "DE/AE (Civil)",
      email: civilEmail || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 4. DE/AE (Mech)
  const mechName = row.de_ae_mech_name || row.mechanical_engineer_name || row.site_supervisor_name;
  const mechEmail = row.de_ae_mech_email || row.mechanical_engineer_email || row.site_supervisor_email;
  if (mechName || mechEmail) {
    const { isAck, acknowledged_at } = checkAck(mechEmail || null, mechName || null);
    recipients.push({
      role: "DE/AE (Mech)",
      name: mechName || "DE/AE (Mech)",
      email: mechEmail || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 5. Superintending Engineer (SE)
  if (row.se_name || row.se_email) {
    const { isAck, acknowledged_at } = checkAck(row.se_email || null, row.se_name || null);
    recipients.push({
      role: "Superintending Engineer (SE)",
      name: row.se_name || "Superintending Engineer (SE)",
      email: row.se_email || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 6. Chief Engineer
  if (row.chief_engineer_name || row.chief_engineer_email) {
    const { isAck, acknowledged_at } = checkAck(row.chief_engineer_email || null, row.chief_engineer_name || null);
    recipients.push({
      role: "Chief Engineer",
      name: row.chief_engineer_name || "Chief Engineer",
      email: row.chief_engineer_email || null,
      isAcknowledged: isAck,
      acknowledged_at
    });
  }

  // 7. Assigned Vendor (for offline alerts if vendor is assigned)
  const vendorName = row.vendor_name || (isVendorCivil ? civilName : null);
  const vendorEmail = row.vendor_email || (isVendorCivil ? civilEmail : null);
  if (vendorName && vendorName !== 'No Engineer/Vendor Assigned') {
    const { isAck, acknowledged_at } = checkAck(vendorEmail || null, vendorName || null);
    recipients.push({
      role: "Assigned Vendor",
      name: vendorName,
      email: vendorEmail || null,
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
  const isAcknowledged = ackCount > 0;
  const isFullyAcknowledged = totalRequired > 0 && ackCount === totalRequired;

  const acksList = activeRecipients
    .filter(r => r.isAcknowledged)
    .map(r => ({
      name: r.name,
      email: r.email || "",
      acknowledged_at: r.acknowledged_at || ""
    }));

  return {
    isAcknowledged,
    isFullyAcknowledged,
    ackCount,
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

  // Modal dialog for viewing the full list of acknowledged or pending schemes
  const [ackModalData, setAckModalData] = useState<{
    title: string;
    type: "acknowledged" | "pending";
    rows: AlertData[];
  } | null>(null);
  const [modalSearch, setModalSearch] = useState("");

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      window.location.href = "/api/alerts-progress/download-14-day-report";
      setTimeout(() => {
        setIsDownloading(false);
      }, 2000);
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
    
    // Yesterday
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    if (activeSubTab === "custom") {
      return data; // Backend already filters by the exact date
    }

    if (activeSubTab === "current") {
      // Current day = Emails sent exactly TODAY (calendar date matches)
      return data.filter((row) => {
        if (!row.created_at) return false;
        return new Date(row.created_at).toDateString() === todayStr;
      });
    } else {
      // Previous day = Emails sent exactly YESTERDAY
      const previousData = data.filter((row) => {
        if (!row.created_at) return false;
        return new Date(row.created_at).toDateString() === yesterdayStr;
      });

      // Apply the original health filter to previous day data
      return previousData.filter((row) => {
        const prevVal = Number(row.previous_value);
        if (type === "lpcd") return prevVal < 55 || prevVal === 0;
        return prevVal < 0.2;
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
        className={`h-8 px-4 text-xs font-medium rounded-full border w-28 whitespace-nowrap overflow-hidden ${
          isResolved 
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

    // Calculations for KPIs
    const firstKpiLabel = type === "lpcd" ? "Total Villages" : type === "offline" ? "Offline Records" : "Total Sensors";
    const firstKpiValue = type === "lpcd" 
      ? baseData.reduce((acc, row) => {
          if (typeof row.village_name === 'string') {
            return acc + row.village_name.split(',').length;
          }
          return acc + 1;
        }, 0)
      : baseData.length;
    const alertValueLabel = type === "lpcd" ? "LPCD" : type === "chlorine" ? "Chlorine" : type === "pressure" ? "Pressure" : "Offline Sensors";
    
    // Acknowledgement lists over all base date records
    const acknowledgedRows = baseData.filter((r) => getRowAckInfo(r).isAcknowledged);
    const pendingRows = baseData.filter((r) => !getRowAckInfo(r).isAcknowledged);
    const totalAcknowledged = acknowledgedRows.length;
    const totalPending = pendingRows.length;

    // Count unique notified engineers
    const engineersSet = new Set<string>();
    baseData.forEach(r => {
      const recs = getRowRecipients(r);
      recs.forEach(rec => {
        if (rec.email) engineersSet.add(rec.email.toLowerCase().trim());
      });
    });
    const totalEngineers = engineersSet.size;

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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        
        {/* KPI Cards Row - 5 Cards including Acknowledged with onclick list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 p-5 border-b border-slate-100 bg-slate-50/50">
          
          {/* Card 1: Total Alerts */}
          <div 
            onClick={() => setAckStatusFilter("all")}
            className={`cursor-pointer flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
              ackStatusFilter === "all" 
                ? "bg-white border-indigo-400 ring-2 ring-indigo-200 shadow-sm" 
                : "bg-white/80 border-slate-200 hover:border-slate-300 shadow-sm"
            }`}
            title="Click to view all alerts"
          >
            <div className="h-10 w-10 shrink-0 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Total Alerts</div>
              <div className="text-xl font-extrabold text-slate-900">{baseData.length}</div>
              <div className="text-[10px] text-slate-400 truncate">{firstKpiValue} {firstKpiLabel}</div>
            </div>
          </div>

          {/* Card 2: Acknowledged (Clickable with List Available!) */}
          <div 
            onClick={() => {
              setAckModalData({
                title: `Acknowledged Alerts (${totalAcknowledged})`,
                type: "acknowledged",
                rows: acknowledgedRows
              });
              setModalSearch("");
            }}
            className={`cursor-pointer group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
              ackStatusFilter === "acknowledged" 
                ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 shadow-sm" 
                : "bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200 hover:border-emerald-300 hover:shadow-md"
            }`}
            title="Click to view list of acknowledged schemes"
          >
            <div className="h-10 w-10 shrink-0 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider truncate flex items-center justify-between">
                <span>Acknowledged</span>
                <span className="text-[10px] font-semibold text-emerald-600 underline group-hover:text-emerald-800 flex items-center">
                  List <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                </span>
              </div>
              <div className="text-xl font-extrabold text-emerald-700">{totalAcknowledged}</div>
              <div className="text-[10px] text-emerald-600 font-medium truncate">
                {Math.round((totalAcknowledged / (baseData.length || 1)) * 100)}% of alerts
              </div>
            </div>
          </div>

          {/* Card 3: Pending Ack (Clickable with List Available!) */}
          <div 
            onClick={() => {
              setAckModalData({
                title: `Pending Acknowledgement Alerts (${totalPending})`,
                type: "pending",
                rows: pendingRows
              });
              setModalSearch("");
            }}
            className={`cursor-pointer group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${
              ackStatusFilter === "pending" 
                ? "bg-amber-50 border-amber-400 ring-2 ring-amber-200 shadow-sm" 
                : "bg-gradient-to-br from-amber-50/70 to-white border-amber-200 hover:border-amber-300 hover:shadow-md"
            }`}
            title="Click to view list of pending acknowledgement schemes"
          >
            <div className="h-10 w-10 shrink-0 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider truncate flex items-center justify-between">
                <span>Pending Ack</span>
                <span className="text-[10px] font-semibold text-amber-600 underline group-hover:text-amber-800 flex items-center">
                  List <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                </span>
              </div>
              <div className="text-xl font-extrabold text-amber-700">{totalPending}</div>
              <div className="text-[10px] text-amber-600 font-medium truncate">Awaiting action</div>
            </div>
          </div>

          {/* Card 4: Engineers Notified */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white/80 shadow-sm">
            <div className="h-10 w-10 shrink-0 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Engineers</div>
              <div className="text-xl font-extrabold text-slate-900">{totalEngineers}</div>
              <div className="text-[10px] text-slate-400 truncate">Assigned personnel</div>
            </div>
          </div>

          {/* Card 5: Remarks Added */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white/80 shadow-sm">
            <div className="h-10 w-10 shrink-0 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">Remarks Added</div>
              <div className="text-xl font-extrabold text-slate-900">{totalRemarks}</div>
              <div className="text-[10px] text-slate-400 truncate">Feedback logged</div>
            </div>
          </div>

        </div>

        {/* Active Filters Bar */}
        {(ackStatusFilter !== "all" || schemeSearch) && (
          <div className="px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-medium">Active Filter:</span>
              {ackStatusFilter !== "all" && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs border ${
                  ackStatusFilter === "acknowledged" 
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                    : "bg-amber-100 text-amber-800 border-amber-200"
                }`}>
                  Status: {ackStatusFilter === "acknowledged" ? "Acknowledged Only" : "Pending Ack Only"}
                  <button onClick={() => setAckStatusFilter("all")} className="hover:opacity-75 ml-1">✕</button>
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
                <tr className="bg-slate-100/60 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 w-12">#</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">Scheme Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">
                    {type === "offline" ? "Offline Sensors" : `Alert Value (${alertValueLabel})`}
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">
                    {type === "offline" ? "Notified Personnel" : "Notified Engineers"}
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">Remarks</th>
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

                  return (
                    <tr key={`${row.scheme_id}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 align-top text-center border-x border-slate-200">
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
                            {row.village_name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600">
                                {row.village_name}
                              </span>
                            )}
                            {row.esr_name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-600">
                                {row.esr_name}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 align-middle text-center border-x border-slate-200">
                        {type === "offline" ? (
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {String(row.current_value).split(', ').map((sensor) => (
                              <span key={sensor} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                                {sensor}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 w-full max-w-[140px] mx-auto">
                            <div className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                              <span className="text-slate-500 font-medium">
                                {activeSubTab === "current" ? "Alert Value" : rowTodayStr}
                              </span>
                              <span className="font-semibold text-slate-700">{row.historical_value ?? row.previous_value ?? "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-indigo-50/50 px-2 py-1.5 rounded border border-indigo-100">
                              <span className="text-slate-500 font-medium">
                                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                              <span className={`font-bold ${failing ? 'text-rose-600' : 'text-emerald-600'}`}>{row.current_value ?? "N/A"}</span>
                            </div>
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
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                                ackInfo.isFullyAcknowledged
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
          
          {/* Top Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setPage(1);
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-8 border border-slate-200 shadow-sm bg-white p-1 rounded-lg">
              <TabsTrigger value="lpcd" className="rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 font-semibold">LPCD</TabsTrigger>
              <TabsTrigger value="chlorine" className="rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 font-semibold">Chlorine</TabsTrigger>
              <TabsTrigger value="pressure" className="rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 font-semibold">Pressure</TabsTrigger>
              <TabsTrigger value="offline" className="rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 font-semibold">Offline</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {activeTab === "lpcd"
                  ? "LPCD Alerts"
                  : activeTab === "chlorine"
                  ? "Chlorine Alerts"
                  : activeTab === "pressure"
                  ? "Pressure Alerts"
                  : "Offline Sensor Alerts"}
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">
                {activeTab === "offline"
                  ? "Sensors currently offline and requiring vendor attention."
                  : "Schemes currently violating telemetry thresholds."}
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Scheme Search Input */}
              <div className="relative min-w-[240px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search scheme name or ID..."
                  value={schemeSearch}
                  onChange={(e) => {
                    setSchemeSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
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

              {activeTab !== "offline" && (
                <>
                  <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <Button 
                      variant={activeSubTab === "current" ? "default" : "ghost"} 
                      className={`h-9 px-4 text-sm font-semibold rounded-md ${activeSubTab === "current" ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      onClick={() => {
                        setActiveSubTab("current");
                        setPage(1);
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Current Day
                    </Button>
                    <Button 
                      variant={activeSubTab === "previous" ? "default" : "ghost"} 
                      className={`h-9 px-4 text-sm font-semibold rounded-md ${activeSubTab === "previous" ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                      onClick={() => {
                        setActiveSubTab("previous");
                        setPage(1);
                      }}
                    >
                      <History className="mr-2 h-4 w-4" />
                      Previous Day
                    </Button>
                    
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    
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
                      className={`h-9 px-3 text-sm font-medium rounded-md border-0 outline-none cursor-pointer transition-colors ${activeSubTab === "custom" ? 'bg-blue-600 text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-slate-50'}`}
                    />
                  </div>

                  <Button
                    onClick={handleDownloadReport}
                    disabled={isDownloading}
                    className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm border border-emerald-700/50"
                  >
                    {isDownloading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Download 14-Day Report
                      </span>
                    )}
                  </Button>
                </>
              )}
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
                <div className={`p-5 border-b text-white flex items-center justify-between ${
                  ackModalData.type === "acknowledged"
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
                        ? "Schemes where alert notifications have been confirmed and acknowledged by field engineers."
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
                      placeholder={`Search ${ackModalData.type} schemes...`}
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {modalFilteredRows.length} of {ackModalData.rows.length} schemes
                  </span>
                </div>

                {/* List Table */}
                <div className="overflow-y-auto flex-1 p-4">
                  {modalFilteredRows.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs font-medium">
                      No matching schemes found.
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center w-10">#</th>
                          <th className="p-2.5">Scheme Details</th>
                          <th className="p-2.5 text-center">ESR / Village</th>
                          <th className="p-2.5 text-center">Alert Value</th>
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
                                {row.esr_name || row.village_name || "-"}
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
                    className={`text-xs font-semibold ${
                      ackModalData.type === "acknowledged"
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
                                className={`bg-white p-5 rounded-xl shadow-sm border border-slate-200 ${
                                  issue.status === 'Resolved'
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
                                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                                        issue.status === 'Resolved'
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
                      <Users className="h-5 w-5 text-indigo-600" />
                      Email Alert Recipients & Acknowledgement
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-slate-600 font-medium text-xs mt-1">
                    Scheme: <span className="font-semibold text-slate-800">{selectedEngineers.title}</span>
                    {selectedEngineers.row.village_name && (
                      <span className="text-slate-400 ml-1.5">• Village: {selectedEngineers.row.village_name}</span>
                    )}
                    {selectedEngineers.row.ticket_id && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold text-slate-600">
                        {selectedEngineers.row.ticket_id}
                      </span>
                    )}
                  </DialogDescription>
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

        </div>
      </div>
    </DashboardLayout>
  );
}
