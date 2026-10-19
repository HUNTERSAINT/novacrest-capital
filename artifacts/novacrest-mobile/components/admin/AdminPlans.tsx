import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetPlans, useCreatePlan, useUpdatePlan, useDeletePlan, PlanInputTier } from '@workspace/api-client-react';
import type { Plan } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const TIERS = Object.values(PlanInputTier) as string[];
const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#D9A520', platinum: '#b0c4de', diamond: '#a8edea',
};

type EditState = { name: string; description: string; minAmount: string; maxAmount: string; roiPercent: string; durationDays: string; tier: string; features: string; isActive: boolean };
const EMPTY: EditState = { name: '', description: '', minAmount: '', maxAmount: '', roiPercent: '', durationDays: '', tier: 'gold', features: '', isActive: true };

function PlanModal({ plan, visible, onClose, colors }: {
  plan: Plan | null; visible: boolean; onClose: () => void; colors: ReturnType<typeof useColors>;
}) {
  const isEdit = plan !== null;
  const [form, setForm] = useState<EditState>(
    plan ? { name: plan.name, description: plan.description, minAmount: String(plan.minAmount), maxAmount: String(plan.maxAmount ?? ''), roiPercent: String(plan.roiPercent), durationDays: String(plan.durationDays), tier: plan.tier, features: plan.features.join(', '), isActive: plan.isActive } : EMPTY
  );

  const createM = useCreatePlan({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Plan created.'); },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Create failed.'),
    },
  });

  const updateM = useUpdatePlan({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Plan updated.'); },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Update failed.'),
    },
  });

  const deleteM = useDeletePlan({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Plan deleted.'); },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Delete failed.'),
    },
  });

  const set = (k: keyof EditState) => (v: any) => setForm(f => ({ ...f, [k]: v }));
  const isBusy = createM.isPending || updateM.isPending;

  const handleSave = () => {
    if (!form.name || !form.roiPercent || !form.durationDays || !form.minAmount) {
      Alert.alert('Error', 'Name, ROI, duration, and min amount are required.'); return;
    }
    const payload = {
      name: form.name, description: form.description,
      minAmount: parseFloat(form.minAmount), maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : undefined,
      roiPercent: parseFloat(form.roiPercent), durationDays: parseInt(form.durationDays),
      tier: form.tier as any,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
    };
    if (isEdit) {
      updateM.mutate({ id: plan!.id, data: { ...payload, isActive: form.isActive } });
    } else {
      createM.mutate({ data: payload });
    }
  };

  const s = ps(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[s.title, { color: colors.foreground }]}>{isEdit ? 'Edit Plan' : 'Create Plan'}</Text>

            {[
              { label: 'Plan Name', key: 'name' as const, placeholder: 'e.g. Gold Monthly' },
              { label: 'Description', key: 'description' as const, placeholder: 'Plan description…' },
              { label: 'Min Amount (USD)', key: 'minAmount' as const, placeholder: '500', kb: 'decimal-pad' as const },
              { label: 'Max Amount (optional)', key: 'maxAmount' as const, placeholder: '10000', kb: 'decimal-pad' as const },
              { label: 'ROI %', key: 'roiPercent' as const, placeholder: '10', kb: 'decimal-pad' as const },
              { label: 'Duration (days)', key: 'durationDays' as const, placeholder: '30', kb: 'number-pad' as const },
              { label: 'Features (comma separated)', key: 'features' as const, placeholder: 'Priority support, Daily payouts' },
            ].map(f => (
              <View key={f.key} style={s.field}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground}
                  value={form[f.key] as string} onChangeText={set(f.key)} keyboardType={f.kb as any} />
              </View>
            ))}

            {/* Tier */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.mutedForeground }]}>Tier</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {TIERS.map(t => {
                  const tc = TIER_COLORS[t] ?? colors.primary;
                  return (
                    <TouchableOpacity key={t} onPress={() => set('tier')(t)}
                      style={[s.tierChip, { backgroundColor: form.tier === t ? tc + '30' : colors.background, borderColor: form.tier === t ? tc : colors.border }]}>
                      <Text style={[s.tierTxt, { color: form.tier === t ? tc : colors.mutedForeground }]}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {isEdit && (
              <View style={s.toggleRow}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>Active</Text>
                <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.foreground} />
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, isBusy && { opacity: 0.6 }]} onPress={handleSave} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[s.saveTxt, { color: colors.primaryForeground }]}>{isEdit ? 'Save Changes' : 'Create Plan'}</Text>}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={[s.deleteBtn, { borderColor: colors.destructive + '60' }, deleteM.isPending && { opacity: 0.6 }]}
                onPress={() => Alert.alert('Delete Plan', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteM.mutate({ id: plan!.id }) }])}
                disabled={deleteM.isPending}>
                {deleteM.isPending ? <ActivityIndicator color={colors.destructive} /> : <Text style={[s.deleteTxt, { color: colors.destructive }]}>Delete Plan</Text>}
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

export function AdminPlans({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [modalPlan, setModalPlan] = useState<Plan | null | 'new'>('new' as any);
  const [showModal, setShowModal] = useState(false);
  const { data: plans, isLoading, refetch } = useGetPlans();
  const s = ps(colors);

  return (
    <>
      <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setModalPlan(null); setShowModal(true); }} activeOpacity={0.8}>
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={[s.addTxt, { color: colors.primaryForeground }]}>Create Plan</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={plans ?? []} keyExtractor={p => String(p.id)} scrollEnabled={false}
          renderItem={({ item: p }) => {
            const tc = TIER_COLORS[p.tier] ?? colors.primary;
            return (
              <TouchableOpacity style={[s.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { setModalPlan(p); setShowModal(true); }} activeOpacity={0.8}>
                <View style={s.planTop}>
                  <View style={[s.tierBadge, { backgroundColor: tc + '20', borderColor: tc + '40' }]}>
                    <Text style={[s.tierBadgeTxt, { color: tc }]}>{p.tier.toUpperCase()}</Text>
                  </View>
                  <Text style={[s.roi, { color: colors.primary }]}>{p.roiPercent}% ROI</Text>
                  <View style={[s.activeDot, { backgroundColor: p.isActive ? colors.success : colors.destructive }]} />
                </View>
                <Text style={[s.planName, { color: colors.foreground }]}>{p.name}</Text>
                <Text style={[s.planMeta, { color: colors.mutedForeground }]}>
                  Min ${p.minAmount.toLocaleString()} · {p.durationDays}d
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="grid" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No plans yet</Text>
            </View>
          }
        />
      )}

      <PlanModal plan={showModal ? (modalPlan === 'new' ? null : modalPlan as Plan | null) : null} visible={showModal}
        onClose={() => { setShowModal(false); refetch(); }} colors={colors} />
    </>
  );
}

const ps = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 4, marginBottom: 16 },
  addTxt: { fontSize: 14, fontWeight: '700' as const },
  planCard: { borderWidth: 1, borderRadius: 4, padding: 14, marginBottom: 10 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  tierBadgeTxt: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  roi: { fontSize: 16, fontWeight: '700' as const, marginLeft: 'auto' as const },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  planName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 3 },
  planMeta: { fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
  // Modal
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: '90%', paddingHorizontal: 20, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  title: { fontSize: 18, fontWeight: '700' as const, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500' as const, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14 },
  tierChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  tierTxt: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.5 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saveBtn: { borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  saveTxt: { fontSize: 15, fontWeight: '700' as const },
  deleteBtn: { borderWidth: 1, borderRadius: 4, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  deleteTxt: { fontSize: 14, fontWeight: '700' as const },
  closeBtn: { borderRadius: 4, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  closeTxt: { fontSize: 15, fontWeight: '600' as const },
});
