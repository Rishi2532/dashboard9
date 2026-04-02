import { Router } from "express";
import { getDB } from "../db";
import { sql } from "drizzle-orm";
import pg from "pg";
import ExcelJS from "exceljs";

const router = Router();

// Function to get filtered scheme IDs (helper)
async function getFilteredSchemeIds(db: any, filterType: any, fullyCompleted: any) {
  if (filterType === 'all' && !fullyCompleted) return null;
  
  let query = sql`SELECT DISTINCT scheme_id FROM scheme_status WHERE 1=1`;
  if (filterType === 'fully_completed' || fullyCompleted === 'true') {
    query = sql`${query} AND water_supply = 'Yes'`;
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
        schemeIdFilter = `AND scheme_id IN (${ids})`;
      }
    }

    const query = `
      SELECT 
        region,
        COUNT(CASE WHEN LOWER(flow_meter_status) = 'online' THEN 1 END) as online_count,
        COUNT(CASE WHEN LOWER(flow_meter_status) = 'offline' THEN 1 END) as offline_count
      FROM communication_status
      WHERE region IS NOT NULL
      ${schemeIdFilter}
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

// Get detailed list for flowmeter statistics
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
        schemeIdFilter = `AND cs.scheme_id IN (${ids})`;
      }
    }

    let regionFilter = "";
    if (region && region !== 'All Regions') {
      regionFilter = `AND cs.region = ${sql.raw(`'${region}'`)}`;
    }

    let statusFilter = "";
    if (category === 'online') {
      statusFilter = "AND LOWER(cs.flow_meter_status) = 'online'";
    } else if (category === 'offline') {
      statusFilter = "AND LOWER(cs.flow_meter_status) = 'offline'";
    }

    const query = `
      SELECT DISTINCT ON (cs.scheme_id, cs.village_name)
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
      LEFT JOIN water_scheme_data sd ON (cs.scheme_id = sd.scheme_id AND cs.village_name = sd.village_name)
      WHERE cs.region IS NOT NULL
      ${schemeIdFilter}
      ${regionFilter}
      ${statusFilter}
      ORDER BY cs.scheme_id, cs.village_name
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

// Export flowmeter statistics to Excel
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
      regionFilter = `AND cs.region = '${region}'`;
    }

    let statusFilter = "";
    if (category === 'online') {
      statusFilter = "AND LOWER(cs.flow_meter_status) = 'online'";
    } else if (category === 'offline') {
      statusFilter = "AND LOWER(cs.flow_meter_status) = 'offline'";
    }

    const query = `
      SELECT DISTINCT ON (cs.scheme_id, cs.village_name)
        cs.region,
        cs.division,
        cs.block,
        cs.village_name,
        cs.scheme_id,
        cs.scheme_name,
        cs.flow_meter_status as status,
        sd.population
      FROM communication_status cs
      LEFT JOIN water_scheme_data sd ON (cs.scheme_id = sd.scheme_id AND cs.village_name = sd.village_name)
      WHERE cs.region IS NOT NULL
      ${schemeIdFilter}
      ${regionFilter}
      ${statusFilter}
      ORDER BY cs.scheme_id, cs.village_name
    `;

    const result = await db.execute(sql.raw(query));
    
    // Create Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Flowmeter Details');
    
    worksheet.columns = [
      { header: 'Region', key: 'region', width: 15 },
      { header: 'Division', key: 'division', width: 15 },
      { header: 'Block', key: 'block', width: 15 },
      { header: 'Village', key: 'village_name', width: 20 },
      { header: 'Scheme ID', key: 'scheme_id', width: 15 },
      { header: 'Scheme Name', key: 'scheme_name', width: 30 },
      { header: 'Flow Meter Status', key: 'status', width: 20 },
      { header: 'Population', key: 'population', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add rows
    result.rows.forEach((row: any) => {
      worksheet.addRow(row);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=flowmeter-statistics-${category}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting flowmeter stats:", error);
    res.status(500).json({ success: false, error: "Failed to export flowmeter statistics" });
  }
});

export default router;
