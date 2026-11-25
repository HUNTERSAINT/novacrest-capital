import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

type Wallet = { id: number; cryptoType: string; network: string; label: string; address: string };
type Proof = { uri: string; name: string; size?: number; mimeType: string };

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || 'novacrestfi.com'}`;

async function api<T>(path: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  return data as T;
}

export default function DepositScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [proof, setProof] = useState<Proof | null>(null);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Wallet[]>('/wallets', '').then((items) => {
      setWallets(items);
      if (items.length) setWalletId(items[0].id);
    }).catch((e) => setError(e.message || 'Unable to load deposit wallets.'))
      .finally(() => setLoadingWallets(false));
  }, []);

  const selected = useMemo(() => wallets.find((w) => w.id === walletId) ?? null, [wallets, walletId]);

  const chooseProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setProof({
      uri: asset.uri,
      name: asset.fileName || `deposit-proof-${Date.now()}.jpg`,
      size: asset.fileSize,
      mimeType: asset.mimeType || 'image/jpeg',
    });
    setError('');
  };

  const submit = async () => {
    const value = Number(amount);
    if (!token) { setError('Please sign in again.'); return; }
    if (!Number.isFinite(value) || value <= 0) { setError('Enter a valid deposit amount greater than zero.'); return; }
    if (!selected) { setError('Choose a deposit network/wallet first.'); return; }
    if (!proof) { setError('Choose a transaction screenshot or payment receipt.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const fileResponse = await fetch(proof.uri);
      const blob = await fileResponse.blob();
      const contentType = proof.mimeType || blob.type || 'image/jpeg';
      const upload = await api<{ uploadURL: string; objectPath: string }>('/storage/uploads/request-url', token, 'POST', {
        name: proof.name, size: proof.size || blob.size, contentType,
      });
      const put = await fetch(upload.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!put.ok) throw new Error(`Receipt upload failed (${put.status}). Please choose the image again and retry.`);
      await api('/transactions', token, 'POST', {
        type: 'deposit',
        amount: value,
        cryptoType: selected.cryptoType,
        walletAddress: selected.address,
        txHash: txHash.trim() || undefined,
        proofUrl: upload.objectPath,
      });
      Alert.alert('Deposit request submitted', 'Your deposit request is pending admin review. Your balance will update only after approval.');
      setAmount('');
      setTxHash('');
      setProof(null);
    } catch (e: any) {
      setError(e?.message || 'Deposit request could not be submitted. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={{ color: colors.primary }}>‹ Back</Text></TouchableOpacity>
      <Text style={[s.title, { color: colors.foreground }]}>Deposit</Text>
      <Text style={[s.subtitle, { color: colors.mutedForeground }]}>Send funds to an active wallet and submit the transaction receipt for review.</Text>

      <Text style={[s.label, { color: colors.foreground }]}>Deposit network</Text>
      {loadingWallets ? <ActivityIndicator color={colors.primary} /> : wallets.length === 0 ? (
        <Text style={[s.help, { color: colors.warning }]}>No deposit wallet is configured right now. Contact support before sending funds.</Text>
      ) : wallets.map((wallet) => (
        <TouchableOpacity key={wallet.id} onPress={() => setWalletId(wallet.id)} style={[s.wallet, { borderColor: walletId === wallet.id ? colors.primary : colors.border, backgroundColor: colors.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.walletTitle, { color: colors.foreground }]}>{wallet.label || wallet.cryptoType}</Text>
            <Text style={[s.help, { color: colors.mutedForeground }]}>{wallet.cryptoType}{wallet.network ? ` · ${wallet.network}` : ''}</Text>
          </View>
          <Text style={{ color: walletId === wallet.id ? colors.primary : colors.mutedForeground }}>{walletId === wallet.id ? '●' : '○'}</Text>
        </TouchableOpacity>
      ))}

      {selected && (
        <View style={[s.addressBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.label, { color: colors.mutedForeground }]}>Deposit address</Text>
          <Text selectable style={[s.address, { color: colors.foreground }]}>{selected.address}</Text>
          <TouchableOpacity onPress={() => Share.share({ message: selected.address })} style={s.copy}><Text style={{ color: colors.primary, fontWeight: '700' }}>Share / Copy address</Text></TouchableOpacity>
        </View>
      )}

      <Text style={[s.label, { color: colors.foreground }]}>Amount (USD)</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 250" placeholderTextColor={colors.mutedForeground} style={[s.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
      <Text style={[s.label, { color: colors.foreground }]}>Transaction hash (optional)</Text>
      <TextInput value={txHash} onChangeText={setTxHash} autoCapitalize="none" placeholder="Paste transaction ID" placeholderTextColor={colors.mutedForeground} style={[s.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />

      <TouchableOpacity onPress={chooseProof} style={[s.proof, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{proof ? 'Receipt selected ✓' : 'Select transaction screenshot / receipt'}</Text>
        <Text style={[s.help, { color: colors.mutedForeground }]}>{proof?.name || 'Image required before submitting'}</Text>
      </TouchableOpacity>

      {!!error && <Text style={[s.error, { color: colors.destructive }]}>{error}</Text>}
      <TouchableOpacity disabled={submitting || loadingWallets || wallets.length === 0} onPress={submit} style={[s.button, { backgroundColor: colors.primary }, (submitting || wallets.length === 0) && { opacity: 0.6 }]}>
        {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>Submit deposit request</Text>}
      </TouchableOpacity>
      <Text style={[s.disclaimer, { color: colors.mutedForeground }]}>Never send funds until you verify the selected address and network. This request does not credit your balance automatically.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  back: { paddingVertical: 8, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  help: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  wallet: { borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  walletTitle: { fontSize: 14, fontWeight: '700' },
  addressBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 10 },
  address: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  copy: { alignSelf: 'flex-start', paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  proof: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 18 },
  error: { fontSize: 13, marginTop: 12, lineHeight: 18 },
  button: { minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 14 },
});
