import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';

export default function RateTaskScreen() {
  const { taskId, toUserId, toUserName, role } = useLocalSearchParams<{
    taskId: string;
    toUserId: string;
    toUserName: string;
    role: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rate', 'Please select a star rating.');
      return;
    }
    if (!user || !taskId || !toUserId) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.from('ratings').insert({
        task_id: taskId,
        from_user_id: user.id,
        to_user_id: toUserId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      Alert.alert('Thank You!', 'Your rating has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (error.code === '23505') {
        Alert.alert('Already Rated', 'You have already rated this person for this task.');
      } else {
        Alert.alert('Error', error.message || 'Failed to submit rating.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color={Colors.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* Rating Content */}
          <View style={styles.body}>
            <View style={styles.completedIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>

            <Text style={styles.title}>Task Complete!</Text>
            <Text style={styles.subtitle}>
              How was your experience with{'\n'}
              <Text style={styles.userName}>{toUserName || 'this user'}</Text>?
            </Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={44}
                    color={star <= rating ? '#F59E0B' : Colors.gray[300]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingLabel}>{ratingLabels[rating]}</Text>
            )}

            {/* Comment */}
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={Colors.gray[400]}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={300}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Rating</Text>
              )}
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity onPress={() => router.back()} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  closeBtn: { padding: Spacing.sm },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  completedIcon: { marginBottom: Spacing.lg },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: Colors.gray[700],
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  userName: {
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  starBtn: {
    paddingHorizontal: Spacing.xs,
  },
  ratingLabel: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: '#F59E0B',
    marginBottom: Spacing.lg,
  },
  commentInput: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    padding: Spacing.md,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[700],
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
  },
  skipBtn: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
  },
});
