/**
 * Chatbot Helpdesk Integration Routes
 * Provides voice-activated ticket creation and helpdesk features through chatbot
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  autoCategorizeIssue,
  extractTicketEntities,
  createTicketFromChatbot,
  getConversationState,
  updateConversationState,
  clearConversationState,
  getUserTickets,
  getTicketById,
  findSimilarTickets,
  getTicketAnalytics,
  performTicketAction,
  advanceConversation,
  ConversationStep,
  HELPDESK_CATEGORIES,
  REGIONS,
  LOCATION_LEVELS,
  PRIORITY_LEVELS
} from "../../services/chatbot-helpdesk-service";
import { z } from "zod";

const router = express.Router();

// Configure multer for chatbot image uploads (same as standalone helpdesk)
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
      cb(null, 'chatbot-' + uniqueSuffix + path.extname(file.originalname));
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

// POST /api/chatbot/helpdesk/start-ticket - Start conversational ticket creation
router.post("/start-ticket", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Initialize conversation state with step-by-step flow
    updateConversationState(req.session.userId, {
      currentStep: ConversationStep.SELECT_REGION,
      collectedData: {},
      pendingUploads: [],
      createdAt: new Date()
    });

    res.json({
      success: true,
      message: "🎫 I'll help you create a support ticket. Let's start with selecting the region.",
      currentStep: ConversationStep.SELECT_REGION,
      options: {
        regions: REGIONS
      }
    });
  } catch (error) {
    console.error("Start ticket error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to start ticket creation" 
    });
  }
});

// POST /api/chatbot/helpdesk/process-message - Process user message during ticket creation
router.post("/process-message", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { message, inputType = 'selection' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Use the conversation advancement logic
    const result = await advanceConversation(
      req.session.userId,
      message.trim(),
      inputType
    );

    res.json(result);
  } catch (error) {
    console.error("Process message error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to process message",
      currentStep: ConversationStep.SELECT_REGION
    });
  }
});

// POST /api/chatbot/helpdesk/upload - Upload images during ticket creation
router.post("/upload", upload.array('attachments', 5), async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const state = getConversationState(req.session.userId);
    if (!state) {
      return res.status(400).json({ 
        success: false, 
        message: "No active ticket creation session" 
      });
    }

    // Get uploaded files
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No files uploaded" 
      });
    }

    // Store file metadata in pending uploads with size and mimetype
    const uploads = files.map(file => ({
      path: file.path,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    }));

    // Update conversation state with uploads
    updateConversationState(req.session.userId, {
      pendingUploads: [...(state.pendingUploads || []), ...uploads]
    });

    res.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      uploadCount: files.length,
      totalUploads: (state.pendingUploads || []).length + files.length,
      files: uploads.map(u => u.filename)
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to upload files" 
    });
  }
});

// POST /api/chatbot/helpdesk/create-ticket - Create ticket from collected data
router.post("/create-ticket", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get conversation state with all collected data
    const state = getConversationState(req.session.userId);
    if (!state) {
      return res.status(400).json({ 
        success: false, 
        message: "No active ticket creation session" 
      });
    }

    // Auto-populate contact info from user if not provided
    // This will be done in createTicketFromChatbot function

    // Create ticket with uploaded attachments
    const result = await createTicketFromChatbot(
      state.collectedData, 
      req.session.userId,
      state.pendingUploads || []
    );
    
    if (result.success) {
      // Clear conversation state
      clearConversationState(req.session.userId);
    }

    res.json(result);
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to create ticket" 
    });
  }
});

// POST /api/chatbot/helpdesk/cancel-ticket - Cancel ticket creation
router.post("/cancel-ticket", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    clearConversationState(req.session.userId);

    res.json({
      success: true,
      message: "Ticket creation cancelled"
    });
  } catch (error) {
    console.error("Cancel ticket error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to cancel ticket" 
    });
  }
});

// GET /api/chatbot/helpdesk/my-tickets - Get user's tickets
router.get("/my-tickets", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { status, category, region, limit } = req.query;

    const tickets = await getUserTickets(req.session.userId, {
      status: status as string,
      category: category as string,
      region: region as string,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      tickets,
      count: tickets.length
    });
  } catch (error) {
    console.error("Get tickets error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to get tickets" 
    });
  }
});

// GET /api/chatbot/helpdesk/ticket/:id - Get ticket by ID
router.get("/ticket/:id", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const ticket = await getTicketById(id, req.session.userId);

    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: "Ticket not found" 
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to get ticket" 
    });
  }
});

// POST /api/chatbot/helpdesk/similar-tickets - Find similar tickets
router.post("/similar-tickets", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { description, limit } = req.body;

    if (!description) {
      return res.status(400).json({ 
        success: false, 
        message: "Description is required" 
      });
    }

    const similarTickets = await findSimilarTickets(
      description,
      req.session.userId,
      limit || 5
    );

    res.json({
      success: true,
      similarTickets,
      count: similarTickets.length
    });
  } catch (error) {
    console.error("Similar tickets error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to find similar tickets" 
    });
  }
});

// GET /api/chatbot/helpdesk/analytics - Get ticket analytics
router.get("/analytics", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const analytics = await getTicketAnalytics(req.session.userId);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to get analytics" 
    });
  }
});

// POST /api/chatbot/helpdesk/ticket-action - Perform action on ticket
router.post("/ticket-action", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { ticketId, action, data } = req.body;

    if (!ticketId || !action) {
      return res.status(400).json({ 
        success: false, 
        message: "Ticket ID and action are required" 
      });
    }

    const result = await performTicketAction(
      ticketId,
      req.session.userId,
      action,
      data || {}
    );

    res.json(result);
  } catch (error) {
    console.error("Ticket action error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to perform action" 
    });
  }
});

// GET /api/chatbot/helpdesk/options - Get available options for ticket fields
router.get("/options", async (req, res) => {
  try {
    res.json({
      success: true,
      options: {
        categories: HELPDESK_CATEGORIES,
        regions: REGIONS,
        levels: LOCATION_LEVELS,
        priorities: PRIORITY_LEVELS
      }
    });
  } catch (error) {
    console.error("Get options error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to get options" 
    });
  }
});

// POST /api/chatbot/helpdesk/auto-categorize - Auto-categorize issue
router.post("/auto-categorize", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ 
        success: false, 
        message: "Description is required" 
      });
    }

    const categorization = await autoCategorizeIssue(description);

    res.json({
      success: true,
      categorization
    });
  } catch (error) {
    console.error("Auto-categorize error:", error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to auto-categorize" 
    });
  }
});

export default router;
