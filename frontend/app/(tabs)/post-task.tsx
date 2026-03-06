import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import SharedChecklist from '../../components/SharedChecklist';

const categoryNames: Record<string, string> = {
  grocery: 'Groceries',
  pharmacy: 'Pharmacy',
  dog_walking: 'Dog Walking',
  package_delivery: 'Package Delivery',
  quick_rides: 'Quick Ride',
  errands: 'Errands',
};

export default function PostTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuth();

  const [category, setCategory] = useState<string>((params.category as string) || 'errands');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [locationAddress, setLocationAddress] = useState(profile?.address || '');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const hasChecklist = params.hasChecklist === 'true' || category === 'grocery' || category === 'pharmacy';

  const handleAddChecklistItem = (item: string) => {
    if (item.trim()) {
      setChecklistItems([...checklistItems, item.trim()]);
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter task details');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }
    if (!locationAddress.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return false;
    }
    if (hasChecklist && checklistItems.length === 0) {
      Alert.alert('Error', `Please add at least one item to your ${categoryNames[category]} list`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Create the task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          requester_id: user?.id,
          title,
          description,
          category,
          status: 'open',
          location_lat: profile?.address_lat || 0,
          location_lng: profile?.address_lng || 0,
          location_address: locationAddress,
          price: parseFloat(price),
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // If it's a grocery/pharmacy task, create checklist items
      if (hasChecklist && checklistItems.length > 0 && taskData) {
        const checklistData = checklistItems.map((item, index) => ({
          task_id: taskData.id,
          item_name: item,
          position: index,
          created_by: user?.id,
          is_checked: false,
        }));

        const { error: checklistError } = await supabase
          .from('checklist_items')
          .insert(checklistData);

        if (checklistError) throw checklistError;
      }

      Alert.alert(
        'Success!',
        'Your task has been posted. Nearby helpers will be notified.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating task:', error);
      Alert.alert('Error', error.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post a Task</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryNames[category]}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={styles.input}
                placeholder={`e.g., Pick up ${categoryNames[category].toLowerCase()} from store`}
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={Colors.gray[400]}
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Details</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide more details about what you need..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={Colors.gray[400]}
              />
            </View>

            {/* Shared Checklist for Grocery/Pharmacy */}
            {hasChecklist && (
              <View style={styles.checklistSection}>
                <View style={styles.checklistHeader}>
                  <Ionicons name="checkbox-outline" size={24} color={Colors.primary} />
                  <Text style={styles.checklistTitle}>Shared {categoryNames[category]} List</Text>
                </View>
                <Text style={styles.checklistSubtitle}>
                  Add items you need. Your helper can see and check them off in real-time!
                </Text>
                <SharedChecklist
                  items={checklistItems}
                  onAddItem={handleAddChecklistItem}
                  onRemoveItem={handleRemoveChecklistItem}
                  editable={true}
                />
              </View>
            )}

            {/* Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Pickup/Delivery Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter address or location"
                value={locationAddress}
                onChangeText={setLocationAddress}
                placeholderTextColor={Colors.gray[400]}
              />
            </View>

            {/* Price */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Offer Price ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 15.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.gray[400]}
              />
              <Text style={styles.helper}>How much are you willing to pay for this help?</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Post Task</Text>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                </>
              )}
            </TouchableOpacity>
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
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: 'Poppins-Bold',
    color: Colors.gray[700],
  },
  placeholder: {
    width: 40,
  },
  categoryBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  categoryBadgeText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
  },
  form: {
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[700],
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[700],
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  helper: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginTop: Spacing.xs,
  },
  checklistSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checklistTitle: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginLeft: Spacing.sm,
  },
  checklistSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    marginRight: Spacing.sm,
  },
});
