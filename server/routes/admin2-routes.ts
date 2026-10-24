import { Router, type Request, type Response, type NextFunction } from "express";
import { getDB } from "../db";
import { admin2Submissions, insertAdmin2SubmissionSchema, users } from "@shared/schema";
import { sql, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { sendAdmin2HandoverConfirmationEmail } from "../services/email-service";

const router = Router();

// Middleware to ensure user is logged in as Admin2 or Admin
export const requireAdmin2OrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const isAllowed = Boolean(
    req.session?.userId && (
      req.session.role === "admin2" ||
      req.session.role === "Admin2" ||
      req.session.isAdmin2 === true ||
      req.session.role === "admin" ||
      req.session.isAdmin === true
    )
  );

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Admin2 or Admin credentials required.",
    });
  }
  next();
};

/**
 * Initialize admin2_submissions table in Postgres if not already present
 */
async function ensureAdmin2Table() {
  try {
    const db = await getDB();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin2_submissions (
        id SERIAL PRIMARY KEY,
        region TEXT NOT NULL,
        circle TEXT NOT NULL,
        division TEXT NOT NULL,
        sub_division TEXT NOT NULL,
        block TEXT NOT NULL,
        scheme_name TEXT NOT NULL,
        scheme_id TEXT NOT NULL,
        engineer_name TEXT NOT NULL,
        engineer_email TEXT NOT NULL,
        engineer_mobile TEXT NOT NULL,
        engineer_designation TEXT NOT NULL,
        agency_name TEXT NOT NULL,
        handover_status TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        creator_username TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("admin2_submissions table verified/created successfully");
  } catch (err) {
    console.error("Error ensuring admin2_submissions table:", err);
  }
}

// Ensure table exists on module load
ensureAdmin2Table();

// -------------------------------------------------------------
// Cascading Dropdown Endpoints
// -------------------------------------------------------------

/**
 * GET /api/admin2/locations/regions
 * List distinct regions
 */
router.get("/locations/regions", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const result = await db.execute(sql`
      SELECT DISTINCT TRIM(region) AS region 
      FROM scheme_status 
      WHERE region IS NOT NULL AND TRIM(region) != ''
      ORDER BY region ASC;
    `);

    const regions = result.rows.map((r: any) => r.region);
    res.json({ success: true, regions });
  } catch (error: any) {
    console.error("Error fetching regions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch regions" });
  }
});

/**
 * GET /api/admin2/locations/circles
 * List distinct circles for a region (excluding NA)
 */
router.get("/locations/circles", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string;
    if (!region) {
      return res.status(400).json({ success: false, message: "Region query parameter is required" });
    }

    const db = await getDB();
    const result = await db.execute(sql`
      SELECT DISTINCT TRIM(circle) AS circle 
      FROM scheme_status 
      WHERE TRIM(region) = ${region.trim()} 
        AND circle IS NOT NULL 
        AND TRIM(circle) != ''
        AND UPPER(TRIM(circle)) NOT IN ('NA', 'N/A', 'NULL', '-', '--', 'NONE')
      ORDER BY circle ASC;
    `);

    const circles = result.rows.map((r: any) => r.circle);
    res.json({ success: true, circles });
  } catch (error: any) {
    console.error("Error fetching circles:", error);
    res.status(500).json({ success: false, message: "Failed to fetch circles" });
  }
});

/**
 * GET /api/admin2/locations/divisions
 * List distinct divisions for a region and circle (excluding NA)
 */
router.get("/locations/divisions", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string;
    const circle = req.query.circle as string;

    if (!region || !circle) {
      return res.status(400).json({ success: false, message: "Region and Circle parameters are required" });
    }

    const db = await getDB();
    const result = await db.execute(sql`
      SELECT DISTINCT TRIM(division) AS division 
      FROM scheme_status 
      WHERE TRIM(region) = ${region.trim()} 
        AND TRIM(circle) = ${circle.trim()}
        AND division IS NOT NULL 
        AND TRIM(division) != ''
        AND UPPER(TRIM(division)) NOT IN ('NA', 'N/A', 'NULL', '-', '--', 'NONE')
      ORDER BY division ASC;
    `);

    const divisions = result.rows.map((r: any) => r.division);
    res.json({ success: true, divisions });
  } catch (error: any) {
    console.error("Error fetching divisions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch divisions" });
  }
});

/**
 * GET /api/admin2/locations/sub-divisions
 * List distinct sub-divisions for region, circle, and division (excluding NA)
 */
router.get("/locations/sub-divisions", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;

    if (!region || !circle || !division) {
      return res.status(400).json({ success: false, message: "Region, Circle, and Division are required" });
    }

    const db = await getDB();
    const result = await db.execute(sql`
      SELECT DISTINCT TRIM(sub_division) AS sub_division 
      FROM scheme_status 
      WHERE TRIM(region) = ${region.trim()} 
        AND TRIM(circle) = ${circle.trim()}
        AND TRIM(division) = ${division.trim()}
        AND sub_division IS NOT NULL 
        AND TRIM(sub_division) != ''
        AND UPPER(TRIM(sub_division)) NOT IN ('NA', 'N/A', 'NULL', '-', '--', 'NONE')
      ORDER BY sub_division ASC;
    `);

    const subDivisions = result.rows.map((r: any) => r.sub_division);
    res.json({ success: true, subDivisions });
  } catch (error: any) {
    console.error("Error fetching sub-divisions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch sub-divisions" });
  }
});

/**
 * GET /api/admin2/locations/blocks
 * List distinct blocks for region, circle, division, and optional sub-division (excluding NA)
 */
router.get("/locations/blocks", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subDivision = (req.query.subDivision as string) || "";

    if (!region || !circle || !division) {
      return res.status(400).json({ success: false, message: "Region, Circle, and Division are required" });
    }

    const isSubDivValid =
      subDivision &&
      !["NA", "N/A", "NULL", "-", "--", "NONE", "DIRECT"].includes(subDivision.trim().toUpperCase());

    const db = await getDB();
    const result = await db.execute(sql`
      SELECT DISTINCT TRIM(block) AS block 
      FROM scheme_status 
      WHERE TRIM(region) = ${region.trim()} 
        AND TRIM(circle) = ${circle.trim()}
        AND TRIM(division) = ${division.trim()}
        ${isSubDivValid ? sql`AND TRIM(sub_division) = ${subDivision.trim()}` : sql``}
        AND block IS NOT NULL 
        AND TRIM(block) != ''
        AND UPPER(TRIM(block)) NOT IN ('NA', 'N/A', 'NULL', '-', '--', 'NONE')
      ORDER BY block ASC;
    `);

    const blocks = result.rows.map((r: any) => r.block);
    res.json({ success: true, blocks });
  } catch (error: any) {
    console.error("Error fetching blocks:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blocks" });
  }
});

/**
 * GET /api/admin2/locations/schemes
 * List schemes (scheme_name and scheme_id) for selected hierarchy
 */
router.get("/locations/schemes", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const region = req.query.region as string;
    const circle = req.query.circle as string;
    const division = req.query.division as string;
    const subDivision = (req.query.subDivision as string) || "";
    const block = (req.query.block as string) || "";

    if (!region || !circle || !division) {
      return res.status(400).json({ success: false, message: "Region, Circle, and Division are required to fetch schemes" });
    }

    const isSubDivValid =
      subDivision &&
      !["NA", "N/A", "NULL", "-", "--", "NONE", "DIRECT"].includes(subDivision.trim().toUpperCase());

    const isBlockValid =
      block &&
      !["NA", "N/A", "NULL", "-", "--", "NONE", "DIRECT"].includes(block.trim().toUpperCase());

    const db = await getDB();
    const result = await db.execute(sql`
      SELECT DISTINCT 
        TRIM(scheme_name) AS scheme_name, 
        TRIM(scheme_id) AS scheme_id 
      FROM scheme_status 
      WHERE TRIM(region) = ${region.trim()} 
        AND TRIM(circle) = ${circle.trim()}
        AND TRIM(division) = ${division.trim()}
        ${isSubDivValid ? sql`AND TRIM(sub_division) = ${subDivision.trim()}` : sql``}
        ${isBlockValid ? sql`AND TRIM(block) = ${block.trim()}` : sql``}
        AND scheme_name IS NOT NULL 
        AND TRIM(scheme_name) != ''
        AND UPPER(TRIM(scheme_name)) NOT IN ('NA', 'N/A', 'NULL')
        AND scheme_id IS NOT NULL 
        AND TRIM(scheme_id) != ''
      ORDER BY scheme_name ASC;
    `);

    res.json({ success: true, schemes: result.rows });
  } catch (error: any) {
    console.error("Error fetching schemes:", error);
    res.status(500).json({ success: false, message: "Failed to fetch schemes" });
  }
});

// -------------------------------------------------------------
// Submissions Endpoints
// -------------------------------------------------------------

/**
 * POST /api/admin2/submissions
 * Submit scheme handover record
 */
router.post("/submissions", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const validated = insertAdmin2SubmissionSchema.parse(req.body);
    const db = await getDB();

    const currentUserId = req.session?.userId || null;
    const currentUsername = req.session?.username || req.session?.user?.username || "admin2";
    const currentName = req.session?.user?.name || req.session?.username || "Admin2 User";

    const [newSubmission] = await db
      .insert(admin2Submissions)
      .values({
        region: validated.region.trim(),
        circle: validated.circle.trim(),
        division: validated.division.trim(),
        sub_division: validated.sub_division.trim(),
        block: validated.block.trim(),
        scheme_name: validated.scheme_name.trim(),
        scheme_id: validated.scheme_id.trim(),
        engineer_name: validated.engineer_name.trim(),
        engineer_email: validated.engineer_email.trim().toLowerCase(),
        engineer_mobile: validated.engineer_mobile.trim(),
        engineer_designation: validated.engineer_designation.trim(),
        agency_name: validated.agency_name,
        handover_status: validated.handover_status,
        created_by: currentUserId,
        creator_name: currentName,
        creator_username: currentUsername,
      })
      .returning();

    // Look up registered email of submitting user if available
    let registeredEmail = "";
    if (currentUserId) {
      try {
        const [userRecord] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, currentUserId));
        if (userRecord?.email) {
          registeredEmail = userRecord.email.trim().toLowerCase();
        }
      } catch (userErr) {
        console.warn("Could not retrieve submitting user registered email:", userErr);
      }
    }

    // CC email list as requested
    const CC_EMAILS = [
      "salunkerishikesh@gmail.com",
      "semjpbelapur@gmail.com",
      "rishikesh.salunke@cstech.ai",
      "deepak.ingale@cstech.ai",
      "umes.shelake@cstech.ai",
      "satish.patel@cstech.ai",
    ];

    // Primary recipients: registered email + engineer email (deduplicated)
    const primaryRecipients = Array.from(
      new Set(
        [registeredEmail, validated.engineer_email.trim().toLowerCase()].filter(
          (e): e is string => Boolean(e && e.includes("@"))
        )
      )
    );

    // Send confirmation email asynchronously
    if (primaryRecipients.length > 0) {
      sendAdmin2HandoverConfirmationEmail({
        toEmails: primaryRecipients,
        ccEmails: CC_EMAILS,
        submission: {
          id: newSubmission.id,
          region: newSubmission.region,
          circle: newSubmission.circle,
          division: newSubmission.division,
          sub_division: newSubmission.sub_division,
          block: newSubmission.block,
          scheme_name: newSubmission.scheme_name,
          scheme_id: newSubmission.scheme_id,
          engineer_name: newSubmission.engineer_name,
          engineer_email: newSubmission.engineer_email,
          engineer_mobile: newSubmission.engineer_mobile,
          engineer_designation: newSubmission.engineer_designation,
          agency_name: newSubmission.agency_name,
          handover_status: newSubmission.handover_status,
          creator_name: newSubmission.creator_name || currentName,
          creator_username: newSubmission.creator_username || currentUsername,
          created_at: newSubmission.created_at,
        },
      })
        .then((sent) => {
          if (sent) {
            console.log(
              `✅ Admin2 confirmation email successfully dispatched to ${primaryRecipients.join(", ")} with CC: ${CC_EMAILS.join(", ")}`
            );
          } else {
            console.warn("⚠️ Admin2 confirmation email dispatch returned false");
          }
        })
        .catch((emailErr) => {
          console.error("❌ Error sending Admin2 confirmation email:", emailErr);
        });
    }

    res.status(201).json({
      success: true,
      message: "Form submission saved successfully in Admin2 records. Confirmation email sent.",
      submission: newSubmission,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || "Validation failed on submitted fields",
        errors: error.errors,
      });
    }
    console.error("Error saving admin2 submission:", error);
    res.status(500).json({ success: false, message: "Failed to save submission" });
  }
});

/**
 * GET /api/admin2/submissions
 * Get list of submissions
 */
router.get("/submissions", requireAdmin2OrAdmin, async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const submissions = await db
      .select()
      .from(admin2Submissions)
      .orderBy(desc(admin2Submissions.created_at));

    res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error: any) {
    console.error("Error fetching admin2 submissions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch submissions" });
  }
});

export default router;
