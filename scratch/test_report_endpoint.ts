import dotenv from "dotenv";
dotenv.config();
import fetch from "node-fetch";

async function main() {
  const url = "http://localhost:5000/api/monthly-reports/data?region=all&report_month=2026-03";
  try {
    const res = await fetch(url);
    const data: any = await res.json();
    console.log("Status:", res.status);
    console.log("CaseType:", data.caseType);
    console.log("NewlyAddedSchemes length:", data.newlyAddedSchemes?.length);
    console.log("NewlyAddedVillages length:", data.newlyAddedVillages?.length);
    console.log("lpcdCommissionedSchemes length:", data.lpcdCommissionedSchemes?.length);
    if (data.lpcdCommissionedSchemes && data.lpcdCommissionedSchemes.length > 0) {
      console.log("Table 1 rows count:", data.lpcdCommissionedSchemes[0].rows?.length);
      console.log("Table 1 headers:", data.lpcdCommissionedSchemes[0].headers);
      console.log("Table 1 sample row:", data.lpcdCommissionedSchemes[0].rows[0]);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

main();
