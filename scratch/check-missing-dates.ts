import ExcelJS from 'exceljs';
import path from 'path';

async function checkDates() {
  const filePath = path.resolve('c:/Users/12626/dashboard8/Amravati_Village_Water_Consumption_History_From_Start.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('Village Water Consumption');
  const headers = ws?.getRow(1).values as string[];

  console.log('Total headers:', headers.length);
  const dateHeaders = headers.slice(12); // after 11 metadata cols
  console.log('First 20 date headers:', dateHeaders.slice(0, 20));

  // Check around Dec 2024
  const decHeaders = dateHeaders.filter(h => h && h.includes('Dec-2024'));
  console.log('Dec 2024 headers:', decHeaders);

  process.exit(0);
}

checkDates();
