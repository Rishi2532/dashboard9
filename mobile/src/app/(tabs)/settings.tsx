import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <ThemedText type="title">Settings</ThemedText>
        </View>

        <View style={styles.content}>
          <ThemedView type="backgroundElement" style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="moon-outline" size={24} color={Colors[scheme].icon} style={styles.menuIcon} />
              <ThemedText>Dark Mode</ThemedText>
            </View>
            <ThemedText style={{ opacity: 0.5 }}>System</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="server-outline" size={24} color={Colors[scheme].icon} style={styles.menuIcon} />
              <ThemedText>API Endpoint</ThemedText>
            </View>
            <ThemedText style={{ opacity: 0.5 }}>Localhost</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.menuItem, { marginTop: 24 }]}>
            <View style={styles.menuLeft}>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" style={styles.menuIcon} />
              <ThemedText style={{ color: '#ef4444' }}>Log Out</ThemedText>
            </View>
          </ThemedView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  content: {
    padding: Spacing.four,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
});
