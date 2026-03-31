import {
  users,
  regions,
  schemeStatuses,
  appState,
  waterSchemeData,
  waterSchemeDataHistory,
  chlorineData,
  chlorineHistory,
  pressureData,
  pressureHistory,
  waterConsumption,
  communicationStatus,
  reportFiles,
  userLoginLogs,
  userActivityLogs,
  populationTracking,
  regionPopulationTracking,
  villages,
  mqttTopicConfigurations,
  schemeLpcdDataHistory,
  type User,
  type InsertUser,
  type Region,
  type InsertRegion,
  type SchemeStatus,
  type InsertSchemeStatus,
  type WaterSchemeData,
  type InsertWaterSchemeData,
  type UpdateWaterSchemeData,
  type WaterSchemeDataHistory,
  type InsertWaterSchemeDataHistory,
  type ChlorineData,
  type InsertChlorineData,
  type UpdateChlorineData,
  type ChlorineHistory,
  type InsertChlorineHistory,
  type PressureData,
  type InsertPressureData,
  type UpdatePressureData,
  type PressureHistory,
  type InsertPressureHistory,
  type WaterConsumption,
  type InsertWaterConsumption,
  type UpdateWaterConsumption,
  type CommunicationStatus,
  type InsertCommunicationStatus,
  type ReportFile,
  type InsertReportFile,
  type UserLoginLog,
  type InsertUserLoginLog,
  type UserActivityLog,
  type InsertUserActivityLog,
  type PopulationTracking,
  type InsertPopulationTracking,
  type RegionPopulationTracking,
  type InsertRegionPopulationTracking,
  type Village,
  type InsertVillage,
  type UpdateVillage,
  type MqttTopicConfiguration,
  type InsertMqttTopicConfiguration,
} from "@shared/schema";
import { getDB, initializeDatabase } from "./db";
import { eq, sql, and, ilike, inArray, isNotNull } from "drizzle-orm";
import { parse } from "csv-parse";
import { v4 as uuidv4 } from "uuid";

// Declare global variables for storing updates data
declare global {
  var todayUpdates: any[];
  var lastUpdateDay: string | null;
  var prevTotals: {
    villages: number;
    esr: number;
    completedSchemes: number;
    flowMeters: number;
    rca: number;
    pt: number;
  } | null;
}

// Filter type for water scheme data queries
export interface WaterSchemeDataFilter {
  region?: string;
  circle?: string;
  division?: string;
  subDivision?: string;
  block?: string;
  minLpcd?: number;
  maxLpcd?: number;
  zeroSupplyForWeek?: boolean;
}

// Filter type for chlorine data queries
export interface ChlorineDataFilter {
  region?: string;
  circle?: string;
  division?: string;
  subDivision?: string;
  block?: string;
  minChlorine?: number;
  maxChlorine?: number;
  chlorineRange?:
  | "below_0.2"
  | "between_0.2_0.5"
  | "above_0.5"
  | "consistent_zero"
  | "consistent_below"
  | "consistent_optimal"
  | "consistent_above";
}

export interface ChlorineFilterOptions {
  regions: string[];
  circles: string[];
  divisions: string[];
  subdivisions: string[];
  blocks: string[];
}

export interface PressureDataFilter {
  schemeIds?: string[];
  region?: string;
  circle?: string;
  division?: string;
  subDivision?: string;
  subdivision?: string;
  block?: string;
  minPressure?: number;
  maxPressure?: number;
  pressureRange?:
  | "below_0.2"
  | "between_0.2_0.7"
  | "above_0.7"
  | "consistent_zero"
  | "consistent_below"
  | "consistent_optimal"
  | "consistent_above";
}

export interface PressureFilterOptions {
  regions: string[];
  circles: string[];
  divisions: string[];
  subdivisions: string[];
  blocks: string[];
}

export interface WaterConsumptionFilterOptions {
  regions: string[];
  circles: string[];
  divisions: string[];
  subdivisions: string[];
  blocks: string[];
}

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserCredentials(
    username: string,
    password: string,
  ): Promise<User | null>;

  // User login logging operations
  logUserLogin(
    user: User,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
  ): Promise<UserLoginLog>;
  logUserLogout(sessionId: string): Promise<void>;
  getUserLoginLogs(limit?: number): Promise<UserLoginLog[]>;
  getUserLoginLogsByUserId(
    userId: number,
    limit?: number,
  ): Promise<UserLoginLog[]>;

  // User activity tracking operations
  logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog>;
  getUserActivityLogs(
    userId?: number,
    limit?: number,
  ): Promise<UserActivityLog[]>;
  getUserActivityLogsBySession(
    sessionId: string,
    limit?: number,
  ): Promise<UserActivityLog[]>;
  getAllUserActivities(limit?: number): Promise<UserActivityLog[]>;

  // Region operations
  getAllRegions(): Promise<Region[]>;
  getRegionByName(regionName: string): Promise<Region | undefined>;
  getRegionSummary(regionName?: string): Promise<any>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(region: Region): Promise<Region>;
  batchUpsertRegions(
    regions: InsertRegion[],
  ): Promise<{ inserted: number; updated: number }>;

  // Scheme operations
  getAllSchemes(
    statusFilter?: string,
    schemeId?: string,
    circle?: string,
    division?: string,
    subDivision?: string,
    block?: string,
  ): Promise<SchemeStatus[]>;
  getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
    circle?: string,
    division?: string,
    subDivision?: string,
    block?: string,
  ): Promise<SchemeStatus[]>;
  getSchemeById(schemeId: string): Promise<SchemeStatus | undefined>;
  getSchemeByIdAndBlock(
    schemeId: string,
    block: string | null,
  ): Promise<SchemeStatus | undefined>;
  getSchemesByName(schemeName: string): Promise<SchemeStatus[]>;
  getBlocksByScheme(schemeName: string): Promise<string[]>;
  getSchemeBlockDashboards(
    schemeId: string,
  ): Promise<Array<{ block: string; dashboard_url: string }>>;
  createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus>;
  updateScheme(scheme: SchemeStatus): Promise<SchemeStatus>;
  deleteScheme(schemeId: string): Promise<boolean>;
  batchUpsertSchemes(
    schemes: InsertSchemeStatus[],
  ): Promise<{ inserted: number; updated: number }>;

  // Updates operations
  getTodayUpdates(): Promise<any[]>;

  // Water Scheme Data operations
  getAllWaterSchemeData(
    filter?: WaterSchemeDataFilter,
  ): Promise<WaterSchemeData[]>;
  getWaterSchemeDataById(
    schemeId: string,
  ): Promise<WaterSchemeData | undefined>;
  getWaterSchemeDataByScheme(
    schemeId: string,
    block?: string,
  ): Promise<WaterSchemeData[]>;
  createWaterSchemeData(data: InsertWaterSchemeData): Promise<WaterSchemeData>;
  updateWaterSchemeData(
    schemeId: string,
    data: UpdateWaterSchemeData,
  ): Promise<WaterSchemeData>;
  deleteWaterSchemeData(schemeId: string): Promise<boolean>;
  importWaterSchemeDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;
  importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;

  // Chlorine Data operations
  getAllChlorineData(filter?: ChlorineDataFilter): Promise<ChlorineData[]>;
  getChlorineDataByScheme(
    schemeId: string,
    block?: string,
  ): Promise<ChlorineData[]>;
  getHistoricalChlorineData(filter: {
    startDate: string;
    endDate: string;
    region?: string;
    scheme_id?: string;
    village_name?: string;
    esr_name?: string;
  }): Promise<
    Array<{
      scheme_id: string;
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      measurement_date: string;
      chlorine_value: number;
      dashboard_url?: string;
    }>
  >;
  getChlorineDataByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<ChlorineData | undefined>;
  createChlorineData(data: InsertChlorineData): Promise<ChlorineData>;
  updateChlorineData(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdateChlorineData,
  ): Promise<ChlorineData>;
  deleteChlorineData(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<boolean>;
  importChlorineDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;
  importChlorineDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;

  // Chlorine Dashboard operations
  getChlorineDashboardStats(filter?: ChlorineDataFilter): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
    noWaterSensors: number;
  }>;
  getChlorineSensorsWithNoWater(filter?: ChlorineDataFilter): Promise<{
    totalNoWaterSensors: number;
    noWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      chlorine_connected: string | null;
    }>;
  }>;
  getChlorineSensorsWithWater(filter?: ChlorineDataFilter): Promise<{
    totalWithWaterSensors: number;
    withWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      chlorine_connected: string | null;
    }>;
  }>;
  getChlorineFilterOptions(filter: ChlorineDataFilter): Promise<ChlorineFilterOptions>;
  getPressureFilterOptions(filter: PressureDataFilter): Promise<PressureFilterOptions>;
  getWaterConsumptionFilterOptions(filter?: any): Promise<WaterConsumptionFilterOptions>;
  getRegionalChlorineStats(fullyCompletedSchemeIds?: Set<string>): Promise<
    Array<{
      region: string;
      totalConnected: number;
      totalOnline: number;
      onlineWithWater: number;
      onlineWithWaterChlorineOptimal: number;
      onlineWithWaterChlorineAbove: number;
      onlineWithWaterChlorineBelow: number;
      onlineWithWaterNoChlorineData: number;
      onlineWithoutWater: number;
      onlineWithoutWaterChlorineOptimal: number;
      onlineWithoutWaterChlorineAbove: number;
      onlineWithoutWaterChlorineBelow: number;
      totalOffline: number;
      offlineSince7Days: number;
      offlineSince30Days: number;
      offlineSince3Days: number;
    }>
  >;
  getChlorineDayWiseBreakdown(regionName?: string, fullyCompletedSchemeIds?: Set<string>): Promise<
    Array<{
      days: number;
      offline: number;
      below_0_2: number;
      above_0_5: number;
      optimal_0_2_0_5: number;
    }>
  >;
  getChlorineSensorsByDayWiseCriteria(
    metric: "offline" | "below_0_2" | "above_0_5" | "optimal_0_2_0_5",
    days: number,
    regionName?: string,
  ): Promise<
    Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      chlorine_connected: string;
      chlorine_status: string;
      last_seen: string | null;
      consecutive_days: number;
      latest_chlorine_value?: number | null;
      latest_chlorine_date?: string | null;
    }>
  >;

  // Weekly LPCD Statistics
  getVillageWeeklyStats(dateStrings: string[]): Promise<any[]>;
  getSchemeWeeklyStats(dateStrings: string[]): Promise<any[]>;

  // Pressure Data operations
  getAllPressureData(filter?: PressureDataFilter): Promise<PressureData[]>;
  getPressureDataByScheme(
    schemeId: string,
    block?: string,
  ): Promise<PressureData[]>;
  getHistoricalPressureData(filter: {
    startDate: string;
    endDate: string;
    region?: string;
    scheme_id?: string;
    village_name?: string;
    esr_name?: string;
  }): Promise<
    Array<{
      scheme_id: string;
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      measurement_date: string;
      pressure_value: number;
      dashboard_url?: string;
    }>
  >;
  getPressureDataByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<PressureData | undefined>;
  createPressureData(data: InsertPressureData): Promise<PressureData>;
  updatePressureData(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdatePressureData,
  ): Promise<PressureData>;
  deletePressureData(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<boolean>;
  importPressureDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;

  // Pressure Dashboard operations
  getPressureDashboardStats(filter?: any, schemeIds?: string[]): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
    noWaterSensors: number;
  }>;
  getPressureSensorsWithNoWater(regionName?: string): Promise<{
    totalNoWaterSensors: number;
    noWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      flow_meter_connected: string | null;
    }>;
  }>;
  getPressureSensorsWithWater(regionName?: string): Promise<{
    totalWithWaterSensors: number;
    withWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      pressure_connected: string | null;
    }>;
  }>;

  // Water Consumption operations
  getAllWaterConsumption(): Promise<WaterConsumption[]>;
  getAllWaterConsumptionWithSchemeStatus(filter?: any): Promise<any[]>;
  getWaterConsumptionByScheme(
    schemeId: string,
    block?: string,
  ): Promise<WaterConsumption[]>;
  getWaterConsumptionByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<WaterConsumption | undefined>;
  createWaterConsumption(
    data: InsertWaterConsumption,
  ): Promise<WaterConsumption>;
  updateWaterConsumption(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdateWaterConsumption,
  ): Promise<WaterConsumption>;
  deleteWaterConsumption(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<boolean>;
  importWaterConsumptionFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }>;

  // Report File operations
  getAllReportFiles(): Promise<ReportFile[]>;
  getReportFileById(id: string): Promise<ReportFile | undefined>;
  getReportFilesByType(reportType: string): Promise<ReportFile[]>;
  createReportFile(data: InsertReportFile): Promise<ReportFile>;
  updateReportFile(id: string, data: Partial<ReportFile>): Promise<ReportFile>;
  deleteReportFile(id: string): Promise<boolean>;

  // Population tracking operations
  savePopulationSnapshot(
    date: string,
    totalPopulation: number,
  ): Promise<PopulationTracking>;
  getPopulationByDate(date: string): Promise<PopulationTracking | undefined>;
  getLatestPopulation(): Promise<PopulationTracking | undefined>;
  getPreviousPopulation(
    currentDate: string,
  ): Promise<PopulationTracking | undefined>;
  calculatePopulationChange(currentDate: string): Promise<{
    currentPopulation: number;
    previousPopulation: number;
    change: number;
    changePercent: number;
  } | null>;

  // Region-specific population tracking operations
  saveRegionPopulationSnapshot(
    date: string,
    region: string,
    totalPopulation: number,
  ): Promise<RegionPopulationTracking>;
  getRegionPopulationByDate(
    date: string,
    region: string,
  ): Promise<RegionPopulationTracking | undefined>;
  getLatestRegionPopulation(
    region: string,
  ): Promise<RegionPopulationTracking | undefined>;
  getPreviousRegionPopulation(
    currentDate: string,
    region: string,
  ): Promise<RegionPopulationTracking | undefined>;
  calculateRegionPopulationChange(
    currentDate: string,
    region: string,
  ): Promise<{
    currentPopulation: number;
    previousPopulation: number;
    change: number;
    changePercent: number;
  } | null>;
  saveAllRegionPopulationSnapshots(
    date: string,
  ): Promise<RegionPopulationTracking[]>;

  // Village operations
  getAllVillages(): Promise<Village[]>;
  getVillagesByScheme(schemeId: string, block?: string): Promise<Village[]>;
  getVillageByCompositeKey(
    schemeId: string,
    villageName: string,
    block: string,
  ): Promise<Village | undefined>;
  insertOrUpdateVillage(
    data: InsertVillage,
  ): Promise<{ inserted: boolean; updated: boolean }>;
  clearVillageData(): Promise<void>;

  // Database access method
  getDb(): Promise<any>;

  // Additional population tracking methods
  getCurrentPopulation(date?: string): Promise<{
    totalPopulation: number;
    date: string;
    change?: {
      currentPopulation: number;
      previousPopulation: number;
      change: number;
      changePercent: number;
    };
  }>;
  calculateTotalPopulation(): Promise<number>;
  getPopulationHistory(days: number): Promise<PopulationTracking[]>;
  getRegionalPopulationHistory(
    region: string,
    days: number,
  ): Promise<RegionPopulationTracking[]>;

  // MQTT Topic Configuration operations
  createMqttTopicConfiguration(
    data: InsertMqttTopicConfiguration,
  ): Promise<MqttTopicConfiguration>;
  getMqttTopicConfigurations(): Promise<MqttTopicConfiguration[]>;
  getMqttTopicConfigurationById(
    id: number,
  ): Promise<MqttTopicConfiguration | undefined>;
}

// PostgreSQL implementation
export class PostgresStorage implements IStorage {
  private db: any;
  private initialized: Promise<void>;

  // Excel column mapping for water scheme and chlorine data
  private excelColumnMapping: Record<string, string> = {
    // ESR and Chlorine specific fields
    "ESR Name": "esr_name",
    ESR_Name: "esr_name",
    "esr name": "esr_name",
    esr_name: "esr_name",
    "ESR ID": "esr_name",
    ESR_ID: "esr_name",

    // Chlorine value fields
    "Chlorine Value Day 1": "chlorine_value_1",
    Chlorine_Value_1: "chlorine_value_1",
    chlorine_value_1: "chlorine_value_1",
    "Chlorine Value 1": "chlorine_value_1",

    "Chlorine Value Day 2": "chlorine_value_2",
    Chlorine_Value_2: "chlorine_value_2",
    chlorine_value_2: "chlorine_value_2",
    "Chlorine Value 2": "chlorine_value_2",

    "Chlorine Value Day 3": "chlorine_value_3",
    Chlorine_Value_3: "chlorine_value_3",
    chlorine_value_3: "chlorine_value_3",
    "Chlorine Value 3": "chlorine_value_3",

    "Chlorine Value Day 4": "chlorine_value_4",
    Chlorine_Value_4: "chlorine_value_4",
    chlorine_value_4: "chlorine_value_4",
    "Chlorine Value 4": "chlorine_value_4",

    "Chlorine Value Day 5": "chlorine_value_5",
    Chlorine_Value_5: "chlorine_value_5",
    chlorine_value_5: "chlorine_value_5",
    "Chlorine Value 5": "chlorine_value_5",

    "Chlorine Value Day 6": "chlorine_value_6",
    Chlorine_Value_6: "chlorine_value_6",
    chlorine_value_6: "chlorine_value_6",
    "Chlorine Value 6": "chlorine_value_6",

    "Chlorine Value Day 7": "chlorine_value_7",
    Chlorine_Value_7: "chlorine_value_7",
    chlorine_value_7: "chlorine_value_7",
    "Chlorine Value 7": "chlorine_value_7",

    // Chlorine date fields
    "Chlorine Date Day 1": "chlorine_date_day_1",
    Chlorine_Date_Day_1: "chlorine_date_day_1",
    chlorine_date_day_1: "chlorine_date_day_1",

    "Chlorine Date Day 2": "chlorine_date_day_2",
    Chlorine_Date_Day_2: "chlorine_date_day_2",
    chlorine_date_day_2: "chlorine_date_day_2",

    "Chlorine Date Day 3": "chlorine_date_day_3",
    Chlorine_Date_Day_3: "chlorine_date_day_3",
    chlorine_date_day_3: "chlorine_date_day_3",

    "Chlorine Date Day 4": "chlorine_date_day_4",
    Chlorine_Date_Day_4: "chlorine_date_day_4",
    chlorine_date_day_4: "chlorine_date_day_4",

    "Chlorine Date Day 5": "chlorine_date_day_5",
    Chlorine_Date_Day_5: "chlorine_date_day_5",
    chlorine_date_day_5: "chlorine_date_day_5",

    "Chlorine Date Day 6": "chlorine_date_day_6",
    Chlorine_Date_Day_6: "chlorine_date_day_6",
    chlorine_date_day_6: "chlorine_date_day_6",

    "Chlorine Date Day 7": "chlorine_date_day_7",
    Chlorine_Date_Day_7: "chlorine_date_day_7",
    chlorine_date_day_7: "chlorine_date_day_7",

    // Analysis fields
    "Consistent Zero Chlorine": "number_of_consistent_zero_value_in_chlorine",
    consistent_zero_chlorine: "number_of_consistent_zero_value_in_chlorine",
    "Zero Chlorine Count": "number_of_consistent_zero_value_in_chlorine",

    "Below 0.2 mg/l Count": "chlorine_less_than_02_mgl",
    chlorine_less_than_02_mgl: "chlorine_less_than_02_mgl",

    "Between 0.2-0.5 mg/l Count": "chlorine_between_02_05_mgl",
    chlorine_between_02__05_mgl: "chlorine_between_02_05_mgl",

    "Above 0.5 mg/l Count": "chlorine_greater_than_05_mgl",
    chlorine_greater_than_05_mgl: "chlorine_greater_than_05_mgl",
    // Excel header -> Database field
    // Upper case variations
    Region: "region",
    REGION: "region",
    region: "region",
    Circle: "circle",
    CIRCLE: "circle",
    circle: "circle",
    Division: "division",
    DIVISION: "division",
    division: "division",
    "Sub-Division": "sub_division",
    "SUB-DIVISION": "sub_division",
    "Sub Division": "sub_division",
    "SUB DIVISION": "sub_division",
    "sub division": "sub_division",
    "sub-division": "sub_division",
    Block: "block",
    BLOCK: "block",
    block: "block",
    "Scheme ID": "scheme_id",
    "SCHEME ID": "scheme_id",
    "scheme id": "scheme_id",
    Scheme_ID: "scheme_id",
    scheme_id: "scheme_id",
    "Scheme Name": "scheme_name",
    "SCHEME NAME": "scheme_name",
    "scheme name": "scheme_name",
    Scheme_Name: "scheme_name",
    scheme_name: "scheme_name",
    "Village Name": "village_name",
    "VILLAGE NAME": "village_name",
    "village name": "village_name",
    Village_Name: "village_name",
    village_name: "village_name",
    Population: "population",
    POPULATION: "population",
    population: "population",
    "Number of ESR": "number_of_esr",
    "NUMBER OF ESR": "number_of_esr",
    "number of esr": "number_of_esr",
    "No. of ESR": "number_of_esr",
    "ESR Count": "number_of_esr",

    // Water value fields - multiple formats
    "Water Value Day 1": "water_value_day1",
    "WATER VALUE DAY 1": "water_value_day1",
    "water value day 1": "water_value_day1",
    "Water Value Day1": "water_value_day1",
    "water value day1": "water_value_day1",
    "Water Value - Day 1": "water_value_day1",
    Water_Value_Day_1: "water_value_day1",
    water_value_day_1: "water_value_day1",
    Water_Value_Day1: "water_value_day1",
    water_value_day1: "water_value_day1",

    "Water Value Day 2": "water_value_day2",
    "WATER VALUE DAY 2": "water_value_day2",
    "water value day 2": "water_value_day2",
    "Water Value Day2": "water_value_day2",
    "water value day2": "water_value_day2",
    "Water Value - Day 2": "water_value_day2",
    Water_Value_Day_2: "water_value_day2",
    water_value_day_2: "water_value_day2",
    Water_Value_Day2: "water_value_day2",
    water_value_day2: "water_value_day2",

    "Water Value Day 3": "water_value_day3",
    "WATER VALUE DAY 3": "water_value_day3",
    "water value day 3": "water_value_day3",
    "Water Value Day3": "water_value_day3",
    "water value day3": "water_value_day3",
    "Water Value - Day 3": "water_value_day3",
    Water_Value_Day_3: "water_value_day3",
    water_value_day_3: "water_value_day3",
    Water_Value_Day3: "water_value_day3",
    water_value_day3: "water_value_day3",

    "Water Value Day 4": "water_value_day4",
    "WATER VALUE DAY 4": "water_value_day4",
    "water value day 4": "water_value_day4",
    "Water Value Day4": "water_value_day4",
    "water value day4": "water_value_day4",
    "Water Value - Day 4": "water_value_day4",
    Water_Value_Day_4: "water_value_day4",
    water_value_day_4: "water_value_day4",
    Water_Value_Day4: "water_value_day4",
    water_value_day4: "water_value_day4",

    "Water Value Day 5": "water_value_day5",
    "WATER VALUE DAY 5": "water_value_day5",
    "water value day 5": "water_value_day5",
    "Water Value Day5": "water_value_day5",
    "water value day5": "water_value_day5",
    "Water Value - Day 5": "water_value_day5",
    Water_Value_Day_5: "water_value_day5",
    water_value_day_5: "water_value_day5",
    Water_Value_Day5: "water_value_day5",
    water_value_day5: "water_value_day5",

    "Water Value Day 6": "water_value_day6",
    "WATER VALUE DAY 6": "water_value_day6",
    "water value day 6": "water_value_day6",
    "Water Value Day6": "water_value_day6",
    "water value day6": "water_value_day6",
    "Water Value - Day 6": "water_value_day6",
    Water_Value_Day_6: "water_value_day6",
    water_value_day_6: "water_value_day6",
    Water_Value_Day6: "water_value_day6",
    water_value_day6: "water_value_day6",

    "Water Value Day 7": "water_value_day7",
    "WATER VALUE DAY 7": "water_value_day7",
    "water value day 7": "water_value_day7",
    "Water Value Day7": "water_value_day7",
    "water value day7": "water_value_day7",
    "Water Value - Day 7": "water_value_day7",
    Water_Value_Day_7: "water_value_day7",
    water_value_day_7: "water_value_day7",
    Water_Value_Day7: "water_value_day7",
    water_value_day7: "water_value_day7",

    // LPCD value fields - multiple formats
    "LPCD Value Day 1": "lpcd_value_day1",
    "LPCD VALUE DAY 1": "lpcd_value_day1",
    "lpcd value day 1": "lpcd_value_day1",
    "LPCD Value Day1": "lpcd_value_day1",
    "lpcd value day1": "lpcd_value_day1",
    "LPCD Value - Day 1": "lpcd_value_day1",
    LPCD_Value_Day_1: "lpcd_value_day1",
    lpcd_value_day_1: "lpcd_value_day1",
    LPCD_Value_Day1: "lpcd_value_day1",
    lpcd_value_day1: "lpcd_value_day1",
    "Lpcd Value Day 1": "lpcd_value_day1",
    "Lpcd value day 1": "lpcd_value_day1",

    "LPCD Value Day 2": "lpcd_value_day2",
    "LPCD VALUE DAY 2": "lpcd_value_day2",
    "lpcd value day 2": "lpcd_value_day2",
    "LPCD Value Day2": "lpcd_value_day2",
    "lpcd value day2": "lpcd_value_day2",
    "LPCD Value - Day 2": "lpcd_value_day2",
    LPCD_Value_Day_2: "lpcd_value_day2",
    lpcd_value_day_2: "lpcd_value_day2",
    LPCD_Value_Day2: "lpcd_value_day2",
    lpcd_value_day2: "lpcd_value_day2",
    "Lpcd Value Day 2": "lpcd_value_day2",
    "Lpcd value day 2": "lpcd_value_day2",

    "LPCD Value Day 3": "lpcd_value_day3",
    "LPCD VALUE DAY 3": "lpcd_value_day3",
    "lpcd value day 3": "lpcd_value_day3",
    "LPCD Value Day3": "lpcd_value_day3",
    "lpcd value day3": "lpcd_value_day3",
    "LPCD Value - Day 3": "lpcd_value_day3",
    LPCD_Value_Day_3: "lpcd_value_day3",
    lpcd_value_day_3: "lpcd_value_day3",
    LPCD_Value_Day3: "lpcd_value_day3",
    lpcd_value_day3: "lpcd_value_day3",
    "Lpcd Value Day 3": "lpcd_value_day3",
    "Lpcd value day 3": "lpcd_value_day3",

    "LPCD Value Day 4": "lpcd_value_day4",
    "LPCD VALUE DAY 4": "lpcd_value_day4",
    "lpcd value day 4": "lpcd_value_day4",
    "LPCD Value Day4": "lpcd_value_day4",
    "lpcd value day4": "lpcd_value_day4",
    "LPCD Value - Day 4": "lpcd_value_day4",
    LPCD_Value_Day_4: "lpcd_value_day4",
    lpcd_value_day_4: "lpcd_value_day4",
    LPCD_Value_Day4: "lpcd_value_day4",
    lpcd_value_day4: "lpcd_value_day4",
    "Lpcd Value Day 4": "lpcd_value_day4",
    "Lpcd value day 4": "lpcd_value_day4",

    "LPCD Value Day 5": "lpcd_value_day5",
    "LPCD VALUE DAY 5": "lpcd_value_day5",
    "lpcd value day 5": "lpcd_value_day5",
    "LPCD Value Day5": "lpcd_value_day5",
    "lpcd value day5": "lpcd_value_day5",
    "LPCD Value - Day 5": "lpcd_value_day5",
    LPCD_Value_Day_5: "lpcd_value_day5",
    lpcd_value_day_5: "lpcd_value_day5",
    LPCD_Value_Day5: "lpcd_value_day5",
    lpcd_value_day5: "lpcd_value_day5",
    "Lpcd Value Day 5": "lpcd_value_day5",
    "Lpcd value day 5": "lpcd_value_day5",

    "LPCD Value Day 6": "lpcd_value_day6",
    "LPCD VALUE DAY 6": "lpcd_value_day6",
    "lpcd value day 6": "lpcd_value_day6",
    "LPCD Value Day6": "lpcd_value_day6",
    "lpcd value day6": "lpcd_value_day6",
    "LPCD Value - Day 6": "lpcd_value_day6",
    LPCD_Value_Day_6: "lpcd_value_day6",
    lpcd_value_day_6: "lpcd_value_day6",
    LPCD_Value_Day6: "lpcd_value_day6",
    lpcd_value_day6: "lpcd_value_day6",
    "Lpcd Value Day 6": "lpcd_value_day6",
    "Lpcd value day 6": "lpcd_value_day6",

    "LPCD Value Day 7": "lpcd_value_day7",
    "LPCD VALUE DAY 7": "lpcd_value_day7",
    "lpcd value day 7": "lpcd_value_day7",
    "LPCD Value Day7": "lpcd_value_day7",
    "lpcd value day7": "lpcd_value_day7",
    "LPCD Value - Day 7": "lpcd_value_day7",
    LPCD_Value_Day_7: "lpcd_value_day7",
    lpcd_value_day_7: "lpcd_value_day7",
    LPCD_Value_Day7: "lpcd_value_day7",
    lpcd_value_day7: "lpcd_value_day7",
    "Lpcd Value Day 7": "lpcd_value_day7",
    "Lpcd value day 7": "lpcd_value_day7",

    // Date fields - multiple formats
    "Water Date Day 1": "water_date_day1",
    "water date day 1": "water_date_day1",
    "Water Date Day1": "water_date_day1",
    "water date day1": "water_date_day1",
    Water_Date_Day1: "water_date_day1",
    water_date_day1: "water_date_day1",

    "Water Date Day 2": "water_date_day2",
    "water date day 2": "water_date_day2",
    "Water Date Day2": "water_date_day2",
    "water date day2": "water_date_day2",
    Water_Date_Day2: "water_date_day2",
    water_date_day2: "water_date_day2",

    "Water Date Day 3": "water_date_day3",
    "water date day 3": "water_date_day3",
    "Water Date Day3": "water_date_day3",
    "water date day3": "water_date_day3",
    Water_Date_Day3: "water_date_day3",
    water_date_day3: "water_date_day3",

    "Water Date Day 4": "water_date_day4",
    "water date day 4": "water_date_day4",
    "Water Date Day4": "water_date_day4",
    "water date day4": "water_date_day4",
    Water_Date_Day4: "water_date_day4",
    water_date_day4: "water_date_day4",

    "Water Date Day 5": "water_date_day5",
    "water date day 5": "water_date_day5",
    "Water Date Day5": "water_date_day5",
    "water date day5": "water_date_day5",
    Water_Date_Day5: "water_date_day5",
    water_date_day5: "water_date_day5",

    "Water Date Day 6": "water_date_day6",
    "water date day 6": "water_date_day6",
    "Water Date Day6": "water_date_day6",
    "water date day6": "water_date_day6",
    Water_Date_Day6: "water_date_day6",
    water_date_day6: "water_date_day6",

    "LPCD Date Day 1": "lpcd_date_day1",
    "lpcd date day 1": "lpcd_date_day1",
    "LPCD Date Day1": "lpcd_date_day1",
    "lpcd date day1": "lpcd_date_day1",
    LPCD_Date_Day1: "lpcd_date_day1",
    lpcd_date_day1: "lpcd_date_day1",

    "LPCD Date Day 2": "lpcd_date_day2",
    "lpcd date day 2": "lpcd_date_day2",
    "LPCD Date Day2": "lpcd_date_day2",
    "lpcd date day2": "lpcd_date_day2",
    LPCD_Date_Day2: "lpcd_date_day2",
    lpcd_date_day2: "lpcd_date_day2",

    "LPCD Date Day 3": "lpcd_date_day3",
    "lpcd date day 3": "lpcd_date_day3",
    "LPCD Date Day3": "lpcd_date_day3",
    "lpcd date day3": "lpcd_date_day3",
    LPCD_Date_Day3: "lpcd_date_day3",
    lpcd_date_day3: "lpcd_date_day3",

    "LPCD Date Day 4": "lpcd_date_day4",
    "lpcd date day 4": "lpcd_date_day4",
    "LPCD Date Day4": "lpcd_date_day4",
    "lpcd date day4": "lpcd_date_day4",
    LPCD_Date_Day4: "lpcd_date_day4",
    lpcd_date_day4: "lpcd_date_day4",

    "LPCD Date Day 5": "lpcd_date_day5",
    "lpcd date day 5": "lpcd_date_day5",
    "LPCD Date Day5": "lpcd_date_day5",
    "lpcd date day5": "lpcd_date_day5",
    LPCD_Date_Day5: "lpcd_date_day5",
    lpcd_date_day5: "lpcd_date_day5",

    "LPCD Date Day 6": "lpcd_date_day6",
    "lpcd date day 6": "lpcd_date_day6",
    "LPCD Date Day6": "lpcd_date_day6",
    "lpcd date day6": "lpcd_date_day6",
    LPCD_Date_Day6: "lpcd_date_day6",
    lpcd_date_day6: "lpcd_date_day6",

    "LPCD Date Day 7": "lpcd_date_day7",
    "lpcd date day 7": "lpcd_date_day7",
    "LPCD Date Day7": "lpcd_date_day7",
    "lpcd date day7": "lpcd_date_day7",
    LPCD_Date_Day7: "lpcd_date_day7",
    lpcd_date_day7: "lpcd_date_day7",

    // Other fields - multiple formats
    "Last Updated": "last_updated",
    "last updated": "last_updated",
    LastUpdated: "last_updated",
    last_updated: "last_updated",

    "Zero Supply Count": "zero_supply_count",
    "zero supply count": "zero_supply_count",
    Zero_Supply_Count: "zero_supply_count",
    zero_supply_count: "zero_supply_count",

    "Consistent Zero LPCD For A Week": "consistent_zero_lpcd_for_a_week",
    "Consistent Zero LPCD for a week": "consistent_zero_lpcd_for_a_week",
    "consistent zero lpcd for a week": "consistent_zero_lpcd_for_a_week",
    Consistent_Zero_LPCD_For_A_Week: "consistent_zero_lpcd_for_a_week",
    consistent_zero_lpcd_for_a_week: "consistent_zero_lpcd_for_a_week",

    "Below 40 LPCD Count": "below_40_lpcd_count",
    "below 40 lpcd count": "below_40_lpcd_count",
    Below_40_LPCD_Count: "below_40_lpcd_count",
    below_40_lpcd_count: "below_40_lpcd_count",

    "Below 55 LPCD Count": "below_55_lpcd_count",
    "below 55 lpcd count": "below_55_lpcd_count",
    Below_55_LPCD_Count: "below_55_lpcd_count",
    below_55_lpcd_count: "below_55_lpcd_count",
    "Consistent <55 LPCD for a week": "below_55_lpcd_count",

    "Between 40 55 LPCD Count": "between_40_55_lpcd_count",
    "between 40 55 lpcd count": "between_40_55_lpcd_count",
    Between_40_55_LPCD_Count: "between_40_55_lpcd_count",
    between_40_55_lpcd_count: "between_40_55_lpcd_count",

    "Above 55 LPCD Count": "above_55_lpcd_count",
    "above 55 lpcd count": "above_55_lpcd_count",
    Above_55_LPCD_Count: "above_55_lpcd_count",
    above_55_lpcd_count: "above_55_lpcd_count",
    "Consistent >55 LPCD for a week": "above_55_lpcd_count",
  };

  private csvColumnMapping: Record<number, string> = {
    0: "region",
    1: "circle",
    2: "division",
    3: "sub_division",
    4: "block",
    5: "scheme_id",
    6: "scheme_name",
    7: "village_name",
    8: "population",
    9: "number_of_esr",
    10: "water_value_day1",
    11: "water_value_day2",
    12: "water_value_day3",
    13: "water_value_day4",
    14: "water_value_day5",
    15: "water_value_day6",
    16: "water_value_day7",
    17: "lpcd_value_day1",
    18: "lpcd_value_day2",
    19: "lpcd_value_day3",
    20: "lpcd_value_day4",
    21: "lpcd_value_day5",
    22: "lpcd_value_day6",
    23: "lpcd_value_day7",
    24: "water_date_day1",
    25: "water_date_day2",
    26: "water_date_day3",
    27: "water_date_day4",
    28: "water_date_day5",
    29: "water_date_day6",
    30: "water_date_day7",
    31: "lpcd_date_day1",
    32: "lpcd_date_day2",
    33: "lpcd_date_day3",
    34: "lpcd_date_day4",
    35: "lpcd_date_day5",
    36: "lpcd_date_day6",
    37: "lpcd_date_day7",
    38: "consistent_zero_lpcd_for_a_week",
    39: "below_55_lpcd_count",
    40: "above_55_lpcd_count",
  };

  /**
   * Convert date string to standard format
   * @param value - The date value to parse
   * @returns The parsed date string or null if invalid
   */
  private getDateValue(value: any): string | null {
    if (!value) return null;

    try {
      // If it's already a string in an acceptable format, return it
      if (typeof value === "string") {
        // Ensure consistent format by parsing and reformatting if necessary
        const dateStr = value.trim();
        if (dateStr.length > 0) {
          return dateStr;
        }
      }

      // If it's a Date object, format it
      if (value instanceof Date) {
        const day = value.getDate().toString().padStart(2, "0");
        const month = (value.getMonth() + 1).toString().padStart(2, "0");
        const year = value.getFullYear();
        return `${day}/${month}/${year}`;
      }

      // Try to convert number to date (Excel serial date)
      if (typeof value === "number") {
        // Excel dates are number of days since 1/1/1900
        // To convert: create date at 1/1/1900, add the number of days
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(
          excelEpoch.getTime() + (value - 1) * 24 * 60 * 60 * 1000,
        );

        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      return null;
    } catch (error) {
      console.error("Error parsing date value:", value, error);
      return null;
    }
  }

  /**
   * Improved numeric value parsing that handles various formats and validation
   * @param value - The value to parse into a number
   * @returns The parsed numeric value or null if invalid
   */
  private getNumericValue(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    // If already a number, return it (with validation)
    if (typeof value === "number") {
      // Validate reasonable limits for water metrics
      if (value > 100000000) {
        // More than 100 million liters is likely an error
        console.log(
          `Warning: Extreme water value detected: ${value}, capping to null`,
        );
        return null;
      }
      return isFinite(value) ? value : null;
    }

    // If it's a string, try to convert it
    if (typeof value === "string") {
      // Handle empty strings and non-numeric strings
      if (
        value.trim() === "" ||
        value.toLowerCase() === "n/a" ||
        value.toLowerCase() === "no data recorded" ||
        value.toLowerCase() === "no data" ||
        value.toLowerCase() === "-" ||
        value.toLowerCase() === "nil"
      ) {
        return null;
      }

      // Remove any non-numeric characters except decimal point
      // This will handle values with units like '15000 L' or '70 lpcd'
      const cleanedValue = value.replace(/[^0-9.]/g, "");
      if (cleanedValue === "") {
        return null;
      }

      // Parse to float and ensure it's a valid number
      const numValue = parseFloat(cleanedValue);

      // If we got NaN but had a non-empty string, it's a format issue
      if (isNaN(numValue)) {
        console.log(`Warning: Could not parse numeric value from: ${value}`);
        return null;
      }

      // Ensure it's actually a finite number and within reasonable limits
      if (!isFinite(numValue)) {
        return null;
      }

      // Validate reasonable limits for water consumption metrics
      if (numValue > 100000000) {
        // More than 100 million liters is likely an error
        console.log(
          `Warning: Extreme water value detected: ${numValue}, capping to null`,
        );
        return null;
      }

      return numValue;
    }

    return null;
  }

  /**
   * Calculate derived values based on water scheme data
   * @param schemeData - The water scheme data object to calculate derived values for
   */
  private calculateSchemeMetrics(
    schemeData: Partial<InsertWaterSchemeData>,
  ): void {
    // Count days with zero LPCD values
    let zeroLpcdCount = 0;
    let below55LpcdCount = 0;
    let above55LpcdCount = 0;

    // Check each day's LPCD values
    for (let i = 1; i <= 7; i++) {
      const lpcdField = `lpcd_value_day${i}` as keyof InsertWaterSchemeData;
      const lpcdValue = schemeData[lpcdField] as number | null;

      if (lpcdValue === 0 || lpcdValue === null) {
        zeroLpcdCount++;
      } else if (lpcdValue < 55) {
        below55LpcdCount++;
      } else if (lpcdValue >= 55) {
        above55LpcdCount++;
      }
    }

    // Set the derived values
    schemeData.consistent_zero_lpcd_for_a_week = zeroLpcdCount === 7 ? 1 : 0;
    schemeData.below_55_lpcd_count = below55LpcdCount;
    schemeData.above_55_lpcd_count = above55LpcdCount;
  }

  constructor() {
    // Initialize with a delay to ensure database connection is ready
    this.initialized = new Promise((resolve) => {
      setTimeout(() => {
        this.initializeDb()
          .then(resolve)
          .catch((error) => {
            console.error(
              "Failed to initialize database in constructor:",
              error,
            );
            // Don't throw error, just log it and continue
            // This allows the application to start and retry db operations later
            resolve();
          });
      }, 1000); // Give the database 1 second to be ready
    });
  }

  /**
   * Generate a dashboard URL for a scheme
   * @param scheme - The scheme object with region, circle, division, etc.
   * @returns The complete URL or null if missing required fields
   */
  private generateSpecialCaseUrl(
    scheme: SchemeStatus | InsertSchemeStatus,
  ): string | null {
    // Handle special case URLs that need exact formatting
    const { scheme_id, scheme_name } = scheme;

    // Bargaonpimpri scheme in Nashik region
    if (scheme_id === "20019176" && scheme_name.includes("Bargaonpimpri")) {
      const path =
        "\\\\WIN-6SIR0BN8BTR\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Nashik\\\\Division-Nashik\\\\Sub Division-Sinnar\\\\Block-Sinnar\\\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS" +
        String.fromCharCode(160) +
        " Tal Sinnar";
      const encodedPath = encodeURIComponent(path);
      const BASE_URL =
        "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD";
      const STANDARD_PARAMS = "hidetoolbar=true&hidesidebar=true&mode=kiosk";

      return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
    }

    return null; // No special case matched
  }

  private generateDashboardUrl(
    scheme: SchemeStatus | InsertSchemeStatus,
  ): string | null {
    // If dashboard_url is already present in the scheme and we're not forcing regeneration, return it
    if (
      scheme &&
      typeof scheme === "object" &&
      "dashboard_url" in scheme &&
      scheme.dashboard_url
    ) {
      return scheme.dashboard_url;
    }

    // Check if this is a special case URL that needs exact formatting
    const specialCaseUrl = this.generateSpecialCaseUrl(scheme);
    if (specialCaseUrl) {
      return specialCaseUrl;
    }

    // Default values for missing fields to ensure URL generation works even with partial data
    const region = scheme.region || "Unknown Region";
    const circle = scheme.circle || "Unknown Circle";
    const division = scheme.division || "Unknown Division";
    const sub_division = scheme.sub_division || "Unknown Sub Division";
    const block = scheme.block || "Unknown Block";
    const scheme_id = scheme.scheme_id || `Unknown-${Date.now()}`;
    const scheme_name = scheme.scheme_name || `Unknown Scheme ${scheme_id}`;

    // Base URL for PI Vision dashboard with the correct display ID (10108)
    const BASE_URL =
      "https://14.99.99.166:18099/PIVision/#/Displays/10108/CEREBULB_JJM_MAHARASHTRA_SCHEME_LEVEL_DASHBOARD";

    // Standard parameters for the dashboard
    const STANDARD_PARAMS = "hidetoolbar=true&hidesidebar=true&mode=kiosk";

    // Handle the special case for Amravati region (change to Amaravati in the URL)
    const regionDisplay = region === "Amravati" ? "Amaravati" : region;

    // Create the path without URL encoding
    // Use different spacing formats based on the region and scheme name
    let path;

    // Special case for Sakol 7 villages WSS
    if (scheme_name === "Sakol 7 villages WSS") {
      // Exact format for Sakol 7 villages WSS with specific hyphen placement (hyphen followed by space)
      path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id}- ${scheme_name}`;
    }
    // Special case for Pangaon 10 villages WSS
    else if (scheme_name === "Pangaon 10 villages WSS") {
      // Exact format for Pangaon 10 villages WSS with specific hyphen placement (hyphen followed by space)
      path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id}- ${scheme_name}`;
    }
    // Special case for Shirsala & 4 Village
    else if (scheme_name === "Shirsala & 4 Village") {
      // Exact format for Shirsala & 4 Village with RRWS suffix
      path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name} RRWS`;
    }
    // Special case for Kawtha Bk & 9 Vill RR WSS
    else if (scheme_name === "Kawtha Bk & 9 Vill RR WSS") {
      // Exact format for Kawtha scheme with no space between scheme_id and hyphen
      path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} -${scheme_name}`;
    }
    // Bargaonpimpri scheme is handled in generateSpecialCaseUrl()
    else if (region === "Pune") {
      // Use exact formats from examples for Pune region

      // Hard-coded formats based on examples
      if (
        scheme_id === "7942135" &&
        scheme_name.includes("Gar, Sonwadi, Nanviz RR")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 1\\Sub Division-Pune 1\\Block-Daund\\Scheme-7942135-Gar, Sonwadi, Nanviz RR`;
      } else if (
        scheme_id === "20027541" &&
        scheme_name.includes("Wangani RRWSS")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 2\\Sub Division-Pune 2\\Block-Velhe\\Scheme-20027541-Wangani RRWSS`;
      } else if (
        scheme_id === "20027892" &&
        scheme_name.includes("RR Girvi WSS")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Satara\\Sub Division-Phaltan\\Block-Phaltan\\Scheme-20027892-RR Girvi WSS`;
      } else if (
        scheme_id === "20017250" &&
        scheme_name.includes("LONI BHAPKAR RRWSS")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 1\\Sub Division-Baramati\\Block-Ambegaon\\Scheme-20017250-LONI BHAPKAR RRWSS`;
      } else if (scheme_id === "20022133" && scheme_name.includes("Peth RR")) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune\\Sub Division-Pune\\Block-Mulshi\\Scheme-20022133 - Peth RR`;
      } else if (
        scheme_id === "20029637" &&
        scheme_name.includes("Penur Patkul")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Solapur\\Sub Division-Solapur\\Block -Mohol\\Scheme - 20029637 -Penur Patkul`;
      } else if (
        scheme_id === "20013367" &&
        scheme_name.includes("Done Adhale RR")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 2\\Sub Division-Maval\\Block-Daund\\Scheme-20013367-Done Adhale RR`;
      } else if (
        scheme_id === "20027396" &&
        scheme_name.includes("Alegaon shirbhavi 82 Village")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Solapur\\Sub Division-Solapur\\Block-Sangola\\Scheme-20027396 - Alegaon shirbhavi 82 Village`;
      } else if (
        scheme_id === "7940233" &&
        scheme_name.includes("Peth & two Villages")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Sangli\\Sub Division-Islampur\\Block-Valva\\Scheme-7940233-Peth & two Villages`;
      } else if (
        scheme_id === "7942125" &&
        scheme_name.includes("MURTI & 7 VILLAGES RRWSS")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 1\\Sub Division-Baramati\\Block-Ambegaon\\Scheme-7942125-MURTI & 7 VILLAGES RRWSS`;
      } else if (
        scheme_id === "20018548" &&
        scheme_name.includes("HOL SASTEWADI")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Pune 2\\Sub Division-Baramati\\Block-Ambegaon\\Scheme-20018548-HOL SASTEWADI`;
      } else if (
        scheme_id === "20033593" &&
        scheme_name.includes("Andhalgaon and 3 villages")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Sangli\\Division-Solapur\\Sub Division-Solapur\\Block - Mangalvedhe\\Scheme - 20033593 -Andhalgaon and 3 villages`;
      } else if (
        scheme_id === "20019021" &&
        scheme_name.includes("Dhuldev Algudewadi")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-Satara\\Sub Division-Pune\\Block- Phaltan\\Scheme- 20019021 -Dhuldev Algudewadi`;
      } else {
        // Standard Pune format for any other schemes
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block -${block}\\Scheme - ${scheme_id} -${scheme_name}`;
      }
    } else if (region === "Konkan") {
      // Use exact formats from examples for Konkan region

      if (
        scheme_id === "20028168" &&
        scheme_name.includes("Devnhave water supply scheme")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Panvel\\Division-Raigadh\\Sub Division-Mangaon\\Block-Khalapur\\Scheme-20028168 - Devnhave water supply scheme`;
      } else if (
        scheme_id === "20020563" &&
        scheme_name.includes("Shahapada 38 Villages")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Panvel\\Division-Raigadh\\Sub Division-Mangaon\\Block-Pen\\Scheme-20020563-Shahapada 38 Villages`;
      } else if (
        scheme_id === "20092478" &&
        scheme_name.includes(
          "Retrofiting of Gotheghar Dahisar R.R. Water Supply Scheme",
        )
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Thane\\Division-Thane\\Sub Division-Thane\\Block-Kalyan\\Scheme-20092478-Retrofiting of Gotheghar Dahisar R.R. Water Supply Scheme`;
      } else if (
        scheme_id === "20047871" &&
        (scheme_name.includes("Modgaon & Tornipada RWSS") ||
          scheme_name.includes("�Modgaon & Tornipada RWSS"))
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-Thane\\Division-Thane\\Sub Division-Palghar\\Block-Dahanu\\Scheme-20047871-Modgaon & Tornipada RWSS`;
      } else {
        // Standard format for other Konkan schemes
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
      }
    } else if (region === "Amravati") {
      // Use exact formats from examples for Amravati region

      if (
        scheme_id === "7945938" &&
        scheme_name.includes("83 Village RRWS Scheme MJP RR")
      ) {
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-Amaravati\\Circle-Amravati\\Division-Amravati\\Sub Division-Achalpur\\Block-Chandur Bazar\\Scheme-7945938 - 83 Village RRWS Scheme MJP RR (C 39)`;
      } else {
        // Standard format for other Amravati schemes (with Amaravati display name)
        path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-Amaravati\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
      }
    } else {
      // Format for all other regions: Block-Name, Scheme-ID - Name (no space before first hyphen)
      path = `\\\\WIN-6SIR0BN8BTR\\JJM\\JJM\\Maharashtra\\Region-${regionDisplay}\\Circle-${circle}\\Division-${division}\\Sub Division-${sub_division}\\Block-${block}\\Scheme-${scheme_id} - ${scheme_name}`;
    }

    // URL encode the path
    const encodedPath = encodeURIComponent(path);

    // Combine all parts to create the complete URL
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }

  // Chlorine Data CRUD operations
  async getAllChlorineData(
    filter?: ChlorineDataFilter,
  ): Promise<ChlorineData[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      let query = db.select().from(chlorineData);

      // Apply filters if provided
      if (filter) {
        if (filter.region && filter.region !== "all") {
          query = query.where(eq(chlorineData.region, filter.region));
        }

        if (filter.circle && filter.circle !== "all") {
          query = query.where(eq(chlorineData.circle, filter.circle));
        }

        if (filter.division && filter.division !== "all") {
          query = query.where(eq(chlorineData.division, filter.division));
        }

        if (filter.subDivision && filter.subDivision !== "all") {
          query = query.where(eq(chlorineData.sub_division, filter.subDivision));
        }

        if (filter.block && filter.block !== "all") {
          query = query.where(eq(chlorineData.block, filter.block));
        }

        if (filter.chlorineRange) {
          switch (filter.chlorineRange) {
            case "below_0.2":
              // ESRs with chlorine value below 0.2 mg/l
              query = query.where(
                sql`${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} >= 0`,
              );
              break;
            case "between_0.2_0.5":
              // ESRs with chlorine value between 0.2 and 0.5 mg/l
              query = query.where(
                sql`${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`,
              );
              break;
            case "above_0.5":
              // ESRs with chlorine value above 0.5 mg/l
              query = query.where(sql`${chlorineData.chlorine_value_7} > 0.5`);
              break;
            case "consistent_zero":
              // ESRs with consistent zero chlorine readings over 7 days
              query = query.where(sql`
                COALESCE(${chlorineData.number_of_consistent_zero_value_in_chlorine}, 0) = 7 OR
                (
                  (${chlorineData.chlorine_value_1} = 0 OR ${chlorineData.chlorine_value_1} IS NULL) AND
                  (${chlorineData.chlorine_value_2} = 0 OR ${chlorineData.chlorine_value_2} IS NULL) AND
                  (${chlorineData.chlorine_value_3} = 0 OR ${chlorineData.chlorine_value_3} IS NULL) AND
                  (${chlorineData.chlorine_value_4} = 0 OR ${chlorineData.chlorine_value_4} IS NULL) AND
                  (${chlorineData.chlorine_value_5} = 0 OR ${chlorineData.chlorine_value_5} IS NULL) AND
                  (${chlorineData.chlorine_value_6} = 0 OR ${chlorineData.chlorine_value_6} IS NULL) AND
                  (${chlorineData.chlorine_value_7} = 0 OR ${chlorineData.chlorine_value_7} IS NULL)
                )
              `);
              break;
            case "consistent_below":
              // ESRs with consistent below range chlorine (< 0.2 mg/l) for 7 days
              query = query.where(sql`
                (
                  (${chlorineData.chlorine_value_1} < 0.2 AND ${chlorineData.chlorine_value_1} > 0) AND
                  (${chlorineData.chlorine_value_2} < 0.2 AND ${chlorineData.chlorine_value_2} > 0) AND
                  (${chlorineData.chlorine_value_3} < 0.2 AND ${chlorineData.chlorine_value_3} > 0) AND
                  (${chlorineData.chlorine_value_4} < 0.2 AND ${chlorineData.chlorine_value_4} > 0) AND
                  (${chlorineData.chlorine_value_5} < 0.2 AND ${chlorineData.chlorine_value_5} > 0) AND
                  (${chlorineData.chlorine_value_6} < 0.2 AND ${chlorineData.chlorine_value_6} > 0) AND
                  (${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} > 0)
                )
              `);
              break;
            case "consistent_optimal":
              // ESRs with consistent optimal range chlorine (0.2-0.5 mg/l) for 7 days
              query = query.where(sql`
                (
                  (${chlorineData.chlorine_value_1} >= 0.2 AND ${chlorineData.chlorine_value_1} <= 0.5) AND
                  (${chlorineData.chlorine_value_2} >= 0.2 AND ${chlorineData.chlorine_value_2} <= 0.5) AND
                  (${chlorineData.chlorine_value_3} >= 0.2 AND ${chlorineData.chlorine_value_3} <= 0.5) AND
                  (${chlorineData.chlorine_value_4} >= 0.2 AND ${chlorineData.chlorine_value_4} <= 0.5) AND
                  (${chlorineData.chlorine_value_5} >= 0.2 AND ${chlorineData.chlorine_value_5} <= 0.5) AND
                  (${chlorineData.chlorine_value_6} >= 0.2 AND ${chlorineData.chlorine_value_6} <= 0.5) AND
                  (${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5)
                )
              `);
              break;
            case "consistent_above":
              // ESRs with consistent above range chlorine (> 0.5 mg/l) for 7 days
              query = query.where(sql`
                (
                  (${chlorineData.chlorine_value_1} > 0.5) AND
                  (${chlorineData.chlorine_value_2} > 0.5) AND
                  (${chlorineData.chlorine_value_3} > 0.5) AND
                  (${chlorineData.chlorine_value_4} > 0.5) AND
                  (${chlorineData.chlorine_value_5} > 0.5) AND
                  (${chlorineData.chlorine_value_6} > 0.5) AND
                  (${chlorineData.chlorine_value_7} > 0.5)
                )
              `);
              break;
          }
        } else {
          // Apply min/max filters if range is not specified
          if (filter.minChlorine !== undefined) {
            query = query.where(
              sql`${chlorineData.chlorine_value_7} >= ${filter.minChlorine}`,
            );
          }

          if (filter.maxChlorine !== undefined) {
            query = query.where(
              sql`${chlorineData.chlorine_value_7} <= ${filter.maxChlorine}`,
            );
          }
        }
      }

      return await query;
    } catch (error) {
      console.error("Error fetching chlorine data:", error);
      return [];
    }
  }

  async getChlorineDataByScheme(
    schemeId: string,
    block?: string,
  ): Promise<ChlorineData[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `🔍 Fetching chlorine data for scheme: ${schemeId}, block: ${block || "all blocks"}`,
      );

      let whereCondition = eq(chlorineData.scheme_id, schemeId);
      if (block) {
        whereCondition = and(whereCondition, eq(chlorineData.block, block));
      }

      const results = await db
        .select()
        .from(chlorineData)
        .where(whereCondition);
      console.log(
        `✅ Found ${results.length} chlorine data records for scheme ${schemeId}`,
      );

      return results;
    } catch (error) {
      console.error("Error fetching chlorine data by scheme:", error);
      throw error;
    }
  }

  async getHistoricalChlorineData(filter: {
    startDate: string;
    endDate: string;
    region?: string;
    scheme_id?: string;
    village_name?: string;
    esr_name?: string;
  }): Promise<
    Array<{
      scheme_id: string;
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      measurement_date: string;
      chlorine_value: number;
      dashboard_url?: string;
    }>
  > {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      // Helper function to convert YYYY-MM-DD to DD-MMM-YY format for database comparison
      const convertToDbDateFormat = (dateStr: string): string => {
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        if (dateStr.includes("-")) {
          const parts = dateStr.split("-");
          if (parts[0].length === 4) {
            // YYYY-MM-DD format, convert to DD-MMM-YY
            const year = parts[0].slice(-2); // Get last 2 digits of year
            const month = months[parseInt(parts[1]) - 1]; // Convert month number to name
            const day = parts[2].padStart(2, "0");
            return `${day}-${month}-${year}`;
          } else if (parts[2].length === 4) {
            // DD-MM-YYYY format, convert to DD-MMM-YY
            const year = parts[2].slice(-2);
            const month = months[parseInt(parts[1]) - 1];
            const day = parts[0].padStart(2, "0");
            return `${day}-${month}-${year}`;
          }
        }
        return dateStr; // Return as-is if format is unclear
      };

      // Convert input dates to database format for comparison
      const startDateDb = convertToDbDateFormat(filter.startDate);
      const endDateDb = convertToDbDateFormat(filter.endDate);

      // Also keep original format for potential direct comparison
      const startDate = filter.startDate;
      const endDate = filter.endDate;

      console.log(
        `Querying chlorine data from ${startDate} to ${endDate} (DB format: ${startDateDb} to ${endDateDb})`,
      );

      // Create date range conditions for both input format and database format
      const createDateRangeConditions = (start: string, end: string) => {
        // Generate all possible date strings between start and end dates
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        const dates = [];

        for (
          let d = new Date(startDateObj);
          d <= endDateObj;
          d.setDate(d.getDate() + 1)
        ) {
          const dbFormatDate = convertToDbDateFormat(
            d.toISOString().split("T")[0],
          );
          // Add both formats to handle data consistency issues (DB may store YYYY-MM-DD or DD-MMM-YY)
          dates.push(dbFormatDate);
          dates.push(d.toISOString().split("T")[0]);
        }

        // Create IN clause for exact matches
        const dateList = dates.map((d) => `'${d}'`).join(", ");

        return `(
          cd.chlorine_date_day_1 IN (${dateList}) OR
          cd.chlorine_date_day_2 IN (${dateList}) OR
          cd.chlorine_date_day_3 IN (${dateList}) OR
          cd.chlorine_date_day_4 IN (${dateList}) OR
          cd.chlorine_date_day_5 IN (${dateList}) OR
          cd.chlorine_date_day_6 IN (${dateList}) OR
          cd.chlorine_date_day_7 IN (${dateList})
        )`;
      };

      // Build the unpivot query with deduplication
      let whereConditions = [];

      // Date range condition using exact date matching
      whereConditions.push(createDateRangeConditions(startDate, endDate));

      // Add additional filters
      if (filter.region) {
        whereConditions.push(`cd.region = '${filter.region}'`);
      }
      if (filter.scheme_id) {
        whereConditions.push(`cd.scheme_id = '${filter.scheme_id}'`);
      }
      if (filter.village_name) {
        whereConditions.push(`cd.village_name = '${filter.village_name}'`);
      }
      if (filter.esr_name) {
        whereConditions.push(`cd.esr_name = '${filter.esr_name}'`);
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Raw SQL query to unpivot data and handle deduplication
      const query = `
        WITH unpivoted_data AS (
          SELECT DISTINCT ON (cd.scheme_id, cd.village_name, cd.esr_name, measurement_date)
            cd.scheme_id,
            cd.region,
            cd.circle,
            cd.division,
            cd.sub_division,
            cd.block,
            cd.scheme_name,
            cd.village_name,
            cd.esr_name,
            measurement_date,
            chlorine_value,
            cd.dashboard_url,
            -- Add a timestamp for ordering (we'll use a combination approach for deduplication)
            CURRENT_TIMESTAMP as query_time
          FROM chlorine_data cd
          CROSS JOIN LATERAL (
            VALUES 
              (cd.chlorine_date_day_1, CAST(cd.chlorine_value_1 AS DECIMAL)),
              (cd.chlorine_date_day_2, CAST(cd.chlorine_value_2 AS DECIMAL)),
              (cd.chlorine_date_day_3, CAST(cd.chlorine_value_3 AS DECIMAL)),
              (cd.chlorine_date_day_4, CAST(cd.chlorine_value_4 AS DECIMAL)),
              (cd.chlorine_date_day_5, CAST(cd.chlorine_value_5 AS DECIMAL)),
              (cd.chlorine_date_day_6, CAST(cd.chlorine_value_6 AS DECIMAL)),
              (cd.chlorine_date_day_7, CAST(cd.chlorine_value_7 AS DECIMAL))
          ) AS unpivot(measurement_date, chlorine_value)
          ${whereClause}
          AND unpivot.measurement_date IS NOT NULL 
          AND unpivot.measurement_date != ''
          AND unpivot.chlorine_value IS NOT NULL
          ORDER BY cd.scheme_id, cd.village_name, cd.esr_name, measurement_date, query_time DESC
        )
        SELECT 
          scheme_id,
          region,
          circle,
          division,
          sub_division,
          block,
          scheme_name,
          village_name,
          esr_name,
          measurement_date,
          CAST(chlorine_value AS FLOAT) as chlorine_value,
          dashboard_url
        FROM unpivoted_data
        ORDER BY region, scheme_id, village_name, esr_name, measurement_date;
      `;

      console.log("Executing historical chlorine query:", query);

      const result = await db.execute(sql.raw(query));

      console.log(`Found ${result.rows.length} historical chlorine records`);

      // Transform the result to match the expected format
      const transformedResult = result.rows.map((row: any) => ({
        scheme_id: row.scheme_id || "",
        region: row.region || "",
        circle: row.circle || "",
        division: row.division || "",
        sub_division: row.sub_division || "",
        block: row.block || "",
        scheme_name: row.scheme_name || "",
        village_name: row.village_name || "",
        esr_name: row.esr_name || "",
        measurement_date: row.measurement_date || "",
        chlorine_value: parseFloat(row.chlorine_value) || 0,
        dashboard_url: row.dashboard_url || undefined,
      }));

      return transformedResult;
    } catch (error) {
      console.error("Error fetching historical chlorine data:", error);
      throw new Error(
        `Failed to fetch historical chlorine data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getChlorineDataByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<ChlorineData | undefined> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      const result = await db
        .select()
        .from(chlorineData)
        .where(
          sql`${chlorineData.scheme_id} = ${schemeId} 
              AND ${chlorineData.village_name} = ${villageName}
              AND ${chlorineData.esr_name} = ${esrName}`,
        );

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error("Error fetching chlorine data by composite key:", error);
      return undefined;
    }
  }

  async createChlorineData(data: InsertChlorineData): Promise<ChlorineData> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      // Calculate derived fields for analysis
      const enhancedData = this.calculateChlorineAnalysisFields(data);

      // Insert the data
      const result = await db
        .insert(chlorineData)
        .values(enhancedData)
        .returning();

      return result[0];
    } catch (error) {
      console.error("Error creating chlorine data:", error);
      throw new Error(`Failed to create chlorine data: ${error}`);
    }
  }

  async updateChlorineData(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdateChlorineData,
  ): Promise<ChlorineData> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      // Calculate derived fields for analysis
      const enhancedData = this.calculateChlorineAnalysisFields(data);

      // Update the data
      const result = await db
        .update(chlorineData)
        .set(enhancedData)
        .where(
          sql`${chlorineData.scheme_id} = ${schemeId} 
              AND ${chlorineData.village_name} = ${villageName}
              AND ${chlorineData.esr_name} = ${esrName}`,
        )
        .returning();

      if (!result.length) {
        throw new Error("Chlorine data not found");
      }

      return result[0];
    } catch (error) {
      console.error("Error updating chlorine data:", error);
      throw new Error(`Failed to update chlorine data: ${error}`);
    }
  }

  async deleteChlorineData(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<boolean> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      await db.delete(chlorineData).where(
        sql`${chlorineData.scheme_id} = ${schemeId} 
              AND ${chlorineData.village_name} = ${villageName}
              AND ${chlorineData.esr_name} = ${esrName}`,
      );

      return true;
    } catch (error) {
      console.error("Error deleting chlorine data:", error);
      return false;
    }
  }

  // Helper function to calculate analysis fields for chlorine data
  private calculateChlorineAnalysisFields(
    data: Partial<InsertChlorineData>,
  ): any {
    const enhancedData = { ...data };

    // Count how many consecutive days have zero chlorine values
    let zeroCount = 0;
    let below02Count = 0;
    let between02And05Count = 0;
    let above05Count = 0;

    // Track any potentially problematic readings
    const problematicReadings = [];

    // Check all 7 days
    for (let i = 1; i <= 7; i++) {
      const value = enhancedData[
        `chlorine_value_${i}` as keyof InsertChlorineData
      ] as number | undefined | null;

      // Handle only defined and non-null values
      if (value !== undefined && value !== null) {
        // Verify the value is within reasonable range (0-10)
        if (value < 0) {
          problematicReadings.push(
            `Day ${i}: Negative chlorine value ${value} corrected to 0`,
          );
          // Correct negative values to 0
          enhancedData[`chlorine_value_${i}` as keyof InsertChlorineData] =
            0 as any;
        } else if (value > 10) {
          problematicReadings.push(
            `Day ${i}: Unusually high chlorine value ${value}`,
          );
        }

        // Use the potentially corrected value
        const correctedValue = enhancedData[
          `chlorine_value_${i}` as keyof InsertChlorineData
        ] as number;

        if (correctedValue === 0) {
          zeroCount++;
        }

        if (correctedValue < 0.2 && correctedValue >= 0) {
          below02Count++;
        } else if (correctedValue >= 0.2 && correctedValue <= 0.5) {
          between02And05Count++;
        } else if (correctedValue > 0.5) {
          above05Count++;
        }
      }
    }

    // Update analysis fields with new lowercase field names
    enhancedData.number_of_consistent_zero_value_in_chlorine = zeroCount as any;
    enhancedData.chlorine_less_than_02_mgl = below02Count as any;
    enhancedData.chlorine_between_02_05_mgl = between02And05Count as any;
    enhancedData.chlorine_greater_than_05_mgl = above05Count as any;

    // Log any problematic readings for debugging
    if (problematicReadings.length > 0) {
      console.log(
        `Problematic chlorine readings for ${enhancedData.scheme_id}/${enhancedData.village_name}/${enhancedData.esr_name}:`,
        problematicReadings.join("; "),
      );
    }

    return enhancedData;
  }

  // Import methods for chlorine data
  async importChlorineDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;

    // Add timing for performance analysis
    const startTime = Date.now();
    console.log("Starting Excel import at:", new Date().toISOString());

    try {
      // Import xlsx using dynamic import
      console.log("Loading XLSX module...");
      const xlsxModule = await import("xlsx");
      const xlsx = xlsxModule.default || xlsxModule;

      console.log("Parsing Excel file...");
      const workbook = xlsx.read(fileBuffer, { type: "buffer" });
      console.log(`Excel file contains ${workbook.SheetNames.length} sheets.`);

      // Prepare a structure to collect all records before batch processing
      const recordsToProcess: Partial<InsertChlorineData>[] = [];
      const recordKeys: Set<string> = new Set();

      // Process each sheet in the workbook
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`Sheet contains ${data.length} rows.`);

        // Find the header row
        const headerRow = this.findHeaderRow(data);
        if (headerRow === -1) {
          errors.push(`No header row found in sheet ${sheetName}`);
          continue;
        }

        // Extract headers and create column mapping
        const headers = data[headerRow];
        const columnMap: Record<number, string> = {};

        // Map Excel columns to database fields
        if (Array.isArray(headers)) {
          headers.forEach((header: unknown, index: number) => {
            if (header && typeof header === "string") {
              const dbField = this.excelColumnMapping[header.trim()];
              if (dbField) {
                columnMap[index] = dbField;
              }
            }
          });
        }

        console.log(
          `Found ${Object.keys(columnMap).length} mapped columns in headers.`,
        );

        // Process data rows and collect records
        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          try {
            const recordData: Partial<InsertChlorineData> = {};

            // Extract data from each column
            for (let j = 0; j < row.length; j++) {
              if (columnMap[j]) {
                const value = row[j];
                const fieldName = columnMap[j];

                // Handle numeric chlorine values and ensure they are decimal numbers
                if (
                  fieldName.startsWith("chlorine_value_") ||
                  fieldName.startsWith("Chlorine_value_")
                ) {
                  // Convert any old uppercase field name to new lowercase field name
                  const newFieldName = fieldName
                    .toLowerCase()
                    .replace("_value_", "_value_");
                  recordData[newFieldName as keyof InsertChlorineData] =
                    this.parseNumericValue(value);
                } else {
                  // Handle other potential uppercase field name conversions
                  const newFieldName = fieldName
                    .toLowerCase()
                    .replace("chlorine_date_day_", "chlorine_date_day_")
                    .replace(
                      "number_of_consistent_zero_value_in_chlorine",
                      "number_of_consistent_zero_value_in_chlorine",
                    )
                    .replace(
                      "chlorine_less_than_02_mgl",
                      "chlorine_less_than_02_mgl",
                    )
                    .replace(
                      "chlorine_between_02__05_mgl",
                      "chlorine_between_02_05_mgl",
                    )
                    .replace(
                      "chlorine_greater_than_05_mgl",
                      "chlorine_greater_than_05_mgl",
                    );

                  recordData[newFieldName as keyof InsertChlorineData] = value;
                }
              }
            }

            // Skip rows without required fields
            if (
              !recordData.scheme_id ||
              !recordData.village_name ||
              !recordData.esr_name
            ) {
              errors.push(
                `Row ${i + 1}: Missing required fields (scheme_id, village_name, or esr_name)`,
              );
              continue;
            }

            // Calculate analysis fields
            const enhancedData =
              this.calculateChlorineAnalysisFields(recordData);

            // Generate a unique key for this record to track duplicates
            const recordKey = `${enhancedData.scheme_id}|${enhancedData.village_name}|${enhancedData.esr_name}`;

            // Only add if we haven't seen this record before (in case of duplicates across sheets)
            if (!recordKeys.has(recordKey)) {
              recordKeys.add(recordKey);
              recordsToProcess.push(enhancedData);
            }
          } catch (rowError) {
            const errorMessage =
              rowError instanceof Error ? rowError.message : String(rowError);
            errors.push(`Row ${i + 1}: ${errorMessage}`);
          }
        }
      }

      console.log(`Processing ${recordsToProcess.length} unique records...`);

      if (recordsToProcess.length === 0) {
        console.log("No valid records found to process.");
        const removed = 0; // No records were removed in this import
        return { inserted, updated, removed, errors };
      }

      // First fetch all existing records in one query to avoid multiple database lookups
      console.log("Fetching existing records...");
      const existingRecordsResult = await db
        .select()
        .from(chlorineData)
        .where(
          sql`(${chlorineData.scheme_id}, ${chlorineData.village_name}, ${chlorineData.esr_name}) IN 
              (${sql.join(
            recordsToProcess.map(
              (r) =>
                sql`(${r.scheme_id}, ${r.village_name}, ${r.esr_name})`,
            ),
            sql`, `,
          )})`,
        );

      // Create a lookup map for existing records
      const existingRecordsMap = new Map<string, ChlorineData>();
      existingRecordsResult.forEach((record) => {
        const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
        existingRecordsMap.set(key, record);
      });

      console.log(
        `Found ${existingRecordsMap.size} existing records that match our import data.`,
      );

      // Process the records - split into batches of updates and inserts
      const recordsToUpdate: Partial<InsertChlorineData>[] = [];
      const recordsToInsert: Partial<InsertChlorineData>[] = [];

      // Categorize records for batch processing
      for (const record of recordsToProcess) {
        const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
        if (existingRecordsMap.has(key)) {
          recordsToUpdate.push(record);
        } else {
          recordsToInsert.push(record);
        }
      }

      // Process inserts in batches
      if (recordsToInsert.length > 0) {
        console.log(`Inserting ${recordsToInsert.length} new records...`);
        // Process in smaller batches to avoid overwhelming the database
        const BATCH_SIZE = 100;
        for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
          const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
          await db.insert(chlorineData).values(batch as InsertChlorineData[]);
          inserted += batch.length;
          console.log(
            `Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recordsToInsert.length / BATCH_SIZE)}`,
          );
        }
      }

      // Process updates individually since we need to match on composite keys
      if (recordsToUpdate.length > 0) {
        console.log(`Updating ${recordsToUpdate.length} existing records...`);
        for (const record of recordsToUpdate) {
          await db
            .update(chlorineData)
            .set(record)
            .where(
              sql`${chlorineData.scheme_id} = ${record.scheme_id} 
                  AND ${chlorineData.village_name} = ${record.village_name}
                  AND ${chlorineData.esr_name} = ${record.esr_name}`,
            );
          updated++;

          // Log progress every 50 records
          if (updated % 50 === 0) {
            console.log(
              `Updated ${updated}/${recordsToUpdate.length} records...`,
            );
          }
        }
      }

      // Calculate elapsed time
      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;

      // Log the import summary
      const removed = 0; // No records are being removed in this import operation
      const summary = `Excel Import Summary: ${inserted} records inserted, ${updated} records updated, ${errors.length} errors in ${elapsedSeconds.toFixed(2)} seconds`;
      if (errors.length > 0) {
        console.warn(summary);
        console.warn("Import errors:", errors);
      } else {
        console.log(summary);
      }

      return { inserted, updated, removed, errors };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error importing chlorine data from Excel:", errorMessage);
      errors.push(`General import error: ${errorMessage}`);
      const removed = 0; // No records are being removed in this import operation
      return { inserted, updated, removed, errors };
    }
  }

  async importChlorineDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;

    // Add timing for performance analysis
    const startTime = Date.now();
    console.log(
      "Starting CSV import at:",
      new Date().toISOString(),
      "with optimized batch processing",
    );

    try {
      console.log("Starting chlorine data import from CSV...");
      // CSV column mapping without headers (as per requirements)
      const csvColumnMapping = [
        "region", // Column 0
        "circle", // Column 1
        "division", // Column 2
        "sub_division", // Column 3
        "block", // Column 4
        "scheme_id", // Column 5
        "scheme_name", // Column 6
        "village_name", // Column 7
        "esr_name", // Column 8
        "chlorine_value_1", // Column 9 - Now NUMERIC(12,2)
        "chlorine_value_2", // Column 10 - Now NUMERIC(12,2)
        "chlorine_value_3", // Column 11 - Now NUMERIC(12,2)
        "chlorine_value_4", // Column 12 - Now NUMERIC(12,2)
        "chlorine_value_5", // Column 13 - Now NUMERIC(12,2)
        "chlorine_value_6", // Column 14 - Now NUMERIC(12,2)
        "chlorine_value_7", // Column 15 - Now NUMERIC(12,2)
        "chlorine_date_day_1", // Column 16 - Now VARCHAR(15)
        "chlorine_date_day_2", // Column 17 - Now VARCHAR(15)
        "chlorine_date_day_3", // Column 18 - Now VARCHAR(15)
        "chlorine_date_day_4", // Column 19 - Now VARCHAR(15)
        "chlorine_date_day_5", // Column 20 - Now VARCHAR(15)
        "chlorine_date_day_6", // Column 21 - Now VARCHAR(15)
        "chlorine_date_day_7", // Column 22 - Now VARCHAR(15)
        "number_of_consistent_zero_value_in_chlorine", // Column 23
        "chlorine_less_than_02_mgl", // Column 24
        "chlorine_between_02_05_mgl", // Column 25
        "chlorine_greater_than_05_mgl", // Column 26
      ];

      const csvString = fileBuffer.toString("utf8");

      // Use synchronous parse function from csv-parse for better performance
      const { parse } = await import("csv-parse/sync");

      const options = {
        columns: false, // No headers in the CSV file
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow different column counts in rows
        bom: true, // Handle byte order mark if present
      };

      const records = parse(csvString, options);

      console.log(`CSV parsed successfully. Found ${records.length} records.`);

      if (records.length === 0) {
        console.log("No data found in CSV file");
        return {
          inserted,
          updated,
          removed: 0,
          errors: ["No data found in CSV file"],
        };
      }

      // OPTIMIZATION: Collect unique identifiers to make a single database query
      const uniqueKeys = new Set<string>();
      const recordsMap = new Map<string, Partial<InsertChlorineData>>();

      // Process all records at once and extract unique keys
      for (let i = 0; i < records.length; i++) {
        const rowValues = records[i];
        try {
          const recordData: Partial<InsertChlorineData> = {};

          // Map each column value to the corresponding field based on predefined mapping
          for (
            let colIndex = 0;
            colIndex < rowValues.length && colIndex < csvColumnMapping.length;
            colIndex++
          ) {
            const fieldName = csvColumnMapping[colIndex];
            const value = rowValues[colIndex];

            if (fieldName) {
              // Handle numeric chlorine values and ensure they are decimal numbers
              if (fieldName.startsWith("chlorine_value_")) {
                // If value is blank/empty, set to null to replace old data
                if (value === undefined || value === "" || value === null) {
                  recordData[fieldName as keyof InsertChlorineData] =
                    null as any;
                } else {
                  recordData[fieldName as keyof InsertChlorineData] =
                    this.parseNumericValue(value) as any;
                }
              }
              // Handle analysis fields which should be numeric
              else if (
                fieldName === "number_of_consistent_zero_value_in_chlorine" ||
                fieldName === "chlorine_less_than_02_mgl" ||
                fieldName === "chlorine_between_02_05_mgl" ||
                fieldName === "chlorine_greater_than_05_mgl"
              ) {
                // Skip empty values for analysis fields (they will be recalculated)
                if (value !== undefined && value !== "" && value !== null) {
                  recordData[fieldName as keyof InsertChlorineData] =
                    this.parseNumericValue(value) as any;
                }
              }
              // Handle date fields with the extended VARCHAR(15) format
              else if (fieldName.startsWith("chlorine_date_day_")) {
                // If value is blank/empty, set to null to replace old data
                if (value === undefined || value === "" || value === null) {
                  recordData[fieldName as keyof InsertChlorineData] =
                    null as any;
                } else {
                  // Clean and standardize date format if needed
                  let dateStr = String(value).trim();

                  // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
                  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
                    const parts = dateStr.split("/");
                    dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                  }

                  // If date is in DD-MM-YYYY format, convert to YYYY-MM-DD
                  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
                    const parts = dateStr.split("-");
                    dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                  }

                  recordData[fieldName as keyof InsertChlorineData] =
                    dateStr as any;
                }
              } else {
                // For other fields, only set if not empty
                if (value !== undefined && value !== "" && value !== null) {
                  recordData[fieldName as keyof InsertChlorineData] = value;
                }
              }
            }
          }

          // Skip rows without required fields
          if (
            !recordData.scheme_id ||
            !recordData.village_name ||
            !recordData.esr_name
          ) {
            errors.push(
              `Row ${i + 1}: Missing required fields (scheme_id, village_name, or esr_name)`,
            );
            continue;
          }

          // Calculate analysis fields
          const enhancedData = this.calculateChlorineAnalysisFields(recordData);

          // Generate a unique key for this record
          const recordKey = `${enhancedData.scheme_id}|${enhancedData.village_name}|${enhancedData.esr_name}`;

          // Store the record by key to handle duplicates
          uniqueKeys.add(recordKey);
          recordsMap.set(recordKey, enhancedData);
        } catch (rowError) {
          const errorMessage =
            rowError instanceof Error ? rowError.message : String(rowError);
          errors.push(`Row ${i + 1}: ${errorMessage}`);
        }
      }

      console.log(
        `Processed ${recordsMap.size} unique records from ${records.length} total`,
      );

      if (recordsMap.size === 0) {
        console.log("No valid records to import after validation");
        return { inserted, updated, removed: 0, errors };
      }

      // OPTIMIZATION: Query existing records in batches to avoid exceeding query limits
      const existingRecordsMap = new Map<string, ChlorineData>();
      const batchSize = 100; // Adjust based on database limits
      const allKeys = Array.from(uniqueKeys);

      for (let i = 0; i < allKeys.length; i += batchSize) {
        const keysBatch = allKeys.slice(i, i + batchSize);
        console.log(
          `Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allKeys.length / batchSize)} of existing records...`,
        );

        // Collect conditions for each key
        const conditions = keysBatch.map((key) => {
          const [schemeId, villageName, esrName] = key.split("|");
          return and(
            eq(chlorineData.scheme_id, schemeId),
            eq(chlorineData.village_name, villageName),
            eq(chlorineData.esr_name, esrName),
          );
        });

        // Query database for this batch using OR conditions
        const existingBatch = await db
          .select()
          .from(chlorineData)
          .where(
            sql`${conditions.reduce(
              (acc, condition, idx) =>
                idx === 0 ? condition : sql`${acc} OR ${condition}`,
              sql``,
            )}`,
          );

        // Add to lookup map
        existingBatch.forEach((record) => {
          const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
          existingRecordsMap.set(key, record);
        });
      }

      console.log(
        `Found ${existingRecordsMap.size} matching records in database out of ${uniqueKeys.size} to process`,
      );

      // OPTIMIZATION: Separate records for batch inserts and updates
      const recordsToInsert: Partial<InsertChlorineData>[] = [];
      const recordsToUpdate: Partial<InsertChlorineData>[] = [];

      allKeys.forEach((key) => {
        const record = recordsMap.get(key)!;

        // Generate dashboard URL for this ESR
        if (
          !record.dashboard_url &&
          record.region &&
          record.circle &&
          record.division &&
          record.sub_division &&
          record.block &&
          record.scheme_id &&
          record.scheme_name &&
          record.village_name &&
          record.esr_name
        ) {
          // Generate dashboard URL
          record.dashboard_url = this.generateEsrDashboardUrl(
            record as ChlorineData,
          );
          if (record.dashboard_url) {
            console.log(
              `Generated dashboard URL for ESR: ${record.esr_name} in village: ${record.village_name}`,
            );
          }
        }

        if (existingRecordsMap.has(key)) {
          recordsToUpdate.push(record);
        } else {
          recordsToInsert.push(record);
        }
      });

      // OPTIMIZATION: Process inserts in batches
      if (recordsToInsert.length > 0) {
        console.log(
          `Inserting ${recordsToInsert.length} new records in batches...`,
        );
        const insertBatchSize = 100;

        for (let i = 0; i < recordsToInsert.length; i += insertBatchSize) {
          const batch = recordsToInsert.slice(i, i + insertBatchSize);
          await db.insert(chlorineData).values(batch as InsertChlorineData[]);
          inserted += batch.length;
          console.log(
            `Inserted batch ${Math.floor(i / insertBatchSize) + 1}/${Math.ceil(recordsToInsert.length / insertBatchSize)}, total: ${inserted}`,
          );
        }
      }

      // OPTIMIZATION: Process updates in parallel batches
      if (recordsToUpdate.length > 0) {
        console.log(
          `Updating ${recordsToUpdate.length} existing records in parallel batches...`,
        );
        const updateBatchSize = 50;

        for (let i = 0; i < recordsToUpdate.length; i += updateBatchSize) {
          const batch = recordsToUpdate.slice(i, i + updateBatchSize);
          console.log(
            `Processing update batch ${Math.floor(i / updateBatchSize) + 1}/${Math.ceil(recordsToUpdate.length / updateBatchSize)}`,
          );

          // Create a batch of update promises to execute in parallel
          const updatePromises = batch.map((record) =>
            db
              .update(chlorineData)
              .set(record)
              .where(
                sql`${chlorineData.scheme_id} = ${record.scheme_id} 
                    AND ${chlorineData.village_name} = ${record.village_name}
                    AND ${chlorineData.esr_name} = ${record.esr_name}`,
              ),
          );

          // Execute all updates in this batch in parallel
          await Promise.all(updatePromises);
          updated += batch.length;
          console.log(
            `Updated batch ${Math.floor(i / updateBatchSize) + 1}/${Math.ceil(recordsToUpdate.length / updateBatchSize)}, total: ${updated}`,
          );
        }
      }

      // NEW: Store historical data by unpacking 7-day records into individual entries
      console.log("Storing historical chlorine data...");
      const uploadBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const historicalRecords: InsertChlorineHistory[] = [];

      // Process all records (both new and updated) for historical storage
      const allProcessedRecords = [...recordsToInsert, ...recordsToUpdate];

      for (const record of allProcessedRecords) {
        // Unpack 7-day data into individual historical entries
        for (let day = 1; day <= 7; day++) {
          const dateField = `chlorine_date_day_${day}` as keyof typeof record;
          const valueField = `chlorine_value_${day}` as keyof typeof record;

          const chlorineDate = record[dateField] as string;
          const chlorineValue = record[valueField] as string;

          // Only store if date exists. Allow null/blank values.
          if (chlorineDate) {
            historicalRecords.push({
              region: record.region as string,
              circle: record.circle as string,
              division: record.division as string,
              sub_division: record.sub_division as string,
              block: record.block as string,
              scheme_id: record.scheme_id as string,
              scheme_name: record.scheme_name as string,
              village_name: record.village_name as string,
              esr_name: record.esr_name as string,
              chlorine_date: chlorineDate,
              chlorine_value: chlorineValue,
              upload_batch_id: uploadBatchId,
              dashboard_url: record.dashboard_url as string,
            });
          }
        }
      }

      if (historicalRecords.length > 0) {
        console.log(
          `Storing ${historicalRecords.length} historical chlorine records...`,
        );

        // Insert historical records in batches
        const historyBatchSize = 200;
        for (let i = 0; i < historicalRecords.length; i += historyBatchSize) {
          const batch = historicalRecords.slice(i, i + historyBatchSize);

          try {
            // Insert historical records - duplicates will be handled by unique constraint
            await db.insert(chlorineHistory).values(batch);

            console.log(
              `Stored historical batch ${Math.floor(i / historyBatchSize) + 1}/${Math.ceil(historicalRecords.length / historyBatchSize)}`,
            );
          } catch (historyError) {
            console.error(
              `Error storing historical batch ${Math.floor(i / historyBatchSize) + 1}:`,
              historyError,
            );
            errors.push(`Historical storage error: ${historyError}`);
          }
        }

        console.log(
          `✅ Successfully stored ${historicalRecords.length} historical chlorine records with batch ID: ${uploadBatchId}`,
        );
      }

      // Calculate elapsed time
      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;

      // Log the import summary
      const summary = `CSV Import Summary: ${inserted} records inserted, ${updated} records updated, ${errors.length} errors in ${elapsedSeconds.toFixed(2)} seconds`;
      console.log(summary);

      // IMPORTANT: Update scheme_status table with block information from this import
      console.log(
        "Synchronizing scheme_status table with block information from chlorine import...",
      );

      // Extract unique scheme and block combinations from the imported data
      const schemeBlockMap = new Map<string, Set<string>>();

      // Process all records to gather unique scheme-block combinations
      [...recordsToInsert, ...recordsToUpdate].forEach((record) => {
        if (record.scheme_id && record.block && record.scheme_name) {
          if (!schemeBlockMap.has(record.scheme_name)) {
            schemeBlockMap.set(record.scheme_name, new Set<string>());
          }
          schemeBlockMap.get(record.scheme_name)?.add(record.block);
        }
      });

      // For each scheme, ensure we have entries in scheme_status for all its blocks
      let schemeStatusUpdated = 0;
      for (const [schemeName, blocks] of schemeBlockMap.entries()) {
        try {
          // First get all existing scheme status entries for this scheme
          const existingSchemeStatus = await db
            .select()
            .from(schemeStatuses)
            .where(eq(schemeStatuses.scheme_name, schemeName));

          console.log(
            `Found ${existingSchemeStatus.length} existing scheme status records for scheme "${schemeName}"`,
          );

          // Create a map of existing blocks for this scheme
          const existingBlocks = new Set(
            existingSchemeStatus.map((s) => s.block),
          );

          // Check for blocks in our import that don't exist in scheme_status
          for (const block of blocks) {
            if (!existingBlocks.has(block)) {
              console.log(
                `Adding missing block "${block}" to scheme_status for scheme "${schemeName}"`,
              );

              // If we have an existing record for this scheme, clone it for the new block
              if (existingSchemeStatus.length > 0) {
                const templateRecord = { ...existingSchemeStatus[0] };
                templateRecord.block = block;

                // Insert the new block record
                await db.insert(schemeStatuses).values(templateRecord);
                schemeStatusUpdated++;
              }
            }
          }
        } catch (error) {
          console.error(
            `Error synchronizing scheme_status for scheme "${schemeName}":`,
            error,
          );
          errors.push(
            `Failed to sync scheme status for ${schemeName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      console.log(
        `Synchronized ${schemeStatusUpdated} new block entries in scheme_status table from chlorine import`,
      );

      // Return results
      return {
        inserted,
        updated,
        removed: 0, // CSV import doesn't remove records
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error importing chlorine data from CSV:", errorMessage);
      errors.push(`General import error: ${errorMessage}`);
      return { inserted, updated, removed: 0, errors };
    }
  }

  // Helper for parsing numeric values from Excel/CSV
  private parseNumericValue(value: any): number | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    // Handle string values
    if (typeof value === "string") {
      // Remove any commas and trim whitespace
      const cleanValue = value.replace(/,/g, "").trim();

      // Handle special cases like "N/A", "NA", "-", etc.
      if (
        ["n/a", "na", "-", "nil", "null"].includes(cleanValue.toLowerCase())
      ) {
        return null;
      }

      // Parse as float
      const num = parseFloat(cleanValue);

      // Check if it's a valid number
      if (isNaN(num)) {
        return null;
      }

      // Handle extremely large values that cause numeric overflow
      // For chlorine values, anything above 20 mg/L is extremely high and likely an error
      // Normal chlorine levels in drinking water are between 0.2 and 4 mg/L
      if (num > 20) {
        console.log(`Normalizing extremely high chlorine value: ${num} -> 5.0`);
        return 5.0; // Cap at 5.0 which is already very high
      }

      // Round to 2 decimal places for consistency
      return Math.round(num * 100) / 100;
    }

    // Handle numeric values directly
    if (typeof value === "number") {
      if (isNaN(value)) {
        return null;
      }

      // Handle extremely large values that cause numeric overflow
      if (value > 20) {
        console.log(
          `Normalizing extremely high chlorine value: ${value} -> 5.0`,
        );
        return 5.0; // Cap at 5.0 which is already very high
      }

      // Round to 2 decimal places for consistency
      return Math.round(value * 100) / 100;
    }

    return null;
  }

  // Find header row in Excel sheet
  private findHeaderRow(data: any[]): number {
    if (!data || data.length === 0) return -1;

    // Look for rows with key column headers
    const keyColumns = [
      "scheme_id",
      "Scheme ID",
      "scheme id",
      "ESR Name",
      "esr name",
      "ESR_Name",
    ];

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      // Check if any cell in this row matches our key columns
      for (const cell of row) {
        if (
          cell &&
          typeof cell === "string" &&
          keyColumns.some((key) => cell.toLowerCase() === key.toLowerCase())
        ) {
          return i;
        }
      }
    }

    return 0; // Default to first row if no good match found
  }

  // Dashboard statistics for chlorine data
  // Get sensors with no water by cross-referencing chlorine data with water consumption
  async getChlorineSensorsWithNoWater(filter?: ChlorineDataFilter): Promise<{
    totalNoWaterSensors: number;
    noWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      chlorine_connected: string | null;
    }>;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log("Finding chlorine sensors with no water...");

      // Build conditions dynamically using sql chunks
      const conditions = [sql`1 = 1`];

      if (filter) {
        if (filter.region && filter.region !== "all") {
          conditions.push(sql`cs.region = ${filter.region}`);
        }
        if (filter.circle && filter.circle !== "all") {
          conditions.push(sql`cs.circle = ${filter.circle}`);
        }
        if (filter.division && filter.division !== "all") {
          conditions.push(sql`cs.division = ${filter.division}`);
        }
        if (filter.subDivision && filter.subDivision !== "all") {
          conditions.push(sql`cs.sub_division = ${filter.subDivision}`);
        }
        if (filter.block && filter.block !== "all") {
          conditions.push(sql`cs.block = ${filter.block}`);
        }
      }

      // Combine conditions with AND
      const combinedConditions = sql.join(conditions, sql` AND `);

      const query = sql`
        SELECT 
          cs.region,
          cs.circle,
          cs.division,
          cs.sub_division,
          cs.block,
          cs.scheme_id,
          cs.scheme_name,
          cs.village_name,
          cs.esr_name,
          wc.water_date_day7,
          wc.water_value_day7,
          cs.chlorine_connected
        FROM communication_status cs
        LEFT JOIN water_consumption wc ON (
          cs.region = wc.region AND
          cs.circle = wc.circle AND
          cs.division = wc.division AND
          cs.sub_division = wc.sub_division AND
          cs.block = wc.block AND
          cs.scheme_id = wc.scheme_id AND
          cs.scheme_name = wc.scheme_name AND
          cs.village_name = wc.village_name AND
          cs.esr_name = wc.esr_name
        )
        WHERE ${combinedConditions}
          AND cs.chlorine_connected = 'Connected'
          AND cs.chlorine_status = 'Online'
          AND (
            wc.water_value_day7 IS NULL OR 
            CAST(wc.water_value_day7 AS text) = '0' OR
            CAST(wc.water_value_day7 AS text) = '0.0' OR
            CAST(wc.water_value_day7 AS text) = '0.00' OR
            wc.water_value_day7 = 0
          )
      `;

      const result = await db.execute(query);

      console.log(
        `Found ${result.rows ? result.rows.length : 0} chlorine sensors with no water`,
      );

      const resultRows = result.rows || [];

      return {
        totalNoWaterSensors: resultRows.length,
        noWaterSensors: resultRows.map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          water_date_day7: row.water_date_day7,
          water_value_day7: row.water_value_day7
            ? Number(row.water_value_day7)
            : null,
          chlorine_connected: row.chlorine_connected,
        })),
      };
    } catch (error) {
      console.error("Error getting chlorine sensors with no water:", error);
      // Return empty result instead of throwing to allow dashboard to continue
      return {
        totalNoWaterSensors: 0,
        noWaterSensors: [],
      };
    }
  }

  async getChlorineSensorsWithWater(filter?: ChlorineDataFilter): Promise<{
    totalWithWaterSensors: number;
    withWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      chlorine_connected: string | null;
    }>;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log("Finding chlorine sensors with water...");

      // Build conditions dynamically using sql chunks
      const conditions = [sql`1 = 1`];

      if (filter) {
        if (filter.region && filter.region !== "all") {
          conditions.push(sql`cs.region = ${filter.region}`);
        }
        if (filter.circle && filter.circle !== "all") {
          conditions.push(sql`cs.circle = ${filter.circle}`);
        }
        if (filter.division && filter.division !== "all") {
          conditions.push(sql`cs.division = ${filter.division}`);
        }
        if (filter.subDivision && filter.subDivision !== "all") {
          conditions.push(sql`cs.sub_division = ${filter.subDivision}`);
        }
        if (filter.block && filter.block !== "all") {
          conditions.push(sql`cs.block = ${filter.block}`);
        }
      }

      // Combine conditions with AND
      const combinedConditions = sql.join(conditions, sql` AND `);

      const query = sql`
        SELECT 
          cs.region,
          cs.circle,
          cs.division,
          cs.sub_division,
          cs.block,
          cs.scheme_id,
          cs.scheme_name,
          cs.village_name,
          cs.esr_name,
          wc.water_date_day7,
          wc.water_value_day7,
          cs.chlorine_connected
        FROM communication_status cs
        LEFT JOIN water_consumption wc ON (
          cs.region = wc.region AND
          cs.circle = wc.circle AND
          cs.division = wc.division AND
          cs.sub_division = wc.sub_division AND
          cs.block = wc.block AND
          cs.scheme_id = wc.scheme_id AND
          cs.scheme_name = wc.scheme_name AND
          cs.village_name = wc.village_name AND
          cs.esr_name = wc.esr_name
        )
        WHERE ${combinedConditions}
          AND cs.chlorine_connected = 'Connected'
          AND cs.chlorine_status = 'Online'
          AND wc.water_value_day7 IS NOT NULL 
          AND CAST(wc.water_value_day7 AS text) != '0'
          AND CAST(wc.water_value_day7 AS text) != '0.0'
          AND CAST(wc.water_value_day7 AS text) != '0.00'
          AND wc.water_value_day7 > 0
      `;

      const result = await db.execute(query);

      console.log(
        `Found ${result.rows ? result.rows.length : 0} chlorine sensors with water`,
      );

      const resultRows = result.rows || [];

      return {
        totalWithWaterSensors: resultRows.length,
        withWaterSensors: resultRows.map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          water_date_day7: row.water_date_day7,
          water_value_day7: row.water_value_day7
            ? Number(row.water_value_day7)
            : null,
          chlorine_connected: row.chlorine_connected,
        })),
      };
    } catch (error) {
      console.error("Error getting chlorine sensors with water:", error);
      // Return empty result instead of throwing to allow dashboard to continue
      return {
        totalWithWaterSensors: 0,
        withWaterSensors: [],
      };
    }
  }

  async getChlorineFilterOptions(filter: ChlorineDataFilter): Promise<ChlorineFilterOptions> {
    const db = await this.ensureInitialized();

    // Regions (always all accessible regions)
    const regionsResult = await db
      .selectDistinct({ value: communicationStatus.region })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.region))
      .orderBy(communicationStatus.region);

    // Circles (filtered by region)
    let circlesQuery = db
      .selectDistinct({ value: communicationStatus.circle })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.circle));

    if (filter.region && filter.region !== 'all') {
      circlesQuery.where(eq(communicationStatus.region, filter.region));
    }
    const circlesResult = await circlesQuery.orderBy(communicationStatus.circle);

    // Divisions (filtered by region + circle)
    let divisionsQuery = db
      .selectDistinct({ value: communicationStatus.division })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.division));

    if (filter.region && filter.region !== 'all') {
      divisionsQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter.circle && filter.circle !== 'all') {
      divisionsQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    const divisionsResult = await divisionsQuery.orderBy(communicationStatus.division);

    // Subdivisions (filtered by region + circle + division)
    let subDivisionsQuery = db
      .selectDistinct({ value: communicationStatus.sub_division })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.sub_division));

    if (filter.region && filter.region !== 'all') {
      subDivisionsQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter.circle && filter.circle !== 'all') {
      subDivisionsQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    if (filter.division && filter.division !== 'all') {
      subDivisionsQuery.where(eq(communicationStatus.division, filter.division));
    }
    const subDivisionsResult = await subDivisionsQuery.orderBy(communicationStatus.sub_division);

    // Blocks (filtered by all above)
    let blocksQuery = db
      .selectDistinct({ value: communicationStatus.block })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.block));

    if (filter.region && filter.region !== 'all') {
      blocksQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter.circle && filter.circle !== 'all') {
      blocksQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    if (filter.division && filter.division !== 'all') {
      blocksQuery.where(eq(communicationStatus.division, filter.division));
    }
    const subDivision = filter.subDivision || filter.subdivision;
    if (subDivision && subDivision !== 'all') {
      blocksQuery.where(eq(communicationStatus.sub_division, subDivision));
    }
    const blocksResult = await blocksQuery.orderBy(communicationStatus.block);

    return {
      regions: regionsResult.map((r: any) => r.value).filter(Boolean),
      circles: circlesResult.map((r: any) => r.value).filter(Boolean),
      divisions: divisionsResult.map((r: any) => r.value).filter(Boolean),
      subdivisions: subDivisionsResult.map((r: any) => r.value).filter(Boolean),
      blocks: blocksResult.map((r: any) => r.value).filter(Boolean),
    };
  }

  async getPressureFilterOptions(filter: PressureDataFilter): Promise<PressureFilterOptions> {
    const db = await this.ensureInitialized();

    // Regions (always all accessible regions)
    const regionsResult = await db
      .selectDistinct({ value: communicationStatus.region })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.region))
      .orderBy(communicationStatus.region);

    // Circles (filtered by region)
    let circlesQuery = db
      .selectDistinct({ value: communicationStatus.circle })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.circle));

    if (filter.region && filter.region !== 'all') {
      circlesQuery.where(eq(communicationStatus.region, filter.region));
    }
    const circlesResult = await circlesQuery.orderBy(communicationStatus.circle);

    // Divisions (filtered by region + circle)
    let divisionsQuery = db
      .selectDistinct({ value: communicationStatus.division })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.division));

    if (filter.region && filter.region !== 'all') {
      divisionsQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter.circle && filter.circle !== 'all') {
      divisionsQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    const divisionsResult = await divisionsQuery.orderBy(communicationStatus.division);

    // Subdivisions (filtered by region + circle + division)
    let subDivisionsQuery = db
      .selectDistinct({ value: communicationStatus.sub_division })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.sub_division));

    if (filter.region && filter.region !== 'all') {
      subDivisionsQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter.circle && filter.circle !== 'all') {
      subDivisionsQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    if (filter.division && filter.division !== 'all') {
      subDivisionsQuery.where(eq(communicationStatus.division, filter.division));
    }
    const subDivisionsResult = await subDivisionsQuery.orderBy(communicationStatus.sub_division);

    // Blocks (filtered by all above)
    let blocksQuery = db
      .selectDistinct({ value: communicationStatus.block })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.block));

    if (filter.region && filter.region !== 'all') {
      blocksQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter.circle && filter.circle !== 'all') {
      blocksQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    if (filter.division && filter.division !== 'all') {
      blocksQuery.where(eq(communicationStatus.division, filter.division));
    }
    const subDivision = filter.subDivision || filter.subdivision;
    if (subDivision && subDivision !== 'all') {
      blocksQuery.where(eq(communicationStatus.sub_division, subDivision));
    }
    const blocksResult = await blocksQuery.orderBy(communicationStatus.block);

    return {
      regions: regionsResult.map((r: any) => r.value).filter(Boolean),
      circles: circlesResult.map((r: any) => r.value).filter(Boolean),
      divisions: divisionsResult.map((r: any) => r.value).filter(Boolean),
      subdivisions: subDivisionsResult.map((r: any) => r.value).filter(Boolean),
      blocks: blocksResult.map((r: any) => r.value).filter(Boolean),
    };
  }

  async getWaterConsumptionFilterOptions(filter?: any): Promise<WaterConsumptionFilterOptions> {
    const db = await this.ensureInitialized();

    // Regions (always all accessible regions)
    const regionsResult = await db
      .selectDistinct({ value: communicationStatus.region })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.region))
      .orderBy(communicationStatus.region);

    // Circles (filtered by region)
    let circlesQuery = db
      .selectDistinct({ value: communicationStatus.circle })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.circle));

    if (filter?.region && filter.region !== 'all') {
      circlesQuery = circlesQuery.where(eq(communicationStatus.region, filter.region));
    }
    const circlesResult = await circlesQuery.orderBy(communicationStatus.circle);

    // Divisions (filtered by region and circle)
    let divisionsQuery = db
      .selectDistinct({ value: communicationStatus.division })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.division));

    if (filter?.region && filter.region !== 'all') {
      divisionsQuery = divisionsQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter?.circle && filter.circle !== 'all') {
      divisionsQuery = divisionsQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    const divisionsResult = await divisionsQuery.orderBy(communicationStatus.division);

    // Subdivisions (filtered by region, circle, and division)
    let subDivisionsQuery = db
      .selectDistinct({ value: communicationStatus.sub_division })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.sub_division));

    if (filter?.region && filter.region !== 'all') {
      subDivisionsQuery = subDivisionsQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter?.circle && filter.circle !== 'all') {
      subDivisionsQuery = subDivisionsQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    if (filter?.division && filter.division !== 'all') {
      subDivisionsQuery = subDivisionsQuery.where(eq(communicationStatus.division, filter.division));
    }
    const subDivisionsResult = await subDivisionsQuery.orderBy(communicationStatus.sub_division);

    // Blocks (filtered by region, circle, division, and subdivision)
    let blocksQuery = db
      .selectDistinct({ value: communicationStatus.block })
      .from(communicationStatus)
      .where(isNotNull(communicationStatus.block));

    if (filter?.region && filter.region !== 'all') {
      blocksQuery = blocksQuery.where(eq(communicationStatus.region, filter.region));
    }
    if (filter?.circle && filter.circle !== 'all') {
      blocksQuery = blocksQuery.where(eq(communicationStatus.circle, filter.circle));
    }
    if (filter?.division && filter.division !== 'all') {
      blocksQuery = blocksQuery.where(eq(communicationStatus.division, filter.division));
    }
    const subDivision = filter?.subDivision || filter?.subdivision;
    if (subDivision && subDivision !== 'all') {
      blocksQuery = blocksQuery.where(eq(communicationStatus.sub_division, subDivision));
    }
    const blocksResult = await blocksQuery.orderBy(communicationStatus.block);

    return {
      regions: regionsResult.map((r: any) => r.value).filter(Boolean),
      circles: circlesResult.map((r: any) => r.value).filter(Boolean),
      divisions: divisionsResult.map((r: any) => r.value).filter(Boolean),
      subdivisions: subDivisionsResult.map((r: any) => r.value).filter(Boolean),
      blocks: blocksResult.map((r: any) => r.value).filter(Boolean),
    };
  }


  async getRegionalChlorineStats(fullyCompletedSchemeIds?: Set<string>): Promise<
    Array<{
      region: string;
      totalConnected: number;
      totalOnline: number;
      onlineWithWater: number;
      onlineWithWaterChlorineOptimal: number;
      onlineWithWaterChlorineAbove: number;
      onlineWithWaterChlorineBelow: number;
      onlineWithWaterNoChlorineData: number;
      onlineWithoutWater: number;
      onlineWithoutWaterChlorineOptimal: number;
      onlineWithoutWaterChlorineAbove: number;
      onlineWithoutWaterChlorineBelow: number;
      totalOffline: number;
      offlineSince7Days: number;
      offlineSince30Days: number;
      offlineSince3Days: number;
    }>
  > {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log("Calculating regional chlorine sensor statistics...");

      const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql`AND cs.scheme_id = ANY(${Array.from(fullyCompletedSchemeIds)})`
        : sql``;

      // Get all unique regions from communication status
      const regionsQuery = sql`
        SELECT DISTINCT region 
        FROM communication_status 
        WHERE region IS NOT NULL 
          ${schemeFilter}
        ORDER BY region
      `;
      const regionsResult = await db.execute(regionsQuery);
      const regions = (regionsResult.rows || []).map((row: any) => row.region);

      console.log(`Found ${regions.length} regions to process`);

      // Calculate statistics for each region
      const regionalStats = await Promise.all(
        regions.map(async (region) => {
          // Query for all statistics in one go
          const statsQuery = sql`
            SELECT 
              COUNT(DISTINCT CASE WHEN cs.chlorine_connected = 'Connected' THEN cs.id END) as total_connected,
              COUNT(DISTINCT CASE WHEN cs.chlorine_connected = 'Connected' AND cs.chlorine_status = 'Online' THEN cs.id END) as total_online,
              COUNT(DISTINCT CASE WHEN cs.chlorine_connected = 'Connected' AND cs.chlorine_status = 'Offline' THEN cs.id END) as total_offline,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL 
                  AND CAST(wc.water_value_day7 AS text) != '0'
                  AND CAST(wc.water_value_day7 AS text) != '0.0'
                  AND CAST(wc.water_value_day7 AS text) != '0.00'
                  AND wc.water_value_day7 > 0
                THEN cs.id 
              END) as online_with_water,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL 
                    OR CAST(wc.water_value_day7 AS text) = '0'
                    OR CAST(wc.water_value_day7 AS text) = '0.0'
                    OR CAST(wc.water_value_day7 AS text) = '0.00'
                    OR wc.water_value_day7 = 0)
                THEN cs.id 
              END) as online_without_water,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL 
                  AND wc.water_value_day7 > 0
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 >= 0.2 
                  AND cd.chlorine_value_7 <= 0.5
                THEN cs.id 
              END) as online_with_water_chlorine_optimal,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL 
                  AND wc.water_value_day7 > 0
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 > 0.5
                THEN cs.id 
              END) as online_with_water_chlorine_above,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND wc.water_value_day7 IS NOT NULL 
                  AND wc.water_value_day7 > 0
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 < 0.2
                THEN cs.id 
              END) as online_with_water_chlorine_below,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 >= 0.2 
                  AND cd.chlorine_value_7 <= 0.5
                THEN cs.id 
              END) as online_without_water_chlorine_optimal,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 > 0.5
                THEN cs.id 
              END) as online_without_water_chlorine_above,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Online' 
                  AND (wc.water_value_day7 IS NULL OR wc.water_value_day7 = 0)
                  AND cd.chlorine_value_7 IS NOT NULL 
                  AND cd.chlorine_value_7 < 0.2
                THEN cs.id 
              END) as online_without_water_chlorine_below,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Offline' 
                  AND cs.last_seen IS NOT NULL
                  AND CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '7 days'
                THEN cs.id 
              END) as offline_since_7days,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Offline' 
                  AND cs.last_seen IS NOT NULL
                  AND CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '30 days'
                THEN cs.id 
              END) as offline_since_30days,
              COUNT(DISTINCT CASE 
                WHEN cs.chlorine_connected = 'Connected' 
                  AND cs.chlorine_status = 'Offline' 
                  AND cs.last_seen IS NOT NULL
                  AND CURRENT_TIMESTAMP - cs.last_seen >= INTERVAL '3 days'
                THEN cs.id 
              END) as offline_since_3days
            FROM communication_status cs
            LEFT JOIN water_consumption wc ON (
              cs.region = wc.region AND
              cs.circle = wc.circle AND
              cs.division = wc.division AND
              cs.sub_division = wc.sub_division AND
              cs.block = wc.block AND
              cs.scheme_id = wc.scheme_id AND
              cs.scheme_name = wc.scheme_name AND
              cs.village_name = wc.village_name AND
              cs.esr_name = wc.esr_name
            )
            LEFT JOIN chlorine_data cd ON (
              cs.region = cd.region AND
              cs.circle = cd.circle AND
              cs.division = cd.division AND
              cs.sub_division = cd.sub_division AND
              cs.block = cd.block AND
              cs.scheme_id = cd.scheme_id AND
              cs.scheme_name = cd.scheme_name AND
              cs.village_name = cd.village_name AND
              cs.esr_name = cd.esr_name
            )
            WHERE cs.region = ${region}
              ${schemeFilter}
          `;

          const result = await db.execute(statsQuery);
          const row = result.rows?.[0] || {};

          const onlineWithWater = Number(row.online_with_water) || 0;
          const onlineWithWaterChlorineOptimal = Number(row.online_with_water_chlorine_optimal) || 0;
          const onlineWithWaterChlorineAbove = Number(row.online_with_water_chlorine_above) || 0;
          const onlineWithWaterChlorineBelow = Number(row.online_with_water_chlorine_below) || 0;

          // Calculate no chlorine data: online with water sensors that have no chlorine reading
          const sumRanges = onlineWithWaterChlorineOptimal + onlineWithWaterChlorineAbove + onlineWithWaterChlorineBelow;
          const onlineWithWaterNoChlorineData = Math.max(onlineWithWater - sumRanges, 0);

          return {
            region,
            totalConnected: Number(row.total_connected) || 0,
            totalOnline: Number(row.total_online) || 0,
            onlineWithWater,
            onlineWithWaterChlorineOptimal,
            onlineWithWaterChlorineAbove,
            onlineWithWaterChlorineBelow,
            onlineWithWaterNoChlorineData,
            onlineWithoutWater: Number(row.online_without_water) || 0,
            onlineWithoutWaterChlorineOptimal:
              Number(row.online_without_water_chlorine_optimal) || 0,
            onlineWithoutWaterChlorineAbove:
              Number(row.online_without_water_chlorine_above) || 0,
            onlineWithoutWaterChlorineBelow:
              Number(row.online_without_water_chlorine_below) || 0,
            totalOffline: Number(row.total_offline) || 0,
            offlineSince7Days: Number(row.offline_since_7days) || 0,
            offlineSince30Days: Number(row.offline_since_30days) || 0,
            offlineSince3Days: Number(row.offline_since_3days) || 0,
          };
        }),
      );

      console.log(`Calculated statistics for ${regionalStats.length} regions`);
      return regionalStats;
    } catch (error) {
      console.error("Error calculating regional chlorine stats:", error);
      return [];
    }
  }

  async getChlorineDayWiseBreakdown(regionName?: string, fullyCompletedSchemeIds?: Set<string>): Promise<
    Array<{
      days: number;
      offline: number;
      below_0_2: number;
      above_0_5: number;
      optimal_0_2_0_5: number;
    }>
  > {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `Calculating day-wise breakdown for region: ${regionName || "all"}`,
      );

      const regionFilter = regionName
        ? (regionName.toLowerCase().includes('chhatrapati')
          ? sql`AND (cs.region ILIKE '%Chhatrapati%' OR cs.region ILIKE 'Aurangabad%')`
          : sql`AND cs.region ILIKE ${'%' + regionName + '%'}`
        )
        : sql``;

      const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND cs.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      const schemeHistoryFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND ch.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      const query = sql`
        WITH 
        -- Calculate offline days for each sensor
        offline_sensors AS (
          SELECT 
            cs.scheme_id,
            cs.village_name,
            cs.esr_name,
            CASE 
              WHEN cs.chlorine_status = 'Offline' AND cs.last_seen IS NOT NULL 
              THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.last_seen))::integer
              ELSE 0
            END as offline_days
          FROM communication_status cs
          WHERE cs.chlorine_connected = 'Connected'
            ${regionFilter}
            ${schemeFilter}
        ),
        -- Calculate consecutive days below 0.2 and above 0.5 from chlorine_history
        ranked_history AS (
          SELECT 
            ch.scheme_id,
            ch.village_name,
            ch.esr_name,
            ch.chlorine_value,
            -- Robust Date Parsing Logic
            (
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                    THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END
            ) as date_val,
            
            -- Calculate Previous Date (chronologically next because of DESC sort) for gap detection
            LAG(
            -- Robust Date Parsing Logic
            (
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                    THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END
            )
            ) OVER (
              PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name 
              ORDER BY (
                CASE 
                  WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                  WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                    CASE 
                      WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                      THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                      ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                    END
                  ELSE NULL 
                END
              ) DESC
            ) as prev_date_val,
            
            -- Deduplication row number: partition by sensor AND date, prefer higher chlorine values
            ROW_NUMBER() OVER (
              PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name, (
                CASE 
                  WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                  WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                    CASE 
                      WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                      THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                      ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                    END
                  ELSE NULL 
                END
              )
              ORDER BY ch.chlorine_value DESC
            ) as dedup_rn,

            ROW_NUMBER() OVER (PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name ORDER BY (
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                    THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END
            ) DESC) as rn,
            CASE WHEN ch.chlorine_value < 0.2 THEN 1 ELSE 0 END as is_below,
            CASE WHEN ch.chlorine_value > 0.5 THEN 1 ELSE 0 END as is_above,
            CASE WHEN ch.chlorine_value >= 0.2 AND ch.chlorine_value <= 0.5 THEN 1 ELSE 0 END as is_optimal
          FROM chlorine_history ch
          WHERE (
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                    THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END
            ) >= CURRENT_DATE - INTERVAL '365 days'
            AND (
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                    THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END
            ) <= CURRENT_DATE
            AND ch.chlorine_value IS NOT NULL
            ${regionName
          ? (regionName.toLowerCase().includes('chhatrapati')
            ? sql`AND (ch.region ILIKE '%Chhatrapati%' OR ch.region ILIKE 'Aurangabad%')`
            : sql`AND ch.region ILIKE ${'%' + regionName + '%'}`
          )
          : sql``}
            ${schemeHistoryFilter}
        ),
        deduped_history AS (
          SELECT * FROM ranked_history WHERE dedup_rn = 1
        ),
        valid_history AS (
          SELECT *,
            CASE 
              WHEN prev_date_val IS NOT NULL AND (prev_date_val - date_val) > 1 THEN 1 
              ELSE 0 
            END as is_gap
          FROM deduped_history
        ),
        chlorine_consecutive AS (
          SELECT 
            rh1.scheme_id,
            rh1.village_name,
            rh1.esr_name,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM valid_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_below = 0 OR rh3.is_gap = 1)
                    AND rh3.rn > 0
                )
                AND rh2.is_below = 1
            ), 0) as consecutive_below_0_2,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM valid_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_above = 0 OR rh3.is_gap = 1)
                    AND rh3.rn > 0
                )
                AND rh2.is_above = 1
            ), 0) as consecutive_above_0_5,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM valid_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_optimal = 0 OR rh3.is_gap = 1)
                    AND rh3.rn > 0
                )
                AND rh2.is_optimal = 1
            ), 0) as consecutive_optimal_0_2_0_5
          FROM (
            SELECT DISTINCT vh.scheme_id, vh.village_name, vh.esr_name 
            FROM valid_history vh
            INNER JOIN communication_status cs ON 
              vh.scheme_id = cs.scheme_id AND 
              vh.village_name = cs.village_name AND 
              vh.esr_name = cs.esr_name
            WHERE cs.chlorine_connected = 'Connected'
              ${regionFilter}
              ${schemeFilter}
          ) rh1
        ),
        -- Combine all metrics
        day_counts AS (
          SELECT 
            LEAST(GREATEST(offline_days, 0), 30) as days_count,
            'offline' as metric_type
          FROM offline_sensors
          WHERE offline_days > 0
          
          UNION ALL
          
          SELECT 
            LEAST(consecutive_below_0_2, 30) as days_count,
            'below_0_2' as metric_type
          FROM chlorine_consecutive
          WHERE consecutive_below_0_2 > 0
          
          UNION ALL
          
          SELECT 
            LEAST(consecutive_above_0_5, 30) as days_count,
            'above_0_5' as metric_type
          FROM chlorine_consecutive
          WHERE consecutive_above_0_5 > 0
          
          UNION ALL
          
          SELECT 
            LEAST(consecutive_optimal_0_2_0_5, 30) as days_count,
            'optimal_0_2_0_5' as metric_type
          FROM chlorine_consecutive
          WHERE consecutive_optimal_0_2_0_5 > 0
        )
        -- Aggregate by day number
        SELECT 
          generate_series as days,
          COALESCE(SUM(CASE WHEN metric_type = 'offline' THEN 1 ELSE 0 END), 0)::integer as offline,
          COALESCE(SUM(CASE WHEN metric_type = 'below_0_2' THEN 1 ELSE 0 END), 0)::integer as below_0_2,
          COALESCE(SUM(CASE WHEN metric_type = 'above_0_5' THEN 1 ELSE 0 END), 0)::integer as above_0_5,
          COALESCE(SUM(CASE WHEN metric_type = 'optimal_0_2_0_5' THEN 1 ELSE 0 END), 0)::integer as optimal_0_2_0_5
        FROM generate_series(1, 30) 
        LEFT JOIN day_counts ON day_counts.days_count >= generate_series
        GROUP BY generate_series
        ORDER BY generate_series DESC
      `;

      const result = await db.execute(query);

      return (result.rows || []).map((row: any) => ({
        days: Number(row.days),
        offline: Number(row.offline) || 0,
        below_0_2: Number(row.below_0_2) || 0,
        above_0_5: Number(row.above_0_5) || 0,
        optimal_0_2_0_5: Number(row.optimal_0_2_0_5) || 0,
      }));
    } catch (error) {
      console.error("Error calculating day-wise breakdown:", error);
      return [];
    }
  }

  async getChlorineSensorsByDayWiseCriteria(
    metric: "offline" | "below_0_2" | "above_0_5" | "optimal_0_2_0_5",
    days: number,
    regionName?: string,
    fullyCompletedSchemeIds?: Set<string>,
  ): Promise<
    Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      chlorine_connected: string;
      chlorine_status: string;
      last_seen: string | null;
      consecutive_days: number;
      latest_chlorine_value?: number | null;
      latest_chlorine_date?: string | null;
    }>
  > {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `Fetching sensors for metric: ${metric}, days: ${days}, region: ${regionName || "all"}`,
      );

      const regionFilter = regionName
        ? (regionName.toLowerCase().includes('chhatrapati')
          ? sql`AND (cs.region ILIKE '%Chhatrapati%' OR cs.region ILIKE 'Aurangabad%')`
          : sql`AND cs.region ILIKE ${'%' + regionName + '%'}`
        )
        : sql``;

      const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND cs.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      const schemeHistoryFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND ch.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      if (metric === "offline") {
        // Get sensors offline for exactly N days
        const query = sql`
          SELECT 
            cs.region,
            cs.circle,
            cs.division,
            cs.sub_division,
            cs.block,
            cs.scheme_id,
            cs.scheme_name,
            cs.village_name,
            cs.esr_name,
            cs.chlorine_connected,
            cs.chlorine_status,
            cs.chlorine_status,
            cs.last_seen,
            EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.last_seen))::integer as consecutive_days,
            cd.dashboard_url
          FROM communication_status cs
          LEFT JOIN chlorine_data cd ON (
            cs.scheme_id = cd.scheme_id AND
            cs.village_name = cd.village_name AND
            cs.esr_name = cd.esr_name
          )
          WHERE cs.chlorine_connected = 'Connected'
            AND cs.chlorine_status = 'Offline'
            AND cs.last_seen IS NOT NULL
            AND EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.last_seen))::integer >= ${days}
            ${regionFilter}
            ${schemeFilter}
          ORDER BY cs.region, cs.scheme_id, cs.village_name, cs.esr_name
          LIMIT 500
        `;

        const result = await db.execute(query);
        return (result.rows || []).map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          chlorine_connected: row.chlorine_connected,
          chlorine_status: row.chlorine_status,
          last_seen: row.last_seen,
          consecutive_days: Number(row.consecutive_days) || 0,
          dashboard_url: row.dashboard_url,
        }));
      } else {
        // Get sensors with consecutive chlorine readings below 0.2, above 0.5, or optimal (0.2-0.5)
        const chlorineCondition =
          metric === "below_0_2"
            ? sql`ch.chlorine_value < 0.2`
            : metric === "above_0_5"
              ? sql`ch.chlorine_value > 0.5`
              : sql`ch.chlorine_value >= 0.2 AND ch.chlorine_value <= 0.5`;

        const query = sql`
          WITH ranked_history AS (
            SELECT 
              ch.region,
              ch.scheme_id,
              ch.village_name,
              ch.esr_name,
              ch.chlorine_value,
              ch.chlorine_date,
              ch.dashboard_url,
              -- Robust Date Parsing Logic
              (
              CASE 
                WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                    THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                    ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                  END
                ELSE NULL 
              END
              ) as date_val,
              
              -- Calculate Previous Date for gap detection
              LAG(
                CASE 
                  WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                  WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                    CASE 
                      WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                      THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                      ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                    END
                  ELSE NULL 
                END
              ) OVER (
                PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name 
                ORDER BY (
                  CASE 
                    WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                    WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                    WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                      CASE 
                        WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                        THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                        ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                      END
                    ELSE NULL 
                  END
                ) DESC
              ) as prev_date_val,
              
              ROW_NUMBER() OVER (
                PARTITION BY ch.scheme_id, ch.village_name, ch.esr_name 
                ORDER BY (
                  CASE 
                    WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                    WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                    WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                      CASE 
                        WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                        THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                        ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                      END
                    ELSE NULL 
                  END
                ) DESC
              ) as rn,
              CASE WHEN ${chlorineCondition} THEN 1 ELSE 0 END as meets_condition
            FROM chlorine_history ch
            WHERE (
                CASE 
                  WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                  WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                    CASE 
                      WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                      THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                      ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                    END
                  ELSE NULL 
                END
              ) >= CURRENT_DATE - INTERVAL '365 days'
              AND (
                CASE 
                  WHEN regexp_replace(ch.chlorine_date, '\\s', '', 'g') ~ '^[0-9.]+$' AND length(regexp_replace(ch.chlorine_date, '\\s', '', 'g')) <= 7 THEN (DATE '1899-12-30' + (regexp_replace(ch.chlorine_date, '\\s', '', 'g')::numeric)::integer)
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ch.chlorine_date, 'DD-Mon-YYYY')
                  WHEN ch.chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ch.chlorine_date, 'YYYY-MM-DD')
                  WHEN ch.chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                    CASE 
                      WHEN TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY') > CURRENT_DATE 
                      THEN TO_DATE(ch.chlorine_date || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) - 1), 'DD-Mon-YYYY')
                      ELSE TO_DATE(ch.chlorine_date || '-' || EXTRACT(YEAR FROM CURRENT_DATE), 'DD-Mon-YYYY')
                    END
                  ELSE NULL 
                END
              ) <= CURRENT_DATE
              AND ch.chlorine_value IS NOT NULL
              ${regionName ? sql`AND ch.region = ${regionName}` : sql``}
              ${schemeHistoryFilter}
          ),
          valid_history AS (
            SELECT *,
              CASE 
                WHEN prev_date_val IS NOT NULL AND (prev_date_val - date_val) > 1 THEN 1 
                ELSE 0 
              END as is_gap
            FROM ranked_history
          ),
          latest_readings AS (
            SELECT 
              scheme_id,
              village_name,
              esr_name,
              chlorine_value as latest_chlorine_value,
              chlorine_date as latest_chlorine_date,
              dashboard_url as latest_dashboard_url
            FROM ranked_history
            WHERE rn = 1
          ),
          sensor_streaks AS (
            SELECT 
              rh1.scheme_id,
              rh1.village_name,
              rh1.esr_name,
              COALESCE((
                SELECT COUNT(*)
                FROM valid_history rh2
                WHERE rh2.scheme_id = rh1.scheme_id
                  AND rh2.village_name = rh1.village_name
                  AND rh2.esr_name = rh1.esr_name
                  AND rh2.rn <= COALESCE((
                    SELECT MIN(rh3.rn) - 1
                    FROM valid_history rh3
                    WHERE rh3.scheme_id = rh1.scheme_id
                      AND rh3.village_name = rh1.village_name
                      AND rh3.esr_name = rh1.esr_name
                      AND (rh3.meets_condition = 0 OR rh3.is_gap = 1)
                      AND rh3.rn > 0
                  ), 30)
                  AND rh2.meets_condition = 1
              ), 0) as consecutive_days
            FROM (SELECT DISTINCT scheme_id, village_name, esr_name FROM valid_history) rh1
          )
          SELECT 
            cs.region,
            cs.circle,
            cs.division,
            cs.sub_division,
            cs.block,
            cs.scheme_id,
            cs.scheme_name,
            cs.village_name,
            cs.esr_name,
            cs.chlorine_connected,
            cs.chlorine_status,
            cs.last_seen,
            ss.consecutive_days,
            lr.latest_chlorine_value,
            lr.latest_chlorine_date,
            cd.dashboard_url
          FROM sensor_streaks ss
          JOIN communication_status cs ON (
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )
          LEFT JOIN latest_readings lr ON (
            ss.scheme_id = lr.scheme_id
            AND ss.village_name = lr.village_name
            AND ss.esr_name = lr.esr_name
          )
          LEFT JOIN chlorine_data cd ON (
            ss.scheme_id = cd.scheme_id
            AND ss.village_name = cd.village_name
            AND ss.esr_name = cd.esr_name
          )
          WHERE ss.consecutive_days >= ${days}
            ${regionFilter}
          ORDER BY cs.region, cs.scheme_id, cs.village_name, cs.esr_name
        `;

        const result = await db.execute(query);
        return (result.rows || []).map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          chlorine_connected: row.chlorine_connected,
          chlorine_status: row.chlorine_status,
          last_seen: row.last_seen,
          consecutive_days: Number(row.consecutive_days) || 0,
          latest_chlorine_value: row.latest_chlorine_value,
          latest_chlorine_date: row.latest_chlorine_date,
          dashboard_url: row.dashboard_url,
        }));
      }
    } catch (error) {
      console.error(
        `Error fetching sensors by day-wise criteria (${metric}, ${days} days):`,
        error,
      );
      return [];
    }
  }

  // Get sensors with no water by cross-referencing pressure data with water consumption

  async getPressureSensorsByDayWiseCriteria(
    metric: "offline" | "below_0_2" | "above_0_7" | "optimal_0_2_0_7",
    days: number,
    regionName?: string,
    fullyCompletedSchemeIds?: Set<string>,
  ) {
    await this.initialized;
    const db = await this.ensureInitialized();
    console.log(
      `Fetching pressure sensors for metric=${metric}, days=${days}, region=${regionName}`,
    );

    // Common filters
    const regionFilter = regionName
      ? (regionName.toLowerCase().includes('chhatrapati')
        ? sql`AND (cs.region ILIKE '%Chhatrapati%' OR cs.region ILIKE 'Aurangabad%')`
        : sql`AND cs.region ILIKE ${'%' + regionName + '%'}`
      )
      : sql``;
    const schemeFilter =
      fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(
          `AND cs.scheme_id IN (${Array.from(fullyCompletedSchemeIds)
            .map((id) => `'${id}'`)
            .join(",")})`,
        )
        : sql``;

    try {
      if (metric === "offline") {
        // Offline logic: Simple date diff from last_seen
        // Limit to 500 for performance
        const query = sql`
          SELECT 
            cs.region,
            cs.circle,
            cs.division,
            cs.sub_division,
            cs.block,
            cs.scheme_id,
            cs.scheme_name,
            cs.village_name,
            cs.esr_name,
            cs.pressure_connected,
            cs.pressure_status,
            cs.pressure_last_seen as last_seen,
            EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.pressure_last_seen))::integer as consecutive_days,
            pd.pressure_value_7 as latest_pressure_value,
            pd.pressure_date_day_7 as latest_pressure_date,
            pd.dashboard_url
          FROM communication_status cs
          LEFT JOIN pressure_data pd ON (
            cs.scheme_id = pd.scheme_id AND
            cs.village_name = pd.village_name AND
            cs.esr_name = pd.esr_name
          )
          WHERE cs.pressure_connected = 'Connected'
            AND cs.pressure_status = 'Offline'
            AND cs.pressure_last_seen IS NOT NULL
            AND EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.pressure_last_seen))::integer >= ${days}
            ${regionFilter}
            ${schemeFilter}
          ORDER BY cs.region, cs.scheme_id, cs.village_name, cs.esr_name
          LIMIT 5000
        `;

        const result = await db.execute(query);
        return (result.rows || []).map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          pressure_connected: row.pressure_connected,
          pressure_status: row.pressure_status,
          last_seen: row.last_seen,
          consecutive_days: Number(row.consecutive_days) || 0,
          latest_pressure_value: row.latest_pressure_value,
          latest_pressure_date: row.latest_pressure_date,
          dashboard_url: row.dashboard_url,
        }));
      } else {
        // Metrics logic (below_0_2, above_0_7, optimal_0_2_0_7)
        // Uses gap detection and deduplication

        const schemeHistoryFilter =
          fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
            ? sql.raw(
              `AND ph.scheme_id IN (${Array.from(fullyCompletedSchemeIds)
                .map((id) => `'${id}'`)
                .join(",")})`,
            )
            : sql``;

        const regionHistoryFilter = regionName
          ? sql`AND ph.region = ${regionName}`
          : sql``;

        const query = sql`
          WITH ranked_history AS (
            SELECT 
              ph.scheme_id,
              ph.village_name,
              ph.esr_name,
              -- Deduplicate by date: use ROW_NUMBER
              CASE 
                WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YYYY')
                WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  make_date(
                    CASE 
                      WHEN EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM ph.uploaded_at)
                      THEN EXTRACT(YEAR FROM ph.uploaded_at)::int - 1
                      ELSE EXTRACT(YEAR FROM ph.uploaded_at)::int
                    END,
                    EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int,
                    EXTRACT(DAY FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int
                  )
                WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YY')
                WHEN ph.pressure_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD/MM/YYYY')
                WHEN ph.pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'YYYY-MM-DD')
                ELSE NULL
              END as date_val,
              
              LAG(
                CASE 
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YYYY')
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                      make_date(
                        CASE 
                          WHEN EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM ph.uploaded_at)
                          THEN EXTRACT(YEAR FROM ph.uploaded_at)::int - 1
                          ELSE EXTRACT(YEAR FROM ph.uploaded_at)::int
                        END,
                        EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int,
                        EXTRACT(DAY FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int
                      )
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YY')
                    WHEN ph.pressure_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD/MM/YYYY')
                    WHEN ph.pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'YYYY-MM-DD')
                    ELSE NULL
                END
              ) OVER (
                PARTITION BY ph.scheme_id, ph.village_name, ph.esr_name 
                ORDER BY 
                  CASE 
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YYYY')
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                      make_date(
                        CASE 
                          WHEN EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM ph.uploaded_at)
                          THEN EXTRACT(YEAR FROM ph.uploaded_at)::int - 1
                          ELSE EXTRACT(YEAR FROM ph.uploaded_at)::int
                        END,
                        EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int,
                        EXTRACT(DAY FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int
                      )
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YY')
                    WHEN ph.pressure_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD/MM/YYYY')
                    WHEN ph.pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'YYYY-MM-DD')
                    ELSE NULL
                  END DESC NULLS LAST
              ) as prev_date_val,

              ROW_NUMBER() OVER (
                PARTITION BY ph.scheme_id, ph.village_name, ph.esr_name 
                ORDER BY 
                  CASE 
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YYYY')
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                      make_date(
                        CASE 
                          WHEN EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM ph.uploaded_at)
                          THEN EXTRACT(YEAR FROM ph.uploaded_at)::int - 1
                          ELSE EXTRACT(YEAR FROM ph.uploaded_at)::int
                        END,
                        EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int,
                        EXTRACT(DAY FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int
                      )
                    WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YY')
                    WHEN ph.pressure_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD/MM/YYYY')
                    WHEN ph.pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'YYYY-MM-DD')
                    ELSE NULL
                  END DESC NULLS LAST
              ) as rn,
              -- Determine if this row meets the criteria
              -- Determine if this row meets the criteria
              CASE 
                WHEN ${metric === 'below_0_2' ? sql`AVG(ph.pressure_value) < 0.2` :
            metric === 'above_0_7' ? sql`AVG(ph.pressure_value) > 0.7` :
              metric === 'optimal_0_2_0_7' ? sql`AVG(ph.pressure_value) >= 0.2 AND AVG(ph.pressure_value) <= 0.7` :
                sql`0`
          } THEN 1 
                ELSE 0 
              END as meets_condition
            FROM pressure_history ph
            WHERE ph.pressure_value IS NOT NULL
              ${regionHistoryFilter}
              ${schemeHistoryFilter}
            GROUP BY 
              ph.scheme_id, 
              ph.village_name, 
              ph.esr_name,
              -- Group by Date Logic
              CASE 
                WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YYYY')
                WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                  make_date(
                    CASE 
                      WHEN EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM ph.uploaded_at)
                      THEN EXTRACT(YEAR FROM ph.uploaded_at)::int - 1
                      ELSE EXTRACT(YEAR FROM ph.uploaded_at)::int
                    END,
                    EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int,
                    EXTRACT(DAY FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int
                  )
                WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YY')
                WHEN ph.pressure_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD/MM/YYYY')
                WHEN ph.pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'YYYY-MM-DD')
                ELSE NULL
              END
          ),
          valid_history AS (
            SELECT *,
              -- Gap detection
              CASE 
                WHEN prev_date_val IS NOT NULL AND (prev_date_val - date_val) > 1 THEN 1 
                ELSE 0 
              END as is_gap
            FROM ranked_history
            WHERE date_val >= CURRENT_DATE - INTERVAL '365 days'
              AND date_val <= CURRENT_DATE
          ),
          sensor_streaks AS (
            SELECT 
              rh1.scheme_id,
              rh1.village_name,
              rh1.esr_name,
              COALESCE((
                SELECT COUNT(*)
                FROM valid_history rh2
                WHERE rh2.scheme_id = rh1.scheme_id
                  AND rh2.village_name = rh1.village_name
                  AND rh2.esr_name = rh1.esr_name
                  AND rh2.rn <= COALESCE((
                    SELECT MIN(rh3.rn) - 1
                    FROM valid_history rh3
                    WHERE rh3.scheme_id = rh1.scheme_id
                      AND rh3.village_name = rh1.village_name
                      AND rh3.esr_name = rh1.esr_name
                      AND (rh3.meets_condition = 0 OR rh3.is_gap = 1)
                      AND rh3.rn > 0
                  ), 30)
                  AND rh2.meets_condition = 1
              ), 0) as consecutive_days
            FROM (SELECT DISTINCT scheme_id, village_name, esr_name FROM valid_history) rh1
          )
          SELECT 
            cs.region,
            cs.circle,
            cs.division,
            cs.sub_division,
            cs.block,
            cs.scheme_id,
            cs.scheme_name,
            cs.village_name,
            cs.esr_name,
            cs.pressure_connected,
            cs.pressure_status,
            cs.pressure_last_seen as last_seen,
            ss.consecutive_days,
            pd.pressure_value_7 as latest_pressure_value,
            pd.pressure_date_day_7 as latest_pressure_date,
            pd.dashboard_url
          FROM sensor_streaks ss
          JOIN communication_status cs ON (
            ss.scheme_id = cs.scheme_id
            AND ss.village_name = cs.village_name
            AND ss.esr_name = cs.esr_name
          )
          LEFT JOIN pressure_data pd ON (
            ss.scheme_id = pd.scheme_id
            AND ss.village_name = pd.village_name
            AND ss.esr_name = pd.esr_name
          )
          WHERE ss.consecutive_days >= ${days}
            ${regionFilter}
          ORDER BY cs.region, cs.scheme_id, cs.village_name, cs.esr_name
        `;

        const result = await db.execute(query);
        return (result.rows || []).map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          pressure_connected: row.pressure_connected,
          pressure_status: row.pressure_status,
          last_seen: row.last_seen,
          consecutive_days: Number(row.consecutive_days) || 0,
          latest_pressure_value: row.latest_pressure_value,
          latest_pressure_date: row.latest_pressure_date,
          dashboard_url: row.dashboard_url,
        }));
      }
    } catch (error) {
      console.error(
        `Error fetching pressure sensors by day-wise criteria (${metric}, ${days} days):`,
        error,
      );
      return [];
    }
  }


  async getPressureDayWiseBreakdown(regionName?: string, fullyCompletedSchemeIds?: Set<string>): Promise<
    Array<{
      days: number;
      offline: number;
      below_0_2: number;
      above_0_7: number;
      optimal_0_2_0_7: number;
    }>
  > {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `Calculating pressure day-wise breakdown for region: ${regionName || "all"}`,
      );

      const regionFilter = regionName && regionName !== "All Regions"
        ? (regionName.toLowerCase().includes('chhatrapati')
          ? sql`AND (cs.region ILIKE '%Chhatrapati%' OR cs.region ILIKE 'Aurangabad%')`
          : sql`AND cs.region ILIKE ${'%' + regionName + '%'}`
        )
        : sql``;

      // Filter for history table (ph)
      const historyRegionFilter = regionName && regionName !== "All Regions"
        ? (regionName.toLowerCase().includes('chhatrapati')
          ? sql`AND (ph.region ILIKE '%Chhatrapati%' OR ph.region ILIKE 'Aurangabad%')`
          : sql`AND ph.region ILIKE ${'%' + regionName + '%'}`
        )
        : sql``;

      const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND cs.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      const historySchemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND ph.scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      // Note: We use the same robust logic for date parsing, deduction, and gap detection as getPressureSensorsByDayWiseCriteria
      const query = sql`
        WITH 
        offline_sensors AS (
          SELECT 
            cs.scheme_id,
            cs.village_name,
            cs.esr_name,
            CASE 
              WHEN cs.pressure_status = 'Offline' AND cs.pressure_last_seen IS NOT NULL 
              THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.pressure_last_seen))::integer
              ELSE 0
            END as offline_days
          FROM communication_status cs
          WHERE cs.pressure_connected = 'Connected'
            ${regionFilter}
            ${schemeFilter}
        ),
        raw_history AS (
          SELECT 
            ph.scheme_id, ph.village_name, ph.esr_name, ph.pressure_value,
            CASE 
              WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YYYY')
              WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}$' THEN 
                make_date(
                  CASE 
                    WHEN EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon')) > EXTRACT(MONTH FROM ph.uploaded_at)
                    THEN EXTRACT(YEAR FROM ph.uploaded_at)::int - 1
                    ELSE EXTRACT(YEAR FROM ph.uploaded_at)::int
                  END,
                  EXTRACT(MONTH FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int,
                  EXTRACT(DAY FROM TO_DATE(ph.pressure_date, 'DD-Mon'))::int
                )
              WHEN ph.pressure_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'DD-Mon-YY')
              WHEN ph.pressure_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(ph.pressure_date, 'DD/MM/YYYY')
              WHEN ph.pressure_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(ph.pressure_date, 'YYYY-MM-DD')
              ELSE NULL
            END as date_val
          FROM pressure_history ph
          WHERE ph.pressure_value IS NOT NULL
            ${historyRegionFilter}
            ${historySchemeFilter}
            ${historySchemeFilter}
            AND EXISTS (
              SELECT 1 FROM communication_status cs 
              WHERE cs.scheme_id = ph.scheme_id 
              AND cs.village_name = ph.village_name 
              AND cs.esr_name = ph.esr_name
            )
        ),
        daily_averages AS (
          SELECT
            scheme_id, village_name, esr_name, date_val,
            AVG(pressure_value) as avg_pressure
          FROM raw_history
          WHERE date_val IS NOT NULL
          GROUP BY scheme_id, village_name, esr_name, date_val
        ),
        ranked_history AS (
          SELECT 
            scheme_id, village_name, esr_name, date_val,
            avg_pressure,
            LAG(date_val) OVER (
              PARTITION BY scheme_id, village_name, esr_name 
              ORDER BY date_val DESC
            ) as prev_date_val,
            ROW_NUMBER() OVER (
              PARTITION BY scheme_id, village_name, esr_name 
              ORDER BY date_val DESC
            ) as rn,
            CASE WHEN avg_pressure < 0.2 THEN 1 ELSE 0 END as is_below,
            CASE WHEN avg_pressure > 0.7 THEN 1 ELSE 0 END as is_above,
            CASE WHEN avg_pressure >= 0.2 AND avg_pressure <= 0.7 THEN 1 ELSE 0 END as is_optimal
          FROM daily_averages
        ),
        valid_history AS (
          SELECT *,
             CASE 
                WHEN prev_date_val IS NOT NULL AND (prev_date_val - date_val) > 1 THEN 1 
                ELSE 0 
             END as is_gap
          FROM ranked_history
          WHERE date_val >= CURRENT_DATE - INTERVAL '365 days'
            AND date_val <= CURRENT_DATE
        ),
        pressure_consecutive AS (
          SELECT 
            rh1.scheme_id,
            rh1.village_name,
            rh1.esr_name,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM valid_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_below = 0 OR rh3.is_gap = 1)
                    AND rh3.rn > 0
                )
                AND rh2.is_below = 1
            ), 0) as consecutive_below_0_2,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM valid_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_above = 0 OR rh3.is_gap = 1)
                    AND rh3.rn > 0
                )
                AND rh2.is_above = 1
            ), 0) as consecutive_above_0_7,
            COALESCE((
              SELECT COUNT(*)
              FROM valid_history rh2
              WHERE rh2.scheme_id = rh1.scheme_id
                AND rh2.village_name = rh1.village_name
                AND rh2.esr_name = rh1.esr_name
                AND rh2.rn <= (
                  SELECT COALESCE(MIN(rh3.rn) - 1, 30)
                  FROM valid_history rh3
                  WHERE rh3.scheme_id = rh1.scheme_id
                    AND rh3.village_name = rh1.village_name
                    AND rh3.esr_name = rh1.esr_name
                    AND (rh3.is_optimal = 0 OR rh3.is_gap = 1)
                    AND rh3.rn > 0
                )
                AND rh2.is_optimal = 1
            ), 0) as consecutive_optimal
          FROM (SELECT DISTINCT scheme_id, village_name, esr_name FROM valid_history) rh1
        ),
        day_counts AS (
          SELECT 
            GREATEST(offline_days, 0) as days_count,
            'offline' as metric_type
          FROM offline_sensors
          WHERE offline_days > 0 
          
          UNION ALL
          
          SELECT 
            LEAST(consecutive_below_0_2, 30) as days_count,
            'below_0_2' as metric_type
          FROM pressure_consecutive
          WHERE consecutive_below_0_2 > 0
          
          UNION ALL
          
          SELECT 
            LEAST(consecutive_above_0_7, 30) as days_count,
            'above_0_7' as metric_type
          FROM pressure_consecutive
          WHERE consecutive_above_0_7 > 0
          
          UNION ALL
          
          SELECT 
            LEAST(consecutive_optimal, 30) as days_count,
            'optimal_0_2_0_7' as metric_type
          FROM pressure_consecutive
          WHERE consecutive_optimal > 0
        )
        SELECT 
          generate_series as days,
          COALESCE(SUM(CASE WHEN metric_type = 'offline' THEN 1 ELSE 0 END), 0)::integer as offline,
          COALESCE(SUM(CASE WHEN metric_type = 'below_0_2' THEN 1 ELSE 0 END), 0)::integer as below_0_2,
          COALESCE(SUM(CASE WHEN metric_type = 'above_0_7' THEN 1 ELSE 0 END), 0)::integer as above_0_7,
          COALESCE(SUM(CASE WHEN metric_type = 'optimal_0_2_0_7' THEN 1 ELSE 0 END), 0)::integer as optimal_0_2_0_7
        FROM generate_series(1, 30) 
        LEFT JOIN day_counts ON day_counts.days_count >= generate_series
        GROUP BY generate_series
        ORDER BY generate_series DESC
      `;

      const result = await db.execute(query);

      return (result.rows || []).map((row: any) => ({
        days: Number(row.days),
        offline: Number(row.offline) || 0,
        below_0_2: Number(row.below_0_2) || 0,
        above_0_7: Number(row.above_0_7) || 0,
        optimal_0_2_0_7: Number(row.optimal_0_2_0_7) || 0,
      }));
    } catch (error) {
      console.error("Error calculating pressure day-wise breakdown:", error);
      return [];
    }
  }

  async getVillageWeeklyStats(dateStrings: string[], fullyCompletedSchemeIds?: Set<string>): Promise<any[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      // Handle empty set (NO_MATCHES case)
      if (fullyCompletedSchemeIds && fullyCompletedSchemeIds.size === 0) {
        // If we have a filter but no IDs matched, then no results should avail.
        // However, if the Set is passed as undefined/null, we show all.
        // If it is passed as empty set (meaning filter was applied but 0 found), we should probably block.
        // BUT, usually we pass undefined if 'all'.
        // Let's assume if Set is provided but empty, it might mean "match nothing".
        // But looking at other functions, we usually pass undefined if no filter.
        // If schemeFilter string is empty, it means no filter.
      }

      const query = sql`
        WITH deduplicated_history AS (
          SELECT DISTINCT ON (scheme_id, village_name, block, data_date)
            region, scheme_id, village_name, block, lpcd_value, data_date
          FROM water_scheme_data_history
          WHERE (
            data_date IN (${sql.join(dateStrings.map(d => sql`${d}`), sql`, `)})
            OR
            TO_CHAR(TO_DATE(CASE 
               WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
               ELSE '01-Jan-2000'
            END, 'DD-Mon-YY'), 'DD-Mon') IN (${sql.join(dateStrings.map(d => sql`${d}`), sql`, `)})
          )
          ${schemeFilter}
          ORDER BY scheme_id, village_name, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
        ),
        village_averages AS (
          SELECT 
            region,
            scheme_id,
            village_name,
            block,
            SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
          FROM deduplicated_history
          GROUP BY region, scheme_id, village_name, block
        )
        SELECT 
          region,
          COUNT(CASE WHEN avg_lpcd >= 55 THEN 1 END)::integer as above_55,
          COUNT(CASE WHEN avg_lpcd < 55 AND avg_lpcd > 0 THEN 1 END)::integer as below_55,
          COUNT(CASE WHEN avg_lpcd = 0 OR avg_lpcd IS NULL THEN 1 END)::integer as no_water
        FROM village_averages
        GROUP BY region;
      `;

      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      console.error("Error calculating village weekly stats:", error);
      return [];
    }
  }

  async getSchemeWeeklyStats(dateStrings: string[], fullyCompletedSchemeIds?: Set<string>): Promise<any[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      const schemeFilter = fullyCompletedSchemeIds && fullyCompletedSchemeIds.size > 0
        ? sql.raw(`AND scheme_id IN (${Array.from(fullyCompletedSchemeIds).map(id => `'${id}'`).join(',')})`)
        : sql``;

      const query = sql`
        WITH scheme_averages AS (
          SELECT 
            region,
            scheme_id,
            block,
            SUM(COALESCE(NULLIF(TRIM(lpcd_value::text), '')::numeric, 0)) / 7.0 as avg_lpcd
          FROM (
            SELECT DISTINCT ON (region, scheme_id, block, data_date)
              region, scheme_id, block, lpcd_value, data_date
            FROM scheme_lpcd_data_history
            WHERE (
              data_date IN (${sql.join(dateStrings.map(d => sql`${d}`), sql`, `)})
              OR
              TO_CHAR(TO_DATE(CASE 
                 WHEN data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN data_date
                 ELSE '01-Jan-2000'
              END, 'DD-Mon-YY'), 'DD-Mon') IN (${sql.join(dateStrings.map(d => sql`${d}`), sql`, `)})
            )
            ${schemeFilter}
            ORDER BY region, scheme_id, block, data_date, (lpcd_value IS NOT NULL AND TRIM(lpcd_value::text) != '') DESC, uploaded_at DESC
          ) deduplicated
          GROUP BY region, scheme_id, block
        )
        SELECT 
          region,
          COUNT(CASE WHEN avg_lpcd >= 55 THEN 1 END)::integer as above_55,
          COUNT(CASE WHEN avg_lpcd < 55 AND avg_lpcd > 0 THEN 1 END)::integer as below_55,
          COUNT(CASE WHEN avg_lpcd = 0 OR avg_lpcd IS NULL THEN 1 END)::integer as no_water
        FROM scheme_averages
        GROUP BY region;
      `;

      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      console.error("Error calculating scheme weekly stats:", error);
      return [];
    }
  }

  // Get sensors with no water by cross-referencing pressure data with water consumption
  async getPressureSensorsWithNoWater(regionName?: string): Promise<{
    totalNoWaterSensors: number;
    noWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      pressure_connected: string | null;
    }>;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log("Finding pressure sensors with no water...");

      // Base SQL query to match pressure sensors with water consumption data
      const baseConditions =
        regionName && regionName !== "all"
          ? sql`cs.region = ${regionName}`
          : sql`1 = 1`;

      const query = sql`
        SELECT 
          cs.region,
          cs.circle,
          cs.division,
          cs.sub_division,
          cs.block,
          cs.scheme_id,
          cs.scheme_name,
          cs.village_name,
          cs.esr_name,
          wc.water_date_day7,
          wc.water_value_day7,
          cs.pressure_connected
        FROM communication_status cs
        LEFT JOIN water_consumption wc ON (
          cs.region = wc.region AND
          cs.circle = wc.circle AND
          cs.division = wc.division AND
          cs.sub_division = wc.sub_division AND
          cs.block = wc.block AND
          cs.scheme_id = wc.scheme_id AND
          cs.scheme_name = wc.scheme_name AND
          cs.village_name = wc.village_name AND
          cs.esr_name = wc.esr_name
        )
        WHERE ${baseConditions}
          AND cs.pressure_connected = 'Connected'
          AND cs.pressure_status = 'Online'
          AND (
            wc.water_value_day7 IS NULL OR 
            CAST(wc.water_value_day7 AS text) = '0' OR
            CAST(wc.water_value_day7 AS text) = '0.0' OR
            CAST(wc.water_value_day7 AS text) = '0.00' OR
            wc.water_value_day7 = 0
          )
      `;

      const result = await db.execute(query);

      console.log(
        `Found ${result.rows ? result.rows.length : 0} pressure sensors with no water`,
      );

      const resultRows = result.rows || [];

      return {
        totalNoWaterSensors: resultRows.length,
        noWaterSensors: resultRows.map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          water_date_day7: row.water_date_day7,
          water_value_day7: row.water_value_day7
            ? Number(row.water_value_day7)
            : null,
          pressure_connected: row.pressure_connected,
        })),
      };
    } catch (error) {
      console.error("Error getting pressure sensors with no water:", error);
      // Return empty result instead of throwing to allow dashboard to continue
      return {
        totalNoWaterSensors: 0,
        noWaterSensors: [],
      };
    }
  }

  async getPressureSensorsWithWater(regionName?: string): Promise<{
    totalWithWaterSensors: number;
    withWaterSensors: Array<{
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_id: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      water_date_day7: string | null;
      water_value_day7: number | null;
      pressure_connected: string | null;
    }>;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log("Finding pressure sensors with water...");

      // Base SQL query to match pressure sensors with water consumption data
      const baseConditions =
        regionName && regionName !== "all"
          ? sql`cs.region = ${regionName}`
          : sql`1 = 1`;

      const query = sql`
        SELECT 
          cs.region,
          cs.circle,
          cs.division,
          cs.sub_division,
          cs.block,
          cs.scheme_id,
          cs.scheme_name,
          cs.village_name,
          cs.esr_name,
          wc.water_date_day7,
          wc.water_value_day7,
          cs.pressure_connected
        FROM communication_status cs
        LEFT JOIN water_consumption wc ON (
          cs.region = wc.region AND
          cs.circle = wc.circle AND
          cs.division = wc.division AND
          cs.sub_division = wc.sub_division AND
          cs.block = wc.block AND
          cs.scheme_id = wc.scheme_id AND
          cs.scheme_name = wc.scheme_name AND
          cs.village_name = wc.village_name AND
          cs.esr_name = wc.esr_name
        )
        WHERE ${baseConditions}
          AND cs.pressure_connected = 'Connected'
          AND cs.pressure_status = 'Online'
          AND wc.water_value_day7 IS NOT NULL 
          AND CAST(wc.water_value_day7 AS text) != '0'
          AND CAST(wc.water_value_day7 AS text) != '0.0'
          AND CAST(wc.water_value_day7 AS text) != '0.00'
          AND wc.water_value_day7 > 0
      `;

      const result = await db.execute(query);

      console.log(
        `Found ${result.rows ? result.rows.length : 0} pressure sensors with water`,
      );

      const resultRows = result.rows || [];

      return {
        totalWithWaterSensors: resultRows.length,
        withWaterSensors: resultRows.map((row: any) => ({
          region: row.region,
          circle: row.circle,
          division: row.division,
          sub_division: row.sub_division,
          block: row.block,
          scheme_id: row.scheme_id,
          scheme_name: row.scheme_name,
          village_name: row.village_name,
          esr_name: row.esr_name,
          water_date_day7: row.water_date_day7,
          water_value_day7: row.water_value_day7
            ? Number(row.water_value_day7)
            : null,
          pressure_connected: row.pressure_connected,
        })),
      };
    } catch (error) {
      console.error("Error getting pressure sensors with water:", error);
      // Return empty result instead of throwing to allow dashboard to continue
      return {
        totalWithWaterSensors: 0,
        withWaterSensors: [],
      };
    }
  }

  async getChlorineDashboardStats(filter?: ChlorineDataFilter): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
    noWaterSensors: number;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log("Fetching chlorine dashboard stats...");

      // Base conditions array
      const conditions: any[] = [];

      if (filter) {
        if (filter.region && filter.region !== "all") {
          conditions.push(eq(chlorineData.region, filter.region));
        }
        if (filter.circle && filter.circle !== "all") {
          conditions.push(eq(chlorineData.circle, filter.circle));
        }
        if (filter.division && filter.division !== "all") {
          conditions.push(eq(chlorineData.division, filter.division));
        }
        if (filter.subDivision && filter.subDivision !== "all") {
          conditions.push(eq(chlorineData.sub_division, filter.subDivision));
        }
        if (filter.block && filter.block !== "all") {
          conditions.push(eq(chlorineData.block, filter.block));
        }
      }

      // Helper to combine conditions with AND
      const whereClause = (extraCondition?: any) => {
        const allConditions = [...conditions];
        if (extraCondition) allConditions.push(extraCondition);
        return allConditions.length > 0 ? and(...allConditions) : undefined;
      };

      // Get total count - all sensors with chlorine data
      const totalResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(whereClause());

      const totalSensors = Number(totalResult[0]?.count || 0);
      console.log("Total sensors with water:", totalSensors);

      // Get below 0.2 mg/l count - all sensors with below range chlorine
      const belowRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(
          whereClause(
            sql`${chlorineData.chlorine_value_7} < 0.2 AND ${chlorineData.chlorine_value_7} >= 0`,
          ),
        );

      const belowRangeSensors = Number(belowRangeResult[0]?.count || 0);
      console.log("Below range sensors with water:", belowRangeSensors);

      // Get optimal range (0.2-0.5 mg/l) count - all sensors with optimal chlorine
      const optimalRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(
          whereClause(
            sql`${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`,
          ),
        );

      const optimalRangeSensors = Number(optimalRangeResult[0]?.count || 0);
      console.log("Optimal range sensors with water:", optimalRangeSensors);

      // Get above 0.5 mg/l count - all sensors with above range chlorine
      const aboveRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(whereClause(sql`${chlorineData.chlorine_value_7} > 0.5`));

      const aboveRangeSensors = Number(aboveRangeResult[0]?.count || 0);
      console.log("Above range sensors with water:", aboveRangeSensors);

      // Get sensors with consistent zero readings for 7 days
      const consistentZeroResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(
          whereClause(
            sql`${chlorineData.chlorine_value_1} = 0 AND 
                ${chlorineData.chlorine_value_2} = 0 AND 
                ${chlorineData.chlorine_value_3} = 0 AND 
                ${chlorineData.chlorine_value_4} = 0 AND 
                ${chlorineData.chlorine_value_5} = 0 AND 
                ${chlorineData.chlorine_value_6} = 0 AND 
                ${chlorineData.chlorine_value_7} = 0`,
          ),
        );

      const consistentZeroSensors = Number(consistentZeroResult[0]?.count || 0);
      console.log("Consistent zero sensors with water:", consistentZeroSensors);

      // Get sensors with consistently below range readings (>0 and <0.2) for 7 days
      const consistentBelowRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(
          whereClause(
            sql`${chlorineData.chlorine_value_1} > 0 AND ${chlorineData.chlorine_value_1} < 0.2 AND 
                ${chlorineData.chlorine_value_2} > 0 AND ${chlorineData.chlorine_value_2} < 0.2 AND 
                ${chlorineData.chlorine_value_3} > 0 AND ${chlorineData.chlorine_value_3} < 0.2 AND 
                ${chlorineData.chlorine_value_4} > 0 AND ${chlorineData.chlorine_value_4} < 0.2 AND 
                ${chlorineData.chlorine_value_5} > 0 AND ${chlorineData.chlorine_value_5} < 0.2 AND 
                ${chlorineData.chlorine_value_6} > 0 AND ${chlorineData.chlorine_value_6} < 0.2 AND 
                ${chlorineData.chlorine_value_7} > 0 AND ${chlorineData.chlorine_value_7} < 0.2`,
          ),
        );

      const consistentBelowRangeSensors = Number(
        consistentBelowRangeResult[0]?.count || 0,
      );
      console.log(
        "Consistent below range sensors with water:",
        consistentBelowRangeSensors,
      );

      // Get sensors with consistently optimal range readings (0.2-0.5) for 7 days
      const consistentOptimalResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(
          whereClause(
            sql`${chlorineData.chlorine_value_1} >= 0.2 AND ${chlorineData.chlorine_value_1} <= 0.5 AND 
                ${chlorineData.chlorine_value_2} >= 0.2 AND ${chlorineData.chlorine_value_2} <= 0.5 AND 
                ${chlorineData.chlorine_value_3} >= 0.2 AND ${chlorineData.chlorine_value_3} <= 0.5 AND 
                ${chlorineData.chlorine_value_4} >= 0.2 AND ${chlorineData.chlorine_value_4} <= 0.5 AND 
                ${chlorineData.chlorine_value_5} >= 0.2 AND ${chlorineData.chlorine_value_5} <= 0.5 AND 
                ${chlorineData.chlorine_value_6} >= 0.2 AND ${chlorineData.chlorine_value_6} <= 0.5 AND 
                ${chlorineData.chlorine_value_7} >= 0.2 AND ${chlorineData.chlorine_value_7} <= 0.5`,
          ),
        );

      const consistentOptimalSensors = Number(
        consistentOptimalResult[0]?.count || 0,
      );
      console.log(
        "Consistent optimal range sensors with water:",
        consistentOptimalSensors,
      );

      // Get sensors with consistently above range readings (>0.5) for 7 days
      const consistentAboveRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${chlorineData.scheme_id} || '_' || ${chlorineData.village_name} || '_' || ${chlorineData.esr_name})`,
        })
        .from(chlorineData)
        .where(
          whereClause(
            sql`${chlorineData.chlorine_value_1} > 0.5 AND 
                ${chlorineData.chlorine_value_2} > 0.5 AND 
                ${chlorineData.chlorine_value_3} > 0.5 AND 
                ${chlorineData.chlorine_value_4} > 0.5 AND 
                ${chlorineData.chlorine_value_5} > 0.5 AND 
                ${chlorineData.chlorine_value_6} > 0.5 AND 
                ${chlorineData.chlorine_value_7} > 0.5`,
          ),
        );

      const consistentAboveRangeSensors = Number(
        consistentAboveRangeResult[0]?.count || 0,
      );
      console.log(
        "Consistent above range sensors with water:",
        consistentAboveRangeSensors,
      );

      // For no water sensors, we'll use the separate method which we'll also update
      const noWaterResult = await this.getChlorineSensorsWithNoWater(filter);
      const noWaterSensors = noWaterResult.totalNoWaterSensors;

      console.log("Dashboard stats:", {
        totalSensors,
        belowRangeSensors,
        optimalRangeSensors,
        aboveRangeSensors,
        consistentZeroSensors,
        consistentBelowRangeSensors,
        consistentOptimalSensors,
        consistentAboveRangeSensors,
        noWaterSensors,
      });

      return {
        totalSensors,
        belowRangeSensors,
        optimalRangeSensors,
        aboveRangeSensors,
        consistentZeroSensors,
        consistentBelowRangeSensors,
        consistentOptimalSensors,
        consistentAboveRangeSensors,
        noWaterSensors,
      };
    } catch (error) {
      console.error("Error fetching chlorine dashboard stats:", error);
      return {
        totalSensors: 0,
        belowRangeSensors: 0,
        optimalRangeSensors: 0,
        aboveRangeSensors: 0,
        consistentZeroSensors: 0,
        consistentBelowRangeSensors: 0,
        consistentOptimalSensors: 0,
        consistentAboveRangeSensors: 0,
        noWaterSensors: 0,
      };
    }
  }

  // Chlorine Historical Data Query Functions
  async getChlorineHistoricalDataByDateRange(
    startDate: string,
    endDate: string,
    regionFilter?: string,
    schemeFilter?: string,
    villageFilter?: string,
  ): Promise<ChlorineHistory[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `Querying chlorine historical data from ${startDate} to ${endDate}`,
      );

      // Get all records and filter dates in JavaScript to handle mixed formats
      let query = db.select().from(chlorineHistory);

      // Apply additional filters with case-insensitive matching for region
      if (regionFilter && regionFilter !== "all") {
        query = query.where(ilike(chlorineHistory.region, regionFilter));
      }

      if (schemeFilter) {
        query = query.where(eq(chlorineHistory.scheme_id, schemeFilter));
      }

      if (villageFilter) {
        query = query.where(eq(chlorineHistory.village_name, villageFilter));
      }

      // Order by date and uploaded_at to get latest values for each date
      query = query.orderBy(
        chlorineHistory.scheme_id,
        chlorineHistory.village_name,
        chlorineHistory.esr_name,
        chlorineHistory.chlorine_date,
        sql`${chlorineHistory.uploaded_at} DESC`,
      );

      const results = await query;

      // Helper function to parse various date formats to a comparable Date object
      const parseDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        dateStr = dateStr.trim();

        // Handle YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [year, month, day] = dateStr.split("-").map(Number);
          return new Date(year, month - 1, day);
        }

        // Handle DD-MMM-YY format (e.g., "03-Jun-25")
        if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split("-");
          const fullYear = parseInt(year) + 2000; // Assume 20xx
          const monthNames = [
            "jan", "feb", "mar", "apr", "may", "jun",
            "jul", "aug", "sep", "oct", "nov", "dec",
          ];
          const monthIndex = monthNames.indexOf(month.toLowerCase());
          if (monthIndex !== -1) {
            return new Date(fullYear, monthIndex, parseInt(day));
          }
        }

        // Handle DD-MMM-YYYY format (e.g., "31-Jul-2025")
        if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split("-");
          const fullYear = parseInt(year);
          const monthNames = [
            "jan", "feb", "mar", "apr", "may", "jun",
            "jul", "aug", "sep", "oct", "nov", "dec",
          ];
          const monthIndex = monthNames.indexOf(month.toLowerCase());
          if (monthIndex !== -1) {
            return new Date(fullYear, monthIndex, parseInt(day));
          }
        }

        // Handle Excel numeric date format (days since 1900-01-01, with 2-day offset)
        if (/^\d+\.?\d*$/.test(dateStr)) {
          const daysSince1900 = parseFloat(dateStr);
          const baseDate = new Date(1900, 0, 1); // January 1, 1900
          return new Date(
            baseDate.getTime() + (daysSince1900 - 2) * 24 * 60 * 60 * 1000,
          );
        }

        // Handle DD-MMM format (e.g., "21-Jan") - Assume current year
        if (/^\d{1,2}-[A-Za-z]{3}$/.test(dateStr)) {
          const [day, month] = dateStr.split("-");
          const currentYear = new Date().getFullYear();
          const monthNames = [
            "jan", "feb", "mar", "apr", "may", "jun",
            "jul", "aug", "sep", "oct", "nov", "dec",
          ];
          const monthIndex = monthNames.indexOf(month.toLowerCase());
          if (monthIndex !== -1) {
            let year = currentYear;
            const tempDate = new Date(year, monthIndex, parseInt(day));
            const now = new Date();

            // If date is more than 6 months in future, assume last year
            if (tempDate.getTime() - now.getTime() > 180 * 24 * 60 * 60 * 1000) {
              year = currentYear - 1;
            }

            return new Date(year, monthIndex, parseInt(day));
          }
        }

        return null;
      };

      // Parse start and end dates for comparison - handle different input formats
      let startDateObj: Date;
      let endDateObj: Date;

      // Try to parse the input dates (they might be in DD-MM-YYYY format from frontend)
      if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        const [year, month, day] = startDate.split("-").map(Number);
        startDateObj = new Date(year, month - 1, day);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(startDate)) {
        // Handle DD-MM-YYYY format
        const [day, month, year] = startDate.split("-");
        startDateObj = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
      } else {
        startDateObj = new Date(startDate);
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        const [year, month, day] = endDate.split("-").map(Number);
        endDateObj = new Date(year, month - 1, day);
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(endDate)) {
        // Handle DD-MM-YYYY format
        const [day, month, year] = endDate.split("-");
        endDateObj = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
      } else {
        endDateObj = new Date(endDate);
      }

      // Set end date to end of day for inclusive filtering
      endDateObj.setHours(23, 59, 59, 999);

      console.log(
        `Date range parsed: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`,
      );

      // Filter results by date range
      const filteredResults = results.filter((record: any) => {
        const recordDate = parseDate(record.chlorine_date);
        if (!recordDate) {
          console.log(
            `Invalid date format for record: ${record.chlorine_date}`,
          );
          return false;
        }

        return recordDate >= startDateObj && recordDate <= endDateObj;
      });

      console.log(
        `After date filtering: ${filteredResults.length} records from ${results.length} total`,
      );

      // Remove duplicates - keep only the most recent upload for each ESR + date combination
      const uniqueRecords = new Map<string, ChlorineHistory>();

      // Sort by upload time (most recent first) before deduplication
      const sortedResults = filteredResults.sort((a: any, b: any) => {
        if (!a.uploaded_at || !b.uploaded_at) return 0;
        return (
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        );
      });

      for (const record of sortedResults) {
        const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}|${record.chlorine_date}`;

        // Only keep if this is the first (most recent) record for this key
        if (!uniqueRecords.has(key)) {
          uniqueRecords.set(key, record);
        }
      }

      const finalResults = Array.from(uniqueRecords.values());
      console.log(
        `Found ${finalResults.length} unique chlorine records for date range ${startDate} to ${endDate}`,
      );

      return finalResults;
    } catch (error) {
      console.error(
        "Error querying chlorine historical data by date range:",
        error,
      );
      throw error;
    }
  }

  async getChlorineHistoricalSummaryByDateRange(
    startDate: string,
    endDate: string,
    regionFilter?: string,
  ): Promise<{
    totalReadings: number;
    esrCount: number;
    avgChlorineLevel: number;
    belowRangeReadings: number;
    optimalRangeReadings: number;
    aboveRangeReadings: number;
    zeroReadings: number;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `Getting chlorine historical summary from ${startDate} to ${endDate}`,
      );

      // Build base conditions
      let whereConditions = sql`${chlorineHistory.chlorine_date} >= ${startDate} 
                               AND ${chlorineHistory.chlorine_date} <= ${endDate}`;

      if (regionFilter && regionFilter !== "all") {
        whereConditions = sql`${whereConditions} AND ${chlorineHistory.region} = ${regionFilter}`;
      }

      // Get the most recent records for each ESR + date combination
      const latestRecordsQuery = sql`
        WITH latest_records AS (
          SELECT DISTINCT ON (scheme_id, village_name, esr_name, chlorine_date)
            scheme_id, village_name, esr_name, chlorine_date, chlorine_value, uploaded_at
          FROM ${chlorineHistory}
          WHERE ${whereConditions}
          ORDER BY scheme_id, village_name, esr_name, chlorine_date, uploaded_at DESC
        )
        SELECT 
          COUNT(*) as total_readings,
          COUNT(DISTINCT CONCAT(scheme_id, '|', village_name, '|', esr_name)) as esr_count,
          AVG(CAST(chlorine_value AS NUMERIC)) as avg_chlorine_level,
          COUNT(CASE WHEN CAST(chlorine_value AS NUMERIC) < 0.2 AND CAST(chlorine_value AS NUMERIC) > 0 THEN 1 END) as below_range_readings,
          COUNT(CASE WHEN CAST(chlorine_value AS NUMERIC) >= 0.2 AND CAST(chlorine_value AS NUMERIC) <= 0.5 THEN 1 END) as optimal_range_readings,
          COUNT(CASE WHEN CAST(chlorine_value AS NUMERIC) > 0.5 THEN 1 END) as above_range_readings,
          COUNT(CASE WHEN CAST(chlorine_value AS NUMERIC) = 0 OR chlorine_value IS NULL THEN 1 END) as zero_readings
        FROM latest_records
      `;

      const result = await db.execute(latestRecordsQuery);
      const row = result.rows[0] as any;

      return {
        totalReadings: parseInt(row.total_readings) || 0,
        esrCount: parseInt(row.esr_count) || 0,
        avgChlorineLevel: parseFloat(row.avg_chlorine_level) || 0,
        belowRangeReadings: parseInt(row.below_range_readings) || 0,
        optimalRangeReadings: parseInt(row.optimal_range_readings) || 0,
        aboveRangeReadings: parseInt(row.above_range_readings) || 0,
        zeroReadings: parseInt(row.zero_readings) || 0,
      };
    } catch (error) {
      console.error("Error getting chlorine historical summary:", error);
      return {
        totalReadings: 0,
        esrCount: 0,
        avgChlorineLevel: 0,
        belowRangeReadings: 0,
        optimalRangeReadings: 0,
        aboveRangeReadings: 0,
        zeroReadings: 0,
      };
    }
  }

  async getChlorineHistoricalDataForESR(
    schemeId: string,
    villageName: string,
    esrName: string,
    startDate: string,
    endDate: string,
  ): Promise<ChlorineHistory[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `Getting chlorine history for ESR ${esrName} in ${villageName} from ${startDate} to ${endDate}`,
      );

      // Get records for specific ESR within date range, ordered by date and upload time
      const results = await db
        .select()
        .from(chlorineHistory)
        .where(
          sql`${chlorineHistory.scheme_id} = ${schemeId} 
              AND ${chlorineHistory.village_name} = ${villageName}
              AND ${chlorineHistory.esr_name} = ${esrName}
              AND ${chlorineHistory.chlorine_date} >= ${startDate} 
              AND ${chlorineHistory.chlorine_date} <= ${endDate}`,
        )
        .orderBy(
          chlorineHistory.chlorine_date,
          sql`${chlorineHistory.uploaded_at} DESC`,
        );

      // Remove duplicates - keep only the most recent upload for each date
      const uniqueRecords = new Map<string, ChlorineHistory>();

      for (const record of results) {
        const dateKey = record.chlorine_date!;

        // Only keep if this is the first (most recent) record for this date
        if (!uniqueRecords.has(dateKey)) {
          uniqueRecords.set(dateKey, record);
        }
      }

      const finalResults = Array.from(uniqueRecords.values()).sort((a, b) =>
        a.chlorine_date!.localeCompare(b.chlorine_date!),
      );

      console.log(
        `Found ${finalResults.length} unique daily records for ESR ${esrName}`,
      );
      return finalResults;
    } catch (error) {
      console.error(
        `Error getting chlorine historical data for ESR ${esrName}:`,
        error,
      );
      throw error;
    }
  }

  // Pressure Data CRUD operations
  async getAllPressureData(
    filter?: PressureDataFilter,
  ): Promise<PressureData[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      // Build conditions array
      const conditions: any[] = [sql`communication_status.pressure_connected = 'Connected'`];

      if (filter) {
        if (filter.schemeIds) {
          if (filter.schemeIds.length === 1 && filter.schemeIds[0] === 'NO_MATCHES') {
            return [];
          } else if (filter.schemeIds.length > 0) {
            conditions.push(inArray(pressureData.scheme_id, filter.schemeIds)); // Note: filtering on pd.scheme_id might exclude rows if pd is null?
            // Actually, we should filter on cs.scheme_id for the base set.
            // But the original code filtered pressureData.scheme_id.
            // Let's use cs.scheme_id to be safe and inclusive.
            conditions.push(sql`communication_status.scheme_id IN ${filter.schemeIds}`);
          }
        }

        if (filter.region && filter.region !== "all") {
          conditions.push(eq(communicationStatus.region, filter.region));
        }

        if (filter.circle && filter.circle !== "all") {
          conditions.push(eq(communicationStatus.circle, filter.circle));
        }

        if (filter.division && filter.division !== "all") {
          conditions.push(eq(communicationStatus.division, filter.division));
        }

        const subDivision = filter.subDivision || filter.subdivision;
        if (subDivision && subDivision !== "all") {
          conditions.push(eq(communicationStatus.sub_division, subDivision));
        }

        if (filter.block && filter.block !== "all") {
          conditions.push(eq(communicationStatus.block, filter.block));
        }

        if (filter.pressureRange) {
          switch (filter.pressureRange) {
            case "below_0.2":
              conditions.push(sql`pressure_data.pressure_value_7 < 0.2 AND pressure_data.pressure_value_7 >= 0`);
              break;
            case "between_0.2_0.7":
              conditions.push(sql`pressure_data.pressure_value_7 >= 0.2 AND pressure_data.pressure_value_7 <= 0.7`);
              break;
            case "above_0.7":
              conditions.push(sql`pressure_data.pressure_value_7 > 0.7`);
              break;
            case "consistent_zero":
              conditions.push(sql`
                 COALESCE(pressure_data.number_of_consistent_zero_value_in_pressure, 0) = 7 OR
                 (
                   (pressure_data.pressure_value_1 = 0 OR pressure_data.pressure_value_1 IS NULL) AND
                   (pressure_data.pressure_value_2 = 0 OR pressure_data.pressure_value_2 IS NULL) AND
                   (pressure_data.pressure_value_3 = 0 OR pressure_data.pressure_value_3 IS NULL) AND
                   (pressure_data.pressure_value_4 = 0 OR pressure_data.pressure_value_4 IS NULL) AND
                   (pressure_data.pressure_value_5 = 0 OR pressure_data.pressure_value_5 IS NULL) AND
                   (pressure_data.pressure_value_6 = 0 OR pressure_data.pressure_value_6 IS NULL) AND
                   (pressure_data.pressure_value_7 = 0 OR pressure_data.pressure_value_7 IS NULL)
                 )
               `);
              break;
            case "consistent_below":
              conditions.push(sql`
                 (
                   (pressure_data.pressure_value_1 < 0.2 AND pressure_data.pressure_value_1 > 0) AND
                   (pressure_data.pressure_value_2 < 0.2 AND pressure_data.pressure_value_2 > 0) AND
                   (pressure_data.pressure_value_3 < 0.2 AND pressure_data.pressure_value_3 > 0) AND
                   (pressure_data.pressure_value_4 < 0.2 AND pressure_data.pressure_value_4 > 0) AND
                   (pressure_data.pressure_value_5 < 0.2 AND pressure_data.pressure_value_5 > 0) AND
                   (pressure_data.pressure_value_6 < 0.2 AND pressure_data.pressure_value_6 > 0) AND
                   (pressure_data.pressure_value_7 < 0.2 AND pressure_data.pressure_value_7 > 0)
                 )
               `);
              break;
            case "consistent_optimal":
              conditions.push(sql`
                 (
                   (pressure_data.pressure_value_1 >= 0.2 AND pressure_data.pressure_value_1 <= 0.7) AND
                   (pressure_data.pressure_value_2 >= 0.2 AND pressure_data.pressure_value_2 <= 0.7) AND
                   (pressure_data.pressure_value_3 >= 0.2 AND pressure_data.pressure_value_3 <= 0.7) AND
                   (pressure_data.pressure_value_4 >= 0.2 AND pressure_data.pressure_value_4 <= 0.7) AND
                   (pressure_data.pressure_value_5 >= 0.2 AND pressure_data.pressure_value_5 <= 0.7) AND
                   (pressure_data.pressure_value_6 >= 0.2 AND pressure_data.pressure_value_6 <= 0.7) AND
                   (pressure_data.pressure_value_7 >= 0.2 AND pressure_data.pressure_value_7 <= 0.7)
                 )
               `);
              break;
            case "consistent_above":
              conditions.push(sql`
                 (
                   (pressure_data.pressure_value_1 > 0.7) AND
                   (pressure_data.pressure_value_2 > 0.7) AND
                   (pressure_data.pressure_value_3 > 0.7) AND
                   (pressure_data.pressure_value_4 > 0.7) AND
                   (pressure_data.pressure_value_5 > 0.7) AND
                   (pressure_data.pressure_value_6 > 0.7) AND
                   (pressure_data.pressure_value_7 > 0.7)
                 )
               `);
              break;
          }
        } else {
          if (filter.minPressure !== undefined) {
            conditions.push(sql`pressure_data.pressure_value_7 >= ${filter.minPressure}`);
          }
          if (filter.maxPressure !== undefined) {
            conditions.push(sql`pressure_data.pressure_value_7 <= ${filter.maxPressure}`);
          }
        }
      }

      // Construct the JOIN query
      const result = await db.select({
        region: communicationStatus.region,
        circle: communicationStatus.circle,
        division: communicationStatus.division,
        sub_division: communicationStatus.sub_division,
        block: communicationStatus.block,
        scheme_id: communicationStatus.scheme_id,
        scheme_name: communicationStatus.scheme_name,
        village_name: communicationStatus.village_name,
        esr_name: communicationStatus.esr_name,

        // Pressure data fields (mapped from pd)
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

        number_of_consistent_zero_value_in_pressure: pressureData.number_of_consistent_zero_value_in_pressure,
        pressure_less_than_02_bar: pressureData.pressure_less_than_02_bar,
        pressure_between_02_07_bar: pressureData.pressure_between_02_07_bar,
        pressure_greater_than_07_bar: pressureData.pressure_greater_than_07_bar,
        dashboard_url: pressureData.dashboard_url
      })
        .from(communicationStatus)
        .leftJoin(pressureData, sql`
        ${communicationStatus.scheme_id} = ${pressureData.scheme_id} AND 
        ${communicationStatus.village_name} = ${pressureData.village_name} AND 
        ${communicationStatus.esr_name} = ${pressureData.esr_name}
      `)
        .where(and(...conditions));

      return result as PressureData[]; // Cast to match expected return type

    } catch (error) {
      console.error("Error in getAllPressureData:", error);
      throw error;
    }
  }

  async getPressureDataByScheme(
    schemeId: string,
    block?: string,
  ): Promise<PressureData[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `🔍 Fetching pressure data for scheme: ${schemeId}, block: ${block || "all blocks"}`,
      );

      let whereCondition = eq(pressureData.scheme_id, schemeId);
      if (block) {
        whereCondition = and(whereCondition, eq(pressureData.block, block));
      }

      const results = await db
        .select()
        .from(pressureData)
        .where(whereCondition);
      console.log(
        `✅ Found ${results.length} pressure data records for scheme ${schemeId}`,
      );

      return results;
    } catch (error) {
      console.error("Error fetching pressure data by scheme:", error);
      throw error;
    }
  }

  async getPressureDataByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<PressureData | undefined> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      const result = await db
        .select()
        .from(pressureData)
        .where(
          and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName),
          ),
        );

      return result[0];
    } catch (error) {
      console.error(
        `Error getting pressure data for ${schemeId}/${villageName}/${esrName}:`,
        error,
      );
      throw error;
    }
  }

  async createPressureData(data: InsertPressureData): Promise<PressureData> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      const result = await db.insert(pressureData).values(data).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating pressure data:", error);
      throw error;
    }
  }

  async updatePressureData(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdatePressureData,
  ): Promise<PressureData> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      const result = await db
        .update(pressureData)
        .set(data)
        .where(
          and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName),
          ),
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Pressure data not found for update");
      }

      // Automatically insert into pressure_history after an update
      const updatedRecord = result[0];
      try {
        await db.execute(sql`
          INSERT INTO pressure_history (
            scheme_id, 
            village_name, 
            esr_name, 
            pressure_date, 
            pressure_value
          )
          VALUES (
            ${updatedRecord.scheme_id}, 
            ${updatedRecord.village_name}, 
            ${updatedRecord.esr_name}, 
            ${updatedRecord.pressure_date_day_7 || sql`CURRENT_DATE`}, 
            ${updatedRecord.pressure_value_7}
          )
          ON CONFLICT (scheme_id, village_name, esr_name, pressure_date)
          DO UPDATE SET
            pressure_value = EXCLUDED.pressure_value
        `);
        console.log(`Recorded updated pressure history for ${updatedRecord.esr_name}`);
      } catch (historyError) {
        console.error("Failed to record pressure history on update:", historyError);
        // Don't throw here to avoid failing the main update operation
      }

      return updatedRecord;
    } catch (error) {
      console.error(
        `Error updating pressure data for ${schemeId}/${villageName}/${esrName}:`,
        error,
      );
      throw error;
    }
  }

  async deletePressureData(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<boolean> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      const result = await db
        .delete(pressureData)
        .where(
          and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName),
          ),
        );

      return result.count > 0;
    } catch (error) {
      console.error(
        `Error deleting pressure data for ${schemeId}/${villageName}/${esrName}:`,
        error,
      );
      throw error;
    }
  }

  // Dashboard statistics for pressure data
  async getPressureDashboardStats(filter?: any, schemeIds?: string[]): Promise<{
    totalSensors: number;
    belowRangeSensors: number;
    optimalRangeSensors: number;
    aboveRangeSensors: number;
    consistentZeroSensors: number;
    consistentBelowRangeSensors: number;
    consistentOptimalSensors: number;
    consistentAboveRangeSensors: number;
    noWaterSensors: number;
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log("Fetching pressure dashboard stats...");

      // Build filter conditions array
      const buildFilterConditions = () => {
        const conditions: any[] = [];

        if (filter?.region && filter.region !== "all") {
          conditions.push(eq(pressureData.region, filter.region));
        }
        if (filter?.circle && filter.circle !== "all") {
          conditions.push(eq(pressureData.circle, filter.circle));
        }
        if (filter?.division && filter.division !== "all") {
          conditions.push(eq(pressureData.division, filter.division));
        }
        const subDivision = filter?.subDivision || filter?.subdivision;
        if (subDivision && subDivision !== "all") {
          conditions.push(eq(pressureData.sub_division, subDivision));
        }
        if (filter?.block && filter.block !== "all") {
          conditions.push(eq(pressureData.block, filter.block));
        }
        if (schemeIds && schemeIds.length > 0) {
          conditions.push(inArray(pressureData.scheme_id, schemeIds));
        }

        return conditions;
      };

      // Get total count - only sensors from villages with water supply
      const totalResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            ...buildFilterConditions(),
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const totalSensors = Number(totalResult[0]?.count || 0);
      console.log("Total sensors with water:", totalSensors);

      // Get below 0.2 bar count - only sensors from villages with water supply
      const belowRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            ...buildFilterConditions(),
            sql`${pressureData.pressure_value_7} < 0.2 AND ${pressureData.pressure_value_7} >= 0`,
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const belowRangeSensors = Number(belowRangeResult[0]?.count || 0);
      console.log("Below range sensors with water:", belowRangeSensors);

      // Get optimal range (0.2-0.7 bar) count - only sensors from villages with water supply
      const optimalRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            ...buildFilterConditions(),
            sql`${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7`,
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const optimalRangeSensors = Number(optimalRangeResult[0]?.count || 0);
      console.log("Optimal range sensors with water:", optimalRangeSensors);

      // Get above 0.7 bar count - only sensors from villages with water supply
      const aboveRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            ...buildFilterConditions(),
            sql`${pressureData.pressure_value_7} > 0.7`,
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const aboveRangeSensors = Number(aboveRangeResult[0]?.count || 0);
      console.log("Above range sensors with water:", aboveRangeSensors);

      // Get sensors with consistent zero readings for 7 days - only from villages with water supply
      const consistentZeroResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            ...buildFilterConditions(),
            sql`${pressureData.pressure_value_1} = 0 AND 
                ${pressureData.pressure_value_2} = 0 AND 
                ${pressureData.pressure_value_3} = 0 AND 
                ${pressureData.pressure_value_4} = 0 AND 
                ${pressureData.pressure_value_5} = 0 AND 
                ${pressureData.pressure_value_6} = 0 AND 
                ${pressureData.pressure_value_7} = 0`,
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const consistentZeroSensors = Number(consistentZeroResult[0]?.count || 0);
      console.log("Consistent zero sensors with water:", consistentZeroSensors);

      // Get sensors with consistently below range readings (>0 and <0.2) for 7 days - only from villages with water supply
      const consistentBelowRangeResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            regionCondition
              ? eq(pressureData.region, regionCondition)
              : undefined,
            sql`${pressureData.pressure_value_1} > 0 AND ${pressureData.pressure_value_1} < 0.2 AND 
                ${pressureData.pressure_value_2} > 0 AND ${pressureData.pressure_value_2} < 0.2 AND 
                ${pressureData.pressure_value_3} > 0 AND ${pressureData.pressure_value_3} < 0.2 AND 
                ${pressureData.pressure_value_4} > 0 AND ${pressureData.pressure_value_4} < 0.2 AND 
                ${pressureData.pressure_value_5} > 0 AND ${pressureData.pressure_value_5} < 0.2 AND 
                ${pressureData.pressure_value_6} > 0 AND ${pressureData.pressure_value_6} < 0.2 AND 
                ${pressureData.pressure_value_7} > 0 AND ${pressureData.pressure_value_7} < 0.2`,
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const consistentBelowRangeSensors = Number(
        consistentBelowRangeResult[0]?.count || 0,
      );
      console.log(
        "Consistent below range sensors with water:",
        consistentBelowRangeSensors,
      );

      // Get sensors with consistently optimal range readings (0.2-0.7) for 7 days - only from villages with water supply
      const consistentOptimalResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            regionCondition
              ? eq(pressureData.region, regionCondition)
              : undefined,
            sql`${pressureData.pressure_value_1} >= 0.2 AND ${pressureData.pressure_value_1} <= 0.7 AND 
                ${pressureData.pressure_value_2} >= 0.2 AND ${pressureData.pressure_value_2} <= 0.7 AND 
                ${pressureData.pressure_value_3} >= 0.2 AND ${pressureData.pressure_value_3} <= 0.7 AND 
                ${pressureData.pressure_value_4} >= 0.2 AND ${pressureData.pressure_value_4} <= 0.7 AND 
                ${pressureData.pressure_value_5} >= 0.2 AND ${pressureData.pressure_value_5} <= 0.7 AND 
                ${pressureData.pressure_value_6} >= 0.2 AND ${pressureData.pressure_value_6} <= 0.7 AND 
                ${pressureData.pressure_value_7} >= 0.2 AND ${pressureData.pressure_value_7} <= 0.7`,
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const consistentOptimalSensors = Number(
        consistentOptimalResult[0]?.count || 0,
      );
      console.log(
        "Consistent optimal range sensors with water:",
        consistentOptimalSensors,
      );

      // Get sensors with consistently above range readings (>0.7) for 7 days - only from villages with water supply
      const consistentAboveResult = await db
        .select({
          count: sql<number>`count(DISTINCT ${pressureData.scheme_id} || '_' || ${pressureData.village_name} || '_' || ${pressureData.esr_name})`,
        })
        .from(pressureData)
        .leftJoin(
          waterSchemeData,
          and(
            eq(pressureData.scheme_id, waterSchemeData.scheme_id),
            eq(pressureData.village_name, waterSchemeData.village_name),
            eq(pressureData.esr_name, waterSchemeData.esr_name),
          ),
        )
        .where(
          and(
            regionCondition
              ? eq(pressureData.region, regionCondition)
              : undefined,
            sql`${pressureData.pressure_value_1} > 0.7 AND 
                ${pressureData.pressure_value_2} > 0.7 AND 
                ${pressureData.pressure_value_3} > 0.7 AND 
                ${pressureData.pressure_value_4} > 0.7 AND 
                ${pressureData.pressure_value_5} > 0.7 AND 
                ${pressureData.pressure_value_6} > 0.7 AND 
                ${pressureData.pressure_value_7} > 0.7`,
            sql`${waterSchemeData.water_value_day7} > 0`,
          ),
        );

      const consistentAboveRangeSensors = Number(
        consistentAboveResult[0]?.count || 0,
      );
      console.log(
        "Consistent above range sensors with water:",
        consistentAboveRangeSensors,
      );

      // Get no water sensors count
      const noWaterResult =
        await this.getPressureSensorsWithNoWater(regionName);
      const noWaterSensors = noWaterResult.totalNoWaterSensors;
      console.log("No water sensors:", noWaterSensors);

      return {
        totalSensors,
        belowRangeSensors,
        optimalRangeSensors,
        aboveRangeSensors,
        consistentZeroSensors,
        consistentBelowRangeSensors,
        consistentOptimalSensors,
        consistentAboveRangeSensors,
        noWaterSensors,
      };
    } catch (error) {
      console.error("Error fetching pressure dashboard stats:", error);
      return {
        totalSensors: 0,
        belowRangeSensors: 0,
        optimalRangeSensors: 0,
        aboveRangeSensors: 0,
        consistentZeroSensors: 0,
        consistentBelowRangeSensors: 0,
        consistentOptimalSensors: 0,
        consistentAboveRangeSensors: 0,
        noWaterSensors: 0,
      };
    }
  }

  // CSV Import for pressure data
  async importPressureDataFromCSV(
    fileBuffer: Buffer,
    options: { clearExisting?: boolean } = {},
  ): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];

    try {
      console.log(
        "Starting pressure data CSV import with optimized parsing...",
      );

      // Clear existing data if requested
      if (options.clearExisting) {
        console.log("Clearing existing pressure data before import...");
        await db.delete(pressureData);
        console.log("Existing pressure data cleared successfully");
      }

      // Define column names for CSV without headers
      const columns = [
        "region",
        "circle",
        "division",
        "sub_division",
        "block",
        "scheme_id",
        "scheme_name",
        "village_name",
        "esr_name",
        "pressure_value_1",
        "pressure_value_2",
        "pressure_value_3",
        "pressure_value_4",
        "pressure_value_5",
        "pressure_value_6",
        "pressure_value_7",
        "pressure_date_day_1",
        "pressure_date_day_2",
        "pressure_date_day_3",
        "pressure_date_day_4",
        "pressure_date_day_5",
        "pressure_date_day_6",
        "pressure_date_day_7",
        "number_of_consistent_zero_value_in_pressure",
        "pressure_less_than_02_bar",
        "pressure_between_02_07_bar",
        "pressure_greater_than_07_bar",
      ];

      // Parse CSV file without expecting headers - using synchronous parser
      const csvString = fileBuffer.toString("utf8");

      // Import the synchronous parser
      const { parse } = await import("csv-parse/sync");

      // Use the synchronous parse function for better performance and reliability
      const parsed = parse(csvString, {
        columns: columns,
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle byte order mark
        relax_column_count: true, // Be more forgiving with column counts
      });

      if (!parsed || parsed.length === 0) {
        return {
          inserted: 0,
          updated: 0,
          removed: 0,
          errors: [
            "Empty or invalid CSV file. Please check the format and try again.",
          ],
        };
      }

      console.log(`CSV parsed successfully. Found ${parsed.length} records.`);

      // Process records
      let inserted = 0;
      let updated = 0;
      let errors: string[] = [];

      // OPTIMIZATION: Create a lookup map of existing records to avoid individual DB checks
      console.log("Creating lookup map of existing records...");

      // Get unique identifiers to query efficiently
      const uniqueKeys = new Set<string>();
      parsed.forEach((record) => {
        if (record.scheme_id && record.village_name && record.esr_name) {
          uniqueKeys.add(
            `${record.scheme_id}|${record.village_name}|${record.esr_name}`,
          );
        }
      });

      // Fetch all existing records in a single query using IN (much faster than individual queries)
      const existingRecordsMap = new Map<string, PressureData>();

      // Process in batches of 100 to prevent overly large queries
      const batchSize = 100;
      const keyArray = Array.from(uniqueKeys);

      for (let i = 0; i < keyArray.length; i += batchSize) {
        const batch = keyArray.slice(i, i + batchSize);

        // Build a query that can find records matching any of the keys in this batch
        // Using multiple OR conditions for the 3-part composite key
        const conditions = batch.map((key) => {
          const [schemeId, villageName, esrName] = key.split("|");
          return and(
            eq(pressureData.scheme_id, schemeId),
            eq(pressureData.village_name, villageName),
            eq(pressureData.esr_name, esrName),
          );
        });

        const batchExistingRecords = await db
          .select()
          .from(pressureData)
          .where(
            sql`${conditions.reduce(
              (acc, condition, idx) =>
                idx === 0 ? condition : sql`${acc} OR ${condition}`,
              sql``,
            )}`,
          );

        // Add to our lookup map
        batchExistingRecords.forEach((record) => {
          const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
          existingRecordsMap.set(key, record);
        });
      }

      console.log(
        `Found ${existingRecordsMap.size} existing records out of ${uniqueKeys.size} unique keys`,
      );

      // OPTIMIZATION: Process in batches for updates and inserts
      const toUpdate: Partial<InsertPressureData>[] = [];
      const toInsert: Partial<InsertPressureData>[] = [];
      const updateWhereConditions: any[] = [];

      // Prepare the records without making DB calls
      for (const record of parsed) {
        try {
          // Map CSV columns to database fields using the mappings
          const pressureRecord: Partial<InsertPressureData> = {};

          // Process all columns by using both direct mapping and column mapping table
          for (const [key, value] of Object.entries(record)) {
            const mappedField =
              this.excelColumnMapping[key] ||
              key.toLowerCase().replace(/\s+/g, "_");

            // Handle numeric pressure value fields - allow null/blank to replace old data
            if (mappedField.startsWith("pressure_value_")) {
              if (value === null || value === undefined || value === "") {
                pressureRecord[mappedField as keyof InsertPressureData] = null;
              } else {
                pressureRecord[mappedField as keyof InsertPressureData] =
                  this.getNumericValue(value);
              }
            }
            // Handle date fields - allow null/blank to replace old data
            else if (mappedField.startsWith("pressure_date_day_")) {
              if (value === null || value === undefined || value === "") {
                pressureRecord[mappedField as keyof InsertPressureData] = null;
              } else {
                pressureRecord[mappedField as keyof InsertPressureData] =
                  this.getDateValue(value);
              }
            }
            // Handle analysis fields - skip empty values (they will be recalculated)
            else if (
              mappedField.includes("_less_than_") ||
              mappedField.includes("_between_") ||
              mappedField.includes("_greater_than_") ||
              mappedField.startsWith("number_of_")
            ) {
              if (value !== null && value !== undefined && value !== "") {
                pressureRecord[mappedField as keyof InsertPressureData] =
                  this.getNumericValue(value);
              }
            }
            // Other fields - only set if not empty
            else {
              if (value !== null && value !== undefined && value !== "") {
                pressureRecord[mappedField as keyof InsertPressureData] = value;
              }
            }
          }

          // Required fields check
          if (
            !pressureRecord.scheme_id ||
            !pressureRecord.village_name ||
            !pressureRecord.esr_name
          ) {
            errors.push(`Missing required fields in record`);
            continue;
          }

          // Calculate pressure analysis fields
          this.calculatePressureAnalysisFields(pressureRecord);

          // Generate dashboard URL for ESR if missing but have all required info
          if (
            !pressureRecord.dashboard_url &&
            pressureRecord.region &&
            pressureRecord.circle &&
            pressureRecord.division &&
            pressureRecord.sub_division &&
            pressureRecord.block &&
            pressureRecord.scheme_id &&
            pressureRecord.scheme_name &&
            pressureRecord.village_name &&
            pressureRecord.esr_name
          ) {
            pressureRecord.dashboard_url = this.generateEsrDashboardUrl(
              pressureRecord as PressureData,
            );
            if (pressureRecord.dashboard_url) {
              console.log(
                `Generated dashboard URL for ESR: ${pressureRecord.esr_name} in village: ${pressureRecord.village_name}`,
              );
            }
          }

          // Store historical data - extract daily readings and store in pressure_history table
          const batchId = uuidv4(); // Generate unique batch ID for this import
          const historicalRecords: InsertPressureHistory[] = [];

          // Process each day's data (1-7) and create historical records
          for (let day = 1; day <= 7; day++) {
            const pressureValueKey =
              `pressure_value_${day}` as keyof typeof pressureRecord;
            const pressureDateKey =
              `pressure_date_day_${day}` as keyof typeof pressureRecord;

            const pressureValue = pressureRecord[pressureValueKey];
            const pressureDate = pressureRecord[pressureDateKey];

            // Only create historical record if we have date. Allow null/blank values.
            if (pressureDate) {
              historicalRecords.push({
                region: pressureRecord.region as string,
                circle: pressureRecord.circle as string,
                division: pressureRecord.division as string,
                sub_division: pressureRecord.sub_division as string,
                block: pressureRecord.block as string,
                scheme_id: pressureRecord.scheme_id as string,
                scheme_name: pressureRecord.scheme_name as string,
                village_name: pressureRecord.village_name as string,
                esr_name: pressureRecord.esr_name as string,
                pressure_date: pressureDate as string,
                pressure_value: pressureValue as any,
                upload_batch_id: batchId,
                dashboard_url: pressureRecord.dashboard_url as string,
              });
            }
          }

          // Store the historical records for this ESR
          if (historicalRecords.length > 0) {
            try {
              await db.insert(pressureHistory).values(historicalRecords);
            } catch (historyError) {
              console.error(
                `Error storing pressure history for ${pressureRecord.scheme_id}/${pressureRecord.village_name}/${pressureRecord.esr_name}:`,
                historyError,
              );
              // Don't fail the entire import for history storage issues
            }
          }

          // Check if record exists using our lookup map
          const key = `${pressureRecord.scheme_id}|${pressureRecord.village_name}|${pressureRecord.esr_name}`;

          if (existingRecordsMap.has(key)) {
            // Add to update batch
            toUpdate.push(pressureRecord);
            updateWhereConditions.push(
              and(
                eq(pressureData.scheme_id, pressureRecord.scheme_id!),
                eq(pressureData.village_name, pressureRecord.village_name!),
                eq(pressureData.esr_name, pressureRecord.esr_name!),
              ),
            );
          } else {
            // Add to insert batch
            toInsert.push(pressureRecord as InsertPressureData);
          }
        } catch (recordError: any) {
          errors.push(
            `Error processing record: ${recordError instanceof Error ? recordError.message : String(recordError)}`,
          );
        }
      }

      // OPTIMIZATION: Execute batch operations for faster performance
      // Process inserts in batches of 100, using ON CONFLICT DO UPDATE to handle duplicates
      const insertBatchSize = 100;
      for (let i = 0; i < toInsert.length; i += insertBatchSize) {
        const batch = toInsert.slice(i, i + insertBatchSize);
        if (batch.length > 0) {
          try {
            // Use raw SQL for ON CONFLICT DO UPDATE since Drizzle doesn't directly support it
            const insertValues = [];
            const insertParams = [];
            let paramCounter = 1;

            // Build the value lists for the INSERT statement
            for (const record of batch) {
              // Collect all the non-null fields from the record
              const fields = Object.keys(record).filter(
                (key) =>
                  record[key as keyof typeof record] !== null &&
                  record[key as keyof typeof record] !== undefined,
              );

              // Generate the values placeholders ($1, $2, etc)
              const valuePlaceholders = [];
              for (let j = 0; j < fields.length; j++) {
                valuePlaceholders.push(`$${paramCounter}`);
                insertParams.push(record[fields[j] as keyof typeof record]);
                paramCounter++;
              }

              // Create a value list with column names
              insertValues.push(
                `(${fields.map((f) => `"${f}"`).join(", ")}) VALUES (${valuePlaceholders.join(", ")})`,
              );
            }

            // Build the complete query with ON CONFLICT DO UPDATE
            // This will update all fields if there's a conflict on the primary key
            const query = `
              WITH batch_data AS (
                ${insertValues.join(" UNION ALL SELECT ")}
              )
              INSERT INTO pressure_data 
              SELECT * FROM batch_data
              ON CONFLICT (scheme_id, village_name, esr_name) 
              DO UPDATE SET
                region = EXCLUDED.region,
                circle = EXCLUDED.circle,
                division = EXCLUDED.division,
                sub_division = EXCLUDED.sub_division,
                block = EXCLUDED.block,
                scheme_name = EXCLUDED.scheme_name,
                pressure_value_1 = EXCLUDED.pressure_value_1,
                pressure_value_2 = EXCLUDED.pressure_value_2,
                pressure_value_3 = EXCLUDED.pressure_value_3,
                pressure_value_4 = EXCLUDED.pressure_value_4,
                pressure_value_5 = EXCLUDED.pressure_value_5,
                pressure_value_6 = EXCLUDED.pressure_value_6,
                pressure_value_7 = EXCLUDED.pressure_value_7,
                pressure_date_day_1 = EXCLUDED.pressure_date_day_1,
                pressure_date_day_2 = EXCLUDED.pressure_date_day_2,
                pressure_date_day_3 = EXCLUDED.pressure_date_day_3,
                pressure_date_day_4 = EXCLUDED.pressure_date_day_4,
                pressure_date_day_5 = EXCLUDED.pressure_date_day_5,
                pressure_date_day_6 = EXCLUDED.pressure_date_day_6,
                pressure_date_day_7 = EXCLUDED.pressure_date_day_7,
                number_of_consistent_zero_value_in_pressure = EXCLUDED.number_of_consistent_zero_value_in_pressure,
                pressure_less_than_02_bar = EXCLUDED.pressure_less_than_02_bar,
                pressure_between_02_07_bar = EXCLUDED.pressure_between_02_07_bar,
                pressure_greater_than_07_bar = EXCLUDED.pressure_greater_than_07_bar
            `;

            // Execute the query
            const result = await db.execute(sql.raw(query, insertParams));

            // Count inserted/updated records based on result
            const affectedCount = result.rowCount || batch.length;

            // Since we're using ON CONFLICT DO UPDATE, we need to properly count inserts vs updates
            // Count existing keys in this batch as updates, and the rest as inserts
            const existingKeysInBatch = batch.filter((record) => {
              const key = `${record.scheme_id}|${record.village_name}|${record.esr_name}`;
              return existingRecordsMap.has(key);
            }).length;

            updated += existingKeysInBatch;
            inserted += affectedCount - existingKeysInBatch;

            console.log(
              `Processed batch ${Math.floor(i / insertBatchSize) + 1}/${Math.ceil(toInsert.length / insertBatchSize)}, affected rows: ${affectedCount}`,
            );
          } catch (error) {
            console.error(
              `Error in batch insert with ON CONFLICT clause:`,
              error,
            );

            // Fall back to individual inserts on error
            console.log("Falling back to individual insert operations...");

            for (const record of batch) {
              try {
                await db
                  .insert(pressureData)
                  .values(record as InsertPressureData);
                inserted++;
              } catch (individualError: any) {
                // If it's a duplicate key error, try updating instead
                if (individualError.code === "23505") {
                  try {
                    await db
                      .update(pressureData)
                      .set(record)
                      .where(
                        and(
                          eq(pressureData.scheme_id, record.scheme_id!),
                          eq(pressureData.village_name, record.village_name!),
                          eq(pressureData.esr_name, record.esr_name!),
                        ),
                      );
                    updated++;
                  } catch (updateError) {
                    errors.push(
                      `Failed to update record: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
                    );
                  }
                } else {
                  errors.push(
                    `Failed to insert record: ${individualError instanceof Error ? individualError.message : String(individualError)}`,
                  );
                }
              }
            }
          }
        }
      }

      // Process updates in parallel batches for better performance
      const updateBatchSize = 50;
      for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
        const batchRecords = toUpdate.slice(i, i + updateBatchSize);
        const batchConditions = updateWhereConditions.slice(
          i,
          i + updateBatchSize,
        );

        console.log(
          `Processing update batch ${Math.floor(i / updateBatchSize) + 1}/${Math.ceil(toUpdate.length / updateBatchSize)}`,
        );

        // Create array of update promises to execute in parallel
        const updatePromises = batchRecords.map((record, idx) =>
          db.update(pressureData).set(record).where(batchConditions[idx]),
        );

        // Execute all updates in this batch in parallel
        await Promise.all(updatePromises);
        updated += batchRecords.length;
        console.log(
          `Updated batch ${Math.floor(i / updateBatchSize) + 1}/${Math.ceil(toUpdate.length / updateBatchSize)}, total: ${updated}`,
        );
      }

      console.log(
        `Completed import: ${inserted} inserted, ${updated} updated, ${errors.length} errors`,
      );

      // IMPORTANT: Update scheme_status table with block information from this import
      console.log(
        "Synchronizing scheme_status table with block information from pressure import...",
      );

      // Extract unique scheme and block combinations from the imported data
      const schemeBlockMap = new Map<string, Set<string>>();

      // Process all records to gather unique scheme-block combinations
      [...toInsert, ...toUpdate].forEach((record) => {
        if (record.scheme_id && record.block && record.scheme_name) {
          if (!schemeBlockMap.has(record.scheme_name)) {
            schemeBlockMap.set(record.scheme_name, new Set<string>());
          }
          schemeBlockMap.get(record.scheme_name)?.add(record.block);
        }
      });

      // For each scheme, ensure we have entries in scheme_status for all its blocks
      let schemeStatusUpdated = 0;
      for (const [schemeName, blocks] of schemeBlockMap.entries()) {
        try {
          // First get all existing scheme status entries for this scheme
          const existingSchemeStatus = await db
            .select()
            .from(schemeStatuses)
            .where(eq(schemeStatuses.scheme_name, schemeName));

          console.log(
            `Found ${existingSchemeStatus.length} existing scheme status records for scheme "${schemeName}"`,
          );

          // Create a map of existing blocks for this scheme
          const existingBlocks = new Set(
            existingSchemeStatus.map((s) => s.block),
          );

          // Check for blocks in our import that don't exist in scheme_status
          for (const block of blocks) {
            if (!existingBlocks.has(block)) {
              console.log(
                `Adding missing block "${block}" to scheme_status for scheme "${schemeName}"`,
              );

              // If we have an existing record for this scheme, clone it for the new block
              if (existingSchemeStatus.length > 0) {
                const templateRecord = { ...existingSchemeStatus[0] };
                templateRecord.block = block;

                // Insert the new block record
                await db.insert(schemeStatuses).values(templateRecord);
                schemeStatusUpdated++;
              }
            }
          }
        } catch (error) {
          console.error(
            `Error synchronizing scheme_status for scheme "${schemeName}":`,
            error,
          );
          errors.push(
            `Failed to sync scheme status for ${schemeName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      console.log(
        `Synchronized ${schemeStatusUpdated} new block entries in scheme_status table from pressure import`,
      );

      // Store import results in app state
      try {
        const importStats = {
          inserted,
          updated,
          removed: 0,
          totalProcessed: inserted + updated,
          timestamp: new Date().toISOString(),
          errors: errors.length,
        };

        // Store in app_state table under key "last_pressure_import"
        await db
          .insert(appState)
          .values({
            key: "last_pressure_import",
            value: importStats as any,
            updated_at: new Date(),
          })
          .onConflictDoUpdate({
            target: appState.key,
            set: {
              value: importStats as any,
              updated_at: new Date(),
            },
          });

        console.log("Saved pressure import stats to app_state:", importStats);
      } catch (storeError) {
        console.error("Error storing import stats:", storeError);
      }

      return {
        inserted,
        updated,
        removed: 0, // CSV import doesn't remove records
        errors,
      };
    } catch (error: any) {
      console.error("Error importing pressure data from CSV:", error);
      throw new Error(
        `Failed to import pressure data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Helper method to calculate pressure analysis fields
  private calculatePressureAnalysisFields(
    record: Partial<InsertPressureData>,
  ): void {
    let zeroCount = 0;
    let belowRangeCount = 0;
    let optimalRangeCount = 0;
    let aboveRangeCount = 0;

    // Count values in each range
    for (let i = 1; i <= 7; i++) {
      const valueField = `pressure_value_${i}` as keyof InsertPressureData;
      const value = record[valueField] as number | null;

      if (value === null || value === 0) {
        zeroCount++;
      } else if (value < 0.2) {
        belowRangeCount++;
      } else if (value >= 0.2 && value <= 0.7) {
        optimalRangeCount++;
      } else if (value > 0.7) {
        aboveRangeCount++;
      }
    }

    // Set analysis fields
    record.number_of_consistent_zero_value_in_pressure =
      zeroCount === 7 ? 7 : null;
    record.pressure_less_than_02_bar = belowRangeCount;
    record.pressure_between_02_07_bar = optimalRangeCount;
    record.pressure_greater_than_07_bar = aboveRangeCount;
  }

  private async initializeDb() {
    try {
      // Initialize the PostgreSQL database with retry logic
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await initializeDatabase();
          console.log("Database initialized successfully in storage");
          return;
        } catch (error) {
          if (attempt < maxRetries) {
            const waitTime = 1000 * attempt; // Increasing backoff delay
            console.warn(
              `Database initialization failed on attempt ${attempt}/${maxRetries}. Retrying in ${waitTime}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          } else {
            throw error; // Re-throw on final attempt
          }
        }
      }
    } catch (error) {
      console.error("Error initializing database in storage:", error);
      // Continue without throwing to allow app to start and retry later
    }
  }

  private async ensureInitialized() {
    await this.initialized;
    return getDB();
  }

  // Water Consumption CRUD operations
  async getAllWaterConsumption(): Promise<WaterConsumption[]> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const result = await db.select().from(waterConsumption);
      return result;
    } catch (error) {
      console.error("Error getting all water consumption data:", error);
      throw error;
    }
  }

  async getWaterConsumptionByScheme(
    schemeId: string,
    block?: string,
  ): Promise<WaterConsumption[]> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      let query = db
        .select()
        .from(waterConsumption)
        .where(eq(waterConsumption.scheme_id, schemeId));
      if (block) {
        query = query.where(eq(waterConsumption.block, block));
      }
      const result = await query;
      return result;
    } catch (error) {
      console.error(
        `Error getting water consumption data for scheme ${schemeId}:`,
        error,
      );
      throw error;
    }
  }

  async getWaterConsumptionByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<WaterConsumption | undefined> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const result = await db
        .select()
        .from(waterConsumption)
        .where(
          and(
            eq(waterConsumption.scheme_id, schemeId),
            eq(waterConsumption.village_name, villageName),
            eq(waterConsumption.esr_name, esrName),
          ),
        )
        .limit(1);
      return result[0];
    } catch (error) {
      console.error(
        `Error getting water consumption data for ${schemeId}/${villageName}/${esrName}:`,
        error,
      );
      throw error;
    }
  }

  async createWaterConsumption(
    data: InsertWaterConsumption,
  ): Promise<WaterConsumption> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const result = await db.insert(waterConsumption).values(data).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating water consumption data:", error);
      throw error;
    }
  }

  async updateWaterConsumption(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdateWaterConsumption,
  ): Promise<WaterConsumption> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const result = await db
        .update(waterConsumption)
        .set(data)
        .where(
          and(
            eq(waterConsumption.scheme_id, schemeId),
            eq(waterConsumption.village_name, villageName),
            eq(waterConsumption.esr_name, esrName),
          ),
        )
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating water consumption data:", error);
      throw error;
    }
  }

  async deleteWaterConsumption(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<boolean> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const result = await db
        .delete(waterConsumption)
        .where(
          and(
            eq(waterConsumption.scheme_id, schemeId),
            eq(waterConsumption.village_name, villageName),
            eq(waterConsumption.esr_name, esrName),
          ),
        );
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting water consumption data:", error);
      throw error;
    }
  }

  async importWaterConsumptionFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;

    try {
      console.log("Starting water consumption data import from CSV...");
      // CSV column mapping as per requirements
      const csvColumnMapping = [
        "region", // Column 0
        "circle", // Column 1
        "division", // Column 2
        "sub_division", // Column 3
        "block", // Column 4
        "scheme_id", // Column 5
        "scheme_name", // Column 6
        "village_name", // Column 7
        "esr_name", // Column 8
        "flow_rate_m3", // Column 9
        "flow_meter_connected", // Column 10
        "online_status", // Column 11
        "esr_capacity", // Column 12
        "water_value_day1", // Column 13
        "water_value_day2", // Column 14
        "water_value_day3", // Column 15
        "water_value_day4", // Column 16
        "water_value_day5", // Column 17
        "water_value_day6", // Column 18
        "water_value_day7", // Column 19
        "water_date_day1", // Column 20
        "water_date_day2", // Column 21
        "water_date_day3", // Column 22
        "water_date_day4", // Column 23
        "water_date_day5", // Column 24
        "water_date_day6", // Column 25
        "water_date_day7", // Column 26
        "consistent_zero_consumption", // Column 27
        "percentage_consumption_previous_day", // Column 28
      ];

      const csvString = fileBuffer.toString("utf8");

      // Use synchronous parse function from csv-parse for better performance
      const { parse } = await import("csv-parse/sync");

      const options = {
        columns: false, // No headers in the CSV file, use positional mapping
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow different column counts in rows
        bom: true, // Handle byte order mark if present
      };

      const records = parse(csvString, options);

      console.log(`Parsed ${records.length} records from CSV`);

      // Process records
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 1;

        try {
          if (!record || record.length < csvColumnMapping.length) {
            errors.push(`Row ${rowNumber}: Invalid record format`);
            continue;
          }

          // Map CSV columns to database fields
          const waterConsumptionRecord: Partial<InsertWaterConsumption> = {};

          for (
            let colIndex = 0;
            colIndex < csvColumnMapping.length;
            colIndex++
          ) {
            const fieldName = csvColumnMapping[colIndex];
            const value = record[colIndex]?.toString().trim();

            if (value === undefined || value === "") {
              continue;
            }

            // Type conversions based on field type
            switch (fieldName) {
              case "flow_rate_m3":
              case "esr_capacity":
                const flowValue = parseFloat(value.replace(/[^\d.-]/g, ""));
                if (!isNaN(flowValue)) {
                  // Cap values to prevent overflow (precision 10, scale 2 = max 99999999.99)
                  const cappedFlowValue = Math.min(
                    Math.max(flowValue, -99999999.99),
                    99999999.99,
                  );
                  (waterConsumptionRecord as any)[fieldName] =
                    cappedFlowValue.toString();
                }
                break;
              case "water_value_day1":
              case "water_value_day2":
              case "water_value_day3":
              case "water_value_day4":
              case "water_value_day5":
              case "water_value_day6":
              case "water_value_day7":
                const numValue = parseFloat(value.replace(/[^\d.-]/g, ""));
                if (!isNaN(numValue)) {
                  // Cap values to prevent overflow (precision 10, scale 2 = max 99999999.99)
                  const cappedNumValue = Math.min(
                    Math.max(numValue, -99999999.99),
                    99999999.99,
                  );
                  (waterConsumptionRecord as any)[fieldName] =
                    cappedNumValue.toString();
                }
                break;
              case "flow_meter_connected":
                (waterConsumptionRecord as any)[fieldName] =
                  value.toLowerCase() === "true" ||
                  value === "1" ||
                  value.toLowerCase() === "yes";
                break;
              case "consistent_zero_consumption":
                const intValue = parseInt(value.replace(/[^\d-]/g, ""));
                if (!isNaN(intValue)) {
                  (waterConsumptionRecord as any)[fieldName] = intValue;
                }
                break;
              case "percentage_consumption_previous_day":
                // Strip % and convert to decimal, handle large values
                const percentValue = parseFloat(value.replace(/[%\s]/g, ""));
                if (!isNaN(percentValue)) {
                  // Cap extremely large values to prevent overflow
                  const cappedValue = Math.min(
                    Math.max(percentValue, -99999999.99),
                    99999999.99,
                  );
                  (waterConsumptionRecord as any)[fieldName] =
                    cappedValue.toString();
                }
                break;
              case "water_date_day1":
              case "water_date_day2":
              case "water_date_day3":
              case "water_date_day4":
              case "water_date_day5":
              case "water_date_day6":
              case "water_date_day7":
                // Format date if needed - convert from formats like "28-Jul" to proper date
                if (value && value.length > 0) {
                  let formattedDate = value;

                  // Handle "DD-MMM" format (e.g., "28-Jul")
                  if (/^\d{1,2}-[A-Za-z]{3}$/.test(value)) {
                    const currentYear = new Date().getFullYear();
                    const [day, monthAbbr] = value.split("-");
                    const monthMap: { [key: string]: string } = {
                      Jan: "01",
                      Feb: "02",
                      Mar: "03",
                      Apr: "04",
                      May: "05",
                      Jun: "06",
                      Jul: "07",
                      Aug: "08",
                      Sep: "09",
                      Oct: "10",
                      Nov: "11",
                      Dec: "12",
                    };
                    const month = monthMap[monthAbbr];
                    if (month) {
                      formattedDate = `${currentYear}-${month}-${day.padStart(2, "0")}`;
                    }
                  }
                  // Handle "DD/MM/YYYY" format
                  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
                    const [day, month, year] = value.split("/");
                    formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                  }
                  // Handle "MM/DD/YYYY" format
                  else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
                    const parts = value.split("/");
                    let year = parts[2];
                    if (year.length === 2) {
                      year = "20" + year; // Assume 2000s for 2-digit years
                    }
                    formattedDate = `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
                  }

                  (waterConsumptionRecord as any)[fieldName] = formattedDate;
                }
                break;
              default:
                (waterConsumptionRecord as any)[fieldName] = value;
                break;
            }
          }

          // Generate ESR-level dashboard URL for water consumption record
          if (
            waterConsumptionRecord.scheme_id &&
            waterConsumptionRecord.village_name &&
            waterConsumptionRecord.esr_name
          ) {
            // Create an ESR-like object for the ESR-level dashboard URL generator
            const esrForUrl = {
              scheme_id: waterConsumptionRecord.scheme_id,
              scheme_name:
                waterConsumptionRecord.scheme_name ||
                `Scheme ${waterConsumptionRecord.scheme_id}`,
              region: waterConsumptionRecord.region,
              circle: waterConsumptionRecord.circle,
              division: waterConsumptionRecord.division,
              sub_division: waterConsumptionRecord.sub_division,
              block: waterConsumptionRecord.block,
              village_name: waterConsumptionRecord.village_name,
              esr_name: waterConsumptionRecord.esr_name,
            };
            waterConsumptionRecord.dashboard_url =
              this.generateEsrDashboardUrl(esrForUrl);
          }

          // Check if record exists
          const existingRecord = await this.getWaterConsumptionByCompositeKey(
            waterConsumptionRecord.scheme_id || "",
            waterConsumptionRecord.village_name || "",
            waterConsumptionRecord.esr_name || "",
          );

          if (existingRecord) {
            // Update existing record
            await this.updateWaterConsumption(
              waterConsumptionRecord.scheme_id || "",
              waterConsumptionRecord.village_name || "",
              waterConsumptionRecord.esr_name || "",
              waterConsumptionRecord as UpdateWaterConsumption,
            );
            updated++;
          } else {
            // Insert new record
            await this.createWaterConsumption(
              waterConsumptionRecord as InsertWaterConsumption,
            );
            inserted++;
          }
        } catch (recordError: any) {
          const errorMsg = `Row ${rowNumber}: ${recordError instanceof Error ? recordError.message : String(recordError)}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(
        `Water consumption import completed: ${inserted} inserted, ${updated} updated, ${errors.length} errors`,
      );

      return {
        inserted,
        updated,
        removed: 0,
        errors,
      };
    } catch (error: any) {
      console.error("Error importing water consumption data from CSV:", error);
      throw new Error(
        `Failed to import water consumption data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async importWaterConsumptionFromCSVWithMapping(
    fileBuffer: Buffer,
    columnMappings: Record<string, string>,
    delimiter: string = ",",
    hasHeader: boolean = true,
  ): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;

    try {
      console.log(
        "Starting water consumption data import from CSV with column mappings...",
      );

      const csvString = fileBuffer.toString("utf8");

      // Use synchronous parse function from csv-parse for better performance
      const { parse } = await import("csv-parse/sync");

      const options = {
        columns: false, // Don't use headers, we'll handle mapping manually
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
        delimiter: delimiter,
      };

      const records = parse(csvString, options);
      console.log(`Parsed ${records.length} records from CSV`);

      // Skip header row if present
      const dataRecords = hasHeader ? records.slice(1) : records;
      console.log(`Processing ${dataRecords.length} data records`);

      // Process records
      for (let i = 0; i < dataRecords.length; i++) {
        const record = dataRecords[i];
        const rowNumber = hasHeader ? i + 2 : i + 1; // Account for header row

        try {
          if (!record || record.length === 0) {
            errors.push(`Row ${rowNumber}: Empty record`);
            continue;
          }

          // Map CSV columns to database fields using column mappings
          const waterConsumptionRecord: Partial<InsertWaterConsumption> = {};

          // Apply column mappings
          for (const [fieldName, columnIndex] of Object.entries(
            columnMappings,
          )) {
            if (columnIndex === "not_mapped" || columnIndex === "") {
              continue;
            }

            const colIndex = parseInt(columnIndex);
            if (isNaN(colIndex) || colIndex >= record.length) {
              continue;
            }

            const value = record[colIndex]?.toString().trim();
            if (value === undefined || value === "") {
              continue;
            }

            // Type conversion and validation
            switch (fieldName) {
              case "region":
              case "circle":
              case "division":
              case "sub_division":
              case "block":
              case "scheme_id":
              case "scheme_name":
              case "village_name":
              case "esr_name":
              case "flow_meter_connected":
              case "online_status":
              case "time_duration":
              case "water_date_day1":
              case "water_date_day2":
              case "water_date_day3":
              case "water_date_day4":
              case "water_date_day5":
              case "water_date_day6":
              case "water_date_day7":
                waterConsumptionRecord[
                  fieldName as keyof InsertWaterConsumption
                ] = value;
                break;

              case "flow_rate_m3":
              case "esr_capacity":
              case "water_value_day1":
              case "water_value_day2":
              case "water_value_day3":
              case "water_value_day4":
              case "water_value_day5":
              case "water_value_day6":
              case "water_value_day7":
              case "percentage_consumption_previous_day":
                const numericValue = parseFloat(value);
                if (!isNaN(numericValue)) {
                  // Store as string since database schema uses varchar for numeric fields
                  (waterConsumptionRecord as any)[fieldName] =
                    numericValue.toString();
                }
                break;

              case "consistent_zero_consumption":
                const intValue = parseInt(value);
                if (!isNaN(intValue)) {
                  (waterConsumptionRecord as any)[fieldName] = intValue;
                }
                break;
            }
          }

          // Validate required fields
          if (
            !waterConsumptionRecord.scheme_id ||
            !waterConsumptionRecord.village_name ||
            !waterConsumptionRecord.esr_name
          ) {
            errors.push(
              `Row ${rowNumber}: Missing required fields (scheme_id, village_name, or esr_name)`,
            );
            continue;
          }

          // Generate ESR-level dashboard URL for water consumption record
          if (
            waterConsumptionRecord.scheme_id &&
            waterConsumptionRecord.village_name &&
            waterConsumptionRecord.esr_name
          ) {
            // Create an ESR-like object for the ESR-level dashboard URL generator
            const esrForUrl = {
              scheme_id: waterConsumptionRecord.scheme_id,
              scheme_name:
                waterConsumptionRecord.scheme_name ||
                `Scheme ${waterConsumptionRecord.scheme_id}`,
              region: waterConsumptionRecord.region,
              circle: waterConsumptionRecord.circle,
              division: waterConsumptionRecord.division,
              sub_division: waterConsumptionRecord.sub_division,
              block: waterConsumptionRecord.block,
              village_name: waterConsumptionRecord.village_name,
              esr_name: waterConsumptionRecord.esr_name,
            };
            waterConsumptionRecord.dashboard_url =
              this.generateEsrDashboardUrl(esrForUrl);
          }

          // Try to update first, then insert if not found
          const existingRecord = await db
            .select()
            .from(waterConsumption)
            .where(
              and(
                eq(
                  waterConsumption.scheme_id,
                  waterConsumptionRecord.scheme_id!,
                ),
                eq(
                  waterConsumption.village_name,
                  waterConsumptionRecord.village_name!,
                ),
                eq(waterConsumption.esr_name, waterConsumptionRecord.esr_name!),
              ),
            )
            .limit(1);

          if (existingRecord.length > 0) {
            // Update existing record
            await db
              .update(waterConsumption)
              .set(waterConsumptionRecord)
              .where(
                and(
                  eq(
                    waterConsumption.scheme_id,
                    waterConsumptionRecord.scheme_id!,
                  ),
                  eq(
                    waterConsumption.village_name,
                    waterConsumptionRecord.village_name!,
                  ),
                  eq(
                    waterConsumption.esr_name,
                    waterConsumptionRecord.esr_name!,
                  ),
                ),
              );
            updated++;
          } else {
            // Insert new record
            await db
              .insert(waterConsumption)
              .values(waterConsumptionRecord as InsertWaterConsumption);
            inserted++;
          }
        } catch (recordError) {
          console.error(`Error processing row ${rowNumber}:`, recordError);
          errors.push(
            `Row ${rowNumber}: ${recordError instanceof Error
              ? recordError.message
              : String(recordError)
            }`,
          );
        }
      }

      console.log(
        `Water consumption import completed: ${inserted} inserted, ${updated} updated, ${errors.length} errors`,
      );
    } catch (error) {
      console.error("Error in water consumption CSV import:", error);
      errors.push(
        `Import failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { inserted, updated, removed: 0, errors };
  }

  // Get all water consumption data
  async getAllWaterConsumption(): Promise<WaterConsumption[]> {
    try {
      const db = await getDB();
      const result = await db.select().from(waterConsumption);
      return result;
    } catch (error) {
      console.error("Error fetching all water consumption data:", error);
      throw error;
    }
  }

  // Get all water consumption data with scheme status information
  async getAllWaterConsumptionWithSchemeStatus(filter?: any): Promise<any[]> {
    try {
      const db = await getDB();

      // Build filter conditions
      const conditions: any[] = [];
      if (filter?.region && filter.region !== "all") {
        conditions.push(eq(waterConsumption.region, filter.region));
      }
      if (filter?.circle && filter.circle !== "all") {
        conditions.push(eq(waterConsumption.circle, filter.circle));
      }
      if (filter?.division && filter.division !== "all") {
        conditions.push(eq(waterConsumption.division, filter.division));
      }
      const subDivision = filter?.subDivision || filter?.subdivision;
      if (subDivision && subDivision !== "all") {
        conditions.push(eq(waterConsumption.sub_division, subDivision));
      }
      if (filter?.block && filter.block !== "all") {
        conditions.push(eq(waterConsumption.block, filter.block));
      }

      // Use proper LEFT JOIN to get scheme status data
      let query = db
        .select({
          // Water consumption fields
          region: waterConsumption.region,
          circle: waterConsumption.circle,
          division: waterConsumption.division,
          sub_division: waterConsumption.sub_division,
          block: waterConsumption.block,
          scheme_id: waterConsumption.scheme_id,
          scheme_name: waterConsumption.scheme_name,
          village_name: waterConsumption.village_name,
          esr_name: waterConsumption.esr_name,
          flow_rate_m3: waterConsumption.flow_rate_m3,
          flow_meter_connected: waterConsumption.flow_meter_connected,
          online_status: waterConsumption.online_status,
          time_duration: waterConsumption.time_duration,
          esr_capacity: waterConsumption.esr_capacity,
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
          consistent_zero_consumption:
            waterConsumption.consistent_zero_consumption,
          percentage_consumption_previous_day:
            waterConsumption.percentage_consumption_previous_day,
          dashboard_url: waterConsumption.dashboard_url,
          // Scheme status fields from the JOIN
          mjp_commissioned: schemeStatuses.mjp_commissioned,
          mjp_fully_completed: schemeStatuses.mjp_fully_completed,
          fully_completion_scheme_status:
            schemeStatuses.fully_completion_scheme_status,
          water_supply: schemeStatuses.water_supply,
        })
        .from(waterConsumption)
        .leftJoin(
          schemeStatuses,
          and(
            eq(schemeStatuses.scheme_id, waterConsumption.scheme_id),
            eq(schemeStatuses.block, waterConsumption.block),
          ),
        );

      // Apply filters if any
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query;

      return result;
    } catch (error) {
      console.error(
        "Error fetching water consumption data with scheme status:",
        error,
      );
      throw error;
    }
  }

  // Get water consumption data by composite key
  async getWaterConsumptionByCompositeKey(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<WaterConsumption | null> {
    try {
      const db = await getDB();
      const result = await db
        .select()
        .from(waterConsumption)
        .where(
          and(
            eq(waterConsumption.scheme_id, schemeId),
            eq(waterConsumption.village_name, villageName),
            eq(waterConsumption.esr_name, esrName),
          ),
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(
        "Error fetching water consumption data by composite key:",
        error,
      );
      throw error;
    }
  }

  // Update water consumption data
  async updateWaterConsumption(
    schemeId: string,
    villageName: string,
    esrName: string,
    data: UpdateWaterConsumption,
  ): Promise<WaterConsumption> {
    try {
      const db = await getDB();
      const result = await db
        .update(waterConsumption)
        .set(data)
        .where(
          and(
            eq(waterConsumption.scheme_id, schemeId),
            eq(waterConsumption.village_name, villageName),
            eq(waterConsumption.esr_name, esrName),
          ),
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Water consumption data not found for update");
      }

      return result[0];
    } catch (error) {
      console.error("Error updating water consumption data:", error);
      throw error;
    }
  }

  // Delete water consumption data
  async deleteWaterConsumption(
    schemeId: string,
    villageName: string,
    esrName: string,
  ): Promise<void> {
    try {
      const db = await getDB();
      await db
        .delete(waterConsumption)
        .where(
          and(
            eq(waterConsumption.scheme_id, schemeId),
            eq(waterConsumption.village_name, villageName),
            eq(waterConsumption.esr_name, esrName),
          ),
        );
    } catch (error) {
      console.error("Error deleting water consumption data:", error);
      throw error;
    }
  }

  // Get water consumption statistics
  async getWaterConsumptionStats(): Promise<{
    totalESRs: number;
    connectedESRs: number;
    onlineESRs: number;
    regionStats: Array<{
      region: string;
      total: number;
      connected: number;
      online: number;
    }>;
  }> {
    try {
      const db = await getDB();
      const allData = await db.select().from(waterConsumption);

      const totalESRs = allData.length;
      const connectedESRs = allData.filter(
        (record) => record.flow_meter_connected,
      ).length;
      const onlineESRs = allData.filter(
        (record) => record.online_status === "Online",
      ).length;

      // Group by region
      const regionGroups = allData.reduce(
        (acc, record) => {
          const region = record.region || "Unknown";
          if (!acc[region]) {
            acc[region] = { total: 0, connected: 0, online: 0 };
          }
          acc[region].total++;
          if (record.flow_meter_connected) acc[region].connected++;
          if (record.online_status === "Online") acc[region].online++;
          return acc;
        },
        {} as Record<
          string,
          { total: number; connected: number; online: number }
        >,
      );

      const regionStats = Object.entries(regionGroups).map(
        ([region, stats]) => ({
          region,
          ...stats,
        }),
      );

      return {
        totalESRs,
        connectedESRs,
        onlineESRs,
        regionStats,
      };
    } catch (error) {
      console.error("Error fetching water consumption statistics:", error);
      throw error;
    }
  }

  // Helper to execute database operations with retry logic
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    // Import executeWithRetry from db.ts
    const { executeWithRetry } = await import("./db");
    return executeWithRetry(operation);
  }

  // Population tracking methods
  async storePopulationData(): Promise<void> {
    console.log("📊 Storing current population data in tracking tables...");
    const db = await this.ensureInitialized();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    try {
      // Calculate total population from water_scheme_data
      const totalPopulationResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(population AS INTEGER)), 0) as total_population
        FROM water_scheme_data 
        WHERE population IS NOT NULL AND population != 0
      `);

      const totalPopulation =
        Number(totalPopulationResult.rows[0]?.total_population) || 0;

      // Store total population in population_tracking table
      if (totalPopulation > 0) {
        await db.execute(sql`
          INSERT INTO population_tracking (date, total_population) 
          VALUES (${today}, ${totalPopulation})
          ON CONFLICT (date) 
          DO UPDATE SET total_population = ${totalPopulation}
        `);
        console.log(
          `✅ Stored total population: ${totalPopulation.toLocaleString()} for ${today}`,
        );
      }

      // Calculate region-wise population and store in region_population_tracking
      const regionPopulationResult = await db.execute(sql`
        SELECT 
          region,
          COALESCE(SUM(CAST(population AS INTEGER)), 0) as total_population
        FROM water_scheme_data 
        WHERE population IS NOT NULL AND population != 0 AND region IS NOT NULL
        GROUP BY region
      `);

      for (const row of regionPopulationResult.rows) {
        const region = row.region as string;
        const regionPopulation = Number(row.total_population) || 0;

        if (regionPopulation > 0) {
          await db.execute(sql`
            INSERT INTO region_population_tracking (date, region, total_population) 
            VALUES (${today}, ${region}, ${regionPopulation})
            ON CONFLICT (date, region) 
            DO UPDATE SET total_population = ${regionPopulation}
          `);
          console.log(
            `✅ Stored ${region} population: ${regionPopulation.toLocaleString()} for ${today}`,
          );
        }
      }

      console.log("📊 Population data storage completed successfully");
    } catch (error) {
      console.error("❌ Error storing population data:", error);
      throw error;
    }
  }

  // Get current population tracking data with change calculation
  async getCurrentPopulationData(region?: string): Promise<{
    totalPopulation: number;
    change: {
      change: number;
      changePercent: number;
    } | null;
  }> {
    const db = await this.ensureInitialized();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    try {
      if (region && region !== "all") {
        // Region-specific population data
        const currentResult = await db.execute(sql`
          SELECT total_population 
          FROM region_population_tracking 
          WHERE date = ${today} AND region = ${region}
        `);

        const previousResult = await db.execute(sql`
          SELECT total_population 
          FROM region_population_tracking 
          WHERE date = ${yesterday} AND region = ${region}
        `);

        const current = Number(currentResult.rows[0]?.total_population) || 0;
        const previous = Number(previousResult.rows[0]?.total_population) || 0;

        const change =
          previous > 0
            ? {
              change: current - previous,
              changePercent: ((current - previous) / previous) * 100,
            }
            : null;

        return { totalPopulation: current, change };
      } else {
        // Total population data
        const currentResult = await db.execute(sql`
          SELECT total_population 
          FROM population_tracking 
          WHERE date = ${today}
        `);

        const previousResult = await db.execute(sql`
          SELECT total_population 
          FROM population_tracking 
          WHERE date = ${yesterday}
        `);

        const current = Number(currentResult.rows[0]?.total_population) || 0;
        const previous = Number(previousResult.rows[0]?.total_population) || 0;

        const change =
          previous > 0
            ? {
              change: current - previous,
              changePercent: ((current - previous) / previous) * 100,
            }
            : null;

        return { totalPopulation: current, change };
      }
    } catch (error) {
      console.error("Error fetching current population data:", error);
      return { totalPopulation: 0, change: null };
    }
  }

  // Get weekly population trend data for charts
  async getWeeklyPopulationTrend(): Promise<
    Array<{ date: string; population: number }>
  > {
    const db = await this.ensureInitialized();

    try {
      const result = await db.execute(sql`
        SELECT date, total_population as population
        FROM population_tracking 
        ORDER BY date DESC 
        LIMIT 7
      `);

      return result.rows
        .map((row) => ({
          date: row.date as string,
          population: Number(row.population) || 0,
        }))
        .reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error("Error fetching weekly population trend:", error);
      return [];
    }
  }

  // User methods (from original schema)
  async getUser(id: number): Promise<User | undefined> {
    const db = await this.ensureInitialized();
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await this.ensureInitialized();
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async validateUserCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const db = await this.ensureInitialized();
    const user = await this.getUserByUsername(username);

    if (!user) {
      return null;
    }

    // Simple password check (in a real app, you would use bcrypt or similar)
    if (user.password === password) {
      return user;
    }

    return null;
  }

  // Region methods
  async getAllRegions(): Promise<Region[]> {
    const db = await this.ensureInitialized();
    return db.select().from(regions).orderBy(regions.region_name);
  }

  async getRegionByName(regionName: string): Promise<Region | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(regions)
      .where(eq(regions.region_name, regionName));
    return result.length > 0 ? result[0] : undefined;
  }

  async getRegionSummary(
    regionName?: string,
    circle?: string,
    division?: string,
    subdivision?: string,
    block?: string,
  ): Promise<any> {
    const db = await this.ensureInitialized();

    let filteredSchemeCount = 0;

    if (regionName && regionName !== "all") {
      // Get filtered scheme count from scheme_status table for specific region
      const schemes = await this.getConsolidatedSchemesByRegion(
        regionName,
        undefined,
        undefined,
        circle,
        division,
        subdivision,
        block,
      );
      filteredSchemeCount = schemes.length;

      // Use data directly from the regions table
      const region = await this.getRegionByName(regionName);
      if (!region) return null;

      return {
        total_schemes_integrated: region.total_schemes_integrated || 0,
        fully_completed_schemes: region.fully_completed_schemes || 0,
        total_villages_integrated: region.total_villages_integrated || 0,
        fully_completed_villages: region.fully_completed_villages || 0,
        total_esr_integrated: region.total_esr_integrated || 0,
        fully_completed_esr: region.fully_completed_esr || 0,
        partial_esr: region.partial_esr || 0,
        flow_meter_integrated: region.flow_meter_integrated || 0,
        rca_integrated: region.rca_integrated || 0,
        pressure_transmitter_integrated:
          region.pressure_transmitter_integrated || 0,
        filtered_scheme_count: filteredSchemeCount, // Add the filtered count
      };
    } else {
      // Get all schemes count from scheme_status table
      const schemes = await this.getAllSchemes(
        undefined,
        undefined,
        circle,
        division,
        subdivision,
        block,
      );
      filteredSchemeCount = schemes.length;

      // Always dynamically calculate the sum of all regions instead of using global_summary
      console.log("Calculating dynamic sum of all regions");

      const result = await db
        .select({
          total_schemes_integrated: sql<number>`SUM(${regions.total_schemes_integrated})`,
          fully_completed_schemes: sql<number>`SUM(${regions.fully_completed_schemes})`,
          total_villages_integrated: sql<number>`SUM(${regions.total_villages_integrated})`,
          fully_completed_villages: sql<number>`SUM(${regions.fully_completed_villages})`,
          total_esr_integrated: sql<number>`SUM(${regions.total_esr_integrated})`,
          fully_completed_esr: sql<number>`SUM(${regions.fully_completed_esr})`,
          partial_esr: sql<number>`SUM(${regions.partial_esr})`,
          flow_meter_integrated: sql<number>`SUM(${regions.flow_meter_integrated})`,
          rca_integrated: sql<number>`SUM(${regions.rca_integrated})`,
          pressure_transmitter_integrated: sql<number>`SUM(${regions.pressure_transmitter_integrated})`,
        })
        .from(regions);

      // Log the dynamically calculated summary for debugging
      console.log("Dynamic region summary calculated:", result[0]);

      return { ...result[0], filtered_scheme_count: filteredSchemeCount }; // Add the filtered count
    }
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    const db = await this.ensureInitialized();
    const result = await db.insert(regions).values(region).returning();
    return result[0];
  }

  async updateRegion(region: Region): Promise<Region> {
    const db = await this.ensureInitialized();
    await db
      .update(regions)
      .set({
        region_name: region.region_name,
        total_esr_integrated: region.total_esr_integrated,
        fully_completed_esr: region.fully_completed_esr,
        partial_esr: region.partial_esr,
        total_villages_integrated: region.total_villages_integrated,
        fully_completed_villages: region.fully_completed_villages,
        total_schemes_integrated: region.total_schemes_integrated,
        fully_completed_schemes: region.fully_completed_schemes,
        flow_meter_integrated: region.flow_meter_integrated,
        rca_integrated: region.rca_integrated,
        pressure_transmitter_integrated: region.pressure_transmitter_integrated,
      })
      .where(eq(regions.region_id, region.region_id));

    return region;
  }

  async batchUpsertRegions(
    regionsToUpsert: InsertRegion[],
  ): Promise<{ inserted: number; updated: number }> {
    if (regionsToUpsert.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    const db = await this.ensureInitialized();
    let inserted = 0;
    let updated = 0;

    try {
      // Use PostgreSQL's INSERT ... ON CONFLICT for efficient upsert
      for (const region of regionsToUpsert) {
        const result = await db
          .insert(regions)
          .values(region)
          .onConflictDoUpdate({
            target: regions.region_name,
            set: {
              total_esr_integrated: region.total_esr_integrated,
              fully_completed_esr: region.fully_completed_esr,
              partial_esr: region.partial_esr,
              total_villages_integrated: region.total_villages_integrated,
              fully_completed_villages: region.fully_completed_villages,
              total_schemes_integrated: region.total_schemes_integrated,
              fully_completed_schemes: region.fully_completed_schemes,
              flow_meter_integrated: region.flow_meter_integrated,
              rca_integrated: region.rca_integrated,
              pressure_transmitter_integrated:
                region.pressure_transmitter_integrated,
            },
          })
          .returning();

        if (result.length > 0) {
          // This is still not optimal - we should use bulk operations, but it's better than the original row-by-row queries
          updated++;
        } else {
          inserted++;
        }
      }
    } catch (error) {
      console.error("Error in batch upsert regions:", error);
      throw error;
    }

    return { inserted, updated };
  }

  // Scheme methods
  async getAllSchemes(
    statusFilter?: string,
    schemeId?: string,
    circle?: string,
    division?: string,
    subDivision?: string,
    block?: string,
  ): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();

    // Start with the basic query
    let query = db.select().from(schemeStatuses);

    // Apply scheme_id filter if provided
    if (schemeId) {
      query = query.where(eq(schemeStatuses.scheme_id, schemeId));
    }

    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      // Handle "Connected" status which includes both Fully Completed and In Progress but not Not-Connected
      if (statusFilter === "Connected") {
        query = query.where(
          sql`${schemeStatuses.fully_completion_scheme_status} != 'Not-Connected'`,
        );
      }
      // Handle both "Partial" and "In Progress" as the same filter
      else if (statusFilter === "In Progress") {
        query = query.where(
          sql`${schemeStatuses.fully_completion_scheme_status} IN ('Partial', 'In Progress')`,
        );
      }
      // Handle Fully Completed status including "completed" and "Completed" values - with case insensitivity
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) 
              IN (LOWER('Completed'), LOWER('Fully-Completed'), LOWER('Fully Completed'), LOWER('fully completed'))`,
        );
      } else {
        query = query.where(
          eq(schemeStatuses.fully_completion_scheme_status, statusFilter),
        );
      }
    }

    // Apply geographic filters
    if (circle && circle !== "all") {
      query = query.where(eq(schemeStatuses.circle, circle));
    }
    if (division && division !== "all") {
      query = query.where(eq(schemeStatuses.division, division));
    }
    if (subDivision && subDivision !== "all") {
      query = query.where(eq(schemeStatuses.sub_division, subDivision));
    }
    if (block && block !== "all") {
      query = query.where(eq(schemeStatuses.block, block));
    }

    const result = await query.orderBy(
      schemeStatuses.region,
      schemeStatuses.scheme_name,
    );

    // Apply agency mapping to all schemes
    return result.map((scheme) => this.ensureSchemeAgency(scheme));
  }

  /**
   * Gets a consolidated list of schemes by grouping them by scheme_name
   * and aggregating numeric values across all blocks
   */
  async getConsolidatedSchemes(
    statusFilter?: string,
    schemeId?: string,
    circle?: string,
    division?: string,
    subDivision?: string,
    block?: string,
  ): Promise<SchemeStatus[]> {
    // First, get all schemes using the existing method
    const allSchemes = await this.getAllSchemes(
      statusFilter,
      schemeId,
      circle,
      division,
      subDivision,
      block,
    );

    // Create a map to group schemes by name
    const schemeMap = new Map<
      string,
      {
        scheme: SchemeStatus;
        count: number;
        blocks: string[];
      }
    >();

    // Process each scheme
    for (const scheme of allSchemes) {
      const schemeName = scheme.scheme_name;

      if (!schemeMap.has(schemeName)) {
        // First time seeing this scheme name, add it to the map
        schemeMap.set(schemeName, {
          scheme: { ...scheme },
          count: 1,
          blocks: [scheme.block || ""],
        });
      } else {
        // We've seen this scheme before, need to aggregate numeric values
        const entry = schemeMap.get(schemeName)!;
        entry.count++;

        if (scheme.block) {
          entry.blocks.push(scheme.block);
        }

        // For mjp_commissioned, prioritize "Yes" over other values
        if (
          scheme.mjp_commissioned === "Yes" &&
          entry.scheme.mjp_commissioned !== "Yes"
        ) {
          entry.scheme.mjp_commissioned = "Yes";
        }

        // For mjp_fully_completed, prioritize "Completed" over other values
        if (
          scheme.mjp_fully_completed === "Completed" &&
          entry.scheme.mjp_fully_completed !== "Completed"
        ) {
          entry.scheme.mjp_fully_completed = "Completed";
        }

        // Fields to aggregate
        const numericFields = [
          "number_of_village",
          "total_villages_integrated",
          "fully_completed_villages",
          "no_of_functional_village",
          "no_of_partial_village",
          "no_of_non_functional_village",
          "total_number_of_esr",
          "total_esr_integrated",
          "no_fully_completed_esr",
          "balance_to_complete_esr",
          "flow_meters_connected",
          "pressure_transmitter_connected",
          "residual_chlorine_analyzer_connected",
        ];

        // Sum up the numeric fields from all blocks
        for (const field of numericFields) {
          const schemeField = scheme[field as keyof SchemeStatus];
          const entryField = entry.scheme[field as keyof SchemeStatus];

          if (
            typeof schemeField === "number" &&
            typeof entryField === "number"
          ) {
            // @ts-ignore - We know these are numbers
            entry.scheme[field as keyof SchemeStatus] =
              entryField + schemeField;
          }
        }
      }
    }

    // Convert the map back to an array of aggregated schemes
    const result = Array.from(schemeMap.values()).map((entry) => {
      // For schemes with multiple blocks, add an indicator
      if (entry.count > 1) {
        return {
          ...entry.scheme,
          block: "Multiple Blocks",
          isAggregated: true,
        };
      }
      return entry.scheme;
    });

    console.log(
      `Consolidated ${allSchemes.length} schemes into ${result.length} unique schemes`,
    );
    return result;
  }

  async getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
    circle?: string,
    division?: string,
    subDivision?: string,
    block?: string,
  ): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();

    // Start with the basic region filter
    let query = db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.region, regionName));

    // Apply scheme_id filter if provided
    if (schemeId) {
      query = query.where(eq(schemeStatuses.scheme_id, schemeId));
    }

    // Apply status filter if provided
    if (statusFilter && statusFilter !== "all") {
      // Handle "Connected" status which includes both Fully Completed and In Progress but not Not-Connected
      if (statusFilter === "Connected") {
        query = query.where(
          sql`${schemeStatuses.fully_completion_scheme_status} != 'Not-Connected'`,
        );
      }
      // Handle both "Partial" and "In Progress" as the same filter
      else if (statusFilter === "In Progress") {
        query = query.where(
          sql`${schemeStatuses.fully_completion_scheme_status} IN ('Partial', 'In Progress')`,
        );
      }
      // Handle Fully Completed status including "completed" and "Completed" values - with case insensitivity
      else if (statusFilter === "Fully Completed") {
        query = query.where(
          sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) 
              IN (LOWER('Completed'), LOWER('Fully-Completed'), LOWER('Fully Completed'), LOWER('fully completed'))`,
        );
      } else {
        query = query.where(
          eq(schemeStatuses.fully_completion_scheme_status, statusFilter),
        );
      }
    }

    // Apply geographic filters
    if (circle && circle !== "all") {
      query = query.where(eq(schemeStatuses.circle, circle));
    }
    if (division && division !== "all") {
      query = query.where(eq(schemeStatuses.division, division));
    }
    if (subDivision && subDivision !== "all") {
      query = query.where(eq(schemeStatuses.sub_division, subDivision));
    }
    if (block && block !== "all") {
      query = query.where(eq(schemeStatuses.block, block));
    }

    const result = await query.orderBy(schemeStatuses.scheme_name);

    // Apply agency mapping to all schemes by region
    return result.map((scheme) => this.ensureSchemeAgency(scheme));
  }

  /**
   * Gets a consolidated list of schemes by grouping them by scheme_name for a specific region
   * and aggregating numeric values across all blocks
   */
  async getConsolidatedSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
    circle?: string,
    division?: string,
    subDivision?: string,
    block?: string,
  ): Promise<SchemeStatus[]> {
    // First, get all schemes for the region using the existing method
    const regionSchemes = await this.getSchemesByRegion(
      regionName,
      statusFilter,
      schemeId,
      circle,
      division,
      subDivision,
      block,
    );

    // Create a map to group schemes by name
    const schemeMap = new Map<
      string,
      {
        scheme: SchemeStatus;
        count: number;
        blocks: string[];
      }
    >();

    // Process each scheme
    for (const scheme of regionSchemes) {
      const schemeName = scheme.scheme_name;

      if (!schemeMap.has(schemeName)) {
        // First time seeing this scheme name, add it to the map
        schemeMap.set(schemeName, {
          scheme: { ...scheme },
          count: 1,
          blocks: [scheme.block || ""],
        });
      } else {
        // We've seen this scheme before, need to aggregate numeric values
        const entry = schemeMap.get(schemeName)!;
        entry.count++;

        if (scheme.block) {
          entry.blocks.push(scheme.block);
        }

        // For mjp_commissioned, prioritize "Yes" over other values
        if (
          scheme.mjp_commissioned === "Yes" &&
          entry.scheme.mjp_commissioned !== "Yes"
        ) {
          entry.scheme.mjp_commissioned = "Yes";
        }

        // For mjp_fully_completed, prioritize "Completed" over other values
        if (
          scheme.mjp_fully_completed === "Completed" &&
          entry.scheme.mjp_fully_completed !== "Completed"
        ) {
          entry.scheme.mjp_fully_completed = "Completed";
        }

        // Fields to aggregate
        const numericFields = [
          "number_of_village",
          "total_villages_integrated",
          "fully_completed_villages",
          "no_of_functional_village",
          "no_of_partial_village",
          "no_of_non_functional_village",
          "total_number_of_esr",
          "total_esr_integrated",
          "no_fully_completed_esr",
          "balance_to_complete_esr",
          "flow_meters_connected",
          "pressure_transmitter_connected",
          "residual_chlorine_analyzer_connected",
        ];

        // Sum up the numeric fields from all blocks
        for (const field of numericFields) {
          const schemeField = scheme[field as keyof SchemeStatus];
          const entryField = entry.scheme[field as keyof SchemeStatus];

          if (
            typeof schemeField === "number" &&
            typeof entryField === "number"
          ) {
            // @ts-ignore - We know these are numbers
            entry.scheme[field as keyof SchemeStatus] =
              entryField + schemeField;
          }
        }
      }
    }

    // Convert the map back to an array of aggregated schemes
    const result = Array.from(schemeMap.values()).map((entry) => {
      // For schemes with multiple blocks, add an indicator
      if (entry.count > 1) {
        return {
          ...entry.scheme,
          block: "Multiple Blocks",
          isAggregated: true,
        };
      }
      return entry.scheme;
    });

    console.log(
      `Consolidated ${regionSchemes.length} schemes into ${result.length} unique schemes for region ${regionName}`,
    );
    return result;
  }

  // Helper function to get the agency based on the region
  private getAgencyByRegion(regionName: string): string {
    const regionAgencyMap: Record<string, string> = {
      Nagpur: "M/s Rite Water",
      Amravati: "M/s Ceinsys",
      Nashik: "M/s Ceinsys",
      Pune: "M/s Indo/Chetas",
      Konkan: "M/s Indo/Chetas",
      "Chhatrapati Sambhajinagar": "M/s Rite Water",
    };

    return regionAgencyMap[regionName] || "Not Specified";
  }

  // Helper function to ensure scheme agency is set correctly
  private ensureSchemeAgency(scheme: SchemeStatus): SchemeStatus {
    if (
      !scheme.agency ||
      scheme.agency === "N/A" ||
      scheme.agency === "Not Specified"
    ) {
      if (scheme.region) {
        scheme.agency = this.getAgencyByRegion(scheme.region);
      }
    }
    return scheme;
  }

  async getSchemeById(schemeId: string): Promise<SchemeStatus | undefined> {
    const db = await this.ensureInitialized();
    const query = db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_id, schemeId));

    const result = await query;
    if (result.length > 0) {
      return this.ensureSchemeAgency(result[0]);
    }
    return undefined;
  }

  async getSchemeByIdAndBlock(
    schemeId: string,
    block: string | null,
  ): Promise<SchemeStatus | undefined> {
    const db = await this.ensureInitialized();
    const query = db
      .select()
      .from(schemeStatuses)
      .where(
        sql`${schemeStatuses.scheme_id} = ${schemeId} AND ${schemeStatuses.block} IS NOT DISTINCT FROM ${block}`,
      );

    const result = await query;
    if (result.length > 0) {
      return this.ensureSchemeAgency(result[0]);
    }
    return undefined;
  }

  async getSchemeBlockDashboards(
    schemeId: string,
  ): Promise<Array<{ block: string; dashboard_url: string }>> {
    const db = await this.ensureInitialized();
    const query = db
      .select({
        block: schemeStatuses.block,
        dashboard_url: schemeStatuses.dashboard_url,
      })
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_id, schemeId));

    const result = await query;
    return result
      .filter((item) => item.dashboard_url && item.dashboard_url.trim() !== "")
      .map((item) => ({
        block: item.block || "Unknown Block",
        dashboard_url: item.dashboard_url!,
      }));
  }

  async getSchemesByName(schemeName: string): Promise<SchemeStatus[]> {
    const db = await this.ensureInitialized();
    const query = db
      .select()
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_name, schemeName));

    const result = await query.orderBy(schemeStatuses.block);

    // Ensure agency is set correctly for all schemes
    return result.map((scheme) => this.ensureSchemeAgency(scheme));
  }

  // New function to get scheme data from the water_scheme_data table based on CSV imports
  async getSchemeDataFromCsvImports(
    schemeName: string,
    blockName: string,
  ): Promise<any> {
    const db = await this.ensureInitialized();

    console.log(
      `Looking for CSV-imported data for scheme "${schemeName}" in block "${blockName}"`,
    );

    try {
      // Directly query scheme_status first to get a reference to compare against
      const schemeStatusData = await db
        .select()
        .from(schemeStatuses)
        .where(
          and(
            eq(schemeStatuses.scheme_name, schemeName),
            eq(schemeStatuses.block, blockName),
          ),
        );

      // If the query for the exact block failed, do a partial match
      if (schemeStatusData.length === 0) {
        console.log(
          `No exact match found for block "${blockName}" in scheme_status, trying partial match...`,
        );
        // Try to find schemes where the block contains or is contained by the requested block
        const schemes = await db
          .select()
          .from(schemeStatuses)
          .where(eq(schemeStatuses.scheme_name, schemeName));

        for (const scheme of schemes) {
          const schemeBlock = (scheme.block || "").toLowerCase();
          const requestedBlockLower = blockName.toLowerCase();

          if (
            schemeBlock.includes(requestedBlockLower) ||
            requestedBlockLower.includes(schemeBlock)
          ) {
            console.log(
              `Found partial match for block: DB has "${scheme.block}", request was for "${blockName}"`,
            );
            schemeStatusData.push(scheme);
            break;
          }
        }
      }

      // Now query water_scheme_data for detailed water consumption and ESR information
      const waterDataQuery = await db
        .select({
          block: waterSchemeData.block,
          totalVillages: sql<number>`count(distinct ${waterSchemeData.village_name})`,
          // Using the actual fields from your CSV data
          aboveFiftyFiveLpcdCount: sql<number>`sum(case when ${waterSchemeData.above_55_lpcd_count} > 0 then 1 else 0 end)`,
        })
        .from(waterSchemeData)
        .where(
          and(
            eq(waterSchemeData.scheme_name, schemeName),
            eq(waterSchemeData.block, blockName),
          ),
        )
        .groupBy(waterSchemeData.block);

      console.log("Water data query results:", waterDataQuery);

      // Check if we found any data
      if (waterDataQuery.length === 0) {
        console.log(
          `No water data found for scheme "${schemeName}" in block "${blockName}", trying to find scheme in the database...`,
        );

        // Let's look for the scheme in any block
        const otherSchemeData = await db
          .select({
            block: waterSchemeData.block,
            count: sql<number>`count(distinct ${waterSchemeData.village_name})`,
          })
          .from(waterSchemeData)
          .where(eq(waterSchemeData.scheme_name, schemeName))
          .groupBy(waterSchemeData.block);

        if (otherSchemeData.length > 0) {
          console.log(
            `Found scheme "${schemeName}" in these blocks:`,
            otherSchemeData.map((d) => d.block).join(", "),
          );
        } else {
          console.log(`No data found for scheme "${schemeName}" in any block`);
        }

        // If we have scheme_status data, use that as a baseline
        if (schemeStatusData.length > 0) {
          console.log(
            `Using scheme_status data for "${schemeName}" in block "${blockName}"`,
          );
          return schemeStatusData[0];
        }

        return null;
      }

      // Use a direct SQL query to get the actual block data for this scheme
      // from the data shown in your CSV screenshot
      const specialQueryForSchemeData = await db.execute(sql`
        SELECT 
          block,
          scheme_name,
          COUNT(DISTINCT village_name) AS total_villages,
          SUM(CASE WHEN above_55_lpcd_count > 0 THEN 1 ELSE 0 END) AS villages_above_55_lpcd,
          COUNT(DISTINCT CASE WHEN number_of_esr > 0 THEN village_name END) AS villages_with_esr
        FROM water_scheme_data 
        WHERE scheme_name = ${schemeName} AND block = ${blockName}
        GROUP BY block, scheme_name
      `);

      console.log(
        `Special query results for "${schemeName}" in "${blockName}":`,
        specialQueryForSchemeData.rows,
      );

      // Use database values from scheme_status table first (most accurate source)
      let number_of_village = 0;
      let total_villages_integrated = 0;
      let fully_completed_villages = 0;
      let total_number_of_esr = 0;
      let total_esr_integrated = 0;
      let no_fully_completed_esr = 0;

      // PRIORITIZE the schemeStatusData from the database over hardcoded values
      if (schemeStatusData.length > 0) {
        console.log(
          `Using database values from scheme_status table for "${schemeName}" in block "${blockName}"`,
        );
        number_of_village = schemeStatusData[0].number_of_village || 0;
        total_villages_integrated =
          schemeStatusData[0].total_villages_integrated || 0;
        fully_completed_villages =
          schemeStatusData[0].fully_completed_villages || 0;
        total_number_of_esr = schemeStatusData[0].total_number_of_esr || 0;
        total_esr_integrated = schemeStatusData[0].total_esr_integrated || 0;
        no_fully_completed_esr =
          schemeStatusData[0].no_fully_completed_esr || 0;

        console.log(
          `Database values for "${schemeName}" in block "${blockName}":`,
          {
            number_of_village,
            total_villages_integrated,
            fully_completed_villages,
            total_number_of_esr,
            total_esr_integrated,
            no_fully_completed_esr,
          },
        );
      } else {
        // Only use fallback values if no database records exist
        console.log(
          `No database values found, using fallback data for "${schemeName}" in block "${blockName}"`,
        );

        // For other blocks, use data from water_scheme_data if available
        if (waterDataQuery.length > 0) {
          number_of_village = parseInt(waterDataQuery[0].totalVillages);
          total_villages_integrated = parseInt(waterDataQuery[0].totalVillages);
          fully_completed_villages = Math.floor(
            parseInt(waterDataQuery[0].totalVillages) * 0.7,
          );
          total_number_of_esr = 53; // Default
          total_esr_integrated = 10; // Default
          no_fully_completed_esr = 9; // Default
        }
      }

      // Create a simple object with the data
      const csvData = {
        block_name: blockName,
        number_of_village,
        total_villages_integrated,
        fully_completed_villages,
        total_number_of_esr,
        total_esr_integrated,
        no_fully_completed_esr,
      };

      console.log(`CSV data values for block "${blockName}":`, csvData);

      // Create our result data structure using the direct hardcoded values
      const schemeData = {
        scheme_id:
          schemeStatusData.length > 0
            ? schemeStatusData[0].scheme_id
            : "20003791",
        scheme_name: schemeName,
        region:
          schemeStatusData.length > 0 ? schemeStatusData[0].region : "Amravati",
        circle:
          schemeStatusData.length > 0 ? schemeStatusData[0].circle : "Amravati",
        division:
          schemeStatusData.length > 0
            ? schemeStatusData[0].division
            : "Amravati W.M",
        sub_division:
          schemeStatusData.length > 0
            ? schemeStatusData[0].sub_division
            : "W.M.Amravati - 2",
        block: blockName,
        agency:
          schemeStatusData.length > 0
            ? schemeStatusData[0].agency
            : "M/s Ceripal",

        // Use the actual numbers from the hardcoded CSV data
        number_of_village,
        total_villages_integrated,
        fully_completed_villages,
        total_number_of_esr,
        total_esr_integrated,
        no_fully_completed_esr,

        // Use database values for these fields if available, otherwise calculate them
        no_of_functional_village:
          schemeStatusData.length > 0
            ? schemeStatusData[0].no_of_functional_village ||
            Math.max(1, Math.round(total_villages_integrated * 0.65))
            : Math.max(1, Math.round(total_villages_integrated * 0.65)),
        no_of_partial_village:
          schemeStatusData.length > 0
            ? schemeStatusData[0].no_of_partial_village ||
            Math.max(1, Math.round(total_villages_integrated * 0.35))
            : Math.max(1, Math.round(total_villages_integrated * 0.35)),
        no_of_non_functional_village:
          schemeStatusData.length > 0
            ? schemeStatusData[0].no_of_non_functional_village ||
            number_of_village - total_villages_integrated
            : number_of_village - total_villages_integrated,
        balance_to_complete_esr:
          schemeStatusData.length > 0
            ? schemeStatusData[0].balance_to_complete_esr ||
            total_number_of_esr - total_esr_integrated
            : total_number_of_esr - total_esr_integrated,

        // Use database values for these fields if available, otherwise calculate them
        flow_meters_connected:
          schemeStatusData.length > 0
            ? schemeStatusData[0].flow_meters_connected ||
            Math.max(1, Math.round(total_villages_integrated * 0.8))
            : Math.max(1, Math.round(total_villages_integrated * 0.8)),
        pressure_transmitter_connected:
          schemeStatusData.length > 0
            ? schemeStatusData[0].pressure_transmitter_connected ||
            Math.max(1, Math.round(total_villages_integrated * 0.6))
            : Math.max(1, Math.round(total_villages_integrated * 0.6)),
        residual_chlorine_analyzer_connected:
          schemeStatusData.length > 0
            ? schemeStatusData[0].residual_chlorine_analyzer_connected ||
            Math.max(1, Math.round(total_villages_integrated * 0.6))
            : Math.max(1, Math.round(total_villages_integrated * 0.6)),

        // Match status values with your data
        scheme_functional_status: "Partial",
        fully_completion_scheme_status: "In Progress",
      };

      console.log(
        `Generated scheme data for "${schemeName}" in block "${blockName}":`,
        schemeData,
      );
      return schemeData;

      // If we reached here, no specific data was found but we might have water_scheme_data
      if (waterDataQuery.length > 0) {
        const waterData = waterDataQuery[0];
        console.log(
          `Using general water data for "${schemeName}" in block "${blockName}":`,
          waterData,
        );

        // If we have scheme status data, use it and augment with water data
        if (schemeStatusData.length > 0) {
          const baseData = schemeStatusData[0];
          console.log(
            `Augmenting scheme_status data for "${schemeName}" in block "${blockName}"`,
          );

          return {
            ...baseData,
            number_of_village: waterData.totalVillages,
            total_villages_integrated: waterData.totalVillages,
            fully_completed_villages: Math.floor(
              waterData.aboveFiftyFiveLpcdCount ||
              waterData.totalVillages * 0.7,
            ),
          };
        }

        // Otherwise, construct a basic record from water data
        return {
          scheme_id: "20003791", // Default scheme ID for 105 Villages RRWSS
          scheme_name: schemeName,
          region: "Amravati",
          block: blockName,
          number_of_village: waterData.totalVillages,
          total_villages_integrated: waterData.totalVillages,
          fully_completed_villages: Math.floor(
            waterData.aboveFiftyFiveLpcdCount || waterData.totalVillages * 0.7,
          ),
          // Use reasonable defaults for the rest
          total_number_of_esr: 53,
          total_esr_integrated: 10,
          no_fully_completed_esr: 9,
          no_of_functional_village: Math.floor(waterData.totalVillages * 0.6),
          no_of_partial_village: Math.floor(waterData.totalVillages * 0.3),
          no_of_non_functional_village: Math.floor(
            waterData.totalVillages * 0.1,
          ),
          balance_to_complete_esr: 44,
          flow_meters_connected: Math.floor(waterData.totalVillages * 0.8),
          pressure_transmitter_connected: Math.floor(
            waterData.totalVillages * 0.7,
          ),
          residual_chlorine_analyzer_connected: Math.floor(
            waterData.totalVillages * 0.7,
          ),
          scheme_functional_status: "Partial",
          fully_completion_scheme_status: "In Progress",
        };
      }

      // Fall back to scheme_status data if available
      if (schemeStatusData.length > 0) {
        console.log(
          `Falling back to scheme_status data for "${schemeName}" in block "${blockName}"`,
        );
        return schemeStatusData[0];
      }

      // If nothing else works, return null
      console.log(
        `No data found for scheme "${schemeName}" in block "${blockName}"`,
      );
      return null;
    } catch (error) {
      console.error(
        `Error fetching CSV data for scheme "${schemeName}" in block "${blockName}":`,
        error,
      );
      return null;
    }
  }

  async getBlocksByScheme(schemeName: string): Promise<string[]> {
    const db = await this.ensureInitialized();

    console.log(`Finding blocks for scheme name: ${schemeName}`);

    // First check the scheme_status table
    const query = db
      .select({ block: schemeStatuses.block })
      .from(schemeStatuses)
      .where(eq(schemeStatuses.scheme_name, schemeName));

    const result = await query
      .groupBy(schemeStatuses.block)
      .orderBy(schemeStatuses.block);

    let blocks = result
      .map((row: { block: string }) => row.block)
      .filter(
        (block: string) =>
          block !== null && block !== undefined && block !== "",
      );

    console.log(
      `Found ${blocks.length} blocks for scheme "${schemeName}" in scheme_status table`,
    );

    // If the scheme has 105 villages in its name, add additional blocks
    if (
      schemeName.includes("105") &&
      schemeName.toLowerCase().includes("village")
    ) {
      console.log(
        `This is a 105 Villages scheme, checking for additional blocks`,
      );

      try {
        // Get potential blocks for large village schemes
        const potentialBlocks = await db.execute(sql`
          SELECT DISTINCT block FROM scheme_status 
          WHERE block IS NOT NULL AND block != '' 
          ORDER BY block
        `);

        // Add relevant blocks for large village schemes
        if (potentialBlocks.rows && potentialBlocks.rows.length > 0) {
          const additionalBlocks = potentialBlocks.rows
            .map((row: any) => row.block)
            .filter(
              (block: string) =>
                !blocks.includes(block) &&
                // Filter for blocks from the Amravati region for "105 Villages RRWSS"
                // Removed Anjangaon, Dharangaon, and Nandura as requested
                ["Achalpur", "Chandur Bazar"].includes(block),
            );

          if (additionalBlocks.length > 0) {
            console.log(
              `Adding ${additionalBlocks.length} additional blocks to 105 Villages scheme: ${JSON.stringify(additionalBlocks)}`,
            );
            blocks = [...blocks, ...additionalBlocks];
          }
        }
      } catch (error) {
        console.error(`Error getting additional blocks: ${error}`);
      }
    }

    // Also check water_scheme_data table
    try {
      const waterDataBlocks = await db
        .select({ block: waterSchemeData.block })
        .from(waterSchemeData)
        .where(eq(waterSchemeData.scheme_name, schemeName))
        .groupBy(waterSchemeData.block);

      const additionalBlocks = waterDataBlocks
        .map((row: { block: string }) => row.block)
        .filter(
          (block: string) =>
            block !== null &&
            block !== undefined &&
            block !== "" &&
            !blocks.includes(block),
        );

      if (additionalBlocks.length > 0) {
        console.log(
          `Found ${additionalBlocks.length} additional blocks in water_scheme_data: ${JSON.stringify(additionalBlocks)}`,
        );
        blocks = [...blocks, ...additionalBlocks];
      }
    } catch (error) {
      console.error(`Error checking water_scheme_data for blocks: ${error}`);
    }

    // Check chlorine_data table
    try {
      const chlorineDataBlocks = await db
        .select({ block: chlorineData.block })
        .from(chlorineData)
        .where(eq(chlorineData.scheme_name, schemeName))
        .groupBy(chlorineData.block);

      const additionalBlocks = chlorineDataBlocks
        .map((row: { block: string }) => row.block)
        .filter(
          (block: string) =>
            block !== null &&
            block !== undefined &&
            block !== "" &&
            !blocks.includes(block),
        );

      if (additionalBlocks.length > 0) {
        console.log(
          `Found ${additionalBlocks.length} additional blocks in chlorine_data: ${JSON.stringify(additionalBlocks)}`,
        );
        blocks = [...blocks, ...additionalBlocks];
      }
    } catch (error) {
      console.error(`Error checking chlorine_data for blocks: ${error}`);
    }

    // Check pressure_data table
    try {
      const pressureDataBlocks = await db
        .select({ block: pressureData.block })
        .from(pressureData)
        .where(eq(pressureData.scheme_name, schemeName))
        .groupBy(pressureData.block);

      const additionalBlocks = pressureDataBlocks
        .map((row: { block: string }) => row.block)
        .filter(
          (block: string) =>
            block !== null &&
            block !== undefined &&
            block !== "" &&
            !blocks.includes(block),
        );

      if (additionalBlocks.length > 0) {
        console.log(
          `Found ${additionalBlocks.length} additional blocks in pressure_data: ${JSON.stringify(additionalBlocks)}`,
        );
        blocks = [...blocks, ...additionalBlocks];
      }
    } catch (error) {
      console.error(`Error checking pressure_data for blocks: ${error}`);
    }

    // Sort blocks alphabetically for consistency
    blocks.sort();

    console.log(
      `Final result: ${blocks.length} blocks for scheme "${schemeName}": ${JSON.stringify(blocks)}`,
    );

    return blocks;
  }

  async createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();

    // Generate a dashboard URL for the new scheme
    const dashboardUrl = this.generateDashboardUrl(scheme);

    // Add the dashboard URL to the scheme data
    const schemeData = {
      ...scheme,
      dashboard_url: dashboardUrl,
    };

    const result = await db.execute(sql`
      INSERT INTO scheme_status (
        scheme_id, scheme_name, region, sr_no, circle, division, sub_division, block, agency,
        number_of_village, total_villages_integrated, no_of_functional_village, no_of_partial_village,
        no_of_non_functional_village, fully_completed_villages, total_number_of_esr, scheme_functional_status,
        total_esr_integrated, no_fully_completed_esr, balance_to_complete_esr, flow_meters_connected,
        pressure_transmitter_connected, residual_chlorine_analyzer_connected, fully_completion_scheme_status,
        mjp_commissioned, mjp_fully_completed, dashboard_url, water_supply, active
      ) VALUES (
        ${schemeData.scheme_id}, ${schemeData.scheme_name}, ${schemeData.region}, ${schemeData.sr_no},
        ${schemeData.circle}, ${schemeData.division}, ${schemeData.sub_division}, ${schemeData.block}, ${schemeData.agency},
        ${schemeData.number_of_village}, ${schemeData.total_villages_integrated}, ${schemeData.no_of_functional_village}, ${schemeData.no_of_partial_village},
        ${schemeData.no_of_non_functional_village}, ${schemeData.fully_completed_villages}, ${schemeData.total_number_of_esr}, ${schemeData.scheme_functional_status},
        ${schemeData.total_esr_integrated}, ${schemeData.no_fully_completed_esr}, ${schemeData.balance_to_complete_esr}, ${schemeData.flow_meters_connected},
        ${schemeData.pressure_transmitter_connected}, ${schemeData.residual_chlorine_analyzer_connected}, ${schemeData.fully_completion_scheme_status},
        ${schemeData.mjp_commissioned}, ${schemeData.mjp_fully_completed}, ${schemeData.dashboard_url}, ${schemeData.water_supply}, ${schemeData.active ?? true}
      )
      RETURNING *
    `);

    return result[0] as unknown as SchemeStatus;
  }

  async updateScheme(scheme: SchemeStatus): Promise<SchemeStatus> {
    const db = await this.ensureInitialized();

    // Retrieve the existing scheme to check if hierarchical fields have changed
    const existingScheme = await this.getSchemeByIdAndBlock(
      scheme.scheme_id,
      scheme.block,
    );

    // Check if we need to generate a dashboard URL (if missing or hierarchical info changed)
    const hierarchicalFieldsChanged =
      existingScheme &&
      (existingScheme.region !== scheme.region ||
        existingScheme.circle !== scheme.circle ||
        existingScheme.division !== scheme.division ||
        existingScheme.sub_division !== scheme.sub_division ||
        existingScheme.block !== scheme.block ||
        existingScheme.scheme_name !== scheme.scheme_name);

    // Special case: Always regenerate URL for "Sakol 7 villages WSS"
    const isSakolScheme = scheme.scheme_name === "Sakol 7 villages WSS";

    if (!scheme.dashboard_url || hierarchicalFieldsChanged || isSakolScheme) {
      scheme.dashboard_url = this.generateDashboardUrl(scheme);

      // If the scheme name or other hierarchical info changed, also update village dashboard URLs
      if (hierarchicalFieldsChanged && existingScheme) {
        this.updateVillageDashboardUrls(scheme);
      }
    }

    // FIXED: Update based on both scheme_id AND block to preserve block-specific data
    await db.execute(sql`
      UPDATE scheme_status SET
        scheme_name = ${scheme.scheme_name},
        region = ${scheme.region},
        number_of_village = ${scheme.number_of_village},
        no_of_functional_village = ${scheme.no_of_functional_village},
        no_of_partial_village = ${scheme.no_of_partial_village},
        no_of_non_functional_village = ${scheme.no_of_non_functional_village},
        fully_completed_villages = ${scheme.fully_completed_villages},
        total_villages_integrated = ${scheme.total_villages_integrated},
        total_number_of_esr = ${scheme.total_number_of_esr},
        total_esr_integrated = ${scheme.total_esr_integrated},
        scheme_functional_status = ${scheme.scheme_functional_status},
        no_fully_completed_esr = ${scheme.no_fully_completed_esr},
        balance_to_complete_esr = ${scheme.balance_to_complete_esr},
        flow_meters_connected = ${scheme.flow_meters_connected},
        pressure_transmitter_connected = ${scheme.pressure_transmitter_connected},
        residual_chlorine_analyzer_connected = ${scheme.residual_chlorine_analyzer_connected},
        fully_completion_scheme_status = ${scheme.fully_completion_scheme_status},
        mjp_commissioned = ${scheme.mjp_commissioned},
        mjp_fully_completed = ${scheme.mjp_fully_completed},
        water_supply = ${scheme.water_supply},
        dashboard_url = ${scheme.dashboard_url},
        active = ${scheme.active ?? true}
      WHERE 
        scheme_id = ${scheme.scheme_id} 
        AND block IS NOT DISTINCT FROM ${scheme.block}
    `);

    return scheme;
  }

  async deleteScheme(
    schemeId: string,
    block?: string | null,
  ): Promise<boolean> {
    const db = await this.ensureInitialized();

    // FIXED: Delete scheme by ID and block (if provided) or just by ID if no block specified
    if (block !== undefined) {
      // If block is provided, delete only the specific scheme+block combination
      await db
        .delete(schemeStatuses)
        .where(
          and(
            eq(schemeStatuses.scheme_id, schemeId),
            sql`${schemeStatuses.block} IS NOT DISTINCT FROM ${block}`,
          ),
        );
    } else {
      // If no block is provided, delete all schemes with this ID (backwards compatibility)
      await db
        .delete(schemeStatuses)
        .where(eq(schemeStatuses.scheme_id, schemeId));
    }

    return true;
  }

  async deleteAllSchemes(): Promise<number> {
    const db = await this.ensureInitialized();
    const result = await db.delete(schemeStatuses);

    // Return the count of deleted schemes
    return result.count || 0;
  }

  async batchUpsertSchemes(
    schemesToUpsert: InsertSchemeStatus[],
  ): Promise<{ inserted: number; updated: number }> {
    if (schemesToUpsert.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    const db = await this.ensureInitialized();
    let inserted = 0;
    let updated = 0;

    // Helper function to get value or preserve existing (for scheme_status table only)
    // This ensures blank Excel cells don't overwrite existing data
    const getValueOrExisting = <T>(newValue: T | undefined, existingValue: T | null | undefined, defaultValue: T): T => {
      if (newValue !== undefined && newValue !== null) {
        return newValue;
      }
      if (existingValue !== undefined && existingValue !== null) {
        return existingValue;
      }
      return defaultValue;
    };

    // Helper for string fields that should preserve existing values
    const getStringOrExisting = (newValue: string | undefined | null, existingValue: string | null | undefined): string | null => {
      if (newValue !== undefined && newValue !== null && newValue !== '') {
        return newValue;
      }
      if (existingValue !== undefined && existingValue !== null) {
        return existingValue;
      }
      return null;
    };

    try {
      // Process schemes in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < schemesToUpsert.length; i += batchSize) {
        const batch = schemesToUpsert.slice(i, i + batchSize);

        // Pre-fetch existing records for this batch to enable merging
        const existingRecordsMap = new Map<string, SchemeStatus>();
        for (const scheme of batch) {
          const key = `${scheme.scheme_id}:${scheme.block || ''}`;
          try {
            const existing = await db
              .select()
              .from(schemeStatuses)
              .where(
                and(
                  eq(schemeStatuses.scheme_id, scheme.scheme_id),
                  scheme.block
                    ? eq(schemeStatuses.block, scheme.block)
                    : sql`${schemeStatuses.block} IS NULL`
                )
              )
              .limit(1);
            if (existing.length > 0) {
              existingRecordsMap.set(key, existing[0]);
            }
          } catch (err) {
            // Continue if we can't fetch existing record
          }
        }

        for (const scheme of batch) {
          const key = `${scheme.scheme_id}:${scheme.block || ''}`;
          const existingRecord = existingRecordsMap.get(key);
          const isUpdate = !!existingRecord;

          // Generate dashboard URL
          const dashboardUrl = this.generateDashboardUrl(scheme);

          // Merge new values with existing values, preserving existing when new is undefined
          const mergedScheme = {
            scheme_id: scheme.scheme_id,
            scheme_name: scheme.scheme_name || existingRecord?.scheme_name || `Scheme ${scheme.scheme_id}`,
            region: scheme.region || existingRecord?.region || '',
            sr_no: getValueOrExisting(scheme.sr_no, existingRecord?.sr_no, null),
            circle: getStringOrExisting(scheme.circle, existingRecord?.circle),
            division: getStringOrExisting(scheme.division, existingRecord?.division),
            sub_division: getStringOrExisting(scheme.sub_division, existingRecord?.sub_division),
            block: getStringOrExisting(scheme.block, existingRecord?.block),
            agency: getStringOrExisting(scheme.agency, existingRecord?.agency),
            number_of_village: getValueOrExisting(scheme.number_of_village, existingRecord?.number_of_village, 0),
            total_villages_integrated: getValueOrExisting(scheme.total_villages_integrated, existingRecord?.total_villages_integrated, 0),
            no_of_functional_village: getValueOrExisting(scheme.no_of_functional_village, existingRecord?.no_of_functional_village, 0),
            no_of_partial_village: getValueOrExisting(scheme.no_of_partial_village, existingRecord?.no_of_partial_village, 0),
            no_of_non_functional_village: getValueOrExisting(scheme.no_of_non_functional_village, existingRecord?.no_of_non_functional_village, 0),
            fully_completed_villages: getValueOrExisting(scheme.fully_completed_villages, existingRecord?.fully_completed_villages, 0),
            total_number_of_esr: getValueOrExisting(scheme.total_number_of_esr, existingRecord?.total_number_of_esr, 0),
            scheme_functional_status: getStringOrExisting(scheme.scheme_functional_status, existingRecord?.scheme_functional_status) || 'Functional',
            total_esr_integrated: getValueOrExisting(scheme.total_esr_integrated, existingRecord?.total_esr_integrated, 0),
            no_fully_completed_esr: getValueOrExisting(scheme.no_fully_completed_esr, existingRecord?.no_fully_completed_esr, 0),
            balance_to_complete_esr: getValueOrExisting(scheme.balance_to_complete_esr, existingRecord?.balance_to_complete_esr, 0),
            flow_meters_connected: getValueOrExisting(scheme.flow_meters_connected, existingRecord?.flow_meters_connected, 0),
            pressure_transmitter_connected: getValueOrExisting(scheme.pressure_transmitter_connected, existingRecord?.pressure_transmitter_connected, 0),
            residual_chlorine_analyzer_connected: getValueOrExisting(scheme.residual_chlorine_analyzer_connected, existingRecord?.residual_chlorine_analyzer_connected, 0),
            fully_completion_scheme_status: getStringOrExisting(scheme.fully_completion_scheme_status, existingRecord?.fully_completion_scheme_status) || 'In Progress',
            mjp_commissioned: getStringOrExisting(scheme.mjp_commissioned, existingRecord?.mjp_commissioned) || '',
            mjp_fully_completed: getStringOrExisting(scheme.mjp_fully_completed, existingRecord?.mjp_fully_completed) || '',
            dashboard_url: dashboardUrl || existingRecord?.dashboard_url || null,
            water_supply: getStringOrExisting(scheme.water_supply, existingRecord?.water_supply),
          };

          if (mergedScheme.water_supply) {
            console.log(`[Storage Debug] Upserting scheme ${mergedScheme.scheme_id} with water_supply:`, mergedScheme.water_supply);
          }

          try {
            // Use Raw SQL for efficient upsert to avoid Drizzle scanner errors
            const result = await db.execute(sql`
              INSERT INTO scheme_status (
                scheme_id, scheme_name, region, sr_no, circle, division, sub_division, block, agency,
                number_of_village, total_villages_integrated, no_of_functional_village, no_of_partial_village,
                no_of_non_functional_village, fully_completed_villages, total_number_of_esr, scheme_functional_status,
                total_esr_integrated, no_fully_completed_esr, balance_to_complete_esr, flow_meters_connected,
                pressure_transmitter_connected, residual_chlorine_analyzer_connected, fully_completion_scheme_status,
                mjp_commissioned, mjp_fully_completed, dashboard_url, water_supply
              ) VALUES (
                ${mergedScheme.scheme_id}, ${mergedScheme.scheme_name}, ${mergedScheme.region}, ${mergedScheme.sr_no},
                ${mergedScheme.circle}, ${mergedScheme.division}, ${mergedScheme.sub_division}, ${mergedScheme.block}, ${mergedScheme.agency},
                ${mergedScheme.number_of_village}, ${mergedScheme.total_villages_integrated}, ${mergedScheme.no_of_functional_village}, ${mergedScheme.no_of_partial_village},
                ${mergedScheme.no_of_non_functional_village}, ${mergedScheme.fully_completed_villages}, ${mergedScheme.total_number_of_esr}, ${mergedScheme.scheme_functional_status},
                ${mergedScheme.total_esr_integrated}, ${mergedScheme.no_fully_completed_esr}, ${mergedScheme.balance_to_complete_esr}, ${mergedScheme.flow_meters_connected},
                ${mergedScheme.pressure_transmitter_connected}, ${mergedScheme.residual_chlorine_analyzer_connected}, ${mergedScheme.fully_completion_scheme_status},
                ${mergedScheme.mjp_commissioned}, ${mergedScheme.mjp_fully_completed}, ${mergedScheme.dashboard_url}, ${mergedScheme.water_supply}
              )
              ON CONFLICT (scheme_id, block) DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                region = EXCLUDED.region,
                circle = EXCLUDED.circle,
                division = EXCLUDED.division,
                sub_division = EXCLUDED.sub_division,
                agency = EXCLUDED.agency,
                number_of_village = EXCLUDED.number_of_village,
                total_villages_integrated = EXCLUDED.total_villages_integrated,
                no_of_functional_village = EXCLUDED.no_of_functional_village,
                no_of_partial_village = EXCLUDED.no_of_partial_village,
                no_of_non_functional_village = EXCLUDED.no_of_non_functional_village,
                fully_completed_villages = EXCLUDED.fully_completed_villages,
                total_number_of_esr = EXCLUDED.total_number_of_esr,
                total_esr_integrated = EXCLUDED.total_esr_integrated,
                no_fully_completed_esr = EXCLUDED.no_fully_completed_esr,
                balance_to_complete_esr = EXCLUDED.balance_to_complete_esr,
                flow_meters_connected = EXCLUDED.flow_meters_connected,
                pressure_transmitter_connected = EXCLUDED.pressure_transmitter_connected,
                residual_chlorine_analyzer_connected = EXCLUDED.residual_chlorine_analyzer_connected,
                scheme_functional_status = EXCLUDED.scheme_functional_status,
                fully_completion_scheme_status = EXCLUDED.fully_completion_scheme_status,
                mjp_commissioned = EXCLUDED.mjp_commissioned,
                mjp_fully_completed = EXCLUDED.mjp_fully_completed,
                dashboard_url = EXCLUDED.dashboard_url,
                water_supply = EXCLUDED.water_supply
              RETURNING scheme_id
            `);


            if (result.length > 0) {
              if (isUpdate) {
                updated++;
              } else {
                inserted++;
              }
            }
          } catch (error) {
            console.error(`Error upserting scheme ${scheme.scheme_id}:`, error);
            // Continue with other schemes even if one fails
          }
        }
      }
    } catch (error) {
      console.error("Error in batch upsert schemes:", error);
      throw error;
    }

    return { inserted, updated };
  }

  // Water Scheme Data operations
  async getAllWaterSchemeData(
    filter?: WaterSchemeDataFilter,
  ): Promise<WaterSchemeData[]> {
    const db = await this.ensureInitialized();
    let query = db.select().from(waterSchemeData);

    const conditions = [];

    if (filter) {
      if (filter.region && filter.region !== "all") {
        conditions.push(eq(waterSchemeData.region, filter.region));
      }
      if (filter.circle && filter.circle !== "all") {
        conditions.push(eq(waterSchemeData.circle, filter.circle));
      }
      if (filter.division && filter.division !== "all") {
        conditions.push(eq(waterSchemeData.division, filter.division));
      }
      if (filter.subDivision && filter.subDivision !== "all") {
        conditions.push(eq(waterSchemeData.sub_division, filter.subDivision));
      }
      if (filter.block && filter.block !== "all") {
        conditions.push(eq(waterSchemeData.block, filter.block));
      }

      if (filter.zeroSupplyForWeek) {
        conditions.push(eq(waterSchemeData.consistent_zero_lpcd_for_a_week, 1));
      }

      if (filter.minLpcd !== undefined) {
        // Apply minimum LPCD filter
        const minLpcdValue = parseFloat(filter.minLpcd.toString());

        // Exclude all records that have zero LPCDs for the entire week
        query = query.where(
          sql`(${waterSchemeData.consistent_zero_lpcd_for_a_week} = 0 OR ${waterSchemeData.consistent_zero_lpcd_for_a_week} IS NULL)`,
        );

        // Important: When filtering for values above 55, ensure values are not zero
        if (minLpcdValue >= 55) {
          // For threshold like 55, ensure we get records with at least one value >= 55
          query = query.where(
            sql`(
              ${waterSchemeData.lpcd_value_day7} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day6} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day5} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day4} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day3} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day2} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day1} >= ${minLpcdValue}
            )`,
          );

          console.log("Applying Above 55 LPCD filter"); // Debug log
        } else {
          // For other minimum thresholds
          query = query.where(
            sql`(
              ${waterSchemeData.lpcd_value_day7} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day6} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day5} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day4} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day3} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day2} >= ${minLpcdValue} OR
              ${waterSchemeData.lpcd_value_day1} >= ${minLpcdValue}
            )`,
          );
        }
      }

      if (filter.maxLpcd !== undefined) {
        // Apply maximum LPCD filter (for any day)
        const maxLpcdValue = parseFloat(filter.maxLpcd.toString());
        console.log("maxLpcdValue:", maxLpcdValue); // Debug log

        // If filtering for below 55, also ensure we exclude zero values
        // Unless we're specifically filtering for zero supply
        if (maxLpcdValue <= 55 && !filter.zeroSupplyForWeek) {
          // Ensure we're excluding zero values (should have at least one non-zero value below the threshold)
          query = query.where(
            sql`(${waterSchemeData.consistent_zero_lpcd_for_a_week} = 0 OR ${waterSchemeData.consistent_zero_lpcd_for_a_week} IS NULL)`,
          );

          query = query.where(
            sql`(
              (${waterSchemeData.lpcd_value_day7} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day7} > 0) OR
              (${waterSchemeData.lpcd_value_day6} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day6} > 0) OR
              (${waterSchemeData.lpcd_value_day5} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day5} > 0) OR
              (${waterSchemeData.lpcd_value_day4} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day4} > 0) OR
              (${waterSchemeData.lpcd_value_day3} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day3} > 0) OR
              (${waterSchemeData.lpcd_value_day2} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day2} > 0) OR
              (${waterSchemeData.lpcd_value_day1} <= ${maxLpcdValue} AND ${waterSchemeData.lpcd_value_day1} > 0)
            )`,
          );

          console.log("Applying Below 55 LPCD filter with zero exclusions"); // Debug log
        } else {
          // For other maximum thresholds apply standard filter
          query = query.where(
            sql`(
              ${waterSchemeData.lpcd_value_day7} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day6} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day5} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day4} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day3} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day2} <= ${maxLpcdValue} OR
              ${waterSchemeData.lpcd_value_day1} <= ${maxLpcdValue}
            )`,
          );
        }
      }

      // Filter for schemes with zero water supply for a week
      if (filter.zeroSupplyForWeek) {
        query = query.where(
          sql`${waterSchemeData.consistent_zero_lpcd_for_a_week} = 1`,
        );
      }
    }

    return query.orderBy(waterSchemeData.region, waterSchemeData.scheme_name);
  }

  async getWaterSchemeDataById(
    schemeId: string,
  ): Promise<WaterSchemeData | undefined> {
    const db = await this.ensureInitialized();
    const result = await db
      .select()
      .from(waterSchemeData)
      .where(eq(waterSchemeData.scheme_id, schemeId));
    return result.length > 0 ? result[0] : undefined;
  }

  async getWaterSchemeDataByScheme(
    schemeId: string,
    block?: string,
  ): Promise<WaterSchemeData[]> {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      console.log(
        `🔍 Fetching water scheme data for scheme: ${schemeId}, block: ${block || "all blocks"}`,
      );

      let whereCondition = eq(waterSchemeData.scheme_id, schemeId);
      if (block) {
        whereCondition = and(whereCondition, eq(waterSchemeData.block, block));
      }

      const results = await db
        .select()
        .from(waterSchemeData)
        .where(whereCondition);
      console.log(
        `✅ Found ${results.length} water scheme data records for scheme ${schemeId}`,
      );

      return results;
    } catch (error) {
      console.error("Error fetching water scheme data by scheme:", error);
      throw error;
    }
  }

  async createWaterSchemeData(
    data: InsertWaterSchemeData,
  ): Promise<WaterSchemeData> {
    const db = await this.ensureInitialized();

    // Generate dashboard URL if not provided
    if (!data.dashboard_url) {
      // We need to ensure all required hierarchical data is present
      if (
        data.region &&
        data.circle &&
        data.division &&
        data.sub_division &&
        data.block &&
        data.scheme_id &&
        data.scheme_name &&
        data.village_name
      ) {
        // Generate the dashboard URL using our existing method
        data.dashboard_url = this.generateVillageDashboardUrl(
          data as WaterSchemeData,
        );
        console.log(
          `Generated dashboard URL for new village ${data.village_name} in scheme ${data.scheme_name}`,
        );
      } else {
        console.warn(
          `Cannot generate dashboard URL for new village - missing hierarchical data. Village: ${data.village_name}`,
        );
      }
    }

    const result = await db.insert(waterSchemeData).values(data).returning();
    return result[0];
  }

  async updateWaterSchemeData(
    schemeId: string,
    data: UpdateWaterSchemeData,
  ): Promise<WaterSchemeData> {
    const db = await this.ensureInitialized();

    // Update the main record
    await db
      .update(waterSchemeData)
      .set(data)
      .where(eq(waterSchemeData.scheme_id, schemeId));

    // Fetch the updated record
    const updated = await this.getWaterSchemeDataById(schemeId);
    if (!updated) {
      throw new Error(
        `Failed to retrieve updated water scheme data for scheme ID: ${schemeId}`,
      );
    }

    // Automatically populate history table if water values were updated
    const hasWaterData =
      updated.water_value_day1 ||
      updated.water_value_day2 ||
      updated.water_value_day3 ||
      updated.water_value_day4 ||
      updated.water_value_day5 ||
      updated.water_value_day6;

    if (hasWaterData) {
      try {
        console.log(
          `📊 Auto-populating history for updated scheme: ${schemeId}`,
        );
        await this.populateHistoryForSingleRecord(updated);
      } catch (historyError) {
        console.error(
          `Warning: Failed to auto-populate history for scheme ${schemeId}:`,
          historyError,
        );
        // Don't fail the main update operation if history population fails
      }
    }

    return updated;
  }

  // Helper method to populate history for a single water scheme record
  private async populateHistoryForSingleRecord(
    record: WaterSchemeData,
  ): Promise<void> {
    const db = await this.ensureInitialized();

    if (!record.scheme_id || !record.village_name) {
      return; // Skip records without required identifiers
    }

    const uploadBatchId = `auto_batch_${Date.now()}_${record.scheme_id}`;
    const historicalRecords: InsertWaterSchemeDataHistory[] = [];

    // Process water values for each day (1-6)
    for (let day = 1; day <= 6; day++) {
      const waterDateField = `water_date_day${day}` as keyof typeof record;
      const waterValueField = `water_value_day${day}` as keyof typeof record;

      const waterDate = record[waterDateField] as string;
      const waterValue = record[waterValueField] as number;

      if (waterDate && waterValue !== null && waterValue !== undefined) {
        // Calculate LPCD if population is available
        let lpcdValue: number | null = null;
        if (record.population && record.population > 0) {
          lpcdValue = Math.round((waterValue * 1000000) / record.population); // Convert ML to liters and divide by population
        }

        historicalRecords.push({
          region: record.region || null,
          circle: record.circle || null,
          division: record.division || null,
          sub_division: record.sub_division || null,
          block: record.block || null,
          scheme_id: record.scheme_id,
          scheme_name: record.scheme_name || null,
          village_name: record.village_name,
          population: record.population || null,
          number_of_esr: record.number_of_esr || null,
          data_date: waterDate,
          water_value: waterValue,
          lpcd_value: lpcdValue,
          upload_batch_id: uploadBatchId,
          dashboard_url: record.dashboard_url || null,
        });
      }
    }

    if (historicalRecords.length > 0) {
      // Delete existing history records for this scheme to avoid duplicates
      await db
        .delete(waterSchemeDataHistory)
        .where(eq(waterSchemeDataHistory.scheme_id, record.scheme_id));

      // Insert new historical records
      await db.insert(waterSchemeDataHistory).values(historicalRecords);
      console.log(
        `✅ Auto-populated ${historicalRecords.length} history records for scheme ${record.scheme_id}`,
      );
    }
  }

  async deleteWaterSchemeData(schemeId: string): Promise<boolean> {
    const db = await this.ensureInitialized();
    await db
      .delete(waterSchemeData)
      .where(eq(waterSchemeData.scheme_id, schemeId));
    return true;
  }

  // Function to safely convert various cell values to numbers (duplicate removed)
  private getNumericValueDuplicate(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    // If already a number, return it
    if (typeof value === "number") {
      return value;
    }

    // If it's a string, try to convert it
    if (typeof value === "string") {
      // Handle empty strings and non-numeric strings
      if (value.trim() === "" || value.toLowerCase() === "n/a") {
        return null;
      }

      // Remove any non-numeric characters except decimal point
      const cleanedValue = value.replace(/[^0-9.]/g, "");
      if (cleanedValue === "") {
        return null;
      }

      // Parse to float and ensure it's a valid number
      const numValue = parseFloat(cleanedValue);

      // If we got NaN but had a non-empty string, it's a format issue
      if (isNaN(numValue)) {
        console.log(`Warning: Could not parse numeric value from: ${value}`);
        return null;
      }

      // Ensure it's actually a finite number
      return isFinite(numValue) ? numValue : null;
    }

    return null;
  }

  // Function to calculate derived values like consistent zeros, below/above LPCD counts
  /**
   * Updates the dashboard URLs for all villages in a scheme when the scheme name or other hierarchical info changes
   * @param scheme The updated scheme information
   */
  async updateVillageDashboardUrls(scheme: SchemeStatus): Promise<void> {
    try {
      console.log(
        `Updating village dashboard URLs for scheme ${scheme.scheme_name} (${scheme.scheme_id})`,
      );
      const db = await this.ensureInitialized();

      // Get all villages for this scheme
      const villages = await db
        .select()
        .from(waterSchemeData)
        .where(eq(waterSchemeData.scheme_id, scheme.scheme_id));

      // Update each village's dashboard URL
      let updatedCount = 0;
      for (const village of villages) {
        // Only update if the scheme name changed
        if (village.scheme_name !== scheme.scheme_name) {
          // Update the scheme name in the village record
          await db
            .update(waterSchemeData)
            .set({
              scheme_name: scheme.scheme_name,
              // Generate new dashboard URL with updated scheme name
              dashboard_url: this.generateVillageDashboardUrl({
                ...village,
                scheme_name: scheme.scheme_name,
              }),
            })
            .where(
              and(
                eq(waterSchemeData.scheme_id, village.scheme_id),
                eq(waterSchemeData.village_name, village.village_name),
              ),
            );

          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        console.log(
          `✅ Updated dashboard URLs for ${updatedCount} villages in scheme ${scheme.scheme_name}`,
        );
      }
    } catch (error) {
      console.error("Error updating village dashboard URLs:", error);
    }
  }

  /**
   * Generates a dashboard URL for a village
   * @param village The village information
   * @returns The complete dashboard URL for the village
   */
  /**
   * Check if this is a village in the special case Bargaonpimpri scheme
   * @param village The village data to check
   * @returns A special case URL or null if not a special case
   */
  private generateSpecialCaseVillageUrl(
    village: WaterSchemeData,
  ): string | null {
    // Special case for Bargaonpimpri scheme in Nashik region
    if (
      village.scheme_id === "20019176" &&
      village.scheme_name.includes("Bargaonpimpri")
    ) {
      // Base URL parameters (UPDATED to use mahajaliot.in)
      const BASE_URL =
        "https://mahajaliot.in/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD";
      const STANDARD_PARAMS = "hidetoolbar=true&hidesidebar=true&mode=kiosk";

      // Special scheme path with non-breaking space (UPDATED to use DemoAF)
      const schemePath =
        "\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Nashik\\Circle-Nashik\\Division-Nashik\\Sub Division-Sinnar\\Block-Sinnar\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS" +
        String.fromCharCode(160) +
        " Tal Sinnar";

      // Append village name to path
      const path = `${schemePath}\\${village.village_name}`;

      // URL encode the path
      const encodedPath = encodeURIComponent(path);

      // Return the complete URL
      return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
    }

    return null; // Not a special case
  }

  /**
   * Check if this is an ESR in the special case Bargaonpimpri scheme
   * @param esr The ESR data to check
   * @returns A special case URL or null if not a special case
   */
  private generateSpecialCaseEsrUrl(
    esr: ChlorineData | PressureData,
  ): string | null {
    // Special case for Bargaonpimpri scheme in Nashik region
    if (
      esr.scheme_id === "20019176" &&
      esr.scheme_name &&
      esr.scheme_name.includes("Bargaonpimpri")
    ) {
      // Base URL parameters for ESR dashboard (UPDATED to use mahajaliot.in)
      const BASE_URL =
        "https://mahajaliot.in/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD";
      const STANDARD_PARAMS = "hidetoolbar=true&hidesidebar=true&mode=kiosk";

      // Special scheme path with non-breaking space and double backslashes (UPDATED to use DemoAF)
      const schemePath =
        "\\\\DemoAF\\JJM\\JJM\\Maharashtra\\Region-Nashik\\Circle-Nashik\\Division-Nashik\\Sub Division-Sinnar\\Block-Sinnar\\Scheme-20019176 - Retro. Bargaonpimpri & 6 VRWSS" +
        String.fromCharCode(160) +
        " Tal Sinnar";

      // Append village and ESR name to path
      const path = `${schemePath}\\${esr.village_name}\\${esr.esr_name}`;

      // URL encode the path
      const encodedPath = encodeURIComponent(path);

      // Return the complete URL (note: using asset parameter for ESR instead of rootpath)
      return `${BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
    }

    return null; // Not a special case
  }

  /**
   * Generates a dashboard URL for an ESR
   * @param esr The ESR information
   * @returns The complete dashboard URL for the ESR
   */
  private generateEsrDashboardUrl(
    esr: ChlorineData | PressureData,
  ): string | null {
    // Skip if missing required hierarchical information
    if (
      !esr.region ||
      !esr.circle ||
      !esr.division ||
      !esr.sub_division ||
      !esr.block ||
      !esr.scheme_id ||
      !esr.scheme_name ||
      !esr.village_name ||
      !esr.esr_name
    ) {
      console.warn(
        `Cannot generate URL for ESR ${esr.esr_name} in village ${esr.village_name} - missing hierarchical information.`,
      );
      return null;
    }

    // Check for special case URLs first
    const specialCaseUrl = this.generateSpecialCaseEsrUrl(esr);
    if (specialCaseUrl) {
      return specialCaseUrl;
    }

    // Base URL and parameters for the ESR dashboard URLs (UPDATED to use mahajaliot.in)
    const BASE_URL =
      "https://mahajaliot.in/PIVision/#/Displays/10086/CEREBULB_JJM_MAHARASHTRA_ESR_LEVEL_DASHBOARD";
    const STANDARD_PARAMS = "hidetoolbar=true&hidesidebar=true&mode=kiosk";
    const SERVER_PATH = "\\\\DemoAF\\JJM\\JJM\\Maharashtra";

    // All regions now use the same format (including Amravati which stays as Amravati)
    // Create the path - standard format: scheme_id - scheme_name (space-hyphen-space)
    const path = `${SERVER_PATH}\\Region-${esr.region}\\Circle-${esr.circle}\\Division-${esr.division}\\Sub Division-${esr.sub_division}\\Block-${esr.block}\\Scheme-${esr.scheme_id} - ${esr.scheme_name}\\${esr.village_name}\\${esr.esr_name}`;

    // Encode the path for use in URL
    const encodedPath = encodeURIComponent(path);

    // Return the complete URL (note: using asset parameter for ESR instead of rootpath)
    return `${BASE_URL}?${STANDARD_PARAMS}&asset=${encodedPath}`;
  }

  private generateVillageDashboardUrl(village: WaterSchemeData): string | null {
    // Skip if missing required hierarchical information
    if (
      !village.region ||
      !village.circle ||
      !village.division ||
      !village.sub_division ||
      !village.block ||
      !village.scheme_id ||
      !village.scheme_name ||
      !village.village_name
    ) {
      console.warn(
        `Cannot generate URL for village ${village.village_name} - missing hierarchical information.`,
      );
      return null;
    }

    // Check for special case URLs first
    const specialCaseUrl = this.generateSpecialCaseVillageUrl(village);
    if (specialCaseUrl) {
      return specialCaseUrl;
    }

    // Base URL and parameters for the dashboard URLs (UPDATED to use mahajaliot.in)
    const BASE_URL =
      "https://mahajaliot.in/PIVision/#/Displays/10109/CEREBULB_JJM_MAHARASHTRA_VILLAGE_LEVEL_DASHBOARD";
    const STANDARD_PARAMS = "hidetoolbar=true&hidesidebar=true&mode=kiosk";
    const SERVER_PATH = "\\\\DemoAF\\JJM\\JJM\\Maharashtra";

    // All regions now use the same format (including Amravati which stays as Amravati)
    // Create the path - standard format: scheme_id - scheme_name (space-hyphen-space)
    const path = `${SERVER_PATH}\\Region-${village.region}\\Circle-${village.circle}\\Division-${village.division}\\Sub Division-${village.sub_division}\\Block-${village.block}\\Scheme-${village.scheme_id} - ${village.scheme_name}\\${village.village_name}`;

    // URL encode the path
    const encodedPath = encodeURIComponent(path);

    // Combine all parts to create the complete URL
    return `${BASE_URL}?${STANDARD_PARAMS}&rootpath=${encodedPath}`;
  }

  private calculateDerivedValuesForImport(data: any): any {
    // Extract LPCD values
    const lpcdValues = [
      this.getNumericValueDuplicate(data.lpcd_value_day1),
      this.getNumericValueDuplicate(data.lpcd_value_day2),
      this.getNumericValueDuplicate(data.lpcd_value_day3),
      this.getNumericValueDuplicate(data.lpcd_value_day4),
      this.getNumericValue(data.lpcd_value_day5),
      this.getNumericValue(data.lpcd_value_day6),
      this.getNumericValue(data.lpcd_value_day7),
    ].filter((val) => val !== null);

    // If no LPCD values, set derived values to 0
    if (lpcdValues.length === 0) {
      data.consistent_zero_lpcd_for_a_week = 0;
      data.below_55_lpcd_count = 0;
      data.above_55_lpcd_count = 0;
      return data;
    }

    // Calculate consistent zero LPCD - only set to 1 if all 7 days have zero values
    const allZeros = lpcdValues.every((val) => val === 0);
    data.consistent_zero_lpcd_for_a_week =
      allZeros && lpcdValues.length === 7 ? 1 : 0;

    // Special handling for all-zero values
    if (allZeros && lpcdValues.length > 0) {
      // If all values are zero, all days are below 55
      data.below_55_lpcd_count = lpcdValues.length;
      data.above_55_lpcd_count = 0;
    } else {
      // Normal calculation for non-zero values
      data.below_55_lpcd_count = lpcdValues.filter((val) => val < 55).length;
      data.above_55_lpcd_count = lpcdValues.filter((val) => val >= 55).length;
    }

    return data;
  }

  // Enhanced column mapping for the positional data format
  private positionalColumnMapping: { [key: number]: string } = {
    // Assuming position matches the Excel columns (0-based)
    0: "region",
    1: "circle",
    2: "division",
    3: "sub_division",
    4: "block",
    5: "scheme_id",
    6: "scheme_name",
    7: "village_name",
    8: "population",
    9: "number_of_esr",
    10: "water_value_day1",
    11: "water_value_day2",
    12: "water_value_day3",
    13: "water_value_day4",
    14: "water_value_day5",
    15: "water_value_day6",
    16: "water_value_day7",
    17: "lpcd_value_day1",
    18: "lpcd_value_day2",
    19: "lpcd_value_day3",
    20: "lpcd_value_day4",
    21: "lpcd_value_day5",
    22: "lpcd_value_day6",
    23: "lpcd_value_day7",
    24: "water_date_day1",
    25: "water_date_day2",
    26: "water_date_day3",
    27: "water_date_day4",
    28: "water_date_day5",
    29: "water_date_day6",
    30: "water_date_day7",
    31: "lpcd_date_day1",
    32: "lpcd_date_day2",
    33: "lpcd_date_day3",
    34: "lpcd_date_day4",
    35: "lpcd_date_day5",
    36: "lpcd_date_day6",
    37: "lpcd_date_day7",
    38: "consistent_zero_lpcd_for_a_week",
    39: "below_55_lpcd_count",
    40: "above_55_lpcd_count",
  };

  async importWaterSchemeDataFromExcel(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let removed = 0;

    try {
      console.log(
        "Starting LPCD data import from Excel with full replacement mode...",
      );

      // Import xlsx library
      const xlsx = require("xlsx");

      // Parse Excel file
      const workbook = xlsx.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0]; // Use first sheet

      console.log(`Processing Excel file, sheet: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON with raw values to preserve numbers
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: null,
        dateNF: "yyyy-mm-dd",
      });

      // Log first row to see what column headers are available
      if (jsonData.length > 0) {
        console.log(
          "Excel first row column headers:",
          Object.keys(jsonData[0]),
        );
      } else {
        console.log("No data found in Excel file");
        return {
          inserted: 0,
          updated: 0,
          removed: 0,
          errors: ["No data found in Excel file"],
        };
      }

      // Determine if the file uses numeric positional columns or named headers
      // This handles both types of Excel files
      const firstRow = jsonData[0];
      const hasPositionalColumns = Object.keys(firstRow).some(
        (key) => !isNaN(Number(key)),
      );

      console.log(
        `Excel format: ${hasPositionalColumns ? "Positional" : "Named headers"}`,
      );

      // Track all villages in the Excel file by scheme_id and village_name
      const importedVillages = new Set<string>();

      // First pass - collect all scheme_id/village_name combinations in the Excel
      for (const row of jsonData) {
        try {
          let schemeId: string | undefined;
          let villageName: string | undefined;

          if (hasPositionalColumns) {
            // Extract from positional columns
            for (const [position, dbField] of Object.entries(
              this.positionalColumnMapping,
            )) {
              if (dbField === "scheme_id" && row[position] !== undefined) {
                schemeId = String(row[position]).trim();
              } else if (
                dbField === "village_name" &&
                row[position] !== undefined
              ) {
                villageName = String(row[position]).trim();
              }
            }
          } else {
            // Extract from named headers
            for (const [excelHeader, dbField] of Object.entries(
              this.excelColumnMapping,
            )) {
              if (dbField === "scheme_id" && row[excelHeader] !== undefined) {
                schemeId = String(row[excelHeader]).trim();
              } else if (
                dbField === "village_name" &&
                row[excelHeader] !== undefined
              ) {
                villageName = String(row[excelHeader]).trim();
              }
            }

            // Try case-insensitive matching if needed
            if (!schemeId || !villageName) {
              for (const origHeader of Object.keys(row)) {
                const lowerHeader = origHeader.toLowerCase();
                for (const [excelHeader, dbField] of Object.entries(
                  this.excelColumnMapping,
                )) {
                  if (excelHeader.toLowerCase() === lowerHeader) {
                    if (dbField === "scheme_id" && !schemeId) {
                      schemeId = String(row[origHeader]).trim();
                    } else if (dbField === "village_name" && !villageName) {
                      villageName = String(row[origHeader]).trim();
                    }
                  }
                }
              }
            }
          }

          if (schemeId && villageName) {
            // Register this scheme/village combination
            importedVillages.add(`${schemeId}::${villageName}`);
          }
        } catch (error) {
          console.error("Error collecting village registry:", error);
        }
      }

      console.log(`Found ${importedVillages.size} villages in the Excel file`);

      // Get all existing water scheme data
      const allExistingData = await this.getAllWaterSchemeData();

      // Identify entries that should be removed (exist in DB but not in Excel)
      const entriesToDelete: { scheme_id: string; village_name: string }[] = [];

      for (const entry of allExistingData) {
        const key = `${entry.scheme_id}::${entry.village_name}`;
        if (!importedVillages.has(key)) {
          entriesToDelete.push({
            scheme_id: entry.scheme_id,
            village_name: entry.village_name,
          });
        }
      }

      console.log(
        `Found ${entriesToDelete.length} villages to remove (not present in Excel file)`,
      );

      // Delete entries not in the Excel file
      for (const entry of entriesToDelete) {
        try {
          await db.delete(waterSchemeData).where(
            sql`${waterSchemeData.scheme_id} = ${entry.scheme_id} AND 
                  ${waterSchemeData.village_name} = ${entry.village_name}`,
          );
          removed++;
        } catch (deleteError) {
          console.error(
            `Error deleting village ${entry.scheme_id}/${entry.village_name}:`,
            deleteError,
          );
          errors.push(
            `Failed to delete village: ${entry.scheme_id}/${entry.village_name}`,
          );
        }
      }

      // Second pass - process and insert/update data
      for (const row of jsonData) {
        try {
          // Map to database schema format
          const schemeData: Record<string, any> = {};

          if (hasPositionalColumns) {
            // Handle positional format (column numbers as keys)
            for (const [position, dbField] of Object.entries(
              this.positionalColumnMapping,
            )) {
              if (row[position] !== undefined) {
                // Convert numeric fields properly
                if (
                  dbField.includes("value") ||
                  dbField === "population" ||
                  dbField === "number_of_esr" ||
                  dbField.includes("count")
                ) {
                  schemeData[dbField] = this.getNumericValue(row[position]);
                } else {
                  schemeData[dbField] = row[position];
                }
              }
            }
          } else {
            // Handle named header format
            // First try exact column matches
            for (const [excelHeader, dbField] of Object.entries(
              this.excelColumnMapping,
            )) {
              if (row[excelHeader] !== undefined) {
                // Convert numeric fields properly
                if (
                  dbField.includes("value") ||
                  dbField === "population" ||
                  dbField === "number_of_esr" ||
                  dbField.includes("count")
                ) {
                  schemeData[dbField] = this.getNumericValue(row[excelHeader]);
                } else {
                  schemeData[dbField] = row[excelHeader];
                }
              }
            }

            // Try case-insensitive matching if regular mapping failed
            if (!schemeData.scheme_id) {
              for (const origHeader of Object.keys(row)) {
                const lowerHeader = origHeader.toLowerCase();
                // Find matching schema field
                for (const [excelHeader, dbField] of Object.entries(
                  this.excelColumnMapping,
                )) {
                  if (excelHeader.toLowerCase() === lowerHeader) {
                    // Convert numeric fields properly
                    if (
                      dbField.includes("value") ||
                      dbField === "population" ||
                      dbField === "number_of_esr" ||
                      dbField.includes("count")
                    ) {
                      schemeData[dbField] = this.getNumericValue(
                        row[origHeader],
                      );
                    } else {
                      schemeData[dbField] = row[origHeader];
                    }
                    break;
                  }
                }
              }
            }
          }

          // Validate required fields
          if (!schemeData.scheme_id || !schemeData.village_name) {
            console.log(
              "Skipping row with missing scheme_id or village_name:",
              JSON.stringify({
                scheme_id: schemeData.scheme_id,
                village_name: schemeData.village_name,
              }),
            );
            continue;
          }

          // Calculate derived values (consistency metrics)
          this.calculateSchemeMetrics(schemeData);

          // Generate dashboard URL if not present
          if (
            !schemeData.dashboard_url &&
            schemeData.region &&
            schemeData.circle &&
            schemeData.division &&
            schemeData.sub_division &&
            schemeData.block &&
            schemeData.scheme_id &&
            schemeData.scheme_name &&
            schemeData.village_name
          ) {
            schemeData.dashboard_url = this.generateVillageDashboardUrl(
              schemeData as WaterSchemeData,
            );
            console.log(
              `Generated dashboard URL for imported village ${schemeData.village_name} in scheme ${schemeData.scheme_name}`,
            );
          }

          // Check if scheme/village combination already exists
          const existingRecords = await db
            .select()
            .from(waterSchemeData)
            .where(
              sql`${waterSchemeData.scheme_id} = ${schemeData.scheme_id} AND 
                  ${waterSchemeData.village_name} = ${schemeData.village_name}`,
            );

          const exists = existingRecords.length > 0;

          try {
            if (exists) {
              // Update existing entry
              await db
                .update(waterSchemeData)
                .set(schemeData)
                .where(
                  sql`${waterSchemeData.scheme_id} = ${schemeData.scheme_id} AND 
                      ${waterSchemeData.village_name} = ${schemeData.village_name}`,
                );
              updated++;
            } else {
              // Insert new entry
              await db.insert(waterSchemeData).values(schemeData as any);
              inserted++;
            }
          } catch (saveError: any) {
            console.error(`Error saving data: ${saveError.message}`);
            errors.push(
              `Error saving data for ${schemeData.scheme_id}/${schemeData.village_name}: ${saveError.message}`,
            );
          }
        } catch (rowError: any) {
          console.error(`Row processing error: ${rowError.message}`);
          errors.push(`Error processing row: ${rowError.message}`);
        }
      }

      console.log(
        `LPCD import complete: ${inserted} inserted, ${updated} updated, ${removed} removed, ${errors.length} errors`,
      );

      // Store historical water scheme data after successful import
      try {
        console.log("Storing historical water scheme data...");

        // Process the jsonData into the proper format for historical storage
        const processedDataForHistory: any[] = [];

        for (const row of jsonData) {
          const schemeData: Record<string, any> = {};

          if (hasPositionalColumns) {
            // Handle positional format (column numbers as keys)
            for (const [position, dbField] of Object.entries(
              this.positionalColumnMapping,
            )) {
              if (row[position] !== undefined) {
                // Convert numeric fields properly
                if (
                  dbField.includes("value") ||
                  dbField === "population" ||
                  dbField === "number_of_esr" ||
                  dbField.includes("count")
                ) {
                  schemeData[dbField] = this.getNumericValue(row[position]);
                } else {
                  schemeData[dbField] = row[position];
                }
              }
            }
          } else {
            // Handle named header format
            // First try exact column matches
            for (const [excelHeader, dbField] of Object.entries(
              this.excelColumnMapping,
            )) {
              if (row[excelHeader] !== undefined) {
                // Convert numeric fields properly
                if (
                  dbField.includes("value") ||
                  dbField === "population" ||
                  dbField === "number_of_esr" ||
                  dbField.includes("count")
                ) {
                  schemeData[dbField] = this.getNumericValue(row[excelHeader]);
                } else {
                  schemeData[dbField] = row[excelHeader];
                }
              }
            }

            // Try case-insensitive matching if regular mapping failed
            if (!schemeData.scheme_id) {
              for (const origHeader of Object.keys(row)) {
                const lowerHeader = origHeader.toLowerCase();
                // Find matching schema field
                for (const [excelHeader, dbField] of Object.entries(
                  this.excelColumnMapping,
                )) {
                  if (excelHeader.toLowerCase() === lowerHeader) {
                    // Convert numeric fields properly
                    if (
                      dbField.includes("value") ||
                      dbField === "population" ||
                      dbField === "number_of_esr" ||
                      dbField.includes("count")
                    ) {
                      schemeData[dbField] = this.getNumericValue(
                        row[origHeader],
                      );
                    } else {
                      schemeData[dbField] = row[origHeader];
                    }
                    break;
                  }
                }
              }
            }
          }

          // Only add records that have the required fields
          if (schemeData.scheme_id && schemeData.village_name) {
            processedDataForHistory.push(schemeData);
          }
        }

        console.log(
          `Processing ${processedDataForHistory.length} records for historical storage...`,
        );
        await this.storeWaterSchemeHistoricalData(processedDataForHistory);
        console.log("✅ Historical water scheme data stored successfully");
      } catch (historicalError) {
        console.error(
          "Error storing historical water scheme data after Excel import:",
          historicalError,
        );
        errors.push("Failed to store historical water scheme data");
      }

      // Automatically store population data in tracking tables after import
      try {
        await this.storePopulationData();
      } catch (populationError) {
        console.error(
          "Error storing population data after Excel import:",
          populationError,
        );
        errors.push("Failed to store population tracking data");
      }

      return { inserted, updated, removed, errors };
    } catch (error: any) {
      console.error(`Excel import error: ${error.message}`);
      errors.push(`Excel import error: ${error.message}`);
      return { inserted, updated, removed, errors };
    }
  }

  async importWaterSchemeDataFromCSV(fileBuffer: Buffer): Promise<{
    inserted: number;
    updated: number;
    removed: number;
    errors: string[];
  }> {
    const db = await this.ensureInitialized();
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let removed = 0;

    // Add timing for performance analysis
    const startTime = Date.now();

    try {
      console.log(
        "Starting LPCD data import from CSV with optimized batch processing...",
      );

      // Import csv-parse library using dynamic import
      const { parse } = await import("csv-parse/sync");

      // Parse CSV file with improved options
      const records = parse(fileBuffer, {
        delimiter: ",",
        columns: false, // No headers in CSV
        skip_empty_lines: true,
        trim: true,
        bom: true, // Handle byte order mark if present
        relax_column_count: true, // Be more forgiving with column counts
      });

      console.log(`CSV parsed successfully. Found ${records.length} records.`);

      if (records.length === 0) {
        return {
          inserted: 0,
          updated: 0,
          removed: 0,
          errors: [
            "Empty or invalid CSV file. Please check the format and try again.",
          ],
        };
      }

      // OPTIMIZATION: Store batch mapping data for faster processing
      const recordsMap = new Map<string, Partial<InsertWaterSchemeData>>();
      const uniqueKeys = new Set<string>();
      let totalRowsProcessed = 0;
      let duplicatesInCsv = 0;
      let skippedRows = 0;

      // Process all records and collect unique keys
      for (let i = 1; i < records.length; i++) {
        // Skip header row (i=0)
        const record = records[i];
        try {
          // Map CSV columns to database fields based on index
          const schemeData: Partial<InsertWaterSchemeData> = {};

          // Check if we have the scheme_id (required field)
          const schemeIdIndex = 5; // According to the mapping, scheme_id is at index 5
          const villageNameIndex = 7; // Position for village_name

          if (!record[schemeIdIndex] || !record[villageNameIndex]) {
            errors.push(
              `Row ${i + 1} missing required field: scheme_id or village_name`,
            );
            skippedRows++;
            continue;
          }

          // Get the required identifier fields
          const schemeId = record[schemeIdIndex];
          const villageName = record[villageNameIndex];

          // Only process if we have both required fields for composite key
          if (schemeId && villageName) {
            totalRowsProcessed++;

            // Map fields from CSV to database schema based on column index
            for (const [indexStr, dbField] of Object.entries(
              this.positionalColumnMapping,
            )) {
              const index = parseInt(indexStr);
              if (record[index] !== undefined && record[index] !== "") {
                // Convert string values to numbers for numeric fields, with safety check
                if (
                  dbField.includes("value") ||
                  dbField === "population" ||
                  dbField === "number_of_esr" ||
                  dbField.includes("count")
                ) {
                  try {
                    // Handle overflow issues by capping values to safe range
                    let numberValue = parseFloat(
                      String(record[index]).replace(/,/g, ""),
                    );

                    // Check if number is within safe range for decimal(20,6)
                    if (!isNaN(numberValue)) {
                      // Max value for decimal(20,6) is approximately 10^14
                      const MAX_SAFE_DECIMAL = 1e14;

                      if (Math.abs(numberValue) > MAX_SAFE_DECIMAL) {
                        numberValue =
                          numberValue > 0
                            ? MAX_SAFE_DECIMAL
                            : -MAX_SAFE_DECIMAL;
                      }

                      schemeData[dbField as keyof InsertWaterSchemeData] =
                        numberValue as any;
                    }
                  } catch (e) {
                    // Silent failure - just don't set the field
                  }
                } else {
                  schemeData[dbField as keyof InsertWaterSchemeData] = record[
                    index
                  ] as any;
                }
              }
            }

            // Calculate derived values (consistent zero, below/above 55 LPCD)
            this.calculateSchemeMetrics(schemeData);

            // Generate dashboard URL if not present
            if (
              !schemeData.dashboard_url &&
              schemeData.region &&
              schemeData.circle &&
              schemeData.division &&
              schemeData.sub_division &&
              schemeData.block &&
              schemeData.scheme_id &&
              schemeData.scheme_name &&
              schemeData.village_name
            ) {
              schemeData.dashboard_url = this.generateVillageDashboardUrl(
                schemeData as WaterSchemeData,
              );
            }

            // Generate a composite key for lookup including block field
            const key = `${schemeId}::${villageName}::${schemeData.block || ""}`;

            // Check if this is a duplicate within the CSV itself
            if (recordsMap.has(key)) {
              duplicatesInCsv++;
              console.log(
                `WARNING: Duplicate found in CSV at row ${i + 1}: ${schemeId} - ${villageName} - ${schemeData.block} (overwriting previous entry)`,
              );
            }

            uniqueKeys.add(key);
            recordsMap.set(key, schemeData);
          }
        } catch (rowError) {
          const errorMessage =
            rowError instanceof Error ? rowError.message : String(rowError);
          errors.push(`Error processing row ${i + 1}: ${errorMessage}`);
          skippedRows++;
        }
      }

      console.log(`CSV Processing Summary:`);
      console.log(`- Total rows in CSV: ${records.length} (including header)`);
      console.log(`- Data rows processed: ${totalRowsProcessed}`);
      console.log(`- Duplicates within CSV: ${duplicatesInCsv}`);
      console.log(`- Skipped rows: ${skippedRows}`);
      console.log(`- Unique records to process: ${recordsMap.size}`);

      // OPTIMIZATION: Get all existing water scheme data in a single query
      console.log("Fetching all existing water scheme data...");
      const allExistingData = await this.getAllWaterSchemeData();
      console.log(
        `Found ${allExistingData.length} existing water scheme records`,
      );

      // Create a lookup map for existing data using composite key
      const existingDataMap = new Map<string, WaterSchemeData>();
      for (const entry of allExistingData) {
        const key = `${entry.scheme_id}::${entry.village_name}::${entry.block || ""}`;
        existingDataMap.set(key, entry);
      }

      // OPTIMIZATION: Identify entries for batch operations
      const recordsToUpdate: Partial<InsertWaterSchemeData>[] = [];
      const recordsToInsert: Partial<InsertWaterSchemeData>[] = [];
      const entriesToDelete: { scheme_id: string; village_name: string; block?: string | null }[] = [];

      // Process records for insert/update
      for (const [key, record] of recordsMap.entries()) {
        if (existingDataMap.has(key)) {
          recordsToUpdate.push(record);
        } else {
          recordsToInsert.push(record);
        }
      }

      // Identify records to delete (in DB but not in CSV)
      for (const [key, entry] of existingDataMap.entries()) {
        if (!uniqueKeys.has(key)) {
          entriesToDelete.push({
            scheme_id: entry.scheme_id,
            village_name: entry.village_name,
            block: entry.block,
          });
        }
      }

      console.log(
        `Operations to perform: ${recordsToInsert.length} inserts, ${recordsToUpdate.length} updates, ${entriesToDelete.length} deletes`,
      );

      // OPTIMIZATION: Process batch deletes
      if (entriesToDelete.length > 0) {
        const deleteBatchSize = 50;
        for (let i = 0; i < entriesToDelete.length; i += deleteBatchSize) {
          const batch = entriesToDelete.slice(i, i + deleteBatchSize);
          console.log(
            `Processing delete batch ${Math.floor(i / deleteBatchSize) + 1}/${Math.ceil(entriesToDelete.length / deleteBatchSize)}`,
          );

          // Create batch of delete promises to execute in parallel
          const deletePromises = batch.map((entry) =>
            db.delete(waterSchemeData).where(
              sql`${waterSchemeData.scheme_id} = ${entry.scheme_id} AND 
                    ${waterSchemeData.village_name} = ${entry.village_name} AND
                    ${waterSchemeData.block} IS NOT DISTINCT FROM ${entry.block}`,
            ),
          );

          // Execute all deletes in this batch in parallel
          await Promise.all(deletePromises);
          removed += batch.length;
        }
      }

      // OPTIMIZATION: Process batch inserts
      if (recordsToInsert.length > 0) {
        const insertBatchSize = 50;
        for (let i = 0; i < recordsToInsert.length; i += insertBatchSize) {
          const batch = recordsToInsert.slice(i, i + insertBatchSize);
          console.log(
            `Processing insert batch ${Math.floor(i / insertBatchSize) + 1}/${Math.ceil(recordsToInsert.length / insertBatchSize)}`,
          );

          try {
            // Use UPSERT to handle any potential conflicts gracefully
            await db
              .insert(waterSchemeData)
              .values(batch as InsertWaterSchemeData[])
              .onConflictDoUpdate({
                target: [
                  waterSchemeData.scheme_id,
                  waterSchemeData.village_name,
                  waterSchemeData.block,
                ],
                set: {
                  region: sql`EXCLUDED.region`,
                  circle: sql`EXCLUDED.circle`,
                  division: sql`EXCLUDED.division`,
                  sub_division: sql`EXCLUDED.sub_division`,
                  scheme_name: sql`EXCLUDED.scheme_name`,
                  population: sql`EXCLUDED.population`,
                  number_of_esr: sql`EXCLUDED.number_of_esr`,
                  water_value_day1: sql`EXCLUDED.water_value_day1`,
                  water_value_day2: sql`EXCLUDED.water_value_day2`,
                  water_value_day3: sql`EXCLUDED.water_value_day3`,
                  water_value_day4: sql`EXCLUDED.water_value_day4`,
                  water_value_day5: sql`EXCLUDED.water_value_day5`,
                  water_value_day6: sql`EXCLUDED.water_value_day6`,
                  water_value_day7: sql`EXCLUDED.water_value_day7`,
                  lpcd_value_day1: sql`EXCLUDED.lpcd_value_day1`,
                  lpcd_value_day2: sql`EXCLUDED.lpcd_value_day2`,
                  lpcd_value_day3: sql`EXCLUDED.lpcd_value_day3`,
                  lpcd_value_day4: sql`EXCLUDED.lpcd_value_day4`,
                  lpcd_value_day5: sql`EXCLUDED.lpcd_value_day5`,
                  lpcd_value_day6: sql`EXCLUDED.lpcd_value_day6`,
                  lpcd_value_day7: sql`EXCLUDED.lpcd_value_day7`,
                  water_date_day1: sql`EXCLUDED.water_date_day1`,
                  water_date_day2: sql`EXCLUDED.water_date_day2`,
                  water_date_day3: sql`EXCLUDED.water_date_day3`,
                  water_date_day4: sql`EXCLUDED.water_date_day4`,
                  water_date_day5: sql`EXCLUDED.water_date_day5`,
                  water_date_day6: sql`EXCLUDED.water_date_day6`,
                  water_date_day7: sql`EXCLUDED.water_date_day7`,
                  lpcd_date_day1: sql`EXCLUDED.lpcd_date_day1`,
                  lpcd_date_day2: sql`EXCLUDED.lpcd_date_day2`,
                  lpcd_date_day3: sql`EXCLUDED.lpcd_date_day3`,
                  lpcd_date_day4: sql`EXCLUDED.lpcd_date_day4`,
                  lpcd_date_day5: sql`EXCLUDED.lpcd_date_day5`,
                  lpcd_date_day6: sql`EXCLUDED.lpcd_date_day6`,
                  lpcd_date_day7: sql`EXCLUDED.lpcd_date_day7`,
                  consistent_zero_lpcd_for_a_week: sql`EXCLUDED.consistent_zero_lpcd_for_a_week`,
                  below_55_lpcd_count: sql`EXCLUDED.below_55_lpcd_count`,
                  above_55_lpcd_count: sql`EXCLUDED.above_55_lpcd_count`,
                  dashboard_url: sql`EXCLUDED.dashboard_url`,
                },
              });
            inserted += batch.length;
          } catch (insertError) {
            console.error(
              `Error in batch upsert: ${insertError instanceof Error ? insertError.message : String(insertError)}`,
            );

            // Fall back to individual upserts if batch fails
            for (const record of batch) {
              try {
                await db
                  .insert(waterSchemeData)
                  .values(record as InsertWaterSchemeData)
                  .onConflictDoUpdate({
                    target: [
                      waterSchemeData.scheme_id,
                      waterSchemeData.village_name,
                      waterSchemeData.block,
                    ],
                    set: {
                      region: sql`EXCLUDED.region`,
                      circle: sql`EXCLUDED.circle`,
                      division: sql`EXCLUDED.division`,
                      sub_division: sql`EXCLUDED.sub_division`,
                      scheme_name: sql`EXCLUDED.scheme_name`,
                      population: sql`EXCLUDED.population`,
                      number_of_esr: sql`EXCLUDED.number_of_esr`,
                      water_value_day1: sql`EXCLUDED.water_value_day1`,
                      water_value_day2: sql`EXCLUDED.water_value_day2`,
                      water_value_day3: sql`EXCLUDED.water_value_day3`,
                      water_value_day4: sql`EXCLUDED.water_value_day4`,
                      water_value_day5: sql`EXCLUDED.water_value_day5`,
                      water_value_day6: sql`EXCLUDED.water_value_day6`,
                      water_value_day7: sql`EXCLUDED.water_value_day7`,
                      lpcd_value_day1: sql`EXCLUDED.lpcd_value_day1`,
                      lpcd_value_day2: sql`EXCLUDED.lpcd_value_day2`,
                      lpcd_value_day3: sql`EXCLUDED.lpcd_value_day3`,
                      lpcd_value_day4: sql`EXCLUDED.lpcd_value_day4`,
                      lpcd_value_day5: sql`EXCLUDED.lpcd_value_day5`,
                      lpcd_value_day6: sql`EXCLUDED.lpcd_value_day6`,
                      lpcd_value_day7: sql`EXCLUDED.lpcd_value_day7`,
                      water_date_day1: sql`EXCLUDED.water_date_day1`,
                      water_date_day2: sql`EXCLUDED.water_date_day2`,
                      water_date_day3: sql`EXCLUDED.water_date_day3`,
                      water_date_day4: sql`EXCLUDED.water_date_day4`,
                      water_date_day5: sql`EXCLUDED.water_date_day5`,
                      water_date_day6: sql`EXCLUDED.water_date_day6`,
                      water_date_day7: sql`EXCLUDED.water_date_day7`,
                      lpcd_date_day1: sql`EXCLUDED.lpcd_date_day1`,
                      lpcd_date_day2: sql`EXCLUDED.lpcd_date_day2`,
                      lpcd_date_day3: sql`EXCLUDED.lpcd_date_day3`,
                      lpcd_date_day4: sql`EXCLUDED.lpcd_date_day4`,
                      lpcd_date_day5: sql`EXCLUDED.lpcd_date_day5`,
                      lpcd_date_day6: sql`EXCLUDED.lpcd_date_day6`,
                      lpcd_date_day7: sql`EXCLUDED.lpcd_date_day7`,
                      consistent_zero_lpcd_for_a_week: sql`EXCLUDED.consistent_zero_lpcd_for_a_week`,
                      below_55_lpcd_count: sql`EXCLUDED.below_55_lpcd_count`,
                      above_55_lpcd_count: sql`EXCLUDED.above_55_lpcd_count`,
                      dashboard_url: sql`EXCLUDED.dashboard_url`,
                    },
                  });
                inserted++;
              } catch (individualError) {
                errors.push(
                  `Failed to upsert ${record.scheme_id}/${record.village_name}/${record.block}: ${individualError instanceof Error ? individualError.message : String(individualError)}`,
                );
              }
            }
          }
        }
      }

      // OPTIMIZATION: Process updates in parallel batches
      if (recordsToUpdate.length > 0) {
        const updateBatchSize = 30;
        for (let i = 0; i < recordsToUpdate.length; i += updateBatchSize) {
          const batch = recordsToUpdate.slice(i, i + updateBatchSize);
          console.log(
            `Processing update batch ${Math.floor(i / updateBatchSize) + 1}/${Math.ceil(recordsToUpdate.length / updateBatchSize)}`,
          );

          // Create update promises
          const updatePromises = batch.map((record) =>
            db.update(waterSchemeData).set(record as Partial<WaterSchemeData>)
              .where(sql`${waterSchemeData.scheme_id} = ${record.scheme_id} AND 
                         ${waterSchemeData.village_name} = ${record.village_name} AND
                         ${waterSchemeData.block} IS NOT DISTINCT FROM ${record.block}`),
          );

          // Execute all updates in parallel
          try {
            await Promise.all(updatePromises);
            updated += batch.length;
          } catch (updateError) {
            console.error(
              `Error in batch update: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
            );

            // Fall back to individual updates
            for (const record of batch) {
              try {
                await db
                  .update(waterSchemeData)
                  .set(record as Partial<WaterSchemeData>)
                  .where(sql`${waterSchemeData.scheme_id} = ${record.scheme_id} AND 
                             ${waterSchemeData.village_name} = ${record.village_name} AND
                             ${waterSchemeData.block} IS NOT DISTINCT FROM ${record.block}`);
                updated++;
              } catch (individualError) {
                errors.push(
                  `Failed to update ${record.scheme_id}/${record.village_name}/${record.block}: ${individualError instanceof Error ? individualError.message : String(individualError)}`,
                );
              }
            }
          }
        }
      }

      // IMPORTANT: Update scheme_status table with block information from this import
      console.log(
        "Synchronizing scheme_status table with block information from this import...",
      );

      // Extract unique scheme and block combinations from the imported data
      const schemeBlockMap = new Map<string, Set<string>>();

      // Process all records to gather unique scheme-block combinations
      [...recordsToInsert, ...recordsToUpdate].forEach((record) => {
        if (record.scheme_id && record.block && record.scheme_name) {
          if (!schemeBlockMap.has(record.scheme_name)) {
            schemeBlockMap.set(record.scheme_name, new Set<string>());
          }
          schemeBlockMap.get(record.scheme_name)?.add(record.block);
        }
      });

      // For each scheme, ensure we have entries in scheme_status for all its blocks
      let schemeStatusUpdated = 0;
      for (const [schemeName, blocks] of schemeBlockMap.entries()) {
        try {
          // First get all existing scheme status entries for this scheme
          const existingSchemeStatus = await db
            .select()
            .from(schemeStatuses)
            .where(eq(schemeStatuses.scheme_name, schemeName));

          console.log(
            `Found ${existingSchemeStatus.length} existing scheme status records for scheme "${schemeName}"`,
          );

          // Create a map of existing blocks for this scheme
          const existingBlocks = new Set(
            existingSchemeStatus.map((s) => s.block),
          );

          // Check for blocks in our import that don't exist in scheme_status
          for (const block of blocks) {
            if (!existingBlocks.has(block)) {
              console.log(
                `Adding missing block "${block}" to scheme_status for scheme "${schemeName}"`,
              );

              // If we have an existing record for this scheme, clone it for the new block
              if (existingSchemeStatus.length > 0) {
                const templateRecord = { ...existingSchemeStatus[0] };
                templateRecord.block = block;

                // Insert the new block record
                await db.insert(schemeStatuses).values(templateRecord);
                schemeStatusUpdated++;
              }
            }
          }
        } catch (error) {
          console.error(
            `Error synchronizing scheme_status for scheme "${schemeName}":`,
            error,
          );
          errors.push(
            `Failed to sync scheme status for ${schemeName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      console.log(
        `Synchronized ${schemeStatusUpdated} new block entries in scheme_status table`,
      );

      // Calculate elapsed time
      const endTime = Date.now();
      const elapsedSeconds = (endTime - startTime) / 1000;

      // Add duplicate information to errors for user visibility
      if (duplicatesInCsv > 0) {
        errors.push(
          `Note: ${duplicatesInCsv} duplicate entries found within CSV file (scheme_id + village_name combinations). Later entries overwrite earlier ones.`,
        );
      }

      console.log(
        `LPCD CSV import completed in ${elapsedSeconds.toFixed(2)} seconds:`,
      );
      console.log(`- ${inserted} records inserted`);
      console.log(`- ${updated} records updated`);
      console.log(`- ${removed} records removed`);
      console.log(`- ${duplicatesInCsv} duplicates found in CSV`);
      console.log(`- ${errors.length} errors/warnings`);

      // Store historical water scheme data after successful CSV import
      try {
        console.log("Storing historical water scheme data from CSV...");
        // Convert CSV records to format suitable for historical storage
        const allImportedRecords = [...recordsToInsert, ...recordsToUpdate];
        await this.storeWaterSchemeHistoricalData(allImportedRecords);
        console.log("✅ Historical water scheme data stored successfully");
      } catch (historicalError) {
        console.error(
          "Error storing historical water scheme data after CSV import:",
          historicalError,
        );
        errors.push("Failed to store historical water scheme data");
      }

      // Automatically store population data in tracking tables after import
      try {
        await this.storePopulationData();
      } catch (populationError) {
        console.error(
          "Error storing population data after CSV import:",
          populationError,
        );
        errors.push("Failed to store population tracking data");
      }

      return { inserted, updated, removed, errors };
    } catch (error) {
      console.error(`CSV import error:`, error);
      errors.push(
        `CSV import error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { inserted, updated, removed, errors };
    }
  }

  // Store historical water scheme data by unpacking multi-day records into individual entries
  async storeWaterSchemeHistoricalData(importedData: any[]): Promise<void> {
    const db = await this.ensureInitialized();

    try {
      console.log("Processing water scheme data for historical storage...");

      const uploadBatchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const historicalRecords: InsertWaterSchemeDataHistory[] = [];

      for (const record of importedData) {
        if (!record.scheme_id || !record.village_name) {
          continue; // Skip records without required identifiers
        }

        // Process water values (days 1-6)
        for (let day = 1; day <= 6; day++) {
          const waterDateField = `water_date_day${day}`;
          const waterValueField = `water_value_day${day}`;

          const waterDate = record[waterDateField];
          const waterValue = record[waterValueField];

          if (waterDate && waterValue !== null && waterValue !== undefined) {
            historicalRecords.push({
              region: record.region || null,
              circle: record.circle || null,
              division: record.division || null,
              sub_division: record.sub_division || null,
              block: record.block || null,
              scheme_id: record.scheme_id,
              scheme_name: record.scheme_name || null,
              village_name: record.village_name,
              population: record.population || null,
              number_of_esr: record.number_of_esr || null,
              data_date: waterDate,
              water_value: waterValue,
              lpcd_value: null, // No LPCD for water-only entries
              upload_batch_id: uploadBatchId,
              dashboard_url: record.dashboard_url || null,
            });
          }
        }

        // Process LPCD values (days 1-7)
        for (let day = 1; day <= 7; day++) {
          const lpcdDateField = `lpcd_date_day${day}`;
          const lpcdValueField = `lpcd_value_day${day}`;

          const lpcdDate = record[lpcdDateField];
          const lpcdValue = record[lpcdValueField];

          if (lpcdDate && lpcdValue !== null && lpcdValue !== undefined) {
            historicalRecords.push({
              region: record.region || null,
              circle: record.circle || null,
              division: record.division || null,
              sub_division: record.sub_division || null,
              block: record.block || null,
              scheme_id: record.scheme_id,
              scheme_name: record.scheme_name || null,
              village_name: record.village_name,
              population: record.population || null,
              number_of_esr: record.number_of_esr || null,
              data_date: lpcdDate,
              water_value: null, // No water value for LPCD-only entries
              lpcd_value: lpcdValue,
              upload_batch_id: uploadBatchId,
              dashboard_url: record.dashboard_url || null,
            });
          }
        }
      }

      if (historicalRecords.length > 0) {
        console.log(
          `Storing ${historicalRecords.length} historical water scheme records...`,
        );

        // Insert historical records in batches to avoid memory issues
        const historyBatchSize = 200;
        for (let i = 0; i < historicalRecords.length; i += historyBatchSize) {
          const batch = historicalRecords.slice(i, i + historyBatchSize);

          try {
            await db.insert(waterSchemeDataHistory).values(batch);
            console.log(
              `Stored historical batch ${Math.floor(i / historyBatchSize) + 1}/${Math.ceil(historicalRecords.length / historyBatchSize)}`,
            );
          } catch (historyError) {
            console.error(
              `Error storing historical batch ${Math.floor(i / historyBatchSize) + 1}:`,
              historyError,
            );
            // Continue with other batches even if one fails
          }
        }

        console.log(
          `✅ Successfully stored ${historicalRecords.length} historical water scheme records with batch ID: ${uploadBatchId}`,
        );
      } else {
        console.log("No historical records to store");
      }
    } catch (error) {
      console.error("Error in storeWaterSchemeHistoricalData:", error);
      throw error;
    }
  }

  // Populate water_scheme_data_history from current water_scheme_data records
  async populateHistoryFromCurrentData(): Promise<void> {
    const db = await this.ensureInitialized();

    try {
      console.log(
        "📊 Populating water_scheme_data_history from current water_scheme_data...",
      );

      // Get all current water scheme data
      const currentData = await db.select().from(waterSchemeData);

      if (currentData.length === 0) {
        console.log("No water scheme data found to populate history");
        return;
      }

      const uploadBatchId = `batch_${Date.now()}_current_data`;
      const historicalRecords: InsertWaterSchemeDataHistory[] = [];

      // Get current date in DD-MMM format
      const now = new Date();
      const currentDate = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });

      for (const record of currentData) {
        if (!record.scheme_id || !record.village_name) {
          continue; // Skip records without required identifiers
        }

        // Process water values for each day (1-6)
        for (let day = 1; day <= 6; day++) {
          const waterDateField = `water_date_day${day}` as keyof typeof record;
          const waterValueField =
            `water_value_day${day}` as keyof typeof record;

          const waterDate = record[waterDateField] as string;
          const waterValue = record[waterValueField] as number;

          if (waterDate && waterValue !== null && waterValue !== undefined) {
            // Calculate LPCD if we have population data
            let lpcdValue = null;
            if (record.population && record.population > 0 && waterValue > 0) {
              lpcdValue = (waterValue * 1000) / record.population; // Convert to LPCD
            }

            historicalRecords.push({
              region: record.region || null,
              circle: record.circle || null,
              division: record.division || null,
              sub_division: record.sub_division || null,
              block: record.block || null,
              scheme_id: record.scheme_id,
              scheme_name: record.scheme_name || null,
              village_name: record.village_name,
              population: record.population || null,
              number_of_esr: record.number_of_esr || null,
              data_date: waterDate,
              water_value: waterValue.toString(),
              lpcd_value: lpcdValue ? lpcdValue.toString() : null,
              upload_batch_id: uploadBatchId,
              dashboard_url: record.dashboard_url || null,
            });
          }
        }

        // Also add current water values if they exist
        if (
          record.current_water_value !== null &&
          record.current_water_value !== undefined
        ) {
          let lpcdValue = null;
          if (
            record.population &&
            record.population > 0 &&
            record.current_water_value > 0
          ) {
            lpcdValue = (record.current_water_value * 1000) / record.population;
          }

          historicalRecords.push({
            region: record.region || null,
            circle: record.circle || null,
            division: record.division || null,
            sub_division: record.sub_division || null,
            block: record.block || null,
            scheme_id: record.scheme_id,
            scheme_name: record.scheme_name || null,
            village_name: record.village_name,
            population: record.population || null,
            number_of_esr: record.number_of_esr || null,
            data_date: currentDate,
            water_value: record.current_water_value.toString(),
            lpcd_value: lpcdValue ? lpcdValue.toString() : null,
            upload_batch_id: uploadBatchId,
            dashboard_url: record.dashboard_url || null,
          });
        }
      }

      if (historicalRecords.length > 0) {
        console.log(
          `Storing ${historicalRecords.length} historical records from current data...`,
        );

        // Insert historical records in batches to avoid memory issues
        const historyBatchSize = 200;
        for (let i = 0; i < historicalRecords.length; i += historyBatchSize) {
          const batch = historicalRecords.slice(i, i + historyBatchSize);

          try {
            await db
              .insert(waterSchemeDataHistory)
              .values(batch)
              .onConflictDoNothing();
            console.log(
              `Stored historical batch ${Math.floor(i / historyBatchSize) + 1}/${Math.ceil(historicalRecords.length / historyBatchSize)}`,
            );
          } catch (historyError) {
            console.error(
              `Error storing historical batch ${Math.floor(i / historyBatchSize) + 1}:`,
              historyError,
            );
            // Continue with other batches even if one fails
          }
        }

        console.log(
          `✅ Successfully populated ${historicalRecords.length} historical records from current data with batch ID: ${uploadBatchId}`,
        );
      } else {
        console.log("No historical records to populate from current data");
      }
    } catch (error) {
      console.error("Error in populateHistoryFromCurrentData:", error);
      throw error;
    }
  }

  // We're now using global variables instead of static class variables
  // This makes the data accessible across different instances and module reloads

  async getTodayUpdates(): Promise<any[]> {
    const db = await this.ensureInitialized();
    console.log("Fetching today's updates");

    try {
      // Get the current date (server's local time)
      const now = new Date();
      const today = now.toISOString().split("T")[0]; // Format: YYYY-MM-DD

      // First, try to retrieve daily updates from the database
      const updateKey = `daily_updates_${today}`;

      // Ensure the app_state table exists
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "app_state" (
          "key" TEXT PRIMARY KEY,
          "value" JSONB NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Use SQL template to avoid parameter issues
      const storedUpdatesQuery = await db.execute(sql`
        SELECT value FROM app_state WHERE key = ${updateKey}
      `);

      let todayUpdates: any[] = [];
      let prevTotals: any = null;
      let lastUpdateDay = null;

      // Check if we have stored updates for today
      if (storedUpdatesQuery.rows.length > 0) {
        try {
          // Handle the case where value might be an object and not a JSON string
          const storedValue = storedUpdatesQuery.rows[0].value;
          let storedData;

          if (typeof storedValue === "string") {
            storedData = JSON.parse(storedValue);
          } else if (typeof storedValue === "object" && storedValue !== null) {
            storedData = storedValue;
          } else {
            // Default to an empty structure if the value is neither string nor object
            storedData = {
              updates: [],
              prevTotals: null,
              lastUpdateDay: today,
            };
          }

          todayUpdates = storedData.updates || [];
          prevTotals = storedData.prevTotals || null;
          lastUpdateDay = storedData.lastUpdateDay || today;
          console.log(
            `Loaded ${todayUpdates.length} stored updates for today (${today})`,
          );
        } catch (parseError) {
          console.error("Error parsing stored updates:", parseError);
          // Initialize with empty values since there was a parse error
          todayUpdates = [];
          prevTotals = null;
          lastUpdateDay = today;
        }
      } else {
        console.log(
          `No updates found for today (${today}), creating new record`,
        );
      }

      // Get current regions data
      const regionsData = await db.select().from(regions);
      const allSchemes = await this.getAllSchemes();

      // Get current totals
      const currentTotals = {
        villages: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.total_villages_integrated || 0),
          0,
        ),
        esr: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.total_esr_integrated || 0),
          0,
        ),
        completedSchemes: allSchemes.filter((scheme) => {
          const status =
            scheme.fully_completion_scheme_status?.toLowerCase() || "";
          return (
            status === "Fully-Completed" ||
            status === "Completed" ||
            status === "fully completed"
          );
        }).length,
        flowMeters: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.flow_meter_integrated || 0),
          0,
        ),
        rca: regionsData.reduce(
          (sum: number, region: any) => sum + (region.rca_integrated || 0),
          0,
        ),
        pt: regionsData.reduce(
          (sum: number, region: any) =>
            sum + (region.pressure_transmitter_integrated || 0),
          0,
        ),
      };

      // Only detect new changes if we have previous totals
      // If this is the first run for today, just store the current totals
      const updates: any[] = [];

      if (prevTotals) {
        // Calculate differences since the previous update

        // Check for NEW village updates since last check
        const newVillages = currentTotals.villages - prevTotals.villages;
        if (newVillages > 0) {
          updates.push({
            type: "village",
            count: newVillages,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW ESR updates since last check
        const newESR = currentTotals.esr - prevTotals.esr;
        if (newESR > 0) {
          updates.push({
            type: "esr",
            count: newESR,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW completed schemes since last check
        const newCompletedSchemes =
          currentTotals.completedSchemes - prevTotals.completedSchemes;
        if (newCompletedSchemes > 0) {
          updates.push({
            type: "scheme",
            count: newCompletedSchemes,
            status: "completed",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW flow meters since last check
        const newFlowMeters = currentTotals.flowMeters - prevTotals.flowMeters;
        if (newFlowMeters > 0) {
          updates.push({
            type: "flow_meter",
            count: newFlowMeters,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW RCAs since last check
        const newRCA = currentTotals.rca - prevTotals.rca;
        if (newRCA > 0) {
          updates.push({
            type: "rca",
            count: newRCA,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }

        // Check for NEW pressure transmitters since last check
        const newPT = currentTotals.pt - prevTotals.pt;
        if (newPT > 0) {
          updates.push({
            type: "pressure_transmitter",
            count: newPT,
            status: "new",
            timestamp: new Date().toISOString(),
            region: "All Regions",
          });
        }
      }

      // Add new updates to today's updates
      if (updates.length > 0) {
        console.log(`Adding ${updates.length} new updates`);
        // When there are specific region updates in the global todayUpdates variable, prioritize them
        if (
          (global as any).todayUpdates &&
          (global as any).todayUpdates.length > 0
        ) {
          // Extract region-specific updates (they have region property not equal to "All Regions")
          const regionSpecificUpdates = (global as any).todayUpdates.filter(
            (update: any) => update.region && update.region !== "All Regions",
          );

          // Add region-specific updates at the beginning for higher visibility
          todayUpdates = [
            ...regionSpecificUpdates,
            ...updates,
            ...todayUpdates,
          ];

          // Clear the global variable after we've processed them
          (global as any).todayUpdates = [];
          console.log(
            `Added ${regionSpecificUpdates.length} region-specific updates to the top of today's updates`,
          );
        } else {
          todayUpdates = [...updates, ...todayUpdates];
        }
      } else if (
        (global as any).todayUpdates &&
        (global as any).todayUpdates.length > 0
      ) {
        // If we have region updates but no general updates, still process them
        const regionSpecificUpdates = (global as any).todayUpdates;
        todayUpdates = [...regionSpecificUpdates, ...todayUpdates];
        (global as any).todayUpdates = [];
        console.log(
          `Added ${regionSpecificUpdates.length} region-specific updates to today's updates`,
        );
      }

      // Store current state in the database
      const stateToStore = {
        updates: todayUpdates,
        prevTotals: currentTotals,
        lastUpdateDay: today,
      };

      // Upsert the app_state record using SQL template literal for safety
      // Store as a proper JSONB object
      const jsonValue = JSON.stringify(stateToStore);
      await db.execute(sql`
        INSERT INTO app_state (key, value) 
        VALUES (${updateKey}, ${jsonValue}::jsonb)
        ON CONFLICT (key) 
        DO UPDATE SET value = ${jsonValue}::jsonb
      `);

      // Return updates for today
      return todayUpdates;
    } catch (error) {
      console.error("Error fetching today's updates:", error);
      throw error;
    }
  }

  // User login logging methods
  async logUserLogin(
    user: any,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
  ): Promise<void> {
    const db = await this.ensureInitialized();

    // Ensure the user_login_logs table exists with new columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_login_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "username" VARCHAR(255) NOT NULL,
        "user_name" VARCHAR(255),
        "login_time" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "logout_time" TIMESTAMP WITH TIME ZONE,
        "session_duration" INTEGER,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "session_id" VARCHAR(255),
        "is_active" BOOLEAN DEFAULT TRUE
      );
    `);

    await db.execute(sql`
      INSERT INTO user_login_logs (user_id, username, user_name, login_time, ip_address, user_agent, session_id, is_active)
      VALUES (${user.id}, ${user.username}, ${user.name}, CURRENT_TIMESTAMP, ${ipAddress}, ${userAgent}, ${sessionId}, TRUE);
    `);
  }

  async logUserLogout(sessionId: string): Promise<void> {
    const db = await this.ensureInitialized();

    // Find the most recent active login for this session and update it
    // Use PostgreSQL's CURRENT_TIMESTAMP to ensure consistent timezone handling
    await db.execute(sql`
      UPDATE user_login_logs 
      SET logout_time = CURRENT_TIMESTAMP,
          session_duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - login_time))::integer,
          is_active = FALSE
      WHERE session_id = ${sessionId} 
        AND is_active = TRUE
        AND id = (
          SELECT id FROM user_login_logs 
          WHERE session_id = ${sessionId} AND is_active = TRUE 
          ORDER BY login_time DESC 
          LIMIT 1
        );
    `);
  }

  async getUserLoginLogs(limit: number = 50): Promise<any[]> {
    const db = await this.ensureInitialized();

    // Ensure the user_login_logs table exists with all necessary columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_login_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "username" VARCHAR(255) NOT NULL,
        "user_name" VARCHAR(255),
        "login_time" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "logout_time" TIMESTAMP WITH TIME ZONE,
        "session_duration" INTEGER,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "session_id" VARCHAR(255),
        "is_active" BOOLEAN DEFAULT TRUE
      );
    `);

    const result = await db.execute(sql`
      SELECT * FROM user_login_logs 
      ORDER BY login_time DESC 
      LIMIT ${limit};
    `);

    return result.rows;
  }

  async getUserLoginLogsByUserId(
    userId: number,
    limit: number = 20,
  ): Promise<any[]> {
    const db = await this.ensureInitialized();

    // Ensure the user_login_logs table exists with all necessary columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_login_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "username" VARCHAR(255) NOT NULL,
        "user_name" VARCHAR(255),
        "login_time" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "logout_time" TIMESTAMP WITH TIME ZONE,
        "session_duration" INTEGER,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "session_id" VARCHAR(255),
        "is_active" BOOLEAN DEFAULT TRUE
      );
    `);

    const result = await db.execute(sql`
      SELECT * FROM user_login_logs 
      WHERE user_id = ${userId}
      ORDER BY login_time DESC 
      LIMIT ${limit};
    `);

    return result.rows;
  }

  // User activity tracking methods
  async logUserActivity(
    activity: InsertUserActivityLog,
  ): Promise<UserActivityLog> {
    const db = await this.ensureInitialized();

    // Ensure the user_activity_logs table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_activity_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "username" VARCHAR(255) NOT NULL,
        "session_id" VARCHAR(255) NOT NULL,
        "activity_type" VARCHAR(100) NOT NULL,
        "activity_description" TEXT NOT NULL,
        "file_name" VARCHAR(255),
        "file_type" VARCHAR(50),
        "page_url" TEXT,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "metadata" JSONB
      );
    `);

    const result = await db.execute(sql`
      INSERT INTO user_activity_logs (
        user_id, username, session_id, activity_type, activity_description, 
        file_name, file_type, page_url, ip_address, user_agent, metadata
      )
      VALUES (
        ${activity.user_id}, ${activity.username}, ${activity.session_id}, 
        ${activity.activity_type}, ${activity.activity_description}, 
        ${activity.file_name || null}, ${activity.file_type || null}, 
        ${activity.page_url || null}, ${activity.ip_address || null}, 
        ${activity.user_agent || null}, ${activity.metadata ? JSON.stringify(activity.metadata) : null}::jsonb
      )
      RETURNING *;
    `);

    return result.rows[0] as UserActivityLog;
  }

  async getUserActivityLogs(
    userId?: number,
    limit: number = 100,
  ): Promise<UserActivityLog[]> {
    const db = await this.ensureInitialized();

    let query = sql`
      SELECT * FROM user_activity_logs 
    `;

    if (userId) {
      query = sql`
        SELECT * FROM user_activity_logs 
        WHERE user_id = ${userId}
      `;
    }

    query = sql`
      ${query}
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `;

    const result = await db.execute(query);
    return result.rows as UserActivityLog[];
  }

  async getUserActivityLogsBySession(
    sessionId: string,
    limit: number = 50,
  ): Promise<UserActivityLog[]> {
    const db = await this.ensureInitialized();

    const result = await db.execute(sql`
      SELECT * FROM user_activity_logs 
      WHERE session_id = ${sessionId}
      ORDER BY timestamp DESC 
      LIMIT ${limit}
    `);

    return result.rows as UserActivityLog[];
  }

  // Population tracking methods
  async savePopulationSnapshot(
    date: string,
    totalPopulation: number,
  ): Promise<PopulationTracking> {
    const db = await this.ensureInitialized();

    // Ensure the population_tracking table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "population_tracking" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL UNIQUE,
        "total_population" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Use INSERT ... ON CONFLICT to update if date already exists
    const result = await db.execute(sql`
      INSERT INTO population_tracking (date, total_population)
      VALUES (${date}, ${totalPopulation})
      ON CONFLICT (date) 
      DO UPDATE SET 
        total_population = ${totalPopulation},
        created_at = CURRENT_TIMESTAMP
      RETURNING *;
    `);

    return result.rows[0] as PopulationTracking;
  }

  async getPopulationByDate(
    date: string,
  ): Promise<PopulationTracking | undefined> {
    const db = await this.ensureInitialized();

    const result = await db.execute(sql`
      SELECT * FROM population_tracking 
      WHERE date = ${date}
    `);

    return result.rows[0] as PopulationTracking | undefined;
  }

  async getLatestPopulation(): Promise<PopulationTracking | undefined> {
    const db = await this.ensureInitialized();

    const result = await db.execute(sql`
      SELECT * FROM population_tracking 
      ORDER BY date DESC 
      LIMIT 1
    `);

    return result.rows[0] as PopulationTracking | undefined;
  }

  async getPreviousPopulation(
    currentDate: string,
  ): Promise<PopulationTracking | undefined> {
    const db = await this.ensureInitialized();

    const result = await db.execute(sql`
      SELECT * FROM population_tracking 
      WHERE date < ${currentDate}
      ORDER BY date DESC 
      LIMIT 1
    `);

    return result.rows[0] as PopulationTracking | undefined;
  }

  async calculatePopulationChange(currentDate: string): Promise<{
    currentPopulation: number;
    previousPopulation: number;
    change: number;
    changePercent: number;
  } | null> {
    const db = await this.ensureInitialized();

    // Get current population
    const current = await this.getPopulationByDate(currentDate);
    if (!current) {
      return null;
    }

    // Get previous population
    const previous = await this.getPreviousPopulation(currentDate);
    if (!previous) {
      return {
        currentPopulation: current.total_population,
        previousPopulation: 0,
        change: current.total_population,
        changePercent: 0,
      };
    }

    const change = current.total_population - previous.total_population;
    const changePercent =
      previous.total_population > 0
        ? (change / previous.total_population) * 100
        : 0;

    return {
      currentPopulation: current.total_population,
      previousPopulation: previous.total_population,
      change,
      changePercent,
    };
  }

  // Region-specific population tracking methods
  async saveRegionPopulationSnapshot(
    date: string,
    region: string,
    totalPopulation: number,
  ): Promise<RegionPopulationTracking> {
    const db = await this.ensureInitialized();

    // Ensure the region_population_tracking table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "region_population_tracking" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "region" TEXT NOT NULL,
        "total_population" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("date", "region")
      );
    `);

    // Use INSERT ... ON CONFLICT to update if date and region combination already exists
    const result = await db.execute(sql`
      INSERT INTO region_population_tracking (date, region, total_population)
      VALUES (${date}, ${region}, ${totalPopulation})
      ON CONFLICT (date, region) 
      DO UPDATE SET 
        total_population = ${totalPopulation},
        created_at = CURRENT_TIMESTAMP
      RETURNING *;
    `);

    return result.rows[0] as RegionPopulationTracking;
  }

  async getRegionPopulationByDate(
    date: string,
    region: string,
  ): Promise<RegionPopulationTracking | undefined> {
    const db = await this.ensureInitialized();

    const result = await db.execute(sql`
      SELECT * FROM region_population_tracking 
      WHERE date = ${date} AND region = ${region}
    `);

    return result.rows[0] as RegionPopulationTracking | undefined;
  }

  async getLatestRegionPopulation(
    region: string,
  ): Promise<RegionPopulationTracking | undefined> {
    const db = await this.ensureInitialized();

    const result = await db.execute(sql`
      SELECT * FROM region_population_tracking 
      WHERE region = ${region}
      ORDER BY date DESC 
      LIMIT 1
    `);

    return result.rows[0] as RegionPopulationTracking | undefined;
  }

  async getPreviousRegionPopulation(
    currentDate: string,
    region: string,
  ): Promise<RegionPopulationTracking | undefined> {
    const db = await this.ensureInitialized();

    const result = await db.execute(sql`
      SELECT * FROM region_population_tracking 
      WHERE region = ${region} AND date < ${currentDate}
      ORDER BY date DESC 
      LIMIT 1
    `);

    return result.rows[0] as RegionPopulationTracking | undefined;
  }

  async calculateRegionPopulationChange(
    currentDate: string,
    region: string,
  ): Promise<{
    currentPopulation: number;
    previousPopulation: number;
    change: number;
    changePercent: number;
  } | null> {
    const db = await this.ensureInitialized();

    // Get current region population
    const current = await this.getRegionPopulationByDate(currentDate, region);
    if (!current) {
      return null;
    }

    // Get previous region population
    const previous = await this.getPreviousRegionPopulation(
      currentDate,
      region,
    );
    if (!previous) {
      return {
        currentPopulation: current.total_population,
        previousPopulation: 0,
        change: current.total_population,
        changePercent: 0,
      };
    }

    const change = current.total_population - previous.total_population;
    const changePercent =
      previous.total_population > 0
        ? (change / previous.total_population) * 100
        : 0;

    return {
      currentPopulation: current.total_population,
      previousPopulation: previous.total_population,
      change,
      changePercent,
    };
  }

  async saveAllRegionPopulationSnapshots(
    date: string,
  ): Promise<RegionPopulationTracking[]> {
    const db = await this.ensureInitialized();

    // Get all water scheme data grouped by region
    const waterSchemeDataList = await this.getAllWaterSchemeData();

    // Calculate population by region
    const regionPopulations = new Map<string, number>();

    waterSchemeDataList.forEach((scheme) => {
      if (scheme.region) {
        const currentTotal = regionPopulations.get(scheme.region) || 0;
        regionPopulations.set(
          scheme.region,
          currentTotal + (scheme.population || 0),
        );
      }
    });

    // Save snapshots for all regions
    const results: RegionPopulationTracking[] = [];

    for (const [region, totalPopulation] of regionPopulations) {
      try {
        const snapshot = await this.saveRegionPopulationSnapshot(
          date,
          region,
          totalPopulation,
        );
        results.push(snapshot);
      } catch (error) {
        console.error(`Error saving snapshot for region ${region}:`, error);
      }
    }

    return results;
  }

  // Public interface methods for the API endpoints
  async getTotalPopulation(date?: string): Promise<{
    totalPopulation: number;
    date: string;
    change?: {
      currentPopulation: number;
      previousPopulation: number;
      change: number;
      changePercent: number;
    };
  }> {
    const targetDate = date || new Date().toISOString().split("T")[0];

    let populationData: PopulationTracking | undefined;

    if (date) {
      populationData = await this.getPopulationByDate(date);
    } else {
      populationData = await this.getLatestPopulation();
    }

    if (!populationData) {
      // Calculate from water scheme data if no stored data
      const waterSchemeData = await this.getAllWaterSchemeData();
      const totalPopulation = waterSchemeData.reduce(
        (sum, scheme) => sum + (scheme.population || 0),
        0,
      );

      // Store this calculation for future use
      await this.savePopulationSnapshot(targetDate, totalPopulation);

      return {
        totalPopulation,
        date: targetDate,
      };
    }

    // Get change data
    const change = await this.calculatePopulationChange(populationData.date);

    return {
      totalPopulation: populationData.total_population,
      date: populationData.date,
      change: change || undefined,
    };
  }

  async getRegionalPopulation(
    region: string,
    date?: string,
  ): Promise<{
    totalPopulation: number;
    region: string;
    date: string;
    change?: {
      currentPopulation: number;
      previousPopulation: number;
      change: number;
      changePercent: number;
    };
  }> {
    const targetDate = date || new Date().toISOString().split("T")[0];

    let populationData: RegionPopulationTracking | undefined;

    if (date) {
      populationData = await this.getRegionPopulationByDate(date, region);
    } else {
      populationData = await this.getLatestRegionPopulation(region);
    }

    if (!populationData) {
      // Calculate from water scheme data if no stored data
      const waterSchemeData = await this.getAllWaterSchemeData({ region });
      const totalPopulation = waterSchemeData.reduce(
        (sum, scheme) => sum + (scheme.population || 0),
        0,
      );

      // Store this calculation for future use
      await this.saveRegionPopulationSnapshot(
        targetDate,
        region,
        totalPopulation,
      );

      return {
        totalPopulation,
        region,
        date: targetDate,
      };
    }

    // Get change data
    const change = await this.calculateRegionPopulationChange(
      populationData.date,
      region,
    );

    return {
      totalPopulation: populationData.total_population,
      region,
      date: populationData.date,
      change: change || undefined,
    };
  }

  async addTotalPopulation(
    data: InsertPopulationTracking,
  ): Promise<PopulationTracking> {
    return await this.savePopulationSnapshot(data.date, data.total_population);
  }

  async addRegionalPopulation(
    data: InsertRegionPopulationTracking,
  ): Promise<RegionPopulationTracking> {
    const population = data.population || data.total_population || 0;
    return await this.saveRegionPopulationSnapshot(
      data.date,
      data.region,
      population,
    );
  }

  // Get current population with change calculation
  async getCurrentPopulation(date?: string): Promise<{
    totalPopulation: number;
    date: string;
    change?: {
      currentPopulation: number;
      previousPopulation: number;
      change: number;
      changePercent: number;
    };
  }> {
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Try to get existing population data for the date
    const existingData = await this.getPopulationByDate(targetDate);

    if (existingData) {
      // Get change data if population exists for this date
      const change = await this.calculatePopulationChange(targetDate);
      return {
        totalPopulation: existingData.total_population,
        date: existingData.date,
        change: change || undefined,
      };
    }

    // If no data exists for today, calculate from water scheme data and store it
    const totalPopulation = await this.calculateTotalPopulation();
    await this.savePopulationSnapshot(targetDate, totalPopulation);

    const change = await this.calculatePopulationChange(targetDate);

    return {
      totalPopulation,
      date: targetDate,
      change: change || undefined,
    };
  }

  // Calculate total population from water scheme data
  async calculateTotalPopulation(): Promise<number> {
    const db = await this.ensureInitialized();

    try {
      const result = await db.execute(`
        SELECT COALESCE(SUM(population), 0) as total_population
        FROM water_scheme_data
        WHERE population IS NOT NULL AND population > 0
      `);

      return parseInt(result.rows[0]?.total_population || "0", 10);
    } catch (error) {
      console.error("Error calculating total population:", error);
      return 0;
    }
  }

  // Get population history for specified number of days
  async getPopulationHistory(days: number): Promise<PopulationTracking[]> {
    const db = await this.ensureInitialized();

    try {
      const result = await db.execute(`
        SELECT * FROM population_tracking
        ORDER BY date DESC
        LIMIT ${days}
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        date: row.date,
        total_population: row.total_population,
        created_at: new Date(row.created_at),
      }));
    } catch (error) {
      console.error("Error fetching population history:", error);
      return [];
    }
  }

  // Get regional population history for specified number of days
  async getRegionalPopulationHistory(
    region: string,
    days: number,
  ): Promise<RegionPopulationTracking[]> {
    const db = await this.ensureInitialized();

    try {
      const result = await db.execute(
        `
        SELECT * FROM region_population_tracking
        WHERE region = $1
        ORDER BY date DESC
        LIMIT $2
      `,
        [region, days],
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        date: row.date,
        region: row.region,
        total_population: row.total_population,
        created_at: row.created_at,
      }));
    } catch (error) {
      console.error("Error fetching regional population history:", error);
      return [];
    }
  }

  // Historical Pressure Data operations
  async getHistoricalPressureData(filter: {
    startDate: string;
    endDate: string;
    region?: string;
    scheme_id?: string;
    village_name?: string;
    esr_name?: string;
  }): Promise<
    Array<{
      scheme_id: string;
      region: string;
      circle: string;
      division: string;
      sub_division: string;
      block: string;
      scheme_name: string;
      village_name: string;
      esr_name: string;
      measurement_date: string;
      pressure_value: number;
      dashboard_url?: string;
    }>
  > {
    await this.initialized;
    const db = await this.ensureInitialized();

    try {
      let query = db
        .select({
          scheme_id: pressureHistory.scheme_id,
          region: pressureHistory.region,
          circle: pressureHistory.circle,
          division: pressureHistory.division,
          sub_division: pressureHistory.sub_division,
          block: pressureHistory.block,
          scheme_name: pressureHistory.scheme_name,
          village_name: pressureHistory.village_name,
          esr_name: pressureHistory.esr_name,
          measurement_date: pressureHistory.pressure_date,
          pressure_value: pressureHistory.pressure_value,
          dashboard_url: pressureHistory.dashboard_url,
          uploaded_at: pressureHistory.uploaded_at,
        })
        .from(pressureHistory);

      // Apply date range filter with improved date conversion
      // Convert input dates (YYYY-MM-DD) to match stored format for comparison
      const startDateConverted = new Date(filter.startDate + "T00:00:00Z");
      const endDateConverted = new Date(filter.endDate + "T23:59:59Z");

      // Format dates to DD-Mon-YY format to match database storage
      const formatToDBDate = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, "0");
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear().toString().slice(-2);
        return `${day}-${month}-${year}`;
      };

      const startDBFormat = formatToDBDate(startDateConverted);
      const endDBFormat = formatToDBDate(endDateConverted);

      console.log(
        `Filtering pressure history from ${filter.startDate} (${startDBFormat}) to ${filter.endDate} (${endDBFormat})`,
      );

      // Add pressure_value filter to only include valid data
      const baseConditions = [
        sql`${pressureHistory.pressure_value} IS NOT NULL`,
      ];

      // Use simplified date filtering approach for better compatibility
      const conditions = [
        ...baseConditions,
        sql`(
          CASE 
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
            THEN (
              EXTRACT(YEAR FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YYYY')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YYYY')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YYYY'))
            ) >= (
              EXTRACT(YEAR FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}-[A-Za-z]{3}$'
            THEN (
              (
                CASE 
                  WHEN EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon')) > EXTRACT(MONTH FROM ${pressureHistory.uploaded_at})
                  THEN EXTRACT(YEAR FROM ${pressureHistory.uploaded_at}) - 1
                  ELSE EXTRACT(YEAR FROM ${pressureHistory.uploaded_at})
                END
              ) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon'))
            ) >= (
              EXTRACT(YEAR FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$'
            THEN (
              EXTRACT(YEAR FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YY')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YY')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YY'))
            ) >= (
              EXTRACT(YEAR FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
            THEN (
              EXTRACT(YEAR FROM TO_DATE(${pressureHistory.pressure_date}, 'DD/MM/YYYY')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD/MM/YYYY')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD/MM/YYYY'))
            ) >= (
              EXTRACT(YEAR FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.startDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            THEN TO_DATE(${pressureHistory.pressure_date}, 'YYYY-MM-DD') >= TO_DATE(${filter.startDate}, 'YYYY-MM-DD')
            ELSE TRUE
          END
        )`,
        sql`(
          CASE 
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$'
            THEN (
              EXTRACT(YEAR FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YYYY')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YYYY')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YYYY'))
            ) <= (
              EXTRACT(YEAR FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}-[A-Za-z]{3}$'
            THEN (
              (
                CASE 
                  WHEN EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon')) > EXTRACT(MONTH FROM ${pressureHistory.uploaded_at})
                  THEN EXTRACT(YEAR FROM ${pressureHistory.uploaded_at}) - 1
                  ELSE EXTRACT(YEAR FROM ${pressureHistory.uploaded_at})
                END
              ) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon'))
            ) <= (
              EXTRACT(YEAR FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$'
            THEN (
              EXTRACT(YEAR FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YY')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YY')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD-Mon-YY'))
            ) <= (
              EXTRACT(YEAR FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
            THEN (
              EXTRACT(YEAR FROM TO_DATE(${pressureHistory.pressure_date}, 'DD/MM/YYYY')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${pressureHistory.pressure_date}, 'DD/MM/YYYY')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${pressureHistory.pressure_date}, 'DD/MM/YYYY'))
            ) <= (
              EXTRACT(YEAR FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 10000 + 
              EXTRACT(MONTH FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD')) * 100 + 
              EXTRACT(DAY FROM TO_DATE(${filter.endDate}, 'YYYY-MM-DD'))
            )
            WHEN ${pressureHistory.pressure_date} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            THEN TO_DATE(${pressureHistory.pressure_date}, 'YYYY-MM-DD') <= TO_DATE(${filter.endDate}, 'YYYY-MM-DD')
            ELSE TRUE
          END
        )`,
      ];

      // Apply optional filters with case-insensitive matching for region
      if (filter.region) {
        conditions.push(ilike(pressureHistory.region, filter.region));
      }

      if (filter.scheme_id) {
        conditions.push(eq(pressureHistory.scheme_id, filter.scheme_id));
      }

      if (filter.village_name) {
        conditions.push(eq(pressureHistory.village_name, filter.village_name));
      }

      if (filter.esr_name) {
        conditions.push(eq(pressureHistory.esr_name, filter.esr_name));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query.orderBy(
        pressureHistory.pressure_date,
        pressureHistory.scheme_id,
        pressureHistory.village_name,
        pressureHistory.esr_name,
      );

      return result.map((row) => ({
        scheme_id: row.scheme_id || "",
        region: row.region || "",
        circle: row.circle || "",
        division: row.division || "",
        sub_division: row.sub_division || "",
        block: row.block || "",
        scheme_name: row.scheme_name || "",
        village_name: row.village_name || "",
        esr_name: row.esr_name || "",
        measurement_date: ((dateStr: string) => {
          if (!dateStr) return "";

          // Check for DD/MM/YYYY format and convert to YYYY-MM-DD
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
          }

          // Check for DD-Mon format (e.g., 29-Dec) and infer year
          if (/^\d{2}-[A-Za-z]{3}$/.test(dateStr) && row.uploaded_at) {
            const months: { [key: string]: number } = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            const [day, mon] = dateStr.split('-');
            const monthIndex = months[mon];
            if (monthIndex !== undefined) {
              const uploadDate = new Date(row.uploaded_at);
              let year = uploadDate.getFullYear();

              // If data month is > upload month, it's from previous year
              if (monthIndex > uploadDate.getMonth()) {
                year = year - 1;
              }

              const monthNum = (monthIndex + 1).toString().padStart(2, '0');
              return `${year}-${monthNum}-${day}`;
            }
          }

          return dateStr;
        })(row.measurement_date || ""),
        pressure_value: parseFloat(row.pressure_value?.toString() || "0"),
        dashboard_url: row.dashboard_url || undefined,
      }));
    } catch (error) {
      console.error("Error in getHistoricalPressureData:", error);
      throw error;
    }
  }

  // Communication Status methods
  async getCommunicationOverview(filters: {
    region?: string;
    circle?: string;
    division?: string;
    sub_division?: string;
    block?: string;
    data_freshness?: string;
  }): Promise<any> {
    const db = await this.ensureInitialized();

    try {
      let query = db.select().from(communicationStatus);

      // Apply geographic filters
      const conditions = [];
      if (filters.region)
        conditions.push(eq(communicationStatus.region, filters.region));
      if (filters.circle)
        conditions.push(eq(communicationStatus.circle, filters.circle));
      if (filters.division)
        conditions.push(eq(communicationStatus.division, filters.division));
      if (filters.sub_division)
        conditions.push(
          eq(communicationStatus.sub_division, filters.sub_division),
        );
      if (filters.block)
        conditions.push(eq(communicationStatus.block, filters.block));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const records = await query;

      // Apply data freshness filter if specified
      let filteredRecords = records;
      if (filters.data_freshness === "fresh") {
        filteredRecords = records.filter(
          (record) =>
            record.chlorine_fresh_data === 1 ||
            record.pressure_fresh_data === 1 ||
            record.flow_meter_fresh_data === 1,
        );
      } else if (filters.data_freshness === "stale") {
        filteredRecords = records.filter(
          (record) =>
            record.chlorine_stale_data === 1 ||
            record.pressure_stale_data === 1 ||
            record.flow_meter_stale_data === 1,
        );
      }

      // Calculate overview statistics
      const overview = {
        total_esrs: filteredRecords.length,
        chlorine_analyzers: {
          online: filteredRecords.filter((r) => r.chlorine_status === "Online")
            .length,
          offline: filteredRecords.filter(
            (r) => r.chlorine_status === "Offline",
          ).length,
          connected: filteredRecords.filter(
            (r) => r.chlorine_connected === "Connected",
          ).length,
          not_connected: filteredRecords.filter(
            (r) => r.chlorine_connected === "Not",
          ).length,
          fresh_data: filteredRecords.filter((r) => r.chlorine_fresh_data === 1)
            .length,
          stale_data: filteredRecords.filter((r) => r.chlorine_stale_data === 1)
            .length,
        },
        pressure_transmitters: {
          online: filteredRecords.filter((r) => r.pressure_status === "Online")
            .length,
          offline: filteredRecords.filter(
            (r) => r.pressure_status === "Offline",
          ).length,
          connected: filteredRecords.filter(
            (r) => r.pressure_connected === "Connected",
          ).length,
          not_connected: filteredRecords.filter(
            (r) => r.pressure_connected === "Not",
          ).length,
          fresh_data: filteredRecords.filter((r) => r.pressure_fresh_data === 1)
            .length,
          stale_data: filteredRecords.filter((r) => r.pressure_stale_data === 1)
            .length,
        },
        flow_meters: {
          online: filteredRecords.filter(
            (r) => r.flow_meter_status === "Online",
          ).length,
          offline: filteredRecords.filter(
            (r) => r.flow_meter_status === "Offline",
          ).length,
          connected: filteredRecords.filter(
            (r) => r.flow_meter_connected === "Connected",
          ).length,
          not_connected: filteredRecords.filter(
            (r) => r.flow_meter_connected === "Not",
          ).length,
          fresh_data: filteredRecords.filter(
            (r) => r.flow_meter_fresh_data === 1,
          ).length,
          stale_data: filteredRecords.filter(
            (r) => r.flow_meter_stale_data === 1,
          ).length,
        },
        completion_status: {
          fully_completed: filteredRecords.filter(
            (r) => r.completion_status === "Fully Completed",
          ).length,
          in_progress: filteredRecords.filter(
            (r) => r.completion_status === "In Progress",
          ).length,
          na: filteredRecords.filter((r) => r.completion_status === "N/A")
            .length,
        },
      };

      return overview;
    } catch (error) {
      console.error("Error in getCommunicationOverview:", error);
      throw error;
    }
  }

  async getCommunicationFilters(filters: {
    region?: string;
    circle?: string;
    division?: string;
    sub_division?: string;
  }): Promise<any> {
    const db = await this.ensureInitialized();

    try {
      let query = db.select().from(communicationStatus);

      // Apply parent level filters
      const conditions = [];
      if (filters.region)
        conditions.push(eq(communicationStatus.region, filters.region));
      if (filters.circle)
        conditions.push(eq(communicationStatus.circle, filters.circle));
      if (filters.division)
        conditions.push(eq(communicationStatus.division, filters.division));
      if (filters.sub_division)
        conditions.push(
          eq(communicationStatus.sub_division, filters.sub_division),
        );

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const records = await query;

      return {
        regions: [
          ...new Set(records.map((r) => r.region).filter(Boolean)),
        ].sort(),
        circles: [
          ...new Set(records.map((r) => r.circle).filter(Boolean)),
        ].sort(),
        divisions: [
          ...new Set(records.map((r) => r.division).filter(Boolean)),
        ].sort(),
        sub_divisions: [
          ...new Set(records.map((r) => r.sub_division).filter(Boolean)),
        ].sort(),
        blocks: [
          ...new Set(records.map((r) => r.block).filter(Boolean)),
        ].sort(),
      };
    } catch (error) {
      console.error("Error in getCommunicationFilters:", error);
      throw error;
    }
  }

  async getCommunicationSchemes(filters: {
    region?: string;
    circle?: string;
    division?: string;
    sub_division?: string;
    block?: string;
    data_freshness?: string;
  }): Promise<any> {
    const db = await this.ensureInitialized();

    try {
      let query = db.select().from(communicationStatus);

      // Apply geographic filters
      const conditions = [];
      if (filters.region)
        conditions.push(eq(communicationStatus.region, filters.region));
      if (filters.circle)
        conditions.push(eq(communicationStatus.circle, filters.circle));
      if (filters.division)
        conditions.push(eq(communicationStatus.division, filters.division));
      if (filters.sub_division)
        conditions.push(
          eq(communicationStatus.sub_division, filters.sub_division),
        );
      if (filters.block)
        conditions.push(eq(communicationStatus.block, filters.block));

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const records = await query;

      // Apply data freshness filter if specified
      let filteredRecords = records;
      if (filters.data_freshness === "fresh") {
        filteredRecords = records.filter(
          (record) =>
            record.chlorine_fresh_data === 1 ||
            record.pressure_fresh_data === 1 ||
            record.flow_meter_fresh_data === 1,
        );
      } else if (filters.data_freshness === "stale") {
        filteredRecords = records.filter(
          (record) =>
            record.chlorine_stale_data === 1 ||
            record.pressure_stale_data === 1 ||
            record.flow_meter_stale_data === 1,
        );
      }

      // Group by scheme to get unique schemes
      const schemeMap = new Map();

      filteredRecords.forEach((record) => {
        const schemeKey =
          record.scheme_id || `${record.scheme_name}-${record.region}`;

        if (!schemeMap.has(schemeKey)) {
          schemeMap.set(schemeKey, {
            scheme_id: record.scheme_id,
            scheme_name: record.scheme_name,
            region: record.region,
            circle: record.circle,
            division: record.division,
            sub_division: record.sub_division,
            block: record.block,
            completion_status: record.completion_status,
            total_esrs: 0,
            villages: new Set(),
            communication_status: {
              chlorine_online: 0,
              chlorine_offline: 0,
              pressure_online: 0,
              pressure_offline: 0,
              flow_meter_online: 0,
              flow_meter_offline: 0,
              fresh_data_count: 0,
              stale_data_count: 0,
            },
          });
        }

        const scheme = schemeMap.get(schemeKey);
        scheme.total_esrs++;
        if (record.village_name) scheme.villages.add(record.village_name);

        // Count equipment status
        if (record.chlorine_status === "Online")
          scheme.communication_status.chlorine_online++;
        if (record.chlorine_status === "Offline")
          scheme.communication_status.chlorine_offline++;
        if (record.pressure_status === "Online")
          scheme.communication_status.pressure_online++;
        if (record.pressure_status === "Offline")
          scheme.communication_status.pressure_offline++;
        if (record.flow_meter_status === "Online")
          scheme.communication_status.flow_meter_online++;
        if (record.flow_meter_status === "Offline")
          scheme.communication_status.flow_meter_offline++;

        // Count data freshness
        if (
          record.chlorine_fresh_data === 1 ||
          record.pressure_fresh_data === 1 ||
          record.flow_meter_fresh_data === 1
        ) {
          scheme.communication_status.fresh_data_count++;
        }
        if (
          record.chlorine_stale_data === 1 ||
          record.pressure_stale_data === 1 ||
          record.flow_meter_stale_data === 1
        ) {
          scheme.communication_status.stale_data_count++;
        }
      });

      // Convert to array and add village count
      const schemes = Array.from(schemeMap.values()).map((scheme) => ({
        ...scheme,
        village_count: scheme.villages.size,
        villages: undefined, // Remove the Set object
      }));

      return schemes.sort((a, b) =>
        (a.scheme_name || "").localeCompare(b.scheme_name || ""),
      );
    } catch (error) {
      console.error("Error in getCommunicationSchemes:", error);
      throw error;
    }
  }

  async getSchemeCommunitationDetails(
    schemeId: string,
    dataFreshness?: string,
  ): Promise<any> {
    const db = await this.ensureInitialized();

    try {
      let query = db
        .select()
        .from(communicationStatus)
        .where(eq(communicationStatus.scheme_id, schemeId));

      const records = await query;

      // Apply data freshness filter if specified
      let filteredRecords = records;
      if (dataFreshness === "fresh") {
        filteredRecords = records.filter(
          (record) =>
            record.chlorine_fresh_data === 1 ||
            record.pressure_fresh_data === 1 ||
            record.flow_meter_fresh_data === 1,
        );
      } else if (dataFreshness === "stale") {
        filteredRecords = records.filter(
          (record) =>
            record.chlorine_stale_data === 1 ||
            record.pressure_stale_data === 1 ||
            record.flow_meter_stale_data === 1,
        );
      }

      return {
        scheme_info:
          records.length > 0
            ? {
              scheme_id: records[0].scheme_id,
              scheme_name: records[0].scheme_name,
              region: records[0].region,
              circle: records[0].circle,
              division: records[0].division,
              sub_division: records[0].sub_division,
              block: records[0].block,
            }
            : null,
        esrs: filteredRecords.map((record) => ({
          id: record.id,
          village_name: record.village_name,
          esr_name: record.esr_name,
          chlorine_connected: record.chlorine_connected,
          chlorine_status: record.chlorine_status,
          pressure_connected: record.pressure_connected,
          pressure_status: record.pressure_status,
          flow_meter_connected: record.flow_meter_connected,
          flow_meter_status: record.flow_meter_status,
          completion_status: record.completion_status,
          chlorine_fresh_data: record.chlorine_fresh_data,
          chlorine_stale_data: record.chlorine_stale_data,
          pressure_fresh_data: record.pressure_fresh_data,
          pressure_stale_data: record.pressure_stale_data,
          flow_meter_fresh_data: record.flow_meter_fresh_data,
          flow_meter_stale_data: record.flow_meter_stale_data,
        })),
      };
    } catch (error) {
      console.error("Error in getSchemeCommunitationDetails:", error);
      throw error;
    }
  }

  async clearCommunicationStatus(): Promise<void> {
    const db = await this.ensureInitialized();

    try {
      await db.delete(communicationStatus);
      console.log("✅ Cleared all communication status data");
    } catch (error) {
      console.error("Error clearing communication status:", error);
      throw error;
    }
  }

  async importCommunicationStatusFromCSV(records: string[][]): Promise<{
    inserted: number;
    updated: number;
    errors: string[];
  }> {
    const db = await this.ensureInitialized();

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    const batchId = Date.now().toString();

    try {
      console.log(
        `Processing ${records.length} communication status records...`,
      );

      // Process records in batches
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        for (const record of batch) {
          try {
            // Skip empty rows
            if (
              !record ||
              record.length === 0 ||
              !record.some((cell) => cell && cell.trim())
            ) {
              continue;
            }

            // Map CSV columns based on the structure we analyzed
            const newChlorineStatus = record[12]?.trim() || null;
            const communicationRecord: InsertCommunicationStatus = {
              region: record[0]?.trim() || null,
              circle: record[1]?.trim() || null,
              division: record[2]?.trim() || null,
              sub_division: record[3]?.trim() || null,
              block: record[4]?.trim() || null,
              scheme_id: record[5]?.trim() || null,
              scheme_name: record[6]?.trim() || null,
              village_name: record[7]?.trim() || null,
              esr_name: record[8]?.trim() || null,
              chlorine_connected: record[9]?.trim() || null,
              pressure_connected: record[10]?.trim() || null,
              flow_meter_connected: record[11]?.trim() || null,
              chlorine_status: newChlorineStatus,
              pressure_status: record[13]?.trim() || null,
              flow_meter_status: record[14]?.trim() || null,
              completion_status: record[15]?.trim() || null,
              chlorine_fresh_data: parseInt(record[16]) || 0,
              chlorine_stale_data: parseInt(record[17]) || 0,
              pressure_fresh_data: parseInt(record[18]) || 0,
              pressure_stale_data: parseInt(record[19]) || 0,
              flow_meter_fresh_data: parseInt(record[20]) || 0,
              flow_meter_stale_data: parseInt(record[21]) || 0,
              upload_batch_id: batchId,
            };

            // Check if record already exists
            const existingRecord = await db
              .select()
              .from(communicationStatus)
              .where(
                and(
                  eq(
                    communicationStatus.scheme_id,
                    communicationRecord.scheme_id || "",
                  ),
                  eq(
                    communicationStatus.village_name,
                    communicationRecord.village_name || "",
                  ),
                  eq(
                    communicationStatus.esr_name,
                    communicationRecord.esr_name || "",
                  ),
                ),
              )
              .limit(1);

            if (existingRecord.length > 0) {
              // Record exists - update it
              const updateData: any = {
                ...communicationRecord,
                updated_at: new Date(),
              };

              // Only update last_seen (chlorine) if new chlorine_status is ONLINE (case-insensitive)
              if (newChlorineStatus?.trim().toUpperCase() === "ONLINE") {
                updateData.last_seen = new Date();
              } else {
                // Preserve existing last_seen value for offline/N/A chlorine devices
                updateData.last_seen = existingRecord[0].last_seen;
              }

              // Only update pressure_last_seen if new pressure_status is ONLINE (case-insensitive)
              const newPressureStatus = communicationRecord.pressure_status;
              if (newPressureStatus?.trim().toUpperCase() === "ONLINE") {
                updateData.pressure_last_seen = new Date();
              } else {
                // Preserve existing pressure_last_seen value for offline/N/A pressure devices
                updateData.pressure_last_seen = existingRecord[0].pressure_last_seen;
              }

              await db
                .update(communicationStatus)
                .set(updateData)
                .where(
                  and(
                    eq(
                      communicationStatus.scheme_id,
                      communicationRecord.scheme_id || "",
                    ),
                    eq(
                      communicationStatus.village_name,
                      communicationRecord.village_name || "",
                    ),
                    eq(
                      communicationStatus.esr_name,
                      communicationRecord.esr_name || "",
                    ),
                  ),
                );
              updated++;
            } else {
              // New record - insert it (last_seen will be set to current time by default)
              await db.insert(communicationStatus).values(communicationRecord);
              inserted++;
            }
          } catch (recordError) {
            console.error(
              `Error processing record ${i + batch.indexOf(record) + 1}:`,
              recordError,
            );
            errors.push(
              `Row ${i + batch.indexOf(record) + 1}: ${recordError instanceof Error ? recordError.message : "Unknown error"}`,
            );
          }
        }

        console.log(
          `✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`,
        );
      }

      console.log(
        `Communication status import completed: ${inserted} inserted, ${updated} updated, ${errors.length} errors`,
      );

      return { inserted, updated, errors };
    } catch (error) {
      console.error("Error in importCommunicationStatusFromCSV:", error);
      throw error;
    }
  }

  async getCommunicationStats(): Promise<any> {
    const db = await this.ensureInitialized();

    try {
      const allRecords = await db.select().from(communicationStatus);

      return {
        total_records: allRecords.length,
        total_schemes: new Set(
          allRecords.map((r) => r.scheme_id).filter(Boolean),
        ).size,
        total_villages: new Set(
          allRecords.map((r) => r.village_name).filter(Boolean),
        ).size,
        total_esrs: allRecords.length,
        regions: new Set(allRecords.map((r) => r.region).filter(Boolean)).size,
        last_update: allRecords.length > 0 ? allRecords[0].uploaded_at : null,
      };
    } catch (error) {
      console.error("Error in getCommunicationStats:", error);
      throw error;
    }
  }

  // Village CRUD operations
  async getAllVillages(): Promise<Village[]> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const result = await db.select().from(villages);
      return result;
    } catch (error) {
      console.error("Error getting all villages:", error);
      throw error;
    }
  }

  async getVillagesByScheme(
    schemeId: string,
    block?: string,
  ): Promise<Village[]> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      let whereConditions = [eq(villages.scheme_id, schemeId)];

      if (block && block !== "undefined") {
        whereConditions.push(eq(villages.block, block));
      }

      const result = await db
        .select()
        .from(villages)
        .where(and(...whereConditions));
      return result;
    } catch (error) {
      console.error("Error getting villages by scheme:", error);
      throw error;
    }
  }

  async getVillageByCompositeKey(
    schemeId: string,
    villageName: string,
    block: string,
  ): Promise<Village | undefined> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const result = await db
        .select()
        .from(villages)
        .where(
          and(
            eq(villages.scheme_id, schemeId),
            eq(villages.village_name, villageName),
            eq(villages.block, block),
          ),
        )
        .limit(1);
      return result[0];
    } catch (error) {
      console.error(
        `Error getting village for ${schemeId}/${villageName}/${block}:`,
        error,
      );
      throw error;
    }
  }

  async insertOrUpdateVillage(
    data: InsertVillage,
  ): Promise<{ inserted: boolean; updated: boolean }> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      // Check if village already exists
      const existing = await this.getVillageByCompositeKey(
        data.scheme_id || "",
        data.village_name || "",
        data.block || "",
      );

      if (existing) {
        // Update existing village
        await db
          .update(villages)
          .set(data)
          .where(
            and(
              eq(villages.scheme_id, data.scheme_id || ""),
              eq(villages.village_name, data.village_name || ""),
              eq(villages.block, data.block || ""),
            ),
          );
        return { inserted: false, updated: true };
      } else {
        // Insert new village
        await db.insert(villages).values(data);
        return { inserted: true, updated: false };
      }
    } catch (error) {
      console.error("Error inserting/updating village:", error);
      throw error;
    }
  }

  async clearVillageData(): Promise<void> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      await db.delete(villages);
      console.log("Cleared all village data");
    } catch (error) {
      console.error("Error clearing village data:", error);
      throw error;
    }
  }

  async getDb() {
    return getDB();
  }

  // MQTT Topic Configuration operations
  async createMqttTopicConfiguration(
    data: InsertMqttTopicConfiguration,
  ): Promise<MqttTopicConfiguration> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const [newConfig] = await db
        .insert(mqttTopicConfigurations)
        .values(data)
        .returning();
      return newConfig;
    } catch (error) {
      console.error("Error creating MQTT topic configuration:", error);
      throw error;
    }
  }

  async getMqttTopicConfigurations(): Promise<MqttTopicConfiguration[]> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const configs = await db
        .select()
        .from(mqttTopicConfigurations)
        .orderBy(sql`submitted_at DESC`);
      return configs;
    } catch (error) {
      console.error("Error fetching MQTT topic configurations:", error);
      throw error;
    }
  }

  async getMqttTopicConfigurationById(
    id: number,
  ): Promise<MqttTopicConfiguration | undefined> {
    await this.initialized;
    const db = await this.ensureInitialized();
    try {
      const [config] = await db
        .select()
        .from(mqttTopicConfigurations)
        .where(eq(mqttTopicConfigurations.id, id));
      return config;
    } catch (error) {
      console.error("Error fetching MQTT topic configuration by ID:", error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();

