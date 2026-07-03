import { pool } from "../db-local";

const parseDateString = (dateStr: string) => {
  if (!dateStr) return null;
  let dayNum = 0;
  const dateMatch = dateStr.match(/^(\d{1,2})-[a-zA-Z]{3}-(\d{2,4})$/);
  const shortDateMatch = dateStr.match(/^(\d{1,2})-[a-zA-Z]{3}$/);
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (dateMatch) dayNum = parseInt(dateMatch[1], 10);
  else if (shortDateMatch) dayNum = parseInt(shortDateMatch[1], 10);
  else if (isoMatch) dayNum = parseInt(isoMatch[3], 10);
  else if (slashMatch) dayNum = parseInt(slashMatch[1], 10);
  
  return dayNum >= 1 && dayNum <= 31 ? dayNum : null;
};

const sanitizeKey = (schemeId: string, villageName: string, esrName: string) => {
  return `${schemeId}_${(villageName || "").replace(/\s+/g, '').toLowerCase()}_${(esrName || "").replace(/\s+/g, '').toLowerCase()}`;
};

export async function getMonthlyChlorineData(reqQuery: any) {
  const { region, circle, division, subdivision, block, scheme_id, report_month } = reqQuery;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = report_month.split("-");
  const monthNum = parseInt(parts[1], 10);
  const monthName = months[monthNum - 1] || "";
  const yearNum = parseInt(parts[0], 10);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const filterConditions = [];
  const params = [];
  let paramIdx = 1;

  if (region && region !== "all") { filterConditions.push(`region = $${paramIdx++}`); params.push(region); }
  if (circle && circle !== "all") { filterConditions.push(`circle = $${paramIdx++}`); params.push(circle); }
  if (division && division !== "all") { filterConditions.push(`division = $${paramIdx++}`); params.push(division); }
  if (subdivision && subdivision !== "all") { filterConditions.push(`sub_division = $${paramIdx++}`); params.push(subdivision); }
  if (block && block !== "all") { filterConditions.push(`block = $${paramIdx++}`); params.push(block); }
  if (scheme_id && scheme_id !== "all") { filterConditions.push(`scheme_id = $${paramIdx++}`); params.push(scheme_id); }

  const whereClause = filterConditions.length > 0 ? "WHERE " + filterConditions.join(" AND ") : "";

  const esrQuery = `
    SELECT DISTINCT region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name
    FROM chlorine_data
    ${whereClause}
  `;
  const esrRes = await pool.query(esrQuery, params);

  const historyParams = [...params, `%-${monthName}%`, `${report_month}-%`];
  const dateCond1 = `$${paramIdx++}`;
  const dateCond2 = `$${paramIdx++}`;

  const historyQuery = `
    SELECT scheme_id, village_name, esr_name, chlorine_date, chlorine_value
    FROM chlorine_history
    ${whereClause ? whereClause + " AND " : "WHERE "}
    (chlorine_date LIKE ${dateCond1} OR chlorine_date LIKE ${dateCond2})
  `;
  const historyRes = await pool.query(historyQuery, historyParams);

  const waterQuery = `
    SELECT scheme_id, village_name, esr_name, data_date, water_value
    FROM water_consumption_history
    ${whereClause ? whereClause + " AND " : "WHERE "}
    (data_date LIKE ${dateCond1} OR data_date LIKE ${dateCond2})
  `;
  const waterRes = await pool.query(waterQuery, historyParams);

  const esrMap = new Map();
  for (const esr of esrRes.rows) {
    const key = sanitizeKey(esr.scheme_id, esr.village_name, esr.esr_name);
    esrMap.set(key, {
      ...esr,
      days: {},
      waterSupplyDays: 0,
      optimalDays: 0,
      belowDays: 0,
      aboveDays: 0
    });
  }

  const activeWaterDays = new Set();
  for (const w of waterRes.rows) {
    const val = Number(w.water_value);
    if (val > 0) {
      const dayNum = parseDateString(w.data_date);
      if (dayNum) {
         const key = sanitizeKey(w.scheme_id, w.village_name, w.esr_name);
         const dayKey = `${key}_${dayNum}`;
         if (!activeWaterDays.has(dayKey)) {
             activeWaterDays.add(dayKey);
             if (esrMap.has(key)) {
                 esrMap.get(key).waterSupplyDays++;
             }
         }
      }
    }
  }

  const chlorineByDay = new Map<string, number>();

  for (const h of historyRes.rows) {
    const key = sanitizeKey(h.scheme_id, h.village_name, h.esr_name);
    if (!esrMap.has(key)) continue;

    const dayNum = parseDateString(h.chlorine_date);
    if (dayNum) {
       const dayKey = `${key}_${dayNum}`;
       if (activeWaterDays.has(dayKey)) {
           chlorineByDay.set(dayKey, Number(h.chlorine_value));
       }
    }
  }

  for (const [dayKey, val] of chlorineByDay.entries()) {
      const lastUnderscore = dayKey.lastIndexOf('_');
      const key = dayKey.substring(0, lastUnderscore);
      const esrData = esrMap.get(key);
      if (esrData) {
          if (val >= 0.2 && val <= 0.5) esrData.optimalDays++;
          else if (val < 0.2) esrData.belowDays++;
          else if (val > 0.5) esrData.aboveDays++;
      }
  }

  const rows: any[][] = [];
  let srNo = 1;

  for (const [_, s] of esrMap.entries()) {
    rows.push([
      srNo++,
      s.region || "-",
      s.circle || "-",
      s.division || "-",
      s.sub_division || "-",
      s.block || "-",
      s.scheme_id,
      s.scheme_name,
      s.village_name || "-",
      s.esr_name,
      s.waterSupplyDays,
      s.optimalDays,
      s.belowDays,
      s.aboveDays
    ]);
  }

  const headers = [
    "Sr No", "Region", "Circle", "Division", "Sub Division", "Block", 
    "Scheme ID", "Scheme Name", "Village Name", "ESR Name", 
    "No. of Days with Water Supply", "Days in 0.2-0.5 mg/L", "Days < 0.2 mg/L", "Days > 0.5 mg/L"
  ];

  const responseData: any = {
    caseType: "C", 
    summary: {
      region: reqQuery.region || "all",
      report_month: report_month
    },
    chlorineCommissionedSchemes: [
      { headers, rows }
    ]
  };

  return responseData;
}

export async function getMonthlyPressureData(reqQuery: any) {
  const { region, circle, division, subdivision, block, scheme_id, report_month } = reqQuery;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = report_month.split("-");
  const monthNum = parseInt(parts[1], 10);
  const monthName = months[monthNum - 1] || "";
  const yearNum = parseInt(parts[0], 10);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const filterConditions = [];
  const params = [];
  let paramIdx = 1;

  if (region && region !== "all") { filterConditions.push(`region = $${paramIdx++}`); params.push(region); }
  if (circle && circle !== "all") { filterConditions.push(`circle = $${paramIdx++}`); params.push(circle); }
  if (division && division !== "all") { filterConditions.push(`division = $${paramIdx++}`); params.push(division); }
  if (subdivision && subdivision !== "all") { filterConditions.push(`sub_division = $${paramIdx++}`); params.push(subdivision); }
  if (block && block !== "all") { filterConditions.push(`block = $${paramIdx++}`); params.push(block); }
  if (scheme_id && scheme_id !== "all") { filterConditions.push(`scheme_id = $${paramIdx++}`); params.push(scheme_id); }

  const whereClause = filterConditions.length > 0 ? "WHERE " + filterConditions.join(" AND ") : "";

  const esrQuery = `
    SELECT DISTINCT region, circle, division, sub_division, block, scheme_id, scheme_name, village_name, esr_name
    FROM pressure_data
    ${whereClause}
  `;
  const esrRes = await pool.query(esrQuery, params);

  const historyParams = [...params, `%-${monthName}%`, `${report_month}-%`];
  const dateCond1 = `$${paramIdx++}`;
  const dateCond2 = `$${paramIdx++}`;

  const historyQuery = `
    SELECT scheme_id, village_name, esr_name, pressure_date, pressure_value
    FROM pressure_history
    ${whereClause ? whereClause + " AND " : "WHERE "}
    (pressure_date LIKE ${dateCond1} OR pressure_date LIKE ${dateCond2})
  `;
  const historyRes = await pool.query(historyQuery, historyParams);

  const waterQuery = `
    SELECT scheme_id, village_name, esr_name, data_date, water_value
    FROM water_consumption_history
    ${whereClause ? whereClause + " AND " : "WHERE "}
    (data_date LIKE ${dateCond1} OR data_date LIKE ${dateCond2})
  `;
  const waterRes = await pool.query(waterQuery, historyParams);

  const esrMap = new Map();
  for (const esr of esrRes.rows) {
    const key = sanitizeKey(esr.scheme_id, esr.village_name, esr.esr_name);
    esrMap.set(key, {
      ...esr,
      days: {},
      waterSupplyDays: 0,
      optimalDays: 0,
      belowDays: 0,
      aboveDays: 0
    });
  }

  const activeWaterDays = new Set();
  for (const w of waterRes.rows) {
    const val = Number(w.water_value);
    if (val > 0) {
      const dayNum = parseDateString(w.data_date);
      if (dayNum) {
         const key = sanitizeKey(w.scheme_id, w.village_name, w.esr_name);
         const dayKey = `${key}_${dayNum}`;
         if (!activeWaterDays.has(dayKey)) {
             activeWaterDays.add(dayKey);
             if (esrMap.has(key)) {
                 esrMap.get(key).waterSupplyDays++;
             }
         }
      }
    }
  }

  const pressureByDay = new Map<string, number>();

  for (const h of historyRes.rows) {
    const key = sanitizeKey(h.scheme_id, h.village_name, h.esr_name);
    if (!esrMap.has(key)) continue;

    const dayNum = parseDateString(h.pressure_date);
    if (dayNum) {
       const dayKey = `${key}_${dayNum}`;
       if (activeWaterDays.has(dayKey)) {
           pressureByDay.set(dayKey, Number(h.pressure_value));
       }
    }
  }

  for (const [dayKey, val] of pressureByDay.entries()) {
      const lastUnderscore = dayKey.lastIndexOf('_');
      const key = dayKey.substring(0, lastUnderscore);
      const esrData = esrMap.get(key);
      if (esrData) {
          if (val >= 0.2 && val <= 0.7) esrData.optimalDays++;
          else if (val < 0.2) esrData.belowDays++;
          else if (val > 0.7) esrData.aboveDays++;
      }
  }

  const rows: any[][] = [];
  let srNo = 1;

  for (const [_, s] of esrMap.entries()) {
    rows.push([
      srNo++,
      s.region || "-",
      s.circle || "-",
      s.division || "-",
      s.sub_division || "-",
      s.block || "-",
      s.scheme_id,
      s.scheme_name,
      s.village_name || "-",
      s.esr_name,
      s.waterSupplyDays,
      s.optimalDays,
      s.belowDays,
      s.aboveDays
    ]);
  }

  const headers = [
    "Sr No", "Region", "Circle", "Division", "Sub Division", "Block", 
    "Scheme ID", "Scheme Name", "Village Name", "ESR Name", 
    "No. of Days with Water Supply", "Days in 0.2-0.7 bar", "Days < 0.2 bar", "Days > 0.7 bar"
  ];

  const responseData: any = {
    caseType: "C", 
    summary: {
      region: reqQuery.region || "all",
      report_month: report_month
    },
    pressureCommissionedSchemes: [
      { headers, rows }
    ]
  };

  return responseData;
}
