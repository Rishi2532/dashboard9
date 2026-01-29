import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  MapPin,
  Building2,
  Home,
  BarChart3,
  Droplets,
  Activity,
  Gauge,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface SuggestionCategory {
  title: string;
  icon: React.ReactNode;
  questions: string[];
  color: string;
}

interface ChatbotSuggestionsProps {
  onSuggestionClick: (question: string) => void;
}

export default function ChatbotSuggestions({
  onSuggestionClick,
}: ChatbotSuggestionsProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "general",
  ]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const suggestions: SuggestionCategory[] = [
    {
      title: "General Queries (All Regions)",
      icon: <Sparkles className="w-4 h-4" />,
      color: "text-purple-600 dark:text-purple-400",
      questions: [
        "Summary statistics",
        "Area coverage",
        "How  flow meters are integrated in all regions?",
        "How many ESRs integrated in all regions?",
        "How many chlorine analyzers are connected in all regions?",
        "How many pressure transmitters are intehgrated in all regions?",
        "Fully completed schemes",
        "Partial schemes",
        "Scheme analysis",
        "Fully completed villages",
      ],
    },
    {
      title: "Region-Specific Queries",
      icon: <MapPin className="w-4 h-4" />,
      color: "text-blue-600 dark:text-blue-400",
      questions: [
        "Show data for Nagpur region",
        "Amravati region statistics",
        "Pune region water consumption",
        "Nashik region ESR count",
        "Chhatrapati Sambhajinagar region schemes",
        "Konkan region villages with water",
        "Mumbai region LPCD analysis",
        "ESR level water consumption in Nagpur",
        "Chlorine analysis in Amravati",
        "Pressure analysis in Pune",
      ],
    },
    {
      title: "Scheme-Specific Queries",
      icon: <Building2 className="w-4 h-4" />,
      color: "text-green-600 dark:text-green-400",
      questions: [
        "ESR in Bidgaon Tarodi WSS",

        "Scheme details",
        "Flow meter count in bidgaon tarodi wss",
        "Water consumption in scheme",
        "ESR level water consumption in Kurha & 2 Villages RRWSS",
        "Chlorine levels in 20021406",
        "Pressure data for Takli & 4 Villages RRWS",
        "Comprehensive scheme analysis",
      ],
    },
    {
      title: "Village-Specific Queries",
      icon: <Home className="w-4 h-4" />,
      color: "text-orange-600 dark:text-orange-400",
      questions: [
        "Villages with water",
        "Villages without water",
        "Consistent water supply villages",
        "Villages with zero water",
        "Water consumption in bidgaon village",
        "LPCD in kurha village",
        "ESR in padali village",
        "ESR level water consumption in Tarodi village",
        "Flow meter count in Algudewadi village",
        "bidgaon historical data",
      ],
    },
    {
      title: "Water & LPCD Analysis",
      icon: <Droplets className="w-4 h-4" />,
      color: "text-cyan-600 dark:text-cyan-400",
      questions: [
        "Villages above 55 LPCD",
        "Villages below 55 LPCD",
        "Consistent above 55 LPCD",
        "Consistent below 55 LPCD",
        "Average above 55 LPCD",
        "Average below 55 LPCD",
        "Water consumption analysis",
        "LPCD statistics",
        "Abrupt water consumption",
        "ESR water consumption",
      ],
    },
    {
      title: "Chlorine Analysis (RCA)",
      icon: <Activity className="w-4 h-4" />,
      color: "text-teal-600 dark:text-teal-400",
      questions: [
        "Optimal chlorine levels",
        "Chlorine between 0.2 and 0.5",
        "Chlorine below 0.2",
        "Chlorine above 0.5",
        "Consistent optimal chlorine",
        "Consistent below chlorine",
        "Average optimal chlorine",
        "Chlorine analysis",
        "RCA analysis",
        "Residual chlorine data",
      ],
    },
    {
      title: "Pressure Analysis",
      icon: <Gauge className="w-4 h-4" />,
      color: "text-indigo-600 dark:text-indigo-400",
      questions: [
        "Optimal pressure levels",
        "Pressure between 0.2 and 0.7",
        "Pressure below 0.2",
        "Pressure above 0.7",
        "Consistent optimal pressure",
        "Consistent below pressure",
        "Average optimal pressure",
        "Pressure analysis",
        "Pressure data",
        "High pressure ESRs",
      ],
    },
    {
      title: "Charts & Visual Analysis",
      icon: <BarChart3 className="w-4 h-4" />,
      color: "text-pink-600 dark:text-pink-400",
      questions: [
        "7 day water consumption analysis",
        "Weekly water analysis",
        "Water consumption chart",
        "7 day LPCD analysis",
        "Weekly LPCD chart",
        "LPCD graph for village",
        "Chlorine analysis chart",
        "Pressure analysis chart",
        "Water consumption graph",
        "Generate weekly chart",
      ],
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-l border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Suggested Questions
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Click any question to ask the chatbot
        </p>
      </div>

      {/* Suggestions List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {suggestions.map((category, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.title)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={category.color}>{category.icon}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {category.title}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    ({category.questions.length})
                  </span>
                </div>
                {expandedCategories.includes(category.title) ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Category Questions */}
              {expandedCategories.includes(category.title) && (
                <div className="px-2 pb-2 space-y-1">
                  {category.questions.map((question, qIdx) => (
                    <Button
                      key={qIdx}
                      variant="ghost"
                      onClick={() => onSuggestionClick(question)}
                      className="w-full justify-start text-left h-auto py-2 px-3 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                      data-testid={`suggestion-${idx}-${qIdx}`}
                    >
                      <span className="truncate">{question}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
          💡 Tip: You can also type custom questions
        </p>
      </div>
    </div>
  );
}
