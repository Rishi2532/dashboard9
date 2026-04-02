import { Router } from "express";
import { getDB } from "../db";
import { sql } from "drizzle-orm";
import ExcelJS from "exceljs";

const router = Router();

// Function to get filtered scheme IDs (helper)
async function getFilteredSchemeIds(db: any, filterType: any, fullyCompleted: any) {
  if (filterType === 'all' && !fullyCompleted) return null;
  
  let query = sql`SELECT DISTINCT scheme_id FROM scheme_status WHERE 1 = 1`;
  if (filterType === 'fully_completed' || fullyCompleted === 'true') {
    query = sql`${ query } AND water_supply = 'Yes'`;
  }
  
  const result = await db.execute(query);
  if (result.rows.length === 0) return ['NO_MATCHES'];
  return result.rows.map((r: any) => r.scheme_id);
}

// Get flowmeter statistics online/offline counts by region
router.get("/overall-region-comparison", async (req, res) => {
  try {
    const { fullyCompleted, filterType } = req.query;
    const db = await getDB();

    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    let schemeIdFilter = "";
    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        schemeIdFilter = "AND scheme_id = 'NO_MATCHES_PLACEHOLDER'";
      } else {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND scheme_id IN(${ ids })`;
      }
    }

    const query = `
SELECT
region,
  COUNT(CASE WHEN LOWER(flow_meter_status) = 'online' THEN 1 END) as online_count,
  COUNT(CASE WHEN LOWER(flow_meter_status) = 'offline' THEN 1 END) as offline_count
      FROM communication_status
      WHERE region IS NOT NULL
      ${ schemeIdFilter }
      GROUP BY region
      ORDER BY region
    `;

    const result = await db.execute(sql.raw(query));
    
    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        region: row.region,
        online: Number(row.online_count) || 0,
        offline: Number(row.offline_count) || 0
      }))
    });
  } catch (error) {
    console.error("Error fetching flowmeter statistics:", error);
    res.status(500).json({ success: false, error: "Failed to fetch flowmeter statistics" });
  }
});

// Get detailed list for flowmeter statistics (drill-down)
router.get("/overall-region-comparison/details/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, fullyCompleted, filterType } = req.query;
    const db = await getDB();

    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    let schemeIdFilter = "";
    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        schemeIdFilter = "AND cs.scheme_id = 'NO_MATCHES_PLACEHOLDER'";
      } else {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND cs.scheme_id IN(${ ids })`;
      }
    }

    let regionFilter = "";
    if (region && region !== 'All Regions') {
      regionFilter = `AND cs.region = '${String(region).replace(/'/g, "''")}'`;
    }

let statusFilter = "";
if (category === 'online') {
  statusFilter = "AND LOWER(cs.flow_meter_status) = 'online'";
} else if (category === 'offline') {
  statusFilter = "AND LOWER(cs.flow_meter_status) = 'offline'";
}

const query = `
      SELECT
        cs.region,
        cs.division,
        cs.block,
        cs.village_name,
        cs.scheme_id,
        cs.scheme_name,
        cs.flow_meter_status as status,
        sd.population,
        sd.dashboard_url
      FROM communication_status cs
      LEFT JOIN LATERAL (
        SELECT population, dashboard_url
        FROM water_scheme_data
        WHERE scheme_id = cs.scheme_id AND village_name = cs.village_name
        LIMIT 1
      ) sd ON true
      WHERE cs.region IS NOT NULL
      ${schemeIdFilter}
      ${regionFilter}
      ${statusFilter}
      ORDER BY cs.region, cs.division, cs.village_name
    `;

const result = await db.execute(sql.raw(query));

res.json({
  success: true,
  data: result.rows,
  count: result.rows.length
});
  } catch (error) {
  console.error("Error fetching flowmeter details:", error);
  res.status(500).json({ success: false, error: "Failed to fetch flowmeter details" });
}
});

// Export flowmeter statistics to Excel (identical query to details)
router.get("/overall-region-comparison/export/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, fullyCompleted, filterType } = req.query;
    const db = await getDB();

    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted);
    let schemeIdFilter = "";
    if (filteredIds) {
      if (filteredIds.length === 1 && filteredIds[0] === 'NO_MATCHES') {
        schemeIdFilter = "AND cs.scheme_id = 'NO_MATCHES_PLACEHOLDER'";
      } else {
        const ids = filteredIds.map((id: string) => `'${id}'`).join(',');
        schemeIdFilter = `AND cs.scheme_id IN (${ids})`;
      }
    }

    let regionFilter = "";
    if (region && region !== 'All Regions') {
      regionFilter = `AND cs.region = '${String(region).replace(/'/g, "''")}'`;
    }

    let statusFilter = "";
    if (category === 'online') {
      statusFilter = "AND LOWER(cs.flow_meter_status) = 'online'";
    } else if (category === 'offline') {
      statusFilter = "AND LOWER(cs.flow_meter_status) = 'offline'";
    }

    // Identical to details query — Excel will always match the list
    const query = `
      SELECT
        cs.region,
        cs.division,
        cs.block,
        cs.village_name,
        cs.scheme_id,
        cs.scheme_name,
        cs.flow_meter_status as status,
        sd.population
      FROM communication_status cs
      LEFT JOIN LATERAL (
        SELECT population
        FROM water_scheme_data
        WHERE scheme_id = cs.scheme_id AND village_name = cs.village_name
        LIMIT 1
      ) sd ON true
      WHERE cs.region IS NOT NULL
      ${schemeIdFilter}
      ${regionFilter}
      ${statusFilter}
      ORDER BY cs.region, cs.division, cs.village_name
    `;

    const result = await db.execute(sql.raw(query));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Flowmeter Details');

    worksheet.columns = [
      { header: 'Region', key: 'region', width: 18 },
      { header: 'Division', key: 'division', width: 18 },
      { header: 'Block', key: 'block', width: 18 },
      { header: 'Village', key: 'village_name', width: 22 },
      { header: 'Scheme ID', key: 'scheme_id', width: 18 },
      { header: 'Scheme Name', key: 'scheme_name', width: 35 },
      { header: 'Flow Meter Status', key: 'status', width: 20 },
      { header: 'Population', key: 'population', width: 15 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    result.rows.forEach((row: any, idx: number) => {
      const dataRow = worksheet.addRow(row);
      if (idx % 2 === 1) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F0FE' }
        };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=flowmeter-${category}-${region || 'all'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting flowmeter stats:", error);
    res.status(500).json({ success: false, error: "Failed to export flowmeter statistics" });
  }
});

export default router;
