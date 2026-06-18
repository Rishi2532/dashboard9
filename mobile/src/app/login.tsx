import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { fetchApi } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { AnimatedIcon } from '@/components/animated-icon';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const handleLogin = async () => {
    console.log('Button pressed. Username:', username);
    const cleanUsername = username.trim();
    
    if (!cleanUsername || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setIsLoading(true);
    try {
      // If user types the default admin fallback
      if (cleanUsername === 'admin' || cleanUsername === 'test') {
        console.log('Mock login successful!');
        await login('mock-jwt-token', { name: 'Admin User', role: 'admin' });
        router.replace('/(tabs)');
        return;
      }

      console.log('Hitting real API endpoint...');
      // Hit the real backend!
      const response = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: cleanUsername, password })
      });
      
      console.log('API login successful!', response);
      // Since backend uses sessions, we just store a dummy token locally 
      // to keep the mobile router happy now that we know they are valid in the DB!
      await login('session-token-active', response);
      router.replace('/(tabs)');
      
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>Mahajal Dashboard</ThemedText>
          <ThemedText style={styles.subtitle}>Sign in to your account</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText type="defaultSemiBold" style={styles.label}>Username</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter your username"
              placeholderTextColor={colors.icon}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="defaultSemiBold" style={styles.label}>Password</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.icon}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Sign In</ThemedText>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Helper text for development */}
        <ThemedText style={{opacity: 0.4, textAlign: 'center', marginTop: 32}}>
          Use admin/admin to test login
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.6,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
