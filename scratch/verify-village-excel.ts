import ExcelJS from 'exceljs';
import path from 'path';

async function verify() {
  const filePath = path.resolve('Amravati_Village_Water_Consumption_History_From_Start.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet(1);

  console.log(`Sheet Name: ${ws.name}`);
  console.log(`Row count: ${ws.rowCount}`);
  console.log(`Column count: ${ws.columnCount}`);

  const headerRow = ws.getRow(1).values as string[];
  
  // Find key date column indices
  const nov16Idx = headerRow.findIndex(h => h && h.includes('16-Nov-2024'));
  const dec5Idx = headerRow.findIndex(h => h && h.includes('05-Dec-2024'));
  const sep28_25Idx = headerRow.findIndex(h => h && h.includes('28-Sep-2025'));
  const sep29_25Idx = headerRow.findIndex(h => h && h.includes('29-Sep-2025'));
  const aug28_26Idx = headerRow.findIndex(h => h && h.includes('28-Aug-2026'));
  const aug29_26Idx = headerRow.findIndex(h => h && h.includes('29-Aug-2026'));
  const aug30_26Idx = headerRow.findIndex(h => h && h.includes('30-Aug-2026'));
  const aug31_26Idx = headerRow.findIndex(h => h && h.includes('31-Aug-2026'));
  const sep02_26Idx = headerRow.findIndex(h => h && h.includes('02-Sep-2026'));
  const sep03_26Idx = headerRow.findIndex(h => h && h.includes('03-Sep-2026'));

  console.log('Sample indices:', {
    '16-Nov-2024': nov16Idx,
    '05-Dec-2024': dec5Idx,
    '28-Sep-2025': sep28_25Idx,
    '29-Sep-2025': sep29_25Idx,
    '31-Aug-2026': aug31_26Idx,
  });

  // Check Mathodi and Akhatwada
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const villageName = String(row.getCell(9).value || '');
    if (villageName.toLowerCase().includes('akhatwada') || villageName.toLowerCase().includes('mathodi')) {
      console.log(`\n--- ${villageName} (Row ${r}) ---`);
      console.log(`16-Nov-2024 (Before start):`, JSON.stringify(row.getCell(nov16Idx).value));
      console.log(`05-Dec-2024 (Before start):`, JSON.stringify(row.getCell(dec5Idx).value));
      console.log(`28-Sep-2025 (Day before start):`, JSON.stringify(row.getCell(sep28_25Idx).value));
      console.log(`29-Sep-2025 (Start day):`, JSON.stringify(row.getCell(sep29_25Idx).value));
      console.log(`28-Aug-2026 (Active):`, JSON.stringify(row.getCell(aug28_26Idx).value));
      console.log(`29-Aug-2026 (Active):`, JSON.stringify(row.getCell(aug29_26Idx).value));
      console.log(`30-Aug-2026 (Active):`, JSON.stringify(row.getCell(aug30_26Idx).value));
      console.log(`31-Aug-2026 (Active):`, JSON.stringify(row.getCell(aug31_26Idx).value));
      console.log(`02-Sep-2026 (Active):`, JSON.stringify(row.getCell(sep02_26Idx).value));
      console.log(`03-Sep-2026 (Active):`, JSON.stringify(row.getCell(sep03_26Idx).value));
    }
  }
}

verify().catch(console.error);
