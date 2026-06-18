import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export type AlertStatus = 'critical' | 'warning' | 'resolved' | 'info';

type AlertItemProps = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: AlertStatus;
  location?: string;
};

const statusColors: Record<AlertStatus, string> = {
  critical: '#ef4444', // red
  warning: '#f59e0b',  // orange
  resolved: '#10b981', // green
  info: '#3b82f6',     // blue
};

const statusIcons: Record<AlertStatus, keyof typeof Ionicons.glyphMap> = {
  critical: 'alert-circle',
  warning: 'warning',
  resolved: 'checkmark-circle',
  info: 'information-circle',
};

export function AlertItem({ title, description, timestamp, status, location }: AlertItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const color = statusColors[status];
  const icon = statusIcons[status];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="small" style={styles.timestamp}>
            {timestamp}
          </ThemedText>
        </View>
        <ThemedText style={styles.description} numberOfLines={2}>
          {description}
        </ThemedText>
        {location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={12} color={Colors[scheme].icon} style={{ opacity: 0.6 }} />
            <ThemedText type="small" style={styles.location}>
              {location}
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    opacity: 0.6,
  },
  description: {
    opacity: 0.8,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    opacity: 0.6,
    marginLeft: 4,
  },
});
