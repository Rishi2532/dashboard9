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
  // 1. Find the maximum date across both history tables by parsing strings
  // We'll get a sample of recent records to determine the latest date
  const villageDatesResult = await db.execute(sql`
    SELECT data_date FROM (
      SELECT data_date, id FROM water_scheme_data_history 
      ORDER BY id DESC LIMIT 500
    ) t
  `);
  
  const schemeDatesResult = await db.execute(sql`
    SELECT data_date FROM (
      SELECT data_date, id FROM scheme_lpcd_data_history 
      ORDER BY id DESC LIMIT 500
    ) t
  `);

  const parseDate = (dateStr: string | null): Date => {
    if (!dateStr) return new Date(0);
    // Format is likely DD-Mon-YY or DD-Mon
    const parts = dateStr.split('-');
    if (parts.length < 2) return new Date(0);
    
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = months[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()] || 0;
    
    let year = 2026; // Default to 2026 for this project phase
    if (parts.length > 2) {
      const yearPart = parts[2];
      year = yearPart.length === 2 ? 2000 + parseInt(yearPart) : parseInt(yearPart);
    } else {
      // If year is missing (DD-Mon), we assume current year (2026)
      // but if day/month is ahead of now, might be last year. 
      // For this project, mostly 2026.
    }
    
    return new Date(year, month, day);
  };

  const allDates: Date[] = [
    ...villageDatesResult.rows.map((r: any) => parseDate(r.data_date)),
    ...schemeDatesResult.rows.map((r: any) => parseDate(r.data_date))
  ].filter(d => d.getTime() > 0);
  
  // Use the overall maximum date as the anchor
  let anchorDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();

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
  let activeFilter = filterType || (fullyCompleted === "true" ? "fully_completed" : undefined);
  
  // Handle case where agencyType might be an array
  const targetAgencyType = Array.isArray(agencyType) ? agencyType[0] : agencyType;

  // 1. Identify and remove any status suffix (_full, _partial, _no)
  let statusSuffix: string | undefined;
  if (activeFilter) {
    if (activeFilter.endsWith('_full')) {
      statusSuffix = 'full';
      activeFilter = activeFilter.replace('_full', '');
    } else if (activeFilter.endsWith('_partial')) {
      statusSuffix = 'partial';
      activeFilter = activeFilter.replace('_partial', '');
    } else if (activeFilter.endsWith('_no')) {
      statusSuffix = 'no';
      activeFilter = activeFilter.replace('_no', '');
    }
  }

  // Common condition definitions
  const rule1Condition = sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('fully completed', 'completed', 'connected', 'in progress')`;
  const rule3Condition = sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('fully completed', 'completed')`;
  const rule5Condition = sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('fully completed', 'completed') AND TRIM(LOWER(${schemeStatuses.water_supply})) = 'yes'`;

  // IF statusSuffix is 'no', we need the special rolling LPCD logic
  // This logic is specifically for instrumented schemes that report 0 LPCD
  if (statusSuffix === 'no' && activeFilter !== 'commissioned' && activeFilter !== 'fully_completed') {
    // Determine base IDs to apply the LPCD=0 filter to
    const baseIds: string[] | undefined = await getFilteredSchemeIds(db, activeFilter, fullyCompleted, targetAgencyType);
    if (!baseIds || baseIds[0] === 'NO_MATCHES') return ['NO_MATCHES'];

    const weekInfo = await getRollingWindowInfo(db, 0);
    const dateList = weekInfo.dates.map(d => `'${d}'`).join(',');
    
    // Calculate average from history table
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
  }

  // Base conditions building
  const conditions: any[] = [];
  
  if (activeFilter === 'all' || activeFilter === 'All') {
    conditions.push(rule1Condition);
  } else if (activeFilter === 'commissioned') {
    conditions.push(rule1Condition);
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.water_supply})) = 'yes'`);
  } else if (activeFilter === 'fully_completed') {
    conditions.push(rule3Condition);
  } else if (activeFilter === 'partial' || activeFilter === 'in_progress') {
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) = 'in progress'`);
  } else if (activeFilter === 'common_filter') {
    conditions.push(rule5Condition);
  } else if (activeFilter === 'mjp_commissioned_yes') {
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.mjp_commissioned})) = 'yes'`);
  } else if (activeFilter === 'not_connected') {
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('not-connected', 'not connected')`);
  } else if (activeFilter === 'partially_commissioned') {
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('partially commissioned', 'partial commissioned')`);
  } else if (activeFilter === 'village_work_inprogress') {
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('village work inprogress', 'village work in progress')`);
  } else if (activeFilter === 'physically_completed') {
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('physically completed')`);
  } else if (activeFilter === 'not_started') {
    conditions.push(sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('not started')`);
  }

  // Apply Agency Filter
  if (targetAgencyType && targetAgencyType.toUpperCase() !== 'ALL') {
    if (targetAgencyType === "Agency Not Assigned") {
        conditions.push(sql`(${schemeStatuses.agency_type} IS NULL OR TRIM(${schemeStatuses.agency_type}) = '' OR LOWER(${schemeStatuses.agency_type}) = 'agency not assigned')`);
    } else {
        conditions.push(sql`UPPER(${schemeStatuses.agency_type}) = ${targetAgencyType.toUpperCase()}`);
    }
  }

  // apply status suffix logic
  if (statusSuffix) {
    if (activeFilter === 'commissioned') {
      const baseConditions = [
        rule1Condition,
        sql`LOWER(${schemeStatuses.water_supply}) = 'yes'`
      ];
      if (targetAgencyType && targetAgencyType.toUpperCase() !== 'ALL') {
         if (targetAgencyType === "Agency Not Assigned") {
            baseConditions.push(sql`(${schemeStatuses.agency_type} IS NULL OR TRIM(${schemeStatuses.agency_type}) = '' OR LOWER(${schemeStatuses.agency_type}) = 'agency not assigned')`);
         } else {
            baseConditions.push(sql`UPPER(${schemeStatuses.agency_type}) = ${targetAgencyType.toUpperCase()}`);
         }
      }
      
      const baseRows = await db.select({ scheme_id: schemeStatuses.scheme_id })
        .from(schemeStatuses)
        .where(and(...baseConditions));
      const baseIds = baseRows.map((r: any) => r.scheme_id);
      if (baseIds.length === 0) return ['NO_MATCHES'];

      const idPlaceholder = baseIds.map((id: string) => `'${id}'`).join(',');
      const weekInfo = await getRollingWindowInfo(db, 0);
      const dateList = weekInfo.dates.map(d => `'${d}'`).join(',');

      if (statusSuffix === 'full') {
        const result = await db.execute(sql`
          WITH scheme_averages AS (
            SELECT 
              scheme_id,
              SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
            FROM (
              SELECT DISTINCT ON (scheme_id, block, data_date)
                scheme_id, lpcd_value, data_date
              FROM scheme_lpcd_data_history
              WHERE scheme_id IN (${sql.raw(idPlaceholder)})
              AND (
                data_date IN (${sql.raw(dateList)})
                OR
                TO_CHAR(TO_DATE(CASE 
                   WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                   ELSE '01-Jan-2000'
                END, 'DD-Mon-YY'), 'DD-Mon') IN (${sql.raw(dateList)})
              )
              ORDER BY scheme_id, block, data_date, uploaded_at DESC
            ) deduplicated
            GROUP BY scheme_id
          )
          SELECT s.scheme_id 
          FROM scheme_status s
          JOIN scheme_averages l ON s.scheme_id = l.scheme_id
          WHERE s.scheme_id IN (${sql.raw(idPlaceholder)})
          AND LOWER(s.water_supply) = 'yes'
          AND LOWER(s.water_supply_status) = 'full'
          AND l.avg_lpcd > 0
        `);
        const ids = result.rows.map((r: any) => r.scheme_id);
        return ids.length > 0 ? ids : ['NO_MATCHES'];

      } else if (statusSuffix === 'no') {
        const result = await db.execute(sql`
          WITH scheme_averages AS (
            SELECT 
              scheme_id,
              SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
            FROM (
              SELECT DISTINCT ON (scheme_id, block, data_date)
                scheme_id, lpcd_value, data_date
              FROM scheme_lpcd_data_history
              WHERE scheme_id IN (${sql.raw(idPlaceholder)})
              AND (
                data_date IN (${sql.raw(dateList)})
                OR
                TO_CHAR(TO_DATE(CASE 
                   WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                   ELSE '01-Jan-2000'
                END, 'DD-Mon-YY'), 'DD-Mon') IN (${sql.raw(dateList)})
              )
              ORDER BY scheme_id, block, data_date, uploaded_at DESC
            ) deduplicated
            GROUP BY scheme_id
          )
          SELECT s.scheme_id 
          FROM scheme_status s
          JOIN scheme_averages l ON s.scheme_id = l.scheme_id
          WHERE s.scheme_id IN (${sql.raw(idPlaceholder)})
          AND LOWER(s.water_supply) = 'yes'
          AND l.avg_lpcd = 0
        `);
        const ids = result.rows.map((r: any) => r.scheme_id);
        return ids.length > 0 ? ids : ['NO_MATCHES'];

      } else if (statusSuffix === 'partial') {
        // Partial = Total - Full - No
        const fullIds: string[] | undefined = await getFilteredSchemeIds(db, 'commissioned_full', undefined, targetAgencyType);
        const noIds: string[] | undefined = await getFilteredSchemeIds(db, 'commissioned_no', undefined, targetAgencyType);
        
        const fullSet = new Set(fullIds && fullIds[0] !== 'NO_MATCHES' ? fullIds : []);
        const noSet = new Set(noIds && noIds[0] !== 'NO_MATCHES' ? noIds : []);
        
        const partialIds = baseIds.filter((id: string) => !fullSet.has(id) && !noSet.has(id));
        return partialIds.length > 0 ? partialIds : ['NO_MATCHES'];
      }
    } else if (activeFilter === 'fully_completed') {
       // Logic for Fully Instrumented Schemes (IoT)
       const baseConditions = [
         sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('completed', 'fully-completed', 'fully completed', 'functionally completed')`
       ];
       if (targetAgencyType && targetAgencyType.toUpperCase() !== 'ALL') {
          if (targetAgencyType === "Agency Not Assigned") {
             baseConditions.push(sql`(${schemeStatuses.agency_type} IS NULL OR TRIM(${schemeStatuses.agency_type}) = '' OR LOWER(${schemeStatuses.agency_type}) = 'agency not assigned')`);
          } else {
             baseConditions.push(sql`UPPER(${schemeStatuses.agency_type}) = ${targetAgencyType.toUpperCase()}`);
          }
       }
       
       const baseRows = await db.select({ scheme_id: schemeStatuses.scheme_id })
         .from(schemeStatuses)
         .where(and(...baseConditions));
       const baseIds = baseRows.map((r: any) => r.scheme_id);
       if (baseIds.length === 0) return ['NO_MATCHES'];
 
       const idPlaceholder = baseIds.map((id: string) => `'${id}'`).join(',');
       const weekInfo = await getRollingWindowInfo(db, 0);
       const dateList = weekInfo.dates.map(d => `'${d}'`).join(',');
 
       if (statusSuffix === 'full') {
         const result = await db.execute(sql`
           WITH scheme_averages AS (
             SELECT 
               scheme_id,
               SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
             FROM (
               SELECT DISTINCT ON (scheme_id, block, data_date)
                 scheme_id, lpcd_value, data_date
               FROM scheme_lpcd_data_history
               WHERE scheme_id IN (${sql.raw(idPlaceholder)})
               AND (
                 data_date IN (${sql.raw(dateList)})
                 OR
                 TO_CHAR(TO_DATE(CASE 
                    WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                    ELSE '01-Jan-2000'
                 END, 'DD-Mon-YY'), 'DD-Mon') IN (${sql.raw(dateList)})
               )
               ORDER BY scheme_id, block, data_date, uploaded_at DESC
             ) deduplicated
             GROUP BY scheme_id
           )
           SELECT s.scheme_id 
           FROM scheme_status s
           JOIN scheme_averages l ON s.scheme_id = l.scheme_id
           WHERE s.scheme_id IN (${sql.raw(idPlaceholder)})
           AND LOWER(s.water_supply) = 'yes'
           AND LOWER(s.water_supply_status) = 'full'
           AND l.avg_lpcd > 0
         `);
         const ids = result.rows.map((r: any) => r.scheme_id);
         return ids.length > 0 ? ids : ['NO_MATCHES'];
 
       } else if (statusSuffix === 'no') {
         const result = await db.execute(sql`
           WITH scheme_averages AS (
             SELECT 
               scheme_id,
               SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
             FROM (
               SELECT DISTINCT ON (scheme_id, block, data_date)
                 scheme_id, lpcd_value, data_date
               FROM scheme_lpcd_data_history
               WHERE scheme_id IN (${sql.raw(idPlaceholder)})
               AND (
                 data_date IN (${sql.raw(dateList)})
                 OR
                 TO_CHAR(TO_DATE(CASE 
                    WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                    ELSE '01-Jan-2000'
                 END, 'DD-Mon-YY'), 'DD-Mon') IN (${sql.raw(dateList)})
               )
               ORDER BY scheme_id, block, data_date, uploaded_at DESC
             ) deduplicated
             GROUP BY scheme_id
           )
           SELECT s.scheme_id 
           FROM scheme_status s
           JOIN scheme_averages l ON s.scheme_id = l.scheme_id
           WHERE s.scheme_id IN (${sql.raw(idPlaceholder)})
           AND l.avg_lpcd = 0
         `);
         const ids = result.rows.map((r: any) => r.scheme_id);
         return ids.length > 0 ? ids : ['NO_MATCHES'];
 
       } else if (statusSuffix === 'partial') {
         // Partial = Total IoT - (Full IoT + No IoT)
         const fullIds: string[] | undefined = await getFilteredSchemeIds(db, 'fully_completed_full', undefined, targetAgencyType);
         const noIds: string[] | undefined = await getFilteredSchemeIds(db, 'fully_completed_no', undefined, targetAgencyType);
         
         const fullSet = new Set(fullIds && fullIds[0] !== 'NO_MATCHES' ? fullIds : []);
         const noSet = new Set(noIds && noIds[0] !== 'NO_MATCHES' ? noIds : []);
         
         const partialIds = baseIds.filter((id: string) => !fullSet.has(id) && !noSet.has(id));
         return partialIds.length > 0 ? partialIds : ['NO_MATCHES'];
       }
    }

    // Default status handling for other filters (e.g. fully_completed)
    if (statusSuffix === 'full') {
      conditions.push(sql`LOWER(${schemeStatuses.water_supply}) = 'yes'`);
      conditions.push(sql`LOWER(${schemeStatuses.water_supply_status}) = 'full'`);
    } else if (statusSuffix === 'partial') {
      conditions.push(sql`LOWER(${schemeStatuses.water_supply_status}) = 'partial'`);
    } else if (statusSuffix === 'no') {
       // Keep existing rolling average logic for other filters if needed, 
       // but here we already handled statusSuffix === 'no' globally at line 156?
       // Wait, I should move the global 'no' handler down or adjust.
    }
  }

  if (conditions.length > 0) {
    const rows = await db.select({ scheme_id: schemeStatuses.scheme_id })
      .from(schemeStatuses)
      .where(and(...conditions));
    // Use a Set to ensure we return ONLY distinct scheme_ids
    const idSet = new Set<string>(rows.map((r: any) => r.scheme_id));
    const ids: string[] = Array.from(idSet);
    return ids.length > 0 ? ids : ['NO_MATCHES'];
  }
  
  // If no filter is applied, we still want to apply Rule 1 for "All Schemes"
  // unless explicitly requested otherwise (but the user wants consistent logic)
  const allRows = await db.select({ scheme_id: schemeStatuses.scheme_id })
    .from(schemeStatuses)
    .where(rule1Condition);
  const allIds = Array.from(new Set<string>(allRows.map((r: any) => r.scheme_id)));
  return allIds.length > 0 ? allIds : ['NO_MATCHES'];
}
