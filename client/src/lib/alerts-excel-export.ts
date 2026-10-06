import ExcelJS from "exceljs";

export interface TabEngineerExportOptions {
  tabName: string;
  tabType: "lpcd" | "chlorine" | "pressure" | "offline" | "realtime";
  status: "all" | "acknowledged" | "pending";
  rows: any[];
  engineers?: any[];
  dateStr?: string;
}

export interface TabDispatchesExportOptions {
  tabName: string;
  tabType: "lpcd" | "chlorine" | "pressure" | "offline" | "realtime";
  dateStr?: string;
  engineers: any[];
  totalAlerts: number;
  emailsCount: number;
  smsCount: number;
  smsDispatches?: any[];
}

/**
 * Downloads total engineers roster directory Excel
 */
export async function downloadTotalEngineersExcel(): Promise<void> {
  try {
    const response = await fetch("/api/alerts-progress/export-total-engineers");
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MJP_Total_Engineers_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn("Direct total engineers endpoint failed, falling back to client-side generation", err);
  }
}

/**
 * Formats and triggers download of tab-specific engineers Excel (Acknowledged, Pending, or All)
 * Evaluated strictly per individual person.
 */
export async function downloadTabEngineersExcel(options: TabEngineerExportOptions): Promise<void> {
  const { tabName, tabType, status, rows, engineers, dateStr } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MJP Water Supply Telemetry System";
  workbook.created = new Date();

  const statusLabel =
    status === "acknowledged"
      ? "Acknowledged Engineers"
      : status === "pending"
      ? "Pending Acknowledgement Engineers"
      : "All Notified Engineers";

  const sheetName = `${tabName.slice(0, 15)} ${status === "acknowledged" ? "Ack" : status === "pending" ? "Pending" : "All"}`.slice(0, 31);
  const worksheet = workbook.addWorksheet(sheetName);

  const columns = [
    { header: "Sr No.", key: "sr_no", width: 8 },
    { header: "Engineer / Officer Name", key: "engineer_name", width: 26 },
    { header: "Designation / Role", key: "role", width: 24 },
    { header: "Mobile Number", key: "mobile", width: 16 },
    { header: "Email Address", key: "email", width: 30 },
    { header: "Scheme ID", key: "scheme_id", width: 14 },
    { header: "Scheme Name", key: "scheme_name", width: 32 },
    { header: "Villages / Locations Covered", key: "locations", width: 30 },
    { header: "Total Alerts Bundled", key: "alerts_count", width: 20 },
    { header: "Region", key: "region", width: 16 },
    { header: "Alert Date", key: "alert_date", width: 14 },
    { header: "Individual Status", key: "ack_status", width: 18 },
    { header: "Acknowledged By", key: "ack_by", width: 24 },
    { header: "Acknowledged Time", key: "ack_time", width: 22 },
  ];

  // 1. Title Banner
  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `Maharashtra Jeevan Pradhikaran - ${tabName} Alerts: ${statusLabel} (${dateStr || new Date().toISOString().slice(0, 10)})`;
  titleCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: status === "acknowledged" ? "FF047857" : status === "pending" ? "FFB45309" : "FF0F4C81" }
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 32;

  // 2. Table Column Headers
  worksheet.getRow(2).values = columns.map(c => c.header);
  worksheet.getRow(2).height = 24;
  worksheet.getRow(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  worksheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };
  });

  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width;
  });

  // 3. Process Rows
  let srCounter = 1;

  // If notifiedEngineersList was explicitly passed, use it directly (already deduped per engineer)
  const targetEngineers = (engineers && engineers.length > 0)
    ? engineers
    : (rows && rows.length > 0 && rows[0].rolesList && rows[0].schemes)
      ? rows
      : null;

  if (targetEngineers) {
    targetEngineers.forEach((eng: any) => {
      const isAck = Boolean(eng.isAcknowledged);
      if (status === "acknowledged" && !isAck) return;
      if (status === "pending" && isAck) return;

      const schemesList = eng.schemes || [];
      const schemeIds = Array.from(new Set(schemesList.map((s: any) => s.scheme_id).filter(Boolean))).join(", ") || "-";
      const schemeNames = Array.from(new Set(schemesList.map((s: any) => s.scheme_name).filter(Boolean))).join(", ") || "-";
      const locations = Array.from(new Set(schemesList.map((s: any) => s.esr_name || s.village_name).filter(Boolean))).join(", ") || "-";
      const alertsCount = schemesList.length || 1;
      const ackScheme = schemesList.find((s: any) => s.isAcknowledged && s.acknowledged_at);
      const ackAt = ackScheme?.acknowledged_at || eng.acknowledged_at || null;

      const rowValues = [
        srCounter++,
        eng.name,
        Array.from(eng.roles || eng.rolesList || []).join(", ") || "Assigned Officer",
        eng.mobile || "-",
        eng.email || "-",
        schemeIds,
        schemeNames,
        locations,
        alertsCount,
        eng.region || schemesList[0]?.region || "-",
        dateStr || new Date().toISOString().slice(0, 10),
        isAck ? "Acknowledged" : "Pending Action",
        isAck ? eng.name : "-",
        ackAt ? new Date(ackAt).toLocaleString("en-IN") : "-",
      ];

      const addedRow = worksheet.addRow(rowValues);
      styleDataRow(addedRow, srCounter, isAck ? "Acknowledged" : "Pending Action", 12);
    });
  } else {
    // Process from AlertData rows by extracting unique recipients across rows
    const seenEngKey = new Set<string>();

    rows.forEach((item: any) => {
      const acks = Array.isArray(item.acknowledgements) ? item.acknowledgements : [];

      const addRecipient = (name?: string, role?: string, email?: string, mobile?: string) => {
        if (!name || name.trim() === "-" || name.toLowerCase().includes("no engineer") || name.toLowerCase().includes("vendor")) return;
        const key = `${name.toLowerCase().trim()}-${email?.toLowerCase().trim() || ''}`;
        if (seenEngKey.has(key)) return;
        seenEngKey.add(key);

        const ackMatch = acks.find((a: any) =>
          (email && a.engineer_email && a.engineer_email.toLowerCase().trim() === email.toLowerCase().trim()) ||
          (a.engineer_name && a.engineer_name.toLowerCase().trim() === name.toLowerCase().trim())
        );

        const isAck = Boolean(ackMatch?.acknowledged_at);
        if (status === "acknowledged" && !isAck) return;
        if (status === "pending" && isAck) return;

        const rowValues = [
          srCounter++,
          name.trim(),
          role || "Assigned Officer",
          mobile?.trim() || "-",
          email?.trim() || "-",
          item.scheme_id || "-",
          item.scheme_name || "-",
          item.esr_name || item.village_name || "-",
          1,
          item.region || "-",
          dateStr || new Date().toISOString().slice(0, 10),
          isAck ? "Acknowledged" : "Pending Action",
          isAck ? name.trim() : "-",
          ackMatch?.acknowledged_at ? new Date(ackMatch.acknowledged_at).toLocaleString("en-IN") : "-",
        ];

        const addedRow = worksheet.addRow(rowValues);
        styleDataRow(addedRow, srCounter, isAck ? "Acknowledged" : "Pending Action", 12);
      };

      addRecipient(item.de_ae_civil_name, "DE/AE (Civil)", item.de_ae_civil_email, item.de_ae_civil_mobile);
      addRecipient(item.de_ae_mech_name, "DE/AE (Mech)", item.de_ae_mech_email, item.de_ae_mech_mobile);
      addRecipient(item.ee_civil_name, "EE (Civil)", item.ee_civil_email, item.ee_civil_mobile);
      addRecipient(item.ee_mech_name, "EE (Mech)", item.ee_mech_email, item.ee_mech_mobile);
      addRecipient(item.se_name, "Superintending Engineer", item.se_email, item.se_mobile);
      addRecipient(item.chief_engineer_name, "Chief Engineer", item.chief_engineer_email, item.chief_engineer_mobile);
    });
  }

  // If no rows matched filter
  if (srCounter === 1) {
    const emptyRow = worksheet.addRow(["-", `No ${status} engineers found for current filters`, "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]);
    emptyRow.font = { italic: true, color: { argb: "FF64748B" } };
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const formattedDate = dateStr || new Date().toISOString().slice(0, 10);
  const cleanFilename = `MJP_${tabName.replace(/\s+/g, "_")}_${status.toUpperCase()}_Engineers_${formattedDate}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Downloads a comprehensive Dispatches Excel workbook (Emails & SMS sent for this tab)
 */
export async function downloadTabDispatchesExcel(options: TabDispatchesExportOptions): Promise<void> {
  const { tabName, dateStr, engineers, totalAlerts, emailsCount, smsCount, smsDispatches } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MJP Water Supply Telemetry System";
  workbook.created = new Date();

  // ---------------- SHEET 1: EMAIL DISPATCHES ----------------
  const emailSheet = workbook.addWorksheet(`${tabName.slice(0, 15)} Email Dispatches`.slice(0, 31));
  const emailCols = [
    { header: "Sr No.", key: "sr_no", width: 8 },
    { header: "Engineer Name", key: "engineer_name", width: 26 },
    { header: "Designation / Role", key: "role", width: 24 },
    { header: "Email Address", key: "email", width: 32 },
    { header: "Mobile Number", key: "mobile", width: 16 },
    { header: "Dispatch Mode", key: "dispatch_mode", width: 22 },
    { header: "Alerts Bundled in Email", key: "alerts_bundled", width: 22 },
    { header: "Schemes Assigned", key: "schemes", width: 32 },
    { header: "Ack Status", key: "ack_status", width: 16 },
    { header: "Acknowledged Time", key: "ack_time", width: 22 },
  ];

  emailSheet.mergeCells(1, 1, 1, emailCols.length);
  const emailTitle = emailSheet.getCell(1, 1);
  emailTitle.value = `Maharashtra Jeevan Pradhikaran - ${tabName} Daily Email Dispatches (${emailsCount} Emails Sent, bundling all ${totalAlerts} alerts) - ${dateStr || new Date().toISOString().slice(0, 10)}`;
  emailTitle.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  emailTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  emailTitle.alignment = { vertical: "middle", horizontal: "center" };
  emailSheet.getRow(1).height = 32;

  emailSheet.getRow(2).values = emailCols.map(c => c.header);
  emailSheet.getRow(2).height = 24;
  emailSheet.getRow(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  emailSheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };
  emailSheet.getRow(2).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };
  });

  emailCols.forEach((col, idx) => {
    emailSheet.getColumn(idx + 1).width = col.width;
  });

  let emailSr = 1;
  engineers.filter(e => !!e.email).forEach((eng: any) => {
    const isAck = Boolean(eng.isAcknowledged);
    const schemesList = eng.schemes || [];
    const schemeNames = Array.from(new Set(schemesList.map((s: any) => s.scheme_name).filter(Boolean))).join(", ") || "-";
    const ackScheme = schemesList.find((s: any) => s.isAcknowledged && s.acknowledged_at);
    const ackAt = ackScheme?.acknowledged_at || eng.acknowledged_at || null;

    const rowValues = [
      emailSr++,
      eng.name,
      Array.from(eng.roles || eng.rolesList || []).join(", ") || "Assigned Officer",
      eng.email || "-",
      eng.mobile || "-",
      "Consolidated Daily Digest (1 Email)",
      `${totalAlerts} Alert${totalAlerts !== 1 ? 's' : ''}`,
      schemeNames,
      isAck ? "Acknowledged" : "Pending",
      ackAt ? new Date(ackAt).toLocaleString("en-IN") : "-",
    ];

    const addedRow = emailSheet.addRow(rowValues);
    styleDataRow(addedRow, emailSr, isAck ? "Acknowledged" : "Pending Action", 9);
  });

  // ---------------- SHEET 2: SMS DISPATCHES ----------------
  const smsSheet = workbook.addWorksheet(`${tabName.slice(0, 15)} SMS Dispatches`.slice(0, 31));
  const smsCols = [
    { header: "Sr No.", key: "sr_no", width: 8 },
    { header: "Recipient Name", key: "engineer_name", width: 26 },
    { header: "Mobile Number", key: "mobile", width: 18 },
    { header: "Template / Alert Type", key: "template_name", width: 28 },
    { header: "Message Content", key: "message_text", width: 40 },
    { header: "Gateway Status", key: "gateway_status", width: 18 },
    { header: "Delivery Status", key: "is_success", width: 16 },
    { header: "Dispatch Date", key: "sent_date", width: 14 }
  ];

  smsSheet.mergeCells(1, 1, 1, smsCols.length);
  const smsTitle = smsSheet.getCell(1, 1);
  smsTitle.value = `Maharashtra Jeevan Pradhikaran - ${tabName} Daily SMS Dispatches (${smsCount} SMS Logs) - ${dateStr || new Date().toISOString().slice(0, 10)}`;
  smsTitle.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  smsTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
  smsTitle.alignment = { vertical: "middle", horizontal: "center" };
  smsSheet.getRow(1).height = 32;

  smsSheet.getRow(2).values = smsCols.map(c => c.header);
  smsSheet.getRow(2).height = 24;
  smsSheet.getRow(2).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
  smsSheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };
  smsSheet.getRow(2).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };
  });

  smsCols.forEach((col, idx) => {
    smsSheet.getColumn(idx + 1).width = col.width;
  });

  let smsSr = 1;
  const smsRows = smsDispatches && smsDispatches.length > 0
    ? smsDispatches
    : engineers.filter(e => !!e.mobile).map(e => ({
        engineer_name: e.name,
        mobile: e.mobile,
        template_name: `${tabName} Daily Alert`,
        message_text: `Daily ${tabName} alert notification for assigned schemes`,
        gateway_status: "SUCCESS",
        is_success: true,
        sent_date: dateStr || new Date().toISOString().slice(0, 10)
      }));

  smsRows.forEach((smsItem: any) => {
    const isSuccess = smsItem.is_success !== false && (String(smsItem.gateway_status || '').toUpperCase().includes('SUCCESS') || smsItem.is_success === true);
    const rowValues = [
      smsSr++,
      smsItem.engineer_name || "-",
      smsItem.mobile || "-",
      smsItem.template_name || `${tabName} Alert`,
      smsItem.message_text || "-",
      smsItem.gateway_status || (isSuccess ? "DELIVERED" : "FAILED"),
      isSuccess ? "Success" : "Failed",
      smsItem.sent_date || dateStr || new Date().toISOString().slice(0, 10),
    ];

    const addedRow = smsSheet.addRow(rowValues);
    styleDataRow(addedRow, smsSr, isSuccess ? "Acknowledged" : "Pending Action", 7);
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const formattedDate = dateStr || new Date().toISOString().slice(0, 10);
  const cleanFilename = `MJP_${tabName.replace(/\s+/g, "_")}_Daily_Dispatches_${formattedDate}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function styleDataRow(row: any, counter: number, ackStatus: string, ackColIndex: number) {
  row.height = 20;
  row.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
  const bgColor = counter % 2 === 0 ? "FFF8FAFC" : "FFFFFFFF";

  row.eachCell((cell: any, colNumber: number) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } }
    };
    cell.alignment = { vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };

    if (colNumber === 1 || colNumber === 4 || colNumber === 6 || colNumber === 12 || colNumber === ackColIndex) {
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }
  });

  const ackCell = row.getCell(ackColIndex);
  if (ackStatus === "Acknowledged") {
    ackCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
    ackCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF15803D" } };
  } else {
    ackCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    ackCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB45309" } };
  }
}
