import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

type DashboardCardProps = {
  title: string;
  value: string | number;
  iconName: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
};

export function DashboardCard({ title, value, iconName, color, subtitle }: DashboardCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const themeColor = color || Colors[scheme].tint;

  return (
    <ThemedView style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
        <Ionicons name={iconName} size={24} color={themeColor} />
      </View>
      <View style={styles.valueRow}>
        <ThemedText type="title" style={[styles.value, { color: themeColor }]}>
          {value}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" style={styles.subtitle}>{subtitle}</ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3, // For Android
    flex: 1,
    minWidth: '45%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    opacity: 0.8,
  },
  valueRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  value: {
    fontSize: 32,
    lineHeight: 36,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
});
