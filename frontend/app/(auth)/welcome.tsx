import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - Spacing.lg * 2 - Spacing.md) / 2;

const serviceCategories = [
  {
    id: 1,
    title: 'Groceries',
    description: 'Pick up groceries',
    icon: 'cart' as const,
    color: '#10B981',
  },
  {
    id: 2,
    title: 'Pharmacy',
    description: 'Buy medicine',
    icon: 'medical' as const,
    color: '#EF4444',
  },
  {
    id: 3,
    title: 'Dog Walking',
    description: 'Walk a dog',
    icon: 'paw' as const,
    color: '#F59E0B',
  },
  {
    id: 4,
    title: 'Package Delivery',
    description: 'Deliver packages',
    icon: 'cube' as const,
    color: '#8B5CF6',
  },
  {
    id: 5,
    title: 'Quick Rides',
    description: 'Give someone a ride',
    icon: 'car' as const,
    color: '#3B82F6',
  },
  {
    id: 6,
    title: 'Errands',
    description: 'Run short errands',
    icon: 'list' as const,
    color: '#EC4899',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Headline — serif font to match the image */}
        <View style={styles.headerContainer}>
          <Text style={styles.headline}>The Hyperlocal</Text>
          <Text style={styles.headline}>Marketplace</Text>
          <View style={styles.divider} />
          <Text style={styles.subheadline}>
            Quick help from neighbors{'\n'}you can trust.
          </Text>
        </View>

        {/* Service Categories Grid */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionLabel}>SERVICES</Text>
          <View style={styles.grid}>
            {serviceCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: category.color + '15' },
                  ]}
                >
                  <Ionicons
                    name={category.icon}
                    size={28}
                    color={category.color}
                  />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Trust badges */}
        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Ionicons name="flash" size={18} color={Colors.primary} />
            <Text style={styles.badgeText}>Instant</Text>
          </View>
          <View style={styles.badgeDot} />
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
            <Text style={styles.badgeText}>Secure</Text>
          </View>
          <View style={styles.badgeDot} />
          <View style={styles.badge}>
            <Ionicons name="star" size={18} color={Colors.primary} />
            <Text style={styles.badgeText}>Trusted</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={22} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },

  /* ---- Logo ---- */
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: width * 0.4,
    height: 80,
  },

  /* ---- Headline (Serif) ---- */
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl + Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  headline: {
    fontSize: 34,
    fontFamily: 'EBGaramond-SemiBold',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: 0.3,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    marginVertical: Spacing.md,
    borderRadius: 1,
  },
  subheadline: {
    fontSize: 18,
    fontFamily: 'EBGaramond-Regular',
    color: '#555555',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.2,
  },

  /* ---- Category Grid ---- */
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[400],
    letterSpacing: 2.5,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  categoryCard: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm + 2,
  },
  categoryTitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#333333',
    textAlign: 'center',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  categoryDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#999999',
    textAlign: 'center',
    lineHeight: 15,
    letterSpacing: 0.2,
  },

  /* ---- Trust Badges ---- */
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[600],
    letterSpacing: 0.5,
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray[300],
  },

  /* ---- Bottom CTA ---- */
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
    backgroundColor: '#FAFAFA',
  },
  getStartedButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    marginRight: Spacing.sm,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  loginLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
  },
  loginLinkBold: {
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
  },
});
