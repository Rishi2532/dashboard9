import ExcelJS from 'exceljs';
import path from 'path';

async function verify() {
  const filePath = path.resolve('c:/Users/12626/dashboard8/Amravati_Water_Consumption_History_From_Start.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('Water Consumption Data');

  console.log('Worksheet name:', ws?.name);
  console.log('Total rows:', ws?.rowCount);
  console.log('Total columns:', ws?.columnCount);

  const headerRow = ws?.getRow(1).values as any[];
  console.log('First 15 headers:', headerRow.slice(1, 16));
  console.log('Last 5 headers:', headerRow.slice(-5));

  const sampleRow = ws?.getRow(2).values as any[];
  console.log('Sample Row 2:', sampleRow.slice(1, 16));

  process.exit(0);
}

verify();
