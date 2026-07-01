import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { DashboardCard } from '@/components/DashboardCard';
import { fetchApi } from '@/api/client';
import { Spacing } from '@/constants/theme';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEsr: '...',
    activeAlerts: '...',
    offlineSensors: '...',
    avgChlorine: '...',
  });

  const loadData = async () => {
    try {
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

  const renderDashboardLink = (title: string, icon: keyof typeof Ionicons.glyphMap, route: string, color: string) => (
    <TouchableOpacity onPress={() => router.push(route)} style={styles.dashboardLink}>
      <View style={[styles.dashboardIconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>{title}</ThemedText>
      <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
    </TouchableOpacity>
  );

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
              onPress={() => router.push('/alerts')}
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
              onPress={() => router.push('/chlorine')}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Detailed Dashboards</ThemedText>
            <ThemedView type="backgroundElement" style={styles.dashboardList}>
              {renderDashboardLink('Chlorine Monitoring', 'flask-outline', '/chlorine', '#10b981')}
              {renderDashboardLink('Pressure Dashboard', 'speedometer-outline', '/pressure', '#6366f1')}
              {renderDashboardLink('Village LPCD', 'home-outline', '/village-lpcd', '#f59e0b')}
              {renderDashboardLink('Scheme LPCD', 'business-outline', '/scheme-lpcd', '#3b82f6')}
              {renderDashboardLink('Water Consumption', 'water-outline', '/water-consumption', '#0ea5e9')}
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
  dashboardList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dashboardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  dashboardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
});
