// client.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// For Android emulator/USB, localhost points to the PC if ADB reverse is active.
// For iOS Simulator, localhost points to the Mac.
// Adjust this base URL if running on a physical device over Wi-Fi (use the PC's IP address).
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      credentials: 'omit', // React Native doesn't fully support 'include' over fetch natively unless polyfilled, but let's try it. Actually, React Native doesn't use cookies automatically in fetch without a native cookie manager, but for web testing 'include' is needed. Let's set 'include' for web, and for native we rely on the dummy token or proper headers if we migrate to JWT.
      ...options,
      credentials: Platform.OS === 'web' ? 'include' : 'omit', // Use include for web to pass session cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Some endpoints might return empty body or plain text
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    console.error(`[API Fetch Error] ${url}:`, error);
    throw error;
  }
}
