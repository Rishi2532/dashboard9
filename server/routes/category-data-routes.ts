import { Router } from "express";
import { getDB } from "../db";
import { eq, and, sql, isNotNull, ilike, inArray } from "drizzle-orm";
import { waterSchemeData, chlorineData, pressureData, waterConsumption, schemeStatuses, villages, regions, waterSchemeDataHistory, chlorineHistory, pressureHistory } from "@shared/schema";
import ExcelJS from "exceljs";

const router = Router();

// Utility function to convert water values from MLD to LL (1 MLD = 10 LL)
const convertWaterValueToLL = (value: number | null | undefined): number | null | undefined => {
  if (value === null || value === undefined) return value;
  return value * 10;
};

// Utility function to convert all water values in a record from MLD to LL
const convertRecordWaterValuesToLL = <T extends Record<string, any>>(record: T): T => {
  const converted = { ...record } as Record<string, any>;
  const waterFields = ['water_value_day1', 'water_value_day2', 'water_value_day3', 'water_value_day4', 'water_value_day5', 'water_value_day6', 'water_value_day7'];
  
  waterFields.forEach(field => {
    if (field in converted) {
      converted[field] = convertWaterValueToLL(converted[field]);
    }
  });
  
  return converted as T;
};

// Function to get filtered scheme IDs based on filterType, fullyCompleted, and agencyType
async function getFilteredSchemeIds(db: any, filterType: any, fullyCompleted: any, agencyType?: string | string[]) {
  const activeFilter = filterType || (fullyCompleted === "true" ? "fully_completed" : undefined);
  
  // Handle case where agencyType might be an array due to duplicate parameters
  const targetAgencyType = Array.isArray(agencyType) ? agencyType[0] : agencyType;

  const conditions: any[] = [];
  if (activeFilter === 'commissioned') {
    conditions.push(sql`LOWER(${schemeStatuses.water_supply}) = 'yes'`);
  } else if (activeFilter === 'fully_completed') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('completed', 'fully-completed', 'fully completed', 'functionally completed')`);
  } else if (activeFilter === 'partial' || activeFilter === 'in_progress') {
    conditions.push(sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN ('in progress', 'partial', 'ongoing')`);
  }

  if (targetAgencyType && targetAgencyType.toUpperCase() !== 'ALL') {
    conditions.push(sql`UPPER(${schemeStatuses.agency_type}) = ${targetAgencyType.toUpperCase()}`);
  }

  if (conditions.length > 0) {
    const rows = await db.select({ scheme_id: schemeStatuses.scheme_id })
      .from(schemeStatuses)
      .where(and(...conditions));
    const ids = rows.map((r: any) => r.scheme_id);
    return ids.length > 0 ? ids : ['NO_MATCHES'];
  }
  return null;
}

// Helper function to get villages with water for a specific region or all regions
const getVillagesWithWater = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(waterSchemeData.water_value_day7),
    sql`${waterSchemeData.water_value_day7} > 0`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  // Optimized query: JOIN with water_consumption to get ESR data in one query
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      water_value_day1: waterSchemeData.water_value_day1,
      water_value_day2: waterSchemeData.water_value_day2,
      water_value_day3: waterSchemeData.water_value_day3,
      water_value_day4: waterSchemeData.water_value_day4,
      water_value_day5: waterSchemeData.water_value_day5,
      water_value_day6: waterSchemeData.water_value_day6,
      water_value_day7: waterSchemeData.water_value_day7,
      water_date_day1: waterSchemeData.water_date_day1,
      water_date_day2: waterSchemeData.water_date_day2,
      water_date_day3: waterSchemeData.water_date_day3,
      water_date_day4: waterSchemeData.water_date_day4,
      water_date_day5: waterSchemeData.water_date_day5,
      water_date_day6: waterSchemeData.water_date_day6,
      water_date_day7: waterSchemeData.water_date_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name,
      population: waterSchemeData.population,
      number_of_esr: waterSchemeData.number_of_esr,
      circle: waterSchemeData.circle,
      division: waterSchemeData.division,
      sub_division: waterSchemeData.sub_division,
      block: waterSchemeData.block,
      esr_name: waterConsumption.esr_name,
      esr_capacity: waterConsumption.esr_capacity,
      flow_meter_connected: waterConsumption.flow_meter_connected,
      lremark: sql<string>`(SELECT description FROM helpdesk_tickets ht 
        WHERE ht.scheme_id = ${waterConsumption.scheme_id} 
        AND ht.village_name = ${waterConsumption.village_name} 
        AND ht.esr_name = ${waterConsumption.esr_name} 
        AND ht.level = 'ESR' 
        AND ht.status IN ('Open', 'In-Progress') 
        ORDER BY ht.created_at DESC LIMIT 1)`
    })
    .from(waterSchemeData)
    .leftJoin(
      waterConsumption,
      and(
        eq(waterSchemeData.scheme_id, waterConsumption.scheme_id),
        eq(waterSchemeData.village_name, waterConsumption.village_name)
      )
    )
    .where(and(...whereConditions));

  const results = await query.orderBy(waterSchemeData.village_name);
  
  // Group by village and get the first ESR data for each village
  const groupedResults = new Map();
  
  for (const row of results) {
    const key = `${row.scheme_id}-${row.village_name}`;
    
    if (!groupedResults.has(key)) {
      groupedResults.set(key, {
        village_name: row.village_name,
        water_value_day1: row.water_value_day1,
        water_value_day2: row.water_value_day2,
        water_value_day3: row.water_value_day3,
        water_value_day4: row.water_value_day4,
        water_value_day5: row.water_value_day5,
        water_value_day6: row.water_value_day6,
        water_value_day7: row.water_value_day7,
        water_date_day1: row.water_date_day1,
        water_date_day2: row.water_date_day2,
        water_date_day3: row.water_date_day3,
        water_date_day4: row.water_date_day4,
        water_date_day5: row.water_date_day5,
        water_date_day6: row.water_date_day6,
        water_date_day7: row.water_date_day7,
        region: row.region,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        population: row.population,
        number_of_esr: row.number_of_esr,
        circle: row.circle,
        division: row.division,
        sub_division: row.sub_division,
        block: row.block,
        esr_name: row.esr_name,
        esr_capacity: row.esr_capacity,
        flow_meter_connected: row.flow_meter_connected,
        lremark: (row as any).lremark,
        has_esr_data: row.esr_name ? true : false
      });
    }
  }

  // Convert water values from MLD to LL before returning
  return Array.from(groupedResults.values()).map(convertRecordWaterValuesToLL);
};

// Helper function to get villages with no water
const getVillagesNoWater = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    sql`(${waterSchemeData.water_value_day7} = 0 OR ${waterSchemeData.water_value_day7} IS NULL)`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  // Use the exact same pattern as getVillagesWithWater with leftJoin for consistency
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      water_value_day1: waterSchemeData.water_value_day1,
      water_value_day2: waterSchemeData.water_value_day2,
      water_value_day3: waterSchemeData.water_value_day3,
      water_value_day4: waterSchemeData.water_value_day4,
      water_value_day5: waterSchemeData.water_value_day5,
      water_value_day6: waterSchemeData.water_value_day6,
      water_value_day7: waterSchemeData.water_value_day7,
      water_date_day1: waterSchemeData.water_date_day1,
      water_date_day2: waterSchemeData.water_date_day2,
      water_date_day3: waterSchemeData.water_date_day3,
      water_date_day4: waterSchemeData.water_date_day4,
      water_date_day5: waterSchemeData.water_date_day5,
      water_date_day6: waterSchemeData.water_date_day6,
      water_date_day7: waterSchemeData.water_date_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name,
      population: waterSchemeData.population,
      number_of_esr: waterSchemeData.number_of_esr,
      circle: waterSchemeData.circle,
      division: waterSchemeData.division,
      sub_division: waterSchemeData.sub_division,
      block: waterSchemeData.block,
      esr_name: waterConsumption.esr_name,
      esr_capacity: waterConsumption.esr_capacity,
      flow_meter_connected: waterConsumption.flow_meter_connected,
      lremark: sql<string>`(SELECT description FROM helpdesk_tickets ht 
        WHERE ht.scheme_id = ${waterConsumption.scheme_id} 
        AND ht.village_name = ${waterConsumption.village_name} 
        AND ht.esr_name = ${waterConsumption.esr_name} 
        AND ht.level = 'ESR' 
        AND ht.status IN ('Open', 'In-Progress') 
        ORDER BY ht.created_at DESC LIMIT 1)`
    })
    .from(waterSchemeData)
    .leftJoin(
      waterConsumption,
      and(
        eq(waterSchemeData.scheme_id, waterConsumption.scheme_id),
        eq(waterSchemeData.village_name, waterConsumption.village_name)
      )
    )
    .where(and(...whereConditions));

  const results = await query.orderBy(waterSchemeData.village_name);
  
  // Group by village and get the first ESR data for each village
  const groupedResults = new Map();
  
  for (const row of results) {
    const key = `${row.scheme_id}-${row.village_name}`;
    
    if (!groupedResults.has(key)) {
      groupedResults.set(key, {
        village_name: row.village_name,
        water_value_day1: row.water_value_day1,
        water_value_day2: row.water_value_day2,
        water_value_day3: row.water_value_day3,
        water_value_day4: row.water_value_day4,
        water_value_day5: row.water_value_day5,
        water_value_day6: row.water_value_day6,
        water_value_day7: row.water_value_day7,
        water_date_day1: row.water_date_day1,
        water_date_day2: row.water_date_day2,
        water_date_day3: row.water_date_day3,
        water_date_day4: row.water_date_day4,
        water_date_day5: row.water_date_day5,
        water_date_day6: row.water_date_day6,
        water_date_day7: row.water_date_day7,
        region: row.region,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        population: row.population,
        number_of_esr: row.number_of_esr,
        circle: row.circle,
        division: row.division,
        sub_division: row.sub_division,
        block: row.block,
        esr_name: row.esr_name,
        esr_capacity: row.esr_capacity,
        flow_meter_connected: row.flow_meter_connected,
        lremark: (row as any).lremark,
        has_esr_data: row.esr_name ? true : false
      });
    }
  }

  // Convert water values from MLD to LL before returning
  return Array.from(groupedResults.values()).map(convertRecordWaterValuesToLL);
};

// Helper function to get villages with consistent water (7 days)
const getVillagesConsistentWater = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(waterSchemeData.water_value_day7),
    sql`${waterSchemeData.water_value_day7} > 0`,
    // Consistent means having water for all 7 days
    isNotNull(waterSchemeData.water_value_day1),
    isNotNull(waterSchemeData.water_value_day2),
    isNotNull(waterSchemeData.water_value_day3),
    isNotNull(waterSchemeData.water_value_day4),
    isNotNull(waterSchemeData.water_value_day5),
    isNotNull(waterSchemeData.water_value_day6),
    sql`${waterSchemeData.water_value_day1} > 0`,
    sql`${waterSchemeData.water_value_day2} > 0`,
    sql`${waterSchemeData.water_value_day3} > 0`,
    sql`${waterSchemeData.water_value_day4} > 0`,
    sql`${waterSchemeData.water_value_day5} > 0`,
    sql`${waterSchemeData.water_value_day6} > 0`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      water_value_day7: waterSchemeData.water_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name
    })
    .from(waterSchemeData)
    .where(and(...whereConditions));

  const results = await query.orderBy(waterSchemeData.village_name);
  // Convert water values from MLD to LL before returning
  return results.map(convertRecordWaterValuesToLL);
};

// Helper function to get villages with consistent zero water
const getVillagesConsistentZeroWater = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must equal exactly 0 (not null)
    sql`${waterSchemeData.water_value_day1} = 0`,
    sql`${waterSchemeData.water_value_day2} = 0`,
    sql`${waterSchemeData.water_value_day3} = 0`,
    sql`${waterSchemeData.water_value_day4} = 0`,
    sql`${waterSchemeData.water_value_day5} = 0`,
    sql`${waterSchemeData.water_value_day6} = 0`,
    sql`${waterSchemeData.water_value_day7} = 0`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      water_value_day7: waterSchemeData.water_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name
    })
    .from(waterSchemeData)
    .where(and(...whereConditions));

  const results = await query.orderBy(waterSchemeData.village_name);
  // Convert water values from MLD to LL before returning
  return results.map(convertRecordWaterValuesToLL);
};

// Helper function to get villages above 55 LPCD
const getVillagesAbove55LPCD = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(waterSchemeData.lpcd_value_day7),
    sql`${waterSchemeData.lpcd_value_day7} >= 55`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  // Optimized query: JOIN with water_consumption to get ESR data in one query
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day1: waterSchemeData.lpcd_value_day1,
      lpcd_value_day2: waterSchemeData.lpcd_value_day2,
      lpcd_value_day3: waterSchemeData.lpcd_value_day3,
      lpcd_value_day4: waterSchemeData.lpcd_value_day4,
      lpcd_value_day5: waterSchemeData.lpcd_value_day5,
      lpcd_value_day6: waterSchemeData.lpcd_value_day6,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      lpcd_date_day1: waterSchemeData.lpcd_date_day1,
      lpcd_date_day2: waterSchemeData.lpcd_date_day2,
      lpcd_date_day3: waterSchemeData.lpcd_date_day3,
      lpcd_date_day4: waterSchemeData.lpcd_date_day4,
      lpcd_date_day5: waterSchemeData.lpcd_date_day5,
      lpcd_date_day6: waterSchemeData.lpcd_date_day6,
      lpcd_date_day7: waterSchemeData.lpcd_date_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name,
      population: waterSchemeData.population,
      number_of_esr: waterSchemeData.number_of_esr,
      circle: waterSchemeData.circle,
      division: waterSchemeData.division,
      sub_division: waterSchemeData.sub_division,
      block: waterSchemeData.block,
      esr_name: waterConsumption.esr_name,
      esr_capacity: waterConsumption.esr_capacity,
      flow_meter_connected: waterConsumption.flow_meter_connected,
      lremark: sql<string>`(SELECT description FROM helpdesk_tickets ht 
        WHERE ht.scheme_id = ${waterConsumption.scheme_id} 
        AND ht.village_name = ${waterConsumption.village_name} 
        AND ht.esr_name = ${waterConsumption.esr_name} 
        AND ht.level = 'ESR' 
        AND ht.status IN ('Open', 'In-Progress') 
        ORDER BY ht.created_at DESC LIMIT 1)`
    })
    .from(waterSchemeData)
    .leftJoin(
      waterConsumption,
      and(
        eq(waterSchemeData.scheme_id, waterConsumption.scheme_id),
        eq(waterSchemeData.village_name, waterConsumption.village_name)
      )
    )
    .where(and(...whereConditions));

  const results = await query.orderBy(waterSchemeData.village_name);
  
  // Group by village and get the first ESR data for each village
  const groupedResults = new Map();
  
  for (const row of results) {
    const key = `${row.scheme_id}-${row.village_name}`;
    
    if (!groupedResults.has(key)) {
      groupedResults.set(key, {
        village_name: row.village_name,
        lpcd_value_day1: row.lpcd_value_day1,
        lpcd_value_day2: row.lpcd_value_day2,
        lpcd_value_day3: row.lpcd_value_day3,
        lpcd_value_day4: row.lpcd_value_day4,
        lpcd_value_day5: row.lpcd_value_day5,
        lpcd_value_day6: row.lpcd_value_day6,
        lpcd_value_day7: row.lpcd_value_day7,
        lpcd_date_day1: row.lpcd_date_day1,
        lpcd_date_day2: row.lpcd_date_day2,
        lpcd_date_day3: row.lpcd_date_day3,
        lpcd_date_day4: row.lpcd_date_day4,
        lpcd_date_day5: row.lpcd_date_day5,
        lpcd_date_day6: row.lpcd_date_day6,
        lpcd_date_day7: row.lpcd_date_day7,
        region: row.region,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        population: row.population,
        number_of_esr: row.number_of_esr,
        circle: row.circle,
        division: row.division,
        sub_division: row.sub_division,
        block: row.block,
        esr_name: row.esr_name,
        esr_capacity: row.esr_capacity,
        flow_meter_connected: row.flow_meter_connected,
        lremark: (row as any).lremark,
        has_esr_data: row.esr_name ? true : false
      });
    }
  }

  return Array.from(groupedResults.values());
};

// Helper function to get villages below 55 LPCD
const getVillagesBelow55LPCD = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(waterSchemeData.lpcd_value_day7),
    sql`${waterSchemeData.lpcd_value_day7} < 55`,
    sql`${waterSchemeData.lpcd_value_day7} > 0`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  // Optimized query: JOIN with water_consumption to get ESR data in one query
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day1: waterSchemeData.lpcd_value_day1,
      lpcd_value_day2: waterSchemeData.lpcd_value_day2,
      lpcd_value_day3: waterSchemeData.lpcd_value_day3,
      lpcd_value_day4: waterSchemeData.lpcd_value_day4,
      lpcd_value_day5: waterSchemeData.lpcd_value_day5,
      lpcd_value_day6: waterSchemeData.lpcd_value_day6,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      lpcd_date_day1: waterSchemeData.lpcd_date_day1,
      lpcd_date_day2: waterSchemeData.lpcd_date_day2,
      lpcd_date_day3: waterSchemeData.lpcd_date_day3,
      lpcd_date_day4: waterSchemeData.lpcd_date_day4,
      lpcd_date_day5: waterSchemeData.lpcd_date_day5,
      lpcd_date_day6: waterSchemeData.lpcd_date_day6,
      lpcd_date_day7: waterSchemeData.lpcd_date_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name,
      population: waterSchemeData.population,
      number_of_esr: waterSchemeData.number_of_esr,
      circle: waterSchemeData.circle,
      division: waterSchemeData.division,
      sub_division: waterSchemeData.sub_division,
      block: waterSchemeData.block,
      esr_name: waterConsumption.esr_name,
      esr_capacity: waterConsumption.esr_capacity,
      flow_meter_connected: waterConsumption.flow_meter_connected,
      lremark: sql<string>`(SELECT description FROM helpdesk_tickets ht 
        WHERE ht.scheme_id = ${waterConsumption.scheme_id} 
        AND ht.village_name = ${waterConsumption.village_name} 
        AND ht.esr_name = ${waterConsumption.esr_name} 
        AND ht.level = 'ESR' 
        AND ht.status IN ('Open', 'In-Progress') 
        ORDER BY ht.created_at DESC LIMIT 1)`
    })
    .from(waterSchemeData)
    .leftJoin(
      waterConsumption,
      and(
        eq(waterSchemeData.scheme_id, waterConsumption.scheme_id),
        eq(waterSchemeData.village_name, waterConsumption.village_name)
      )
    )
    .where(and(...whereConditions));

  const results = await query.orderBy(waterSchemeData.village_name);
  
  // Group by village and get the first ESR data for each village
  const groupedResults = new Map();
  
  for (const row of results) {
    const key = `${row.scheme_id}-${row.village_name}`;
    
    if (!groupedResults.has(key)) {
      groupedResults.set(key, {
        village_name: row.village_name,
        lpcd_value_day1: row.lpcd_value_day1,
        lpcd_value_day2: row.lpcd_value_day2,
        lpcd_value_day3: row.lpcd_value_day3,
        lpcd_value_day4: row.lpcd_value_day4,
        lpcd_value_day5: row.lpcd_value_day5,
        lpcd_value_day6: row.lpcd_value_day6,
        lpcd_value_day7: row.lpcd_value_day7,
        lpcd_date_day1: row.lpcd_date_day1,
        lpcd_date_day2: row.lpcd_date_day2,
        lpcd_date_day3: row.lpcd_date_day3,
        lpcd_date_day4: row.lpcd_date_day4,
        lpcd_date_day5: row.lpcd_date_day5,
        lpcd_date_day6: row.lpcd_date_day6,
        lpcd_date_day7: row.lpcd_date_day7,
        region: row.region,
        scheme_id: row.scheme_id,
        scheme_name: row.scheme_name,
        population: row.population,
        number_of_esr: row.number_of_esr,
        circle: row.circle,
        division: row.division,
        sub_division: row.sub_division,
        block: row.block,
        esr_name: row.esr_name,
        esr_capacity: row.esr_capacity,
        flow_meter_connected: row.flow_meter_connected,
        lremark: (row as any).lremark,
        has_esr_data: row.esr_name ? true : false
      });
    }
  }

  return Array.from(groupedResults.values());
};

// Helper function to get villages consistently above 55 LPCD (all 7 days)
const getVillagesConsistentlyAbove55LPCD = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be >= 55
    isNotNull(waterSchemeData.lpcd_value_day1),
    isNotNull(waterSchemeData.lpcd_value_day2),
    isNotNull(waterSchemeData.lpcd_value_day3),
    isNotNull(waterSchemeData.lpcd_value_day4),
    isNotNull(waterSchemeData.lpcd_value_day5),
    isNotNull(waterSchemeData.lpcd_value_day6),
    isNotNull(waterSchemeData.lpcd_value_day7),
    sql`${waterSchemeData.lpcd_value_day1} >= 55`,
    sql`${waterSchemeData.lpcd_value_day2} >= 55`,
    sql`${waterSchemeData.lpcd_value_day3} >= 55`,
    sql`${waterSchemeData.lpcd_value_day4} >= 55`,
    sql`${waterSchemeData.lpcd_value_day5} >= 55`,
    sql`${waterSchemeData.lpcd_value_day6} >= 55`,
    sql`${waterSchemeData.lpcd_value_day7} >= 55`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name
    })
    .from(waterSchemeData)
    .where(and(...whereConditions));

  return await query.orderBy(waterSchemeData.village_name);
};

// Helper function to get villages consistently below 55 LPCD (all 7 days)
const getVillagesConsistentlyBelow55LPCD = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be > 0 and < 55
    isNotNull(waterSchemeData.lpcd_value_day1),
    isNotNull(waterSchemeData.lpcd_value_day2),
    isNotNull(waterSchemeData.lpcd_value_day3),
    isNotNull(waterSchemeData.lpcd_value_day4),
    isNotNull(waterSchemeData.lpcd_value_day5),
    isNotNull(waterSchemeData.lpcd_value_day6),
    isNotNull(waterSchemeData.lpcd_value_day7),
    sql`${waterSchemeData.lpcd_value_day1} > 0 AND ${waterSchemeData.lpcd_value_day1} < 55`,
    sql`${waterSchemeData.lpcd_value_day2} > 0 AND ${waterSchemeData.lpcd_value_day2} < 55`,
    sql`${waterSchemeData.lpcd_value_day3} > 0 AND ${waterSchemeData.lpcd_value_day3} < 55`,
    sql`${waterSchemeData.lpcd_value_day4} > 0 AND ${waterSchemeData.lpcd_value_day4} < 55`,
    sql`${waterSchemeData.lpcd_value_day5} > 0 AND ${waterSchemeData.lpcd_value_day5} < 55`,
    sql`${waterSchemeData.lpcd_value_day6} > 0 AND ${waterSchemeData.lpcd_value_day6} < 55`,
    sql`${waterSchemeData.lpcd_value_day7} > 0 AND ${waterSchemeData.lpcd_value_day7} < 55`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name, village name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      // It could be a scheme name or village name - use case-insensitive matching for both
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name
    })
    .from(waterSchemeData)
    .where(and(...whereConditions));

  return await query.orderBy(waterSchemeData.village_name);
};

// Helper function to get villages with average LPCD above 55 (7-day average)
const getVillagesAverageLPCDAbove55 = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values (not null)
    isNotNull(waterSchemeData.lpcd_value_day1),
    isNotNull(waterSchemeData.lpcd_value_day2),
    isNotNull(waterSchemeData.lpcd_value_day3),
    isNotNull(waterSchemeData.lpcd_value_day4),
    isNotNull(waterSchemeData.lpcd_value_day5),
    isNotNull(waterSchemeData.lpcd_value_day6),
    isNotNull(waterSchemeData.lpcd_value_day7),
    // Average of 7 days >= 55
    sql`(CAST(${waterSchemeData.lpcd_value_day1} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day2} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day3} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day4} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day5} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day6} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day7} AS DECIMAL)) / 7 >= 55`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day1: waterSchemeData.lpcd_value_day1,
      lpcd_value_day2: waterSchemeData.lpcd_value_day2,
      lpcd_value_day3: waterSchemeData.lpcd_value_day3,
      lpcd_value_day4: waterSchemeData.lpcd_value_day4,
      lpcd_value_day5: waterSchemeData.lpcd_value_day5,
      lpcd_value_day6: waterSchemeData.lpcd_value_day6,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      lpcd_date_day1: waterSchemeData.lpcd_date_day1,
      lpcd_date_day2: waterSchemeData.lpcd_date_day2,
      lpcd_date_day3: waterSchemeData.lpcd_date_day3,
      lpcd_date_day4: waterSchemeData.lpcd_date_day4,
      lpcd_date_day5: waterSchemeData.lpcd_date_day5,
      lpcd_date_day6: waterSchemeData.lpcd_date_day6,
      lpcd_date_day7: waterSchemeData.lpcd_date_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name,
      population: waterSchemeData.population,
      number_of_esr: waterSchemeData.number_of_esr,
      circle: waterSchemeData.circle,
      division: waterSchemeData.division,
      sub_division: waterSchemeData.sub_division,
      block: waterSchemeData.block
    })
    .from(waterSchemeData)
    .where(and(...whereConditions));

  return await query.orderBy(waterSchemeData.village_name);
};

// Helper function to get villages with average LPCD below 55 (7-day average)
const getVillagesAverageLPCDBelow55 = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values (not null)
    isNotNull(waterSchemeData.lpcd_value_day1),
    isNotNull(waterSchemeData.lpcd_value_day2),
    isNotNull(waterSchemeData.lpcd_value_day3),
    isNotNull(waterSchemeData.lpcd_value_day4),
    isNotNull(waterSchemeData.lpcd_value_day5),
    isNotNull(waterSchemeData.lpcd_value_day6),
    isNotNull(waterSchemeData.lpcd_value_day7),
    // Average of 7 days < 55
    sql`(CAST(${waterSchemeData.lpcd_value_day1} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day2} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day3} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day4} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day5} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day6} AS DECIMAL) + CAST(${waterSchemeData.lpcd_value_day7} AS DECIMAL)) / 7 < 55`
  ];

  if (region) {
    whereConditions.push(ilike(waterSchemeData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(waterSchemeData.scheme_id, schemeId));
    } else {
      whereConditions.push(
        sql`(${waterSchemeData.scheme_name} ILIKE ${'%' + schemeId + '%'} OR ${waterSchemeData.village_name} ILIKE ${'%' + schemeId + '%'})`
      );
    }
  }
  
  const query = db
    .select({
      village_name: waterSchemeData.village_name,
      lpcd_value_day1: waterSchemeData.lpcd_value_day1,
      lpcd_value_day2: waterSchemeData.lpcd_value_day2,
      lpcd_value_day3: waterSchemeData.lpcd_value_day3,
      lpcd_value_day4: waterSchemeData.lpcd_value_day4,
      lpcd_value_day5: waterSchemeData.lpcd_value_day5,
      lpcd_value_day6: waterSchemeData.lpcd_value_day6,
      lpcd_value_day7: waterSchemeData.lpcd_value_day7,
      lpcd_date_day1: waterSchemeData.lpcd_date_day1,
      lpcd_date_day2: waterSchemeData.lpcd_date_day2,
      lpcd_date_day3: waterSchemeData.lpcd_date_day3,
      lpcd_date_day4: waterSchemeData.lpcd_date_day4,
      lpcd_date_day5: waterSchemeData.lpcd_date_day5,
      lpcd_date_day6: waterSchemeData.lpcd_date_day6,
      lpcd_date_day7: waterSchemeData.lpcd_date_day7,
      region: waterSchemeData.region,
      scheme_id: waterSchemeData.scheme_id,
      scheme_name: waterSchemeData.scheme_name,
      population: waterSchemeData.population,
      number_of_esr: waterSchemeData.number_of_esr,
      circle: waterSchemeData.circle,
      division: waterSchemeData.division,
      sub_division: waterSchemeData.sub_division,
      block: waterSchemeData.block
    })
    .from(waterSchemeData)
    .where(and(...whereConditions));

  return await query.orderBy(waterSchemeData.village_name);
};

// Helper function to get ESRs with optimal chlorine (0.2-0.5 mg/L)
const getESROptimalChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_7} >= 0.2`,
    sql`${chlorineData.chlorine_value_7} <= 0.5`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with below optimal chlorine (<0.2 mg/L)
const getESRBelowChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_7} < 0.2`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with above optimal chlorine (>0.5 mg/L)
const getESRAboveChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_7} > 0.5`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with average chlorine in optimal range (0.2-0.5 mg/L)
const getESRAverageChlorineOptimal = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values
    isNotNull(chlorineData.chlorine_value_1),
    isNotNull(chlorineData.chlorine_value_2),
    isNotNull(chlorineData.chlorine_value_3),
    isNotNull(chlorineData.chlorine_value_4),
    isNotNull(chlorineData.chlorine_value_5),
    isNotNull(chlorineData.chlorine_value_6),
    isNotNull(chlorineData.chlorine_value_7),
    // Average >= 0.2 and <= 0.5
    sql`(CAST(${chlorineData.chlorine_value_1} AS DECIMAL) + CAST(${chlorineData.chlorine_value_2} AS DECIMAL) + CAST(${chlorineData.chlorine_value_3} AS DECIMAL) + CAST(${chlorineData.chlorine_value_4} AS DECIMAL) + CAST(${chlorineData.chlorine_value_5} AS DECIMAL) + CAST(${chlorineData.chlorine_value_6} AS DECIMAL) + CAST(${chlorineData.chlorine_value_7} AS DECIMAL)) / 7 >= 0.2`,
    sql`(CAST(${chlorineData.chlorine_value_1} AS DECIMAL) + CAST(${chlorineData.chlorine_value_2} AS DECIMAL) + CAST(${chlorineData.chlorine_value_3} AS DECIMAL) + CAST(${chlorineData.chlorine_value_4} AS DECIMAL) + CAST(${chlorineData.chlorine_value_5} AS DECIMAL) + CAST(${chlorineData.chlorine_value_6} AS DECIMAL) + CAST(${chlorineData.chlorine_value_7} AS DECIMAL)) / 7 <= 0.5`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with average chlorine below optimal (<0.2 mg/L)
const getESRAverageChlorineBelow = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values
    isNotNull(chlorineData.chlorine_value_1),
    isNotNull(chlorineData.chlorine_value_2),
    isNotNull(chlorineData.chlorine_value_3),
    isNotNull(chlorineData.chlorine_value_4),
    isNotNull(chlorineData.chlorine_value_5),
    isNotNull(chlorineData.chlorine_value_6),
    isNotNull(chlorineData.chlorine_value_7),
    // Average < 0.2
    sql`(CAST(${chlorineData.chlorine_value_1} AS DECIMAL) + CAST(${chlorineData.chlorine_value_2} AS DECIMAL) + CAST(${chlorineData.chlorine_value_3} AS DECIMAL) + CAST(${chlorineData.chlorine_value_4} AS DECIMAL) + CAST(${chlorineData.chlorine_value_5} AS DECIMAL) + CAST(${chlorineData.chlorine_value_6} AS DECIMAL) + CAST(${chlorineData.chlorine_value_7} AS DECIMAL)) / 7 < 0.2`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with average chlorine above optimal (>0.5 mg/L)
const getESRAverageChlorineAbove = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values
    isNotNull(chlorineData.chlorine_value_1),
    isNotNull(chlorineData.chlorine_value_2),
    isNotNull(chlorineData.chlorine_value_3),
    isNotNull(chlorineData.chlorine_value_4),
    isNotNull(chlorineData.chlorine_value_5),
    isNotNull(chlorineData.chlorine_value_6),
    isNotNull(chlorineData.chlorine_value_7),
    // Average > 0.5
    sql`(CAST(${chlorineData.chlorine_value_1} AS DECIMAL) + CAST(${chlorineData.chlorine_value_2} AS DECIMAL) + CAST(${chlorineData.chlorine_value_3} AS DECIMAL) + CAST(${chlorineData.chlorine_value_4} AS DECIMAL) + CAST(${chlorineData.chlorine_value_5} AS DECIMAL) + CAST(${chlorineData.chlorine_value_6} AS DECIMAL) + CAST(${chlorineData.chlorine_value_7} AS DECIMAL)) / 7 > 0.5`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with optimal pressure (0.2-0.7 bar)
const getESROptimalPressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(pressureData.pressure_value_7),
    sql`${pressureData.pressure_value_7} >= 0.2`,
    sql`${pressureData.pressure_value_7} <= 0.7`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get ESRs with below optimal pressure (<0.2 bar)
const getESRBelowPressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(pressureData.pressure_value_7),
    sql`${pressureData.pressure_value_7} < 0.2`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get ESRs with above optimal pressure (>0.7 bar)
const getESRAbovePressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(pressureData.pressure_value_7),
    sql`${pressureData.pressure_value_7} > 0.7`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get ESRs with average pressure in optimal range (0.2-0.7 bar)
const getESRAveragePressureOptimal = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values
    isNotNull(pressureData.pressure_value_1),
    isNotNull(pressureData.pressure_value_2),
    isNotNull(pressureData.pressure_value_3),
    isNotNull(pressureData.pressure_value_4),
    isNotNull(pressureData.pressure_value_5),
    isNotNull(pressureData.pressure_value_6),
    isNotNull(pressureData.pressure_value_7),
    // Average >= 0.2 and <= 0.7
    sql`(CAST(${pressureData.pressure_value_1} AS DECIMAL) + CAST(${pressureData.pressure_value_2} AS DECIMAL) + CAST(${pressureData.pressure_value_3} AS DECIMAL) + CAST(${pressureData.pressure_value_4} AS DECIMAL) + CAST(${pressureData.pressure_value_5} AS DECIMAL) + CAST(${pressureData.pressure_value_6} AS DECIMAL) + CAST(${pressureData.pressure_value_7} AS DECIMAL)) / 7 >= 0.2`,
    sql`(CAST(${pressureData.pressure_value_1} AS DECIMAL) + CAST(${pressureData.pressure_value_2} AS DECIMAL) + CAST(${pressureData.pressure_value_3} AS DECIMAL) + CAST(${pressureData.pressure_value_4} AS DECIMAL) + CAST(${pressureData.pressure_value_5} AS DECIMAL) + CAST(${pressureData.pressure_value_6} AS DECIMAL) + CAST(${pressureData.pressure_value_7} AS DECIMAL)) / 7 <= 0.7`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get ESRs with average pressure below optimal (<0.2 bar)
const getESRAveragePressureBelow = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values
    isNotNull(pressureData.pressure_value_1),
    isNotNull(pressureData.pressure_value_2),
    isNotNull(pressureData.pressure_value_3),
    isNotNull(pressureData.pressure_value_4),
    isNotNull(pressureData.pressure_value_5),
    isNotNull(pressureData.pressure_value_6),
    isNotNull(pressureData.pressure_value_7),
    // Average < 0.2
    sql`(CAST(${pressureData.pressure_value_1} AS DECIMAL) + CAST(${pressureData.pressure_value_2} AS DECIMAL) + CAST(${pressureData.pressure_value_3} AS DECIMAL) + CAST(${pressureData.pressure_value_4} AS DECIMAL) + CAST(${pressureData.pressure_value_5} AS DECIMAL) + CAST(${pressureData.pressure_value_6} AS DECIMAL) + CAST(${pressureData.pressure_value_7} AS DECIMAL)) / 7 < 0.2`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get ESRs with average pressure above optimal (>0.7 bar)
const getESRAveragePressureAbove = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must have values
    isNotNull(pressureData.pressure_value_1),
    isNotNull(pressureData.pressure_value_2),
    isNotNull(pressureData.pressure_value_3),
    isNotNull(pressureData.pressure_value_4),
    isNotNull(pressureData.pressure_value_5),
    isNotNull(pressureData.pressure_value_6),
    isNotNull(pressureData.pressure_value_7),
    // Average > 0.7
    sql`(CAST(${pressureData.pressure_value_1} AS DECIMAL) + CAST(${pressureData.pressure_value_2} AS DECIMAL) + CAST(${pressureData.pressure_value_3} AS DECIMAL) + CAST(${pressureData.pressure_value_4} AS DECIMAL) + CAST(${pressureData.pressure_value_5} AS DECIMAL) + CAST(${pressureData.pressure_value_6} AS DECIMAL) + CAST(${pressureData.pressure_value_7} AS DECIMAL)) / 7 > 0.7`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get fully completed schemes
const getFullyCompletedSchemes = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN (
      LOWER('Completed'), 
      LOWER('Fully-Completed'), 
      LOWER('Fully Completed'), 
      LOWER('fully completed')
    )`
  ];

  if (region) {
    whereConditions.push(eq(schemeStatuses.region, region));
  }
  
  if (schemeId) {
    whereConditions.push(eq(schemeStatuses.scheme_id, schemeId));
  }
  
  const query = db
    .select({
      scheme_id: schemeStatuses.scheme_id,
      scheme_name: schemeStatuses.scheme_name,
      region: schemeStatuses.region,
      circle: schemeStatuses.circle,
      division: schemeStatuses.division,
      sub_division: schemeStatuses.sub_division,
      block: schemeStatuses.block,
      fully_completion_scheme_status: schemeStatuses.fully_completion_scheme_status,
      number_of_village: schemeStatuses.number_of_village,
      total_villages_integrated: schemeStatuses.total_villages_integrated,
      fully_completed_villages: schemeStatuses.fully_completed_villages
    })
    .from(schemeStatuses)
    .where(and(...whereConditions));

  return await query.orderBy(schemeStatuses.scheme_name);
};

// Helper function to get combined schemes (Fully Completed + In Progress)
const getCombinedSchemes = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN (
      LOWER('Completed'), 
      LOWER('Fully-Completed'), 
      LOWER('Fully Completed'), 
      LOWER('fully completed'),
      LOWER('In Progress')
    )`
  ];

  if (region) {
    whereConditions.push(eq(schemeStatuses.region, region));
  }
  
  if (schemeId) {
    whereConditions.push(eq(schemeStatuses.scheme_id, schemeId));
  }
  
  const query = db
    .select({
      scheme_id: schemeStatuses.scheme_id,
      scheme_name: schemeStatuses.scheme_name,
      region: schemeStatuses.region,
      circle: schemeStatuses.circle,
      division: schemeStatuses.division,
      sub_division: schemeStatuses.sub_division,
      block: schemeStatuses.block,
      agency: schemeStatuses.agency,
      fully_completion_scheme_status: schemeStatuses.fully_completion_scheme_status,
      scheme_functional_status: schemeStatuses.scheme_functional_status,
      number_of_village: schemeStatuses.number_of_village,
      total_villages_integrated: schemeStatuses.total_villages_integrated,
      no_of_functional_village: schemeStatuses.no_of_functional_village,
      no_of_partial_village: schemeStatuses.no_of_partial_village,
      no_of_non_functional_village: schemeStatuses.no_of_non_functional_village,
      fully_completed_villages: schemeStatuses.fully_completed_villages,
      total_number_of_esr: schemeStatuses.total_number_of_esr,
      total_esr_integrated: schemeStatuses.total_esr_integrated,
      no_fully_completed_esr: schemeStatuses.no_fully_completed_esr,
      balance_to_complete_esr: schemeStatuses.balance_to_complete_esr,
      flow_meters_connected: schemeStatuses.flow_meters_connected,
      pressure_transmitter_connected: schemeStatuses.pressure_transmitter_connected,
      residual_chlorine_analyzer_connected: schemeStatuses.residual_chlorine_analyzer_connected,
      mjp_commissioned: schemeStatuses.mjp_commissioned,
      mjp_fully_completed: schemeStatuses.mjp_fully_completed
    })
    .from(schemeStatuses)
    .where(and(...whereConditions));

  return await query.orderBy(schemeStatuses.scheme_name);
};

// Helper function to get fully completed villages
const getFullyCompletedVillages = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    sql`LOWER(${villages.fully_completion_village_status}) IN (
      LOWER('Completed'), 
      LOWER('Fully-Completed'), 
      LOWER('Fully Completed'), 
      LOWER('fully completed')
    )`
  ];

  if (region) {
    whereConditions.push(eq(villages.region, region));
  }
  
  if (schemeId) {
    whereConditions.push(eq(villages.scheme_id, schemeId));
  }
  
  const query = db
    .select({
      village_name: villages.village_name,
      scheme_id: villages.scheme_id,
      scheme_name: villages.scheme_name,
      region: villages.region,
      circle: villages.circle,
      division: villages.division,
      sub_division: villages.sub_division,
      block: villages.block,
      village_functional_status: villages.village_functional_status,
      fully_completion_village_status: villages.fully_completion_village_status,
      number_of_esr: villages.number_of_esr,
      connected_esr: villages.connected_esr,
      not_connected_esr: villages.not_connected_esr,
      no_of_fully_completion_esr: villages.no_of_fully_completion_esr
    })
    .from(villages)
    .where(and(...whereConditions));

  return await query.orderBy(villages.village_name);
};

// Helper function to convert scheme name to scheme ID
const resolveSchemeId = async (schemeIdentifier: string): Promise<string | null> => {
  // If it's already a numeric ID, return as-is
  if (/^\d+$/.test(schemeIdentifier)) {
    return schemeIdentifier;
  }
  
  // Otherwise, look up the scheme by name (case-insensitive)
  const db = await getDB();
  
  // First try exact case-insensitive match
  let result = await db
    .select({ scheme_id: schemeStatuses.scheme_id, scheme_name: schemeStatuses.scheme_name })
    .from(schemeStatuses)
    .where(ilike(schemeStatuses.scheme_name, schemeIdentifier))
    .limit(1);
  
  if (result.length > 0) {
    console.log(`Exact match found: "${schemeIdentifier}" -> "${result[0].scheme_name}" (ID: ${result[0].scheme_id})`);
    return result[0].scheme_id;
  }
  
  // If no exact match, try partial matching for patterns like "105 villages rrwss"
  const cleanIdentifier = schemeIdentifier.toLowerCase().trim();
  result = await db
    .select({ scheme_id: schemeStatuses.scheme_id, scheme_name: schemeStatuses.scheme_name })
    .from(schemeStatuses)
    .where(ilike(schemeStatuses.scheme_name, `%${cleanIdentifier}%`))
    .limit(1);
  
  if (result.length > 0) {
    console.log(`Partial match found: "${schemeIdentifier}" -> "${result[0].scheme_name}" (ID: ${result[0].scheme_id})`);
    return result[0].scheme_id;
  }
  
  // Try matching individual components (like "105" in "105 villages rrwss")
  const words = cleanIdentifier.split(/\s+/);
  for (const word of words) {
    if (word.length > 2) { // Only consider meaningful words
      result = await db
        .select({ scheme_id: schemeStatuses.scheme_id, scheme_name: schemeStatuses.scheme_name })
        .from(schemeStatuses)
        .where(ilike(schemeStatuses.scheme_name, `%${word}%`))
        .limit(1);
      
      if (result.length > 0) {
        console.log(`Word match found: "${word}" from "${schemeIdentifier}" -> "${result[0].scheme_name}" (ID: ${result[0].scheme_id})`);
        return result[0].scheme_id;
      }
    }
  }
  
  return null;
};

// Helper function to get Flow Meters data by region or scheme
const getFlowMetersData = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  if (schemeId) {
    // Get scheme-level flow meter data
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    const whereConditions = [];
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(schemeStatuses.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(schemeStatuses.scheme_name, schemeId));
    }
    
    const query = db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        circle: schemeStatuses.circle,
        division: schemeStatuses.division,
        sub_division: schemeStatuses.sub_division,
        block: schemeStatuses.block,
        flow_meters_connected: schemeStatuses.flow_meters_connected,
        total_villages_integrated: schemeStatuses.total_villages_integrated,
        number_of_village: schemeStatuses.number_of_village
      })
      .from(schemeStatuses)
      .where(and(...whereConditions));
    
    return await query.orderBy(schemeStatuses.scheme_name);
  } else {
    // Get region-level flow meter data
    const whereConditions = [];
    
    if (region) {
      whereConditions.push(eq(regions.region_name, region));
    }
    
    const query = db
      .select({
        region_name: regions.region_name,
        flow_meter_integrated: regions.flow_meter_integrated,
        total_schemes_integrated: regions.total_schemes_integrated,
        fully_completed_schemes: regions.fully_completed_schemes,
        total_villages_integrated: regions.total_villages_integrated,
        fully_completed_villages: regions.fully_completed_villages
      })
      .from(regions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    return await query.orderBy(regions.region_name);
  }
};

// Helper function to get RCA/Chlorine Analyzers data by region or scheme
const getRCAData = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  if (schemeId) {
    // Get scheme-level RCA data
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    const whereConditions = [];
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(schemeStatuses.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(schemeStatuses.scheme_name, schemeId));
    }
    
    const query = db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        circle: schemeStatuses.circle,
        division: schemeStatuses.division,
        sub_division: schemeStatuses.sub_division,
        block: schemeStatuses.block,
        residual_chlorine_analyzer_connected: schemeStatuses.residual_chlorine_analyzer_connected,
        total_villages_integrated: schemeStatuses.total_villages_integrated,
        number_of_village: schemeStatuses.number_of_village
      })
      .from(schemeStatuses)
      .where(and(...whereConditions));
    
    return await query.orderBy(schemeStatuses.scheme_name);
  } else {
    // Get region-level RCA data
    const whereConditions = [];
    
    if (region) {
      whereConditions.push(eq(regions.region_name, region));
    }
    
    const query = db
      .select({
        region_name: regions.region_name,
        rca_integrated: regions.rca_integrated,
        total_schemes_integrated: regions.total_schemes_integrated,
        fully_completed_schemes: regions.fully_completed_schemes,
        total_villages_integrated: regions.total_villages_integrated,
        fully_completed_villages: regions.fully_completed_villages
      })
      .from(regions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    return await query.orderBy(regions.region_name);
  }
};

// Helper function to get Pressure Transmitters data by region or scheme
const getPressureTransmittersData = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  if (schemeId) {
    // Get scheme-level pressure transmitter data
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    const whereConditions = [];
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(schemeStatuses.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(schemeStatuses.scheme_name, schemeId));
    }
    
    const query = db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        circle: schemeStatuses.circle,
        division: schemeStatuses.division,
        sub_division: schemeStatuses.sub_division,
        block: schemeStatuses.block,
        pressure_transmitter_connected: schemeStatuses.pressure_transmitter_connected,
        total_villages_integrated: schemeStatuses.total_villages_integrated,
        number_of_village: schemeStatuses.number_of_village
      })
      .from(schemeStatuses)
      .where(and(...whereConditions));
    
    return await query.orderBy(schemeStatuses.scheme_name);
  } else {
    // Get region-level pressure transmitter data
    const whereConditions = [];
    
    if (region) {
      whereConditions.push(eq(regions.region_name, region));
    }
    
    const query = db
      .select({
        region_name: regions.region_name,
        pressure_transmitter_integrated: regions.pressure_transmitter_integrated,
        total_schemes_integrated: regions.total_schemes_integrated,
        fully_completed_schemes: regions.fully_completed_schemes,
        total_villages_integrated: regions.total_villages_integrated,
        fully_completed_villages: regions.fully_completed_villages
      })
      .from(regions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    return await query.orderBy(regions.region_name);
  }
};

// Helper function to get ESR data by region or scheme
const getESRData = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  if (schemeId) {
    // Get scheme-level ESR data
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    const whereConditions = [];
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(schemeStatuses.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(schemeStatuses.scheme_name, schemeId));
    }
    
    const query = db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        circle: schemeStatuses.circle,
        division: schemeStatuses.division,
        sub_division: schemeStatuses.sub_division,
        block: schemeStatuses.block,
        total_number_of_esr: schemeStatuses.total_number_of_esr,
        total_esr_integrated: schemeStatuses.total_esr_integrated,
        no_fully_completed_esr: schemeStatuses.no_fully_completed_esr,
        balance_to_complete_esr: schemeStatuses.balance_to_complete_esr,
        total_villages_integrated: schemeStatuses.total_villages_integrated,
        number_of_village: schemeStatuses.number_of_village
      })
      .from(schemeStatuses)
      .where(and(...whereConditions));
    
    return await query.orderBy(schemeStatuses.scheme_name);
  } else {
    // Get region-level ESR data
    const whereConditions = [];
    
    if (region) {
      whereConditions.push(eq(regions.region_name, region));
    }
    
    const query = db
      .select({
        region_name: regions.region_name,
        total_esr_integrated: regions.total_esr_integrated,
        fully_completed_esr: regions.fully_completed_esr,
        partial_esr: regions.partial_esr,
        total_schemes_integrated: regions.total_schemes_integrated,
        fully_completed_schemes: regions.fully_completed_schemes,
        total_villages_integrated: regions.total_villages_integrated,
        fully_completed_villages: regions.fully_completed_villages
      })
      .from(regions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    return await query.orderBy(regions.region_name);
  }
};

// Get village data for chart generation - MUST be before catch-all route
router.get("/village-data", async (req, res) => {
  try {
    const { village, scheme, scheme_id } = req.query;
    
    if (!village) {
      return res.status(400).json({ 
        error: "Village parameter is required" 
      });
    }
    
    const db = await getDB();
    console.log(`Fetching village data for chart: village=${village}, scheme=${scheme || 'any'}, scheme_id=${scheme_id || 'any'}`);
    
    // Build base query conditions
    const whereConditions = [
      ilike(waterSchemeData.village_name, `%${village}%`)
    ];
    
    if (scheme) {
      whereConditions.push(ilike(waterSchemeData.scheme_name, `%${scheme}%`));
    }
    
    // Filter by exact scheme_id if provided (for disambiguation)
    if (scheme_id) {
      whereConditions.push(eq(waterSchemeData.scheme_id, scheme_id as string));
    }
    
    // Query to get complete village data including 7-day water consumption and LPCD data
    const query = db
      .select({
        village_name: waterSchemeData.village_name,
        scheme_id: waterSchemeData.scheme_id,
        scheme_name: waterSchemeData.scheme_name,
        region: waterSchemeData.region,
        population: waterSchemeData.population,
        number_of_esr: waterSchemeData.number_of_esr,
        circle: waterSchemeData.circle,
        division: waterSchemeData.division,
        sub_division: waterSchemeData.sub_division,
        block: waterSchemeData.block,
        // 7-day water consumption data
        water_value_day1: waterSchemeData.water_value_day1,
        water_value_day2: waterSchemeData.water_value_day2,
        water_value_day3: waterSchemeData.water_value_day3,
        water_value_day4: waterSchemeData.water_value_day4,
        water_value_day5: waterSchemeData.water_value_day5,
        water_value_day6: waterSchemeData.water_value_day6,
        water_value_day7: waterSchemeData.water_value_day7,
        water_date_day1: waterSchemeData.water_date_day1,
        water_date_day2: waterSchemeData.water_date_day2,
        water_date_day3: waterSchemeData.water_date_day3,
        water_date_day4: waterSchemeData.water_date_day4,
        water_date_day5: waterSchemeData.water_date_day5,
        water_date_day6: waterSchemeData.water_date_day6,
        water_date_day7: waterSchemeData.water_date_day7,
        // 7-day LPCD data
        lpcd_value_day1: waterSchemeData.lpcd_value_day1,
        lpcd_value_day2: waterSchemeData.lpcd_value_day2,
        lpcd_value_day3: waterSchemeData.lpcd_value_day3,
        lpcd_value_day4: waterSchemeData.lpcd_value_day4,
        lpcd_value_day5: waterSchemeData.lpcd_value_day5,
        lpcd_value_day6: waterSchemeData.lpcd_value_day6,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        lpcd_date_day1: waterSchemeData.lpcd_date_day1,
        lpcd_date_day2: waterSchemeData.lpcd_date_day2,
        lpcd_date_day3: waterSchemeData.lpcd_date_day3,
        lpcd_date_day4: waterSchemeData.lpcd_date_day4,
        lpcd_date_day5: waterSchemeData.lpcd_date_day5,
        lpcd_date_day6: waterSchemeData.lpcd_date_day6,
        lpcd_date_day7: waterSchemeData.lpcd_date_day7
      })
      .from(waterSchemeData)
      .where(and(...whereConditions))
      .limit(10);

    const results = await query;
    
    if (results.length === 0) {
      return res.status(404).json({ 
        error: "No data found",
        message: `No village data found for '${village}'${scheme ? ` in scheme '${scheme}'` : ''}`
      });
    }
    
    console.log(`Found ${results.length} village records for chart generation`);
    res.json(results);
  } catch (error) {
    console.error("Error fetching village data for chart:", error);
    res.status(500).json({ 
      error: "Failed to fetch village data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/esr-water-consumption - Get ESR-level water consumption data with optional region/scheme/village filtering
router.get("/esr-water-consumption", async (req, res) => {
  try {
    const { region, schemeId, village } = req.query;
    const db = await getDB();
    
    let whereConditions = [];
    
    // Add region filter if provided (case-insensitive)
    if (region && region !== "all") {
      whereConditions.push(ilike(waterConsumption.region, region as string));
    }
    
    // Add scheme filter if provided
    if (schemeId && schemeId !== "all") {
      if (/^[0-9]+$/.test(schemeId as string)) {
        // It's a numeric scheme_id
        whereConditions.push(eq(waterConsumption.scheme_id, schemeId as string));
      } else {
        // It could be a scheme name - use case-insensitive matching
        whereConditions.push(ilike(waterConsumption.scheme_name, `%${schemeId}%`));
      }
    }
    
    // Add village filter if provided
    if (village && village !== "all") {
      whereConditions.push(ilike(waterConsumption.village_name, `%${village}%`));
    }
    
    let query = db
      .select({
        region: waterConsumption.region,
        circle: waterConsumption.circle,
        division: waterConsumption.division,
        sub_division: waterConsumption.sub_division,
        block: waterConsumption.block,
        scheme_id: waterConsumption.scheme_id,
        scheme_name: waterConsumption.scheme_name,
        village_name: waterConsumption.village_name,
        esr_name: waterConsumption.esr_name,
        esr_capacity: waterConsumption.esr_capacity,
        flow_rate_m3: waterConsumption.flow_rate_m3,
        flow_meter_connected: waterConsumption.flow_meter_connected,
        online_status: waterConsumption.online_status,
        water_value_day1: waterConsumption.water_value_day1,
        water_value_day2: waterConsumption.water_value_day2,
        water_value_day3: waterConsumption.water_value_day3,
        water_value_day4: waterConsumption.water_value_day4,
        water_value_day5: waterConsumption.water_value_day5,
        water_value_day6: waterConsumption.water_value_day6,
        water_value_day7: waterConsumption.water_value_day7,
        water_date_day1: waterConsumption.water_date_day1,
        water_date_day2: waterConsumption.water_date_day2,
        water_date_day3: waterConsumption.water_date_day3,
        water_date_day4: waterConsumption.water_date_day4,
        water_date_day5: waterConsumption.water_date_day5,
        water_date_day6: waterConsumption.water_date_day6,
        water_date_day7: waterConsumption.water_date_day7,
        consistent_zero_consumption: waterConsumption.consistent_zero_consumption,
        percentage_consumption_previous_day: waterConsumption.percentage_consumption_previous_day
      })
      .from(waterConsumption);
    
    // Apply where conditions if any exist (Drizzle builders are immutable, so reassign)
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    const results = await query.orderBy(waterConsumption.region, waterConsumption.scheme_name, waterConsumption.village_name);
    
    res.json({
      esrData: results,
      totalRecords: results.length,
      filters: {
        region: region || "all",
        schemeId: schemeId || "all"
      }
    });
  } catch (error) {
    console.error("Error fetching ESR water consumption data:", error);
    res.status(500).json({
      error: "Failed to fetch ESR water consumption data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/abrupt-water-consumption - Get ESRs with >400% consumption percentage
router.get("/abrupt-water-consumption", async (req, res) => {
  try {
    const { region, schemeId, village } = req.query;
    const db = await getDB();
    
    let whereConditions = [
      isNotNull(waterConsumption.esr_capacity),
      isNotNull(waterConsumption.water_value_day7),
      sql`${waterConsumption.esr_capacity} > 0`, // Avoid division by zero
      sql`(${waterConsumption.water_value_day7} / ${waterConsumption.esr_capacity}) * 100 > 400` // >400% consumption
    ];
    
    // Add region filter if provided (case-insensitive)
    if (region && region !== "all") {
      whereConditions.push(ilike(waterConsumption.region, region as string));
    }
    
    // Add scheme filter if provided
    if (schemeId && schemeId !== "all") {
      if (/^[0-9]+$/.test(schemeId as string)) {
        // It's a numeric scheme_id
        whereConditions.push(eq(waterConsumption.scheme_id, schemeId as string));
      } else {
        // It could be a scheme name - use case-insensitive matching
        whereConditions.push(ilike(waterConsumption.scheme_name, `%${schemeId}%`));
      }
    }
    
    // Add village filter if provided
    if (village && village !== "all") {
      whereConditions.push(ilike(waterConsumption.village_name, `%${village}%`));
    }
    
    const query = db
      .select({
        region: waterConsumption.region,
        circle: waterConsumption.circle,
        division: waterConsumption.division,
        sub_division: waterConsumption.sub_division,
        block: waterConsumption.block,
        scheme_id: waterConsumption.scheme_id,
        scheme_name: waterConsumption.scheme_name,
        village_name: waterConsumption.village_name,
        esr_name: waterConsumption.esr_name,
        esr_capacity: waterConsumption.esr_capacity,
        flow_rate_m3: waterConsumption.flow_rate_m3,
        flow_meter_connected: waterConsumption.flow_meter_connected,
        online_status: waterConsumption.online_status,
        water_value_day1: waterConsumption.water_value_day1,
        water_value_day2: waterConsumption.water_value_day2,
        water_value_day3: waterConsumption.water_value_day3,
        water_value_day4: waterConsumption.water_value_day4,
        water_value_day5: waterConsumption.water_value_day5,
        water_value_day6: waterConsumption.water_value_day6,
        water_value_day7: waterConsumption.water_value_day7,
        water_date_day1: waterConsumption.water_date_day1,
        water_date_day2: waterConsumption.water_date_day2,
        water_date_day3: waterConsumption.water_date_day3,
        water_date_day4: waterConsumption.water_date_day4,
        water_date_day5: waterConsumption.water_date_day5,
        water_date_day6: waterConsumption.water_date_day6,
        water_date_day7: waterConsumption.water_date_day7,
        consistent_zero_consumption: waterConsumption.consistent_zero_consumption,
        percentage_consumption_previous_day: waterConsumption.percentage_consumption_previous_day,
        // Calculate consumption percentage
        consumption_percentage: sql<number>`(${waterConsumption.water_value_day7} / ${waterConsumption.esr_capacity}) * 100`
      })
      .from(waterConsumption)
      .where(and(...whereConditions))
      .orderBy(sql`(${waterConsumption.water_value_day7} / ${waterConsumption.esr_capacity}) * 100 DESC`);
    
    const results = await query;
    
    res.json({
      esrData: results,
      totalRecords: results.length,
      filters: {
        region: region || "all",
        schemeId: schemeId || "all",
        village: village || "all"
      }
    });
  } catch (error) {
    console.error("Error fetching abrupt water consumption data:", error);
    res.status(500).json({
      error: "Failed to fetch abrupt water consumption data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/reliable-water-consumption - Get villages with reliable water consumption
// ESR consumption <= 200% capacity AND village LPCD > 100
router.get("/reliable-water-consumption", async (req, res) => {
  try {
    const { region, schemeId, village } = req.query;
    const db = await getDB();
    
    // Join water_consumption with water_scheme_data to get ESR data with village LPCD
    const query = db
      .select({
        // ESR data from water_consumption
        esr_region: waterConsumption.region,
        esr_circle: waterConsumption.circle,
        esr_division: waterConsumption.division,
        esr_sub_division: waterConsumption.sub_division,
        esr_block: waterConsumption.block,
        scheme_id: waterConsumption.scheme_id,
        scheme_name: waterConsumption.scheme_name,
        village_name: waterConsumption.village_name,
        esr_name: waterConsumption.esr_name,
        esr_capacity: waterConsumption.esr_capacity,
        flow_meter_connected: waterConsumption.flow_meter_connected,
        online_status: waterConsumption.online_status,
        lremark: sql<string>`(SELECT description FROM helpdesk_tickets ht 
          WHERE ht.scheme_id = ${waterConsumption.scheme_id} 
          AND ht.village_name = ${waterConsumption.village_name} 
          AND ht.esr_name = ${waterConsumption.esr_name} 
          AND ht.level = 'ESR' 
          AND ht.status IN ('Open', 'In-Progress') 
          ORDER BY ht.created_at DESC LIMIT 1)`,
        // Water consumption data (7 days)
        water_value_day1: waterConsumption.water_value_day1,
        water_value_day2: waterConsumption.water_value_day2,
        water_value_day3: waterConsumption.water_value_day3,
        water_value_day4: waterConsumption.water_value_day4,
        water_value_day5: waterConsumption.water_value_day5,
        water_value_day6: waterConsumption.water_value_day6,
        water_value_day7: waterConsumption.water_value_day7,
        water_date_day1: waterConsumption.water_date_day1,
        water_date_day2: waterConsumption.water_date_day2,
        water_date_day3: waterConsumption.water_date_day3,
        water_date_day4: waterConsumption.water_date_day4,
        water_date_day5: waterConsumption.water_date_day5,
        water_date_day6: waterConsumption.water_date_day6,
        water_date_day7: waterConsumption.water_date_day7,
        // Village LPCD data from water_scheme_data
        lpcd_value_day1: waterSchemeData.lpcd_value_day1,
        lpcd_value_day2: waterSchemeData.lpcd_value_day2,
        lpcd_value_day3: waterSchemeData.lpcd_value_day3,
        lpcd_value_day4: waterSchemeData.lpcd_value_day4,
        lpcd_value_day5: waterSchemeData.lpcd_value_day5,
        lpcd_value_day6: waterSchemeData.lpcd_value_day6,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        lpcd_date_day1: waterSchemeData.lpcd_date_day1,
        lpcd_date_day2: waterSchemeData.lpcd_date_day2,
        lpcd_date_day3: waterSchemeData.lpcd_date_day3,
        lpcd_date_day4: waterSchemeData.lpcd_date_day4,
        lpcd_date_day5: waterSchemeData.lpcd_date_day5,
        lpcd_date_day6: waterSchemeData.lpcd_date_day6,
        lpcd_date_day7: waterSchemeData.lpcd_date_day7,
        population: waterSchemeData.population,
        // Calculate consumption percentage
        consumption_percentage: sql<number>`(${waterConsumption.water_value_day7} / ${waterConsumption.esr_capacity}) * 100`
      })
      .from(waterConsumption)
      .innerJoin(
        waterSchemeData,
        and(
          eq(waterConsumption.scheme_id, waterSchemeData.scheme_id),
          eq(waterConsumption.village_name, waterSchemeData.village_name)
        )
      )
      .where(
        and(
          isNotNull(waterConsumption.esr_capacity),
          isNotNull(waterConsumption.water_value_day7),
          isNotNull(waterSchemeData.lpcd_value_day7),
          sql`${waterConsumption.esr_capacity} > 0`,
          // ESR consumption <= 200% capacity
          sql`(${waterConsumption.water_value_day7} / ${waterConsumption.esr_capacity}) * 100 <= 200`,
          // Village LPCD > 100
          sql`${waterSchemeData.lpcd_value_day7} > 100`,
          // Apply filters
          ...(region && region !== "all" ? [ilike(waterConsumption.region, region as string)] : []),
          ...(schemeId && schemeId !== "all" 
            ? [/^[0-9]+$/.test(schemeId as string)
              ? eq(waterConsumption.scheme_id, schemeId as string)
              : ilike(waterConsumption.scheme_name, `%${schemeId}%`)]
            : []),
          ...(village && village !== "all" ? [ilike(waterConsumption.village_name, `%${village}%`)] : [])
        )
      )
      .orderBy(
        waterConsumption.region, 
        waterConsumption.scheme_name, 
        waterConsumption.village_name,
        waterConsumption.esr_name
      );
    
    const results = await query;
    
    res.json({
      esrData: results,
      totalRecords: results.length,
      filters: {
        region: region || "all",
        schemeId: schemeId || "all",
        village: village || "all"
      }
    });
  } catch (error) {
    console.error("Error fetching reliable water consumption data:", error);
    res.status(500).json({
      error: "Failed to fetch reliable water consumption data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/esr-capacity - Get ESR capacity data with totals
// Note: This route must be defined BEFORE the generic /:category handler to avoid route conflicts
router.get("/esr-capacity", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    const village = req.query.village as string | undefined;
    
    const data = await getESRCapacityData(region, schemeId, village);
    
    res.json(data);
  } catch (error) {
    console.error("Error fetching ESR capacity data:", error);
    res.status(500).json({
      error: "Failed to fetch ESR capacity data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Division-wise summary endpoint
// Note: This route must be defined BEFORE the generic /:category handler to avoid route conflicts
router.get("/division-wise-summary", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType, agencyType } = req.query;
    const db = await getDB();

    // Build WHERE conditions based on region filter
    const whereConditions: any[] = [];
    if (region && region !== "All Regions") {
      whereConditions.push(ilike(waterSchemeData.region, region as string));
    }

    // Get filtered scheme IDs
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
    if (filteredIds) {
      if (filteredIds[0] === 'NO_MATCHES') {
        whereConditions.push(sql`1=0`);
      } else {
        whereConditions.push(inArray(waterSchemeData.scheme_id, filteredIds));
      }
    }

    // Query to get all villages with their data
    const query = db
      .select({
        region: waterSchemeData.region,
        division: waterSchemeData.division,
        village_name: waterSchemeData.village_name,
        scheme_id: waterSchemeData.scheme_id,
        scheme_name: waterSchemeData.scheme_name,
        block: waterSchemeData.block,
        sub_division: waterSchemeData.sub_division,
        population: waterSchemeData.population,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        water_value_day7: waterSchemeData.water_value_day7,
      })
      .from(waterSchemeData)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const villages = await query;

    // Aggregate data by division
    const divisionMap = new Map<string, {
      region: string;
      division: string;
      totalVillages: number;
      villagesWithWater: number;
      villagesNoWater: number;
      villagesAbove55: number;
      villagesBelow55: number;
    }>();

    // Use a Set to track unique villages per division
    const uniqueVillages = new Map<string, Set<string>>();

    villages.forEach((village: any) => {
      const divisionKey = `${village.region}|||${village.division}`;
      const villageKey = `${village.scheme_id}-${village.village_name}`;

      // Initialize division if not exists
      if (!divisionMap.has(divisionKey)) {
        divisionMap.set(divisionKey, {
          region: village.region || "",
          division: village.division || "Unknown",
          totalVillages: 0,
          villagesWithWater: 0,
          villagesNoWater: 0,
          villagesAbove55: 0,
          villagesBelow55: 0,
        });
        uniqueVillages.set(divisionKey, new Set());
      }

      const villageSet = uniqueVillages.get(divisionKey)!;
      const divisionData = divisionMap.get(divisionKey)!;

      // Only count unique villages
      if (!villageSet.has(villageKey)) {
        villageSet.add(villageKey);
        divisionData.totalVillages++;

        // Check water/LPCD status - inclusive definition of "With Water"
        const hasWater = village.water_value_day7 !== null && Number(village.water_value_day7) > 0;
        const hasLpcd = village.lpcd_value_day7 !== null && Number(village.lpcd_value_day7) > 0;
        const isActive = hasWater || hasLpcd;

        if (isActive) {
          divisionData.villagesWithWater++;
          
          // Categorize by LPCD value
          const lpcdValue = village.lpcd_value_day7;
          if (lpcdValue !== null && lpcdValue !== undefined && Number(lpcdValue) >= 55) {
            divisionData.villagesAbove55++;
          } else {
            divisionData.villagesBelow55++;
          }
        } else {
          divisionData.villagesNoWater++;
        }
      }
    });

    // Convert map to array and sort by region and division
    const divisionSummary = Array.from(divisionMap.values()).sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region);
      }
      return a.division.localeCompare(b.division);
    });

    res.json({
      success: true,
      data: divisionSummary,
      region: region || "All Regions",
    });
  } catch (error: any) {
    console.error("Error fetching division-wise summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch division-wise summary",
      details: error.message,
    });
  }
});

// Get village details for a specific division and metric
// Note: This route must be defined BEFORE the generic /:category handler to avoid route conflicts
router.get("/division-villages", async (req, res) => {
  try {
    const { region, division, metric, fullyCompleted, filterType, agencyType } = req.query;
    
    if (!division) {
      return res.status(400).json({
        success: false,
        error: "Division parameter is required",
      });
    }

    const db = await getDB();

    // Build WHERE conditions
    const whereConditions: any[] = [
      ilike(waterSchemeData.division, division as string),
    ];

    if (region && region !== "All Regions") {
      whereConditions.push(ilike(waterSchemeData.region, region as string));
    }

    // Get filtered scheme IDs
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
    if (filteredIds) {
      if (filteredIds[0] === 'NO_MATCHES') {
        whereConditions.push(sql`1=0`);
      } else {
        whereConditions.push(inArray(waterSchemeData.scheme_id, filteredIds));
      }
    }

    // Add metric-specific conditions
    if (metric === "withWater") {
      whereConditions.push(
        sql`(${waterSchemeData.water_value_day7} > 0 OR ${waterSchemeData.lpcd_value_day7} > 0)`
      );
    } else if (metric === "noWater") {
      whereConditions.push(
        sql`(${waterSchemeData.water_value_day7} <= 0 OR ${waterSchemeData.water_value_day7} IS NULL) AND (${waterSchemeData.lpcd_value_day7} <= 0 OR ${waterSchemeData.lpcd_value_day7} IS NULL)`
      );
    } else if (metric === "above55") {
      whereConditions.push(
        isNotNull(waterSchemeData.lpcd_value_day7),
        sql`${waterSchemeData.lpcd_value_day7} >= 55`
      );
    } else if (metric === "below55") {
      whereConditions.push(
        sql`(${waterSchemeData.water_value_day7} > 0 OR ${waterSchemeData.lpcd_value_day7} > 0)`,
        sql`(${waterSchemeData.lpcd_value_day7} IS NULL OR ${waterSchemeData.lpcd_value_day7} < 55)`
      );
    }

    // Query to get villages
    const query = db
      .select({
        region: waterSchemeData.region,
        circle: waterSchemeData.circle,
        division: waterSchemeData.division,
        sub_division: waterSchemeData.sub_division,
        block: waterSchemeData.block,
        scheme_id: waterSchemeData.scheme_id,
        scheme_name: waterSchemeData.scheme_name,
        village_name: waterSchemeData.village_name,
        population: waterSchemeData.population,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        lpcd_date_day7: waterSchemeData.lpcd_date_day7,
        water_value_day7: waterSchemeData.water_value_day7,
        water_date_day7: waterSchemeData.water_date_day7,
        dashboard_url: waterSchemeData.dashboard_url,
      })
      .from(waterSchemeData)
      .where(and(...whereConditions))
      .orderBy(waterSchemeData.village_name);

    const villages = await query;

    // Deduplicate villages
    const uniqueVillagesMap = new Map();
    villages.forEach((village: any) => {
      const key = `${village.scheme_id}-${village.village_name}`;
      if (!uniqueVillagesMap.has(key)) {
        uniqueVillagesMap.set(key, village);
      }
    });

    const uniqueVillages = Array.from(uniqueVillagesMap.values());

    // Convert water values from MLD to LL before returning
    const convertedVillages = uniqueVillages.map(convertRecordWaterValuesToLL);

    res.json({
      success: true,
      data: convertedVillages,
      count: convertedVillages.length,
      division: division,
      region: region || "All Regions",
      metric: metric || "all",
    });
  } catch (error: any) {
    console.error("Error fetching division villages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch division villages",
      details: error.message,
    });
  }
});

// Export division villages to Excel
router.get("/division-villages/export", async (req, res) => {
  try {
    const { region, division, metric, fullyCompleted, filterType, agencyType } = req.query;

    if (!division) {
      return res.status(400).json({
        success: false,
        error: "Division parameter is required",
      });
    }

    const db = await getDB();

    // Build WHERE conditions
    const whereConditions: any[] = [
      ilike(waterSchemeData.division, division as string),
    ];

    if (region && region !== "All Regions") {
      whereConditions.push(ilike(waterSchemeData.region, region as string));
    }

    // Get filtered scheme IDs
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
    if (filteredIds) {
      if (filteredIds[0] === 'NO_MATCHES') {
        whereConditions.push(sql`1=0`);
      } else {
        whereConditions.push(inArray(waterSchemeData.scheme_id, filteredIds));
      }
    }

    // Add metric-specific conditions
    if (metric === "withWater") {
      whereConditions.push(
        sql`(${waterSchemeData.water_value_day7} > 0 OR ${waterSchemeData.lpcd_value_day7} > 0)`
      );
    } else if (metric === "noWater") {
      whereConditions.push(
        sql`(${waterSchemeData.water_value_day7} <= 0 OR ${waterSchemeData.water_value_day7} IS NULL) AND (${waterSchemeData.lpcd_value_day7} <= 0 OR ${waterSchemeData.lpcd_value_day7} IS NULL)`
      );
    } else if (metric === "above55") {
      whereConditions.push(
        isNotNull(waterSchemeData.lpcd_value_day7),
        sql`${waterSchemeData.lpcd_value_day7} >= 55`
      );
    } else if (metric === "below55") {
      whereConditions.push(
        sql`(${waterSchemeData.water_value_day7} > 0 OR ${waterSchemeData.lpcd_value_day7} > 0)`,
        sql`(${waterSchemeData.lpcd_value_day7} IS NULL OR ${waterSchemeData.lpcd_value_day7} < 55)`
      );
    }

    // Query to get villages
    const query = db
      .select({
        region: waterSchemeData.region,
        division: waterSchemeData.division,
        block: waterSchemeData.block,
        scheme_id: waterSchemeData.scheme_id,
        scheme_name: waterSchemeData.scheme_name,
        village_name: waterSchemeData.village_name,
        population: waterSchemeData.population,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        lpcd_date_day7: waterSchemeData.lpcd_date_day7,
        water_value_day7: waterSchemeData.water_value_day7,
        water_date_day7: waterSchemeData.water_date_day7,
      })
      .from(waterSchemeData)
      .where(and(...whereConditions))
      .orderBy(waterSchemeData.village_name);

    const allVillages = await query;

    // Deduplicate villages
    const uniqueVillagesMap = new Map();
    allVillages.forEach((village: any) => {
      const key = `${village.scheme_id}-${village.village_name}`;
      if (!uniqueVillagesMap.has(key)) {
        uniqueVillagesMap.set(key, village);
      }
    });

    const uniqueVillages = Array.from(uniqueVillagesMap.values());

    // Convert water values from MLD to LL before exporting
    const convertedVillages = uniqueVillages.map(convertRecordWaterValuesToLL);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Villages");

    // Determine metric label
    let metricLabel = "All Villages";
    if (metric === "withWater") metricLabel = "Villages with Water";
    else if (metric === "noWater") metricLabel = "Villages without Water";
    else if (metric === "above55") metricLabel = "Villages >55 LPCD";
    else if (metric === "below55") metricLabel = "Villages <55 LPCD";

    // Add title
    worksheet.mergeCells("A1:J1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `${metricLabel} in ${division} - ${region || "All Regions"}`;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add headers
    worksheet.addRow([
      "Village Name",
      "Scheme Name",
      "Block",
      "Region",
      "Population",
      "LPCD Value",
      "LPCD Date",
      "Water Supply (LL)",
      "Water Date",
    ]);

    // Style headers
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    });

    // Add data rows (using converted values)
    convertedVillages.forEach((village: any) => {
      worksheet.addRow([
        village.village_name,
        village.scheme_name,
        village.block,
        village.region,
        village.population || "N/A",
        village.lpcd_value_day7 !== null && village.lpcd_value_day7 !== undefined
          ? Number(village.lpcd_value_day7).toFixed(2)
          : "N/A",
        village.lpcd_date_day7
          ? new Date(village.lpcd_date_day7).toLocaleDateString()
          : "N/A",
        village.water_value_day7 && village.water_value_day7 > 0
          ? Number(village.water_value_day7).toFixed(2)
          : "No Water",
        village.water_date_day7
          ? new Date(village.water_date_day7).toLocaleDateString()
          : "N/A",
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        const columnLength = cell.value ? String(cell.value).length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${metricLabel.replace(/\s+/g, "-")}-${division}-${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Error exporting division villages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export division villages",
      details: error.message,
    });
  }
});

// Export division-wise summary to Excel
router.get("/division-wise-summary/export", async (req, res) => {
  try {
    const { region, fullyCompleted, filterType, agencyType } = req.query;

    console.log(
      `Division-wise summary export request for region: ${region || "All Regions"}`,
    );

    const db = await getDB();

    // Build where conditions
    const whereConditions = [];

    if (region && region !== "All Regions") {
      whereConditions.push(ilike(waterSchemeData.region, region as string));
    }

    // Get filtered scheme IDs
    const filteredIds = await getFilteredSchemeIds(db, filterType, fullyCompleted, agencyType as string);
    if (filteredIds) {
      if (filteredIds[0] === 'NO_MATCHES') {
        whereConditions.push(sql`1=0`);
      } else {
        whereConditions.push(inArray(waterSchemeData.scheme_id, filteredIds));
      }
    }

    // Fetch all data
    const query = db
      .select({
        region: waterSchemeData.region,
        division: waterSchemeData.division,
        village_name: waterSchemeData.village_name,
        scheme_name: waterSchemeData.scheme_name,
        block: waterSchemeData.block,
        population: waterSchemeData.population,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        water_value_day7: waterSchemeData.water_value_day7,
        scheme_id: waterSchemeData.scheme_id,
      })
      .from(waterSchemeData)
      .where(and(...whereConditions))
      .orderBy(waterSchemeData.division, waterSchemeData.village_name);

    const allVillages = await query;

    // Deduplicate
    const uniqueVillagesMap = new Map();
    allVillages.forEach((village: any) => {
      const key = `${village.scheme_id}-${village.village_name}`;
      if (!uniqueVillagesMap.has(key)) {
        uniqueVillagesMap.set(key, village);
      }
    });

    const uniqueVillages = Array.from(uniqueVillagesMap.values());

    // Convert water values from MLD to LL before exporting
    const convertedVillages = uniqueVillages.map(convertRecordWaterValuesToLL);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Division-Wise Summary");

    // Add title
    worksheet.mergeCells("A1:H1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `Division-Wise Water Infrastructure Summary - ${region || "All Regions"}`;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add headers
    worksheet.addRow([
      "Division",
      "Region",
      "Village Name",
      "Scheme Name",
      "Block",
      "Population",
      "LPCD Value",
      "Water Supply (LL)",
    ]);

    // Style headers
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    });

    // Add data rows (using converted values)
    convertedVillages.forEach((village: any) => {
      worksheet.addRow([
        village.division,
        village.region,
        village.village_name,
        village.scheme_name,
        village.block,
        village.population || "N/A",
        village.lpcd_value_day7 !== null && village.lpcd_value_day7 !== undefined
          ? Number(village.lpcd_value_day7).toFixed(2)
          : "N/A",
        village.water_value_day7 && village.water_value_day7 > 0
          ? Number(village.water_value_day7).toFixed(2)
          : "No Water",
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        const columnLength = cell.value ? String(cell.value).length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Division-Wise-Summary-${region || "All-Regions"}-${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Error exporting division-wise summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export division-wise summary",
      details: error.message,
    });
  }
});

// Main route handler for category-specific data
router.get("/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { region, schemeId: rawSchemeId, village: rawVillage } = req.query;
    
    console.log(`Category data request: ${category}, region: ${region || 'all'}, schemeId: ${rawSchemeId || 'all'}, village: ${rawVillage || 'all'}`);
    
    // Priority: village > schemeId for filtering
    // Resolve scheme ID if scheme identifier is provided
    // If resolution fails, preserve the raw value so helper functions can filter by name/village
    let filterValue: string | undefined = undefined;
    
    // Use village parameter if provided (highest priority for specific village filtering)
    if (rawVillage && typeof rawVillage === 'string') {
      filterValue = rawVillage;
      console.log(`Using village filter: ${filterValue}`);
    } else if (rawSchemeId && typeof rawSchemeId === 'string') {
      // Otherwise, try to resolve scheme ID
      const resolved = await resolveSchemeId(rawSchemeId);
      if (resolved) {
        filterValue = resolved;
        console.log(`Resolved scheme "${rawSchemeId}" to ID: ${filterValue}`);
      } else {
        console.warn(`Could not resolve scheme: ${rawSchemeId}, using raw value for filtering`);
        filterValue = rawSchemeId;  // Preserve raw value for village/scheme name filtering
      }
    }
    
    let data = [];
    
    // Handle different category types
    switch (category) {
      case 'villages-with-water':
        data = await getVillagesWithWater(region as string, filterValue);
        break;
      case 'villages-no-water':
        data = await getVillagesNoWater(region as string, filterValue);
        break;
      case 'villages-consistent-water':
        data = await getVillagesConsistentWater(region as string, filterValue);
        break;
      case 'villages-consistent-zero-water':
        data = await getVillagesConsistentZeroWater(region as string, filterValue);
        break;
      case 'villages-above-55-lpcd':
        data = await getVillagesAbove55LPCD(region as string, filterValue);
        break;
      case 'villages-below-55-lpcd':
        data = await getVillagesBelow55LPCD(region as string, filterValue);
        break;
      case 'villages-consistently-above-55-lpcd':
        data = await getVillagesConsistentlyAbove55LPCD(region as string, filterValue);
        break;
      case 'villages-consistently-below-55-lpcd':
        data = await getVillagesConsistentlyBelow55LPCD(region as string, filterValue);
        break;
      case 'villages-average-lpcd-above-55':
        data = await getVillagesAverageLPCDAbove55(region as string, filterValue);
        break;
      case 'villages-average-lpcd-below-55':
        data = await getVillagesAverageLPCDBelow55(region as string, filterValue);
        break;
      case 'esr-optimal-chlorine':
        data = await getESROptimalChlorine(region as string, filterValue);
        break;
      case 'esr-below-chlorine':
        data = await getESRBelowChlorine(region as string, filterValue);
        break;
      case 'esr-above-chlorine':
        data = await getESRAboveChlorine(region as string, filterValue);
        break;
      case 'esr-average-chlorine-optimal':
        data = await getESRAverageChlorineOptimal(region as string, filterValue);
        break;
      case 'esr-average-chlorine-below':
        data = await getESRAverageChlorineBelow(region as string, filterValue);
        break;
      case 'esr-average-chlorine-above':
        data = await getESRAverageChlorineAbove(region as string, filterValue);
        break;
      case 'esr-optimal-pressure':
        data = await getESROptimalPressure(region as string, filterValue);
        break;
      case 'esr-below-pressure':
        data = await getESRBelowPressure(region as string, filterValue);
        break;
      case 'esr-above-pressure':
        data = await getESRAbovePressure(region as string, filterValue);
        break;
      case 'esr-average-pressure-optimal':
        data = await getESRAveragePressureOptimal(region as string, filterValue);
        break;
      case 'esr-average-pressure-below':
        data = await getESRAveragePressureBelow(region as string, filterValue);
        break;
      case 'esr-average-pressure-above':
        data = await getESRAveragePressureAbove(region as string, filterValue);
        break;
      case 'fully-completed-schemes':
        data = await getFullyCompletedSchemes(region as string, filterValue);
        break;
      case 'combined-schemes':
      case 'schemes-analysis':
        data = await getCombinedSchemes(region as string, filterValue);
        break;
      case 'fully-completed-villages':
        data = await getFullyCompletedVillages(region as string, filterValue);
        break;
      case 'flow-meters':
        data = await getFlowMetersData(region as string, filterValue);
        break;
      case 'rca':
      case 'chlorine-analyzers':
        data = await getRCAData(region as string, filterValue);
        break;
      case 'pressure-transmitters':
        data = await getPressureTransmittersData(region as string, filterValue);
        break;
      case 'esr':
        data = await getESRData(region as string, filterValue);
        break;
      default:
        return res.status(400).json({ error: `Unknown category: ${category}` });
    }
    
    console.log(`Found ${data.length} results for category: ${category}`);
    res.json(data);
    
  } catch (error) {
    console.error(`Error fetching category data for ${req.params.category}:`, error);
    res.status(500).json({ 
      error: "Failed to fetch category data",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Combined water status endpoint (Villages with water + Villages no water)
router.get("/villages/combined-water", async (req, res) => {
  try {
    const { region, schemeId, village } = req.query;
    const regionStr = typeof region === 'string' ? region : undefined;
    const schemeIdStr = typeof schemeId === 'string' ? schemeId : undefined;
    const villageStr = typeof village === 'string' ? village : undefined;

    // For village-specific queries, use village name as scheme filter (since our helper functions use schemeId param for any filtering)
    const filterValue = villageStr || schemeIdStr;

    // Get both villages with water and villages with no water
    const [villagesWithWater, villagesNoWater] = await Promise.all([
      getVillagesWithWater(regionStr, filterValue),
      getVillagesNoWater(regionStr, filterValue)
    ]);

    const response = {
      filters: {
        region: regionStr || "all",
        schemeId: schemeIdStr || "all",
        village: villageStr || "all"
      },
      counts: {
        withWater: villagesWithWater.length,
        noWater: villagesNoWater.length,
        total: villagesWithWater.length + villagesNoWater.length
      },
      data: {
        villagesWithWater: villagesWithWater,
        villagesNoWater: villagesNoWater
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error in combined water status endpoint:", error);
    res.status(500).json({ 
      error: "Failed to fetch combined water status data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Combined LPCD status endpoint (Villages above 55 LPCD + Villages below 55 LPCD)
router.get("/villages/combined-lpcd", async (req, res) => {
  try {
    const { region, schemeId, village } = req.query;
    const regionStr = typeof region === 'string' ? region : undefined;
    const schemeIdStr = typeof schemeId === 'string' ? schemeId : undefined;
    const villageStr = typeof village === 'string' ? village : undefined;

    // For village-specific queries, use village name as scheme filter (since our helper functions use schemeId param for any filtering)
    const filterValue = villageStr || schemeIdStr;

    // Get both villages above and below 55 LPCD
    const [villagesAbove55, villagesBelow55] = await Promise.all([
      getVillagesAbove55LPCD(regionStr, filterValue),
      getVillagesBelow55LPCD(regionStr, filterValue)
    ]);

    const response = {
      filters: {
        region: regionStr || "all",
        schemeId: schemeIdStr || "all",
        village: villageStr || "all"
      },
      counts: {
        above55LPCD: villagesAbove55.length,
        below55LPCD: villagesBelow55.length,
        total: villagesAbove55.length + villagesBelow55.length
      },
      data: {
        villagesAbove55LPCD: villagesAbove55,
        villagesBelow55LPCD: villagesBelow55
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Error in combined LPCD status endpoint:", error);
    res.status(500).json({ 
      error: "Failed to fetch combined LPCD status data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Combined chlorine status endpoint (Above + Optimal + Below chlorine)
router.get("/chlorine/combined", async (req, res) => {
  try {
    const { region, schemeId } = req.query;
    const regionStr = typeof region === 'string' ? region : undefined;
    const schemeIdStr = typeof schemeId === 'string' ? schemeId : undefined;

    // Resolve scheme ID if scheme identifier is provided
    let resolvedSchemeId: string | undefined = undefined;
    if (schemeIdStr) {
      const resolved = await resolveSchemeId(schemeIdStr);
      if (resolved) {
        resolvedSchemeId = resolved;
        console.log(`Resolved scheme "${schemeIdStr}" to ID: ${resolvedSchemeId}`);
      } else {
        console.warn(`Could not resolve scheme: ${schemeIdStr}`);
      }
    }

    // Get all three categories of chlorine data
    const [aboveChlorine, optimalChlorine, belowChlorine] = await Promise.all([
      getESRAboveChlorine(regionStr, resolvedSchemeId),
      getESROptimalChlorine(regionStr, resolvedSchemeId),
      getESRBelowChlorine(regionStr, resolvedSchemeId)
    ]);

    const response = {
      filters: {
        region: regionStr || "all",
        schemeId: schemeIdStr || "all",
        resolvedSchemeId: resolvedSchemeId || "all"
      },
      counts: {
        aboveOptimal: aboveChlorine.length,
        optimal: optimalChlorine.length,
        belowOptimal: belowChlorine.length,
        total: aboveChlorine.length + optimalChlorine.length + belowChlorine.length
      },
      data: {
        aboveChlorine: aboveChlorine,
        optimalChlorine: optimalChlorine,
        belowChlorine: belowChlorine
      }
    };

    console.log(`Combined chlorine data: ${response.counts.total} total ESRs (Above: ${response.counts.aboveOptimal}, Optimal: ${response.counts.optimal}, Below: ${response.counts.belowOptimal})`);
    res.json(response);
  } catch (error) {
    console.error("Error in combined chlorine status endpoint:", error);
    res.status(500).json({ 
      error: "Failed to fetch combined chlorine status data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Combined pressure status endpoint (Above + Optimal + Below pressure)
router.get("/pressure/combined", async (req, res) => {
  try {
    const { region, schemeId } = req.query;
    const regionStr = typeof region === 'string' ? region : undefined;
    const schemeIdStr = typeof schemeId === 'string' ? schemeId : undefined;

    // Resolve scheme ID if scheme identifier is provided
    let resolvedSchemeId: string | undefined = undefined;
    if (schemeIdStr) {
      const resolved = await resolveSchemeId(schemeIdStr);
      if (resolved) {
        resolvedSchemeId = resolved;
        console.log(`Resolved scheme "${schemeIdStr}" to ID: ${resolvedSchemeId}`);
      } else {
        console.warn(`Could not resolve scheme: ${schemeIdStr}`);
      }
    }

    // Get all three categories of pressure data
    const [abovePressure, optimalPressure, belowPressure] = await Promise.all([
      getESRAbovePressure(regionStr, resolvedSchemeId),
      getESROptimalPressure(regionStr, resolvedSchemeId),
      getESRBelowPressure(regionStr, resolvedSchemeId)
    ]);

    const response = {
      filters: {
        region: regionStr || "all",
        schemeId: schemeIdStr || "all",
        resolvedSchemeId: resolvedSchemeId || "all"
      },
      counts: {
        aboveOptimal: abovePressure.length,
        optimal: optimalPressure.length,
        belowOptimal: belowPressure.length,
        total: abovePressure.length + optimalPressure.length + belowPressure.length
      },
      data: {
        abovePressure: abovePressure,
        optimalPressure: optimalPressure,
        belowPressure: belowPressure
      }
    };

    console.log(`Combined pressure data: ${response.counts.total} total ESRs (Above: ${response.counts.aboveOptimal}, Optimal: ${response.counts.optimal}, Below: ${response.counts.belowOptimal})`);
    res.json(response);
  } catch (error) {
    console.error("Error in combined pressure status endpoint:", error);
    res.status(500).json({ 
      error: "Failed to fetch combined pressure status data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/schemes/:identifier/equipment - Get equipment info for a specific scheme
router.get("/schemes/:identifier/equipment", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching equipment info for scheme: ${identifier}`);
    
    // Build where condition - handle both numeric ID and scheme name
    let whereCondition;
    if (/^[0-9]+$/.test(identifier)) {
      // Numeric scheme ID
      whereCondition = eq(schemeStatuses.scheme_id, identifier);
    } else {
      // Scheme name - try exact match first, then partial
      whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
    }
    
    const result = await db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        circle: schemeStatuses.circle,
        division: schemeStatuses.division,
        sub_division: schemeStatuses.sub_division,
        block: schemeStatuses.block,
        flow_meters_connected: schemeStatuses.flow_meters_connected,
        residual_chlorine_analyzer_connected: schemeStatuses.residual_chlorine_analyzer_connected,
        pressure_transmitter_connected: schemeStatuses.pressure_transmitter_connected,
        total_number_of_esr: schemeStatuses.total_number_of_esr,
        total_esr_integrated: schemeStatuses.total_esr_integrated
      })
      .from(schemeStatuses)
      .where(whereCondition)
      .limit(10); // Limit results for partial name matches
    
    if (result.length === 0) {
      return res.status(404).json({ 
        error: "Scheme not found",
        message: `No scheme found with identifier: ${identifier}`
      });
    }
    
    // If multiple results, return the first one (could be enhanced with better matching)
    const schemeInfo = result[0];
    
    console.log(`Found scheme: ${schemeInfo.scheme_name} (${schemeInfo.scheme_id})`);
    console.log(`Equipment: FM=${schemeInfo.flow_meters_connected}, RCA=${schemeInfo.residual_chlorine_analyzer_connected}, PT=${schemeInfo.pressure_transmitter_connected}`);
    
    res.json(schemeInfo);
  } catch (error) {
    console.error("Error fetching scheme equipment info:", error);
    res.status(500).json({ 
      error: "Failed to fetch scheme equipment information",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper function to normalize date formats and generate possible variations
const getPossibleDateFormats = (dateStr: string): string[] => {
  // Handle various date formats like "7th September 2025", "07-09-2025", etc.
  const cleanDate = dateStr.toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\s+/, '$1 ')  // Remove ordinal suffixes
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();

  const possibleFormats: string[] = [];
  
  // Try to parse the date
  let date = new Date(cleanDate);
  
  // If parsing failed, try with current year appended
  if (isNaN(date.getTime()) || date.getFullYear() < 2020) {
    // For dates like "07-Sep" or "7th September", append current year
    const currentYear = new Date().getFullYear();
    date = new Date(`${cleanDate} ${currentYear}`);
  }
  
  if (!isNaN(date.getTime()) && date.getFullYear() >= 2020) {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    // Month abbreviations
    const monthAbbrevs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthAbbrev = monthAbbrevs[month];
    
    // Generate all possible formats found in the database:
    possibleFormats.push(`${day.toString().padStart(2, '0')}-${monthAbbrev}`); // "07-Sep"
    possibleFormats.push(`${day}-${monthAbbrev}`); // "7-Sep" 
    possibleFormats.push(`${day.toString().padStart(2, '0')}-${monthAbbrev}-${year.toString().slice(-2)}`); // "07-Sep-25"
    possibleFormats.push(`${day}-${monthAbbrev}-${year.toString().slice(-2)}`); // "7-Sep-25"
    possibleFormats.push(`${day}-${monthAbbrev}-${year}`); // "7-Sep-2025"
    possibleFormats.push(`${day.toString().padStart(2, '0')}-${monthAbbrev}-${year}`); // "07-Sep-2025"
    
    // Also try DD-MM-YYYY format
    possibleFormats.push(`${day.toString().padStart(2, '0')}-${(month + 1).toString().padStart(2, '0')}-${year}`);
  }
  
  // Add the original string as fallback
  possibleFormats.push(dateStr);
  
  return Array.from(new Set(possibleFormats)); // Remove duplicates
};

// GET /api/history/water - Get historical water consumption and LPCD data for a village on a specific date
router.get("/history/water", async (req, res) => {
  try {
    const { village, scheme, date } = req.query;
    
    if (!village || !date) {
      return res.status(400).json({ 
        error: "Missing required parameters",
        message: "Both 'village' and 'date' parameters are required"
      });
    }

    const db = await getDB();
    const possibleDateFormats = getPossibleDateFormats(date as string);
    
    console.log(`Fetching historical water data for village: ${village}, possible dates: ${possibleDateFormats.join(', ')}, scheme: ${scheme || 'any'}`);
    
    // Query the water_scheme_data_history table
    let baseConditions = [
      ilike(waterSchemeDataHistory.village_name, `%${village}%`),
      // Match any of the possible date formats
      sql`${waterSchemeDataHistory.data_date} IN (${sql.join(possibleDateFormats.map(f => sql`${f}`), sql`, `)})`
    ];
    
    if (scheme) {
      baseConditions.push(ilike(waterSchemeDataHistory.scheme_name, `%${scheme}%`));
    }
    
    const results = await db
      .select({
        scheme_id: waterSchemeDataHistory.scheme_id,
        scheme_name: waterSchemeDataHistory.scheme_name,
        village_name: waterSchemeDataHistory.village_name,
        region: waterSchemeDataHistory.region,
        data_date: waterSchemeDataHistory.data_date,
        water_value: waterSchemeDataHistory.water_value,
        lpcd_value: waterSchemeDataHistory.lpcd_value,
        population: waterSchemeDataHistory.population,
        number_of_esr: waterSchemeDataHistory.number_of_esr,
        dashboard_url: waterSchemeDataHistory.dashboard_url
      })
      .from(waterSchemeDataHistory)
      .where(and(...baseConditions))
      .limit(100);
    
    if (results.length === 0) {
      return res.status(404).json({ 
        error: "No data found",
        message: `No water data found for ${village} village on ${date}. Please check if the village name and date are correct.`
      });
    }
    
    console.log(`Found ${results.length} historical water records matching date`);
    res.json(results);
  } catch (error) {
    console.error("Error fetching historical water data:", error);
    res.status(500).json({ 
      error: "Failed to fetch historical water data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/history/chlorine - Get historical chlorine data for a village on a specific date
router.get("/history/chlorine", async (req, res) => {
  try {
    const { village, scheme, date } = req.query;
    
    if (!village || !date) {
      return res.status(400).json({ 
        error: "Missing required parameters",
        message: "Both 'village' and 'date' parameters are required"
      });
    }

    const db = await getDB();
    const possibleDateFormats = getPossibleDateFormats(date as string);
    
    console.log(`Fetching historical chlorine data for village: ${village}, possible dates: ${possibleDateFormats.join(', ')}, scheme: ${scheme || 'any'}`);
    
    // Query the chlorine_history table
    let baseConditions = [
      ilike(chlorineHistory.village_name, `%${village}%`),
      // Match any of the possible date formats
      sql`${chlorineHistory.chlorine_date} IN (${sql.join(possibleDateFormats.map(f => sql`${f}`), sql`, `)})`
    ];
    
    if (scheme) {
      baseConditions.push(ilike(chlorineHistory.scheme_name, `%${scheme}%`));
    }
    
    const results = await db
      .select({
        scheme_id: chlorineHistory.scheme_id,
        scheme_name: chlorineHistory.scheme_name,
        village_name: chlorineHistory.village_name,
        esr_name: chlorineHistory.esr_name,
        region: chlorineHistory.region,
        chlorine_date: chlorineHistory.chlorine_date,
        chlorine_value: chlorineHistory.chlorine_value,
        dashboard_url: chlorineHistory.dashboard_url
      })
      .from(chlorineHistory)
      .where(and(...baseConditions))
      .limit(100);
    
    if (results.length === 0) {
      return res.status(404).json({ 
        error: "No data found",
        message: `No chlorine data found for ${village} village on ${date}. Please check if the village name and date are correct.`
      });
    }
    
    console.log(`Found ${results.length} historical chlorine records matching date`);
    res.json(results);
  } catch (error) {
    console.error("Error fetching historical chlorine data:", error);
    res.status(500).json({ 
      error: "Failed to fetch historical chlorine data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/history/pressure - Get historical pressure data for a village on a specific date
router.get("/history/pressure", async (req, res) => {
  try {
    const { village, scheme, date } = req.query;
    
    if (!village || !date) {
      return res.status(400).json({ 
        error: "Missing required parameters",
        message: "Both 'village' and 'date' parameters are required"
      });
    }

    const db = await getDB();
    const possibleDateFormats = getPossibleDateFormats(date as string);
    
    console.log(`Fetching historical pressure data for village: ${village}, possible dates: ${possibleDateFormats.join(', ')}, scheme: ${scheme || 'any'}`);
    
    // Query the pressure_history table
    let baseConditions = [
      ilike(pressureHistory.village_name, `%${village}%`),
      // Match any of the possible date formats
      sql`${pressureHistory.pressure_date} IN (${sql.join(possibleDateFormats.map(f => sql`${f}`), sql`, `)})`
    ];
    
    if (scheme) {
      baseConditions.push(ilike(pressureHistory.scheme_name, `%${scheme}%`));
    }
    
    const results = await db
      .select({
        scheme_id: pressureHistory.scheme_id,
        scheme_name: pressureHistory.scheme_name,
        village_name: pressureHistory.village_name,
        esr_name: pressureHistory.esr_name,
        region: pressureHistory.region,
        pressure_date: pressureHistory.pressure_date,
        pressure_value: pressureHistory.pressure_value,
        dashboard_url: pressureHistory.dashboard_url
      })
      .from(pressureHistory)
      .where(and(...baseConditions))
      .limit(100);
    
    if (results.length === 0) {
      return res.status(404).json({ 
        error: "No data found",
        message: `No pressure data found for ${village} village on ${date}. Please check if the village name and date are correct.`
      });
    }
    
    console.log(`Found ${results.length} historical pressure records matching date`);
    res.json(results);
  } catch (error) {
    console.error("Error fetching historical pressure data:", error);
    res.status(500).json({ 
      error: "Failed to fetch historical pressure data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Enhanced chatbot endpoints

// GET /api/schemes/:identifier/esr-summary - Get ESR summary for a scheme
router.get("/schemes/:identifier/esr-summary", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching ESR summary for scheme: ${identifier}`);
    
    // Query scheme_status table for ESR information
    let whereConditions = [];
    
    // Check if identifier is numeric (scheme_id) or text (scheme_name)
    if (/^[0-9]+$/.test(identifier)) {
      whereConditions.push(eq(schemeStatuses.scheme_id, identifier));
    } else {
      whereConditions.push(ilike(schemeStatuses.scheme_name, `%${identifier}%`));
    }
    
    const results = await db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        total_number_of_esr: schemeStatuses.total_number_of_esr,
        total_esr_integrated: schemeStatuses.total_esr_integrated,
        no_fully_completed_esr: schemeStatuses.no_fully_completed_esr,
        balance_to_complete_esr: schemeStatuses.balance_to_complete_esr
      })
      .from(schemeStatuses)
      .where(and(...whereConditions))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Scheme not found",
        message: `No scheme found with identifier: ${identifier}`
      });
    }
    
    const scheme = results[0];
    res.json({
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      region: scheme.region,
      total_number_of_esr: scheme.total_number_of_esr,
      total_esr_integrated: scheme.total_esr_integrated,
      no_fully_completed_esr: scheme.no_fully_completed_esr,
      balance_to_complete_esr: scheme.balance_to_complete_esr
    });
  } catch (error) {
    console.error("Error fetching scheme ESR summary:", error);
    res.status(500).json({
      error: "Failed to fetch scheme ESR summary",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/esr-summary - Get ESR summary for a village
router.get("/villages/:identifier/esr-summary", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching ESR summary for village: ${identifier}`);
    
    // Query village table for ESR information
    const results = await db
      .select({
        village_name: villages.village_name,
        scheme_id: villages.scheme_id,
        scheme_name: villages.scheme_name,
        region: villages.region,
        number_of_esr: villages.number_of_esr,
        connected_esr: villages.connected_esr,
        not_connected_esr: villages.not_connected_esr,
        village_functional_status: villages.village_functional_status
      })
      .from(villages)
      .where(ilike(villages.village_name, `%${identifier}%`))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Village not found",
        message: `No village found with identifier: ${identifier}`
      });
    }
    
    const village = results[0];
    res.json({
      village_name: village.village_name,
      scheme_id: village.scheme_id,
      scheme_name: village.scheme_name,
      region: village.region,
      number_of_esr: village.number_of_esr,
      connected_esr: village.connected_esr,
      not_connected_esr: village.not_connected_esr,
      village_functional_status: village.village_functional_status
    });
  } catch (error) {
    console.error("Error fetching village ESR summary:", error);
    res.status(500).json({
      error: "Failed to fetch village ESR summary",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/schemes/:identifier/villages-summary - Get villages summary for a scheme
router.get("/schemes/:identifier/villages-summary", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching villages summary for scheme: ${identifier}`);
    
    // Query scheme_status table for village information
    let whereConditions = [];
    
    // Check if identifier is numeric (scheme_id) or text (scheme_name)
    if (/^[0-9]+$/.test(identifier)) {
      whereConditions.push(eq(schemeStatuses.scheme_id, identifier));
    } else {
      whereConditions.push(ilike(schemeStatuses.scheme_name, `%${identifier}%`));
    }
    
    const results = await db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        number_of_village: schemeStatuses.number_of_village,
        total_villages_integrated: schemeStatuses.total_villages_integrated,
        no_of_functional_village: schemeStatuses.no_of_functional_village,
        no_of_partial_village: schemeStatuses.no_of_partial_village,
        no_of_non_functional_village: schemeStatuses.no_of_non_functional_village,
        fully_completed_villages: schemeStatuses.fully_completed_villages
      })
      .from(schemeStatuses)
      .where(and(...whereConditions))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Scheme not found",
        message: `No scheme found with identifier: ${identifier}`
      });
    }
    
    const scheme = results[0];
    res.json({
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      region: scheme.region,
      number_of_village: scheme.number_of_village,
      total_villages_integrated: scheme.total_villages_integrated,
      no_of_functional_village: scheme.no_of_functional_village,
      no_of_partial_village: scheme.no_of_partial_village,
      no_of_non_functional_village: scheme.no_of_non_functional_village,
      fully_completed_villages: scheme.fully_completed_villages
    });
  } catch (error) {
    console.error("Error fetching scheme villages summary:", error);
    res.status(500).json({
      error: "Failed to fetch scheme villages summary",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/water-consumption - Get latest water consumption for a village
router.get("/villages/:identifier/water-consumption", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching water consumption for village: ${identifier}`);
    
    // Query water_scheme_data table for latest water consumption (day 7)
    const results = await db
      .select({
        village_name: waterSchemeData.village_name,
        scheme_id: waterSchemeData.scheme_id,
        scheme_name: waterSchemeData.scheme_name,
        region: waterSchemeData.region,
        water_value_day7: waterSchemeData.water_value_day7,
        water_date_day7: waterSchemeData.water_date_day7,
        population: waterSchemeData.population,
        number_of_esr: waterSchemeData.number_of_esr
      })
      .from(waterSchemeData)
      .where(ilike(waterSchemeData.village_name, `%${identifier}%`))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Village not found",
        message: `No village found with identifier: ${identifier}`
      });
    }
    
    const village = results[0];
    res.json({
      village_name: village.village_name,
      scheme_id: village.scheme_id,
      scheme_name: village.scheme_name,
      region: village.region,
      water_value_day7: village.water_value_day7,
      water_date_day7: village.water_date_day7,
      population: village.population,
      number_of_esr: village.number_of_esr
    });
  } catch (error) {
    console.error("Error fetching village water consumption:", error);
    res.status(500).json({
      error: "Failed to fetch village water consumption",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/lpcd - Get latest LPCD for a village
router.get("/villages/:identifier/lpcd", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching LPCD for village: ${identifier}`);
    
    // Query water_scheme_data table for latest LPCD (day 7)
    const results = await db
      .select({
        village_name: waterSchemeData.village_name,
        scheme_id: waterSchemeData.scheme_id,
        scheme_name: waterSchemeData.scheme_name,
        region: waterSchemeData.region,
        lpcd_value_day7: waterSchemeData.lpcd_value_day7,
        lpcd_date_day7: waterSchemeData.lpcd_date_day7,
        population: waterSchemeData.population,
        number_of_esr: waterSchemeData.number_of_esr
      })
      .from(waterSchemeData)
      .where(ilike(waterSchemeData.village_name, `%${identifier}%`))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Village not found",
        message: `No village found with identifier: ${identifier}`
      });
    }
    
    const village = results[0];
    res.json({
      village_name: village.village_name,
      scheme_id: village.scheme_id,
      scheme_name: village.scheme_name,
      region: village.region,
      lpcd_value_day7: village.lpcd_value_day7,
      lpcd_date_day7: village.lpcd_date_day7,
      population: village.population,
      number_of_esr: village.number_of_esr
    });
  } catch (error) {
    console.error("Error fetching village LPCD:", error);
    res.status(500).json({
      error: "Failed to fetch village LPCD",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/esr-consumption - Get ESR-level water consumption for a village
router.get("/villages/:identifier/esr-consumption", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching ESR-level water consumption for village: ${identifier}`);
    
    // Query water_consumption table for ESR-level data
    const results = await db
      .select({
        village_name: waterConsumption.village_name,
        scheme_id: waterConsumption.scheme_id,
        scheme_name: waterConsumption.scheme_name,
        region: waterConsumption.region,
        esr_name: waterConsumption.esr_name,
        water_value_day7: waterConsumption.water_value_day7,
        water_date_day7: waterConsumption.water_date_day7,
        esr_capacity: waterConsumption.esr_capacity,
        flow_meter_connected: waterConsumption.flow_meter_connected,
        online_status: waterConsumption.online_status
      })
      .from(waterConsumption)
      .where(ilike(waterConsumption.village_name, `%${identifier}%`));
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Village not found",
        message: `No ESR-level data found for village: ${identifier}`
      });
    }
    
    res.json({
      village_name: results[0].village_name,
      scheme_id: results[0].scheme_id,
      scheme_name: results[0].scheme_name,
      region: results[0].region,
      esr_data: results.map((esr: any) => ({
        esr_name: esr.esr_name,
        water_value_day7: esr.water_value_day7,
        water_date_day7: esr.water_date_day7,
        esr_capacity: esr.esr_capacity,
        flow_meter_connected: esr.flow_meter_connected,
        online_status: esr.online_status
      }))
    });
  } catch (error) {
    console.error("Error fetching ESR-level water consumption:", error);
    res.status(500).json({
      error: "Failed to fetch ESR-level water consumption",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/chlorine - Get latest chlorine values for all ESRs in a village
router.get("/villages/:identifier/chlorine", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching chlorine data for village: ${identifier}`);
    
    const results = await db
      .select({
        village_name: chlorineData.village_name,
        scheme_id: chlorineData.scheme_id,
        scheme_name: chlorineData.scheme_name,
        region: chlorineData.region,
        esr_name: chlorineData.esr_name,
        chlorine_value_7: chlorineData.chlorine_value_7,
        chlorine_date_day_7: chlorineData.chlorine_date_day_7
      })
      .from(chlorineData)
      .where(ilike(chlorineData.village_name, `%${identifier}%`));
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Village not found",
        message: `No chlorine data found for village: ${identifier}`
      });
    }
    
    res.json({
      village_name: results[0].village_name,
      scheme_id: results[0].scheme_id,
      scheme_name: results[0].scheme_name,
      region: results[0].region,
      esr_data: results.map((esr: any) => ({
        esr_name: esr.esr_name,
        chlorine_value_day7: esr.chlorine_value_7,
        chlorine_date_day7: esr.chlorine_date_day_7
      }))
    });
  } catch (error) {
    console.error("Error fetching village chlorine data:", error);
    res.status(500).json({
      error: "Failed to fetch village chlorine data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/pressure - Get latest pressure values for all ESRs in a village
router.get("/villages/:identifier/pressure", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching pressure data for village: ${identifier}`);
    
    const results = await db
      .select({
        village_name: pressureData.village_name,
        scheme_id: pressureData.scheme_id,
        scheme_name: pressureData.scheme_name,
        region: pressureData.region,
        esr_name: pressureData.esr_name,
        pressure_value_7: pressureData.pressure_value_7,
        pressure_date_day_7: pressureData.pressure_date_day_7
      })
      .from(pressureData)
      .where(ilike(pressureData.village_name, `%${identifier}%`));
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Village not found",
        message: `No pressure data found for village: ${identifier}`
      });
    }
    
    res.json({
      village_name: results[0].village_name,
      scheme_id: results[0].scheme_id,
      scheme_name: results[0].scheme_name,
      region: results[0].region,
      esr_data: results.map((esr: any) => ({
        esr_name: esr.esr_name,
        pressure_value_day7: esr.pressure_value_7,
        pressure_date_day7: esr.pressure_date_day_7
      }))
    });
  } catch (error) {
    console.error("Error fetching village pressure data:", error);
    res.status(500).json({
      error: "Failed to fetch village pressure data",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/scheme-esr-summary/:identifier - Get ESR summary for a scheme
router.get("/scheme-esr-summary/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    // Try to find scheme by ID or name
    let whereCondition;
    if (/^[0-9]+$/.test(identifier)) {
      whereCondition = eq(schemeStatuses.scheme_id, identifier);
    } else {
      whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
    }
    
    const results = await db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        circle: schemeStatuses.circle,
        division: schemeStatuses.division,
        sub_division: schemeStatuses.sub_division,
        block: schemeStatuses.block,
        total_number_of_esr: schemeStatuses.total_number_of_esr,
        total_esr_integrated: schemeStatuses.total_esr_integrated,
        no_fully_completed_esr: schemeStatuses.no_fully_completed_esr,
        balance_to_complete_esr: schemeStatuses.balance_to_complete_esr
      })
      .from(schemeStatuses)
      .where(whereCondition)
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Scheme not found",
        message: `No scheme found for: ${identifier}`
      });
    }
    
    const scheme = results[0];
    res.json({
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      location: {
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division,
        sub_division: scheme.sub_division,
        block: scheme.block
      },
      esr_summary: {
        total_number_of_esr: scheme.total_number_of_esr || 0,
        total_esr_integrated: scheme.total_esr_integrated || 0,
        no_fully_completed_esr: scheme.no_fully_completed_esr || 0,
        balance_to_complete_esr: scheme.balance_to_complete_esr || 0
      }
    });
  } catch (error) {
    console.error("Error fetching scheme ESR summary:", error);
    res.status(500).json({
      error: "Failed to fetch scheme ESR summary",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/village-esr-summary/:identifier - Get ESR summary for a village
router.get("/village-esr-summary/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    const results = await db
      .select({
        village_name: villages.village_name,
        scheme_id: villages.scheme_id,
        scheme_name: villages.scheme_name,
        region: villages.region,
        circle: villages.circle,
        division: villages.division,
        sub_division: villages.sub_division,
        block: villages.block,
        number_of_esr: villages.number_of_esr,
        connected_esr: villages.connected_esr,
        not_connected_esr: villages.not_connected_esr,
        village_functional_status: villages.village_functional_status
      })
      .from(villages)
      .where(ilike(villages.village_name, `%${identifier}%`))
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Village not found",
        message: `No village found for: ${identifier}`
      });
    }
    
    const village = results[0];
    res.json({
      village_name: village.village_name,
      scheme_id: village.scheme_id,
      scheme_name: village.scheme_name,
      location: {
        region: village.region,
        circle: village.circle,
        division: village.division,
        sub_division: village.sub_division,
        block: village.block
      },
      esr_summary: {
        number_of_esr: village.number_of_esr || 0,
        connected_esr: village.connected_esr || 0,
        not_connected_esr: village.not_connected_esr || 0,
        village_functional_status: village.village_functional_status
      }
    });
  } catch (error) {
    console.error("Error fetching village ESR summary:", error);
    res.status(500).json({
      error: "Failed to fetch village ESR summary", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/flow-meter-count/:identifier - Get flow meter count for a region, village or scheme
router.get("/flow-meter-count/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // "region", "village" or "scheme"
    const db = await getDB();
    
    let flowMeterCount = 0;
    let location = {};
    let name = identifier;
    let detectedType = type as string;
    
    // Normalize region name
    const normalizedRegion = normalizeRegionName(identifier);
    const isRegion = normalizedRegion !== null;
    
    if (type === "region" || isRegion) {
      // Query from region table with normalized region name
      const regionToQuery = normalizedRegion || identifier;
      const results = await db
        .select({
          region_name: regions.region_name,
          flow_meter_integrated: regions.flow_meter_integrated
        })
        .from(regions)
        .where(ilike(regions.region_name, regionToQuery))
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Region not found",
          message: `No region found for: ${identifier}`
        });
      }
      
      const region = results[0];
      flowMeterCount = region.flow_meter_integrated || 0;
      name = region.region_name;
      location = {
        region: region.region_name
      };
      detectedType = "region";
    } else if (type === "scheme" || /^[0-9]+$/.test(identifier)) {
      // Query from scheme_status table
      let whereCondition;
      if (/^[0-9]+$/.test(identifier)) {
        whereCondition = eq(schemeStatuses.scheme_id, identifier);
      } else {
        whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
      }
      
      const results = await db
        .select({
          scheme_id: schemeStatuses.scheme_id,
          scheme_name: schemeStatuses.scheme_name,
          region: schemeStatuses.region,
          circle: schemeStatuses.circle,
          division: schemeStatuses.division,
          flow_meters_connected: schemeStatuses.flow_meters_connected
        })
        .from(schemeStatuses)
        .where(whereCondition)
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Scheme not found",
          message: `No scheme found for: ${identifier}`
        });
      }
      
      const scheme = results[0];
      flowMeterCount = scheme.flow_meters_connected || 0;
      name = scheme.scheme_name;
      location = {
        region: scheme.region,
        scheme: scheme.scheme_name,
        circle: scheme.circle,
        division: scheme.division
      };
      detectedType = "scheme";
    } else {
      // Query from communication_status table for village
      const results = await db.execute(sql`
        SELECT 
          village_name,
          scheme_name,
          region,
          circle,
          division,
          COUNT(*) FILTER (WHERE flow_meter_connected = 'Connected') as flow_meter_count
        FROM communication_status
        WHERE village_name ILIKE ${'%' + identifier + '%'}
        GROUP BY village_name, scheme_name, region, circle, division
        LIMIT 1
      `);
      
      if (!results.rows || results.rows.length === 0) {
        return res.status(404).json({
          error: "Village not found",
          message: `No village found for: ${identifier}`
        });
      }
      
      const village = results.rows[0] as any;
      flowMeterCount = parseInt(village.flow_meter_count) || 0;
      name = village.village_name;
      location = {
        region: village.region,
        scheme: village.scheme_name,
        village: village.village_name,
        circle: village.circle,
        division: village.division
      };
      detectedType = "village";
    }
    
    res.json({
      identifier: name,
      type: detectedType,
      location,
      flow_meter_count: flowMeterCount
    });
  } catch (error) {
    console.error("Error fetching flow meter count:", error);
    res.status(500).json({
      error: "Failed to fetch flow meter count",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/esr-count/:identifier - Get ESR count for a region, village or scheme
router.get("/esr-count/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // "region", "village" or "scheme"
    const db = await getDB();
    
    let esrCount = 0;
    let esrDetails = {};
    let location = {};
    let name = identifier;
    let detectedType = type as string;
    
    // Normalize region name
    const normalizedRegion = normalizeRegionName(identifier);
    const isRegion = normalizedRegion !== null;
    
    if (type === "region" || isRegion) {
      // Query from region table with normalized region name
      const regionToQuery = normalizedRegion || identifier;
      const results = await db
        .select({
          region_name: regions.region_name,
          total_esr_integrated: regions.total_esr_integrated
        })
        .from(regions)
        .where(ilike(regions.region_name, regionToQuery))
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Region not found",
          message: `No region found for: ${identifier}`
        });
      }
      
      const region = results[0];
      esrCount = region.total_esr_integrated || 0;
      esrDetails = {
        total_esr_integrated: region.total_esr_integrated || 0
      };
      name = region.region_name;
      location = {
        region: region.region_name
      };
      detectedType = "region";
    } else if (type === "scheme" || /^[0-9]+$/.test(identifier)) {
      // Query from scheme_status table
      let whereCondition;
      if (/^[0-9]+$/.test(identifier)) {
        whereCondition = eq(schemeStatuses.scheme_id, identifier);
      } else {
        whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
      }
      
      const results = await db
        .select({
          scheme_id: schemeStatuses.scheme_id,
          scheme_name: schemeStatuses.scheme_name,
          region: schemeStatuses.region,
          circle: schemeStatuses.circle,
          division: schemeStatuses.division,
          total_number_of_esr: schemeStatuses.total_number_of_esr,
          total_esr_integrated: schemeStatuses.total_esr_integrated,
          no_fully_completed_esr: schemeStatuses.no_fully_completed_esr,
          balance_to_complete_esr: schemeStatuses.balance_to_complete_esr
        })
        .from(schemeStatuses)
        .where(whereCondition)
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Scheme not found",
          message: `No scheme found for: ${identifier}`
        });
      }
      
      const scheme = results[0];
      esrCount = scheme.total_number_of_esr || 0;
      esrDetails = {
        total_esr: scheme.total_number_of_esr || 0,
        integrated_esr: scheme.total_esr_integrated || 0,
        completed_esr: scheme.no_fully_completed_esr || 0,
        remaining_esr: scheme.balance_to_complete_esr || 0
      };
      name = scheme.scheme_name;
      location = {
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division
      };
      detectedType = "scheme";
    } else {
      // Query from village table
      const results = await db
        .select({
          village_name: villages.village_name,
          scheme_id: villages.scheme_id,
          scheme_name: villages.scheme_name,
          region: villages.region,
          circle: villages.circle,
          division: villages.division,
          number_of_esr: villages.number_of_esr,
          connected_esr: villages.connected_esr,
          not_connected_esr: villages.not_connected_esr
        })
        .from(villages)
        .where(ilike(villages.village_name, `%${identifier}%`))
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Village not found",
          message: `No village found for: ${identifier}`
        });
      }
      
      const village = results[0];
      esrCount = village.number_of_esr || 0;
      esrDetails = {
        total_esr: village.number_of_esr || 0,
        connected_esr: village.connected_esr || 0,
        not_connected_esr: village.not_connected_esr || 0
      };
      name = village.village_name;
      location = {
        region: village.region,
        circle: village.circle,
        division: village.division,
        scheme_name: village.scheme_name
      };
      detectedType = "village";
    }
    
    res.json({
      identifier: name,
      type: detectedType,
      location,
      esr_count: esrCount,
      esr_details: esrDetails
    });
  } catch (error) {
    console.error("Error fetching ESR count:", error);
    res.status(500).json({
      error: "Failed to fetch ESR count",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/scheme-village-summary/:identifier - Get village summary for a scheme
router.get("/scheme-village-summary/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    // Try to find scheme by ID or name
    let whereCondition;
    if (/^[0-9]+$/.test(identifier)) {
      whereCondition = eq(schemeStatuses.scheme_id, identifier);
    } else {
      whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
    }
    
    const results = await db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        circle: schemeStatuses.circle,
        division: schemeStatuses.division,
        sub_division: schemeStatuses.sub_division,
        block: schemeStatuses.block,
        number_of_village: schemeStatuses.number_of_village,
        total_villages_integrated: schemeStatuses.total_villages_integrated,
        no_of_functional_village: schemeStatuses.no_of_functional_village,
        no_of_partial_village: schemeStatuses.no_of_partial_village,
        no_of_non_functional_village: schemeStatuses.no_of_non_functional_village,
        fully_completed_villages: schemeStatuses.fully_completed_villages
      })
      .from(schemeStatuses)
      .where(whereCondition)
      .limit(1);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "Scheme not found",
        message: `No scheme found for: ${identifier}`
      });
    }
    
    const scheme = results[0];
    res.json({
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      location: {
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division,
        sub_division: scheme.sub_division,
        block: scheme.block
      },
      village_summary: {
        number_of_village: scheme.number_of_village || 0,
        total_villages_integrated: scheme.total_villages_integrated || 0,
        no_of_functional_village: scheme.no_of_functional_village || 0,
        no_of_partial_village: scheme.no_of_partial_village || 0,
        no_of_non_functional_village: scheme.no_of_non_functional_village || 0,
        fully_completed_villages: scheme.fully_completed_villages || 0
      }
    });
  } catch (error) {
    console.error("Error fetching scheme village summary:", error);
    res.status(500).json({
      error: "Failed to fetch scheme village summary",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper function to normalize region names
const normalizeRegionName = (identifier: string): string | null => {
  const regionMap: Record<string, string> = {
    "amravati": "Amravati",
    "nagpur": "Nagpur",
    "nashik": "Nashik",
    "pune": "Pune",
    "konkan": "Konkan",
    "mumbai": "Mumbai",
    "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
    "aurangabad": "Chhatrapati Sambhajinagar"
  };
  
  const lowerIdentifier = identifier.toLowerCase();
  for (const [key, value] of Object.entries(regionMap)) {
    if (lowerIdentifier.includes(key)) {
      return value;
    }
  }
  return null;
};

// GET /api/category-data/chlorine-count/:identifier - Get chlorine analyzer count for a region, village or scheme
router.get("/chlorine-count/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // "region", "village", or "scheme"
    const db = await getDB();
    
    let chlorineCount = 0;
    let location = {};
    let name = identifier;
    let detectedType = type as string;
    
    // Normalize region name
    const normalizedRegion = normalizeRegionName(identifier);
    const isRegion = normalizedRegion !== null;
    
    if (type === "region" || isRegion) {
      // Query from region table with normalized region name
      const regionToQuery = normalizedRegion || identifier;
      const results = await db
        .select({
          region_name: regions.region_name,
          rca_integrated: regions.rca_integrated
        })
        .from(regions)
        .where(ilike(regions.region_name, regionToQuery))
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Region not found",
          message: `No region found for: ${identifier}`
        });
      }
      
      const region = results[0];
      chlorineCount = region.rca_integrated || 0;
      name = region.region_name;
      location = {
        region: region.region_name
      };
      detectedType = "region";
    } else if (type === "scheme" || /^[0-9]+$/.test(identifier)) {
      // Query from scheme_status table
      let whereCondition;
      if (/^[0-9]+$/.test(identifier)) {
        whereCondition = eq(schemeStatuses.scheme_id, identifier);
      } else {
        whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
      }
      
      const results = await db
        .select({
          scheme_id: schemeStatuses.scheme_id,
          scheme_name: schemeStatuses.scheme_name,
          region: schemeStatuses.region,
          circle: schemeStatuses.circle,
          division: schemeStatuses.division,
          residual_chlorine_analyzer_connected: schemeStatuses.residual_chlorine_analyzer_connected
        })
        .from(schemeStatuses)
        .where(whereCondition)
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Scheme not found",
          message: `No scheme found for: ${identifier}`
        });
      }
      
      const scheme = results[0];
      chlorineCount = scheme.residual_chlorine_analyzer_connected || 0;
      name = scheme.scheme_name;
      location = {
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division
      };
      detectedType = "scheme";
    } else {
      // Query from communication_status table for village
      const results = await db.execute(sql`
        SELECT 
          village_name,
          region,
          circle,
          division,
          COUNT(*) FILTER (WHERE chlorine_connected = 'Connected') as chlorine_count
        FROM communication_status
        WHERE village_name ILIKE ${'%' + identifier + '%'}
        GROUP BY village_name, region, circle, division
        LIMIT 1
      `);
      
      if (!results.rows || results.rows.length === 0) {
        return res.status(404).json({
          error: "Village not found",
          message: `No village found for: ${identifier}`
        });
      }
      
      const village = results.rows[0] as any;
      chlorineCount = parseInt(village.chlorine_count) || 0;
      name = village.village_name;
      location = {
        region: village.region,
        circle: village.circle,
        division: village.division
      };
      detectedType = "village";
    }
    
    res.json({
      identifier: name,
      type: detectedType,
      location,
      chlorine_count: chlorineCount
    });
  } catch (error) {
    console.error("Error fetching chlorine count:", error);
    res.status(500).json({
      error: "Failed to fetch chlorine count",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure-count/:identifier - Get pressure transmitter count for a region, village or scheme
router.get("/pressure-count/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // "region", "village", or "scheme"
    const db = await getDB();
    
    let pressureCount = 0;
    let location = {};
    let name = identifier;
    let detectedType = type as string;
    
    // Normalize region name
    const normalizedRegion = normalizeRegionName(identifier);
    const isRegion = normalizedRegion !== null;
    
    if (type === "region" || isRegion) {
      // Query from region table with normalized region name
      const regionToQuery = normalizedRegion || identifier;
      const results = await db
        .select({
          region_name: regions.region_name,
          pressure_transmitter_integrated: regions.pressure_transmitter_integrated
        })
        .from(regions)
        .where(ilike(regions.region_name, regionToQuery))
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Region not found",
          message: `No region found for: ${identifier}`
        });
      }
      
      const region = results[0];
      pressureCount = region.pressure_transmitter_integrated || 0;
      name = region.region_name;
      location = {
        region: region.region_name
      };
      detectedType = "region";
    } else if (type === "scheme" || /^[0-9]+$/.test(identifier)) {
      // Query from scheme_status table
      let whereCondition;
      if (/^[0-9]+$/.test(identifier)) {
        whereCondition = eq(schemeStatuses.scheme_id, identifier);
      } else {
        whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
      }
      
      const results = await db
        .select({
          scheme_id: schemeStatuses.scheme_id,
          scheme_name: schemeStatuses.scheme_name,
          region: schemeStatuses.region,
          circle: schemeStatuses.circle,
          division: schemeStatuses.division,
          pressure_transmitter_connected: schemeStatuses.pressure_transmitter_connected
        })
        .from(schemeStatuses)
        .where(whereCondition)
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Scheme not found",
          message: `No scheme found for: ${identifier}`
        });
      }
      
      const scheme = results[0];
      pressureCount = scheme.pressure_transmitter_connected || 0;
      name = scheme.scheme_name;
      location = {
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division
      };
      detectedType = "scheme";
    } else {
      // Query from communication_status table for village
      const results = await db.execute(sql`
        SELECT 
          village_name,
          region,
          circle,
          division,
          COUNT(*) FILTER (WHERE pressure_connected = 'Connected') as pressure_count
        FROM communication_status
        WHERE village_name ILIKE ${'%' + identifier + '%'}
        GROUP BY village_name, region, circle, division
        LIMIT 1
      `);
      
      if (!results.rows || results.rows.length === 0) {
        return res.status(404).json({
          error: "Village not found",
          message: `No village found for: ${identifier}`
        });
      }
      
      const village = results.rows[0] as any;
      pressureCount = parseInt(village.pressure_count) || 0;
      name = village.village_name;
      location = {
        region: village.region,
        circle: village.circle,
        division: village.division
      };
      detectedType = "village";
    }
    
    res.json({
      identifier: name,
      type: detectedType,
      location,
      pressure_count: pressureCount
    });
  } catch (error) {
    console.error("Error fetching pressure count:", error);
    res.status(500).json({
      error: "Failed to fetch pressure count",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/equipment-combination/:identifier - Get multiple equipment counts in one query
router.get("/equipment-combination/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // "region", "village", or "scheme"
    const db = await getDB();
    
    let equipment = {
      esr_count: 0,
      flow_meter_count: 0,
      chlorine_count: 0,
      pressure_count: 0
    };
    let location = {};
    let name = identifier;
    let detectedType = type as string;
    
    // Normalize region name
    const normalizedRegion = normalizeRegionName(identifier);
    const isRegion = normalizedRegion !== null;
    
    if (type === "region" || isRegion) {
      // Query from region table with normalized region name
      const regionToQuery = normalizedRegion || identifier;
      const results = await db
        .select({
          region_name: regions.region_name,
          total_esr_integrated: regions.total_esr_integrated,
          flow_meter_integrated: regions.flow_meter_integrated,
          rca_integrated: regions.rca_integrated,
          pressure_transmitter_integrated: regions.pressure_transmitter_integrated
        })
        .from(regions)
        .where(ilike(regions.region_name, regionToQuery))
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Region not found",
          message: `No region found for: ${identifier}`
        });
      }
      
      const region = results[0];
      equipment = {
        esr_count: region.total_esr_integrated || 0,
        flow_meter_count: region.flow_meter_integrated || 0,
        chlorine_count: region.rca_integrated || 0,
        pressure_count: region.pressure_transmitter_integrated || 0
      };
      name = region.region_name;
      location = {
        region: region.region_name
      };
      detectedType = "region";
    } else if (type === "scheme" || /^[0-9]+$/.test(identifier)) {
      // Query from scheme_status table
      let whereCondition;
      if (/^[0-9]+$/.test(identifier)) {
        whereCondition = eq(schemeStatuses.scheme_id, identifier);
      } else {
        whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
      }
      
      const results = await db
        .select({
          scheme_id: schemeStatuses.scheme_id,
          scheme_name: schemeStatuses.scheme_name,
          region: schemeStatuses.region,
          circle: schemeStatuses.circle,
          division: schemeStatuses.division,
          total_esr_integrated: schemeStatuses.total_esr_integrated,
          flow_meters_connected: schemeStatuses.flow_meters_connected,
          residual_chlorine_analyzer_connected: schemeStatuses.residual_chlorine_analyzer_connected,
          pressure_transmitter_connected: schemeStatuses.pressure_transmitter_connected
        })
        .from(schemeStatuses)
        .where(whereCondition)
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Scheme not found",
          message: `No scheme found for: ${identifier}`
        });
      }
      
      const scheme = results[0];
      equipment = {
        esr_count: scheme.total_esr_integrated || 0,
        flow_meter_count: scheme.flow_meters_connected || 0,
        chlorine_count: scheme.residual_chlorine_analyzer_connected || 0,
        pressure_count: scheme.pressure_transmitter_connected || 0
      };
      name = scheme.scheme_name;
      location = {
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division
      };
      detectedType = "scheme";
    } else {
      // Query from communication_status table for village
      const results = await db.execute(sql`
        SELECT 
          village_name,
          region,
          circle,
          division,
          COUNT(*) as total_esr,
          COUNT(*) FILTER (WHERE flow_meter_connected = 'Connected') as flow_meter_count,
          COUNT(*) FILTER (WHERE chlorine_connected = 'Connected') as chlorine_count,
          COUNT(*) FILTER (WHERE pressure_connected = 'Connected') as pressure_count
        FROM communication_status
        WHERE village_name ILIKE ${'%' + identifier + '%'}
        GROUP BY village_name, region, circle, division
        LIMIT 1
      `);
      
      if (!results.rows || results.rows.length === 0) {
        return res.status(404).json({
          error: "Village not found",
          message: `No village found for: ${identifier}`
        });
      }
      
      const village = results.rows[0] as any;
      equipment = {
        esr_count: parseInt(village.total_esr) || 0,
        flow_meter_count: parseInt(village.flow_meter_count) || 0,
        chlorine_count: parseInt(village.chlorine_count) || 0,
        pressure_count: parseInt(village.pressure_count) || 0
      };
      name = village.village_name;
      location = {
        region: village.region,
        circle: village.circle,
        division: village.division
      };
      detectedType = "village";
    }
    
    res.json({
      identifier: name,
      type: detectedType,
      location,
      equipment
    });
  } catch (error) {
    console.error("Error fetching equipment combination:", error);
    res.status(500).json({
      error: "Failed to fetch equipment combination",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/fully-completed-esr/:identifier - Get fully completed ESR count
router.get("/fully-completed-esr/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query;
    const db = await getDB();
    
    let fullyCompletedESR = 0;
    let totalESR = 0;
    let name = identifier;
    let location: any = {};
    
    if (type === "all") {
      // Query sum from all regions
      const results = await db
        .select({
          total_fully_completed: sql<number>`CAST(SUM(CAST(${regions.fully_completed_esr} AS INTEGER)) AS INTEGER)`,
          total_esr: sql<number>`CAST(SUM(CAST(${regions.total_esr_integrated} AS INTEGER)) AS INTEGER)`
        })
        .from(regions);
      
      if (results.length > 0 && results[0]) {
        fullyCompletedESR = results[0].total_fully_completed || 0;
        totalESR = results[0].total_esr || 0;
      }
      name = "All Regions";
    } else if (type === "region") {
      // Query from regions table
      const normalizedRegion = normalizeRegionName(identifier);
      const regionToQuery = normalizedRegion || identifier;
      
      const results = await db
        .select({
          region_name: regions.region_name,
          fully_completed_esr: regions.fully_completed_esr,
          total_esr_integrated: regions.total_esr_integrated
        })
        .from(regions)
        .where(ilike(regions.region_name, regionToQuery))
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Region not found",
          message: `No region found for: ${identifier}`
        });
      }
      
      const region = results[0];
      fullyCompletedESR = parseInt(String(region.fully_completed_esr || 0));
      totalESR = parseInt(String(region.total_esr_integrated || 0));
      name = region.region_name;
    } else if (type === "scheme") {
      // Query from scheme_status table
      let whereCondition;
      if (/^[0-9]+$/.test(identifier)) {
        whereCondition = eq(schemeStatuses.scheme_id, identifier);
      } else {
        whereCondition = ilike(schemeStatuses.scheme_name, `%${identifier}%`);
      }
      
      const results = await db
        .select({
          scheme_id: schemeStatuses.scheme_id,
          scheme_name: schemeStatuses.scheme_name,
          region: schemeStatuses.region,
          circle: schemeStatuses.circle,
          division: schemeStatuses.division,
          no_fully_completed_esr: schemeStatuses.no_fully_completed_esr,
          total_esr_integrated: schemeStatuses.total_esr_integrated
        })
        .from(schemeStatuses)
        .where(whereCondition)
        .limit(1);
      
      if (results.length === 0) {
        return res.status(404).json({
          error: "Scheme not found",
          message: `No scheme found for: ${identifier}`
        });
      }
      
      const scheme = results[0];
      fullyCompletedESR = parseInt(String(scheme.no_fully_completed_esr || 0));
      totalESR = parseInt(String(scheme.total_esr_integrated || 0));
      name = scheme.scheme_name;
      location = {
        region: scheme.region,
        circle: scheme.circle,
        division: scheme.division
      };
    }
    
    res.json({
      identifier: name,
      type: type,
      fully_completed_esr: fullyCompletedESR,
      total_esr: totalESR,
      location
    });
  } catch (error) {
    console.error("Error fetching fully completed ESR:", error);
    res.status(500).json({
      error: "Failed to fetch fully completed ESR",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/chlorine-analysis - Get 7-day chlorine analysis for all ESRs in a village
router.get("/villages/:identifier/chlorine-analysis", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching chlorine analysis for village: ${identifier}`);
    
    // Query chlorine_data table for all ESRs in the village
    const results = await db
      .select({
        village_name: chlorineData.village_name,
        scheme_id: chlorineData.scheme_id,
        scheme_name: chlorineData.scheme_name,
        region: chlorineData.region,
        esr_name: chlorineData.esr_name,
        // 7-day chlorine values
        chlorine_value_1: chlorineData.chlorine_value_1,
        chlorine_value_2: chlorineData.chlorine_value_2,
        chlorine_value_3: chlorineData.chlorine_value_3,
        chlorine_value_4: chlorineData.chlorine_value_4,
        chlorine_value_5: chlorineData.chlorine_value_5,
        chlorine_value_6: chlorineData.chlorine_value_6,
        chlorine_value_7: chlorineData.chlorine_value_7,
        // 7-day chlorine dates
        chlorine_date_day_1: chlorineData.chlorine_date_day_1,
        chlorine_date_day_2: chlorineData.chlorine_date_day_2,
        chlorine_date_day_3: chlorineData.chlorine_date_day_3,
        chlorine_date_day_4: chlorineData.chlorine_date_day_4,
        chlorine_date_day_5: chlorineData.chlorine_date_day_5,
        chlorine_date_day_6: chlorineData.chlorine_date_day_6,
        chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      })
      .from(chlorineData)
      .where(ilike(chlorineData.village_name, `%${identifier}%`))
      .orderBy(chlorineData.esr_name);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "No chlorine data found",
        message: `No chlorine data found for village: ${identifier}`
      });
    }
    
    console.log(`Found ${results.length} ESR chlorine records for village: ${identifier}`);
    res.json(results);
  } catch (error) {
    console.error("Error fetching chlorine analysis:", error);
    res.status(500).json({
      error: "Failed to fetch chlorine analysis",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/villages/:identifier/pressure-analysis - Get 7-day pressure analysis for all ESRs in a village
router.get("/villages/:identifier/pressure-analysis", async (req, res) => {
  try {
    const { identifier } = req.params;
    const db = await getDB();
    
    console.log(`Fetching pressure analysis for village: ${identifier}`);
    
    // Query pressure_data table for all ESRs in the village
    const results = await db
      .select({
        village_name: pressureData.village_name,
        scheme_id: pressureData.scheme_id,
        scheme_name: pressureData.scheme_name,
        region: pressureData.region,
        esr_name: pressureData.esr_name,
        // 7-day pressure values
        pressure_value_1: pressureData.pressure_value_1,
        pressure_value_2: pressureData.pressure_value_2,
        pressure_value_3: pressureData.pressure_value_3,
        pressure_value_4: pressureData.pressure_value_4,
        pressure_value_5: pressureData.pressure_value_5,
        pressure_value_6: pressureData.pressure_value_6,
        pressure_value_7: pressureData.pressure_value_7,
        // 7-day pressure dates
        pressure_date_day_1: pressureData.pressure_date_day_1,
        pressure_date_day_2: pressureData.pressure_date_day_2,
        pressure_date_day_3: pressureData.pressure_date_day_3,
        pressure_date_day_4: pressureData.pressure_date_day_4,
        pressure_date_day_5: pressureData.pressure_date_day_5,
        pressure_date_day_6: pressureData.pressure_date_day_6,
        pressure_date_day_7: pressureData.pressure_date_day_7,
      })
      .from(pressureData)
      .where(ilike(pressureData.village_name, `%${identifier}%`))
      .orderBy(pressureData.esr_name);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: "No pressure data found",
        message: `No pressure data found for village: ${identifier}`
      });
    }
    
    console.log(`Found ${results.length} ESR pressure records for village: ${identifier}`);
    res.json(results);
  } catch (error) {
    console.error("Error fetching pressure analysis:", error);
    res.status(500).json({
      error: "Failed to fetch pressure analysis",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper function to get ESRs with consistent optimal chlorine (all 7 days between 0.2-0.5)
const getESRConsistentOptimalChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be between 0.2 and 0.5
    isNotNull(chlorineData.chlorine_value_1),
    isNotNull(chlorineData.chlorine_value_2),
    isNotNull(chlorineData.chlorine_value_3),
    isNotNull(chlorineData.chlorine_value_4),
    isNotNull(chlorineData.chlorine_value_5),
    isNotNull(chlorineData.chlorine_value_6),
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_1} >= 0.2 AND ${chlorineData.chlorine_value_1} <= 0.5`,
    sql`${chlorineData.chlorine_value_2} >= 0.2 AND ${chlorineData.chlorine_value_2} <= 0.5`,
    sql`${chlorineData.chlorine_value_3} >= 0.2 AND ${chlorineData.chlorine_value_3} <= 0.5`,
    sql`${chlorineData.chlorine_value_4} >= 0.2 AND ${chlorineData.chlorine_value_4} <= 0.5`,
    sql`${chlorineData.chlorine_value_5} >= 0.2 AND ${chlorineData.chlorine_value_5} <= 0.5`,
    sql`${chlorineData.chlorine_value_6} >= 0.2 AND ${chlorineData.chlorine_value_6} <= 0.5`,
    sql`${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with consistent above optimal chlorine (all 7 days > 0.5)
const getESRConsistentAboveChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be > 0.5
    isNotNull(chlorineData.chlorine_value_1),
    isNotNull(chlorineData.chlorine_value_2),
    isNotNull(chlorineData.chlorine_value_3),
    isNotNull(chlorineData.chlorine_value_4),
    isNotNull(chlorineData.chlorine_value_5),
    isNotNull(chlorineData.chlorine_value_6),
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_1} > 0.5`,
    sql`${chlorineData.chlorine_value_2} > 0.5`,
    sql`${chlorineData.chlorine_value_3} > 0.5`,
    sql`${chlorineData.chlorine_value_4} > 0.5`,
    sql`${chlorineData.chlorine_value_5} > 0.5`,
    sql`${chlorineData.chlorine_value_6} > 0.5`,
    sql`${chlorineData.chlorine_value_7} > 0.5`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with consistent below optimal chlorine (all 7 days < 0.2)
const getESRConsistentBelowChlorine = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be < 0.2
    isNotNull(chlorineData.chlorine_value_1),
    isNotNull(chlorineData.chlorine_value_2),
    isNotNull(chlorineData.chlorine_value_3),
    isNotNull(chlorineData.chlorine_value_4),
    isNotNull(chlorineData.chlorine_value_5),
    isNotNull(chlorineData.chlorine_value_6),
    isNotNull(chlorineData.chlorine_value_7),
    sql`${chlorineData.chlorine_value_1} < 0.2`,
    sql`${chlorineData.chlorine_value_2} < 0.2`,
    sql`${chlorineData.chlorine_value_3} < 0.2`,
    sql`${chlorineData.chlorine_value_4} < 0.2`,
    sql`${chlorineData.chlorine_value_5} < 0.2`,
    sql`${chlorineData.chlorine_value_6} < 0.2`,
    sql`${chlorineData.chlorine_value_7} < 0.2`
  ];

  if (region) {
    whereConditions.push(ilike(chlorineData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(chlorineData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(chlorineData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: chlorineData.esr_name,
      village_name: chlorineData.village_name,
      chlorine_value_1: chlorineData.chlorine_value_1,
      chlorine_value_2: chlorineData.chlorine_value_2,
      chlorine_value_3: chlorineData.chlorine_value_3,
      chlorine_value_4: chlorineData.chlorine_value_4,
      chlorine_value_5: chlorineData.chlorine_value_5,
      chlorine_value_6: chlorineData.chlorine_value_6,
      chlorine_value_7: chlorineData.chlorine_value_7,
      chlorine_date_day_1: chlorineData.chlorine_date_day_1,
      chlorine_date_day_2: chlorineData.chlorine_date_day_2,
      chlorine_date_day_3: chlorineData.chlorine_date_day_3,
      chlorine_date_day_4: chlorineData.chlorine_date_day_4,
      chlorine_date_day_5: chlorineData.chlorine_date_day_5,
      chlorine_date_day_6: chlorineData.chlorine_date_day_6,
      chlorine_date_day_7: chlorineData.chlorine_date_day_7,
      region: chlorineData.region,
      scheme_id: chlorineData.scheme_id,
      scheme_name: chlorineData.scheme_name
    })
    .from(chlorineData)
    .where(and(...whereConditions));

  return await query.orderBy(chlorineData.esr_name);
};

// Helper function to get ESRs with consistent optimal pressure (all 7 days between 0.2-0.7)
const getESRConsistentOptimalPressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be between 0.2 and 0.7
    isNotNull(pressureData.pressure_value_1),
    isNotNull(pressureData.pressure_value_2),
    isNotNull(pressureData.pressure_value_3),
    isNotNull(pressureData.pressure_value_4),
    isNotNull(pressureData.pressure_value_5),
    isNotNull(pressureData.pressure_value_6),
    isNotNull(pressureData.pressure_value_7),
    sql`${pressureData.pressure_value_1} >= 0.2 AND ${pressureData.pressure_value_1} <= 0.7`,
    sql`${pressureData.pressure_value_2} >= 0.2 AND ${pressureData.pressure_value_2} <= 0.7`,
    sql`${pressureData.pressure_value_3} >= 0.2 AND ${pressureData.pressure_value_3} <= 0.7`,
    sql`${pressureData.pressure_value_4} >= 0.2 AND ${pressureData.pressure_value_4} <= 0.7`,
    sql`${pressureData.pressure_value_5} >= 0.2 AND ${pressureData.pressure_value_5} <= 0.7`,
    sql`${pressureData.pressure_value_6} >= 0.2 AND ${pressureData.pressure_value_6} <= 0.7`,
    sql`${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get ESRs with consistent above optimal pressure (all 7 days > 0.7)
const getESRConsistentAbovePressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be > 0.7
    isNotNull(pressureData.pressure_value_1),
    isNotNull(pressureData.pressure_value_2),
    isNotNull(pressureData.pressure_value_3),
    isNotNull(pressureData.pressure_value_4),
    isNotNull(pressureData.pressure_value_5),
    isNotNull(pressureData.pressure_value_6),
    isNotNull(pressureData.pressure_value_7),
    sql`${pressureData.pressure_value_1} > 0.7`,
    sql`${pressureData.pressure_value_2} > 0.7`,
    sql`${pressureData.pressure_value_3} > 0.7`,
    sql`${pressureData.pressure_value_4} > 0.7`,
    sql`${pressureData.pressure_value_5} > 0.7`,
    sql`${pressureData.pressure_value_6} > 0.7`,
    sql`${pressureData.pressure_value_7} > 0.7`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// Helper function to get ESRs with consistent below optimal pressure (all 7 days < 0.2)
const getESRConsistentBelowPressure = async (region?: string, schemeId?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    // All 7 days must be < 0.2
    isNotNull(pressureData.pressure_value_1),
    isNotNull(pressureData.pressure_value_2),
    isNotNull(pressureData.pressure_value_3),
    isNotNull(pressureData.pressure_value_4),
    isNotNull(pressureData.pressure_value_5),
    isNotNull(pressureData.pressure_value_6),
    isNotNull(pressureData.pressure_value_7),
    sql`${pressureData.pressure_value_1} < 0.2`,
    sql`${pressureData.pressure_value_2} < 0.2`,
    sql`${pressureData.pressure_value_3} < 0.2`,
    sql`${pressureData.pressure_value_4} < 0.2`,
    sql`${pressureData.pressure_value_5} < 0.2`,
    sql`${pressureData.pressure_value_6} < 0.2`,
    sql`${pressureData.pressure_value_7} < 0.2`
  ];

  if (region) {
    whereConditions.push(ilike(pressureData.region, region));
  }
  
  if (schemeId) {
    if (/^[0-9]+$/.test(schemeId)) {
      whereConditions.push(eq(pressureData.scheme_id, schemeId));
    } else {
      whereConditions.push(ilike(pressureData.scheme_name, schemeId));
    }
  }
  
  const query = db
    .select({
      esr_name: pressureData.esr_name,
      village_name: pressureData.village_name,
      pressure_value_1: pressureData.pressure_value_1,
      pressure_value_2: pressureData.pressure_value_2,
      pressure_value_3: pressureData.pressure_value_3,
      pressure_value_4: pressureData.pressure_value_4,
      pressure_value_5: pressureData.pressure_value_5,
      pressure_value_6: pressureData.pressure_value_6,
      pressure_value_7: pressureData.pressure_value_7,
      pressure_date_day_1: pressureData.pressure_date_day_1,
      pressure_date_day_2: pressureData.pressure_date_day_2,
      pressure_date_day_3: pressureData.pressure_date_day_3,
      pressure_date_day_4: pressureData.pressure_date_day_4,
      pressure_date_day_5: pressureData.pressure_date_day_5,
      pressure_date_day_6: pressureData.pressure_date_day_6,
      pressure_date_day_7: pressureData.pressure_date_day_7,
      region: pressureData.region,
      scheme_id: pressureData.scheme_id,
      scheme_name: pressureData.scheme_name
    })
    .from(pressureData)
    .where(and(...whereConditions));

  return await query.orderBy(pressureData.esr_name);
};

// GET /api/category-data/chlorine/optimal - Get ESRs with optimal chlorine (0.2-0.5 mg/L) in latest reading
router.get("/chlorine/optimal", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESROptimalChlorine(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching optimal chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch optimal chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/below - Get ESRs with chlorine below optimal (<0.2 mg/L) in latest reading
router.get("/chlorine/below", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRBelowChlorine(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching below optimal chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch below optimal chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/above - Get ESRs with chlorine above optimal (>0.5 mg/L) in latest reading
router.get("/chlorine/above", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAboveChlorine(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching above optimal chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch above optimal chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/optimal - Get ESRs with optimal pressure (0.2-0.7 bar) in latest reading
router.get("/pressure/optimal", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESROptimalPressure(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching optimal pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch optimal pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/below - Get ESRs with pressure below optimal (<0.2 bar) in latest reading
router.get("/pressure/below", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRBelowPressure(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching below optimal pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch below optimal pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/above - Get ESRs with pressure above optimal (>0.7 bar) in latest reading
router.get("/pressure/above", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAbovePressure(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching above optimal pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch above optimal pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/consistent-optimal - Get ESRs with consistent optimal chlorine (0.2-0.5 for all 7 days)
router.get("/chlorine/consistent-optimal", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRConsistentOptimalChlorine(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching consistent optimal chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch consistent optimal chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/consistent-above - Get ESRs with consistent above optimal chlorine (>0.5 for all 7 days)
router.get("/chlorine/consistent-above", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRConsistentAboveChlorine(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching consistent above chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch consistent above chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/consistent-below - Get ESRs with consistent below optimal chlorine (<0.2 for all 7 days)
router.get("/chlorine/consistent-below", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRConsistentBelowChlorine(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching consistent below chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch consistent below chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/consistent-optimal - Get ESRs with consistent optimal pressure (0.2-0.7 for all 7 days)
router.get("/pressure/consistent-optimal", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRConsistentOptimalPressure(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching consistent optimal pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch consistent optimal pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/consistent-above - Get ESRs with consistent above optimal pressure (>0.7 for all 7 days)
router.get("/pressure/consistent-above", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRConsistentAbovePressure(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching consistent above pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch consistent above pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/consistent-below - Get ESRs with consistent below optimal pressure (<0.2 for all 7 days)
router.get("/pressure/consistent-below", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRConsistentBelowPressure(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching consistent below pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch consistent below pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/lpcd/average-above-55 - Get villages with average LPCD above 55
router.get("/lpcd/average-above-55", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const villages = await getVillagesAverageLPCDAbove55(region, schemeId);
    
    res.json({
      count: villages.length,
      data: villages
    });
  } catch (error) {
    console.error("Error fetching average LPCD above 55 villages:", error);
    res.status(500).json({
      error: "Failed to fetch average LPCD above 55 villages",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/lpcd/average-below-55 - Get villages with average LPCD below 55
router.get("/lpcd/average-below-55", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const villages = await getVillagesAverageLPCDBelow55(region, schemeId);
    
    res.json({
      count: villages.length,
      data: villages
    });
  } catch (error) {
    console.error("Error fetching average LPCD below 55 villages:", error);
    res.status(500).json({
      error: "Failed to fetch average LPCD below 55 villages",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/average-optimal - Get ESRs with average chlorine in optimal range (0.2-0.5 mg/L)
router.get("/chlorine/average-optimal", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAverageChlorineOptimal(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching average optimal chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch average optimal chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/average-below - Get ESRs with average chlorine below optimal (<0.2 mg/L)
router.get("/chlorine/average-below", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAverageChlorineBelow(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching average below optimal chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch average below optimal chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/chlorine/average-above - Get ESRs with average chlorine above optimal (>0.5 mg/L)
router.get("/chlorine/average-above", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAverageChlorineAbove(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching average above optimal chlorine ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch average above optimal chlorine ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/average-optimal - Get ESRs with average pressure in optimal range (0.2-0.7 bar)
router.get("/pressure/average-optimal", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAveragePressureOptimal(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching average optimal pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch average optimal pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/average-below - Get ESRs with average pressure below optimal (<0.2 bar)
router.get("/pressure/average-below", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAveragePressureBelow(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching average below optimal pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch average below optimal pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/category-data/pressure/average-above - Get ESRs with average pressure above optimal (>0.7 bar)
router.get("/pressure/average-above", async (req, res) => {
  try {
    const region = req.query.region as string | undefined;
    const schemeId = req.query.schemeId as string | undefined;
    
    const esrs = await getESRAveragePressureAbove(region, schemeId);
    
    res.json({
      count: esrs.length,
      data: esrs
    });
  } catch (error) {
    console.error("Error fetching average above optimal pressure ESRs:", error);
    res.status(500).json({
      error: "Failed to fetch average above optimal pressure ESRs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper function to get ESR capacity data
const getESRCapacityData = async (region?: string, schemeId?: string, village?: string) => {
  const db = await getDB();
  
  const whereConditions = [
    isNotNull(waterConsumption.esr_capacity)
  ];

  if (region) {
    whereConditions.push(ilike(waterConsumption.region, region));
  }
  
  if (schemeId) {
    // Check if schemeId is actually a scheme name (contains letters/spaces) or a numeric ID
    if (/^[0-9]+$/.test(schemeId)) {
      // It's a numeric scheme_id
      whereConditions.push(eq(waterConsumption.scheme_id, schemeId));
    } else {
      // It's a scheme name - use case-insensitive matching
      whereConditions.push(ilike(waterConsumption.scheme_name, `%${schemeId}%`));
    }
  }

  if (village) {
    whereConditions.push(ilike(waterConsumption.village_name, `%${village}%`));
  }
  
  const query = db
    .select({
      region: waterConsumption.region,
      circle: waterConsumption.circle,
      division: waterConsumption.division,
      sub_division: waterConsumption.sub_division,
      block: waterConsumption.block,
      scheme_id: waterConsumption.scheme_id,
      scheme_name: waterConsumption.scheme_name,
      village_name: waterConsumption.village_name,
      esr_name: waterConsumption.esr_name,
      esr_capacity: waterConsumption.esr_capacity
    })
    .from(waterConsumption)
    .where(and(...whereConditions))
    .orderBy(waterConsumption.region, waterConsumption.scheme_name, waterConsumption.village_name, waterConsumption.esr_name);

  const results = await query;
  
  // Calculate total capacity
  const totalCapacity = results.reduce((sum: number, esr: any) => {
    const capacity = parseFloat(esr.esr_capacity || '0');
    return sum + capacity;
  }, 0);

  // Calculate aggregate sums by region, scheme, and village
  const sumByRegion: { [key: string]: number } = {};
  const sumByScheme: { [key: string]: number } = {};
  const sumByVillage: { [key: string]: number } = {};

  results.forEach((esr: any) => {
    const capacity = parseFloat(esr.esr_capacity || '0');
    
    // Sum by region
    if (esr.region) {
      sumByRegion[esr.region] = (sumByRegion[esr.region] || 0) + capacity;
    }
    
    // Sum by scheme
    if (esr.scheme_name) {
      sumByScheme[esr.scheme_name] = (sumByScheme[esr.scheme_name] || 0) + capacity;
    }
    
    // Sum by village
    if (esr.village_name) {
      const villageKey = `${esr.village_name} (${esr.scheme_name})`;
      sumByVillage[villageKey] = (sumByVillage[villageKey] || 0) + capacity;
    }
  });

  return {
    esrData: results,
    totalCapacity: totalCapacity,
    totalEsrs: results.length,
    sumByRegion: sumByRegion,
    sumByScheme: sumByScheme,
    sumByVillage: sumByVillage
  };
};

export default router;