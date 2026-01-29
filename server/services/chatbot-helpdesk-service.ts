/**
 * Chatbot-Helpdesk Integration Service
 * Provides voice-activated ticket creation, status tracking, analytics, and smart features
 */

import { config, hasApiKey } from "../config";
import { getDB } from "../db";
import { helpdeskTickets, vendors, users } from "@shared/schema";
import { eq, desc, and, like, gte, lte, sql } from "drizzle-orm";
import { sendTicketCreatedEmail, sendVendorNotificationEmail } from "./email-service";

// Conversation steps enum
export enum ConversationStep {
  SELECT_REGION = "SELECT_REGION",
  SELECT_CATEGORY = "SELECT_CATEGORY",
  SELECT_SPECIFIC_ISSUE = "SELECT_SPECIFIC_ISSUE",
  SELECT_LOCATION_LEVEL = "SELECT_LOCATION_LEVEL",
  ENTER_LOCATION_NAME = "ENTER_LOCATION_NAME",
  ENTER_SCHEME_ID = "ENTER_SCHEME_ID",
  ENTER_SCHEME_NAME = "ENTER_SCHEME_NAME",
  ENTER_VILLAGE_NAME = "ENTER_VILLAGE_NAME",
  ENTER_ESR_NAME = "ENTER_ESR_NAME",
  ENTER_DESCRIPTION = "ENTER_DESCRIPTION",
  ATTACH_IMAGES = "ATTACH_IMAGES",
  SELECT_PRIORITY = "SELECT_PRIORITY",
  CONFIRM_TICKET = "CONFIRM_TICKET"
}

// Helpdesk categories with their specific issues
export const HELPDESK_CATEGORIES = {
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

// Location levels
export const LOCATION_LEVELS = [
  "Region",
  "Circle",
  "Division",
  "Subdivision",
  "Block",
  "Scheme",
  "Village",
  "ESR"
];

// Regions (6 regions as specified)
export const REGIONS = [
  "Amravati",
  "Nagpur",
  "Nashik",
  "Pune",
  "Konkan",
  "Chhatrapati Sambhajinagar"
];

// Priority levels
export const PRIORITY_LEVELS = ["Low", "Medium", "High"];

/**
 * Ticket conversation state for tracking the ticket creation flow
 */
export interface TicketConversationState {
  userId: number;
  currentStep: ConversationStep;
  collectedData: {
    title?: string;
    category?: string;
    specific_issue?: string;
    description?: string;
    level?: string;
    region?: string;
    circle?: string;
    division?: string;
    subdivision?: string;
    block?: string;
    scheme_id?: string;
    scheme_name?: string;
    village_name?: string;
    esr_name?: string;
    priority?: string;
    dashboard_url?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    vendor_emails?: string[]; // Auto-selected vendor emails based on region
  };
  pendingUploads?: Array<{
    path: string;
    filename: string;
    size: number;
    mimeType: string;
  }>;
  createdAt: Date;
}

// In-memory storage for conversation states (in production, use Redis or database)
const conversationStates = new Map<number, TicketConversationState>();

/**
 * Get vendor emails for a region
 */
export async function getVendorEmailsByRegion(region: string): Promise<string[]> {
  try {
    const db = await getDB();
    const regionVendors = await db.select()
      .from(vendors)
      .where(eq(vendors.region, region));
    
    return regionVendors
      .filter((v: any) => v.email)
      .map((v: any) => v.email as string);
  } catch (error) {
    console.error("Error fetching vendor emails:", error);
    return [];
  }
}

/**
 * Auto-categorize issue based on description using OpenAI
 */
export async function autoCategorizeIssue(description: string): Promise<{
  category: string;
  specific_issue: string;
  priority: string;
  confidence: number;
}> {
  if (!hasApiKey("OPENAI_API_KEY")) {
    return {
      category: "Data Issues",
      specific_issue: "Incorrect sensor data",
      priority: "Medium",
      confidence: 0
    };
  }

  const systemPrompt = `You are a helpdesk ticket categorization expert for Maharashtra Water Infrastructure Management Platform.

AVAILABLE CATEGORIES AND THEIR SPECIFIC ISSUES:
${Object.entries(HELPDESK_CATEGORIES)
    .map(([category, issues]) => {
      return `\n**${category}:**\n${issues.map(issue => `- ${issue}`).join("\n")}`;
    })
    .join("\n")}

PRIORITY LEVELS:
- High: Critical issues affecting water supply, safety hazards, complete system failures, urgent regulatory issues
- Medium: Moderate impact issues, intermittent problems, data inaccuracies affecting decisions
- Low: Minor cosmetic issues, feature requests, documentation issues

Analyze the user's issue description and classify it into the most appropriate category and specific issue. Also determine the priority level.

Respond ONLY with valid JSON in this exact format:
{
  "category": "<exact_category_name_from_list>",
  "specific_issue": "<exact_specific_issue_from_list>",
  "priority": "<Low|Medium|High>",
  "confidence": <number_0_to_1>,
  "reasoning": "<brief_explanation>"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKeys.openai}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this issue description: "${description}"` }
        ],
        max_tokens: 200,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";
    
    const result = JSON.parse(completionText.replace(/```json\s*|```\s*/g, "").trim());
    
    return {
      category: result.category || "Data Issues",
      specific_issue: result.specific_issue || "Incorrect sensor data",
      priority: result.priority || "Medium",
      confidence: result.confidence || 0.5
    };
  } catch (error) {
    console.error("Auto-categorization error:", error);
    return {
      category: "Data Issues",
      specific_issue: "Incorrect sensor data",
      priority: "Medium",
      confidence: 0
    };
  }
}

/**
 * Extract entities from user message using OpenAI
 */
export async function extractTicketEntities(
  userMessage: string,
  context: Partial<TicketConversationState["collectedData"]>
): Promise<{
  extracted: Partial<TicketConversationState["collectedData"]>;
  clarificationNeeded?: string[];
}> {
  if (!hasApiKey("OPENAI_API_KEY")) {
    return { extracted: {} };
  }

  const systemPrompt = `You are an entity extraction expert for helpdesk ticket creation.

AVAILABLE OPTIONS:
- Categories: ${Object.keys(HELPDESK_CATEGORIES).join(", ")}
- Regions: ${REGIONS.join(", ")}
- Levels: ${LOCATION_LEVELS.join(", ")}
- Priority: ${PRIORITY_LEVELS.join(", ")}

CURRENT CONTEXT:
${JSON.stringify(context, null, 2)}

Extract any relevant ticket information from the user's message. Look for:
- Title/summary of the issue
- Category and specific issue type
- Description details
- Location information (region, circle, division, subdivision, block, scheme, village, ESR)
- Priority level
- Contact information (name, phone, email)
- Dashboard URL
- Location level

Respond ONLY with valid JSON in this format:
{
  "extracted": {
    "title": "<extracted_title_or_null>",
    "category": "<extracted_category_or_null>",
    "specific_issue": "<extracted_specific_issue_or_null>",
    "description": "<extracted_description_or_null>",
    "level": "<extracted_level_or_null>",
    "region": "<extracted_region_or_null>",
    "circle": "<extracted_circle_or_null>",
    "division": "<extracted_division_or_null>",
    "subdivision": "<extracted_subdivision_or_null>",
    "block": "<extracted_block_or_null>",
    "scheme_id": "<extracted_scheme_id_or_null>",
    "scheme_name": "<extracted_scheme_name_or_null>",
    "village_name": "<extracted_village_name_or_null>",
    "esr_name": "<extracted_esr_name_or_null>",
    "priority": "<extracted_priority_or_null>",
    "dashboard_url": "<extracted_dashboard_url_or_null>",
    "contact_name": "<extracted_contact_name_or_null>",
    "contact_phone": "<extracted_contact_phone_or_null>",
    "contact_email": "<extracted_contact_email_or_null>"
  },
  "clarificationNeeded": ["<field_name_needing_clarification>"]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKeys.openai}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract ticket information from: "${userMessage}"` }
        ],
        max_tokens: 400,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const completionText = data.choices[0]?.message?.content?.trim() || "";
    const result = JSON.parse(completionText.replace(/```json\s*|```\s*/g, "").trim());
    
    // Filter out null values
    const extracted: any = {};
    for (const [key, value] of Object.entries(result.extracted || {})) {
      if (value !== null && value !== undefined && value !== "") {
        extracted[key] = value;
      }
    }
    
    return {
      extracted,
      clarificationNeeded: result.clarificationNeeded || []
    };
  } catch (error) {
    console.error("Entity extraction error:", error);
    return { extracted: {} };
  }
}

/**
 * Generate ticket ID (HD-000XXX format)
 */
export async function generateTicketId(): Promise<string> {
  const db = await getDB();
  
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
}

/**
 * Create ticket from chatbot conversation
 */
export async function createTicketFromChatbot(
  ticketData: TicketConversationState["collectedData"],
  userId: number,
  pendingUploads: Array<{ path: string; filename: string; size: number; mimeType: string }> = []
): Promise<{
  success: boolean;
  ticket?: any;
  message?: string;
}> {
  try {
    // Validate required fields
    const required = ["title", "category", "specific_issue", "description", "level", "region"];
    const missing = required.filter(field => !ticketData[field as keyof typeof ticketData]);
    
    if (missing.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`
      };
    }

    // Get user details for contact info (auto-populate)
    const db = await getDB();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return {
        success: false,
        message: "User not found"
      };
    }

    // Generate ticket ID
    const ticketId = await generateTicketId();
    
    // Auto-populate contact info from logged-in user
    const finalTicketData = {
      ticket_id: ticketId,
      title: ticketData.title!,
      category: ticketData.category!,
      specific_issue: ticketData.specific_issue!,
      description: ticketData.description!,
      level: ticketData.level!,
      region: ticketData.region || null,
      circle: ticketData.circle || null,
      division: ticketData.division || null,
      subdivision: ticketData.subdivision || null,
      block: ticketData.block || null,
      scheme_id: ticketData.scheme_id || null,
      scheme_name: ticketData.scheme_name || null,
      village_name: ticketData.village_name || null,
      esr_name: ticketData.esr_name || null,
      priority: ticketData.priority || "Medium",
      dashboard_url: ticketData.dashboard_url || null,
      contact_name: user.name || user.username,
      contact_phone: user.phone || null,
      contact_email: user.email || "",
      created_by: userId,
      attachment_path: null,
      attachment_filename: null,
      status: "Open",
      admin_comments: null
    };

    // Insert ticket
    const [newTicket] = await db.insert(helpdeskTickets)
      .values(finalTicketData)
      .returning();

    // Handle file attachments if any
    if (pendingUploads && pendingUploads.length > 0) {
      const { helpdeskAttachments } = await import("@shared/schema");
      for (const upload of pendingUploads) {
        await db.insert(helpdeskAttachments).values({
          ticket_id: newTicket.id,
          original_filename: upload.filename,
          stored_filename: upload.path.split('/').pop() || upload.filename,
          file_path: upload.path,
          file_size: upload.size,
          mime_type: upload.mimeType
          // uploaded_at has defaultNow() in schema, will be set automatically
        });
      }
    }
    
    // Clear pending uploads after successful insertion
    conversationStates.get(userId)?.pendingUploads?.splice(0);

    // Send email notifications
    try {
      // Send to user
      await sendTicketCreatedEmail(
        finalTicketData.contact_email,
        ticketId,
        finalTicketData.title,
        finalTicketData.description
      );

      // Send to regional vendors
      if (finalTicketData.region) {
        const regionVendors = await db.select()
          .from(vendors)
          .where(eq(vendors.region, finalTicketData.region));
        
        for (const vendor of regionVendors) {
          if (vendor.email) {
            await sendVendorNotificationEmail(
              vendor.email,
              vendor.employee_name,
              ticketId,
              finalTicketData.title,
              finalTicketData.description,
              finalTicketData.region,
              finalTicketData.contact_name,
              finalTicketData.contact_email,
              finalTicketData.contact_phone || 'Not provided',
              finalTicketData.priority,
              finalTicketData.category,
              finalTicketData.specific_issue
            );
          }
        }
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Continue even if email fails
    }

    return {
      success: true,
      ticket: newTicket
    };
  } catch (error) {
    console.error("Ticket creation error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create ticket"
    };
  }
}

/**
 * Get conversation state for a user
 */
export function getConversationState(userId: number): TicketConversationState | null {
  return conversationStates.get(userId) || null;
}

/**
 * Update conversation state
 */
export function updateConversationState(userId: number, state: Partial<TicketConversationState>): void {
  const existing = conversationStates.get(userId);
  if (existing) {
    conversationStates.set(userId, { ...existing, ...state });
  } else {
    conversationStates.set(userId, {
      userId,
      currentStep: ConversationStep.SELECT_REGION,
      collectedData: {},
      createdAt: new Date(),
      ...state
    });
  }
}

/**
 * Advance conversation to next step based on user input
 */
export async function advanceConversation(
  userId: number,
  userInput: string,
  inputType: 'selection' | 'text' = 'selection'
): Promise<{
  success: boolean;
  message: string;
  currentStep: ConversationStep;
  nextStep?: ConversationStep;
  options?: any;
  collectedData?: any;
  error?: string;
}> {
  const state = getConversationState(userId);
  
  if (!state) {
    return {
      success: false,
      message: "No active conversation. Please start a new ticket.",
      currentStep: ConversationStep.SELECT_REGION,
      error: "No active conversation"
    };
  }

  const updatedData = { ...state.collectedData };
  let nextStep = state.currentStep;
  let message = "";
  let options: any = null;

  try {
    switch (state.currentStep) {
      case ConversationStep.SELECT_REGION:
        if (!REGIONS.includes(userInput)) {
          return {
            success: false,
            message: "Invalid region. Please select from the provided options.",
            currentStep: state.currentStep,
            options: { regions: REGIONS },
            error: "Invalid region"
          };
        }
        updatedData.region = userInput;
        // Auto-fetch vendor emails
        updatedData.vendor_emails = await getVendorEmailsByRegion(userInput);
        nextStep = ConversationStep.SELECT_LOCATION_LEVEL;
        message = `✅ Region selected: ${userInput}\n\nPlease select the location level:`;
        options = { levels: LOCATION_LEVELS };
        break;

      case ConversationStep.SELECT_LOCATION_LEVEL:
        if (!LOCATION_LEVELS.includes(userInput)) {
          return {
            success: false,
            message: "Invalid location level. Please select from the provided options.",
            currentStep: state.currentStep,
            options: { levels: LOCATION_LEVELS },
            error: "Invalid level"
          };
        }
        updatedData.level = userInput;
        
        // For Scheme, Village, or ESR levels, collect all required fields
        if (userInput === "Scheme" || userInput === "Village" || userInput === "ESR") {
          nextStep = ConversationStep.ENTER_SCHEME_ID;
          message = `✅ Location level selected: ${userInput}\n\nPlease enter the Scheme ID:`;
          options = { inputType: "text", placeholder: "Enter Scheme ID" };
        } else {
          // Skip location details for Region/Circle/Division/Subdivision/Block
          nextStep = ConversationStep.SELECT_CATEGORY;
          message = `✅ Location level selected: ${userInput}\n\nNow, please select the issue category:`;
          options = { categories: Object.keys(HELPDESK_CATEGORIES) };
        }
        break;

      case ConversationStep.SELECT_CATEGORY:
        if (!Object.keys(HELPDESK_CATEGORIES).includes(userInput)) {
          return {
            success: false,
            message: "Invalid category. Please select from the provided options.",
            currentStep: state.currentStep,
            options: { categories: Object.keys(HELPDESK_CATEGORIES) },
            error: "Invalid category"
          };
        }
        updatedData.category = userInput;
        nextStep = ConversationStep.SELECT_SPECIFIC_ISSUE;
        message = `✅ Category selected: ${userInput}\n\nPlease select the specific issue:`;
        options = { issues: HELPDESK_CATEGORIES[userInput as keyof typeof HELPDESK_CATEGORIES] };
        break;

      case ConversationStep.SELECT_SPECIFIC_ISSUE:
        const categoryIssues = HELPDESK_CATEGORIES[updatedData.category as keyof typeof HELPDESK_CATEGORIES] || [];
        if (!categoryIssues.includes(userInput)) {
          return {
            success: false,
            message: "Invalid issue. Please select from the provided options.",
            currentStep: state.currentStep,
            options: { issues: categoryIssues },
            error: "Invalid issue"
          };
        }
        updatedData.specific_issue = userInput;
        updatedData.title = `${updatedData.category} - ${userInput}`;
        nextStep = ConversationStep.ENTER_DESCRIPTION;
        message = `✅ Issue selected: ${userInput}\n\nPlease describe the issue in detail:`;
        options = { inputType: "text", placeholder: "Describe your issue in detail..." };
        break;

      case ConversationStep.ENTER_SCHEME_ID:
        if (!userInput || userInput.trim().length < 1) {
          return {
            success: false,
            message: "Please enter a valid Scheme ID.",
            currentStep: state.currentStep,
            error: "Invalid Scheme ID"
          };
        }
        updatedData.scheme_id = userInput.trim();
        nextStep = ConversationStep.ENTER_SCHEME_NAME;
        message = `✅ Scheme ID: ${userInput}\n\nPlease enter the Scheme Name:`;
        options = { inputType: "text", placeholder: "Enter Scheme Name" };
        break;

      case ConversationStep.ENTER_SCHEME_NAME:
        if (!userInput || userInput.trim().length < 2) {
          return {
            success: false,
            message: "Please enter a valid Scheme Name (at least 2 characters).",
            currentStep: state.currentStep,
            error: "Invalid Scheme Name"
          };
        }
        updatedData.scheme_name = userInput.trim();
        
        // Route based on location level
        const level = updatedData.level;
        if (level === "Scheme") {
          // Scheme level only needs scheme_id and scheme_name
          nextStep = ConversationStep.SELECT_CATEGORY;
          message = `✅ Scheme Name: ${userInput}\n\nNow, please select the issue category:`;
          options = { categories: Object.keys(HELPDESK_CATEGORIES) };
        } else if (level === "Village" || level === "ESR") {
          // Village and ESR levels need village_name too
          nextStep = ConversationStep.ENTER_VILLAGE_NAME;
          message = `✅ Scheme Name: ${userInput}\n\nPlease enter the Village Name:`;
          options = { inputType: "text", placeholder: "Enter Village Name" };
        }
        break;

      case ConversationStep.ENTER_VILLAGE_NAME:
        if (!userInput || userInput.trim().length < 2) {
          return {
            success: false,
            message: "Please enter a valid Village Name (at least 2 characters).",
            currentStep: state.currentStep,
            error: "Invalid Village Name"
          };
        }
        updatedData.village_name = userInput.trim();
        
        // Route based on location level
        const villageLevel = updatedData.level;
        if (villageLevel === "Village") {
          // Village level only needs scheme_id, scheme_name, and village_name
          nextStep = ConversationStep.SELECT_CATEGORY;
          message = `✅ Village Name: ${userInput}\n\nNow, please select the issue category:`;
          options = { categories: Object.keys(HELPDESK_CATEGORIES) };
        } else if (villageLevel === "ESR") {
          // ESR level needs esr_name too
          nextStep = ConversationStep.ENTER_ESR_NAME;
          message = `✅ Village Name: ${userInput}\n\nPlease enter the ESR Name:`;
          options = { inputType: "text", placeholder: "Enter ESR Name" };
        }
        break;

      case ConversationStep.ENTER_ESR_NAME:
        if (!userInput || userInput.trim().length < 2) {
          return {
            success: false,
            message: "Please enter a valid ESR Name (at least 2 characters).",
            currentStep: state.currentStep,
            error: "Invalid ESR Name"
          };
        }
        updatedData.esr_name = userInput.trim();
        nextStep = ConversationStep.SELECT_CATEGORY;
        message = `✅ ESR Name: ${userInput}\n\nNow, please select the issue category:`;
        options = { categories: Object.keys(HELPDESK_CATEGORIES) };
        break;

      case ConversationStep.ENTER_DESCRIPTION:
        if (!userInput || userInput.trim().length < 10) {
          return {
            success: false,
            message: "Please provide a detailed description (at least 10 characters).",
            currentStep: state.currentStep,
            error: "Description too short"
          };
        }
        updatedData.description = userInput.trim();
        // Auto-categorize priority based on description if needed
        try {
          const autoCat = await autoCategorizeIssue(userInput);
          if (autoCat.confidence > 0.6) {
            updatedData.priority = autoCat.priority;
          }
        } catch (e) {
          updatedData.priority = "Medium";
        }
        nextStep = ConversationStep.ATTACH_IMAGES;
        message = `✅ Description recorded.\n\nWould you like to attach images or screenshots? (Optional)`;
        options = { 
          allowUpload: true, 
          skipOption: true,
          uploadMessage: "You can upload up to 5 images (JPEG, PNG, GIF, PDF, max 10MB each)"
        };
        break;

      case ConversationStep.ATTACH_IMAGES:
        // This step is handled separately through upload endpoint
        // User can either skip or confirm after uploading
        nextStep = ConversationStep.SELECT_PRIORITY;
        message = `${updatedData.priority ? `ℹ️ We've suggested "${updatedData.priority}" priority based on your description.\n\n` : ''}Please select the priority level for this ticket:`;
        options = { priorities: PRIORITY_LEVELS };
        break;

      case ConversationStep.SELECT_PRIORITY:
        if (!PRIORITY_LEVELS.includes(userInput)) {
          return {
            success: false,
            message: "Invalid priority. Please select from the provided options.",
            currentStep: state.currentStep,
            options: { priorities: PRIORITY_LEVELS },
            error: "Invalid priority"
          };
        }
        updatedData.priority = userInput;
        nextStep = ConversationStep.CONFIRM_TICKET;
        message = "📋 Let's review your ticket before submitting:";
        options = { showSummary: true, actions: ["Submit", "Cancel"] };
        break;

      default:
        return {
          success: false,
          message: "Unknown step in conversation.",
          currentStep: state.currentStep,
          error: "Unknown step"
        };
    }

    // Update state with new data and step
    updateConversationState(userId, {
      currentStep: nextStep,
      collectedData: updatedData
    });

    return {
      success: true,
      message,
      currentStep: nextStep,
      options,
      collectedData: updatedData
    };
  } catch (error) {
    console.error("Error advancing conversation:", error);
    return {
      success: false,
      message: "An error occurred processing your input.",
      currentStep: state.currentStep,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Clear conversation state
 */
export function clearConversationState(userId: number): void {
  conversationStates.delete(userId);
}

/**
 * Get user's tickets with filtering
 */
export async function getUserTickets(
  userId: number,
  filters?: {
    status?: string;
    category?: string;
    region?: string;
    limit?: number;
  }
): Promise<any[]> {
  const db = await getDB();
  
  let query = db.select()
    .from(helpdeskTickets)
    .where(eq(helpdeskTickets.created_by, userId));

  const conditions = [eq(helpdeskTickets.created_by, userId)];

  if (filters?.status) {
    conditions.push(eq(helpdeskTickets.status, filters.status));
  }
  
  if (filters?.category) {
    conditions.push(eq(helpdeskTickets.category, filters.category));
  }
  
  if (filters?.region) {
    conditions.push(eq(helpdeskTickets.region, filters.region));
  }

  if (conditions.length > 1) {
    query = db.select()
      .from(helpdeskTickets)
      .where(and(...conditions));
  }

  let result = await query.orderBy(desc(helpdeskTickets.created_at));
  
  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Get ticket by ID or ticket_id
 */
export async function getTicketById(
  ticketIdentifier: string | number,
  userId: number
): Promise<any | null> {
  const db = await getDB();
  
  // Check if it's a ticket_id (HD-000XXX format) or database id
  const isTicketId = typeof ticketIdentifier === 'string' && ticketIdentifier.startsWith('HD-');
  
  const [ticket] = await db.select()
    .from(helpdeskTickets)
    .where(
      and(
        isTicketId 
          ? eq(helpdeskTickets.ticket_id, ticketIdentifier as string)
          : eq(helpdeskTickets.id, Number(ticketIdentifier)),
        eq(helpdeskTickets.created_by, userId)
      )
    )
    .limit(1);

  return ticket || null;
}

/**
 * Search for similar tickets
 */
export async function findSimilarTickets(
  description: string,
  userId: number,
  limit: number = 5
): Promise<any[]> {
  const db = await getDB();
  
  // Simple keyword-based search
  // In production, use semantic search with embeddings
  const keywords = description
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  if (keywords.length === 0) {
    return [];
  }

  // Search in user's own tickets
  const tickets = await db.select()
    .from(helpdeskTickets)
    .where(eq(helpdeskTickets.created_by, userId))
    .orderBy(desc(helpdeskTickets.created_at))
    .limit(50); // Get recent tickets

  // Simple scoring: count matching keywords
  const scored = tickets.map((ticket: any) => {
    const ticketText = `${ticket.title} ${ticket.description} ${ticket.specific_issue}`.toLowerCase();
    const matches = keywords.filter(keyword => ticketText.includes(keyword)).length;
    return { ticket, score: matches };
  });

  // Sort by score and filter out non-matches
  const similar = scored
    .filter((item: any) => item.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit)
    .map((item: any) => item.ticket);

  return similar;
}

/**
 * Get ticket statistics and analytics
 */
export async function getTicketAnalytics(userId: number): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  recentTrends: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
  };
}> {
  const db = await getDB();
  
  // Get all user tickets
  const tickets = await db.select()
    .from(helpdeskTickets)
    .where(eq(helpdeskTickets.created_by, userId));

  const total = tickets.length;
  
  // Count by status
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  
  tickets.forEach((ticket: any) => {
    byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
    byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;
    byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
  });

  // Recent trends
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const thisWeek = tickets.filter((t: any) => new Date(t.created_at) >= oneWeekAgo).length;
  const lastWeek = tickets.filter((t: any) => {
    const createdAt = new Date(t.created_at);
    return createdAt >= twoWeeksAgo && createdAt < oneWeekAgo;
  }).length;
  const thisMonth = tickets.filter((t: any) => new Date(t.created_at) >= oneMonthAgo).length;

  return {
    total,
    byStatus,
    byCategory,
    byPriority,
    recentTrends: {
      thisWeek,
      lastWeek,
      thisMonth
    }
  };
}

/**
 * Perform quick action on ticket
 */
export async function performTicketAction(
  ticketIdentifier: string | number,
  userId: number,
  action: 'reopen' | 'close' | 'comment',
  data: {
    reason?: string;
    comment?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  ticket?: any;
}> {
  const db = await getDB();
  
  // Get ticket
  const ticket = await getTicketById(ticketIdentifier, userId);
  
  if (!ticket) {
    return {
      success: false,
      message: "Ticket not found or you don't have permission"
    };
  }

  try {
    switch (action) {
      case 'reopen':
        if (ticket.status !== 'Resolved') {
          return {
            success: false,
            message: "Only resolved tickets can be reopened"
          };
        }
        
        // Check 48-hour window
        const resolvedDate = new Date(ticket.updated_at);
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
        
        if (resolvedDate < fortyEightHoursAgo) {
          return {
            success: false,
            message: "Tickets can only be reopened within 48 hours of resolution"
          };
        }

        const reopenComment = `\n\n--- TICKET REOPENED VIA CHATBOT ---\nReopened on: ${new Date().toLocaleDateString()}\nReason: ${data.reason || 'No reason provided'}`;
        
        const [reopenedTicket] = await db.update(helpdeskTickets)
          .set({ 
            status: "Open",
            admin_comments: (ticket.admin_comments || '') + reopenComment,
            updated_at: new Date()
          })
          .where(eq(helpdeskTickets.id, ticket.id))
          .returning();

        return {
          success: true,
          message: "Ticket reopened successfully",
          ticket: reopenedTicket
        };

      case 'close':
        if (ticket.status !== 'Resolved') {
          return {
            success: false,
            message: "Only resolved tickets can be closed"
          };
        }

        const closeComment = data.reason 
          ? `\n\n--- TICKET CLOSED VIA CHATBOT ---\nClosed on: ${new Date().toLocaleDateString()}\nReason: ${data.reason}`
          : "";
        
        const [closedTicket] = await db.update(helpdeskTickets)
          .set({ 
            status: "Closed",
            admin_comments: (ticket.admin_comments || '') + closeComment,
            updated_at: new Date()
          })
          .where(eq(helpdeskTickets.id, ticket.id))
          .returning();

        return {
          success: true,
          message: "Ticket closed successfully",
          ticket: closedTicket
        };

      case 'comment':
        // Comments can only be added by admins in current system
        // For now, return not supported
        return {
          success: false,
          message: "Adding comments is currently only available to administrators"
        };

      default:
        return {
          success: false,
          message: "Invalid action"
        };
    }
  } catch (error) {
    console.error("Ticket action error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed"
    };
  }
}
