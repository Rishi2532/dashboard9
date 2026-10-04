import ExcelJS from "exceljs";

export interface TabEngineerExportOptions {
  tabName: string;
  tabType: "lpcd" | "chlorine" | "pressure" | "offline" | "realtime";
  status: "all" | "acknowledged" | "pending";
  rows: any[];
  dateStr?: string;
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
 */
export async function downloadTabEngineersExcel(options: TabEngineerExportOptions): Promise<void> {
  const { tabName, tabType, status, rows, dateStr } = options;

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
    { header: "Village Name", key: "village_name", width: 22 },
    { header: "ESR Name", key: "esr_name", width: 24 },
    { header: "Region", key: "region", width: 16 },
    { header: "Alert Value / Parameter", key: "alert_value", width: 22 },
    { header: "Alert Date", key: "alert_date", width: 14 },
    { header: "Ack Status", key: "ack_status", width: 16 },
    { header: "Acknowledged By", key: "ack_by", width: 24 },
    { header: "Acknowledged Time", key: "ack_time", width: 22 },
    { header: "Ticket ID", key: "ticket_id", width: 18 }
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

  rows.forEach(item => {
    // If the item is already an engineer entry from notifiedEngineersList
    if (item.rolesList && item.schemes) {
      const eng = item;
      eng.schemes.forEach((sch: any) => {
        if (status === "acknowledged" && !sch.isAcknowledged) return;
        if (status === "pending" && sch.isAcknowledged) return;

        const rowValues = [
          srCounter++,
          eng.name,
          Array.from(eng.rolesList).join(", ") || "Assigned Officer",
          eng.mobile || "-",
          eng.email || "-",
          sch.scheme_id || "-",
          sch.scheme_name || "-",
          sch.village_name || "-",
          sch.esr_name || "-",
          sch.region || "-",
          sch.current_value || sch.alert_value || "-",
          dateStr || new Date().toISOString().slice(0, 10),
          sch.isAcknowledged ? "Acknowledged" : "Pending Action",
          sch.isAcknowledged ? eng.name : "-",
          sch.acknowledged_at ? new Date(sch.acknowledged_at).toLocaleString("en-IN") : "-",
          sch.ticket_id || "-"
        ];

        const addedRow = worksheet.addRow(rowValues);
        styleDataRow(addedRow, srCounter, sch.isAcknowledged ? "Acknowledged" : "Pending Action", 13);
      });
      return;
    }

    // If item is an AlertData scheme row
    const acks = Array.isArray(item.acknowledgements) ? item.acknowledgements : [];
    const isAck = acks.some((a: any) => a.acknowledged_at) || Boolean(item.acknowledged_at) || Boolean(item.is_acknowledged);

    if (status === "acknowledged" && !isAck) return;
    if (status === "pending" && isAck) return;

    // Collect all contacts for this scheme
    const recs: { name: string; role: string; email: string; mobile: string; isAck: boolean; ackAt: string | null }[] = [];

    const addRec = (name?: string, role?: string, email?: string, mobile?: string) => {
      if (!name || name.trim() === "-" || name.toLowerCase().includes("no engineer") || name.toLowerCase().includes("vendor")) return;
      const ackMatch = acks.find((a: any) =>
        (email && a.engineer_email && a.engineer_email.toLowerCase().trim() === email.toLowerCase().trim()) ||
        (a.engineer_name && a.engineer_name.toLowerCase().trim() === name.toLowerCase().trim())
      );
      recs.push({
        name: name.trim(),
        role: role || "Engineer",
        email: email?.trim() || "-",
        mobile: mobile?.trim() || "-",
        isAck: Boolean(ackMatch?.acknowledged_at || item.acknowledged_at),
        ackAt: ackMatch?.acknowledged_at || item.acknowledged_at || null
      });
    };

    addRec(item.de_ae_civil_name, "DE/AE (Civil)", item.de_ae_civil_email, item.de_ae_civil_mobile);
    addRec(item.de_ae_mech_name, "DE/AE (Mech)", item.de_ae_mech_email, item.de_ae_mech_mobile);
    addRec(item.ee_civil_name, "EE (Civil)", item.ee_civil_email, item.ee_civil_mobile);
    addRec(item.ee_mech_name, "EE (Mech)", item.ee_mech_email, item.ee_mech_mobile);
    addRec(item.se_name, "SE", item.se_email, item.se_mobile);
    addRec(item.chief_engineer_name, "CE", item.chief_engineer_email, item.chief_engineer_mobile);
    if (item.vendor_name) {
      addRec(item.vendor_name, "Agency / Vendor", item.vendor_email, item.vendor_phone);
    }

    if (recs.length === 0) {
      recs.push({
        name: item.engineer_name || item.acknowledged_by || "Scheme Incharge",
        role: "Field Incharge",
        email: item.engineer_email || "-",
        mobile: "-",
        isAck,
        ackAt: item.acknowledged_at || null
      });
    }

    recs.forEach(rec => {
      if (status === "acknowledged" && !rec.isAck) return;
      if (status === "pending" && rec.isAck) return;

      const unit =
        tabType === "lpcd" ? "LPCD" : tabType === "chlorine" ? "mg/L" : tabType === "pressure" ? "Bar" : "Offline";
      const valStr = `${item.current_value ?? item.alert_value ?? "-"} ${unit}`;

      const rowValues = [
        srCounter++,
        rec.name,
        rec.role,
        rec.mobile,
        rec.email,
        item.scheme_id || "-",
        item.scheme_name || "-",
        item.village_name || "-",
        item.esr_name || "-",
        item.region || "-",
        valStr,
        item.sent_date ? String(item.sent_date).slice(0, 10) : dateStr || new Date().toISOString().slice(0, 10),
        rec.isAck ? "Acknowledged" : "Pending Action",
        rec.isAck ? rec.name : "-",
        rec.ackAt ? new Date(rec.ackAt).toLocaleString("en-IN") : "-",
        item.ticket_id || "-"
      ];

      const addedRow = worksheet.addRow(rowValues);
      styleDataRow(addedRow, srCounter, rec.isAck ? "Acknowledged" : "Pending Action", 13);
    });
  });

  // If no rows matched filter
  if (srCounter === 1) {
    const emptyRow = worksheet.addRow(["-", `No ${status} engineers found for current filters`, "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]);
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
