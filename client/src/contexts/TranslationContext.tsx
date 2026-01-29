import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';

// Define available languages
export type Language = 'en' | 'hi' | 'mr' | 'gu' | 'pa' | 'bn' | 'ta' | 'te' | 'kn' | 'ml';

// Language display names
export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  mr: 'मराठी (Marathi)',
  gu: 'ગુજરાતી (Gujarati)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
  bn: 'বাংলা (Bengali)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)'
};

// Create the context type
interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (text: string) => string;
  translationEnabled: boolean;
  toggleTranslation: () => void;
  isTranslating: boolean;
}

// Create the context with default values
export const TranslationContext = createContext<TranslationContextType>({
  language: 'en',
  setLanguage: () => {},
  translate: (text) => text,
  translationEnabled: false,
  toggleTranslation: () => {},
  isTranslating: false
});

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  // Get user's preferred language from localStorage or default to English
  const storedLanguage = localStorage.getItem('preferredLanguage') as Language;
  const storedTranslationEnabled = localStorage.getItem('translationEnabled');
  
  const [language, setLanguage] = useState<Language>(storedLanguage || 'en');
  const [translationEnabled, setTranslationEnabled] = useState<boolean>(
    storedTranslationEnabled ? storedTranslationEnabled === 'true' : false
  );
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Record<string, Record<Language, string>>>({});

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('preferredLanguage', language);
  }, [language]);

  // Save translation enabled preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('translationEnabled', translationEnabled.toString());
  }, [translationEnabled]);

  // Function to toggle translation on/off
  const toggleTranslation = () => {
    setTranslationEnabled((prev) => !prev);
  };

  // Helper function to perform translation
  const translate = (text: string): string => {
    if (!translationEnabled || language === 'en' || !text) {
      return text; // Return original text if translation is disabled, language is English, or text is empty
    }

    // Check if we have a cached translation
    if (translations[text] && translations[text][language]) {
      return translations[text][language];
    }

    // Perform translation via API (asynchronously)
    setIsTranslating(true);
    
    // Call our translation API
    fetch('/api/translation/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage: language,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Translation request failed');
        }
        return response.json();
      })
      .then(data => {
        // Cache the translation result
        setTranslations(prev => ({
          ...prev,
          [text]: {
            ...(prev[text] || {}),
            [language]: data.translatedText,
          },
        }));
        setIsTranslating(false);
      })
      .catch(error => {
        console.error('Translation error:', error);
        setIsTranslating(false);
      });

    // Return placeholder text while the API request is in progress
    // In a real implementation, you might show a loading indicator
    if (language === 'hi') {
      return `${text} (हिन्दी)`;
    } else if (language === 'mr') {
      return `${text} (मराठी)`;
    } else if (language === 'gu') {
      return `${text} (ગુજરાતી)`;
    } else {
      return `${text} (${language})`;
    }
  };

  // In a browser environment, we would use the browser's built-in translation API 
  // or a third-party service like Google Translate API (which would require API key)
  
  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        translate,
        translationEnabled,
        toggleTranslation,
        isTranslating
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook to use the translation context
export const useTranslation = () => useContext(TranslationContext);