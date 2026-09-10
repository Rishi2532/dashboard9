import { getDB } from '../server/db.ts';
import { sql } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import path from 'path';
import { format } from 'date-fns';

async function generateAmravatiExcel() {
  console.log('Fetching Amravati water consumption history with full year headers...');
  const db = await getDB();

  // Fetch all history records for Amravati joined with scheme_status to get agency_type
  const result = await db.execute(sql`
    SELECT 
      w.region,
      w.circle,
      w.division,
      w.sub_division,
      w.block,
      COALESCE(ss.agency_type, 'MJP') as agency_type,
      w.scheme_id,
      w.scheme_name,
      w.village_name,
      w.esr_name,
      w.esr_capacity,
      w.data_date,
      w.water_value,
      w.uploaded_at
    FROM water_consumption_history w
    LEFT JOIN (
      SELECT DISTINCT ON (scheme_id) scheme_id, agency_type
      FROM scheme_status
      WHERE agency_type IS NOT NULL
    ) ss ON ss.scheme_id = w.scheme_id
    WHERE lower(w.region) LIKE '%amravati%'
    ORDER BY w.circle, w.division, w.sub_division, w.block, w.scheme_id, w.village_name, w.esr_name, w.uploaded_at ASC
  `);

  console.log(`Total rows fetched: ${result.rows.length}`);

  if (result.rows.length === 0) {
    console.log('No data found.');
    process.exit(1);
  }

  // Map to group by ESR
  const esrMap = new Map<string, {
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
    esr_capacity: number | string;
    dates: { [key: string]: number };
  }>();

  const monthLookup: { [key: string]: number } = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };

  const parseDataDate = (dateStr: string, uploadedAt?: any): Date => {
    const match = dateStr.match(/^(\d{1,2})-([a-zA-Z]{3})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monStr = match[2].toLowerCase();
      const month = monthLookup[monStr] !== undefined ? monthLookup[monStr] : 0;
      let year = 2026;
      if (uploadedAt) {
        const uDate = new Date(uploadedAt);
        if (!isNaN(uDate.getFullYear())) year = uDate.getFullYear();
      }
      return new Date(year, month, day);
    }
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;
    return new Date(2026, 0, 1);
  };

  // Map unique date identifier -> formatted label with year & Date object for sorting
  // Key: raw data_date e.g. "29-May"
  const dateInfoMap = new Map<string, { label: string; dateObj: Date }>();

  for (const row of result.rows as any[]) {
    const esrKey = `${row.scheme_id}__${row.village_name}__${row.esr_name}`;

    if (!esrMap.has(esrKey)) {
      let cap = row.esr_capacity;
      if (cap !== null && cap !== undefined && cap !== '') {
        const numCap = parseFloat(String(cap).replace(/[^\d.]/g, ''));
        cap = isNaN(numCap) ? cap : numCap;
      } else {
        cap = 0;
      }

      esrMap.set(esrKey, {
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
        dates: {}
      });
    }

    const esr = esrMap.get(esrKey)!;
    const rawDateStr = row.data_date;
    if (rawDateStr) {
      if (!dateInfoMap.has(rawDateStr)) {
        const dObj = parseDataDate(rawDateStr, row.uploaded_at);
        // Header with full year: e.g. "29-May-2026 (LL)"
        const formattedLabel = `${format(dObj, 'dd-MMM-yyyy')} (LL)`;
        dateInfoMap.set(rawDateStr, { label: formattedLabel, dateObj: dObj });
      }
      const val = row.water_value !== null && row.water_value !== undefined ? parseFloat(String(row.water_value)) : 0;
      esr.dates[rawDateStr] = isNaN(val) ? 0 : val;
    }
  }

  // Sort dates chronologically
  const sortedRawDates = Array.from(dateInfoMap.keys()).sort((a, b) => {
    return dateInfoMap.get(a)!.dateObj.getTime() - dateInfoMap.get(b)!.dateObj.getTime();
  });

  console.log(`Unique ESRs: ${esrMap.size}`);
  console.log(`Sorted Date Columns (${sortedRawDates.length}):`);
  console.log(sortedRawDates.map(r => dateInfoMap.get(r)!.label));

  // Build Excel Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'JJM Maharashtra Water Dashboard';
  workbook.lastModifiedBy = 'JJM System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Water Consumption Data', {
    views: [{ state: 'frozen', xSplit: 10, ySplit: 1 }] // freeze panes after ESR Name & Header
  });

  // Base Headers matching standard format
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

  // Dynamic Date Headers with year: e.g. "29-May-2026 (LL)"
  const dateHeaders = sortedRawDates.map(r => dateInfoMap.get(r)!.label);
  const allHeaders = [...baseHeaders, ...dateHeaders];

  // Add header row
  const headerRow = worksheet.addRow(allHeaders);
  headerRow.height = 26;

  // Header Styling (Sky Blue fill, dark/bold text, thin borders, centered)
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF87CEEB' } // Sky Blue matching reference image
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FF002060' } // Deep navy/slate bold text
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
  esrMap.forEach((esr) => {
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
      typeof esr.esr_capacity === 'number' ? esr.esr_capacity : parseFloat(String(esr.esr_capacity)) || 0
    ];

    // Add consumption for each date
    sortedRawDates.forEach((rawDate) => {
      const val = esr.dates[rawDate];
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

      // Alignment and number formatting
      if (colNumber === 7) { // Scheme ID
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = '@';
      } else if (colNumber === 11) { // ESR Capacity
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '0.00';
      } else if (colNumber > 11) { // Date consumption values
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '0.00';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // Column widths
  worksheet.columns.forEach((column, index) => {
    if (index === 0) column.width = 14; // Region
    else if (index === 1) column.width = 14; // Circle
    else if (index === 2) column.width = 16; // Division
    else if (index === 3) column.width = 16; // Sub Division
    else if (index === 4) column.width = 16; // Block
    else if (index === 5) column.width = 14; // Agency Type
    else if (index === 6) column.width = 14; // Scheme ID
    else if (index === 7) column.width = 38; // Scheme Name
    else if (index === 8) column.width = 24; // Village Name
    else if (index === 9) column.width = 28; // ESR Name
    else if (index === 10) column.width = 18; // ESR Capacity (LL)
    else column.width = 16; // Date columns e.g. "29-May-2026 (LL)"
  });

  const outputPath = path.resolve('c:/Users/12626/dashboard8/Amravati_Water_Consumption_History_From_Start.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Successfully generated Amravati Excel report with year in headers at: ${outputPath}`);

  process.exit(0);
}

generateAmravatiExcel().catch(err => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
