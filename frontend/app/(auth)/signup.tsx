import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle, signInWithMicrosoft, loading } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(phone)) {
      newErrors.phone = 'Phone number is invalid';
    }
    
    if (!address) {
      newErrors.address = 'Address is required';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    try {
      await signUp(
        email.trim(),
        password,
        fullName.trim(),
        phone.trim(),
        address.trim(),
        addressLat,
        addressLng
      );
      // Success alert shown in AuthContext
    } catch (error) {
      // Error alert handled by AuthContext
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      await signInWithMicrosoft();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in with Outlook');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Canupls community</Text>

          {/* Social Login Buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={24} color="#EA4335" />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleMicrosoftSignIn}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-windows" size={24} color="#00A4EF" />
              <Text style={styles.socialButtonText}>Continue with Outlook</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color={Colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                  }}
                  autoCapitalize="words"
                />
              </View>
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color={Colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
                <Ionicons name="call-outline" size={20} color={Colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) setErrors({ ...errors, phone: undefined });
                  }}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Address Input with Google Autocomplete */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address</Text>
              <View style={[styles.autocompleteWrapper, errors.address && styles.inputError]}>
                <Ionicons name="location-outline" size={20} color={Colors.gray[400]} style={styles.autocompleteIcon} />
                <GooglePlacesAutocomplete
                  placeholder="Search or type your address"
                  onPress={(data, details = null) => {
                    setAddress(data.description);
                    if (details?.geometry?.location) {
                      setAddressLat(details.geometry.location.lat);
                      setAddressLng(details.geometry.location.lng);
                    }
                    if (errors.address) setErrors({ ...errors, address: undefined });
                  }}
                  query={{
                    key: GOOGLE_MAPS_API_KEY,
                    language: 'en',
                  }}
                  fetchDetails={true}
                  styles={{
                    textInput: styles.autocompleteInput,
                    listView: styles.autocompleteList,
                    row: styles.autocompleteRow,
                  }}
                  enablePoweredByContainer={false}
                  textInputProps={{
                    placeholderTextColor: Colors.gray[400],
                    value: address,
                    onChangeText: (text: string) => {
                      setAddress(text);
                      // Clear lat/lng when user types manually (not from autocomplete)
                      setAddressLat(null);
                      setAddressLng(null);
                      if (errors.address) setErrors({ ...errors, address: undefined });
                    },
                  }}
                />
              </View>
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray[400]}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.gray[400]} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray[400]}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.signupButton, loading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    marginBottom: Spacing.lg,
  },
  socialContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    ...Shadows.sm,
  },
  socialButtonText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[700],
    marginLeft: Spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  dividerText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginHorizontal: Spacing.md,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[700],
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[700],
  },
  autocompleteWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    paddingLeft: Spacing.md,
    minHeight: 52,
  },
  autocompleteIcon: {
    marginTop: 16,
    marginRight: Spacing.sm,
  },
  autocompleteInput: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[700],
    paddingVertical: Spacing.md,
  },
  autocompleteList: {
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  autocompleteRow: {
    paddingVertical: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  signupButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  loginText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
  },
  loginLink: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
  },
});