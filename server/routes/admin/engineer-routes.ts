import { Router, type Request, type Response } from "express";
import { getDB } from "../../db";
import { users, schemeEngineerDetails } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createEngineerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").trim().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Full name is required").trim(),
  email: z.string().email("Valid email address is required").trim().toLowerCase(),
  phone: z.string().optional().nullable(),
});

const updateEngineerSchema = z.object({
  name: z.string().min(2, "Full name is required").trim().optional(),
  email: z.string().email("Valid email address is required").trim().toLowerCase().optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

/**
 * GET /api/admin/engineers
 * List all users with role 'engineer'
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const engineerUsers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
      })
      .from(users)
      .where(eq(users.role, "engineer"))
      .orderBy(sql`${users.id} DESC`);

    // Fetch scheme assignments count for each engineer
    const allSchemes = await db.select().from(schemeEngineerDetails);

    const engineersWithSchemeStats = engineerUsers.map((eng: any) => {
      const engEmail = (eng.email || "").trim().toLowerCase();
      const engName = (eng.name || "").trim().toLowerCase();

      const matchedSchemes = allSchemes.filter((s: any) => {
        const cEmail = (s.civil_engineer_email || "").trim().toLowerCase();
        const mEmail = (s.mechanical_engineer_email || "").trim().toLowerCase();
        const sEmail = (s.site_supervisor_email || "").trim().toLowerCase();

        const cName = (s.civil_engineer_name || "").trim().toLowerCase();
        const mName = (s.mechanical_engineer_name || "").trim().toLowerCase();
        const sName = (s.site_supervisor_name || "").trim().toLowerCase();

        return (
          (engEmail && (cEmail === engEmail || mEmail === engEmail || sEmail === engEmail)) ||
          (engName && (cName === engName || mName === engName || sName === engName))
        );
      });

      return {
        ...eng,
        assigned_schemes_count: matchedSchemes.length,
        assigned_scheme_ids: Array.from(new Set(matchedSchemes.map((s: any) => s.scheme_id).filter(Boolean))),
        assigned_scheme_names: Array.from(new Set(matchedSchemes.map((s: any) => s.scheme).filter(Boolean))),
      };
    });

    res.json({
      success: true,
      count: engineersWithSchemeStats.length,
      engineers: engineersWithSchemeStats,
    });
  } catch (error: any) {
    console.error("Error fetching engineer users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer accounts" });
  }
});

/**
 * GET /api/admin/engineers/directory
 * List distinct engineers found in scheme_engineer_details to allow one-click account creation
 */
router.get("/directory", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const allSchemes = await db.select().from(schemeEngineerDetails);
    const existingUsers = await db.select().from(users).where(eq(users.role, "engineer"));
    const registeredEmails = new Set(
      existingUsers.map((u: any) => (u.email || "").trim().toLowerCase()).filter(Boolean)
    );

    const directoryMap = new Map<string, {
      name: string;
      email: string;
      phone: string;
      role_title: string;
      region?: string | null;
      district?: string | null;
      division?: string | null;
      schemes: string[];
      is_registered: boolean;
      existing_username?: string;
    }>();

    for (const row of allSchemes) {
      // Civil Engineer
      if (row.civil_engineer_name || row.civil_engineer_email) {
        const email = (row.civil_engineer_email || "").trim().toLowerCase();
        const name = (row.civil_engineer_name || "").trim();
        const phone = (row.civil_engineer_mobile || "").trim();
        const key = email || name.toLowerCase();

        if (key) {
          if (!directoryMap.has(key)) {
            const isReg = Boolean(email && registeredEmails.has(email));
            const matchedUser = existingUsers.find((u: any) => (u.email || "").trim().toLowerCase() === email);
            directoryMap.set(key, {
              name,
              email,
              phone,
              role_title: "Civil Engineer",
              region: row.region,
              district: row.district,
              division: row.division,
              schemes: [],
              is_registered: isReg,
              existing_username: matchedUser?.username,
            });
          }
          if (row.scheme) directoryMap.get(key)!.schemes.push(row.scheme);
        }
      }

      // Mechanical Engineer
      if (row.mechanical_engineer_name || row.mechanical_engineer_email) {
        const email = (row.mechanical_engineer_email || "").trim().toLowerCase();
        const name = (row.mechanical_engineer_name || "").trim();
        const phone = (row.mechanical_engineer_mobile || "").trim();
        const key = email || name.toLowerCase();

        if (key) {
          if (!directoryMap.has(key)) {
            const isReg = Boolean(email && registeredEmails.has(email));
            const matchedUser = existingUsers.find((u: any) => (u.email || "").trim().toLowerCase() === email);
            directoryMap.set(key, {
              name,
              email,
              phone,
              role_title: "Mechanical Engineer",
              region: row.region,
              district: row.district,
              division: row.division,
              schemes: [],
              is_registered: isReg,
              existing_username: matchedUser?.username,
            });
          }
          if (row.scheme) directoryMap.get(key)!.schemes.push(row.scheme);
        }
      }

      // Site Supervisor
      if (row.site_supervisor_name || row.site_supervisor_email) {
        const email = (row.site_supervisor_email || "").trim().toLowerCase();
        const name = (row.site_supervisor_name || "").trim();
        const phone = (row.site_supervisor_mobile || "").trim();
        const key = email || name.toLowerCase();

        if (key) {
          if (!directoryMap.has(key)) {
            const isReg = Boolean(email && registeredEmails.has(email));
            const matchedUser = existingUsers.find((u: any) => (u.email || "").trim().toLowerCase() === email);
            directoryMap.set(key, {
              name,
              email,
              phone,
              role_title: "Site Supervisor",
              region: row.region,
              district: row.district,
              division: row.division,
              schemes: [],
              is_registered: isReg,
              existing_username: matchedUser?.username,
            });
          }
          if (row.scheme) directoryMap.get(key)!.schemes.push(row.scheme);
        }
      }
    }

    const directory = Array.from(directoryMap.values()).map((item) => ({
      ...item,
      schemes_count: Array.from(new Set(item.schemes)).length,
      schemes: Array.from(new Set(item.schemes)).slice(0, 10),
    }));

    res.json({
      success: true,
      directory,
    });
  } catch (error: any) {
    console.error("Error fetching engineer directory:", error);
    res.status(500).json({ success: false, message: "Failed to fetch engineer roster directory" });
  }
});

/**
 * POST /api/admin/engineers
 * Admin creates a new login credential for an engineer in the users table
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const validated = createEngineerSchema.parse(req.body);

    // Check if username already exists
    const [existingByUsername] = await db
      .select()
      .from(users)
      .where(eq(users.username, validated.username));

    if (existingByUsername) {
      return res.status(409).json({
        success: false,
        message: `Username '${validated.username}' is already taken. Please choose another username.`,
      });
    }

    // Insert new engineer user
    const [newUser] = await db
      .insert(users)
      .values({
        username: validated.username,
        password: validated.password,
        name: validated.name,
        email: validated.email,
        phone: validated.phone || null,
        role: "engineer", // Strictly enforced
      })
      .returning();

    res.status(201).json({
      success: true,
      message: `Engineer account '${newUser.username}' created successfully`,
      engineer: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || "Invalid engineer account data",
        errors: error.errors,
      });
    }
    console.error("Error creating engineer user:", error);
    res.status(500).json({ success: false, message: "Failed to create engineer account" });
  }
});

/**
 * PUT /api/admin/engineers/:id
 * Admin updates engineer account credentials or details
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const engineerId = parseInt(req.params.id, 10);
    if (isNaN(engineerId)) {
      return res.status(400).json({ success: false, message: "Invalid engineer ID" });
    }

    const validated = updateEngineerSchema.parse(req.body);

    const [existing] = await db.select().from(users).where(eq(users.id, engineerId));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Engineer account not found" });
    }

    const updateFields: any = {};
    if (validated.name !== undefined) updateFields.name = validated.name;
    if (validated.email !== undefined) updateFields.email = validated.email;
    if (validated.phone !== undefined) updateFields.phone = validated.phone;
    if (validated.password && validated.password.trim().length >= 6) {
      updateFields.password = validated.password.trim();
    }

    const [updated] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, engineerId))
      .returning();

    res.json({
      success: true,
      message: `Engineer account '${updated.username}' updated successfully`,
      engineer: {
        id: updated.id,
        username: updated.username,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || "Invalid update data",
        errors: error.errors,
      });
    }
    console.error("Error updating engineer user:", error);
    res.status(500).json({ success: false, message: "Failed to update engineer account" });
  }
});

/**
 * DELETE /api/admin/engineers/:id
 * Admin deletes an engineer user
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const engineerId = parseInt(req.params.id, 10);
    if (isNaN(engineerId)) {
      return res.status(400).json({ success: false, message: "Invalid engineer ID" });
    }

    const [existing] = await db.select().from(users).where(eq(users.id, engineerId));
    if (!existing) {
      return res.status(404).json({ success: false, message: "Engineer account not found" });
    }

    if (existing.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot delete administrator accounts via this portal" });
    }

    await db.delete(users).where(eq(users.id, engineerId));

    res.json({
      success: true,
      message: `Engineer account '${existing.username}' deleted successfully`,
    });
  } catch (error: any) {
    console.error("Error deleting engineer user:", error);
    res.status(500).json({ success: false, message: "Failed to delete engineer account" });
  }
});

export default router;
