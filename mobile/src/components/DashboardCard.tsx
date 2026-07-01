import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors } from '@/constants/theme';

interface DashboardCardProps {
  title: string;
  value: string | number;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}

export function DashboardCard({ title, value, iconName, color, subtitle, onPress }: DashboardCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={{ width: '48%', marginBottom: 12 }}>
      <ThemedView type="backgroundElement" style={[styles.card, { borderTopColor: color, borderTopWidth: 4 }]}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>{title}</ThemedText>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
        <ThemedText type="title" style={styles.value}>{value}</ThemedText>
        {subtitle && (
          <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
        )}
      </ThemedView>
    </TouchableOpacity>
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
