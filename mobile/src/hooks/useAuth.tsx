import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import { fetchApi } from '@/api/client';

const TOKEN_KEY = 'mahajal_auth_token';

// Helper for cross-platform secure storage
const storage = {
  getItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  }
};

type AuthContextType = {
  user: any | null;
  isLoading: boolean;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await storage.getItemAsync(TOKEN_KEY);
        if (token) {
          // Here we would ideally validate the token or fetch user details
          // For now, if we have a token, we assume they are logged in
          setUser({ token });
        }
      } catch (error) {
        console.error('Failed to load session', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Route protection logic
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';
    console.log('[Auth Route Protection]', { user: !!user, inAuthGroup, segments });

    if (!user && !inAuthGroup) {
      console.log('Redirecting to login...');
      // Redirect to login if not logged in and trying to access protected route
      router.replace('/login');
    } else if (user && inAuthGroup) {
      console.log('User logged in. Redirecting to dashboard tabs...');
      // Redirect to home if logged in and trying to access login page
      // In Expo Router, the tabs group is usually the root, but specifying it explicitly is safer
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  const login = async (token: string, userData: any) => {
    await storage.setItemAsync(TOKEN_KEY, token);
    setUser({ token, ...userData });
  };

  const logout = async () => {
    await storage.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
