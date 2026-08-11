import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ScrollView, TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetAdminUsers, useGetAdminUser, useCreditUser, useDeductUser,
  useUpdateAdminUser, CreditInputType, AdminUserUpdateStatus,
} from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { format } from 'date-fns';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

function UserDetailModal({
  userId, visible, onClose, colors,
}: {
  userId: number | null; visible: boolean; onClose: () => void; colors: ReturnType<typeof useColors>;
}) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useGetAdminUser(userId ?? 0, { query: { enabled: userId !== null } });

  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'deposit' | 'bonus' | 'profit'>('deposit');
  const [creditNotes, setCreditNotes] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [activeForm, setActiveForm] = useState<'credit' | 'deduct' | 'edit' | null>(null);
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'pending'>('active');

  const creditM = useCreditUser({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        qc.invalidateQueries({ queryKey: ['getAdminUsers'] });
        refetch();
        setCreditAmount(''); setCreditNotes(''); setActiveForm(null);
        Alert.alert('Success', 'Account credited.');
      },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Credit failed.'),
    },
  });

  const deductM = useDeductUser({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        qc.invalidateQueries({ queryKey: ['getAdminUsers'] });
        refetch();
        setDeductAmount(''); setDeductReason(''); setActiveForm(null);
        Alert.alert('Success', 'Balance deducted.');
      },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Deduct failed.'),
    },
  });

  const updateM = useUpdateAdminUser({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        qc.invalidateQueries({ queryKey: ['getAdminUsers'] });
        refetch();
        setActiveForm(null);
        Alert.alert('Success', 'User updated.');
      },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Update failed.'),
    },
  });

  const u = data?.user;
  const s = ms(colors);

  const handleCredit = () => {
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter valid amount.'); return; }
    if (!creditNotes.trim()) { Alert.alert('Error', 'Notes required.'); return; }
    creditM.mutate({ data: { userId: userId!, amount: amt, type: creditType, notes: creditNotes.trim() } });
  };

  const handleDeduct = () => {
    const amt = parseFloat(deductAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter valid amount.'); return; }
    if (!deductReason.trim()) { Alert.alert('Error', 'Reason required.'); return; }
    deductM.mutate({ data: { userId: userId!, amount: amt, reason: deductReason.trim() } });
  };

  const handleUpdateStatus = () => {
    updateM.mutate({ id: userId!, data: { status: newStatus } });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading || !u ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
            ) : (
              <>
                {/* Header */}
                <View style={s.userHeader}>
                  <View style={[s.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                    <Text style={[s.avatarTxt, { color: colors.primary }]}>{(u.fullName?.[0] ?? 'U').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.uname, { color: colors.foreground }]} numberOfLines={1}>{u.fullName}</Text>
                    <Text style={[s.uemail, { color: colors.mutedForeground }]} numberOfLines={1}>{u.email}</Text>
                    <Text style={[s.uemail, { color: colors.mutedForeground }]}>
                      Joined {format(new Date(u.createdAt || Date.now()), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <View style={[s.roleBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
                    <Text style={[s.roleText, { color: colors.primary }]}>{u.role?.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={s.statsRow}>
                  {[
                    { l: 'Balance', v: fmt(u.balance ?? 0), c: colors.primary },
                    { l: 'Invested', v: fmt(u.totalInvested ?? 0), c: colors.foreground },
                    { l: 'Profit', v: fmt(u.totalProfit ?? 0), c: colors.success },
                  ].map((st, i) => (
                    <View key={i} style={[s.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[s.statV, { color: st.c }]}>{st.v}</Text>
                      <Text style={[s.statL, { color: colors.mutedForeground }]}>{st.l}</Text>
                    </View>
                  ))}
                </View>

                {/* Action buttons */}
                <View style={s.actionRow}>
                  {([
                    { id: 'credit', label: 'Credit', icon: 'plus-circle' as const, color: colors.success },
                    { id: 'deduct', label: 'Deduct', icon: 'minus-circle' as const, color: colors.destructive },
                    { id: 'edit', label: 'Edit Status', icon: 'edit-2' as const, color: colors.primary },
                  ] as const).map((a) => (
                    <TouchableOpacity key={a.id}
                      style={[s.actionBtn, { backgroundColor: a.color + '18', borderColor: a.color + '40' },
                        activeForm === a.id && { backgroundColor: a.color, borderColor: a.color }]}
                      onPress={() => setActiveForm(f => f === a.id ? null : a.id as any)} activeOpacity={0.8}>
                      <Feather name={a.icon} size={14} color={activeForm === a.id ? '#fff' : a.color} />
                      <Text style={[s.actionBtnTxt, { color: activeForm === a.id ? '#fff' : a.color }]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Credit form */}
                {activeForm === 'credit' && (
                  <View style={[s.form, { backgroundColor: colors.background, borderColor: colors.success + '40' }]}>
                    <Text style={[s.formTitle, { color: colors.success }]}>Credit Account</Text>
                    <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Amount" placeholderTextColor={colors.mutedForeground} value={creditAmount} onChangeText={setCreditAmount} keyboardType="decimal-pad" />
                    <View style={s.typeRow}>
                      {(['deposit', 'bonus', 'profit'] as const).map(t => (
                        <TouchableOpacity key={t} onPress={() => setCreditType(t)}
                          style={[s.chip, { backgroundColor: creditType === t ? colors.primary : colors.card, borderColor: creditType === t ? colors.primary : colors.border }]}>
                          <Text style={{ color: creditType === t ? colors.primaryForeground : colors.mutedForeground, fontSize: 13, fontWeight: '600' as const }}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Notes" placeholderTextColor={colors.mutedForeground} value={creditNotes} onChangeText={setCreditNotes} />
                    <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.success }, creditM.isPending && { opacity: 0.6 }]}
                      onPress={handleCredit} disabled={creditM.isPending} activeOpacity={0.8}>
                      {creditM.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Credit Account</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Deduct form */}
                {activeForm === 'deduct' && (
                  <View style={[s.form, { backgroundColor: colors.background, borderColor: colors.destructive + '40' }]}>
                    <Text style={[s.formTitle, { color: colors.destructive }]}>Deduct Balance</Text>
                    <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Amount" placeholderTextColor={colors.mutedForeground} value={deductAmount} onChangeText={setDeductAmount} keyboardType="decimal-pad" />
                    <TextInput style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Reason" placeholderTextColor={colors.mutedForeground} value={deductReason} onChangeText={setDeductReason} />
                    <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.destructive }, deductM.isPending && { opacity: 0.6 }]}
                      onPress={handleDeduct} disabled={deductM.isPending} activeOpacity={0.8}>
                      {deductM.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Deduct Balance</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Edit status form */}
                {activeForm === 'edit' && (
                  <View style={[s.form, { backgroundColor: colors.background, borderColor: colors.primary + '40' }]}>
                    <Text style={[s.formTitle, { color: colors.primary }]}>Change Status</Text>
                    <View style={s.typeRow}>
                      {(['active', 'suspended', 'pending'] as const).map(st => (
                        <TouchableOpacity key={st} onPress={() => setNewStatus(st)}
                          style={[s.chip, { backgroundColor: newStatus === st ? colors.primary : colors.card, borderColor: newStatus === st ? colors.primary : colors.border }]}>
                          <Text style={{ color: newStatus === st ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '600' as const }}>
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={[s.submitBtn, { backgroundColor: colors.primary }, updateM.isPending && { opacity: 0.6 }]}
                      onPress={handleUpdateStatus} disabled={updateM.isPending} activeOpacity={0.8}>
                      {updateM.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[s.submitTxt, { color: colors.primaryForeground }]}>Update Status</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Investments */}
                {(data?.investments ?? []).length > 0 && (
                  <View style={s.txSection}>
                    <Text style={[s.txTitle, { color: colors.foreground }]}>Active Investments ({data?.investments.filter(i => i.status === 'active').length})</Text>
                    {(data?.investments ?? []).slice(0, 3).map((inv) => (
                      <View key={inv.id} style={[s.txRow, { borderColor: colors.border }]}>
                        <Text style={[s.txType, { color: colors.foreground }]} numberOfLines={1}>{inv.planName}</Text>
                        <Text style={[s.txAmt, { color: colors.primary }]}>{fmt(inv.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent Transactions */}
                {(data?.transactions ?? []).length > 0 && (
                  <View style={s.txSection}>
                    <Text style={[s.txTitle, { color: colors.foreground }]}>Recent Transactions</Text>
                    {(data?.transactions ?? []).slice(0, 5).map((tx) => {
                      const isCredit = ['deposit', 'profit', 'bonus', 'referral'].includes(tx.type);
                      return (
                        <View key={tx.id} style={[s.txRow, { borderColor: colors.border }]}>
                          <View>
                            <Text style={[s.txType, { color: colors.foreground }]}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                            <Text style={[s.txType, { color: colors.mutedForeground, fontSize: 11 }]}>{tx.status}</Text>
                          </View>
                          <Text style={[s.txAmt, { color: isCredit ? colors.success : colors.destructive }]}>
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
            <Text style={[s.closeTxt, { color: colors.foreground }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function AdminMembers({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: usersData, isLoading, refetch, isRefetching } = useGetAdminUsers();

  const all = usersData?.users ?? [];
  const filtered = search.trim()
    ? all.filter(u => u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    : all;

  const s = ls(colors);

  return (
    <>
      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput style={[s.searchInput, { color: colors.foreground }]} placeholder="Search members…"
          placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} autoCapitalize="none" />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[s.count, { color: colors.mutedForeground }]}>{filtered.length} members</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered} keyExtractor={u => String(u.id)}
          scrollEnabled={false}
          renderItem={({ item: u }) => (
            <TouchableOpacity style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedUserId(u.id)} activeOpacity={0.8}>
              <View style={[s.avtr, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' }]}>
                <Text style={[s.avtrTxt, { color: colors.primary }]}>{(u.fullName?.[0] ?? '?').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.uname, { color: colors.foreground }]} numberOfLines={1}>{u.fullName}</Text>
                <Text style={[s.uemail, { color: colors.mutedForeground }]} numberOfLines={1}>{u.email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[s.bal, { color: colors.primary }]}>{fmt(u.balance ?? 0)}</Text>
                <View style={[s.dot, { backgroundColor: u.status === 'active' ? colors.success : colors.destructive }]} />
              </View>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="users" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No members found</Text>
            </View>
          }
        />
      )}

      <UserDetailModal userId={selectedUserId} visible={selectedUserId !== null} onClose={() => setSelectedUserId(null)} colors={colors} />
    </>
  );
}

const ms = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: '92%', paddingHorizontal: 20, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '700' as const },
  uname: { fontSize: 15, fontWeight: '700' as const },
  uemail: { fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 4, padding: 10, alignItems: 'center' },
  statV: { fontSize: 12, fontWeight: '700' as const },
  statL: { fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 4, borderWidth: 1 },
  actionBtnTxt: { fontSize: 12, fontWeight: '700' as const },
  form: { borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 14, gap: 8 },
  formTitle: { fontSize: 13, fontWeight: '700' as const, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 4, padding: 11, fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  submitBtn: { borderRadius: 4, paddingVertical: 12, alignItems: 'center', marginTop: 2 },
  submitTxt: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  txSection: { marginBottom: 10 },
  txTitle: { fontSize: 13, fontWeight: '700' as const, marginBottom: 8 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  txType: { fontSize: 13 },
  txAmt: { fontSize: 13, fontWeight: '600' as const },
  closeBtn: { marginTop: 12, borderRadius: 4, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  closeTxt: { fontSize: 15, fontWeight: '600' as const },
});

const ls = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 6 },
  searchInput: { flex: 1, fontSize: 15 },
  count: { fontSize: 11, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 4, marginBottom: 8 },
  avtr: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avtrTxt: { fontSize: 15, fontWeight: '700' as const },
  uname: { fontSize: 14, fontWeight: '600' as const },
  uemail: { fontSize: 12, marginTop: 1 },
  bal: { fontSize: 12, fontWeight: '700' as const },
  dot: { width: 7, height: 7, borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
});
