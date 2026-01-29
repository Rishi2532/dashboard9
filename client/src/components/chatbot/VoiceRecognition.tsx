import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff, RefreshCcw, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecognitionProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
}

// Expanded list of supported languages for speech recognition
// Including major Indian languages
const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'pa-IN', name: 'Punjabi' },
  { code: 'ur-IN', name: 'Urdu' },
  { code: 'en-US', name: 'English (US)' }
];

const VoiceRecognition: React.FC<VoiceRecognitionProps> = ({
  onTranscript,
  isDisabled = false
}) => {
  const [isListening, setIsListening] = useState(false);
  const [showError, setShowError] = useState(false);
  const [language, setLanguage] = useState('en-IN'); // Default to English (India)
  const [autoStopTimeout, setAutoStopTimeout] = useState<NodeJS.Timeout | null>(null);
  const [transcriptTimeout, setTranscriptTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const previousTranscriptRef = useRef('');
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // Update local listening state when the recognition service changes
  useEffect(() => {
    setIsListening(listening);
  }, [listening]);

  // Auto-submit when transcript changes and there's a pause in speaking
  useEffect(() => {
    if (transcript && transcript !== previousTranscriptRef.current && listening) {
      console.log(`New transcript detected: "${transcript}"`);
      previousTranscriptRef.current = transcript;

      // Clear previous timeout
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
      }

      // Set new timeout - auto-submit after 1.5 seconds of silence
      const timeout = setTimeout(() => {
        if (transcript.trim()) {
          console.log(`Auto-submitting after silence: "${transcript}"`);
          handleSubmitTranscript();
        }
      }, 1500);

      setAutoStopTimeout(timeout);
    }

    // Cleanup on unmount
    return () => {
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
      }
    };
  }, [transcript, listening]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle submit of transcript
  const handleSubmitTranscript = () => {
    if (transcript.trim()) {
      console.log(`Submitting transcript: "${transcript}"`);
      onTranscript(transcript);
      resetTranscript();
      SpeechRecognition.stopListening();

      // Clear any pending auto-stop timeout
      if (autoStopTimeout) {
        clearTimeout(autoStopTimeout);
        setAutoStopTimeout(null);
      }
    }
  };

  // Toggle listening state with improved error handling
  const toggleListening = () => {
    try {
      if (listening) {
        console.log('Stopping speech recognition');
        SpeechRecognition.stopListening();

        // Clear any pending auto-stop timeout
        if (autoStopTimeout) {
          clearTimeout(autoStopTimeout);
          setAutoStopTimeout(null);
        }
      } else {
        console.log(`Starting speech recognition in ${language}`);
        setShowError(false);
        resetTranscript();
        previousTranscriptRef.current = '';

        // Stop any ongoing speech output
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        // Attempt to start speech recognition
        SpeechRecognition.startListening({
          continuous: true,
          language: language
        }).catch(error => {
          console.error('Error starting speech recognition:', error);
          setShowError(true);
        });

        // Set a timeout to check if we're getting transcript
        if (transcriptTimeout) {
          clearTimeout(transcriptTimeout);
        }

        setTranscriptTimeout(setTimeout(() => {
          if (!transcript && listening) {
            console.warn('No transcript received after 5 seconds');
          }
        }, 5000));
      }
    } catch (error) {
      console.error('Exception in toggleListening:', error);
      setShowError(true);
    }
  };

  // Change recognition language
  const changeLanguage = (newLanguage: string) => {
    console.log(`Changing speech recognition language to: ${newLanguage}`);
    setLanguage(newLanguage);
    setIsLanguageMenuOpen(false);

    // If currently listening, restart with new language
    if (listening) {
      SpeechRecognition.stopListening();
      setTimeout(() => {
        SpeechRecognition.startListening({
          continuous: true,
          language: newLanguage
        }).catch(error => {
          console.error('Error restarting speech recognition with new language:', error);
          setShowError(true);
        });
      }, 100);
    }
  };

  // Check for browser support
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="text-xs text-gray-500 flex items-center">
        <MicOff className="w-3 h-3 mr-1" />
        Voice recognition not supported in this browser
      </div>
    );
  }

  // Check for microphone availability
  if (!isMicrophoneAvailable) {
    return (
      <div className="text-xs text-gray-500 flex items-center">
        <MicOff className="w-3 h-3 mr-1" />
        Please allow microphone access
      </div>
    );
  }

  // Find selected language name
  const selectedLanguageName = SUPPORTED_LANGUAGES.find(lang => lang.code === language)?.name || 'Unknown';

  // If there's a transcript, show the submit button
  if (transcript && !listening) {
    return (
      <div className="flex items-center space-x-2">
        <div className="text-xs text-gray-600 flex-1 truncate">
          "{transcript.substring(0, 30)}{transcript.length > 30 ? '...' : ''}"
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs"
          onClick={handleSubmitTranscript}
        >
          Use Text
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={resetTranscript}
        >
          <RefreshCcw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 relative">
      <Button
        type="button"
        size="sm"
        variant={isListening ? "default" : "outline"}
        className={`rounded-full h-8 w-8 p-0 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
        onClick={toggleListening}
        disabled={isDisabled && !isListening}
      >
        {isListening ? (
          <Mic className="h-4 w-4 text-white animate-pulse" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Language selector dropdown button */}
      <div className="relative" ref={languageMenuRef}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs flex items-center min-w-[140px]"
          onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
          disabled={isListening}
        >
          <Languages className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="whitespace-nowrap">{selectedLanguageName}</span>
        </Button>

        {/* Language dropdown menu - positioned above and to the left of button */}
        {isLanguageMenuOpen && (
          <div className="absolute z-[9999] bottom-full mb-2 right-0 w-56 bg-white dark:bg-gray-800 border-2 border-blue-400 dark:border-blue-500 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-t-md">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-200">Select Language</p>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors border-l-4 ${lang.code === language
                    ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 font-semibold border-l-blue-500'
                    : 'text-gray-700 dark:text-gray-200 border-l-transparent hover:border-l-blue-300'
                    }`}
                  onClick={() => changeLanguage(lang.code)}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isListening && (
        <div className="text-xs text-blue-500 flex-1 truncate">
          Listening... {transcript && `"${transcript.substring(0, 20)}${transcript.length > 20 ? '...' : ''}"`}
        </div>
      )}

      {transcript && isListening && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 text-xs"
          onClick={handleSubmitTranscript}
        >
          Send
        </Button>
      )}

      {showError && (
        <div className="text-xs text-red-500">
          Could not access microphone. Please check permissions.
        </div>
      )}
    </div>
  );
};

export default VoiceRecognition;