import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';

type UserRole = 'requester' | 'helper' | 'both';

const roleOptions: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'requester', label: 'Requester Only', icon: 'hand-left', desc: 'I need help with tasks' },
  { value: 'helper', label: 'Helper Only', icon: 'bicycle', desc: 'I want to earn by helping' },
  { value: 'both', label: 'Both', icon: 'swap-horizontal', desc: 'I do both — request & help' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [role, setRole] = useState<UserRole>(profile?.user_role || 'both');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }

    try {
      setSaving(true);
      Keyboard.dismiss();
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        user_role: role,
      } as any);
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={Colors.gray[400]} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.gray[400]}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color={Colors.gray[400]} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor={Colors.gray[400]}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={20} color={Colors.gray[400]} />
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                placeholderTextColor={Colors.gray[400]}
                multiline
              />
            </View>
          </View>

          {/* Role Preference */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Role Preference</Text>
            <Text style={styles.fieldHint}>Choose how you want to use canUpls</Text>
            {roleOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.roleCard,
                  role === option.value && styles.roleCardActive,
                ]}
                onPress={() => setRole(option.value)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.roleIconBox,
                    role === option.value && styles.roleIconBoxActive,
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={role === option.value ? Colors.white : Colors.primary}
                  />
                </View>
                <View style={styles.roleInfo}>
                  <Text
                    style={[
                      styles.roleLabel,
                      role === option.value && styles.roleLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.roleDesc}>{option.desc}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    role === option.value && styles.radioOuterActive,
                  ]}
                >
                  {role === option.value && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontFamily: 'Poppins-Bold', color: Colors.gray[700] },
  fieldGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginBottom: Spacing.sm,
  },
  fieldHint: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[700],
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
  },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxActive: { backgroundColor: Colors.primary },
  roleInfo: { flex: 1, marginLeft: Spacing.md },
  roleLabel: { fontSize: FontSizes.md, fontFamily: 'Poppins-SemiBold', color: Colors.gray[700] },
  roleLabelActive: { color: Colors.primary },
  roleDesc: { fontSize: FontSizes.xs, fontFamily: 'Poppins-Regular', color: Colors.gray[500] },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: FontSizes.lg, fontFamily: 'Poppins-SemiBold', color: Colors.white },
});
