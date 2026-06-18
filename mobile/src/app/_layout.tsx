import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/hooks/useAuth';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
