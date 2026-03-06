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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Transaction {
  id: string;
  task_id: string;
  amount: number;
  payment_status: string;
  created_at: string;
  task_title?: string;
}

const brandIcons: Record<string, string> = {
  visa: 'card',
  mastercard: 'card',
  amex: 'card',
  discover: 'card',
};

export default function WalletScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const fetchWalletData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch completed tasks as helper (earnings)
      const { data: earnedTasks } = await supabase
        .from('tasks')
        .select('price')
        .eq('helper_id', user.id)
        .eq('status', 'completed');

      const earned = (earnedTasks || []).reduce((sum, t) => sum + (t.price || 0), 0);
      setTotalEarned(earned);

      // Fetch in-progress tasks as helper (pending)
      const { data: pendingTasks } = await supabase
        .from('tasks')
        .select('price')
        .eq('helper_id', user.id)
        .in('status', ['accepted', 'in_progress']);

      const pending = (pendingTasks || []).reduce((sum, t) => sum + (t.price || 0), 0);
      setPendingEarnings(pending);

      // Fetch completed tasks as requester (spent)
      const { data: spentTasks } = await supabase
        .from('tasks')
        .select('price')
        .eq('requester_id', user.id)
        .eq('status', 'completed');

      const spent = (spentTasks || []).reduce((sum, t) => sum + (t.price || 0), 0);
      setTotalSpent(spent);

      // Fetch transaction history
      const { data: txns } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txns && txns.length > 0) {
        // Enrich with task titles
        const taskIds = [...new Set(txns.map((t: any) => t.task_id))];
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);

        const taskMap = new Map((tasks || []).map((t: any) => [t.id, t.title]));
        setTransactions(
          txns.map((t: any) => ({ ...t, task_title: taskMap.get(t.task_id) || 'Task' }))
        );
      } else {
        setTransactions([]);
      }

      // Fetch payment methods if user has stripe_customer_id
      if (profile?.stripe_customer_id) {
        await fetchPaymentMethods(profile.stripe_customer_id);
      }
    } catch (error) {
      console.error('Wallet fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile]);

  const fetchPaymentMethods = async (customerId: string) => {
    try {
      setLoadingMethods(true);
      const res = await fetch(`${BACKEND_URL}/api/stripe/payment-methods/${customerId}`);
      const data = await res.json();
      if (data.payment_methods) {
        setPaymentMethods(data.payment_methods);
      }
    } catch (error) {
      console.error('Payment methods error:', error);
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleSetupStripe = async () => {
    if (!user || !profile) return;

    try {
      setLoadingMethods(true);
      let customerId = profile.stripe_customer_id;

      // Create Stripe customer if none exists
      if (!customerId) {
        const res = await fetch(`${BACKEND_URL}/api/stripe/customer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: profile.full_name,
            user_id: user.id,
          }),
        });
        const data = await res.json();
        if (data.customer_id) {
          customerId = data.customer_id;
          // Save customer ID to profile
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', user.id);
        } else {
          throw new Error('Failed to create Stripe customer');
        }
      }

      Alert.alert(
        'Add Payment Method',
        'Stripe payment method setup will be available when you build the app natively. Test keys are configured and ready.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set up payment method.');
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleDeletePaymentMethod = (pmId: string, last4: string) => {
    Alert.alert('Remove Card', `Remove card ending in ${last4}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${BACKEND_URL}/api/stripe/payment-method/${pmId}`, {
              method: 'DELETE',
            });
            setPaymentMethods((prev) => prev.filter((p) => p.id !== pmId));
          } catch (error) {
            Alert.alert('Error', 'Failed to remove card.');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const isHelper = profile?.user_role === 'helper' || profile?.user_role === 'both';
  const isRequester = profile?.user_role === 'requester' || profile?.user_role === 'both';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Balance Cards */}
        {isHelper && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={[styles.balanceIcon, { backgroundColor: Colors.success + '20' }]}>
                <Ionicons name="trending-up" size={24} color={Colors.success} />
              </View>
              <Text style={styles.balanceLabel}>Total Earned</Text>
            </View>
            <Text style={styles.balanceAmount}>${totalEarned.toFixed(2)}</Text>
            {pendingEarnings > 0 && (
              <View style={styles.pendingRow}>
                <Ionicons name="time-outline" size={14} color={Colors.warning} />
                <Text style={styles.pendingText}>
                  ${pendingEarnings.toFixed(2)} pending
                </Text>
              </View>
            )}
          </View>
        )}

        {isRequester && (
          <View style={[styles.balanceCard, { borderLeftColor: Colors.primary }]}>
            <View style={styles.balanceHeader}>
              <View style={[styles.balanceIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="wallet" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.balanceLabel}>Total Spent</Text>
            </View>
            <Text style={[styles.balanceAmount, { color: Colors.primary }]}>
              ${totalSpent.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Payment Methods — for Requesters */}
        {isRequester && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Methods</Text>
              <TouchableOpacity onPress={handleSetupStripe} disabled={loadingMethods}>
                <Ionicons name="add-circle" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {loadingMethods ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
            ) : paymentMethods.length === 0 ? (
              <TouchableOpacity style={styles.addCardBtn} onPress={handleSetupStripe}>
                <Ionicons name="card-outline" size={32} color={Colors.gray[400]} />
                <Text style={styles.addCardTitle}>No payment methods</Text>
                <Text style={styles.addCardSubtitle}>Tap to add a card via Stripe</Text>
              </TouchableOpacity>
            ) : (
              paymentMethods.map((pm) => (
                <View key={pm.id} style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="card" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardBrand}>
                      {pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)}
                    </Text>
                    <Text style={styles.cardNumber}>
                      **** **** **** {pm.last4}
                    </Text>
                  </View>
                  <Text style={styles.cardExpiry}>
                    {String(pm.exp_month).padStart(2, '0')}/{pm.exp_year}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeletePaymentMethod(pm.id, pm.last4)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={Colors.gray[300]} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Completed task payments will appear here
              </Text>
            </View>
          ) : (
            transactions.map((txn) => (
              <View key={txn.id} style={styles.txnRow}>
                <View
                  style={[
                    styles.txnIcon,
                    {
                      backgroundColor:
                        txn.payment_status === 'completed'
                          ? Colors.success + '20'
                          : Colors.warning + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      txn.payment_status === 'completed'
                        ? 'checkmark-circle'
                        : 'time'
                    }
                    size={20}
                    color={
                      txn.payment_status === 'completed'
                        ? Colors.success
                        : Colors.warning
                    }
                  />
                </View>
                <View style={styles.txnInfo}>
                  <Text style={styles.txnTitle} numberOfLines={1}>
                    {txn.task_title}
                  </Text>
                  <Text style={styles.txnDate}>
                    {new Date(txn.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txnAmount,
                    { color: txn.payment_status === 'completed' ? Colors.success : Colors.gray[600] },
                  ]}
                >
                  ${txn.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Stripe Test Mode Notice */}
        <View style={styles.testNotice}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.testNoticeText}>
            Stripe is in Test Mode. No real charges will be made.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[600],
  },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.xl, fontFamily: 'Poppins-Bold', color: Colors.gray[700] },
  balanceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    ...Shadows.md,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  balanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Medium',
    color: Colors.gray[600],
    marginLeft: Spacing.sm,
  },
  balanceAmount: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  pendingText: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Medium',
    color: Colors.warning,
    marginLeft: 4,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[700],
    marginBottom: Spacing.sm,
  },
  addCardBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
  },
  addCardTitle: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[600],
    marginTop: Spacing.sm,
  },
  addCardSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginTop: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  cardBrand: { fontSize: FontSizes.md, fontFamily: 'Poppins-SemiBold', color: Colors.gray[700] },
  cardNumber: { fontSize: FontSizes.xs, fontFamily: 'Poppins-Regular', color: Colors.gray[500] },
  cardExpiry: { fontSize: FontSizes.xs, fontFamily: 'Poppins-Regular', color: Colors.gray[500], marginRight: Spacing.sm },
  deleteBtn: { padding: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-SemiBold',
    color: Colors.gray[600],
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    marginTop: 2,
    textAlign: 'center',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1, marginLeft: Spacing.md },
  txnTitle: { fontSize: FontSizes.sm, fontFamily: 'Poppins-Medium', color: Colors.gray[700] },
  txnDate: { fontSize: FontSizes.xs, fontFamily: 'Poppins-Regular', color: Colors.gray[500] },
  txnAmount: { fontSize: FontSizes.md, fontFamily: 'Poppins-Bold' },
  testNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  testNoticeText: {
    flex: 1,
    fontSize: FontSizes.xs,
    fontFamily: 'Poppins-Regular',
    color: Colors.warning,
    marginLeft: Spacing.sm,
  },
});
