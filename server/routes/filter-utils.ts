import { sql, and } from "drizzle-orm";
import { schemeStatuses } from "../../shared/schema";

/**
 * Helper function to get dates for a specific ISO week, offset by a number of weeks
 * Used to define the latest complete week for LPCD calculations.
 * Same logic as used in Region Comparison Table.
 */
export function getISOWeekInfo(weekOffset: number = 0): { dates: string[], weekNum: number, startStr: string, endStr: string } {
  const now = new Date();
  // Get the most recent Sunday (end of last complete week)
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(23, 59, 59, 999);

  // Get the Monday of that week
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  lastMonday.setHours(0, 0, 0, 0);

  // Apply week offset
  if (weekOffset > 0) {
    lastMonday.setDate(lastMonday.getDate() - (weekOffset * 7));
  }

  // Generate the 7 dates
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + i);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = d.toLocaleString('en-US', { month: 'short' });
    dates.push(`${dayStr}-${monthStr}`);
  }

  // Calculate week number
  const target = new Date(lastMonday);
  const dayNr = (lastMonday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

  return { dates, weekNum, startStr: dates[0], endStr: dates[6] };
}

/**
 * Helper function to get dates for a rolling 7-day window based on the latest data in the database.
 * Used for the new rolling LPCD calculation requirement.
 */
export async function getRollingWindowInfo(db: any, weekOffset: number = 0): Promise<{ dates: string[], startStr: string, endStr: string, anchorDate: Date }> {
  // 1. Find the maximum date across both history tables
  // Optimizing by looking at the most recent entries by ID first, as these usually contain the newest data
  const villageMaxDateResult = await db.execute(sql`
    SELECT data_date FROM water_scheme_data_history 
    ORDER BY id DESC LIMIT 1
  `);
  
  const schemeMaxDateResult = await db.execute(sql`
    SELECT data_date FROM scheme_lpcd_data_history 
    ORDER BY id DESC LIMIT 1
  `);

  const parseDate = (dateStr: string | null): Date => {
    if (!dateStr) return new Date(0);
    // Format is likely DD-Mon-YY or DD-Mon
    const parts = dateStr.split('-');
    if (parts.length < 2) return new Date(0);
    
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const yearStr = parts[2] || '2026'; // Default to current year if missing
    
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()] || 0;
    const year = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
    
    return new Date(year, month, day);
  };

  const vMax = parseDate(villageMaxDateResult.rows[0]?.data_date);
  const sMax = parseDate(schemeMaxDateResult.rows[0]?.data_date);
  
  // Use the overall maximum date as the anchor
  let anchorDate = vMax > sMax ? vMax : sMax;
  
  // fallback if no data
  if (anchorDate.getTime() === 0) {
    anchorDate = new Date();
  }

  // 2. Apply offset (N shifts of 7 days)
  const endDate = new Date(anchorDate);
  endDate.setDate(anchorDate.getDate() - (weekOffset * 7));
  
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  // 3. Generate the 7 dates in DD-Mon format
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = d.toLocaleString('en-US', { month: 'short' });
    dates.push(`${dayStr}-${monthStr}`);
  }

  return { 
    dates, 
    startStr: dates[0], 
    endStr: dates[6],
    anchorDate: anchorDate
  };
}



/**
 * Enhanced function to get filtered scheme IDs based on filterType, fullyCompleted, and agencyType.
 * Supports specialized water supply filters for Fully Instrumented Schemes.
 */
export async function getFilteredSchemeIds(db: any, filterType: any, fullyCompleted: any, agencyType?: string | string[]): Promise<string[] | undefined> {
  const activeFilter = filterType || (fullyCompleted === "true" ? "fully_completed" : undefined);
  
  // Handle case where agencyType might be an array due to potential duplication from frontend
  const targetAgencyType = Array.isArray(agencyType) ? agencyType[0] : agencyType;

  // Base conditions for Fully Instrumented Schemes
  const fullyInstrumentedStatusCondition = sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('completed', 'fully-completed', 'fully completed', 'functionally completed')`;

  if (activeFilter === 'fully_completed_full') {
    const conditions = [
      fullyInstrumentedStatusCondition,
      sql`LOWER(${schemeStatuses.water_supply}) = 'yes'`,
      sql`LOWER(${schemeStatuses.water_supply_status}) = 'full'`
    ];
    if (targetAgencyType && targetAgencyType.toUpperCase() !== 'ALL') {
      conditions.push(sql`UPPER(${schemeStatuses.agency_type}) = ${targetAgencyType.toUpperCase()}`);
    }
    const rows = await db.select({ scheme_id: schemeStatuses.scheme_id })
      .from(schemeStatuses)
      .where(and(...conditions));
    const ids = rows.map((r: any) => r.scheme_id);
    return ids.length > 0 ? ids : ['NO_MATCHES'];

  } else if (activeFilter === 'fully_completed_no') {
    // 1. Get schemes that are fully completed
    const baseConditions = [fullyInstrumentedStatusCondition];
    if (targetAgencyType && targetAgencyType.toUpperCase() !== 'ALL') {
      baseConditions.push(sql`UPPER(${schemeStatuses.agency_type}) = ${targetAgencyType.toUpperCase()}`);
    }
    const baseRows = await db.select({ scheme_id: schemeStatuses.scheme_id })
      .from(schemeStatuses)
      .where(and(...baseConditions));
    const baseIds: string[] = baseRows.map((r: any) => r.scheme_id);
    if (baseIds.length === 0) return ['NO_MATCHES'];

    // 2. Filter for those with weekly average LPCD = 0
    const weekInfo = await getRollingWindowInfo(db, 0);

    const dateList = weekInfo.dates.map(d => `'${d}'`).join(',');
    
    // We use raw SQL to calculate average from history table
    const result = await db.execute(sql`
      WITH scheme_averages AS (
        SELECT 
          scheme_id,
          SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
        FROM (
          SELECT DISTINCT ON (scheme_id, block, data_date)
            scheme_id, lpcd_value, data_date
          FROM scheme_lpcd_data_history
          WHERE scheme_id IN (${sql.raw(baseIds.map(id => `'${id}'`).join(','))})
          AND (
            data_date IN (${sql.raw(dateList)})
            OR
            TO_CHAR(TO_DATE(CASE 
               WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
               ELSE '01-Jan-2000'
            END, 'DD-Mon-YY'), 'DD-Mon') IN (${sql.raw(dateList)})
          )
          ORDER BY scheme_id, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
        ) deduplicated
        GROUP BY scheme_id
      )
      SELECT scheme_id FROM scheme_averages WHERE avg_lpcd = 0
    `);
    
    const ids = result.rows.map((r: any) => r.scheme_id);
    return ids.length > 0 ? ids : ['NO_MATCHES'];

  } else if (activeFilter === 'fully_completed_partial') {
    // Partial = All Instrumented - Full - No
    // 1. Get All Instrumented
    const allInstrumented: string[] | undefined = await getFilteredSchemeIds(db, 'fully_completed', undefined, targetAgencyType);
    if (!allInstrumented || allInstrumented[0] === 'NO_MATCHES') return ['NO_MATCHES'];

    // 2. Get Full
    const fullIds: string[] | undefined = await getFilteredSchemeIds(db, 'fully_completed_full', undefined, targetAgencyType);
    
    // 3. Get No
    const noIds: string[] | undefined = await getFilteredSchemeIds(db, 'fully_completed_no', undefined, targetAgencyType);

    const fullSet = new Set(fullIds && fullIds[0] !== 'NO_MATCHES' ? fullIds : []);
    const noSet = new Set(noIds && noIds[0] !== 'NO_MATCHES' ? noIds : []);

    const partialIds: string[] = allInstrumented.filter((id: string) => !fullSet.has(id) && !noSet.has(id));
    return partialIds.length > 0 ? partialIds : ['NO_MATCHES'];
  }

  // Original logic for other filters
  const conditions: any[] = [];
  if (activeFilter && activeFilter.startsWith('commissioned')) {
    conditions.push(sql`LOWER(${schemeStatuses.water_supply}) = 'yes'`);
    if (activeFilter === 'commissioned_full') {
      conditions.push(sql`LOWER(${schemeStatuses.water_supply_status}) = 'full'`);
    } else if (activeFilter === 'commissioned_partial') {
      conditions.push(sql`LOWER(${schemeStatuses.water_supply_status}) = 'partial'`);
    } else if (activeFilter === 'commissioned_no') {
      conditions.push(sql`LOWER(${schemeStatuses.water_supply_status}) = 'no'`);
    }
  } else if (activeFilter === 'fully_completed') {
    conditions.push(fullyInstrumentedStatusCondition);
  } else if (activeFilter === 'partial' || activeFilter === 'in_progress') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('in progress', 'partial', 'ongoing', 'work in progress')`);
  } else if (activeFilter === 'not_connected') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('not-connected', 'not connected')`);
  } else if (activeFilter === 'partially_commissioned') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('partially commissioned', 'partial commissioned')`);
  } else if (activeFilter === 'village_work_inprogress') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('village work inprogress', 'village work in progress')`);
  } else if (activeFilter === 'physically_completed') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('physically completed')`);
  } else if (activeFilter === 'not_started') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('not started')`);
  } else if (activeFilter === 'common_filter') {
    conditions.push(sql`${fullyInstrumentedStatusCondition} AND LOWER(${schemeStatuses.water_supply}) = 'yes'`);
  } else if (activeFilter === 'mjp_commissioned_yes') {
    conditions.push(sql`LOWER(${schemeStatuses.mjp_commissioned}) = 'yes'`);
  }

  if (targetAgencyType && targetAgencyType.toUpperCase() !== 'ALL') {
    conditions.push(sql`UPPER(${schemeStatuses.agency_type}) = ${targetAgencyType.toUpperCase()}`);
  }

  if (conditions.length > 0) {
    const rows = await db.select({ scheme_id: schemeStatuses.scheme_id })
      .from(schemeStatuses)
      .where(and(...conditions));
    const ids: string[] = rows.map((r: any) => r.scheme_id);
    return ids.length > 0 ? ids : ['NO_MATCHES'];
  }
  return undefined;
}
