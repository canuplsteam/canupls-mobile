import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const serviceCategories = [
  { id: 'grocery', title: 'Groceries', icon: 'cart' as const, color: '#10B981', hasChecklist: true },
  { id: 'pharmacy', title: 'Pharmacy', icon: 'medical' as const, color: '#EF4444', hasChecklist: true },
  { id: 'dog_walking', title: 'Dog Walking', icon: 'paw' as const, color: '#F59E0B', hasChecklist: false },
  { id: 'package_delivery', title: 'Package', icon: 'cube' as const, color: '#8B5CF6', hasChecklist: false },
  { id: 'quick_rides', title: 'Quick Ride', icon: 'car' as const, color: '#3B82F6', hasChecklist: false },
  { id: 'errands', title: 'Errands', icon: 'list' as const, color: '#EC4899', hasChecklist: false },
];

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  price: number;
  created_at: string;
}

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyTasks();
    }
  }, [user]);

  const fetchMyTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setMyTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyTasks();
  };

  const handleCategoryPress = (category: typeof serviceCategories[0]) => {
    router.push({
      pathname: '/(tabs)/post-task',
      params: {
        category: category.id,
        hasChecklist: category.hasChecklist.toString(),
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return Colors.info;
      case 'accepted': return Colors.warning;
      case 'in_progress': return Colors.primary;
      case 'completed': return Colors.success;
      case 'cancelled': return Colors.error;
      default: return Colors.gray[500];
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>
            Hello, <Text style={styles.name}>{profile?.full_name || 'User'}!</Text>
          </Text>
        </View>

        {/* Can you please button */}
        <TouchableOpacity 
          style={styles.canYouPleaseButton}
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/post-task')}
        >
          <View style={styles.canYouPleaseContent}>
            <Text style={styles.canYouPleaseText}>Can you please?</Text>
            <Ionicons name="add-circle" size={28} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* Category Grid */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>What do you need help with?</Text>
          <View style={styles.categoryGrid}>
            {serviceCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon} size={28} color={category.color} />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                {category.hasChecklist && (
                  <View style={styles.checklistBadge}>
                    <Ionicons name="checkbox-outline" size={12} color={Colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* My Requests Section */}
        <View style={styles.myRequestsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Requests</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : myTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={48} color={Colors.gray[400]} />
              <Text style={styles.emptyStateText}>No requests yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap "Can you please...?" to post your first task</Text>
            </View>
          ) : (
            myTasks.map((task) => (
              <TouchableOpacity 
                key={task.id} 
                style={styles.taskCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/task/${task.id}` as any)}
              >
                <View style={styles.taskCardContent}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                        {getStatusText(task.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.taskFooter}>
                    <View style={styles.taskMeta}>
                      <Ionicons name="pricetag-outline" size={14} color={Colors.gray[500]} />
                      <Text style={styles.taskMetaText}>${task.price.toFixed(2)}</Text>
                    </View>
                    <Text style={styles.taskCategory}>{getStatusText(task.category)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  logo: {
    width: 120,
    height: 50,
  },
  greetingContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
  },
  name: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
  },
  canYouPleaseButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.lg,
  },
  canYouPleaseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  canYouPleaseText: {
    fontSize: FontSizes.xl,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.white,
  },
  categoriesSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginBottom: Spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
    position: 'relative',
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[700],
    textAlign: 'center',
  },
  checklistBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  myRequestsSection: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewAllText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.primary,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  taskCardContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  taskTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Medium',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[600],
  },
  taskCategory: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
  },
});
