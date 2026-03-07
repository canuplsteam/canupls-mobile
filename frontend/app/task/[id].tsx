import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import StatusStepper from '../../components/StatusStepper';
import ReceiptViewer from '../../components/ReceiptViewer';
import SharedChecklist from '../../components/SharedChecklist';
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isTrackingActive,
} from '../../services/locationTracking';
import { MapView, Marker } from '../../components/MapWrapper';


interface Task {
  id: string;
  requester_id: string;
  helper_id: string | null;
  title: string;
  description: string;
  category: string;
  status: string;
  location_lat: number;
  location_lng: number;
  location_address: string;
  price: number;
  receipt_url: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  helper_location_lat?: number;
  helper_location_lng?: number;
  helper_location_updated_at?: string;
  requester?: { full_name: string; phone?: string };
  helper?: { full_name: string; phone?: string };
}

interface ChecklistItem {
  id: string;
  task_id: string;
  item_name: string;
  is_checked: boolean;
  position: number;
}

const categoryNames: Record<string, string> = {
  grocery: 'Groceries',
  pharmacy: 'Pharmacy',
  dog_walking: 'Dog Walking',
  package_delivery: 'Package Delivery',
  quick_rides: 'Quick Ride',
  errands: 'Errands',
  other: 'Other',
};

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

// Next valid status transitions
const riderStatusTransitions: Record<string, { next: string; label: string; icon: string }> = {
  accepted: { next: 'in_progress', label: 'Start Task / At Location', icon: 'location' },
  in_progress: { next: 'completed', label: 'Mark as Delivered', icon: 'checkmark-done-circle' },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [trackingActive, setTrackingActive] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const isRequester = task?.requester_id === user?.id;
  const isHelper = task?.helper_id === user?.id;
  const hasChecklist = task?.category === 'grocery' || task?.category === 'pharmacy';
  const showTrackingMap =
    !!task?.helper_id &&
    (task?.status === 'accepted' || task?.status === 'in_progress');

  // Helper: time-ago display
  const getTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const fetchTask = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          requester:profiles!tasks_requester_id_fkey(full_name, phone),
          helper:profiles!tasks_helper_id_fkey(full_name, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (error: any) {
      console.error('Error fetching task:', error);
      Alert.alert('Error', 'Failed to load task details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();

    // Subscribe to real-time task updates
    const channel = supabase
      .channel(`task-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${id}` },
        (payload) => {
          setTask((prev) => (prev ? { ...prev, ...payload.new } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchTask]);

  // ---- Checklist: fetch + real-time subscription ----
  useEffect(() => {
    if (!task || !hasChecklist || !id) return;

    const fetchChecklist = async () => {
      try {
        setChecklistLoading(true);
        const { data, error } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('task_id', id)
          .order('position', { ascending: true });
        if (error) throw error;
        setChecklistItems(data || []);
      } catch (error: any) {
        console.error('Error fetching checklist:', error);
      } finally {
        setChecklistLoading(false);
      }
    };

    fetchChecklist();

    // Subscribe to real-time checklist changes
    const checklistChannel = supabase
      .channel(`checklist-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items', filter: `task_id=eq.${id}` },
        () => {
          fetchChecklist(); // refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(checklistChannel);
    };
  }, [task?.category, id]);

  // ---- Tracking: check active state on mount ----
  useEffect(() => {
    const checkTracking = async () => {
      const active = await isTrackingActive();
      setTrackingActive(active);
    };
    checkTracking();
  }, []);

  // ---- Tracking: auto-stop when task completed/cancelled ----
  useEffect(() => {
    if (
      task &&
      (task.status === 'completed' || task.status === 'cancelled') &&
      trackingActive
    ) {
      stopBackgroundLocationTracking().then(() => setTrackingActive(false));
    }
  }, [task?.status, trackingActive]);

  const handleUpdateStatus = async () => {
    if (!task || !isHelper) return;

    const transition = riderStatusTransitions[task.status];
    if (!transition) return;

    const confirmMessage =
      transition.next === 'completed'
        ? 'Mark this task as delivered/completed? The requester will be notified.'
        : `Update status to "${transition.label}"?`;

    Alert.alert('Update Status', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            setUpdatingStatus(true);
            const updates: any = { status: transition.next };
            if (transition.next === 'completed') {
              updates.completed_at = new Date().toISOString();
            }

            const { error } = await supabase
              .from('tasks')
              .update(updates)
              .eq('id', task.id);

            if (error) throw error;

            // Auto-start location tracking when task transitions to in_progress
            if (transition.next === 'in_progress' && !trackingActive) {
              try {
                await startBackgroundLocationTracking(task.id);
                setTrackingActive(true);
              } catch (locError: any) {
                console.warn('Could not auto-start tracking:', locError);
              }
            }

            // Auto-stop location tracking when task is completed
            if (transition.next === 'completed' && trackingActive) {
              try {
                await stopBackgroundLocationTracking();
                setTrackingActive(false);
              } catch (locError: any) {
                console.warn('Could not auto-stop tracking:', locError);
              }
            }

            setTask((prev) => (prev ? { ...prev, ...updates } : prev));
            Alert.alert('Success', 'Task status updated!');
          } catch (error: any) {
            console.error('Error updating status:', error);
            Alert.alert('Error', error.message || 'Failed to update status.');
          } finally {
            setUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  const handleCancelTask = async () => {
    if (!task) return;

    Alert.alert('Cancel Task', 'Are you sure you want to cancel this task?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('tasks')
              .update({ status: 'cancelled' })
              .eq('id', task.id);

            if (error) throw error;
            setTask((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
            Alert.alert('Cancelled', 'Task has been cancelled.');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to cancel task.');
          }
        },
      },
    ]);
  };

  const handleReceiptUploaded = (url: string) => {
    setTask((prev) => (prev ? { ...prev, receipt_url: url } : prev));
  };

  // ---- Checklist Handlers ----
  const handleAddChecklistItem = async (itemName: string) => {
    if (!id || !user) return;
    try {
      const newPosition = checklistItems.length;
      const { error } = await supabase.from('checklist_items').insert({
        task_id: id,
        item_name: itemName,
        position: newPosition,
        created_by: user.id,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Error adding checklist item:', error);
      Alert.alert('Error', 'Failed to add item. Please try again.');
    }
  };

  const handleRemoveChecklistItem = async (index: number) => {
    const item = checklistItems[index];
    if (!item) return;
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', item.id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error removing checklist item:', error);
      Alert.alert('Error', 'Failed to remove item.');
    }
  };

  const handleToggleChecklistItem = async (index: number) => {
    const item = checklistItems[index];
    if (!item || !user) return;
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({
          is_checked: !item.is_checked,
          checked_by: !item.is_checked ? user.id : null,
          checked_at: !item.is_checked ? new Date().toISOString() : null,
        })
        .eq('id', item.id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error toggling checklist item:', error);
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  // ---- Location Tracking Handler ----
  const handleToggleTracking = async () => {
    if (!task) return;
    try {
      if (trackingActive) {
        await stopBackgroundLocationTracking();
        setTrackingActive(false);
      } else {
        await startBackgroundLocationTracking(task.id);
        setTrackingActive(true);
      }
    } catch (error: any) {
      Alert.alert(
        'Location Tracking',
        error.message || 'Failed to toggle location tracking. Please check permissions.',
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTask();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.gray[400]} />
          <Text style={styles.errorText}>Task not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const catColor = categoryColors[task.category] || Colors.primary;
  const receiptUrls = task.receipt_url
    ? [{ url: task.receipt_url, uploaded_at: task.completed_at || task.accepted_at || task.created_at }]
    : [];
  const transition = riderStatusTransitions[task.status];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Category & Status Banner */}
        <View style={[styles.banner, { backgroundColor: catColor + '15' }]}>
          <View style={styles.bannerRow}>
            <View style={[styles.catIcon, { backgroundColor: catColor + '30' }]}>
              <Ionicons name={(categoryIcons[task.category] || 'help') as any} size={24} color={catColor} />
            </View>
            <View style={styles.bannerInfo}>
              <Text style={[styles.bannerCategory, { color: catColor }]}>
                {categoryNames[task.category] || 'Other'}
              </Text>
              <Text style={styles.bannerStatus}>
                {task.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </View>
            <View style={[styles.priceTag, { backgroundColor: Colors.success + '15' }]}>
              <Text style={styles.priceText}>${task.price.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Task Info Card */}
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskDescription}>{task.description}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.gray[500]} />
            <Text style={styles.infoText} numberOfLines={2}>
              {task.location_address}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={Colors.gray[500]} />
            <Text style={styles.infoText}>
              Posted {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* People Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>People</Text>
          <View style={styles.personRow}>
            <View style={[styles.personAvatar, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="person" size={20} color={Colors.primary} />
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personLabel}>Requester</Text>
              <Text style={styles.personName}>{task.requester?.full_name || 'Unknown'}</Text>
            </View>
            {isHelper && task.requester?.phone && (
              <TouchableOpacity style={styles.callBtn}>
                <Ionicons name="call" size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {task.helper && (
            <View style={[styles.personRow, { marginTop: Spacing.md }]}>
              <View style={[styles.personAvatar, { backgroundColor: Colors.success + '20' }]}>
                <Ionicons name="bicycle" size={20} color={Colors.success} />
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personLabel}>Helper</Text>
                <Text style={styles.personName}>{task.helper?.full_name || 'Pending...'}</Text>
              </View>
              {isRequester && task.helper?.phone && (
                <TouchableOpacity style={styles.callBtn}>
                  <Ionicons name="call" size={18} color={Colors.success} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Status Stepper - show when task is accepted or beyond */}
        {task.status !== 'open' && task.status !== 'cancelled' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progress</Text>
            <StatusStepper currentStatus={task.status} />
          </View>
        )}

        {/* ========== Shared Checklist (Grocery / Pharmacy) ========== */}
        {hasChecklist && task.status !== 'cancelled' && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={22} color={catColor} />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Shopping List</Text>
              <View style={styles.checklistBadge}>
                <Text style={styles.checklistBadgeText}>
                  {checklistItems.filter((i) => i.is_checked).length}/{checklistItems.length}
                </Text>
              </View>
            </View>
            {checklistLoading ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ paddingVertical: Spacing.lg }}
              />
            ) : (
              <SharedChecklist
                items={checklistItems.map((item) => item.item_name)}
                onAddItem={handleAddChecklistItem}
                onRemoveItem={handleRemoveChecklistItem}
                editable={isRequester && task.status !== 'completed'}
                checkedItems={checklistItems.map((item) => item.is_checked)}
                onToggleCheck={
                  isRequester || isHelper ? handleToggleChecklistItem : undefined
                }
              />
            )}
          </View>
        )}

        {/* ========== Live Tracking Map ========== */}
        {showTrackingMap && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="navigate" size={22} color={Colors.primary} />
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Live Tracking</Text>
              {task.helper_location_updated_at && (
                <Text style={styles.lastUpdated}>
                  {getTimeAgo(task.helper_location_updated_at)}
                </Text>
              )}
            </View>

            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: task.helper_location_lat || task.location_lat,
                  longitude: task.helper_location_lng || task.location_lng,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
                region={
                  task.helper_location_lat
                    ? {
                        latitude: task.helper_location_lat,
                        longitude: task.helper_location_lng!,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                      }
                    : undefined
                }
              >
                {/* Destination marker */}
                <Marker
                  coordinate={{
                    latitude: task.location_lat,
                    longitude: task.location_lng,
                  }}
                  title="Destination"
                  pinColor={catColor}
                />

                {/* Helper live location marker */}
                {task.helper_location_lat != null &&
                  task.helper_location_lng != null && (
                    <Marker
                      coordinate={{
                        latitude: task.helper_location_lat,
                        longitude: task.helper_location_lng,
                      }}
                      title={task.helper?.full_name || 'Helper'}
                      pinColor={Colors.primary}
                    />
                  )}
              </MapView>
            </View>

            {/* Tracking toggle for helper */}
            {isHelper && (
              <TouchableOpacity
                style={[
                  styles.trackingButton,
                  trackingActive
                    ? styles.trackingButtonStop
                    : styles.trackingButtonStart,
                ]}
                onPress={handleToggleTracking}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={trackingActive ? 'stop-circle' : 'navigate-circle'}
                  size={22}
                  color={Colors.white}
                />
                <Text style={styles.trackingButtonText}>
                  {trackingActive
                    ? 'Stop Sharing Location'
                    : 'Start Sharing Location'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Waiting message for requester */}
            {isRequester && !task.helper_location_lat && (
              <View style={styles.noLocationInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={Colors.gray[500]}
                />
                <Text style={styles.noLocationText}>
                  Waiting for helper to start sharing their location…
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Receipt Section */}
        {(task.status === 'in_progress' || task.status === 'completed') && (
          <View style={styles.receiptSection}>
            <ReceiptViewer
              taskId={task.id}
              receiptUrls={receiptUrls}
              canUpload={isHelper && task.status !== 'completed'}
              onReceiptUploaded={handleReceiptUploaded}
            />
          </View>
        )}

        {/* Rider Actions */}
        {isHelper && transition && task.status !== 'cancelled' && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, updatingStatus && styles.actionButtonDisabled]}
              onPress={handleUpdateStatus}
              disabled={updatingStatus}
              activeOpacity={0.8}
            >
              {updatingStatus ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name={transition.icon as any} size={24} color={Colors.white} />
                  <Text style={styles.actionButtonText}>{transition.label}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Completed Badge */}
        {task.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
            <View style={styles.completedInfo}>
              <Text style={styles.completedTitle}>Task Completed!</Text>
              {task.completed_at && (
                <Text style={styles.completedDate}>
                  {new Date(task.completed_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Rate Button - show after task completion */}
        {task.status === 'completed' && (
          <TouchableOpacity
            style={styles.rateButton}
            activeOpacity={0.8}
            onPress={() => {
              const toUserId = isRequester ? task.helper_id : task.requester_id;
              const toUserName = isRequester
                ? task.helper?.full_name
                : task.requester?.full_name;
              router.push({
                pathname: '/task/rate' as any,
                params: { taskId: task.id, toUserId, toUserName, role: isRequester ? 'requester' : 'helper' },
              });
            }}
          >
            <Ionicons name="star" size={22} color="#F59E0B" />
            <Text style={styles.rateButtonText}>
              Rate {isRequester ? 'Helper' : 'Requester'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Cancelled Badge */}
        {task.status === 'cancelled' && (
          <View style={[styles.completedBanner, { backgroundColor: Colors.error + '10' }]}>
            <Ionicons name="close-circle" size={32} color={Colors.error} />
            <View style={styles.completedInfo}>
              <Text style={[styles.completedTitle, { color: Colors.error }]}>Task Cancelled</Text>
            </View>
          </View>
        )}

        {/* Cancel Button - for requester on open tasks or accepted tasks */}
        {isRequester && (task.status === 'open' || task.status === 'accepted') && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTask} activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Task</Text>
          </TouchableOpacity>
        )}

        {/* 30-day receipt access notice */}
        {receiptUrls.length > 0 && (
          <View style={styles.noticeContainer}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.gray[500]} />
            <Text style={styles.noticeText}>
              Receipts are accessible for 30 days after task completion.
            </Text>
          </View>
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
  scrollContent: {
    paddingBottom: Spacing.xxl + 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backBtnText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: 'Poppins-Bold',
    color: Colors.gray[700],
  },
  banner: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bannerCategory: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
  },
  bannerStatus: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
  },
  priceTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  priceText: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-Bold',
    color: Colors.success,
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginBottom: Spacing.md,
  },
  taskTitle: {
    fontSize: FontSizes.xl,
    fontFamily: 'Poppins-Bold',
    color: Colors.gray[700],
    marginBottom: Spacing.sm,
  },
  taskDescription: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    marginLeft: Spacing.sm,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  personLabel: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
  },
  personName: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: Spacing.sm,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  completedInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  completedTitle: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-Bold',
    color: Colors.success,
  },
  completedDate: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    marginTop: 2,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.white,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginLeft: Spacing.xs,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  rateButtonText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: '#B45309',
    marginLeft: Spacing.sm,
  },
  // ---- Checklist & Tracking styles ----
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  checklistBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  checklistBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.success,
  },
  lastUpdated: {
    marginLeft: 'auto',
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[400],
  },
  mapContainer: {
    height: 250,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  trackingButtonStart: {
    backgroundColor: Colors.primary,
  },
  trackingButtonStop: {
    backgroundColor: Colors.error,
  },
  trackingButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
  },
  noLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  noLocationText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
  },
});
