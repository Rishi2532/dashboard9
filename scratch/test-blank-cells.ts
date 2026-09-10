import ExcelJS from 'exceljs';
import path from 'path';

async function testBlankCells() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Test');

  ws.addRow(['Village', '01-Jan-2025', '02-Jan-2025', '03-Jan-2025']);

  const row1 = ws.addRow(['Mathodi', '', null, 0.28]);
  row1.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber >= 2) {
      if (typeof cell.value === 'number') {
        cell.numFmt = '0.00';
      }
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }
  });

  const row2 = ws.addRow(['Unintegrated Village', null, null, null]);
  row2.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });

  await wb.xlsx.writeFile('scratch/test_blank.xlsx');
  console.log('Written test_blank.xlsx successfully.');

  const wbRead = new ExcelJS.Workbook();
  await wbRead.xlsx.readFile('scratch/test_blank.xlsx');
  const wsRead = wbRead.getWorksheet('Test');
  console.log('Row 2 cell values:', [
    wsRead.getRow(2).getCell(1).value,
    wsRead.getRow(2).getCell(2).value,
    wsRead.getRow(2).getCell(3).value,
    wsRead.getRow(2).getCell(4).value,
  ]);
  console.log('Row 3 cell values:', [
    wsRead.getRow(3).getCell(1).value,
    wsRead.getRow(3).getCell(2).value,
    wsRead.getRow(3).getCell(3).value,
    wsRead.getRow(3).getCell(4).value,
  ]);
}

testBlankCells().catch(console.error);
