import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useGetDashboard } from '@workspace/api-client-react';

const ASSETS = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP'];
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || 'novacrestfi.com'}`;

export default function WithdrawScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const { data: dashboard } = useGetDashboard();
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('USDT');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const value = Number(amount);
    if (!token) { setError('Please sign in again.'); return; }
    if (!Number.isFinite(value) || value < 10) { setError('Minimum withdrawal is $10. Enter a valid amount.'); return; }
    if (value > (dashboard?.balance ?? user?.balance ?? 0)) { setError('The amount is greater than the available balance shown in your account. Refresh your dashboard and try again.'); return; }
    if (address.trim().length < 10) { setError('Enter a valid destination wallet address (at least 10 characters).'); return; }
    if (!network.trim()) { setError('Enter the destination network (for example, TRC20 or ERC20).'); return; }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: 'withdrawal',
          amount: value,
          cryptoType: asset,
          walletAddress: address.trim(),
          notes: `Requested network: ${network.trim()}`,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
      Alert.alert('Withdrawal request submitted', 'Your request is pending admin review. This is a request only; no payout has been sent yet.');
      setAmount('');
      setAddress('');
      setNetwork('');
    } catch (e: any) {
      setError(e?.message || 'Withdrawal request could not be submitted. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={{ color: colors.primary }}>‹ Back</Text></TouchableOpacity>
      <Text style={[s.title, { color: colors.foreground }]}>Withdraw</Text>
      <Text style={[s.subtitle, { color: colors.mutedForeground }]}>Submit a withdrawal request to your wallet. The request will remain pending until reviewed.</Text>

      <View style={[s.balance, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.label, { color: colors.mutedForeground }]}>Available balance shown</Text>
        <Text style={[s.balanceValue, { color: colors.primary }]}>${(dashboard?.balance ?? user?.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      </View>

      <Text style={[s.label, { color: colors.foreground }]}>Asset</Text>
      <View style={s.assetRow}>
        {ASSETS.map((item) => <TouchableOpacity key={item} onPress={() => setAsset(item)} style={[s.asset, { backgroundColor: asset === item ? colors.primary : colors.card, borderColor: asset === item ? colors.primary : colors.border }]}><Text style={{ color: asset === item ? colors.primaryForeground : colors.foreground, fontWeight: '700' }}>{item}</Text></TouchableOpacity>)}
      </View>

      <Text style={[s.label, { color: colors.foreground }]}>Amount (USD)</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 100" placeholderTextColor={colors.mutedForeground} style={[s.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
      <Text style={[s.label, { color: colors.foreground }]}>Destination network</Text>
      <TextInput value={network} onChangeText={setNetwork} autoCapitalize="characters" placeholder="e.g. TRC20 / ERC20 / BTC Mainnet" placeholderTextColor={colors.mutedForeground} style={[s.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
      <Text style={[s.label, { color: colors.foreground }]}>Destination wallet address</Text>
      <TextInput value={address} onChangeText={setAddress} autoCapitalize="none" autoCorrect={false} placeholder="Paste your wallet address" placeholderTextColor={colors.mutedForeground} style={[s.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />

      {!!error && <Text style={[s.error, { color: colors.destructive }]}>{error}</Text>}
      <TouchableOpacity disabled={loading} onPress={submit} style={[s.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}>
        {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>Submit withdrawal request</Text>}
      </TouchableOpacity>
      <Text style={[s.disclaimer, { color: colors.mutedForeground }]}>Check the asset and network carefully. Requests are not instant transfers; review and payout depend on the platform’s approved process.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  back: { paddingVertical: 8, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  balance: { borderWidth: 1, borderRadius: 2, padding: 14 },
  balanceValue: { fontSize: 24, fontWeight: '800' },
  assetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  asset: { borderWidth: 1, borderRadius: 2, paddingVertical: 10, paddingHorizontal: 14 },
  input: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  error: { fontSize: 13, marginTop: 12, lineHeight: 18 },
  button: { minHeight: 50, borderRadius: 2, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 14 },
});
