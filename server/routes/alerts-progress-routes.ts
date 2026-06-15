import { Router } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/lpcd', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const dateFilter = requestedDate 
      ? `sent_date = $1::date` 
      : `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    const queryParams = requestedDate ? [requestedDate] : [];

    const client = await pool.connect();
    try {
      const query = `
        WITH issues AS (
          SELECT scheme_id, 
                 json_agg(json_build_object(
                   'problem_level', problem_level,
                   'village_name', village_name,
                   'esr_name', esr_name,
                   'reason', reason,
                   'status', status,
                   'status_value', status_value,
                   'resolution_remark', resolution_remark,
                   'created_at', created_at,
                   'resolved_at', resolved_at,
                   'creator_name', creator_name
                 )) as remarks
          FROM issue_reports
          WHERE sensor_type = 'LPCD' OR sensor_type IS NULL OR status_value LIKE '%LPCD%' OR reason LIKE '%LPCD%'
          GROUP BY scheme_id
        ),
        recent_logs AS (
          SELECT DISTINCT ON (scheme_id, village_name, sent_date) scheme_id, village_name, ticket_id, alert_value, civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email,
                 created_at, sent_date
          FROM email_alert_logs
          WHERE alert_type IN ('LPCD', 'Water')
            AND ${dateFilter}
          ORDER BY scheme_id, village_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', acknowledged_at
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, engineer_email, engineer_name, acknowledged_at,
                   ROW_NUMBER() OVER (PARTITION BY scheme_id, engineer_email ORDER BY created_at DESC) as rn
            FROM email_acknowledgements
            WHERE alert_type IN ('LPCD', 'Water')
              AND ${dateFilter}
          ) sub
          WHERE rn = 1
          GROUP BY scheme_id
        )
        SELECT 
          w.scheme_id, 
          w.scheme_name, 
          w.region,
          w.village_name,
          w.lpcd_value_day7 as current_value,
          w.lpcd_value_day6 as previous_value,
          e.alert_value as historical_value,
          e.civil_engineer_name, e.civil_engineer_email,
          e.mechanical_engineer_name, e.mechanical_engineer_email,
          e.site_supervisor_name, e.site_supervisor_email,
          e.created_at, e.sent_date, e.ticket_id,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM water_scheme_data w
        JOIN recent_logs e ON w.scheme_id = e.scheme_id AND w.village_name IS NOT DISTINCT FROM e.village_name
        JOIN scheme_status s ON w.scheme_id = s.scheme_id
        LEFT JOIN issues i ON w.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON w.scheme_id = a.scheme_id
        WHERE s.water_supply = 'Yes'
      `;
      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching LPCD alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch LPCD alerts progress' });
  }
});

router.get('/chlorine', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const dateFilter = requestedDate 
      ? `sent_date = $1::date` 
      : `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    const queryParams = requestedDate ? [requestedDate] : [];

    const client = await pool.connect();
    try {
      const query = `
        WITH issues AS (
          SELECT scheme_id, 
                 json_agg(json_build_object(
                   'problem_level', problem_level,
                   'village_name', village_name,
                   'esr_name', esr_name,
                   'reason', reason,
                   'status', status,
                   'status_value', status_value,
                   'resolution_remark', resolution_remark,
                   'created_at', created_at,
                   'resolved_at', resolved_at,
                   'creator_name', creator_name
                 )) as remarks
          FROM issue_reports
          WHERE sensor_type = 'RCA' OR status_value LIKE '%Chlorine%' OR reason LIKE '%Chlorine%' OR reason LIKE '%RCA%'
          GROUP BY scheme_id
        ),
        recent_logs AS (
          SELECT DISTINCT ON (scheme_id, esr_name, sent_date) scheme_id, esr_name, ticket_id, alert_value, civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email,
                 created_at, sent_date
          FROM email_alert_logs
          WHERE alert_type = 'Chlorine'
            AND ${dateFilter}
          ORDER BY scheme_id, esr_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', acknowledged_at
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, engineer_email, engineer_name, acknowledged_at,
                   ROW_NUMBER() OVER (PARTITION BY scheme_id, engineer_email ORDER BY created_at DESC) as rn
            FROM email_acknowledgements
            WHERE alert_type = 'Chlorine'
              AND ${dateFilter}
          ) sub
          WHERE rn = 1
          GROUP BY scheme_id
        )
        SELECT 
          c.scheme_id, 
          c.scheme_name, 
          c.region,
          c.village_name,
          c.esr_name,
          c.chlorine_value_7 as current_value,
          c.chlorine_value_6 as previous_value,
          e.alert_value as historical_value,
          e.civil_engineer_name, e.civil_engineer_email,
          e.mechanical_engineer_name, e.mechanical_engineer_email,
          e.site_supervisor_name, e.site_supervisor_email,
          e.created_at, e.sent_date, e.ticket_id,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM chlorine_data c
        JOIN recent_logs e ON c.scheme_id = e.scheme_id AND c.esr_name IS NOT DISTINCT FROM e.esr_name
        JOIN scheme_status s ON c.scheme_id = s.scheme_id
        LEFT JOIN issues i ON c.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON c.scheme_id = a.scheme_id
        WHERE s.water_supply = 'Yes'
      `;
      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Chlorine alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch Chlorine alerts progress' });
  }
});

router.get('/pressure', async (req, res) => {
  try {
    const requestedDate = req.query.date as string;
    const dateFilter = requestedDate 
      ? `sent_date = $1::date` 
      : `sent_date >= CURRENT_DATE - INTERVAL '1 day'`;
    const queryParams = requestedDate ? [requestedDate] : [];

    const client = await pool.connect();
    try {
      const query = `
        WITH issues AS (
          SELECT scheme_id, 
                 json_agg(json_build_object(
                   'problem_level', problem_level,
                   'village_name', village_name,
                   'esr_name', esr_name,
                   'reason', reason,
                   'status', status,
                   'status_value', status_value,
                   'resolution_remark', resolution_remark,
                   'created_at', created_at,
                   'resolved_at', resolved_at,
                   'creator_name', creator_name
                 )) as remarks
          FROM issue_reports
          WHERE sensor_type = 'PT' OR status_value LIKE '%Pressure%' OR reason LIKE '%Pressure%' OR reason LIKE '%PT%'
          GROUP BY scheme_id
        ),
        recent_logs AS (
          SELECT DISTINCT ON (scheme_id, esr_name, sent_date) scheme_id, esr_name, ticket_id, alert_value, civil_engineer_name, civil_engineer_email,
                 mechanical_engineer_name, mechanical_engineer_email,
                 site_supervisor_name, site_supervisor_email,
                 created_at, sent_date
          FROM email_alert_logs
          WHERE alert_type = 'Pressure'
            AND ${dateFilter}
          ORDER BY scheme_id, esr_name, sent_date, created_at DESC
        ),
        ack_status AS (
          SELECT scheme_id,
                 json_agg(json_build_object(
                   'engineer_email', engineer_email,
                   'engineer_name', engineer_name,
                   'acknowledged_at', acknowledged_at
                 )) as acknowledgements
          FROM (
            SELECT scheme_id, engineer_email, engineer_name, acknowledged_at,
                   ROW_NUMBER() OVER (PARTITION BY scheme_id, engineer_email ORDER BY created_at DESC) as rn
            FROM email_acknowledgements
            WHERE alert_type = 'Pressure'
              AND ${dateFilter}
          ) sub
          WHERE rn = 1
          GROUP BY scheme_id
        )
        SELECT 
          p.scheme_id, 
          p.scheme_name, 
          p.region,
          p.village_name,
          p.esr_name,
          p.pressure_value_7 as current_value,
          p.pressure_value_6 as previous_value,
          e.alert_value as historical_value,
          e.civil_engineer_name, e.civil_engineer_email,
          e.mechanical_engineer_name, e.mechanical_engineer_email,
          e.site_supervisor_name, e.site_supervisor_email,
          e.created_at, e.sent_date, e.ticket_id,
          COALESCE(i.remarks, '[]'::json) as remarks,
          COALESCE(a.acknowledgements, '[]'::json) as acknowledgements
        FROM pressure_data p
        JOIN recent_logs e ON p.scheme_id = e.scheme_id AND p.esr_name IS NOT DISTINCT FROM e.esr_name
        JOIN scheme_status s ON p.scheme_id = s.scheme_id
        LEFT JOIN issues i ON p.scheme_id = i.scheme_id
        LEFT JOIN ack_status a ON p.scheme_id = a.scheme_id
        WHERE s.water_supply = 'Yes'
      `;
      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Pressure alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch Pressure alerts progress' });
  }
});

router.get('/offline', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          c.id,
          c.scheme_id,
          c.scheme_name,
          c.region,
          c.village_name,
          c.esr_name,
          c.chlorine_status,
          c.pressure_status,
          c.flow_meter_status,
          c.chlorine_connected,
          c.pressure_connected,
          c.flow_meter_connected,
          c.last_seen,
          c.pressure_last_seen,
          v.employee_name as civil_engineer_name,
          v.email as civil_engineer_email,
          v.phone as civil_engineer_mobile
        FROM communication_status c
        INNER JOIN scheme_status s ON c.scheme_id = s.scheme_id
        LEFT JOIN (
          SELECT DISTINCT ON (region) region, employee_name, email, phone
          FROM vendor
          ORDER BY region, id
        ) v ON c.region = v.region
        WHERE (c.chlorine_status = 'Offline' 
           OR c.pressure_status = 'Offline' 
           OR c.flow_meter_status = 'Offline')
          AND s.water_supply = 'Yes'
        ORDER BY c.region, c.scheme_name, c.village_name;
      `;
      const result = await client.query(query);
      
      const mappedRows = result.rows.map((row: any) => {
        const offlineList: string[] = [];
        if (row.chlorine_status === 'Offline') offlineList.push('Chlorine');
        if (row.pressure_status === 'Offline') offlineList.push('Pressure');
        if (row.flow_meter_status === 'Offline') offlineList.push('Flow Meter');
        
        return {
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          region: row.region,
          village_name: row.village_name,
          esr_name: row.esr_name,
          current_value: offlineList.join(', '),
          previous_value: null,
          historical_value: null,
          civil_engineer_name: row.civil_engineer_name || 'No Vendor Assigned',
          civil_engineer_email: row.civil_engineer_email || null,
          civil_engineer_mobile: row.civil_engineer_mobile || null,
          mechanical_engineer_name: null,
          mechanical_engineer_email: null,
          site_supervisor_name: null,
          site_supervisor_email: null,
          created_at: new Date().toISOString(),
          remarks: []
        };
      });
      
      res.json(mappedRows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching Offline alerts progress:', error);
    res.status(500).json({ error: 'Failed to fetch Offline alerts progress' });
  }
});

router.get('/download-14-day-report', async (req, res) => {
  try {
    // Determine the last 14 dates from today
    const dbDates: string[] = []; // Used for querying database (e.g., '04-Jun')
    const displayDates: string[] = []; // Used for Excel headers (e.g., '04-06-2026')
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const day = String(d.getDate()).padStart(2, '0');
      
      // DB format
      const dbMonth = monthNames[d.getMonth()];
      dbDates.push(`${day}-${dbMonth}`);
      
      // Display format
      const numMonth = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      displayDates.push(`${day}-${numMonth}-${year}`);
    }

    const client = await pool.connect();
    try {
      // 1. Fetch base ESRs & hierarchy from the active data tables
      const esrQuery = `
        WITH all_esrs AS (
          SELECT region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name
          FROM chlorine_data
          WHERE esr_name IS NOT NULL
          UNION
          SELECT region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name
          FROM pressure_data
          WHERE esr_name IS NOT NULL
        )
        SELECT e.region, e.circle, e.division, e.sub_division, e.block, e.scheme_id, e.scheme_name, e.village_name, e.esr_name,
               sed.civil_engineer_name, sed.mechanical_engineer_name
        FROM all_esrs e
        LEFT JOIN scheme_engineer_details sed ON e.scheme_id = sed.scheme_id
        ORDER BY e.circle, e.division, e.sub_division, e.block, e.scheme_id, e.village_name, e.esr_name
      `;
      const { rows: esrs } = await client.query(esrQuery);

      if (esrs.length === 0) {
        return res.status(404).json({ error: 'No ESR data found' });
      }

      // 2. Fetch history data for the 14 dates
      const dateInClause = dbDates.map(d => `'${d}'`).join(',');
      
      const { rows: lpcdData } = await client.query(`
        SELECT scheme_id, village_name, data_date, lpcd_value
        FROM water_scheme_data_history
        WHERE data_date IN (${dateInClause})
      `);

      const { rows: chlorineData } = await client.query(`
        SELECT scheme_id, esr_name, chlorine_date, chlorine_value
        FROM chlorine_history
        WHERE chlorine_date IN (${dateInClause})
      `);

      const { rows: pressureData } = await client.query(`
        SELECT scheme_id, esr_name, pressure_date, pressure_value
        FROM pressure_history
        WHERE pressure_date IN (${dateInClause})
      `);

      // 3. Group data for quick lookup
      const lpcdMap = new Map();
      lpcdData.forEach(r => {
        const key = `${r.scheme_id}_${r.village_name?.trim()}_${r.data_date}`;
        lpcdMap.set(key, Number(r.lpcd_value));
      });

      const clMap = new Map();
      chlorineData.forEach(r => {
        const key = `${r.scheme_id}_${r.esr_name?.trim()}_${r.chlorine_date}`;
        clMap.set(key, Number(r.chlorine_value));
      });

      const ptMap = new Map();
      pressureData.forEach(r => {
        const key = `${r.scheme_id}_${r.esr_name?.trim()}_${r.pressure_date}`;
        ptMap.set(key, Number(r.pressure_value));
      });

      // Group ESRs by village
      const villageGroups = new Map();
      esrs.forEach(esr => {
        const vKey = `${esr.scheme_id}_${esr.village_name}`;
        if (!villageGroups.has(vKey)) {
          villageGroups.set(vKey, []);
        }
        villageGroups.get(vKey).push(esr);
      });

      // 4. Build Excel
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.default.Workbook();
      const sheet = workbook.addWorksheet('14-Day History');

      // Top Header Row
      const week1Title = `${displayDates[0]} to ${displayDates[6]}`;
      const week2Title = `${displayDates[7]} to ${displayDates[13]}`;

      const headerRow1 = [
        'Sr No.', 'Circle', 'Division', 'Sub Division', 'Block', 'Scheme ID', 'Scheme Name', 'Village Name', 'ESR Name',
        week1Title, '', '', '',
        week2Title, '', '', '',
        'Reporting to MJP'
      ];
      
      const headerRow2 = [
        '', '', '', '', '', '', '', '', '',
        'Date', '< 55 LPCD', '< 0.2 mg/l', '< 0.2 bar',
        'Date', '< 55 LPCD', '< 0.2 mg/l', '< 0.2 bar',
        ''
      ];

      const weekDatesDB = [...dbDates.slice(0, 7), ...dbDates.slice(7, 14)];
      const weekDatesDisplay = [...displayDates.slice(0, 7), ...displayDates.slice(7, 14)];
      
      sheet.addRow(headerRow1);
      sheet.addRow(headerRow2);

      // Merge header rows
      for (let col = 1; col <= 9; col++) {
        sheet.mergeCells(1, col, 2, col);
      }
      sheet.mergeCells(1, 10, 1, 13); // Week 1 title
      sheet.mergeCells(1, 14, 1, 17); // Week 2 title
      sheet.mergeCells(1, 18, 2, 18); // Reporting to MJP
      
      // Style headers
      const alignCenter = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).alignment = alignCenter as any;
      sheet.getRow(2).font = { bold: true };
      sheet.getRow(2).alignment = alignCenter as any;

      // Add Data Rows
      let srNo = 1;
      let currentRowIdx = 3;

      for (const [vKey, vEsrs] of villageGroups.entries()) {
        const esrArray = Array.isArray(vEsrs) ? vEsrs : [vEsrs]; // ensure it's an array
        const villageStartRow = currentRowIdx;

        const w1DatesStr = weekDatesDisplay.slice(0, 7).join('\n');
        const w2DatesStr = weekDatesDisplay.slice(7, 14).join('\n');
        
        const firstEsr = esrArray[0];
        const w1LpcdArr = weekDatesDB.slice(0, 7).map(dbDate => {
           const lpcdKey = `${firstEsr.scheme_id}_${firstEsr.village_name?.trim()}_${dbDate}`;
           const val = lpcdMap.has(lpcdKey) ? lpcdMap.get(lpcdKey) : null;
           return val !== null ? (val < 55 ? 'YES' : 'NO') : 'No Value';
        });
        const w2LpcdArr = weekDatesDB.slice(7, 14).map(dbDate => {
           const lpcdKey = `${firstEsr.scheme_id}_${firstEsr.village_name?.trim()}_${dbDate}`;
           const val = lpcdMap.has(lpcdKey) ? lpcdMap.get(lpcdKey) : null;
           return val !== null ? (val < 55 ? 'YES' : 'NO') : 'No Value';
        });

        const buildLpcdRichText = (arr: string[]) => ({
            richText: arr.map((val, idx) => {
                const text = val + (idx < arr.length - 1 ? '\n' : '');
                if (val === 'YES') {
                    return { text, font: { color: { argb: 'FFFF0000' } } };
                }
                return { text };
            })
        });

        for (let i = 0; i < esrArray.length; i++) {
          const esr = esrArray[i];
          const esrStartRow = currentRowIdx;
          
          const mjpStaff = [];
          if (esr.civil_engineer_name) mjpStaff.push(esr.civil_engineer_name + ' ( Civil )');
          if (esr.mechanical_engineer_name) mjpStaff.push(esr.mechanical_engineer_name + ' ( Mech )');
          const mjpStaffText = mjpStaff.length > 0 ? mjpStaff.join('\\n') : 'No Value';

          for (let r = 0; r < 7; r++) {
            const rowData = [
               (i === 0 && r === 0) ? srNo : '',
               (i === 0 && r === 0) ? (esr.circle || '') : '',
               (i === 0 && r === 0) ? (esr.division || '') : '',
               (i === 0 && r === 0) ? (esr.sub_division || '') : '',
               (i === 0 && r === 0) ? (esr.block || '') : '',
               (i === 0 && r === 0) ? (esr.scheme_id || '') : '',
               (i === 0 && r === 0) ? (esr.scheme_name || '') : '',
               (i === 0 && r === 0) ? (esr.village_name || '') : '',
               r === 0 ? (esr.esr_name || '') : ''
            ];

             const w1Idx = r;
             const w1DbDate = weekDatesDB[w1Idx];
             const clKey1 = `${esr.scheme_id}_${esr.esr_name?.trim()}_${w1DbDate}`;
             const ptKey1 = `${esr.scheme_id}_${esr.esr_name?.trim()}_${w1DbDate}`;
             const clVal1 = clMap.has(clKey1) ? clMap.get(clKey1) : null;
             const ptVal1 = ptMap.has(ptKey1) ? ptMap.get(ptKey1) : null;

             if (i === 0 && r === 0) {
                 rowData.push(w1DatesStr);
                 rowData.push(''); // Placeholder for LPCD rich text
             } else {
                 rowData.push('');
                 rowData.push('');
             }
             rowData.push(clVal1 !== null ? (clVal1 < 0.2 ? 'YES' : 'NO') : 'No Value');
             rowData.push(ptVal1 !== null ? (ptVal1 < 0.2 ? 'YES' : 'NO') : 'No Value');

             const w2Idx = r + 7;
             const w2DbDate = weekDatesDB[w2Idx];
             const clKey2 = `${esr.scheme_id}_${esr.esr_name?.trim()}_${w2DbDate}`;
             const ptKey2 = `${esr.scheme_id}_${esr.esr_name?.trim()}_${w2DbDate}`;
             const clVal2 = clMap.has(clKey2) ? clMap.get(clKey2) : null;
             const ptVal2 = ptMap.has(ptKey2) ? ptMap.get(ptKey2) : null;

             if (i === 0 && r === 0) {
                 rowData.push(w2DatesStr);
                 rowData.push(''); // Placeholder for LPCD rich text
             } else {
                 rowData.push('');
                 rowData.push('');
             }
             rowData.push(clVal2 !== null ? (clVal2 < 0.2 ? 'YES' : 'NO') : 'No Value');
             rowData.push(ptVal2 !== null ? (ptVal2 < 0.2 ? 'YES' : 'NO') : 'No Value');

             rowData.push(r === 0 ? mjpStaffText : '');

             const addedRow = sheet.addRow(rowData);
             addedRow.alignment = alignCenter as any;

             if (i === 0 && r === 0) {
                 const dateCell1 = addedRow.getCell(10);
                 dateCell1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                 const lpcdCell1 = addedRow.getCell(11);
                 lpcdCell1.value = buildLpcdRichText(w1LpcdArr) as any;
                 lpcdCell1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                 
                 const dateCell2 = addedRow.getCell(14);
                 dateCell2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                 const lpcdCell2 = addedRow.getCell(15);
                 lpcdCell2.value = buildLpcdRichText(w2LpcdArr) as any;
                 lpcdCell2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
             }

             const clCell1 = addedRow.getCell(12);
             if (clCell1.value === 'YES') clCell1.font = { color: { argb: 'FFFF0000' } };
             const ptCell1 = addedRow.getCell(13);
             if (ptCell1.value === 'YES') ptCell1.font = { color: { argb: 'FFFF0000' } };

             const clCell2 = addedRow.getCell(16);
             if (clCell2.value === 'YES') clCell2.font = { color: { argb: 'FFFF0000' } };
             const ptCell2 = addedRow.getCell(17);
             if (ptCell2.value === 'YES') ptCell2.font = { color: { argb: 'FFFF0000' } };

             currentRowIdx++;
          }
          
          const esrEndRow = currentRowIdx - 1;
          if (esrEndRow > esrStartRow) {
             sheet.mergeCells(esrStartRow, 9, esrEndRow, 9); // Merge ESR Name
             sheet.mergeCells(esrStartRow, 18, esrEndRow, 18); // Merge Reporting to MJP
          }
        }
        
        const villageEndRow = currentRowIdx - 1;
        if (villageEndRow > villageStartRow) {
            // Merge Village info columns (Sr No to Village Name) across the entire village
            for (let col = 1; col <= 8; col++) {
                sheet.mergeCells(villageStartRow, col, villageEndRow, col);
            }
            
            // Merge Date and LPCD across the entire village
            sheet.mergeCells(villageStartRow, 10, villageEndRow, 10);
            sheet.mergeCells(villageStartRow, 11, villageEndRow, 11);
            sheet.mergeCells(villageStartRow, 14, villageEndRow, 14);
            sheet.mergeCells(villageStartRow, 15, villageEndRow, 15);
        }

        srNo++;
      }

      // Add borders
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="14_Day_History_Report.xlsx"');
      
      await workbook.xlsx.write(res);
      res.end();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
