import { sql, and } from "drizzle-orm";
import { schemeStatuses, schemeEngineerDetails } from "../../shared/schema";

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
export async function getFilteredSchemeIds(
  db: any,
  filterType: any,
  fullyCompleted: any,
  agencyType?: string | string[],
  engineerScope?: { isEngineer: boolean; schemeIds: string[] } | null
): Promise<string[] | undefined> {
  let activeFilter = filterType || (fullyCompleted === "true" ? "fully_completed" : undefined);
  
  // Handle case where agencyType might be an array
  const targetAgencyType = Array.isArray(agencyType) ? agencyType[0] : agencyType;

  const applyScope = (ids: string[]): string[] => {
    if (engineerScope?.isEngineer) {
      if (!engineerScope.schemeIds || engineerScope.schemeIds.length === 0 || engineerScope.schemeIds.includes('__NO_MATCHING_SCHEMES__')) {
        return ['NO_MATCHES'];
      }
      const allowed = new Set(engineerScope.schemeIds);
      const scoped = ids.filter(id => allowed.has(id));
      return scoped.length > 0 ? scoped : ['NO_MATCHES'];
    }
    return ids;
  };

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

  // Unified classification conditions based on user requirements
  const allSchemesStatusList = ['fully completed', 'completed', 'in progress', 'connected'];
  const instrumentedStatusList = ['fully completed', 'completed', 'connected', 'fully-completed', 'fully_completed'];

  const ruleAllSchemes = sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN (${sql.raw(allSchemesStatusList.map(s => `'${s}'`).join(','))})`;
  const ruleCivilWorkCompleted = sql`TRIM(LOWER(${schemeStatuses.water_supply})) = 'yes' AND TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN ('fully completed', 'completed', 'in progress')`;
  const ruleFullyInstrumented = sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN (${sql.raw(instrumentedStatusList.map(s => `'${s}'`).join(','))})`;
  const rulePartiallyInstrumented = sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) = 'in progress'`;
  const ruleCommonMjpIot = sql`TRIM(LOWER(${schemeStatuses.fully_completion_scheme_status})) IN (${sql.raw(instrumentedStatusList.map(s => `'${s}'`).join(','))}) AND TRIM(LOWER(${schemeStatuses.water_supply})) = 'yes'`;
  const ruleMjpCommissioned = sql`TRIM(LOWER(${schemeStatuses.mjp_commissioned})) = 'yes'`;

  // IF statusSuffix is 'no', we need the special rolling LPCD logic
  // This logic is specifically for instrumented schemes that report 0 LPCD
  if (statusSuffix === 'no' && activeFilter !== 'commissioned' && activeFilter !== 'fully_completed') {
    // Determine base IDs to apply the LPCD=0 filter to
    const baseIds: string[] | undefined = await getFilteredSchemeIds(db, activeFilter, fullyCompleted, targetAgencyType, engineerScope);
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
      SELECT s.scheme_id 
      FROM scheme_status s
      JOIN scheme_averages l ON s.scheme_id = l.scheme_id
      WHERE s.scheme_id IN (${sql.raw(baseIds.map(id => `'${id}'`).join(','))})
      AND l.avg_lpcd = 0
      AND (s.water_supply_status IS NULL OR LOWER(s.water_supply_status) != 'full')
    `);
    const ids = result.rows.map((r: any) => r.scheme_id);
    return ids.length > 0 ? applyScope(ids) : ['NO_MATCHES'];
  }

  // Base conditions building
  const conditions: any[] = [];
  
  if (activeFilter === 'all' || activeFilter === 'All') {
    conditions.push(ruleAllSchemes);
  } else if (activeFilter === 'commissioned') {
    conditions.push(ruleCivilWorkCompleted);
  } else if (activeFilter === 'fully_completed') {
    conditions.push(ruleFullyInstrumented);
  } else if (activeFilter === 'partial' || activeFilter === 'in_progress') {
    conditions.push(rulePartiallyInstrumented);
  } else if (activeFilter === 'common_filter') {
    conditions.push(ruleCommonMjpIot);
  } else if (activeFilter === 'mjp_commissioned_yes') {
    conditions.push(ruleMjpCommissioned);
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
        ruleCivilWorkCompleted
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
          SELECT s.scheme_id 
          FROM scheme_status s
          WHERE s.scheme_id IN (${sql.raw(idPlaceholder)})
          AND LOWER(s.water_supply) = 'yes'
          AND LOWER(s.water_supply_status) = 'full'
        `);
        const ids = result.rows.map((r: any) => r.scheme_id);
        return ids.length > 0 ? applyScope(ids) : ['NO_MATCHES'];

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
          AND (s.water_supply_status IS NULL OR LOWER(s.water_supply_status) != 'full')
        `);
        const ids = result.rows.map((r: any) => r.scheme_id);
        return ids.length > 0 ? applyScope(ids) : ['NO_MATCHES'];

      } else if (statusSuffix === 'partial') {
        // Partial = Total - Full - No
        const fullIds: string[] | undefined = await getFilteredSchemeIds(db, 'commissioned_full', undefined, targetAgencyType, engineerScope);
        const noIds: string[] | undefined = await getFilteredSchemeIds(db, 'commissioned_no', undefined, targetAgencyType, engineerScope);
        
        const fullSet = new Set(fullIds && fullIds[0] !== 'NO_MATCHES' ? fullIds : []);
        const noSet = new Set(noIds && noIds[0] !== 'NO_MATCHES' ? noIds : []);
        
        const partialIds = baseIds.filter((id: string) => !fullSet.has(id) && !noSet.has(id));
        return partialIds.length > 0 ? applyScope(partialIds) : ['NO_MATCHES'];
      }
    } else if (activeFilter === 'fully_completed') {
       // Logic for Fully Instrumented Schemes (IoT)
       const baseConditions = [
         ruleFullyInstrumented
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
          SELECT s.scheme_id 
          FROM scheme_status s
          WHERE s.scheme_id IN (${sql.raw(idPlaceholder)})
          AND LOWER(s.water_supply_status) = 'full'
        `);
        const ids = result.rows.map((r: any) => r.scheme_id);
        return ids.length > 0 ? applyScope(ids) : ['NO_MATCHES'];
 
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
          AND (s.water_supply_status IS NULL OR LOWER(s.water_supply_status) != 'full')
         `);
         const ids = result.rows.map((r: any) => r.scheme_id);
         return ids.length > 0 ? applyScope(ids) : ['NO_MATCHES'];
 
       } else if (statusSuffix === 'partial') {
         // Partial = Total IoT - (Full IoT + No IoT)
         const fullIds: string[] | undefined = await getFilteredSchemeIds(db, 'fully_completed_full', undefined, targetAgencyType, engineerScope);
         const noIds: string[] | undefined = await getFilteredSchemeIds(db, 'fully_completed_no', undefined, targetAgencyType, engineerScope);
         
         const fullSet = new Set(fullIds && fullIds[0] !== 'NO_MATCHES' ? fullIds : []);
         const noSet = new Set(noIds && noIds[0] !== 'NO_MATCHES' ? noIds : []);
         
         const partialIds = baseIds.filter((id: string) => !fullSet.has(id) && !noSet.has(id));
         return partialIds.length > 0 ? applyScope(partialIds) : ['NO_MATCHES'];
       }
    }

    // Default status handling for other filters (e.g. fully_completed)
    if (statusSuffix === 'full') {
      conditions.push(sql`LOWER(${schemeStatuses.water_supply}) = 'yes'`);
      conditions.push(sql`LOWER(${schemeStatuses.water_supply_status}) = 'full'`);
    } else if (statusSuffix === 'partial') {
      conditions.push(sql`LOWER(${schemeStatuses.water_supply_status}) = 'partial'`);
    } else if (statusSuffix === 'no') {
       // Keep existing rolling average logic for other filters if needed
    }
  }

  if (conditions.length > 0) {
    const rows = await db.select({ scheme_id: schemeStatuses.scheme_id })
      .from(schemeStatuses)
      .where(and(...conditions));
    // Use a Set to ensure we return ONLY distinct scheme_ids
    const idSet = new Set<string>(rows.map((r: any) => r.scheme_id));
    const ids: string[] = Array.from(idSet);
    return ids.length > 0 ? applyScope(ids) : ['NO_MATCHES'];
  }
  
  // If no filter is applied, we still want to apply Rule 1 for "All Schemes"
  const allRows = await db.select({ scheme_id: schemeStatuses.scheme_id })
    .from(schemeStatuses)
    .where(ruleAllSchemes);
  const allIds = Array.from(new Set<string>(allRows.map((r: any) => r.scheme_id)));
  return allIds.length > 0 ? applyScope(allIds) : ['NO_MATCHES'];
}

/**
 * Normalizes name strings for comparison (handles Rushikesh vs Rishikesh, Salunke vs Salunkhe, etc.)
 */
function normalizeName(name: string): string {
  return (name || "")
    .toLowerCase()
    .trim()
    .replace(/sh/g, "s")
    .replace(/kh/g, "k")
    .replace(/ph/g, "f")
    .replace(/w/g, "v")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/^ru/, "ri")
    .replace(/[\s._-]/g, "");
}

/**
 * Finds all schemes assigned to an engineer from scheme_engineer_details.
 * Matches by user's email, phone, username, or full name against civil/mech/supervisor columns.
 */
export async function getEngineerAssignedSchemes(
  db: any,
  user: { email?: string | null; phone?: string | null; username?: string; name?: string | null }
) {
  const userEmails = (user.email || "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const userUsername = (user.username || "").trim().toLowerCase();
  const userName = (user.name || "").trim().toLowerCase();
  const uNameNorm = normalizeName(userName);
  const uUserNorm = normalizeName(userUsername);

  const allEngineers = await db.select().from(schemeEngineerDetails);

  const assigned: {
    scheme_id: string;
    scheme_name: string;
    region?: string | null;
    district?: string | null;
    division?: string | null;
    engineer_role?: string;
    engineer_name?: string;
    engineer_email?: string;
    engineer_phone?: string;
  }[] = [];

  let engineerProfile: {
    name: string;
    email: string;
    phone: string;
    role: string;
    region?: string | null;
    division?: string | null;
    district?: string | null;
  } | null = null;

  const isMatchingPerson = (eEmailRaw: string | null | undefined, ePhoneRaw: string | null | undefined, eNameRaw: string | null | undefined) => {
    const eEmail = (eEmailRaw || "").trim().toLowerCase();
    const eName = (eNameRaw || "").trim().toLowerCase();
    const eNameNorm = normalizeName(eName);

    if (!eName || !eEmail) return false;

    // 1. Name Condition: exact name or normalized transliteration
    const isNameMatch = Boolean(userName && (userName === eName || uNameNorm === eNameNorm));

    // 2. Email Condition: exact email match against user's email in users table
    const isEmailMatch = Boolean(userEmails.length > 0 && userEmails.includes(eEmail));

    // BOTH Name and Email must match simultaneously
    return isNameMatch && isEmailMatch;
  };

  for (const eng of allEngineers) {
    let matchedRole = "";
    let matchedName = "";
    let matchedEmail = "";
    let matchedPhone = "";

    if (isMatchingPerson(eng.de_ae_civil_email || eng.civil_engineer_email, eng.de_ae_civil_mobile || eng.civil_engineer_mobile, eng.de_ae_civil_name || eng.civil_engineer_name)) {
      matchedRole = "DE/AE (Civil)";
      matchedName = eng.de_ae_civil_name || eng.civil_engineer_name || "";
      matchedEmail = eng.de_ae_civil_email || eng.civil_engineer_email || "";
      matchedPhone = eng.de_ae_civil_mobile || eng.civil_engineer_mobile || "";
    } else if (isMatchingPerson(eng.de_ae_mech_email || eng.site_supervisor_email || eng.mechanical_engineer_email, eng.de_ae_mech_mobile || eng.site_supervisor_mobile || eng.mechanical_engineer_mobile, eng.de_ae_mech_name || eng.site_supervisor_name || eng.mechanical_engineer_name)) {
      matchedRole = "DE/AE (Mech)";
      matchedName = eng.de_ae_mech_name || eng.site_supervisor_name || eng.mechanical_engineer_name || "";
      matchedEmail = eng.de_ae_mech_email || eng.site_supervisor_email || eng.mechanical_engineer_email || "";
      matchedPhone = eng.de_ae_mech_mobile || eng.site_supervisor_mobile || eng.mechanical_engineer_mobile || "";
    } else if (isMatchingPerson(eng.se_email, eng.se_mobile, eng.se_name)) {
      matchedRole = "Superintending Engineer (SE)";
      matchedName = eng.se_name || "";
      matchedEmail = eng.se_email || "";
      matchedPhone = eng.se_mobile || "";
    } else if (isMatchingPerson(eng.chief_engineer_email, eng.chief_engineer_mobile, eng.chief_engineer_name)) {
      matchedRole = "Chief Engineer";
      matchedName = eng.chief_engineer_name || "";
      matchedEmail = eng.chief_engineer_email || "";
      matchedPhone = eng.chief_engineer_mobile || "";
    }

    if (matchedRole && eng.scheme_id) {
      assigned.push({
        scheme_id: eng.scheme_id,
        scheme_name: eng.scheme || eng.scheme_id,
        region: eng.region,
        district: eng.district,
        division: eng.division,
        engineer_role: matchedRole,
        engineer_name: matchedName,
        engineer_email: matchedEmail,
        engineer_phone: matchedPhone,
      });

      if (!engineerProfile) {
        engineerProfile = {
          name: matchedName || user.name || user.username || "Engineer",
          email: matchedEmail || user.email || "",
          phone: matchedPhone || user.phone || "",
          role: matchedRole,
          region: eng.region,
          district: eng.district,
          division: eng.division,
        };
      }
    }
  }

  // Deduplicate by scheme_id
  const uniqueMap = new Map();
  assigned.forEach((item) => uniqueMap.set(item.scheme_id, item));
  const uniqueAssigned = Array.from(uniqueMap.values());

  const assignedSchemeIds = uniqueAssigned.length > 0 
    ? uniqueAssigned.map((s) => s.scheme_id) 
    : ['__NO_MATCHING_SCHEMES__'];
  const assignedSchemeNames = uniqueAssigned.map((s) => s.scheme_name);

  return {
    assignedSchemes: uniqueAssigned,
    assignedSchemeIds,
    assignedSchemeNames,
    engineerProfile: engineerProfile || {
      name: user.name || user.username || "Engineer",
      email: user.email || "",
      phone: user.phone || "",
      role: "Engineer",
      region: null,
      district: null,
      division: null,
    },
  };
}

/**
 * Extracts engineer scope from session if the user is an engineer.
 */
export function getEngineerSchemeScope(req: any): {
  isEngineer: boolean;
  schemeIds: string[];
  schemeNames: string[];
  assignedSchemes: any[];
  engineerProfile: any;
} {
  const session = req?.session;
  if (!session || !session.userId) {
    return {
      isEngineer: false,
      schemeIds: [],
      schemeNames: [],
      assignedSchemes: [],
      engineerProfile: null,
    };
  }

  const isEngineer = session.role === "engineer" || session.isEngineer === true;
  let schemeIds = Array.isArray(session.assignedSchemeIds) ? session.assignedSchemeIds : [];
  if (isEngineer && schemeIds.length === 0) {
    schemeIds = ['__NO_MATCHING_SCHEMES__'];
  }
  const schemeNames = Array.isArray(session.assignedSchemeNames) ? session.assignedSchemeNames : [];
  const assignedSchemes = Array.isArray(session.assignedSchemes) ? session.assignedSchemes : [];
  const engineerProfile = session.engineerProfile || null;

  return {
    isEngineer,
    schemeIds,
    schemeNames,
    assignedSchemes,
    engineerProfile,
  };
}


