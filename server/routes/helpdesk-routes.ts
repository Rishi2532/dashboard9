import express from "express";
import { eq, desc, and, like, gte, lte, sql } from "drizzle-orm";
import { helpdeskTickets, users, helpdeskAttachments, vendors } from "@shared/schema";
import { getDB } from "../db";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendTicketCreatedEmail, sendTicketResolvedEmail, sendTicketReopenedEmail, sendVendorNotificationEmail } from "../services/email-service";

const router = express.Router();

// Configure multer for multiple file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "./uploads/helpdesk";
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Maximum 5 files per ticket
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and Excel files
    const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|xlsx|xls)$/i;
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    const hasValidExtension = allowedExtensions.test(file.originalname.toLowerCase());
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (hasValidExtension && hasValidMimeType) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG, GIF), PDF, and Excel files are allowed!'));
    }
  }
});

// Generate unique ticket ID
const generateTicketId = async (): Promise<string> => {
  const db = await getDB();
  
  // Get the highest ticket number
  const lastTicket = await db.select({
    ticket_id: helpdeskTickets.ticket_id
  })
  .from(helpdeskTickets)
  .where(like(helpdeskTickets.ticket_id, "HD-%"))
  .orderBy(desc(helpdeskTickets.id))
  .limit(1);
  
  let nextNumber = 1;
  if (lastTicket.length > 0) {
    const lastNumber = parseInt(lastTicket[0].ticket_id.replace("HD-", ""));
    nextNumber = lastNumber + 1;
  }
  
  return `HD-${String(nextNumber).padStart(6, "0")}`;
};

// Send email notification for new ticket
const sendTicketNotification = async (ticketData: any) => {
  try {
    // Send confirmation email to ticket creator
    await sendTicketCreatedEmail(
      ticketData.contact_email,
      ticketData.ticket_id,
      ticketData.title,
      ticketData.description
    );
    console.log('✅ Confirmation email sent to ticket creator successfully');

    // Send notification emails to vendors in the same region
    if (ticketData.region) {
      const db = await getDB();
      const regionVendors = await db.select()
        .from(vendors)
        .where(eq(vendors.region, ticketData.region));
      
      console.log(`📧 Sending vendor notifications to ${regionVendors.length} vendor(s) in ${ticketData.region} region...`);
      
      for (const vendor of regionVendors) {
        if (vendor.email) {
          try {
            await sendVendorNotificationEmail(
              vendor.email,
              vendor.employee_name,
              ticketData.ticket_id,
              ticketData.title,
              ticketData.description,
              ticketData.region,
              ticketData.contact_name,
              ticketData.contact_email,
              ticketData.contact_phone || 'Not provided',
              ticketData.priority || 'Medium',
              ticketData.category,
              ticketData.specific_issue
            );
            console.log(`✅ Vendor notification sent to ${vendor.employee_name} (${vendor.email})`);
          } catch (vendorEmailError) {
            console.error(`❌ Failed to send email to vendor ${vendor.email}:`, vendorEmailError);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error sending email notification:', error);
  }
};

// POST /api/helpdesk/tickets - Create new ticket
router.post("/tickets", upload.array('attachments', 5), async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      title,
      category,
      specific_issue,
      description,
      level,
      region,
      circle,
      division,
      subdivision,
      block,
      scheme_id,
      village_name,
      esr_name,
      priority,
      dashboard_url,
      contact_name,
      contact_phone,
      contact_email
    } = req.body;

    // Validate required fields
    if (!title || !category || !specific_issue || !description || !level || !contact_name || !contact_email) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const ticketId = await generateTicketId();
    
    const ticketData = {
      ticket_id: ticketId,
      title,
      category,
      specific_issue,
      description,
      level,
      region: region || null,
      circle: circle || null,
      division: division || null,
      subdivision: subdivision || null,
      block: block || null,
      scheme_id: scheme_id || null,
      village_name: village_name || null,
      esr_name: esr_name || null,
      priority: priority || "Medium",
      dashboard_url: dashboard_url || null,
      contact_name,
      contact_phone: contact_phone || null,
      contact_email,
      created_by: req.session.userId,
      // Remove old single attachment fields
      attachment_path: null,
      attachment_filename: null,
    };

    const db = await getDB();
    const [newTicket] = await db.insert(helpdeskTickets)
      .values(ticketData)
      .returning();

    // Handle multiple file attachments
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const attachmentPromises = req.files.map(async (file) => {
        const attachmentData = {
          ticket_id: newTicket.id,
          original_filename: file.originalname,
          stored_filename: file.filename,
          file_path: file.path,
          file_size: file.size,
          mime_type: file.mimetype,
        };
        
        return db.insert(helpdeskAttachments)
          .values(attachmentData)
          .returning();
      });

      await Promise.all(attachmentPromises);
    }

    // Send email notification
    try {
      await sendTicketNotification({ ...ticketData, ...newTicket });
      console.log('Email notification sent successfully');
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Log the error but don't fail the ticket creation
    }

    res.json(newTicket);
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/tickets/:id - Get individual ticket details with attachments
router.get("/tickets/:id", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const db = await getDB();
    
    // Get ticket - check ownership unless admin
    const whereClause = req.session.isAdmin 
      ? eq(helpdeskTickets.id, ticketId)
      : and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.created_by, req.session.userId));
    
    const [ticket] = await db.select()
      .from(helpdeskTickets)
      .where(whereClause);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Get attachments for this ticket
    const attachments = await db.select()
      .from(helpdeskAttachments)
      .where(eq(helpdeskAttachments.ticket_id, ticket.id));
    
    res.json({
      ...ticket,
      attachments
    });
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/tickets - Get current user's tickets with attachments
router.get("/tickets", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const db = await getDB();
    
    // Get tickets
    const tickets = await db.select()
      .from(helpdeskTickets)
      .where(eq(helpdeskTickets.created_by, req.session.userId))
      .orderBy(desc(helpdeskTickets.created_at));

    // Get attachments for each ticket
    const ticketsWithAttachments = await Promise.all(
      tickets.map(async (ticket: any) => {
        const attachments = await db.select()
          .from(helpdeskAttachments)
          .where(eq(helpdeskAttachments.ticket_id, ticket.id));
        
        return {
          ...ticket,
          attachments
        };
      })
    );

    res.json(ticketsWithAttachments);
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/stats - Get ticket statistics (admin only)
router.get("/stats", async (req, res) => {
  try {
    if (!req.session?.userId || !req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const db = await getDB();
    
    // Get all tickets count
    const [totalResult] = await db.select({ 
      count: sql<number>`count(*)::int` 
    }).from(helpdeskTickets);
    
    // Get count by status
    const statusCounts = await db.select({
      status: helpdeskTickets.status,
      count: sql<number>`count(*)::int`
    })
    .from(helpdeskTickets)
    .groupBy(helpdeskTickets.status);
    
    // Get count by priority
    const priorityCounts = await db.select({
      priority: helpdeskTickets.priority,
      count: sql<number>`count(*)::int`
    })
    .from(helpdeskTickets)
    .groupBy(helpdeskTickets.priority);
    
    // Get recent tickets (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [recentResult] = await db.select({
      count: sql<number>`count(*)::int`
    })
    .from(helpdeskTickets)
    .where(gte(helpdeskTickets.created_at, sevenDaysAgo));

    // Format the response
    const stats = {
      total: totalResult?.count || 0,
      pending: (statusCounts.find((s: any) => s.status === 'Open')?.count || 0) + 
               (statusCounts.find((s: any) => s.status === 'In-Progress')?.count || 0),
      open: statusCounts.find((s: any) => s.status === 'Open')?.count || 0,
      inProgress: statusCounts.find((s: any) => s.status === 'In-Progress')?.count || 0,
      resolved: statusCounts.find((s: any) => s.status === 'Resolved')?.count || 0,
      high: priorityCounts.find((p: any) => p.priority === 'High')?.count || 0,
      medium: priorityCounts.find((p: any) => p.priority === 'Medium')?.count || 0,
      low: priorityCounts.find((p: any) => p.priority === 'Low')?.count || 0,
      recent: recentResult?.count || 0
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching helpdesk stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/user-stats - Get user's ticket statistics
router.get("/user-stats", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const db = await getDB();
    
    // Get user's tickets count
    const [totalResult] = await db.select({ 
      count: sql<number>`count(*)::int` 
    })
    .from(helpdeskTickets)
    .where(eq(helpdeskTickets.created_by, req.session.userId));
    
    // Get count by status for user's tickets
    const statusCounts = await db.select({
      status: helpdeskTickets.status,
      count: sql<number>`count(*)::int`
    })
    .from(helpdeskTickets)
    .where(eq(helpdeskTickets.created_by, req.session.userId))
    .groupBy(helpdeskTickets.status);

    // Format the response
    const stats = {
      total: totalResult?.count || 0,
      pending: (statusCounts.find((s: any) => s.status === 'Open')?.count || 0) + 
               (statusCounts.find((s: any) => s.status === 'In-Progress')?.count || 0),
      open: statusCounts.find((s: any) => s.status === 'Open')?.count || 0,
      inProgress: statusCounts.find((s: any) => s.status === 'In-Progress')?.count || 0,
      resolved: statusCounts.find((s: any) => s.status === 'Resolved')?.count || 0
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching user helpdesk stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/admin/tickets - Get all tickets (admin only) with attachments
router.get("/admin/tickets", async (req, res) => {
  try {
    if (!req.session?.userId || !req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { status, category, region, fromDate, toDate, search } = req.query;
    
    const db = await getDB();
    let query = db.select({
      ticket: helpdeskTickets,
      user: {
        id: users.id,
        username: users.username,
        name: users.name
      }
    })
    .from(helpdeskTickets)
    .leftJoin(users, eq(helpdeskTickets.created_by, users.id));

    // Build where conditions
    const conditions = [];
    
    if (status && status !== 'all') {
      conditions.push(eq(helpdeskTickets.status, status as string));
    }
    
    if (category && category !== 'all') {
      conditions.push(eq(helpdeskTickets.category, category as string));
    }
    
    if (region && region !== 'all') {
      conditions.push(eq(helpdeskTickets.region, region as string));
    }
    
    if (fromDate) {
      conditions.push(gte(helpdeskTickets.created_at, new Date(fromDate as string)));
    }
    
    if (toDate) {
      conditions.push(lte(helpdeskTickets.created_at, new Date(toDate as string)));
    }
    
    if (search) {
      conditions.push(
        like(helpdeskTickets.title, `%${search}%`)
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const ticketsResult = await query.orderBy(desc(helpdeskTickets.created_at));

    // Get attachments for each ticket
    const ticketsWithAttachments = await Promise.all(
      ticketsResult.map(async (ticketWithUser: any) => {
        const attachments = await db.select()
          .from(helpdeskAttachments)
          .where(eq(helpdeskAttachments.ticket_id, ticketWithUser.ticket.id));
        
        return {
          ...ticketWithUser,
          ticket: {
            ...ticketWithUser.ticket,
            attachments
          }
        };
      })
    );

    res.json(ticketsWithAttachments);
  } catch (error) {
    console.error("Error fetching admin tickets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/helpdesk/tickets/:id - Update ticket status/comments (admin only)
router.put("/tickets/:id", async (req, res) => {
  try {
    if (!req.session?.userId || !req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { status, admin_comments } = req.body;

    if (!status && !admin_comments) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const db = await getDB();
    
    // Get the current ticket before updating
    const [currentTicket] = await db.select()
      .from(helpdeskTickets)
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .limit(1);

    if (!currentTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (status) updateData.status = status;
    if (admin_comments) updateData.admin_comments = admin_comments;

    const [updatedTicket] = await db.update(helpdeskTickets)
      .set(updateData)
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .returning();

    // Send email notification if ticket is being resolved
    if (status === "Resolved" && currentTicket.status !== "Resolved") {
      try {
        await sendTicketResolvedEmail(
          updatedTicket.contact_email,
          updatedTicket.ticket_id,
          updatedTicket.title,
          admin_comments
        );
        console.log('Ticket resolved email sent successfully');
      } catch (error) {
        console.error('Error sending ticket resolved email:', error);
      }
    }

    res.json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/helpdesk/tickets/:id/resolve - Resolve a ticket (admin only)
router.post("/tickets/:id/resolve", async (req, res) => {
  try {
    if (!req.session?.userId || !req.session?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { admin_comments } = req.body;

    const db = await getDB();
    
    // Get the current ticket before updating
    const [currentTicket] = await db.select()
      .from(helpdeskTickets)
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .limit(1);

    if (!currentTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (currentTicket.status === "Resolved") {
      return res.status(400).json({ message: "Ticket is already resolved" });
    }

    const updateData = {
      status: "Resolved",
      admin_comments: admin_comments || null,
      updated_at: new Date(),
    };

    const [updatedTicket] = await db.update(helpdeskTickets)
      .set(updateData)
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .returning();

    // Send email notification
    try {
      await sendTicketResolvedEmail(
        updatedTicket.contact_email,
        updatedTicket.ticket_id,
        updatedTicket.title,
        admin_comments
      );
      console.log('Ticket resolved email sent successfully');
    } catch (error) {
      console.error('Error sending ticket resolved email:', error);
    }

    res.json({ 
      message: "Ticket resolved successfully",
      ticket: updatedTicket 
    });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/helpdesk/tickets/:id/reopen - Reopen a resolved ticket (ticket creator only)
router.post("/tickets/:id/reopen", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { reopen_reason } = req.body;



    if (!reopen_reason || reopen_reason.trim().length === 0) {
      return res.status(400).json({ message: "Please provide a reason for reopening this ticket" });
    }

    const db = await getDB();
    
    // Get the ticket to reopen and verify ownership
    const [ticket] = await db.select()
      .from(helpdeskTickets)
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if user is the ticket creator
    if (ticket.created_by !== req.session.userId) {
      return res.status(403).json({ message: "You can only reopen your own tickets" });
    }

    // Check if ticket is actually resolved
    if (ticket.status !== "Resolved") {
      return res.status(400).json({ message: "Only resolved tickets can be reopened" });
    }

    // Check if ticket was resolved recently (within 48 hours)
    const resolvedDate = new Date(ticket.updated_at);
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    
    if (resolvedDate < fortyEightHoursAgo) {
      return res.status(400).json({ 
        message: "Tickets can only be reopened within 48 hours of resolution" 
      });
    }

    // Append reopen reason to admin comments
    const reopenComment = `\n\n--- TICKET REOPENED ---\nReopened on: ${new Date().toLocaleDateString()}\nReason: ${reopen_reason.trim()}`;
    const updatedComments = (ticket.admin_comments || '') + reopenComment;

    // Update ticket status back to open
    const [updatedTicket] = await db.update(helpdeskTickets)
      .set({ 
        status: "Open",
        admin_comments: updatedComments,
        updated_at: new Date()
      })
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .returning();

    // Send email notification about reopening
    try {
      await sendTicketReopenedEmail(
        ticket.contact_email,
        ticket.ticket_id,
        ticket.title,
        reopen_reason.trim()
      );
      console.log("Ticket reopened email sent successfully");
    } catch (emailError) {
      console.error("Failed to send ticket reopened email:", emailError);
      // Continue execution even if email fails
    }

    res.json({ 
      message: "Ticket reopened successfully", 
      ticket: updatedTicket 
    });
  } catch (error) {
    console.error("Error reopening ticket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/helpdesk/tickets/:id/close - Close a resolved ticket (ticket creator only)
router.post("/tickets/:id/close", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { close_reason } = req.body;

    const db = await getDB();
    
    // Get the ticket to close and verify ownership
    const [ticket] = await db.select()
      .from(helpdeskTickets)
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .limit(1);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if user is the ticket creator
    if (ticket.created_by !== req.session.userId) {
      return res.status(403).json({ message: "You can only close your own tickets" });
    }

    // Check if ticket is resolved
    if (ticket.status !== "Resolved") {
      return res.status(400).json({ message: "Only resolved tickets can be closed" });
    }

    // Check if ticket was resolved recently (within 48 hours)
    const resolvedDate = new Date(ticket.updated_at);
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    
    if (resolvedDate < fortyEightHoursAgo) {
      return res.status(400).json({ 
        message: "Tickets can only be closed within 48 hours of resolution" 
      });
    }

    // Append close reason to admin comments if provided
    let updatedComments = ticket.admin_comments || '';
    if (close_reason && close_reason.trim()) {
      const closeComment = `\n\n--- TICKET CLOSED BY USER ---\nClosed on: ${new Date().toLocaleDateString()}\nReason: ${close_reason.trim()}`;
      updatedComments += closeComment;
    } else {
      const closeComment = `\n\n--- TICKET CLOSED BY USER ---\nClosed on: ${new Date().toLocaleDateString()}\nUser confirmed the issue is resolved.`;
      updatedComments += closeComment;
    }

    // Update ticket status to "Closed"
    const [updatedTicket] = await db.update(helpdeskTickets)
      .set({ 
        status: "Closed",
        admin_comments: updatedComments,
        updated_at: new Date()
      })
      .where(eq(helpdeskTickets.id, parseInt(id)))
      .returning();

    res.json({ 
      message: "Ticket closed successfully", 
      ticket: updatedTicket 
    });
  } catch (error) {
    console.error("Error closing ticket:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/categories - Get available categories and specific issues
router.get("/categories", async (req, res) => {
  try {
    // Define categories and their specific issues
    const categories = {
      "Data Issues": [
        "Incorrect water consumption values",
        "Incorrect sensor data",
        "Incorrect LPCD calculations",
        "Incorrect totalizer readings",
        "Sensor timestamp mismatch (different in system vs string)",
        "Discrepancy between dashboard and datalink report values",
        "ESR level information not displayed correctly in table",
        "Data mismatch across hierarchy (e.g., ESR vs village level)",
        "Incorrect chlorine values in KPI"
      ],
      "Sensor / Device Issues": [
        "Mismatch between total sensors in communication and displayed count",
        "Sensor is online but shown as offline on dashboard",
        "Sensor marked integrated in JJM sheet but not reflecting on dashboard",
        "Sensor data missing or incorrectly plotted on graph",
        "Wrong direction/installation of sensor (arrow orientation issue)"
      ],
      "Integration / Communication Issues": [
        "Topics sent for integration but not reflecting on dashboard",
        "Datalink reports not received",
        "Alerts not received"
      ],
      "Login / Access Issues": [
        "Unable to log in to dashboard"
      ],
      "Application / UI Issues": [
        "Navigation problems",
        "GIS application not working"
      ],
      "Template Issues": [
        "Incorrect MBR template"
      ],
      "Technical Issues": [
        "Abrupt water consumption",
        "Abrupt chlorine levels",
        "Abrupt pressure",
        "Chlorine offline for multiple days",
        "Chlorine below 0.2 or above 0.5 multiple days"
      ],
      "KPI Issues": [
        "Water consumption above 55",
        "Water consumption below 55",
        "Chlorine above 0.5",
        "Chlorine below 0.2",
        "Pressure above 0.7",
        "Pressure below 0.2"
      ]
    };

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/geographic-data - Get geographic hierarchy data
router.get("/geographic-data", async (req, res) => {
  try {
    const { level, parent } = req.query;
    
    const db = await getDB();
    
    // Get unique values based on level and parent
    let result = [];
    
    switch (level) {
      case 'region':
        result = await db.selectDistinct({ value: helpdeskTickets.region })
          .from(helpdeskTickets)
          .where(helpdeskTickets.region !== null);
        break;
      case 'circle':
        if (parent) {
          result = await db.selectDistinct({ value: helpdeskTickets.circle })
            .from(helpdeskTickets)
            .where(and(
              eq(helpdeskTickets.region, parent as string)
            ));
        }
        break;
      // Add more levels as needed
      default:
        return res.status(400).json({ message: "Invalid level" });
    }

    res.json(result.map((r: any) => r.value).filter(Boolean));
  } catch (error) {
    console.error("Error fetching geographic data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/attachments/:filename - Serve attachment files
router.get("/attachments/:filename", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { filename } = req.params;
    const filePath = path.join("./uploads/helpdesk", filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    // Verify the file belongs to a valid ticket (security check)
    const db = await getDB();
    const attachment = await db.select()
      .from(helpdeskAttachments)
      .where(eq(helpdeskAttachments.stored_filename, filename))
      .limit(1);

    if (attachment.length === 0) {
      // Fall back to old attachment format for backward compatibility
      const ticket = await db.select()
        .from(helpdeskTickets)
        .where(like(helpdeskTickets.attachment_path, `%${filename}%`))
        .limit(1);

      if (ticket.length === 0) {
        return res.status(404).json({ message: "File not found" });
      }

      // Set appropriate headers for file download (old format)
      const originalFilename = ticket[0].attachment_filename || filename;
      res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
      
      // Determine content type
      const ext = path.extname(originalFilename).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',  
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    } else {
      // New format with attachments table
      const originalFilename = attachment[0].original_filename;
      res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
      res.setHeader('Content-Type', attachment[0].mime_type);
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error serving attachment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/helpdesk/vendors - Get all vendors
router.get("/vendors", async (req, res) => {
  try {
    const { region } = req.query;
    const db = await getDB();
    
    let vendorList;
    if (region) {
      // Get vendors filtered by region
      vendorList = await db.select()
        .from(vendors)
        .where(eq(vendors.region, region as string))
        .orderBy(vendors.agency, vendors.employee_name);
    } else {
      // Get all vendors
      vendorList = await db.select()
        .from(vendors)
        .orderBy(vendors.region, vendors.agency, vendors.employee_name);
    }
    
    res.json(vendorList);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ message: "Failed to fetch vendors" });
  }
});

export default router;