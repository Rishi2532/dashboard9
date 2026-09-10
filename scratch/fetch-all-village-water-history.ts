import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import { fetchWithRetry } from '../server/services/pi-web-api-service.ts';
import ExcelJS from 'exceljs';
import path from 'path';
import { format, addDays } from 'date-fns';

interface VillageEntry {
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  agency_type: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  population: number;
  number_of_esr: number;
  assetPath: string;
  dates: { [dateKey: string]: number };
}

async function main() {
  console.log('🚀 Starting Lifetime Village Water Consumption Fetch (using "Calc - Water Consumption per day" and Blank before Start Date)...');
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
      w.population,
      w.number_of_esr,
      COALESCE(ss.agency_type, 'MJP') as agency_type,
      w.dashboard_url
    FROM (
      SELECT DISTINCT ON (scheme_id, village_name)
        region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, population, number_of_esr, dashboard_url
      FROM water_scheme_data
      WHERE lower(region) LIKE '%amravati%'
    ) w
    LEFT JOIN (
      SELECT DISTINCT ON (scheme_id) scheme_id, agency_type
      FROM scheme_status
      WHERE agency_type IS NOT NULL
    ) ss ON ss.scheme_id = w.scheme_id
    ORDER BY w.circle, w.division, w.sub_division, w.block, w.scheme_id, w.village_name
  `);

  console.log(`Loaded ${dbRows.rows.length} unique villages from database.`);

  const villageList: VillageEntry[] = [];

  for (const row of dbRows.rows as any[]) {
    let assetPath = '';
    if (row.dashboard_url) {
      const match = row.dashboard_url.match(/asset=([^&]+)/);
      if (match) {
        assetPath = decodeURIComponent(match[1]);
        if (!assetPath.startsWith('\\\\')) {
          assetPath = '\\\\' + assetPath.replace(/^\\+/, '');
        }
      }
    }
    if (!assetPath) continue;

    villageList.push({
      region: row.region || 'Amravati',
      circle: row.circle || '',
      division: row.division || '',
      sub_division: row.sub_division || '',
      block: row.block || '',
      agency_type: row.agency_type || 'MJP',
      scheme_id: row.scheme_id || '',
      scheme_name: row.scheme_name || '',
      village_name: row.village_name || '',
      population: row.population ? parseInt(String(row.population), 10) || 0 : 0,
      number_of_esr: row.number_of_esr ? parseInt(String(row.number_of_esr), 10) || 0 : 0,
      assetPath,
      dates: {}
    });
  }

  console.log(`Processing ${villageList.length} Villages with valid PI AF Asset Paths...`);

  const CONCURRENCY = 15;
  let completed = 0;
  let successCount = 0;
  let emptyCount = 0;

  async function processVillage(village: VillageEntry) {
    try {
      // 1. Get Element WebId
      const elemRes = await fetchWithRetry(`/elements?path=${encodeURIComponent(village.assetPath)}`);
      const elemWebId = elemRes?.data?.WebId;
      if (!elemWebId) {
        emptyCount++;
        return;
      }

      // 2. Select "Calc - Water Consumption per day" attribute (EXCLUDE "for lpcd")
      const attrsRes = await fetchWithRetry(`/elements/${elemWebId}/attributes?nameFilter=*Water Consumption*`);
      const items = attrsRes?.data?.Items || [];
      
      // Target Calc - Water Consumption per day or with MBR (NOT For LPCD)
      const waterAttr = items.find((i: any) => i.Name.toLowerCase() === 'calc - water consumption per day') ||
        items.find((i: any) => i.Name.toLowerCase() === 'calc - water consumption per day with mbr') ||
        items.find((i: any) => i.Name.toLowerCase().includes('water consumption per day') && !i.Name.toLowerCase().includes('lpcd')) ||
        items.find((i: any) => !i.Name.toLowerCase().includes('lpcd')) ||
        items[0];

      if (!waterAttr?.WebId) {
        emptyCount++;
        return;
      }

      // 3. Query daily summary from 2024-01-01 to now
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
              // Convert to local Indian date (IST)
              const y = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
              village.dates[y] = parseFloat(numVal.toFixed(2));
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
      if (completed % 50 === 0 || completed === villageList.length) {
        const elapsedSec = ((Date.now() - tStart) / 1000).toFixed(1);
        console.log(`[${completed}/${villageList.length}] Villages processed (${elapsedSec}s elapsed). Active: ${successCount}, Offline/No-Data: ${emptyCount}`);
      }
    }
  }

  // Execute in parallel batches
  for (let i = 0; i < villageList.length; i += CONCURRENCY) {
    const batch = villageList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(v => processVillage(v)));
  }

  console.log(`\n🎉 PI Web API Village Fetch Complete! Generating Continuous Calendar Grid...`);

  // Build a STRICTLY CONTINUOUS, UNBROKEN CALENDAR SEQUENCE with NO SKIPPED DAYS
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
  console.log('Building Excel workbook with full lifetime village columns...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JJM Maharashtra Water Dashboard';
  workbook.lastModifiedBy = 'JJM System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Village Water Consumption', {
    views: [{ state: 'frozen', xSplit: 11, ySplit: 1 }] // freeze first 11 columns & header row
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
    'Population',
    'Number of ESRs'
  ];

  const allHeaders = [...baseHeaders, ...continuousDateHeaders];

  // Add header row
  const headerRow = worksheet.addRow(allHeaders);
  headerRow.height = 26;

  // Header Styling (Sky Blue fill)
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF87CEEB' }
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FF002060' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber >= 10 ? 'right' : 'center',
      wrapText: false
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0C4DE' } },
      bottom: { style: 'medium', color: { argb: 'FF4682B4' } },
      left: { style: 'thin', color: { argb: 'FFB0C4DE' } },
      right: { style: 'thin', color: { argb: 'FFB0C4DE' } }
    };
  });

  // Add Village data rows
  villageList.forEach((village) => {
    const rowValues: (string | number)[] = [
      village.region,
      village.circle,
      village.division,
      village.sub_division,
      village.block,
      village.agency_type,
      village.scheme_id,
      village.scheme_name,
      village.village_name,
      village.population,
      village.number_of_esr
    ];

    // Determine the village's first integration / active start date
    const recordedDateKeys = Object.keys(village.dates).sort();
    const villageStartDate = recordedDateKeys.length > 0 ? recordedDateKeys[0] : null;

    // Match each calendar date key
    continuousDateKeys.forEach((dateKey) => {
      if (!villageStartDate || dateKey < villageStartDate) {
        rowValues.push(''); // Blank cell before installation / integration start date
      } else {
        const val = village.dates[dateKey];
        rowValues.push(val !== undefined ? val : 0);
      }
    });

    const dataRow = worksheet.addRow(rowValues);
    dataRow.height = 20;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
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
      } else if (colNumber === 10 || colNumber === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
      } else if (colNumber > 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') {
          cell.numFmt = '0.00';
        }
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
    else if (index === 9) column.width = 14;
    else if (index === 10) column.width = 16;
    else column.width = 16;
  });

  const outputPath = path.resolve('c:/Users/12626/dashboard8/Amravati_Village_Water_Consumption_History_From_Start.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  const totalDuration = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`✅ COMPLETE! Generated Lifetime Amravati Village Excel report using "Calc - Water Consumption per day" in ${totalDuration}s at: ${outputPath}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
