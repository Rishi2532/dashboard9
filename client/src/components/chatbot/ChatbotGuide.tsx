import React from "react";
import { Mic, Volume2, Languages } from "lucide-react";

/**
 * Component to display a guide on how to use the chatbot's voice features
 */
const ChatbotGuide: React.FC = () => {
  return (
    <div className="p-4 bg-blue-50 rounded-lg mb-4">
      <h3 className="text-md font-semibold text-blue-800 mb-2">
        Voice Assistant Guide
      </h3>

      <div className="space-y-3 text-sm">
        <div className="flex items-start">
          <Mic className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700">Voice Commands</p>
            <p className="text-blue-600">
              Click the microphone icon and speak naturally. Your question will
              be sent automatically when you pause speaking.
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <Volume2 className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700">Auto-Speech</p>
            <p className="text-blue-600">
              Responses are automatically spoken aloud. Click the speaker icon
              to stop or restart speech.
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <Languages className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700">Multilingual Support</p>
            <p className="text-blue-600">
              Choose your language from the dropdown next to the microphone.
              Supports English, Hindi, and Marathi.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-blue-700">
        <p>Try asking about water infrastructure in Maharashtra:</p>
        <ul className="list-disc list-inside pl-2 mt-1">
          <li>"How many flow meters are there in Nagpur region?"</li>
          <li>"Show me fully completed schemes"</li>
          <li>"What is the status of water projects in Pune?"</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatbotGuide;
