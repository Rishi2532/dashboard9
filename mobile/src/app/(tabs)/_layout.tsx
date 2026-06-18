import { DarkTheme, DefaultTheme, ThemeProvider, Tabs } from 'expo-router';
import { useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tint,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            ...(Platform.OS === 'ios' ? { position: 'absolute' } : {}),
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}
