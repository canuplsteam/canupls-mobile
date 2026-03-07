import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Auth navigation guard — runs inside the AuthProvider
 * so it has access to the auth context.
 */
function AuthGatedLayout() {
  const { session, loading, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // still resolving auth

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (session && profile) {
      // User is signed in & has a profile — go to Dashboard if not already there
      if (!inTabsGroup) {
        router.replace('/(tabs)/home');
      }
    } else if (!session) {
      // User is signed out — go to auth if not already there
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    }
    // If session exists but profile is still null, fetchProfile is in progress.
    // The next render (when profile loads) will trigger navigation.
  }, [session, loading, profile, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'EBGaramond-Regular': require('../assets/fonts/EBGaramond-Regular.ttf'),
    'EBGaramond-Medium': require('../assets/fonts/EBGaramond-Medium.ttf'),
    'EBGaramond-SemiBold': require('../assets/fonts/EBGaramond-SemiBold.ttf'),
    'EBGaramond-Bold': require('../assets/fonts/EBGaramond-Bold.ttf'),
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      setReady(true);
    }
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => setReady(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  if (!ready && !fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AuthGatedLayout />
    </AuthProvider>
  );
}
