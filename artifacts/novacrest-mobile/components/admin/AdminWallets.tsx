import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, ActivityIndicator, Alert, Switch, Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  useGetAdminWallets, useCreateAdminWallet, useUpdateAdminWallet, useDeleteAdminWallet,
} from '@workspace/api-client-react';
import type { WalletAddress, WalletAddressInput } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const CRYPTOS = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'TRX', 'LTC'];

type WalletForm = { cryptoType: string; network: string; label: string; address: string; isActive: boolean };
const EMPTY: WalletForm = { cryptoType: 'USDT', network: 'TRC20', label: '', address: '', isActive: true };

function WalletModal({ wallet, visible, onClose, colors }: {
  wallet: WalletAddress | null; visible: boolean; onClose: () => void; colors: ReturnType<typeof useColors>;
}) {
  const isEdit = wallet !== null;
  const [form, setForm] = useState<WalletForm>(
    wallet ? { cryptoType: wallet.cryptoType, network: wallet.network, label: wallet.label, address: wallet.address, isActive: wallet.isActive } : EMPTY
  );
  const set = (k: keyof WalletForm) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const createM = useCreateAdminWallet({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Wallet added.'); },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Create failed.'),
    },
  });

  const updateM = useUpdateAdminWallet({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Wallet updated.'); },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Update failed.'),
    },
  });

  const deleteM = useDeleteAdminWallet({
    mutation: {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); Alert.alert('Success', 'Wallet deleted.'); },
      onError: (e: any) => Alert.alert('Error', e?.message ?? 'Delete failed.'),
    },
  });

  const isBusy = createM.isPending || updateM.isPending;

  const handleSave = () => {
    if (!form.address.trim() || !form.network.trim() || !form.label.trim()) {
      Alert.alert('Error', 'All fields required.'); return;
    }
    if (isEdit) {
      updateM.mutate({ id: wallet!.id, data: { cryptoType: form.cryptoType, network: form.network, label: form.label, address: form.address, isActive: form.isActive } });
    } else {
      createM.mutate({ cryptoType: form.cryptoType, network: form.network, label: form.label, address: form.address });
    }
  };

  const s = ws(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <TouchableOpacity style={s.backdropTap} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.handle, { backgroundColor: colors.border }]} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[s.title, { color: colors.foreground }]}>{isEdit ? 'Edit Wallet' : 'Add Wallet'}</Text>

            {/* Crypto type */}
            <Text style={[s.label, { color: colors.mutedForeground }]}>Cryptocurrency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
              {CRYPTOS.map(c => (
                <TouchableOpacity key={c} onPress={() => set('cryptoType')(c)}
                  style={[s.chip, { backgroundColor: form.cryptoType === c ? colors.primary : colors.background, borderColor: form.cryptoType === c ? colors.primary : colors.border }]}>
                  <Text style={{ color: form.cryptoType === c ? colors.primaryForeground : colors.mutedForeground, fontSize: 13, fontWeight: '600' as const }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {[
              { label: 'Network', key: 'network' as const, placeholder: 'e.g. TRC20, ERC20, BEP20' },
              { label: 'Label', key: 'label' as const, placeholder: 'e.g. USDT Deposit Address' },
              { label: 'Wallet Address', key: 'address' as const, placeholder: 'Full wallet address…' },
            ].map(f => (
              <View key={f.key} style={s.field}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput style={[s.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground} value={form[f.key]} onChangeText={set(f.key)} autoCapitalize="none" />
              </View>
            ))}

            {isEdit && (
              <View style={s.toggleRow}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>Active</Text>
                <Switch value={form.isActive} onValueChange={set('isActive')} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.foreground} />
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, isBusy && { opacity: 0.6 }]} onPress={handleSave} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[s.saveTxt, { color: colors.primaryForeground }]}>{isEdit ? 'Save Changes' : 'Add Wallet'}</Text>}
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity style={[s.deleteBtn, { borderColor: colors.destructive + '60' }, deleteM.isPending && { opacity: 0.6 }]}
                onPress={() => Alert.alert('Delete Wallet', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteM.mutate({ id: wallet!.id }) }])}
                disabled={deleteM.isPending}>
                <Text style={[s.deleteTxt, { color: colors.destructive }]}>Delete Wallet</Text>
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

export function AdminWallets({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [selected, setSelected] = useState<WalletAddress | null | 'new'>('new' as any);
  const [showModal, setShowModal] = useState(false);
  const { data: wallets, isLoading, refetch } = useGetAdminWallets();
  const s = ws(colors);

  return (
    <>
      <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => { setSelected(null); setShowModal(true); }} activeOpacity={0.8}>
        <Feather name="plus" size={16} color={colors.primaryForeground} />
        <Text style={[s.addBtnTxt, { color: colors.primaryForeground }]}>Add Wallet</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={wallets ?? []} keyExtractor={w => String(w.id)} scrollEnabled={false}
          renderItem={({ item: w }) => (
            <View style={[s.walletRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[s.cryptoIcon, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.cryptoTxt, { color: colors.primary }]}>{w.cryptoType}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.walletLabel, { color: colors.foreground }]}>{w.label}</Text>
                  <View style={[s.netBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[s.netTxt, { color: colors.mutedForeground }]}>{w.network}</Text>
                  </View>
                </View>
                <Text style={[s.walletAddr, { color: colors.mutedForeground }]} numberOfLines={1}>{w.address}</Text>
                <View style={[s.activeBadge, { backgroundColor: w.isActive ? colors.success + '20' : colors.destructive + '20' }]}>
                  <Text style={[s.activeTxt, { color: w.isActive ? colors.success : colors.destructive }]}>{w.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity onPress={() => Share.share({ message: `${w.cryptoType} (${w.network}): ${w.address}` })}>
                  <Feather name="copy" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setSelected(w); setShowModal(true); }}>
                  <Feather name="edit-2" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="credit-card" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyTxt, { color: colors.mutedForeground }]}>No wallets configured</Text>
            </View>
          }
        />
      )}

      <WalletModal wallet={showModal ? (selected === 'new' ? null : selected as WalletAddress | null) : null}
        visible={showModal} onClose={() => { setShowModal(false); refetch(); }} colors={colors} />
    </>
  );
}

const ws = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 4, marginBottom: 16 },
  addBtnTxt: { fontSize: 14, fontWeight: '700' as const },
  walletRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderWidth: 1, borderRadius: 4, marginBottom: 8, gap: 10 },
  cryptoIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cryptoTxt: { fontSize: 11, fontWeight: '700' as const },
  walletLabel: { fontSize: 13, fontWeight: '600' as const },
  netBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  netTxt: { fontSize: 9, fontWeight: '600' as const },
  walletAddr: { fontSize: 11, marginTop: 2 },
  activeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginTop: 4, alignSelf: 'flex-start' as const },
  activeTxt: { fontSize: 10, fontWeight: '600' as const },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 14 },
  // Modal
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  backdropTap: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, maxHeight: '88%', paddingHorizontal: 20, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  title: { fontSize: 18, fontWeight: '700' as const, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '500' as const, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saveBtn: { borderRadius: 4, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  saveTxt: { fontSize: 15, fontWeight: '700' as const },
  deleteBtn: { borderWidth: 1, borderRadius: 4, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  deleteTxt: { fontSize: 14, fontWeight: '700' as const },
  closeBtn: { borderRadius: 4, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  closeTxt: { fontSize: 15, fontWeight: '600' as const },
});
