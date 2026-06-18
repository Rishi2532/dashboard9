import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DashboardCard } from '@/components/DashboardCard';
import { fetchApi } from '@/api/client';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEsr: '...',
    activeAlerts: '...',
    offlineSensors: '...',
    avgChlorine: '...',
  });

  const loadData = async () => {
    try {
      // In a real scenario, this would hit a dedicated /api/dashboard endpoint
      // For now, we will simulate the dashboard metrics
      // const data = await fetchApi('/dashboard-stats');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      setStats({
        totalEsr: '2,895',
        activeAlerts: '12',
        offlineSensors: '45',
        avgChlorine: '1.2 ppm',
      });
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <ThemedText type="title">Dashboard Overview</ThemedText>
            <ThemedText style={styles.subtitle}>Mahajal Water Scheme</ThemedText>
          </View>

          <View style={styles.grid}>
            <DashboardCard 
              title="Total ESRs" 
              value={stats.totalEsr} 
              iconName="water-outline" 
              color="#3b82f6" 
            />
            <DashboardCard 
              title="Active Alerts" 
              value={stats.activeAlerts} 
              iconName="alert-circle-outline" 
              color="#ef4444" 
            />
            <DashboardCard 
              title="Offline Sensors" 
              value={stats.offlineSensors} 
              iconName="wifi-outline" 
              color="#f59e0b" 
            />
            <DashboardCard 
              title="Avg Chlorine" 
              value={stats.avgChlorine} 
              iconName="flask-outline" 
              color="#10b981" 
              subtitle="Last 24h"
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Recent Activity</ThemedText>
            <ThemedView type="backgroundElement" style={styles.placeholderCard}>
              <ThemedText style={{ opacity: 0.6 }}>No new activity in the last hour.</ThemedText>
            </ThemedView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 100, // Room for bottom tabs
  },
  header: {
    marginBottom: Spacing.five,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: {
    marginTop: Spacing.five,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  placeholderCard: {
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
});
