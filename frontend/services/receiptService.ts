import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export interface ReceiptUploadResult {
  url: string;
  path: string;
}

export const requestCameraPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to take receipt photos.'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

export const requestMediaLibraryPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library permission is needed to select receipt images.'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

export const takeReceiptPhoto = async (): Promise<ImagePicker.ImagePickerResult | null> => {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8, // Compress to 80% quality
    });

    if (!result.canceled) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
    return null;
  }
};

export const pickReceiptFromGallery = async (): Promise<ImagePicker.ImagePickerResult | null> => {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Failed to pick image. Please try again.');
    return null;
  }
};

const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

export const uploadReceiptToSupabase = async (
  taskId: string,
  imageUri: string
): Promise<ReceiptUploadResult | null> => {
  try {
    // Convert image URI to blob
    const blob = await uriToBlob(imageUri);
    
    // Generate unique filename - use taskId as folder
    const timestamp = Date.now();
    const fileName = `${timestamp}_receipt.jpg`;
    const filePath = `${taskId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Error uploading receipt:', error);
    Alert.alert('Upload Failed', error.message || 'Failed to upload receipt.');
    return null;
  }
};

export const updateTaskWithReceipt = async (
  taskId: string,
  receiptUrl: string
): Promise<boolean> => {
  try {
    // Update task with receipt URL
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        receipt_url: receiptUrl,
      })
      .eq('id', taskId);

    if (updateError) throw updateError;

    return true;
  } catch (error: any) {
    console.error('Error updating task with receipt:', error);
    Alert.alert('Update Failed', error.message || 'Failed to update task.');
    return false;
  }
};

export const captureAndUploadReceipt = async (
  taskId: string
): Promise<string | null> => {
  try {
    // Show options: Camera or Gallery
    const options = await new Promise<'camera' | 'gallery' | null>((resolve) => {
      Alert.alert(
        'Add Receipt',
        'Choose how to add the receipt',
        [
          { text: 'Take Photo', onPress: () => resolve('camera') },
          { text: 'Choose from Gallery', onPress: () => resolve('gallery') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ]
      );
    });

    if (!options) return null;

    // Get image
    const result = options === 'camera' 
      ? await takeReceiptPhoto()
      : await pickReceiptFromGallery();

    if (!result || result.canceled) return null;

    const imageUri = result.assets[0].uri;

    // Upload to Supabase
    const uploadResult = await uploadReceiptToSupabase(taskId, imageUri);
    if (!uploadResult) return null;

    // Update task
    const updated = await updateTaskWithReceipt(taskId, uploadResult.url);
    if (!updated) return null;

    Alert.alert('Success', 'Receipt uploaded successfully!');
    return uploadResult.url;
  } catch (error) {
    console.error('Error in captureAndUploadReceipt:', error);
    return null;
  }
};

export const getReceiptSignedUrl = async (
  filePath: string,
  expiresIn: number = 2592000 // 30 days in seconds
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
};
