import XLSX from "xlsx";
import fs from "fs";
import path from "path";

async function main() {
  const uploadsDir = "uploads";
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".xlsx") || f.endsWith(".xls"));
  console.log(`Found ${files.length} spreadsheet files in uploads/`);

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      // Let's check if this sheet looks like a region summary sheet
      // A region summary sheet should have "Region Name" or similar, and around 6-10 rows total.
      const hasRegionColumn = jsonData.some(row => row["Region Name"] !== undefined);
      if (!hasRegionColumn) {
        continue;
      }

      console.log(`\n=========================================`);
      console.log(`File: ${file} (Size: ${stats.size} bytes, Modified: ${stats.mtime})`);
      console.log(`Sheet name: ${sheetName}, Rows count: ${jsonData.length}`);
      
      const regionRows = jsonData.filter(row => {
        const name = String(row["Region Name"] || "").trim();
        return ["Amravati", "Nashik", "Nagpur", "Pune", "Konkan", "Chhatrapati Sambhajinagar"].includes(name);
      });

      const formatted = regionRows.map(row => ({
        Region: String(row["Region Name"] || "").trim(),
        Schemes: row["Total Schemes Integrated"] || row["Total Schemes"],
        Villages: row["Total Villages Integrated"] || row["Total Villages"],
        ESRs: row["Total ESR Integrated"] || row["Total ESR"],
        FlowMeter: row["Flow meter Integrated"] || row["Flow Meter Integrated"],
        RCA: row["RCA Integrated"],
        PT: row["Pressure Transmitter Integrated"]
      }));

      console.log(JSON.stringify(formatted, null, 2));
    } catch (err) {
      // ignore
    }
  }
}

main();
