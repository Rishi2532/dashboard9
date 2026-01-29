import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  return num.toString();
}

export function calculatePercentage(
  value: number | undefined | null,
  total: number | undefined | null,
): number {
  if (!value || !total || total === 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

export type SchemeCompletionStatus =
  | "Fully-Completed"
  | "Fully Completed"
  | "Completed"
  | "In Progress"
  | string;

export function getStatusColorClass(status: SchemeCompletionStatus): string {
  if (!status) return "bg-neutral-50 text-neutral-600";

  const statusLower = status.toLowerCase();

  if (
    statusLower.includes("fully") ||
    statusLower === "completed" ||
    statusLower === "fully completed" ||
    statusLower === "functional"
  ) {
    return "bg-green-100 text-green-800";
  } else if (statusLower.includes("progress") || statusLower === "partial") {
    return "bg-orange-100 text-orange-800";
  } else if (statusLower.includes("not") || statusLower.includes("non")) {
    return "bg-red-100 text-red-800";
  }

  // Handle special explicit cases
  switch (status) {
    case "Fully-Completed":
    case "Fully Completed":
    case "Completed":
    case "Functional":
      return "bg-green-100 text-green-800";
    case "In Progress":
    case "Partial":
      return "bg-orange-100 text-orange-800";
    case "Not-Connected":
    case "Non Functional":
      return "bg-red-100 text-red-800";
    default:
      return "bg-neutral-50 text-neutral-600";
  }
}

export function getStatusDisplayName(status: SchemeCompletionStatus): string {
  if (!status) return "Unknown";

  // Handle potential whitespace issues
  const cleanStatus = status.toString().trim();

  switch (cleanStatus.toLowerCase()) {
    case "fully-completed":
    case "completed":
    case "fully completed":
      return "Fully Completed";
    case "not-connected":
      return "Not Connected";
    case "partial":
    case "in progress":
      return "In Progress";
    case "functional":
      return "Functional";
    default:
      return cleanStatus;
  }
}

// Function to get agency based on region name with proper M/s formatting (small 's')
export function getAgencyByRegion(
  regionName: string | null | undefined,
): string {
  if (!regionName) return "N/A";

  switch (regionName) {
    case "Nagpur":
      return "M/s Rite Water";
    case "Chhatrapati Sambhajinagar":
      return "M/s Rite Water";
    case "Pune":
    case "Konkan":
      return "M/s Indo/Chetas";
    case "Nashik":
    case "Amravati":
      return "M/s Ceinsys";
    default:
      return "N/A";
  }
}
