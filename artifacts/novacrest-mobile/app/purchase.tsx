import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetDashboard, useGetPlans } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || 'novacrestfi.com'}`;
const fmt = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function PurchaseInvestmentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { token } = useAuth();
  const { data: plans, isLoading } = useGetPlans();
  const { data: dashboard } = useGetDashboard();
  const plan = (plans ?? []).find((item) => item.id === Number(planId));
  const [amount, setAmount] = useState('');
  const [compounding, setCompounding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan && !amount) setAmount(String(plan.minAmount));
  }, [plan, amount]);

  const submit = async () => {
    const value = Number(amount);
    if (!token) { setError('Your session expired. Please sign in again.'); return; }
    if (!plan) { setError('This investment plan is unavailable. Refresh and try again.'); return; }
    if (!Number.isFinite(value) || value < plan.minAmount) { setError(`Minimum amount for this plan is ${fmt(plan.minAmount)}.`); return; }
    if (plan.maxAmount && value > plan.maxAmount) { setError(`Maximum amount for this plan is ${fmt(plan.maxAmount)}.`); return; }
    if (value > (dashboard?.balance ?? 0)) { setError('Your available balance is not enough for this investment. Refresh your dashboard or submit a deposit request.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/investments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          planId: plan.id,
          amount: value,
          cryptoType: 'USD',
          walletAddress: 'ACCOUNT_BALANCE',
          compounding,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || `Investment request failed (${response.status})`);
      Alert.alert('Investment activated', 'The backend accepted your investment and debited your account balance. Check Investments and History for the updated record.');
      router.replace('/(tabs)/invest');
    } catch (e: any) {
      setError(e?.message || 'Investment could not be submitted. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={{ color: colors.primary }}>‹ Back to plans</Text></TouchableOpacity>
      <Text style={[s.title, { color: colors.foreground }]}>Start Investment</Text>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : !plan ? (
        <Text style={[s.body, { color: colors.mutedForeground }]}>This plan is not available. Return to Investments and choose an active plan.</Text>
      ) : (
        <>
          <Text style={[s.planName, { color: colors.primary }]}>{plan.name}</Text>
          <Text style={[s.body, { color: colors.mutedForeground }]}>{plan.description}</Text>
          <Text style={[s.label, { color: colors.foreground }]}>Investment amount (USD)</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={String(plan.minAmount)} placeholderTextColor={colors.mutedForeground} style={[s.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
          <Text style={[s.body, { color: colors.mutedForeground, marginTop: 8 }]}>Minimum: {fmt(plan.minAmount)}{plan.maxAmount ? ` · Maximum: ${fmt(plan.maxAmount)}` : ''}</Text>
          <Text style={[s.body, { color: colors.mutedForeground, marginTop: 8 }]}>Available balance: {fmt(dashboard?.balance ?? 0)}</Text>
          <TouchableOpacity onPress={() => setCompounding((v) => !v)} style={[s.compound, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{compounding ? '☑' : '□'} Enable compounding</Text>
            <Text style={[s.body, { color: colors.mutedForeground }]}>If enabled, compounding is recorded with this investment. Confirm the plan terms before proceeding.</Text>
          </TouchableOpacity>
          {!!error && <Text style={[s.error, { color: colors.destructive }]}>{error}</Text>}
          <TouchableOpacity disabled={submitting} onPress={submit} style={[s.button, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}>
            {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: '800' }}>Confirm investment</Text>}
          </TouchableOpacity>
          <Text style={[s.disclaimer, { color: colors.mutedForeground }]}>This action debits your account balance immediately if accepted by the server. Returns are not guaranteed; review the plan terms and risks before confirming.</Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  back: { paddingVertical: 8, alignSelf: 'flex-start' },
  title: { fontFamily: 'serif', fontSize: 28, fontWeight: '700', marginBottom: 14 },
  planName: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 18 },
  input: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  compound: { borderWidth: 1, borderRadius: 2, padding: 14, marginTop: 18, gap: 8 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  button: { minHeight: 50, borderRadius: 2, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 14 },
});
