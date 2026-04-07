import { Router } from "express";
import { getDB } from "../db";
import { sql } from "drizzle-orm";
import ExcelJS from "exceljs";

const router = Router();

// Function to get filtered scheme IDs (helper)
async function getFilteredSchemeIds(db: any, filterType: any, fullyCompleted: any, agencyType?: string) {
  const conditions: any[] = [];
  
  if (filterType && filterType.startsWith('commissioned')) {
    conditions.push(sql`LOWER(water_supply) = 'yes'`);
    if (filterType === 'commissioned_full') {
      conditions.push(sql`LOWER(water_supply_status) = 'full'`);
    } else if (filterType === 'commissioned_partial') {
      conditions.push(sql`LOWER(water_supply_status) = 'partial'`);
    } else if (filterType === 'commissioned_no') {
      conditions.push(sql`LOWER(water_supply_status) = 'no'`);
    }
  } else if (filterType === 'fully_completed' || fullyCompleted === 'true') {
    conditions.push(sql`LOWER(fully_completion_scheme_status) IN ('completed', 'fully-completed', 'fully completed', 'functionally completed')`);
  } else if (filterType === 'common_filter') {
    conditions.push(sql`LOWER(fully_completion_scheme_status) IN ('completed', 'fully-completed', 'fully completed', 'functionally completed') AND LOWER(water_supply) = 'yes'`);
  } else if (filterType === 'mjp_commissioned_yes') {
    conditions.push(sql`LOWER(mjp_commissioned) = 'yes'`);
  }

  if (agencyType && agencyType !== 'ALL' && agencyType !== 'all') {
    conditions.push(sql`agency_type = ${agencyType}`);
  }

  if (conditions.length === 0) return null;

  const whereClause = sql.join(conditions, sql` AND `);
  const query = sql`SELECT DISTINCT scheme_id FROM scheme_status WHERE ${whereClause}`;
  
  const result = await db.execute(query);
  if (result.rows.length === 0) return ['NO_MATCHES'];
  return result.rows.map((r: any) => r.scheme_id);
}

// Get flowmeter statistics online/offline counts by region
router.get("/overall-region-comparison", async (req, res) => {
  try {
    const { fullyCompleted, filterType, agencyType } = req.query;
    const db = await getDB();

    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
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
        cs.region,
        COUNT(DISTINCT CASE WHEN LOWER(cs.flow_meter_status) = 'online' THEN cs.scheme_id || '-' || cs.village_name || '-' || cs.esr_name END) as online_count,
        COUNT(DISTINCT CASE WHEN LOWER(cs.flow_meter_status) = 'offline' THEN cs.scheme_id || '-' || cs.village_name || '-' || cs.esr_name END) as offline_count
      FROM communication_status cs
      WHERE cs.region IS NOT NULL
      AND cs.flow_meter_connected = 'Connected'
      ${schemeIdFilter}
      GROUP BY cs.region
      ORDER BY cs.region
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
    const { region, fullyCompleted, filterType, agencyType } = req.query;
    const db = await getDB();

    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
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
        cs.esr_name,
        cs.scheme_id,
        cs.scheme_name,
        cs.flow_meter_status as status,
        sd.population,
        COALESCE(cd.dashboard_url, pd.dashboard_url, sd.dashboard_url) as dashboard_url,
        ss.agency_type
      FROM communication_status cs
      LEFT JOIN scheme_status ss ON cs.scheme_id = ss.scheme_id AND cs.block = ss.block
      LEFT JOIN LATERAL (
        SELECT population, dashboard_url
        FROM water_scheme_data
        WHERE scheme_id = cs.scheme_id AND village_name = cs.village_name AND block = cs.block
        LIMIT 1
      ) sd ON true
      LEFT JOIN LATERAL (
        SELECT dashboard_url
        FROM chlorine_data
        WHERE scheme_id = cs.scheme_id AND village_name = cs.village_name AND esr_name = cs.esr_name
        LIMIT 1
      ) cd ON true
      LEFT JOIN LATERAL (
        SELECT dashboard_url
        FROM pressure_data
        WHERE scheme_id = cs.scheme_id AND village_name = cs.village_name AND esr_name = cs.esr_name
        LIMIT 1
      ) pd ON true
      WHERE cs.region IS NOT NULL
      AND cs.flow_meter_connected = 'Connected'
      ${schemeIdFilter}
      ${regionFilter}
      ${statusFilter}
      ORDER BY cs.region, cs.division, cs.village_name, cs.esr_name
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
    const { region, fullyCompleted, filterType, agencyType } = req.query;
    const db = await getDB();

    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
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

    const query = `
      SELECT
        cs.region || '' as region,
        cs.division || '' as division,
        cs.block || '' as block,
        cs.village_name || '' as village_name,
        cs.esr_name || '' as esr_name,
        cs.scheme_id || '' as scheme_id,
        cs.scheme_name || '' as scheme_name,
        cs.flow_meter_status || '' as status,
        sd.population,
        ss.agency_type || '' as agency_type
      FROM communication_status cs
      LEFT JOIN scheme_status ss ON cs.scheme_id = ss.scheme_id AND cs.block = ss.block
      LEFT JOIN LATERAL (
        SELECT population
        FROM water_scheme_data
        WHERE scheme_id = cs.scheme_id AND village_name = cs.village_name AND block = cs.block
        LIMIT 1
      ) sd ON true
      WHERE cs.region IS NOT NULL
      AND cs.flow_meter_connected = 'Connected'
      ${schemeIdFilter}
      ${regionFilter}
      ${statusFilter}
      ORDER BY cs.region, cs.division, cs.village_name, cs.esr_name
    `;

    const result = await db.execute(sql.raw(query));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Flowmeter Details');

    worksheet.columns = [
      { header: 'Region', key: 'region', width: 18 },
      { header: 'Division', key: 'division', width: 18 },
      { header: 'Agency', key: 'agency_type', width: 12 },
      { header: 'Block', key: 'block', width: 18 },
      { header: 'Village', key: 'village_name', width: 22 },
      { header: 'ESR Name', key: 'esr_name', width: 22 },
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
