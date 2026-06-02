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
  History
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
  civil_engineer_name: string | null;
  civil_engineer_email: string | null;
  mechanical_engineer_name: string | null;
  mechanical_engineer_email: string | null;
  site_supervisor_name: string | null;
  site_supervisor_email: string | null;
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

export default function AlertsProgressPage() {
  const [activeTab, setActiveTab] = useState("lpcd");
  const [activeSubTab, setActiveSubTab] = useState("current");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [selectedRemarkDetails, setSelectedRemarkDetails] = useState<{
    title: string;
    issues: any[];
  } | null>(null);

  const [selectedEngineers, setSelectedEngineers] = useState<{
    title: string;
    row: AlertData;
  } | null>(null);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const yesterdayStr = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Queries for each metric
  const { data: lpcdData = [], isLoading: isLoadingLpcd } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/lpcd"],
    queryFn: async () => {
      const res = await fetch("/api/alerts-progress/lpcd");
      return res.json();
    },
  });

  const { data: chlorineData = [], isLoading: isLoadingChlorine } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/chlorine"],
    queryFn: async () => {
      const res = await fetch("/api/alerts-progress/chlorine");
      return res.json();
    },
  });

  const { data: pressureData = [], isLoading: isLoadingPressure } = useQuery<AlertData[]>({
    queryKey: ["/api/alerts-progress/pressure"],
    queryFn: async () => {
      const res = await fetch("/api/alerts-progress/pressure");
      return res.json();
    },
  });

  // Helper to filter data based on Current vs Previous day
  const getFilteredData = (data: AlertData[], type: "lpcd" | "chlorine" | "pressure") => {
    if (activeSubTab === "current") {
      return data.filter((row) => {
        const val = Number(row.current_value);
        if (type === "lpcd") return val < 55 || val === 0;
        return val < 0.2;
      });
    } else {
      return data.filter((row) => {
        const prevVal = Number(row.previous_value);
        if (type === "lpcd") return prevVal < 55 || prevVal === 0;
        return prevVal < 0.2;
      });
    }
  };

  const isStillFailing = (row: AlertData, type: "lpcd" | "chlorine" | "pressure") => {
    const val = Number(row.current_value);
    if (type === "lpcd") return val < 55 || val === 0;
    return val < 0.2;
  };

  const renderEngineerContact = (name: string | null, email: string | null, role: string, ackStatus?: any) => {
    if (!name || !email) return null;
    return (
      <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mt-0.5">
            {getInitials(name)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">
              {name}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">{role}</span>
            <a href={`mailto:${email}`} className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-1 mt-1">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[180px]">{email}</span>
            </a>
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
    type: "lpcd" | "chlorine" | "pressure",
    isLoading: boolean
  ) => {
    if (isLoading) {
      return <div className="p-16 text-center text-slate-500 font-medium">Loading alerts data...</div>;
    }

    const data = getFilteredData(rawData, type);

    if (data.length === 0) {
      return (
        <div className="p-16 text-center flex flex-col items-center gap-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 m-6">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Everything is looking great!
          </h3>
          <p className="text-slate-500 max-w-sm">
            {activeSubTab === "current"
              ? "All parameters are perfectly within normal ranges today. No alerts were triggered."
              : "No emails were sent out yesterday. All systems were stable."}
          </p>
        </div>
      );
    }

    // Calculations for KPIs
    const totalSchemes = data.length;
    const alertValueLabel = type === "lpcd" ? "LPCD" : type === "chlorine" ? "Chlorine" : "Pressure";
    
    // Count unique engineers
    const engineersSet = new Set<string>();
    data.forEach(r => {
      if (r.civil_engineer_email) engineersSet.add(r.civil_engineer_email);
      if (r.mechanical_engineer_email) engineersSet.add(r.mechanical_engineer_email);
      if (r.site_supervisor_email) engineersSet.add(r.site_supervisor_email);
    });
    const totalEngineers = engineersSet.size;

    // Count remarks added
    const totalRemarks = data.filter(r => parseIssues(r.remarks).length > 0).length;

    // Pagination Logic
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const paginatedData = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const startItem = (page - 1) * rowsPerPage + 1;
    const endItem = Math.min(page * rowsPerPage, data.length);

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
            <div className="h-10 w-10 shrink-0 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Total Schemes</div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{totalSchemes}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
            <div className="h-10 w-10 shrink-0 bg-red-100 text-red-500 rounded-lg flex items-center justify-center">
              <Waves className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Low {alertValueLabel} Alerts</div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{totalSchemes}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <div className="h-10 w-10 shrink-0 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Engineers Notified</div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{totalEngineers}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <div className="h-10 w-10 shrink-0 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Remarks Added</div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{totalRemarks}</div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200 w-12">#</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">Scheme Details</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">Alert Value ({alertValueLabel})</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">Notified Engineers</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-center border-x border-slate-200">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => {
                const failing = isStillFailing(row, type);
                const actualIndex = (page - 1) * rowsPerPage + idx + 1;

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

                    <td className="py-4 px-6 align-top text-center border-x border-slate-200">
                      {activeSubTab === "previous" ? (
                        <div className="flex flex-col gap-1.5 w-full max-w-[120px] mx-auto">
                          <div className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <span className="text-slate-500 font-medium">{yesterdayStr}</span>
                            <span className="font-semibold text-slate-700">{row.previous_value ?? "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <span className="text-slate-500 font-medium">{todayStr}</span>
                            <span className={`font-bold ${failing ? 'text-rose-600' : 'text-emerald-600'}`}>{row.current_value ?? "N/A"}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-base font-bold text-slate-900 mb-1">{row.current_value ?? "0"}</div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                            <AlertCircle className="w-3 h-3" />
                            Low {alertValueLabel}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 align-top text-center border-x border-slate-200">
                      {failing ? (
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
                      {(() => {
                        const hasEngineers = !!(row.civil_engineer_name || row.mechanical_engineer_name || row.site_supervisor_name);
                        
                        // Calculate real total based on available emails
                        const trueTotal = [row.civil_engineer_email, row.mechanical_engineer_email, row.site_supervisor_email].filter(Boolean).length;
                        
                        // Calculate unique acknowledgements
                        const uniqueAcks = new Set();
                        if (row.acknowledgements) {
                          row.acknowledgements.forEach((a: any) => {
                            if (a.acknowledged_at && a.engineer_email) {
                              uniqueAcks.add(a.engineer_email);
                            }
                          });
                        }
                        const ackd = uniqueAcks.size;
                        const isAllAckd = trueTotal > 0 && ackd === trueTotal;

                        return (
                          <div className="flex items-center justify-center gap-2 mt-1">
                            {hasEngineers ? (
                              <>
                                {activeSubTab === 'current' && trueTotal > 0 ? (
                                  <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${isAllAckd ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {ackd}/{trueTotal} Acknowledged
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                    Yes
                                  </span>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 shrink-0 border border-indigo-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEngineers({ title: row.scheme_name, row });
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-slate-400 border border-slate-100 px-2.5 py-1 rounded-md bg-slate-50">
                                None
                              </span>
                            )}
                          </div>
                        );
                      })()}
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
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-sm text-slate-500 font-medium">
            Showing {startItem} to {endItem} of {data.length} entries
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
              
              {/* Simple page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                // Show windows of 5 pages max around current page
                let p = i + 1;
                if (totalPages > 5 && page > 3) {
                  p = page - 2 + i;
                  if (p > totalPages) return null;
                }
                
                return (
                  <Button
                    key={p}
                    variant={page === p ? "default" : "outline"}
                    className={`h-8 w-8 text-sm ${page === p ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-slate-600 border-slate-200'}`}
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/30">
        <div className="container mx-auto p-6 space-y-6">
          
          {/* Top Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setPage(1);
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-xl mb-8 border border-slate-200 shadow-sm bg-white p-1 rounded-lg">
              <TabsTrigger value="lpcd" className="rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Water & LPCD</TabsTrigger>
              <TabsTrigger value="chlorine" className="rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Chlorine</TabsTrigger>
              <TabsTrigger value="pressure" className="rounded-md data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Pressure</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {activeTab === "lpcd"
                  ? "Water & LPCD Alerts"
                  : activeTab === "chlorine"
                  ? "Chlorine Alerts"
                  : "Pressure Alerts"}
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">
                Schemes currently violating thresholds.
              </p>
            </div>
            
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
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full">
            {activeTab === "lpcd" && renderDataTable(lpcdData, "lpcd", isLoadingLpcd)}
            {activeTab === "chlorine" && renderDataTable(chlorineData, "chlorine", isLoadingChlorine)}
            {activeTab === "pressure" && renderDataTable(pressureData, "pressure", isLoadingPressure)}
          </div>

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
              <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
                <DialogHeader className="border-b border-slate-100 pb-4">
                  <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    Notified Engineers
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium">
                    {selectedEngineers.title}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col py-2">
                  {(() => {
                    const getAckStatus = (email: string | null) => {
                      if (!selectedEngineers.row.acknowledgements || !email) return undefined;
                      const matches = selectedEngineers.row.acknowledgements.filter((a: any) => a.engineer_email === email);
                      if (matches.length === 0) return undefined;
                      return matches.find((a: any) => a.acknowledged_at) || matches[0];
                    };
                    
                    return (
                      <>
                        {selectedEngineers.row.civil_engineer_name ? renderEngineerContact(selectedEngineers.row.civil_engineer_name, selectedEngineers.row.civil_engineer_email, "Civil Engineer", getAckStatus(selectedEngineers.row.civil_engineer_email)) : <div className="text-sm text-slate-500 py-2 border-b border-slate-50">No Civil Engineer assigned</div>}
                        {selectedEngineers.row.mechanical_engineer_name ? renderEngineerContact(selectedEngineers.row.mechanical_engineer_name, selectedEngineers.row.mechanical_engineer_email, "Mechanical Engineer", getAckStatus(selectedEngineers.row.mechanical_engineer_email)) : <div className="text-sm text-slate-500 py-2 border-b border-slate-50">No Mechanical Engineer assigned</div>}
                        {selectedEngineers.row.site_supervisor_name ? renderEngineerContact(selectedEngineers.row.site_supervisor_name, selectedEngineers.row.site_supervisor_email, "Site Supervisor", getAckStatus(selectedEngineers.row.site_supervisor_email)) : <div className="text-sm text-slate-500 py-2">No Site Supervisor assigned</div>}
                      </>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
