/**
 * OpenAI Service - Client-side
 * Provides functionality for interacting with OpenAI API from the frontend
 */

export interface ChatCompletionParams {
  prompt: string;
  systemMessage?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  language?: 'en' | 'hi' | 'mr';
}

export interface CompletionResponse {
  text: string;
  isError: boolean;
  status?: number;
  errorMessage?: string;
}

/**
 * Send a request to OpenAI for chat completion via backend API
 */
export async function getOpenAICompletion(params: ChatCompletionParams): Promise<CompletionResponse> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        text: "I'm unable to process advanced queries at the moment.",
        isError: true,
        status: response.status,
        errorMessage: errorData.message || "API request failed"
      };
    }

    const data = await response.json();
    return {
      text: data.text || data.message || "No response received",
      isError: false,
      status: response.status
    };
  } catch (error) {
    console.error('OpenAI service error:', error);
    return {
      text: "Connection error occurred while processing your request.",
      isError: true,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Detect language of text
 */
export function detectLanguage(text: string): 'en' | 'hi' | 'mr' {
  // Hindi Unicode range
  const hindiPattern = /[\u0900-\u097F]/;
  // Marathi Unicode range (overlaps with Hindi but has some specific characters)
  const marathiPattern = /[\u0900-\u097F]/;
  
  if (hindiPattern.test(text) || marathiPattern.test(text)) {
    // Basic heuristic: if contains common Marathi words, classify as Marathi
    const marathiWords = ['महाराष्ट्र', 'पाणी', 'गाव', 'योजना'];
    const hasMarathiWords = marathiWords.some(word => text.includes(word));
    return hasMarathiWords ? 'mr' : 'hi';
  }
  
  return 'en';
}

/**
 * Translate text using backend API
 */
export async function translateText(text: string, targetLanguage: 'en' | 'hi' | 'mr'): Promise<string> {
  try {
    const response = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage
      }),
    });

    if (!response.ok) {
      console.warn('Translation failed, returning original text');
      return text;
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

/**
 * Language names mapping
 */
export const LANGUAGE_NAMES = {
  'en': 'English',
  'hi': 'Hindi', 
  'mr': 'Marathi'
};

/**
 * Cache for translated messages to avoid repeated API calls
 */
const translationCache: Map<string, string> = new Map();

/**
 * Translate a message to the target language using OpenAI
 * This is used for dynamically translating bot messages that are not pre-translated
 */
export async function translateMessageWithOpenAI(
  message: string, 
  targetLanguage: 'en' | 'hi' | 'mr',
  context?: string
): Promise<string> {
  if (targetLanguage === 'en') {
    return message;
  }
  
  const cacheKey = `${targetLanguage}:${message.substring(0, 100)}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }
  
  try {
    const languageName = targetLanguage === 'hi' ? 'Hindi' : 'Marathi';
    const contextInfo = context ? `Context: This is a message about ${context} from a water infrastructure dashboard. ` : '';
    
    const response = await getOpenAICompletion({
      prompt: `${contextInfo}Translate the following message to ${languageName}. Keep emojis as-is. Keep technical terms like LPCD, ESR, mg/L, bar intact. Keep numbers and units unchanged. Only translate the text parts:\n\n"${message}"`,
      maxTokens: 500,
      temperature: 0.3,
      language: targetLanguage,
    });
    
    if (!response.isError && response.text) {
      const translated = response.text.replace(/^["']|["']$/g, '').trim();
      translationCache.set(cacheKey, translated);
      return translated;
    }
    
    return message;
  } catch (error) {
    console.error('Translation error:', error);
    return message;
  }
}

/**
 * Comprehensive translation helper for ALL chatbot messages
 * Uses OpenAI to translate any message to the target language
 * with caching to avoid repeated API calls
 */
export async function translateBotResponse(
  message: string,
  targetLanguage: 'en' | 'hi' | 'mr',
  options?: {
    context?: string;
    skipIfEnglish?: boolean;
  }
): Promise<string> {
  if (targetLanguage === 'en' || (options?.skipIfEnglish && targetLanguage === 'en')) {
    return message;
  }
  
  const cacheKey = `bot_${targetLanguage}:${message.substring(0, 150)}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }
  
  try {
    const languageName = targetLanguage === 'hi' ? 'Hindi' : 'Marathi';
    const contextInfo = options?.context 
      ? `Context: This is a ${options.context} message from a Maharashtra Water Infrastructure Dashboard chatbot. ` 
      : 'Context: This is a message from a Maharashtra Water Infrastructure Dashboard chatbot. ';
    
    const response = await getOpenAICompletion({
      prompt: `${contextInfo}
Translate the following message to ${languageName}. 

CRITICAL RULES:
1. Keep emojis exactly as-is (📊, 🧪, ⚡, 💧, 🏘️, ✅, ⚠️, etc.)
2. Keep technical terms in English: LPCD, ESR, mg/L, bar, RCA, PT, sensor, widget
3. Keep numbers, percentages, and units unchanged
4. Keep markdown formatting (**bold**, etc.)
5. Translate region names to ${languageName}: Amravati=अमरावती, Nagpur=नागपुर, Pune=पुणे, Nashik=नाशिक, Konkan=कोंकण, Aurangabad=औरंगाबाद, Chhatrapati Sambhajinagar=छत्रपती संभाजीनगर
6. Translate naturally and fluently, not word-by-word
7. Return ONLY the translated text, no explanations

Message to translate:
"${message}"`,
      maxTokens: 800,
      temperature: 0.2,
      language: targetLanguage,
    });
    
    if (!response.isError && response.text) {
      let translated = response.text
        .replace(/^["']|["']$/g, '')
        .replace(/^(Translation|Translated|Here is the translation|The translated message):?\s*/i, '')
        .trim();
      translationCache.set(cacheKey, translated);
      return translated;
    }
    
    return message;
  } catch (error) {
    console.error('Bot response translation error:', error);
    return message;
  }
}

/**
 * Generate a language-aware response for widget messages
 */
export async function generateLocalizedWidgetMessage(params: {
  widgetType: string;
  region?: string;
  scheme?: string;
  village?: string;
  count?: number;
  language: 'en' | 'hi' | 'mr';
  additionalContext?: string;
}): Promise<string> {
  const { widgetType, region, scheme, village, count, language, additionalContext } = params;
  
  if (language === 'en') {
    return '';
  }
  
  try {
    const languageName = language === 'hi' ? 'Hindi' : 'Marathi';
    const regionText = region && region !== 'all' ? `for ${region} region` : 'across all regions';
    const schemeText = scheme && scheme !== 'all' ? `for scheme ${scheme}` : '';
    const villageText = village && village !== 'all' ? `for ${village} village` : '';
    const countText = count ? `Found ${count} records.` : '';
    const contextText = additionalContext || '';
    
    const prompt = `Generate a brief, informative message in ${languageName} for a water infrastructure dashboard widget.
Widget type: ${widgetType}
Scope: ${villageText || schemeText || regionText}
${countText}
${contextText}

Requirements:
- Write 2-3 sentences in natural ${languageName}
- Keep technical terms like LPCD, ESR, mg/L, bar in English
- Include relevant emojis
- Be concise and informative`;

    const response = await getOpenAICompletion({
      prompt,
      maxTokens: 200,
      temperature: 0.5,
      language,
    });
    
    if (!response.isError && response.text) {
      return response.text.trim();
    }
    
    return '';
  } catch (error) {
    console.error('Localized message generation error:', error);
    return '';
  }
}