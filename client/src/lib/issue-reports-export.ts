import * as XLSX from "xlsx";

export interface IssueReportExportItem {
  id: number;
  problem_level: string;
  region: string;
  scheme_id: string;
  scheme_name: string;
  village_name?: string;
  esr_name?: string;
  status_value: string;
  reason: string;
  sensor_type?: string;
  status: "Active" | "Resolved" | string;
  resolution_remark?: string;
  created_at: string;
  resolved_at?: string;
  creator_name?: string;
}

/**
 * Downloads issue reports to Excel (.xlsx) client-side
 */
export function exportIssueReportsToExcel(
  items: IssueReportExportItem[],
  filenamePrefix = "MJP_Issue_Reports"
) {
  if (!items || items.length === 0) {
    throw new Error("No issue reports available to export.");
  }

  const rows = items.map((item, idx) => {
    const createdDate = item.created_at
      ? new Date(item.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "-";
    const resolvedDate = item.resolved_at
      ? new Date(item.resolved_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "-";

    return {
      "Sr No": idx + 1,
      "Report ID": `#${item.id}`,
      "Problem Level": item.problem_level,
      "Region": item.region || "-",
      "Scheme ID": item.scheme_id,
      "Scheme Name": item.scheme_name,
      "Village Name": item.village_name || "-",
      "ESR / Location Name": item.esr_name || "-",
      "Sensor Type": item.sensor_type || "-",
      "Status / Value": item.status_value || "-",
      "Issue Reason / Justification": item.reason || "-",
      "Issue Status": item.status || "Active",
      "Submitted By": item.creator_name || "Unknown",
      "Submitted At": createdDate,
      "Resolution Status": item.status === "Resolved" ? "Resolved" : "Pending",
      "Resolution Remark": item.resolution_remark || "-",
      "Resolved At": resolvedDate,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Issue Reports");

  ws["!cols"] = [
    { wch: 6 },  // Sr No
    { wch: 11 }, // Report ID
    { wch: 14 }, // Problem Level
    { wch: 18 }, // Region
    { wch: 14 }, // Scheme ID
    { wch: 32 }, // Scheme Name
    { wch: 22 }, // Village Name
    { wch: 22 }, // ESR Name
    { wch: 16 }, // Sensor Type
    { wch: 25 }, // Status / Value
    { wch: 38 }, // Issue Reason / Justification
    { wch: 14 }, // Issue Status
    { wch: 22 }, // Submitted By
    { wch: 22 }, // Submitted At
    { wch: 16 }, // Resolution Status
    { wch: 30 }, // Resolution Remark
    { wch: 22 }, // Resolved At
  ];

  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `${filenamePrefix}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Triggers download of ALL issue reports from the backend directly
 */
export function downloadAllIssueReportsBackend(region?: string) {
  const params = new URLSearchParams();
  if (region && region !== "All Regions" && region !== "all") {
    params.set("region", region);
  }
  const url = `/api/issue-reporting/export-excel?${params.toString()}`;
  window.location.href = url;
}
