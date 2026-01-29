import { createContext, useContext, useState, ReactNode } from "react";

interface ChatMessage {
  type: "user" | "bot";
  text: string;
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
  villages?: any[];
  esrs?: any[];
  combinedChlorineData?: any;
  combinedChlorineCounts?: any;
  combinedPressureData?: any;
  combinedPressureCounts?: any;
  villageData?: any;
  ticket?: any;
  tickets?: any[];
  ticketAnalytics?: any;
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

interface ChatbotPosition {
  x: number;
  y: number;
}

interface ChatbotSize {
  width: number;
  height: number;
}

interface ChatbotContextType {
  showChatbot: boolean;
  toggleChatbot: () => void;
  openChatbot: () => void;
  closeChatbot: () => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  chatbotPosition: ChatbotPosition;
  setChatbotPosition: (position: ChatbotPosition) => void;
  chatbotSize: ChatbotSize;
  setChatbotSize: (size: ChatbotSize) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

const DEFAULT_SIZE: ChatbotSize = {
  width: 1200,
  height: 650,
};

const DEFAULT_POSITION: ChatbotPosition = {
  x: 100,
  y: 40,
};

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [showChatbot, setShowChatbot] = useState(false);

  // In-memory state - resets on browser refresh, persists during navigation
  const [chatMessages, setChatMessagesState] = useState<ChatMessage[]>([
    {
      type: "bot",
      text: "Hello! I'm your JJM Assistant. How can I help you today?",
    },
  ]);

  const [chatbotPosition, setChatbotPositionState] =
    useState<ChatbotPosition>(DEFAULT_POSITION);

  const [chatbotSize, setChatbotSizeState] =
    useState<ChatbotSize>(DEFAULT_SIZE);

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
  };

  const openChatbot = () => {
    setShowChatbot(true);
  };

  const closeChatbot = () => {
    setShowChatbot(false);
  };

  const setChatMessages = (messages: ChatMessage[]) => {
    setChatMessagesState(messages);
  };

  const addMessage = (message: ChatMessage) => {
    setChatMessagesState((prev) => [...prev, message]);
  };

  const clearMessages = () => {
    const initialMessage: ChatMessage = {
      type: "bot",
      text: "Hello! I'm your JJM Assistant. How can I help you today?",
    };
    setChatMessagesState([initialMessage]);
  };

  const setChatbotPosition = (position: ChatbotPosition) => {
    setChatbotPositionState(position);
  };

  const setChatbotSize = (size: ChatbotSize) => {
    setChatbotSizeState(size);
  };

  return (
    <ChatbotContext.Provider
      value={{
        showChatbot,
        toggleChatbot,
        openChatbot,
        closeChatbot,
        chatMessages,
        setChatMessages,
        addMessage,
        clearMessages,
        chatbotPosition,
        setChatbotPosition,
        chatbotSize,
        setChatbotSize,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
}
