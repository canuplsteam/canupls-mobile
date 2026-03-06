import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface MapFallbackProps {
  style?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

// Web fallback for MapView — react-native-maps is native-only
export function MapViewWeb({ style, ...props }: MapFallbackProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="map-outline" size={64} color={Colors.gray[400]} />
      <Text style={styles.text}>Map view is available on mobile devices</Text>
      <Text style={styles.subtext}>Download the Canupls app to browse nearby tasks</Text>
    </View>
  );
}

export function MarkerWeb(props: any) {
  return null;
}

export function CircleWeb(props: any) {
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  text: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[600],
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  subtext: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
