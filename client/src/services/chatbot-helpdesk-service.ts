/**
 * Chatbot Helpdesk Integration Service
 * Handles communication between chatbot and helpdesk backend
 */

import { apiRequest } from "@/lib/queryClient";

export interface TicketConversationData {
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
}

export interface ProcessMessageResponse {
  success: boolean;
  collectedData: TicketConversationData;
  currentStep: string;
  options?: any[];
  message?: string;
}

export interface CreateTicketResponse {
  success: boolean;
  ticket?: any;
  message?: string;
}

export interface Ticket {
  id: number;
  ticket_id: string;
  title: string;
  category: string;
  specific_issue: string;
  description: string;
  priority: string;
  status: string;
  region?: string;
  circle?: string;
  division?: string;
  subdivision?: string;
  block?: string;
  scheme_id?: string;
  scheme_name?: string;
  village_name?: string;
  esr_name?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  dashboard_url?: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  admin_comments?: string;
}

export interface TicketAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  recentTrends: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
  };
}

/**
 * Start a voice ticket creation session
 */
export async function startTicketCreation(initialMessage?: string): Promise<{
  success: boolean;
  message: string;
  conversationId?: number;
  extracted?: Partial<TicketConversationData>;
  autoCategorization?: any;
  nextStep?: string;
  currentStep?: string;
  options?: any[] | { regions?: string[]; categories?: string[]; issues?: string[]; levels?: string[] };
}> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/start-ticket", {
      method: "POST",
      body: JSON.stringify({ initialMessage }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    console.error("Start ticket creation error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to start ticket creation",
    };
  }
}

/**
 * Process a user message during ticket creation
 */
export async function processTicketMessage(message: string, inputType: 'selection' | 'text' = 'text'): Promise<ProcessMessageResponse> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/process-message", {
      method: "POST",
      body: JSON.stringify({ message, inputType }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    console.error("Process ticket message error:", error);
    throw error;
  }
}

/**
 * Upload files for a helpdesk ticket
 */
export async function uploadHelpdeskFiles(files: File[]): Promise<{
  success: boolean;
  fileNames?: string[];
  message?: string;
}> {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('attachments', file); // Must match backend multer field name
    });

    const response = await fetch("/api/chatbot/helpdesk/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(errorData.error || "Failed to upload files");
    }

    return await response.json();
  } catch (error) {
    console.error("Upload files error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload files",
    };
  }
}

/**
 * Create a ticket from collected data
 */
export async function createTicket(ticketData?: TicketConversationData): Promise<CreateTicketResponse> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/create-ticket", {
      method: "POST",
      body: JSON.stringify({ ticketData }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    console.error("Create ticket error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create ticket",
    };
  }
}

/**
 * Cancel ticket creation
 */
export async function cancelTicketCreation(): Promise<void> {
  try {
    await apiRequest("/api/chatbot/helpdesk/cancel-ticket", {
      method: "POST",
    });
  } catch (error) {
    console.error("Cancel ticket error:", error);
  }
}

/**
 * Get user's tickets with optional filters
 */
export async function getUserTickets(filters?: {
  status?: string;
  category?: string;
  region?: string;
  limit?: number;
}): Promise<Ticket[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.region) params.append("region", filters.region);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await apiRequest(`/api/chatbot/helpdesk/my-tickets?${params.toString()}`);
    return response.tickets || [];
  } catch (error) {
    console.error("Get user tickets error:", error);
    return [];
  }
}

/**
 * Get a specific ticket by ID
 */
export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  try {
    const response = await apiRequest(`/api/chatbot/helpdesk/ticket/${ticketId}`);
    return response.ticket || null;
  } catch (error) {
    console.error("Get ticket error:", error);
    return null;
  }
}

/**
 * Find similar tickets
 */
export async function findSimilarTickets(description: string, limit: number = 5): Promise<Ticket[]> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/similar-tickets", {
      method: "POST",
      body: JSON.stringify({ description, limit }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.similarTickets || [];
  } catch (error) {
    console.error("Find similar tickets error:", error);
    return [];
  }
}

/**
 * Get ticket analytics
 */
export async function getTicketAnalytics(): Promise<TicketAnalytics | null> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/analytics");
    return response.analytics || null;
  } catch (error) {
    console.error("Get analytics error:", error);
    return null;
  }
}

/**
 * Perform action on a ticket
 */
export async function performTicketAction(
  ticketId: string,
  action: "reopen" | "close" | "comment",
  data?: { reason?: string; comment?: string }
): Promise<{
  success: boolean;
  message: string;
  ticket?: Ticket;
}> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/ticket-action", {
      method: "POST",
      body: JSON.stringify({ ticketId, action, data }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    console.error("Ticket action error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed",
    };
  }
}

/**
 * Get available options for ticket fields
 */
export async function getHelpdeskOptions(): Promise<{
  categories: Record<string, string[]>;
  regions: string[];
  levels: string[];
  priorities: string[];
}> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/options");
    return response.options || {
      categories: {},
      regions: [],
      levels: [],
      priorities: [],
    };
  } catch (error) {
    console.error("Get helpdesk options error:", error);
    return {
      categories: {},
      regions: [],
      levels: [],
      priorities: [],
    };
  }
}

/**
 * Auto-categorize an issue description
 */
export async function autoCategorizeIssue(description: string): Promise<{
  category: string;
  specific_issue: string;
  priority: string;
  confidence: number;
}> {
  try {
    const response = await apiRequest("/api/chatbot/helpdesk/auto-categorize", {
      method: "POST",
      body: JSON.stringify({ description }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.categorization;
  } catch (error) {
    console.error("Auto-categorize error:", error);
    return {
      category: "Data Issues",
      specific_issue: "Incorrect sensor data",
      priority: "Medium",
      confidence: 0,
    };
  }
}

/**
 * Detect if a user message is helpdesk-related
 */
export function detectHelpdeskIntent(message: string): {
  isHelpdeskQuery: boolean;
  intent: "create" | "view" | "status" | "analytics" | "action" | null;
  confidence: number;
} {
  const messageLower = message.toLowerCase();

  // Intent patterns
  const createPatterns = [
    /create.*ticket/i,
    /raise.*issue/i,
    /report.*problem/i,
    /submit.*issue/i,
    /file.*ticket/i,
    /log.*issue/i,
    /having.*problem/i,
    /something.*wrong/i,
    /not.*working/i,
    /error|issue|problem|bug/i,
  ];

  const viewPatterns = [
    /my.*tickets/i,
    /show.*tickets/i,
    /list.*tickets/i,
    /view.*tickets/i,
    /ticket.*status/i,
    /check.*ticket/i,
  ];

  const analyticsPatterns = [
    /ticket.*analytics/i,
    /ticket.*statistics/i,
    /ticket.*summary/i,
    /ticket.*trends/i,
    /how many.*tickets/i,
  ];

  const actionPatterns = [
    /reopen.*ticket/i,
    /close.*ticket/i,
    /update.*ticket/i,
  ];

  // Check create intent
  if (createPatterns.some(pattern => pattern.test(messageLower))) {
    return { isHelpdeskQuery: true, intent: "create", confidence: 0.9 };
  }

  // Check view intent
  if (viewPatterns.some(pattern => pattern.test(messageLower))) {
    return { isHelpdeskQuery: true, intent: "view", confidence: 0.9 };
  }

  // Check analytics intent
  if (analyticsPatterns.some(pattern => pattern.test(messageLower))) {
    return { isHelpdeskQuery: true, intent: "analytics", confidence: 0.85 };
  }

  // Check action intent
  if (actionPatterns.some(pattern => pattern.test(messageLower))) {
    return { isHelpdeskQuery: true, intent: "action", confidence: 0.85 };
  }

  // Check for ticket ID references
  if (/HD-\d{6}/.test(message)) {
    return { isHelpdeskQuery: true, intent: "status", confidence: 0.95 };
  }

  return { isHelpdeskQuery: false, intent: null, confidence: 0 };
}
