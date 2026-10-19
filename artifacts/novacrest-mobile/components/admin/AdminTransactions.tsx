import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetAdminTransactions, useApproveTransaction, useRejectTransaction } from '@workspace/api-client-react';
import type { Transaction } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { format } from 'date-fns';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

type TFilter = 'all' | 'pending' | 'completed' | 'failed';
const FILTERS: TFilter[] = ['all', 'pending', 'completed', 'failed'];

const TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  deposit: 'arrow-down-circle', withdrawal: 'arrow-up-circle',
  profit: 'trending-up', bonus: 'gift', referral: 'users',
};

export function AdminTransactions({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [filter, setFilter] = useState<TFilter>('pending');
  const [rejectTx, setRejectTx] = useState<Transaction | null>(null);
  const [reason, setReason] = useState('');

  const { data: txs, isLoading, refetch, isRefetching } = useGetAdminTransactions();

  const approveM = useApproveTransaction({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); refetch(); Alert.alert('Success', 'Transaction approved.'); },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Approve failed.'),
    },
  });

  const rejectM = useRejectTransaction({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch(); setRejectTx(null); setReason('');
        Alert.alert('Success', 'Transaction rejected.');
      },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Reject failed.'),
    },
  });

  const all = txs ?? [];
  const filtered = filter === 'all' ? all : all.filter(t => t.status === filter);
  const s = st(colors);

  return (
    <>
      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f}
            style={[s.chip, { backgroundColor: filter === f ? colors.primary : colors.card, borderColor: filter === f ? colors.primary : colors.border }]}
            onPress={() => setFilter(f)} activeOpacity={0.8}>
            <Text style={[s.chipTxt, { color: filter === f ? colors.primaryForeground : colors.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.count, { color: colors.mutedForeground }]}>{filtered.length} transactions</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered} keyExtractor={t => String(t.id)} scrollEnabled={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: tx }) => {
            const isCredit = ['deposit', 'profit', 'bonus', 'referral'].includes(tx.type);
            const isPending = tx.status === 'pending';
            return (
              <View style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.iconWrap, { backgroundColor: isCredit ? colors.success + '20' : colors.destructive + '20' }]}>
                  <Feather name={TYPE_ICON[tx.type] ?? 'circle'} size={16} color={isCredit ? colors.success : colors.destructive} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.type, { color: colors.foreground }]}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                  <Text style={[s.date, { color: colors.mutedForeground }]}>{format(new Date(tx.createdAt), 'MMM d, yyyy')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <Text style={[s.amount, { color: isCredit ? colors.success : colors.destructive }]}>
                    {isCredit ? '+' : '-'}{fmt(tx.amount)}
                  </Text>
                  <View style={[s.badge, {
                    backgroundColor: tx.status === 'completed' ? colors.success + '20' :
                      tx.status === 'pending' ? colors.warning + '20' : colors.destructive + '20',
                  }]}>
                    <Text style={[s.badgeTxt, { color: tx.status === 'completed' ? colors.success : tx.status === 'pending' ? colors.warning : colors.destructive }]}>
                      {tx.status}
                    </Text>
                  </View>
                  {isPending && (
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}
                        onPress={() => {
                          Alert.alert('Approve', 'Approve this transaction?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Approve', onPress: () => approveM.mutate({ id: tx.id }) },
                          ]);
                        }} disabled={approveM.isPending}>
                        {approveM.isPending ? <ActivityIndicator size="small" color={colors.success} /> : <Feather name="check" size={14} color={colors.success} />}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: colors.destructive + '20', borderColor: colors.destructive + '40' }]}
                        onPress={() => setRejectTx(tx)} disabled={rejectM.isPending}>
                        <Feather name="x" size={14} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="activity" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No transactions found</Text>
            </View>
          }
        />
      )}

      {/* Reject modal */}
      <Modal visible={rejectTx !== null} transparent animationType="fade" onRequestClose={() => setRejectTx(null)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>Reject Transaction</Text>
            <Text style={[s.modalSub, { color: colors.mutedForeground }]}>Provide a reason for rejection.</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Insufficient documentation"
              placeholderTextColor={colors.mutedForeground}
              value={reason} onChangeText={setReason} multiline />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => { setRejectTx(null); setReason(''); }}>
                <Text style={[s.modalBtnTxt, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.destructive }, rejectM.isPending && { opacity: 0.6 }]}
                onPress={() => {
                  if (!reason.trim()) { Alert.alert('Error', 'Reason required.'); return; }
                  rejectM.mutate({ id: rejectTx!.id, data: { reason: reason.trim() } });
                }} disabled={rejectM.isPending}>
                {rejectM.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.modalBtnTxt}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const st = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontWeight: '600' as const },
  count: { fontSize: 11, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderWidth: 1, borderRadius: 4, marginBottom: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  type: { fontSize: 13, fontWeight: '600' as const },
  date: { fontSize: 11, marginTop: 2 },
  amount: { fontSize: 13, fontWeight: '700' as const },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  badgeTxt: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
  actionRow: { flexDirection: 'row', gap: 5 },
  actionBtn: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { borderWidth: 1, borderRadius: 8, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700' as const },
  modalSub: { fontSize: 13 },
  textInput: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14, minHeight: 80 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, borderRadius: 4, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  modalBtnTxt: { color: '#fff', fontWeight: '700' as const, fontSize: 14 },
});
