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
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - Spacing.lg * 3) / 2;

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Tagline */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>The Hyperlocal{' \n'}Help Marketplace</Text>
          <Text style={styles.subtitle}>
            Connecting people who need quick help{' \n'}with nearby helpers
          </Text>
        </View>

        {/* Service Categories Grid */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>What can we help you with?</Text>
          <View style={styles.grid}>
            {serviceCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon} size={32} color={category.color} />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="flash" size={20} color={Colors.primary} />
            <Text style={styles.featureText}>Instant Notifications</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.featureText}>Secure Payments</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="star" size={20} color={Colors.primary} />
            <Text style={styles.featureText}>Trusted Ratings</Text>
          </View>
        </View>
      </ScrollView>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={24} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: width * 0.5,
    height: 100,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: cardWidth,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 16,
  },
  featuresContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[700],
    marginLeft: Spacing.sm,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
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
    ...Shadows.lg,
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