import { API_KEYS, getApiKey } from '../config/api-keys';

interface OpenAICompletionParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  language?: string;
}

interface OpenAIResponse {
  text: string;
  isError: boolean;
}

// Expanded language mapping for Indian languages
export const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'hi': 'Hindi',
  'mr': 'Marathi',
  'ta': 'Tamil',
  'te': 'Telugu',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'gu': 'Gujarati',
  'bn': 'Bengali',
  'pa': 'Punjabi',
  'ur': 'Urdu',
  'or': 'Odia',
  'as': 'Assamese',
  'kok': 'Konkani',
  'sd': 'Sindhi'
};

/**
 * Send a request to OpenAI for chat completion with enhanced language support
 * @param params - Parameters for the completion request
 * @returns Formatted response from OpenAI
 */
export async function getOpenAICompletion(params: OpenAICompletionParams): Promise<OpenAIResponse> {
  const { prompt, maxTokens = 150, temperature = 0.7, language = 'en' } = params;
  const apiKey = getApiKey('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.error('OpenAI API key is not configured');
    return {
      text: "I'm unable to process advanced queries at the moment. Please try a simpler question or basic commands.",
      isError: true
    };
  }
  
  // Get language name for system message
  const languageName = LANGUAGE_NAMES[language] || 'English';
  console.log(`Using language: ${languageName} (code: ${language})`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an assistant for the Maharashtra Water Dashboard. 
                      Your role is to provide concise, helpful information about water infrastructure in Maharashtra.
                      
                      The dashboard tracks:
                      - Elevated Storage Reservoirs (ESRs)
                      - Villages with water access 
                      - Flow meters
                      - Chlorine analyzers (RCA)
                      - Pressure transmitters (PT)
                      
                      Across regions: Nagpur, Pune, Nashik, Konkan, Amravati, and Chhatrapati Sambhajinagar.
                      
                      Important: Respond in ${languageName} language. Keep responses conversational and brief.
                      Include actual numbers from the dashboard data when available, not generic descriptions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return {
        text: "I'm having trouble connecting to my knowledge base. Please try again or ask a simpler question.",
        isError: true
      };
    }
    
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content || '';
    console.log(`Received OpenAI response in ${languageName}: "${completionText.substring(0, 50)}..."`);
    
    return {
      text: completionText.trim(),
      isError: false
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      text: "I encountered a technical issue. Please try again with a different question.",
      isError: true
    };
  }
}

/**
 * Enhanced language detection for Indian languages
 * @param text - Text to detect language for
 * @returns Language code (en, hi, mr, ta, etc.)
 */
export function detectLanguage(text: string): string {
  if (!text) return 'en';
  
  const lowerText = text.toLowerCase();
  
  // Check for common words and patterns in different languages
  
  // Hindi Unicode range and common words
  if (/[\u0900-\u097F]/.test(text)) {
    // Check for specific Marathi patterns within Devanagari
    if (/(\u092E\u0930\u093E\u0920\u0940|\u0906\u0939\u0947|\u0906\u0939\u0947\u0924)/.test(text)) {
      return 'mr'; // Marathi
    }
    
    // Tamil words in Hindi/Devanagari script
    if (/(\u0924\u092E\u093F\u0933|\u0924\u092E\u093F\u0932)/.test(text)) {
      return 'ta';
    }
    
    // Telugu words in Hindi/Devanagari script
    if (/(\u0924\u0947\u0932\u0941\u0917\u0941|\u0924\u0947\u0932\u0917\u0941)/.test(text)) {
      return 'te';
    }
    
    return 'hi'; // Default to Hindi for Devanagari script
  }
  
  // Tamil Unicode range
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta'; // Tamil
  }
  
  // Telugu Unicode range
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te'; // Telugu
  }
  
  // Bengali Unicode range
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn'; // Bengali
  }
  
  // Gujarati Unicode range
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'gu'; // Gujarati
  }
  
  // Kannada Unicode range
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn'; // Kannada
  }
  
  // Malayalam Unicode range
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return 'ml'; // Malayalam
  }
  
  // Punjabi (Gurmukhi) Unicode range
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return 'pa'; // Punjabi
  }
  
  // Odia Unicode range
  if (/[\u0B00-\u0B7F]/.test(text)) {
    return 'or'; // Odia
  }
  
  // Check for language keywords in Latin script
  if (/(hindi|हिंदी)/.test(lowerText)) {
    return 'hi';
  }
  
  if (/(marathi|मराठी)/.test(lowerText)) {
    return 'mr';
  }
  
  if (/(tamil|தமிழ்)/.test(lowerText)) {
    return 'ta';
  }
  
  if (/(telugu|తెలుగు)/.test(lowerText)) {
    return 'te';
  }
  
  // Default to English if no specific pattern is matched
  return 'en';
}

/**
 * Enhanced translation function using OpenAI with support for many Indian languages
 * @param text - Text to translate
 * @param targetLanguage - Target language code (en, hi, mr, ta, etc.)
 * @returns Translated text
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  // Get the full language name from the code
  const targetLangName = LANGUAGE_NAMES[targetLanguage] || 'English';
  
  console.log(`Translating text to ${targetLangName}`);
  
  // Create translation prompt with context about water dashboard terminology
  const translationPrompt = `
    Translate the following text to ${targetLangName}:
    
    "${text}"
    
    Important terms and their translations:
    - Flow meter (a device that measures water flow)
    - Chlorine analyzer / RCA (a device that measures chlorine in water)
    - Pressure transmitter / PT (a device that measures water pressure)
    - ESR (Elevated Storage Reservoir, water storage tanks)
    - Scheme (water supply project)
    - Region (administrative area)
    
    Maintain any numerical values and technical terms.
  `;
  
  const response = await getOpenAICompletion({
    prompt: translationPrompt,
    maxTokens: 300,
    temperature: 0.3,
    language: targetLanguage
  });
  
  // Extract just the translation from potential quotation marks or explanations
  let translation = response.isError ? text : response.text;
  
  // Clean up the translation if needed
  translation = translation
    .replace(/^[\s"'"']+|[\s"'"']+$/g, '')  // Remove quotes and whitespace at start/end
    .replace(/^Translation:[\s]*/i, '');     // Remove "Translation:" prefix if present
  
  return translation;
}