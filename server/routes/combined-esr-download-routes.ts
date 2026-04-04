import express from "express";
import { storage } from "../storage";
import ExcelJS from "exceljs";
import { sql } from "drizzle-orm";

const router = express.Router();

interface ESRCombinedData {
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  water_value: string | null;
  water_date: string | null;
  chlorine_value: string | null;
  chlorine_date: string | null;
  pressure_value: string | null;
  pressure_date: string | null;
}

const VALID_REGIONS = [
  "Nagpur",
  "Amravati",
  "Nashik",
  "Pune",
  "Konkan",
  "Chhatrapati Sambhajinagar"
];

function sanitizeRegion(region: string | undefined): string | null {
  if (!region || region === 'all') return null;
  const sanitized = String(region).trim();
  if (VALID_REGIONS.includes(sanitized)) {
    return sanitized;
  }
  return null;
}

function sanitizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(dateStr)) {
    return dateStr;
  }
  return null;
}

router.get("/latest", async (req, res) => {
  try {
    const regionParam = req.query.region as string | undefined;
    const sanitizedRegion = sanitizeRegion(regionParam);
    const agencyType = req.query.agencyType as string | undefined;

    console.log(`📥 Combined ESR latest data download request. Region: ${sanitizedRegion || 'all'}, AgencyType: ${agencyType || 'ALL'}`);

    const db = await storage.getDb();

    const regionFilter = sanitizedRegion
      ? sql`AND wc.region = ${sanitizedRegion}`
      : sql``;

    const agencyFilter = (agencyType && agencyType !== 'ALL' && agencyType !== 'all')
      ? sql`AND EXISTS (
          SELECT 1 FROM scheme_status ss 
          WHERE ss.scheme_id = wc.scheme_id 
          AND ss.agency_type = ${agencyType}
        )`
      : sql``;

    const result = await db.execute(sql`
      SELECT 
        wc.region,
        wc.circle,
        wc.division,
        wc.sub_division,
        wc.block,
        wc.scheme_id,
        wc.scheme_name,
        wc.village_name,
        wc.esr_name,
        wc.water_value_day7 as water_value,
        wc.water_date_day7 as water_date,
        cd.chlorine_value_7 as chlorine_value,
        cd.chlorine_date_day_7 as chlorine_date,
        pd.pressure_value_7 as pressure_value,
        pd.pressure_date_day_7 as pressure_date
      FROM water_consumption wc
      LEFT JOIN chlorine_data cd ON 
        wc.scheme_id = cd.scheme_id AND 
        wc.village_name = cd.village_name AND 
        wc.esr_name = cd.esr_name
      LEFT JOIN pressure_data pd ON 
        wc.scheme_id = pd.scheme_id AND 
        wc.village_name = pd.village_name AND 
        wc.esr_name = pd.esr_name
      WHERE 1=1 ${regionFilter} ${agencyFilter}
      ORDER BY wc.region, wc.circle, wc.division, wc.sub_division, wc.block, wc.scheme_name, wc.village_name, wc.esr_name
    `);

    console.log(`✅ Found ${result.rows.length} combined ESR records`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ESR Combined Data - Latest');

    const headers = [
      'Region', 'Circle', 'Division', 'Sub Division', 'Block',
      'Scheme ID', 'Scheme Name', 'Village Name', 'ESR Name',
      'Water Consumption', 'Water Date',
      'Chlorine', 'Chlorine Date',
      'Pressure', 'Pressure Date'
    ];

    worksheet.addRow(headers);

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.columns = [
      { width: 18 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
      { width: 12 }, { width: 25 }, { width: 20 }, { width: 20 },
      { width: 16 }, { width: 12 },
      { width: 16 }, { width: 12 },
      { width: 16 }, { width: 12 }
    ];

    result.rows.forEach((row: any) => {
      worksheet.addRow([
        row.region || '',
        row.circle || '',
        row.division || '',
        row.sub_division || '',
        row.block || '',
        row.scheme_id || '',
        row.scheme_name || '',
        row.village_name || '',
        row.esr_name || '',
        row.water_value ? parseFloat(row.water_value).toFixed(2) : '',
        row.water_date || '',
        row.chlorine_value ? parseFloat(row.chlorine_value).toFixed(3) : '',
        row.chlorine_date || '',
        row.pressure_value ? parseFloat(row.pressure_value).toFixed(3) : '',
        row.pressure_date || ''
      ]);
    });

    const regionText = sanitizedRegion ? sanitizedRegion.replace(/ /g, '_') : 'all_regions';
    const today = new Date().toISOString().split('T')[0];
    const filename = `esr_combined_latest_${regionText}_${today}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`📊 Successfully exported ${result.rows.length} combined ESR records to ${filename}`);

  } catch (error) {
    console.error('Error exporting combined ESR latest data:', error);
    res.status(500).json({ error: 'Failed to export combined ESR latest data' });
  }
});

router.get("/historical", async (req, res) => {
  try {
    const startDateParam = sanitizeDate(req.query.startDate as string);
    const endDateParam = sanitizeDate(req.query.endDate as string);
    const regionParam = req.query.region as string | undefined;
    const sanitizedRegion = sanitizeRegion(regionParam);
    const agencyType = req.query.agencyType as string | undefined;

    if (!startDateParam || !endDateParam) {
      return res.status(400).json({
        error: 'startDate and endDate are required parameters (format: YYYY-MM-DD)'
      });
    }

    console.log(`📥 Combined ESR historical download request: ${startDateParam} to ${endDateParam}, region: ${sanitizedRegion || 'all'}, AgencyType: ${agencyType || 'ALL'}`);

    const db = await storage.getDb();

    const regionFilter = sanitizedRegion
      ? sql`AND region = ${sanitizedRegion}`
      : sql``;

    const agencyFilter = (agencyType && agencyType !== 'ALL' && agencyType !== 'all')
      ? sql`AND EXISTS (
          SELECT 1 FROM scheme_status ss 
          WHERE ss.scheme_id = scheme_id 
          AND ss.agency_type = ${agencyType}
        )`
      : sql``;

    console.log('🔍 Executing historical queries...');

    const [waterResult, chlorineResult, pressureResult] = await Promise.all([
      db.execute(sql`
        SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, esr_name,
          data_date, water_value
        FROM water_consumption_history 
        WHERE water_value IS NOT NULL
          AND data_date IS NOT NULL
          AND data_date NOT LIKE '29-Feb%'
          AND data_date NOT LIKE '30-Feb%'
          AND data_date NOT LIKE '31-Feb%'
          AND data_date NOT LIKE '31-Apr%'
          AND data_date NOT LIKE '31-Jun%'
          AND data_date NOT LIKE '31-Sep%'
          AND data_date NOT LIKE '31-Nov%'
          AND (
            CASE 
              WHEN data_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN data_date::date
              WHEN data_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(data_date, 'DD-MM-YYYY')
              WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(data_date, 'DD-Mon-YYYY')
              WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(data_date, 'DD-Mon-YY')
              WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
                TO_DATE(data_date || '-' || 
                  CASE 
                    WHEN EXTRACT(MONTH FROM TO_DATE(data_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
                    THEN (EXTRACT(YEAR FROM uploaded_at) - 1)::text
                    ELSE EXTRACT(YEAR FROM uploaded_at)::text
                  END, 
                  'DD-Mon-YYYY')
              ELSE NULL
            END
          ) BETWEEN TO_DATE(${startDateParam}, 'YYYY-MM-DD') 
          AND TO_DATE(${endDateParam}, 'YYYY-MM-DD')
          ${regionFilter}
      `),
      db.execute(sql`
        SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, esr_name,
          chlorine_date, chlorine_value
        FROM chlorine_history 
        WHERE chlorine_value IS NOT NULL
          AND chlorine_date IS NOT NULL
          AND chlorine_date NOT LIKE '29-Feb%'
          AND chlorine_date NOT LIKE '30-Feb%'
          AND chlorine_date NOT LIKE '31-Feb%'
          AND chlorine_date NOT LIKE '31-Apr%'
          AND chlorine_date NOT LIKE '31-Jun%'
          AND chlorine_date NOT LIKE '31-Sep%'
          AND chlorine_date NOT LIKE '31-Nov%'
          AND (
            CASE 
              WHEN chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN chlorine_date::date
              WHEN chlorine_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(chlorine_date, 'DD-MM-YYYY')
              WHEN chlorine_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(chlorine_date, 'DD-Mon-YYYY')
              WHEN chlorine_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(chlorine_date, 'DD-Mon-YY')
              WHEN chlorine_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
                TO_DATE(chlorine_date || '-' || 
                  CASE 
                    WHEN EXTRACT(MONTH FROM TO_DATE(chlorine_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
                    THEN (EXTRACT(YEAR FROM uploaded_at) - 1)::text
                    ELSE EXTRACT(YEAR FROM uploaded_at)::text
                  END, 
                  'DD-Mon-YYYY')
              ELSE NULL
            END
          ) BETWEEN TO_DATE(${startDateParam}, 'YYYY-MM-DD') 
          AND TO_DATE(${endDateParam}, 'YYYY-MM-DD')
          ${regionFilter}
      `),
      db.execute(sql`
        SELECT 
          region, circle, division, sub_division, block,
          scheme_id, scheme_name, village_name, esr_name,
          pressure_date, pressure_value
        FROM pressure_history 
        WHERE pressure_value IS NOT NULL
          AND pressure_date IS NOT NULL
          AND pressure_date NOT LIKE '29-Feb%'
          AND pressure_date NOT LIKE '30-Feb%'
          AND pressure_date NOT LIKE '31-Feb%'
          AND pressure_date NOT LIKE '31-Apr%'
          AND pressure_date NOT LIKE '31-Jun%'
          AND pressure_date NOT LIKE '31-Sep%'
          AND pressure_date NOT LIKE '31-Nov%'
          AND (
            CASE 
              WHEN pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN pressure_date::date
              WHEN pressure_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(pressure_date, 'DD-MM-YYYY')
              WHEN pressure_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(pressure_date, 'DD-Mon-YYYY')
              WHEN pressure_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(pressure_date, 'DD-Mon-YY')
              WHEN pressure_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
                TO_DATE(pressure_date || '-' || 
                  CASE 
                    WHEN EXTRACT(MONTH FROM TO_DATE(pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
                    THEN (EXTRACT(YEAR FROM uploaded_at) - 1)::text
                    ELSE EXTRACT(YEAR FROM uploaded_at)::text
                  END, 
                  'DD-Mon-YYYY')
              ELSE NULL
            END
          ) BETWEEN TO_DATE(${startDateParam}, 'YYYY-MM-DD') 
          AND TO_DATE(${endDateParam}, 'YYYY-MM-DD')
          ${regionFilter}
      `)
    ]);

    console.log(`📈 Water: ${waterResult.rows.length}, Chlorine: ${chlorineResult.rows.length}, Pressure: ${pressureResult.rows.length}`);

    interface ESRHistoricalData {
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      dates: { [date: string]: { water?: number; chlorine?: number; pressure?: number } };
    }

    const esrMap = new Map<string, ESRHistoricalData>();
    const allDates = new Set<string>();

    waterResult.rows.forEach((row: any) => {
      const esrKey = `${row.scheme_id}|${row.village_name}|${row.esr_name}`;

      if (!esrMap.has(esrKey)) {
        esrMap.set(esrKey, {
          region: row.region || '',
          circle: row.circle || '',
          division: row.division || '',
          sub_division: row.sub_division || '',
          block: row.block || '',
          scheme_id: row.scheme_id || '',
          scheme_name: row.scheme_name || '',
          village_name: row.village_name || '',
          esr_name: row.esr_name || '',
          dates: {}
        });
      }

      const esrData = esrMap.get(esrKey)!;
      const dateStr = row.data_date || '';
      if (dateStr) {
        allDates.add(dateStr);
        if (!esrData.dates[dateStr]) {
          esrData.dates[dateStr] = {};
        }
        esrData.dates[dateStr].water = row.water_value ? parseFloat(row.water_value) : undefined;
      }
    });

    chlorineResult.rows.forEach((row: any) => {
      const esrKey = `${row.scheme_id}|${row.village_name}|${row.esr_name}`;

      if (!esrMap.has(esrKey)) {
        esrMap.set(esrKey, {
          region: row.region || '',
          circle: row.circle || '',
          division: row.division || '',
          sub_division: row.sub_division || '',
          block: row.block || '',
          scheme_id: row.scheme_id || '',
          scheme_name: row.scheme_name || '',
          village_name: row.village_name || '',
          esr_name: row.esr_name || '',
          dates: {}
        });
      }

      const esrData = esrMap.get(esrKey)!;
      const dateStr = row.chlorine_date || '';
      if (dateStr) {
        allDates.add(dateStr);
        if (!esrData.dates[dateStr]) {
          esrData.dates[dateStr] = {};
        }
        esrData.dates[dateStr].chlorine = row.chlorine_value ? parseFloat(row.chlorine_value) : undefined;
      }
    });

    pressureResult.rows.forEach((row: any) => {
      const esrKey = `${row.scheme_id}|${row.village_name}|${row.esr_name}`;

      if (!esrMap.has(esrKey)) {
        esrMap.set(esrKey, {
          region: row.region || '',
          circle: row.circle || '',
          division: row.division || '',
          sub_division: row.sub_division || '',
          block: row.block || '',
          scheme_id: row.scheme_id || '',
          scheme_name: row.scheme_name || '',
          village_name: row.village_name || '',
          esr_name: row.esr_name || '',
          dates: {}
        });
      }

      const esrData = esrMap.get(esrKey)!;
      const dateStr = row.pressure_date || '';
      if (dateStr) {
        allDates.add(dateStr);
        if (!esrData.dates[dateStr]) {
          esrData.dates[dateStr] = {};
        }
        esrData.dates[dateStr].pressure = row.pressure_value ? parseFloat(row.pressure_value) : undefined;
      }
    });

    const sortedDates = Array.from(allDates).sort((a, b) => {
      const parseDate = (dateStr: string) => {
        const [day, month] = dateStr.split('-');
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        return new Date(2024, monthMap[month] || 0, parseInt(day) || 1);
      };
      return parseDate(a).getTime() - parseDate(b).getTime();
    });

    console.log(`📅 Found ${sortedDates.length} unique dates`);
    console.log(`🏢 Found ${esrMap.size} unique ESRs`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ESR Combined Historical Data');

    const headers = [
      'Region', 'Circle', 'Division', 'Sub Division', 'Block',
      'Scheme ID', 'Scheme Name', 'Village Name', 'ESR Name'
    ];

    sortedDates.forEach(date => {
      headers.push(`Water Consumption ${date}`);
      headers.push(`Chlorine ${date}`);
      headers.push(`Pressure ${date}`);
    });

    worksheet.addRow(headers);

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const columnWidths = [
      18, 15, 15, 15, 15, 12, 25, 20, 20,
      ...sortedDates.flatMap(() => [12, 12, 12])
    ];
    worksheet.columns = columnWidths.map(width => ({ width }));

    esrMap.forEach((esrData) => {
      const rowData: (string | number)[] = [
        esrData.region,
        esrData.circle,
        esrData.division,
        esrData.sub_division,
        esrData.block,
        esrData.scheme_id,
        esrData.scheme_name,
        esrData.village_name,
        esrData.esr_name
      ];

      sortedDates.forEach(date => {
        const dateValues = esrData.dates[date];
        rowData.push(dateValues?.water !== undefined ? dateValues.water.toFixed(2) : '');
        rowData.push(dateValues?.chlorine !== undefined ? dateValues.chlorine.toFixed(3) : '');
        rowData.push(dateValues?.pressure !== undefined ? dateValues.pressure.toFixed(3) : '');
      });

      worksheet.addRow(rowData);
    });

    const regionText = sanitizedRegion ? sanitizedRegion.replace(/ /g, '_') : 'all_regions';
    const filename = `esr_combined_historical_${regionText}_${startDateParam}_to_${endDateParam}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    console.log(`📊 Successfully exported combined historical ESR data to ${filename}`);

  } catch (error) {
    console.error('Error exporting combined ESR historical data:', error);
    res.status(500).json({ error: 'Failed to export combined ESR historical data' });
  }
});

router.get("/count", async (req, res) => {
  try {
    const { type } = req.query;
    const startDateParam = sanitizeDate(req.query.startDate as string);
    const endDateParam = sanitizeDate(req.query.endDate as string);
    const regionParam = req.query.region as string | undefined;
    const sanitizedRegion = sanitizeRegion(regionParam);
    const agencyType = req.query.agencyType as string | undefined;

    const db = await storage.getDb();

    if (type === 'latest') {
      const regionFilter = sanitizedRegion
        ? sql`AND region = ${sanitizedRegion}`
        : sql``;

      const agencyFilter = (agencyType && agencyType !== 'ALL' && agencyType !== 'all')
        ? sql`AND EXISTS (
            SELECT 1 FROM scheme_status ss 
            WHERE ss.scheme_id = water_consumption.scheme_id 
            AND ss.agency_type = ${agencyType}
          )`
        : sql``;

      const result = await db.execute(sql`
        SELECT COUNT(*) as total FROM water_consumption WHERE 1=1 ${regionFilter} ${agencyFilter}
      `);
      return res.json({ count: parseInt(result.rows[0].total as string) });
    }

    if (type === 'historical') {
      if (!startDateParam || !endDateParam) {
        return res.status(400).json({ error: 'startDate and endDate required for historical count' });
      }

      const regionFilter = sanitizedRegion
        ? sql`AND region = ${sanitizedRegion}`
        : sql``;

      const agencyFilter = (agencyType && agencyType !== 'ALL' && agencyType !== 'all')
        ? sql`AND EXISTS (
            SELECT 1 FROM scheme_status ss 
            WHERE ss.scheme_id = scheme_id 
            AND ss.agency_type = ${agencyType}
          )`
        : sql``;

      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT (scheme_id || '|' || village_name || '|' || esr_name)) as total
        FROM (
          SELECT scheme_id, village_name, esr_name FROM water_consumption_history 
          WHERE water_value IS NOT NULL
            AND data_date IS NOT NULL
            AND data_date NOT LIKE '29-Feb%'
            AND data_date NOT LIKE '30-Feb%'
            AND data_date NOT LIKE '31-Feb%'
            AND data_date NOT LIKE '31-Apr%'
            AND data_date NOT LIKE '31-Jun%'
            AND data_date NOT LIKE '31-Sep%'
            AND data_date NOT LIKE '31-Nov%'
            AND (
              CASE 
                WHEN data_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN data_date::date
                WHEN data_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(data_date, 'DD-MM-YYYY')
                WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(data_date, 'DD-Mon-YYYY')
                WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(data_date, 'DD-Mon-YY')
                WHEN data_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
                  TO_DATE(data_date || '-' || 
                    CASE 
                      WHEN EXTRACT(MONTH FROM TO_DATE(data_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
                      THEN (EXTRACT(YEAR FROM uploaded_at) - 1)::text
                      ELSE EXTRACT(YEAR FROM uploaded_at)::text
                    END, 
                    'DD-Mon-YYYY')
                ELSE NULL
              END
            ) BETWEEN TO_DATE(${startDateParam}, 'YYYY-MM-DD') 
            AND TO_DATE(${endDateParam}, 'YYYY-MM-DD')
            ${regionFilter}
            ${agencyFilter}
          UNION
          SELECT scheme_id, village_name, esr_name FROM chlorine_history 
          WHERE chlorine_value IS NOT NULL
            AND chlorine_date IS NOT NULL
            AND chlorine_date NOT LIKE '29-Feb%'
            AND chlorine_date NOT LIKE '30-Feb%'
            AND chlorine_date NOT LIKE '31-Feb%'
            AND chlorine_date NOT LIKE '31-Apr%'
            AND chlorine_date NOT LIKE '31-Jun%'
            AND chlorine_date NOT LIKE '31-Sep%'
            AND chlorine_date NOT LIKE '31-Nov%'
            AND (
              CASE 
                WHEN chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN chlorine_date::date
                WHEN chlorine_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(chlorine_date, 'DD-MM-YYYY')
                WHEN chlorine_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(chlorine_date, 'DD-Mon-YYYY')
                WHEN chlorine_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(chlorine_date, 'DD-Mon-YY')
                WHEN chlorine_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
                  TO_DATE(chlorine_date || '-' || 
                    CASE 
                      WHEN EXTRACT(MONTH FROM TO_DATE(chlorine_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
                      THEN (EXTRACT(YEAR FROM uploaded_at) - 1)::text
                      ELSE EXTRACT(YEAR FROM uploaded_at)::text
                    END, 
                    'DD-Mon-YYYY')
                ELSE NULL
              END
            ) BETWEEN TO_DATE(${startDateParam}, 'YYYY-MM-DD') 
            AND TO_DATE(${endDateParam}, 'YYYY-MM-DD')
            ${regionFilter}
            ${agencyFilter}
          UNION
          SELECT scheme_id, village_name, esr_name FROM pressure_history 
          WHERE pressure_value IS NOT NULL
            AND pressure_date IS NOT NULL
            AND pressure_date NOT LIKE '29-Feb%'
            AND pressure_date NOT LIKE '30-Feb%'
            AND pressure_date NOT LIKE '31-Feb%'
            AND pressure_date NOT LIKE '31-Apr%'
            AND pressure_date NOT LIKE '31-Jun%'
            AND pressure_date NOT LIKE '31-Sep%'
            AND pressure_date NOT LIKE '31-Nov%'
            AND (
              CASE 
                WHEN pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN pressure_date::date
                WHEN pressure_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN TO_DATE(pressure_date, 'DD-MM-YYYY')
                WHEN pressure_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(pressure_date, 'DD-Mon-YYYY')
                WHEN pressure_date ~ '^[0-9]{1,2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(pressure_date, 'DD-Mon-YY')
                WHEN pressure_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
                  TO_DATE(pressure_date || '-' || 
                    CASE 
                      WHEN EXTRACT(MONTH FROM TO_DATE(pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM uploaded_at) 
                      THEN (EXTRACT(YEAR FROM uploaded_at) - 1)::text
                      ELSE EXTRACT(YEAR FROM uploaded_at)::text
                    END, 
                    'DD-Mon-YYYY')
                ELSE NULL
              END
            ) BETWEEN TO_DATE(${startDateParam}, 'YYYY-MM-DD') 
            AND TO_DATE(${endDateParam}, 'YYYY-MM-DD')
            ${regionFilter}
            ${agencyFilter}
        ) combined
      `);

      return res.json({ count: parseInt(result.rows[0].total as string) });
    }

    res.status(400).json({ error: 'Invalid type parameter. Use "latest" or "historical"' });

  } catch (error) {
    console.error('Error getting ESR count:', error);
    res.status(500).json({ error: 'Failed to get ESR count' });
  }
});

export default router;
