// Import this instead of using full React object
import React, { useState, useEffect, createContext, useContext } from "react";
import { Rnd } from "react-rnd";
import { useChatbot } from "@/contexts/ChatbotContext";
// Import the chatbot component
import { createChatBotMessage } from "react-chatbot-kit"; // Check for village-specific queries if no scheme detected
import "react-chatbot-kit/build/main.css";
// Import UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Languages,
  Filter,
  MapPin,
  VolumeX,
} from "lucide-react";

// Import Voice Recognition component
import VoiceRecognition from "./VoiceRecognition";
import TextToSpeech from "./TextToSpeech";
import ChatbotGuide from "./ChatbotGuide";
// Import chatbot widgets
import FullyCompletedSchemesWidget from "./widgets/FullyCompletedSchemesWidget";
import FullyCompletedVillagesWidget from "./widgets/FullyCompletedVillagesWidget";
import PartialSchemesWidget from "./widgets/PartialSchemesWidget";
import CombinedSchemesWidget from "./widgets/CombinedSchemesWidget";
import AreaCoverageWidget from "./widgets/AreaCoverageWidget";
// Import Villages widgets
import VillagesWithWaterWidget from "./widgets/VillagesWithWaterWidget";
import VillagesNoWaterWidget from "./widgets/VillagesNoWaterWidget";
import ConsistentWaterWidget from "./widgets/ConsistentWaterWidget";
import ConsistentZeroWidget from "./widgets/ConsistentZeroWidget";
// Import LPCD widgets
import Above55LpcdWidget from "./widgets/Above55LpcdWidget";
import Below55LpcdWidget from "./widgets/Below55LpcdWidget";
import ConsistentAbove55LpcdWidget from "./widgets/ConsistentAbove55LpcdWidget";
import ConsistentBelow55LpcdWidget from "./widgets/ConsistentBelow55LpcdWidget";
// Import Scheme-level LPCD widgets
import CombinedSchemeLpcdWidget from "./widgets/CombinedSchemeLpcdWidget";
import Above55SchemeWidget from "./widgets/Above55SchemeWidget";
import Below55SchemeWidget from "./widgets/Below55SchemeWidget";
// Import Combined widgets
import CombinedWaterStatusWidget from "./widgets/CombinedWaterStatusWidget";
import CombinedLpcdStatusWidget from "./widgets/CombinedLpcdStatusWidget";
// Import Pressure widgets
import OptimalPressureWidget from "./widgets/OptimalPressureWidget";
import BelowPressureWidget from "./widgets/BelowPressureWidget";
import AbovePressureWidget from "./widgets/AbovePressureWidget";
// Import Chlorine widgets
import OptimalChlorineWidget from "./widgets/OptimalChlorineWidget";
import BelowChlorineWidget from "./widgets/BelowChlorineWidget";
import AboveChlorineWidget from "./widgets/AboveChlorineWidget";
// Import Combined Chlorine and Pressure widgets
import CombineChlorineStatusWidget from "./widgets/CombineChlorineStatusWidget";
import CombinePressureStatusWidget from "./widgets/CombinePressureStatusWidget";
// Import Consistent Chlorine widgets
import ConsistentOptimalChlorineWidget from "./widgets/ConsistentOptimalChlorineWidget";
import ConsistentAboveChlorineWidget from "./widgets/ConsistentAboveChlorineWidget";
import ConsistentBelowChlorineWidget from "./widgets/ConsistentBelowChlorineWidget";
// Import Consistent Pressure widgets
import ConsistentOptimalPressureWidget from "./widgets/ConsistentOptimalPressureWidget";
import ConsistentAbovePressureWidget from "./widgets/ConsistentAbovePressureWidget";
import ConsistentBelowPressureWidget from "./widgets/ConsistentBelowPressureWidget";
// Import Average LPCD widgets
import AverageAbove55LpcdWidget from "./widgets/AverageAbove55LpcdWidget";
import AverageBelow55LpcdWidget from "./widgets/AverageBelow55LpcdWidget";
// Import Average Chlorine widgets
import AverageOptimalChlorineWidget from "./widgets/AverageOptimalChlorineWidget";
import AverageBelowChlorineWidget from "./widgets/AverageBelowChlorineWidget";
import AverageAboveChlorineWidget from "./widgets/AverageAboveChlorineWidget";
// Import Average Pressure widgets
import AverageOptimalPressureWidget from "./widgets/AverageOptimalPressureWidget";
import AverageBelowPressureWidget from "./widgets/AverageBelowPressureWidget";
import AverageAbovePressureWidget from "./widgets/AverageAbovePressureWidget";
// Import Chart widgets
import WaterConsumptionChartWidget from "./widgets/WaterConsumptionChartWidget";
import ChlorineAnalysisChartWidget from "./widgets/ChlorineAnalysisChartWidget";
import PressureAnalysisChartWidget from "./widgets/PressureAnalysisChartWidget";
// Import ESR widgets
import ESRWaterConsumptionWidget from "./widgets/ESRWaterConsumptionWidget";
import AbruptWaterConsumptionWidget from "./widgets/AbruptWaterConsumptionWidget";
import LPCDChartWidget from "./widgets/LPCDChartWidget";
import ESRCapacityWidget from "./widgets/ESRCapacityWidget";
import ReliableWaterConsumptionWidget from "./widgets/ReliableWaterConsumptionWidget";
// Import Suggestions Sidebar
import ChatbotSuggestions from "./ChatbotSuggestions";
// Import Helpdesk widgets
import HelpdeskTicketWidget from "./widgets/HelpdeskTicketWidget";
import HelpdeskTicketListWidget from "./widgets/HelpdeskTicketListWidget";
import HelpdeskAnalyticsWidget from "./widgets/HelpdeskAnalyticsWidget";
// Import OpenAI integration
import {
  getOpenAICompletion,
  detectLanguage,
  translateText,
  LANGUAGE_NAMES,
} from "@/services/openai-service";
import {
  parseQuery,
  fetchDataForParsing,
  type ParsedQuery,
} from "@/services/nlp-service";
import { detectLanguageFromText, t, getResponseTemplate, Language, translateRegionName } from "@/lib/translations";
import { translateMessageWithOpenAI, translateBotResponse } from "@/services/openai-service";
// Import Helpdesk integration
import {
  detectHelpdeskIntent,
  startTicketCreation,
  processTicketMessage,
  createTicket,
  getUserTickets,
  getTicketById,
  getTicketAnalytics,
  performTicketAction,
  findSimilarTickets,
  uploadHelpdeskFiles,
  type Ticket,
  type TicketAnalytics,
} from "@/services/chatbot-helpdesk-service";
// Import PDF generator
import { generateProfessionalSchemePDF } from "@/lib/pdf-generator-professional";
// Import widget context messages
import { getEnhancedWidgetMessage } from "@/services/widget-context-messages";

// Create a context to manage dashboard filter state
interface DashboardFilterContext {
  setSelectedRegion: (region: string) => void;
  setStatusFilter: (status: string) => void;
  applyFilters: (filters: { region?: string; status?: string }) => void;
}

const FilterContext = createContext<DashboardFilterContext | null>(null);

// Provider component to be used in dashboard.tsx
export const FilterContextProvider: React.FC<{
  children: React.ReactNode;
  setSelectedRegion: (region: string) => void;
  setStatusFilter: (status: string) => void;
}> = ({ children, setSelectedRegion, setStatusFilter }) => {
  const applyFilters = (filters: { region?: string; status?: string }) => {
    if (filters.region) {
      setSelectedRegion(filters.region);
    }
    if (filters.status) {
      setStatusFilter(filters.status);
    }
  };

  return (
    <FilterContext.Provider
      value={{ setSelectedRegion, setStatusFilter, applyFilters }}
    >
      {children}
    </FilterContext.Provider>
  );
};

// Define message types for proper type checking
interface ChatMessage {
  type: "user" | "bot";
  text: string;
  id?: string; // Unique identifier for message tracking (prevents race conditions)
  fromVoice?: boolean;
  filters?: { region?: string; status?: string };
  autoSpeak?: boolean;
  widget?: string;
  schemeAnalysis?: any;
  pendingSuggestion?: any;
  schemes?: any[];
  regions?: any[];
  selectedRegion?: string;
  selectedScheme?: string;
  selectedVillage?: string;
  schemeType?: string;
  // Villages data
  villages?: any[];
  // ESRs data
  esrs?: any[];
  // Combined widget data
  combinedChlorineData?: any;
  combinedChlorineCounts?: any;
  combinedPressureData?: any;
  combinedPressureCounts?: any;
  // Chart widget data
  villageData?: any;
  // Village selection for multiple matches
  villageOptions?: any[];
  chartType?: string;
  // Chlorine sensor export data
  chlorineSensorExportData?: {
    metric: string;
    days: number;
    region: string;
    count: number;
    label: string;
  };
  // Helpdesk data
  ticket?: Ticket;
  tickets?: Ticket[];
  ticketAnalytics?: TicketAnalytics;
  // Helpdesk interactive state
  helpdeskStep?: string;
  helpdeskOptions?:
  | any[]
  | {
    regions?: string[];
    categories?: string[];
    issues?: string[];
    levels?: string[];
  };
  helpdeskCollectedData?: any;
}

// Custom Chatbot Components for simplicity - avoiding JSX in widget functions
const CustomChatbot = ({
  onClose,
  externalInput,
}: {
  onClose: () => void;
  externalInput?: string;
}) => {
  const { chatMessages, setChatMessages } = useChatbot();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = React.useState("en-IN");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const latestMessagesRef = React.useRef<ChatMessage[]>([]);
  const filterContext = useContext(FilterContext);

  // Helpdesk conversation state - synced with backend session
  const helpdeskState = React.useRef<{
    active: boolean;
    conversationId?: number;
    currentStep?: string;
    collectedData?: any;
    uploadedFiles?: string[];
  }>({
    active: false,
  });

  // Keep latestMessagesRef in sync
  React.useEffect(() => {
    latestMessagesRef.current = chatMessages;
  }, [chatMessages]);

  // Helpdesk intent handler - processes help desk ticket queries
  const handleHelpdeskIntent = async (
    text: string,
    recentMessages: ChatMessage[],
    fromVoice: boolean = false,
  ): Promise<{
    handled: boolean;
    newMessages: ChatMessage[];
  }> => {
    const intent = detectHelpdeskIntent(text);

    if (!intent.isHelpdeskQuery && !helpdeskState.current.active) {
      return { handled: false, newMessages: [] };
    }

    const newMessages: ChatMessage[] = [];

    try {
      // Handle ongoing ticket creation
      if (
        helpdeskState.current.active &&
        intent.intent !== "view" &&
        intent.intent !== "status" &&
        intent.intent !== "analytics" &&
        intent.intent !== "action"
      ) {
        // User is in an active ticket creation flow
        const inputType = helpdeskState.current.currentStep?.includes("SELECT")
          ? "selection"
          : "text";
        const result = await processTicketMessage(text, inputType);

        helpdeskState.current.collectedData = result.collectedData;
        helpdeskState.current.currentStep = result.currentStep;

        // Handle different steps
        if (result.currentStep === "CONFIRM_TICKET") {
          // Show confirmation summary
          newMessages.push({
            type: "bot",
            text:
              result.message || "📋 Please review your ticket details below:",
            helpdeskStep: "CONFIRM_TICKET",
            helpdeskCollectedData: result.collectedData,
            autoSpeak: fromVoice,
          });
        } else if (result.currentStep && result.options) {
          // Show interactive options
          newMessages.push({
            type: "bot",
            text: result.message || "Please select from the options below:",
            helpdeskStep: result.currentStep,
            helpdeskOptions: result.options,
            helpdeskCollectedData: result.collectedData,
            autoSpeak: fromVoice,
          });
        } else {
          // Simple text response
          newMessages.push({
            type: "bot",
            text: result.message || "Please provide more information.",
            helpdeskStep: result.currentStep,
            helpdeskCollectedData: result.collectedData,
            autoSpeak: fromVoice,
          });
        }

        return { handled: true, newMessages };
      }

      // Handle intent-based actions (start new ticket, view, etc.)
      switch (intent.intent) {
        case "create": {
          // Start new ticket creation
          const result = await startTicketCreation(text);

          if (result.success) {
            helpdeskState.current.active = true;
            helpdeskState.current.conversationId = result.conversationId;
            helpdeskState.current.collectedData = result.extracted || {};
            helpdeskState.current.currentStep = result.nextStep;

            // Check if we have options to display
            if (result.nextStep && result.options) {
              newMessages.push({
                type: "bot",
                text:
                  result.message || "🎫 I'll help you create a support ticket.",
                helpdeskStep: result.nextStep,
                helpdeskOptions: result.options,
                helpdeskCollectedData: result.extracted || {},
                autoSpeak: fromVoice,
              });
            } else {
              newMessages.push({
                type: "bot",
                text:
                  result.message ||
                  "🎫 I'll help you create a support ticket. Please describe your issue in detail.",
                helpdeskStep: result.nextStep,
                helpdeskCollectedData: result.extracted || {},
                autoSpeak: fromVoice,
              });
            }
          } else {
            newMessages.push({
              type: "bot",
              text: `❌ ${result.message}`,
              autoSpeak: fromVoice,
            });
          }
          break;
        }

        case "view": {
          // Get user's tickets
          const tickets = await getUserTickets({ limit: 10 });

          if (tickets.length > 0) {
            newMessages.push({
              type: "bot",
              text: `📋 Here are your recent tickets:`,
              widget: "helpdeskTicketList",
              tickets,
              autoSpeak: fromVoice,
            });
          } else {
            newMessages.push({
              type: "bot",
              text: "You haven't created any tickets yet. Say 'create a ticket' to report an issue.",
              autoSpeak: fromVoice,
            });
          }
          break;
        }

        case "status": {
          // Extract ticket ID from message
          const ticketIdMatch = text.match(/HD-\d{6}/);

          if (ticketIdMatch) {
            const ticketId = ticketIdMatch[0];
            const ticket = await getTicketById(ticketId);

            if (ticket) {
              newMessages.push({
                type: "bot",
                text: `Here's the status of your ticket **${ticketId}**:`,
                widget: "helpdeskTicket",
                ticket,
                autoSpeak: fromVoice,
              });
            } else {
              newMessages.push({
                type: "bot",
                text: `Ticket ${ticketId} not found or you don't have permission to view it.`,
                autoSpeak: fromVoice,
              });
            }
          } else {
            newMessages.push({
              type: "bot",
              text: "Please provide a ticket ID (e.g., HD-000001) to check its status.",
              autoSpeak: fromVoice,
            });
          }
          break;
        }

        case "analytics": {
          // Get ticket analytics
          const analytics = await getTicketAnalytics();

          if (analytics) {
            newMessages.push({
              type: "bot",
              text: `📊 Here's your helpdesk analytics:`,
              widget: "helpdeskAnalytics",
              ticketAnalytics: analytics,
              autoSpeak: fromVoice,
            });
          } else {
            newMessages.push({
              type: "bot",
              text: "Unable to retrieve analytics at the moment.",
              autoSpeak: fromVoice,
            });
          }
          break;
        }

        case "action": {
          // Extract ticket ID and action
          const ticketIdMatch = text.match(/HD-\d{6}/);
          const isReopen = /reopen/i.test(text);
          const isClose = /close/i.test(text);

          if (ticketIdMatch && (isReopen || isClose)) {
            const ticketId = ticketIdMatch[0];
            const action = isReopen ? "reopen" : "close";

            const result = await performTicketAction(ticketId, action);

            if (result.success) {
              newMessages.push({
                type: "bot",
                text: `✅ ${result.message}`,
                widget: result.ticket ? "helpdeskTicket" : undefined,
                ticket: result.ticket,
                autoSpeak: fromVoice,
              });
            } else {
              newMessages.push({
                type: "bot",
                text: `❌ ${result.message}`,
                autoSpeak: fromVoice,
              });
            }
          } else {
            newMessages.push({
              type: "bot",
              text: "Please specify a ticket ID and action (e.g., 'reopen ticket HD-000001').",
              autoSpeak: fromVoice,
            });
          }
          break;
        }

        default: {
          return { handled: false, newMessages: [] };
        }
      }

      return { handled: true, newMessages };
    } catch (error) {
      console.error("Helpdesk handler error:", error);
      return {
        handled: true,
        newMessages: [
          {
            type: "bot",
            text: "Sorry, I encountered an error processing your helpdesk request. Please try again.",
            autoSpeak: fromVoice,
          },
        ],
      };
    }
  };

  // Helper function to generate translated message text for different languages
  const getTranslatedMessage = async (
    messageKey: string,
    language: Language,
    params?: Record<string, string | number>
  ): Promise<string> => {
    const messages: Record<string, Record<Language, string>> = {
      'showingComprehensiveData': {
        en: `📊 **Showing comprehensive water infrastructure data{scopeText}:**\n\nHere's a detailed view of all metrics - Village Status, LPCD, Chlorine, Pressure, and Water Consumption analysis.`,
        hi: `📊 **व्यापक जल अवसंरचना डेटा दिखा रहे हैं{scopeText}:**\n\nयहां सभी मेट्रिक्स का विस्तृत दृश्य है - गांव स्थिति, LPCD, क्लोरीन, दबाव और जल खपत विश्लेषण।`,
        mr: `📊 **सर्वसमावेशक जल पायाभूत सुविधा डेटा दाखवत आहे{scopeText}:**\n\nसर्व मेट्रिक्सचे तपशीलवार दृश्य - गाव स्थिती, LPCD, क्लोरीन, दाब आणि पाणी वापर विश्लेषण.`
      },
      'showingVillageWaterStatus': {
        en: `📊 Showing village water status{scopeText}:`,
        hi: `📊 गांव की पानी स्थिति दिखा रहे हैं{scopeText}:`,
        mr: `📊 गावांची पाणी स्थिती दाखवत आहे{scopeText}:`
      },
      'showingChlorineAnalysis': {
        en: `🧪 Showing chlorine analysis for {regions}`,
        hi: `🧪 {regions} के लिए क्लोरीन विश्लेषण दिखा रहे हैं`,
        mr: `🧪 {regions} साठी क्लोरीन विश्लेषण दाखवत आहे`
      },
      'showingPressureAnalysis': {
        en: `⚡ Showing pressure analysis for {regions}`,
        hi: `⚡ {regions} के लिए दबाव विश्लेषण दिखा रहे हैं`,
        mr: `⚡ {regions} साठी दाब विश्लेषण दाखवत आहे`
      },
      'showingLpcdAnalysis': {
        en: `💧 Showing LPCD analysis for {regions}`,
        hi: `💧 {regions} के लिए LPCD विश्लेषण दिखा रहे हैं`,
        mr: `💧 {regions} साठी LPCD विश्लेषण दाखवत आहे`
      },
      'showingVillageStatus': {
        en: `🏘️ Showing village water status for {regions}`,
        hi: `🏘️ {regions} के लिए गांव की पानी स्थिति दिखा रहे हैं`,
        mr: `🏘️ {regions} साठी गावांची पाणी स्थिती दाखवत आहे`
      },
      'showingChlorineAndPressure': {
        en: `📊 Showing chlorine and pressure analysis{scopeText}:`,
        hi: `📊 क्लोरीन और दबाव विश्लेषण दिखा रहे हैं{scopeText}:`,
        mr: `📊 क्लोरीन आणि दाब विश्लेषण दाखवत आहे{scopeText}:`
      },
      'showingComprehensiveAnalysis': {
        en: `📊 Showing comprehensive analysis: Pressure, Chlorine & Water Consumption{scopeText}:`,
        hi: `📊 व्यापक विश्लेषण दिखा रहे हैं: दबाव, क्लोरीन और जल खपत{scopeText}:`,
        mr: `📊 सर्वसमावेशक विश्लेषण दाखवत आहे: दाब, क्लोरीन आणि पाणी वापर{scopeText}:`
      },
      'analyzingChlorineSensors': {
        en: `🔍 Analyzing chlorine sensors that are {metricLabel} for {days} consecutive day{plural} in {regionLabel}...`,
        hi: `🔍 {regionLabel} में {days} लगातार दिनों{plural} के लिए {metricLabel} क्लोरीन सेंसरों का विश्लेषण कर रहे हैं...`,
        mr: `🔍 {regionLabel} मध्ये {days} सलग दिवस{plural} साठी {metricLabel} क्लोरीन सेंसरचे विश्लेषण करत आहे...`
      },
      'showingWaterConsumptionAndLpcd': {
        en: `📊 Showing water consumption and LPCD analysis{scopeText}:`,
        hi: `📊 जल खपत और LPCD विश्लेषण दिखा रहे हैं{scopeText}:`,
        mr: `📊 पाणी वापर आणि LPCD विश्लेषण दाखवत आहे{scopeText}:`
      },
      'showingChlorineAndWaterConsumption': {
        en: `📊 Showing chlorine and water consumption analysis{scopeText}:`,
        hi: `📊 क्लोरीन और जल खपत विश्लेषण दिखा रहे हैं{scopeText}:`,
        mr: `📊 क्लोरीन आणि पाणी वापर विश्लेषण दाखवत आहे{scopeText}:`
      },
      'showingPressureAndLpcd': {
        en: `📊 Showing pressure and LPCD analysis{scopeText}:`,
        hi: `📊 दबाव और LPCD विश्लेषण दिखा रहे हैं{scopeText}:`,
        mr: `📊 दाब आणि LPCD विश्लेषण दाखवत आहे{scopeText}:`
      },
      'showingPressureAndWaterConsumption': {
        en: `📊 Showing pressure and water consumption analysis{scopeText}:`,
        hi: `📊 दबाव और जल खपत विश्लेषण दिखा रहे हैं{scopeText}:`,
        mr: `📊 दाब आणि पाणी वापर विश्लेषण दाखवत आहे{scopeText}:`
      },
      'showingChlorineAndLpcd': {
        en: `📊 Showing chlorine and LPCD analysis{scopeText}:`,
        hi: `📊 क्लोरीन और LPCD विश्लेषण दिखा रहे हैं{scopeText}:`,
        mr: `📊 क्लोरीन आणि LPCD विश्लेषण दाखवत आहे{scopeText}:`
      },
      'inRegion': {
        en: ` for {region} region`,
        hi: ` {region} क्षेत्र के लिए`,
        mr: ` {region} प्रदेशासाठी`
      },
      'acrossAllRegions': {
        en: ' across all regions',
        hi: ' सभी क्षेत्रों में',
        mr: ' सर्व प्रदेशांमध्ये'
      }
    };

    let text = messages[messageKey]?.[language] || messages[messageKey]?.['en'] || messageKey;

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  // Helper to translate region names for display in messages
  const getTranslatedRegionList = (regions: string[], language: Language): string => {
    return regions.map(r => {
      const capitalizedRegion = r.charAt(0).toUpperCase() + r.slice(1);
      return translateRegionName(capitalizedRegion, language);
    }).join(', ');
  };

  // Track the current user query language for translation
  const currentQueryLanguageRef = React.useRef<Language>('en');

  // Universal translation wrapper for bot messages
  // Automatically translates messages to the user's query language using OpenAI
  const translateAndStreamMessage = async (
    messageData: Partial<ChatMessage>,
    userQueryText?: string,
    context?: string,
    delayMs: number = 50
  ): Promise<void> => {
    const detectedLang = userQueryText
      ? detectLanguageFromText(userQueryText)
      : currentQueryLanguageRef.current;

    if (detectedLang !== 'en' && messageData.text) {
      try {
        const translatedText = await translateBotResponse(
          messageData.text,
          detectedLang,
          { context: context || 'water infrastructure analysis' }
        );
        return addStreamedBotMessage({ ...messageData, text: translatedText }, delayMs);
      } catch (error) {
        console.error('Translation error, using original text:', error);
        return addStreamedBotMessage(messageData, delayMs);
      }
    }

    return addStreamedBotMessage(messageData, delayMs);
  };

  // Handle external input from suggestions
  React.useEffect(() => {
    if (externalInput) {
      setInput(externalInput);
      // Auto-submit the suggestion
      setTimeout(() => {
        handleSendMessage(externalInput);
      }, 100);
    }
  }, [externalInput]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // UNIVERSAL STREAMING HELPER - Streams ALL bot messages word-by-word like ChatGPT
  // This function handles both simple text messages and complex messages with widgets/data
  // Uses unique message ID to prevent race conditions from array index desyncs
  const addStreamedBotMessage = async (
    messageData: Partial<ChatMessage>,
    delayMs: number = 50, // Delay between words in milliseconds (50ms for visible streaming)
  ): Promise<void> => {
    return new Promise((resolve) => {
      // Generate unique ID for this message to track it reliably
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Extract widget/data properties to add AFTER text streaming
      const { text, autoSpeak, ...widgetAndDataProps } = messageData;

      // Create initial empty bot message WITHOUT widget/data properties
      const newMessage: ChatMessage = {
        type: "bot",
        text: "",
        autoSpeak: autoSpeak || false,
        id: messageId, // Add unique ID for tracking
      };

      // Add the empty message (text-only, no widgets yet)
      setChatMessages((prev) => [...prev, newMessage]);

      // Update ref immediately
      latestMessagesRef.current = [...latestMessagesRef.current, newMessage];

      // If there's no text to stream, add widgets immediately and resolve
      if (!text || text.length === 0) {
        // Add widget properties immediately if no text
        setChatMessages((prevMessages: ChatMessage[]) => {
          const newMessages = prevMessages.map((msg) =>
            msg.id === messageId ? { ...msg, ...widgetAndDataProps } : msg,
          );
          latestMessagesRef.current = newMessages;
          return newMessages;
        });
        resolve();
        return;
      }

      // Split text into words while preserving formatting
      const words = text.split(/(\s+)/); // Split by whitespace but keep the whitespace
      let currentText = "";
      let wordIndex = 0;
      let isCancelled = false;

      // Use an interval to add words one by one
      const streamInterval = setInterval(() => {
        if (isCancelled || wordIndex >= words.length) {
          clearInterval(streamInterval);

          // AFTER text streaming is complete, add widget/data properties
          setChatMessages((prevMessages: ChatMessage[]) => {
            const newMessages = prevMessages.map((msg) =>
              msg.id === messageId ? { ...msg, ...widgetAndDataProps } : msg,
            );
            latestMessagesRef.current = newMessages;
            return newMessages;
          });

          resolve(); // Resolve the promise when streaming is complete
          return;
        }

        currentText += words[wordIndex];

        // Update the message by ID (safer than index-based update)
        setChatMessages((prevMessages: ChatMessage[]) => {
          const newMessages = prevMessages.map((msg) =>
            msg.id === messageId ? { ...msg, text: currentText } : msg,
          );
          // Also update ref
          latestMessagesRef.current = newMessages;
          return newMessages;
        });

        wordIndex++;
      }, delayMs);

      // Note: Promise will resolve when the interval completes via the resolve() call above
    });
  };

  // Backward-compatible wrapper for simple text streaming
  const displayStreamingResponse = async (
    text: string,
    autoSpeak: boolean = false,
    delayMs: number = 50, // 50ms for visible streaming effect
  ): Promise<void> => {
    return addStreamedBotMessage({ text, autoSpeak }, delayMs);
  };

  // Helper function for streaming OpenAI responses with proper SSE buffering
  const getOpenAIStreamingResponse = async (
    prompt: string,
    language: string = "en",
    maxTokens: number = 500,
    temperature: number = 0.7,
    autoSpeak: boolean = false,
  ): Promise<string> => {
    let streamingMessageIndex = -1;

    try {
      const response = await fetch("/api/ai/chat-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language,
          maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Create a reader for the response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = ""; // Buffer for incomplete SSE events

      // Create a temporary bot message that will be updated as chunks arrive
      streamingMessageIndex = latestMessagesRef.current.length;
      setChatMessages([
        ...latestMessagesRef.current,
        {
          type: "bot",
          text: "",
          autoSpeak,
        },
      ]);

      // Read the stream with proper SSE event buffering
      let streamDone = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Flush decoder to capture trailing multi-byte characters
          buffer += decoder.decode();
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by \n\n)
        const events = buffer.split("\n\n");

        // Keep the last incomplete event in buffer
        buffer = events.pop() || "";

        // Parse each complete event
        for (const event of events) {
          if (streamDone) break;

          const lines = event.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6); // Remove "data: " prefix

              if (dataStr === "[DONE]") {
                streamDone = true;
                // Cancel the reader to stop fetching more data
                reader.cancel();
                break;
              }

              try {
                const data = JSON.parse(dataStr);
                if (data.content) {
                  fullText += data.content;

                  // Update the message in real-time with proper type
                  setChatMessages((prevMessages: ChatMessage[]) => {
                    const newMessages = [...prevMessages];
                    if (newMessages[streamingMessageIndex]) {
                      newMessages[streamingMessageIndex] = {
                        ...newMessages[streamingMessageIndex],
                        text: fullText,
                      };
                    }
                    return newMessages;
                  });
                }
              } catch (parseError) {
                // Skip unparseable JSON - likely incomplete
                console.warn("Failed to parse SSE event:", dataStr);
                continue;
              }
            }
          }
        }

        if (streamDone) break;
      }

      return fullText;
    } catch (error) {
      console.error("Streaming error:", error);

      // Try to fallback to non-streaming if streaming fails
      try {
        console.log("Attempting fallback to non-streaming completion...");
        const fallbackResponse = await getOpenAICompletion({
          prompt,
          maxTokens,
          temperature,
          language,
        });

        if (!fallbackResponse.isError && fallbackResponse.text) {
          // Update the message with the non-streaming response using streaming display
          if (streamingMessageIndex >= 0) {
            // Remove the empty streaming message first
            setChatMessages((prevMessages) =>
              prevMessages.slice(0, streamingMessageIndex),
            );
            // Display with streaming effect
            await displayStreamingResponse(
              fallbackResponse.text,
              autoSpeak,
              50,
            );
          }
          return fallbackResponse.text;
        }
      } catch (fallbackError) {
        console.error("Fallback to non-streaming also failed:", fallbackError);
      }

      // If both streaming and fallback failed, show error message
      if (streamingMessageIndex >= 0) {
        setChatMessages((prevMessages: ChatMessage[]) => {
          const newMessages = [...prevMessages];
          if (newMessages[streamingMessageIndex]) {
            newMessages[streamingMessageIndex] = {
              ...newMessages[streamingMessageIndex],
              text: "Sorry, I encountered an error while processing your request. Please try again.",
            };
          }
          return newMessages;
        });
      }

      throw error;
    }
  };

  // Excel export helper function
  const triggerExcelExport = () => {
    try {
      console.log("Attempting to trigger Excel export...");

      // Find export button on current page using multiple selectors
      const exportButtonSelectors = [
        "button:has(.lucide-download)",
        'button[aria-label*="Export"]',
        "button.border-green-200",
        "button.bg-green-50",
        "button.text-green-700",
      ];

      for (const selector of exportButtonSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          console.log(`Found export button with selector: ${selector}`);
          (button as HTMLButtonElement).click();
          return;
        }
      }

      // Fallback: find any button with "export" or "download" text
      const allButtons = Array.from(document.querySelectorAll("button"));
      const exportButton = allButtons.find((btn) => {
        const text = btn.textContent?.toLowerCase() || "";
        return text.includes("export") && text.includes("excel");
      });

      if (exportButton) {
        console.log("Found export button by text content");
        (exportButton as HTMLButtonElement).click();
      } else {
        console.warn("No export button found on current page");
      }
    } catch (error) {
      console.error("Error triggering Excel export:", error);
    }
  };

  // Comprehensive scheme Excel export helper function
  const triggerComprehensiveSchemeExport = async (identifier: string) => {
    try {
      console.log(`Triggering comprehensive scheme export for: ${identifier}`);

      const url = `/api/scheme-analysis/export/excel/${encodeURIComponent(
        identifier,
      )}`;
      console.log(`Calling comprehensive scheme export API: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || "Failed to export comprehensive scheme data",
        );
      }

      // Get the filename from response headers
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `${identifier.replace(
        /[^a-zA-Z0-9]/g,
        "_",
      )}_Comprehensive_Report.xlsx`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, "");
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log(
        `Successfully downloaded comprehensive scheme report: ${filename}`,
      );

      return true;
    } catch (error) {
      console.error("Error exporting comprehensive scheme data:", error);
      return false;
    }
  };

  // Enhanced region extraction from query with better pattern matching
  const extractRegion = (text: string): string | null => {
    // Normalize text - convert to lowercase and remove punctuation
    const normalizedText = text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

    // Expanded region mapping with alternate spellings, typos, and local language variations
    const regionMap: Record<string, string> = {
      // Standard region names
      amravati: "Amravati",
      nagpur: "Nagpur",
      nashik: "Nashik",
      nasik: "Nashik", // Common misspelling
      pune: "Pune",
      poona: "Pune", // Alternate historical name
      konkan: "Konkan",
      mumbai: "Mumbai",
      bombay: "Mumbai", // Alternate historical name
      "chhatrapati sambhajinagar": "Chhatrapati Sambhajinagar",
      sambhajinagar: "Chhatrapati Sambhajinagar",
      aurangabad: "Chhatrapati Sambhajinagar", // Historical name

      // Common word boundaries/patterns to improve accuracy
      " amravati ": "Amravati",
      " nagpur ": "Nagpur",
      " nashik ": "Nashik",
      " nasik ": "Nashik",
      " pune ": "Pune",
      " konkan ": "Konkan",
      " mumbai ": "Mumbai",

      // Prefix patterns like "in Nagpur" or "for Pune"
      "in nagpur": "Nagpur",
      "in pune": "Pune",
      "in nashik": "Nashik",
      "in amravati": "Amravati",
      "in konkan": "Konkan",
      "in mumbai": "Mumbai",
      "in aurangabad": "Chhatrapati Sambhajinagar",
      "in sambhajinagar": "Chhatrapati Sambhajinagar",

      // Hindi/Marathi transliteration variations
      नागपूर: "Nagpur",
      पुणे: "Pune",
      नाशिक: "Nashik",
      अमरावती: "Amravati",
      कोंकण: "Konkan",
      मुंबई: "Mumbai",
      "छत्रपती संभाजीनगर": "Chhatrapati Sambhajinagar",
      औरंगाबाद: "Chhatrapati Sambhajinagar",
    };

    // Check for pattern like "X region" or "region of X"
    const regionPatterns = [
      /in\s+(\w+)\s+region/i,
      /(\w+)\s+region/i,
      /region\s+of\s+(\w+)/i,
    ];

    for (const pattern of regionPatterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        const potentialRegion = match[1].toLowerCase();
        // Check if the matched word is a known region
        for (const [key, value] of Object.entries(regionMap)) {
          if (key.includes(potentialRegion)) {
            return value;
          }
        }
      }
    }

    // Standard inclusion check - look for region names in the text
    for (const [key, value] of Object.entries(regionMap)) {
      // Add word boundary check for better precision with short region names
      if (key.length <= 4) {
        // For short names like Pune, check for word boundaries
        const pattern = new RegExp(`\\b${key}\\b`, "i");
        if (pattern.test(normalizedText)) {
          return value;
        }
      } else if (normalizedText.includes(key)) {
        return value;
      }
    }

    return null;
  };

  // Enhanced status extraction from query
  const extractStatus = (
    text: string,
  ): {
    status?: string;
    mjpCommissioned?: boolean;
    mjpFullyCompleted?: boolean;
  } => {
    const normalizedText = text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

    const statusFilters: {
      status?: string;
      mjpCommissioned?: boolean;
      mjpFullyCompleted?: boolean;
    } = {};

    // MJP status patterns
    if (
      normalizedText.includes("mjp fully completed") ||
      normalizedText.includes("mjp complete")
    ) {
      statusFilters.mjpFullyCompleted = true;
    }

    if (
      normalizedText.includes("mjp commissioned") ||
      normalizedText.includes("mjp commission")
    ) {
      statusFilters.mjpCommissioned = true;
    }

    // General status patterns
    if (
      normalizedText.includes("fully completed") ||
      normalizedText.includes("completed")
    ) {
      if (!statusFilters.mjpFullyCompleted) {
        // Only set if MJP fully completed not already set
        statusFilters.status = "fully_completed";
      }
    }

    if (
      normalizedText.includes("in progress") ||
      normalizedText.includes("progress") ||
      normalizedText.includes("ongoing")
    ) {
      statusFilters.status = "in_progress";
    }

    if (
      normalizedText.includes("connected") &&
      !normalizedText.includes("not connected") &&
      !normalizedText.includes("disconnect")
    ) {
      statusFilters.status = "connected";
    }

    if (
      normalizedText.includes("not connected") ||
      normalizedText.includes("disconnect") ||
      normalizedText.includes("not-connected")
    ) {
      statusFilters.status = "not_connected";
    }

    if (
      normalizedText.includes("commissioned") ||
      normalizedText.includes("commission")
    ) {
      if (!statusFilters.mjpCommissioned) {
        // Only set if MJP commissioned not already set
        statusFilters.mjpCommissioned = true;
      }
    }

    return statusFilters;
  };

  // Enhanced date extraction from query
  const extractDateRange = (
    text: string,
  ): { startDate?: string; endDate?: string } => {
    const normalizedText = text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

    const dateRange: { startDate?: string; endDate?: string } = {};

    // Check for relative date phrases first
    if (
      normalizedText.includes("last week") ||
      normalizedText.includes("past week")
    ) {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      dateRange.startDate = lastWeek.toISOString().split("T")[0];
      dateRange.endDate = today.toISOString().split("T")[0];
      return dateRange;
    }

    if (
      normalizedText.includes("last month") ||
      normalizedText.includes("past month")
    ) {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      dateRange.startDate = lastMonth.toISOString().split("T")[0];
      dateRange.endDate = today.toISOString().split("T")[0];
      return dateRange;
    }

    if (normalizedText.includes("yesterday")) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      dateRange.startDate = yesterday.toISOString().split("T")[0];
      dateRange.endDate = yesterday.toISOString().split("T")[0];
      return dateRange;
    }

    if (normalizedText.includes("today")) {
      const today = new Date();
      dateRange.startDate = today.toISOString().split("T")[0];
      dateRange.endDate = today.toISOString().split("T")[0];
      return dateRange;
    }

    // Pattern 1: "from X to Y" format - RELAXED to allow dates without years
    const fromToPattern =
      /from\s+([\d]{1,2}[\s\/\-][\d]{1,2}[\s\/\-][\d]{4}|[\d]{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+[\d]{4})?)\s+to\s+([\d]{1,2}[\s\/\-][\d]{1,2}[\s\/\-][\d]{4}|[\d]{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+[\d]{4})?)/i;
    const fromToMatch = text.match(fromToPattern);

    if (fromToMatch) {
      dateRange.startDate = parseDate(fromToMatch[1]);
      dateRange.endDate = parseDate(fromToMatch[2]);
      return dateRange;
    }

    // Pattern 2: "between X and Y" format - RELAXED to allow dates without years
    const betweenPattern =
      /between\s+([\d]{1,2}[\s\/\-][\d]{1,2}[\s\/\-][\d]{4}|[\d]{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+[\d]{4})?)\s+and\s+([\d]{1,2}[\s\/\-][\d]{1,2}[\s\/\-][\d]{4}|[\d]{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+[\d]{4})?)/i;
    const betweenMatch = text.match(betweenPattern);

    if (betweenMatch) {
      dateRange.startDate = parseDate(betweenMatch[1]);
      dateRange.endDate = parseDate(betweenMatch[2]);
      return dateRange;
    }

    // Pattern 3: Single date mentioned - RELAXED to allow dates without years
    const singleDatePattern =
      /([\d]{1,2}[\s\/\-][\d]{1,2}[\s\/\-][\d]{4}|[\d]{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+[\d]{4})?)/i;
    const singleMatch = text.match(singleDatePattern);

    if (singleMatch) {
      const endDate = parseDate(singleMatch[1]);
      if (endDate) {
        dateRange.endDate = endDate;
        // Set start date to 30 days before end date
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() - 30);
        dateRange.startDate = endDateObj.toISOString().split("T")[0];
      }
    }

    return dateRange;
  };

  // Detect data type from user query (LPCD, Chlorine, Pressure)
  const detectDataType = (
    text: string,
  ): "lpcd" | "chlorine" | "pressure" | "all" | null => {
    const normalizedText = text.toLowerCase();

    // LPCD/Water keywords (expanded)
    if (
      normalizedText.includes("lpcd") ||
      normalizedText.includes("water consumption") ||
      normalizedText.includes("water scheme") ||
      normalizedText.includes("per capita") ||
      normalizedText.includes("consumption") ||
      normalizedText.includes("water supply") ||
      normalizedText.includes("village water")
    ) {
      return "lpcd";
    }

    // Chlorine keywords (expanded)
    if (
      normalizedText.includes("chlorine") ||
      normalizedText.includes("rca") ||
      normalizedText.includes("residual chlorine") ||
      normalizedText.includes("residual") ||
      normalizedText.includes("water quality")
    ) {
      return "chlorine";
    }

    // Pressure keywords (expanded)
    if (
      normalizedText.includes("pressure") ||
      normalizedText.includes("transmitter") ||
      normalizedText.includes("pressure sensor") ||
      normalizedText.includes("psi") ||
      normalizedText.includes("bar")
    ) {
      return "pressure";
    }

    // All data types
    if (
      normalizedText.includes("all historical") ||
      normalizedText.includes("complete historical") ||
      normalizedText.includes("all data")
    ) {
      return "all";
    }

    return null;
  };

  // Helper function to download blob as file
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Download LPCD historical data (using the correct dashboard endpoint)
  const downloadLpcdHistoricalData = async (
    startDate: string,
    endDate: string,
    region?: string,
  ): Promise<void> => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      format: "xlsx",
    });
    if (region && region !== "all") {
      params.append("region", region);
    }

    // Use the same endpoint as the LPCD dashboard
    const url = `/api/water-scheme-data/download/village-lpcd-history?${params}`;
    console.log(`Downloading LPCD historical data from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || "Failed to export LPCD historical data",
      );
    }

    const blob = await response.blob();
    const filename = `LPCD_Historical_${startDate}_to_${endDate}${region && region !== "all" ? `_${region}` : ""}.xlsx`;
    downloadBlob(blob, filename);
    console.log(`✅ Successfully downloaded: ${filename}`);
  };

  // Download Chlorine historical data
  const downloadChlorineHistoricalData = async (
    startDate: string,
    endDate: string,
    region?: string,
  ): Promise<void> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (region && region !== "all") {
      params.append("region", region);
    }

    const url = `/api/chlorine/export/historical?${params}`;
    console.log(`Downloading Chlorine historical data from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || "Failed to export Chlorine historical data",
      );
    }

    const blob = await response.blob();
    const filename = `Chlorine_Historical_${startDate}_to_${endDate}${region && region !== "all" ? `_${region}` : ""}.xlsx`;
    downloadBlob(blob, filename);
    console.log(`✅ Successfully downloaded: ${filename}`);
  };

  // Download Pressure historical data
  const downloadPressureHistoricalData = async (
    startDate: string,
    endDate: string,
    region?: string,
  ): Promise<void> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (region && region !== "all") {
      params.append("region", region);
    }

    const url = `/api/pressure/export/historical?${params}`;
    console.log(`Downloading Pressure historical data from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || "Failed to export Pressure historical data",
      );
    }

    const blob = await response.blob();
    const filename = `Pressure_Historical_${startDate}_to_${endDate}${region && region !== "all" ? `_${region}` : ""}.xlsx`;
    downloadBlob(blob, filename);
    console.log(`✅ Successfully downloaded: ${filename}`);
  };

  // Orchestrator function to execute historical exports
  const executeHistoricalExport = async (
    dataType: "lpcd" | "chlorine" | "pressure" | "all",
    startDate: string,
    endDate: string,
    region?: string,
  ): Promise<{ success: boolean; count: number; error?: any }> => {
    try {
      // Validate dates
      if (!startDate || !endDate) {
        throw new Error("Both start and end dates are required");
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date format");
      }

      if (start > end) {
        throw new Error("Start date must be before end date");
      }

      if (dataType === "all") {
        // Download all three types sequentially with delays to prevent browser blocking
        await downloadLpcdHistoricalData(startDate, endDate, region);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await downloadChlorineHistoricalData(startDate, endDate, region);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await downloadPressureHistoricalData(startDate, endDate, region);

        return { success: true, count: 3 };
      } else if (dataType === "lpcd") {
        await downloadLpcdHistoricalData(startDate, endDate, region);
        return { success: true, count: 1 };
      } else if (dataType === "chlorine") {
        await downloadChlorineHistoricalData(startDate, endDate, region);
        return { success: true, count: 1 };
      } else if (dataType === "pressure") {
        await downloadPressureHistoricalData(startDate, endDate, region);
        return { success: true, count: 1 };
      }

      return { success: false, count: 0, error: "Unknown data type" };
    } catch (error) {
      console.error("Historical export error:", error);
      return { success: false, count: 0, error };
    }
  };

  // Helper function to parse various date formats
  const parseDate = (dateStr: string): string | undefined => {
    try {
      // Clean up the date string
      const cleaned = dateStr.trim();

      // Handle formats like "2nd june 2025", "9th june", "24th november", etc.
      const monthNames: Record<string, string> = {
        january: "01",
        jan: "01",
        february: "02",
        feb: "02",
        march: "03",
        mar: "03",
        april: "04",
        apr: "04",
        may: "05",
        june: "06",
        jun: "06",
        july: "07",
        jul: "07",
        august: "08",
        aug: "08",
        september: "09",
        sep: "09",
        october: "10",
        oct: "10",
        november: "11",
        nov: "11",
        december: "12",
        dec: "12",
      };

      // Pattern 1: "24th november" or "24 november 2024" (with or without year)
      const monthPattern = /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s*(\d{4})?/i;
      const monthMatch = cleaned.match(monthPattern);

      if (monthMatch) {
        const day = monthMatch[1].padStart(2, "0");
        const monthName = monthMatch[2].toLowerCase();
        let year = monthMatch[3];

        // If no year specified, intelligently determine the year
        if (!year) {
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth() + 1;
          const parsedMonth = parseInt(
            monthNames[monthName as keyof typeof monthNames] || "0",
          );

          // If the month is in the future this year, use current year
          // Otherwise use current year (assume user means recent data)
          year = currentYear.toString();

          // Special case: if month is December and we're in January, user likely means last year
          if (parsedMonth === 12 && currentMonth === 1) {
            year = (currentYear - 1).toString();
          }
          // Special case: if month is later than current month + 1, user likely means last year
          else if (parsedMonth > currentMonth + 1) {
            year = (currentYear - 1).toString();
          }
        }

        if (monthNames[monthName as keyof typeof monthNames]) {
          const month = monthNames[monthName as keyof typeof monthNames];
          return `${year}-${month}-${day}`;
        }
      }

      // Pattern 2: Numeric dates like "2/6/2025", "02/06/2025", "2-6-2025"
      const numericPattern = /(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-](\d{4})/;
      const numericMatch = cleaned.match(numericPattern);

      if (numericMatch) {
        const day = numericMatch[1].padStart(2, "0");
        const month = numericMatch[2].padStart(2, "0");
        const year = numericMatch[3];
        return `${year}-${month}-${day}`;
      }

      // Pattern 3: ISO format "2024-11-24"
      const isoPattern = /(\d{4})-(\d{1,2})-(\d{1,2})/;
      const isoMatch = cleaned.match(isoPattern);

      if (isoMatch) {
        const year = isoMatch[1];
        const month = isoMatch[2].padStart(2, "0");
        const day = isoMatch[3].padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      // Pattern 4: Relative dates like "today", "yesterday", "last week"
      const lowerCleaned = cleaned.toLowerCase();
      const today = new Date();

      if (lowerCleaned.includes("today")) {
        return today.toISOString().split("T")[0];
      }

      if (lowerCleaned.includes("yesterday")) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split("T")[0];
      }

      if (lowerCleaned.includes("last week")) {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return lastWeek.toISOString().split("T")[0];
      }

      if (lowerCleaned.includes("last month")) {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return lastMonth.toISOString().split("T")[0];
      }

      // Try to parse as a standard date
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    } catch (error) {
      console.error("Error parsing date:", dateStr, error);
    }

    return undefined;
  };

  // Process user message
  // Keyword mapping to route OpenAI-interpreted keywords to existing handlers
  const KEYWORD_TO_PATTERN_MAP: { [key: string]: string } = {
    "flow meters": "flow meters",
    "flow meter": "flow meter",
    esrs: "esrs",
    esr: "esr",
    "summary statistics": "summary statistics",
    summary: "summary",
    "chlorine analyzers": "chlorine analyzers",
    "chlorine analyzer": "chlorine analyzer",
    "area coverage": "area coverage",
    "fully completed schemes": "fully completed schemes",
    "fully completed villages": "fully completed villages",
    "partial schemes": "partial schemes",
    "in progress schemes": "in progress schemes",
    "consistent water": "consistent water",
    "reliable water": "reliable water",
    "consistent supply": "consistent supply",
    "consistent water supply": "consistent water supply",
    "reliable supply": "reliable supply",
    "villages with consistent": "villages with consistent",
    "villages have consistent": "villages have consistent",
    "villages with water": "villages with water",
    "villages having water": "villages having water",
    "villages no water": "villages no water",
    "villages without water": "villages without water",
    "consistent zero": "consistent zero",
    "always zero": "always zero",
    "above 55 lpcd": "above 55 lpcd",
    "over 55 lpcd": "over 55 lpcd",
    "below 55 lpcd": "below 55 lpcd",
    "under 55 lpcd": "under 55 lpcd",
    "consistent above 55": "consistent above 55",
    "consistently above 55": "consistently above 55",
    "consistent below 55": "consistent below 55",
    "consistently below 55": "consistently below 55",
    "average above 55": "average above 55",
    "average lpcd above 55": "average above 55",
    "average above 55 lpcd": "average above 55",
    "average below 55": "average below 55",
    "average lpcd below 55": "average below 55",
    "average below 55 lpcd": "average below 55",
    "optimal pressure": "optimal pressure",
    "good pressure": "good pressure",
    "below pressure": "below pressure",
    "low pressure": "low pressure",
    "above pressure": "above pressure",
    "high pressure": "high pressure",
    "optimal chlorine": "optimal chlorine",
    "good chlorine": "good chlorine",
    "below chlorine": "below chlorine",
    "low chlorine": "low chlorine",
    "above chlorine": "above chlorine",
    "high chlorine": "high chlorine",
    "excess chlorine": "excess chlorine",
    "average optimal chlorine": "average optimal chlorine",
    "average chlorine optimal": "average optimal chlorine",
    "average chlorine 0.2 0.5": "average optimal chlorine",
    "average chlorine below 0.2": "average below chlorine",
    "average chlorine below optimal": "average below chlorine",
    "average chlorine above 0.5": "average above chlorine",
    "average chlorine above optimal": "average above chlorine",
    "average optimal pressure": "average optimal pressure",
    "average pressure optimal": "average optimal pressure",
    "average pressure 0.2 0.7": "average optimal pressure",
    "average pressure below 0.2": "average below pressure",
    "average pressure below optimal": "average below pressure",
    "average pressure above 0.7": "average above pressure",
    "average pressure above optimal": "average above pressure",
    // Combined analysis keywords
    "chlorine analysis": "chlorine analysis",
    "rca analysis": "rca analysis",
    "residual chlorine analysis": "residual chlorine analysis",
    chlorine: "chlorine",
    rca: "rca",
    "pressure analysis": "pressure analysis",
    "pressure data": "pressure data",
    "pressure transmitter": "pressure transmitter",
    pressure: "pressure",
    pt: "pt",
    excel: "excel",
    export: "export",
    download: "download",
    // Chart generation keywords (chart AND graph synonyms)
    "7 day water consumption analysis": "7 day water consumption analysis",
    "7-day water consumption analysis": "7-day water consumption analysis",
    "weekly water consumption": "weekly water consumption",
    "weekly water analysis": "weekly water analysis",
    "water consumption chart": "water consumption chart",
    "water consumption graph": "water consumption chart",
    "water consumption analysis": "water consumption analysis",
    "7 day lpcd analysis": "7 day lpcd analysis",
    "7-day lpcd analysis": "7-day lpcd analysis",
    "weekly lpcd analysis": "weekly lpcd analysis",
    "lpcd chart": "lpcd chart",
    "lpcd graph": "lpcd chart",
    "lpcd analysis": "lpcd analysis",
    "lpcd analysis for the week": "lpcd analysis for the week",
    "weekly lpcd": "weekly lpcd",
    "7 day chart": "7 day chart",
    "7-day chart": "7-day chart",
    "7 day graph": "7 day chart",
    "7-day graph": "7-day chart",
    "weekly chart": "weekly chart",
    "weekly graph": "weekly chart",
    "chart generation": "chart generation",
    "graph generation": "chart generation",
    "generate chart": "generate chart",
    "generate graph": "generate chart",
    "show chart": "show chart",
    "show graph": "show chart",
    "create chart": "create chart",
    "create graph": "create chart",
    "7 day analysis": "7 day analysis",
    "7-day analysis": "7-day analysis",
    "weekly analysis": "weekly analysis",
    // Chlorine chart/graph keywords
    "chlorine chart": "chlorine chart",
    "chlorine graph": "chlorine chart",
    "7 day chlorine": "7 day chlorine",
    "weekly chlorine": "weekly chlorine",
    // Pressure chart/graph keywords
    "pressure chart": "pressure chart",
    "pressure graph": "pressure chart",
    "7 day pressure": "7 day pressure",
    "weekly pressure": "weekly pressure",
    // Scheme LPCD keywords
    "scheme lpcd": "scheme lpcd",
    "schemes lpcd": "scheme lpcd",
    "scheme lpcd status": "scheme lpcd",
    "lpcd of schemes": "scheme lpcd",
    "lpcd schemes": "scheme lpcd",
    "lpcd in all regions": "scheme lpcd",
    "lpcd all regions": "scheme lpcd",
    // ESR capacity keywords
    "esr capacity": "esr capacity",
    "esrs capacity": "esr capacity",
    "esr size": "esr capacity",
    "esrs size": "esr capacity",
    "esr volume": "esr capacity",
    "esrs volume": "esr capacity",
    "capacity of esr": "esr capacity",
    "capacity of esrs": "esr capacity",
    "total esr capacity": "esr capacity",
    "total esrs capacity": "esr capacity",
    "total capacity": "esr capacity",
    "esr tank capacity": "esr capacity",
    "esr storage capacity": "esr capacity",
    "storage capacity": "esr capacity",
  };

  // Function to detect PDF report intent before other interpretation (prevents SQL routing)
  const detectPdfReportIntent = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();

    // Check for PDF-specific keywords including scheme/detailed report patterns
    const explicitPdfKeywords = [
      "pdf",
      "smart report",
      "download report",
      "detailed report",
      "detailed scheme report",
      "scheme report",
      "comprehensive report",
      "professional report",
      "performance report"
    ];

    // Check if query contains any explicit PDF keyword
    return explicitPdfKeywords.some((keyword) => lowerText.includes(keyword));
  };

  // Function to detect day-wise chlorine sensor analysis queries
  const detectDayWiseChlorineIntent = (text: string): {
    detected: boolean;
    metric?: "offline" | "below_0_2" | "above_0_5";
    days?: number;
    region?: string;
  } => {
    const lowerText = text.toLowerCase().trim();

    // MUST include "chlorine" keyword
    if (!lowerText.includes("chlorine")) {
      return { detected: false };
    }

    // Detect metric type
    let metric: "offline" | "below_0_2" | "above_0_5" | undefined;

    if (lowerText.includes("offline")) {
      metric = "offline";
    } else if (lowerText.match(/below\s*(0\.2|0\.20|zero point two)/i) || lowerText.includes("<0.2") || lowerText.includes("< 0.2")) {
      metric = "below_0_2";
    } else if (lowerText.match(/above\s*(0\.5|0\.50|zero point five)/i) || lowerText.includes(">0.5") || lowerText.includes("> 0.5")) {
      metric = "above_0_5";
    }

    // If no metric found, not a day-wise query
    if (!metric) {
      return { detected: false };
    }

    // Detect number of days - look for common patterns
    let days: number | undefined;
    const daysMatch = lowerText.match(/(\d+)\s*day/i);
    if (daysMatch) {
      days = parseInt(daysMatch[1]);
    }

    // Also check for specific day numbers mentioned (1, 2, 5, 10, 30)
    const specificDays = [1, 2, 5, 10, 30];
    for (const d of specificDays) {
      if (lowerText.includes(`${d} day`) || lowerText.includes(`for ${d}`)) {
        days = d;
        break;
      }
    }

    // If no days found, not a valid day-wise query
    if (!days) {
      return { detected: false };
    }

    // Extract region if mentioned
    let region: string | undefined;
    const regions = ["Amravati", "Nagpur", "Nashik", "Pune", "Konkan", "Chhatrapati Sambhajinagar"];
    for (const r of regions) {
      if (lowerText.includes(r.toLowerCase())) {
        region = r;
        break;
      }
    }

    return { detected: true, metric, days, region };
  };

  // Function to resolve scheme identifier (ID or name) to canonical scheme details
  const resolveSchemeIdentifier = async (
    text: string,
  ): Promise<{
    schemeId: string | null;
    schemeName: string | null;
  }> => {
    // Step 1: Try to extract numeric ID (7-8 digits)
    const numericMatch = text.match(/\b(\d{7,8})\b/);
    if (numericMatch) {
      const schemeId = numericMatch[1];
      console.log(`Resolved numeric scheme ID: ${schemeId}`);
      return { schemeId, schemeName: null };
    }

    // Step 2: Extract scheme name from text
    let schemeName = text
      .replace(
        /^.*?\b(smart|pdf|professional|comprehensive|detailed|performance)\s+(report|reports)\s+(for|of|on)\s+/i,
        "",
      )
      .replace(
        /^.*?\b(generate|create|download)\s+(report|reports)\s+(for|of|on)\s+/i,
        "",
      )
      .replace(/^.*?\b(report|reports)\s+(for|of|on)\s+/i, "")
      .replace(
        /^(smart|pdf|professional|comprehensive|detailed|performance|report|reports|generate|create|download)\s+/gi,
        "",
      )
      .replace(
        /\s+(smart|pdf|professional|comprehensive|detailed|performance|report|reports)$/gi,
        "",
      )
      .trim();

    if (!schemeName || schemeName === text) {
      const forMatch = text.match(
        /\b(?:for|of|on)\s+(?:scheme\s+)?(.+?)(?:\s*$|[.?!])/i,
      );
      if (forMatch && forMatch[1]) {
        schemeName = forMatch[1].trim();
      }
    }

    if (!schemeName) {
      console.log("No scheme identifier found");
      return { schemeId: null, schemeName: null };
    }

    // Step 3: Search for scheme by name
    try {
      const searchResponse = await fetch(
        `/api/smart-reports/search?query=${encodeURIComponent(schemeName)}`,
      );
      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        if (searchResults && searchResults.length > 0) {
          const topResult = searchResults[0];
          console.log(
            `Resolved scheme name "${schemeName}" to ID: ${topResult.scheme_id}`,
          );
          return {
            schemeId: topResult.scheme_id,
            schemeName: topResult.scheme_name,
          };
        }
      }
    } catch (error) {
      console.error("Error searching for scheme:", error);
    }

    console.log(`Using scheme name as-is: ${schemeName}`);
    return { schemeId: null, schemeName };
  };

  // Function to interpret query using OpenAI
  const interpretQueryWithOpenAI = async (
    query: string,
  ): Promise<{ keyword: string | null; confidence: number }> => {
    try {
      const response = await fetch("/api/ai/interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error("OpenAI interpret API error:", response.status);
        return { keyword: null, confidence: 0 };
      }

      const data = await response.json();
      return {
        keyword: data.matchedKeyword === "NONE" ? null : data.matchedKeyword,
        confidence: data.confidence || 0,
      };
    } catch (error) {
      console.error("Error calling OpenAI interpret API:", error);
      return { keyword: null, confidence: 0 };
    }
  };

  // Function to handle enhanced interpretation with intents
  const handleEnhancedInterpretation = async (
    query: string,
  ): Promise<{ intent: string; entities: any; confidence: number }> => {
    try {
      const response = await fetch("/api/ai/enhanced-interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error("Enhanced interpret API error:", response.status);
        return { intent: "FALLBACK", entities: {}, confidence: 0 };
      }

      const data = await response.json();
      return {
        intent: data.intent || "FALLBACK",
        entities: data.entities || {},
        confidence: data.confidence || 0,
      };
    } catch (error) {
      console.error("Error calling enhanced interpret API:", error);
      return { intent: "FALLBACK", entities: {}, confidence: 0 };
    }
  };

  // Function to handle widget intent detection with strict filtering
  const handleWidgetIntent = async (
    query: string,
  ): Promise<{
    widget: string;
    regionName: string | null;
    schemeName: string | null;
    schemeId: string | null;
    villageName: string | null;
    confidence: number;
  }> => {
    try {
      const response = await fetch("/api/ai/widget-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error("Widget intent API error:", response.status);
        return {
          widget: "NONE",
          regionName: null,
          schemeName: null,
          schemeId: null,
          villageName: null,
          confidence: 0,
        };
      }

      const data = await response.json();
      return {
        widget: data.widget || "NONE",
        regionName: data.regionName || null,
        schemeName: data.schemeName || null,
        schemeId: data.schemeId || null,
        villageName: data.villageName || null,
        confidence: data.confidence || 0,
      };
    } catch (error) {
      console.error("Error calling widget intent API:", error);
      return {
        widget: "NONE",
        regionName: null,
        schemeName: null,
        schemeId: null,
        villageName: null,
        confidence: 0,
      };
    }
  };

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    // Detect and store the language of the user's query for translation
    const queryLanguage = detectLanguageFromText(text);
    currentQueryLanguageRef.current = queryLanguage;
    console.log(`🌐 Detected query language: ${queryLanguage}`);

    // Add user message
    // Track if this message came from voice input
    const fromVoice = text !== input; // If text doesn't match input, it came from voice
    setChatMessages((prev) => [...prev, { type: "user", text, fromVoice }]);
    setInput("");
    setLoading(true);

    // Using setTimeout to simulate processing time
    setTimeout(async () => {
      try {
        // PRIORITY -5: HELPDESK intent check (highest priority)
        const helpdeskResult = await handleHelpdeskIntent(
          text,
          latestMessagesRef.current,
          fromVoice,
        );
        if (helpdeskResult.handled) {
          // Stream all helpdesk messages one by one with translation
          for (const message of helpdeskResult.newMessages) {
            await translateAndStreamMessage(message, text, 'helpdesk message', 50);
          }
          setLoading(false);
          return; // Early exit - don't process other handlers
        }

        let response = "";
        let filters: {
          region?: string;
          status?: string;
          schemeId?: string;
          mjpCommissioned?: boolean;
          mjpFullyCompleted?: boolean;
        } = {};

        const lowerText = text.toLowerCase();
        console.log(`Processing query: "${lowerText}"`);

        // PRIORITY -4.8: ALL DATA REQUEST - Show all widgets when user asks for comprehensive data
        const isAllDataRequest =
          (lowerText.includes("all data") ||
            lowerText.includes("all the data") ||
            lowerText.includes("everything") ||
            lowerText.includes("complete data") ||
            lowerText.includes("full data") ||
            lowerText.includes("comprehensive data")) &&
          (lowerText.includes("detail") ||
            lowerText.includes("show") ||
            lowerText.includes("display") ||
            lowerText.includes("see") ||
            lowerText.includes("view"));

        if (isAllDataRequest) {
          console.log(
            "📊 ALL DATA REQUEST DETECTED - Showing multiple widgets",
          );

          // Extract region/scheme/village if mentioned
          const regions = [
            "amravati",
            "nagpur",
            "chhatrapati sambhajinagar",
            "aurangabad",
            "nashik",
            "pune",
            "konkan",
          ];

          const detectedRegion = regions.find((r) =>
            lowerText.includes(r.toLowerCase()),
          );
          let regionFilter = detectedRegion
            ? detectedRegion === "aurangabad"
              ? "Aurangabad"
              : detectedRegion.charAt(0).toUpperCase() + detectedRegion.slice(1)
            : "all";

          const scopeText = detectedRegion
            ? ` for ${regionFilter} region`
            : " across all regions";

          // Create introduction message - translate based on query language
          await translateAndStreamMessage(
            {
              text: `📊 **Showing comprehensive water infrastructure data${scopeText}:**\n\nHere's a detailed view of all metrics - Village Status, LPCD, Chlorine, Pressure, and Water Consumption analysis.`,
              autoSpeak: fromVoice,
            },
            text,
            'comprehensive data overview',
            30,
          );

          // Fetch chlorine and pressure data in parallel
          try {
            const chlorineApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/chlorine/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/chlorine/combined`;

            const pressureApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/pressure/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/pressure/combined`;

            console.log(`Fetching chlorine data: ${chlorineApiUrl}`);
            console.log(`Fetching pressure data: ${pressureApiUrl}`);

            const [chlorineResponse, pressureResponse] = await Promise.all([
              fetch(chlorineApiUrl),
              fetch(pressureApiUrl),
            ]);

            const chlorineData = await chlorineResponse.json();
            const pressureData = await pressureResponse.json();

            // Display all widgets with fetched data - stream each one sequentially
            setTimeout(async () => {
              // 1. Village Water Status (Village-level widget)
              await translateAndStreamMessage(
                {
                  text: `🏘️ **Village Water Status${scopeText}:**`,
                  widget: "combinedWaterStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'village water status',
                30,
              );

              // 2. LPCD Analysis
              await translateAndStreamMessage(
                {
                  text: `💧 **LPCD (Water Supply) Analysis${scopeText}:**`,
                  widget: "combinedLpcdStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'LPCD water supply',
                30,
              );

              // 3. Chlorine Analysis (with fetched data)
              await translateAndStreamMessage(
                {
                  text: `🧪 **Chlorine Level Analysis${scopeText}:**`,
                  widget: "combine-chlorine-status",
                  combinedChlorineData: chlorineData.data || [],
                  combinedChlorineCounts: chlorineData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'chlorine analysis',
                30,
              );

              // 4. Pressure Analysis (with fetched data)
              await translateAndStreamMessage(
                {
                  text: `⚡ **Pressure Analysis${scopeText}:**`,
                  widget: "combine-pressure-status",
                  combinedPressureData: pressureData.data || [],
                  combinedPressureCounts: pressureData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'pressure analysis',
                30,
              );

              // 5. Water Consumption
              await translateAndStreamMessage(
                {
                  text: `📈 **Water Consumption (ESR Capacity Usage)${scopeText}:**`,
                  widget: "esrWaterConsumption",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'water consumption',
                30,
              );
            }, 300);
          } catch (error) {
            console.error("Error fetching all data widgets:", error);
            await translateAndStreamMessage(
              {
                text: `⚠️ I encountered an error fetching some data${scopeText}. Showing available widgets...`,
                autoSpeak: fromVoice,
              },
              text,
              'error message',
              30,
            );

            // Still show widgets that don't require fetched data - stream them sequentially
            setTimeout(async () => {
              await translateAndStreamMessage(
                {
                  text: `🏘️ **Village Water Status${scopeText}:**`,
                  widget: "combinedWaterStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'village water status',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `💧 **LPCD (Water Supply) Analysis${scopeText}:**`,
                  widget: "combinedLpcdStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'LPCD analysis',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `📈 **Water Consumption (ESR Capacity Usage)${scopeText}:**`,
                  widget: "esrWaterConsumption",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'water consumption',
                30,
              );
            }, 300);
          }

          setLoading(false);
          return; // Early exit - all data widgets shown
        }

        // PRIORITY -4.7: COMBINATION QUERIES - Handle multiple widgets or regions in one query
        // Examples: "show villages with water and no water", "chlorine and pressure", "chlorine in Amravati and Nagpur"

        // Define regions array for use throughout the function
        const regions = [
          "amravati",
          "nagpur",
          "chhatrapati sambhajinagar",
          "aurangabad",
          "nashik",
          "pune",
          "konkan",
        ];

        // Detect multiple regions in the query
        const detectedRegions = regions.filter((r) =>
          lowerText.includes(r.toLowerCase()),
        );

        // CASE 1: Villages with water AND no water
        const isVillagesCombinationQuery =
          (lowerText.includes("villages with water") ||
            lowerText.includes("village with water")) &&
          (lowerText.includes("no water") ||
            lowerText.includes("without water")) &&
          (lowerText.includes("and") || lowerText.includes("both"));

        if (isVillagesCombinationQuery) {
          console.log("🔄 COMBINATION QUERY: Villages with water AND no water");

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` in ${regionFilter} region`
              : " across all regions";

          // Use streaming for intro message - translate based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing village water status${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'village water status',
            30,
          );

          setTimeout(async () => {
            // Use streaming for widget message - translate based on query language
            await translateAndStreamMessage(
              {
                text: `🏘️ **Combined Village Water Status${scopeText}:**`,
                widget: "combinedWaterStatus",
                selectedRegion: regionFilter,
                selectedScheme: "all",
                autoSpeak: false,
              },
              text,
              'village water status',
              30,
            );
          }, 300);

          setLoading(false);
          return;
        }

        // CASE 2: THREE-WAY COMBINATION - Pressure, Chlorine AND Water Consumption
        // Check this FIRST before 2-way combinations to avoid partial matches
        const isPressureChlorineWaterCombination =
          (lowerText.includes("pressure") || lowerText.includes("pt")) &&
          (lowerText.includes("chlorine") || lowerText.includes("rca")) &&
          (lowerText.includes("water consumption") ||
            lowerText.includes("consumption") ||
            lowerText.includes("water supply")) &&
          (lowerText.includes("and") || lowerText.includes(","));

        if (isPressureChlorineWaterCombination) {
          console.log(
            "🔄 COMBINATION QUERY: Pressure, Chlorine AND Water Consumption (3-way)",
          );

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` for ${regionFilter} region`
              : " across all regions";

          // Use streaming for intro message - translate based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing comprehensive analysis: Pressure, Chlorine & Water Consumption${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'comprehensive analysis',
            30,
          );

          // Fetch both chlorine and pressure data in parallel
          try {
            const chlorineApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/chlorine/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/chlorine/combined`;

            const pressureApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/pressure/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/pressure/combined`;

            const [chlorineResponse, pressureResponse] = await Promise.all([
              fetch(chlorineApiUrl),
              fetch(pressureApiUrl),
            ]);

            const chlorineData = await chlorineResponse.json();
            const pressureData = await pressureResponse.json();

            setTimeout(async () => {
              await translateAndStreamMessage(
                {
                  text: `⚡ **Pressure Analysis${scopeText}:**`,
                  widget: "combine-pressure-status",
                  combinedPressureData: pressureData.data || [],
                  combinedPressureCounts: pressureData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'pressure analysis',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `🧪 **Chlorine Level Analysis${scopeText}:**`,
                  widget: "combine-chlorine-status",
                  combinedChlorineData: chlorineData.data || [],
                  combinedChlorineCounts: chlorineData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'chlorine analysis',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `🏘️ **Village Water Status${scopeText}:**`,
                  widget: "combinedWaterStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'village water status',
                30,
              );
            }, 300);
          } catch (error) {
            console.error("Error fetching 3-way combination data:", error);
            await translateAndStreamMessage(
              {
                text: `⚠️ I encountered an error fetching the data. Please try again.`,
                autoSpeak: fromVoice,
              },
              text,
              'error message',
              30,
            );
          }

          setLoading(false);
          return;
        }

        // CASE 3: Chlorine AND Pressure together (2-way only - exclude if water consumption mentioned)
        const isChlorinePressureCombination =
          (lowerText.includes("chlorine") || lowerText.includes("rca")) &&
          (lowerText.includes("pressure") || lowerText.includes("pt")) &&
          !lowerText.includes("water consumption") && // Exclude if water consumption mentioned (handled by 3-way)
          !lowerText.includes("consumption") && // Exclude if consumption mentioned
          !lowerText.includes("lpcd") && // Exclude if LPCD mentioned
          (lowerText.includes("and") ||
            lowerText.includes("both") ||
            lowerText.includes("show me"));

        if (isChlorinePressureCombination) {
          console.log("🔄 COMBINATION QUERY: Chlorine AND Pressure");

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` for ${regionFilter} region`
              : " across all regions";

          // Use streaming for header message - translate based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing chlorine and pressure analysis${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'chlorine and pressure analysis',
            40,
          );

          // Fetch both datasets
          try {
            const chlorineApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/chlorine/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/chlorine/combined`;

            const pressureApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/pressure/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/pressure/combined`;

            const [chlorineResponse, pressureResponse] = await Promise.all([
              fetch(chlorineApiUrl),
              fetch(pressureApiUrl),
            ]);

            const chlorineData = await chlorineResponse.json();
            const pressureData = await pressureResponse.json();

            // Use streaming for chlorine analysis - translate based on query language
            await translateAndStreamMessage(
              {
                text: `🧪 **Chlorine Level Analysis${scopeText}:**`,
                widget: "combine-chlorine-status",
                combinedChlorineData: chlorineData.data || [],
                combinedChlorineCounts: chlorineData.counts || {
                  total: 0,
                  optimal: 0,
                  belowOptimal: 0,
                  aboveOptimal: 0,
                },
                selectedRegion: regionFilter,
                selectedScheme: "all",
                autoSpeak: false,
              },
              text,
              'chlorine analysis',
              30,
            );

            // Use streaming for pressure analysis - translate based on query language
            await translateAndStreamMessage(
              {
                text: `⚡ **Pressure Analysis${scopeText}:**`,
                widget: "combine-pressure-status",
                combinedPressureData: pressureData.data || [],
                combinedPressureCounts: pressureData.counts || {
                  total: 0,
                  optimal: 0,
                  belowOptimal: 0,
                  aboveOptimal: 0,
                },
                selectedRegion: regionFilter,
                selectedScheme: "all",
                autoSpeak: false,
              },
              text,
              'pressure analysis',
              30,
            );
          } catch (error) {
            console.error("Error fetching combination data:", error);
            // Use streaming for error message - translate based on query language
            await translateAndStreamMessage(
              {
                text: `⚠️ I encountered an error fetching the data. Please try again.`,
                autoSpeak: fromVoice,
              },
              text,
              'error message',
              30,
            );
          }

          setLoading(false);
          return;
        }

        // CASE 3: Water Consumption AND LPCD together
        const isWaterConsumptionLpcdCombination =
          (lowerText.includes("water consumption") ||
            lowerText.includes("water supply") ||
            lowerText.includes("consumption")) &&
          (lowerText.includes("lpcd") || lowerText.includes("per capita")) &&
          (lowerText.includes("and") ||
            lowerText.includes("both") ||
            lowerText.includes(","));

        if (isWaterConsumptionLpcdCombination) {
          console.log("🔄 COMBINATION QUERY: Water Consumption AND LPCD");

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` for ${regionFilter} region`
              : " across all regions";

          // Use streaming with translation based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing water consumption and LPCD analysis${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'water consumption and LPCD analysis',
            30,
          );

          setTimeout(async () => {
            await translateAndStreamMessage(
              {
                text: `🏘️ **Village Water Status${scopeText}:**`,
                widget: "combinedWaterStatus",
                selectedRegion: regionFilter,
                selectedScheme: "all",
                autoSpeak: false,
              },
              text,
              'village water status',
              30,
            );

            await translateAndStreamMessage(
              {
                text: `💧 **LPCD (Water Supply) Analysis${scopeText}:**`,
                widget: "combinedLpcdStatus",
                selectedRegion: regionFilter,
                selectedScheme: "all",
                autoSpeak: false,
              },
              text,
              'LPCD analysis',
              30,
            );
          }, 300);

          setLoading(false);
          return;
        }

        // CASE 4: Chlorine AND Water Consumption together
        const isChlorineWaterConsumptionCombination =
          (lowerText.includes("chlorine") || lowerText.includes("rca")) &&
          (lowerText.includes("water consumption") ||
            lowerText.includes("consumption") ||
            lowerText.includes("water supply")) &&
          !lowerText.includes("pressure") && // Exclude if pressure is also mentioned (handled by 3-way combo)
          (lowerText.includes("and") ||
            lowerText.includes("both") ||
            lowerText.includes(","));

        if (isChlorineWaterConsumptionCombination) {
          console.log("🔄 COMBINATION QUERY: Chlorine AND Water Consumption");

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` for ${regionFilter} region`
              : " across all regions";

          // Use streaming with translation based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing chlorine and water consumption analysis${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'chlorine and water consumption analysis',
            30,
          );

          // Fetch chlorine data
          try {
            const chlorineApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/chlorine/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/chlorine/combined`;

            const chlorineResponse = await fetch(chlorineApiUrl);
            const chlorineData = await chlorineResponse.json();

            setTimeout(async () => {
              await translateAndStreamMessage(
                {
                  text: `🧪 **Chlorine Level Analysis${scopeText}:**`,
                  widget: "combine-chlorine-status",
                  combinedChlorineData: chlorineData.data || [],
                  combinedChlorineCounts: chlorineData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'chlorine analysis',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `🏘️ **Village Water Status${scopeText}:**`,
                  widget: "combinedWaterStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'village water status',
                30,
              );
            }, 300);
          } catch (error) {
            console.error(
              "Error fetching chlorine and water consumption data:",
              error,
            );
            await translateAndStreamMessage(
              {
                text: `⚠️ I encountered an error fetching the data. Please try again.`,
                autoSpeak: fromVoice,
              },
              text,
              'error message',
              30,
            );
          }

          setLoading(false);
          return;
        }

        // CASE 5: Pressure AND LPCD together
        const isPressureLpcdCombination =
          (lowerText.includes("pressure") || lowerText.includes("pt")) &&
          (lowerText.includes("lpcd") || lowerText.includes("per capita")) &&
          !lowerText.includes("water consumption") && // Exclude if water consumption is also mentioned
          (lowerText.includes("and") ||
            lowerText.includes("both") ||
            lowerText.includes(","));

        if (isPressureLpcdCombination) {
          console.log("🔄 COMBINATION QUERY: Pressure AND LPCD");

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` for ${regionFilter} region`
              : " across all regions";

          // Use streaming with translation based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing pressure and LPCD analysis${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'pressure and LPCD analysis',
            30,
          );

          // Fetch pressure data
          try {
            const pressureApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/pressure/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/pressure/combined`;

            const pressureResponse = await fetch(pressureApiUrl);
            const pressureData = await pressureResponse.json();

            setTimeout(async () => {
              await translateAndStreamMessage(
                {
                  text: `⚡ **Pressure Analysis${scopeText}:**`,
                  widget: "combine-pressure-status",
                  combinedPressureData: pressureData.data || [],
                  combinedPressureCounts: pressureData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'pressure analysis',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `💧 **LPCD (Water Supply) Analysis${scopeText}:**`,
                  widget: "combinedLpcdStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'LPCD analysis',
                30,
              );
            }, 300);
          } catch (error) {
            console.error("Error fetching pressure and LPCD data:", error);
            await translateAndStreamMessage(
              {
                text: `⚠️ I encountered an error fetching the data. Please try again.`,
                autoSpeak: fromVoice,
              },
              text,
              'error message',
              30,
            );
          }

          setLoading(false);
          return;
        }

        // CASE 6: Pressure AND Water Consumption together
        const isPressureWaterConsumptionCombination =
          (lowerText.includes("pressure") || lowerText.includes("pt")) &&
          (lowerText.includes("water consumption") ||
            lowerText.includes("consumption") ||
            lowerText.includes("water supply")) &&
          !lowerText.includes("chlorine") && // Exclude if chlorine is also mentioned (handled by 3-way combo)
          !lowerText.includes("lpcd") && // Exclude if LPCD is also mentioned
          (lowerText.includes("and") ||
            lowerText.includes("both") ||
            lowerText.includes(","));

        if (isPressureWaterConsumptionCombination) {
          console.log("🔄 COMBINATION QUERY: Pressure AND Water Consumption");

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` for ${regionFilter} region`
              : " across all regions";

          // Use streaming with translation based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing pressure and water consumption analysis${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'pressure and water consumption analysis',
            30,
          );

          // Fetch pressure data
          try {
            const pressureApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/pressure/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/pressure/combined`;

            const pressureResponse = await fetch(pressureApiUrl);
            const pressureData = await pressureResponse.json();

            setTimeout(async () => {
              await translateAndStreamMessage(
                {
                  text: `⚡ **Pressure Analysis${scopeText}:**`,
                  widget: "combine-pressure-status",
                  combinedPressureData: pressureData.data || [],
                  combinedPressureCounts: pressureData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'pressure analysis',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `🏘️ **Village Water Status${scopeText}:**`,
                  widget: "combinedWaterStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'village water status',
                30,
              );
            }, 300);
          } catch (error) {
            console.error(
              "Error fetching pressure and water consumption data:",
              error,
            );
            await translateAndStreamMessage(
              {
                text: `⚠️ I encountered an error fetching the data. Please try again.`,
                autoSpeak: fromVoice,
              },
              text,
              'error message',
              30,
            );
          }

          setLoading(false);
          return;
        }

        // CASE 7: Chlorine AND LPCD together
        const isChlorineLpcdCombination =
          (lowerText.includes("chlorine") || lowerText.includes("rca")) &&
          (lowerText.includes("lpcd") || lowerText.includes("per capita")) &&
          !lowerText.includes("pressure") && // Exclude if pressure is also mentioned
          (lowerText.includes("and") ||
            lowerText.includes("both") ||
            lowerText.includes(","));

        if (isChlorineLpcdCombination) {
          console.log("🔄 COMBINATION QUERY: Chlorine AND LPCD");

          const regionFilter =
            detectedRegions.length === 1
              ? detectedRegions[0] === "aurangabad"
                ? "Aurangabad"
                : detectedRegions[0].charAt(0).toUpperCase() +
                detectedRegions[0].slice(1)
              : "all";

          const scopeText =
            detectedRegions.length === 1
              ? ` for ${regionFilter} region`
              : " across all regions";

          // Use streaming with translation based on query language
          await translateAndStreamMessage(
            {
              text: `📊 Showing chlorine and LPCD analysis${scopeText}:`,
              autoSpeak: fromVoice,
            },
            text,
            'chlorine and LPCD analysis',
            30,
          );

          // Fetch chlorine data
          try {
            const chlorineApiUrl =
              regionFilter !== "all"
                ? `/api/category-data/chlorine/combined?region=${encodeURIComponent(regionFilter)}`
                : `/api/category-data/chlorine/combined`;

            const chlorineResponse = await fetch(chlorineApiUrl);
            const chlorineData = await chlorineResponse.json();

            setTimeout(async () => {
              await translateAndStreamMessage(
                {
                  text: `🧪 **Chlorine Level Analysis${scopeText}:**`,
                  widget: "combine-chlorine-status",
                  combinedChlorineData: chlorineData.data || [],
                  combinedChlorineCounts: chlorineData.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'chlorine analysis',
                30,
              );

              await translateAndStreamMessage(
                {
                  text: `💧 **LPCD (Water Supply) Analysis${scopeText}:**`,
                  widget: "combinedLpcdStatus",
                  selectedRegion: regionFilter,
                  selectedScheme: "all",
                  autoSpeak: false,
                },
                text,
                'LPCD analysis',
                30,
              );
            }, 300);
          } catch (error) {
            console.error("Error fetching chlorine and LPCD data:", error);
            await translateAndStreamMessage(
              {
                text: `⚠️ I encountered an error fetching the data. Please try again.`,
                autoSpeak: fromVoice,
              },
              text,
              'error message',
              30,
            );
          }

          setLoading(false);
          return;
        }

        // CASE 8: Same widget for multiple regions (e.g., "chlorine in Amravati and Nagpur")
        const isMultiRegionSameWidget = detectedRegions.length >= 2;

        if (isMultiRegionSameWidget) {
          console.log(
            `🔄 MULTI-REGION QUERY: ${detectedRegions.length} regions detected:`,
            detectedRegions,
          );

          // Detect which widget type is requested
          const isChlorineRequest =
            lowerText.includes("chlorine") || lowerText.includes("rca");
          const isPressureRequest =
            lowerText.includes("pressure") || lowerText.includes("pt");
          const isLpcdRequest =
            lowerText.includes("lpcd") || lowerText.includes("water supply");
          const isVillageRequest = lowerText.includes("village");

          if (isChlorineRequest) {
            console.log("🧪 Multi-region chlorine query");
            const detectedLang = detectLanguageFromText(text);
            const translatedRegions = getTranslatedRegionList(detectedRegions, detectedLang);
            const messageText = await getTranslatedMessage('showingChlorineAnalysis', detectedLang, { regions: translatedRegions });

            // Use streaming for intro message
            await addStreamedBotMessage(
              {
                text: messageText,
                autoSpeak: fromVoice,
              },
              30,
            );

            // Fetch chlorine data for each region
            try {
              const fetchPromises = detectedRegions.map(async (region) => {
                const regionName =
                  region === "aurangabad"
                    ? "Aurangabad"
                    : region.charAt(0).toUpperCase() + region.slice(1);

                const apiUrl = `/api/category-data/chlorine/combined?region=${encodeURIComponent(regionName)}`;
                const response = await fetch(apiUrl);
                const data = await response.json();

                return {
                  region: regionName,
                  data: data.data || [],
                  counts: data.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                };
              });

              const allRegionData = await Promise.all(fetchPromises);

              // Stream each widget with translation
              setTimeout(async () => {
                for (const regionData of allRegionData) {
                  await translateAndStreamMessage(
                    {
                      text: `🧪 **Chlorine Analysis - ${regionData.region} Region:**`,
                      widget: "combine-chlorine-status",
                      combinedChlorineData: regionData.data,
                      combinedChlorineCounts: regionData.counts,
                      selectedRegion: regionData.region,
                      selectedScheme: "all",
                      autoSpeak: false,
                    },
                    text,
                    'chlorine analysis',
                    30,
                  );
                }
              }, 300);
            } catch (error) {
              console.error(
                "Error fetching multi-region chlorine data:",
                error,
              );
              await translateAndStreamMessage(
                {
                  text: `⚠️ I encountered an error fetching chlorine data for multiple regions. Please try again.`,
                  autoSpeak: fromVoice,
                },
                text,
                'error message',
                30,
              );
            }

            setLoading(false);
            return;
          }

          if (isPressureRequest) {
            console.log("⚡ Multi-region pressure query");
            const detectedLang = detectLanguageFromText(text);
            const translatedRegions = getTranslatedRegionList(detectedRegions, detectedLang);
            const messageText = await getTranslatedMessage('showingPressureAnalysis', detectedLang, { regions: translatedRegions });

            // Use streaming for intro message
            await addStreamedBotMessage(
              {
                text: messageText,
                autoSpeak: fromVoice,
              },
              30,
            );

            // Fetch pressure data for each region
            try {
              const fetchPromises = detectedRegions.map(async (region) => {
                const regionName =
                  region === "aurangabad"
                    ? "Aurangabad"
                    : region.charAt(0).toUpperCase() + region.slice(1);

                const apiUrl = `/api/category-data/pressure/combined?region=${encodeURIComponent(regionName)}`;
                const response = await fetch(apiUrl);
                const data = await response.json();

                return {
                  region: regionName,
                  data: data.data || [],
                  counts: data.counts || {
                    total: 0,
                    optimal: 0,
                    belowOptimal: 0,
                    aboveOptimal: 0,
                  },
                };
              });

              const allRegionData = await Promise.all(fetchPromises);

              // Stream each widget with translation
              setTimeout(async () => {
                for (const regionData of allRegionData) {
                  await translateAndStreamMessage(
                    {
                      text: `⚡ **Pressure Analysis - ${regionData.region} Region:**`,
                      widget: "combine-pressure-status",
                      combinedPressureData: regionData.data,
                      combinedPressureCounts: regionData.counts,
                      selectedRegion: regionData.region,
                      selectedScheme: "all",
                      autoSpeak: false,
                    },
                    text,
                    'pressure analysis',
                    30,
                  );
                }
              }, 300);
            } catch (error) {
              console.error(
                "Error fetching multi-region pressure data:",
                error,
              );
              await translateAndStreamMessage(
                {
                  text: `⚠️ I encountered an error fetching pressure data for multiple regions. Please try again.`,
                  autoSpeak: fromVoice,
                },
                text,
                'error message',
                30,
              );
            }

            setLoading(false);
            return;
          }

          if (isLpcdRequest) {
            console.log("💧 Multi-region LPCD query");

            const detectedLang = detectLanguageFromText(text);
            const translatedRegions = getTranslatedRegionList(detectedRegions, detectedLang);
            const messageText = await getTranslatedMessage('showingLpcdAnalysis', detectedLang, { regions: translatedRegions });

            // Use streaming for intro message
            await addStreamedBotMessage(
              {
                text: messageText,
                autoSpeak: fromVoice,
              },
              30,
            );

            // Stream each widget with translation
            setTimeout(async () => {
              for (const region of detectedRegions) {
                const regionName =
                  region === "aurangabad"
                    ? "Aurangabad"
                    : region.charAt(0).toUpperCase() + region.slice(1);

                await translateAndStreamMessage(
                  {
                    text: `💧 **LPCD Analysis - ${regionName} Region:**`,
                    widget: "combinedLpcdStatus",
                    selectedRegion: regionName,
                    selectedScheme: "all",
                    autoSpeak: false,
                  },
                  text,
                  'LPCD analysis',
                  30,
                );
              }
            }, 300);

            setLoading(false);
            return;
          }

          if (isVillageRequest) {
            console.log("🏘️ Multi-region village query");

            const detectedLang = detectLanguageFromText(text);
            const translatedRegions = getTranslatedRegionList(detectedRegions, detectedLang);
            const messageText = await getTranslatedMessage('showingVillageStatus', detectedLang, { regions: translatedRegions });

            // Use streaming for intro message
            await addStreamedBotMessage(
              {
                text: messageText,
                autoSpeak: fromVoice,
              },
              30,
            );

            // Stream each widget with translation
            setTimeout(async () => {
              for (const region of detectedRegions) {
                const regionName =
                  region === "aurangabad"
                    ? "Aurangabad"
                    : region.charAt(0).toUpperCase() + region.slice(1);

                await translateAndStreamMessage(
                  {
                    text: `🏘️ **Village Water Status - ${regionName} Region:**`,
                    widget: "combinedWaterStatus",
                    selectedRegion: regionName,
                    selectedScheme: "all",
                    autoSpeak: false,
                  },
                  text,
                  'village water status',
                  30,
                );
              }
            }, 300);

            setLoading(false);
            return;
          }
        }

        // PRIORITY -4.5: GUIDANCE/HELP INTENT - Detect when users need help/guidance (not just data)
        // If user is asking "what to do", "help", "guide me", skip widget detection and go to conversational AI
        const isGuidanceRequest =
          (lowerText.includes("what to do") ||
            lowerText.includes("what should i do") ||
            lowerText.includes("what can i do") ||
            lowerText.includes("help me") ||
            lowerText.includes("guide me") ||
            lowerText.includes("how to fix") ||
            lowerText.includes("how do i fix") ||
            lowerText.includes("ticket please") ||
            lowerText.includes("create ticket") ||
            lowerText.includes("make a ticket")) &&
          // But NOT if they're asking for specific data (show, display, view)
          !(
            lowerText.startsWith("show ") ||
            lowerText.startsWith("display ") ||
            lowerText.startsWith("view ") ||
            lowerText.startsWith("get ")
          );

        if (isGuidanceRequest) {
          console.log(
            "🎯 GUIDANCE REQUEST DETECTED - Skipping widget detection, going straight to conversational AI",
          );

          try {
            // Build conversation history (last 8 messages = 4 exchanges)
            const conversationHistory = chatMessages.slice(-8).map((msg) => ({
              role: msg.type === "user" ? "user" : "bot",
              text: msg.text,
            }));

            // Detect language from selected language setting
            const languageCode = selectedLanguage.split("-")[0]; // "en-IN" -> "en"
            const apiLanguage = ["en", "hi", "mr"].includes(languageCode)
              ? languageCode
              : "en";

            const gptResponse = await fetch("/api/ai/conversational-fallback", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: text,
                conversationHistory: conversationHistory,
                language: apiLanguage,
              }),
            });

            if (gptResponse.ok) {
              const gptData = await gptResponse.json();
              response =
                gptData.reply ||
                "I'm sorry, I couldn't process your request. Please try asking about water infrastructure data, schemes, or regions.";
              console.log(
                "✅ Conversational AI response for guidance:",
                response,
              );
            } else {
              console.error("Conversational AI API error:", gptResponse.status);
              response =
                "I'm here to help! Could you be more specific about what you need assistance with?";
            }
          } catch (error) {
            console.error("Error calling conversational AI API:", error);
            response =
              "I'm sorry, I encountered an error. Please try rephrasing your question.";
          }

          // Use streaming for word-by-word display
          await addStreamedBotMessage(
            {
              text: response,
              autoSpeak: fromVoice,
            },
            30,
          );

          setLoading(false);
          return; // Early exit - guidance provided, don't show widgets
        }

        // PRIORITY -4.6: INFORMATIONAL QUERY DETECTION - Detect questions about ranges, definitions, explanations
        // Route to conversational AI instead of showing widgets
        const isInformationalQuery =
          (lowerText.includes("what is") ||
            lowerText.includes("what's") ||
            lowerText.includes("define") ||
            lowerText.includes("definition of") ||
            lowerText.includes("explain") ||
            lowerText.includes("tell me about") ||
            lowerText.includes("what does") ||
            lowerText.includes("what are")) &&
          (lowerText.includes("range") ||
            lowerText.includes("optimal") ||
            lowerText.includes("chlorine") ||
            lowerText.includes("pressure") ||
            lowerText.includes("lpcd") ||
            lowerText.includes("mean") ||
            lowerText.includes("level")) &&
          // But NOT if they're asking for specific location data
          !(
            lowerText.includes(" in nagpur") ||
            lowerText.includes(" in amravati") ||
            lowerText.includes(" in pune") ||
            lowerText.includes(" in nashik") ||
            lowerText.includes(" in konkan") ||
            lowerText.includes(" in chhatrapati sambhajinagar") ||
            lowerText.includes(" for region") ||
            lowerText.includes(" for scheme") ||
            lowerText.includes(" for village")
          );

        if (isInformationalQuery) {
          console.log(
            "📚 INFORMATIONAL QUERY DETECTED - Routing to conversational AI for explanation",
          );

          try {
            // Build conversation history (last 8 messages = 4 exchanges)
            const conversationHistory = chatMessages.slice(-8).map((msg) => ({
              role: msg.type === "user" ? "user" : "bot",
              text: msg.text,
            }));

            // Detect language from selected language setting
            const languageCode = selectedLanguage.split("-")[0]; // "en-IN" -> "en"
            const apiLanguage = ["en", "hi", "mr"].includes(languageCode)
              ? languageCode
              : "en";

            const gptResponse = await fetch("/api/ai/conversational-fallback", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: text,
                conversationHistory: conversationHistory,
                language: apiLanguage,
              }),
            });

            if (gptResponse.ok) {
              const gptData = await gptResponse.json();
              response =
                gptData.reply ||
                "I'm sorry, I couldn't process your request. Please try asking about water infrastructure data, schemes, or regions.";
              console.log(
                "✅ Conversational AI response for informational query:",
                response,
              );
            } else {
              console.error("Conversational AI API error:", gptResponse.status);
              response =
                "I'm here to help! Could you be more specific about what you need information about?";
            }
          } catch (error) {
            console.error("Error calling conversational AI API:", error);
            response =
              "I'm sorry, I encountered an error. Please try rephrasing your question.";
          }

          // Use streaming for word-by-word display
          await addStreamedBotMessage(
            {
              text: response,
              autoSpeak: fromVoice,
            },
            30,
          );

          setLoading(false);
          return; // Early exit - explanation provided, don't show widgets
        }

        // PRIORITY -4: Check for HISTORICAL DATA EXPORT requests (before all other logic)
        // This must be first to prevent LPCD statistics handlers from intercepting
        const isExportKeywordPresent =
          lowerText.includes("excel") ||
          lowerText.includes("download") ||
          lowerText.includes("export") ||
          lowerText.includes("get excel") ||
          lowerText.includes("give me excel") ||
          lowerText.includes("generate excel");

        if (isExportKeywordPresent) {
          // Extract date range and region
          const dateRange = extractDateRange(text);
          const region = regions.find((r) =>
            lowerText.includes(r.toLowerCase()),
          );

          // Check if this is a historical data request (date range specified)
          const isHistoricalRequest = dateRange.startDate && dateRange.endDate;

          if (isHistoricalRequest) {
            console.log(
              "✅ Historical data export request detected - BYPASSING all other handlers",
            );

            // Detect data type from query
            let dataType = detectDataType(text);

            // If data type not detected from keywords, try to infer from current page
            if (!dataType) {
              const currentPath = window.location.pathname;
              if (
                currentPath.includes("/lpcd") ||
                currentPath.includes("/water-scheme")
              ) {
                dataType = "lpcd";
                console.log("Inferred LPCD data type from current page");
              } else if (currentPath.includes("/chlorine")) {
                dataType = "chlorine";
                console.log("Inferred Chlorine data type from current page");
              } else if (currentPath.includes("/pressure")) {
                dataType = "pressure";
                console.log("Inferred Pressure data type from current page");
              } else {
                // Ambiguous request - ask user for clarification
                response = `Please specify which historical data you'd like to download:\n• **LPCD** (water consumption data)\n• **Chlorine** (residual chlorine levels)\n• **Pressure** (pressure transmitter data)\n\nExample: "download lpcd historical data from ${dateRange.startDate} to ${dateRange.endDate}"`;

                // Use streaming for word-by-word display
                await addStreamedBotMessage(
                  {
                    text: response,
                    autoSpeak: fromVoice,
                  },
                  30,
                );

                setLoading(false);
                return;
              }
            }

            const dateDescription = `from ${dateRange.startDate} to ${dateRange.endDate}`;
            const regionDescription = region ? ` for ${region} region` : "";
            const dataTypeName =
              dataType === "all" ? "all historical" : dataType.toUpperCase();

            response = `📥 Downloading ${dataTypeName} historical data ${dateDescription}${regionDescription}...\n\nPlease wait while I prepare your ${dataType === "all" ? "3 Excel files" : "Excel file"}.`;

            // Use streaming for word-by-word display
            await addStreamedBotMessage(
              {
                text: response,
                autoSpeak: fromVoice,
              },
              30,
            );

            setLoading(false);

            // Execute the export asynchronously
            setTimeout(async () => {
              const result = await executeHistoricalExport(
                dataType!,
                dateRange.startDate!,
                dateRange.endDate!,
                region || undefined,
              );

              if (result.success) {
                const successText = `✅ **Success!** Downloaded ${result.count} historical data file${result.count > 1 ? "s" : ""}!\n\n${dataType === "all" ? "• LPCD Historical Data\n• Chlorine Historical Data\n• Pressure Historical Data" : `• ${dataTypeName} Historical Data`}\n\nDate Range: ${dateRange.startDate} to ${dateRange.endDate}${regionDescription}`;
                await addStreamedBotMessage(
                  { text: successText, autoSpeak: false },
                  50,
                );
              } else {
                const errorText = `❌ **Failed to download historical data**\n\nError: ${result.error instanceof Error ? result.error.message : "Unknown error"}\n\nPlease check:\n• Date range is valid\n• You have an active internet connection\n• The data exists for the specified period`;
                await addStreamedBotMessage(
                  { text: errorText, autoSpeak: false },
                  50,
                );
              }
            }, 500);

            return; // Exit early - bypass ALL other logic
          }
        }

        // PRIORITY -3: Check for PDF report queries (HIGHEST PRIORITY - prevents SQL routing)
        if (detectPdfReportIntent(text)) {
          console.log(
            "🔍 PDF Report intent detected - short-circuiting to PDF generation",
          );

          const resolved = await resolveSchemeIdentifier(text);
          const identifier = resolved.schemeId || resolved.schemeName;

          if (!identifier) {
            // Use streaming for word-by-word display
            await addStreamedBotMessage(
              {
                text: "Please specify which scheme you'd like a PDF report for. For example:\n• 'pdf report of 20003791'\n• 'smart report for Bidgaon Tarodi wss'\n• 'download report for [scheme name or ID]'",
                autoSpeak: fromVoice,
              },
              30,
            );

            setLoading(false);
            return;
          }

          // Only proceed with PDF if we have a resolved scheme ID (more reliable)
          if (!resolved.schemeId) {
            console.log(
              `Could not resolve scheme identifier "${identifier}" to a scheme ID - falling back to normal handlers`,
            );
            // Fall through to normal interpretation path
          } else {
            // Use streaming for word-by-word display
            await addStreamedBotMessage(
              {
                text: `🔍 Generating professional report for: ${resolved.schemeName || identifier}...`,
                autoSpeak: fromVoice,
              },
              30,
            );

            try {
              const response = await fetch(
                `/api/smart-reports/scheme/${encodeURIComponent(resolved.schemeId)}`,
              );

              if (!response.ok) {
                // Use streaming for word-by-word display
                await addStreamedBotMessage(
                  {
                    text: `❌ Could not find scheme: ${identifier}. Please check the scheme name or ID and try again.`,
                    autoSpeak: fromVoice,
                  },
                  30,
                );

                setLoading(false);
                return;
              }

              const schemeData = await response.json();

              // Use streaming for word-by-word display
              await addStreamedBotMessage(
                {
                  text: `📄 Preparing your professional report for ${schemeData.schemeInfo?.scheme_name || identifier}...`,
                  autoSpeak: fromVoice,
                },
                30,
              );

              await generateProfessionalSchemePDF(schemeData);

              // Use streaming for word-by-word display
              await addStreamedBotMessage(
                {
                  text: `✅ Report generated successfully! Your professional PDF report for **${schemeData.schemeInfo?.scheme_name || identifier}** has been downloaded.`,
                  autoSpeak: fromVoice,
                },
                30,
              );

              setLoading(false);
              return;
            } catch (error) {
              console.error("Error generating PDF report:", error);

              // Use streaming for word-by-word display
              await addStreamedBotMessage(
                {
                  text: `❌ Sorry, I encountered an error while generating the report. Please try again.`,
                  autoSpeak: fromVoice,
                },
                30,
              );

              setLoading(false);
              return;
            }
          }
        }

        // PRIORITY -2.5: Check for day-wise chlorine sensor analysis queries
        const dayWiseIntent = detectDayWiseChlorineIntent(text);
        if (dayWiseIntent.detected && dayWiseIntent.metric && dayWiseIntent.days) {
          console.log(
            `🔍 Day-wise chlorine intent detected - metric: ${dayWiseIntent.metric}, days: ${dayWiseIntent.days}, region: ${dayWiseIntent.region || "all"}`,
          );

          try {
            // Prepare metric label for display
            const metricLabel =
              dayWiseIntent.metric === "offline" ? "offline" :
                dayWiseIntent.metric === "below_0_2" ? "below 0.2 mg/l" :
                  "above 0.5 mg/l";

            const regionLabel = dayWiseIntent.region || "all regions";

            await addStreamedBotMessage(
              {
                text: `🔍 Analyzing chlorine sensors that are ${metricLabel} for ${dayWiseIntent.days} consecutive day${dayWiseIntent.days > 1 ? 's' : ''} in ${regionLabel}...`,
                autoSpeak: fromVoice,
              },
              30,
            );

            // Call the day-wise breakdown API
            const params = new URLSearchParams();
            if (dayWiseIntent.region) {
              params.append("region", dayWiseIntent.region);
            }

            const response = await fetch(
              `/api/chlorine/day-wise-sensors/${dayWiseIntent.metric}/${dayWiseIntent.days}?${params.toString()}`,
            );

            if (!response.ok) {
              await addStreamedBotMessage(
                {
                  text: `❌ Failed to fetch day-wise chlorine sensor data. Please try again.`,
                  autoSpeak: fromVoice,
                },
                30,
              );
              setLoading(false);
              return;
            }

            const result = await response.json();

            // Format the response
            const count = result.count || 0;
            const daysText = dayWiseIntent.days === 1 ? "1 day" : `${dayWiseIntent.days} consecutive days`;

            let responseText = `📊 **Day-Wise Chlorine Sensor Analysis**\n\n`;
            responseText += `Found **${count} sensor${count !== 1 ? 's' : ''}** that ${count === 1 ? 'is' : 'are'} **${metricLabel}** for **${daysText}**`;

            if (dayWiseIntent.region) {
              responseText += ` in **${dayWiseIntent.region}** region`;
            }

            responseText += `.`;

            if (count > 0) {
              responseText += `\n\n**Summary by Region:**\n`;

              // Group by region
              const regionCounts: Record<string, number> = {};
              result.data.forEach((sensor: any) => {
                regionCounts[sensor.region] = (regionCounts[sensor.region] || 0) + 1;
              });

              Object.entries(regionCounts)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .forEach(([region, count]) => {
                  responseText += `• ${region}: ${count} sensor${count !== 1 ? 's' : ''}\n`;
                });

              // Show sample sensors if count is reasonable
              if (count <= 10) {
                responseText += `\n**Affected Sensors:**\n`;
                result.data.slice(0, 10).forEach((sensor: any, index: number) => {
                  responseText += `${index + 1}. ${sensor.scheme_name} - ${sensor.village_name} (${sensor.esr_name})\n`;
                });
              } else {
                responseText += `\n*Showing top 10 affected sensors:*\n`;
                result.data.slice(0, 10).forEach((sensor: any, index: number) => {
                  responseText += `${index + 1}. ${sensor.scheme_name} - ${sensor.village_name} (${sensor.esr_name})\n`;
                });
                responseText += `\n_...and ${count - 10} more sensors_`;
              }

            } else {
              responseText += `\n\n✅ This is good news - no sensors are ${metricLabel} for ${daysText}!`;
            }

            // Stream the message first
            await addStreamedBotMessage(
              {
                text: responseText,
                autoSpeak: false,
              },
              40,
            );

            // Then add the download widget after streaming completes
            if (count > 0) {
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: "📥 Download the complete Excel report below with scheme, village, ESR, and chlorine details.",
                  widget: "chlorineSensorExport",
                  chlorineSensorExportData: {
                    metric: dayWiseIntent.metric,
                    days: dayWiseIntent.days,
                    region: dayWiseIntent.region || "all",
                    count: count,
                    label: metricLabel,
                  },
                  autoSpeak: false,
                },
              ]);
            }

            setLoading(false);
            return;
          } catch (error) {
            console.error("Error fetching day-wise chlorine data:", error);
            await addStreamedBotMessage(
              {
                text: `❌ Sorry, I encountered an error while analyzing day-wise chlorine data. Please try again.`,
                autoSpeak: fromVoice,
              },
              30,
            );
            setLoading(false);
            return;
          }
        }

        // PRIORITY -2: Check for correlation analysis queries (highest priority for advanced features)
        try {
          const correlationResponse = await fetch(
            "/api/ai/correlation-analysis",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: text }),
            },
          );

          if (correlationResponse.ok) {
            const correlationData = await correlationResponse.json();

            if (
              correlationData.success &&
              correlationData.isCorrelationQuery &&
              correlationData.confidence >= 0.7
            ) {
              console.log(
                `📊 Correlation query detected with confidence: ${correlationData.confidence}`,
              );

              if (correlationData.correlationData) {
                const { CorrelationAnalysisWidget } = await import(
                  "./widgets/CorrelationAnalysisWidget"
                );

                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `Correlation Analysis: ${correlationData.metric1} vs ${correlationData.metric2}`,
                    customWidget: (
                      <CorrelationAnalysisWidget
                        metric1={correlationData.metric1}
                        metric2={correlationData.metric2}
                        correlationData={correlationData.correlationData}
                        filters={correlationData.filters}
                      />
                    ),
                    autoSpeak: fromVoice,
                  },
                ]);

                setLoading(false);
                return;
              }
            }
          }
        } catch (error) {
          console.log(
            "Correlation analysis check failed, continuing to other handlers:",
            error,
          );
        }

        // PRIORITY -1.5: Check for advanced multi-condition queries (AND/OR logic)
        try {
          const advancedResponse = await fetch("/api/ai/advanced-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text }),
          });

          if (advancedResponse.ok) {
            const advancedData = await advancedResponse.json();

            if (
              advancedData.success &&
              advancedData.isAdvancedQuery &&
              advancedData.confidence >= 0.75
            ) {
              console.log(
                `🔍 Advanced multi-condition query detected: ${advancedData.logicalOperator} with ${advancedData.conditions.length} conditions`,
              );

              // Execute multi-condition query using text-to-sql
              try {
                const sqlResponse = await fetch("/api/ai/text-to-sql", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ query: text }),
                });

                if (sqlResponse.ok) {
                  const sqlData = await sqlResponse.json();

                  if (sqlData.success && sqlData.results) {
                    const { AdvancedQueryWidget } = await import(
                      "./widgets/AdvancedQueryWidget"
                    );

                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `Found ${sqlData.results.length} results matching your advanced query`,
                        customWidget: (
                          <AdvancedQueryWidget
                            conditions={advancedData.conditions}
                            logicalOperator={advancedData.logicalOperator}
                            results={sqlData.results}
                            filters={advancedData.filters}
                          />
                        ),
                        autoSpeak: fromVoice,
                      },
                    ]);

                    setLoading(false);
                    return;
                  }
                }
              } catch (sqlError) {
                console.log(
                  "SQL execution for advanced query failed:",
                  sqlError,
                );
              }
            }
          }
        } catch (error) {
          console.log(
            "Advanced query check failed, continuing to other handlers:",
            error,
          );
        }

        // PRIORITY -1: Handle structured intents with enhanced interpretation
        const enhancedInterpretation = await handleEnhancedInterpretation(text);

        if (
          enhancedInterpretation.confidence >= 0.7 &&
          enhancedInterpretation.intent !== "FALLBACK"
        ) {
          console.log(
            `🚀 Enhanced intent detected: ${enhancedInterpretation.intent} with confidence: ${enhancedInterpretation.confidence}`,
          );

          try {
            switch (enhancedInterpretation.intent) {
              case "COMPREHENSIVE_SCHEME_ANALYSIS":
                // User provided just a scheme ID or name - show comprehensive analysis
                const identifier =
                  enhancedInterpretation.entities?.schemeId ||
                  enhancedInterpretation.entities?.schemeName;
                if (identifier) {
                  try {
                    const response = await fetch(
                      `/api/scheme-analysis/comprehensive/${encodeURIComponent(
                        identifier,
                      )}`,
                    );
                    if (response.ok) {
                      const data = await response.json();
                      const scheme = data.scheme_information;
                      const waterData = data.village_water_supply_data;
                      const sensorData = data.sensor_data;

                      // Format comprehensive response with all details
                      let comprehensiveText = `${scheme.scheme_name} (${scheme.scheme_id}) comes under Maharashtra Jeevan Pradhikaran and is one of the key Multi-Village Schemes aimed at providing safe and sustainable drinking water supply.\n\n`;

                      comprehensiveText += `The ${scheme.scheme_name} is currently ${scheme.completion_status}.\n`;
                      comprehensiveText += `It covers ${scheme.number_of_villages} villages, out of which ${scheme.villages_integrated} villages have already been integrated.\n`;
                      comprehensiveText += `The scheme also includes ${scheme.total_esr} ESRs, with ${scheme.esr_integrated} fully integrated so far.\n`;
                      comprehensiveText += `Below is a detailed breakdown of water supply, LPCD levels, and sensor performance for this scheme.\n\n`;

                      comprehensiveText += `📊 Comprehensive Analysis for ${scheme.scheme_name}\n\n`;

                      comprehensiveText += `🏗️ Scheme Information:\n`;
                      comprehensiveText += `• Region: ${scheme.region}\n`;
                      comprehensiveText += `• Circle: ${scheme.circle}\n`;
                      comprehensiveText += `• Division: ${scheme.division}\n`;
                      comprehensiveText += `• Block: ${scheme.block}\n`;
                      comprehensiveText += `• Agency: ${scheme.agency || "null"
                        }\n`;
                      comprehensiveText += `• Completion Status: ${scheme.completion_status === "Fully Completed"
                        ? "✅ Fully Completed"
                        : "⏳ " + scheme.completion_status
                        }\n`;
                      comprehensiveText += `• Functional Status: ${scheme.functional_status || "Unknown"
                        }\n`;
                      comprehensiveText += `• MJP Commissioned: ${scheme.mjp_commissioned ? "Yes" : "No"
                        }\n`;
                      comprehensiveText += `• MJP Fully Completed: ${scheme.mjp_fully_completed || "N/A"
                        }\n\n`;

                      comprehensiveText += `🏘️ Village Infrastructure:\n`;
                      comprehensiveText += `• Villages in Scheme: ${scheme.number_of_villages}\n`;
                      comprehensiveText += `• Villages Integrated: ${scheme.villages_integrated}\n`;
                      comprehensiveText += `• Functional Villages: ${scheme.functional_villages}\n`;
                      comprehensiveText += `• Fully Completed Villages: ${scheme.fully_completed_villages}\n`;
                      comprehensiveText += `• Partial Villages: ${scheme.partial_villages}\n`;
                      comprehensiveText += `• Non-functional Villages: ${scheme.non_functional_villages}\n\n`;

                      comprehensiveText += `🏗️ ESR Infrastructure:\n`;
                      comprehensiveText += `• Total ESRs: ${scheme.total_esr}\n`;
                      comprehensiveText += `• ESR Integrated: ${scheme.esr_integrated}\n`;
                      comprehensiveText += `• Fully Completed ESR: ${scheme.fully_completed_esr}\n`;
                      comprehensiveText += `• Balance ESR to Complete: ${scheme.balance_esr_to_complete}\n`;
                      comprehensiveText += `• Flow Meters: ${scheme.flow_meters_connected}\n`;
                      comprehensiveText += `• Chlorine Analyzers: ${scheme.chlorine_analyzers_connected}\n`;
                      comprehensiveText += `• Pressure Transmitters: ${scheme.pressure_transmitters_connected}\n\n`;

                      comprehensiveText += `💧 Water Supply Analysis:\n`;
                      comprehensiveText += `• Villages with Data: ${waterData.total_villages_with_data}\n`;
                      comprehensiveText += `• Villages Receiving Water: ${waterData.villages_receiving_water}\n`;
                      comprehensiveText += `• Villages with No Water: ${waterData.villages_with_no_water}\n`;
                      comprehensiveText += `• Villages with Consistent Water: ${waterData.villages_consistent_water_supply}\n`;
                      comprehensiveText += `• Villages with Consistent Zero Water: ${waterData.villages_consistent_zero_water}\n`;
                      comprehensiveText += `• Villages Above 55 LPCD: ${waterData.villages_above_55_lpcd}\n`;
                      comprehensiveText += `• Villages Below 55 LPCD: ${waterData.villages_below_55_lpcd}\n`;
                      comprehensiveText += `• Villages Consistently Above 55 LPCD: ${waterData.villages_consistently_above_55_lpcd}\n`;
                      comprehensiveText += `• Villages Consistently Below 55 LPCD: ${waterData.villages_consistently_below_55_lpcd}\n`;
                      comprehensiveText += `• Total Population Covered: ${waterData.total_population_covered.toLocaleString()}\n`;
                      comprehensiveText += `• Average LPCD: ${waterData.avg_lpcd_day7.toFixed(
                        2,
                      )}\n\n`;

                      comprehensiveText += `🔬 Sensor Performance Analysis:\n`;
                      comprehensiveText += `Chlorine Levels (Optimal: 0.2-0.5 mg/L):\n`;
                      comprehensiveText += `• ESR with Optimal Chlorine: ${sensorData.chlorine_sensors.optimal_range_0_2_to_0_5}\n`;
                      comprehensiveText += `• ESR Below Optimal: ${sensorData.chlorine_sensors.below_range_less_than_0_2}\n`;
                      comprehensiveText += `• ESR Above Optimal: ${sensorData.chlorine_sensors.above_range_greater_than_0_5}\n`;
                      comprehensiveText += `• ESR with Zero Readings: ${sensorData.chlorine_sensors.zero_readings}\n`;
                      comprehensiveText += `• ESR Consistently Optimal: ${sensorData.chlorine_sensors.consistent_optimal_range}\n`;
                      comprehensiveText += `• Average Chlorine Level: ${sensorData.chlorine_sensors.avg_chlorine_day7.toFixed(
                        2,
                      )} mg/L\n\n`;

                      comprehensiveText += `Pressure Levels (Optimal: 0.2-0.7 bar):\n`;
                      comprehensiveText += `• ESR with Optimal Pressure: ${sensorData.pressure_sensors.optimal_range_0_2_to_0_7}\n`;
                      comprehensiveText += `• ESR Below Optimal: ${sensorData.pressure_sensors.below_range_less_than_0_2}\n`;
                      comprehensiveText += `• ESR Above Optimal: ${sensorData.pressure_sensors.above_range_greater_than_0_7}\n`;
                      comprehensiveText += `• ESR with Zero Readings: ${sensorData.pressure_sensors.zero_readings}\n`;
                      comprehensiveText += `• ESR Consistently Optimal: ${sensorData.pressure_sensors.consistent_optimal_range}\n`;
                      comprehensiveText += `• Average Pressure Level: ${sensorData.pressure_sensors.avg_pressure_day7.toFixed(
                        2,
                      )} bar\n\n`;

                      comprehensiveText += `📈 Completion Summary:\n`;
                      comprehensiveText += `• Total Villages in System: ${data.village_completion_data.total_villages_in_system}\n`;
                      comprehensiveText += `• Fully Completed Villages: ${data.village_completion_data.fully_completed_villages_count}\n`;
                      comprehensiveText += `• Partial Villages: ${data.village_completion_data.partial_villages_count}`;

                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: comprehensiveText,
                          widget: "comprehensiveSchemeAnalysisOptions",
                          schemeAnalysis: data,
                          autoSpeak: fromVoice,
                        },
                      ]);
                    } else {
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: `❌ Sorry, I couldn't find comprehensive analysis for "${identifier}". Please check the scheme name or ID and try again.`,
                          autoSpeak: fromVoice,
                        },
                      ]);
                    }
                  } catch (error) {
                    console.error(
                      "Error fetching comprehensive scheme analysis:",
                      error,
                    );
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: "❌ Sorry, I encountered an error while fetching comprehensive scheme analysis. Please try again.",
                        autoSpeak: fromVoice,
                      },
                    ]);
                  }
                } else {
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "❌ Please specify a scheme name or ID to get comprehensive analysis.",
                      autoSpeak: fromVoice,
                    },
                  ]);
                }
                setLoading(false);
                return;

              // case "SCHEME_DETAILS":
              //   // Fetch schemes data and show CombinedSchemesWidget
              //   try {
              //     const response = await fetch(
              //       "/api/category-data/combined-schemes"
              //     );
              //     if (response.ok) {
              //       const schemes = await response.json();
              //       setChatMessages((prev) => [
              //         ...prev,
              //         {
              //           type: "bot",
              //           text: "📊 Here's a comprehensive analysis of scheme details across Maharashtra:",
              //           widget: "combinedSchemes",
              //           schemes: schemes,
              //           selectedRegion: "all",
              //           autoSpeak: fromVoice,
              //         },
              //       ]);
              //     } else {
              //       setChatMessages((prev) => [
              //         ...prev,
              //         {
              //           type: "bot",
              //           text: "❌ Sorry, I couldn't fetch scheme details data. Please try again.",
              //           autoSpeak: fromVoice,
              //         },
              //       ]);
              //     }
              //   } catch (error) {
              //     console.error("Error fetching schemes data:", error);
              //     setChatMessages((prev) => [
              //       ...prev,
              //       {
              //         type: "bot",
              //         text: "❌ Sorry, I encountered an error while fetching scheme details. Please try again.",
              //         autoSpeak: fromVoice,
              //       },
              //     ]);
              //   }
              //   setLoading(false);
              //   return;

              case "SCHEME_ESR_SUMMARY":
                const schemeIdentifier =
                  enhancedInterpretation.entities?.schemeId ||
                  enhancedInterpretation.entities?.schemeName;
                if (schemeIdentifier) {
                  const response = await fetch(
                    `/api/category-data/scheme-esr-summary/${encodeURIComponent(
                      schemeIdentifier,
                    )}`,
                  );
                  if (response.ok) {
                    const data = await response.json();
                    const responseText =
                      `📊 **ESR Summary for ${data.scheme_name}:**\n\n` +
                      `📍 **Location:** ${data.location.region}, ${data.location.circle}, ${data.location.division}\n` +
                      `🏗️ **Total ESRs:** ${data.esr_summary.total_number_of_esr}\n` +
                      `🔗 **Integrated ESRs:** ${data.esr_summary.total_esr_integrated}\n` +
                      `✅ **Completed ESRs:** ${data.esr_summary.no_fully_completed_esr}\n` +
                      `⏳ **Remaining ESRs:** ${data.esr_summary.balance_to_complete_esr}`;

                    await addStreamedBotMessage(
                      {
                        text: responseText,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  } else {
                    await addStreamedBotMessage(
                      {
                        text: `❌ Sorry, I couldn't find ESR data for the scheme "${schemeIdentifier}". Please check the scheme name or ID and try again.`,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  }
                } else {
                  await addStreamedBotMessage(
                    {
                      text: "❌ Please specify a scheme name or ID to get ESR summary information.",
                      autoSpeak: fromVoice,
                    },
                    50,
                  );
                }
                setLoading(false);
                return;

              case "VILLAGE_ESR_SUMMARY":
                // IMPORTANT: Check if this is actually a scheme ID disguised as village query
                const schemeIdMatch = text.match(/\b(\d{7,8})\b/);
                if (schemeIdMatch) {
                  // This is a scheme ID, not a village - redirect to SCHEME_ESR_SUMMARY
                  console.log(
                    `🔄 Detected scheme ID ${schemeIdMatch[1]} in ESR query, redirecting to SCHEME_ESR_SUMMARY`,
                  );
                  const schemeResponse = await fetch(
                    `/api/category-data/scheme-esr-summary/${schemeIdMatch[1]}`,
                  );
                  if (schemeResponse.ok) {
                    const data = await schemeResponse.json();
                    const responseText =
                      `📊 **ESR Summary for ${data.scheme_name}:**\n\n` +
                      `📍 **Location:** ${data.location.region}, ${data.location.circle}, ${data.location.division}\n` +
                      `🏗️ **Total ESRs:** ${data.esr_summary.total_number_of_esr}\n` +
                      `🔗 **Integrated ESRs:** ${data.esr_summary.total_esr_integrated}\n` +
                      `✅ **Completed ESRs:** ${data.esr_summary.no_fully_completed_esr}\n` +
                      `⏳ **Remaining ESRs:** ${data.esr_summary.balance_to_complete_esr}`;

                    await addStreamedBotMessage(
                      {
                        text: responseText,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  } else {
                    await addStreamedBotMessage(
                      {
                        text: `❌ Sorry, I couldn't find ESR data for scheme ID "${schemeIdMatch[1]}". Please check the scheme ID and try again.`,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  }
                  setLoading(false);
                  return;
                }

                // Original village ESR logic
                if (enhancedInterpretation.entities?.villageName) {
                  const response = await fetch(
                    `/api/category-data/village-esr-summary/${encodeURIComponent(
                      enhancedInterpretation.entities.villageName,
                    )}`,
                  );
                  if (response.ok) {
                    const data = await response.json();
                    const responseText =
                      `📊 **ESR Summary for ${data.village_name} Village:**\n\n` +
                      `📍 **Location:** ${data.location.region}, ${data.location.circle}, ${data.location.division}\n` +
                      `🏗️ **Scheme:** ${data.scheme_name}\n` +
                      `🏗️ **Total ESRs:** ${data.esr_summary.number_of_esr}\n` +
                      `🔗 **Connected ESRs:** ${data.esr_summary.connected_esr}\n` +
                      `❌ **Not Connected ESRs:** ${data.esr_summary.not_connected_esr}\n` +
                      `📊 **Functional Status:** ${data.esr_summary.village_functional_status ||
                      "Not specified"
                      }`;

                    await addStreamedBotMessage(
                      {
                        text: responseText,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  } else {
                    await addStreamedBotMessage(
                      {
                        text: `❌ Sorry, I couldn't find ESR data for "${enhancedInterpretation.entities.villageName}" village. Please check the village name and try again.`,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  }
                } else {
                  await addStreamedBotMessage(
                    {
                      text: "❌ Please specify a village name to get ESR summary information.",
                      autoSpeak: fromVoice,
                    },
                    50,
                  );
                }
                setLoading(false);
                return;

              case "REGION_ESR_SUMMARY":
                // IMPORTANT: Check if this is actually a scheme ID disguised as region query
                const regionSchemeIdMatch = text.match(/\b(\d{7,8})\b/);
                if (regionSchemeIdMatch) {
                  // This is a scheme ID, not a region - redirect to SCHEME_ESR_SUMMARY
                  console.log(
                    `🔄 Detected scheme ID ${regionSchemeIdMatch[1]} in ESR query, redirecting to SCHEME_ESR_SUMMARY`,
                  );
                  const schemeResponse = await fetch(
                    `/api/category-data/scheme-esr-summary/${regionSchemeIdMatch[1]}`,
                  );
                  if (schemeResponse.ok) {
                    const data = await schemeResponse.json();
                    const responseText =
                      `📊 **ESR Summary for ${data.scheme_name}:**\n\n` +
                      `📍 **Location:** ${data.location.region}, ${data.location.circle}, ${data.location.division}\n` +
                      `🏗️ **Total ESRs:** ${data.esr_summary.total_number_of_esr}\n` +
                      `🔗 **Integrated ESRs:** ${data.esr_summary.total_esr_integrated}\n` +
                      `✅ **Completed ESRs:** ${data.esr_summary.no_fully_completed_esr}\n` +
                      `⏳ **Remaining ESRs:** ${data.esr_summary.balance_to_complete_esr}`;

                    await addStreamedBotMessage(
                      {
                        text: responseText,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  } else {
                    await addStreamedBotMessage(
                      {
                        text: `❌ Sorry, I couldn't find ESR data for scheme ID "${regionSchemeIdMatch[1]}". Please check the scheme ID and try again.`,
                        autoSpeak: fromVoice,
                      },
                      50,
                    );
                  }
                  setLoading(false);
                  return;
                }

                // Original region ESR logic
                if (enhancedInterpretation.entities?.regionName) {
                  const regionResponse = await fetch(
                    `/api/category-data/esr-count/${encodeURIComponent(
                      enhancedInterpretation.entities.regionName,
                    )}?type=region`,
                  );
                  if (regionResponse.ok) {
                    const data = await regionResponse.json();
                    const detectedLang = detectLanguageFromText(text);

                    // Generate translated response
                    const esrTitleText = t("esr.titleForRegion", detectedLang, { region: data.identifier });
                    const locationText = t("common.location", detectedLang);
                    const totalIntegratedText = t("esr.totalIntegrated", detectedLang);

                    const responseText =
                      `📊 **${esrTitleText}:**\n\n` +
                      `📍 **${locationText}:** ${data.location.region}\n` +
                      `🏗️ **${totalIntegratedText}:** ${data.esr_count || 0}`;

                    await addStreamedBotMessage(
                      {
                        text: responseText,
                        autoSpeak: fromVoice,
                        language: detectedLang,
                      },
                      50,
                    );
                  } else {
                    const detectedLang = detectLanguageFromText(text);
                    const errorMessages: Record<Language, string> = {
                      en: `Sorry, I couldn't find ESR data for the "${enhancedInterpretation.entities.regionName}" region. Please check the region name and try again.`,
                      hi: `क्षमा करें, मुझे "${enhancedInterpretation.entities.regionName}" क्षेत्र के लिए ESR डेटा नहीं मिला। कृपया क्षेत्र का नाम जांचें और पुनः प्रयास करें।`,
                      mr: `माफ करा, मला "${enhancedInterpretation.entities.regionName}" प्रदेशासाठी ESR डेटा सापडला नाही. कृपया प्रदेशाचे नाव तपासा आणि पुन्हा प्रयत्न करा.`,
                    };
                    await addStreamedBotMessage(
                      {
                        text: `❌ ${errorMessages[detectedLang]}`,
                        autoSpeak: fromVoice,
                        language: detectedLang,
                      },
                      50,
                    );
                  }
                } else {
                  const detectedLang = detectLanguageFromText(text);
                  const specifyRegionMessages: Record<Language, string> = {
                    en: "Please specify a region name to get ESR summary information.",
                    hi: "ESR सारांश जानकारी प्राप्त करने के लिए कृपया एक क्षेत्र का नाम निर्दिष्ट करें।",
                    mr: "ESR सारांश माहिती मिळविण्यासाठी कृपया प्रदेशाचे नाव निर्दिष्ट करा.",
                  };
                  await addStreamedBotMessage(
                    {
                      text: `❌ ${specifyRegionMessages[detectedLang]}`,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                    50,
                  );
                }
                setLoading(false);
                return;

              case "ABRUPT_WATER_CONSUMPTION":
                // Show AbruptWaterConsumptionWidget for ESRs with >400% consumption
                const abruptRegionParam =
                  enhancedInterpretation.entities?.regionName || null;
                const abruptSchemeParam =
                  enhancedInterpretation.entities?.schemeName ||
                  enhancedInterpretation.entities?.schemeId ||
                  null;
                const abruptVillageParam =
                  enhancedInterpretation.entities?.villageName || null;

                let abruptScopeText = "";
                if (abruptVillageParam) {
                  abruptScopeText = ` in ${abruptVillageParam} village`;
                } else if (abruptSchemeParam) {
                  abruptScopeText = ` for scheme ${abruptSchemeParam}`;
                } else if (abruptRegionParam) {
                  abruptScopeText = ` in ${abruptRegionParam} region`;
                } else {
                  abruptScopeText = " across all regions";
                }

                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `⚠️ Here are the ESRs with abrupt water consumption (>400% of capacity)${abruptScopeText}:`,
                    widget: "abruptWaterConsumption",
                    selectedRegion: abruptRegionParam || "all",
                    selectedScheme: abruptSchemeParam || "all",
                    selectedVillage: abruptVillageParam || "all",
                    autoSpeak: fromVoice,
                  },
                ]);
                setLoading(false);
                return;

              case "RELIABLE_WATER_CONSUMPTION":
                // Show ReliableWaterConsumptionWidget for villages with <=200% ESR consumption AND LPCD >100
                const reliableRegionParam =
                  enhancedInterpretation.entities?.regionName || null;
                const reliableSchemeParam =
                  enhancedInterpretation.entities?.schemeName ||
                  enhancedInterpretation.entities?.schemeId ||
                  null;
                const reliableVillageParam =
                  enhancedInterpretation.entities?.villageName || null;

                let reliableScopeText = "";
                if (reliableVillageParam) {
                  reliableScopeText = ` in ${reliableVillageParam} village`;
                } else if (reliableSchemeParam) {
                  reliableScopeText = ` for scheme ${reliableSchemeParam}`;
                } else if (reliableRegionParam) {
                  reliableScopeText = ` in ${reliableRegionParam} region`;
                } else {
                  reliableScopeText = " across all regions";
                }

                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `✅ Here are villages with reliable water consumption (≤200% ESR capacity + LPCD >100)${reliableScopeText}:`,
                    widget: "reliableWaterConsumption",
                    selectedRegion: reliableRegionParam || "all",
                    selectedScheme: reliableSchemeParam || "all",
                    selectedVillage: reliableVillageParam || "all",
                    autoSpeak: fromVoice,
                  },
                ]);
                setLoading(false);
                return;

              case "ESR_WATER_CONSUMPTION":
                // Show ESRWaterConsumptionWidget with region/scheme filtering
                const regionParam =
                  enhancedInterpretation.entities?.regionName || null;
                // Handle both scheme name and scheme ID from OpenAI interpretation
                const schemeParam =
                  enhancedInterpretation.entities?.schemeName ||
                  enhancedInterpretation.entities?.schemeId ||
                  null;

                let scopeText = "";
                if (regionParam) {
                  scopeText = ` in ${regionParam} region`;
                } else if (schemeParam) {
                  scopeText = ` for ${schemeParam} scheme`;
                }

                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `📊 Here's the ESR level water consumption analysis${scopeText}:`,
                    widget: "esrWaterConsumption",
                    selectedRegion: regionParam || "all",
                    selectedScheme: schemeParam || "all",
                    autoSpeak: fromVoice,
                  },
                ]);
                setLoading(false);
                return;

              case "SCHEME_VILLAGE_SUMMARY":
                const schemeVillageIdentifier =
                  enhancedInterpretation.entities?.schemeId ||
                  enhancedInterpretation.entities?.schemeName;
                if (schemeVillageIdentifier) {
                  const response = await fetch(
                    `/api/category-data/scheme-village-summary/${encodeURIComponent(
                      schemeVillageIdentifier,
                    )}`,
                  );
                  if (response.ok) {
                    const data = await response.json();
                    const responseText =
                      `📊 **Village Summary for ${data.scheme_name}:**\n\n` +
                      `📍 **Location:** ${data.location.region}, ${data.location.circle}, ${data.location.division}\n` +
                      `🏘️ **Total Villages:** ${data.village_summary.number_of_village}\n` +
                      `🔗 **Integrated Villages:** ${data.village_summary.total_villages_integrated}\n` +
                      `✅ **Functional Villages:** ${data.village_summary.no_of_functional_village}\n` +
                      `⚠️ **Partial Villages:** ${data.village_summary.no_of_partial_village}\n` +
                      `❌ **Non-functional Villages:** ${data.village_summary.no_of_non_functional_village}\n` +
                      `🏁 **Fully Completed Villages:** ${data.village_summary.fully_completed_villages}`;

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: responseText, autoSpeak: fromVoice },
                    ]);
                  } else {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `❌ Sorry, I couldn't find village data for the scheme "${schemeVillageIdentifier}". Please check the scheme name or ID and try again.`,
                        autoSpeak: fromVoice,
                      },
                    ]);
                  }
                } else {
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "❌ Please specify a scheme name or ID to get village summary information.",
                      autoSpeak: fromVoice,
                    },
                  ]);
                }
                setLoading(false);
                return;

              case "VILLAGE_ESR_CONSUMPTION":
                if (enhancedInterpretation.entities?.villageName) {
                  const response = await fetch(
                    `/api/category-data/villages/${encodeURIComponent(
                      enhancedInterpretation.entities.villageName,
                    )}/esr-consumption`,
                  );
                  if (response.ok) {
                    const data = await response.json();
                    let responseText =
                      `📊 **ESR-level Water Consumption for ${data.village_name} Village:**\n\n` +
                      `📍 **Scheme:** ${data.scheme_name}\n` +
                      `🗺️ **Region:** ${data.region}\n\n` +
                      `**ESR Data:**\n`;

                    data.esr_data.forEach((esr: any, index: number) => {
                      responseText +=
                        `${index + 1}. **${esr.esr_name || `ESR ${index + 1}`
                        }:**\n` +
                        `   💧 **Water Value:** ${esr.water_value_day7 || "No data"
                        } LL\n` +
                        `   📅 **Date:** ${esr.water_date_day7 || "Not specified"
                        }\n` +
                        `   🏗️ **Capacity:** ${esr.esr_capacity || "Not specified"
                        } LL\n` +
                        `   📊 **Flow Meter:** ${esr.flow_meter_connected
                          ? "Connected"
                          : "Not connected"
                        }\n` +
                        `   🔌 **Status:** ${esr.online_status || "Unknown"
                        }\n\n`;
                    });

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: responseText, autoSpeak: fromVoice },
                    ]);
                  } else {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `❌ Sorry, I couldn't find ESR-level consumption data for "${enhancedInterpretation.entities.villageName}" village. Please check the village name and try again.`,
                        autoSpeak: fromVoice,
                      },
                    ]);
                  }
                } else {
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "❌ Please specify a village name to get ESR-level water consumption data.",
                      autoSpeak: fromVoice,
                    },
                  ]);
                }
                setLoading(false);
                return;

              case "ESR_CAPACITY":
                // Handle ESR capacity queries
                const capacityRegionParam =
                  enhancedInterpretation.entities?.regionName || null;
                // Prefer schemeId (numeric) over schemeName to ensure correct API parameter matching
                const capacitySchemeParam =
                  enhancedInterpretation.entities?.schemeId ||
                  enhancedInterpretation.entities?.schemeName ||
                  null;
                const capacityVillageParam =
                  enhancedInterpretation.entities?.villageName || null;

                // Build query parameters
                const capacityParams = new URLSearchParams();
                if (capacityRegionParam)
                  capacityParams.append("region", capacityRegionParam);
                if (capacitySchemeParam)
                  capacityParams.append("schemeId", capacitySchemeParam);
                if (capacityVillageParam)
                  capacityParams.append("village", capacityVillageParam);

                // Determine scope for response text
                let capacityScopeText = "";
                let capacityContext = "";
                if (capacityVillageParam) {
                  capacityScopeText = ` for ${capacityVillageParam} village`;
                  capacityContext = "village";
                } else if (capacitySchemeParam) {
                  capacityScopeText = ` for scheme ${capacitySchemeParam}`;
                  capacityContext = "scheme";
                } else if (capacityRegionParam) {
                  capacityScopeText = ` in ${capacityRegionParam} region`;
                  capacityContext = "region";
                } else {
                  capacityScopeText = " across all regions";
                  capacityContext = "all";
                }

                try {
                  const capacityResponse = await fetch(
                    `/api/category-data/esr-capacity?${capacityParams.toString()}`,
                  );

                  if (capacityResponse.ok) {
                    const capacityData = await capacityResponse.json();

                    let responseText = `🏗️ **ESR Capacity Summary${capacityScopeText}:**\n\n`;
                    responseText += `📊 **Total ESR Capacity:** ${capacityData.totalCapacity.toFixed(2)} Lakh Liters (LL)\n`;
                    responseText += `🔢 **Total ESRs:** ${capacityData.totalEsrs}\n\n`;

                    // Show breakdown based on context
                    if (
                      capacityContext === "all" ||
                      capacityContext === "region"
                    ) {
                      const regionBreakdown = Object.entries(
                        capacityData.sumByRegion as Record<string, number>,
                      );
                      if (regionBreakdown.length > 0) {
                        responseText += `**📍 Breakdown by Region:**\n`;
                        regionBreakdown.forEach(([region, capacity]) => {
                          responseText += `  • ${region}: ${(capacity as number).toFixed(2)} LL\n`;
                        });
                        responseText += `\n`;
                      }
                    }

                    if (
                      capacityContext === "scheme" ||
                      (capacityContext === "all" &&
                        Object.keys(capacityData.sumByScheme).length <= 10)
                    ) {
                      const schemeBreakdown = Object.entries(
                        capacityData.sumByScheme as Record<string, number>,
                      ).slice(0, 10);
                      if (schemeBreakdown.length > 0) {
                        responseText += `**🏗️ Breakdown by Scheme:**\n`;
                        schemeBreakdown.forEach(([scheme, capacity]) => {
                          responseText += `  • ${scheme}: ${(capacity as number).toFixed(2)} LL\n`;
                        });
                        if (Object.keys(capacityData.sumByScheme).length > 10) {
                          responseText += `  • ... and ${Object.keys(capacityData.sumByScheme).length - 10} more schemes\n`;
                        }
                        responseText += `\n`;
                      }
                    }

                    if (capacityContext === "village") {
                      const villageBreakdown = Object.entries(
                        capacityData.sumByVillage as Record<string, number>,
                      );
                      if (villageBreakdown.length > 0) {
                        responseText += `**🏘️ Breakdown by Village:**\n`;
                        villageBreakdown.forEach(([village, capacity]) => {
                          responseText += `  • ${village}: ${(capacity as number).toFixed(2)} LL\n`;
                        });
                      }
                    }

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: responseText, autoSpeak: fromVoice },
                    ]);
                  } else {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `❌ Sorry, I couldn't find ESR capacity data${capacityScopeText}. Please check your query and try again.`,
                        autoSpeak: fromVoice,
                      },
                    ]);
                  }
                } catch (error) {
                  console.error("Error fetching ESR capacity data:", error);
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "❌ Sorry, I encountered an error while fetching ESR capacity data. Please try again.",
                      autoSpeak: fromVoice,
                    },
                  ]);
                }
                setLoading(false);
                return;

              case "CHLORINE_SENSOR_STATUS":
                // Handle chlorine sensor day-wise status queries (offline, below 0.2, above 0.5)
                const metric = enhancedInterpretation.entities?.metric || "offline";
                const rawDays = enhancedInterpretation.entities?.days;
                const sensorRegion = enhancedInterpretation.entities?.regionName || null;

                // Validate and sanitize days input
                let days = 1; // default
                if (rawDays !== undefined && rawDays !== null) {
                  const parsedDays = typeof rawDays === "number" ? rawDays : parseInt(String(rawDays), 10);
                  if (isNaN(parsedDays)) {
                    // Handle genuinely malformed inputs
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: "❌ Invalid day count. Please specify a number between 1 and 30.",
                        autoSpeak: fromVoice,
                      },
                    ]);
                    setLoading(false);
                    return;
                  }
                  // Clamp to valid range (1-30)
                  days = Math.max(1, Math.min(30, parsedDays));
                }

                // Validate metric
                if (!["offline", "below_0_2", "above_0_5"].includes(metric)) {
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "❌ Invalid sensor status metric. Please specify offline, below 0.2, or above 0.5.",
                      autoSpeak: fromVoice,
                    },
                  ]);
                  setLoading(false);
                  return;
                }

                try {
                  // Build query parameters for day-wise sensors
                  const sensorParams = new URLSearchParams();
                  if (sensorRegion) sensorParams.append("region", sensorRegion);

                  // Fetch sensor count
                  const sensorCountResponse = await fetch(
                    `/api/chlorine/day-wise-sensors/${metric}/${days}?${sensorParams.toString()}`,
                  );

                  if (sensorCountResponse.ok) {
                    const sensorData = await sensorCountResponse.json();
                    const sensorCount = sensorData.count || 0;

                    // Create friendly labels for each metric type
                    const metricLabels = {
                      offline: "offline",
                      below_0_2: "below 0.2 mg/L (Low Chlorine)",
                      above_0_5: "above 0.5 mg/L (High Chlorine)",
                    };
                    const metricLabel = metricLabels[metric as keyof typeof metricLabels];

                    const regionText = sensorRegion ? ` in ${sensorRegion}` : "";
                    const dayText = days === 1 ? "1 day" : `${days} consecutive days`;

                    let responseText = `📊 **Chlorine Sensor Status Report**\n\n`;
                    responseText += `Found **${sensorCount} sensors** that are ${metricLabel} for ${dayText}${regionText}.`;

                    if (sensorCount === 0) {
                      responseText += `\n\nℹ️ No sensors found matching this criteria.`;
                    }

                    // Add the main message first
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: responseText,
                        autoSpeak: fromVoice,
                      },
                    ]);

                    // Then add the download widget as a separate message if there are results
                    if (sensorCount > 0) {
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: "📥 Download the complete Excel report below with scheme, village, ESR, and chlorine details.",
                          widget: "chlorineSensorExport",
                          chlorineSensorExportData: {
                            metric,
                            days,
                            region: sensorRegion || "all",
                            count: sensorCount,
                            label: metricLabel,
                          },
                          autoSpeak: false,
                        },
                      ]);
                    }
                  } else {
                    // Provide detailed error feedback based on status code
                    let errorMessage = "❌ Sorry, I couldn't fetch chlorine sensor status data.";
                    if (sensorCountResponse.status === 400) {
                      errorMessage += " The request parameters were invalid. Please check your query and try again.";
                    } else if (sensorCountResponse.status === 404) {
                      errorMessage += " The requested data was not found. Please verify the region name and try again.";
                    } else if (sensorCountResponse.status >= 500) {
                      errorMessage += " The server encountered an error. Please try again later.";
                    } else {
                      errorMessage += " Please try again.";
                    }

                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: errorMessage,
                        autoSpeak: fromVoice,
                      },
                    ]);
                  }
                } catch (error) {
                  console.error("Error fetching chlorine sensor status:", error);
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "❌ Sorry, I encountered an error while fetching chlorine sensor status. Please try again.",
                      autoSpeak: fromVoice,
                    },
                  ]);
                }
                setLoading(false);
                return;
            }
          } catch (error) {
            console.error("Error handling enhanced intent:", error);
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "❌ Sorry, I encountered an error while processing your request. Please try again.",
                autoSpeak: fromVoice,
              },
            ]);
            setLoading(false);
            return;
          }
        }

        // PRIORITY -0.5: Handle 10 widget types with strict filtering using OpenAI
        // BUT skip widget-intent for specific village queries like "lpcd in X" where X is not a region
        // These should be handled by the village-specific keyword handlers below
        const knownRegionsForSkip = ["nagpur", "pune", "nashik", "amravati", "konkan", "mumbai", "aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"];
        const isSpecificVillageQuery =
          lowerText.match(/^(lpcd|chlorine|pressure|water consumption|water)\s+(in|for)\s+[a-z]/i) &&
          !knownRegionsForSkip.some(r => lowerText.includes(r)) &&
          !lowerText.includes("scheme") &&
          !lowerText.includes("wss") &&
          !lowerText.includes("region") &&
          !lowerText.includes("all");

        // Skip widget-intent for specific village queries - let keyword handlers process them
        const widgetIntentResult = isSpecificVillageQuery
          ? { widget: "NONE", confidence: 0 }
          : await handleWidgetIntent(text);

        if (
          widgetIntentResult.confidence >= 0.7 &&
          widgetIntentResult.widget !== "NONE"
        ) {
          console.log(
            `🎯 Widget intent detected: ${widgetIntentResult.widget} with confidence: ${widgetIntentResult.confidence}`,
          );
          console.log("Widget filters:", widgetIntentResult);

          try {
            const { widget, regionName, schemeName, schemeId, villageName } =
              widgetIntentResult;

            // Determine the filter to use (priority: villageName > schemeId > schemeName > regionName)
            // This ensures village-specific queries are always honored first
            let selectedRegion = "all";
            let selectedScheme = "all";
            let selectedVillage = "all";
            let filterDescription = "across all regions";

            // Define known regions for fallback detection
            const knownRegions = [
              "Amravati",
              "Nagpur",
              "Pune",
              "Nashik",
              "Konkan",
              "Chhatrapati Sambhajinagar",
              "Mumbai"
            ];

            // Handle common variations and aliases for region normalization
            const regionAliases: { [key: string]: string } = {
              "aurangabad": "Chhatrapati Sambhajinagar",
              "sambhajinagar": "Chhatrapati Sambhajinagar",
              "nasik": "Nashik",
              "poona": "Pune",
              "bombay": "Mumbai"
            };

            // Helper function to check if a name is a known region
            const isKnownRegion = (name: string | null): string | null => {
              if (!name) return null;
              const nameLower = name.toLowerCase().trim();

              // Check aliases first
              if (regionAliases[nameLower]) {
                return regionAliases[nameLower];
              }

              // Check against known regions (case-insensitive)
              const matchedRegion = knownRegions.find(
                r => r.toLowerCase() === nameLower
              );
              return matchedRegion || null;
            };

            // FALLBACK: Check if schemeName is actually a region name (common AI misclassification)
            const schemeNameAsRegion = isKnownRegion(schemeName);
            const actualRegionName = regionName || (schemeNameAsRegion ? schemeName : null);
            const actualSchemeName = schemeNameAsRegion ? null : schemeName;

            if (villageName) {
              selectedVillage = villageName;
              filterDescription = `in ${villageName} village`;
            } else if (schemeId) {
              selectedScheme = schemeId;
              filterDescription = `for scheme ${schemeId}`;
            } else if (actualSchemeName) {
              selectedScheme = actualSchemeName;
              filterDescription = `in ${actualSchemeName}`;
            } else if (actualRegionName) {
              // Use the isKnownRegion helper to normalize the region name
              const normalizedRegion = isKnownRegion(actualRegionName) || actualRegionName;
              selectedRegion = normalizedRegion;
              filterDescription = `in ${normalizedRegion} region`;
            }

            // Fetch data based on widget type
            const widgetHandlers: { [key: string]: () => Promise<void> } = {
              VillagesWithWaterWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-with-water?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  const detectedLang = detectLanguageFromText(text);

                  // Get enhanced contextual message for this widget (hybrid: template + optional AI)
                  const contextMessage = await getEnhancedWidgetMessage({
                    widgetType: "VillagesWithWaterWidget",
                    region: selectedRegion,
                    scheme: selectedScheme,
                    village: selectedVillage,
                    count: villages.length,
                    userQuery: text,
                    language: detectedLang,
                  });

                  // Stream the message with widget
                  await addStreamedBotMessage(
                    {
                      text: contextMessage,
                      widget: "villagesWithWater",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                    30,
                  );
                } else {
                  throw new Error("Failed to fetch villages with water data");
                }
              },

              VillagesNoWaterWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-no-water?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  const detectedLang = detectLanguageFromText(text);

                  // Get enhanced contextual message for this widget (hybrid: template + optional AI)
                  const contextMessage = await getEnhancedWidgetMessage({
                    widgetType: "VillagesNoWaterWidget",
                    region: selectedRegion,
                    scheme: selectedScheme,
                    village: selectedVillage,
                    count: villages.length,
                    userQuery: text,
                    language: detectedLang,
                  });

                  // Stream the message with widget
                  await addStreamedBotMessage(
                    {
                      text: contextMessage,
                      widget: "villagesNoWater",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                    30,
                  );
                } else {
                  throw new Error(
                    "Failed to fetch villages without water data",
                  );
                }
              },

              ConsistentWaterWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-consistent-water?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${villages.length} villages with consistent water supply ${filterDescription}:`,
                      widget: "consistentWater",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch consistent water data");
                }
              },

              ConsistentZeroWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-consistent-zero-water?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${villages.length} villages with consistently zero water ${filterDescription}:`,
                      widget: "consistentZero",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch consistent zero data");
                }
              },

              Above55LpcdWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-above-55-lpcd?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  const detectedLang = detectLanguageFromText(text);

                  // Get enhanced contextual message for this widget (hybrid: template + optional AI)
                  const contextMessage = await getEnhancedWidgetMessage({
                    widgetType: "Above55LpcdWidget",
                    region: selectedRegion,
                    scheme: selectedScheme,
                    village: selectedVillage,
                    count: villages.length,
                    userQuery: text,
                    language: detectedLang,
                  });

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: contextMessage,
                      widget: "above55Lpcd",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch above 55 LPCD data");
                }
              },

              Below55LpcdWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-below-55-lpcd?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  const detectedLang = detectLanguageFromText(text);

                  // Get enhanced contextual message for this widget (hybrid: template + optional AI)
                  const contextMessage = await getEnhancedWidgetMessage({
                    widgetType: "Below55LpcdWidget",
                    region: selectedRegion,
                    scheme: selectedScheme,
                    village: selectedVillage,
                    count: villages.length,
                    userQuery: text,
                    language: detectedLang,
                  });

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: contextMessage,
                      widget: "below55Lpcd",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch below 55 LPCD data");
                }
              },

              Above55SchemeWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);

                params.append("minLpcd", "55");

                // Fetch from scheme-lpcd API which now has full scheme details
                console.log("Fetching Above55SchemeWidget data with params:", params.toString());

                try {
                  const response = await fetch(
                    `/api/scheme-lpcd-data?${params.toString()}`,
                  );

                  if (response.ok) {
                    const rawSchemes = await response.json();
                    console.log("Above55SchemeWidget data fetched:", rawSchemes.length, "records");

                    // Map API response to widget format
                    const schemes = rawSchemes.map((s: any) => ({
                      ...s,
                      // Ensure field compatibility with CombinedSchemesWidget
                      number_of_village: s.total_villages,
                      // Other fields like fully_completed_villages, etc. are now directly in the response
                    }));

                    const detectedLang = detectLanguageFromText(text);

                    const filterDescription =
                      selectedRegion !== "all" ? ` in ${selectedRegion} region` : "";

                    const messageText = detectedLang === 'hi'
                      ? `📊 55 LPCD से ऊपर वाली ${schemes.length} योजनाएं मिलीं ${filterDescription}:`
                      : detectedLang === 'mr'
                        ? `📊 55 LPCD पेक्षा जास्त असलेल्या ${schemes.length} योजना सापडल्या ${filterDescription}:`
                        : `📊 Found ${schemes.length} schemes with LPCD above 55 ${filterDescription}:`;

                    setChatMessages((prev: ChatMessage[]) => [
                      ...prev,
                      {
                        type: "bot",
                        text: messageText,
                        widget: "above55Scheme", // Re-use existing widget for display
                        schemes: schemes,
                        selectedRegion: selectedRegion,
                        autoSpeak: fromVoice,
                        language: detectedLang,
                      },
                    ]);
                  } else {
                    console.error("Failed to fetch data, status:", response.status);
                    const errText = await response.text();
                    console.error("Error details:", errText);
                    throw new Error("Failed to fetch above 55 LPCD schemes data");
                  }
                } catch (error) {
                  console.error("Error in Above55SchemeWidget handler:", error);
                  throw error;
                }
              },

              Below55SchemeWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);

                params.append("maxLpcd", "55");

                // Fetch from scheme-lpcd API which now has full scheme details
                try {
                  const response = await fetch(
                    `/api/scheme-lpcd-data?${params.toString()}`,
                  );

                  if (response.ok) {
                    const rawSchemes = await response.json();
                    // Map API response to widget format
                    const schemes = rawSchemes.map((s: any) => ({
                      ...s,
                      // Ensure field compatibility with CombinedSchemesWidget
                      number_of_village: s.total_villages,
                    }));

                    const detectedLang = detectLanguageFromText(text);

                    const filterDescription =
                      selectedRegion !== "all" ? ` in ${selectedRegion} region` : "";

                    const messageText = detectedLang === 'hi'
                      ? `📊 55 LPCD से नीचे वाली ${schemes.length} योजनाएं मिलीं ${filterDescription}:`
                      : detectedLang === 'mr'
                        ? `📊 55 LPCD पेक्षा कमी असलेल्या ${schemes.length} योजना सापडल्या ${filterDescription}:`
                        : `📊 Found ${schemes.length} schemes with LPCD below 55 ${filterDescription}:`;

                    setChatMessages((prev: ChatMessage[]) => [
                      ...prev,
                      {
                        type: "bot",
                        text: messageText,
                        widget: "below55Scheme", // Re-use existing widget for display
                        schemes: schemes,
                        selectedRegion: selectedRegion,
                        autoSpeak: fromVoice,
                        language: detectedLang,
                      },
                    ]);
                  } else {
                    throw new Error("Failed to fetch below 55 LPCD schemes data");
                  }
                } catch (error) {
                  console.error("Error in Below55SchemeWidget handler:", error);
                  throw error;
                }
              },
              ConsistentAbove55LpcdWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-consistently-above-55-lpcd?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  const detectedLang = detectLanguageFromText(text);

                  // Get enhanced contextual message for this widget (hybrid: template + optional AI)
                  const contextMessage = await getEnhancedWidgetMessage({
                    widgetType: "ConsistentAbove55LpcdWidget",
                    region: selectedRegion,
                    scheme: selectedScheme,
                    village: selectedVillage,
                    count: villages.length,
                    userQuery: text,
                    language: detectedLang,
                  });

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: contextMessage,
                      widget: "consistentAbove55Lpcd",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent above 55 LPCD data",
                  );
                }
              },

              ConsistentBelow55LpcdWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/villages-consistently-below-55-lpcd?${params.toString()}`,
                );
                if (response.ok) {
                  const villages = await response.json();
                  const detectedLang = detectLanguageFromText(text);

                  // Get enhanced contextual message for this widget (hybrid: template + optional AI)
                  const contextMessage = await getEnhancedWidgetMessage({
                    widgetType: "ConsistentBelow55LpcdWidget",
                    region: selectedRegion,
                    scheme: selectedScheme,
                    village: selectedVillage,
                    count: villages.length,
                    userQuery: text,
                    language: detectedLang,
                  });

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: contextMessage,
                      widget: "consistentBelow55Lpcd",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent below 55 LPCD data",
                  );
                }
              },

              AverageAbove55LpcdWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/lpcd/average-above-55?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const villages = result.data || result;
                  const detectedLang = detectLanguageFromText(text);
                  const messageText = detectedLang === 'hi'
                    ? `📊 55 LPCD से ऊपर औसत वाले ${villages.length} गांव मिले ${filterDescription}:`
                    : detectedLang === 'mr'
                      ? `📊 55 LPCD च्या वर सरासरी असलेले ${villages.length} गावे सापडली ${filterDescription}:`
                      : `📊 Found ${villages.length} villages with average LPCD above 55 ${filterDescription}:`;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: messageText,
                      widget: "averageAbove55Lpcd",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch average above 55 LPCD data");
                }
              },

              AverageBelow55LpcdWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/lpcd/average-below-55?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const villages = result.data || result;
                  const detectedLang = detectLanguageFromText(text);
                  const messageText = detectedLang === 'hi'
                    ? `📊 55 LPCD से नीचे औसत वाले ${villages.length} गांव मिले ${filterDescription}:`
                    : detectedLang === 'mr'
                      ? `📊 55 LPCD च्या खाली सरासरी असलेले ${villages.length} गावे सापडली ${filterDescription}:`
                      : `📊 Found ${villages.length} villages with average LPCD below 55 ${filterDescription}:`;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: messageText,
                      widget: "averageBelow55Lpcd",
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch average below 55 LPCD data");
                }
              },

              OptimalChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/optimal?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  const detectedLang = detectLanguageFromText(text);

                  // Get enhanced contextual message for this widget (hybrid: template + optional AI)
                  const contextMessage = await getEnhancedWidgetMessage({
                    widgetType: "OptimalChlorineWidget",
                    region: selectedRegion,
                    scheme: selectedScheme,
                    village: selectedVillage,
                    count: esrs.length,
                    userQuery: text,
                    language: detectedLang,
                  });

                  // Stream the message with widget
                  await addStreamedBotMessage(
                    {
                      text: contextMessage,
                      widget: "optimalChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                      language: detectedLang,
                    },
                    30,
                  );
                } else {
                  throw new Error("Failed to fetch optimal chlorine data");
                }
              },

              BelowChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/below?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  // Stream the message with widget
                  await addStreamedBotMessage(
                    {
                      text: `📊 Found ${esrs.length} ESRs with chlorine levels below optimal (<0.2 mg/L) ${filterDescription}:`,
                      widget: "belowChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                    30,
                  );
                } else {
                  throw new Error("Failed to fetch below chlorine data");
                }
              },

              AboveChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/above?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  // Stream the message with widget
                  await addStreamedBotMessage(
                    {
                      text: `📊 Found ${esrs.length} ESRs with chlorine levels above optimal (>0.5 mg/L) ${filterDescription}:`,
                      widget: "aboveChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                    30,
                  );
                } else {
                  throw new Error("Failed to fetch above chlorine data");
                }
              },

              ConsistentOptimalChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/consistent-optimal?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with consistently optimal chlorine levels ${filterDescription}:`,
                      widget: "consistentOptimalChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent optimal chlorine data",
                  );
                }
              },

              ConsistentBelowChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/consistent-below?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with consistently below optimal chlorine levels ${filterDescription}:`,
                      widget: "consistentBelowChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent below chlorine data",
                  );
                }
              },

              ConsistentAboveChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/consistent-above?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with consistently above optimal chlorine levels ${filterDescription}:`,
                      widget: "consistentAboveChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent above chlorine data",
                  );
                }
              },

              AverageOptimalChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/average-optimal?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with average optimal chlorine levels ${filterDescription}:`,
                      widget: "averageOptimalChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch average optimal chlorine data",
                  );
                }
              },

              AverageBelowChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/average-below?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with average chlorine levels below optimal ${filterDescription}:`,
                      widget: "averageBelowChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch average below chlorine data",
                  );
                }
              },

              AverageAboveChlorineWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/chlorine/average-above?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with average chlorine levels above optimal ${filterDescription}:`,
                      widget: "averageAboveChlorine",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch average above chlorine data",
                  );
                }
              },

              OptimalPressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/optimal?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with optimal pressure levels (0.2-0.7 bar) ${filterDescription}:`,
                      widget: "optimalPressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch optimal pressure data");
                }
              },

              BelowPressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/below?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with pressure levels below optimal (<0.2 bar) ${filterDescription}:`,
                      widget: "belowPressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch below pressure data");
                }
              },

              AbovePressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/above?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with pressure levels above optimal (>0.7 bar) ${filterDescription}:`,
                      widget: "abovePressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error("Failed to fetch above pressure data");
                }
              },

              ConsistentOptimalPressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/consistent-optimal?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with consistently optimal pressure levels ${filterDescription}:`,
                      widget: "consistentOptimalPressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent optimal pressure data",
                  );
                }
              },

              ConsistentBelowPressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/consistent-below?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with consistently below optimal pressure levels ${filterDescription}:`,
                      widget: "consistentBelowPressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent below pressure data",
                  );
                }
              },

              ConsistentAbovePressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/consistent-above?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with consistently above optimal pressure levels ${filterDescription}:`,
                      widget: "consistentAbovePressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch consistent above pressure data",
                  );
                }
              },

              AverageOptimalPressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/average-optimal?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with average optimal pressure levels ${filterDescription}:`,
                      widget: "averageOptimalPressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch average optimal pressure data",
                  );
                }
              },

              AverageBelowPressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/average-below?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with average pressure levels below optimal ${filterDescription}:`,
                      widget: "averageBelowPressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch average below pressure data",
                  );
                }
              },

              AverageAbovePressureWidget: async () => {
                const params = new URLSearchParams();
                if (selectedRegion !== "all")
                  params.append("region", selectedRegion);
                if (selectedScheme !== "all")
                  params.append("schemeId", selectedScheme);
                if (selectedVillage !== "all")
                  params.append("village", selectedVillage);

                const response = await fetch(
                  `/api/category-data/pressure/average-above?${params.toString()}`,
                );
                if (response.ok) {
                  const result = await response.json();
                  const esrs = result.data || result;
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `📊 Found ${esrs.length} ESRs with average pressure levels above optimal ${filterDescription}:`,
                      widget: "averageAbovePressure",
                      esrs: esrs,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                      autoSpeak: fromVoice,
                    },
                  ]);
                } else {
                  throw new Error(
                    "Failed to fetch average above pressure data",
                  );
                }
              },

              CombinedLpcdStatusWidget: async () => {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `📊 **Village LPCD Statistics ${filterDescription}:**\n\nHere's the LPCD status for villages:`,
                    widget: "combinedLpcdStatus",
                    selectedRegion: selectedRegion,
                    selectedScheme: selectedScheme,
                    autoSpeak: fromVoice,
                  },
                ]);
              },

              CombinedSchemeLpcdWidget: async () => {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `📊 **Scheme-Level LPCD Analysis ${filterDescription}:**\n\nHere's the comprehensive LPCD status for all schemes:`,
                    widget: "combinedSchemeLpcd",
                    selectedRegion: selectedRegion,
                    autoSpeak: fromVoice,
                  },
                ]);
              },

              CombinedSchemesWidget: async () => {
                let apiUrl = "/api/category-data/combined-schemes";
                let scopeText = filterDescription;
                if (regionName) {
                  apiUrl += `?region=${encodeURIComponent(regionName)}`;
                }
                try {
                  const resp = await fetch(apiUrl);
                  if (resp.ok) {
                    const schemes = await resp.json();
                    const normalizeStatus = (status: string) =>
                      (status || "").toLowerCase().replace(/[-_\s]+/g, " ").trim();
                    const fullyCompleted = schemes.filter((s: any) => {
                      const n = normalizeStatus(s.fully_completion_scheme_status || "");
                      return n === "fully completed" || n === "completed";
                    }).length;
                    const inProgress = schemes.filter((s: any) =>
                      normalizeStatus(s.fully_completion_scheme_status || "") === "in progress"
                    ).length;
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `I found ${schemes.length} schemes ${scopeText} (${fullyCompleted} fully completed, ${inProgress} in progress).`,
                      },
                    ]);
                    if (schemes.length > 0) {
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: `Here is the comprehensive schemes analysis ${scopeText}:`,
                          widget: "combinedSchemes",
                          schemes: schemes,
                          selectedRegion: selectedRegion,
                          autoSpeak: fromVoice,
                        },
                      ]);
                    }
                  } else {
                    throw new Error("Failed to fetch schemes data");
                  }
                } catch (err) {
                  console.error("Error fetching combined schemes:", err);
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "❌ Sorry, I couldn't fetch the schemes data. Please try again.",
                      autoSpeak: fromVoice,
                    },
                  ]);
                }
              },
            };

            // Execute the appropriate widget handler
            if (widgetHandlers[widget]) {
              await widgetHandlers[widget]();
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error handling widget intent:", error);
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "❌ Sorry, I encountered an error while fetching the data. Please try again.",
                autoSpeak: fromVoice,
              },
            ]);
            setLoading(false);
            return;
          }
        }

        // PRIORITY 0: Check for village historical queries FIRST (highest priority)
        const hasHistoricalKeywordPrimary =
          lowerText.includes("water consumption") ||
          lowerText.includes("water") ||
          lowerText.includes("lpcd") ||
          lowerText.includes("chlorine") ||
          lowerText.includes("pressure");

        // Check if this looks like a village query - either has explicit "village" keyword,
        // OR has pattern like "lpcd in X on date" where X is not a region/scheme
        const hasExplicitVillageKeyword = lowerText.includes("village");
        const hasKnownVillage =
          lowerText.includes("bidgaon") ||
          lowerText.includes("wadi") ||
          lowerText.includes("dhonkhed") ||
          lowerText.includes("pophali") ||
          lowerText.includes("chawarda") ||
          lowerText.includes("tarodi") ||
          lowerText.includes("borgaon") ||
          lowerText.includes("pohi") ||
          lowerText.includes("gondapur") ||
          lowerText.includes("sawangi");

        // Check for pattern like "lpcd in X on date" where X could be a village
        const villageInPatternMatch = lowerText.match(
          /(?:lpcd|water|chlorine|pressure)\s+(?:in|for)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:on|at|from|for|dated?)/i
        );
        const hasVillageInPattern = villageInPatternMatch && villageInPatternMatch[1] &&
          !regions.some(r => villageInPatternMatch[1].toLowerCase().includes(r.toLowerCase()));

        const hasVillageKeywordPrimary = hasExplicitVillageKeyword || hasKnownVillage || hasVillageInPattern;

        const hasDatePatternPrimary =
          /(\d+)(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d+)\s+(\d{4})|(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})|(\d+)\s+(sept?|september)/i.test(
            lowerText,
          );

        // Handle village historical queries with HIGHEST PRIORITY
        if (
          hasHistoricalKeywordPrimary &&
          hasVillageKeywordPrimary &&
          hasDatePatternPrimary
        ) {
          console.log(
            "🎯 Village historical query detected with highest priority:",
            lowerText,
          );

          // Extract village name - improved patterns to work without requiring "village" keyword
          let villageName = "";

          // Known regions to exclude from village detection
          const knownRegions = ["nagpur", "pune", "nashik", "amravati", "konkan", "mumbai", "aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"];

          const villagePatterns = [
            /(?:in|for|from|at)\s+(\w+)\s+village/i,
            /(bidgaon|wadi|dhonkhed|pophali|chawarda|tarodi|borgaon|ambodh|ajni|betkuchi|dhanegaon|pohi|gondapur|sawangi|wanadongri)/i,
            /village\s+(\w+)/i,
            /(\w+)\s+village/i,
            // Pattern to extract village from "lpcd in X on date" format without "village" keyword
            // Captures village name after metric and before date keywords
            /(?:lpcd|water|chlorine|pressure)\s+(?:in|for)\s+([a-z][a-z0-9\s\-']*?)\s+(?:on|at|from|for|dated?)\s+\d/i,
          ];

          for (const pattern of villagePatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1]) {
              const candidate = match[1].trim();
              // Make sure it's not a region name (check against known regions list)
              const isRegion = knownRegions.some(r => candidate.toLowerCase() === r.toLowerCase() || candidate.toLowerCase().includes(r));
              if (!isRegion && candidate.length >= 2) {
                villageName = candidate;
                break;
              }
            }
          }

          // Extract date - Enhanced to handle more formats
          let dateStr = "";

          // Try different date patterns with specific handling for each
          const fullDateMatch = lowerText.match(
            /(\d+)(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
          );
          if (fullDateMatch) {
            // "7th September 2025" format
            dateStr = `${fullDateMatch[1]} ${fullDateMatch[3]} ${fullDateMatch[4]}`;
          } else {
            const shortDateMatch = lowerText.match(
              /(\d+)(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(\s+(\d{4}))?/i,
            );
            if (shortDateMatch) {
              // "7th Sep 2025", "7th Sept 2025", "7 sept", "7 sep" format
              const year = shortDateMatch[5] || "2025";
              dateStr = `${shortDateMatch[1]} ${shortDateMatch[3]} ${year}`;
            } else {
              const numericDateMatch = lowerText.match(
                /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/i,
              );
              if (numericDateMatch) {
                // "07/09/2025" format
                dateStr = `${numericDateMatch[1]}/${numericDateMatch[2]}/${numericDateMatch[3]}`;
              } else {
                const septMatch = lowerText.match(
                  /(\d+)(st|nd|rd|th)?\s+(sept?|september)\s*(\d{4})?/i,
                );
                if (septMatch) {
                  // "7th September" or "7 sep" format
                  const year = septMatch[4] || "2025";
                  dateStr = `${septMatch[1]} ${septMatch[3]} ${year}`;
                }
              }
            }
          }

          if (villageName && dateStr) {
            console.log(
              `🎯 Processing village historical query: village=${villageName}, date=${dateStr}`,
            );

            try {
              let apiEndpoint = "";
              let dataType = "";

              // Determine the type of historical query
              if (
                lowerText.includes("water consumption") ||
                (lowerText.includes("water") && !lowerText.includes("chlorine"))
              ) {
                apiEndpoint = `/api/category-data/history/water?village=${encodeURIComponent(
                  villageName,
                )}&date=${encodeURIComponent(dateStr)}`;
                dataType = "water";
              } else if (lowerText.includes("lpcd")) {
                apiEndpoint = `/api/category-data/history/water?village=${encodeURIComponent(
                  villageName,
                )}&date=${encodeURIComponent(dateStr)}`;
                dataType = "lpcd";
              } else if (
                lowerText.includes("chlorine") ||
                lowerText.includes("cl") ||
                lowerText.includes("rca")
              ) {
                apiEndpoint = `/api/category-data/history/chlorine?village=${encodeURIComponent(
                  villageName,
                )}&date=${encodeURIComponent(dateStr)}`;
                dataType = "chlorine";
              } else if (
                lowerText.includes("pressure") ||
                lowerText.includes("pt")
              ) {
                apiEndpoint = `/api/category-data/history/pressure?village=${encodeURIComponent(
                  villageName,
                )}&date=${encodeURIComponent(dateStr)}`;
                dataType = "pressure";
              }

              if (apiEndpoint) {
                console.log(`🎯 Making historical API call: ${apiEndpoint}`);
                const historicalResponse = await fetch(apiEndpoint);

                if (historicalResponse.ok) {
                  const historicalData = await historicalResponse.json();

                  let historicalResponseText = `📊 **Historical ${dataType.toUpperCase()} Data for ${villageName.charAt(0).toUpperCase() + villageName.slice(1)
                    } village on ${dateStr}:**\n\n`;

                  if (dataType === "water" || dataType === "lpcd") {
                    if (historicalData && historicalData.length > 0) {
                      // Find exact village matches
                      const exactMatches = historicalData.filter(
                        (record: any) =>
                          record.village_name?.toLowerCase().trim() ===
                          villageName.toLowerCase().trim(),
                      );

                      let record;
                      if (exactMatches.length > 0) {
                        // Prioritize records with non-null/non-blank values for the requested data type (0 is valid)
                        const fieldName =
                          dataType === "water" ? "water_value" : "lpcd_value";
                        const recordsWithValues = exactMatches.filter(
                          (r: any) =>
                            r[fieldName] !== null &&
                            r[fieldName] !== undefined &&
                            r[fieldName] !== "",
                        );
                        record =
                          recordsWithValues.length > 0
                            ? recordsWithValues[0]
                            : exactMatches[0];
                      } else {
                        // Fallback to first result if no exact match
                        record = historicalData[0];
                      }
                      if (dataType === "water") {
                        historicalResponseText += `💧 **Water Consumption:** ${record.water_value || "No data"
                          } LL\n`;
                      } else {
                        historicalResponseText += `📈 **LPCD Value:** ${record.lpcd_value || "No data"
                          } L/person/day\n`;
                        if (record.lpcd_value) {
                          const status =
                            record.lpcd_value >= 55
                              ? "✅ Above standard (≥55 L/day)"
                              : "⚠️ Below standard (<55 L/day)";
                          historicalResponseText += `📋 **Status:** ${status}\n`;
                        }
                      }
                      historicalResponseText += `👥 **Population:** ${record.population || "Not specified"
                        }\n`;
                      historicalResponseText += `🏗️ **Number of ESRs:** ${record.number_of_esr || "Not specified"
                        }\n`;
                      historicalResponseText += `📍 **Scheme:** ${record.scheme_name || "Not specified"
                        }\n`;
                      historicalResponseText += `🗺️ **Region:** ${record.region || "Not specified"
                        }`;
                    } else {
                      historicalResponseText += `❌ No ${dataType} data found for ${villageName} village on ${dateStr}.`;
                    }
                  } else if (
                    dataType === "chlorine" ||
                    dataType === "pressure"
                  ) {
                    if (historicalData && historicalData.length > 0) {
                      // Filter for exact village match first
                      const exactMatches = historicalData.filter(
                        (record: any) =>
                          record.village_name?.toLowerCase().trim() ===
                          villageName.toLowerCase().trim(),
                      );

                      let relevantData;
                      if (exactMatches.length > 0) {
                        // Prioritize records with non-null/non-blank values for the requested data type (0 is valid)
                        const fieldName =
                          dataType === "chlorine"
                            ? "chlorine_value"
                            : "pressure_value";
                        const recordsWithValues = exactMatches.filter(
                          (r: any) =>
                            r[fieldName] !== null &&
                            r[fieldName] !== undefined &&
                            r[fieldName] !== "",
                        );
                        relevantData =
                          recordsWithValues.length > 0
                            ? recordsWithValues
                            : exactMatches;
                      } else {
                        relevantData = historicalData;
                      }

                      historicalResponseText += `**Data from ${relevantData.length} ESR(s):**\n\n`;
                      relevantData.forEach((record: any, index: number) => {
                        historicalResponseText += `${index + 1}. **${record.esr_name || `ESR ${index + 1}`
                          }:**\n`;
                        if (dataType === "chlorine") {
                          const chlorineValue = record.chlorine_value || 0;
                          historicalResponseText += `   🧪 **Chlorine:** ${chlorineValue} mg/L`;
                          if (chlorineValue >= 0.2 && chlorineValue <= 0.5) {
                            historicalResponseText += ` ✅ Optimal range\n`;
                          } else if (chlorineValue < 0.2) {
                            historicalResponseText += ` ⚠️ Below optimal range\n`;
                          } else {
                            historicalResponseText += ` ⚠️ Above optimal range\n`;
                          }
                        } else {
                          const pressureValue = record.pressure_value || 0;
                          historicalResponseText += `   ⚡ **Pressure:** ${pressureValue} bar`;
                          if (pressureValue >= 0.2 && pressureValue <= 0.7) {
                            historicalResponseText += ` ✅ Optimal range\n`;
                          } else if (pressureValue < 0.2) {
                            historicalResponseText += ` ⚠️ Below optimal range\n`;
                          } else {
                            historicalResponseText += ` ⚠️ Above optimal range\n`;
                          }
                        }
                      });
                      historicalResponseText += `\n📍 **Scheme:** ${relevantData[0].scheme_name || "Not specified"
                        }`;
                      historicalResponseText += `\n🗺️ **Region:** ${relevantData[0].region || "Not specified"
                        }`;
                    } else {
                      historicalResponseText += `❌ No ${dataType} data found for ${villageName} village on ${dateStr}.`;
                    }
                  }

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: historicalResponseText,
                      autoSpeak: fromVoice,
                    },
                  ]);
                  setLoading(false);
                  return;
                } else {
                  const errorData = await historicalResponse.json();
                  console.log(
                    `❌ Historical ${dataType} data not found:`,
                    errorData.message,
                  );

                  const fallbackText = `❌ No ${dataType} data found for ${villageName} village on ${dateStr}. Please check if the village name and date are correct.`;
                  setChatMessages((prev) => [
                    ...prev,
                    { type: "bot", text: fallbackText, autoSpeak: fromVoice },
                  ]);
                  setLoading(false);
                  return;
                }
              }
            } catch (error) {
              console.error("❌ Error fetching historical data:", error);
              const errorText = `❌ Sorry, I encountered an error while fetching historical data for ${villageName} village. Please try again.`;
              setChatMessages((prev) => [
                ...prev,
                { type: "bot", text: errorText, autoSpeak: fromVoice },
              ]);
              setLoading(false);
              return;
            }
          }
        }

        // PRIORITY 1.5: Handle chart queries for villages
        // Check for explicit chart/graph keywords first (higher priority)
        const hasExplicitChartKeyword =
          lowerText.includes("chart") ||
          lowerText.includes("graph");

        // Check for time-based chart keywords
        const hasTimeBasedChartKeyword =
          lowerText.includes("7 day") ||
          lowerText.includes("7-day") ||
          lowerText.includes("weekly");

        // "analysis" only triggers chart if combined with explicit chart intent or time-based
        const hasChartKeyword =
          hasExplicitChartKeyword ||
          hasTimeBasedChartKeyword ||
          (lowerText.includes("analysis") && (hasExplicitChartKeyword || hasTimeBasedChartKeyword));

        const hasWaterConsumptionKeyword =
          lowerText.includes("water consumption") ||
          lowerText.includes("water analysis") ||
          lowerText.includes("consumption");

        const hasLPCDKeywordForChart =
          lowerText.includes("lpcd") ||
          lowerText.includes("liter per capita") ||
          lowerText.includes("per capita day");

        const hasChlorineKeywordForChart =
          lowerText.includes("chlorine") ||
          lowerText.includes("rca") ||
          lowerText.includes("residual chlorine");

        const hasPressureKeywordForChart =
          lowerText.includes("pressure") ||
          lowerText.includes("pt") ||
          lowerText.includes("pressure transmitter");

        // Enhanced village name extraction for chart queries
        // This function extracts village names from queries like "lpcd graph of sawangi meghe"
        const getVillageNameFromChartQuery = (queryText: string): string => {
          const lowerQuery = queryText.toLowerCase();

          // List of known regions to exclude from village matching
          const knownRegions = ["nagpur", "pune", "nashik", "amravati", "konkan", "mumbai", "aurangabad", "chhatrapati sambhajinagar", "sambhajinagar", "all", "region", "regions"];

          // List of keywords to remove from extraction
          const removeKeywords = ["lpcd", "chart", "graph", "water consumption", "consumption", "chlorine", "pressure", "analysis", "7 day", "7-day", "weekly", "rca", "pt", "transmitter", "liter per capita", "per capita day", "show", "me", "the", "display", "get"];

          // First check for known multi-word village names (expanded list)
          const knownMultiWordVillages = [
            "sawangi meghe", "sawangi mehe", "sawang meghe", "sawang mehe",
            "bidgaon tarodi", "hatedi & 5 villages", "t point",
            "sawangi t point", "borgaon meghe", "borgaon t", "gondapur t",
            "ambodh t point", "ajni t point", "dhanegaon t point"
          ];

          for (const village of knownMultiWordVillages) {
            if (lowerQuery.includes(village)) {
              console.log(`📊 Found known multi-word village: "${village}"`);
              return village;
            }
          }

          // Patterns to extract village names (ordered by specificity)
          const villagePatterns: Array<{ pattern: RegExp, name: string }> = [
            // Pattern 1: "in/for/from/at/of [village name] village" - captures multi-word village names
            { pattern: /(?:in|for|from|at|of)\s+([a-z][a-z\s]*?)\s+village(?:\s|$)/i, name: "prep_village" },
            // Pattern 2: "[village name] village" at end
            { pattern: /([a-z]+(?:\s+[a-z]+)*)\s+village(?:\s|$)/i, name: "name_village" },
            // Pattern 3: "village [village name]"
            { pattern: /village\s+([a-z]+(?:\s+[a-z]+)*)(?:\s|$)/i, name: "village_name" },
            // Pattern 4: Match patterns like "lpcd graph of sawangi meghe" - village name at end after "of"
            { pattern: /(?:chart|graph)\s+(?:of\s+)?([a-z]+(?:\s+[a-z]+)*)$/i, name: "chart_of_end" },
            // Pattern 5: Match patterns like "lpcd graph sawangi meghe" - village name at end after chart/graph keyword
            { pattern: /(?:lpcd|chlorine|pressure|water consumption|consumption)\s+(?:chart|graph)\s+([a-z]+(?:\s+[a-z]+)*)$/i, name: "metric_chart_end" },
            // Pattern 6: "in/for/from/at/of [village name]" without "village" - captures multi-word names after preposition
            { pattern: /(?:in|for|from|at|of)\s+([a-z]+(?:\s+[a-z]+)*)$/i, name: "prep_end" },
            // Pattern 7: Match village name after chart/graph keyword directly (no preposition)
            { pattern: /(?:chart|graph)\s+([a-z]+(?:\s+[a-z]+)*)$/i, name: "chart_direct_end" },
            // Pattern 8: Known single village names (hardcoded for reliability)
            { pattern: /(bidgaon|bidgao|wadi|dhonkhed|pophali|chawarda|tarodi|borgaon|ambodh|ajni|betkuchi|dhanegaon|sawangi|meghe|gondapur)/i, name: "known_villages" },
          ];

          for (const { pattern, name } of villagePatterns) {
            const match = lowerQuery.match(pattern);
            if (match && match[1]) {
              let candidate = match[1].trim();

              // Remove any keywords that might have been captured
              for (const keyword of removeKeywords) {
                candidate = candidate.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
              }

              // Clean up multiple spaces
              candidate = candidate.replace(/\s+/g, ' ').trim();

              // Skip if the candidate is a region name
              if (knownRegions.some(region => candidate.toLowerCase() === region.toLowerCase())) {
                continue;
              }

              // Skip if too short or contains only common words
              if (candidate.length > 1 && candidate !== "the" && candidate !== "all" && candidate !== "in") {
                console.log(`📊 Extracted village name using pattern "${name}": "${candidate}"`);
                return candidate;
              }
            }
          }

          return "";
        };

        // Extract village name first to determine if we have a village chart query
        const extractedVillageNameForChart = getVillageNameFromChartQuery(lowerText);

        const hasVillageKeywordChart =
          lowerText.includes("village") ||
          extractedVillageNameForChart.length > 0 ||
          lowerText.includes("bidgaon") ||
          lowerText.includes("bidgao") ||
          lowerText.includes("wadi") ||
          lowerText.includes("dhonkhed") ||
          lowerText.includes("pophali") ||
          lowerText.includes("chawarda") ||
          lowerText.includes("tarodi") ||
          lowerText.includes("borgaon") ||
          lowerText.includes("sawangi") ||
          lowerText.includes("meghe") ||
          lowerText.includes("gondapur");

        // Handle chart queries for villages
        if (
          hasChartKeyword &&
          hasVillageKeywordChart &&
          (hasWaterConsumptionKeyword ||
            hasLPCDKeywordForChart ||
            hasChlorineKeywordForChart ||
            hasPressureKeywordForChart)
        ) {
          console.log("📊 Village chart query detected:", lowerText);
          console.log("📊 Extracted village name from helper:", extractedVillageNameForChart);

          // Use the extracted village name from the enhanced helper function
          let villageName = extractedVillageNameForChart;

          // If still empty, try legacy patterns as fallback
          if (!villageName) {
            console.log("📊 No village found from helper, trying legacy patterns...");
            const villagePatterns = [
              /(?:in|for|from|at|of)\s+([a-z]+(?:\s+[a-z]+)*)\s+village/i,
              /(sawangi meghe|bidgaon|bidgao|wadi|dhonkhed|pophali|chawarda|tarodi|borgaon|ambodh|ajni|betkuchi|dhanegaon|sawangi|meghe|gondapur)/i,
              /village\s+([a-z]+(?:\s+[a-z]+)*)/i,
              /([a-z]+(?:\s+[a-z]+)*)\s+village/i,
            ];

            for (const pattern of villagePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                villageName = match[1].trim();
                console.log(`📊 Legacy pattern matched: "${villageName}"`);
                break;
              }
            }
          }

          if (villageName) {
            // Extract scheme_id if present in query (e.g., "in scheme 12345678")
            const schemeIdMatch = lowerText.match(/in\s+scheme\s+(\d{7,8})/i);
            const querySchemeId = schemeIdMatch ? schemeIdMatch[1] : null;

            console.log(
              `📊 Processing village chart query: village=${villageName}, schemeId=${querySchemeId || 'none'}`,
            );

            try {
              // Determine chart type and endpoint
              let chartWidget = "";
              let chartType = "";
              let apiEndpointForChart = "";

              if (hasWaterConsumptionKeyword) {
                chartWidget = "waterConsumptionChart";
                chartType = "7-day water consumption";
                apiEndpointForChart = `/api/category-data/village-data?village=${encodeURIComponent(
                  villageName,
                )}${querySchemeId ? `&scheme_id=${querySchemeId}` : ''}`;
              } else if (hasLPCDKeywordForChart) {
                chartWidget = "lpcdChart";
                chartType = "7-day LPCD analysis";
                apiEndpointForChart = `/api/category-data/village-data?village=${encodeURIComponent(
                  villageName,
                )}${querySchemeId ? `&scheme_id=${querySchemeId}` : ''}`;
              } else if (hasChlorineKeywordForChart) {
                chartWidget = "chlorineAnalysisChart";
                chartType = "7-day chlorine analysis";
                apiEndpointForChart = `/api/category-data/villages/${encodeURIComponent(
                  villageName,
                )}/chlorine-analysis`;
              } else if (hasPressureKeywordForChart) {
                chartWidget = "pressureAnalysisChart";
                chartType = "7-day pressure analysis";
                apiEndpointForChart = `/api/category-data/villages/${encodeURIComponent(
                  villageName,
                )}/pressure-analysis`;
              }

              // Get data for chart
              const chartResponse = await fetch(apiEndpointForChart);

              if (chartResponse.ok) {
                const responseData = await chartResponse.json();

                if (responseData && responseData.length > 0) {
                  // For water consumption and LPCD, check if multiple villages match
                  if (hasWaterConsumptionKeyword || hasLPCDKeywordForChart) {
                    // First check for exact matches (case-insensitive) - find ALL villages with matching name
                    const searchName = villageName.toLowerCase().trim();
                    const exactMatches = responseData.filter(
                      (v: any) => v.village_name?.toLowerCase().trim() === searchName
                    );

                    if (exactMatches.length === 1) {
                      // Single exact match found - use it directly
                      const exactMatch = exactMatches[0];
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: `📊 Here's the ${chartType} chart for ${exactMatch.village_name} village:`,
                          widget: chartWidget,
                          villageData: exactMatch,
                          autoSpeak: fromVoice,
                        },
                      ]);
                      setLoading(false);
                      return;
                    } else if (exactMatches.length > 1) {
                      // Multiple villages with SAME exact name but different schemes/regions - show disambiguation
                      const uniqueVillages = exactMatches.map((v: any) => ({
                        name: v.village_name,
                        scheme: v.scheme_name,
                        region: v.region,
                        block: v.block
                      }));

                      const villageList = uniqueVillages.map((v: any, i: number) =>
                        `${i + 1}. ${v.name} (${v.scheme}, ${v.block}, ${v.region})`
                      ).join('\n');

                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: `🔍 Found ${exactMatches.length} villages named "${villageName}". Please specify which one you want by including the scheme name:\n\n${villageList}\n\nFor example: "lpcd graph of ${uniqueVillages[0].name} in ${uniqueVillages[0].scheme}"`,
                          widget: "villageSelection",
                          villageOptions: exactMatches,
                          chartType: chartWidget,
                          autoSpeak: fromVoice,
                        },
                      ]);
                      setLoading(false);
                      return;
                    } else if (responseData.length > 1) {
                      // Multiple partial matches - show selection options
                      const uniqueVillages = responseData.map((v: any) => ({
                        name: v.village_name,
                        scheme: v.scheme_name,
                        region: v.region,
                        block: v.block
                      }));

                      const villageList = uniqueVillages.map((v: any, i: number) =>
                        `${i + 1}. ${v.name} (${v.scheme}, ${v.block}, ${v.region})`
                      ).join('\n');

                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: `🔍 Found ${responseData.length} villages matching "${villageName}". Please specify which village you want:\n\n${villageList}\n\nType the exact village name (e.g., "lpcd graph of ${uniqueVillages[0].name}")`,
                          widget: "villageSelection",
                          villageOptions: responseData,
                          chartType: chartWidget,
                          autoSpeak: fromVoice,
                        },
                      ]);
                      setLoading(false);
                      return;
                    } else {
                      // Single match - use it
                      const data = responseData[0];
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: `📊 Here's the ${chartType} chart for ${data.village_name} village:`,
                          widget: chartWidget,
                          villageData: data,
                          autoSpeak: fromVoice,
                        },
                      ]);
                      setLoading(false);
                      return;
                    }
                  } else {
                    // For chlorine and pressure, use the array of ESR data
                    const data = responseData;
                    const villageName_display = data[0]?.village_name;

                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `📊 Here's the ${chartType} chart for ${villageName_display} village:`,
                        widget: chartWidget,
                        villageData: data,
                        autoSpeak: fromVoice,
                      },
                    ]);
                    setLoading(false);
                    return;
                  }
                } else {
                  const fallbackText = `❌ No ${chartType.replace(
                    "7-day ",
                    "",
                  )} data found for ${villageName} village. Please check if the village name is correct.`;
                  setChatMessages((prev) => [
                    ...prev,
                    { type: "bot", text: fallbackText, autoSpeak: fromVoice },
                  ]);
                  setLoading(false);
                  return;
                }
              } else {
                console.error(
                  `${chartType} chart data fetch failed:`,
                  chartResponse.status,
                );
                const errorText = `❌ Sorry, I couldn't fetch ${chartType} data for ${villageName} village. Please try again.`;
                setChatMessages((prev) => [
                  ...prev,
                  { type: "bot", text: errorText, autoSpeak: fromVoice },
                ]);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error("❌ Error fetching chart data:", error);
              const errorText = `❌ Sorry, I encountered an error while creating the chart for ${villageName} village. Please try again.`;
              setChatMessages((prev) => [
                ...prev,
                { type: "bot", text: errorText, autoSpeak: fromVoice },
              ]);
              setLoading(false);
              return;
            }
          }
        }

        // PRIORITY 2: Try OpenAI interpretation for non-historical queries
        let processedText = lowerText;
        let openAIProcessed = false;

        // Check for exact keyword matches first (high priority)
        const hasExactKeywordMatch = Object.values(KEYWORD_TO_PATTERN_MAP).some(
          (pattern) => lowerText.includes(pattern.toLowerCase()),
        );

        // If no exact match, try OpenAI interpretation
        if (!hasExactKeywordMatch) {
          console.log(
            "No exact keyword match found, trying OpenAI interpretation...",
          );
          const interpretation = await interpretQueryWithOpenAI(text);

          if (interpretation.keyword && interpretation.confidence >= 0.7) {
            console.log(
              `OpenAI matched keyword: "${interpretation.keyword}" with confidence: ${interpretation.confidence}`,
            );
            // Map the OpenAI keyword to the pattern expected by existing handlers
            const mappedPattern =
              KEYWORD_TO_PATTERN_MAP[interpretation.keyword];
            if (mappedPattern) {
              processedText = mappedPattern.toLowerCase();
              openAIProcessed = true;
              console.log(
                `Routing to existing handler for: "${mappedPattern}"`,
              );
            }
          } else {
            console.log(
              `OpenAI interpretation failed or low confidence: ${interpretation.confidence}`,
            );
          }
        } else {
          console.log("Exact keyword match found, using direct routing");
        }

        // PRIORITY: EARLY DETECTION FOR PLAIN SCHEME IDs AND NAMES
        // This must run before any other pattern matching to ensure scheme analysis takes precedence
        const trimmedInput = text.trim();

        // Check if input is a plain scheme ID (7+ digits with optional spaces/dashes) or scheme name
        const isPlainSchemeId =
          /^\d[\d\s-]*\d{6,}$/.test(trimmedInput) ||
          /^\d{7,}$/.test(trimmedInput);
        const isPlainSchemeName =
          /^[\w\s-]+(wss|rwss|rrwss|water supply scheme)[\w\s-]*$/i.test(
            trimmedInput,
          ) && trimmedInput.length > 5;

        // Check if it's JUST a scheme identifier without other query keywords
        const hasOtherQueryKeywords =
          lowerText.includes("esr level") ||
          lowerText.includes("water consumption") ||
          lowerText.includes("villages with") ||
          lowerText.includes("how many") ||
          lowerText.includes("total") ||
          lowerText.includes("count") ||
          lowerText.includes("list") ||
          lowerText.includes("show");

        if ((isPlainSchemeId || isPlainSchemeName) && !hasOtherQueryKeywords) {
          console.log(
            `🎯 EARLY DETECTION: Plain scheme ID or name detected: "${trimmedInput}"`,
          );

          try {
            // Search for the scheme first
            const searchResponse = await fetch(
              `/api/scheme-analysis/search?query=${encodeURIComponent(
                trimmedInput,
              )}`,
            );
            const searchResults = await searchResponse.json();

            if (searchResults.length > 0) {
              // Get the best match (first result)
              const bestMatch = searchResults[0];
              console.log(`Found scheme match:`, bestMatch);

              // Fetch comprehensive analysis for this scheme
              const analysisResponse = await fetch(
                `/api/scheme-analysis/comprehensive/${encodeURIComponent(
                  bestMatch.scheme_id,
                )}`,
              );
              const analysisData = await analysisResponse.json();

              if (analysisData.error) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `Error: ${analysisData.error}`,
                    autoSpeak: fromVoice,
                  },
                ]);
              } else {
                // Build the comprehensive summary in the exact format requested
                const {
                  scheme_information,
                  village_water_supply_data,
                  sensor_data,
                  village_completion_data,
                } = analysisData;

                let summary = `📊 **Comprehensive Analysis for ${scheme_information.scheme_name}**\n\n`;

                summary += `🏗️ **Scheme Information:**\n`;
                summary += `• Region: ${scheme_information.region}\n`;
                summary += `• Circle: ${scheme_information.circle}\n`;
                summary += `• Division: ${scheme_information.division}\n`;
                summary += `• Block: ${scheme_information.block}\n`;
                summary += `• Agency: ${scheme_information.agency || "null"}\n`;
                summary += `• Completion Status: ${scheme_information.completion_status === "Fully Completed"
                  ? "✅ Fully Completed"
                  : "🔄 " + scheme_information.completion_status
                  }\n`;
                summary += `• Functional Status: ${scheme_information.scheme_functional_status || "Unknown"
                  }\n`;
                summary += `• MJP Commissioned: ${scheme_information.mjp_commissioned || "Unknown"
                  }\n`;
                summary += `• MJP Fully Completed: ${scheme_information.mjp_fully_completed || "Unknown"
                  }\n\n`;

                summary += `🏘️ **Village Infrastructure:**\n`;
                summary += `• Villages in Scheme: ${scheme_information.number_of_villages || 0
                  }\n`;
                summary += `• Villages Integrated: ${scheme_information.villages_integrated || 0
                  }\n`;
                summary += `• Functional Villages: ${scheme_information.functional_villages || 0
                  }\n`;
                summary += `• Fully Completed Villages: ${scheme_information.fully_completed_villages || 0
                  }\n`;
                summary += `• Partial Villages: ${scheme_information.partial_villages || 0
                  }\n`;
                summary += `• Non-functional Villages: ${scheme_information.non_functional_villages || 0
                  }\n\n`;

                summary += `🏗️ **ESR Infrastructure:**\n`;
                summary += `• Total ESRs: ${scheme_information.total_esr || 0
                  }\n`;
                summary += `• ESR Integrated: ${scheme_information.esr_integrated || 0
                  }\n`;
                summary += `• Fully Completed ESR: ${scheme_information.fully_completed_esr || 0
                  }\n`;
                summary += `• Balance ESR to Complete: ${scheme_information.balance_esr_to_complete || 0
                  }\n`;
                summary += `• Flow Meters: ${scheme_information.flow_meters_connected || 0
                  }\n`;
                summary += `• Chlorine Analyzers: ${scheme_information.chlorine_analyzers_connected || 0
                  }\n`;
                summary += `• Pressure Transmitters: ${scheme_information.pressure_transmitters_connected || 0
                  }\n\n`;

                summary += `💧 **Water Supply Analysis:**\n`;
                summary += `• Villages with Data: ${village_water_supply_data.total_villages_with_data || 0
                  }\n`;
                summary += `• Villages Receiving Water: **${village_water_supply_data.villages_receiving_water || 0
                  }**\n`;
                summary += `• Villages with No Water: **${village_water_supply_data.villages_with_no_water || 0
                  }**\n`;
                summary += `• Villages with Consistent Water: **${village_water_supply_data.villages_consistent_water_supply ||
                  0
                  }**\n`;
                summary += `• Villages with Consistent Zero Water: ${village_water_supply_data.villages_consistent_zero_water || 0
                  }\n`;
                summary += `• Villages Above 55 LPCD: **${village_water_supply_data.villages_above_55_lpcd || 0
                  }**\n`;
                summary += `• Villages Below 55 LPCD: **${village_water_supply_data.villages_below_55_lpcd || 0
                  }**\n`;
                summary += `• Villages Consistently Above 55 LPCD: ${village_water_supply_data.villages_consistently_above_55_lpcd ||
                  0
                  }\n`;
                summary += `• Villages Consistently Below 55 LPCD: ${village_water_supply_data.villages_consistently_below_55_lpcd ||
                  0
                  }\n`;
                summary += `• Total Population Covered: **${village_water_supply_data.total_population_covered?.toLocaleString() ||
                  0
                  }**\n`;
                summary += `• Average LPCD: **${village_water_supply_data.avg_lpcd_day7?.toFixed(2) || 0
                  }**\n\n`;

                summary += `🔬 **Sensor Performance Analysis:**\n`;
                summary += `**Chlorine Levels (Optimal: 0.2-0.5 mg/L):**\n`;
                summary += `• ESR with Optimal Chlorine: **${sensor_data.chlorine_sensors.optimal_range_0_2_to_0_5 || 0
                  }**\n`;
                summary += `• ESR Below Optimal: ${sensor_data.chlorine_sensors.below_range_less_than_0_2 || 0
                  }\n`;
                summary += `• ESR Above Optimal: ${sensor_data.chlorine_sensors.above_range_greater_than_0_5 || 0
                  }\n`;
                summary += `• ESR with Zero Readings: ${sensor_data.chlorine_sensors.zero_readings || 0
                  }\n`;
                summary += `• ESR Consistently Optimal: ${sensor_data.chlorine_sensors.consistent_optimal_range || 0
                  }\n`;
                summary += `• Average Chlorine Level: ${sensor_data.chlorine_sensors.avg_chlorine_day7?.toFixed(2) ||
                  0
                  } mg/L\n\n`;

                summary += `**Pressure Levels (Optimal: 0.2-0.7 bar):**\n`;
                summary += `• ESR with Optimal Pressure: **${sensor_data.pressure_sensors.optimal_range_0_2_to_0_7 || 0
                  }**\n`;
                summary += `• ESR Below Optimal: ${sensor_data.pressure_sensors.below_range_less_than_0_2 || 0
                  }\n`;
                summary += `• ESR Above Optimal: ${sensor_data.pressure_sensors.above_range_greater_than_0_7 || 0
                  }\n`;
                summary += `• ESR with Zero Readings: ${sensor_data.pressure_sensors.zero_readings || 0
                  }\n`;
                summary += `• ESR Consistently Optimal: ${sensor_data.pressure_sensors.consistent_optimal_range || 0
                  }\n`;
                summary += `• Average Pressure Level: ${sensor_data.pressure_sensors.avg_pressure_day7?.toFixed(2) ||
                  0
                  } bar\n\n`;

                summary += `📈 **Completion Summary:**\n`;
                summary += `• Total Villages in System: ${village_completion_data.total_villages_in_system || 0
                  }\n`;
                summary += `• Fully Completed Villages: ${village_completion_data.fully_completed_villages_count || 0
                  }\n`;
                summary += `• Partial Villages: ${village_completion_data.partial_villages_count || 0
                  }\n`;

                // Add the comprehensive summary message
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: summary,
                    autoSpeak: fromVoice,
                  },
                ]);

                // Then add the interactive buttons widget
                const schemeAnalysisMessage: ChatMessage = {
                  type: "bot",
                  text: "Click the buttons below to explore detailed data or export Excel reports:",
                  widget: "comprehensiveSchemeAnalysisOptions",
                  schemeAnalysis: analysisData,
                };
                setChatMessages((prev) => [...prev, schemeAnalysisMessage]);
              }

              setLoading(false);
              return;
            } else {
              // No exact match found, continue to normal flow
              console.log(
                `No scheme match found for: "${trimmedInput}", continuing to normal handlers`,
              );
            }
          } catch (error) {
            console.error("Error in early scheme detection:", error);
            // Continue to normal flow on error
          }
        }

        // NEW SPECIFIC QUERY PATTERNS - Handle scheme equipment and historical queries first

        // 0. MULTI-EQUIPMENT QUERIES - Check for multiple equipment types in one query
        const requestedEquipment = {
          esr:
            lowerText.includes("esr") &&
            !lowerText.includes("laser") &&
            !lowerText.includes("user"),
          flowMeter:
            lowerText.includes("flow meter") ||
            lowerText.includes("flowmeter") ||
            /\bfm\b/i.test(lowerText),
          chlorine:
            lowerText.includes("chlorine") ||
            lowerText.includes("rca") ||
            lowerText.includes("analyzer"),
          pressure:
            lowerText.includes("pressure") ||
            /\bpt\b/i.test(lowerText) ||
            lowerText.includes("transmitter"),
        };

        const equipmentCount =
          Object.values(requestedEquipment).filter(Boolean).length;
        const isMultiEquipmentQuery = equipmentCount >= 2;

        if (isMultiEquipmentQuery) {
          console.log("🔧 Multi-equipment query detected:", requestedEquipment);

          // Determine the scope (region, scheme, or village)
          const regions = [
            "amravati",
            "nagpur",
            "nashik",
            "pune",
            "konkan",
            "chhatrapati sambhajinagar",
            "aurangabad",
            "mumbai",
          ];
          const detectedRegion = regions.find((r) =>
            lowerText.includes(r.toLowerCase()),
          );

          // PRIORITY: Scheme detection takes precedence over village detection
          const hasSchemeMarker =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws");
          const hasNumericSchemeId = /\b\d{7,}\b/.test(lowerText);
          const hasVillage =
            lowerText.includes("village") || lowerText.includes("gaon");

          let identifier = "";
          let queryType = "";

          if (detectedRegion) {
            identifier =
              detectedRegion === "aurangabad"
                ? "chhatrapati sambhajinagar"
                : detectedRegion;
            queryType = "region";
          } else if (hasSchemeMarker || hasNumericSchemeId) {
            // SCHEME DETECTION - prioritize when WSS/RRWSS/RWS or numeric ID is present
            const numericMatch = lowerText.match(/\b(\d{7,})\b/);
            if (numericMatch) {
              identifier = numericMatch[1];
            } else {
              // Strip equipment-related keywords from text before extracting scheme name
              let cleanedText = lowerText
                .replace(/\b(flow\s*meter[s]?|flowmeter[s]?|fm)\b/gi, "")
                .replace(/\b(chlorine|analyzer[s]?|rca)\b/gi, "")
                .replace(/\b(pressure|transmitter[s]?|pt)\b/gi, "")
                .replace(/\b(esr[s]?)\b/gi, "")
                .replace(/\b(and|or)\b/gi, "")
                .replace(/\s+/g, " ") // Normalize spaces
                .trim();

              console.log(
                "🧹 Cleaned text for scheme extraction:",
                cleanedText,
              );

              // Extract scheme name from cleaned text
              const schemePatterns = [
                /([a-z0-9\s&-]+\s*(?:wss|rrwss|rws))/i,
                /(?:in|for|from|of)\s+([a-z0-9\s&-]+\s*(?:wss|rrwss|rws))/i,
              ];

              for (const pattern of schemePatterns) {
                const match = cleanedText.match(pattern);
                if (match) {
                  identifier = match[match.length - 1].trim();
                  break;
                }
              }
            }
            queryType = "scheme";
            console.log("🏗️ Scheme detected - identifier:", identifier);
          } else if (hasVillage) {
            // Extract village name
            const villagePatterns = [
              /(?:in|for|of)\s+(.+?)\s+village/i,
              /village\s+(.+)/i,
            ];
            for (const pattern of villagePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                identifier = match[1].trim();
                break;
              }
            }
            queryType = "village";
          }

          if (identifier && queryType) {
            try {
              const equipmentResponse = await fetch(
                `/api/category-data/equipment-combination/${encodeURIComponent(identifier)}?type=${queryType}`,
              );

              if (equipmentResponse.ok) {
                const data = await equipmentResponse.json();
                let responseText = `🔧 **Equipment Status for ${data.identifier}:**\n\n`;

                // Add only requested equipment types
                if (requestedEquipment.esr) {
                  responseText += `🏗️ **ESRs:** ${(data.equipment.esr_count || 0).toLocaleString()}\n`;
                }
                if (requestedEquipment.flowMeter) {
                  responseText += `📊 **Flow Meters:** ${(data.equipment.flow_meter_count || 0).toLocaleString()}\n`;
                }
                if (requestedEquipment.chlorine) {
                  responseText += `🧪 **Chlorine Analyzers (RCA):** ${(data.equipment.chlorine_count || 0).toLocaleString()}\n`;
                }
                if (requestedEquipment.pressure) {
                  responseText += `⚡ **Pressure Transmitters (PT):** ${(data.equipment.pressure_count || 0).toLocaleString()}\n`;
                }

                responseText += `\n📍 **Location:** ${data.location.region}`;
                if (data.location.circle)
                  responseText += ` > ${data.location.circle}`;
                if (data.location.division)
                  responseText += ` > ${data.location.division}`;

                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: responseText,
                    autoSpeak: fromVoice,
                  },
                ]);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error("Error fetching multi-equipment data:", error);
            }
          }
        }

        // 1. FULLY COMPLETED ESR QUERIES - Handle queries about fully completed ESRs
        const hasFullyCompletedESR =
          (lowerText.includes("fully") || lowerText.includes("full")) &&
          (lowerText.includes("complete") || lowerText.includes("completed")) &&
          lowerText.includes("esr");

        if (hasFullyCompletedESR) {
          console.log("🏗️ Fully completed ESR query detected");

          // Check if it's for all regions, a specific region, or a scheme
          const regions = [
            "amravati",
            "nagpur",
            "nashik",
            "pune",
            "konkan",
            "chhatrapati sambhajinagar",
            "aurangabad",
            "mumbai",
          ];
          const detectedRegion = regions.find((r) =>
            lowerText.includes(r.toLowerCase()),
          );
          const hasSchemeMarker =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws");
          const hasNumericSchemeId = /\b\d{7,}\b/.test(lowerText);

          try {
            if (hasSchemeMarker || hasNumericSchemeId) {
              // Query for a specific scheme
              const numericMatch = lowerText.match(/\b(\d{7,})\b/);
              let schemeIdentifier = "";

              if (numericMatch) {
                schemeIdentifier = numericMatch[1];
              } else {
                // More robust pattern to extract scheme name, removing query prefix words
                const schemePatterns = [
                  /(?:in|for|from|of)\s+([a-z0-9\s&-]+\s*(?:wss|rrwss|rws))/i,
                  /([a-z0-9\s&-]+\s*(?:wss|rrwss|rws))/i,
                ];

                for (const pattern of schemePatterns) {
                  const match = lowerText.match(pattern);
                  if (match) {
                    // Get the captured group (scheme name)
                    const captured = match[match.length - 1].trim();
                    // Remove common query prefixes and leading prepositions
                    schemeIdentifier = captured
                      .replace(
                        /^(fully completed esr |completed esr |esr |how many |show |list )/i,
                        "",
                      )
                      .replace(/^(in|for|from|of|at)\s+/i, "")
                      .trim();
                    break;
                  }
                }
              }

              if (schemeIdentifier) {
                const response = await fetch(
                  `/api/category-data/fully-completed-esr/${encodeURIComponent(schemeIdentifier)}?type=scheme`,
                );
                if (response.ok) {
                  const data = await response.json();
                  const responseText =
                    `🏗️ **Fully Completed ESRs in ${data.identifier}:**\n\n` +
                    `✅ **Fully Completed ESRs:** ${(data.fully_completed_esr || 0).toLocaleString()}\n` +
                    `📊 **Total ESRs:** ${(data.total_esr || 0).toLocaleString()}\n` +
                    `📈 **Completion Rate:** ${data.total_esr > 0 ? ((data.fully_completed_esr / data.total_esr) * 100).toFixed(1) : 0}%\n\n` +
                    `📍 **Location:** ${data.location.region}${data.location.circle ? ` > ${data.location.circle}` : ""}${data.location.division ? ` > ${data.location.division}` : ""}`;

                  await displayStreamingResponse(responseText, fromVoice, 50);
                  setLoading(false);
                  return;
                } else {
                  await displayStreamingResponse(
                    `❌ Sorry, I couldn't find ESR data for scheme "${schemeIdentifier}". Please check the scheme name and try again.`,
                    fromVoice,
                    30,
                  );
                  setLoading(false);
                  return;
                }
              }
            } else if (detectedRegion) {
              // Query for a specific region
              const regionName =
                detectedRegion === "aurangabad"
                  ? "chhatrapati sambhajinagar"
                  : detectedRegion;
              const response = await fetch(
                `/api/category-data/fully-completed-esr/${encodeURIComponent(regionName)}?type=region`,
              );
              if (response.ok) {
                const data = await response.json();
                const responseText =
                  `🏗️ **Fully Completed ESRs in ${data.identifier}:**\n\n` +
                  `✅ **Fully Completed ESRs:** ${(data.fully_completed_esr || 0).toLocaleString()}\n` +
                  `📊 **Total ESRs Integrated:** ${(data.total_esr || 0).toLocaleString()}\n` +
                  `📈 **Completion Rate:** ${data.total_esr > 0 ? ((data.fully_completed_esr / data.total_esr) * 100).toFixed(1) : 0}%`;

                await displayStreamingResponse(responseText, fromVoice, 50);
                setLoading(false);
                return;
              }
            } else {
              // Query for all regions
              const response = await fetch(
                `/api/category-data/fully-completed-esr/all?type=all`,
              );
              if (response.ok) {
                const data = await response.json();
                const responseText =
                  `🏗️ **Fully Completed ESRs Across All Regions:**\n\n` +
                  `✅ **Total Fully Completed ESRs:** ${(data.fully_completed_esr || 0).toLocaleString()}\n` +
                  `📊 **Total ESRs Integrated:** ${(data.total_esr || 0).toLocaleString()}\n` +
                  `📈 **Overall Completion Rate:** ${data.total_esr > 0 ? ((data.fully_completed_esr / data.total_esr) * 100).toFixed(1) : 0}%`;

                await displayStreamingResponse(responseText, fromVoice, 50);
                setLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error("Error fetching fully completed ESR data:", error);
          }
        }

        // 2. VILLAGE EQUIPMENT QUERIES - Check for equipment queries with village names
        const hasVillageKeyword = lowerText.includes("village");
        const hasVillageEquipmentKeyword =
          lowerText.includes("flowmeter") ||
          lowerText.includes("flow meter") ||
          lowerText.includes("fm") ||
          (lowerText.includes("chlorine") &&
            (lowerText.includes("connect") ||
              lowerText.includes("integrat") ||
              lowerText.includes("rca") ||
              lowerText.includes("analyzer"))) ||
          (lowerText.includes("pressure") &&
            (lowerText.includes("connect") ||
              lowerText.includes("integrat") ||
              lowerText.includes("transmitter") ||
              lowerText.includes("pt")));

        if (hasVillageKeyword && hasVillageEquipmentKeyword) {
          console.log("Village equipment query detected:", lowerText);

          // Extract village identifier from query
          let villageIdentifier = "";
          const villagePatterns = [
            /(?:in|for|from)\s+(.+?)\s+village/i,
            /village\s+(.+)/i,
            /(bidgaon|tarodi|wadi|dhonkhed|pophali|kamptee)/i,
          ];

          for (const pattern of villagePatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1]) {
              villageIdentifier = match[1].trim();
              break;
            }
          }

          if (villageIdentifier) {
            try {
              let apiUrl = "";
              let equipmentType = "";

              // Determine which equipment was requested
              if (
                lowerText.includes("flowmeter") ||
                lowerText.includes("flow meter") ||
                lowerText.includes("fm")
              ) {
                apiUrl = `/api/category-data/flow-meter-count/${encodeURIComponent(villageIdentifier)}?type=village`;
                equipmentType = "flow_meter";
              } else if (
                lowerText.includes("chlorine") &&
                (lowerText.includes("connect") ||
                  lowerText.includes("integrat") ||
                  lowerText.includes("rca") ||
                  lowerText.includes("analyzer"))
              ) {
                apiUrl = `/api/category-data/chlorine-count/${encodeURIComponent(villageIdentifier)}?type=village`;
                equipmentType = "chlorine";
              } else if (
                lowerText.includes("pressure") &&
                (lowerText.includes("connect") ||
                  lowerText.includes("integrat") ||
                  lowerText.includes("transmitter") ||
                  lowerText.includes("pt"))
              ) {
                apiUrl = `/api/category-data/pressure-count/${encodeURIComponent(villageIdentifier)}?type=village`;
                equipmentType = "pressure";
              }

              if (apiUrl) {
                const equipmentResponse = await fetch(apiUrl);

                if (equipmentResponse.ok) {
                  const data = await equipmentResponse.json();

                  let equipmentResponseText = "";

                  if (equipmentType === "flow_meter") {
                    equipmentResponseText = `🔧 **Equipment Status for ${data.identifier} Village:**\n\n`;
                    equipmentResponseText += `📊 **Flow Meters Connected:** ${data.flow_meter_count || 0}\n`;
                    equipmentResponseText += `📍 **Location:** ${data.location.region} > ${data.location.circle} > ${data.location.division}`;
                  } else if (equipmentType === "chlorine") {
                    equipmentResponseText = `🔧 **Equipment Status for ${data.identifier} Village:**\n\n`;
                    equipmentResponseText += `🧪 **Chlorine Analyzers Connected:** ${data.chlorine_count || 0}\n`;
                    equipmentResponseText += `📍 **Location:** ${data.location.region} > ${data.location.circle} > ${data.location.division}`;
                  } else if (equipmentType === "pressure") {
                    equipmentResponseText = `🔧 **Equipment Status for ${data.identifier} Village:**\n\n`;
                    equipmentResponseText += `⚡ **Pressure Transmitters Connected:** ${data.pressure_count || 0}\n`;
                    equipmentResponseText += `📍 **Location:** ${data.location.region} > ${data.location.circle} > ${data.location.division}`;
                  }

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: equipmentResponseText,
                      autoSpeak: fromVoice,
                    },
                  ]);
                  setLoading(false);
                  return;
                } else {
                  console.log(
                    "Village not found, falling back to general query handling",
                  );
                }
              }
            } catch (error) {
              console.error("Error fetching village equipment data:", error);
            }
          }
        }

        // Historical queries are now handled with highest priority above

        // PRIORITY 1: Handle specific keyword queries based on the specification

        // Note: Flow Meters section moved to section 3.5 below (after summary statistics)
        // for better organization with chlorine and pressure transmitters

        // 2. ESRs and Villages
        if (processedText.includes("esrs") || processedText.includes("esr")) {
          console.log("ESRs query detected");

          if (lowerText.includes("all regions")) {
            // SUM(total_esr_integrated) from region table
            try {
              const regionResponse = await fetch("/api/regions");
              const regions = await regionResponse.json();
              const totalESRs = regions.reduce(
                (sum: number, region: any) =>
                  sum + (region.total_esr_integrated || 0),
                0,
              );
              response = `📊 **Total ESRs across all regions**: **${totalESRs.toLocaleString()}**`;
            } catch (error) {
              response =
                "Sorry, I couldn't fetch the ESR data. Please try again.";
            }
          } else {
            // Check for specific region
            const detectedRegion = regions.find((region) =>
              lowerText.includes(region),
            );
            if (detectedRegion) {
              const regionName =
                detectedRegion === "aurangabad"
                  ? "Chhatrapati Sambhajinagar"
                  : detectedRegion
                    .split(" ")
                    .map(
                      (word) => word.charAt(0).toUpperCase() + word.slice(1),
                    )
                    .join(" ");

              try {
                const regionResponse = await fetch("/api/regions");
                const regionsData = await regionResponse.json();
                const targetRegion = regionsData.find(
                  (r: any) =>
                    r.region_name.toLowerCase() === regionName.toLowerCase(),
                );

                if (targetRegion) {
                  response = `📊 **ESRs in ${regionName}**: **${(
                    targetRegion.total_esr_integrated || 0
                  ).toLocaleString()}** integrated ESRs`;
                } else {
                  response = `Sorry, I couldn't find data for ${regionName} region.`;
                }
              } catch (error) {
                response =
                  "Sorry, I couldn't fetch the ESR data. Please try again.";
              }
            } else {
              response = "Please specify a region for ESR information.";
            }
          }

          await displayStreamingResponse(response, false, 50);
          setLoading(false);
          return;
        }

        // 3. Summary Statistics
        if (
          processedText.includes("summary statistics") ||
          processedText.includes("summary")
        ) {
          console.log("Summary statistics query detected");

          try {
            const regionResponse = await fetch("/api/regions");
            const regions = await regionResponse.json();

            let summaryText =
              "📊 **Maharashtra Water Infrastructure Summary Statistics:**\n\n";

            regions.forEach((region: any) => {
              summaryText += `**${region.region_name}:**\n`;
              summaryText += `• Total Schemes: ${(
                region.total_schemes_integrated || 0
              ).toLocaleString()}\n`;
              summaryText += `• Fully Completed Schemes: ${(
                region.fully_completed_schemes || 0
              ).toLocaleString()}\n`;
              summaryText += `• Total Villages: ${(
                region.total_villages_integrated || 0
              ).toLocaleString()}\n`;
              summaryText += `• Fully Completed Villages: ${(
                region.fully_completed_villages || 0
              ).toLocaleString()}\n`;
              summaryText += `• Total ESRs: ${(
                region.total_esr_integrated || 0
              ).toLocaleString()}\n`;
              summaryText += `• Flow Meters: ${(
                region.flow_meter_integrated || 0
              ).toLocaleString()}\n`;
              summaryText += `• RCA Integrated: ${(
                region.rca_integrated || 0
              ).toLocaleString()}\n`;
              summaryText += `• Pressure Transmitters: ${(
                region.pressure_transmitter_integrated || 0
              ).toLocaleString()}\n\n`;
            });

            response = summaryText;
          } catch (error) {
            response =
              "Sorry, I couldn't fetch the summary statistics. Please try again.";
          }

          await displayStreamingResponse(response, false, 50);
          setLoading(false);
          return;
        }

        // 3.5. Flow Meters - Support region, scheme, AND village queries
        if (
          processedText.includes("flow meters") ||
          processedText.includes("flow meter") ||
          processedText.includes("flowmeters") ||
          processedText.includes("flowmeter") ||
          (processedText.includes("fm") &&
            (lowerText.includes("count") ||
              lowerText.includes("total") ||
              lowerText.includes("how many")))
        ) {
          console.log("Flow meters query detected");

          try {
            // Check if it's a scheme query (WSS, RRWSS, or numeric scheme ID)
            const isSchemeQuery =
              lowerText.includes("wss") ||
              lowerText.includes("rrwss") ||
              lowerText.includes("rws") ||
              lowerText.includes("scheme") ||
              /\b\d{6,}\b/.test(lowerText);

            // Check if it's a village query
            const isVillageQuery =
              lowerText.includes("village") || lowerText.includes("gaon");

            // Region names for detection
            const regionNames = [
              "amravati",
              "nagpur",
              "nashik",
              "pune",
              "konkan",
              "chhatrapati sambhajinagar",
              "aurangabad",
              "mumbai",
            ];
            const detectedRegion = regionNames.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            if (isSchemeQuery) {
              // SCHEME QUERY - Extract scheme name or ID
              let schemeIdentifier = "";

              // First, clean the text by removing equipment-related keywords and prepositions
              let cleanedForScheme = lowerText
                .replace(
                  /\b(flow\s*meters?|flowmeters?|fm|connected?|integrated?)\b/gi,
                  "",
                )
                .replace(/\b(in|for|from|of|at)\s+/gi, " ") // Remove prepositions
                .replace(/\s+/g, " ")
                .trim();

              console.log(
                "Cleaned text for flow meter scheme extraction:",
                cleanedForScheme,
              );

              // Try to extract scheme ID (numeric) from original text
              const schemeIdMatch = lowerText.match(/\b(\d{6,})\b/);
              if (schemeIdMatch) {
                schemeIdentifier = schemeIdMatch[1];
              } else {
                // Try to extract scheme name (WSS/RRWSS pattern) from cleaned text
                const schemeNameMatch = cleanedForScheme.match(
                  /([a-z0-9\s&-]+)\s*(wss|rrwss|rws)/i,
                );
                if (schemeNameMatch) {
                  schemeIdentifier = schemeNameMatch[0].trim();
                  console.log(
                    "Extracted flow meter scheme identifier:",
                    schemeIdentifier,
                  );
                }
              }

              if (schemeIdentifier) {
                const equipmentResponse = await fetch(
                  `/api/category-data/flow-meter-count/${encodeURIComponent(schemeIdentifier)}?type=scheme`,
                );

                if (equipmentResponse.ok) {
                  const data = await equipmentResponse.json();
                  response = `📊 **Flow Meters in ${data.identifier}**: **${(data.flow_meter_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region} > ${data.location.scheme}`;
                } else if (equipmentResponse.status === 404) {
                  response = `Sorry, I couldn't find data for scheme "${schemeIdentifier}". Please check the scheme name/ID and try again.`;
                } else {
                  response =
                    "Sorry, I couldn't fetch the flow meter data for that scheme. Please try again.";
                }
              } else {
                response =
                  "Please specify a valid scheme name (e.g., 'Bidgaon Tarodi WSS') or scheme ID.";
              }
            } else if (isVillageQuery && !detectedRegion) {
              // VILLAGE QUERY - Extract village name
              let villageIdentifier = "";
              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
                /(bidgaon|tarodi|wadi|dhonkhed|pophali|chawarda|borgaon|gondapur|ambodh|ajni)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (
                  match &&
                  match[1] &&
                  !match[1].includes("flow") &&
                  !match[1].includes("meter")
                ) {
                  villageIdentifier = match[1].trim();
                  break;
                }
              }

              if (villageIdentifier) {
                const equipmentResponse = await fetch(
                  `/api/category-data/flow-meter-count/${encodeURIComponent(villageIdentifier)}?type=village`,
                );

                if (equipmentResponse.ok) {
                  const data = await equipmentResponse.json();
                  response = `📊 **Flow Meters in ${data.identifier} village**: **${(data.flow_meter_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region} > ${data.location.scheme} > ${data.location.village}`;
                } else if (equipmentResponse.status === 404) {
                  response = `Sorry, I couldn't find data for "${villageIdentifier}" village. Please check the village name and try again.`;
                } else {
                  response =
                    "Sorry, I couldn't fetch the flow meter data for that village. Please try again.";
                }
              } else {
                response =
                  "Please specify a valid village name (e.g., 'flow meters in Bidgaon village').";
              }
            } else if (detectedRegion) {
              // REGION QUERY
              const regionIdentifier =
                detectedRegion === "aurangabad"
                  ? "chhatrapati sambhajinagar"
                  : detectedRegion;
              const equipmentResponse = await fetch(
                `/api/category-data/flow-meter-count/${encodeURIComponent(regionIdentifier)}?type=region`,
              );

              if (equipmentResponse.ok) {
                const data = await equipmentResponse.json();
                response = `📊 **Flow Meters in ${data.identifier}**: **${(data.flow_meter_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region}`;
              } else if (equipmentResponse.status === 404) {
                response = `Sorry, I couldn't find data for "${regionIdentifier}" region. Please check the region name and try again.`;
              } else {
                response =
                  "Sorry, I couldn't fetch the flow meter data for that region. Please try again.";
              }
            } else {
              // TOTAL ACROSS ALL REGIONS
              const regionResponse = await fetch("/api/regions");
              if (!regionResponse.ok) {
                throw new Error("Failed to fetch region data");
              }
              const regions = await regionResponse.json();
              const totalFlowMeters = regions.reduce(
                (sum: number, region: any) =>
                  sum + (region.flow_meter_integrated || 0),
                0,
              );
              response = `📊 **Total Flow Meters across all regions**: **${totalFlowMeters.toLocaleString()}**`;
            }
          } catch (error) {
            console.error("Error fetching flow meter data:", error);
            response =
              "Sorry, I couldn't fetch the flow meter data. Please try again.";
          }

          await displayStreamingResponse(response, false, 50);
          setLoading(false);
          return;
        }

        // 4. Chlorine Analyzers - Support region, scheme, AND village queries
        if (
          processedText.includes("chlorine analyzers") ||
          processedText.includes("chlorine analyzer")
        ) {
          console.log("Chlorine analyzers query detected");

          try {
            // Check if it's a scheme query (WSS, RRWSS, or numeric scheme ID)
            const isSchemeQuery =
              lowerText.includes("wss") ||
              lowerText.includes("rrwss") ||
              lowerText.includes("rws") ||
              lowerText.includes("scheme") ||
              /\b\d{6,}\b/.test(lowerText);

            // Check if it's a village query
            const isVillageQuery =
              lowerText.includes("village") || lowerText.includes("gaon");

            // Region names for detection
            const regionNames = [
              "amravati",
              "nagpur",
              "nashik",
              "pune",
              "konkan",
              "chhatrapati sambhajinagar",
              "aurangabad",
              "mumbai",
            ];
            const detectedRegion = regionNames.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            if (isSchemeQuery) {
              // SCHEME QUERY - Extract scheme name or ID
              let schemeIdentifier = "";

              // First, clean the text by removing equipment-related keywords and prepositions
              let cleanedForScheme = lowerText
                .replace(
                  /\b(chlorine\s*(analyzers?|rca|connected?|integrated?))\b/gi,
                  "",
                )
                .replace(/\b(residual\s*chlorine\s*analyzers?)\b/gi, "")
                .replace(/\b(in|for|from|of|at)\s+/gi, " ") // Remove prepositions
                .replace(/\s+/g, " ")
                .trim();

              console.log(
                "Cleaned text for chlorine scheme extraction:",
                cleanedForScheme,
              );

              // Try to extract scheme ID (numeric) from original text
              const schemeIdMatch = lowerText.match(/\b(\d{6,})\b/);
              if (schemeIdMatch) {
                schemeIdentifier = schemeIdMatch[1];
              } else {
                // Try to extract scheme name (WSS/RRWSS pattern) from cleaned text
                const schemeNameMatch = cleanedForScheme.match(
                  /([a-z0-9\s&-]+)\s*(wss|rrwss|rws)/i,
                );
                if (schemeNameMatch) {
                  schemeIdentifier = schemeNameMatch[0].trim();
                  console.log(
                    "Extracted chlorine scheme identifier:",
                    schemeIdentifier,
                  );
                }
              }

              if (schemeIdentifier) {
                const equipmentResponse = await fetch(
                  `/api/category-data/chlorine-count/${encodeURIComponent(schemeIdentifier)}?type=scheme`,
                );

                if (equipmentResponse.ok) {
                  const data = await equipmentResponse.json();
                  response = `📊 **Chlorine Analyzers (RCA) in ${data.identifier}**: **${(data.chlorine_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region} > ${data.location.scheme}`;
                } else if (equipmentResponse.status === 404) {
                  response = `Sorry, I couldn't find data for scheme "${schemeIdentifier}". Please check the scheme name/ID and try again.`;
                } else {
                  response =
                    "Sorry, I couldn't fetch the chlorine analyzer data for that scheme. Please try again.";
                }
              } else {
                response =
                  "Please specify a valid scheme name (e.g., 'Bidgaon Tarodi WSS') or scheme ID.";
              }
            } else if (isVillageQuery && !detectedRegion) {
              // VILLAGE QUERY - Extract village name
              let villageIdentifier = "";
              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
                /(bidgaon|tarodi|wadi|dhonkhed|pophali|chawarda|borgaon|gondapur|ambodh|ajni)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (
                  match &&
                  match[1] &&
                  !match[1].includes("chlorine") &&
                  !match[1].includes("analyzer")
                ) {
                  villageIdentifier = match[1].trim();
                  break;
                }
              }

              if (villageIdentifier) {
                const equipmentResponse = await fetch(
                  `/api/category-data/chlorine-count/${encodeURIComponent(villageIdentifier)}?type=village`,
                );

                if (equipmentResponse.ok) {
                  const data = await equipmentResponse.json();
                  response = `📊 **Chlorine Analyzers (RCA) in ${data.identifier} village**: **${(data.chlorine_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region} > ${data.location.scheme} > ${data.location.village}`;
                } else if (equipmentResponse.status === 404) {
                  response = `Sorry, I couldn't find data for "${villageIdentifier}" village. Please check the village name and try again.`;
                } else {
                  response =
                    "Sorry, I couldn't fetch the chlorine analyzer data for that village. Please try again.";
                }
              } else {
                response =
                  "Please specify a valid village name (e.g., 'chlorine analyzers in Bidgaon village').";
              }
            } else if (detectedRegion) {
              // REGION QUERY
              const regionIdentifier =
                detectedRegion === "aurangabad"
                  ? "chhatrapati sambhajinagar"
                  : detectedRegion;
              const equipmentResponse = await fetch(
                `/api/category-data/chlorine-count/${encodeURIComponent(regionIdentifier)}?type=region`,
              );

              if (equipmentResponse.ok) {
                const data = await equipmentResponse.json();
                response = `📊 **Chlorine Analyzers (RCA) in ${data.identifier}**: **${(data.chlorine_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region}`;
              } else if (equipmentResponse.status === 404) {
                response = `Sorry, I couldn't find data for "${regionIdentifier}" region. Please check the region name and try again.`;
              } else {
                response =
                  "Sorry, I couldn't fetch the chlorine analyzer data for that region. Please try again.";
              }
            } else {
              // TOTAL ACROSS ALL REGIONS
              const regionResponse = await fetch("/api/regions");
              if (!regionResponse.ok) {
                throw new Error("Failed to fetch region data");
              }
              const regions = await regionResponse.json();
              const totalChlorineAnalyzers = regions.reduce(
                (sum: number, region: any) =>
                  sum + (region.rca_integrated || 0),
                0,
              );
              response = `📊 **Total Chlorine Analyzers (RCA) across all regions**: **${totalChlorineAnalyzers.toLocaleString()}**`;
            }
          } catch (error) {
            console.error("Error fetching chlorine analyzer data:", error);
            response =
              "Sorry, I couldn't fetch the chlorine analyzer data. Please try again.";
          }

          await displayStreamingResponse(response, false, 50);
          setLoading(false);
          return;
        }

        // 4.5. Pressure Transmitters - Support region, scheme, AND village queries
        if (
          processedText.includes("pressure transmitters") ||
          processedText.includes("pressure transmitter") ||
          (processedText.includes("pt") &&
            (lowerText.includes("count") ||
              lowerText.includes("total") ||
              lowerText.includes("how many")))
        ) {
          console.log("Pressure transmitters query detected");

          try {
            // Check if it's a scheme query (WSS, RRWSS, or numeric scheme ID)
            const isSchemeQuery =
              lowerText.includes("wss") ||
              lowerText.includes("rrwss") ||
              lowerText.includes("rws") ||
              lowerText.includes("scheme") ||
              /\b\d{6,}\b/.test(lowerText);

            // Check if it's a village query
            const isVillageQuery =
              lowerText.includes("village") || lowerText.includes("gaon");

            // Region names for detection
            const regionNames = [
              "amravati",
              "nagpur",
              "nashik",
              "pune",
              "konkan",
              "chhatrapati sambhajinagar",
              "aurangabad",
              "mumbai",
            ];
            const detectedRegion = regionNames.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            if (isSchemeQuery) {
              // SCHEME QUERY - Extract scheme name or ID
              let schemeIdentifier = "";

              // First, clean the text by removing equipment-related keywords and prepositions
              let cleanedForScheme = lowerText
                .replace(
                  /\b(pressure\s*(transmitters?|pt|connected?|integrated?))\b/gi,
                  "",
                )
                .replace(/\b(in|for|from|of|at)\s+/gi, " ") // Remove prepositions
                .replace(/\s+/g, " ")
                .trim();

              console.log(
                "Cleaned text for pressure scheme extraction:",
                cleanedForScheme,
              );

              // Try to extract scheme ID (numeric) from original text
              const schemeIdMatch = lowerText.match(/\b(\d{6,})\b/);
              if (schemeIdMatch) {
                schemeIdentifier = schemeIdMatch[1];
              } else {
                // Try to extract scheme name (WSS/RRWSS pattern) from cleaned text
                const schemeNameMatch = cleanedForScheme.match(
                  /([a-z0-9\s&-]+)\s*(wss|rrwss|rws)/i,
                );
                if (schemeNameMatch) {
                  schemeIdentifier = schemeNameMatch[0].trim();
                  console.log(
                    "Extracted pressure scheme identifier:",
                    schemeIdentifier,
                  );
                }
              }

              if (schemeIdentifier) {
                const equipmentResponse = await fetch(
                  `/api/category-data/pressure-count/${encodeURIComponent(schemeIdentifier)}?type=scheme`,
                );

                if (equipmentResponse.ok) {
                  const data = await equipmentResponse.json();
                  response = `📊 **Pressure Transmitters (PT) in ${data.identifier}**: **${(data.pressure_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region} > ${data.location.scheme}`;
                } else if (equipmentResponse.status === 404) {
                  response = `Sorry, I couldn't find data for scheme "${schemeIdentifier}". Please check the scheme name/ID and try again.`;
                } else {
                  response =
                    "Sorry, I couldn't fetch the pressure transmitter data for that scheme. Please try again.";
                }
              } else {
                response =
                  "Please specify a valid scheme name (e.g., 'Bidgaon Tarodi WSS') or scheme ID.";
              }
            } else if (isVillageQuery && !detectedRegion) {
              // VILLAGE QUERY - Extract village name
              let villageIdentifier = "";
              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
                /(bidgaon|tarodi|wadi|dhonkhed|pophali|chawarda|borgaon|gondapur|ambodh|ajni)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (
                  match &&
                  match[1] &&
                  !match[1].includes("pressure") &&
                  !match[1].includes("transmitter")
                ) {
                  villageIdentifier = match[1].trim();
                  break;
                }
              }

              if (villageIdentifier) {
                const equipmentResponse = await fetch(
                  `/api/category-data/pressure-count/${encodeURIComponent(villageIdentifier)}?type=village`,
                );

                if (equipmentResponse.ok) {
                  const data = await equipmentResponse.json();
                  response = `📊 **Pressure Transmitters (PT) in ${data.identifier} village**: **${(data.pressure_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region} > ${data.location.scheme} > ${data.location.village}`;
                } else if (equipmentResponse.status === 404) {
                  response = `Sorry, I couldn't find data for "${villageIdentifier}" village. Please check the village name and try again.`;
                } else {
                  response =
                    "Sorry, I couldn't fetch the pressure transmitter data for that village. Please try again.";
                }
              } else {
                response =
                  "Please specify a valid village name (e.g., 'pressure transmitters in Bidgaon village').";
              }
            } else if (detectedRegion) {
              // REGION QUERY
              const regionIdentifier =
                detectedRegion === "aurangabad"
                  ? "chhatrapati sambhajinagar"
                  : detectedRegion;
              const equipmentResponse = await fetch(
                `/api/category-data/pressure-count/${encodeURIComponent(regionIdentifier)}?type=region`,
              );

              if (equipmentResponse.ok) {
                const data = await equipmentResponse.json();
                response = `📊 **Pressure Transmitters (PT) in ${data.identifier}**: **${(data.pressure_count || 0).toLocaleString()}**\n\n📍 **Location:** ${data.location.region}`;
              } else if (equipmentResponse.status === 404) {
                response = `Sorry, I couldn't find data for "${regionIdentifier}" region. Please check the region name and try again.`;
              } else {
                response =
                  "Sorry, I couldn't fetch the pressure transmitter data for that region. Please try again.";
              }
            } else {
              // TOTAL ACROSS ALL REGIONS
              const regionResponse = await fetch("/api/regions");
              if (!regionResponse.ok) {
                throw new Error("Failed to fetch region data");
              }
              const regions = await regionResponse.json();
              const totalPressureTransmitters = regions.reduce(
                (sum: number, region: any) =>
                  sum + (region.pressure_transmitter_integrated || 0),
                0,
              );
              response = `📊 **Total Pressure Transmitters (PT) across all regions**: **${totalPressureTransmitters.toLocaleString()}**`;
            }
          } catch (error) {
            console.error("Error fetching pressure transmitter data:", error);
            response =
              "Sorry, I couldn't fetch the pressure transmitter data. Please try again.";
          }

          await displayStreamingResponse(response, false, 50);
          setLoading(false);
          return;
        }

        // 5. Area Coverage - SWSM IoT Project Information
        if (processedText.includes("area coverage")) {
          console.log("Area Coverage query detected - fetching region data");

          try {
            const regionResponse = await fetch("/api/regions");

            if (regionResponse.ok) {
              const regions = await regionResponse.json();

              // Add the specific response message
              const responseMessage =
                "The SWSM IoT Project, under the Jal Jeevan Mission, is being implemented across six regions of Maharashtra Jeevan Pradhikaran — Nagpur (27 Schemes), Chhatrapati Sambhajinagar (49 SChemes), Amravati(70 Schemes), Nashik (111 Schemes), Pune(63 Schemes), and Konkan (69 Schemes). The initiative leverages IoT-based solutions to monitor and manage rural water supply systems in real time. By ensuring transparency, operational efficiency, and reliable service delivery, the project supports the mission's vision of providing every rural household with adequate, safe, and sustainable drinking water on a long-term basis. There are total 389 Schemes across all regions";
              setChatMessages((prev) => [
                ...prev,
                { type: "bot", text: responseMessage },
              ]);

              // Add widget with region data and download button
              if (regions && regions.length > 0) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: "Here is the region-wise information:",
                    widget: "areaCoverage",
                    regions: regions,
                  },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: "No regional data found.",
                  },
                ]);
              }

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching area coverage data:", error);
          }

          // Fallback to simple message
          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the area coverage data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // 6. Fully Completed Schemes - Use reliable API endpoint
        if (processedText.includes("fully completed schemes")) {
          console.log(
            "Fully completed schemes query detected - using direct API",
          );

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let apiUrl = "/api/schemes?status=Fully Completed";
          let scopeText = " across all regions";
          let selectedRegion = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `&region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const schemes = await response.json();

              // Add message with count
              const responseMessage = `I found ${schemes.length} fully completed schemes${scopeText}.`;
              setChatMessages((prev) => [
                ...prev,
                { type: "bot", text: responseMessage },
              ]);

              // Add widget with schemes and download button
              if (schemes && schemes.length > 0) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `Here are the fully completed schemes${scopeText}:`,
                    widget: "fullyCompletedSchemes",
                    schemes: schemes,
                    selectedRegion: selectedRegion,
                  },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `No fully completed schemes found${scopeText}.`,
                  },
                ]);
              }

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching fully completed schemes:", error);
          }

          // Fallback to simple message
          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the fully completed schemes. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // ENHANCED CHATBOT BEHAVIORS - New specific query handlers with OpenAI integration
        const interpretResult = await interpretQueryWithOpenAI(text);

        // PRIORITY 1: Smart Report / PDF Report queries (must be checked BEFORE scheme details)
        // This ensures "detailed scheme report" generates PDF, not comprehensive analysis
        if (
          interpretResult.keyword === "smart report" ||
          interpretResult.keyword === "smart reports" ||
          interpretResult.keyword === "pdf report" ||
          interpretResult.keyword === "pdf reports" ||
          interpretResult.keyword === "generate report" ||
          interpretResult.keyword === "generate reports" ||
          interpretResult.keyword === "professional report" ||
          interpretResult.keyword === "professional reports" ||
          interpretResult.keyword === "comprehensive report" ||
          interpretResult.keyword === "comprehensive reports" ||
          interpretResult.keyword === "scheme report" ||
          interpretResult.keyword === "scheme reports" ||
          interpretResult.keyword === "detailed report" ||
          interpretResult.keyword === "detailed reports" ||
          interpretResult.keyword === "detailed scheme report" ||
          interpretResult.keyword === "detailed scheme reports" ||
          interpretResult.keyword === "performance report" ||
          interpretResult.keyword === "performance reports"
        ) {
          console.log("Smart report query detected");

          // Extract scheme identifier from query (scheme name or scheme ID)
          let schemeIdentifier = "";

          // STEP 1: Check for numeric scheme ID first (most specific pattern)
          // Match patterns like: 20003791, 7940695, etc.
          const numericIdMatch = text.match(/\b(\d{7,8})\b/);
          if (numericIdMatch) {
            schemeIdentifier = numericIdMatch[1];
            console.log("Extracted numeric scheme ID:", schemeIdentifier);
          }

          // STEP 2: If no numeric ID found, try to extract scheme name
          if (!schemeIdentifier) {
            // Remove the report keywords from the beginning to isolate the scheme name
            let cleanedText = text
              .replace(
                /^.*?\b(smart|pdf|professional|comprehensive|detailed|performance)\s+(report|reports)\s+(for|of|on)\s+/i,
                "",
              )
              .replace(
                /^.*?\b(generate|create|download)\s+(report|reports)\s+(for|of|on)\s+/i,
                "",
              )
              .replace(/^.*?\b(report|reports)\s+(for|of|on)\s+/i, "");

            // If we still have the original text, try different patterns
            if (cleanedText === text) {
              // Pattern 1: "for <scheme_name>"
              const forMatch = text.match(
                /\b(?:for|of|on)\s+(?:scheme\s+)?(.+?)(?:\s*$|[.?!])/i,
              );
              if (forMatch && forMatch[1]) {
                cleanedText = forMatch[1];
              } else {
                // Pattern 2: "<scheme_name> scheme"
                const schemeMatch = text.match(
                  /(.+?)\s+(?:scheme|wss|rrwss|vrrwss)/i,
                );
                if (schemeMatch && schemeMatch[1]) {
                  cleanedText = schemeMatch[1];
                }
              }
            }

            // Clean up only report-related keywords at the start/end, preserve everything else
            schemeIdentifier = cleanedText
              .replace(
                /^(smart|pdf|professional|comprehensive|detailed|performance|report|reports|generate|create|download)\s+/gi,
                "",
              )
              .replace(
                /\s+(smart|pdf|professional|comprehensive|detailed|performance|report|reports)$/gi,
                "",
              )
              .trim();

            console.log("Extracted scheme name:", schemeIdentifier);
          }

          if (!schemeIdentifier) {
            await addStreamedBotMessage(
              {
                text: "Please specify which scheme you'd like a smart report for. For example:\n• 'smart report for Bidgaon Tarodi wss scheme'\n• 'pdf report of scheme 20027951'\n• 'generate report for [scheme name]'",
                autoSpeak: fromVoice,
              },
              40,
            );
            setLoading(false);
            return;
          }

          await addStreamedBotMessage(
            {
              text: `🔍 Generating professional smart report for: ${schemeIdentifier}...`,
              autoSpeak: fromVoice,
            },
            40,
          );

          try {
            // Fetch comprehensive scheme data from smart-reports endpoint
            const response = await fetch(
              `/api/smart-reports/scheme/${encodeURIComponent(
                schemeIdentifier,
              )}`,
            );

            if (!response.ok) {
              await addStreamedBotMessage(
                {
                  text: `❌ Could not find scheme: ${schemeIdentifier}. Please check the scheme name or ID and try again.`,
                  autoSpeak: fromVoice,
                },
                40,
              );
              setLoading(false);
              return;
            }

            const schemeData = await response.json();

            // Generate PDF using the professional PDF generator
            await addStreamedBotMessage(
              {
                text: `📄 Preparing your professional report for ${schemeData.schemeInfo?.scheme_name || schemeIdentifier}...`,
                autoSpeak: fromVoice,
              },
              40,
            );

            await generateProfessionalSchemePDF(schemeData);

            await addStreamedBotMessage(
              {
                text: `✅ Smart report generated successfully! Your professional PDF report for **${schemeData.schemeInfo?.scheme_name || schemeIdentifier}** has been downloaded.`,
                autoSpeak: fromVoice,
              },
              40,
            );
          } catch (error) {
            console.error("Error generating smart report:", error);
            await addStreamedBotMessage(
              {
                text: `❌ Sorry, I encountered an error while generating the smart report. Please try again or contact support if the issue persists.`,
                autoSpeak: fromVoice,
              },
              40,
            );
          }

          setLoading(false);
          return;
        }

        // PRIORITY 2: Enhanced scheme details queries → show CombinedSchemesWidget
        if (
          interpretResult.keyword === "scheme details" ||
          interpretResult.keyword === "scheme information" ||
          interpretResult.keyword === "schemes details" ||
          interpretResult.keyword === "schemes information" ||
          interpretResult.keyword === "scheme analysis" ||
          interpretResult.keyword === "schemes analysis" ||
          interpretResult.keyword === "schemes" ||
          interpretResult.keyword === "schemes list" ||
          interpretResult.keyword === "scheme status" ||
          interpretResult.keyword === "scheme overview" ||
          interpretResult.keyword === "schemes overview" ||
          interpretResult.keyword === "schemes data" ||
          interpretResult.keyword === "schemes integrated"
        ) {
          // CRITICAL CHECK: If a specific scheme name or ID is mentioned, 
          // treat it as COMPREHENSIVE_SCHEME_ANALYSIS, NOT as generic scheme details

          // Check for numeric scheme ID (7-8 digits)
          const hasSchemeId = /\b(\d{7,8})\b/.test(lowerText);

          // Check for scheme name patterns (WSS, RRWSS, VRRWSS, village names followed by wss/scheme)
          const schemeNamePatterns = [
            /\b[a-z]+\s+(tarodi|wadi|gondapur|dhonkhed|pophali|bidgaon|chawarda)\s+(wss|rrwss|vrrwss|scheme)/i,
            /\b(bidgaon|tarodi|wadi|gondapur|dhonkhed|pophali|chawarda|hatedi|khambora)\s+(tarodi|wss|rrwss|vrrwss)/i,
            /\b[a-z]+\s+(&|and)\s+\d+\s+(villages?|vrrwss|rrwss|wss)/i,
          ];
          const hasSchemeNamePattern = schemeNamePatterns.some(pattern => pattern.test(lowerText));

          // If scheme identifier present, skip CombinedSchemesWidget and let it fall through to enhanced interpretation
          if (hasSchemeId || hasSchemeNamePattern) {
            console.log("🔍 Scheme identifier detected with 'details' keyword - skipping CombinedSchemesWidget, routing to COMPREHENSIVE_SCHEME_ANALYSIS");
            // Fall through to let handleEnhancedInterpretation process this
          } else {
            console.log(
              "Enhanced scheme details query detected - showing CombinedSchemesWidget",
            );

            // Extract region from query if mentioned
            const detectedRegion = regions.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            let apiUrl = "/api/category-data/combined-schemes";
            let scopeText = " across all regions";
            let selectedRegion = "all";

            if (detectedRegion) {
              const regionName =
                detectedRegion === "aurangabad"
                  ? "Chhatrapati Sambhajinagar"
                  : detectedRegion
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");

              apiUrl += `?region=${encodeURIComponent(regionName)}`;
              scopeText = ` in ${regionName} region`;
              selectedRegion = regionName;
            }

            try {
              const response = await fetch(apiUrl);

              if (response.ok) {
                const schemes = await response.json();

                // Add message with count
                const responseMessage = `Here's the comprehensive scheme analysis${scopeText} - found ${schemes.length} schemes.`;
                setChatMessages((prev) => [
                  ...prev,
                  { type: "bot", text: responseMessage },
                ]);

                // Show CombinedSchemesWidget
                if (schemes && schemes.length > 0) {
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `Here is the detailed schemes analysis${scopeText}:`,
                      widget: "combinedSchemes",
                      schemes: schemes,
                      selectedRegion: selectedRegion,
                    },
                  ]);
                } else {
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `No schemes found${scopeText}.`,
                    },
                  ]);
                }

                setLoading(false);
                return;
              }
            } catch (error) {
              console.error("Error fetching scheme details:", error);
            }

            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "Sorry, I couldn't fetch the scheme details. Please try again.",
              },
            ]);
            setLoading(false);
            return;
          }
        }

        // 3. ESR in scheme queries
        if (
          interpretResult.keyword === "esr in scheme" ||
          interpretResult.keyword === "esrs in scheme" ||
          interpretResult.keyword === "elevated service reservoir in scheme" ||
          interpretResult.keyword === "esr count in scheme" ||
          interpretResult.keyword === "total esr in scheme" ||
          interpretResult.keyword === "how many esr in scheme"
        ) {
          console.log("ESR in scheme query detected");

          // Extract scheme identifier from query
          let schemeIdentifier = "";
          const schemePatterns = [
            /(?:in|for)\s+(.+?)\s+(?:scheme|wss)/i,
            /scheme\s+(.+)/i,
            /(.+?)\s+(?:scheme|wss)/i,
          ];

          for (const pattern of schemePatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1] && !match[1].includes("esr")) {
              schemeIdentifier = match[1].trim();
              break;
            }
          }

          if (schemeIdentifier) {
            try {
              const response = await fetch(
                `/api/category-data/schemes/${encodeURIComponent(
                  schemeIdentifier,
                )}/esr-summary`,
              );

              if (response.ok) {
                const data = await response.json();
                const esrResponse =
                  `📊 **ESR Summary for ${data.scheme_name}:**\n\n` +
                  `🏗️ **Total ESRs:** ${data.total_number_of_esr || "Not specified"
                  }\n` +
                  `✅ **Integrated ESRs:** ${data.total_esr_integrated || "Not specified"
                  }\n` +
                  `🚀 **Fully Completed ESRs:** ${data.no_fully_completed_esr || "Not specified"
                  }\n` +
                  `⚠️ **Remaining to Complete:** ${data.balance_to_complete_esr || "Not specified"
                  }\n` +
                  `📍 **Region:** ${data.region || "Not specified"}`;

                setChatMessages((prev) => [
                  ...prev,
                  { type: "bot", text: esrResponse },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `No ESR data found for scheme: ${schemeIdentifier}`,
                  },
                ]);
              }
            } catch (error) {
              console.error("Error fetching scheme ESR data:", error);
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: "Sorry, I couldn't fetch the ESR data for that scheme.",
                },
              ]);
            }
          } else {
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "Please specify which scheme you'd like ESR information for (e.g., 'ESR in Bidgaon Tarodi wss scheme')",
              },
            ]);
          }

          setLoading(false);
          return;
        }

        // 3. ESR in village queries
        if (
          interpretResult.keyword === "esr in village" ||
          interpretResult.keyword === "esrs in village" ||
          interpretResult.keyword === "elevated service reservoir in village" ||
          interpretResult.keyword === "esr count in village" ||
          interpretResult.keyword === "total esr in village" ||
          interpretResult.keyword === "how many esr in village"
        ) {
          console.log("ESR in village query detected");

          // Extract village identifier from query
          let villageIdentifier = "";
          const villagePatterns = [
            /(?:in|for)\s+(.+?)\s+village/i,
            /village\s+(.+)/i,
            /(bidgaon|tarodi|wadi|dhonkhed|pophali)/i,
          ];

          for (const pattern of villagePatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1] && !match[1].includes("esr")) {
              villageIdentifier = match[1].trim();
              break;
            }
          }

          if (villageIdentifier) {
            try {
              const response = await fetch(
                `/api/category-data/villages/${encodeURIComponent(
                  villageIdentifier,
                )}/esr-summary`,
              );

              if (response.ok) {
                const data = await response.json();
                const esrResponse =
                  `📊 **ESR Summary for ${data.village_name} Village:**\n\n` +
                  `🏗️ **Total ESRs:** ${data.number_of_esr || "Not specified"
                  }\n` +
                  `✅ **Connected ESRs:** ${data.connected_esr || "Not specified"
                  }\n` +
                  `❌ **Not Connected ESRs:** ${data.not_connected_esr || "Not specified"
                  }\n` +
                  `📊 **Village Status:** ${data.village_functional_status || "Not specified"
                  }\n` +
                  `📍 **Scheme:** ${data.scheme_name || "Not specified"}\n` +
                  `🗺️ **Region:** ${data.region || "Not specified"}`;

                setChatMessages((prev) => [
                  ...prev,
                  { type: "bot", text: esrResponse },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `No ESR data found for village: ${villageIdentifier}`,
                  },
                ]);
              }
            } catch (error) {
              console.error("Error fetching village ESR data:", error);
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: "Sorry, I couldn't fetch the ESR data for that village.",
                },
              ]);
            }
          } else {
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "Please specify which village you'd like ESR information for (e.g., 'ESR in Bidgaon village')",
              },
            ]);
          }

          setLoading(false);
          return;
        }

        // 4. Villages in scheme queries
        if (
          interpretResult.keyword === "villages in scheme" ||
          interpretResult.keyword === "villages in the scheme" ||
          interpretResult.keyword === "how many villages in scheme" ||
          interpretResult.keyword === "total villages in scheme" ||
          interpretResult.keyword === "village count in scheme" ||
          interpretResult.keyword === "number of villages in scheme"
        ) {
          console.log("Villages in scheme query detected");

          // Extract scheme identifier from query
          let schemeIdentifier = "";
          const schemePatterns = [
            /(?:in|for)\s+(.+?)\s+(?:scheme|wss)/i,
            /scheme\s+(.+)/i,
            /(.+?)\s+(?:scheme|wss)/i,
          ];

          for (const pattern of schemePatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1] && !match[1].includes("village")) {
              schemeIdentifier = match[1].trim();
              break;
            }
          }

          if (schemeIdentifier) {
            try {
              const response = await fetch(
                `/api/category-data/schemes/${encodeURIComponent(
                  schemeIdentifier,
                )}/villages-summary`,
              );

              if (response.ok) {
                const data = await response.json();
                const villagesResponse =
                  `📊 **Villages Summary for ${data.scheme_name}:**\n\n` +
                  `🏘️ **Total Villages:** ${data.number_of_village || "Not specified"
                  }\n` +
                  `✅ **Integrated Villages:** ${data.total_villages_integrated || "Not specified"
                  }\n` +
                  `🟢 **Functional Villages:** ${data.no_of_functional_village || "Not specified"
                  }\n` +
                  `🟡 **Partial Villages:** ${data.no_of_partial_village || "Not specified"
                  }\n` +
                  `🔴 **Non-Functional Villages:** ${data.no_of_non_functional_village || "Not specified"
                  }\n` +
                  `🚀 **Fully Completed Villages:** ${data.fully_completed_villages || "Not specified"
                  }\n` +
                  `📍 **Region:** ${data.region || "Not specified"}`;

                setChatMessages((prev) => [
                  ...prev,
                  { type: "bot", text: villagesResponse },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `No villages data found for scheme: ${schemeIdentifier}`,
                  },
                ]);
              }
            } catch (error) {
              console.error("Error fetching scheme villages data:", error);
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: "Sorry, I couldn't fetch the villages data for that scheme.",
                },
              ]);
            }
          } else {
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "Please specify which scheme you'd like village information for (e.g., 'villages in Bidgaon Tarodi wss scheme')",
              },
            ]);
          }

          setLoading(false);
          return;
        }

        // 5. Water consumption in village queries
        // Also check for direct "water in X" pattern where X is not a region
        const isDirectWaterVillageQuery =
          lowerText.match(/^(water consumption|water)\s+(in|for)\s+[a-z]/i) &&
          !regions.some(r => lowerText.includes(r.toLowerCase())) &&
          !lowerText.includes("scheme") && !lowerText.includes("wss");

        if (
          interpretResult.keyword === "water consumption in village" ||
          interpretResult.keyword === "water in village" ||
          interpretResult.keyword === "water value in village" ||
          interpretResult.keyword === "village water consumption" ||
          interpretResult.keyword === "current water in village" ||
          interpretResult.keyword === "latest water in village" ||
          isDirectWaterVillageQuery
        ) {
          console.log("Water consumption in village query detected, isDirectWaterVillageQuery:", isDirectWaterVillageQuery);

          // Check if this is actually a scheme query (not a village query)
          const isSchemeQuery =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws") ||
            lowerText.includes("scheme") ||
            /\b\d{6,}\b/.test(lowerText); // Scheme ID pattern

          if (isSchemeQuery) {
            console.log("Detected scheme query, skipping village handler");
            // Fall through to scheme handlers below
          } else {
            // Check if this is a region query first (e.g., "water consumption in nagpur")
            const detectedRegion = regions.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            if (!detectedRegion) {
              // Not a region query - handle as village query
              let villageIdentifier = "";

              // Known regions to exclude from village detection
              const knownRegions = ["nagpur", "pune", "nashik", "amravati", "konkan", "mumbai", "aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"];

              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
                /(bidgaon|tarodi|wadi|dhonkhed|pophali|pohi|gondapur|sawangi|wanadongri|borgaon|ambodh|ajni|betkuchi|dhanegaon)/i,
                // Pattern to extract village from "water consumption in X" without "village" keyword
                /(?:water|water consumption)\s+(?:in|for)\s+([a-z][a-z0-9\s\-']*?)(?:\s+(?:region|district|block|taluka|on|at|from|for|today|yesterday|data|value|status)|$)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (match && match[1] && !match[1].includes("water") && !match[1].includes("consumption")) {
                  const candidate = match[1].trim();
                  // Make sure it's not a region name (check against known regions list)
                  const isRegion = knownRegions.some(r => candidate.toLowerCase() === r.toLowerCase() || candidate.toLowerCase().includes(r));
                  if (!isRegion && candidate.length >= 2) {
                    villageIdentifier = candidate;
                    break;
                  }
                }
              }

              if (villageIdentifier) {
                try {
                  const response = await fetch(
                    `/api/category-data/villages/${encodeURIComponent(
                      villageIdentifier,
                    )}/water-consumption`,
                  );

                  if (response.ok) {
                    const data = await response.json();
                    const waterResponse =
                      `💧 **Water Consumption for ${data.village_name} Village:**\n\n` +
                      `💧 **Latest Water Value:** ${data.water_value_day7 || "No data"
                      } LL\n` +
                      `📅 **Date:** ${data.water_date_day7 || "Not specified"}\n` +
                      `👥 **Population:** ${data.population || "Not specified"}\n` +
                      `🏗️ **Number of ESRs:** ${data.number_of_esr || "Not specified"
                      }\n` +
                      `📍 **Scheme:** ${data.scheme_name || "Not specified"}\n` +
                      `🗺️ **Region:** ${data.region || "Not specified"}`;

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: waterResponse },
                    ]);
                  } else {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `No water consumption data found for village: ${villageIdentifier}`,
                      },
                    ]);
                  }
                } catch (error) {
                  console.error(
                    "Error fetching village water consumption:",
                    error,
                  );
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "Sorry, I couldn't fetch the water consumption data for that village.",
                    },
                  ]);
                }
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: "Please specify which village you'd like water consumption information for (e.g., 'water consumption in Bidgaon village')",
                  },
                ]);
              }

              setLoading(false);
              return;
            }
            // If detectedRegion is true, fall through to combined water analysis handlers below
          }
        }

        // 6. LPCD in village queries
        // Also check for direct "lpcd in X" pattern where X is not a region
        const isDirectLpcdVillageQuery =
          lowerText.match(/^lpcd\s+(?:in|for)\s+[a-z]/i) &&
          !regions.some(r => lowerText.includes(r.toLowerCase())) &&
          !lowerText.includes("scheme") && !lowerText.includes("wss");

        if (
          interpretResult.keyword === "lpcd in village" ||
          interpretResult.keyword === "lpcd for village" ||
          interpretResult.keyword === "lpcd value in village" ||
          interpretResult.keyword === "village lpcd" ||
          interpretResult.keyword === "current lpcd in village" ||
          interpretResult.keyword === "latest lpcd in village" ||
          isDirectLpcdVillageQuery
        ) {
          console.log("LPCD in village query detected, keyword:", interpretResult.keyword, "isDirectLpcdVillageQuery:", isDirectLpcdVillageQuery);

          // Check if this is actually a scheme query (not a village query)
          const isSchemeQuery =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws") ||
            lowerText.includes("scheme") ||
            /\b\d{6,}\b/.test(lowerText); // Scheme ID pattern

          if (isSchemeQuery) {
            console.log("Detected scheme query, skipping village handler");
            // Fall through to scheme handlers below
          } else {
            // Check if this is a region query first (e.g., "lpcd in nagpur")
            const detectedRegion = regions.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            if (!detectedRegion) {
              // Not a region query - handle as village query
              let villageIdentifier = "";

              // Known regions to exclude from village detection
              const knownRegions = ["nagpur", "pune", "nashik", "amravati", "konkan", "mumbai", "aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"];

              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
                /(bidgaon|tarodi|wadi|dhonkhed|pophali|pohi|gondapur|sawangi|wanadongri|borgaon|ambodh|ajni|betkuchi|dhanegaon)/i,
                // Pattern to extract village from "lpcd in X" without "village" keyword
                // Captures text after "lpcd in/for" until end of string or common stop words
                /lpcd\s+(?:in|for)\s+([a-z][a-z0-9\s\-']*?)(?:\s+(?:region|district|block|taluka|on|at|from|for|today|yesterday|data|value|status)|$)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (match && match[1] && !match[1].includes("lpcd")) {
                  const candidate = match[1].trim();
                  // Make sure it's not a region name (check against known regions list)
                  const isRegion = knownRegions.some(r => candidate.toLowerCase() === r.toLowerCase() || candidate.toLowerCase().includes(r));
                  if (!isRegion && candidate.length >= 2) {
                    villageIdentifier = candidate;
                    break;
                  }
                }
              }

              if (villageIdentifier) {
                try {
                  const response = await fetch(
                    `/api/category-data/villages/${encodeURIComponent(
                      villageIdentifier,
                    )}/lpcd`,
                  );

                  if (response.ok) {
                    const data = await response.json();
                    let lpcdResponse =
                      `📈 **LPCD for ${data.village_name} Village:**\n\n` +
                      `📊 **Latest LPCD Value:** ${data.lpcd_value_day7 || "No data"
                      } L/person/day\n` +
                      `📅 **Date:** ${data.lpcd_date_day7 || "Not specified"}\n`;

                    if (data.lpcd_value_day7) {
                      const status =
                        data.lpcd_value_day7 >= 55
                          ? "✅ Above standard (≥55 L/day)"
                          : "⚠️ Below standard (<55 L/day)";
                      lpcdResponse += `📋 **Status:** ${status}\n`;
                    }

                    lpcdResponse +=
                      `👥 **Population:** ${data.population || "Not specified"}\n` +
                      `🏗️ **Number of ESRs:** ${data.number_of_esr || "Not specified"
                      }\n` +
                      `📍 **Scheme:** ${data.scheme_name || "Not specified"}\n` +
                      `🗺️ **Region:** ${data.region || "Not specified"}`;

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: lpcdResponse },
                    ]);
                  } else {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `No LPCD data found for village: ${villageIdentifier}`,
                      },
                    ]);
                  }
                } catch (error) {
                  console.error("Error fetching village LPCD:", error);
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "Sorry, I couldn't fetch the LPCD data for that village.",
                    },
                  ]);
                }
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: "Please specify which village you'd like LPCD information for (e.g., 'LPCD in Bidgaon village')",
                  },
                ]);
              }

              setLoading(false);
              return;
            }
            // If detectedRegion is true, fall through to combined LPCD analysis handlers below
          }
        }

        // 7. Chlorine in village queries
        // Also check for direct "chlorine in X" pattern where X is not a region
        const isDirectChlorineVillageQuery =
          lowerText.match(/^chlorine\s+(in|for)\s+[a-z]/i) &&
          !regions.some(r => lowerText.includes(r.toLowerCase())) &&
          !lowerText.includes("scheme") && !lowerText.includes("wss");

        if (
          interpretResult.keyword === "chlorine in village" ||
          interpretResult.keyword === "chlorine for village" ||
          interpretResult.keyword === "chlorine value in village" ||
          interpretResult.keyword === "village chlorine" ||
          interpretResult.keyword === "current chlorine in village" ||
          interpretResult.keyword === "latest chlorine in village" ||
          interpretResult.keyword === "chlorine data in village" ||
          isDirectChlorineVillageQuery
        ) {
          console.log("Chlorine in village query detected, isDirectChlorineVillageQuery:", isDirectChlorineVillageQuery);

          // Check if this is actually a scheme query (not a village query)
          const isSchemeQuery =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws") ||
            lowerText.includes("scheme") ||
            /\b\d{6,}\b/.test(lowerText); // Scheme ID pattern

          if (isSchemeQuery) {
            console.log("Detected scheme query, skipping village handler");
            // Fall through to scheme handlers below
          } else {
            // Check if this is a region query first
            const detectedRegion = regions.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            if (!detectedRegion) {
              // Not a region query - handle as village query
              let villageIdentifier = "";

              // Known regions to exclude from village detection
              const knownRegions = ["nagpur", "pune", "nashik", "amravati", "konkan", "mumbai", "aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"];

              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
                /(bidgaon|tarodi|wadi|dhonkhed|pophali|pohi|gondapur|sawangi|wanadongri|borgaon|ambodh|ajni|betkuchi|dhanegaon)/i,
                // Pattern to extract village from "chlorine in X" without "village" keyword
                /chlorine\s+(?:in|for)\s+([a-z][a-z0-9\s\-']*?)(?:\s+(?:region|district|block|taluka|on|at|from|for|today|yesterday|data|value|status)|$)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (match && match[1] && !match[1].includes("chlorine")) {
                  const candidate = match[1].trim();
                  // Make sure it's not a region name (check against known regions list)
                  const isRegion = knownRegions.some(r => candidate.toLowerCase() === r.toLowerCase() || candidate.toLowerCase().includes(r));
                  if (!isRegion && candidate.length >= 2) {
                    villageIdentifier = candidate;
                    break;
                  }
                }
              }

              if (villageIdentifier) {
                try {
                  const response = await fetch(
                    `/api/category-data/villages/${encodeURIComponent(
                      villageIdentifier,
                    )}/chlorine`,
                  );

                  if (response.ok) {
                    const data = await response.json();
                    let chlorineResponse =
                      `🧪 **Chlorine Data for ${data.village_name} Village:**\n\n` +
                      `**ESR-wise Latest Chlorine Values:**\n\n`;

                    if (data.esr_data && data.esr_data.length > 0) {
                      data.esr_data.forEach((esr: any, index: number) => {
                        const chlorineValue =
                          parseFloat(esr.chlorine_value_day7) || 0;
                        chlorineResponse += `${index + 1}. **${esr.esr_name}:**\n`;
                        chlorineResponse += `   🧪 **Chlorine:** ${chlorineValue.toFixed(2)} mg/L`;

                        if (chlorineValue >= 0.2 && chlorineValue <= 0.5) {
                          chlorineResponse += ` ✅ Optimal range\n`;
                        } else if (chlorineValue < 0.2) {
                          chlorineResponse += ` ⚠️ Below optimal range\n`;
                        } else {
                          chlorineResponse += ` ⚠️ Above optimal range\n`;
                        }

                        chlorineResponse += `   📅 **Date:** ${esr.chlorine_date_day7 || "Not specified"}\n\n`;
                      });
                    } else {
                      chlorineResponse += `No ESR-level chlorine data available.\n\n`;
                    }

                    chlorineResponse +=
                      `📍 **Scheme:** ${data.scheme_name || "Not specified"}\n` +
                      `🗺️ **Region:** ${data.region || "Not specified"}`;

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: chlorineResponse },
                    ]);
                  } else {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `No chlorine data found for village: ${villageIdentifier}`,
                      },
                    ]);
                  }
                } catch (error) {
                  console.error("Error fetching village chlorine data:", error);
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "Sorry, I couldn't fetch the chlorine data for that village.",
                    },
                  ]);
                }
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: "Please specify which village you'd like chlorine information for (e.g., 'chlorine in Bidgaon village')",
                  },
                ]);
              }

              setLoading(false);
              return;
            }
            // If detectedRegion is true, fall through to combined chlorine handlers below
          }
        }

        // 8. Pressure in village queries
        // Also check for direct "pressure in X" pattern where X is not a region
        const isDirectPressureVillageQuery =
          lowerText.match(/^pressure\s+(in|for)\s+[a-z]/i) &&
          !regions.some(r => lowerText.includes(r.toLowerCase())) &&
          !lowerText.includes("scheme") && !lowerText.includes("wss");

        if (
          interpretResult.keyword === "pressure in village" ||
          interpretResult.keyword === "pressure for village" ||
          interpretResult.keyword === "pressure value in village" ||
          interpretResult.keyword === "village pressure" ||
          interpretResult.keyword === "current pressure in village" ||
          interpretResult.keyword === "latest pressure in village" ||
          interpretResult.keyword === "pressure data in village" ||
          isDirectPressureVillageQuery
        ) {
          console.log("Pressure in village query detected, isDirectPressureVillageQuery:", isDirectPressureVillageQuery);

          // Check if this is actually a scheme query (not a village query)
          const isSchemeQuery =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws") ||
            lowerText.includes("scheme") ||
            /\b\d{6,}\b/.test(lowerText); // Scheme ID pattern

          if (isSchemeQuery) {
            console.log("Detected scheme query, skipping village handler");
            // Fall through to scheme handlers below
          } else {
            // Check if this is a region query first
            const detectedRegion = regions.find((region) =>
              lowerText.includes(region.toLowerCase()),
            );

            if (!detectedRegion) {
              // Not a region query - handle as village query
              let villageIdentifier = "";

              // Known regions to exclude from village detection
              const knownRegions = ["nagpur", "pune", "nashik", "amravati", "konkan", "mumbai", "aurangabad", "chhatrapati sambhajinagar", "sambhajinagar"];

              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
                /(bidgaon|tarodi|wadi|dhonkhed|pophali|pohi|gondapur|sawangi|wanadongri|borgaon|ambodh|ajni|betkuchi|dhanegaon)/i,
                // Pattern to extract village from "pressure in X" without "village" keyword
                /pressure\s+(?:in|for)\s+([a-z][a-z0-9\s\-']*?)(?:\s+(?:region|district|block|taluka|on|at|from|for|today|yesterday|data|value|status)|$)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (match && match[1] && !match[1].includes("pressure")) {
                  const candidate = match[1].trim();
                  // Make sure it's not a region name (check against known regions list)
                  const isRegion = knownRegions.some(r => candidate.toLowerCase() === r.toLowerCase() || candidate.toLowerCase().includes(r));
                  if (!isRegion && candidate.length >= 2) {
                    villageIdentifier = candidate;
                    break;
                  }
                }
              }

              if (villageIdentifier) {
                try {
                  const response = await fetch(
                    `/api/category-data/villages/${encodeURIComponent(
                      villageIdentifier,
                    )}/pressure`,
                  );

                  if (response.ok) {
                    const data = await response.json();
                    let pressureResponse =
                      `⚡ **Pressure Data for ${data.village_name} Village:**\n\n` +
                      `**ESR-wise Latest Pressure Values:**\n\n`;

                    if (data.esr_data && data.esr_data.length > 0) {
                      data.esr_data.forEach((esr: any, index: number) => {
                        const pressureValue =
                          parseFloat(esr.pressure_value_day7) || 0;
                        pressureResponse += `${index + 1}. **${esr.esr_name}:**\n`;
                        pressureResponse += `   ⚡ **Pressure:** ${pressureValue.toFixed(2)} bar`;

                        if (pressureValue >= 0.2 && pressureValue <= 0.7) {
                          pressureResponse += ` ✅ Optimal range\n`;
                        } else if (pressureValue < 0.2) {
                          pressureResponse += ` ⚠️ Below optimal range\n`;
                        } else {
                          pressureResponse += ` ⚠️ Above optimal range\n`;
                        }

                        pressureResponse += `   📅 **Date:** ${esr.pressure_date_day7 || "Not specified"}\n\n`;
                      });
                    } else {
                      pressureResponse += `No ESR-level pressure data available.\n\n`;
                    }

                    pressureResponse +=
                      `📍 **Scheme:** ${data.scheme_name || "Not specified"}\n` +
                      `🗺️ **Region:** ${data.region || "Not specified"}`;

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: pressureResponse },
                    ]);
                  } else {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: `No pressure data found for village: ${villageIdentifier}`,
                      },
                    ]);
                  }
                } catch (error) {
                  console.error("Error fetching village pressure data:", error);
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: "Sorry, I couldn't fetch the pressure data for that village.",
                    },
                  ]);
                }
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: "Please specify which village you'd like pressure information for (e.g., 'pressure in Bidgaon village')",
                  },
                ]);
              }

              setLoading(false);
              return;
            }
            // If detectedRegion is true, fall through to combined pressure handlers below
          }
        }

        // 9. ESR level water consumption queries - Enhanced with OpenAI interpretation
        if (
          interpretResult.keyword === "esr level water consumption" ||
          interpretResult.keyword === "esr water consumption" ||
          interpretResult.keyword === "water consumption by esr" ||
          interpretResult.keyword === "esr wise water consumption" ||
          interpretResult.keyword === "esr level consumption" ||
          interpretResult.keyword === "esr consumption in village" ||
          interpretResult.keyword === "water consumption for each esr"
        ) {
          console.log(
            "ESR level water consumption query detected - using enhanced interpretation",
          );

          try {
            // Use enhanced interpretation to extract entities
            const enhancedResult = await handleEnhancedInterpretation(input);
            console.log(
              "Enhanced interpretation result for ESR query:",
              enhancedResult,
            );

            // Extract entities from enhanced interpretation
            const { entities } = enhancedResult;
            let selectedRegion = "all";
            let selectedScheme = "all";
            let selectedVillage = "all";

            // Check for region entity
            if (entities?.regionName) {
              selectedRegion = entities.regionName;
            } else {
              // Fallback to direct extraction from query
              const detectedRegion = extractRegion(input);
              if (detectedRegion) {
                selectedRegion = detectedRegion;
              }
            }

            // Check for scheme entity
            if (entities?.schemeName) {
              selectedScheme = entities.schemeName;
            } else if (entities?.schemeId) {
              selectedScheme = entities.schemeId;
            } else {
              // Fallback to direct extraction from query
              const schemePatterns = [
                /(?:in|for|scheme)\s+(.+?)\s+(?:scheme|wss|rrwss)/i,
                /scheme\s+(.+)/i,
                /(\d{8,})/, // Scheme ID pattern
              ];

              for (const pattern of schemePatterns) {
                const match = lowerText.match(pattern);
                if (
                  match &&
                  match[1] &&
                  !match[1].includes("esr") &&
                  !match[1].includes("village")
                ) {
                  selectedScheme = match[1].trim();
                  break;
                }
              }
            }

            // Check for village entity
            if (entities?.villageName) {
              selectedVillage = entities.villageName;
            } else {
              // Fallback to direct extraction from query
              const villagePatterns = [
                /(?:in|for|of)\s+(.+?)\s+village/i,
                /village\s+(.+)/i,
              ];

              for (const pattern of villagePatterns) {
                const match = lowerText.match(pattern);
                if (
                  match &&
                  match[1] &&
                  !match[1].includes("esr") &&
                  !match[1].includes("water")
                ) {
                  selectedVillage = match[1].trim();
                  break;
                }
              }
            }

            // Construct descriptive message based on filters
            let scopeDescription = "ESR Water Consumption";
            const filterDescriptions = [];

            if (selectedRegion !== "all") {
              filterDescriptions.push(`in ${selectedRegion} region`);
            }
            if (selectedScheme !== "all") {
              filterDescriptions.push(`for scheme "${selectedScheme}"`);
            }
            if (selectedVillage !== "all") {
              filterDescriptions.push(`in ${selectedVillage} village`);
            }

            if (filterDescriptions.length > 0) {
              scopeDescription += ` ${filterDescriptions.join(" ")}`;
            } else {
              scopeDescription += " across all regions";
            }

            // Add response message
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: `📊 **${scopeDescription}:**\n\nHere's the ESR-level water consumption data:`,
              },
            ]);

            // Add widget with enhanced filtering
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "",
                widget: "esrWaterConsumption",
                selectedRegion: selectedRegion,
                selectedScheme: selectedScheme,
                selectedVillage: selectedVillage,
              },
            ]);
          } catch (error) {
            console.error(
              "Error in enhanced ESR water consumption processing:",
              error,
            );

            // Fallback to simple response
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "I'll show you the ESR water consumption data. Here's what I found:",
              },
            ]);

            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "",
                widget: "esrWaterConsumption",
                selectedRegion: "all",
                selectedScheme: "all",
                selectedVillage: "all",
              },
            ]);
          }

          setLoading(false);
          return;
        }

        // 10. ESR capacity queries - Show total capacity with region/scheme/village filtering
        // Support various phrasings: "esr capacity", "capacity of esr", "size of esr", "esr volume", etc.
        const esrCapacityPatterns = [
          /esr.*capacity/i,
          /capacity.*esr/i,
          /esr.*size/i,
          /size.*esr/i,
          /esr.*volume/i,
          /volume.*esr/i,
          /esr.*storage/i,
          /storage.*esr/i,
          /total.*capacity/i,
          /capacity.*total/i,
        ];

        const isESRCapacityQuery = esrCapacityPatterns.some((pattern) =>
          pattern.test(lowerText),
        );

        if (isESRCapacityQuery) {
          console.log("ESR capacity query detected");

          try {
            // Extract entities from query
            let selectedRegion = "all";
            let selectedScheme = "all";
            let selectedVillage = "all";

            // Extract region
            const detectedRegion = extractRegion(input);
            if (detectedRegion) {
              selectedRegion = detectedRegion;
            }

            // Extract scheme
            const schemePatterns = [
              /(?:in|for|of)\s+(.+?)\s+(?:scheme|wss|rrwss)/i,
              /scheme\s+(.+?)\s+(?:region|village|capacity|esr|and)/i,
              /(\d{8,})/, // Scheme ID pattern
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (
                match &&
                match[1] &&
                !match[1].includes("capacity") &&
                !match[1].includes("esr") &&
                !match[1].includes("village") &&
                !match[1].includes("region")
              ) {
                selectedScheme = match[1].trim();
                break;
              }
            }

            // Extract village
            const villagePatterns = [
              /(?:in|for|of)\s+(.+?)\s+village/i,
              /village\s+(.+?)\s+(?:region|scheme|capacity|esr|and)/i,
            ];

            for (const pattern of villagePatterns) {
              const match = lowerText.match(pattern);
              if (
                match &&
                match[1] &&
                !match[1].includes("capacity") &&
                !match[1].includes("esr") &&
                !match[1].includes("scheme")
              ) {
                selectedVillage = match[1].trim();
                break;
              }
            }

            // Construct descriptive message based on filters
            let scopeDescription = "ESR Capacity";
            const filterDescriptions = [];

            if (selectedRegion !== "all") {
              filterDescriptions.push(`in ${selectedRegion} region`);
            }
            if (selectedScheme !== "all") {
              filterDescriptions.push(`for scheme "${selectedScheme}"`);
            }
            if (selectedVillage !== "all") {
              filterDescriptions.push(`in ${selectedVillage} village`);
            }

            if (filterDescriptions.length > 0) {
              scopeDescription += ` ${filterDescriptions.join(" ")}`;
            } else {
              scopeDescription += " across all regions";
            }

            // Add response message
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: `📊 **${scopeDescription}:**\n\nHere's the total ESR capacity data:`,
                autoSpeak: fromVoice,
              },
            ]);

            // Add widget with filtering
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "",
                widget: "esrCapacity",
                selectedRegion: selectedRegion,
                selectedScheme: selectedScheme,
                selectedVillage: selectedVillage,
              },
            ]);
          } catch (error) {
            console.error("Error in ESR capacity processing:", error);

            // Fallback to simple response
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "I'll show you the ESR capacity data. Here's what I found:",
                autoSpeak: fromVoice,
              },
            ]);

            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "",
                widget: "esrCapacity",
                selectedRegion: "all",
                selectedScheme: "all",
                selectedVillage: "all",
              },
            ]);
          }

          setLoading(false);
          return;
        }

        // FALLBACK for unrecognized queries
        if (
          interpretResult.keyword === null ||
          interpretResult.keyword === "NONE" ||
          interpretResult.confidence < 0.3
        ) {
          console.log(
            "Unrecognized query - trying Text-to-SQL fallback before showing help message",
          );

          // PRIORITY 3: Text-to-SQL Fallback
          try {
            console.log("🔍 Attempting Text-to-SQL for query:", text);
            const textToSqlResponse = await fetch("/api/ai/text-to-sql", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query: text }),
            });

            if (textToSqlResponse.ok) {
              const sqlData = await textToSqlResponse.json();
              console.log("Text-to-SQL result:", sqlData);

              if (
                sqlData.success &&
                sqlData.results &&
                sqlData.results.length > 0
              ) {
                // Successfully got database results - use server-formatted response with human-friendly field names
                const formattedResponse =
                  sqlData.formattedResponse ||
                  "I found some data but couldn't format it properly.";

                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: formattedResponse,
                    autoSpeak: fromVoice,
                  },
                ]);
                setLoading(false);
                return;
              } else if (
                sqlData.success &&
                sqlData.results &&
                sqlData.results.length === 0
              ) {
                // Query executed successfully but returned no results
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `📊 I understood your question, but no data was found matching your criteria.\n\n${sqlData.explanation || ""}`,
                    autoSpeak: fromVoice,
                  },
                ]);
                setLoading(false);
                return;
              } else if (!sqlData.success && !sqlData.isConversational) {
                // Text-to-SQL failed with actionable error (but not conversational)
                console.warn(
                  "Text-to-SQL error:",
                  sqlData.message,
                  sqlData.error,
                );

                // Surface actionable error to user
                let errorResponse = `⚠️ I tried to answer your question, but encountered an issue:\n\n`;
                errorResponse += `**${sqlData.message}**\n\n`;

                // Provide suggestion based on error type
                if (sqlData.error && sqlData.error.includes("timeout")) {
                  errorResponse += `💡 Try asking a more specific question or limiting the time range.`;
                } else if (sqlData.error && sqlData.error.includes("syntax")) {
                  errorResponse += `💡 Try rephrasing your question in simpler terms.`;
                } else if (
                  sqlData.error &&
                  sqlData.error.includes("does not exist")
                ) {
                  errorResponse += `💡 The data you're asking about might not be available in our database.`;
                } else {
                  errorResponse += `💡 Try asking your question in a different way.`;
                }

                setChatMessages((prev) => [
                  ...prev,
                  { type: "bot", text: errorResponse, autoSpeak: fromVoice },
                ]);
                setLoading(false);
                return;
              } else if (sqlData.isConversational) {
                // Query is conversational - skip error, continue to conversational fallback
                console.log(
                  "💬 Query detected as conversational, continuing to AI fallback",
                );
                // Don't return - let execution continue to conversational fallback below
              }
            }
          } catch (textToSqlError) {
            console.error("Text-to-SQL fallback failed:", textToSqlError);
            // Continue to final fallback message
          }

          // FINAL FALLBACK: Use conversational AI for smart ChatGPT-like responses
          console.log(
            "All pattern matching failed - using conversational AI fallback",
          );

          try {
            // Build conversation history from recent messages (last 6 messages = 3 exchanges)
            const conversationHistory = chatMessages.slice(-6).map((msg) => ({
              role: msg.type === "user" ? "user" : "bot",
              text: msg.text,
            }));

            // Normalize language code: en-IN → en, hi-IN → hi, mr-IN → mr
            const normalizedLanguage = selectedLanguage.split("-")[0] as
              | "en"
              | "hi"
              | "mr";

            // Call conversational fallback endpoint
            const conversationalResponse = await fetch(
              "/api/ai/conversational-fallback",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: text,
                  conversationHistory: conversationHistory,
                  language: normalizedLanguage,
                }),
              },
            );

            if (conversationalResponse.ok) {
              const data = await conversationalResponse.json();

              if (data.success && data.reply) {
                console.log("✅ Conversational AI response received");

                // Use streaming for word-by-word display
                await addStreamedBotMessage(
                  {
                    text: data.reply,
                    autoSpeak: fromVoice,
                  },
                  30,
                );

                setLoading(false);
                return;
              }
            }

            // If conversational API fails, show minimal fallback
            console.warn("Conversational API failed, using minimal fallback");
          } catch (conversationalError) {
            console.error(
              "Conversational fallback error:",
              conversationalError,
            );
          }

          // Ultra-minimal fallback if conversational AI fails
          const minimalFallback = `I'm not sure I understood that. Try asking about:\n• Scheme details\n• Village water data\n• ESR information\n• Regional statistics`;

          // Use streaming for word-by-word display
          await addStreamedBotMessage(
            {
              text: minimalFallback,
              autoSpeak: fromVoice,
            },
            30,
          );

          setLoading(false);
          return;
        }

        // Enhanced scheme analysis/combined schemes query with OpenAI NLP
        if (
          processedText.includes("scheme analysis") ||
          processedText.includes("schemes analysis") ||
          (processedText.includes("schemes") &&
            !processedText.includes("fully completed schemes") &&
            !processedText.includes("partial schemes")) ||
          processedText.includes("schemes integrated") ||
          processedText.includes("schemes data") ||
          processedText.includes("scheme information") ||
          processedText.includes("scheme status") ||
          processedText.includes("scheme overview") ||
          processedText.includes("schemes overview")
        ) {
          console.log(
            "Combined schemes analysis query detected - using OpenAI NLP",
          );

          try {
            // Use OpenAI to interpret the query for better understanding
            const openaiResponse = await fetch("/api/ai/interpret", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: input }),
            });

            if (openaiResponse.ok) {
              const interpretation = await openaiResponse.json();
              console.log("OpenAI interpretation:", interpretation);
            }
          } catch (error) {
            console.warn(
              "OpenAI interpretation failed, proceeding with regular detection:",
              error,
            );
          }

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let apiUrl = "/api/category-data/combined-schemes";
          let scopeText = " across all regions";
          let selectedRegion = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const schemes = await response.json();

              // Helper function to normalize status strings for consistent comparison
              const normalizeStatus = (status: string) => {
                if (!status) return "";
                return status
                  .toLowerCase()
                  .replace(/[-_\s]+/g, " ")
                  .trim();
              };

              // Add message with count and breakdown using normalized status comparison
              const fullyCompleted = schemes.filter((s: any) => {
                const normalized = normalizeStatus(
                  s.fully_completion_scheme_status || "",
                );
                return (
                  normalized === "fully completed" || normalized === "completed"
                );
              }).length;

              const inProgress = schemes.filter((s: any) => {
                const normalized = normalizeStatus(
                  s.fully_completion_scheme_status || "",
                );
                return normalized === "in progress";
              }).length;

              const responseMessage = `I found ${schemes.length} schemes${scopeText} (${fullyCompleted} fully completed, ${inProgress} in progress).`;
              setChatMessages((prev) => [
                ...prev,
                { type: "bot", text: responseMessage },
              ]);

              // Add widget with combined schemes and download button
              if (schemes && schemes.length > 0) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `Here is the comprehensive schemes analysis${scopeText}:`,
                    widget: "combinedSchemes",
                    schemes: schemes,
                    selectedRegion: selectedRegion,
                  },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `No schemes found${scopeText}.`,
                  },
                ]);
              }

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching combined schemes:", error);
          }

          // Fallback to simple message
          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the schemes analysis. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // 7. Fully Completed Villages - Use reliable API endpoint
        if (processedText.includes("fully completed villages")) {
          console.log(
            "Fully completed villages query detected - using direct API",
          );

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme ID or name from query if mentioned - using more precise patterns
          let detectedScheme = null;

          // First check for quoted scheme names
          const quotedMatch = lowerText.match(/["']([^"']+)["']/);
          if (quotedMatch) {
            detectedScheme = quotedMatch[1].trim();
            console.log(`Detected quoted scheme: "${detectedScheme}"`);
          } else {
            // Then check for explicit scheme patterns (more precise)
            const schemePatterns = [
              /scheme\s+id[:\s]+(\w+)/i, // "scheme id: XXX" or "scheme id XXX"
              /scheme[:\s]+([a-zA-Z0-9][a-zA-Z0-9\s-]+?(?:wss|rrwss|rws))/i, // "scheme: bidgaon tarodi wss"
              /(?:for|in)\s+scheme\s+([a-zA-Z0-9][a-zA-Z0-9\s-]+)/i, // "for scheme bidgaon tarodi"
              /^(\d{8,})$/, // Plain scheme ID if query is just numbers
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1] && !match[1].includes("villages")) {
                // Avoid capturing "X villages"
                detectedScheme = match[1].trim();
                console.log(`Detected scheme: "${detectedScheme}"`);
                break;
              }
            }
          }

          let apiUrl = "/api/category-data/fully-completed-villages";
          let scopeText = " across all regions";
          let selectedRegion = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          if (detectedScheme) {
            const separator = apiUrl.includes("?") ? "&" : "?";
            apiUrl += `${separator}schemeId=${encodeURIComponent(
              detectedScheme,
            )}`;
            scopeText += ` for scheme ${detectedScheme}`;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              // Add message with count
              const responseMessage = `I found ${villages.length} fully completed villages${scopeText}.`;
              setChatMessages((prev) => [
                ...prev,
                { type: "bot", text: responseMessage },
              ]);

              // Add widget with villages and download button
              if (villages && villages.length > 0) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `Here are the fully completed villages${scopeText}:`,
                    widget: "fullyCompletedVillages",
                    villages: villages,
                    selectedRegion: selectedRegion,
                  },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `No fully completed villages found${scopeText}.`,
                  },
                ]);
              }

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching fully completed villages:", error);
          }

          // Fallback to simple message
          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the fully completed villages. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Combined Water Consumption Analysis - Use combined API for comprehensive water status analysis
        if (
          processedText.includes("water consumption") ||
          processedText.includes("water analysis") ||
          processedText.includes("water consumption in") ||
          processedText.includes("water consumption analysis") ||
          processedText.includes("water usage") ||
          processedText.includes("water usage analysis") ||
          processedText.includes("water statistics") ||
          processedText.includes("water data") ||
          processedText.includes("water supply analysis") ||
          processedText.includes("water consumption statistics") ||
          processedText.includes("consumption analysis") ||
          processedText.includes("consumption statistics") ||
          (processedText.includes("water") &&
            (lowerText.includes(" in ") || lowerText.includes(" for "))) ||
          (processedText.includes("water supply") &&
            (lowerText.includes(" in ") || lowerText.includes(" for ")))
        ) {
          console.log("Combined water consumption analysis query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned (enhanced logic for better detection)
          let detectedScheme = null;
          let detectedVillage = null;

          // Enhanced scheme patterns to better match various formats
          const schemePatterns = [
            /(?:in|for|from)\s+(\d{4,})\b/i, // Pure numeric scheme ID like "water in 7940695"
            /(?:in|for|from)\s+(.+?)\s+(?:scheme|wss|rrwss|rws)(?:\s|$)/i, // "in bidgaon tarodi wss"
            /(?:analysis|data|consumption|lpcd)\s+(?:in|for|from)\s+(.+?)(?:\s+(?:scheme|wss|region)\s*|\s*$)/i, // "analysis in bidgaon tarodi"
            /\b(.+?)\s+(?:wss|rrwss|rws)\b/i, // "bidgaon tarodi wss"
            /\b(.+?\s+.+?)\s+(?:scheme|wss|rrwss|rws)\b/i, // Multi-word schemes
          ];

          // Village detection patterns
          const villagePatterns = [
            /(?:village|villages?)\s+(.+?)(?:\s|$)/i,
            /(?:in|for|from)\s+([a-zA-Z\s.]+?)\s+village/i,
          ];

          // Try to detect scheme first (even if region is detected, for scheme-specific queries)
          for (const pattern of schemePatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1]) {
              const candidateScheme = match[1].trim();
              const isRegionName = regions.some((region) =>
                candidateScheme.toLowerCase().includes(region.toLowerCase()),
              );
              if (!isRegionName && candidateScheme.length > 2) {
                detectedScheme = candidateScheme;
                console.log(
                  `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                );
                break;
              }
            }
          }

          // Check for village-specific queries if no scheme detected
          if (!detectedScheme && !detectedRegion) {
            for (const pattern of villagePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateVillage = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateVillage.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateVillage.length > 2) {
                  detectedVillage = candidateVillage;
                  console.log(
                    `Detected village: "${detectedVillage}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages/combined-water";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          // Priority: scheme > village > region
          if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          } else if (detectedVillage) {
            apiUrl += `?village=${encodeURIComponent(detectedVillage)}`;
            scopeText = ` for ${detectedVillage} village`;
            selectedScheme = detectedVillage; // Use selectedScheme field for village filtering
          } else if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const data = await response.json();

              // Add message with comprehensive water consumption analysis
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Water consumption analysis${scopeText}: ${data.counts.total} total villages (${data.counts.withWater} with water, ${data.counts.noWater} without water)`,
                  widget: "combinedWaterStatus",
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching combined water status:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the water consumption analysis data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Combined LPCD Analysis - Use combined API for comprehensive LPCD statistics
        // IMPORTANT: Skip if this is an export/download request with dates
        const isExportRequest =
          lowerText.includes("excel") ||
          lowerText.includes("download") ||
          lowerText.includes("export") ||
          lowerText.includes("get excel") ||
          lowerText.includes("give me excel") ||
          lowerText.includes("generate excel");

        const hasDateIndicators =
          lowerText.includes("from") ||
          lowerText.includes("to") ||
          lowerText.includes("between") ||
          lowerText.includes("historical") ||
          lowerText.includes("january") ||
          lowerText.includes("february") ||
          lowerText.includes("march") ||
          lowerText.includes("april") ||
          lowerText.includes("may") ||
          lowerText.includes("june") ||
          lowerText.includes("july") ||
          lowerText.includes("august") ||
          lowerText.includes("september") ||
          lowerText.includes("october") ||
          lowerText.includes("november") ||
          lowerText.includes("december") ||
          lowerText.includes("last week") ||
          lowerText.includes("last month") ||
          lowerText.includes("yesterday");

        if (
          !isExportRequest && // Don't trigger if it's an export request
          !hasDateIndicators && // Don't trigger if dates are mentioned
          (processedText.includes("lpcd statistics") ||
            processedText.includes("lpcd values") ||
            processedText.includes("lpcd analysis") ||
            processedText.includes("lpcd data") ||
            processedText.includes("lpcd information") ||
            processedText.includes("lpcd statistics analysis") ||
            processedText.includes("lpcd performance") ||
            processedText.includes("lpcd metrics") ||
            processedText.includes("lpcd distribution") ||
            processedText.includes("lpcd status") ||
            (processedText.includes("lpcd") &&
              (lowerText.includes(" in ") || lowerText.includes(" for "))) ||
            /\blpcd\s+in\s+\w+/.test(lowerText) ||
            /\blpcd\s+for\s+\w+/.test(lowerText))
        ) {
          console.log("Combined LPCD analysis query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned (enhanced logic for better detection)
          let detectedScheme = null;
          let detectedVillage = null;

          // Enhanced scheme patterns to better match various formats
          const schemePatterns = [
            /(?:in|for|from)\s+(\d{4,})\b/i, // Pure numeric scheme ID like "lpcd in 7940695"
            /(?:in|for|from)\s+(.+?)\s+(?:scheme|wss|rrwss|rws)(?:\s|$)/i, // "in bidgaon tarodi wss"
            /(?:analysis|data|consumption|lpcd)\s+(?:in|for|from)\s+(.+?)(?:\s+(?:scheme|wss|region)\s*|\s*$)/i, // "lpcd in bidgaon tarodi"
            /\b(.+?)\s+(?:wss|rrwss|rws)\b/i, // "bidgaon tarodi wss"
            /\b(.+?\s+.+?)\s+(?:scheme|wss|rrwss|rws)\b/i, // Multi-word schemes
          ];

          // Village detection patterns
          const villagePatterns = [
            /(?:village|villages?)\s+(.+?)(?:\s|$)/i,
            /(?:in|for|from)\s+([a-zA-Z\s.]+?)\s+village/i,
          ];

          // Try to detect scheme first (even if region is detected, for scheme-specific queries)
          for (const pattern of schemePatterns) {
            const match = lowerText.match(pattern);
            if (match && match[1]) {
              const candidateScheme = match[1].trim();
              const isRegionName = regions.some((region) =>
                candidateScheme.toLowerCase().includes(region.toLowerCase()),
              );
              if (!isRegionName && candidateScheme.length > 2) {
                detectedScheme = candidateScheme;
                console.log(
                  `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                );
                break;
              }
            }
          }

          // Check for village-specific queries if no scheme detected
          if (!detectedScheme && !detectedRegion) {
            for (const pattern of villagePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateVillage = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateVillage.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateVillage.length > 2) {
                  detectedVillage = candidateVillage;
                  console.log(
                    `Detected village: "${detectedVillage}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages/combined-lpcd";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          // Priority: scheme > village > region
          if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          } else if (detectedVillage) {
            apiUrl += `?village=${encodeURIComponent(detectedVillage)}`;
            scopeText = ` for ${detectedVillage} village`;
            selectedScheme = detectedVillage; // Use selectedScheme field for village filtering
          } else if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const data = await response.json();

              // Add message with comprehensive LPCD analysis
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `LPCD statistics${scopeText}: ${data.counts.total} total villages (${data.counts.above55LPCD} above 55 LPCD, ${data.counts.below55LPCD} below 55 LPCD)`,
                  widget: "combinedLpcdStatus",
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching combined LPCD status:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the LPCD statistics data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Water - Use category data API (moved before general "villages with water" to catch specific patterns first)
        if (
          processedText.includes("consistent water") ||
          processedText.includes("reliable water") ||
          processedText.includes("consistent supply") ||
          processedText.includes("consistent water supply") ||
          processedText.includes("reliable supply") ||
          processedText.includes("villages with consistent") ||
          processedText.includes("villages have consistent") ||
          processedText.includes("village.*consistent.*supply") ||
          (processedText.includes("consistent") &&
            (processedText.includes("water") ||
              processedText.includes("supply")))
        ) {
          console.log("Consistent water query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-consistent-water";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages with consistent water${scopeText}:`,
                  widget: "consistentWater",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching villages with consistent water:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages with consistent water data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Villages with Water - Use category data API
        if (
          processedText.includes("villages with water") ||
          processedText.includes("villages having water")
        ) {
          console.log("Villages with water query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          // Enhanced scheme detection for patterns like "in 105 villages rrwss" or "in bidgaon scheme"
          let detectedScheme = null;
          if (!detectedRegion) {
            // Try multiple patterns to detect scheme name
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i, // "in something region" or "in something" at end
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i, // "in/for/from X scheme/wss/rrwss/rws"
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i, // "scheme 105 villages something"
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i, // "105 villages something wss/rrwss/rws"
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                // Avoid false positives with region names
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-with-water";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages with water${scopeText}:`,
                  widget: "villagesWithWater",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching villages with water:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages with water data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Villages No Water - Use category data API
        if (
          processedText.includes("villages no water") ||
          processedText.includes("villages without water")
        ) {
          console.log("Villages no water query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-no-water";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages with no water${scopeText}:`,
                  widget: "villagesNoWater",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching villages with no water:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages with no water data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Zero - Use category data API
        if (
          processedText.includes("consistent zero") ||
          processedText.includes("always zero")
        ) {
          console.log("Consistent zero query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-consistent-zero-water";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages with consistent zero water${scopeText}:`,
                  widget: "consistentZero",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching villages with consistent zero water:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages with consistent zero water data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Villages with Reliable Consumption but Abrupt LPCD
        // Trigger: "reliable consumption abrupt lpcd", "villages with reliable consumption but abrupt lpcd", etc.
        if (
          (processedText.includes("reliable") &&
            processedText.includes("consumption") &&
            processedText.includes("abrupt") &&
            processedText.includes("lpcd")) ||
          (processedText.includes("reliable") &&
            processedText.includes("water") &&
            processedText.includes("abrupt"))
        ) {
          console.log(
            "Reliable water consumption with abrupt LPCD query detected",
          );

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          // Extract village from query if mentioned
          let detectedVillage = null;
          const villagePatterns = [
            /(?:in|for|of)\s+(.+?)\s+village/i,
            /village\s+(.+)/i,
          ];

          for (const pattern of villagePatterns) {
            const match = lowerText.match(pattern);
            if (
              match &&
              match[1] &&
              !match[1].includes("reliable") &&
              !match[1].includes("abrupt")
            ) {
              detectedVillage = match[1].trim();
              break;
            }
          }

          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";
          let selectedVillage = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          } else if (detectedVillage) {
            scopeText = ` in ${detectedVillage} village`;
            selectedVillage = detectedVillage;
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: `📊 **Villages with Reliable Consumption but Abrupt LPCD${scopeText}:**\n\nThese villages have reliable water supply (≤200% ESR consumption) but show abrupt LPCD variations (>100):`,
              widget: "reliableWaterConsumption",
              selectedRegion: selectedRegion,
              selectedScheme: selectedScheme,
              selectedVillage: selectedVillage,
            },
          ]);

          setLoading(false);
          return;
        }

        // SCHEME-LEVEL LPCD ANALYSIS - Check if query mentions "scheme" or "schemes"
        // Priority: Scheme-level queries should be handled before village-level queries
        const hasSchemeKeyword =
          lowerText.includes("scheme") || lowerText.includes("schemes");
        const hasLpcdKeyword = lowerText.includes("lpcd");

        // Also detect "scheme lpcd" patterns with "all region" or specific regions
        const hasSchemeLpcdPattern =
          hasLpcdKeyword &&
          (hasSchemeKeyword ||
            lowerText.includes("all region") ||
            lowerText.includes("all regions") ||
            (lowerText.includes("lpcd") && lowerText.includes("region")));

        // 1. COMBINED SCHEME LPCD STATUS (schemes + lpcd without above/below)
        // Triggers on: "scheme lpcd", "lpcd in all regions", "scheme lpcd in amravati", etc.
        if (
          (hasSchemeKeyword && hasLpcdKeyword || hasSchemeLpcdPattern) &&
          !lowerText.includes("above 55") &&
          !lowerText.includes("below 55") &&
          !lowerText.includes("over 55") &&
          !lowerText.includes("under 55") &&
          !lowerText.includes("village") &&
          !lowerText.includes("chart") &&
          !lowerText.includes("graph")
        ) {
          console.log("Combined scheme LPCD status query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let scopeText = " across all regions";
          let selectedRegion = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: `📊 **Scheme-Level LPCD Analysis${scopeText}:**\n\nHere's the comprehensive LPCD status for all schemes:`,
              widget: "combinedSchemeLpcd",
              selectedRegion: selectedRegion,
            },
          ]);

          setLoading(false);
          return;
        }

        // 2. SCHEMES ABOVE 55 LPCD
        if (
          hasSchemeKeyword &&
          hasLpcdKeyword &&
          (processedText.includes("above 55") ||
            processedText.includes("over 55"))
        ) {
          console.log("Schemes above 55 LPCD query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let apiUrl = "/api/scheme-lpcd/schemes-above-55-lpcd";
          let scopeText = " across all regions";
          let selectedRegion = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          try {
            const response = await fetch(apiUrl);
            if (response.ok) {
              const schemes = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `📊 **Schemes Above 55 LPCD${scopeText}:**\n\nFound ${schemes.length} schemes with LPCD above 55:`,
                  widget: "above55Scheme",
                  schemes: schemes,
                  selectedRegion: selectedRegion,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching schemes above 55 LPCD:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the schemes above 55 LPCD data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // 3. SCHEMES BELOW 55 LPCD
        if (
          hasSchemeKeyword &&
          hasLpcdKeyword &&
          (processedText.includes("below 55") ||
            processedText.includes("under 55"))
        ) {
          console.log("Schemes below 55 LPCD query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let apiUrl = "/api/scheme-lpcd/schemes-below-55-lpcd";
          let scopeText = " across all regions";
          let selectedRegion = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          try {
            const response = await fetch(apiUrl);
            if (response.ok) {
              const schemes = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `📊 **Schemes Below 55 LPCD${scopeText}:**\n\nFound ${schemes.length} schemes with LPCD below 55:`,
                  widget: "below55Scheme",
                  schemes: schemes,
                  selectedRegion: selectedRegion,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching schemes below 55 LPCD:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the schemes below 55 LPCD data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // VILLAGE-LEVEL LPCD QUERIES (original handlers)
        // Above 55 LPCD - Use category data API
        if (
          (processedText.includes("above 55 lpcd") ||
            processedText.includes("over 55 lpcd")) &&
          !hasSchemeKeyword
        ) {
          console.log("Villages above 55 LPCD query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-above-55-lpcd";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages above 55 LPCD${scopeText}:`,
                  widget: "above55Lpcd",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching villages above 55 LPCD:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages above 55 LPCD data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Below 55 LPCD - Use category data API
        if (
          (processedText.includes("below 55 lpcd") ||
            processedText.includes("under 55 lpcd")) &&
          !hasSchemeKeyword
        ) {
          console.log("Villages below 55 LPCD query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-below-55-lpcd";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages below 55 LPCD${scopeText}:`,
                  widget: "below55Lpcd",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching villages below 55 LPCD:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages below 55 LPCD data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Above 55 LPCD - Use category data API
        if (
          processedText.includes("consistent above 55") ||
          processedText.includes("consistently above 55")
        ) {
          console.log("Consistent above 55 LPCD query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-consistently-above-55-lpcd";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages consistently above 55 LPCD${scopeText}:`,
                  widget: "consistentAbove55Lpcd",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching villages consistently above 55 LPCD:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages consistently above 55 LPCD data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Below 55 LPCD - Use category data API
        if (
          processedText.includes("consistent below 55") ||
          processedText.includes("consistently below 55")
        ) {
          console.log("Consistent below 55 LPCD query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/villages-consistently-below-55-lpcd";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const villages = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the villages consistently below 55 LPCD${scopeText}:`,
                  widget: "consistentBelow55Lpcd",
                  villages: villages,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching villages consistently below 55 LPCD:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the villages consistently below 55 LPCD data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Optimal Chlorine - All 7 days between 0.2-0.5
        if (
          (processedText.includes("consistent") ||
            processedText.includes("consistently")) &&
          (processedText.includes("optimal") ||
            processedText.includes("good")) &&
          (processedText.includes("chlorine") || processedText.includes("rca"))
        ) {
          console.log("Consistent optimal chlorine query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/chlorine/consistent-optimal";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with consistent optimal chlorine (0.2-0.5 mg/L for all 7 days)${scopeText}:`,
                  widget: "consistentOptimalChlorine",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching ESRs with consistent optimal chlorine:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the consistent optimal chlorine data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Above Optimal Chlorine - All 7 days > 0.5
        if (
          (processedText.includes("consistent") ||
            processedText.includes("consistently")) &&
          processedText.includes("above") &&
          (processedText.includes("chlorine") || processedText.includes("rca"))
        ) {
          console.log("Consistent above optimal chlorine query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/chlorine/consistent-above";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with consistent above optimal chlorine (>0.5 mg/L for all 7 days)${scopeText}:`,
                  widget: "consistentAboveChlorine",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching ESRs with consistent above chlorine:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the consistent above chlorine data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Below Optimal Chlorine - All 7 days < 0.2
        if (
          (processedText.includes("consistent") ||
            processedText.includes("consistently")) &&
          processedText.includes("below") &&
          (processedText.includes("chlorine") || processedText.includes("rca"))
        ) {
          console.log("Consistent below optimal chlorine query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/chlorine/consistent-below";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with consistent below optimal chlorine (<0.2 mg/L for all 7 days)${scopeText}:`,
                  widget: "consistentBelowChlorine",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching ESRs with consistent below chlorine:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the consistent below chlorine data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Optimal Pressure - All 7 days between 0.2-0.7
        if (
          (processedText.includes("consistent") ||
            processedText.includes("consistently")) &&
          (processedText.includes("optimal") ||
            processedText.includes("good")) &&
          (processedText.includes("pressure") || processedText.includes("pt"))
        ) {
          console.log("Consistent optimal pressure query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/pressure/consistent-optimal";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with consistent optimal pressure (0.2-0.7 bar for all 7 days)${scopeText}:`,
                  widget: "consistentOptimalPressure",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching ESRs with consistent optimal pressure:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the consistent optimal pressure data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Above Optimal Pressure - All 7 days > 0.7
        if (
          (processedText.includes("consistent") ||
            processedText.includes("consistently")) &&
          processedText.includes("above") &&
          (processedText.includes("pressure") || processedText.includes("pt"))
        ) {
          console.log("Consistent above optimal pressure query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/pressure/consistent-above";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with consistent above optimal pressure (>0.7 bar for all 7 days)${scopeText}:`,
                  widget: "consistentAbovePressure",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching ESRs with consistent above pressure:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the consistent above pressure data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Consistent Below Optimal Pressure - All 7 days < 0.2
        if (
          (processedText.includes("consistent") ||
            processedText.includes("consistently")) &&
          processedText.includes("below") &&
          (processedText.includes("pressure") || processedText.includes("pt"))
        ) {
          console.log("Consistent below optimal pressure query detected");

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/pressure/consistent-below";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with consistent below optimal pressure (<0.2 bar for all 7 days)${scopeText}:`,
                  widget: "consistentBelowPressure",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error(
              "Error fetching ESRs with consistent below pressure:",
              error,
            );
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the consistent below pressure data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Optimal Pressure - Use category data API
        // IMPORTANT: Only trigger if user ACTUALLY said "optimal" or the range 0.2-0.7
        if (
          (lowerText.includes("optimal") && lowerText.includes("pressure")) ||
          (lowerText.includes("good") && lowerText.includes("pressure")) ||
          /pressure.*between.*0\.2.*0\.7/i.test(lowerText) ||
          /pt.*between.*0\.2.*0\.7/i.test(lowerText) ||
          /pressure.*0\.2.*0\.7.*bar/i.test(lowerText) ||
          /pt.*0\.2.*0\.7.*bar/i.test(lowerText) ||
          /pressure.*between.*0\.2\s*-\s*0\.7/i.test(lowerText) ||
          /pressure.*between.*0\.2\s*and\s*0\.7/i.test(lowerText)
        ) {
          console.log("Optimal pressure query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/esr-optimal-pressure";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with optimal pressure${scopeText}:`,
                  widget: "optimalPressure",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching ESRs with optimal pressure:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the ESRs with optimal pressure data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Below Pressure - Use category data API
        // IMPORTANT: Only trigger if user ACTUALLY said "below"/"low" or the value < 0.2
        if (
          (lowerText.includes("below") && lowerText.includes("pressure")) ||
          (lowerText.includes("low") && lowerText.includes("pressure")) ||
          /pressure.*below.*0\.2/i.test(lowerText) ||
          /pt.*below.*0\.2/i.test(lowerText) ||
          /pressure.*<.*0\.2/i.test(lowerText) ||
          /pt.*<.*0\.2/i.test(lowerText) ||
          /pressure.*less.*than.*0\.2/i.test(lowerText) ||
          /pressure.*under.*0\.2/i.test(lowerText)
        ) {
          console.log("Below pressure query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/esr-below-pressure";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with below pressure${scopeText}:`,
                  widget: "belowPressure",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching ESRs with below pressure:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the ESRs with below pressure data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Above Pressure - Use category data API
        // IMPORTANT: Only trigger if user ACTUALLY said "above"/"high" or the value > 0.7
        if (
          (lowerText.includes("above") && lowerText.includes("pressure")) ||
          (lowerText.includes("high") && lowerText.includes("pressure")) ||
          /pressure.*above.*0\.7/i.test(lowerText) ||
          /pt.*above.*0\.7/i.test(lowerText) ||
          /pressure.*>.*0\.7/i.test(lowerText) ||
          /pt.*>.*0\.7/i.test(lowerText) ||
          /pressure.*more.*than.*0\.7/i.test(lowerText) ||
          /pressure.*over.*0\.7/i.test(lowerText)
        ) {
          console.log("Above pressure query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/esr-above-pressure";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with above pressure${scopeText}:`,
                  widget: "abovePressure",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching ESRs with above pressure:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the ESRs with above pressure data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Combined Chlorine Analysis - Show all chlorine data (Above + Optimal + Below)
        // IMPORTANT: Use lowerText (user's actual input) to determine if this is a generic chlorine query
        if (
          lowerText.includes("chlorine analysis") ||
          lowerText.includes("rca analysis") ||
          lowerText.includes("residual chlorine analysis") ||
          (lowerText.includes("chlorine") &&
            !lowerText.includes("above") &&
            !lowerText.includes("below") &&
            !lowerText.includes("optimal") &&
            !lowerText.includes("good") &&
            !lowerText.includes("high") &&
            !lowerText.includes("low") &&
            !lowerText.includes("excess")) ||
          (lowerText.includes("rca") &&
            !lowerText.includes("above") &&
            !lowerText.includes("below") &&
            !lowerText.includes("optimal"))
        ) {
          console.log("Combined chlorine analysis query detected");

          // Check if this is a scheme query first (to avoid misdetecting scheme names as villages)
          const isSchemeQuery =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws") ||
            lowerText.includes("scheme") ||
            /\b\d{6,}\b/.test(lowerText);

          // Extract village, region, and scheme from query if mentioned
          let detectedVillage = null;

          // Only detect villages if this is NOT a scheme query
          if (!isSchemeQuery) {
            const villagePatterns = [
              /(?:in|for|of)\s+(.+?)\s+village/i,
              /village\s+(.+)/i,
              /(bidgaon|tarodi|wadi|dhonkhed|pophali|chawarda|borgaon|ambodh|ajni|betkuchi|dhanegaon)\b/i,
            ];

            for (const pattern of villagePatterns) {
              const match = lowerText.match(pattern);
              if (
                match &&
                match[1] &&
                !match[1].includes("chlorine") &&
                !match[1].includes("analysis")
              ) {
                detectedVillage = match[1].trim();
                console.log(
                  `Detected village in chlorine query: "${detectedVillage}"`,
                );
                break;
              }
            }
          }

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;

          // First check for quoted scheme names
          const quotedMatch = lowerText.match(/["']([^"']+)["']/);
          if (quotedMatch) {
            detectedScheme = quotedMatch[1].trim();
            console.log(`Detected quoted scheme: "${detectedScheme}"`);
          } else {
            // Then check for explicit scheme patterns (more precise)
            const schemePatterns = [
              /scheme\s+id[:\s]+(\w+)/i, // "scheme id: XXX" or "scheme id XXX"
              /scheme[:\s]+([a-zA-Z0-9][a-zA-Z0-9\s-]+?(?:wss|rrwss|rws))/i, // "scheme: bidgaon tarodi wss"
              /(?:for|in)\s+scheme\s+([a-zA-Z0-9][a-zA-Z0-9\s-]+)/i, // "for scheme bidgaon tarodi"
              /(?:for|in)\s+([a-zA-Z0-9][a-zA-Z0-9\s-]+?(?:wss|rrwss|rws))/i, // "in bidgaon tarodi wss"
              /(?:for|in)\s+(\d{6,})/i, // "in 7940695" or "in 20027951" (6+ digits)
              /^(\d{6,})$/, // Plain scheme ID if query is just numbers (6+ digits)
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (
                match &&
                match[1] &&
                !match[1].includes("chlorine") &&
                !match[1].includes("analysis")
              ) {
                // Avoid capturing keywords
                detectedScheme = match[1].trim();
                console.log(`Detected scheme: "${detectedScheme}"`);
                break;
              }
            }
          }

          try {
            let apiUrl = `/api/category-data/chlorine/combined`;
            let scopeText = " across all regions";
            let selectedRegion = "all";
            let selectedScheme = "all";

            // Priority: village > scheme > region
            if (detectedVillage) {
              apiUrl += `?village=${encodeURIComponent(detectedVillage)}`;
              scopeText = ` for ${detectedVillage} village`;
              selectedScheme = detectedVillage; // Use selectedScheme field for village filtering
            } else if (detectedScheme) {
              apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
              scopeText = ` in ${detectedScheme} scheme`;
              selectedScheme = detectedScheme;
            } else if (detectedRegion) {
              const regionName =
                detectedRegion === "aurangabad"
                  ? "Aurangabad"
                  : detectedRegion.charAt(0).toUpperCase() +
                  detectedRegion.slice(1);
              apiUrl += `?region=${encodeURIComponent(regionName)}`;
              scopeText = ` in ${regionName} region`;
              selectedRegion = regionName;
            }

            console.log(`Fetching combined chlorine data from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            const combinedData = await response.json();

            if (response.ok && combinedData.data) {
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `📊 Complete chlorine analysis${scopeText}: ${combinedData.counts.total} total ESRs (Above: ${combinedData.counts.aboveOptimal}, Optimal: ${combinedData.counts.optimal}, Below: ${combinedData.counts.belowOptimal})`,
                  widget: "combine-chlorine-status",
                  combinedChlorineData: combinedData.data,
                  combinedChlorineCounts: combinedData.counts,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);
            } else {
              throw new Error("Failed to fetch combined chlorine data");
            }
          } catch (error) {
            console.error("Error fetching combined chlorine data:", error);
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "Sorry, I couldn't fetch the combined chlorine analysis data. Please try again.",
              },
            ]);
          }
          setLoading(false);
          return;
        }

        // Combined Pressure Analysis - Show all pressure data (Above + Optimal + Below)
        // IMPORTANT: Use lowerText (user's actual input) to determine if this is a generic pressure query
        if (
          lowerText.includes("pressure analysis") ||
          lowerText.includes("pressure data") ||
          lowerText.includes("pressure transmitter") ||
          (lowerText.includes("pressure") &&
            !lowerText.includes("above") &&
            !lowerText.includes("below") &&
            !lowerText.includes("optimal") &&
            !lowerText.includes("good") &&
            !lowerText.includes("high") &&
            !lowerText.includes("low")) ||
          (lowerText.includes("pt") &&
            !lowerText.includes("above") &&
            !lowerText.includes("below") &&
            !lowerText.includes("optimal"))
        ) {
          console.log("Combined pressure analysis query detected");

          // Check if this is a scheme query first (to avoid misdetecting scheme names as villages)
          const isSchemeQuery =
            lowerText.includes("wss") ||
            lowerText.includes("rrwss") ||
            lowerText.includes("rws") ||
            lowerText.includes("scheme") ||
            /\b\d{6,}\b/.test(lowerText);

          // Extract village, region, and scheme from query if mentioned
          let detectedVillage = null;

          // Only detect villages if this is NOT a scheme query
          if (!isSchemeQuery) {
            const villagePatterns = [
              /(?:in|for|of)\s+(.+?)\s+village/i,
              /village\s+(.+)/i,
              /(bidgaon|tarodi|wadi|dhonkhed|pophali|chawarda|borgaon|ambodh|ajni|betkuchi|dhanegaon)\b/i,
            ];

            for (const pattern of villagePatterns) {
              const match = lowerText.match(pattern);
              if (
                match &&
                match[1] &&
                !match[1].includes("pressure") &&
                !match[1].includes("analysis")
              ) {
                detectedVillage = match[1].trim();
                console.log(
                  `Detected village in pressure query: "${detectedVillage}"`,
                );
                break;
              }
            }
          }

          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let detectedScheme = null;

          // First check for quoted scheme names
          const quotedMatch = lowerText.match(/["']([^"']+)["']/);
          if (quotedMatch) {
            detectedScheme = quotedMatch[1].trim();
            console.log(`Detected quoted scheme: "${detectedScheme}"`);
          } else {
            // Then check for explicit scheme patterns (more precise)
            const schemePatterns = [
              /scheme\s+id[:\s]+(\w+)/i, // "scheme id: XXX" or "scheme id XXX"
              /scheme[:\s]+([a-zA-Z0-9][a-zA-Z0-9\s-]+?(?:wss|rrwss|rws))/i, // "scheme: bidgaon tarodi wss"
              /(?:for|in)\s+scheme\s+([a-zA-Z0-9][a-zA-Z0-9\s-]+)/i, // "for scheme bidgaon tarodi"
              /(?:for|in)\s+([a-zA-Z0-9][a-zA-Z0-9\s-]+?(?:wss|rrwss|rws))/i, // "in bidgaon tarodi wss"
              /(?:for|in)\s+(\d{6,})/i, // "in 7940695" or "in 20027951" (6+ digits)
              /^(\d{6,})$/, // Plain scheme ID if query is just numbers (6+ digits)
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (
                match &&
                match[1] &&
                !match[1].includes("pressure") &&
                !match[1].includes("analysis")
              ) {
                // Avoid capturing keywords
                detectedScheme = match[1].trim();
                console.log(`Detected scheme: "${detectedScheme}"`);
                break;
              }
            }
          }

          try {
            let apiUrl = `/api/category-data/pressure/combined`;
            let scopeText = " across all regions";
            let selectedRegion = "all";
            let selectedScheme = "all";

            // Priority: village > scheme > region
            if (detectedVillage) {
              apiUrl += `?village=${encodeURIComponent(detectedVillage)}`;
              scopeText = ` for ${detectedVillage} village`;
              selectedScheme = detectedVillage; // Use selectedScheme field for village filtering
            } else if (detectedScheme) {
              apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
              scopeText = ` in ${detectedScheme} scheme`;
              selectedScheme = detectedScheme;
            } else if (detectedRegion) {
              const regionName =
                detectedRegion === "aurangabad"
                  ? "Aurangabad"
                  : detectedRegion.charAt(0).toUpperCase() +
                  detectedRegion.slice(1);
              apiUrl += `?region=${encodeURIComponent(regionName)}`;
              scopeText = ` in ${regionName} region`;
              selectedRegion = regionName;
            }

            console.log(`Fetching combined pressure data from: ${apiUrl}`);
            const response = await fetch(apiUrl);
            const combinedData = await response.json();

            if (response.ok && combinedData.data) {
              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `📊 Complete pressure analysis${scopeText}: ${combinedData.counts.total} total ESRs (Above: ${combinedData.counts.aboveOptimal}, Optimal: ${combinedData.counts.optimal}, Below: ${combinedData.counts.belowOptimal})`,
                  widget: "combine-pressure-status",
                  combinedPressureData: combinedData.data,
                  combinedPressureCounts: combinedData.counts,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);
            } else {
              throw new Error("Failed to fetch combined pressure data");
            }
          } catch (error) {
            console.error("Error fetching combined pressure data:", error);
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: "Sorry, I couldn't fetch the combined pressure analysis data. Please try again.",
              },
            ]);
          }
          setLoading(false);
          return;
        }

        // Optimal Chlorine - Use category data API
        // IMPORTANT: Only trigger if user ACTUALLY said "optimal" or the range 0.2-0.5
        // Don't trigger if OpenAI just interpreted "chlorine" as "optimal chlorine"
        if (
          (lowerText.includes("optimal") && lowerText.includes("chlorine")) ||
          (lowerText.includes("good") && lowerText.includes("chlorine")) ||
          /chlorine.*between.*0\.2.*0\.5/i.test(lowerText) ||
          /cl.*between.*0\.2.*0\.5/i.test(lowerText) ||
          /rca.*between.*0\.2.*0\.5/i.test(lowerText) ||
          /chlorine.*0\.2.*0\.5.*mg/i.test(lowerText) ||
          /cl.*0\.2.*0\.5.*mg/i.test(lowerText) ||
          /rca.*0\.2.*0\.5.*mg/i.test(lowerText) ||
          /chlorine.*between.*0\.2\s*-\s*0\.5/i.test(lowerText) ||
          /chlorine.*between.*0\.2\s*and\s*0\.5/i.test(lowerText)
        ) {
          console.log("Optimal chlorine query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/esr-optimal-chlorine";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with optimal chlorine${scopeText}:`,
                  widget: "optimalChlorine",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching ESRs with optimal chlorine:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the ESRs with optimal chlorine data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Below Chlorine - Use category data API
        // IMPORTANT: Only trigger if user ACTUALLY said "below"/"low" or the value < 0.2
        if (
          (lowerText.includes("below") && lowerText.includes("chlorine")) ||
          (lowerText.includes("low") && lowerText.includes("chlorine")) ||
          /chlorine.*below.*0\.2/i.test(lowerText) ||
          /cl.*below.*0\.2/i.test(lowerText) ||
          /rca.*below.*0\.2/i.test(lowerText) ||
          /chlorine.*<.*0\.2/i.test(lowerText) ||
          /cl.*<.*0\.2/i.test(lowerText) ||
          /rca.*<.*0\.2/i.test(lowerText) ||
          /chlorine.*less.*than.*0\.2/i.test(lowerText) ||
          /chlorine.*under.*0\.2/i.test(lowerText)
        ) {
          console.log("Below chlorine query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/esr-below-chlorine";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with below chlorine${scopeText}:`,
                  widget: "belowChlorine",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching ESRs with below chlorine:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the ESRs with below chlorine data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // Above Chlorine - Use category data API
        // IMPORTANT: Only trigger if user ACTUALLY said "above"/"high"/"excess" or the value > 0.5
        if (
          (lowerText.includes("above") && lowerText.includes("chlorine")) ||
          (lowerText.includes("high") && lowerText.includes("chlorine")) ||
          (lowerText.includes("excess") && lowerText.includes("chlorine")) ||
          /chlorine.*above.*0\.5/i.test(lowerText) ||
          /cl.*above.*0\.5/i.test(lowerText) ||
          /rca.*above.*0\.5/i.test(lowerText) ||
          /chlorine.*>.*0\.5/i.test(lowerText) ||
          /cl.*>.*0\.5/i.test(lowerText) ||
          /rca.*>.*0\.5/i.test(lowerText) ||
          /chlorine.*more.*than.*0\.5/i.test(lowerText) ||
          /chlorine.*over.*0\.5/i.test(lowerText)
        ) {
          console.log("Above chlorine query detected");

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          // Extract scheme from query if mentioned
          let detectedScheme = null;
          if (!detectedRegion) {
            const schemePatterns = [
              /in (.+?)(?:\s+region\s*|\s*$)/i,
              /(?:in|for|from)\s+(.+?)(?:\s+scheme|\s+wss|\s+rrwss|\s+rws)/i,
              /(?:scheme|wss|rrwss|rws).*?(\d+\s+villages?.*?)(?:\s|$)/i,
              /(\d+\s+villages?.*?(?:wss|rrwss|rws))/i,
            ];

            for (const pattern of schemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const candidateScheme = match[1].trim();
                const isRegionName = regions.some((region) =>
                  candidateScheme.toLowerCase().includes(region.toLowerCase()),
                );
                if (!isRegionName && candidateScheme.length > 2) {
                  detectedScheme = candidateScheme;
                  console.log(
                    `Detected scheme: "${detectedScheme}" using pattern: ${pattern}`,
                  );
                  break;
                }
              }
            }
          }

          let apiUrl = "/api/category-data/esr-above-chlorine";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let selectedScheme = "all";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `?region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          } else if (detectedScheme) {
            apiUrl += `?schemeId=${encodeURIComponent(detectedScheme)}`;
            scopeText = ` in ${detectedScheme} scheme`;
            selectedScheme = detectedScheme;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const esrs = await response.json();

              setChatMessages((prev) => [
                ...prev,
                {
                  type: "bot",
                  text: `Here are the ESRs with above chlorine${scopeText}:`,
                  widget: "aboveChlorine",
                  esrs: esrs,
                  selectedRegion: selectedRegion,
                  selectedScheme: selectedScheme,
                },
              ]);

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching ESRs with above chlorine:", error);
          }

          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: "Sorry, I couldn't fetch the ESRs with above chlorine data. Please try again.",
            },
          ]);
          setLoading(false);
          return;
        }

        // 6. Partial/In Progress Schemes - Use reliable API endpoint
        if (
          processedText.includes("partial schemes") ||
          processedText.includes("in progress schemes")
        ) {
          console.log(
            "Partial/In Progress schemes query detected - using direct API",
          );

          // Extract region from query if mentioned
          const detectedRegion = regions.find((region) =>
            lowerText.includes(region.toLowerCase()),
          );

          let apiUrl = "/api/schemes?status=In Progress";
          let scopeText = " across all regions";
          let selectedRegion = "all";
          let schemeType = lowerText.includes("partial schemes")
            ? "partial"
            : "in progress";

          if (detectedRegion) {
            const regionName =
              detectedRegion === "aurangabad"
                ? "Chhatrapati Sambhajinagar"
                : detectedRegion
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

            apiUrl += `&region=${encodeURIComponent(regionName)}`;
            scopeText = ` in ${regionName} region`;
            selectedRegion = regionName;
          }

          try {
            const response = await fetch(apiUrl);

            if (response.ok) {
              const schemes = await response.json();

              // Add message with count
              const responseMessage = `I found ${schemes.length} ${schemeType} schemes${scopeText}.`;
              setChatMessages((prev) => [
                ...prev,
                { type: "bot", text: responseMessage },
              ]);

              // Add widget with schemes and download button
              if (schemes && schemes.length > 0) {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `Here are the ${schemeType} schemes${scopeText}:`,
                    widget: "partialSchemes",
                    schemes: schemes,
                    selectedRegion: selectedRegion,
                    schemeType: schemeType,
                  },
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: `No ${schemeType} schemes found${scopeText}.`,
                  },
                ]);
              }

              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error fetching partial/in progress schemes:", error);
          }

          // Fallback to simple message
          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: `Sorry, I couldn't fetch the ${schemeType} schemes. Please try again.`,
            },
          ]);
          setLoading(false);
          return;
        }

        // 7. Fully Completed Villages
        if (lowerText.includes("fully completed villages")) {
          console.log("Fully completed villages query detected");

          // Extract scheme name from query like "fully completed villages in bidgaon tarodi wss"
          const schemeMatch = lowerText.match(
            /fully completed villages in (.+)/,
          );
          if (schemeMatch) {
            let schemeName = schemeMatch[1].trim();

            try {
              // First, try to find the scheme by name
              const schemeResponse = await fetch("/api/schemes");
              const allSchemes = await schemeResponse.json();

              // Look for exact or partial match (case insensitive)
              let matchedScheme = allSchemes.find(
                (scheme: any) =>
                  scheme.scheme_name &&
                  scheme.scheme_name.toLowerCase() === schemeName,
              );

              // If no exact match, try partial match
              if (!matchedScheme) {
                matchedScheme = allSchemes.find(
                  (scheme: any) =>
                    scheme.scheme_name &&
                    scheme.scheme_name.toLowerCase().includes(schemeName),
                );
              }

              if (matchedScheme) {
                // Use water scheme data to get village information
                const waterSchemeResponse = await fetch(
                  "/api/water-scheme-data",
                );
                const waterSchemeData = await waterSchemeResponse.json();

                // Filter by scheme name to get villages for this scheme
                const schemeVillages = waterSchemeData.filter(
                  (item: any) =>
                    item.scheme_name &&
                    item.scheme_name.toLowerCase() ===
                    matchedScheme.scheme_name.toLowerCase(),
                );

                if (schemeVillages.length > 0) {
                  // Since we don't have direct village completion status, we'll show the scheme villages
                  // and infer completion based on the scheme's completion status
                  const uniqueVillages = Array.from(
                    new Set(
                      schemeVillages
                        .map((item: any) => item.village_name)
                        .filter(Boolean),
                    ),
                  );

                  if (uniqueVillages.length > 0) {
                    response = `📊 **Villages in ${matchedScheme.scheme_name}**: **${uniqueVillages.length}** villages\n\n`;
                    response += uniqueVillages
                      .map((village, i) => `${i + 1}. **${String(village)}**`)
                      .join("\n");
                    response += `\n\n💡 *Note: Showing all villages in this scheme. For detailed completion status of each village, please check the scheme details.*`;
                  } else {
                    response = `Found the scheme **${matchedScheme.scheme_name}** but no village data is available.`;
                  }
                } else {
                  response = `Found the scheme **${matchedScheme.scheme_name}** but no village data is available for this scheme.`;
                }
              } else {
                // Suggest similar scheme names
                const similarSchemes = allSchemes
                  .filter(
                    (scheme: any) =>
                      scheme.scheme_name &&
                      scheme.scheme_name
                        .toLowerCase()
                        .includes(schemeName.split(" ")[0]),
                  )
                  .slice(0, 5);

                if (similarSchemes.length > 0) {
                  response = `I couldn't find "${schemeName}" exactly. Did you mean one of these?\n\n`;
                  response += similarSchemes
                    .map(
                      (scheme: any, i: number) =>
                        `${i + 1}. **${scheme.scheme_name}**`,
                    )
                    .join("\n");
                  response += `\n\nType the exact scheme name to get village completion data.`;
                } else {
                  response = `I couldn't find any schemes matching "${schemeName}". Please check the scheme name and try again.`;
                }
              }
            } catch (error) {
              response =
                "Sorry, I couldn't fetch the village completion data. Please try again.";
            }
          } else {
            response =
              "Please specify a scheme name, for example: 'fully completed villages in Bidgaon Tarodi WSS'";
          }

          await displayStreamingResponse(response, false, 50);
          setLoading(false);
          return;
        }

        // PRIORITY 2: Check for region + excel download commands

        const hasExcelKeyword =
          processedText.includes("excel") || processedText.includes("export");
        const detectedRegion = regions.find((region) =>
          lowerText.includes(region),
        );

        if (hasExcelKeyword && detectedRegion) {
          console.log("Region + Excel command detected:", {
            detectedRegion,
            text: lowerText,
          });

          // Handle region + excel download directly
          const regionToUse =
            detectedRegion === "aurangabad"
              ? "Chhatrapati Sambhajinagar"
              : detectedRegion
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

          // Detect current page context (page validation removed - exports work from any page now)
          const currentPath = window.location.pathname;
          let pageType = "";
          let exportDescription = "";

          if (currentPath.includes("/lpcd")) {
            pageType = "lpcd";
            exportDescription = "Village LPCD data";
          } else if (currentPath.includes("/chlorine")) {
            pageType = "chlorine";
            exportDescription = "Chlorine monitoring data";
          } else if (currentPath.includes("/pressure")) {
            pageType = "pressure";
            exportDescription = "Pressure monitoring data";
          } else if (currentPath.includes("/water-consumption")) {
            pageType = "water-consumption";
            exportDescription = "Water consumption data";
          } else if (
            currentPath.includes("/scheme-lpcd") ||
            currentPath.includes("/SchemeLpcdPage")
          ) {
            pageType = "schemes";
            exportDescription = "Scheme LPCD data";
          } else if (currentPath.includes("/schemes")) {
            pageType = "schemes";
            exportDescription = "Scheme data";
          } else if (currentPath.includes("/communication")) {
            pageType = "communication";
            exportDescription = "Communication status data";
          } else {
            // Default to schemes if page not recognized
            pageType = "schemes";
            exportDescription = "data";
          }

          response = `Initiating Excel download for ${regionToUse} region ${exportDescription}...`;
          await displayStreamingResponse(response, false, 50);

          // Set the region filter first
          const regionFilterEvent = new CustomEvent("chatbot-region-filter", {
            detail: { region: regionToUse },
          });
          window.dispatchEvent(regionFilterEvent);

          // Wait a moment for the filter to apply, then trigger export
          setTimeout(() => {
            const exportEvent = new CustomEvent("chatbot-export-excel", {
              detail: {
                region: regionToUse,
                pageType: pageType,
              },
            });
            window.dispatchEvent(exportEvent);

            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: `✅ Excel export initiated for ${regionToUse} region ${exportDescription}. The download should start shortly.`,
              },
            ]);
          }, 1000);

          setLoading(false);
          return;
        }

        // PRIORITY 2: Check for general export intent (existing logic)
        const exportKeywords = [
          "export",
          "download",
          "excel",
          "csv",
          "save",
          "file",
          "export excel",
          "download excel",
          "save excel",
          "export to excel",
          "download to excel",
          "export data",
          "download data",
          "save data",
          "export file",
          "download file",
        ];

        const isExportIntent = exportKeywords.some((keyword) =>
          lowerText.includes(keyword),
        );

        if (isExportIntent) {
          console.log("Export intent detected, triggering export...");

          // Determine current page context
          const currentPath = window.location.pathname;
          let pageType = "unknown";

          if (currentPath.includes("/chlorine")) {
            pageType = "chlorine";
          } else if (currentPath.includes("/pressure")) {
            pageType = "pressure";
          } else if (currentPath.includes("/water-consumption")) {
            pageType = "water-consumption";
          } else if (
            currentPath.includes("/lpcd") ||
            currentPath.includes("/LpcdPage")
          ) {
            pageType = "lpcd";
          } else if (
            currentPath.includes("/scheme-lpcd") ||
            currentPath.includes("/SchemeLpcdPage")
          ) {
            pageType = "schemes"; // This will match the scheme LPCD dashboard logic
          } else if (currentPath.includes("/schemes")) {
            pageType = "schemes";
          } else if (currentPath.includes("/communication")) {
            pageType = "communication";
          } else if (
            currentPath === "/" ||
            currentPath.includes("/dashboard")
          ) {
            pageType = "dashboard";
          }

          response = `I'll export the data from this ${pageType} page for you right away!`;

          // Trigger export after a short delay to show the message first
          setTimeout(() => {
            // Dispatch the chatbot export event instead of using triggerExcelExport
            const exportEvent = new CustomEvent("chatbot-export-excel", {
              detail: {
                pageType: pageType,
              },
            });
            window.dispatchEvent(exportEvent);
          }, 500);

          // Add bot response and exit early
          await displayStreamingResponse(response, false, 50);
          setLoading(false);
          return;
        }

        // PRIORITY 3: ENHANCED NLP KEYWORD DETECTION FOR WATER SCHEME CATEGORIES
        // Use intelligent parsing with fuzzy matching and entity extraction
        try {
          console.log("🧠 Starting enhanced NLP parsing for query:", text);

          // Fetch available regions and schemes for entity extraction
          const { regions, schemes } = await fetchDataForParsing();
          console.log("📊 Available data for parsing:", {
            regions: regions.length,
            schemes: schemes.length,
          });

          // Parse the query using enhanced NLP
          const parsedQuery: ParsedQuery = await parseQuery(
            text,
            regions,
            schemes,
          );
          console.log("🔍 NLP parsing result:", parsedQuery);

          // Check if we found a high-confidence keyword match
          if (parsedQuery.keyword && parsedQuery.confidenceScore > 0.6) {
            console.log(
              `✅ High confidence keyword match: "${parsedQuery.keyword
              }" (${parsedQuery.confidenceScore.toFixed(2)})`,
            );

            // Map keywords to API categories
            const keywordMap: Record<string, string> = {
              "Villages with Water": "villages-with-water",
              "Villages No Water": "villages-no-water",
              "Consistent Water": "villages-consistent-water",
              "Consistent Zero": "villages-consistent-zero-water",
              "Above 55 LPCD": "villages-above-55-lpcd",
              "Below 55 LPCD": "villages-below-55-lpcd",
              "Consistent Above 55": "villages-consistently-above-55-lpcd",
              "Consistent Below 55": "villages-consistently-below-55-lpcd",
              "Optimal Chlorine": "esr-optimal-chlorine",
              "Below Chlorine": "esr-below-chlorine",
              "Above Chlorine": "esr-above-chlorine",
              "Optimal Pressure": "esr-optimal-pressure",
              "Below Pressure": "esr-below-pressure",
              "Above Pressure": "esr-above-pressure",
            };

            const category = keywordMap[parsedQuery.keyword];
            if (category) {
              // Handle region or scheme-specific queries
              if (
                parsedQuery.scopeType === "region" &&
                parsedQuery.scopeValue
              ) {
                const regionName = parsedQuery.scopeValue as string;
                console.log(
                  `🎯 Region-specific query detected: ${category} for region ${regionName}`,
                );

                try {
                  // Use the correct category-data API endpoint with region parameter
                  const apiResponse = await fetch(
                    `/api/category-data/${category}?region=${encodeURIComponent(
                      regionName,
                    )}`,
                  );
                  if (apiResponse.ok) {
                    const data = await apiResponse.json();

                    // Check if data is too large and suggest dashboard navigation with pagination
                    if (data.length > 20) {
                      let dashboardSuggestion = "";
                      if (category.includes("pressure")) {
                        dashboardSuggestion =
                          "\n\n💡 **For better visualization, navigate to the [Pressure Dashboard](/pressure?region=" +
                          encodeURIComponent(regionName) +
                          ")** to explore the data interactively.";
                      } else if (category.includes("chlorine")) {
                        dashboardSuggestion =
                          "\n\n💡 **For better visualization, navigate to the [Chlorine Dashboard](/chlorine?region=" +
                          encodeURIComponent(regionName) +
                          ")** to explore the data interactively.";
                      } else if (category.includes("villages-")) {
                        dashboardSuggestion =
                          "\n\n💡 **For better visualization, navigate to the [Village LPCD Dashboard](/village-lpcd?region=" +
                          encodeURIComponent(regionName) +
                          ")** to explore the data interactively.";
                      }

                      // Show first 20 results with pagination message
                      const displayData = data.slice(0, 20);
                      let list = "";

                      if (category.startsWith("villages-")) {
                        list = displayData
                          .map((item: any, i: number) => {
                            const schemeName =
                              item.scheme_name || "Unknown Scheme";
                            const villageName =
                              item.village_name ||
                              item.name ||
                              "Unknown Village";
                            if (category.includes("lpcd")) {
                              const lpcdValue = item.lpcd_value_day7
                                ? `${parseFloat(item.lpcd_value_day7).toFixed(
                                  1,
                                )} LPCD`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${lpcdValue}`;
                            } else {
                              const waterValue = item.water_value_day7
                                ? `${parseFloat(item.water_value_day7).toFixed(
                                  2,
                                )} LL`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${waterValue}`;
                            }
                          })
                          .join("\n");
                      } else if (category.startsWith("esr-")) {
                        list = displayData
                          .map((item: any, i: number) => {
                            const schemeName =
                              item.scheme_name || "Unknown Scheme";
                            const villageName =
                              item.village_name || "Unknown Village";
                            const esrName =
                              item.esr_name || item.name || "Unknown ESR";
                            if (category.includes("chlorine")) {
                              const chlorineValue = item.chlorine_value_7
                                ? `${parseFloat(item.chlorine_value_7).toFixed(
                                  3,
                                )} mg/L`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${chlorineValue}`;
                            } else if (category.includes("pressure")) {
                              const pressureValue = item.pressure_value_7
                                ? `${parseFloat(item.pressure_value_7).toFixed(
                                  2,
                                )} bar`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${pressureValue}`;
                            }
                            return `${i + 1
                              }. **${schemeName}** - ${villageName} - ${esrName}`;
                          })
                          .join("\n");
                      }

                      response = `🎯 **${parsedQuery.keyword
                        } in ${regionName}:**\n\n📋 **Showing first 20 of ${data.length
                        } results:**\n${list || "No data available"
                        }${dashboardSuggestion}`;
                    } else {
                      // Format response based on category type with improved format
                      if (category.startsWith("villages-")) {
                        const list = data
                          .map((item: any, i: number) => {
                            const schemeName =
                              item.scheme_name || "Unknown Scheme";
                            const villageName =
                              item.village_name ||
                              item.name ||
                              "Unknown Village";
                            if (category.includes("lpcd")) {
                              const lpcdValue = item.lpcd_value_day7
                                ? `${parseFloat(item.lpcd_value_day7).toFixed(
                                  1,
                                )} LPCD`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${lpcdValue}`;
                            } else {
                              const waterValue = item.water_value_day7
                                ? `${parseFloat(item.water_value_day7).toFixed(
                                  2,
                                )} LL`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${waterValue}`;
                            }
                          })
                          .join("\n");
                        response = `🎯 **${parsedQuery.keyword
                          } in ${regionName} (${data.length}):**\n${list || "No data available"
                          }`;
                      } else if (category.startsWith("esr-")) {
                        const list = data
                          .map((item: any, i: number) => {
                            const schemeName =
                              item.scheme_name || "Unknown Scheme";
                            const villageName =
                              item.village_name || "Unknown Village";
                            const esrName =
                              item.esr_name || item.name || "Unknown ESR";
                            if (category.includes("chlorine")) {
                              const chlorineValue = item.chlorine_value_7
                                ? `${parseFloat(item.chlorine_value_7).toFixed(
                                  3,
                                )} mg/L`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${chlorineValue}`;
                            } else if (category.includes("pressure")) {
                              const pressureValue = item.pressure_value_7
                                ? `${parseFloat(item.pressure_value_7).toFixed(
                                  2,
                                )} bar`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${pressureValue}`;
                            }
                            return `${i + 1
                              }. **${schemeName}** - ${villageName} - ${esrName}`;
                          })
                          .join("\n");
                        response = `🎯 **${parsedQuery.keyword
                          } in ${regionName} (${data.length}):**\n${list || "No data available"
                          }`;
                      }
                    }

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: response, autoSpeak: fromVoice },
                    ]);
                    setLoading(false);
                    return;
                  }
                } catch (error) {
                  console.error("Error fetching region-specific data:", error);
                }
              } else if (
                parsedQuery.scopeType === "scheme" &&
                parsedQuery.scopeValue
              ) {
                const scheme = parsedQuery.scopeValue as {
                  id: string;
                  name: string;
                };
                console.log(
                  `🎯 Scheme-specific query detected: ${category} for scheme ${scheme.id}`,
                );

                try {
                  // Use the correct category-data API endpoint with schemeId parameter
                  const apiResponse = await fetch(
                    `/api/category-data/${category}?schemeId=${encodeURIComponent(
                      scheme.id,
                    )}`,
                  );
                  if (apiResponse.ok) {
                    const data = await apiResponse.json();

                    // Check if data is too large and suggest dashboard navigation
                    if (data.length > 20) {
                      let dashboardSuggestion = "";
                      if (category.includes("pressure")) {
                        dashboardSuggestion =
                          "\n\n💡 **For better visualization, navigate to the [Pressure Dashboard](/pressure)** and filter by this scheme to explore the data interactively.";
                      } else if (category.includes("chlorine")) {
                        dashboardSuggestion =
                          "\n\n💡 **For better visualization, navigate to the [Chlorine Dashboard](/chlorine)** and filter by this scheme to explore the data interactively.";
                      } else if (category.includes("villages-")) {
                        dashboardSuggestion =
                          "\n\n💡 **For better visualization, navigate to the [Village LPCD Dashboard](/village-lpcd)** and filter by this scheme to explore the data interactively.";
                      }

                      // Show first 20 results with pagination message
                      const displayData = data.slice(0, 20);
                      let list = "";

                      if (category.startsWith("villages-")) {
                        list = displayData
                          .map((item: any, i: number) => {
                            const schemeName = item.scheme_name || scheme.name;
                            const villageName =
                              item.village_name ||
                              item.name ||
                              "Unknown Village";
                            if (category.includes("lpcd")) {
                              const lpcdValue = item.lpcd_value_day7
                                ? `${parseFloat(item.lpcd_value_day7).toFixed(
                                  1,
                                )} LPCD`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${lpcdValue}`;
                            } else {
                              const waterValue = item.water_value_day7
                                ? `${parseFloat(item.water_value_day7).toFixed(
                                  2,
                                )} LL`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${waterValue}`;
                            }
                          })
                          .join("\n");
                      } else if (category.startsWith("esr-")) {
                        list = displayData
                          .map((item: any, i: number) => {
                            const schemeName = item.scheme_name || scheme.name;
                            const villageName =
                              item.village_name || "Unknown Village";
                            const esrName =
                              item.esr_name || item.name || "Unknown ESR";
                            if (category.includes("chlorine")) {
                              const chlorineValue = item.chlorine_value_7
                                ? `${parseFloat(item.chlorine_value_7).toFixed(
                                  3,
                                )} mg/L`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${chlorineValue}`;
                            } else if (category.includes("pressure")) {
                              const pressureValue = item.pressure_value_7
                                ? `${parseFloat(item.pressure_value_7).toFixed(
                                  2,
                                )} bar`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${pressureValue}`;
                            }
                            return `${i + 1
                              }. **${schemeName}** - ${villageName} - ${esrName}`;
                          })
                          .join("\n");
                      }

                      response = `🎯 **${parsedQuery.keyword} in ${scheme.name
                        }:**\n\n📋 **Showing first 20 of ${data.length
                        } results:**\n${list || "No data available"
                        }${dashboardSuggestion}`;
                    } else {
                      // Format response based on category type with improved format
                      if (category.startsWith("villages-")) {
                        const list = data
                          .map((item: any, i: number) => {
                            const schemeName = item.scheme_name || scheme.name;
                            const villageName =
                              item.village_name ||
                              item.name ||
                              "Unknown Village";
                            if (category.includes("lpcd")) {
                              const lpcdValue = item.lpcd_value_day7
                                ? `${parseFloat(item.lpcd_value_day7).toFixed(
                                  1,
                                )} LPCD`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${lpcdValue}`;
                            } else {
                              const waterValue = item.water_value_day7
                                ? `${parseFloat(item.water_value_day7).toFixed(
                                  2,
                                )} LL`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${waterValue}`;
                            }
                          })
                          .join("\n");
                        response = `🎯 **${parsedQuery.keyword} in ${scheme.name
                          } (${data.length}):**\n${list || "No data available"}`;
                      } else if (category.startsWith("esr-")) {
                        const list = data
                          .map((item: any, i: number) => {
                            const schemeName = item.scheme_name || scheme.name;
                            const villageName =
                              item.village_name || "Unknown Village";
                            const esrName =
                              item.esr_name || item.name || "Unknown ESR";
                            if (category.includes("chlorine")) {
                              const chlorineValue = item.chlorine_value_7
                                ? `${parseFloat(item.chlorine_value_7).toFixed(
                                  3,
                                )} mg/L`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${chlorineValue}`;
                            } else if (category.includes("pressure")) {
                              const pressureValue = item.pressure_value_7
                                ? `${parseFloat(item.pressure_value_7).toFixed(
                                  2,
                                )} bar`
                                : "N/A";
                              return `${i + 1
                                }. **${schemeName}** - ${villageName} - ${esrName} - ${pressureValue}`;
                            }
                            return `${i + 1
                              }. **${schemeName}** - ${villageName} - ${esrName}`;
                          })
                          .join("\n");
                        response = `🎯 **${parsedQuery.keyword} in ${scheme.name
                          } (${data.length}):**\n${list || "No data available"}`;
                      }
                    }

                    setChatMessages((prev) => [
                      ...prev,
                      { type: "bot", text: response, autoSpeak: fromVoice },
                    ]);
                    setLoading(false);
                    return;
                  }
                } catch (error) {
                  console.error("Error fetching scheme-specific data:", error);
                }
              } else {
                // Global query - check for existing functionality
                console.log(`🌍 Global query detected: ${category}`);
                // Let this fall through to existing detection logic for global queries
              }
            }
          }

          // If NLP parsing didn't provide a strong match, fall back to existing detection
          console.log("📝 Falling back to existing keyword detection...");
        } catch (error) {
          console.error("❌ Error in NLP parsing:", error);
          console.log("📝 Using fallback keyword detection...");
        }

        // OPENAI FALLBACK: Call OpenAI for complex queries before simple keyword detection
        console.log("🤖 Attempting OpenAI analysis for complex query...");
        try {
          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: text,
              systemMessage:
                'You are a water infrastructure management assistant. Analyze the user\'s query and determine the appropriate category from: villages-with-water, villages-no-water, villages-consistent-water, villages-consistent-zero-water, villages-above-55-lpcd, villages-below-55-lpcd, villages-consistently-above-55-lpcd, villages-consistently-below-55-lpcd, esr-optimal-chlorine, esr-below-chlorine, esr-above-chlorine, esr-optimal-pressure, esr-below-pressure, esr-above-pressure. Also extract region or scheme if mentioned. Respond in JSON format: {"category": "category-name", "region": "region-name or null", "scheme": "scheme-name or null", "keyword": "descriptive keyword"}',
            }),
          });

          if (response.ok) {
            const aiResult = await response.json();
            console.log("🤖 OpenAI analysis result:", aiResult);

            // Parse the AI response
            let parsedAI;
            try {
              parsedAI =
                typeof aiResult.content === "string"
                  ? JSON.parse(aiResult.content)
                  : aiResult.content;
            } catch (parseError) {
              console.log(
                "Failed to parse AI response as JSON, using text response",
              );
              // Extract category from text response if JSON parsing fails
              const aiText = aiResult.content || aiResult.message || "";
              if (
                aiText.includes("consistent-water") ||
                aiText.includes("consistent water")
              ) {
                parsedAI = {
                  category: "villages-consistent-water",
                  keyword: "Villages with Consistent Water",
                };
              } else if (
                aiText.includes("villages-with-water") ||
                aiText.includes("villages with water")
              ) {
                parsedAI = {
                  category: "villages-with-water",
                  keyword: "Villages with Water",
                };
              }
            }

            if (parsedAI && parsedAI.category) {
              console.log("✅ OpenAI provided category:", parsedAI.category);

              // Extract region from original query if mentioned
              const detectedRegion = regions.find((region) =>
                lowerText.includes(region.toLowerCase()),
              );

              // Build API URL for the OpenAI-determined category
              let apiUrl = `/api/category-data/${parsedAI.category}`;
              let scopeText = " across all regions";
              let selectedRegion = "all";
              let selectedScheme = "all";

              if (detectedRegion) {
                const regionName =
                  detectedRegion === "aurangabad"
                    ? "Chhatrapati Sambhajinagar"
                    : detectedRegion
                      .split(" ")
                      .map(
                        (word) =>
                          word.charAt(0).toUpperCase() + word.slice(1),
                      )
                      .join(" ");

                apiUrl += `?region=${encodeURIComponent(regionName)}`;
                scopeText = ` in ${regionName} region`;
                selectedRegion = regionName;
              } else if (parsedAI.scheme) {
                apiUrl += `?schemeId=${encodeURIComponent(parsedAI.scheme)}`;
                scopeText = ` in ${parsedAI.scheme} scheme`;
                selectedScheme = parsedAI.scheme;
              }

              // Fetch data using OpenAI-determined category
              try {
                const categoryResponse = await fetch(apiUrl);
                if (categoryResponse.ok) {
                  const villages = await categoryResponse.json();

                  // Determine the appropriate widget based on category
                  let widget = "villagesWithWater"; // default
                  if (parsedAI.category.includes("consistent-water"))
                    widget = "consistentWater";
                  else if (parsedAI.category.includes("no-water"))
                    widget = "villagesNoWater";
                  else if (parsedAI.category.includes("consistent-zero"))
                    widget = "consistentZero";
                  else if (parsedAI.category.includes("above-55-lpcd"))
                    widget = "above55Lpcd";
                  else if (parsedAI.category.includes("below-55-lpcd"))
                    widget = "below55Lpcd";
                  else if (parsedAI.category.includes("consistently-above-55"))
                    widget = "consistentAbove55Lpcd";
                  else if (parsedAI.category.includes("consistently-below-55"))
                    widget = "consistentBelow55Lpcd";
                  else if (parsedAI.category.includes("optimal-chlorine"))
                    widget = "optimalChlorine";
                  else if (parsedAI.category.includes("optimal-pressure"))
                    widget = "optimalPressure";

                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "bot",
                      text: `Here are the ${parsedAI.keyword || parsedAI.category
                        }${scopeText}:`,
                      widget: widget,
                      villages: villages,
                      selectedRegion: selectedRegion,
                      selectedScheme: selectedScheme,
                    },
                  ]);

                  setLoading(false);
                  return;
                }
              } catch (apiError) {
                console.error(
                  "Error fetching OpenAI-determined category data:",
                  apiError,
                );
              }
            }
          }
        } catch (aiError) {
          console.error("🤖 OpenAI fallback failed:", aiError);
          console.log("📝 Proceeding to simple keyword detection...");
        }

        // FALLBACK: Detect specific keywords using existing logic
        const detectCategoryKeyword = (
          text: string,
        ): { keyword: string; category: string } | null => {
          const lowerText = text.toLowerCase();

          // Define keyword mappings to categories
          const keywordMap = {
            // Villages category
            "villages with water": "villages-with-water",
            "villages no water": "villages-no-water",
            "consistent water": "villages-consistent-water",
            "consistent zero": "villages-consistent-zero-water",
            "above 55 lpcd": "villages-above-55-lpcd",
            "below 55 lpcd": "villages-below-55-lpcd",
            "consistent above 55": "villages-consistently-above-55-lpcd",
            "consistent below 55": "villages-consistently-below-55-lpcd",
            "average above 55": "villages-average-lpcd-above-55",
            "average below 55": "villages-average-lpcd-below-55",

            // ESR/Sensors category
            "optimal chlorine": "esr-optimal-chlorine",
            "below chlorine": "esr-below-chlorine",
            "above chlorine": "esr-above-chlorine",
            "optimal pressure": "esr-optimal-pressure",
            "below pressure": "esr-below-pressure",
            "above pressure": "esr-above-pressure",
            "average optimal chlorine": "esr-average-chlorine-optimal",
            "average below chlorine": "esr-average-chlorine-below",
            "average above chlorine": "esr-average-chlorine-above",
            "average optimal pressure": "esr-average-pressure-optimal",
            "average below pressure": "esr-average-pressure-below",
            "average above pressure": "esr-average-pressure-above",
          };

          // Check for keyword matches (case-insensitive, allow partial matches)
          for (const [keyword, category] of Object.entries(keywordMap)) {
            if (lowerText.includes(keyword)) {
              return { keyword, category };
            }
          }

          return null;
        };

        const categoryKeyword = detectCategoryKeyword(text);

        if (categoryKeyword) {
          console.log(
            `Category keyword detected: ${categoryKeyword.keyword} -> ${categoryKeyword.category}`,
          );

          // Scope detection for category queries
          const detectScope = (
            text: string,
          ): { scope: "all" | "region" | "scheme"; identifier?: string } => {
            const lowerText = text.toLowerCase();

            // Check for scheme identification first
            const schemePatterns = [
              /(?:in\s+)?scheme\s+([A-Za-z0-9\s-]+)/i,
              /(?:in\s+)?([A-Za-z0-9\s-]+)\s+scheme/i,
              /\b(\d{5,})\b/g, // Numeric scheme IDs
            ];

            for (const pattern of schemePatterns) {
              const match = text.match(pattern);
              if (match) {
                return { scope: "scheme", identifier: match[1]?.trim() };
              }
            }

            // Enhanced scheme name detection - look for known scheme names even without "scheme" keyword
            const knownSchemePatterns = [
              // Bidgaon Tarodi and similar multi-word scheme names
              /\b(bidgaon\s+tarodi)\b/i,
              /\b([a-z]+\s+tarodi)\b/i,
              /\b(bidgaon\s+[a-z]+)\b/i,
              // Other common scheme name patterns
              /\b(\w+\s+\w+\s+wss)\b/i,
              /\b(\w+\s+wss)\b/i,
              // Village-based scheme patterns
              /\b(\d+\s+villages?\s+[a-z\s]+)\b/i,
              /\b([a-z]+\s+\d+\s+villages?)\b/i,
            ];

            for (const pattern of knownSchemePatterns) {
              const match = lowerText.match(pattern);
              if (match && match[1]) {
                const schemeName = match[1].trim();
                // Only consider it a scheme if it has at least 4 characters
                if (schemeName.length >= 4) {
                  return { scope: "scheme", identifier: schemeName };
                }
              }
            }

            // Check for region identification
            const regions = [
              "amravati",
              "nagpur",
              "chhatrapati sambhajinagar",
              "aurangabad",
              "nashik",
              "pune",
              "konkan",
            ];
            const detectedRegion = regions.find((region) =>
              lowerText.includes(region),
            );

            if (detectedRegion) {
              const regionName =
                detectedRegion === "aurangabad"
                  ? "Chhatrapati Sambhajinagar"
                  : detectedRegion
                    .split(" ")
                    .map(
                      (word) => word.charAt(0).toUpperCase() + word.slice(1),
                    )
                    .join(" ");
              return { scope: "region", identifier: regionName };
            }

            // Default to all regions
            return { scope: "all" };
          };

          const scope = detectScope(text);
          console.log(`Scope detected:`, scope);

          try {
            let apiEndpoint = "";
            let responseText = "";

            // Build API endpoint based on scope and category
            if (scope.scope === "scheme" && scope.identifier) {
              // Specific scheme query
              apiEndpoint = `/api/scheme-analysis/details/${encodeURIComponent(
                scope.identifier,
              )}/${categoryKeyword.category}`;
              responseText = `📊 **${categoryKeyword.keyword} in scheme ${scope.identifier}:**\n`;
            } else if (scope.scope === "region" && scope.identifier) {
              // Specific region query
              apiEndpoint = `/api/category-data/${categoryKeyword.category
                }?region=${encodeURIComponent(scope.identifier)}`;
              responseText = `📊 **${categoryKeyword.keyword} in ${scope.identifier} region:**\n`;
            } else {
              // All regions query
              apiEndpoint = `/api/category-data/${categoryKeyword.category}`;
              responseText = `📊 **${categoryKeyword.keyword} across all regions:**\n`;
            }

            console.log(`Making API call to: ${apiEndpoint}`);

            // Make API call
            const response = await fetch(apiEndpoint);

            if (!response.ok) {
              throw new Error(`API call failed: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Received data:`, data);

            // Format response based on category type
            if (data.length === 0) {
              responseText += "No data available for this query.";
            } else {
              // Limit to first 20 results for readability
              const limitedData = data.slice(0, 20);

              if (categoryKeyword.category.startsWith("villages-")) {
                // Villages data formatting
                const list = limitedData
                  .map((item: any, index: number) => {
                    const villageInfo =
                      item.village_name || item.name || "Unknown Village";
                    const value =
                      item.water_value_day7 ||
                      item.lpcd_value_day7 ||
                      item.value ||
                      "";
                    const unit = categoryKeyword.category.includes("lpcd")
                      ? " LPCD"
                      : categoryKeyword.category.includes("water")
                        ? " LL"
                        : "";
                    return `${index + 1}. ${villageInfo}${value ? ` - ${value}${unit}` : ""
                      }`;
                  })
                  .join("\n");

                responseText += `\n${list}`;
              } else {
                // ESR/Sensors data formatting
                const list = limitedData
                  .map((item: any, index: number) => {
                    const esrInfo = item.esr_name || item.name || "Unknown ESR";
                    const value =
                      item.chlorine_value_7 ||
                      item.pressure_value_7 ||
                      item.value ||
                      "";
                    const unit = categoryKeyword.category.includes("chlorine")
                      ? " mg/L"
                      : categoryKeyword.category.includes("pressure")
                        ? " bar"
                        : "";
                    return `${index + 1}. ${esrInfo}${value ? ` - ${value}${unit}` : ""
                      }`;
                  })
                  .join("\n");

                responseText += `\n${list}`;
              }

              if (data.length > 20) {
                responseText += `\n\n📋 Showing first 20 of ${data.length} results.`;
              }
            }

            // Add response and exit early
            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: responseText,
                autoSpeak: fromVoice,
              },
            ]);
            setLoading(false);
            return;
          } catch (error) {
            console.error("Error fetching category data:", error);

            // Provide helpful error message
            response = `Sorry, I couldn't fetch the "${categoryKeyword.keyword}" data right now. `;

            if (scope.scope === "scheme") {
              response += `Please check if scheme "${scope.identifier}" exists and try again.`;
            } else if (scope.scope === "region") {
              response += `Please verify the region name "${scope.identifier}" and try again.`;
            } else {
              response += `Please try again later or check your network connection.`;
            }

            setChatMessages((prev) => [
              ...prev,
              {
                type: "bot",
                text: response,
                autoSpeak: fromVoice,
              },
            ]);
            setLoading(false);
            return;
          }
        }

        // Extract region, status, and date range from query with enhanced detection
        const region = extractRegion(text);
        const statusFilters = extractStatus(text);
        const dateRange = extractDateRange(text);
        console.log(`Region extraction result for "${text}":`, region);
        console.log(`Status extraction result for "${text}":`, statusFilters);
        console.log(`Date range extraction result for "${text}":`, dateRange);

        // Extract scheme ID or name if present - try different pattern matches
        let schemeId = null;

        // Try pattern "in scheme X" or "scheme X"
        const schemeMatch1 = text.match(
          /(?:in\s+)?scheme\s+([A-Za-z0-9\s-]+)/i,
        );
        if (schemeMatch1) {
          schemeId = schemeMatch1[1].trim();
        }

        // Try pattern "in X scheme" or "X scheme"
        if (!schemeId) {
          const schemeMatch2 = text.match(
            /(?:in\s+)?([A-Za-z0-9\s-]+)\s+scheme/i,
          );
          if (schemeMatch2) {
            schemeId = schemeMatch2[1].trim();
          }
        }

        // Try direct numeric scheme ID
        if (!schemeId) {
          const schemeMatch3 = text.match(/\b(\d{5,})\b/);
          if (schemeMatch3) {
            schemeId = schemeMatch3[1].trim();
          }
        }

        // Try villages like "Bidgaon" or "Tarodi" mentioned in query
        if (!schemeId && !region) {
          const villageSchemeMatch = text.match(
            /\b(bidgaon|tarodi|in\s+\w+\s+village)\b/i,
          );
          if (villageSchemeMatch) {
            // This would need to be replaced with actual village-to-scheme mapping
            console.log(`Village keyword detected: ${villageSchemeMatch[0]}`);
            // For demo purposes, we'll use a placeholder schemeId for Bidgaon
            if (lowerText.includes("bidgaon")) {
              schemeId = "7890975"; // Example scheme ID for Bidgaon (should come from database)
            } else if (lowerText.includes("tarodi")) {
              schemeId = "9087653"; // Example scheme ID for Tarodi (should come from database)
            }
          }
        }

        if (schemeId) {
          console.log(`Detected scheme ID/name: ${schemeId}`);
        }

        // SELECTIVE SCHEME DETECTION - Only for explicit scheme queries
        const detectScheme = (
          message: string,
        ): { isScheme: boolean; identifier: string } => {
          const trimmed = message.trim().toLowerCase();

          // Only trigger scheme detection for explicit scheme-related queries
          const explicitSchemeIndicators = [
            // Direct scheme mentions with "scheme" keyword
            /\bscheme\b/i,
            // Water supply system abbreviations
            /\b(wss|rwss|rrwss)\b/i,
            // Specific scheme names we know exist (like Bidgaon, Tarodi)
            /\b(bidgaon|tarodi)\b/i,
            // Numeric scheme IDs (7+ digits)
            /\b\d{7,}\b/,
            // Queries explicitly asking for scheme information
            /\b(scheme\s+id|scheme\s+name|scheme\s+analysis|analyze\s+scheme)\b/i,
            // Explicit scheme information requests
            /\b(information\s+about\s+\w+\s+(scheme|wss))\b/i,
            /\b(details\s+of\s+\w+\s+(scheme|wss))\b/i,
          ];

          // Check if this query has explicit scheme indicators
          const hasSchemeIndicator = explicitSchemeIndicators.some((pattern) =>
            pattern.test(trimmed),
          );

          if (!hasSchemeIndicator) {
            // This is not a scheme query - let it go to OpenAI
            return { isScheme: false, identifier: "" };
          }

          // If we have explicit scheme indicators, extract the scheme identifier
          const schemeExtractionPatterns = [
            // Direct scheme mentions
            /scheme\s+([A-Za-z0-9\-_\s]+?)(?:\s|$|[.,!?])/i,
            /([A-Za-z0-9\-_\s]+?)\s+(scheme|wss|rwss|rrwss)(?:\s|$|[.,!?])/i,
            /scheme\s+id[:\s]*([A-Za-z0-9\-_\s]+?)(?:\s|$|[.,!?])/i,

            // Specific known scheme names
            /\b(bidgaon[^.]*(?:tarodi|wss)?[^.]*)\b/i,
            /\b(tarodi[^.]*(?:bidgaon|wss)?[^.]*)\b/i,

            // Numeric scheme IDs
            /\b(\d{7,})\b/,

            // Information requests about specific schemes
            /(?:information|details|analyze|analysis)\s+(?:about|of|for)\s+([A-Za-z0-9\-_\s]+?)(?:\s|$|[.,!?])/i,
          ];

          for (const pattern of schemeExtractionPatterns) {
            const match = trimmed.match(pattern);
            if (match && match[1]) {
              const identifier = match[1].trim();
              if (identifier.length >= 3) {
                return { isScheme: true, identifier };
              }
            }
          }

          return { isScheme: false, identifier: "" };
        };

        // Fuzzy matching function for suggesting corrections
        const calculateSimilarity = (str1: string, str2: string): number => {
          const s1 = str1.toLowerCase();
          const s2 = str2.toLowerCase();

          // Exact match
          if (s1 === s2) return 1.0;

          // Contains match
          if (s1.includes(s2) || s2.includes(s1)) return 0.8;

          // Simple Levenshtein distance approximation
          const maxLen = Math.max(s1.length, s2.length);
          const distance = levenshteinDistance(s1, s2);
          return Math.max(0, (maxLen - distance) / maxLen);
        };

        const levenshteinDistance = (str1: string, str2: string): number => {
          const matrix = [];
          for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
          }
          for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
          }
          for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
              if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1,
                  matrix[i][j - 1] + 1,
                  matrix[i - 1][j] + 1,
                );
              }
            }
          }
          return matrix[str2.length][str1.length];
        };

        // Check for confirmation responses first (yes/no to suggestions)
        const isConfirmation =
          /^(yes|y|yeah|yep|sure|ok|okay|no|n|nope|nah)$/i.test(text.trim());
        const isYes = /^(yes|y|yeah|yep|sure|ok|okay)$/i.test(text.trim());

        // Check if there's a pending suggestion in the last bot message
        const lastBotMessage = messages
          .slice()
          .reverse()
          .find((msg) => msg.type === "bot");
        if (isConfirmation && lastBotMessage?.pendingSuggestion) {
          if (isYes) {
            // User confirmed the suggestion - analyze the suggested scheme
            const suggestedScheme = lastBotMessage.pendingSuggestion;
            response = `Great! Analyzing ${suggestedScheme.scheme_name}...`;

            try {
              const analysisResponse = await fetch(
                `/api/scheme-analysis/comprehensive/${encodeURIComponent(
                  suggestedScheme.scheme_id,
                )}`,
              );
              const analysisData = await analysisResponse.json();

              if (analysisData.error) {
                response = `Error: ${analysisData.error}`;
              } else {
                // Display comprehensive summary - same logic as before
                const {
                  scheme_information,
                  village_water_supply_data,
                  sensor_data,
                  village_completion_data,
                } = analysisData;

                const completionStatus =
                  scheme_information.completion_status || "Unknown";
                const villagesInScheme =
                  scheme_information.number_of_villages || 0;
                const villagesIntegrated =
                  scheme_information.villages_integrated || 0;
                const totalEsr = scheme_information.total_esr || 0;
                const esrIntegrated = scheme_information.esr_integrated || 0;

                let summary = `${scheme_information.scheme_name} (${scheme_information.scheme_id}) comes under Maharashtra Jeevan Pradhikaran and is one of the key Multi-Village Schemes aimed at providing safe and sustainable drinking water supply.\n\n`;
                summary += `The ${scheme_information.scheme_name} is currently **${completionStatus}**.\n`;
                summary += `It covers ${villagesInScheme} villages, out of which ${villagesIntegrated} villages have already been integrated.\n`;
                summary += `The scheme also includes ${totalEsr} ESRs, with ${esrIntegrated} fully integrated so far.\n`;
                summary += `Below is a detailed breakdown of water supply, LPCD levels, and sensor performance for this scheme.\n\n`;

                summary += `📊 **Comprehensive Analysis for ${scheme_information.scheme_name}**\n\n`;
                summary += `🏗️ **Scheme Information:**\n`;
                summary += `• Region: ${scheme_information.region}\n`;
                summary += `• Circle: ${scheme_information.circle}\n`;
                summary += `• Division: ${scheme_information.division}\n`;
                summary += `• Block: ${scheme_information.block}\n`;
                summary += `• Agency: ${scheme_information.agency || "null"}\n`;
                summary += `• Completion Status: ${completionStatus === "Fully Completed"
                  ? "✅ Fully Completed"
                  : "🔄 In Progress"
                  }\n`;
                summary += `• Functional Status: ${scheme_information.scheme_functional_status || "Unknown"
                  }\n`;
                summary += `• MJP Commissioned: ${scheme_information.mjp_commissioned || "Unknown"
                  }\n`;
                summary += `• MJP Fully Completed: ${scheme_information.mjp_fully_completed || "Unknown"
                  }\n\n`;

                // Continue with all the other sections...
                summary += `🏘️ **Village Infrastructure:**\n`;
                summary += `• Villages in Scheme: ${scheme_information.number_of_villages || 0
                  }\n`;
                summary += `• Villages Integrated: ${scheme_information.villages_integrated || 0
                  }\n`;
                summary += `• Functional Villages: ${scheme_information.functional_villages || 0
                  }\n`;
                summary += `• Fully Completed Villages: ${scheme_information.fully_completed_villages || 0
                  }\n`;
                summary += `• Partial Villages: ${scheme_information.partial_villages || 0
                  }\n`;
                summary += `• Non-functional Villages: ${scheme_information.non_functional_villages || 0
                  }\n\n`;

                summary += `🏗️ **ESR Infrastructure:**\n`;
                summary += `• Total ESRs: ${scheme_information.total_esr || 0
                  }\n`;
                summary += `• ESR Integrated: ${scheme_information.esr_integrated || 0
                  }\n`;
                summary += `• Fully Completed ESR: ${scheme_information.fully_completed_esr || 0
                  }\n`;
                summary += `• Balance ESR to Complete: ${scheme_information.balance_esr_to_complete || 0
                  }\n`;
                summary += `• Flow Meters: ${scheme_information.flow_meters_connected || 0
                  }\n`;
                summary += `• Chlorine Analyzers: ${scheme_information.chlorine_analyzers_connected || 0
                  }\n`;
                summary += `• Pressure Transmitters: ${scheme_information.pressure_transmitters_connected || 0
                  }\n\n`;

                summary += `💧 **Water Supply Analysis:**\n`;
                summary += `• Villages with Data: ${village_water_supply_data.total_villages_with_data || 0
                  }\n`;
                summary += `• Villages Receiving Water: **${village_water_supply_data.villages_receiving_water || 0
                  }**\n`;
                summary += `• Villages with No Water: **${village_water_supply_data.villages_with_no_water || 0
                  }**\n`;
                summary += `• Villages with Consistent Water: **${village_water_supply_data.villages_consistent_water_supply ||
                  0
                  }**\n`;
                summary += `• Villages with Consistent Zero Water: ${village_water_supply_data.villages_consistent_zero_water || 0
                  }\n`;
                summary += `• Villages Above 55 LPCD: **${village_water_supply_data.villages_above_55_lpcd || 0
                  }**\n`;
                summary += `• Villages Below 55 LPCD: **${village_water_supply_data.villages_below_55_lpcd || 0
                  }**\n`;
                summary += `• Villages Consistently Above 55 LPCD: ${village_water_supply_data.villages_consistently_above_55_lpcd ||
                  0
                  }\n`;
                summary += `• Villages Consistently Below 55 LPCD: ${village_water_supply_data.villages_consistently_below_55_lpcd ||
                  0
                  }\n`;
                summary += `• Total Population Covered: **${village_water_supply_data.total_population_covered?.toLocaleString() ||
                  0
                  }**\n`;
                summary += `• Average LPCD: **${village_water_supply_data.avg_lpcd_day7?.toFixed(2) || 0
                  }**\n\n`;

                summary += `🔬 **Sensor Performance Analysis:**\n`;
                summary += `**Chlorine Levels (Optimal: 0.2-0.5 mg/L):**\n`;
                summary += `• ESR with Optimal Chlorine: **${sensor_data.chlorine_sensors.optimal_range_0_2_to_0_5 || 0
                  }**\n`;
                summary += `• ESR Below Optimal: ${sensor_data.chlorine_sensors.below_range_less_than_0_2 || 0
                  }\n`;
                summary += `• ESR Above Optimal: ${sensor_data.chlorine_sensors.above_range_greater_than_0_5 || 0
                  }\n`;
                summary += `• ESR with Zero Readings: ${sensor_data.chlorine_sensors.zero_readings || 0
                  }\n`;
                summary += `• ESR Consistently Optimal: ${sensor_data.chlorine_sensors.consistent_optimal_range || 0
                  }\n`;
                summary += `• Average Chlorine Level: ${sensor_data.chlorine_sensors.avg_chlorine_day7?.toFixed(2) ||
                  0
                  } mg/L\n\n`;

                summary += `**Pressure Levels (Optimal: 0.2-0.7 bar):**\n`;
                summary += `• ESR with Optimal Pressure: **${sensor_data.pressure_sensors.optimal_range_0_2_to_0_7 || 0
                  }**\n`;
                summary += `• ESR Below Optimal: ${sensor_data.pressure_sensors.below_range_less_than_0_2 || 0
                  }\n`;
                summary += `• ESR Above Optimal: ${sensor_data.pressure_sensors.above_range_greater_than_0_7 || 0
                  }\n`;
                summary += `• ESR with Zero Readings: ${sensor_data.pressure_sensors.zero_readings || 0
                  }\n`;
                summary += `• ESR Consistently Optimal: ${sensor_data.pressure_sensors.consistent_optimal_range || 0
                  }\n`;
                summary += `• Average Pressure Level: ${sensor_data.pressure_sensors.avg_pressure_day7?.toFixed(2) ||
                  0
                  } bar\n\n`;

                summary += `📈 **Completion Summary:**\n`;
                summary += `• Total Villages in System: ${village_completion_data.total_villages_in_system || 0
                  }\n`;
                summary += `• Fully Completed Villages: ${village_completion_data.fully_completed_villages_count || 0
                  }\n`;
                summary += `• Partial Villages: ${village_completion_data.partial_villages_count || 0
                  }\n\n`;

                response = summary;

                // Add the summary first
                setChatMessages((prev) => [
                  ...prev,
                  {
                    type: "bot",
                    text: response,
                    autoSpeak: fromVoice,
                  },
                ]);

                // Then add the interactive buttons
                const schemeAnalysisMessage: ChatMessage = {
                  type: "bot",
                  text: "Click the buttons below to explore detailed data or export Excel reports:",
                  widget: "comprehensiveSchemeAnalysisOptions",
                  schemeAnalysis: analysisData,
                };
                setChatMessages((prev) => [...prev, schemeAnalysisMessage]);
                setLoading(false);
                return;
              }
            } catch (error) {
              console.error("Error analyzing suggested scheme:", error);
              response = `Sorry, I encountered an error while analyzing the suggested scheme. Please try again.`;
            }
          } else {
            // User declined the suggestion
            response =
              "No problem! Please try typing the scheme name or ID again, or try a different search.";
          }

          // Add messages and return
          setChatMessages((prev) => [
            ...prev,
            {
              type: "user",
              text: text,
              fromVoice: fromVoice,
            },
          ]);
          setChatMessages((prev) => [
            ...prev,
            {
              type: "bot",
              text: response,
              autoSpeak: fromVoice,
            },
          ]);
          setLoading(false);
          return;
        }

        // Check for infrastructure components with expanded keywords (moved up for global use)
        const hasFlowMeters =
          lowerText.includes("flow meter") ||
          lowerText.includes("flowmeter") ||
          lowerText.includes("flow-meter") ||
          lowerText.includes("flow") ||
          lowerText.match(/\bfm\b/i) !== null;

        const hasChlorineAnalyzers =
          lowerText.includes("chlorine") ||
          lowerText.includes("analyzer") ||
          lowerText.includes("analyser") ||
          lowerText.includes("rca") ||
          lowerText.includes("residual") ||
          lowerText.includes("chlorin");

        const hasPressureTransmitters =
          lowerText.includes("pressure") ||
          lowerText.includes("transmitter") ||
          lowerText.includes("pt") ||
          lowerText.includes("transmit");

        const hasESR =
          lowerText.includes("esr") ||
          lowerText.includes("reservoir") ||
          lowerText.includes("elevated") ||
          lowerText.includes("storage") ||
          lowerText.includes("tank");

        const hasVillages =
          lowerText.includes("village") ||
          lowerText.includes("settlement") ||
          lowerText.includes("gram") ||
          lowerText.includes("community");

        // Enhanced scheme detection
        const schemeDetection = detectScheme(text);

        // Fallback: if detected identifier is too short or missing key parts, use the full text
        let searchIdentifier = schemeDetection.identifier;
        const fullText = text.trim();

        // Check if the detected identifier is incomplete compared to the full text
        const needsFullText =
          schemeDetection.isScheme &&
          (searchIdentifier.length < 15 || // Too short
            !searchIdentifier.includes(
              fullText.split(" ").slice(-2).join(" "),
            ) || // Missing location info
            (fullText.includes("Ta.") && !searchIdentifier.includes("Ta."))); // Missing Taluka info

        if (needsFullText && fullText.length > searchIdentifier.length) {
          searchIdentifier = fullText;
          console.log(
            `Using full text as search identifier: "${searchIdentifier}" (detected was incomplete: "${schemeDetection.identifier}")`,
          );
        }

        if (schemeDetection.isScheme) {
          try {
            // First search for possible schemes
            const searchResponse = await fetch(
              `/api/scheme-analysis/search?query=${encodeURIComponent(
                searchIdentifier,
              )}`,
            );
            const searchResults = await searchResponse.json();

            if (searchResults.length === 0) {
              // FUZZY MATCHING: Try to find similar scheme names
              try {
                const allSchemesResponse = await fetch(
                  "/api/scheme-analysis/all-schemes",
                );
                if (allSchemesResponse.ok) {
                  const allSchemes = await allSchemesResponse.json();

                  // Find the best matches using fuzzy matching
                  const suggestions = allSchemes
                    .map((scheme: any) => ({
                      ...scheme,
                      similarity: Math.max(
                        calculateSimilarity(
                          searchIdentifier,
                          scheme.scheme_name,
                        ),
                        calculateSimilarity(searchIdentifier, scheme.scheme_id),
                      ),
                    }))
                    .filter((scheme: any) => scheme.similarity > 0.5) // Only good matches
                    .sort((a: any, b: any) => b.similarity - a.similarity)
                    .slice(0, 3); // Top 3 suggestions

                  if (suggestions.length > 0) {
                    const topMatch = suggestions[0];
                    if (topMatch.similarity > 0.7) {
                      // High confidence suggestion
                      response = `I couldn't find "${searchIdentifier}" exactly. Did you mean **${topMatch.scheme_name}**?\n\nType 'yes' to analyze this scheme, or try a different search.`;

                      // Store the suggestion for potential confirmation
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "user",
                          text: text,
                          fromVoice: fromVoice,
                        },
                      ]);

                      setChatMessages((prev) => [
                        ...prev,
                        {
                          type: "bot",
                          text: response,
                          pendingSuggestion: topMatch,
                          autoSpeak: fromVoice,
                        },
                      ]);
                      setLoading(false);
                      return;
                    } else {
                      // Multiple suggestions
                      response = `I couldn't find "${searchIdentifier}" exactly. Did you mean one of these?\n\n`;
                      suggestions.forEach((suggestion: any, index: number) => {
                        response += `${index + 1}. **${suggestion.scheme_name
                          }** (ID: ${suggestion.scheme_id})\n`;
                      });
                      response += `\nPlease type the exact scheme name or try a different search.`;
                    }
                  } else {
                    response = `I couldn't find any schemes matching "${searchIdentifier}". Please check the scheme name or ID and try again. You can try using partial names or scheme IDs.`;
                  }
                } else {
                  response = `I couldn't find any schemes matching "${searchIdentifier}". Please check the scheme name or ID and try again. You can try using partial names or scheme IDs.`;
                }
              } catch (error) {
                response = `I couldn't find any schemes matching "${searchIdentifier}". Please check the scheme name or ID and try again. You can try using partial names or scheme IDs.`;
              }
            } else if (searchResults.length > 1) {
              // Check if we have an exact match among the results
              const exactMatches = searchResults.filter(
                (scheme: any) =>
                  scheme.scheme_name.toLowerCase() ===
                  searchIdentifier.toLowerCase() ||
                  scheme.scheme_id.toLowerCase() ===
                  searchIdentifier.toLowerCase(),
              );

              if (exactMatches.length === 1) {
                // We have exactly one exact match - use it automatically
                const scheme = exactMatches[0];
                response = `Found exact match: "${scheme.scheme_name}". Fetching comprehensive analysis...`;

                const analysisResponse = await fetch(
                  `/api/scheme-analysis/comprehensive/${encodeURIComponent(
                    scheme.scheme_id,
                  )}`,
                );
                const analysisData = await analysisResponse.json();

                if (analysisData.error) {
                  response = `Error: ${analysisData.error}`;
                } else {
                  // Check if user is asking for specific infrastructure component data
                  const requestsSpecificData =
                    hasFlowMeters ||
                    hasChlorineAnalyzers ||
                    hasPressureTransmitters;
                  const isOnlyFlowMeters =
                    hasFlowMeters &&
                    !hasChlorineAnalyzers &&
                    !hasPressureTransmitters;
                  const isOnlyChlorine =
                    hasChlorineAnalyzers &&
                    !hasFlowMeters &&
                    !hasPressureTransmitters;
                  const isOnlyPressure =
                    hasPressureTransmitters &&
                    !hasFlowMeters &&
                    !hasChlorineAnalyzers;

                  const {
                    scheme_information,
                    village_water_supply_data,
                    sensor_data,
                    village_completion_data,
                  } = analysisData;

                  if (requestsSpecificData) {
                    // Provide focused response for specific infrastructure data
                    let specificResponse = `📊 **${scheme_information.scheme_name}** - `;

                    if (isOnlyFlowMeters) {
                      specificResponse += `Flow Meters Information:\n\n`;
                      specificResponse += `🔧 **Flow Meters Connected:** ${scheme_information.flow_meters_connected || 0
                        }\n`;
                      specificResponse += `📊 **Total ESRs in Scheme:** ${scheme_information.total_esr || 0
                        }\n`;
                      specificResponse += `💧 **Water Flow Monitoring Status:** ${scheme_information.flow_meters_connected > 0
                        ? "Active"
                        : "No active flow meters"
                        }\n`;
                      if (scheme_information.flow_meters_connected > 0) {
                        specificResponse += `🔄 **Coverage:** ${(
                          (scheme_information.flow_meters_connected /
                            scheme_information.total_esr) *
                          100
                        ).toFixed(1)}% of ESRs monitored\n`;
                      }
                    } else if (isOnlyChlorine) {
                      specificResponse += `Chlorine Analyzers Information:\n\n`;
                      specificResponse += `🧪 **Chlorine Analyzers Connected:** ${scheme_information.chlorine_analyzers_connected || 0
                        }\n`;
                      specificResponse += `📊 **Total ESRs in Scheme:** ${scheme_information.total_esr || 0
                        }\n`;
                      specificResponse += `🔬 **Water Quality Monitoring Status:** ${scheme_information.chlorine_analyzers_connected > 0
                        ? "Active"
                        : "No active chlorine analyzers"
                        }\n`;
                      if (scheme_information.chlorine_analyzers_connected > 0) {
                        specificResponse += `🔄 **Coverage:** ${(
                          (scheme_information.chlorine_analyzers_connected /
                            scheme_information.total_esr) *
                          100
                        ).toFixed(1)}% of ESRs monitored\n`;
                      }
                    } else if (isOnlyPressure) {
                      specificResponse += `Pressure Transmitters Information:\n\n`;
                      specificResponse += `📏 **Pressure Transmitters Connected:** ${scheme_information.pressure_transmitters_connected || 0
                        }\n`;
                      specificResponse += `📊 **Total ESRs in Scheme:** ${scheme_information.total_esr || 0
                        }\n`;
                      specificResponse += `🔧 **Pressure Monitoring Status:** ${scheme_information.pressure_transmitters_connected > 0
                        ? "Active"
                        : "No active pressure transmitters"
                        }\n`;
                      if (
                        scheme_information.pressure_transmitters_connected > 0
                      ) {
                        specificResponse += `🔄 **Coverage:** ${(
                          (scheme_information.pressure_transmitters_connected /
                            scheme_information.total_esr) *
                          100
                        ).toFixed(1)}% of ESRs monitored\n`;
                      }
                    } else {
                      // Multiple infrastructure types requested
                      specificResponse += `Infrastructure Summary:\n\n`;
                      if (hasFlowMeters)
                        specificResponse += `🔧 **Flow Meters:** ${scheme_information.flow_meters_connected || 0
                          }\n`;
                      if (hasChlorineAnalyzers)
                        specificResponse += `🧪 **Chlorine Analyzers:** ${scheme_information.chlorine_analyzers_connected || 0
                          }\n`;
                      if (hasPressureTransmitters)
                        specificResponse += `📏 **Pressure Transmitters:** ${scheme_information.pressure_transmitters_connected ||
                          0
                          }\n`;
                    }

                    response = specificResponse;
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        type: "bot",
                        text: response,
                        autoSpeak: fromVoice,
                      },
                    ]);
                    setLoading(false);
                    return;
                  }

                  // Display comprehensive summary with new data structure

                  // ADD SHORT INTRODUCTION FIRST as requested
                  const completionStatus =
                    scheme_information.completion_status || "Unknown";
                  const villagesInScheme =
                    scheme_information.number_of_villages || 0;
                  const villagesIntegrated =
                    scheme_information.villages_integrated || 0;
                  const totalEsr = scheme_information.total_esr || 0;
                  const esrIntegrated = scheme_information.esr_integrated || 0;

                  let summary = `${scheme_information.scheme_name} (${scheme_information.scheme_id}) comes under Maharashtra Jeevan Pradhikaran and is one of the key Multi-Village Schemes aimed at providing safe and sustainable drinking water supply.\n\n`;
                  summary += `The ${scheme_information.scheme_name} is currently **${completionStatus}**.\n`;
                  summary += `It covers ${villagesInScheme} villages, out of which ${villagesIntegrated} villages have already been integrated.\n`;
                  summary += `The scheme also includes ${totalEsr} ESRs, with ${esrIntegrated} fully integrated so far.\n`;
                  summary += `Below is a detailed breakdown of water supply, LPCD levels, and sensor performance for this scheme.\n\n`;

                  // Use the response for the comprehensive analysis message
                  setChatMessages((prev) => [
                    ...prev,
                    {
                      type: "user",
                      text: text,
                      fromVoice: fromVoice,
                    },
                  ]);

                  // Use streaming for consistent user experience
                  await addStreamedBotMessage(
                    {
                      text: `${summary}Click the buttons below to explore detailed data or export Excel reports:`,
                      widget: "comprehensiveSchemeAnalysisOptions",
                      schemeAnalysis: analysisData,
                      autoSpeak: fromVoice,
                    },
                    50, // 50ms delay for word-by-word streaming
                  );
                  setLoading(false);
                  return;
                }
              } else {
                // Multiple matches and no single exact match - show options
                response = `I found ${searchResults.length} schemes matching "${searchIdentifier}". Here are the options:\n\n`;

                const optionsList = searchResults
                  .map(
                    (scheme: any, index: number) =>
                      `${index + 1}. ${scheme.scheme_name} (ID: ${scheme.scheme_id
                      }) - ${scheme.region} Region - ${scheme.blocks_count
                      } block(s)`,
                  )
                  .join("\n");

                response +=
                  optionsList +
                  "\n\nPlease type the exact scheme name or ID from the list above for detailed analysis.";
              }
            } else {
              // Single result found - get comprehensive analysis
              const scheme = searchResults[0];
              response = `Found scheme: "${scheme.scheme_name}". Fetching comprehensive analysis...`;

              const analysisResponse = await fetch(
                `/api/scheme-analysis/comprehensive/${encodeURIComponent(
                  scheme.scheme_id,
                )}`,
              );
              const analysisData = await analysisResponse.json();

              if (analysisData.error) {
                response = `Error: ${analysisData.error}`;
              } else {
                // Check if user is asking for specific infrastructure component data
                const requestsSpecificData =
                  hasFlowMeters ||
                  hasChlorineAnalyzers ||
                  hasPressureTransmitters;
                const isOnlyFlowMeters =
                  hasFlowMeters &&
                  !hasChlorineAnalyzers &&
                  !hasPressureTransmitters;
                const isOnlyChlorine =
                  hasChlorineAnalyzers &&
                  !hasFlowMeters &&
                  !hasPressureTransmitters;
                const isOnlyPressure =
                  hasPressureTransmitters &&
                  !hasFlowMeters &&
                  !hasChlorineAnalyzers;

                const {
                  scheme_information,
                  village_water_supply_data,
                  sensor_data,
                  village_completion_data,
                } = analysisData;

                if (requestsSpecificData) {
                  // Provide focused response for specific infrastructure data
                  let specificResponse = `📊 **${scheme_information.scheme_name}** - `;

                  if (isOnlyFlowMeters) {
                    specificResponse += `Flow Meters Information:\n\n`;
                    specificResponse += `🔧 **Flow Meters Connected:** ${scheme_information.flow_meters_connected || 0
                      }\n`;
                    specificResponse += `📊 **Total ESRs in Scheme:** ${scheme_information.total_esr || 0
                      }\n`;
                    specificResponse += `💧 **Water Flow Monitoring Status:** ${scheme_information.flow_meters_connected > 0
                      ? "Active"
                      : "No active flow meters"
                      }\n`;
                    if (scheme_information.flow_meters_connected > 0) {
                      specificResponse += `🔄 **Coverage:** ${(
                        (scheme_information.flow_meters_connected /
                          scheme_information.total_esr) *
                        100
                      ).toFixed(1)}% of ESRs monitored\n`;
                    }
                  } else if (isOnlyChlorine) {
                    specificResponse += `Chlorine Analyzers Information:\n\n`;
                    specificResponse += `🧪 **Chlorine Analyzers Connected:** ${scheme_information.chlorine_analyzers_connected || 0
                      }\n`;
                    specificResponse += `📊 **Total ESRs in Scheme:** ${scheme_information.total_esr || 0
                      }\n`;
                    specificResponse += `🔬 **Water Quality Monitoring Status:** ${scheme_information.chlorine_analyzers_connected > 0
                      ? "Active"
                      : "No active chlorine analyzers"
                      }\n`;
                    if (scheme_information.chlorine_analyzers_connected > 0) {
                      specificResponse += `🔄 **Coverage:** ${(
                        (scheme_information.chlorine_analyzers_connected /
                          scheme_information.total_esr) *
                        100
                      ).toFixed(1)}% of ESRs monitored\n`;
                    }
                  } else if (isOnlyPressure) {
                    specificResponse += `Pressure Transmitters Information:\n\n`;
                    specificResponse += `📏 **Pressure Transmitters Connected:** ${scheme_information.pressure_transmitters_connected || 0
                      }\n`;
                    specificResponse += `📊 **Total ESRs in Scheme:** ${scheme_information.total_esr || 0
                      }\n`;
                    specificResponse += `🔧 **Pressure Monitoring Status:** ${scheme_information.pressure_transmitters_connected > 0
                      ? "Active"
                      : "No active pressure transmitters"
                      }\n`;
                    if (
                      scheme_information.pressure_transmitters_connected > 0
                    ) {
                      specificResponse += `🔄 **Coverage:** ${(
                        (scheme_information.pressure_transmitters_connected /
                          scheme_information.total_esr) *
                        100
                      ).toFixed(1)}% of ESRs monitored\n`;
                    }
                  } else {
                    // Multiple infrastructure types requested
                    specificResponse += `Infrastructure Summary:\n\n`;
                    if (hasFlowMeters)
                      specificResponse += `🔧 **Flow Meters:** ${scheme_information.flow_meters_connected || 0
                        }\n`;
                    if (hasChlorineAnalyzers)
                      specificResponse += `🧪 **Chlorine Analyzers:** ${scheme_information.chlorine_analyzers_connected || 0
                        }\n`;
                    if (hasPressureTransmitters)
                      specificResponse += `📏 **Pressure Transmitters:** ${scheme_information.pressure_transmitters_connected || 0
                        }\n`;
                  }

                  response = specificResponse;
                  // Use streaming for consistent user experience
                  await addStreamedBotMessage(
                    {
                      text: response,
                      autoSpeak: fromVoice,
                    },
                    50, // 50ms delay for word-by-word streaming
                  );
                  setLoading(false);
                  return;
                }

                // Display comprehensive summary with new data structure

                // ADD SHORT INTRODUCTION FIRST as requested
                const completionStatus =
                  scheme_information.completion_status || "Unknown";
                const villagesInScheme =
                  scheme_information.number_of_villages || 0;
                const villagesIntegrated =
                  scheme_information.villages_integrated || 0;
                const totalEsr = scheme_information.total_esr || 0;
                const esrIntegrated = scheme_information.esr_integrated || 0;

                let summary = `${scheme_information.scheme_name} (${scheme_information.scheme_id}) comes under Maharashtra Jeevan Pradhikaran and is one of the key Multi-Village Schemes aimed at providing safe and sustainable drinking water supply.\n\n`;
                summary += `The ${scheme_information.scheme_name} is currently **${completionStatus}**.\n`;
                summary += `It covers ${villagesInScheme} villages, out of which ${villagesIntegrated} villages have already been integrated.\n`;
                summary += `The scheme also includes ${totalEsr} ESRs, with ${esrIntegrated} fully integrated so far.\n`;
                summary += `Below is a detailed breakdown of water supply, LPCD levels, and sensor performance for this scheme.\n\n`;

                summary += `📊 **Comprehensive Analysis for ${scheme_information.scheme_name}**\n\n`;

                // Enhanced basic scheme information
                summary += `🏗️ **Scheme Information:**\n`;
                summary += `• Region: ${scheme_information.region}\n`;
                summary += `• Circle: ${scheme_information.circle}\n`;
                summary += `• Division: ${scheme_information.division}\n`;
                summary += `• Block: ${scheme_information.block}\n`;
                summary += `• Agency: ${scheme_information.agency || "null"}\n`;
                summary += `• Completion Status: ${completionStatus === "Fully Completed"
                  ? "✅ Fully Completed"
                  : "🔄 In Progress"
                  }\n`;
                summary += `• Functional Status: ${scheme_information.scheme_functional_status || "Unknown"
                  }\n`;
                summary += `• MJP Commissioned: ${scheme_information.mjp_commissioned || "Unknown"
                  }\n`;
                summary += `• MJP Fully Completed: ${scheme_information.mjp_fully_completed || "Unknown"
                  }\n\n`;

                // Village metrics summary
                summary += `🏘️ **Village Infrastructure:**\n`;
                summary += `• Villages in Scheme: ${scheme_information.number_of_villages || 0
                  }\n`;
                summary += `• Villages Integrated: ${scheme_information.villages_integrated || 0
                  }\n`;
                summary += `• Functional Villages: ${scheme_information.functional_villages || 0
                  }\n`;
                summary += `• Fully Completed Villages: ${scheme_information.fully_completed_villages || 0
                  }\n`;
                summary += `• Partial Villages: ${scheme_information.partial_villages || 0
                  }\n`;
                summary += `• Non-functional Villages: ${scheme_information.non_functional_villages || 0
                  }\n\n`;

                // ESR Infrastructure
                summary += `🏗️ **ESR Infrastructure:**\n`;
                summary += `• Total ESRs: ${scheme_information.total_esr || 0
                  }\n`;
                summary += `• ESR Integrated: ${scheme_information.esr_integrated || 0
                  }\n`;
                summary += `• Fully Completed ESR: ${scheme_information.fully_completed_esr || 0
                  }\n`;
                summary += `• Balance ESR to Complete: ${scheme_information.balance_esr_to_complete || 0
                  }\n`;
                summary += `• Flow Meters: ${scheme_information.flow_meters_connected || 0
                  }\n`;
                summary += `• Chlorine Analyzers: ${scheme_information.chlorine_analyzers_connected || 0
                  }\n`;
                summary += `• Pressure Transmitters: ${scheme_information.pressure_transmitters_connected || 0
                  }\n\n`;

                // Enhanced water supply analysis
                summary += `💧 **Water Supply Analysis:**\n`;
                summary += `• Villages with Data: ${village_water_supply_data.total_villages_with_data || 0
                  }\n`;
                summary += `• Villages Receiving Water: **${village_water_supply_data.villages_receiving_water || 0
                  }**\n`;
                summary += `• Villages with No Water: **${village_water_supply_data.villages_with_no_water || 0
                  }**\n`;
                summary += `• Villages with Consistent Water: **${village_water_supply_data.villages_consistent_water_supply ||
                  0
                  }**\n`;
                summary += `• Villages with Consistent Zero Water: ${village_water_supply_data.villages_consistent_zero_water || 0
                  }\n`;
                summary += `• Villages Above 55 LPCD: **${village_water_supply_data.villages_above_55_lpcd || 0
                  }**\n`;
                summary += `• Villages Below 55 LPCD: **${village_water_supply_data.villages_below_55_lpcd || 0
                  }**\n`;
                summary += `• Villages Consistently Above 55 LPCD: ${village_water_supply_data.villages_consistently_above_55_lpcd ||
                  0
                  }\n`;
                summary += `• Villages Consistently Below 55 LPCD: ${village_water_supply_data.villages_consistently_below_55_lpcd ||
                  0
                  }\n`;
                summary += `• Total Population Covered: **${village_water_supply_data.total_population_covered?.toLocaleString() ||
                  0
                  }**\n`;
                summary += `• Average LPCD: **${village_water_supply_data.avg_lpcd_day7?.toFixed(2) || 0
                  }**\n\n`;

                // Enhanced sensor data analysis
                summary += `🔬 **Sensor Performance Analysis:**\n`;
                summary += `**Chlorine Levels (Optimal: 0.2-0.5 mg/L):**\n`;
                summary += `• ESR with Optimal Chlorine: **${sensor_data.chlorine_sensors.optimal_range_0_2_to_0_5 || 0
                  }**\n`;
                summary += `• ESR Below Optimal: ${sensor_data.chlorine_sensors.below_range_less_than_0_2 || 0
                  }\n`;
                summary += `• ESR Above Optimal: ${sensor_data.chlorine_sensors.above_range_greater_than_0_5 || 0
                  }\n`;
                summary += `• ESR with Zero Readings: ${sensor_data.chlorine_sensors.zero_readings || 0
                  }\n`;
                summary += `• ESR Consistently Optimal: ${sensor_data.chlorine_sensors.consistent_optimal_range || 0
                  }\n`;
                summary += `• Average Chlorine Level: ${sensor_data.chlorine_sensors.avg_chlorine_day7?.toFixed(2) ||
                  0
                  } mg/L\n\n`;

                summary += `**Pressure Levels (Optimal: 0.2-0.7 bar):**\n`;
                summary += `• ESR with Optimal Pressure: **${sensor_data.pressure_sensors.optimal_range_0_2_to_0_7 || 0
                  }**\n`;
                summary += `• ESR Below Optimal: ${sensor_data.pressure_sensors.below_range_less_than_0_2 || 0
                  }\n`;
                summary += `• ESR Above Optimal: ${sensor_data.pressure_sensors.above_range_greater_than_0_7 || 0
                  }\n`;
                summary += `• ESR with Zero Readings: ${sensor_data.pressure_sensors.zero_readings || 0
                  }\n`;
                summary += `• ESR Consistently Optimal: ${sensor_data.pressure_sensors.consistent_optimal_range || 0
                  }\n`;
                summary += `• Average Pressure Level: ${sensor_data.pressure_sensors.avg_pressure_day7?.toFixed(2) ||
                  0
                  } bar\n\n`;

                // Village completion data
                summary += `📈 **Completion Summary:**\n`;
                summary += `• Total Villages in System: ${village_completion_data.total_villages_in_system || 0
                  }\n`;
                summary += `• Fully Completed Villages: ${village_completion_data.fully_completed_villages_count || 0
                  }\n`;
                summary += `• Partial Villages: ${village_completion_data.partial_villages_count || 0
                  }\n\n`;

                response = summary;

                // Store analysis data for comprehensive interactive buttons as specified in instructions
                const schemeAnalysisMessage: ChatMessage = {
                  type: "bot",
                  text: "Click the buttons below to explore detailed data or export Excel reports:",
                  widget: "comprehensiveSchemeAnalysisOptions",
                  schemeAnalysis: analysisData,
                };

                // Add the summary first with streaming
                await addStreamedBotMessage(
                  {
                    text: response,
                    autoSpeak: fromVoice,
                  },
                  50, // 50ms delay for word-by-word streaming
                );

                // Then add the interactive buttons with streaming
                await addStreamedBotMessage(schemeAnalysisMessage, 30);
                setLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error("Error in scheme analysis:", error);
            console.log(
              "Scheme analysis failed, falling back to OpenAI for general query handling",
            );
            // Don't set response here - let it fall through to OpenAI fallback
          }

          // If scheme analysis succeeded, add response with streaming and return
          if (response) {
            await addStreamedBotMessage(
              {
                text: response,
                autoSpeak: fromVoice,
              },
              50, // 50ms delay for word-by-word streaming
            );
            setLoading(false);
            return;
          }
        }

        // Flag for specific query types - enhanced to detect implicit questions
        const isHowManyQuery =
          lowerText.includes("how many") ||
          lowerText.includes("number of") ||
          lowerText.includes("count") ||
          // Implicit queries that still expect a count
          (region &&
            (lowerText.includes("flow meter") ||
              lowerText.includes("chlorine") ||
              lowerText.includes("esr") ||
              lowerText.includes("village")));

        // Status filter check
        const hasStatusFilter =
          lowerText.includes("fully completed") ||
          lowerText.includes("completed scheme") ||
          lowerText.includes("completed schemes");

        // PRIORITY 1: Handle region filtering first (before other conditions)
        if (region && !isHowManyQuery) {
          console.log(`Priority region filter triggered for: ${region}`);
          filters = { region };

          const currentPath = window.location.pathname;
          let pageContext = "";

          if (currentPath.includes("/chlorine")) {
            pageContext = "chlorine monitoring data";
          } else if (currentPath.includes("/pressure")) {
            pageContext = "pressure monitoring data";
          } else if (currentPath.includes("/lpcd")) {
            pageContext = "LPCD water consumption data";
          } else if (currentPath.includes("/scheme-lpcd")) {
            pageContext = "scheme-level LPCD data";
          } else if (currentPath.includes("/schemes")) {
            pageContext = "scheme data";
          } else if (currentPath.includes("/water-consumption")) {
            pageContext = "water consumption data";
          } else if (currentPath.includes("/communication")) {
            pageContext = "communication status data";
          } else {
            pageContext = "dashboard data";
          }

          if (hasStatusFilter) {
            filters.status = "Fully Completed";
            response = `Filtering ${pageContext} for fully completed schemes in ${region} region.`;
          } else {
            response = `Filtering ${pageContext} for ${region} region. The dashboard now shows only ${region}'s information.`;
          }

          // Dispatch region filter event to update the page
          const regionFilterEvent = new CustomEvent("chatbot-region-filter", {
            detail: { region },
          });
          window.dispatchEvent(regionFilterEvent);
        }
        // Handle greeting queries
        else if (lowerText.includes("hello") || lowerText.includes("hi")) {
          response =
            "Hello! How can I help you with Maharashtra's water infrastructure today? You can ask me about flow meters, chlorine analyzers, ESRs, or villages in specific regions or schemes.";
        }
        // Handle infrastructure queries
        else if (isHowManyQuery) {
          try {
            let queryResult;
            const components = [];
            let isRegionSpecific = false;
            let isSchemeSpecific = false;

            // Set filter based on region or scheme
            if (region) {
              filters.region = region;
              isRegionSpecific = true;
            }

            if (schemeId) {
              filters.schemeId = schemeId;
              isSchemeSpecific = true;
            }

            // Determine which API to call based on filters
            try {
              if (isRegionSpecific && region) {
                // Fetch region-specific data using dedicated region endpoint
                console.log(`Fetching data for region: ${region}`);
                const response = await fetch(
                  `/api/regions/${encodeURIComponent(region)}/summary`,
                );
                if (!response.ok) {
                  throw new Error(`Failed to fetch data for region: ${region}`);
                }
                queryResult = await response.json();
              } else if (isSchemeSpecific && schemeId) {
                // Fetch scheme-specific data
                console.log(`Fetching data for scheme: ${schemeId}`);
                const response = await fetch(
                  `/api/schemes/${encodeURIComponent(schemeId)}`,
                );
                if (!response.ok) {
                  throw new Error(
                    `Failed to fetch data for scheme: ${schemeId}`,
                  );
                }
                const schemeData = await response.json();

                // Convert scheme data to a summary format
                queryResult = {
                  flow_meter_integrated: schemeData.flow_meters_connected || 0,
                  rca_integrated:
                    schemeData.residual_chlorine_analyzer_connected || 0,
                  pressure_transmitter_integrated:
                    schemeData.pressure_transmitter_connected || 0,
                  total_esr_integrated: schemeData.total_esr_integrated || 0,
                  fully_completed_esr: schemeData.no_fully_completed_esr || 0,
                  total_villages_integrated:
                    schemeData.total_villages_integrated || 0,
                  fully_completed_villages:
                    schemeData.fully_completed_villages || 0,
                };
              } else {
                // Fetch global summary for all regions
                console.log("Fetching global summary");
                const response = await fetch("/api/regions/summary");
                if (!response.ok) {
                  throw new Error("Failed to fetch global summary");
                }
                queryResult = await response.json();
              }
            } catch (error) {
              console.error("Error fetching data:", error);
              throw error;
            }

            // Build response based on requested components
            let locationDescription = "across Maharashtra";
            if (isRegionSpecific && region) {
              locationDescription = `in the ${region} region`;
            } else if (isSchemeSpecific && schemeId) {
              locationDescription = `in scheme ${schemeId}`;
            }

            // Add components to response
            if (hasFlowMeters) {
              components.push(
                `**${queryResult.flow_meter_integrated || 0}** flow meters`,
              );
            }

            if (hasChlorineAnalyzers) {
              components.push(
                `**${queryResult.rca_integrated || 0}** chlorine analyzers`,
              );
            }

            if (hasPressureTransmitters) {
              components.push(
                `**${queryResult.pressure_transmitter_integrated || 0
                }** pressure transmitters`,
              );
            }

            if (hasESR) {
              components.push(
                `**${queryResult.total_esr_integrated || 0}** ESRs (with **${queryResult.fully_completed_esr || 0
                }** fully completed)`,
              );
            }

            if (hasVillages) {
              components.push(
                `**${queryResult.total_villages_integrated || 0
                }** villages (with **${queryResult.fully_completed_villages || 0
                }** fully completed)`,
              );
            }

            // If no specific components were asked for, give a comprehensive answer
            if (components.length === 0) {
              response = `${locationDescription.charAt(0).toUpperCase() +
                locationDescription.slice(1)
                }, there are:\n• **${queryResult.flow_meter_integrated || 0
                }** flow meters\n• **${queryResult.rca_integrated || 0
                }** chlorine analyzers\n• **${queryResult.pressure_transmitter_integrated || 0
                }** pressure transmitters\n• **${queryResult.total_esr_integrated || 0
                }** ESRs\n• **${queryResult.total_villages_integrated || 0
                }** villages`;
            } else if (components.length === 1) {
              response = `There are ${components[0]} ${locationDescription}.`;
            } else {
              const lastComponent = components.pop();
              response = `There are ${components.join(
                ", ",
              )} and ${lastComponent} ${locationDescription}.`;
            }
          } catch (error) {
            console.error("Error fetching infrastructure data:", error);
            response =
              "Sorry, I couldn't fetch the requested infrastructure information at the moment.";
          }
        }
        // Handle region filtering with or without status
        else if (region) {
          filters = { region };

          // Apply status filters if detected
          if (statusFilters.status) {
            filters.status = statusFilters.status;
          }
          if (statusFilters.mjpCommissioned) {
            filters.mjpCommissioned = statusFilters.mjpCommissioned;
          }
          if (statusFilters.mjpFullyCompleted) {
            filters.mjpFullyCompleted = statusFilters.mjpFullyCompleted;
          }

          // Build response message
          let statusDescription = "";
          if (statusFilters.mjpFullyCompleted) {
            statusDescription = " with MJP fully completed status";
          } else if (statusFilters.mjpCommissioned) {
            statusDescription = " with MJP commissioned status";
          } else if (statusFilters.status === "fully_completed") {
            statusDescription = " with fully completed status";
          } else if (statusFilters.status === "in_progress") {
            statusDescription = " with in progress status";
          } else if (statusFilters.status === "connected") {
            statusDescription = " with connected IoT status";
          } else if (statusFilters.status === "not_connected") {
            statusDescription = " with not connected IoT status";
          }

          response = `I've filtered the dashboard to show schemes in ${region} region${statusDescription}.`;
        }
        // Handle status filter requests without region
        else if (Object.keys(statusFilters).length > 0) {
          filters = { ...statusFilters };

          let statusDescription = "";
          if (statusFilters.mjpFullyCompleted) {
            statusDescription = "MJP fully completed";
          } else if (statusFilters.mjpCommissioned) {
            statusDescription = "MJP commissioned";
          } else if (statusFilters.status === "fully_completed") {
            statusDescription = "fully completed";
          } else if (statusFilters.status === "in_progress") {
            statusDescription = "in progress";
          } else if (statusFilters.status === "connected") {
            statusDescription = "connected IoT";
          } else if (statusFilters.status === "not_connected") {
            statusDescription = "not connected IoT";
          }

          response = `I've filtered the dashboard to show ${statusDescription} schemes across Maharashtra.`;
        }
        // Handle Excel download requests (non-historical)
        else if (
          lowerText.includes("excel") ||
          lowerText.includes("download") ||
          lowerText.includes("export") ||
          lowerText.includes("get excel") ||
          lowerText.includes("give me excel") ||
          lowerText.includes("generate excel")
        ) {
          console.log("Excel download request detected (non-historical)");

          // Regular export without date range (historical exports handled at top of function)
          if (region) {
            filters = { region };

            // Apply status filters if detected
            if (statusFilters.status) {
              filters.status = statusFilters.status;
            }
            if (statusFilters.mjpCommissioned) {
              filters.mjpCommissioned = statusFilters.mjpCommissioned;
            }
            if (statusFilters.mjpFullyCompleted) {
              filters.mjpFullyCompleted = statusFilters.mjpFullyCompleted;
            }

            // Build response message based on detected filters
            let statusDescription = "";
            if (statusFilters.mjpFullyCompleted) {
              statusDescription = " with MJP fully completed status";
            } else if (statusFilters.mjpCommissioned) {
              statusDescription = " with MJP commissioned status";
            } else if (statusFilters.status === "fully_completed") {
              statusDescription = " with fully completed status";
            } else if (statusFilters.status === "in_progress") {
              statusDescription = " with in progress status";
            } else if (statusFilters.status === "connected") {
              statusDescription = " with connected IoT status";
            } else if (statusFilters.status === "not_connected") {
              statusDescription = " with not connected IoT status";
            }

            response = `I'll help you download an Excel file with schemes in ${region} region${statusDescription}. The download will start shortly.`;
          }
          // No region specified, apply status filters if detected
          else if (Object.keys(statusFilters).length > 0) {
            filters = { ...statusFilters };

            let statusDescription = "";
            if (statusFilters.mjpFullyCompleted) {
              statusDescription = "MJP fully completed";
            } else if (statusFilters.mjpCommissioned) {
              statusDescription = "MJP commissioned";
            } else if (statusFilters.status === "fully_completed") {
              statusDescription = "fully completed";
            } else if (statusFilters.status === "in_progress") {
              statusDescription = "in progress";
            } else if (statusFilters.status === "connected") {
              statusDescription = "connected IoT";
            } else if (statusFilters.status === "not_connected") {
              statusDescription = "not connected IoT";
            }

            response = `I'll help you download an Excel file with ${statusDescription} schemes across Maharashtra. The download will start shortly.`;
          } else if (
            lowerText.includes("partial") ||
            lowerText.includes("ongoing") ||
            lowerText.includes("in progress")
          ) {
            filters = { status: "Partial Integration" };
            response = `I'll help you download an Excel file with partially completed schemes across Maharashtra. The download will start shortly.`;
          } else {
            response = `I'll help you download an Excel file with all water schemes across Maharashtra. The download will start shortly.`;
          }

          // Apply filters first if any were specified
          if (filterContext && filters) {
            filterContext.applyFilters(filters);
          }

          // Apply region filter first if specified, then trigger download
          if (region) {
            console.log(
              `Applying region filter: ${region} before Excel export`,
            );
            window.dispatchEvent(
              new CustomEvent("regionFilterChange", {
                detail: { region: region },
              }),
            );

            // Wait a moment for filter to apply, then trigger export
            setTimeout(() => {
              triggerExcelExport();
            }, 500);
          } else {
            // Trigger immediate export for all regions
            triggerExcelExport();
          }
        }
        // Handle standalone Excel export requests without other keywords
        else if (
          (processedText.includes("excel") ||
            processedText.includes("export")) &&
          !isHowManyQuery &&
          !hasFlowMeters &&
          !hasChlorineAnalyzers &&
          !hasPressureTransmitters &&
          !hasESR &&
          !hasVillages
        ) {
          console.log("Standalone Excel export request detected");

          if (region) {
            filters = { region };
            response = `Downloading Excel file for ${region} region data. The export will start shortly.`;

            // Apply region filter and trigger export
            window.dispatchEvent(
              new CustomEvent("regionFilterChange", {
                detail: { region: region },
              }),
            );

            setTimeout(() => {
              triggerExcelExport();
            }, 500);
          } else {
            response = `Downloading Excel file with all Maharashtra region data. The export will start shortly.`;
            triggerExcelExport();
          }
        }
        // Handle summary requests
        else if (
          lowerText.includes("summary") ||
          lowerText.includes("statistics") ||
          lowerText.includes("stats")
        ) {
          try {
            const summary = await fetch("/api/regions/summary").then((res) =>
              res.json(),
            );
            response = `Maharashtra Water Systems Summary:\n• Total Schemes: **${summary.total_schemes_integrated || 0
              }**\n• Fully Completed: **${summary.fully_completed_schemes || 0
              }**\n• Total Villages Integrated: **${summary.total_villages_integrated || 0
              }**\n• ESRs Integrated: **${summary.total_esr_integrated || 0
              }**\n• Flow Meters: **${summary.flow_meter_integrated || 0
              }**\n• Chlorine Analyzers: **${summary.rca_integrated || 0
              }**\n• Pressure Transmitters: **${summary.pressure_transmitter_integrated || 0
              }**`;
          } catch (error) {
            response =
              "Sorry, I couldn't fetch the summary information at the moment.";
          }
        }
        // Show all regions (reset region filter)
        else if (
          lowerText.includes("all regions") ||
          lowerText.includes("show all")
        ) {
          filters = { region: "all" };
          response =
            "I've reset the region filter to show schemes from all regions.";
        }
        // Reset all filters
        else if (
          lowerText.includes("reset") ||
          lowerText.includes("clear filters")
        ) {
          filters = { region: "all", status: "all" };
          response =
            "I've reset all filters. Now showing schemes from all regions with any status.";
        }
        // Default response for unrecognized queries - use OpenAI
        else {
          try {
            // Detect language from user input
            const detectedLanguage = detectLanguage(text);
            console.log(`Detected language: ${detectedLanguage}`);

            // Create enhanced context for OpenAI about Maharashtra Water Dashboard
            // Including specific instruction to respond in the same language
            const languageMap: Record<string, string> = {
              en: "English",
              hi: "Hindi",
              mr: "Marathi",
              ta: "Tamil",
              te: "Telugu",
              kn: "Kannada",
              ml: "Malayalam",
              gu: "Gujarati",
              bn: "Bengali",
            };
            const languageName = languageMap[detectedLanguage] || "English";

            const contextPrompt = `
              User query: "${text}"

              The user is asking about the Maharashtra Water Dashboard, which tracks water infrastructure 
              across Maharashtra, India. The dashboard monitors:
              - Elevated Storage Reservoirs (ESRs)
              - Villages with water access
              - Flow meters
              - Chlorine analyzers (RCA)
              - Pressure transmitters (PT)

              Regions in the dashboard: Nagpur, Pune, Nashik, Konkan, Amravati, and Chhatrapati Sambhajinagar.

              IMPORTANT: Respond ONLY in ${languageName} language, even if the user's input is partly in English.
              If the user is speaking in Hindi, your response must be entirely in Hindi.
              If the user is speaking in Tamil, your response must be entirely in Tamil.
              If the user is speaking in Telugu, your response must be entirely in Telugu.
              If the user is speaking in Marathi, your response must be entirely in Marathi.

              Answer the query briefly (2-3 sentences) based on context. If you don't know, suggest asking about 
              specific regions or schemes. Don't make up information not in the context.
            `;

            // Log the language that will be used for the response
            console.log(
              `Responding in ${languageName} (code: ${detectedLanguage})`,
            );

            // Get response from OpenAI with streaming (token-by-token like ChatGPT)
            console.log(
              "Calling OpenAI streaming for assistance with unrecognized query",
            );
            try {
              // Check if this is from voice input
              const prevMessage = chatMessages[chatMessages.length - 1];
              const autoSpeak = prevMessage?.fromVoice === true;

              // Use streaming to get token-by-token response
              response = await getOpenAIStreamingResponse(
                contextPrompt,
                detectedLanguage,
                500, // Increased for non-English responses
                0.5, // Lower temperature for more consistent responses
                autoSpeak, // Enable auto-speak if from voice
              );
              console.log("Received streaming OpenAI response (complete)");

              // Don't add the message here - it's already been added by the streaming function
              // Just return early to skip the normal message adding below
              setLoading(false);
              return;
            } catch (streamError) {
              // Fallback if OpenAI streaming fails
              console.error("OpenAI streaming error:", streamError);
              response =
                "I'm not sure I understand that query. You can ask me about:\n• Flow meters, chlorine analyzers, pressure transmitters\n• ESRs (reservoirs) and villages\n• Filter by region (e.g., 'Schemes in Nagpur')\n• Filter by status (e.g., 'Show fully completed schemes')";
              console.log("Using fallback response due to OpenAI error");
            }
          } catch (error) {
            console.error("Error using OpenAI:", error);
            response =
              "I'm not sure I understand that query. You can ask me about:\n• Flow meters, chlorine analyzers, pressure transmitters\n• ESRs (reservoirs) and villages\n• Filter by region (e.g., 'Schemes in Nagpur')\n• Filter by status (e.g., 'Show fully completed schemes')";
          }
        }

        // Apply filters using event-based system that works across all pages
        if (
          filters.region ||
          filters.status ||
          filters.mjpCommissioned ||
          filters.mjpFullyCompleted
        ) {
          console.log("Applying filters to dashboard:", filters);

          // Dispatch custom events that dashboard pages can listen to
          if (filters.region) {
            console.log(
              `Dispatching regionFilterChange event with region: ${filters.region}`,
            );
            window.dispatchEvent(
              new CustomEvent("regionFilterChange", {
                detail: { region: filters.region },
              }),
            );
          }

          if (filters.status) {
            console.log(
              `Dispatching statusFilterChange event with status: ${filters.status}`,
            );
            window.dispatchEvent(
              new CustomEvent("statusFilterChange", {
                detail: { status: filters.status },
              }),
            );
          }

          if (filters.mjpCommissioned) {
            console.log(`Dispatching mjpCommissionedFilterChange event`);
            window.dispatchEvent(
              new CustomEvent("mjpCommissionedFilterChange", {
                detail: { mjpCommissioned: filters.mjpCommissioned },
              }),
            );
          }

          if (filters.mjpFullyCompleted) {
            console.log(`Dispatching mjpFullyCompletedFilterChange event`);
            window.dispatchEvent(
              new CustomEvent("mjpFullyCompletedFilterChange", {
                detail: { mjpFullyCompleted: filters.mjpFullyCompleted },
              }),
            );
          }

          // Also try the filterContext if available (for backward compatibility)
          if (filterContext) {
            try {
              filterContext.applyFilters(filters);
              console.log("Successfully applied filters via filterContext");
            } catch (e) {
              console.error("Error applying filters via filterContext:", e);
            }
          }
        }

        // ADVANCED FALLBACK: Try natural language to SQL for complex queries
        if (!response || response.trim() === "") {
          console.log(
            "No keyword handler matched, trying natural language SQL...",
          );
          try {
            const sqlResponse = await fetch("/api/ai/text-to-sql", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query: text }),
            });

            if (sqlResponse.ok) {
              const sqlData = await sqlResponse.json();

              if (
                sqlData.success &&
                sqlData.results &&
                sqlData.results.length > 0
              ) {
                console.log("Natural language SQL executed successfully");

                const { NaturalLanguageSQLWidget } = await import(
                  "./widgets/NaturalLanguageSQLWidget"
                );

                // Use streaming for consistent user experience
                await addStreamedBotMessage(
                  {
                    text:
                      sqlData.formattedResponse ||
                      `Query executed successfully. Found ${sqlData.rowCount} results.`,
                    customWidget: (
                      <NaturalLanguageSQLWidget
                        query={text}
                        sql={sqlData.sql}
                        results={sqlData.results}
                        explanation={sqlData.explanation}
                        success={sqlData.success}
                        rowCount={sqlData.rowCount}
                        truncated={sqlData.truncated}
                      />
                    ),
                    autoSpeak: fromVoice,
                  },
                  50, // 50ms delay for word-by-word streaming
                );

                setLoading(false);
                return;
              } else if (
                sqlData.success &&
                sqlData.results &&
                sqlData.results.length === 0
              ) {
                // SQL executed but no results - show empty results widget
                console.log(
                  "Natural language SQL executed but returned no results",
                );

                const { NaturalLanguageSQLWidget } = await import(
                  "./widgets/NaturalLanguageSQLWidget"
                );

                // Use streaming for consistent user experience
                await addStreamedBotMessage(
                  {
                    text: "Your query was understood and executed, but no matching results were found.",
                    customWidget: (
                      <NaturalLanguageSQLWidget
                        query={text}
                        sql={sqlData.sql}
                        results={[]}
                        explanation={sqlData.explanation}
                        success={true}
                        rowCount={0}
                        truncated={false}
                      />
                    ),
                    autoSpeak: fromVoice,
                  },
                  50, // 50ms delay for word-by-word streaming
                );

                setLoading(false);
                return;
              }
            }
          } catch (error) {
            console.log(
              "Natural language SQL failed, continuing to final fallback:",
              error,
            );
          }
        }

        // FINAL FALLBACK: If no keyword handler was triggered, use conversational AI with context
        if (!response || response.trim() === "") {
          console.log(
            "No keyword handler matched, falling back to conversational AI with context...",
          );
          try {
            // Build conversation history (last 8 messages = 4 exchanges)
            // Map internal "bot" message type to "bot" role (server will handle OpenAI compatibility)
            const conversationHistory = chatMessages.slice(-8).map((msg) => ({
              role: msg.type === "user" ? "user" : "bot",
              text: msg.text,
            }));

            // Detect language from selected language setting
            const languageCode = selectedLanguage.split("-")[0]; // "en-IN" -> "en"
            const apiLanguage = ["en", "hi", "mr"].includes(languageCode)
              ? languageCode
              : "en";

            const gptResponse = await fetch("/api/ai/conversational-fallback", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: text,
                conversationHistory: conversationHistory,
                language: apiLanguage,
              }),
            });

            if (gptResponse.ok) {
              const gptData = await gptResponse.json();
              response =
                gptData.reply ||
                "I'm sorry, I couldn't process your request. Please try asking about water infrastructure data, schemes, or regions.";
              console.log("✅ Conversational AI response generated:", response);
            } else {
              console.error("Conversational AI API error:", gptResponse.status);
              response =
                "I'm sorry, I couldn't understand your request. Please try asking about flow meters, ESRs, villages, or water supply data.";
            }
          } catch (error) {
            console.error("Error calling conversational AI API:", error);
            response =
              "I'm sorry, I couldn't understand your request. Please try asking about flow meters, ESRs, villages with water, or water supply statistics.";
          }
        }

        // Check if previous message was from voice input to enable auto-speak
        const prevMessage = chatMessages[chatMessages.length - 1];
        const autoSpeak = prevMessage?.fromVoice === true;

        // Display response with streaming effect (word-by-word like ChatGPT)
        await displayStreamingResponse(response, autoSpeak, 50);
      } catch (error) {
        console.error("Error processing message:", error);
        // Check if previous message was from voice input to enable auto-speak
        const prevMessage = chatMessages[chatMessages.length - 1];
        const autoSpeak = prevMessage?.fromVoice === true;

        // Use streaming for word-by-word display
        await addStreamedBotMessage(
          {
            text: "I encountered an error processing your request. Please try again.",
            autoSpeak, // Always auto-speak error messages if the query was from voice
          },
          30,
        );
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  // Handle predefined queries
  const handlePredefinedQuery = (query: string) => {
    console.log("handlePredefinedQuery called with:", query);
    setInput(query);
    handleSendMessage(query);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-slate-50 to-blue-50">
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ maxHeight: "calc(85vh - 180px)" }}
      >
        <div className="message-container space-y-4">
          {chatMessages.map((msg: ChatMessage, i) => (
            <div
              key={i}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in duration-300`}
            >
              <div
                className={`p-4 rounded-2xl max-w-[80%] shadow-md ${msg.type === "user"
                  ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-md"
                  : "bg-white border border-purple-100 rounded-tl-md shadow-lg text-gray-800"
                  }`}
              >
                {/* Add text-to-speech button for bot messages */}
                {msg.type === "bot" && (
                  <div className="flex justify-end mb-1">
                    <TextToSpeech text={msg.text} autoSpeak={msg.autoSpeak} />
                  </div>
                )}
                {msg.text.split("\n").map((line: string, j: number) => {
                  return (
                    <React.Fragment key={j}>
                      {/* Check for markdown bold syntax (**number**) and render it as bold text */}
                      {line.includes("**") ? (
                        <span>
                          {line.split(/(\*\*[^*]+\*\*)/).map((part, k) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              // Extract content between ** markers and make it bold
                              const content = part.slice(2, -2);
                              return (
                                <span key={k} className="font-bold text-black">
                                  {content}
                                </span>
                              );
                            }
                            return <span key={k}>{part}</span>;
                          })}
                        </span>
                      ) : (
                        // For lines without markdown, still check for numbers
                        <span>
                          {line.split(/(\d+(?:[.,]\d+)*)/).map((part, k) =>
                            /^\d+(?:[.,]\d+)*$/.test(part) ? (
                              <span key={k} className="font-bold text-black">
                                {part}
                              </span>
                            ) : (
                              <span key={k}>{part}</span>
                            ),
                          )}
                        </span>
                      )}
                      {j < msg.text.split("\n").length - 1 && <br />}
                    </React.Fragment>
                  );
                })}

                {/* Add filter indication if the message applied filters */}
                {msg.filters && (
                  <div className="mt-2 pt-2 border-t border-blue-400 text-xs flex items-center">
                    <Filter className="w-3 h-3 mr-1" />
                    <span>Filters applied to dashboard</span>
                    {msg.filters.region && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white rounded-sm flex items-center">
                        <MapPin className="w-2 h-2 mr-0.5" />
                        {msg.filters.region}
                      </span>
                    )}
                    {msg.filters.status && (
                      <span className="ml-1 px-1.5 py-0.5 bg-green-500 text-white rounded-sm">
                        {msg.filters.status}
                      </span>
                    )}
                  </div>
                )}

                {/* Add COMPREHENSIVE scheme analysis interactive tabs as specified in instructions */}
                {(msg.widget === "schemeAnalysisOptions" ||
                  msg.widget === "comprehensiveSchemeAnalysisOptions") &&
                  msg.schemeAnalysis && (
                    <div className="mt-3 pt-3 border-t border-blue-400">
                      {/* Excel Export Button */}
                      <div className="mb-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs bg-white text-blue-600 border-blue-300 hover:bg-blue-50 w-full"
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/scheme-analysis/export/excel/${encodeURIComponent(
                                  msg.schemeAnalysis.scheme_information
                                    .scheme_id,
                                )}`,
                              );

                              if (!response.ok) {
                                throw new Error("Failed to export scheme data");
                              }

                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `Scheme_Analysis_${msg.schemeAnalysis.scheme_information.scheme_name.replace(
                                /[^a-zA-Z0-9]/g,
                                "_",
                              )}.xlsx`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);

                              // Use streaming for success message
                              await addStreamedBotMessage(
                                {
                                  text: `✅ Excel report for ${msg.schemeAnalysis.scheme_information.scheme_name} has been downloaded successfully!`,
                                },
                                30, // Fast streaming for short messages
                              );
                            } catch (error) {
                              console.error("Export error:", error);
                              // Use streaming for error message
                              await addStreamedBotMessage(
                                {
                                  text: `❌ Failed to export Excel report. Please try again.`,
                                },
                                30, // Fast streaming for short messages
                              );
                            }
                          }}
                        >
                          📊 Download Excel Report
                        </Button>
                      </div>

                      {/* Villages Tab Section */}
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-black mb-2">
                          🏘️ Villages:
                        </h4>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-green-600 border-green-300 hover:bg-green-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-with-water`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name} - ${v.water_value_day7
                                      } LL`,
                                  )
                                  .join("\n");
                                // Use streaming for data list
                                await addStreamedBotMessage(
                                  {
                                    text: `💧 **Villages with Water (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                  30, // Fast streaming for lists
                                );
                              } catch (error) {
                                // Use streaming for error message
                                await addStreamedBotMessage(
                                  {
                                    text: "❌ Error fetching villages with water data.",
                                  },
                                  30,
                                );
                              }
                            }}
                          >
                            💧 Villages with Water
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-red-600 border-red-300 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-no-water`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name} - No Water`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `🚫 **Villages with No Water (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching villages with no water data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            🚫 Villages No Water
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-consistent-water`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name
                                      } - Consistent 7 days`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `✅ **Villages Consistent Water (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching consistent water villages data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            ✅ Consistent Water
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-consistent-zero-water`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name
                                      } - Zero for 7 days`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `⚫ **Villages Consistent Zero Water (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching consistent zero water villages data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            ⚫ Consistent Zero
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-teal-600 border-teal-300 hover:bg-teal-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-above-55-lpcd`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name} - ${v.lpcd_value_day7
                                      } LPCD`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `📈 **Villages Above 55 LPCD (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching villages above 55 LPCD data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            📈 Above 55 LPCD
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-below-55-lpcd`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name} - ${v.lpcd_value_day7
                                      } LPCD`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `📉 **Villages Below 55 LPCD (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching villages below 55 LPCD data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            📉 Below 55 LPCD
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-purple-600 border-purple-300 hover:bg-purple-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-consistently-above-55-lpcd`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name
                                      } - Consistent 7 days`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `🟢 **Villages Consistently Above 55 LPCD (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching consistently above 55 LPCD villages data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            🟢 Consistent Above 55
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-red-600 border-red-300 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/villages-consistently-below-55-lpcd`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (v: any, i: number) =>
                                      `${i + 1}. ${v.village_name
                                      } - Consistent 7 days`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `🔴 **Villages Consistently Below 55 LPCD (${data.length
                                      }):**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching consistently below 55 LPCD villages data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            🔴 Consistent Below 55
                          </Button>
                        </div>
                      </div>

                      {/* ESR / Sensors Tab Section */}
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-black mb-2">
                          🔬 ESR / Sensors:
                        </h4>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-green-600 border-green-300 hover:bg-green-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/esr-optimal-chlorine`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (e: any, i: number) =>
                                      `${i + 1}. ${e.esr_name} - ${e.chlorine_value_7
                                      } mg/L`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `✅ **ESR Optimal Chlorine (0.2-0.5 mg/L) - ${data.length
                                      }:**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching ESR optimal chlorine data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            ✅ Optimal Chlorine
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-red-600 border-red-300 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/esr-below-chlorine`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (e: any, i: number) =>
                                      `${i + 1}. ${e.esr_name} - ${e.chlorine_value_7
                                      } mg/L`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `📉 **ESR Below Optimal Chlorine (<0.2 mg/L) - ${data.length
                                      }:**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching ESR below chlorine data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            📉 Below Chlorine
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/esr-above-chlorine`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (e: any, i: number) =>
                                      `${i + 1}. ${e.esr_name} - ${e.chlorine_value_7
                                      } mg/L`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `📈 **ESR Above Optimal Chlorine (>0.5 mg/L) - ${data.length
                                      }:**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching ESR above chlorine data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            📈 Above Chlorine
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/esr-optimal-pressure`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (e: any, i: number) =>
                                      `${i + 1}. ${e.esr_name} - ${e.pressure_value_7
                                      } bar`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `✅ **ESR Optimal Pressure (0.2-0.7 bar) - ${data.length
                                      }:**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching ESR optimal pressure data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            ✅ Optimal Pressure
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-red-600 border-red-300 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/esr-below-pressure`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (e: any, i: number) =>
                                      `${i + 1}. ${e.esr_name} - ${e.pressure_value_7
                                      } bar`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `📉 **ESR Below Optimal Pressure (<0.2 bar) - ${data.length
                                      }:**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching ESR below pressure data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            📉 Below Pressure
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs bg-white text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/scheme-analysis/details/${encodeURIComponent(
                                    msg.schemeAnalysis.scheme_information
                                      .scheme_id,
                                  )}/esr-above-pressure`,
                                );
                                const data = await response.json();
                                const list = data
                                  .map(
                                    (e: any, i: number) =>
                                      `${i + 1}. ${e.esr_name} - ${e.pressure_value_7
                                      } bar`,
                                  )
                                  .join("\n");
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: `📈 **ESR Above Optimal Pressure (>0.7 bar) - ${data.length
                                      }:**\n${list || "No data available"}`,
                                  },
                                ]);
                              } catch (error) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Error fetching ESR above pressure data.",
                                  },
                                ]);
                              }
                            }}
                          >
                            📈 Above Pressure
                          </Button>
                        </div>
                      </div>

                      {/* Excel Download Section */}
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-black mb-2">
                          📊 Comprehensive Report:
                        </h4>
                        <div className="w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs bg-white text-green-700 border-green-400 hover:bg-green-50 font-semibold"
                            onClick={async () => {
                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "bot",
                                  text: "📊 Generating comprehensive Excel report... Please wait.",
                                },
                              ]);

                              const success =
                                await triggerComprehensiveSchemeExport(
                                  msg.schemeAnalysis.scheme_information
                                    .scheme_id,
                                );

                              if (success) {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "✅ **Excel report downloaded successfully!** \n\nThe comprehensive report includes:\n• Scheme summary with region & administrative details\n• Village-wise water consumption (LL) and LPCD\n• Chlorine levels with status analysis\n• Pressure data with optimal range indicators\n• Raw water consumption data from flow meters\n\nAll data is organized in separate worksheets for easy analysis.",
                                  },
                                ]);
                              } else {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: "❌ Failed to generate Excel report. Please try again or contact support if the issue persists.",
                                  },
                                ]);
                              }
                            }}
                          >
                            📊 Download Comprehensive Excel Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Render FullyCompletedSchemesWidget */}
                {msg.widget === "fullyCompletedSchemes" && msg.schemes && (
                  <div className="mt-3">
                    <FullyCompletedSchemesWidget
                      schemes={msg.schemes}
                      selectedRegion={msg.selectedRegion || "all"}
                    />
                  </div>
                )}

                {/* Render CombinedSchemesWidget */}
                {msg.widget === "combinedSchemes" && msg.schemes && (
                  <div className="mt-3">
                    <CombinedSchemesWidget
                      schemes={msg.schemes}
                      selectedRegion={msg.selectedRegion || "all"}
                    />
                  </div>
                )}

                {/* Render FullyCompletedVillagesWidget */}
                {msg.widget === "fullyCompletedVillages" && msg.villages && (
                  <div className="mt-3">
                    <FullyCompletedVillagesWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                    />
                  </div>
                )}

                {/* Render Combined Status widgets */}
                {msg.widget === "combinedWaterStatus" && (
                  <div className="mt-3">
                    <CombinedWaterStatusWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "combinedLpcdStatus" && (
                  <div className="mt-3">
                    <CombinedLpcdStatusWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render ESRWaterConsumptionWidget */}
                {msg.widget === "esrWaterConsumption" && (
                  <div className="mt-3">
                    <ESRWaterConsumptionWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render AbruptWaterConsumptionWidget */}
                {msg.widget === "abruptWaterConsumption" && (
                  <div className="mt-3">
                    <AbruptWaterConsumptionWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                      selectedVillage={msg.selectedVillage || "all"}
                    />
                  </div>
                )}

                {/* Render ReliableWaterConsumptionWidget */}
                {msg.widget === "reliableWaterConsumption" && (
                  <div className="mt-3">
                    <ReliableWaterConsumptionWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                      selectedVillage={msg.selectedVillage || "all"}
                    />
                  </div>
                )}

                {/* Render Helpdesk Ticket Widget */}
                {msg.widget === "helpdeskTicket" && msg.ticket && (
                  <div className="mt-3">
                    <HelpdeskTicketWidget
                      ticket={msg.ticket}
                      onAction={async (action, ticketId) => {
                        const result = await performTicketAction(
                          ticketId,
                          action as "reopen" | "close",
                        );
                        if (result.success) {
                          setChatMessages((prev) => [
                            ...prev,
                            {
                              type: "bot",
                              text: `✅ ${result.message}`,
                              widget: result.ticket
                                ? "helpdeskTicket"
                                : undefined,
                              ticket: result.ticket,
                            },
                          ]);
                        } else {
                          setChatMessages((prev) => [
                            ...prev,
                            {
                              type: "bot",
                              text: `❌ ${result.message}`,
                            },
                          ]);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Render Helpdesk Ticket List Widget */}
                {msg.widget === "helpdeskTicketList" && msg.tickets && (
                  <div className="mt-3">
                    <HelpdeskTicketListWidget
                      tickets={msg.tickets}
                      onTicketClick={async (ticketId) => {
                        const ticket = await getTicketById(ticketId);
                        if (ticket) {
                          setChatMessages((prev) => [
                            ...prev,
                            {
                              type: "bot",
                              text: `Here's the details for ticket **${ticketId}**:`,
                              widget: "helpdeskTicket",
                              ticket,
                            },
                          ]);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Render Helpdesk Analytics Widget */}
                {msg.widget === "helpdeskAnalytics" && msg.ticketAnalytics && (
                  <div className="mt-3">
                    <HelpdeskAnalyticsWidget analytics={msg.ticketAnalytics} />
                  </div>
                )}

                {/* Render Interactive Helpdesk Steps */}
                {msg.helpdeskStep === "SELECT_REGION" &&
                  msg.helpdeskOptions && (
                    <div
                      className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                      data-testid="helpdesk-select-region"
                    >
                      <p className="text-sm font-semibold mb-2 text-gray-700">
                        Select Region:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Array.isArray(msg.helpdeskOptions)
                          ? msg.helpdeskOptions
                          : msg.helpdeskOptions.regions || []
                        ).map((region: string) => (
                          <Button
                            key={region}
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white hover:bg-blue-100"
                            data-testid={`region-button-${region.toLowerCase().replace(/\s+/g, "-")}`}
                            onClick={async () => {
                              setChatMessages((prev) => [
                                ...prev,
                                { type: "user", text: region },
                              ]);
                              const result = await processTicketMessage(
                                region,
                                "selection",
                              );
                              helpdeskState.current.collectedData =
                                result.collectedData;
                              helpdeskState.current.currentStep =
                                result.currentStep;

                              if (result.currentStep === "CONFIRM_TICKET") {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text:
                                      result.message ||
                                      "📋 Please review your ticket details:",
                                    helpdeskStep: "CONFIRM_TICKET",
                                    helpdeskCollectedData: result.collectedData,
                                  },
                                ]);
                              } else {
                                setChatMessages((prev) => [
                                  ...prev,
                                  {
                                    type: "bot",
                                    text: result.message || "Next step...",
                                    helpdeskStep: result.currentStep,
                                    helpdeskOptions: result.options,
                                    helpdeskCollectedData: result.collectedData,
                                  },
                                ]);
                              }
                            }}
                          >
                            📍 {region}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                {msg.helpdeskStep === "SELECT_CATEGORY" &&
                  msg.helpdeskOptions && (
                    <div
                      className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200"
                      data-testid="helpdesk-select-category"
                    >
                      <p className="text-sm font-semibold mb-2 text-gray-700">
                        Select Issue Category:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Array.isArray(msg.helpdeskOptions)
                          ? msg.helpdeskOptions
                          : msg.helpdeskOptions.categories || []
                        ).map((category: string) => (
                          <Button
                            key={category}
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white hover:bg-purple-100"
                            data-testid={`category-button-${category.toLowerCase().replace(/\s+/g, "-")}`}
                            onClick={async () => {
                              setChatMessages((prev) => [
                                ...prev,
                                { type: "user", text: category },
                              ]);
                              const result = await processTicketMessage(
                                category,
                                "selection",
                              );
                              helpdeskState.current.collectedData =
                                result.collectedData;
                              helpdeskState.current.currentStep =
                                result.currentStep;

                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "bot",
                                  text: result.message || "Next step...",
                                  helpdeskStep: result.currentStep,
                                  helpdeskOptions: result.options,
                                  helpdeskCollectedData: result.collectedData,
                                },
                              ]);
                            }}
                          >
                            🏷️ {category}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                {msg.helpdeskStep === "SELECT_SPECIFIC_ISSUE" &&
                  msg.helpdeskOptions && (
                    <div
                      className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                      data-testid="helpdesk-select-specific-issue"
                    >
                      <p className="text-sm font-semibold mb-2 text-gray-700">
                        Select Specific Issue:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {(Array.isArray(msg.helpdeskOptions)
                          ? msg.helpdeskOptions
                          : msg.helpdeskOptions.issues || []
                        ).map((issue: string) => (
                          <Button
                            key={issue}
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white hover:bg-orange-100 text-left justify-start"
                            data-testid={`issue-button-${issue.toLowerCase().replace(/\s+/g, "-")}`}
                            onClick={async () => {
                              setChatMessages((prev) => [
                                ...prev,
                                { type: "user", text: issue },
                              ]);
                              const result = await processTicketMessage(
                                issue,
                                "selection",
                              );
                              helpdeskState.current.collectedData =
                                result.collectedData;
                              helpdeskState.current.currentStep =
                                result.currentStep;

                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "bot",
                                  text: result.message || "Next step...",
                                  helpdeskStep: result.currentStep,
                                  helpdeskOptions: result.options,
                                  helpdeskCollectedData: result.collectedData,
                                },
                              ]);
                            }}
                          >
                            🔧 {issue}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                {msg.helpdeskStep === "SELECT_LOCATION_LEVEL" &&
                  msg.helpdeskOptions && (
                    <div
                      className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200"
                      data-testid="helpdesk-select-location-level"
                    >
                      <p className="text-sm font-semibold mb-2 text-gray-700">
                        Select Location Level:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Array.isArray(msg.helpdeskOptions)
                          ? msg.helpdeskOptions
                          : msg.helpdeskOptions.levels || []
                        ).map((level: string) => (
                          <Button
                            key={level}
                            size="sm"
                            variant="outline"
                            className="text-xs bg-white hover:bg-green-100"
                            data-testid={`level-button-${level.toLowerCase().replace(/\s+/g, "-")}`}
                            onClick={async () => {
                              setChatMessages((prev) => [
                                ...prev,
                                { type: "user", text: level },
                              ]);
                              const result = await processTicketMessage(
                                level,
                                "selection",
                              );
                              helpdeskState.current.collectedData =
                                result.collectedData;
                              helpdeskState.current.currentStep =
                                result.currentStep;

                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "bot",
                                  text: result.message || "Next step...",
                                  helpdeskStep: result.currentStep,
                                  helpdeskOptions: result.options,
                                  helpdeskCollectedData: result.collectedData,
                                },
                              ]);
                            }}
                          >
                            📌 {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                {msg.helpdeskStep === "ENTER_LOCATION_NAME" && (
                  <div
                    className="mt-3 p-3 bg-teal-50 rounded-lg border border-teal-200"
                    data-testid="helpdesk-enter-location-name"
                  >
                    <p className="text-sm font-semibold mb-2 text-gray-700">
                      Enter Location Name:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type location name and press Enter..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        data-testid="input-location-name"
                        onKeyPress={async (e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            const locationName = e.currentTarget.value.trim();
                            const inputElement = e.currentTarget;
                            setChatMessages((prev) => [
                              ...prev,
                              { type: "user", text: locationName },
                            ]);
                            const result = await processTicketMessage(
                              locationName,
                              "text",
                            );
                            helpdeskState.current.collectedData =
                              result.collectedData;
                            helpdeskState.current.currentStep =
                              result.currentStep;

                            setChatMessages((prev) => [
                              ...prev,
                              {
                                type: "bot",
                                text: result.message || "Next step...",
                                helpdeskStep: result.currentStep,
                                helpdeskOptions: result.options,
                                helpdeskCollectedData: result.collectedData,
                              },
                            ]);
                            if (inputElement) inputElement.value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {msg.helpdeskStep === "ENTER_DESCRIPTION" && (
                  <div
                    className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                    data-testid="helpdesk-enter-description"
                  >
                    <p className="text-sm font-semibold mb-2 text-gray-700">
                      Describe the Issue:
                    </p>
                    <div className="space-y-2">
                      <textarea
                        placeholder="Describe the issue in detail..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 min-h-[80px]"
                        data-testid="textarea-description"
                        onKeyPress={async (e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            e.currentTarget.value.trim()
                          ) {
                            e.preventDefault();
                            const description = e.currentTarget.value.trim();
                            const textareaElement = e.currentTarget;
                            setChatMessages((prev) => [
                              ...prev,
                              { type: "user", text: description },
                            ]);
                            const result = await processTicketMessage(
                              description,
                              "text",
                            );
                            helpdeskState.current.collectedData =
                              result.collectedData;
                            helpdeskState.current.currentStep =
                              result.currentStep;

                            setChatMessages((prev) => [
                              ...prev,
                              {
                                type: "bot",
                                text: result.message || "Next step...",
                                helpdeskStep: result.currentStep,
                                helpdeskOptions: result.options,
                                helpdeskCollectedData: result.collectedData,
                              },
                            ]);
                            if (textareaElement) textareaElement.value = "";
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500">
                        Press Enter to submit, Shift+Enter for new line
                      </p>
                    </div>
                  </div>
                )}

                {msg.helpdeskStep === "ATTACH_IMAGES" && (
                  <div
                    className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200"
                    data-testid="helpdesk-attach-images"
                  >
                    <p className="text-sm font-semibold mb-2 text-gray-700">
                      Attach Files (Optional):
                    </p>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.xlsx,.xls"
                        multiple
                        max={5}
                        className="hidden"
                        id={`file-upload-${i}`}
                        data-testid="input-file-upload"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 5) {
                            setChatMessages((prev) => [
                              ...prev,
                              {
                                type: "bot",
                                text: "❌ You can only upload up to 5 files.",
                              },
                            ]);
                            return;
                          }

                          if (files.length > 0) {
                            setChatMessages((prev) => [
                              ...prev,
                              {
                                type: "user",
                                text: `📎 Uploading ${files.length} file(s)...`,
                              },
                            ]);

                            const uploadResult =
                              await uploadHelpdeskFiles(files);

                            const filesList =
                              (uploadResult as any).files ||
                              (uploadResult as any).fileNames;
                            if (uploadResult.success && filesList) {
                              helpdeskState.current.uploadedFiles = filesList;

                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "bot",
                                  text: `✅ Successfully uploaded ${filesList.length} file(s): ${filesList.join(", ")}`,
                                },
                              ]);

                              const result = await processTicketMessage(
                                "Files uploaded",
                                "text",
                              );
                              helpdeskState.current.collectedData =
                                result.collectedData;
                              helpdeskState.current.currentStep =
                                result.currentStep;

                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "bot",
                                  text: result.message || "Next step...",
                                  helpdeskStep: result.currentStep,
                                  helpdeskOptions: result.options,
                                  helpdeskCollectedData: result.collectedData,
                                },
                              ]);
                            } else {
                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "bot",
                                  text: `❌ Upload failed: ${uploadResult.message}`,
                                },
                              ]);
                            }
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          data-testid="button-choose-files"
                          onClick={() => {
                            document
                              .getElementById(`file-upload-${i}`)
                              ?.click();
                          }}
                        >
                          📎 Choose Files
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          data-testid="button-skip-upload"
                          onClick={async () => {
                            setChatMessages((prev) => [
                              ...prev,
                              { type: "user", text: "Skip file upload" },
                            ]);
                            const result = await processTicketMessage(
                              "skip",
                              "text",
                            );
                            helpdeskState.current.collectedData =
                              result.collectedData;
                            helpdeskState.current.currentStep =
                              result.currentStep;

                            setChatMessages((prev) => [
                              ...prev,
                              {
                                type: "bot",
                                text: result.message || "Next step...",
                                helpdeskStep: result.currentStep,
                                helpdeskOptions: result.options,
                                helpdeskCollectedData: result.collectedData,
                              },
                            ]);
                          }}
                        >
                          ⏭️ Skip
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Supports JPEG, PNG, GIF, PDF, Excel (.xlsx, .xls) - max
                        5 files
                      </p>
                      {helpdeskState.current.uploadedFiles &&
                        helpdeskState.current.uploadedFiles.length > 0 && (
                          <div className="mt-2 p-2 bg-white rounded border border-indigo-200">
                            <p className="text-xs font-semibold mb-1">
                              Uploaded Files:
                            </p>
                            <ul className="text-xs space-y-1">
                              {helpdeskState.current.uploadedFiles.map(
                                (file, idx) => (
                                  <li key={idx}>📄 {file}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {msg.helpdeskStep === "SELECT_PRIORITY" &&
                  msg.helpdeskOptions && (
                    <div
                      className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200"
                      data-testid="helpdesk-select-priority"
                    >
                      <p className="text-sm font-semibold mb-2 text-gray-700">
                        Select Priority Level:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {(msg.helpdeskOptions as any).priorities?.map(
                          (priority: string, idx: number) => {
                            const priorityStyles = {
                              High: "bg-red-100 hover:bg-red-200 border-red-300 text-red-800",
                              Medium:
                                "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800",
                              Low: "bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800",
                            };
                            const priorityIcons = {
                              High: "🔴",
                              Medium: "🟡",
                              Low: "🟢",
                            };
                            return (
                              <Button
                                key={idx}
                                size="sm"
                                variant="outline"
                                className={`justify-start ${priorityStyles[priority as keyof typeof priorityStyles] || ""}`}
                                data-testid={`button-priority-${priority.toLowerCase()}`}
                                onClick={async () => {
                                  setChatMessages((prev) => [
                                    ...prev,
                                    { type: "user", text: priority },
                                  ]);
                                  const result = await processTicketMessage(
                                    priority,
                                    "selection",
                                  );
                                  helpdeskState.current.collectedData =
                                    result.collectedData;
                                  helpdeskState.current.currentStep =
                                    result.currentStep;

                                  setChatMessages((prev) => [
                                    ...prev,
                                    {
                                      type: "bot",
                                      text: result.message || "Next step...",
                                      helpdeskStep: result.currentStep,
                                      helpdeskOptions: result.options,
                                      helpdeskCollectedData:
                                        result.collectedData,
                                    },
                                  ]);
                                }}
                              >
                                {
                                  priorityIcons[
                                  priority as keyof typeof priorityIcons
                                  ]
                                }{" "}
                                {priority}
                              </Button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                {msg.helpdeskStep === "DASHBOARD_LINK" && (
                  <div
                    className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200"
                    data-testid="helpdesk-dashboard-link"
                  >
                    <p className="text-sm font-semibold mb-2 text-gray-700">
                      🔗 Dashboard Link (Optional):
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      Paste a dashboard URL you're referring to in your issue
                      (if applicable):
                    </p>
                    <Input
                      id={`dashboard-link-${Date.now()}`}
                      type="url"
                      placeholder="https://example.com/dashboard/..."
                      className="w-full mb-3"
                      data-testid="input-dashboard-link"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          const input = e.currentTarget;
                          const url = input.value.trim();

                          (async () => {
                            if (url) {
                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  type: "user",
                                  text: `Dashboard Link: ${url}`,
                                },
                              ]);
                            } else {
                              setChatMessages((prev) => [
                                ...prev,
                                { type: "user", text: "Skip dashboard link" },
                              ]);
                            }

                            const result = await processTicketMessage(
                              url || "skip",
                              "text",
                            );
                            helpdeskState.current.collectedData =
                              result.collectedData;
                            helpdeskState.current.currentStep =
                              result.currentStep;

                            setChatMessages((prev) => [
                              ...prev,
                              {
                                type: "bot",
                                text: result.message || "Next step...",
                                helpdeskStep: result.currentStep,
                                helpdeskOptions: result.options,
                                helpdeskCollectedData: result.collectedData,
                              },
                            ]);
                          })();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-submit-dashboard-link"
                        onClick={async () => {
                          const input = document.getElementById(
                            `dashboard-link-${Date.now() - 1000}`,
                          ) as HTMLInputElement;
                          const url = input?.value.trim() || "";

                          if (url) {
                            setChatMessages((prev) => [
                              ...prev,
                              { type: "user", text: `Dashboard Link: ${url}` },
                            ]);
                          } else {
                            setChatMessages((prev) => [
                              ...prev,
                              { type: "user", text: "Skip dashboard link" },
                            ]);
                          }

                          const result = await processTicketMessage(
                            url || "skip",
                            "text",
                          );
                          helpdeskState.current.collectedData =
                            result.collectedData;
                          helpdeskState.current.currentStep =
                            result.currentStep;

                          setChatMessages((prev) => [
                            ...prev,
                            {
                              type: "bot",
                              text: result.message || "Next step...",
                              helpdeskStep: result.currentStep,
                              helpdeskOptions: result.options,
                              helpdeskCollectedData: result.collectedData,
                            },
                          ]);
                        }}
                      >
                        ✅ Continue
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        data-testid="button-skip-dashboard-link"
                        onClick={async () => {
                          setChatMessages((prev) => [
                            ...prev,
                            { type: "user", text: "Skip dashboard link" },
                          ]);
                          const result = await processTicketMessage(
                            "skip",
                            "text",
                          );
                          helpdeskState.current.collectedData =
                            result.collectedData;
                          helpdeskState.current.currentStep =
                            result.currentStep;

                          setChatMessages((prev) => [
                            ...prev,
                            {
                              type: "bot",
                              text: result.message || "Next step...",
                              helpdeskStep: result.currentStep,
                              helpdeskOptions: result.options,
                              helpdeskCollectedData: result.collectedData,
                            },
                          ]);
                        }}
                      >
                        ⏭️ Skip
                      </Button>
                    </div>
                  </div>
                )}

                {msg.helpdeskStep === "CONFIRM_TICKET" &&
                  msg.helpdeskCollectedData && (
                    <div
                      className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200"
                      data-testid="helpdesk-confirm-ticket"
                    >
                      <p className="text-sm font-semibold mb-3 text-gray-700">
                        📋 Ticket Summary:
                      </p>
                      <div className="space-y-2 bg-white p-3 rounded-lg border border-gray-200 text-sm">
                        {msg.helpdeskCollectedData.region && (
                          <div>
                            <span className="font-semibold">Region:</span>{" "}
                            {msg.helpdeskCollectedData.region}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.category && (
                          <div>
                            <span className="font-semibold">Category:</span>{" "}
                            {msg.helpdeskCollectedData.category}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.specific_issue && (
                          <div>
                            <span className="font-semibold">Issue:</span>{" "}
                            {msg.helpdeskCollectedData.specific_issue}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.description && (
                          <div>
                            <span className="font-semibold">Description:</span>{" "}
                            {msg.helpdeskCollectedData.description}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.level && (
                          <div>
                            <span className="font-semibold">Level:</span>{" "}
                            {msg.helpdeskCollectedData.level}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.scheme_name && (
                          <div>
                            <span className="font-semibold">Scheme:</span>{" "}
                            {msg.helpdeskCollectedData.scheme_name}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.village_name && (
                          <div>
                            <span className="font-semibold">Village:</span>{" "}
                            {msg.helpdeskCollectedData.village_name}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.esr_name && (
                          <div>
                            <span className="font-semibold">ESR:</span>{" "}
                            {msg.helpdeskCollectedData.esr_name}
                          </div>
                        )}
                        {msg.helpdeskCollectedData.priority && (
                          <div>
                            <span className="font-semibold">Priority:</span>{" "}
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${msg.helpdeskCollectedData.priority === "High"
                                ? "bg-red-100 text-red-800"
                                : msg.helpdeskCollectedData.priority ===
                                  "Medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                                }`}
                            >
                              {msg.helpdeskCollectedData.priority}
                            </span>
                          </div>
                        )}
                        {msg.helpdeskCollectedData.dashboard_url && (
                          <div>
                            <span className="font-semibold">
                              Dashboard Link:
                            </span>{" "}
                            <a
                              href={msg.helpdeskCollectedData.dashboard_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs break-all"
                            >
                              {msg.helpdeskCollectedData.dashboard_url}
                            </a>
                          </div>
                        )}
                        {helpdeskState.current.uploadedFiles &&
                          helpdeskState.current.uploadedFiles.length > 0 && (
                            <div>
                              <span className="font-semibold">
                                Attachments:
                              </span>
                              <ul className="ml-4 mt-1">
                                {helpdeskState.current.uploadedFiles.map(
                                  (file, idx) => (
                                    <li key={idx}>📄 {file}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          data-testid="button-submit-ticket"
                          onClick={async () => {
                            setChatMessages((prev) => [
                              ...prev,
                              { type: "user", text: "Submit ticket" },
                            ]);
                            setLoading(true);

                            const createResult = await createTicket();

                            if (createResult.success && createResult.ticket) {
                              // Use streaming for ticket creation success message
                              await addStreamedBotMessage(
                                {
                                  text: `✅ Ticket created successfully!\n\nYour ticket ID is **${createResult.ticket.ticket_id}**\n\nEmail notifications have been sent to you and the regional vendor team.`,
                                  widget: "helpdeskTicket",
                                  ticket: createResult.ticket,
                                },
                                40, // Medium-speed streaming for important messages
                              );

                              helpdeskState.current = { active: false };
                            } else {
                              // Use streaming for ticket creation failure message
                              await addStreamedBotMessage(
                                {
                                  text: `❌ ${createResult.message || "Failed to create ticket"}`,
                                },
                                30, // Fast streaming for error messages
                              );
                            }

                            setLoading(false);
                          }}
                        >
                          ✅ Submit Ticket
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          data-testid="button-cancel-ticket"
                          onClick={async () => {
                            setChatMessages((prev) => [
                              ...prev,
                              { type: "user", text: "Cancel ticket creation" },
                            ]);
                            await addStreamedBotMessage(
                              {
                                text: "❌ Ticket creation cancelled. You can start a new ticket anytime by saying 'create a ticket'.",
                              },
                              30,
                            );
                            helpdeskState.current = { active: false };
                          }}
                        >
                          ❌ Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                {/* Render ESRCapacityWidget */}
                {msg.widget === "esrCapacity" && (
                  <div className="mt-3">
                    <ESRCapacityWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                      selectedVillage={msg.selectedVillage || "all"}
                    />
                  </div>
                )}

                {/* Render Chlorine Sensor Export Widget */}
                {msg.widget === "chlorineSensorExport" && msg.chlorineSensorExportData && (
                  <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          📊 {msg.chlorineSensorExportData.count} sensors found
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Status: {msg.chlorineSensorExportData.label} for {msg.chlorineSensorExportData.days} day{msg.chlorineSensorExportData.days !== 1 ? 's' : ''}
                          {msg.chlorineSensorExportData.region !== "all" ? ` in ${msg.chlorineSensorExportData.region}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        className="ml-4 bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-download-chlorine-sensor-excel"
                        onClick={async () => {
                          try {
                            const params = new URLSearchParams();
                            if (msg.chlorineSensorExportData.region !== "all") {
                              params.append("region", msg.chlorineSensorExportData.region);
                            }

                            // Use fetch with credentials for proper authentication
                            const response = await fetch(
                              `/api/chlorine/day-wise-sensors-export/${msg.chlorineSensorExportData.metric}/${msg.chlorineSensorExportData.days}?${params.toString()}`,
                              {
                                credentials: 'same-origin',
                                headers: {
                                  'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                },
                              }
                            );

                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              const filename = `Chlorine_Sensors_${msg.chlorineSensorExportData.label.replace(/\s+/g, '_')}_${msg.chlorineSensorExportData.days}days_${msg.chlorineSensorExportData.region}_${new Date().toISOString().split('T')[0]}.xlsx`;
                              link.download = filename;
                              link.setAttribute('type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);

                              await addStreamedBotMessage(
                                {
                                  text: `✅ Successfully downloaded Excel file with ${msg.chlorineSensorExportData.count} sensor records!`,
                                },
                                30,
                              );
                            } else {
                              const errorText = response.status === 401
                                ? "Authentication required. Please ensure you're logged in."
                                : response.status === 403
                                  ? "You don't have permission to download this file."
                                  : "Failed to download Excel file. Please try again.";

                              await addStreamedBotMessage(
                                {
                                  text: `❌ ${errorText}`,
                                },
                                30,
                              );
                            }
                          } catch (error) {
                            console.error("Error downloading sensor Excel:", error);
                            await addStreamedBotMessage(
                              {
                                text: "❌ An error occurred while downloading the Excel file.",
                              },
                              30,
                            );
                          }
                        }}
                      >
                        📥 Download Excel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Render Villages widgets */}
                {msg.widget === "villagesWithWater" && msg.villages && (
                  <div className="mt-3">
                    <VillagesWithWaterWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                      language={msg.language || "en"}
                    />
                  </div>
                )}

                {msg.widget === "villagesNoWater" && msg.villages && (
                  <div className="mt-3">
                    <VillagesNoWaterWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                      language={msg.language || "en"}
                    />
                  </div>
                )}

                {msg.widget === "consistentWater" && msg.villages && (
                  <div className="mt-3">
                    <ConsistentWaterWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "consistentZero" && msg.villages && (
                  <div className="mt-3">
                    <ConsistentZeroWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render LPCD widgets */}
                {msg.widget === "above55Lpcd" && msg.villages && (
                  <div className="mt-3">
                    <Above55LpcdWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                      language={msg.language || "en"}
                    />
                  </div>
                )}

                {msg.widget === "below55Lpcd" && msg.villages && (
                  <div className="mt-3">
                    <Below55LpcdWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                      language={msg.language || "en"}
                    />
                  </div>
                )}

                {msg.widget === "consistentAbove55Lpcd" && msg.villages && (
                  <div className="mt-3">
                    <ConsistentAbove55LpcdWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "consistentBelow55Lpcd" && msg.villages && (
                  <div className="mt-3">
                    <ConsistentBelow55LpcdWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Scheme-level LPCD widgets */}
                {msg.widget === "combinedSchemeLpcd" && (
                  <div className="mt-3">
                    <CombinedSchemeLpcdWidget
                      selectedRegion={msg.selectedRegion || "all"}
                    />
                  </div>
                )}

                {msg.widget === "above55Scheme" && msg.schemes && (
                  <div className="mt-3">
                    <Above55SchemeWidget
                      schemes={msg.schemes}
                      selectedRegion={msg.selectedRegion || "all"}
                    />
                  </div>
                )}

                {msg.widget === "below55Scheme" && msg.schemes && (
                  <div className="mt-3">
                    <Below55SchemeWidget
                      schemes={msg.schemes}
                      selectedRegion={msg.selectedRegion || "all"}
                    />
                  </div>
                )}

                {/* Render Chart widgets */}
                {msg.widget === "waterConsumptionChart" && msg.villageData && (
                  <div className="mt-3">
                    <WaterConsumptionChartWidget
                      villageData={msg.villageData}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "lpcdChart" && msg.villageData && (
                  <div className="mt-3">
                    <LPCDChartWidget
                      villageData={msg.villageData}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "chlorineAnalysisChart" && msg.villageData && (
                  <div className="mt-3">
                    <ChlorineAnalysisChartWidget
                      villageData={msg.villageData}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "pressureAnalysisChart" && msg.villageData && (
                  <div className="mt-3">
                    <PressureAnalysisChartWidget
                      villageData={msg.villageData}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Village Selection Widget for multiple matches */}
                {msg.widget === "villageSelection" && msg.villageOptions && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Click on a village to view its data:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.villageOptions.map((village: any, idx: number) => (
                        <button
                          key={idx}
                          data-testid={`village-option-${idx}`}
                          onClick={() => {
                            const chartType = msg.chartType || "lpcdChart";
                            const chartLabel = chartType === "lpcdChart" ? "LPCD" :
                              chartType === "waterConsumptionChart" ? "water consumption" : chartType;
                            handleSendMessage(`${chartLabel} graph of ${village.village_name} in scheme ${village.scheme_id}`, false);
                          }}
                          className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 
                                     rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300
                                     transition-colors duration-200 text-left"
                        >
                          <div className="font-medium">{village.village_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {village.scheme_name}, {village.block}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render Pressure widgets */}
                {msg.widget === "optimalPressure" && msg.esrs && (
                  <div className="mt-3">
                    <OptimalPressureWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "belowPressure" && msg.esrs && (
                  <div className="mt-3">
                    <BelowPressureWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "abovePressure" && msg.esrs && (
                  <div className="mt-3">
                    <AbovePressureWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Chlorine widgets */}
                {msg.widget === "optimalChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <OptimalChlorineWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "belowChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <BelowChlorineWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "aboveChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <AboveChlorineWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Consistent Chlorine widgets */}
                {msg.widget === "consistentOptimalChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <ConsistentOptimalChlorineWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "consistentAboveChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <ConsistentAboveChlorineWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "consistentBelowChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <ConsistentBelowChlorineWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Consistent Pressure widgets */}
                {msg.widget === "consistentOptimalPressure" && msg.esrs && (
                  <div className="mt-3">
                    <ConsistentOptimalPressureWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "consistentAbovePressure" && msg.esrs && (
                  <div className="mt-3">
                    <ConsistentAbovePressureWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "consistentBelowPressure" && msg.esrs && (
                  <div className="mt-3">
                    <ConsistentBelowPressureWidget
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Average LPCD widgets */}
                {msg.widget === "averageAbove55Lpcd" && msg.villages && (
                  <div className="mt-3">
                    <AverageAbove55LpcdWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "averageBelow55Lpcd" && msg.villages && (
                  <div className="mt-3">
                    <AverageBelow55LpcdWidget
                      villages={msg.villages}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Average Chlorine widgets */}
                {msg.widget === "averageOptimalChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <AverageOptimalChlorineWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "averageBelowChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <AverageBelowChlorineWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "averageAboveChlorine" && msg.esrs && (
                  <div className="mt-3">
                    <AverageAboveChlorineWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Average Pressure widgets */}
                {msg.widget === "averageOptimalPressure" && msg.esrs && (
                  <div className="mt-3">
                    <AverageOptimalPressureWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "averageBelowPressure" && msg.esrs && (
                  <div className="mt-3">
                    <AverageBelowPressureWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {msg.widget === "averageAbovePressure" && msg.esrs && (
                  <div className="mt-3">
                    <AverageAbovePressureWidget
                      esrs={msg.esrs}
                      selectedRegion={msg.selectedRegion || "all"}
                      selectedScheme={msg.selectedScheme || "all"}
                    />
                  </div>
                )}

                {/* Render Combined Analysis widgets */}
                {msg.widget === "combine-chlorine-status" &&
                  msg.combinedChlorineData && (
                    <div className="mt-3">
                      <CombineChlorineStatusWidget
                        data={msg.combinedChlorineData}
                        counts={msg.combinedChlorineCounts}
                        selectedRegion={msg.selectedRegion || "all"}
                        selectedScheme={msg.selectedScheme || "all"}
                      />
                    </div>
                  )}

                {msg.widget === "combine-pressure-status" &&
                  msg.combinedPressureData && (
                    <div className="mt-3">
                      <CombinePressureStatusWidget
                        data={msg.combinedPressureData}
                        counts={msg.combinedPressureCounts}
                        selectedRegion={msg.selectedRegion || "all"}
                        selectedScheme={msg.selectedScheme || "all"}
                      />
                    </div>
                  )}

                {/* Render PartialSchemesWidget */}
                {msg.widget === "partialSchemes" && msg.schemes && (
                  <div className="mt-3">
                    <PartialSchemesWidget
                      schemes={msg.schemes}
                      selectedRegion={msg.selectedRegion || "all"}
                      schemeType={msg.schemeType || "partial"}
                    />
                  </div>
                )}

                {/* Render AreaCoverageWidget */}
                {msg.widget === "areaCoverage" && msg.regions && (
                  <div className="mt-3">
                    <AreaCoverageWidget regions={msg.regions} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-2xl max-w-[80%] flex items-center shadow-lg">
                <div className="flex space-x-1">
                  <div
                    className="w-3 h-3 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className="ml-3 text-sm font-medium">
                  AI is thinking...
                </span>
              </div>
            </div>
          )}

          {chatMessages.length === 1 && (
            <>
              {/* Display the voice assistant guide */}
              <ChatbotGuide />

              {/* Example queries */}
              <div className="flex justify-start">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-4 rounded-2xl max-w-[90%] shadow-md">
                  <p className="text-sm font-semibold mb-3 text-indigo-900">
                    ✨ Try asking me:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-xs px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      onClick={() =>
                        handlePredefinedQuery(
                          "How many flow meters are there in all regions?",
                        )
                      }
                    >
                      Flow meters in all regions
                    </button>
                    <button
                      className="text-xs px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      onClick={() =>
                        handlePredefinedQuery(
                          "How many ESRs are in Nagpur region?",
                        )
                      }
                    >
                      ESRs in Nagpur
                    </button>
                    <button
                      className="text-xs px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      onClick={() =>
                        handlePredefinedQuery("Show summary statistics")
                      }
                    >
                      Summary statistics
                    </button>
                    <button
                      className="text-xs px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl hover:from-pink-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      onClick={() =>
                        handlePredefinedQuery(
                          "How many flow meters in Bidgaon Village?",
                        )
                      }
                    >
                      Flow meters in Bidgaon Village
                    </button>
                    <button
                      className="text-xs px-3 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      onClick={() =>
                        handlePredefinedQuery(
                          "Download Excel for fully completed schemes in Nagpur",
                        )
                      }
                    >
                      Export Nagpur data to Excel
                    </button>
                    <button
                      className="text-xs px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      onClick={() =>
                        handlePredefinedQuery(
                          "How many chlorine analyzers in all regions?",
                        )
                      }
                    >
                      Chlorine analyzers in all regions
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Area at Bottom */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-gray-200 p-6">
        {/* Input Row */}
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="✨ Ask me about water schemes, regions, or data..."
              className="w-full h-14 pl-6 pr-20 border-2 border-indigo-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:border-indigo-300 transition-all duration-200 shadow-sm text-gray-800 placeholder-gray-500"
              disabled={loading && false} // Allow typing even when loading, just disable send
            />
            <div className="flex gap-2 absolute right-2 top-1/2 -translate-y-1/2">
              <Button
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || loading}
                className={`rounded-xl w-10 h-10 p-0 flex items-center justify-center transition-all ${!input.trim() || loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105"
                  }`}
              >
                <Send className="w-5 h-5 text-white" />
              </Button>
              <VoiceRecognition
                onTranscript={(text) => {
                  setInput(text);
                  // Optional: Auto-send if needed, but for now just populate input
                  // handleSendMessage(text, true);
                }}
                isDisabled={false} // Always enable mic so user can stop it even when loading
              />
              {/* Global Stop Speaker Button */}
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl w-10 h-10 p-0 bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                onClick={() => {
                  window.speechSynthesis.cancel();
                }}
                title="Stop Speaking"
              >
                <VolumeX className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatbotComponent: React.FC = () => {
  // Use shared chatbot context so header and other components can open/close it
  const {
    showChatbot,
    toggleChatbot,
    closeChatbot,
    chatbotPosition,
    setChatbotPosition,
    chatbotSize,
    setChatbotSize,
  } = useChatbot();
  const [modelLoading, setModelLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [suggestionInput, setSuggestionInput] = useState<string>("");

  // Reference for the overlay
  const overlayRef = React.useRef<HTMLDivElement>(null);

  // Show welcome popup after login (force it to show in this update)
  useEffect(() => {
    // Immediately show welcome popup
    const timer = setTimeout(() => {
      setShowWelcome(true);

      // Auto-hide the welcome popup after 8 seconds
      const hideTimer = setTimeout(() => {
        setShowWelcome(false);
      }, 8000);

      return () => clearTimeout(hideTimer);
    }, 1500); // Show popup 1.5 seconds after component mounts

    return () => clearTimeout(timer);
  }, []);

  // Load TensorFlow model on component mount but don't block rendering
  useEffect(() => {
    const loadTensorFlowModel = async () => {
      setModelLoading(true);
      try {
        // Import modules only when needed
        await import("@tensorflow/tfjs");
        await import("@tensorflow-models/universal-sentence-encoder");
        console.log("TensorFlow modules imported");
      } catch (error) {
        console.warn("Error importing TensorFlow modules:", error);
      } finally {
        setModelLoading(false);
      }
    };

    if (showChatbot) {
      loadTensorFlowModel();
    }
  }, [showChatbot]);

  // toggleChatbot and closeChatbot come from context

  // Handle clicking outside overlay to close
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeChatbot();
    }
  };

  return (
    <>
      {/* Fixed Chatbot Icon at Bottom-Right */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={toggleChatbot}
          className="rounded-full w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-2xl flex items-center justify-center transform transition-all duration-200 hover:scale-105 group"
          data-testid="button-chatbot-toggle"
        >
          <MessageSquare className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
          {modelLoading && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
          )}
        </Button>

        {/* Enhanced welcome popup message with animation */}
        {showWelcome && (
          <div
            className="absolute bottom-20 right-0 bg-gradient-to-br from-white to-blue-50 p-4 rounded-xl shadow-xl border border-blue-300 w-72 animate-in fade-in slide-in-from-bottom-5 duration-300"
            style={{ transformOrigin: "bottom right" }}
          >
            <div className="flex items-start">
              <div className="mr-3 mt-0.5 bg-blue-100 p-2 rounded-full">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  How may I help you?
                </p>
                <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
                  Click this icon to ask questions about water infrastructure
                  data, schemes, and regions
                </p>
              </div>
            </div>
            <div className="absolute w-4 h-4 bg-blue-300 rotate-45 bottom-[-8px] right-6"></div>
            <div className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-ping"></div>
            </div>
          </div>
        )}
      </div>

      {/* Partial-Screen Overlay */}
      {showChatbot && (
        <div
          className="fixed inset-0 z-[99999] animate-in fade-in duration-300"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
          }}
          onClick={handleOverlayClick}
          data-testid="overlay-chatbot"
        >
          {/* Blurred Background */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md"></div>

          {/* Chatbot Overlay - Draggable and Resizable */}
          <Rnd
            position={{ x: chatbotPosition.x, y: chatbotPosition.y }}
            size={{ width: chatbotSize.width, height: chatbotSize.height }}
            onDragStop={(e, d) => {
              setChatbotPosition({ x: d.x, y: d.y });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              setChatbotSize({
                width: parseInt(ref.style.width),
                height: parseInt(ref.style.height),
              });
              setChatbotPosition(position);
            }}
            minWidth={800}
            minHeight={500}
            maxWidth={window.innerWidth - 40}
            maxHeight={window.innerHeight - 40}
            bounds="parent"
            dragHandleClassName="chatbot-drag-handle"
            enableResizing={{
              top: true,
              right: true,
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true,
            }}
            style={{ zIndex: 100000 }}
          >
            <div
              ref={overlayRef}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full h-full flex flex-col border border-gray-200 dark:border-slate-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar - Drag Handle */}
              <div className="chatbot-drag-handle flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 rounded-t-2xl cursor-move">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
                      जलमित्र
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-slate-300 font-medium">
                      🤖 Your AI-powered water management assistant
                    </p>
                  </div>
                  {modelLoading && (
                    <div className="w-6 h-6 rounded-full border-3 border-purple-500 border-t-transparent animate-spin"></div>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <p className="text-xL text-gray-500 dark:text-slate-400 font-medium mb-1">
                    Designed & Developed by
                  </p>
                  <a className="navbar-brand ps-1" href="https://cstech.ai/">
                    <img
                      alt="CS TECH Ai – Enhancing Possibilities"
                      className="img-fluid logo"
                      src="https://cstech.ai/img/logo.avif"
                      style={{
                        width: "220px",
                        height: "auto",
                        maxHeight: "160px",
                        objectFit: "contain",
                      }}
                    />
                  </a>
                  <button
                    onClick={closeChatbot}
                    className="w-6 h-6 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-2xl flex items-center justify-center transition-all duration-200 group shadow-md hover:shadow-lg"
                    data-testid="button-close-chatbot"
                  >
                    <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Two-Column Layout: Chat + Suggestions */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Chat Content */}
                <div className="flex-1 flex flex-col min-w-0">
                  <CustomChatbot
                    onClose={closeChatbot}
                    externalInput={suggestionInput}
                  />
                </div>

                {/* Right: Suggestions Sidebar */}
                <div className="w-80 flex-shrink-0 hidden lg:block">
                  <ChatbotSuggestions
                    onSuggestionClick={(question) => {
                      setSuggestionInput(question);
                      // Reset after a brief moment to allow new clicks
                      setTimeout(() => setSuggestionInput(""), 500);
                    }}
                  />
                </div>
              </div>
            </div>
          </Rnd>
        </div>
      )}
    </>
  );
};

export default ChatbotComponent;
