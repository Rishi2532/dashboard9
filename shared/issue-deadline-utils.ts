/**
 * Utility functions for evaluating issue expected resolution dates and deadlines in IST (Indian Standard Time).
 */

export type IssueDeadlineStatus = "not_set" | "overdue" | "due_today" | "upcoming";

export interface IssueDeadlineEvaluation {
  status: IssueDeadlineStatus;
  statusLabel: string;
  formattedDate: string;
  isExpired: boolean;
  isDueToday: boolean;
  isOverdue: boolean;
  isUpcoming: boolean;
  daysDiff: number;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Returns the current date (or provided date) formatted as YYYY-MM-DD in Asia/Kolkata (IST).
 */
export function getIstDateStr(d?: Date | string | null): string {
  if (!d) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  if (typeof d === "string") {
    // If already in YYYY-MM-DD format
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into a clean, human-readable format: "DD Mon YYYY".
 * Example: "2026-10-28" -> "28 Oct 2026"
 */
export function formatReadableDate(val?: string | Date | null): string {
  if (!val) return "";

  const istStr = getIstDateStr(val);
  if (!istStr) return "";

  const parts = istStr.split("-");
  if (parts.length !== 3) return "";

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (monthIdx < 0 || monthIdx > 11 || isNaN(day)) return "";

  const monthName = MONTHS_SHORT[monthIdx] || "";
  return `${String(day).padStart(2, "0")} ${monthName} ${year}`;
}

/**
 * Evaluates the status of an issue's expected resolution date against current IST date.
 * - Deadline expires at 23:59:59 IST on the specified expected resolution date.
 */
export function evaluateIssueDeadline(
  deadlineStr?: string | Date | null
): IssueDeadlineEvaluation {
  if (!deadlineStr) {
    return {
      status: "not_set",
      statusLabel: "Not Set",
      formattedDate: "Not Set",
      isExpired: false,
      isDueToday: false,
      isOverdue: false,
      isUpcoming: false,
      daysDiff: 0,
    };
  }

  const targetDateStr = getIstDateStr(deadlineStr);
  if (!targetDateStr) {
    return {
      status: "not_set",
      statusLabel: "Not Set",
      formattedDate: "Not Set",
      isExpired: false,
      isDueToday: false,
      isOverdue: false,
      isUpcoming: false,
      daysDiff: 0,
    };
  }

  const todayStr = getIstDateStr();
  const formatted = formatReadableDate(targetDateStr) || targetDateStr;

  const todayTime = new Date(`${todayStr}T00:00:00+05:30`).getTime();
  const targetTime = new Date(`${targetDateStr}T00:00:00+05:30`).getTime();
  const diffMs = targetTime - todayTime;
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return {
      status: "due_today",
      statusLabel: "Due Today",
      formattedDate: formatted,
      isExpired: false,
      isDueToday: true,
      isOverdue: false,
      isUpcoming: false,
      daysDiff: 0,
    };
  } else if (daysDiff < 0) {
    return {
      status: "overdue",
      statusLabel: "Overdue",
      formattedDate: formatted,
      isExpired: true,
      isDueToday: false,
      isOverdue: true,
      isUpcoming: false,
      daysDiff,
    };
  } else {
    return {
      status: "upcoming",
      statusLabel: "On Track",
      formattedDate: formatted,
      isExpired: false,
      isDueToday: false,
      isOverdue: false,
      isUpcoming: true,
      daysDiff,
    };
  }
}