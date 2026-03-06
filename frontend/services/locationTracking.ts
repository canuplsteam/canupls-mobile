import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
      try {
        // Get active task ID from async storage or pass it when starting
        const activeTaskId = await getActiveTaskId();
        
        if (activeTaskId) {
          // Update task location in Supabase
          await supabase
            .from('tasks')
            .update({
              helper_location_lat: location.coords.latitude,
              helper_location_lng: location.coords.longitude,
              helper_location_updated_at: new Date().toISOString(),
            })
            .eq('id', activeTaskId);
          
          console.log('Location updated:', location.coords.latitude, location.coords.longitude);
        }
      } catch (error) {
        console.error('Error updating location:', error);
      }
    }
  }
});

let activeTaskIdCache: string | null = null;

const getActiveTaskId = async (): Promise<string | null> => {
  return activeTaskIdCache;
};

export const setActiveTaskId = (taskId: string | null) => {
  activeTaskIdCache = taskId;
};

export const startBackgroundLocationTracking = async (taskId: string): Promise<boolean> => {
  try {
    // Request permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission not granted');
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      throw new Error('Background location permission not granted');
    }

    // Request notification permission
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
    if (notificationStatus !== 'granted') {
      console.warn('Notification permission not granted');
    }

    // Set active task ID
    setActiveTaskId(taskId);

    // Check if already running
    const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_UPDATE_INTERVAL,
      distanceInterval: 10, // meters
      foregroundService: {
        notificationTitle: 'Canupls - Task Active',
        notificationBody: 'Tracking your location for delivery',
        notificationColor: '#0047AB',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    // Show local notification (optional)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Location Tracking Active',
        body: 'Your location is being shared with the requester',
      },
      trigger: null,
    });

    console.log('Background location tracking started for task:', taskId);
    return true;
  } catch (error) {
    console.error('Error starting background location:', error);
    throw error;
  }
};

export const stopBackgroundLocationTracking = async (): Promise<void> => {
  try {
    const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      setActiveTaskId(null);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Location Tracking Stopped',
          body: 'You can now close the app',
        },
        trigger: null,
      });
      
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background location:', error);
  }
};

export const isTrackingActive = async (): Promise<boolean> => {
  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  } catch (error) {
    return false;
  }
};
