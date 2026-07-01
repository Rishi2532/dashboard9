import React from 'react';
import { StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { API_BASE_URL } from '@/api/client';

const WEB_BASE_URL = API_BASE_URL.replace('/api', '');

interface Props {
  path: string;
  title: string;
}

export function WebViewDashboard({ path, title }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const url = `${WEB_BASE_URL}${path}`;

  // For web, use a standard iframe. For native, use react-native-webview.
  const Iframe = 'iframe' as any;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={{ title, headerBackTitle: 'Back' }} />
      {Platform.OS === 'web' ? (
        <Iframe 
          src={url} 
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' }} 
          title={title}
        />
      ) : (
        <WebView 
          source={{ uri: url }} 
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors[scheme].tint} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
