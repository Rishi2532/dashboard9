import React, { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface TextToSpeechProps {
  text: string;
  autoSpeak?: boolean;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({
  text,
  autoSpeak = true,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const previousTextRef = useRef("");
  const speakTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean text by removing markdown and other formatting
  const cleanTextForSpeech = useCallback((rawText: string) => {
    // Remove markdown formatting like **bold**
    let cleanedText = rawText.replace(/\*\*(.*?)\*\*/g, "$1");

    // Remove bullet points and replace with "there are"
    cleanedText = cleanedText.replace(/•\s*/g, "there are ");

    // Clean up any other special characters or formatting
    cleanedText = cleanedText.replace(/[\r\n]+/g, ". ");

    // Replace common abbreviations with full words for better pronunciation
    cleanedText = cleanedText
      .replace(/ESRs?/g, "Elevated Storage Reservoirs")
      .replace(/RCA/g, "Residual Chlorine Analyzer")
      .replace(/PT/g, "Pressure Transmitter");

    return cleanedText;
  }, []);

  // Enhanced language detection for a wider range of Indian languages
  const detectLanguageFromText = useCallback((text: string) => {
    // Hindi Unicode range
    if (/[\u0900-\u097F]/.test(text)) {
      // Check for specific Marathi patterns
      if (
        /(\u092E\u0930\u093E\u0920\u0940|\u0906\u0939\u0947|\u0906\u0939\u0947\u0924)/.test(
          text,
        )
      ) {
        return "mr-IN"; // Marathi
      }
      // Check for specific Tamil patterns in Devanagari transliteration
      else if (
        /(\u0924\u092E\u093F\u0933|\u0924\u092E\u093F\u0932)/.test(text)
      ) {
        return "ta-IN"; // Tamil
      }
      // Check for specific Telugu patterns in Devanagari transliteration
      else if (
        /(\u0924\u0947\u0932\u0941\u0917\u0941|\u0906\u0902\u0927\u094D\u0930)/.test(
          text,
        )
      ) {
        return "te-IN"; // Telugu
      }
      return "hi-IN"; // Default to Hindi for Devanagari
    }

    // Tamil Unicode range
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return "ta-IN"; // Tamil
    }

    // Telugu Unicode range
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return "te-IN"; // Telugu
    }

    // Bengali Unicode range
    if (/[\u0980-\u09FF]/.test(text)) {
      return "bn-IN"; // Bengali
    }

    // Gujarati Unicode range
    if (/[\u0A80-\u0AFF]/.test(text)) {
      return "gu-IN"; // Gujarati
    }

    // Kannada Unicode range
    if (/[\u0C80-\u0CFF]/.test(text)) {
      return "kn-IN"; // Kannada
    }

    // Malayalam Unicode range
    if (/[\u0D00-\u0D7F]/.test(text)) {
      return "ml-IN"; // Malayalam
    }

    // Default to Indian English
    return "en-IN";
  }, []);

  // Function to find the best voice for a given language
  const findVoiceForLanguage = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) return null;

      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;

      // Detect language from text
      const languageCode = detectLanguageFromText(text);
      console.log(`Detected language code for speech: ${languageCode}`);

      // Try to find a voice that matches the language exactly
      let matchedVoice = voices.find((voice) => voice.lang === languageCode);

      // If no exact match, try to find a voice that starts with the language code (e.g., 'hi-IN', 'hi')
      if (!matchedVoice) {
        const languagePrefix = languageCode.split("-")[0];
        matchedVoice = voices.find((voice) =>
          voice.lang.startsWith(languagePrefix),
        );
      }

      // If still no match, try to find any Indian voice
      if (!matchedVoice) {
        matchedVoice = voices.find((voice) => voice.lang.includes("IN"));
      }

      // As a fallback, try to find any English voice
      if (!matchedVoice) {
        matchedVoice = voices.find((voice) => voice.lang.includes("en"));
      }

      // If all else fails, use the first available voice
      return matchedVoice || voices[0];
    },
    [detectLanguageFromText],
  );

  // Function to speak text with enhanced error handling and retries
  const speak = useCallback(() => {
    if (!speechSupported) return;

    // Clean the text for speech
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    // Log for debugging
    console.log(
      `Speaking text: "${cleanedText.substring(0, 50)}${cleanedText.length > 50 ? "..." : ""}"`,
    );

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create a new speech utterance
      const utterance = new SpeechSynthesisUtterance(cleanedText);

      // Set speaking properties
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume

      // Find the best voice for the text
      const bestVoice = findVoiceForLanguage(cleanedText);
      if (bestVoice) {
        console.log(`Using voice: ${bestVoice.name} (${bestVoice.lang})`);
        utterance.voice = bestVoice;
        setSelectedVoice(bestVoice);
      } else {
        console.warn("No suitable voice found, using default voice");
      }

      // Set speaking state
      setIsSpeaking(true);

      // Speak the text
      window.speechSynthesis.speak(utterance);

      // Add event for when speech is finished
      utterance.onend = () => {
        setIsSpeaking(false);
      };

      // Add event for speech errors
      utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        setIsSpeaking(false);
      };

      // Add failsafe in case onend doesn't fire
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }

      speakTimeoutRef.current = setTimeout(
        () => {
          if (isSpeaking) {
            console.log("Speech timeout reached, resetting speaking state");
            setIsSpeaking(false);
          }
        },
        Math.max(5000, cleanedText.length * 80),
      ); // Minimum 5 seconds, or longer for longer text
    } catch (error) {
      console.error("Error in speech synthesis:", error);
      setIsSpeaking(false);
    }
  }, [
    text,
    speechSupported,
    cleanTextForSpeech,
    findVoiceForLanguage,
    isSpeaking,
  ]);

  // Stop speaking function
  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;

    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
        speakTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("Error stopping speech:", error);
    }
  }, [speechSupported]);

  // Check speech support and auto-speak on component mount or when props change
  useEffect(() => {
    // Check if browser supports speech synthesis
    if ("speechSynthesis" in window) {
      setSpeechSupported(true);

      // Always speak when text changes, regardless of autoSpeak flag
      // This ensures all bot messages are spoken, including error messages
      if (text && text !== previousTextRef.current) {
        console.log("Speaking new text (auto-speak always on)");
        previousTextRef.current = text;

        // Small delay to ensure the UI has updated
        setTimeout(() => {
          speak();
        }, 300);
      }
    } else {
      console.warn("Speech synthesis not supported in this browser");
    }

    // Cleanup function to stop speaking when component unmounts
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
    };
  }, [text, speak]);

  // Load voices when available
  useEffect(() => {
    if (!window.speechSynthesis) return;

    // Chrome needs this event handler to load voices
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log(`Loaded ${voices.length} speech synthesis voices`);
        // voices.forEach((voice, i) => {
        //   console.log(`Voice ${i}: ${voice.name} (${voice.lang})`);
        // });

        const bestVoice = findVoiceForLanguage(text);
        if (bestVoice) {
          setSelectedVoice(bestVoice);
        }
      }
    };

    // Initial load
    handleVoicesChanged();

    // Add event listener for voice changes
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged,
    );

    // Cleanup
    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged,
      );
    };
  }, [findVoiceForLanguage, text]);

  // Don't render anything if speech synthesis is not supported
  if (!speechSupported) return null;

  return (
    <button
      className={`p-1 rounded-full ${isSpeaking ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:text-blue-600"}`}
      onClick={isSpeaking ? stopSpeaking : speak}
      title={isSpeaking ? "Stop speaking" : "Listen to response"}
    >
      {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
};

export default TextToSpeech;
