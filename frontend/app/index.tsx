import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

export default function Index() {
  const { session, loading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (session && profile) {
        // User is authenticated and has a profile, navigate to tabs
        router.replace('/(tabs)/home');
      } else {
        // User is not authenticated, navigate to auth screens
        router.replace('/(auth)/welcome');
      }
    }
  }, [session, loading, profile]);

  // Show loading indicator while checking auth state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
