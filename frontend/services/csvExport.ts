import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  price: number;
  location_address: string;
  receipt_url: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  requester_id: string;
  helper_id: string | null;
}

const escapeCSV = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportTaskHistoryCSV = async (userId: string): Promise<void> => {
  try {
    // Fetch all tasks where user is requester OR helper
    const { data: requestedTasks, error: reqErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (reqErr) throw reqErr;

    const { data: helperTasks, error: helpErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('helper_id', userId)
      .order('created_at', { ascending: false });

    if (helpErr) throw helpErr;

    const allTasks: TaskRow[] = [
      ...(requestedTasks || []).map((t: any) => ({ ...t, _role: 'Requester' })),
      ...(helperTasks || []).map((t: any) => ({ ...t, _role: 'Helper' })),
    ];

    if (allTasks.length === 0) {
      Alert.alert('No Data', 'You have no task history to export.');
      return;
    }

    // Build CSV
    const headers = [
      'Date',
      'Role',
      'Title',
      'Category',
      'Status',
      'Price (USD)',
      'Location',
      'Accepted At',
      'Completed At',
      'Receipt URL',
      'Task ID',
    ];

    const rows = allTasks.map((t: any) => [
      new Date(t.created_at).toLocaleDateString('en-US'),
      t._role,
      escapeCSV(t.title),
      t.category,
      t.status,
      t.price?.toFixed(2) || '0.00',
      escapeCSV(t.location_address),
      t.accepted_at ? new Date(t.accepted_at).toLocaleDateString('en-US') : '',
      t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-US') : '',
      t.receipt_url || '',
      t.id,
    ]);

    const csvContent =
      headers.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n');

    if (Platform.OS === 'web') {
      // Web: download via blob
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canupls_tasks_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Native: write file and share
    const fileName = `canupls_tasks_${Date.now()}.csv`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Task History',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Exported', `File saved to: ${filePath}`);
    }
  } catch (error: any) {
    console.error('CSV export error:', error);
    Alert.alert('Export Failed', error.message || 'Could not export data.');
  }
};
