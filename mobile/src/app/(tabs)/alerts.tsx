import React, { useState } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlertItem, AlertStatus } from '@/components/AlertItem';
import { Spacing } from '@/constants/theme';

// Mock data based on the all_issues_report context
const mockAlerts = [
  {
    id: '1',
    title: 'Low Chlorine Level',
    description: 'Chlorine level dropped below 0.2 ppm for 3 consecutive readings.',
    timestamp: '10 mins ago',
    status: 'critical' as AlertStatus,
    location: 'Bidgaon ESR 1',
  },
  {
    id: '2',
    title: 'Sensor Offline',
    description: 'Flow meter sensor has not reported data in 24 hours.',
    timestamp: '2 hours ago',
    status: 'warning' as AlertStatus,
    location: 'Jamthi Pump Station',
  },
  {
    id: '3',
    title: 'Pressure Normalized',
    description: 'Water pressure returned to normal operating range.',
    timestamp: '5 hours ago',
    status: 'resolved' as AlertStatus,
    location: 'Pimparkhed Sector A',
  },
  {
    id: '4',
    title: 'Maintenance Scheduled',
    description: 'Routine maintenance scheduled for tomorrow at 10 AM.',
    timestamp: '1 day ago',
    status: 'info' as AlertStatus,
    location: 'Padali Kurha',
  },
];

export default function AlertsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate fetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          <ThemedText type="title">System Alerts</ThemedText>
        </View>

        <FlatList
          data={mockAlerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AlertItem {...item} />}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
        />
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
  listContent: {
    paddingBottom: 100, // Room for bottom tabs
  },
});
