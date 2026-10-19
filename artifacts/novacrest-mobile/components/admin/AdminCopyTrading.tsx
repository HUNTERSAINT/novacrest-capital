import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetAdminStrategies, useCreateAdminStrategy, useUpdateAdminStrategy, useDeleteAdminStrategy } from '@workspace/api-client-react';
import type { CopyTradingStrategy } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const RISK_LEVELS = ['low', 'medium', 'high'] as const;
const RISK_COLOR = (colors: ReturnType<typeof useColors>) => ({
  low: colors.success, medium: colors.warning, high: colors.destructive,
});

type StratForm = { name: string; managerName: string; description: string; monthlyRoi: string; riskLevel: 'low' | 'medium' | 'high'; minAmount: string; winRate: string; isActive: boolean };
const EMPTY: StratForm = { name: '', managerName: '', description: '', monthlyRoi: '', riskLevel: 'medium', minAmount: '', winRate: '', isActive: true };

function StrategyModal({ strategy, visible, onClose, colors }: {
  strategy: CopyTradingStrategy | null; visible: boolean; onClose: () => void; colors: ReturnType<typeof useColors>;
}) {
  const isEdit = strategy !== null;
  const [form, setForm] = useState<StratForm>(
    strategy ? { name: strategy.name, managerName: strategy.managerName, description: strategy.description, monthlyRoi: String(strategy.monthlyRoi), riskLevel: strategy.riskLevel, minAmount: String(strategy.minAmount), winRate: String(strategy.winRate), isActive: strategy.isActive } : EMPTY
  );
  const set = (k: keyof StratForm) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const createM = useCreateAdminStrategy();
  const updateM = useUpdateAdminStrategy();
  const deleteM = useDeleteAdminStrategy();
  const isBusy = createM.isPending || updateM.isPending;
  const rc = RISK_COLOR(colors);

  const handleSave = () => {
    if (!form.name || !form.managerName || !form.monthlyRoi || !form.minAmount) {
      Alert.alert('Error', 'Name, manager, ROI, and min amount are required.'); return;
    }
    const payload = { name: form.name, managerName: form.managerName, description: form.description, monthlyRoi: parseFloat(form.monthlyRoi), riskLevel: form.riskLevel, minAmount: parseFloat(form.minAmount), winRate: parseFloat(form.winRate || '0'), isActive: form.isActive };
    if (isEdit) {
      updateM.mutate({ id: strategy!.id, ...payload }, {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Strategy updated.'); },
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'Update failed.'),
      });
    } else {
      createM.mutate(payload, {
        onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Strategy created.'); },
        onError: (e: any) => Alert.alert('Error', e?.message ?? 'Create failed.'),
      });
    }
  };

  const s = cs(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[s.title, { color: colors.foreground }]}>{isEdit ? 'Edit Strategy' : 'New Strategy'}</Text>

            {[
              { label: 'Strategy Name', key: 'name' as const, placeholder: 'e.g. Alpha Growth Fund' },
              { label: 'Manager Name', key: 'managerName' as const, placeholder: 'e.g. James M.' },
              { label: 'Description', key: 'description' as const, placeholder: 'Strategy overview…' },
              { label: 'Monthly ROI (%)', key: 'monthlyRoi' as const, placeholder: '8.5', kb: 'decimal-pad' as const },
              { label: 'Min Amount (USD)', key: 'minAmount' as const, placeholder: '1000', kb: 'decimal-pad' as const },
              { label: 'Win Rate (%)', key: 'winRate' as const, placeholder: '78', kb: 'decimal-pad' as const },
            ].map(f => (
              <View key={f.key} style={s.field}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground} value={form[f.key] as string} onChangeText={set(f.key)} keyboardType={f.kb as any} />
              </View>
            ))}

            {/* Risk Level */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Risk Level</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RISK_LEVELS.map(r => (
                  <TouchableOpacity key={r} onPress={() => set('riskLevel')(r)}
                    style={[s.chip, { backgroundColor: form.riskLevel === r ? rc[r] : colors.background, borderColor: form.riskLevel === r ? rc[r] : colors.border }]}>
                    <Text style={{ color: form.riskLevel === r ? '#fff' : colors.mutedForeground, fontSize: 13, fontWeight: '700' as const }}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.toggleRow}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Active</Text>
              <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.foreground} />
            </View>

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, isBusy && { opacity: 0.6 }]} onPress={handleSave} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[s.saveTxt, { color: colors.primaryForeground }]}>{isEdit ? 'Save Changes' : 'Create Strategy'}</Text>}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={[s.deleteBtn, { borderColor: colors.destructive + '60' }]}
                onPress={() => Alert.alert('Delete Strategy', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteM.mutate(strategy!.id, { onSuccess: () => { onClose(); Alert.alert('Deleted', 'Strategy removed.'); }, onError: (e: any) => Alert.alert('Error', e?.message) }); } }])}>
                <Text style={[s.deleteTxt, { color: colors.destructive }]}>Delete Strategy</Text>
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

export function AdminCopyTrading({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [selected, setSelected] = useState<CopyTradingStrategy | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const { data, isLoading, refetch } = useGetAdminStrategies();
  const strategies = data?.strategies ?? [];
  const rc = RISK_COLOR(colors);
  const s = cs(colors);

  return (
    <>
      <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]}
        onPress={() => { setSelected(null); setIsNew(true); setShowModal(true); }} activeOpacity={0.8}>
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={[s.addBtnTxt, { color: colors.primaryForeground }]}>New Strategy</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={strategies} keyExtractor={st => String(st.id)} scrollEnabled={false}
          renderItem={({ item: st }) => (
            <TouchableOpacity style={[s.stratRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setSelected(st); setIsNew(false); setShowModal(true); }} activeOpacity={0.8}>
              <View style={s.stratTop}>
                <Text style={[s.stratName, { color: colors.foreground }]} numberOfLines={1}>{st.name}</Text>
                <View style={[s.activeDot, { backgroundColor: st.isActive ? colors.success : colors.destructive }]} />
              </View>
              <Text style={[s.stratMgr, { color: colors.mutedForeground }]}>by {st.managerName}</Text>
              <View style={s.stratMeta}>
                <Text style={[s.stratRoi, { color: colors.primary }]}>{st.monthlyRoi}% / mo</Text>
                <View style={[s.riskBadge, { backgroundColor: rc[st.riskLevel] + '20' }]}>
                  <Text style={[s.riskTxt, { color: rc[st.riskLevel] }]}>{st.riskLevel.toUpperCase()}</Text>
                </View>
                <Text style={[s.stratStat, { color: colors.mutedForeground }]}>{st.followersCount} followers</Text>
                <Text style={[s.stratStat, { color: colors.mutedForeground }]}>{st.winRate}% win</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="copy" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No strategies yet</Text>
            </View>
          }
        />
      )}

      <StrategyModal strategy={showModal && !isNew ? selected : null}
        visible={showModal} onClose={() => { setShowModal(false); setIsNew(false); refetch(); }} colors={colors} />
    </>
  );
}

const cs = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 4, marginBottom: 16 },
  addBtnTxt: { fontSize: 14, fontWeight: '700' as const },
  stratRow: { borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 10 },
  stratTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stratName: { fontSize: 15, fontWeight: '700' as const, flex: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  stratMgr: { fontSize: 12, marginBottom: 8 },
  stratMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8 },
  stratRoi: { fontSize: 16, fontWeight: '700' as const },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  riskTxt: { fontSize: 10, fontWeight: '700' as const },
  stratStat: { fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: '90%', paddingHorizontal: 20, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  title: { fontSize: 18, fontWeight: '700' as const, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500' as const, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 4, borderWidth: 1, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saveBtn: { borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  saveTxt: { fontSize: 15, fontWeight: '700' as const },
  deleteBtn: { borderWidth: 1, borderRadius: 4, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  deleteTxt: { fontSize: 14, fontWeight: '700' as const },
  closeBtn: { borderRadius: 4, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  closeTxt: { fontSize: 15, fontWeight: '600' as const },
});
