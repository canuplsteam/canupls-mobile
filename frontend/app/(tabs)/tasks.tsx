import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  price: number;
  created_at: string;
  location_address: string;
  receipt_url: string | null;
  requester?: { full_name: string };
  helper?: { full_name: string };
}

type TabType = 'requests' | 'jobs';

const categoryIcons: Record<string, string> = {
  grocery: 'cart',
  pharmacy: 'medical',
  dog_walking: 'paw',
  package_delivery: 'cube',
  quick_rides: 'car',
  errands: 'list',
  other: 'help',
};

const categoryColors: Record<string, string> = {
  grocery: '#10B981',
  pharmacy: '#EF4444',
  dog_walking: '#F59E0B',
  package_delivery: '#8B5CF6',
  quick_rides: '#3B82F6',
  errands: '#EC4899',
  other: '#6B7280',
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

const getStatusLabel = (status: string) =>
  status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function TasksScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [myRequests, setMyRequests] = useState<Task[]>([]);
  const [myJobs, setMyJobs] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch tasks where user is requester
      const { data: requests, error: reqErr } = await supabase
        .from('tasks')
        .select(`*, helper:profiles!tasks_helper_id_fkey(full_name)`)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (reqErr) throw reqErr;
      setMyRequests(requests || []);

      // Fetch tasks where user is helper
      const { data: jobs, error: jobErr } = await supabase
        .from('tasks')
        .select(`*, requester:profiles!tasks_requester_id_fkey(full_name)`)
        .eq('helper_id', user.id)
        .order('created_at', { ascending: false });

      if (jobErr) throw jobErr;
      setMyJobs(jobs || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const currentTasks = activeTab === 'requests' ? myRequests : myJobs;

  const renderTaskCard = (task: Task) => {
    const catColor = categoryColors[task.category] || Colors.gray[500];

    return (
      <TouchableOpacity
        key={task.id}
        style={styles.taskCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/task/${task.id}` as any)}
      >
        <View style={[styles.taskIconContainer, { backgroundColor: catColor + '20' }]}>
          <Ionicons
            name={(categoryIcons[task.category] || 'help') as any}
            size={24}
            color={catColor}
          />
        </View>
        <View style={styles.taskContent}>
          <View style={styles.taskTopRow}>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {task.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                {getStatusLabel(task.status)}
              </Text>
            </View>
          </View>
          <View style={styles.taskBottomRow}>
            <Text style={styles.taskPrice}>${task.price.toFixed(2)}</Text>
            <Text style={styles.taskDate}>
              {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          {activeTab === 'requests' && task.helper && (
            <Text style={styles.personText}>Helper: {task.helper.full_name}</Text>
          )}
          {activeTab === 'jobs' && task.requester && (
            <Text style={styles.personText}>Requester: {task.requester.full_name}</Text>
          )}
          {task.receipt_url && (
            <View style={styles.receiptIndicator}>
              <Ionicons name="receipt" size={14} color={Colors.success} />
              <Text style={styles.receiptText}>Receipt uploaded</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Title */}
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>My Tasks</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            My Requests ({myRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'jobs' && styles.tabActive]}
          onPress={() => setActiveTab('jobs')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
            My Jobs ({myJobs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : currentTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={activeTab === 'requests' ? 'file-tray-outline' : 'briefcase-outline'}
              size={64}
              color={Colors.gray[300]}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'requests' ? 'No requests yet' : 'No jobs yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'requests'
                ? 'Post a task from the Home tab to get started'
                : 'Accept tasks from the Browse tab to start earning'}
            </Text>
          </View>
        ) : (
          currentTasks.map(renderTaskCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: Colors.gray[700],
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[500],
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Medium',
  },
  taskBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskPrice: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Bold',
    color: Colors.success,
  },
  taskDate: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
  },
  personText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginTop: 2,
  },
  receiptIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  receiptText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Medium',
    color: Colors.success,
    marginLeft: 4,
  },
});
