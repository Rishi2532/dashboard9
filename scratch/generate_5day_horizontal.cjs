const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generate5DayOnlyHorizontalReport() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jal Jeevan Mission IoT Cell';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('5-Day & 30-Day Alert Audit', {
    views: [{ showGridLines: true }]
  });

  // Title Block
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'JAL JEEVAN MISSION - MAHARASHTRA';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;

  sheet.mergeCells('A2:J2');
  const subTitleCell = sheet.getCell('A2');
  subTitleCell.value = 'Alerts & DLT Multipart SMS Audit: 5-Day Actuals, Daily Averages & 30-Day Monthly Forecast (87 Engineers)';
  subTitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 24;

  sheet.addRow([]); // Blank row 3

  // Horizontal Headers (Row 4)
  const headerCols = [
    'Alert Metric / Parameter',
    'Day 1 (Mon)\n[All 87 Eng]',
    'Day 2 (Tue)\n[58 Field]',
    'Day 3 (Wed)\n[58 Field]',
    'Day 4 (Thu)\n[58 Field]',
    'Day 5 (Fri)\n[58 Field]',
    '5-Day Total\n(Actual)',
    'Daily Average\n(1 Day)',
    '30-Day Month\nProjection',
    '30-Day Daily\nAverage'
  ];

  const headerRow = sheet.addRow(headerCols);
  headerRow.height = 34;
  headerRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    if (colNum === 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C81' } };
    } else if (colNum === 2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Monday highlight
    } else if (colNum >= 3 && colNum <= 6) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }; // Sky blue for days 2-5
    } else if (colNum === 7 || colNum === 8) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate for 5-day totals
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark navy for 30-day month
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
  });

  // Data Rows (Parameters down Rows)
  const rows = [
    // Section Header 1
    { isSection: true, title: 'A. ALERT COUNTS BY SENSOR PARAMETER' },
    { name: 'Low LPCD Alerts (4 SMS/msg)', vals: [208, 211, 213, 200, 200, 1032, 206.4, 6192, 206.4] },
    { name: 'Residual Chlorine Alerts (4 SMS/msg)', vals: [109, 106, 97, 110, 110, 532, 106.4, 3192, 106.4] },
    { name: 'Low Pressure Alerts (4 SMS/msg)', vals: [72, 64, 66, 90, 90, 382, 76.4, 2292, 76.4] },
    { name: 'Offline: Residual Chlorine Sensors (3 SMS/msg)', vals: [50, 46, 48, 65, 43, 252, 50.4, 1512, 50.4] },
    { name: 'Offline: Flow Meter Sensors (3 SMS/msg)', vals: [46, 43, 44, 60, 40, 233, 46.6, 1398, 46.6] },
    { name: 'Offline: Pressure Sensors (3 SMS/msg)', vals: [83, 77, 80, 108, 71, 419, 83.8, 2514, 83.8] },
    { name: 'Total Offline Alerts (3 SMS/msg)', isSubTotal: true, vals: [179, 166, 172, 233, 154, 904, 180.8, 5424, 180.8] },
    { name: 'Daily Total Alerts (Unique Physical Events)', isHighlight: true, vals: [568, 547, 548, 633, 554, 2850, 570.0, 17100, 570.0] },

    // Section Header 2
    { isSection: true, title: 'B. DLT MULTIPART SMS PARTS (PER SINGLE RECIPIENT)' },
    { name: 'SMS Parts / Msg Formula', isFormula: true, vals: [
      '(208×4)+(109×4)+(72×4)+(179×3)',
      '(211×4)+(106×4)+(64×4)+(166×3)',
      '(213×4)+(97×4)+(66×4)+(172×3)',
      '(200×4)+(110×4)+(90×4)+(233×3)',
      '(200×4)+(110×4)+(90×4)+(154×3)',
      '(1,032×4)+(532×4)+(382×4)+(904×3)',
      'Avg 2,099.2 parts / day',
      '(6,192×4)+(3,192×4)+(2,292×4)+(5,424×3)',
      '30-Day Daily Average'
    ]},
    { name: 'Total SMS Parts / Credits (1 Recipient)', isSubTotal: true, vals: [2093, 2022, 2020, 2299, 2062, 10496, 2099.2, 62976, 2099.2] },

    // Section Header 3
    { isSection: true, title: 'C. NEW LOGIC DISPATCH FOR 87 ENGINEERS (SE & CE ONCE A WEEK ON MONDAY)' },
    { name: 'Engineers Receiving SMS (Count)', isCount: true, vals: [87, 58, 58, 58, 58, 319, 63.8, 1856, 61.9] },
    { name: 'New Logic SMS Formula', isFormula: true, vals: [
      '2,093 × 87',
      '2,022 × 58',
      '2,020 × 58',
      '2,299 × 58',
      '2,062 × 58',
      'Sum of 5 Days SMS',
      '669,465 ÷ 5',
      '(4 Mon × 87) + (26 Reg × 58)',
      '3,896,115.2 ÷ 30'
    ]},
    { name: 'Total SMS Dispatched (New Logic: SE/CE Mon)', isMainResult: true, vals: [182091, 117276, 117160, 133342, 119596, 669465, 133893.0, 3896115.2, 129870.5] },

    // Section Header 4
    { isSection: true, title: 'D. COMPARISON: OLD LOGIC (ALL 87 ENGINEERS DAILY) & VOLUME SAVINGS' },
    { name: 'Total Alerts for 87 Engineers (Broadcast Alerts)', vals: [49416, 47589, 47676, 55071, 48198, 247950, 49590.0, 1487700, 49590.0] },
    { name: 'Total SMS Dispatched (Old Logic: All 87 Daily)', vals: [182091, 175914, 175740, 200013, 179394, 913152, 182630.4, 5478912.0, 182630.4] },
    { name: 'SMS Volume Saved per Period (New vs Old Logic)', isSavings: true, vals: [0, 58638, 58580, 66671, 59798, 243687, 48737.4, 1582796.8, 52759.9] },
    { name: 'Percentage SMS Volume Saved (%)', isPercent: true, vals: ['0.0%', '33.3%', '33.3%', '33.3%', '33.3%', '26.68%', '26.68%', '28.89%', '28.89%'] }
  ];

  rows.forEach(r => {
    if (r.isSection) {
      sheet.addRow([]); // Blank row
      const secRow = sheet.addRow([r.title]);
      sheet.mergeCells(`A${secRow.number}:J${secRow.number}`);
      const secCell = sheet.getCell(`A${secRow.number}`);
      secCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F4C81' } };
      secRow.height = 20;
      return;
    }

    const rowData = [r.name, ...r.vals];
    const newRow = sheet.addRow(rowData);
    newRow.height = r.isMainResult ? 26 : (r.isHighlight || r.isSavings ? 24 : 22);

    newRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };

      if (colNum === 1) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        if (r.isHighlight || r.isSubTotal || r.isMainResult || r.isSavings) cell.font = { name: 'Calibri', size: 10, bold: true };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (r.isFormula) {
          cell.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
        } else if (r.isMainResult) {
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        } else if (r.isSavings) {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        } else if (r.isPercent) {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
        } else if (r.isHighlight) {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F4C81' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
        } else if (r.isSubTotal) {
          cell.font = { name: 'Calibri', size: 10, bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }

        // Number formatting
        if (!r.isFormula && !r.isPercent && typeof cell.value === 'number') {
          cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.0';
        }
      }
    });
  });

  // Column Widths
  sheet.columns = [
    { width: 44 }, // A: Parameter Name
    { width: 16 }, // B: Day 1 (Mon)
    { width: 16 }, // C: Day 2 (Tue)
    { width: 16 }, // D: Day 3 (Wed)
    { width: 16 }, // E: Day 4 (Thu)
    { width: 16 }, // F: Day 5 (Fri)
    { width: 18 }, // G: 5-Day Total
    { width: 16 }, // H: Daily Avg
    { width: 20 }, // I: 30-Day Month Total
    { width: 18 }  // J: 30-Day Daily Avg
  ];

  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const exportPath1 = path.join(publicDir, '5_Day_Alerts_Summary_Report.xlsx');
  const exportPath2 = path.join(__dirname, '..', '5_Day_Alerts_Summary_Report.xlsx');

  await workbook.xlsx.writeFile(exportPath1);
  await workbook.xlsx.writeFile(exportPath2);

  console.log('✅ Generated 5-Day Only Horizontal Header Excel Report');
}

generate5DayOnlyHorizontalReport().catch(console.error);
