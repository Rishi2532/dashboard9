import { getDB, getClient, initializeDatabase } from "./simple-db";
import {
  users,
  regions,
  schemeStatuses,
  appState,
  type User,
  type InsertUser,
  type Region,
  type InsertRegion,
  type SchemeStatus,
  type InsertSchemeStatus,
} from "@shared/schema";

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

  // Region operations
  getAllRegions(): Promise<Region[]>;
  getRegionByName(regionName: string): Promise<Region | undefined>;
  getRegionSummary(regionName?: string): Promise<any>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(region: Region): Promise<Region>;

  // Scheme operations
  getAllSchemes(
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]>;
  getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]>;
  getSchemeById(schemeId: string): Promise<SchemeStatus | undefined>;
  createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus>;
  updateScheme(scheme: SchemeStatus): Promise<SchemeStatus>;
  deleteScheme(schemeId: string): Promise<boolean>;

  // Updates operations
  getTodayUpdates(): Promise<any[]>;
}

// PostgreSQL implementation
export class SimpleStorage implements IStorage {
  private initialized: Promise<void>;

  constructor() {
    this.initialized = this.initialize().catch((error) => {
      console.error("Failed to initialize database in constructor:", error);
      throw error;
    });
  }

  private async initialize() {
    try {
      await initializeDatabase();
      console.log("Database initialized successfully in storage");
    } catch (error) {
      console.error("Error initializing database in storage:", error);
      throw error;
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    await this.initialized;
    const client = await getClient();

    try {
      const result = await client.query(
        'SELECT * FROM "users" WHERE "id" = $1',
        [id],
      );
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error("Error in getUser:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.initialized;
    const client = await getClient();

    try {
      const result = await client.query(
        'SELECT * FROM "users" WHERE "username" = $1',
        [username],
      );
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.initialized;
    const client = await getClient();

    try {
      const result = await client.query(
        'INSERT INTO "users" ("username", "password", "name", "role") VALUES ($1, $2, $3, $4) RETURNING *',
        [
          insertUser.username,
          insertUser.password,
          insertUser.name,
          insertUser.role,
        ],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }

  async validateUserCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
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
    await this.initialized;
    const client = await getClient();

    try {
      const result = await client.query(
        'SELECT * FROM "region" ORDER BY "region_name"',
      );
      return result.rows;
    } catch (error) {
      console.error("Error in getAllRegions:", error);
      throw error;
    }
  }

  async getRegionByName(regionName: string): Promise<Region | undefined> {
    await this.initialized;
    const client = await getClient();

    try {
      const result = await client.query(
        'SELECT * FROM "region" WHERE "region_name" = $1',
        [regionName],
      );
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error("Error in getRegionByName:", error);
      throw error;
    }
  }

  async getRegionSummary(regionName?: string): Promise<any> {
    await this.initialized;
    const client = await getClient();

    try {
      if (regionName) {
        // Get summary for specific region
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
        };
      } else {
        // Get summary for all regions
        const result = await client.query(`
          SELECT 
            SUM("total_schemes_integrated") as total_schemes_integrated,
            SUM("fully_completed_schemes") as fully_completed_schemes,
            SUM("total_villages_integrated") as total_villages_integrated,
            SUM("fully_completed_villages") as fully_completed_villages,
            SUM("total_esr_integrated") as total_esr_integrated,
            SUM("fully_completed_esr") as fully_completed_esr,
            SUM("partial_esr") as partial_esr,
            SUM("flow_meter_integrated") as flow_meter_integrated,
            SUM("rca_integrated") as rca_integrated,
            SUM("pressure_transmitter_integrated") as pressure_transmitter_integrated
          FROM "region"
        `);

        return result.rows[0];
      }
    } catch (error) {
      console.error("Error in getRegionSummary:", error);
      throw error;
    }
  }

  async createRegion(region: InsertRegion): Promise<Region> {
    await this.initialized;
    const client = await getClient();

    try {
      const result = await client.query(
        `
        INSERT INTO "region" (
          "region_name", 
          "total_esr_integrated", 
          "fully_completed_esr", 
          "partial_esr", 
          "total_villages_integrated", 
          "fully_completed_villages", 
          "total_schemes_integrated", 
          "fully_completed_schemes", 
          "flow_meter_integrated", 
          "rca_integrated", 
          "pressure_transmitter_integrated"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          region.region_name,
          region.total_esr_integrated,
          region.fully_completed_esr,
          region.partial_esr,
          region.total_villages_integrated,
          region.fully_completed_villages,
          region.total_schemes_integrated,
          region.fully_completed_schemes,
          region.flow_meter_integrated,
          region.rca_integrated,
          region.pressure_transmitter_integrated,
        ],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error in createRegion:", error);
      throw error;
    }
  }

  async updateRegion(region: Region): Promise<Region> {
    await this.initialized;
    const client = await getClient();

    try {
      await client.query(
        `
        UPDATE "region" SET
          "region_name" = $1,
          "total_esr_integrated" = $2,
          "fully_completed_esr" = $3,
          "partial_esr" = $4,
          "total_villages_integrated" = $5,
          "fully_completed_villages" = $6,
          "total_schemes_integrated" = $7,
          "fully_completed_schemes" = $8,
          "flow_meter_integrated" = $9,
          "rca_integrated" = $10,
          "pressure_transmitter_integrated" = $11
        WHERE "region_id" = $12`,
        [
          region.region_name,
          region.total_esr_integrated,
          region.fully_completed_esr,
          region.partial_esr,
          region.total_villages_integrated,
          region.fully_completed_villages,
          region.total_schemes_integrated,
          region.fully_completed_schemes,
          region.flow_meter_integrated,
          region.rca_integrated,
          region.pressure_transmitter_integrated,
          region.region_id,
        ],
      );
      return region;
    } catch (error) {
      console.error("Error in updateRegion:", error);
      throw error;
    }
  }

  // Scheme methods (simplified implementations)
  async getAllSchemes(
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]> {
    await this.initialized;
    const client = await getClient();

    try {
      let query = 'SELECT * FROM "scheme_status"';
      const params: any[] = [];

      if (schemeId) {
        query += ' WHERE "scheme_id" = $1';
        params.push(schemeId);
      } else if (statusFilter && statusFilter !== "all") {
        if (statusFilter === "In Progress") {
          query +=
            " WHERE \"fully_completion_scheme_status\" IN ('Partial', 'In Progress')";
        } else if (statusFilter === "Fully Completed") {
          query +=
            " WHERE \"fully_completion_scheme_status\" IN ('Completed', 'Fully-Completed', 'Fully Completed')";
        } else {
          query += ' WHERE "fully_completion_scheme_status" = $1';
          params.push(statusFilter);
        }
      }

      query += ' ORDER BY "region", "scheme_name"';

      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error in getAllSchemes:", error);
      return [];
    }
  }

  async getSchemesByRegion(
    regionName: string,
    statusFilter?: string,
    schemeId?: string,
  ): Promise<SchemeStatus[]> {
    await this.initialized;
    const client = await getClient();

    try {
      let query = 'SELECT * FROM "scheme_status" WHERE "region" = $1';
      const params: any[] = [regionName];

      if (schemeId) {
        query += ' AND "scheme_id" = $2';
        params.push(schemeId);
      } else if (statusFilter && statusFilter !== "all") {
        if (statusFilter === "In Progress") {
          query +=
            " AND \"fully_completion_scheme_status\" IN ('Partial', 'In Progress')";
        } else if (statusFilter === "Fully Completed") {
          query +=
            " AND \"fully_completion_scheme_status\" IN ('Completed', 'Fully-Completed', 'Fully Completed')";
        } else {
          query += ' AND "fully_completion_scheme_status" = $2';
          params.push(statusFilter);
        }
      }

      query += ' ORDER BY "scheme_name"';

      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error in getSchemesByRegion:", error);
      return [];
    }
  }

  async getSchemeById(schemeId: string): Promise<SchemeStatus | undefined> {
    await this.initialized;
    const client = await getClient();

    try {
      const result = await client.query(
        'SELECT * FROM "scheme_status" WHERE "scheme_id" = $1',
        [schemeId],
      );
      return result.rows.length > 0 ? result.rows[0] : undefined;
    } catch (error) {
      console.error("Error in getSchemeById:", error);
      throw error;
    }
  }

  async createScheme(scheme: InsertSchemeStatus): Promise<SchemeStatus> {
    await this.initialized;
    const client = await getClient();

    try {
      // Simple implementation - in a real app you'd handle all fields properly
      const result = await client.query(
        `
        INSERT INTO "scheme_status" (
          "scheme_id", 
          "region", 
          "scheme_name", 
          "number_of_village",
          "total_villages_integrated",
          "no_of_functional_village",
          "fully_completed_villages",
          "total_number_of_esr",
          "scheme_functional_status",
          "total_esr_integrated",
          "fully_completion_scheme_status"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          scheme.scheme_id,
          scheme.region,
          scheme.scheme_name,
          scheme.number_of_village || 0,
          scheme.total_villages_integrated || 0,
          scheme.no_of_functional_village || 0,
          scheme.fully_completed_villages || 0,
          scheme.total_number_of_esr || 0,
          scheme.scheme_functional_status || "Functional",
          scheme.total_esr_integrated || 0,
          scheme.fully_completion_scheme_status || "Partial",
        ],
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error in createScheme:", error);
      throw error;
    }
  }

  async updateScheme(scheme: SchemeStatus): Promise<SchemeStatus> {
    await this.initialized;
    const client = await getClient();

    try {
      // Simple implementation - in a real app you'd handle all fields properly
      await client.query(
        `
        UPDATE "scheme_status" SET
          "region" = $1,
          "scheme_name" = $2,
          "number_of_village" = $3,
          "total_villages_integrated" = $4,
          "no_of_functional_village" = $5,
          "fully_completed_villages" = $6,
          "total_number_of_esr" = $7,
          "scheme_functional_status" = $8,
          "total_esr_integrated" = $9,
          "fully_completion_scheme_status" = $10
        WHERE "scheme_id" = $11`,
        [
          scheme.region,
          scheme.scheme_name,
          scheme.number_of_village,
          scheme.total_villages_integrated,
          scheme.no_of_functional_village,
          scheme.fully_completed_villages,
          scheme.total_number_of_esr,
          scheme.scheme_functional_status,
          scheme.total_esr_integrated,
          scheme.fully_completion_scheme_status,
          scheme.scheme_id,
        ],
      );
      return scheme;
    } catch (error) {
      console.error("Error in updateScheme:", error);
      throw error;
    }
  }

  async deleteScheme(schemeId: string): Promise<boolean> {
    await this.initialized;
    const client = await getClient();

    try {
      await client.query('DELETE FROM "scheme_status" WHERE "scheme_id" = $1', [
        schemeId,
      ]);
      return true;
    } catch (error) {
      console.error("Error in deleteScheme:", error);
      throw error;
    }
  }

  // Simplified version of get today's updates
  async getTodayUpdates(): Promise<any[]> {
    // Placeholder implementation
    return [];
  }
}
