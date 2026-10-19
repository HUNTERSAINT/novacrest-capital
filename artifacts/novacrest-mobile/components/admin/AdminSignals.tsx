import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetSignals, useCreateAdminSignal, useUpdateAdminSignal, useDeleteAdminSignal } from '@workspace/api-client-react';
import type { TradingSignal } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { format } from 'date-fns';

const ACTIONS = ['buy', 'sell', 'hold'] as const;
const TIMEFRAMES = ['short_term', 'mid_term', 'long_term'] as const;
const STATUSES = ['active', 'completed', 'expired'] as const;

const ACTION_COLOR = (colors: ReturnType<typeof useColors>) => ({
  buy: colors.success, sell: colors.destructive, hold: colors.warning,
});

type SigForm = { title: string; asset: string; action: 'buy' | 'sell' | 'hold'; entryPrice: string; targetPrice: string; stopLoss: string; timeframe: string; status: string; notes: string };
const EMPTY: SigForm = { title: '', asset: '', action: 'buy', entryPrice: '', targetPrice: '', stopLoss: '', timeframe: 'short_term', status: 'active', notes: '' };

function SignalModal({ signal, visible, onClose, colors }: {
  signal: TradingSignal | null; visible: boolean; onClose: () => void; colors: ReturnType<typeof useColors>;
}) {
  const isEdit = signal !== null;
  const [form, setForm] = useState<SigForm>(
    signal ? { title: signal.title, asset: signal.asset, action: signal.action, entryPrice: signal.entryPrice ?? '', targetPrice: signal.targetPrice ?? '', stopLoss: signal.stopLoss ?? '', timeframe: signal.timeframe, status: signal.status, notes: signal.notes ?? '' } : EMPTY
  );
  const set = (k: keyof SigForm) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const createM = useCreateAdminSignal();
  const updateM = useUpdateAdminSignal();
  const deleteM = useDeleteAdminSignal();
  const isBusy = createM.isPending || updateM.isPending;

  const handleSave = () => {
    if (!form.title || !form.asset) { Alert.alert('Error', 'Title and asset required.'); return; }
    const payload = { title: form.title, asset: form.asset, action: form.action, entryPrice: form.entryPrice || null, targetPrice: form.targetPrice || null, stopLoss: form.stopLoss || null, timeframe: form.timeframe, status: form.status as any, notes: form.notes || null };
    if (isEdit) {
      updateM.mutate({ id: signal!.id, ...payload }, {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Signal updated.'); },
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'Update failed.'),
      });
    } else {
      createM.mutate(payload, {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Signal created.'); },
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'Create failed.'),
      });
    }
  };

  const s = ss(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[s.title, { color: colors.foreground }]}>{isEdit ? 'Edit Signal' : 'New Signal'}</Text>

            {[
              { label: 'Title', key: 'title' as const, placeholder: 'e.g. BTC Breakout Alert' },
              { label: 'Asset', key: 'asset' as const, placeholder: 'e.g. BTC/USDT' },
              { label: 'Entry Price', key: 'entryPrice' as const, placeholder: '42000', kb: 'decimal-pad' as const },
              { label: 'Target Price', key: 'targetPrice' as const, placeholder: '48000', kb: 'decimal-pad' as const },
              { label: 'Stop Loss', key: 'stopLoss' as const, placeholder: '39000', kb: 'decimal-pad' as const },
              { label: 'Notes', key: 'notes' as const, placeholder: 'Analysis notes…' },
            ].map(f => (
              <View key={f.key} style={s.field}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground} value={form[f.key] as string} onChangeText={set(f.key)} keyboardType={f.kb as any} />
              </View>
            ))}

            {/* Action */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Action</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ACTIONS.map(a => {
                  const ac = ACTION_COLOR(colors)[a];
                  return (
                    <TouchableOpacity key={a} onPress={() => set('action')(a)}
                      style={[s.chip, { backgroundColor: form.action === a ? ac : colors.background, borderColor: form.action === a ? ac : colors.border }]}>
                      <Text style={{ color: form.action === a ? '#fff' : colors.mutedForeground, fontSize: 13, fontWeight: '700' as const }}>
                        {a.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Timeframe */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Timeframe</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' as const }}>
                {TIMEFRAMES.map(t => (
                  <TouchableOpacity key={t} onPress={() => set('timeframe')(t)}
                    style={[s.chip, { backgroundColor: form.timeframe === t ? colors.primary : colors.background, borderColor: form.timeframe === t ? colors.primary : colors.border }]}>
                    <Text style={{ color: form.timeframe === t ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '600' as const }}>
                      {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isEdit && (
              <View style={s.field}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {STATUSES.map(st => (
                    <TouchableOpacity key={st} onPress={() => set('status')(st)}
                      style={[s.chip, { backgroundColor: form.status === st ? colors.primary : colors.background, borderColor: form.status === st ? colors.primary : colors.border }]}>
                      <Text style={{ color: form.status === st ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '600' as const }}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, isBusy && { opacity: 0.6 }]} onPress={handleSave} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[s.saveTxt, { color: colors.primaryForeground }]}>{isEdit ? 'Save Changes' : 'Create Signal'}</Text>}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={[s.deleteBtn, { borderColor: colors.destructive + '60' }]}
                onPress={() => Alert.alert('Delete Signal', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteM.mutate(signal!.id, { onSuccess: () => { onClose(); Alert.alert('Deleted', 'Signal removed.'); }, onError: (e: any) => Alert.alert('Error', e?.message) }); } }])}>
                <Text style={[s.deleteTxt, { color: colors.destructive }]}>Delete Signal</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={onClose}>
            <Text style={[s.closeTxt, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function AdminSignals({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [selected, setSelected] = useState<TradingSignal | null | 'new'>('new' as any);
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, refetch } = useGetSignals();
  const signals = data?.signals ?? [];
  const ac = ACTION_COLOR(colors);
  const s = ss(colors);

  return (
    <>
      <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setSelected(null); setShowModal(true); }} activeOpacity={0.8}>
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={[s.addBtnTxt, { color: colors.primaryForeground }]}>New Signal</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={signals} keyExtractor={s => String(s.id)} scrollEnabled={false}
          renderItem={({ item: sig }) => (
            <TouchableOpacity style={[ss(colors).sigRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setSelected(sig); setShowModal(true); }} activeOpacity={0.8}>
              <View style={[ss(colors).actionBadge, { backgroundColor: ac[sig.action] + '20', borderColor: ac[sig.action] + '40' }]}>
                <Text style={[ss(colors).actionTxt, { color: ac[sig.action] }]}>{sig.action.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ss(colors).sigTitle, { color: colors.foreground }]} numberOfLines={1}>{sig.title}</Text>
                <Text style={[ss(colors).sigAsset, { color: colors.primary }]}>{sig.asset} · {sig.timeframe.replace('_', ' ')}</Text>
                <Text style={[ss(colors).sigDate, { color: colors.mutedForeground }]}>{format(new Date(sig.createdAt), 'MMM d, yyyy')}</Text>
              </View>
              <View style={[ss(colors).statusBadge, { backgroundColor: sig.status === 'active' ? colors.success + '20' : colors.mutedForeground + '20' }]}>
                <Text style={[ss(colors).statusTxt, { color: sig.status === 'active' ? colors.success : colors.mutedForeground }]}>{sig.status}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="trending-up" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No signals yet</Text>
            </View>
          }
        />
      )}

      <SignalModal signal={showModal ? (selected === 'new' ? null : selected as TradingSignal | null) : null}
        visible={showModal} onClose={() => { setShowModal(false); refetch(); }} colors={colors} />
    </>
  );
}

const ss = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 4, marginBottom: 16 },
  addBtnTxt: { fontSize: 14, fontWeight: '700' as const },
  sigRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 4, marginBottom: 8, gap: 10 },
  actionBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: 1 },
  actionTxt: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.5 },
  sigTitle: { fontSize: 13, fontWeight: '600' as const },
  sigAsset: { fontSize: 12, marginTop: 2 },
  sigDate: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusTxt: { fontSize: 10, fontWeight: '600' as const },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
  // Modal
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: '90%', paddingHorizontal: 20, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  title: { fontSize: 18, fontWeight: '700' as const, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500' as const, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  saveBtn: { borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  saveTxt: { fontSize: 15, fontWeight: '700' as const },
  deleteBtn: { borderWidth: 1, borderRadius: 4, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  deleteTxt: { fontSize: 14, fontWeight: '700' as const },
  closeBtn: { borderRadius: 4, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  closeTxt: { fontSize: 15, fontWeight: '600' as const },
});
