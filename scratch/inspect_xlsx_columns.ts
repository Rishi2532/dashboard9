import XLSX from "xlsx";
import fs from "fs";
import path from "path";

async function main() {
  const uploadsDir = "uploads";
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".xlsx") || f.endsWith(".xls"));
  console.log(`Found ${files.length} spreadsheet files in uploads/`);

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      if (jsonData.length > 0) {
        console.log(`\nFile: ${file}`);
        console.log(`Columns:`, Object.keys(jsonData[0]));
        console.log(`First row:`, jsonData[0]);
      }
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }
}

main();
