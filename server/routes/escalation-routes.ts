import { Router, Request, Response } from "express";
import {
  getEscalationStatus,
  renderSchemeEscalationSMS,
  renderDeSchemeDailyEmail,
  renderEeSchemeEscalationEmail,
  renderCeRegionalConsolidatedEmail,
  executeEscalationDispatch,
  getSentEscalationAlerts,
} from "../services/escalation-service";
import ExcelJS from "exceljs";

const router = Router();

/**
 * GET /api/escalation/sent-alerts
 * Returns the actual history and counts of alerts SENT to Tier 1 (DE/AE), Tier 2 (EE), and Tier 3 (CE/SE)
 */
router.get("/sent-alerts", async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as any) || "today";
    const tier = (req.query.tier as any) || "all";
    const channel = (req.query.channel as any) || "all";
    const search = req.query.search ? String(req.query.search) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    const result = await getSentEscalationAlerts({
      timeRange,
      tier,
      channel,
      search,
      limit,
      offset,
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("Error in /api/escalation/sent-alerts:", error);
    res.status(500).json({ error: error.message || "Failed to fetch sent alerts" });
  }
});

/**
 * GET /api/escalation/summary
 * Returns high-level metrics across Level 1, Level 2, and Level 3 escalations
 */
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const region = req.query.region ? String(req.query.region) : undefined;
    const { summary, schemes } = await getEscalationStatus({ region });
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      schemes,
    });
  } catch (error: any) {
    console.error("Error in /api/escalation/summary:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escalation summary" });
  }
});

/**
 * GET /api/escalation/schemes
 * Returns the list of schemes with escalation levels, filtering, and search
 */
router.get("/schemes", async (req: Request, res: Response) => {
  try {
    const region = req.query.region ? String(req.query.region) : undefined;
    const level = req.query.level ? Number(req.query.level) : undefined;
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : undefined;

    const { summary, schemes } = await getEscalationStatus({ region });

    let filtered = schemes;
    if (level && [1, 2, 3].includes(level)) {
      filtered = filtered.filter((s) => s.escalation_level === level);
    }
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.scheme_id.toLowerCase().includes(search) ||
          s.scheme_name.toLowerCase().includes(search) ||
          (s.region && s.region.toLowerCase().includes(search)) ||
          (s.division && s.division.toLowerCase().includes(search)) ||
          (s.ee_civil_name && s.ee_civil_name.toLowerCase().includes(search)) ||
          (s.de_ae_civil_name && s.de_ae_civil_name.toLowerCase().includes(search))
      );
    }

    res.json({
      summary,
      total_count: filtered.length,
      schemes: filtered,
    });
  } catch (error: any) {
    console.error("Error in /api/escalation/schemes:", error);
    res.status(500).json({ error: error.message || "Failed to fetch escalation schemes" });
  }
});

/**
 * GET /api/escalation/scheme/:schemeId
 * Detailed drilldown of a single scheme
 */
router.get("/scheme/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found in active escalation records" });
    }

    res.json(scheme);
  } catch (error: any) {
    console.error("Error in /api/escalation/scheme/:schemeId:", error);
    res.status(500).json({ error: error.message || "Failed to fetch scheme escalation details" });
  }
});

/**
 * GET /api/escalation/preview-de/:schemeId
 * Returns the rendered DE/AE Scheme-wise Daily Email & SMS preview (Tier 1)
 */
router.get("/preview-de/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const email = renderDeSchemeDailyEmail(scheme);
    const sms = renderSchemeEscalationSMS(scheme, "DE");

    res.json({
      success: true,
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      recipient_name: scheme.de_ae_civil_name || "Deputy / Assistant Engineer (Civil)",
      recipient_email: scheme.de_ae_civil_email || "N/A",
      recipient_mobile: scheme.de_ae_civil_mobile || "N/A",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: sms,
    });
  } catch (error: any) {
    console.error("Error in preview-de:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/escalation/preview-ee/:schemeId
 * Returns the rendered EE Scheme-wise Email & SMS preview
 */
router.get("/preview-ee/:schemeId", async (req: Request, res: Response) => {
  try {
    const schemeId = String(req.params.schemeId).trim();
    const { schemes } = await getEscalationStatus();
    const scheme = schemes.find((s) => s.scheme_id === schemeId);

    if (!scheme) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    const email = renderEeSchemeEscalationEmail(scheme);
    const sms = renderSchemeEscalationSMS(scheme, "EE");

    res.json({
      success: true,
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      recipient_name: scheme.ee_civil_name || "Executive Engineer (Civil)",
      recipient_email: scheme.ee_civil_email || "N/A",
      recipient_mobile: scheme.ee_civil_mobile || "N/A",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: sms,
    });
  } catch (error: any) {
    console.error("Error in preview-ee:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/escalation/preview-ce/:region
 * Returns the rendered CE Regional Consolidated Email & Scheme-wise SMS list
 */
router.get("/preview-ce/:region", async (req: Request, res: Response) => {
  try {
    const region = String(req.params.region).trim();
    const { schemes } = await getEscalationStatus({ region });
    const level3Schemes = schemes.filter((s) => s.escalation_level === 3);

    if (level3Schemes.length === 0) {
      return res.status(404).json({ error: `No Level 3 (7+ days chronic) schemes found in ${region} region` });
    }

    const firstScheme = level3Schemes[0];
    const email = renderCeRegionalConsolidatedEmail(region, level3Schemes);
    const smsList = level3Schemes.map((s) => ({
      scheme_id: s.scheme_id,
      scheme_name: s.scheme_name,
      sms_text: renderSchemeEscalationSMS(s, "CE"),
    }));

    res.json({
      success: true,
      region,
      total_chronic_schemes: level3Schemes.length,
      recipient: {
        name: firstScheme.chief_engineer_name || "Chief Engineer",
        email: firstScheme.chief_engineer_email || "N/A",
        mobile: firstScheme.chief_engineer_mobile || "N/A",
        region,
      },
      recipient_name: firstScheme.chief_engineer_name || "Chief Engineer",
      recipient_email: firstScheme.chief_engineer_email || "N/A",
      recipient_mobile: firstScheme.chief_engineer_mobile || "N/A",
      email_subject: email.subject,
      email_html: email.html,
      sms_text: smsList[0]?.sms_text || "",
      sms_list: smsList,
    });
  } catch (error: any) {
    console.error("Error in preview-ce:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/escalation/dispatch or /api/escalation/trigger-now
 * Triggers escalation dispatch (Dry-run by default unless live confirmed)
 */
const handleDispatch = async (req: Request, res: Response) => {
  try {
    const { dryRun, schemeId, region } = req.body;
    const result = await executeEscalationDispatch({
      dryRun: dryRun !== false,
      schemeId,
      region,
    });
    res.json({
      ...result,
      dryRun: dryRun !== false,
      results: {
        ee_count: result.ee_emails_sent + result.ee_sms_sent,
        ce_count: result.ce_emails_sent + result.ce_sms_sent,
      },
    });
  } catch (error: any) {
    console.error("Error in escalation dispatch:", error);
    res.status(500).json({ error: error.message || "Failed to execute escalation dispatch" });
  }
};

router.post("/dispatch", handleDispatch);
router.post("/trigger-now", handleDispatch);

/**
 * GET /api/escalation/export-excel
 * Exports the full Escalation Matrix into a styled Excel workbook
 */
router.get("/export-excel", async (req: Request, res: Response) => {
  try {
    const region = req.query.region ? String(req.query.region) : undefined;
    const { summary, schemes } = await getEscalationStatus({ region });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MJP JJM IoT Cell";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Escalation Matrix", {
      views: [{ showGridLines: true }],
    });

    // Branded Header
    sheet.mergeCells("A1:N1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "MAHARASHTRA JEEVAN PRADHIKARAN - JAL JEEVAN MISSION";
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 32;

    sheet.mergeCells("A2:N2");
    const subCell = sheet.getCell("A2");
    subCell.value = `3-Tier Alerts Escalation Matrix (Report Generated: ${new Date().toLocaleDateString("en-IN")})`;
    subCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 24;

    // Headers
    const headers = [
      "Scheme ID",
      "Scheme Name",
      "Region",
      "Division",
      "Escalation Level",
      "Streak Days",
      "Villages <55 LPCD",
      "ESRs Low Chlorine",
      "ESRs High Chlorine",
      "ESRs Low Pressure",
      "Offline Sensors",
      "DE / AE (Civil)",
      "EE (Civil)",
      "Chief Engineer",
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    schemes.forEach((s) => {
      const levelLabel =
        s.escalation_level === 3
          ? "Level 3 - CE (7+ Days)"
          : s.escalation_level === 2
          ? "Level 2 - EE (3-6 Days)"
          : "Level 1 - DE (1-2 Days)";

      const row = sheet.addRow([
        s.scheme_id,
        s.scheme_name,
        s.region,
        s.division || "-",
        levelLabel,
        s.max_streak_days,
        s.lpcd_villages_count,
        s.chlorine_low_count,
        s.chlorine_high_count,
        s.pressure_low_count,
        s.offline_count,
        s.de_ae_civil_name ? `${s.de_ae_civil_name} (${s.de_ae_civil_mobile || "N/A"})` : "-",
        s.ee_civil_name ? `${s.ee_civil_name} (${s.ee_civil_mobile || "N/A"})` : "-",
        s.chief_engineer_name ? `${s.chief_engineer_name} (${s.chief_engineer_mobile || "N/A"})` : "-",
      ]);

      row.height = 22;

      // Color-code the level cell
      const levelCell = row.getCell(5);
      if (s.escalation_level === 3) {
        levelCell.font = { bold: true, color: { argb: "FF991B1B" } };
        levelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      } else if (s.escalation_level === 2) {
        levelCell.font = { bold: true, color: { argb: "FF92400E" } };
        levelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF2E9" } };
      } else {
        levelCell.font = { bold: true, color: { argb: "FF065F46" } };
        levelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
      }
    });

    // Auto fit column widths
    sheet.columns.forEach((col, idx) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const val = cell.value ? String(cell.value) : "";
        if (val.length > maxLen) maxLen = Math.min(val.length + 3, 40);
      });
      col.width = maxLen;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MJP_Escalation_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Error in export-excel:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
