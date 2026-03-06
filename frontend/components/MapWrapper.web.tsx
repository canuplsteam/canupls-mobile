// Web platform map fallback — react-native-maps is native-only
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export function MapView({ style, children, ...props }: any) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="map-outline" size={64} color={Colors.gray[400]} />
      <Text style={styles.text}>Map view available on mobile</Text>
      <Text style={styles.subtext}>Download the Canupls app</Text>
    </View>
  );
}

export function Marker(props: any) {
  return null;
}

export function Circle(props: any) {
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
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

export default MapView;
