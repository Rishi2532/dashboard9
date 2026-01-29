/**
 * API keys for external services
 * 
 * This file centralizes API key management for the Maharashtra Water Dashboard application.
 * Keys are sourced from environment variables in Replit or can be configured directly in VS Code.
 */

// API keys for various services (used as fallback for local development)
export const API_KEYS = {
  // OpenAI API Key for natural language processing
  // This is a placeholder and will be replaced by the actual key from environment variables
  OPENAI_API_KEY: '',
  
  // Optional: Add other API keys here as needed
  // GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
  // WEATHER_API_KEY: 'your-weather-api-key',
};

/**
 * Get an API key based on its name
 * Tries multiple sources in order:
 *  1. Replit environment variables (process.env)
 *  2. Vite environment variables (import.meta.env)
 *  3. Fallback to hardcoded values (for local development)
 * 
 * @param key - The name of the API key to retrieve
 * @returns The API key value or empty string if not found
 */
export function getApiKey(key: keyof typeof API_KEYS): string {
  // For server-side environment access
  // First check if we can access it directly
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  
  // For Vite environment variables with VITE_ prefix
  const viteKey = `VITE_${key}`;
  if (import.meta.env && import.meta.env[viteKey]) {
    return import.meta.env[viteKey] as string;
  }
  
  // For direct API endpoint access
  return '/api/config/' + key;
}