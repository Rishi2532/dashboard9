import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp,
  varchar,
  decimal,
  unique,
  primaryKey,
  bigint,
  date,
  time,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with admin role
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  role: true,
});

export const registerUserSchema = insertUserSchema
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    email: z.string().email("Please enter a valid email address").optional(),
    phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterCredentials = z.infer<typeof registerUserSchema>;

// Region table - using the correct table name "region" instead of "regions"
export const regions = pgTable("region", {
  region_id: serial("region_id").primaryKey(),
  region_name: text("region_name").notNull(),
  total_esr_integrated: integer("total_esr_integrated"),
  fully_completed_esr: integer("fully_completed_esr"),
  partial_esr: integer("partial_esr"),
  total_villages_integrated: integer("total_villages_integrated"),
  fully_completed_villages: integer("fully_completed_villages"),
  total_schemes_integrated: integer("total_schemes_integrated"),
  fully_completed_schemes: integer("fully_completed_schemes"),
  flow_meter_integrated: integer("flow_meter_integrated"),
  rca_integrated: integer("rca_integrated"),
  pressure_transmitter_integrated: integer("pressure_transmitter_integrated"),
}, (table) => {
  return {
    regionNameUnique: unique().on(table.region_name),
  };
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  region_id: true,
});

export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

// Region history table to track daily updates
export const regionHistory = pgTable("region_history", {
  id: serial("id").primaryKey(),
  region_name: text("region_name").notNull(),
  total_esr_integrated: integer("total_esr_integrated"),
  fully_completed_esr: integer("fully_completed_esr"),
  partial_esr: integer("partial_esr"),
  total_villages_integrated: integer("total_villages_integrated"),
  fully_completed_villages: integer("fully_completed_villages"),
  total_schemes_integrated: integer("total_schemes_integrated"),
  fully_completed_schemes: integer("fully_completed_schemes"),
  flow_meter_integrated: integer("flow_meter_integrated"),
  rca_integrated: integer("rca_integrated"),
  pressure_transmitter_integrated: integer("pressure_transmitter_integrated"),
  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
  data_month: date("data_month"),
});

export const insertRegionHistorySchema = createInsertSchema(regionHistory).omit({
  id: true,
  uploaded_at: true,
});

export type InsertRegionHistory = z.infer<typeof insertRegionHistorySchema>;
export type RegionHistory = typeof regionHistory.$inferSelect;

// SchemeStatus table - with updated structure as per requirements
export const schemeStatuses = pgTable("scheme_status", {
  sr_no: integer("sr_no"), // Serial number - can be used as a unique identifier
  scheme_id: text("scheme_id").notNull(), // Scheme ID (not primary key)
  region: text("region"), // Region name
  circle: text("circle"), // Circle
  division: text("division"), // Division
  sub_division: text("sub_division"), // Sub Division
  block: text("block"), // Block
  scheme_name: text("scheme_name").notNull(), // Scheme Name
  agency: text("agency"), // Agency that manages the scheme
  number_of_village: integer("number_of_village"), // Number of village
  total_villages_integrated: integer("total_villages_integrated"), // Total Villages Integrated

  no_of_functional_village: integer("no_of_functional_village"), // No. of Functional Village
  no_of_partial_village: integer("no_of_partial_village"), // No. of Partial Village
  no_of_non_functional_village: integer("no_of_non_functional_village"), // No. of Non-Functional Village
  fully_completed_villages: integer("fully_completed_villages"), // Fully completed Villages
  total_number_of_esr: integer("total_number_of_esr"), // Total Number of ESR
  scheme_functional_status: text("scheme_functional_status"), // Scheme Functional Status
  total_esr_integrated: integer("total_esr_integrated"), // Total ESR Integrated on IoT
  no_fully_completed_esr: integer("no_fully_completed_esr"), // No. Fully Completed ESR
  balance_to_complete_esr: integer("balance_to_complete_esr"), // Balance to Complete ESR
  flow_meters_connected: integer("flow_meters_connected"), // Flow Meters C
  pressure_transmitter_connected: integer("pressure_transmitter_connected"), // Pressure Transmitter Connected

  residual_chlorine_analyzer_connected: integer(
    "residual_chlorine_analyzer_connected",
  ), // Residual Chlorine Analyzer Connected

  fully_completion_scheme_status: text("fully_completion_scheme_status"), // Scheme Status (Fully Completion Scheme Status)
  mjp_commissioned: text("mjp_commissioned"), // Whether the scheme was commissioned by MJP (Yes/No)
  mjp_fully_completed: text("mjp_fully_completed"), // MJP fully completed status (Fully Completed/In Progress)
  water_supply: text("water_supply"), // Water Supply status (Yes/No/etc.)
  agency_type: text("agency_type"), // Agency type: MJP or ZP
  water_supply_status: text("water_supply_status"), // Full, Partial, or No
  dashboard_url: text("dashboard_url"), // URL to access the PI Vision dashboard for this scheme
  // No primary key - allows multiple entries with the same scheme_id and block
}, (table) => {
  return {
    schemeIdBlockUnique: unique().on(table.scheme_id, table.block),
  };
});

export const insertSchemeStatusSchema = createInsertSchema(schemeStatuses);
export const updateSchemeStatusSchema = createInsertSchema(schemeStatuses);

export type InsertSchemeStatus = z.infer<typeof insertSchemeStatusSchema>;
export type UpdateSchemeStatus = z.infer<typeof updateSchemeStatusSchema>;
export type SchemeStatus = typeof schemeStatuses.$inferSelect;

// SchemeStatus history table to track daily updates
export const schemeStatusHistory = pgTable("scheme_status_history", {
  id: serial("id").primaryKey(),
  sr_no: integer("sr_no"),
  scheme_id: text("scheme_id").notNull(),
  region: text("region"),
  circle: text("circle"),
  division: text("division"),
  sub_division: text("sub_division"),
  block: text("block"),
  scheme_name: text("scheme_name").notNull(),
  agency: text("agency"),
  number_of_village: integer("number_of_village"),
  total_villages_integrated: integer("total_villages_integrated"),
  no_of_functional_village: integer("no_of_functional_village"),
  no_of_partial_village: integer("no_of_partial_village"),
  no_of_non_functional_village: integer("no_of_non_functional_village"),
  fully_completed_villages: integer("fully_completed_villages"),
  total_number_of_esr: integer("total_number_of_esr"),
  scheme_functional_status: text("scheme_functional_status"),
  total_esr_integrated: integer("total_esr_integrated"),
  no_fully_completed_esr: integer("no_fully_completed_esr"),
  balance_to_complete_esr: integer("balance_to_complete_esr"),
  flow_meters_connected: integer("flow_meters_connected"),
  pressure_transmitter_connected: integer("pressure_transmitter_connected"),
  residual_chlorine_analyzer_connected: integer("residual_chlorine_analyzer_connected"),
  fully_completion_scheme_status: text("fully_completion_scheme_status"),
  mjp_commissioned: text("mjp_commissioned"),
  mjp_fully_completed: text("mjp_fully_completed"),
  water_supply: text("water_supply"),
  agency_type: text("agency_type"),
  water_supply_status: text("water_supply_status"),
  dashboard_url: text("dashboard_url"),
  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertSchemeStatusHistorySchema = createInsertSchema(schemeStatusHistory).omit({
  id: true,
  uploaded_at: true,
});

export type InsertSchemeStatusHistory = z.infer<typeof insertSchemeStatusHistorySchema>;
export type SchemeStatusHistory = typeof schemeStatusHistory.$inferSelect;

// App state table for storing persistent application state
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertAppStateSchema = createInsertSchema(appState);

export type InsertAppState = z.infer<typeof insertAppStateSchema>;
export type AppState = typeof appState.$inferSelect;

// Help Desk Tickets table
export const helpdeskTickets = pgTable("helpdesk_tickets", {
  id: serial("id").primaryKey(),
  ticket_id: varchar("ticket_id", { length: 20 }).notNull().unique(), // HD-000001 format
  title: text("title").notNull(),
  category: text("category").notNull(),
  specific_issue: text("specific_issue").notNull(),
  description: text("description").notNull(),

  // Geographic hierarchy
  level: text("level").notNull(), // Region/Circle/Division/Subdivision/Block/Scheme/Village/ESR
  region: text("region"),
  circle: text("circle"),
  division: text("division"),
  subdivision: text("subdivision"),
  block: text("block"),
  scheme_id: text("scheme_id"),
  scheme_name: text("scheme_name"),
  village_name: text("village_name"),
  esr_name: text("esr_name"),

  // Priority and status
  priority: text("priority").notNull().default("Medium"), // Low/Medium/High
  status: text("status").notNull().default("Open"), // Open/In-Progress/Resolved/Closed

  // Contact information
  contact_name: text("contact_name").notNull(),
  contact_phone: text("contact_phone"),
  contact_email: text("contact_email").notNull(),

  // Dashboard link for navigation
  dashboard_url: text("dashboard_url"), // URL link for admin/user to navigate to related dashboard

  // User who created the ticket
  created_by: integer("created_by").notNull(),

  // File attachment path
  attachment_path: text("attachment_path"),
  attachment_filename: text("attachment_filename"),

  // Admin comments
  admin_comments: text("admin_comments"),

  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHelpdeskTicketSchema = createInsertSchema(helpdeskTickets).omit({
  id: true,
  ticket_id: true,
  created_at: true,
  updated_at: true,
});

export const updateHelpdeskTicketSchema = createInsertSchema(helpdeskTickets).omit({
  id: true,
  ticket_id: true,
  created_by: true,
  created_at: true,
}).partial();

export type InsertHelpdeskTicket = z.infer<typeof insertHelpdeskTicketSchema>;
export type UpdateHelpdeskTicket = z.infer<typeof updateHelpdeskTicketSchema>;
export type HelpdeskTicket = typeof helpdeskTickets.$inferSelect;

// Help Desk Attachments table for multiple file uploads
export const helpdeskAttachments = pgTable("helpdesk_attachments", {
  id: serial("id").primaryKey(),
  ticket_id: integer("ticket_id").notNull().references(() => helpdeskTickets.id, { onDelete: "cascade" }),
  original_filename: text("original_filename").notNull(),
  stored_filename: text("stored_filename").notNull(),
  file_path: text("file_path").notNull(),
  file_size: integer("file_size").notNull(),
  mime_type: text("mime_type").notNull(),
  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertHelpdeskAttachmentSchema = createInsertSchema(helpdeskAttachments).omit({
  id: true,
  uploaded_at: true,
});

export type InsertHelpdeskAttachment = z.infer<typeof insertHelpdeskAttachmentSchema>;
export type HelpdeskAttachment = typeof helpdeskAttachments.$inferSelect;

// Water Scheme Data table for LPCD tracking
export const waterSchemeData = pgTable(
  "water_scheme_data",
  {
    // Region information
    region: text("region"),
    circle: text("circle"),
    division: text("division"),
    sub_division: text("sub_division"),
    block: text("block"),

    // Scheme identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: text("scheme_name"),
    village_name: text("village_name"),

    // Population and infrastructure
    population: integer("population"),
    number_of_esr: integer("number_of_esr"),

    // Water values for different days (no precision constraints to handle overflow)
    water_value_day1: decimal("water_value_day1"),
    water_value_day2: decimal("water_value_day2"),
    water_value_day3: decimal("water_value_day3"),
    water_value_day4: decimal("water_value_day4"),
    water_value_day5: decimal("water_value_day5"),
    water_value_day6: decimal("water_value_day6"),
    water_value_day7: decimal("water_value_day7"),

    // LPCD values for different days (no precision constraints to handle overflow)
    lpcd_value_day1: decimal("lpcd_value_day1"),
    lpcd_value_day2: decimal("lpcd_value_day2"),
    lpcd_value_day3: decimal("lpcd_value_day3"),
    lpcd_value_day4: decimal("lpcd_value_day4"),
    lpcd_value_day5: decimal("lpcd_value_day5"),
    lpcd_value_day6: decimal("lpcd_value_day6"),
    lpcd_value_day7: decimal("lpcd_value_day7"),

    // Dates for water measurements
    water_date_day1: varchar("water_date_day1", { length: 20 }),
    water_date_day2: varchar("water_date_day2", { length: 20 }),
    water_date_day3: varchar("water_date_day3", { length: 20 }),
    water_date_day4: varchar("water_date_day4", { length: 20 }),
    water_date_day5: varchar("water_date_day5", { length: 20 }),
    water_date_day6: varchar("water_date_day6", { length: 20 }),
    water_date_day7: varchar("water_date_day7", { length: 20 }),

    // Dates for LPCD measurements
    lpcd_date_day1: varchar("lpcd_date_day1", { length: 20 }),
    lpcd_date_day2: varchar("lpcd_date_day2", { length: 20 }),
    lpcd_date_day3: varchar("lpcd_date_day3", { length: 20 }),
    lpcd_date_day4: varchar("lpcd_date_day4", { length: 20 }),
    lpcd_date_day5: varchar("lpcd_date_day5", { length: 20 }),
    lpcd_date_day6: varchar("lpcd_date_day6", { length: 20 }),
    lpcd_date_day7: varchar("lpcd_date_day7", { length: 20 }),

    // Status counters
    consistent_zero_lpcd_for_a_week: integer("consistent_zero_lpcd_for_a_week"),
    below_55_lpcd_count: integer("below_55_lpcd_count"),
    above_55_lpcd_count: integer("above_55_lpcd_count"),

    // Dashboard URL for PI Vision integration
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      // Use composite primary key including block to allow same village in different blocks
      pk: primaryKey({
        columns: [table.scheme_id, table.village_name, table.block],
      }),
    };
  },
);

export const insertWaterSchemeDataSchema = createInsertSchema(waterSchemeData);
export const updateWaterSchemeDataSchema = createInsertSchema(
  waterSchemeData,
).omit({
  scheme_id: true,
});

export type InsertWaterSchemeData = z.infer<typeof insertWaterSchemeDataSchema>;
export type UpdateWaterSchemeData = z.infer<typeof updateWaterSchemeDataSchema>;
export type WaterSchemeData = typeof waterSchemeData.$inferSelect;

// Water Scheme Data History table for permanent historical storage
export const waterSchemeDataHistory = pgTable(
  "water_scheme_data_history",
  {
    id: serial("id").primaryKey(),

    // Location information
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    population: integer("population"),
    number_of_esr: integer("number_of_esr"),

    // Single day data
    data_date: varchar("data_date", { length: 15 }).notNull(),
    water_value: decimal("water_value"), // No precision constraints to handle overflow
    lpcd_value: decimal("lpcd_value"), // No precision constraints to handle overflow

    // Upload tracking
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
    upload_batch_id: varchar("upload_batch_id", { length: 50 }), // To group records from same CSV upload

    // Dashboard URL
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      // Unique constraint includes block to allow same village in different blocks
      unique_village_date: unique().on(
        table.scheme_id,
        table.village_name,
        table.block,
        table.data_date,
        table.uploaded_at,
      ),
    };
  },
);

export const insertWaterSchemeDataHistorySchema = createInsertSchema(
  waterSchemeDataHistory,
).omit({
  id: true,
  uploaded_at: true,
});

export type InsertWaterSchemeDataHistory = z.infer<
  typeof insertWaterSchemeDataHistorySchema
>;
export type WaterSchemeDataHistory = typeof waterSchemeDataHistory.$inferSelect;

// Scheme LPCD Data History table for permanent scheme-level historical storage
export const schemeLpcdDataHistory = pgTable(
  "scheme_lpcd_data_history",
  {
    id: serial("id").primaryKey(),

    // Location information
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),

    // Aggregated metrics
    total_population: integer("total_population"),
    total_villages: integer("total_villages"),
    villages_below_55: integer("villages_below_55"),
    villages_above_55: integer("villages_above_55"),
    villages_zero_supply: integer("villages_zero_supply"),

    // Single day data
    data_date: varchar("data_date", { length: 15 }).notNull(),
    water_value: decimal("water_value"), // Total water supply for the scheme
    lpcd_value: decimal("lpcd_value"), // Calculated LPCD for the scheme

    // Upload tracking
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
    upload_batch_id: varchar("upload_batch_id", { length: 50 }), // To group records from same CSV upload

    // Dashboard URL
    dashboard_url: text("dashboard_url"),
    mjp_commissioned: text("mjp_commissioned"),
  },
  (table) => {
    return {
      // Unique constraint to prevent duplicate entries
      unique_scheme_date: unique().on(
        table.scheme_id,
        table.block,
        table.data_date,
      ),
    };
  },
);

export const insertSchemeLpcdDataHistorySchema = createInsertSchema(
  schemeLpcdDataHistory,
).omit({
  id: true,
  uploaded_at: true,
});

export type InsertSchemeLpcdDataHistory = z.infer<
  typeof insertSchemeLpcdDataHistorySchema
>;
export type SchemeLpcdDataHistory = typeof schemeLpcdDataHistory.$inferSelect;

// Scheme LPCD Data table for current 7-day tracking at scheme level
export const schemeLpcd = pgTable(
  "scheme_lpcd",
  {
    // Region information
    region: text("region"),
    circle: text("circle"),
    division: text("division"),
    sub_division: text("sub_division"),
    block: text("block"),

    // Scheme identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: text("scheme_name"),

    // Population and infrastructure
    population: integer("population"),
    total_villages: integer("total_villages"),

    // Water values for different days
    water_value_day1: decimal("water_value_day1"),
    water_value_day2: decimal("water_value_day2"),
    water_value_day3: decimal("water_value_day3"),
    water_value_day4: decimal("water_value_day4"),
    water_value_day5: decimal("water_value_day5"),
    water_value_day6: decimal("water_value_day6"),
    water_value_day7: decimal("water_value_day7"),

    // LPCD values for different days
    lpcd_value_day1: decimal("lpcd_value_day1"),
    lpcd_value_day2: decimal("lpcd_value_day2"),
    lpcd_value_day3: decimal("lpcd_value_day3"),
    lpcd_value_day4: decimal("lpcd_value_day4"),
    lpcd_value_day5: decimal("lpcd_value_day5"),
    lpcd_value_day6: decimal("lpcd_value_day6"),
    lpcd_value_day7: decimal("lpcd_value_day7"),

    // Dates for water measurements
    water_date_day1: varchar("water_date_day1", { length: 20 }),
    water_date_day2: varchar("water_date_day2", { length: 20 }),
    water_date_day3: varchar("water_date_day3", { length: 20 }),
    water_date_day4: varchar("water_date_day4", { length: 20 }),
    water_date_day5: varchar("water_date_day5", { length: 20 }),
    water_date_day6: varchar("water_date_day6", { length: 20 }),
    water_date_day7: varchar("water_date_day7", { length: 20 }),

    // Dates for LPCD measurements
    lpcd_date_day1: varchar("lpcd_date_day1", { length: 20 }),
    lpcd_date_day2: varchar("lpcd_date_day2", { length: 20 }),
    lpcd_date_day3: varchar("lpcd_date_day3", { length: 20 }),
    lpcd_date_day4: varchar("lpcd_date_day4", { length: 20 }),
    lpcd_date_day5: varchar("lpcd_date_day5", { length: 20 }),
    lpcd_date_day6: varchar("lpcd_date_day6", { length: 20 }),
    lpcd_date_day7: varchar("lpcd_date_day7", { length: 20 }),

    // Status counters
    consistent_zero_lpcd_for_a_week: integer("consistent_zero_lpcd_for_a_week"),
    below_55_lpcd_count: integer("below_55_lpcd_count"),
    above_55_lpcd_count: integer("above_55_lpcd_count"),

    // Village level stats (for snapshots)
    villages_below_55: integer("villages_below_55"),
    villages_above_55: integer("villages_above_55"),
    villages_zero_supply: integer("villages_zero_supply"),

    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      pk: primaryKey({
        columns: [table.scheme_id, table.block],
      }),
    };
  },
);

export const insertSchemeLpcdSchema = createInsertSchema(schemeLpcd);
export const updateSchemeLpcdSchema = createInsertSchema(schemeLpcd).omit({
  scheme_id: true,
});

export type InsertSchemeLpcd = z.infer<typeof insertSchemeLpcdSchema>;
export type UpdateSchemeLpcd = z.infer<typeof updateSchemeLpcdSchema>;
export type SchemeLpcd = typeof schemeLpcd.$inferSelect;

// Chlorine Data table for ESR-level chlorine monitoring
export const chlorineData = pgTable(
  "chlorine_data",
  {
    // Location information
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    esr_name: varchar("esr_name", { length: 255 }),

    // Chlorine measurements for different days (lowercase field names with unlimited precision)
    chlorine_value_1: decimal("chlorine_value_1"), // Removed precision/scale constraints to handle large values
    chlorine_value_2: decimal("chlorine_value_2"),
    chlorine_value_3: decimal("chlorine_value_3"),
    chlorine_value_4: decimal("chlorine_value_4"),
    chlorine_value_5: decimal("chlorine_value_5"),
    chlorine_value_6: decimal("chlorine_value_6"),
    chlorine_value_7: decimal("chlorine_value_7"),

    // Dates for chlorine measurements (lowercase field names)
    chlorine_date_day_1: varchar("chlorine_date_day_1", { length: 15 }),
    chlorine_date_day_2: varchar("chlorine_date_day_2", { length: 15 }),
    chlorine_date_day_3: varchar("chlorine_date_day_3", { length: 15 }),
    chlorine_date_day_4: varchar("chlorine_date_day_4", { length: 15 }),
    chlorine_date_day_5: varchar("chlorine_date_day_5", { length: 15 }),
    chlorine_date_day_6: varchar("chlorine_date_day_6", { length: 15 }),
    chlorine_date_day_7: varchar("chlorine_date_day_7", { length: 15 }),

    // Analysis fields (lowercase field names with unlimited precision)
    number_of_consistent_zero_value_in_chlorine: integer(
      "number_of_consistent_zero_value_in_chlorine",
    ),
    chlorine_less_than_02_mgl: decimal("chlorine_less_than_02_mgl"), // Removed precision/scale constraints
    chlorine_between_02_05_mgl: decimal("chlorine_between_02_05_mgl"), // Removed precision/scale constraints
    chlorine_greater_than_05_mgl: decimal("chlorine_greater_than_05_mgl"), // Removed precision/scale constraints

    // Dashboard URL field for link to PI Vision ESR dashboard
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      // Composite primary key to uniquely identify each ESR
      pk: primaryKey({
        columns: [table.scheme_id, table.village_name, table.esr_name],
      }),
    };
  },
);

export const insertChlorineDataSchema = createInsertSchema(chlorineData);
export const updateChlorineDataSchema = createInsertSchema(chlorineData).omit({
  scheme_id: true,
  village_name: true,
  esr_name: true,
});

export type InsertChlorineData = z.infer<typeof insertChlorineDataSchema>;
export type UpdateChlorineData = z.infer<typeof updateChlorineDataSchema>;
export type ChlorineData = typeof chlorineData.$inferSelect;

// ESR Monitoring table for real-time infrastructure status
export const esrMonitoring = pgTable(
  "esr_monitoring",
  {
    id: serial("id").primaryKey(),

    // Location information
    region_name: varchar("region_name", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    esr_name: varchar("esr_name", { length: 255 }),

    // Sensor connectivity status
    chlorine_connected: integer("chlorine_connected").default(0),
    pressure_connected: integer("pressure_connected").default(0),
    flow_meter_connected: integer("flow_meter_connected").default(0),

    // Real-time status
    chlorine_status: varchar("chlorine_status", { length: 50 }),
    pressure_status: varchar("pressure_status", { length: 50 }),
    flow_meter_status: varchar("flow_meter_status", { length: 50 }),
    overall_status: varchar("overall_status", { length: 50 }),

    // Timestamps
    last_updated: timestamp("last_updated").defaultNow(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      unique_esr: unique().on(
        table.scheme_id,
        table.village_name,
        table.esr_name,
      ),
    };
  },
);

export const insertESRMonitoringSchema = createInsertSchema(esrMonitoring).omit(
  {
    id: true,
    created_at: true,
    last_updated: true,
  },
);

export type InsertESRMonitoring = z.infer<typeof insertESRMonitoringSchema>;
export type ESRMonitoring = typeof esrMonitoring.$inferSelect;

// Communication Status table for tracking communication infrastructure
export const communicationStatus = pgTable(
  "communication_status",
  {
    id: serial("id").primaryKey(),

    // Geographic hierarchy
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Infrastructure identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    esr_name: varchar("esr_name", { length: 255 }),

    // Connectivity status
    chlorine_connected: varchar("chlorine_connected", { length: 10 }),
    pressure_connected: varchar("pressure_connected", { length: 10 }),
    flow_meter_connected: varchar("flow_meter_connected", { length: 10 }),

    // Online/Offline status
    chlorine_status: varchar("chlorine_status", { length: 20 }),
    pressure_status: varchar("pressure_status", { length: 20 }),
    flow_meter_status: varchar("flow_meter_status", { length: 20 }),
    overall_status: varchar("overall_status", { length: 20 }),

    // Time-based status tracking
    chlorine_0h_72h: varchar("chlorine_0h_72h", { length: 20 }),
    chlorine_72h: varchar("chlorine_72h", { length: 20 }),
    pressure_0h_72h: varchar("pressure_0h_72h", { length: 20 }),
    pressure_72h: varchar("pressure_72h", { length: 20 }),
    flow_meter_0h_72h: varchar("flow_meter_0h_72h", { length: 20 }),
    flow_meter_72h: varchar("flow_meter_72h", { length: 20 }),

    // Last seen timestamp (when chlorine sensor was last online)
    last_seen: timestamp("last_seen", { withTimezone: true }).defaultNow(),

    // Last seen timestamp (when pressure sensor was last online)
    pressure_last_seen: timestamp("pressure_last_seen", { withTimezone: true }).defaultNow(),

    // Timestamps
    uploaded_at: timestamp("uploaded_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      unique_comm_status: unique().on(
        table.scheme_id,
        table.village_name,
        table.esr_name,
      ),
    };
  },
);

export const insertCommunicationStatusSchema = createInsertSchema(
  communicationStatus,
).omit({
  id: true,
  uploaded_at: true,
  updated_at: true,
});

export type InsertCommunicationStatus = z.infer<
  typeof insertCommunicationStatusSchema
>;
export type CommunicationStatus = typeof communicationStatus.$inferSelect;

// Chlorine History table for permanent historical storage
export const chlorineHistory = pgTable(
  "chlorine_history",
  {
    id: serial("id").primaryKey(),

    // Location information
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    esr_name: varchar("esr_name", { length: 255 }),

    // Single day data
    chlorine_date: varchar("chlorine_date", { length: 15 }).notNull(),
    chlorine_value: decimal("chlorine_value"),

    // Upload tracking
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
    upload_batch_id: varchar("upload_batch_id", { length: 50 }), // To group records from same CSV upload

    // Dashboard URL
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      // Unique constraint to ensure no duplicates for same ESR + date + upload
      unique_esr_date: unique().on(
        table.scheme_id,
        table.village_name,
        table.esr_name,
        table.chlorine_date,
        table.uploaded_at,
      ),
    };
  },
);

export const insertChlorineHistorySchema = createInsertSchema(
  chlorineHistory,
).omit({
  id: true,
  uploaded_at: true,
});

export type InsertChlorineHistory = z.infer<typeof insertChlorineHistorySchema>;
export type ChlorineHistory = typeof chlorineHistory.$inferSelect;

// Pressure Data table for ESR-level pressure monitoring
export const pressureData = pgTable(
  "pressure_data",
  {
    // Location information
    region: text("region"),
    circle: text("circle"),
    division: text("division"),
    sub_division: text("sub_division"),
    block: text("block"),

    // Identification
    scheme_id: text("scheme_id"),
    scheme_name: text("scheme_name"),
    village_name: text("village_name"),
    esr_name: text("esr_name"),

    // Pressure measurements for different days
    pressure_value_1: decimal("pressure_value_1", { precision: 12, scale: 2 }),
    pressure_value_2: decimal("pressure_value_2", { precision: 12, scale: 2 }),
    pressure_value_3: decimal("pressure_value_3", { precision: 12, scale: 2 }),
    pressure_value_4: decimal("pressure_value_4", { precision: 12, scale: 2 }),
    pressure_value_5: decimal("pressure_value_5", { precision: 12, scale: 2 }),
    pressure_value_6: decimal("pressure_value_6", { precision: 12, scale: 2 }),
    pressure_value_7: decimal("pressure_value_7", { precision: 12, scale: 2 }),

    // Dates for pressure measurements
    pressure_date_day_1: varchar("pressure_date_day_1", { length: 15 }),
    pressure_date_day_2: varchar("pressure_date_day_2", { length: 15 }),
    pressure_date_day_3: varchar("pressure_date_day_3", { length: 15 }),
    pressure_date_day_4: varchar("pressure_date_day_4", { length: 15 }),
    pressure_date_day_5: varchar("pressure_date_day_5", { length: 15 }),
    pressure_date_day_6: varchar("pressure_date_day_6", { length: 15 }),
    pressure_date_day_7: varchar("pressure_date_day_7", { length: 15 }),

    // Analysis fields
    number_of_consistent_zero_value_in_pressure: integer(
      "number_of_consistent_zero_value_in_pressure",
    ),
    pressure_less_than_02_bar: decimal("pressure_less_than_02_bar", {
      precision: 12,
      scale: 2,
    }),
    pressure_between_02_07_bar: decimal("pressure_between_02_07_bar", {
      precision: 12,
      scale: 2,
    }),
    pressure_greater_than_07_bar: decimal("pressure_greater_than_07_bar", {
      precision: 12,
      scale: 2,
    }),

    // Dashboard URL field for link to PI Vision ESR dashboard
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      // Composite primary key to uniquely identify each ESR
      pk: primaryKey({
        columns: [table.scheme_id, table.village_name, table.esr_name],
      }),
    };
  },
);

export const insertPressureDataSchema = createInsertSchema(pressureData);
export const updatePressureDataSchema = createInsertSchema(pressureData).omit({
  scheme_id: true,
  village_name: true,
  esr_name: true,
});

export type InsertPressureData = z.infer<typeof insertPressureDataSchema>;
export type UpdatePressureData = z.infer<typeof updatePressureDataSchema>;
export type PressureData = typeof pressureData.$inferSelect;

// Pressure History table for permanent historical storage
export const pressureHistory = pgTable(
  "pressure_history",
  {
    id: serial("id").primaryKey(),

    // Location information
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    esr_name: varchar("esr_name", { length: 255 }),

    // Single day data
    pressure_date: varchar("pressure_date", { length: 15 }).notNull(),
    pressure_value: decimal("pressure_value", { precision: 12, scale: 2 }),

    // Upload tracking
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
    upload_batch_id: varchar("upload_batch_id", { length: 50 }), // To group records from same CSV upload

    // Dashboard URL
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      // Unique constraint to ensure no duplicates for same ESR + date + upload
      unique_esr_date: unique().on(
        table.scheme_id,
        table.village_name,
        table.esr_name,
        table.pressure_date,
        table.uploaded_at,
      ),
    };
  },
);

export const insertPressureHistorySchema = createInsertSchema(
  pressureHistory,
).omit({
  id: true,
  uploaded_at: true,
});

export type InsertPressureHistory = z.infer<typeof insertPressureHistorySchema>;
export type PressureHistory = typeof pressureHistory.$inferSelect;

// Water Consumption table for tracking water consumption data
export const waterConsumption = pgTable(
  "water_consumption",
  {
    // Location information
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 50 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    esr_name: varchar("esr_name", { length: 255 }),

    // Flow metrics
    flow_rate_m3: decimal("flow_rate_m3"), // Removed precision constraints to handle overflow
    flow_meter_connected: varchar("flow_meter_connected", { length: 50 }), // Changed from boolean to varchar
    online_status: varchar("online_status", { length: 20 }),
    time_duration: varchar("time_duration", { length: 50 }),
    esr_capacity: decimal("esr_capacity"), // Removed precision constraints to handle overflow

    // Water consumption values for 7 days
    water_value_day1: decimal("water_value_day1"), // Removed precision constraints to handle overflow
    water_value_day2: decimal("water_value_day2"), // Removed precision constraints to handle overflow
    water_value_day3: decimal("water_value_day3"), // Removed precision constraints to handle overflow
    water_value_day4: decimal("water_value_day4"), // Removed precision constraints to handle overflow
    water_value_day5: decimal("water_value_day5"), // Removed precision constraints to handle overflow
    water_value_day6: decimal("water_value_day6"), // Removed precision constraints to handle overflow
    water_value_day7: decimal("water_value_day7"), // Removed precision constraints to handle overflow

    // Water consumption dates for 7 days
    water_date_day1: varchar("water_date_day1", { length: 15 }),
    water_date_day2: varchar("water_date_day2", { length: 15 }),
    water_date_day3: varchar("water_date_day3", { length: 15 }),
    water_date_day4: varchar("water_date_day4", { length: 15 }),
    water_date_day5: varchar("water_date_day5", { length: 15 }),
    water_date_day6: varchar("water_date_day6", { length: 15 }),
    water_date_day7: varchar("water_date_day7", { length: 15 }),

    // Analysis metrics
    consistent_zero_consumption: integer("consistent_zero_consumption"),
    percentage_consumption_previous_day: decimal("percentage_consumption_previous_day"), // Removed precision constraints to handle overflow

    // Dashboard URL
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      pk: primaryKey({
        columns: [table.scheme_id, table.village_name, table.esr_name],
      }),
    };
  },
);

export const insertWaterConsumptionSchema = createInsertSchema(waterConsumption);
export const updateWaterConsumptionSchema = createInsertSchema(waterConsumption).omit({
  scheme_id: true,
  village_name: true,
  esr_name: true,
});

export type InsertWaterConsumption = z.infer<typeof insertWaterConsumptionSchema>;
export type UpdateWaterConsumption = z.infer<typeof updateWaterConsumptionSchema>;
export type WaterConsumption = typeof waterConsumption.$inferSelect;

// Water Consumption History table for permanent historical storage
export const waterConsumptionHistory = pgTable(
  "water_consumption_history",
  {
    id: serial("id").primaryKey(),

    // Location information
    region: varchar("region", { length: 100 }),
    circle: varchar("circle", { length: 100 }),
    division: varchar("division", { length: 100 }),
    sub_division: varchar("sub_division", { length: 100 }),
    block: varchar("block", { length: 100 }),

    // Identification
    scheme_id: varchar("scheme_id", { length: 100 }),
    scheme_name: varchar("scheme_name", { length: 255 }),
    village_name: varchar("village_name", { length: 255 }),
    esr_name: varchar("esr_name", { length: 255 }),

    // Single day data
    data_date: varchar("data_date", { length: 15 }).notNull(),
    water_value: decimal("water_value"), // No precision constraints to handle overflow
    flow_rate_m3: decimal("flow_rate_m3"), // Flow rate in cubic meters
    esr_capacity: decimal("esr_capacity"), // ESR capacity

    // Upload tracking
    uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
    upload_batch_id: varchar("upload_batch_id", { length: 50 }), // To group records from same CSV upload

    // Dashboard URL
    dashboard_url: text("dashboard_url"),
  },
  (table) => {
    return {
      // Unique constraint to prevent duplicate entries for same ESR + date
      unique_esr_date: unique().on(
        table.scheme_id,
        table.village_name,
        table.esr_name,
        table.data_date,
        table.uploaded_at,
      ),
    };
  },
);

export const insertWaterConsumptionHistorySchema = createInsertSchema(
  waterConsumptionHistory,
).omit({
  id: true,
  uploaded_at: true,
});

export type InsertWaterConsumptionHistory = z.infer<
  typeof insertWaterConsumptionHistorySchema
>;
export type WaterConsumptionHistory = typeof waterConsumptionHistory.$inferSelect;

// Report Files table for managing uploaded Excel reports
export const reportFiles = pgTable("report_files", {
  id: serial("id").primaryKey(),
  file_name: text("file_name").notNull(),
  original_name: text("original_name").notNull(),
  file_path: text("file_path").notNull(),
  report_type: text("report_type").notNull(), // esr_level, water_consumption, lpcd_village, chlorine, pressure, village_level, scheme_level
  upload_date: timestamp("upload_date").defaultNow(),
  uploaded_by: integer("uploaded_by").references(() => users.id),
  file_size: integer("file_size"),
  is_active: boolean("is_active").default(true),
});

export const insertReportFileSchema = createInsertSchema(reportFiles).omit({
  id: true,
  upload_date: true,
});

export type InsertReportFile = z.infer<typeof insertReportFileSchema>;
export type ReportFile = typeof reportFiles.$inferSelect;

// User Login Logs table for tracking user login activity
export const userLoginLogs = pgTable("user_login_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .references(() => users.id)
    .notNull(),
  username: text("username").notNull(),
  user_name: text("user_name"), // The actual name of the user
  login_time: timestamp("login_time", { withTimezone: true })
    .defaultNow()
    .notNull(),
  logout_time: timestamp("logout_time", { withTimezone: true }), // When the user logged out
  session_duration: integer("session_duration"), // Duration in seconds
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  session_id: text("session_id"), // Unique identifier for this login session
  is_active: boolean("is_active").default(true), // Whether session is still active
});

export const insertUserLoginLogSchema = createInsertSchema(userLoginLogs).omit({
  id: true,
});

export type InsertUserLoginLog = z.infer<typeof insertUserLoginLogSchema>;
export type UserLoginLog = typeof userLoginLogs.$inferSelect;

// User Activity Logs table for tracking user actions like file downloads
export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .references(() => users.id)
    .notNull(),
  username: text("username").notNull(),
  session_id: text("session_id").notNull(),
  activity_type: text("activity_type").notNull(), // 'file_download', 'page_visit', 'data_export', etc.
  activity_description: text("activity_description").notNull(), // Detailed description of the activity
  file_name: text("file_name"), // Name of downloaded file (if applicable)
  file_type: text("file_type"), // Type of file downloaded (if applicable)
  page_url: text("page_url"), // URL of page visited (if applicable)
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .defaultNow()
    .notNull(),
  metadata: jsonb("metadata"), // Additional data about the activity
});

export const insertUserActivityLogSchema = createInsertSchema(
  userActivityLogs,
).omit({
  id: true,
});

export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;

// Population Tracking table for daily total population storage
export const populationTracking = pgTable("population_tracking", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  total_population: integer("total_population").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertPopulationTrackingSchema = createInsertSchema(
  populationTracking,
).omit({
  id: true,
  created_at: true,
});

export type InsertPopulationTracking = z.infer<
  typeof insertPopulationTrackingSchema
>;
export type PopulationTracking = typeof populationTracking.$inferSelect;

// Region Population Tracking table for daily regional population storage
export const regionPopulationTracking = pgTable(
  "region_population_tracking",
  {
    id: serial("id").primaryKey(),
    date: text("date").notNull(),
    region: text("region").notNull(),
    total_population: integer("total_population").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      unique_date_region: unique().on(table.date, table.region),
    };
  },
);

export const insertRegionPopulationTrackingSchema = createInsertSchema(
  regionPopulationTracking,
)
  .omit({
    id: true,
    created_at: true,
  })
  .extend({
    population: z.number().optional(), // Allow both 'population' and 'total_population' for compatibility
  });

export type InsertRegionPopulationTracking = z.infer<
  typeof insertRegionPopulationTrackingSchema
>;
export type RegionPopulationTracking =
  typeof regionPopulationTracking.$inferSelect;

// Village table for storing village-level aggregated data
export const villages = pgTable("village", {
  region: varchar("region", { length: 100 }),
  circle: varchar("circle", { length: 100 }),
  division: varchar("division", { length: 100 }),
  sub_division: varchar("sub_division", { length: 100 }),
  block: varchar("block", { length: 100 }),
  scheme_id: varchar("scheme_id", { length: 50 }),
  scheme_name: varchar("scheme_name", { length: 255 }),
  village_name: varchar("village_name", { length: 255 }),
  number_of_esr: integer("number_of_esr"),
  connected_esr: integer("connected_esr"),
  not_connected_esr: integer("not_connected_esr"),
  village_functional_status: varchar("village_functional_status", { length: 50 }),
  no_of_fully_completion_esr: integer("no_of_fully_completion_esr"),
  fully_completion_village_status: varchar("fully_completion_village_status", { length: 50 }),
});

export const insertVillageSchema = createInsertSchema(villages);
export const updateVillageSchema = createInsertSchema(villages);

export type InsertVillage = z.infer<typeof insertVillageSchema>;
export type UpdateVillage = z.infer<typeof updateVillageSchema>;
export type Village = typeof villages.$inferSelect;

// MQTT Topics Last Seen table
export const topicsLastSeen = pgTable("topics_last_seen", {
  topic_id: text("topic_id").primaryKey(),
  last_value: text("last_value"),
  last_seen: timestamp("last_seen").defaultNow(),
  broker_server: text("broker_server"), // Track which broker server this topic communicated with
});

export const insertTopicSchema = createInsertSchema(topicsLastSeen);
export const updateTopicSchema = createInsertSchema(topicsLastSeen);

export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type UpdateTopic = z.infer<typeof updateTopicSchema>;
export type TopicLastSeen = typeof topicsLastSeen.$inferSelect;

// MQTT Topic Configuration table (for CSV uploads)
export const mqttTopicConfigurations = pgTable("mqtt_topic_configurations", {
  id: serial("id").primaryKey(),
  sr_no: integer("sr_no"),
  server: text("server"), // Server/Region name: Amravati, Nashik, Konkan, Pune, CS, Nagpur
  region: text("region"),
  circle: text("circle"),
  division: text("division"),
  sub_division: text("sub_division"),
  block: text("block"),
  scheme_id_name: text("scheme_id_name"),
  vendor: text("vendor"),
  village: text("village"),
  reservoir: text("reservoir"),
  message_type: text("message_type"),
  topic_for_flow_meter: text("topic_for_flow_meter"),
  topic_for_cl: text("topic_for_cl"),
  type_of_cl: text("type_of_cl"),
  topic_for_pressure: text("topic_for_pressure"),
  received_date: text("received_date"),
  date_of_integration: text("date_of_integration"),
});

export const insertMqttTopicConfigurationSchema = createInsertSchema(mqttTopicConfigurations).omit({
  id: true,
});

export const mqttTopicConfigurationFormSchema = createInsertSchema(mqttTopicConfigurations).pick({
  region: true,
  circle: true,
  division: true,
  sub_division: true,
  block: true,
  scheme_id_name: true,
  vendor: true,
  village: true,
  reservoir: true,
});

export type InsertMqttTopicConfiguration = z.infer<typeof insertMqttTopicConfigurationSchema>;
export type MqttTopicConfiguration = typeof mqttTopicConfigurations.$inferSelect;
export type MqttTopicConfigurationForm = z.infer<typeof mqttTopicConfigurationFormSchema>;

// Vendor table for managing vendor/agency contacts by region
// Allows same employee to work in multiple regions
export const vendors = pgTable("vendor", {
  id: serial("id").primaryKey(),
  region: text("region").notNull(),
  agency: text("agency").notNull(),
  employee_name: text("employee_name").notNull(),
  email: text("email").notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // Unique constraint on region + email to allow same employee in different regions
    regionEmailUnique: unique().on(table.region, table.email),
  };
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Issue Reports table for tracking justifications for non-achievement/supply issues
export const issueReports = pgTable("issue_reports", {
  id: serial("id").primaryKey(),
  problem_level: text("problem_level").notNull(), // 'Scheme', 'Village', 'ESR'
  region: text("region").notNull(),
  scheme_id: text("scheme_id").notNull(),
  scheme_name: text("scheme_name").notNull(),
  village_name: text("village_name"),
  esr_name: text("esr_name"),
  status_value: text("status_value").notNull(), // LPCD value or Water Consumption status
  reason: text("reason").notNull(),
  sensor_type: text("sensor_type"),
  status: text("status").default("Active").notNull(), // 'Active', 'Resolved'
  resolution_remark: text("resolution_remark"),
  resolved_at: timestamp("resolved_at", { withTimezone: true }),
  created_by: integer("created_by")
    .references(() => users.id)
    .notNull(),
  creator_name: text("creator_name"), // Stores the name of the creator at the time of submission
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertIssueReportSchema = createInsertSchema(issueReports).omit({
  id: true,
  created_at: true,
});

export type InsertIssueReport = z.infer<typeof insertIssueReportSchema>;
export type IssueReport = typeof issueReports.$inferSelect;

// Scheme Progress Summary table
export const schemeProgressSummary = pgTable("scheme_progress_summary", {
  scheme_id: bigint("scheme_id", { mode: 'bigint' }).primaryKey(),
  region: text("region"),
  scheme_name: text("scheme_name"),
  number_of_villages: integer("number_of_villages"),
  number_of_completed_villages: integer("number_of_completed_villages"),
  number_of_esr: integer("number_of_esr"),
  number_of_completed_esr: integer("number_of_completed_esr"),
  number_of_gsr: integer("number_of_gsr"),
  number_of_completed_gsr: integer("number_of_completed_gsr"),
  number_of_mbr: integer("number_of_mbr"),
  number_of_completed_mbr: integer("number_of_completed_mbr"),
  total_flowmeter_scope: integer("total_flowmeter_scope"),
  flowmeter_integrated: integer("flowmeter_integrated"),
  flowmeter_balance: integer("flowmeter_balance"),
  total_rca_scope: integer("total_rca_scope"),
  rca_integrated: integer("rca_integrated"),
  rca_balance: integer("rca_balance"),
  total_pt_scope: integer("total_pt_scope"),
  pt_integrated: integer("pt_integrated"),
  pt_balance: integer("pt_balance"),
  completion_status: text("completion_status"),
});

export const insertSchemeProgressSummarySchema = createInsertSchema(schemeProgressSummary);
export type InsertSchemeProgressSummary = z.infer<typeof insertSchemeProgressSummarySchema>;
export type SchemeProgressSummary = typeof schemeProgressSummary.$inferSelect;

// Scheme Engineer Details table
export const schemeEngineerDetails = pgTable("scheme_engineer_details", {
  id: serial("id").primaryKey(),
  region: varchar("region", { length: 100 }),
  district: varchar("district", { length: 100 }),
  division: varchar("division", { length: 100 }),
  scheme_id: varchar("scheme_id", { length: 100 }),
  scheme: varchar("scheme", { length: 255 }),
  civil_engineer_name: varchar("civil_engineer_name", { length: 255 }),
  civil_engineer_mobile: varchar("civil_engineer_mobile", { length: 20 }),
  civil_engineer_email: varchar("civil_engineer_email", { length: 255 }),
  mechanical_engineer_name: varchar("mechanical_engineer_name", { length: 255 }),
  mechanical_engineer_mobile: varchar("mechanical_engineer_mobile", { length: 20 }),
  mechanical_engineer_email: varchar("mechanical_engineer_email", { length: 255 }),
  site_supervisor_name: varchar("site_supervisor_name", { length: 255 }),
  site_supervisor_mobile: varchar("site_supervisor_mobile", { length: 20 }),
  site_supervisor_email: varchar("site_supervisor_email", { length: 255 }),
});

export const insertSchemeEngineerDetailsSchema = createInsertSchema(schemeEngineerDetails).omit({
  id: true,
});

export type InsertSchemeEngineerDetails = z.infer<typeof insertSchemeEngineerDetailsSchema>;
export type SchemeEngineerDetails = typeof schemeEngineerDetails.$inferSelect;

// Email Alert Logs table
export const emailAlertLogs = pgTable("email_alert_logs", {
  id: serial("id").primaryKey(),
  scheme_id: varchar("scheme_id", { length: 100 }).notNull(),
  scheme_name: varchar("scheme_name", { length: 255 }).notNull(),
  region: varchar("region", { length: 100 }),
  village_name: varchar("village_name", { length: 255 }),
  esr_name: varchar("esr_name", { length: 255 }),
  alert_type: varchar("alert_type", { length: 50 }).notNull(), // 'LPCD', 'Chlorine', 'Pressure', 'Water'
  alert_value: varchar("alert_value", { length: 100 }).notNull(), // The failing value
  civil_engineer_name: varchar("civil_engineer_name", { length: 255 }),
  civil_engineer_email: varchar("civil_engineer_email", { length: 255 }),
  mechanical_engineer_name: varchar("mechanical_engineer_name", { length: 255 }),
  mechanical_engineer_email: varchar("mechanical_engineer_email", { length: 255 }),
  site_supervisor_name: varchar("site_supervisor_name", { length: 255 }),
  site_supervisor_email: varchar("site_supervisor_email", { length: 255 }),
  sent_date: date("sent_date").defaultNow().notNull(), // e.g. '2026-06-02'
  sent_time: time("sent_time").defaultNow().notNull(), // e.g. '14:55:00'
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertEmailAlertLogSchema = createInsertSchema(emailAlertLogs).omit({
  id: true,
  created_at: true,
});

export type InsertEmailAlertLog = z.infer<typeof insertEmailAlertLogSchema>;
export type EmailAlertLog = typeof emailAlertLogs.$inferSelect;
