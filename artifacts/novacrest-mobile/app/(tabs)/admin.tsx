import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import {
  useGetAdminStats,
  useGetAdminUsers,
  useGetAdminUser,
  useCreditUser,
  useDeductUser,
  CreditInputType,
} from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

// ─── User Detail Modal ────────────────────────────────────────────────────────
function UserDetailModal({
  userId,
  visible,
  onClose,
  colors,
}: {
  userId: number | null;
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useGetAdminUser(userId ?? 0, {
    query: { enabled: userId !== null },
  });

  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'deposit' | 'bonus' | 'profit'>('deposit');
  const [creditNotes, setCreditNotes] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [activeForm, setActiveForm] = useState<'credit' | 'deduct' | null>(null);

  const creditMutation = useCreditUser({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        qc.invalidateQueries({ queryKey: ['getAdminUsers'] });
        qc.invalidateQueries({ queryKey: ['getAdminUser', userId] });
        qc.invalidateQueries({ queryKey: ['getAdminStats'] });
        setCreditAmount('');
        setCreditNotes('');
        setActiveForm(null);
        Alert.alert('Success', 'Account credited successfully.');
      },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Credit failed.'),
    },
  });

  const deductMutation = useDeductUser({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        qc.invalidateQueries({ queryKey: ['getAdminUsers'] });
        qc.invalidateQueries({ queryKey: ['getAdminUser', userId] });
        qc.invalidateQueries({ queryKey: ['getAdminStats'] });
        setDeductAmount('');
        setDeductReason('');
        setActiveForm(null);
        Alert.alert('Success', 'Balance deducted successfully.');
      },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Deduct failed.'),
    },
  });

  const handleCredit = () => {
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount.'); return; }
    if (!creditNotes.trim()) { Alert.alert('Error', 'Notes are required.'); return; }
    creditMutation.mutate({ data: { userId: userId!, amount: amt, type: creditType, notes: creditNotes.trim() } });
  };

  const handleDeduct = () => {
    const amt = parseFloat(deductAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount.'); return; }
    if (!deductReason.trim()) { Alert.alert('Error', 'Reason is required.'); return; }
    deductMutation.mutate({ data: { userId: userId!, amount: amt, reason: deductReason.trim() } });
  };

  const u = data?.user;
  const s = modalStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTouch} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading || !u ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
            ) : (
              <>
                {/* User header */}
                <View style={s.userHeader}>
                  <View style={[s.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                    <Text style={[s.avatarText, { color: colors.primary }]}>
                      {(u.fullName?.[0] ?? 'U').toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.userInfo}>
                    <Text style={[s.userName, { color: colors.foreground }]} numberOfLines={1}>{u.fullName}</Text>
                    <Text style={[s.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <View style={[s.roleBadge, {
                    backgroundColor: u.role === 'admin' ? colors.primary + '25' : colors.secondary,
                    borderColor: u.role === 'admin' ? colors.primary + '50' : colors.border,
                  }]}>
                    <Text style={[s.roleText, { color: u.role === 'admin' ? colors.primary : colors.mutedForeground }]}>
                      {u.role?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Balance stats */}
                <View style={s.statsRow}>
                  {[
                    { label: 'Balance', value: fmt(u.balance ?? 0), color: colors.primary },
                    { label: 'Invested', value: fmt(u.totalInvested ?? 0), color: colors.foreground },
                    { label: 'Profit', value: fmt(u.totalProfit ?? 0), color: colors.success },
                  ].map((st, i) => (
                    <View key={i} style={[s.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                      <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Action buttons */}
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.success + '18', borderColor: colors.success + '44' },
                      activeForm === 'credit' && { backgroundColor: colors.success, borderColor: colors.success }]}
                    onPress={() => setActiveForm(f => f === 'credit' ? null : 'credit')}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus-circle" size={16} color={activeForm === 'credit' ? '#fff' : colors.success} />
                    <Text style={[s.actionBtnText, { color: activeForm === 'credit' ? '#fff' : colors.success }]}>Credit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '44' },
                      activeForm === 'deduct' && { backgroundColor: colors.destructive, borderColor: colors.destructive }]}
                    onPress={() => setActiveForm(f => f === 'deduct' ? null : 'deduct')}
                    activeOpacity={0.8}
                  >
                    <Feather name="minus-circle" size={16} color={activeForm === 'deduct' ? '#fff' : colors.destructive} />
                    <Text style={[s.actionBtnText, { color: activeForm === 'deduct' ? '#fff' : colors.destructive }]}>Deduct</Text>
                  </TouchableOpacity>
                </View>

                {/* Credit form */}
                {activeForm === 'credit' && (
                  <View style={[s.form, { backgroundColor: colors.background, borderColor: colors.success + '40' }]}>
                    <Text style={[s.formTitle, { color: colors.success }]}>Credit Account</Text>
                    <Text style={[s.formLabel, { color: colors.mutedForeground }]}>Amount (USD)</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      value={creditAmount}
                      onChangeText={setCreditAmount}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[s.formLabel, { color: colors.mutedForeground }]}>Type</Text>
                    <View style={s.typeRow}>
                      {(['deposit', 'bonus', 'profit'] as const).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[s.typeChip, {
                            backgroundColor: creditType === t ? colors.primary : colors.card,
                            borderColor: creditType === t ? colors.primary : colors.border,
                          }]}
                          onPress={() => setCreditType(t)}
                        >
                          <Text style={[s.typeChipText, { color: creditType === t ? colors.primaryForeground : colors.mutedForeground }]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={[s.formLabel, { color: colors.mutedForeground }]}>Notes</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="e.g. Manual deposit"
                      placeholderTextColor={colors.mutedForeground}
                      value={creditNotes}
                      onChangeText={setCreditNotes}
                    />
                    <TouchableOpacity
                      style={[s.submitBtn, { backgroundColor: colors.success }, creditMutation.isPending && { opacity: 0.6 }]}
                      onPress={handleCredit}
                      disabled={creditMutation.isPending}
                      activeOpacity={0.8}
                    >
                      {creditMutation.isPending
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.submitBtnText}>Credit Account</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Deduct form */}
                {activeForm === 'deduct' && (
                  <View style={[s.form, { backgroundColor: colors.background, borderColor: colors.destructive + '40' }]}>
                    <Text style={[s.formTitle, { color: colors.destructive }]}>Deduct Balance</Text>
                    <Text style={[s.formLabel, { color: colors.mutedForeground }]}>Amount (USD)</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedForeground}
                      value={deductAmount}
                      onChangeText={setDeductAmount}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[s.formLabel, { color: colors.mutedForeground }]}>Reason</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="e.g. Fee correction"
                      placeholderTextColor={colors.mutedForeground}
                      value={deductReason}
                      onChangeText={setDeductReason}
                    />
                    <TouchableOpacity
                      style={[s.submitBtn, { backgroundColor: colors.destructive }, deductMutation.isPending && { opacity: 0.6 }]}
                      onPress={handleDeduct}
                      disabled={deductMutation.isPending}
                      activeOpacity={0.8}
                    >
                      {deductMutation.isPending
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.submitBtnText}>Deduct Balance</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Recent transactions */}
                {(data?.transactions ?? []).length > 0 && (
                  <View style={s.txSection}>
                    <Text style={[s.txTitle, { color: colors.foreground }]}>Recent Transactions</Text>
                    {(data?.transactions ?? []).slice(0, 5).map((tx) => {
                      const isCredit = ['deposit', 'profit', 'bonus', 'referral'].includes(tx.type);
                      return (
                        <View key={tx.id} style={[s.txRow, { borderColor: colors.border }]}>
                          <Text style={[s.txType, { color: colors.foreground }]}>
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </Text>
                          <Text style={[s.txAmount, { color: isCredit ? colors.success : colors.destructive }]}>
                            {isCredit ? '+' : '-'}{fmt(tx.amount)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={onClose}>
            <Text style={[s.closeBtnText, { color: colors.foreground }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    backdropTouch: { flex: 1 },
    sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: '92%', paddingHorizontal: 20, paddingBottom: 20 },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
    userHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 20, fontWeight: '700' as const },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700' as const },
    userEmail: { fontSize: 13, marginTop: 2 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
    roleText: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: { flex: 1, borderWidth: 1, borderRadius: 4, padding: 10, alignItems: 'center' },
    statValue: { fontSize: 12, fontWeight: '700' as const },
    statLabel: { fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginTop: 2 },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 4, borderWidth: 1 },
    actionBtnText: { fontSize: 14, fontWeight: '700' as const },
    form: { borderWidth: 1, borderRadius: 4, padding: 16, marginBottom: 16, gap: 8 },
    formTitle: { fontSize: 14, fontWeight: '700' as const, marginBottom: 4 },
    formLabel: { fontSize: 12, fontWeight: '500' as const },
    input: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14 },
    typeRow: { flexDirection: 'row', gap: 8 },
    typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
    typeChipText: { fontSize: 13, fontWeight: '600' as const },
    submitBtn: { borderRadius: 4, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
    txSection: { marginBottom: 8 },
    txTitle: { fontSize: 14, fontWeight: '700' as const, marginBottom: 10 },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
    txType: { fontSize: 13 },
    txAmount: { fontSize: 13, fontWeight: '600' as const },
    closeBtn: { marginTop: 12, borderRadius: 4, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
    closeBtnText: { fontSize: 15, fontWeight: '600' as const },
  });

// ─── User Row ─────────────────────────────────────────────────────────────────
function UserRow({ user, colors, onPress }: { user: User; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  const isActive = user.status === 'active';
  return (
    <TouchableOpacity
      style={[urStyles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[urStyles.avatar, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' }]}>
        <Text style={[urStyles.avatarText, { color: colors.primary }]}>
          {(user.fullName?.[0] ?? '?').toUpperCase()}
        </Text>
      </View>
      <View style={urStyles.info}>
        <Text style={[urStyles.name, { color: colors.foreground }]} numberOfLines={1}>{user.fullName}</Text>
        <Text style={[urStyles.email, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
      </View>
      <View style={urStyles.right}>
        <Text style={[urStyles.balance, { color: colors.primary }]}>{fmt(user.balance ?? 0)}</Text>
        <View style={[urStyles.statusDot, { backgroundColor: isActive ? colors.success : colors.destructive }]} />
      </View>
    </TouchableOpacity>
  );
}

const urStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: 4, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700' as const },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' as const },
  email: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 5 },
  balance: { fontSize: 13, fontWeight: '700' as const },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});

// ─── Admin Screen ─────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useGetAdminStats();
  const {
    data: usersData,
    isLoading: loadingUsers,
    refetch: refetchUsers,
    isRefetching,
  } = useGetAdminUsers();

  const allUsers = usersData?.users ?? [];
  const filtered = search.trim()
    ? allUsers.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : allUsers;

  const s = makeStyles(colors, insets);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.topArea}>
        <View style={s.headerRow}>
          <Text style={s.pageTitle}>Admin Panel</Text>
          <View style={[s.adminBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <Feather name="shield" size={12} color={colors.primary} />
            <Text style={[s.adminBadgeText, { color: colors.primary }]}>ADMIN</Text>
          </View>
        </View>

        {/* Stats strip */}
        {loadingStats ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 16 }} />
        ) : (
          <View style={s.statsStrip}>
            {[
              { label: 'Users', value: String(stats?.totalUsers ?? 0) },
              { label: 'Active', value: String(stats?.activeUsers ?? 0) },
              { label: 'Invested', value: fmt(stats?.totalInvested ?? 0) },
              { label: 'Paid Out', value: fmt(stats?.totalPaidOut ?? 0) },
            ].map((st, i) => (
              <View key={i} style={[s.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.statValue, { color: colors.foreground }]} numberOfLines={1}>{st.value}</Text>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Search */}
        <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[s.searchInput, { color: colors.foreground }]}
            placeholder="Search users…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[s.countLabel, { color: colors.mutedForeground }]}>
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </Text>
      </View>

      {/* User list */}
      {loadingUsers ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              colors={colors}
              onPress={() => setSelectedUserId(item.id)}
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { refetchUsers(); refetchStats(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="users" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No users found</Text>
            </View>
          }
        />
      )}

      {/* Detail modal */}
      <UserDetailModal
        userId={selectedUserId}
        visible={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
        colors={colors}
      />
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topArea: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 8,
      backgroundColor: colors.background,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    pageTitle: { fontSize: 26, fontWeight: '700' as const, color: colors.foreground },
    adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
    adminBadgeText: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8 },
    statsStrip: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statItem: { flex: 1, borderWidth: 1, borderRadius: 4, padding: 10, alignItems: 'center' },
    statValue: { fontSize: 12, fontWeight: '700' as const },
    statLabel: { fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginTop: 2 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 8 },
    searchInput: { flex: 1, fontSize: 15 },
    countLabel: { fontSize: 12, marginBottom: 4 },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 90,
    },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { fontSize: 14 },
  });
