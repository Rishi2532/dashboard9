import { Router, Request, Response } from "express";
import multer from "multer";
import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { getDB } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

function normalizeHeader(h: string): string {
  return (h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Upload CSV or Excel file to populate scheme_village_esr_master table
 * Columns expected: Region, Su-division, Block Name, Scheme ID, Scheme Name, Village, ESR Name
 */
router.post("/import", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Please upload a CSV or Excel (.xlsx) file." });
    }

    const clearExisting = req.body.clearExisting === "true" || req.body.clearExisting === true;
    const fileName = req.file.originalname.toLowerCase();
    const rowsToInsert: Array<{
      region: string | null;
      sub_division: string | null;
      block_name: string | null;
      scheme_id: string;
      scheme_name: string | null;
      village_name: string;
      esr_name: string | null;
    }> = [];

    if (fileName.endsWith(".csv")) {
      const content = req.file.buffer.toString("utf-8");
      const records: any[] = parseCsv(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      for (const row of records) {
        let region = null;
        let sub_division = null;
        let block_name = null;
        let scheme_id = null;
        let scheme_name = null;
        let village_name = null;
        let esr_name = null;

        for (const [key, val] of Object.entries(row)) {
          const normKey = normalizeHeader(key);
          const v = val ? String(val).trim() : null;
          if (normKey === "region") region = v;
          else if (normKey.includes("subdiv") || normKey.includes("sudiv")) sub_division = v;
          else if (normKey.includes("block") || normKey === "taluka") block_name = v;
          else if (normKey === "schemeid" || normKey === "scheme" && !scheme_id) scheme_id = v;
          else if (normKey.includes("schemename") || normKey === "scheme") scheme_name = v;
          else if (normKey.includes("village") || normKey === "villagename") village_name = v;
          else if (normKey.includes("esr") || normKey.includes("reservoir")) esr_name = v;
        }

        if (scheme_id && village_name) {
          rowsToInsert.push({
            region,
            sub_division,
            block_name,
            scheme_id: String(scheme_id).trim(),
            scheme_name,
            village_name: String(village_name).trim(),
            esr_name: esr_name ? String(esr_name).trim() : null,
          });
        }
      }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const worksheet = workbook.worksheets[0];

      if (worksheet) {
        const headerMap: { [colIndex: number]: string } = {};
        const firstRow = worksheet.getRow(1);

        firstRow.eachCell((cell, colNumber) => {
          const val = cell.value ? String(cell.value) : "";
          headerMap[colNumber] = normalizeHeader(val);
        });

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          let region = null;
          let sub_division = null;
          let block_name = null;
          let scheme_id = null;
          let scheme_name = null;
          let village_name = null;
          let esr_name = null;

          row.eachCell((cell, colNumber) => {
            const h = headerMap[colNumber] || "";
            const v = cell.value !== undefined && cell.value !== null ? String(cell.value).trim() : null;
            if (h === "region") region = v;
            else if (h.includes("subdiv") || h.includes("sudiv")) sub_division = v;
            else if (h.includes("block") || h === "taluka") block_name = v;
            else if (h === "schemeid") scheme_id = v;
            else if (h.includes("schemename") || h === "scheme") scheme_name = v;
            else if (h.includes("village") || h === "villagename") village_name = v;
            else if (h.includes("esr") || h.includes("reservoir")) esr_name = v;
          });

          if (scheme_id && village_name) {
            rowsToInsert.push({
              region,
              sub_division,
              block_name,
              scheme_id: String(scheme_id).trim(),
              scheme_name,
              village_name: String(village_name).trim(),
              esr_name: esr_name ? String(esr_name).trim() : null,
            });
          }
        });
      }
    } else {
      return res.status(400).json({ error: "Unsupported file format. Please upload CSV or Excel (.xlsx) file." });
    }

    if (rowsToInsert.length === 0) {
      return res.status(400).json({
        error: "No valid rows found in file. Ensure headers contain: Region, Su-division, Block Name, Scheme ID, Scheme Name, Village, ESR Name",
      });
    }

    const db = await getDB();

    if (clearExisting) {
      await db.execute(sql`TRUNCATE TABLE scheme_village_esr_master RESTART IDENTITY;`);
    }

    // Insert in batches of 500
    let insertedCount = 0;
    const batchSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const batch = rowsToInsert.slice(i, i + batchSize);
      const valuesSql = batch
        .map(
          (r) =>
            `(${sql.raw(`'${(r.region || "").replace(/'/g, "''")}'`)}, ${sql.raw(`'${(r.sub_division || "").replace(/'/g, "''")}'`)}, ${sql.raw(`'${(r.block_name || "").replace(/'/g, "''")}'`)}, ${sql.raw(`'${r.scheme_id.replace(/'/g, "''")}'`)}, ${sql.raw(`'${(r.scheme_name || "").replace(/'/g, "''")}'`)}, ${sql.raw(`'${r.village_name.replace(/'/g, "''")}'`)}, ${sql.raw(`'${(r.esr_name || "").replace(/'/g, "''")}'`)})`
        )
        .join(",");

      await db.execute(
        sql.raw(`
          INSERT INTO scheme_village_esr_master (region, sub_division, block_name, scheme_id, scheme_name, village_name, esr_name)
          VALUES ${valuesSql};
        `)
      );
      insertedCount += batch.length;
    }

    res.json({
      success: true,
      message: `Successfully processed and stored ${insertedCount} rows into scheme_village_esr_master.`,
      totalRows: rowsToInsert.length,
      insertedCount,
      clearedExisting: clearExisting,
    });
  } catch (err: any) {
    console.error("Error importing scheme_village_esr_master:", err);
    res.status(500).json({ error: "Failed to import file", details: err.message });
  }
});

/**
 * Scheme-wise Connected vs Not Connected Status
 * Checks master table records against active `village` and `communication_status`
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const region = req.query.region ? String(req.query.region).trim() : null;
    const schemeId = req.query.scheme_id ? String(req.query.scheme_id).trim() : null;

    let filterClause = "WHERE 1=1";
    if (region && region.toLowerCase() !== "all") {
      filterClause += ` AND LOWER(svem.region) = '${region.toLowerCase().replace(/'/g, "''")}'`;
    }
    if (schemeId && schemeId.toLowerCase() !== "all") {
      filterClause += ` AND svem.scheme_id = '${schemeId.replace(/'/g, "''")}'`;
    }

    // 1. Scheme-level aggregated status
    const schemeSummaryRes = await db.execute(sql.raw(`
      WITH master_data AS (
        SELECT 
          svem.scheme_id,
          svem.scheme_name,
          svem.region,
          svem.sub_division,
          svem.block_name,
          svem.village_name,
          svem.esr_name,
          -- Check if village exists in connected village table
          CASE 
            WHEN v.village_name IS NOT NULL THEN 1 
            ELSE 0 
          END as is_village_connected,
          -- Check if ESR exists in connected communication_status table
          CASE 
            WHEN (COALESCE(cs.chlorine_connected, '') ILIKE '%connect%' 
               OR COALESCE(cs.pressure_connected, '') ILIKE '%connect%' 
               OR COALESCE(cs.flow_meter_connected, '') ILIKE '%connect%') THEN 1
            WHEN cs.esr_name IS NOT NULL THEN 1
            ELSE 0 
          END as is_esr_connected
        FROM scheme_village_esr_master svem
        LEFT JOIN (
          SELECT DISTINCT scheme_id, LOWER(TRIM(village_name)) as v_name, village_name
          FROM village
          WHERE connected_esr > 0 OR village_name IS NOT NULL
        ) v ON TRIM(v.scheme_id) = TRIM(svem.scheme_id) AND v.v_name = LOWER(TRIM(svem.village_name))
        LEFT JOIN (
          SELECT DISTINCT scheme_id, LOWER(TRIM(village_name)) as v_name, LOWER(TRIM(esr_name)) as e_name,
            chlorine_connected, pressure_connected, flow_meter_connected, esr_name
          FROM communication_status
        ) cs ON TRIM(cs.scheme_id) = TRIM(svem.scheme_id) 
            AND cs.v_name = LOWER(TRIM(svem.village_name))
            AND cs.e_name = LOWER(TRIM(COALESCE(svem.esr_name, '')))
        ${filterClause}
      )
      SELECT 
        scheme_id,
        scheme_name,
        region,
        sub_division,
        block_name,
        COUNT(DISTINCT LOWER(TRIM(village_name))) as total_villages,
        COUNT(DISTINCT CASE WHEN is_village_connected = 1 THEN LOWER(TRIM(village_name)) END) as connected_villages,
        COUNT(DISTINCT CASE WHEN is_village_connected = 0 THEN LOWER(TRIM(village_name)) END) as not_connected_villages,
        COUNT(DISTINCT CASE WHEN esr_name IS NOT NULL AND esr_name != '' AND esr_name != '-' THEN LOWER(TRIM(esr_name)) END) as total_esrs,
        COUNT(DISTINCT CASE WHEN esr_name IS NOT NULL AND esr_name != '' AND esr_name != '-' AND is_esr_connected = 1 THEN LOWER(TRIM(esr_name)) END) as connected_esrs,
        COUNT(DISTINCT CASE WHEN esr_name IS NOT NULL AND esr_name != '' AND esr_name != '-' AND is_esr_connected = 0 THEN LOWER(TRIM(esr_name)) END) as not_connected_esrs
      FROM master_data
      GROUP BY scheme_id, scheme_name, region, sub_division, block_name
      ORDER BY region, scheme_name;
    `));

    const schemes = schemeSummaryRes.rows || [];

    // Compute overall statewide totals
    let totalSchemes = schemes.length;
    let totalVillages = 0;
    let connectedVillages = 0;
    let notConnectedVillages = 0;
    let totalEsrs = 0;
    let connectedEsrs = 0;
    let notConnectedEsrs = 0;

    for (const s of schemes) {
      totalVillages += Number(s.total_villages || 0);
      connectedVillages += Number(s.connected_villages || 0);
      notConnectedVillages += Number(s.not_connected_villages || 0);
      totalEsrs += Number(s.total_esrs || 0);
      connectedEsrs += Number(s.connected_esrs || 0);
      notConnectedEsrs += Number(s.not_connected_esrs || 0);
    }

    res.json({
      success: true,
      totals: {
        totalSchemes,
        totalVillages,
        connectedVillages,
        notConnectedVillages,
        totalEsrs,
        connectedEsrs,
        notConnectedEsrs,
      },
      schemes,
    });
  } catch (err: any) {
    console.error("Error fetching scheme village ESR master status:", err);
    res.status(500).json({ error: "Failed to fetch status", details: err.message });
  }
});

/**
 * Detailed records list with individual village and ESR connection statuses
 */
router.get("/records", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const region = req.query.region ? String(req.query.region).trim() : null;
    const schemeId = req.query.scheme_id ? String(req.query.scheme_id).trim() : null;
    const statusFilter = req.query.status ? String(req.query.status).toLowerCase().trim() : "all"; // 'connected' | 'not_connected' | 'all'

    let filterClause = "WHERE 1=1";
    if (region && region.toLowerCase() !== "all") {
      filterClause += ` AND LOWER(svem.region) = '${region.toLowerCase().replace(/'/g, "''")}'`;
    }
    if (schemeId && schemeId.toLowerCase() !== "all") {
      filterClause += ` AND svem.scheme_id = '${schemeId.replace(/'/g, "''")}'`;
    }

    const recordsRes = await db.execute(sql.raw(`
      SELECT 
        svem.id,
        svem.scheme_id,
        svem.scheme_name,
        svem.region,
        svem.sub_division,
        svem.block_name,
        svem.village_name,
        svem.esr_name,
        CASE 
          WHEN v.village_name IS NOT NULL THEN 'Connected' 
          ELSE 'Not Connected' 
        END as village_connection_status,
        CASE 
          WHEN (COALESCE(cs.chlorine_connected, '') ILIKE '%connect%' 
             OR COALESCE(cs.pressure_connected, '') ILIKE '%connect%' 
             OR COALESCE(cs.flow_meter_connected, '') ILIKE '%connect%') THEN 'Connected'
          WHEN cs.esr_name IS NOT NULL THEN 'Connected'
          ELSE 'Not Connected' 
        END as esr_connection_status
      FROM scheme_village_esr_master svem
      LEFT JOIN (
        SELECT DISTINCT scheme_id, LOWER(TRIM(village_name)) as v_name, village_name
        FROM village
        WHERE connected_esr > 0 OR village_name IS NOT NULL
      ) v ON TRIM(v.scheme_id) = TRIM(svem.scheme_id) AND v.v_name = LOWER(TRIM(svem.village_name))
      LEFT JOIN (
        SELECT DISTINCT scheme_id, LOWER(TRIM(village_name)) as v_name, LOWER(TRIM(esr_name)) as e_name,
          chlorine_connected, pressure_connected, flow_meter_connected, esr_name
        FROM communication_status
      ) cs ON TRIM(cs.scheme_id) = TRIM(svem.scheme_id) 
          AND cs.v_name = LOWER(TRIM(svem.village_name))
          AND cs.e_name = LOWER(TRIM(COALESCE(svem.esr_name, '')))
      ${filterClause}
      ORDER BY svem.region, svem.scheme_name, svem.village_name;
    `));

    let rows = recordsRes.rows || [];
    if (statusFilter === "connected") {
      rows = rows.filter((r: any) => r.village_connection_status === "Connected");
    } else if (statusFilter === "not_connected") {
      rows = rows.filter((r: any) => r.village_connection_status === "Not Connected");
    }

    res.json({
      success: true,
      count: rows.length,
      records: rows,
    });
  } catch (err: any) {
    console.error("Error fetching scheme village ESR master records:", err);
    res.status(500).json({ error: "Failed to fetch records", details: err.message });
  }
});

/**
 * Truncate / Clear the master table
 */
router.delete("/clear", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    await db.execute(sql`TRUNCATE TABLE scheme_village_esr_master RESTART IDENTITY;`);
    res.json({ success: true, message: "scheme_village_esr_master table cleared successfully." });
  } catch (err: any) {
    console.error("Error clearing scheme_village_esr_master:", err);
    res.status(500).json({ error: "Failed to clear table", details: err.message });
  }
});

export default router;

