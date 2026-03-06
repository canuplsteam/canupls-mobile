import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { MapView, Marker, Circle } from '../../components/MapWrapper';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const RADIUS_KM = 5;
const RADIUS_METERS = RADIUS_KM * 1000;

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  location_lat: number;
  location_lng: number;
  location_address: string;
  status: string;
  requester_id: string;
  created_at: string;
  requester?: {
    full_name: string;
    rating: number;
  };
  distance?: number;
}

interface ChecklistItem {
  id: string;
  item_name: string;
  is_checked: boolean;
}

const categoryColors: Record<string, string> = {
  grocery: '#10B981',
  pharmacy: '#EF4444',
  dog_walking: '#F59E0B',
  package_delivery: '#8B5CF6',
  quick_rides: '#3B82F6',
  errands: '#EC4899',
};

const categoryIcons: Record<string, any> = {
  grocery: 'cart',
  pharmacy: 'medical',
  dog_walking: 'paw',
  package_delivery: 'cube',
  quick_rides: 'car',
  errands: 'list',
};

export default function BrowseScreen() {
  const { user, profile, updateProfile } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isOnline, setIsOnline] = useState(profile?.is_available || false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location && isOnline) {
      fetchNearbyTasks();
    }
  }, [location, isOnline]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby tasks.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please enable location services.');
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyTasks = async () => {
    if (!location) return;

    try {
      // Fetch all open tasks
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          requester:profiles!tasks_requester_id_fkey(
            full_name,
            rating
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter tasks within radius and calculate distance
      const nearbyTasks = (data || []).map((task: any) => {
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          task.location_lat,
          task.location_lng
        );
        return { ...task, distance };
      }).filter(task => task.distance <= RADIUS_KM);

      setTasks(nearbyTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to load nearby tasks.');
    }
  };

  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);
    try {
      await updateProfile({ is_available: value });
      if (value) {
        fetchNearbyTasks();
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleMarkerPress = async (task: Task) => {
    setSelectedTask(task);
    
    // Fetch checklist if it's a grocery/pharmacy task
    if (task.category === 'grocery' || task.category === 'pharmacy') {
      try {
        const { data, error } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('task_id', task.id)
          .order('position', { ascending: true });

        if (error) throw error;
        setChecklistItems(data || []);
      } catch (error) {
        console.error('Error fetching checklist:', error);
      }
    } else {
      setChecklistItems([]);
    }
  };

  const handleAcceptTask = async () => {
    if (!selectedTask || !user) return;

    Alert.alert(
      'Accept Task',
      `Accept "${selectedTask.title}" for $${selectedTask.price.toFixed(2)} CAD?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setAccepting(true);
              
              const { error } = await supabase
                .from('tasks')
                .update({
                  status: 'accepted',
                  helper_id: user.id,
                  accepted_at: new Date().toISOString(),
                })
                .eq('id', selectedTask.id);

              if (error) throw error;

              Alert.alert(
                'Success!',
                'Task accepted! You can now see it in your active tasks.',
                [
                  {
                    text: 'View Task',
                    onPress: () => {
                      setSelectedTask(null);
                      fetchNearbyTasks();
                      router.push(`/task/${selectedTask.id}` as any);
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error accepting task:', error);
              Alert.alert('Error', error.message || 'Failed to accept task.');
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-off" size={64} color={Colors.gray[400]} />
        <Text style={styles.errorText}>Location access required</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
          <Text style={styles.retryButtonText}>Enable Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {/* 5km Radius Circle */}
        {isOnline && (
          <Circle
            center={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            radius={RADIUS_METERS}
            strokeColor={Colors.primary + '80'}
            fillColor={Colors.primary + '20'}
          />
        )}

        {/* Task Markers */}
        {tasks.map((task) => (
          <Marker
            key={task.id}
            coordinate={{
              latitude: task.location_lat,
              longitude: task.location_lng,
            }}
            onPress={() => handleMarkerPress(task)}
          >
            <View style={[styles.markerContainer, { backgroundColor: categoryColors[task.category] || Colors.primary }]}>
              <Ionicons name={categoryIcons[task.category] || 'help'} size={20} color={Colors.white} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Online/Offline Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleCard}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.gray[400] }]} />
          <Text style={styles.toggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: Colors.gray[300], true: Colors.success + '60' }}
            thumbColor={isOnline ? Colors.success : Colors.white}
          />
        </View>
      </View>

      {/* Task Count Badge */}
      {isOnline && tasks.length > 0 && (
        <View style={styles.taskCountBadge}>
          <Ionicons name="briefcase" size={16} color={Colors.white} />
          <Text style={styles.taskCountText}>{tasks.length} tasks nearby</Text>
        </View>
      )}

      {/* Task Detail Modal */}
      <Modal
        visible={selectedTask !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedTask && (
                <>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View style={[styles.categoryBadge, { backgroundColor: categoryColors[selectedTask.category] + '20' }]}>
                      <Ionicons name={categoryIcons[selectedTask.category]} size={20} color={categoryColors[selectedTask.category]} />
                      <Text style={[styles.categoryBadgeText, { color: categoryColors[selectedTask.category] }]}>
                        {selectedTask.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedTask(null)} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color={Colors.gray[600]} />
                    </TouchableOpacity>
                  </View>

                  {/* Task Info */}
                  <Text style={styles.taskTitle}>{selectedTask.title}</Text>
                  <Text style={styles.taskDescription}>{selectedTask.description}</Text>

                  {/* Payout */}
                  <View style={styles.payoutCard}>
                    <Ionicons name="cash" size={32} color={Colors.success} />
                    <View style={styles.payoutInfo}>
                      <Text style={styles.payoutLabel}>Payout</Text>
                      <Text style={styles.payoutAmount}>${selectedTask.price.toFixed(2)} CAD</Text>
                    </View>
                  </View>

                  {/* Distance */}
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={20} color={Colors.gray[500]} />
                    <Text style={styles.infoText}>{selectedTask.distance?.toFixed(1)} km away</Text>
                  </View>

                  {/* Requester Info */}
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={20} color={Colors.gray[500]} />
                    <Text style={styles.infoText}>
                      {selectedTask.requester?.full_name} ({selectedTask.requester?.rating.toFixed(1)} ⭐)
                    </Text>
                  </View>

                  {/* Shared Checklist Preview */}
                  {checklistItems.length > 0 && (
                    <View style={styles.checklistSection}>
                      <View style={styles.checklistHeader}>
                        <Ionicons name="checkbox-outline" size={20} color={Colors.primary} />
                        <Text style={styles.checklistTitle}>Shopping List ({checklistItems.length} items)</Text>
                      </View>
                      <View style={styles.checklistPreview}>
                        {checklistItems.slice(0, 5).map((item) => (
                          <View key={item.id} style={styles.checklistItem}>
                            <Ionicons name="square-outline" size={16} color={Colors.gray[400]} />
                            <Text style={styles.checklistItemText}>{item.item_name}</Text>
                          </View>
                        ))}
                        {checklistItems.length > 5 && (
                          <Text style={styles.moreItemsText}>+{checklistItems.length - 5} more items</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Accept Button */}
                  <TouchableOpacity
                    style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
                    onPress={handleAcceptTask}
                    disabled={accepting}
                    activeOpacity={0.8}
                  >
                    {accepting ? (
                      <ActivityIndicator color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                        <Text style={styles.acceptButtonText}>Accept Offer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Offline Message */}
      {!isOnline && (
        <View style={styles.offlineMessage}>
          <Text style={styles.offlineMessageText}>Toggle to Online to see available tasks</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width,
    height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadows.lg,
  },
  toggleContainer: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  toggleLabel: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[700],
    marginRight: Spacing.sm,
  },
  taskCountBadge: {
    position: 'absolute',
    top: 120,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  taskCountText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: Spacing.xs,
  },
  closeButton: {
    padding: Spacing.xs,
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
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  payoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  payoutInfo: {
    marginLeft: Spacing.md,
  },
  payoutLabel: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
  },
  payoutAmount: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: Colors.success,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    marginLeft: Spacing.sm,
  },
  checklistSection: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checklistTitle: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginLeft: Spacing.xs,
  },
  checklistPreview: {
    gap: Spacing.xs,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checklistItemText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    marginLeft: Spacing.sm,
  },
  moreItemsText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Medium',
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: Spacing.sm,
  },
  offlineMessage: {
    position: 'absolute',
    bottom: Spacing.xxl,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.gray[700],
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  offlineMessageText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
  },
});
