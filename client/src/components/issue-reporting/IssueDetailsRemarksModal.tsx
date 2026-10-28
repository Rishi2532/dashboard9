import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Calendar,
  Clock,
  User,
  History,
  CheckCircle2,
  Lock,
  Send,
  Loader2,
  MapPin,
  Building2,
  Wrench,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  evaluateIssueDeadline,
  formatReadableDate,
  type IssueDeadlineEvaluation,
} from "@shared/issue-deadline-utils";

export interface IssueModalItem {
  id: number;
  problem_level?: string;
  category?: string;
  region?: string;
  scheme_id?: string;
  scheme_name?: string;
  village_name?: string;
  esr_name?: string;
  status_value?: string;
  reason?: string;
  issue_description?: string;
  remarks?: string;
  agency_issue?: string;
  department_issue?: string;
  sensor_type?: string;
  status?: string;
  resolution_remark?: string;
  resolved_at?: string;
  created_at?: string;
  created_by?: number | string | null;
  creator_name?: string;
  reported_by?: string;
  expected_resolution_date?: string | null;
}

export interface IssueDetailsRemarksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  issues: IssueModalItem[];
  selectedIssueId?: number;
  onIssueUpdated?: () => void;
  /**
   * Only true on the Issue Reporting page (/helpdesk/issue-reporting).
   * Everywhere else (LPCD, Chlorine, Pressure, Water Consumption, etc.),
   * this is false so users only see the Issue and its Expected Resolution Date without Action Taken tabs.
   */
  isIssueReportingPage?: boolean;
}

export function IssueDetailsRemarksModal({
  open,
  onOpenChange,
  title,
  issues,
  selectedIssueId: initialSelectedIssueId,
  onIssueUpdated,
  isIssueReportingPage = false,
}: IssueDetailsRemarksModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"action_taken" | "resolution_date">("action_taken");
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number>(0);
  const [actionText, setActionText] = useState("");
  const [actionError, setActionError] = useState("");

  // Select initial issue if provided
  useEffect(() => {
    if (initialSelectedIssueId && issues?.length) {
      const idx = issues.findIndex((i) => i.id === initialSelectedIssueId);
      if (idx !== -1) setSelectedIssueIndex(idx);
    } else {
      setSelectedIssueIndex(0);
    }
  }, [initialSelectedIssueId, issues]);

  const currentIssue = issues && issues.length > 0 ? issues[selectedIssueIndex] : null;
  const currentIssueId = currentIssue?.id;

  useEffect(() => {
    setActionText("");
    setActionError("");
  }, [currentIssueId]);

  const deadlineEval = evaluateIssueDeadline(currentIssue?.expected_resolution_date);

  // Check if logged-in user is the creator who submitted this specific issue
  const isReporter = Boolean(
    currentIssue && user && (
      (currentIssue.created_by && Number(user.id) === Number(currentIssue.created_by)) ||
      (currentIssue.creator_name && user.username && currentIssue.creator_name.toLowerCase() === user.username.toLowerCase()) ||
      (currentIssue.creator_name && user.name && currentIssue.creator_name.toLowerCase() === user.name.toLowerCase())
    )
  );

  // Fetch Action Taken history for current issue (only when on issue-reporting page)
  const {
    data: actionHistory = [],
    isLoading: isLoadingActions,
    refetch: refetchActions,
  } = useQuery<any[]>({
    queryKey: ["issue-actions", currentIssueId],
    queryFn: async () => {
      if (!currentIssueId) return [];
      const res = await apiRequest(`/api/issue-reporting/${currentIssueId}/actions`);
      return res;
    },
    enabled: Boolean(open && currentIssueId && isIssueReportingPage),
  });

  // Fetch Deadline history for current issue (only when on issue-reporting page)
  const {
    data: deadlineData,
    isLoading: isLoadingDeadline,
  } = useQuery<any>({
    queryKey: ["issue-deadline", currentIssueId],
    queryFn: async () => {
      if (!currentIssueId) return null;
      const res = await apiRequest(`/api/issue-reporting/${currentIssueId}/deadline`);
      return res;
    },
    enabled: Boolean(open && currentIssueId && isIssueReportingPage),
  });

  // Action submission mutation
  const actionMutation = useMutation({
    mutationFn: async (desc: string) => {
      if (!currentIssueId) throw new Error("No issue selected");
      return await apiRequest(`/api/issue-reporting/${currentIssueId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action_description: desc }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Action Recorded",
        description: "Your corrective action has been saved successfully.",
      });
      setActionText("");
      setActionError("");
      refetchActions();
      queryClient.invalidateQueries({ queryKey: ["issue-reporting"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issue-reporting/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issue-reporting/active"] });
      if (onIssueUpdated) onIssueUpdated();
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to record action";
      setActionError(msg);
      toast({
        title: "Action Rejected",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const handleSaveAction = () => {
    const trimmed = actionText.trim();
    if (!trimmed) {
      setActionError("Action description cannot be empty or whitespace only.");
      return;
    }
    setActionError("");
    actionMutation.mutate(trimmed);
  };

  if (!open) return null;

  const hasActive = issues?.some((i) => (i.status || "Active").toLowerCase() !== "resolved");
  const headerGradient = hasActive
    ? "from-red-600 via-rose-600 to-red-700"
    : "from-emerald-600 via-teal-600 to-emerald-700";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white border-none shadow-2xl p-0 overflow-hidden rounded-xl">
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerGradient} p-6 flex justify-between items-start text-white relative`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex-1 pr-6">
            <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
              <AlertCircle className="h-6 w-6 text-white/90 shrink-0" />
              <span className="tracking-tight">Issue Details & Remarks History</span>
            </DialogTitle>
            <DialogDescription className="text-white/90 mt-2 font-medium flex items-center gap-1.5 text-xs md:text-sm">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{title}</span>
            </DialogDescription>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODE A: NON-ISSUE-REPORTING PAGES (LPCD, Chlorine, Water, etc) */}
        {/* Shows Issue details and only Expected Resolution Date (read-only) */}
        {/* ============================================================== */}
        {!isIssueReportingPage ? (
          <div className="p-5 md:p-6 overflow-y-auto max-h-[75vh] bg-slate-50 space-y-4">
            {(!issues || issues.length === 0) ? (
              <div className="text-center py-12 text-slate-500">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">No issue reports or remarks recorded yet.</p>
              </div>
            ) : (
              issues.map((iss, index) => {
                const itemEval = evaluateIssueDeadline(iss.expected_resolution_date);
                const isResolved = (iss.status || "").toLowerCase() === "resolved";

                return (
                  <div
                    key={iss.id || index}
                    className={`bg-white p-5 rounded-xl shadow-xs border border-slate-200 ${isResolved ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-red-500"
                      }`}
                  >
                    <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                          {iss.problem_level ? `${iss.problem_level} Level` : iss.category || "General"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${isResolved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                        >
                          {iss.status || "Active"}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-900">
                          {iss.creator_name || iss.reported_by || "Field Engineer"}
                        </div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap">
                          {iss.created_at
                            ? new Date(iss.created_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                            : "Recently Reported"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 mt-2">
                      {iss.agency_issue && (
                        <div className="text-xs bg-blue-50/70 text-blue-900 p-2 rounded border border-blue-100 flex items-start gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-blue-800">Agency Issue:</span>{" "}
                            {iss.agency_issue}
                          </div>
                        </div>
                      )}

                      {iss.department_issue && (
                        <div className="text-xs bg-indigo-50/70 text-indigo-900 p-2 rounded border border-indigo-100 flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-indigo-800">Department Issue:</span>{" "}
                            {iss.department_issue}
                          </div>
                        </div>
                      )}

                      {!iss.agency_issue && !iss.department_issue && (iss.reason || iss.issue_description) && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                          <p className="text-sm text-slate-700 font-medium">
                            {iss.reason || iss.issue_description}
                          </p>
                        </div>
                      )}
                      {iss.remarks && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 mt-1">
                          <span className="font-semibold text-slate-800">Additional Remarks:</span> {iss.remarks}
                        </div>
                      )}
                      {isResolved && iss.resolution_remark && (
                        <div className="text-xs text-emerald-800 mt-2 pt-2 border-t border-emerald-100">
                          <span className="font-semibold">Resolution Remark:</span> {iss.resolution_remark}
                        </div>
                      )}

                      {/* Expected Resolution Date: Clean Read-Only Display */}
                      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Calendar className="h-4 w-4 text-amber-600" />
                          <span className="text-slate-500">Expected Resolution Date:</span>
                          <span className="font-semibold text-slate-900">
                            {iss.expected_resolution_date ? formatReadableDate(iss.expected_resolution_date) : "Not Set"}
                          </span>
                        </div>
                        {iss.expected_resolution_date && (
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${itemEval.status === "overdue"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : itemEval.status === "due_today"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                          >
                            {itemEval.statusLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* MODE B: ISSUE REPORTING PAGE (/helpdesk/issue-reporting)       */
          /* Shows Issue details, Action Taken tab, and Expected Res Date tab */
          /* ============================================================== */
          <div className="p-5 md:p-6 overflow-y-auto max-h-[75vh] bg-slate-50 space-y-4">
            {/* Issue Selector when multiple issues exist */}
            {issues && issues.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
                  Issues ({issues.length}):
                </span>
                {issues.map((iss, idx) => (
                  <button
                    key={iss.id || idx}
                    onClick={() => setSelectedIssueIndex(idx)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${idx === selectedIssueIndex
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    Issue #{iss.id || idx + 1}
                  </button>
                ))}
              </div>
            )}

            {currentIssue ? (
              <>
                {/* Issue Details summary card */}
                <div
                  className={`bg-white p-4 md:p-5 rounded-xl shadow-xs border border-slate-200 ${currentIssue.status === "Resolved"
                    ? "border-l-4 border-l-emerald-500"
                    : "border-l-4 border-l-red-500"
                    }`}
                >
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                        {currentIssue.problem_level
                          ? `${currentIssue.problem_level} Level`
                          : currentIssue.category || "General"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${currentIssue.status === "Resolved"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {currentIssue.status || "Active"}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-medium text-slate-900">
                        {currentIssue.creator_name || currentIssue.reported_by || "Field Engineer"}
                      </div>
                      <div className="text-[11px] text-slate-500 whitespace-nowrap">
                        {currentIssue.created_at
                          ? new Date(currentIssue.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })
                          : "Recently Reported"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    {currentIssue.agency_issue && (
                      <div className="text-xs bg-blue-50/70 text-blue-900 p-2 rounded border border-blue-100 flex items-start gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-blue-800">Agency Issue:</span>{" "}
                          {currentIssue.agency_issue}
                        </div>
                      </div>
                    )}

                    {currentIssue.department_issue && (
                      <div className="text-xs bg-indigo-50/70 text-indigo-900 p-2 rounded border border-indigo-100 flex items-start gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-indigo-800">Department Issue:</span>{" "}
                          {currentIssue.department_issue}
                        </div>
                      </div>
                    )}

                    {!currentIssue.agency_issue && !currentIssue.department_issue && (currentIssue.reason || currentIssue.issue_description) && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                        <p className="text-sm text-slate-700 font-medium">
                          {currentIssue.reason || currentIssue.issue_description}
                        </p>
                      </div>
                    )}
                    {currentIssue.remarks && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 mt-1">
                        <span className="font-semibold text-slate-800">Additional Remarks:</span> {currentIssue.remarks}
                      </div>
                    )}
                  </div>
                </div>

                {/* Two Tabs inside Issue Details & Remarks History */}
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                  <TabsList className="grid grid-cols-2 bg-slate-200/70 p-1 rounded-lg">
                    <TabsTrigger
                      value="action_taken"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm font-semibold text-xs md:text-sm flex items-center justify-center gap-1.5 py-2"
                    >
                      <Wrench className="w-4 h-4 text-blue-600" />
                      <span>Action Taken</span>
                      {actionHistory?.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 bg-blue-100 text-blue-800">
                          {actionHistory.length}
                        </Badge>
                      )}
                    </TabsTrigger>

                    <TabsTrigger
                      value="resolution_date"
                      className="data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-sm font-semibold text-xs md:text-sm flex items-center justify-center gap-1.5 py-2"
                    >
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>Expected Resolution Date</span>
                      {deadlineEval.status !== "not_set" && (
                        <span
                          className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${deadlineEval.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : deadlineEval.status === "due_today"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-700"
                            }`}
                        >
                          {deadlineEval.statusLabel}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: ACTION TAKEN */}
                  <TabsContent value="action_taken" className="mt-4 space-y-4">
                    {/* Action Taken Input: Controlled by Reporter Permissions & Deadline */}
                    {isReporter ? (
                      deadlineEval.status === "not_set" ? (
                        /* Missing deadline warning */
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs md:text-sm space-y-1">
                            <p className="font-semibold text-amber-950">Expected Resolution Date Required</p>
                            <p className="text-amber-800">Set an Expected Resolution Date before recording an action.</p>
                          </div>
                        </div>
                      ) : deadlineEval.isExpired ? (
                        /* Locked after deadline */
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-900">
                          <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="text-xs md:text-sm space-y-1">
                            <p className="font-semibold text-red-950">Action Recording Locked</p>
                            <p className="text-red-800">
                              The expected resolution date has passed. Adding or modifying actions for this issue is no longer permitted.
                            </p>
                            <p className="text-[11px] text-red-600 mt-1 font-mono">
                              Deadline was: {deadlineEval.formattedDate} (23:59:59 IST)
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Input Form (Only for the person who submitted this issue) */
                        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor={`action-textarea-${currentIssue.id}`}
                              className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                            >
                              <Wrench className="w-3.5 h-3.5 text-blue-600" />
                              Record Action Taken
                            </label>
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                              {deadlineEval.status === "due_today" ? "Due Today" : `Eligible until ${deadlineEval.formattedDate}`}
                            </span>
                          </div>

                          <Textarea
                            id={`action-textarea-${currentIssue.id}`}
                            placeholder="Describe the corrective action taken for this issue..."
                            value={actionText}
                            onChange={(e) => {
                              setActionText(e.target.value);
                              if (actionError) setActionError("");
                            }}
                            rows={3}
                            className="text-sm bg-white border-slate-300 focus-visible:ring-blue-500 resize-y"
                          />

                          {actionError && (
                            <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {actionError}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500">
                              Deadline: <strong className="text-slate-700">{deadlineEval.formattedDate}</strong>
                            </span>
                            <Button
                              size="sm"
                              onClick={handleSaveAction}
                              disabled={actionMutation.isPending || !actionText.trim()}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
                            >
                              {actionMutation.isPending ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  Saving Action...
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5 mr-1.5" />
                                  Save Action
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    ) : (
                      /* Non-reporters view: Restricted from entering actions */
                      <div className="bg-slate-100/90 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-slate-600">
                        <div className="p-2 rounded-lg bg-slate-200/70 text-slate-500 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="text-xs md:text-sm">
                          <p className="font-semibold text-slate-800">Action Recording Restricted</p>
                          <p className="text-slate-500 mt-0.5">
                            Only the person who submitted this issue ({currentIssue.creator_name || "the issue reporter"}) can record corrective actions.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action History Timeline */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          Action History
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {actionHistory.length} {actionHistory.length === 1 ? "entry" : "entries"} recorded
                        </span>
                      </div>

                      {isLoadingActions ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-xs">Loading action history...</p>
                        </div>
                      ) : actionHistory.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-1">
                          <p className="text-sm font-semibold text-slate-700">No actions recorded yet.</p>
                          <p className="text-xs text-slate-400">
                            Corrective actions taken for this issue will appear here chronologically.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {actionHistory.map((act: any) => (
                            <div
                              key={act.id}
                              className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                  <User className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{act.creator_name || "Authorized User"}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>
                                    {act.created_at
                                      ? new Date(act.created_at).toLocaleString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      })
                                      : "Recorded"}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs md:text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                                {act.action_description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* TAB 2: EXPECTED RESOLUTION DATE (Strictly Read-Only, No Update Allowed) */}
                  <TabsContent value="resolution_date" className="mt-4 space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                      {/* Current Deadline Display */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                            Current Deadline
                          </span>
                          <div className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <span>{deadlineEval.formattedDate || "Not Set"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">Status:</span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${deadlineEval.status === "overdue"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : deadlineEval.status === "due_today"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : deadlineEval.status === "upcoming"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                          >
                            {deadlineEval.statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Deadline description & lock rule note */}
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                        <p className="font-semibold text-slate-800">Deadline Rule:</p>
                        <p className="text-slate-600">
                          Action Taken entries are permitted throughout the Expected Resolution Date (until 23:59:59 IST)
                          and locked starting at 00:00:00 on the following day in Indian Standard Time (IST).
                        </p>
                      </div>
                    </div>

                    {/* Deadline Record History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        Deadline Record History
                      </h4>

                      {isLoadingDeadline ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                          <p className="text-xs">Loading deadline history...</p>
                        </div>
                      ) : !deadlineData?.history || deadlineData.history.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-1">
                          <p className="text-xs text-slate-400">
                            No deadline record found for this issue.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {deadlineData.history.map((rev: any) => (
                            <div
                              key={rev.id}
                              className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-medium">Initial Set</span>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                <Badge variant="outline" className="font-semibold text-blue-700 bg-blue-50 border-blue-200">
                                  {formatReadableDate(rev.new_date)}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span>By: {rev.changer_name || "Reporter"}</span>
                                <span>•</span>
                                <span>
                                  {rev.created_at
                                    ? new Date(rev.created_at).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })
                                    : "Saved"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm">No issue selected.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
