import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';
import ExcelJS from 'exceljs';
import path from 'path';
import { format, addDays } from 'date-fns';

interface ESREntry {
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  agency_type: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  esr_capacity: number;
  assetPath: string;
  dates: { [dateKey: string]: number };
}

async function main() {
  console.log('🚀 Starting Complete Unbroken Lifetime ESR Water Consumption Fetch for Amravati from PI Web API...');
  const tStart = Date.now();

  const db = await getDB();
  const dbRows = await db.execute(sql`
    SELECT 
      w.region,
      w.circle,
      w.division,
      w.sub_division,
      w.block,
      w.scheme_id,
      w.scheme_name,
      w.village_name,
      w.esr_name,
      w.esr_capacity,
      COALESCE(ss.agency_type, 'MJP') as agency_type,
      w.dashboard_url
    FROM (
      SELECT DISTINCT ON (scheme_id, village_name, esr_name)
        region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name, esr_capacity, dashboard_url
      FROM water_consumption_history
      WHERE lower(region) LIKE '%amravati%'
    ) w
    LEFT JOIN (
      SELECT DISTINCT ON (scheme_id) scheme_id, agency_type
      FROM scheme_status
      WHERE agency_type IS NOT NULL
    ) ss ON ss.scheme_id = w.scheme_id
    ORDER BY w.circle, w.division, w.sub_division, w.block, w.scheme_id, w.village_name, w.esr_name
  `);

  console.log(`Loaded ${dbRows.rows.length} unique ESRs from database.`);

  const esrList: ESREntry[] = [];

  for (const row of dbRows.rows as any[]) {
    const match = row.dashboard_url ? row.dashboard_url.match(/asset=([^&]+)/) : null;
    const assetPath = match ? decodeURIComponent(match[1]) : '';
    if (!assetPath) continue;

    let cap = 0;
    if (row.esr_capacity !== null && row.esr_capacity !== undefined) {
      const numCap = parseFloat(String(row.esr_capacity).replace(/[^\d.]/g, ''));
      cap = isNaN(numCap) ? 0 : numCap;
    }

    esrList.push({
      region: row.region || 'Amravati',
      circle: row.circle || '',
      division: row.division || '',
      sub_division: row.sub_division || '',
      block: row.block || '',
      agency_type: row.agency_type || 'MJP',
      scheme_id: row.scheme_id || '',
      scheme_name: row.scheme_name || '',
      village_name: row.village_name || '',
      esr_name: row.esr_name || '',
      esr_capacity: cap,
      assetPath,
      dates: {}
    });
  }

  console.log(`Processing ${esrList.length} ESRs with valid PI AF Asset Paths...`);

  const CONCURRENCY = 15;
  let completed = 0;
  let successCount = 0;
  let emptyCount = 0;

  async function processESR(esr: ESREntry) {
    try {
      const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(esr.assetPath)}`);
      const elemWebId = elemRes?.data?.WebId;
      if (!elemWebId) {
        emptyCount++;
        return;
      }

      const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
      const items = attrsRes?.data?.Items || [];
      const waterAttr = items.find((i: any) => i.Name.toLowerCase() === 'calc - water consumption per day') || items[0];

      if (!waterAttr?.WebId) {
        emptyCount++;
        return;
      }

      const sumRes = await fetchWithRetry(`/streams/${waterAttr.WebId}/summary?startTime=2024-01-01&endTime=*&summaryType=Maximum&summaryDuration=1d`);
      const sumItems = sumRes?.data?.Items || [];

      let validPointsCount = 0;

      for (const it of sumItems) {
        const pt = it?.Value;
        if (!pt) continue;

        if (pt.Good === false) continue;
        if (typeof pt.Value === 'object' && (pt.Value.IsSystem || pt.Value.Name === 'Pt Created' || pt.Value.Name === 'Calc Failed')) {
          continue;
        }

        let numVal: number | null = null;
        if (typeof pt.Value === 'number') {
          numVal = pt.Value;
        } else if (typeof pt === 'number') {
          numVal = pt;
        }

        if (numVal !== null && !isNaN(numVal)) {
          const ts = pt.Timestamp || it.Timestamp;
          if (ts) {
            const dateObj = new Date(ts);
            if (!isNaN(dateObj.getTime())) {
              const dateKey = format(dateObj, 'yyyy-MM-dd');
              esr.dates[dateKey] = parseFloat(numVal.toFixed(2));
              validPointsCount++;
            }
          }
        }
      }

      if (validPointsCount > 0) {
        successCount++;
      } else {
        emptyCount++;
      }
    } catch (err: any) {
      emptyCount++;
    } finally {
      completed++;
      if (completed % 50 === 0 || completed === esrList.length) {
        const elapsedSec = ((Date.now() - tStart) / 1000).toFixed(1);
        console.log(`[${completed}/${esrList.length}] ESRs processed (${elapsedSec}s elapsed). Active ESRs: ${successCount}, Offline/No-Data: ${emptyCount}`);
      }
    }
  }

  // Execute in parallel batches
  for (let i = 0; i < esrList.length; i += CONCURRENCY) {
    const batch = esrList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(esr => processESR(esr)));
  }

  console.log(`\n🎉 PI Web API Lifetime Fetch Complete! Generating Continuous Calendar Grid...`);

  // Continuous Calendar Sequence from 16-Nov-2024 to 04-Sep-2026
  const startDate = new Date(2024, 10, 16); // 16-Nov-2024
  const endDate = new Date(2026, 8, 4);    // 04-Sep-2026

  const continuousDateKeys: string[] = [];
  const continuousDateHeaders: string[] = [];

  let current = new Date(startDate);
  while (current <= endDate) {
    const dKey = format(current, 'yyyy-MM-dd');
    const dLabel = `${format(current, 'dd-MMM-yyyy')} (LL)`;
    continuousDateKeys.push(dKey);
    continuousDateHeaders.push(dLabel);
    current = addDays(current, 1);
  }

  console.log(`Total continuous calendar days generated: ${continuousDateKeys.length} (From ${continuousDateHeaders[0]} to ${continuousDateHeaders[continuousDateHeaders.length - 1]})`);

  // Build Excel Workbook
  console.log('Building Excel workbook with full unbroken calendar columns...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JJM Maharashtra Water Dashboard';
  workbook.lastModifiedBy = 'JJM System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Water Consumption Data', {
    views: [{ state: 'frozen', xSplit: 10, ySplit: 1 }]
  });

  // Base Headers
  const baseHeaders = [
    'Region',
    'Circle',
    'Division',
    'Sub Division',
    'Block',
    'Agency Type',
    'Scheme ID',
    'Scheme Name',
    'Village Name',
    'ESR Name',
    'ESR Capacity (LL)'
  ];

  const allHeaders = [...baseHeaders, ...continuousDateHeaders];

  // Add header row
  const headerRow = worksheet.addRow(allHeaders);
  headerRow.height = 26;

  // Header Styling
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF87CEEB' } // Sky Blue
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FF002060' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber >= 11 ? 'right' : 'center',
      wrapText: false
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0C4DE' } },
      bottom: { style: 'medium', color: { argb: 'FF4682B4' } },
      left: { style: 'thin', color: { argb: 'FFB0C4DE' } },
      right: { style: 'thin', color: { argb: 'FFB0C4DE' } }
    };
  });

  // Add ESR data rows
  esrList.forEach((esr) => {
    const rowValues: (string | number)[] = [
      esr.region,
      esr.circle,
      esr.division,
      esr.sub_division,
      esr.block,
      esr.agency_type,
      esr.scheme_id,
      esr.scheme_name,
      esr.village_name,
      esr.esr_name,
      esr.esr_capacity
    ];

    // Strictly match every single calendar date key
    continuousDateKeys.forEach((dateKey) => {
      const val = esr.dates[dateKey];
      rowValues.push(val !== undefined ? val : 0);
    });

    const dataRow = worksheet.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };

      if (colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = '@';
      } else if (colNumber === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '0.00';
      } else if (colNumber > 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '0.00';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // Set column widths
  worksheet.columns.forEach((column, index) => {
    if (index === 0) column.width = 14;
    else if (index === 1) column.width = 14;
    else if (index === 2) column.width = 16;
    else if (index === 3) column.width = 16;
    else if (index === 4) column.width = 16;
    else if (index === 5) column.width = 14;
    else if (index === 6) column.width = 14;
    else if (index === 7) column.width = 38;
    else if (index === 8) column.width = 24;
    else if (index === 9) column.width = 28;
    else if (index === 10) column.width = 18;
    else column.width = 16; // Date columns
  });

  const outputPath = path.resolve('c:/Users/12626/dashboard8/Amravati_Water_Consumption_History_From_Start.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  const totalDuration = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`✅ COMPLETE! Generated Lifetime Amravati ESR Excel report in ${totalDuration}s with ${continuousDateKeys.length} unbroken calendar date columns at: ${outputPath}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
