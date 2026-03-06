import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { captureAndUploadReceipt } from '../services/receiptService';

const { width, height } = Dimensions.get('window');

interface ReceiptViewerProps {
  taskId: string;
  receiptUrls?: Array<{ url: string; uploaded_at: string }>;
  canUpload?: boolean;
  onReceiptUploaded?: (url: string) => void;
}

export default function ReceiptViewer({
  taskId,
  receiptUrls = [],
  canUpload = false,
  onReceiptUploaded,
}: ReceiptViewerProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadReceipt = async () => {
    try {
      setUploading(true);
      const receiptUrl = await captureAndUploadReceipt(taskId);
      if (receiptUrl && onReceiptUploaded) {
        onReceiptUploaded(receiptUrl);
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="receipt" size={24} color={Colors.primary} />
          <Text style={styles.headerTitle}>Receipts</Text>
        </View>
        {canUpload && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadReceipt}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="camera" size={20} color={Colors.white} />
                <Text style={styles.uploadButtonText}>Add Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Receipt List */}
      {receiptUrls.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={Colors.gray[400]} />
          <Text style={styles.emptyStateText}>No receipts uploaded yet</Text>
          {canUpload && (
            <Text style={styles.emptyStateSubtext}>
              Tap "Add Receipt" to upload a photo
            </Text>
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.receiptList}>
          {receiptUrls.map((receipt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.receiptCard}
              onPress={() => setSelectedReceipt(receipt.url)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: receipt.url }} style={styles.receiptThumbnail} />
              <View style={styles.receiptOverlay}>
                <Ionicons name="expand" size={24} color={Colors.white} />
              </View>
              <Text style={styles.receiptDate}>
                {new Date(receipt.uploaded_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Full-Screen Receipt Modal */}
      <Modal
        visible={selectedReceipt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedReceipt(null)}
          >
            <Ionicons name="close-circle" size={40} color={Colors.white} />
          </TouchableOpacity>
          {selectedReceipt && (
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              contentContainerStyle={styles.modalContent}
            >
              <Image
                source={{ uri: selectedReceipt }}
                style={styles.fullReceipt}
                resizeMode="contain"
              />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginLeft: Spacing.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  uploadButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateText: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[600],
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  receiptList: {
    flexDirection: 'row',
  },
  receiptCard: {
    width: 120,
    marginRight: Spacing.md,
    position: 'relative',
  },
  receiptThumbnail: {
    width: 120,
    height: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[200],
  },
  receiptOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptDate: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  modalContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullReceipt: {
    width: width,
    height: height * 0.8,
  },
});
