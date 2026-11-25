import React from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLowSignal } from '@/contexts/LowSignalContext';

type DashboardStatus = {
  highMarketVolatilityActive?: boolean;
  highMarketVolatilityDeadline?: string | null;
};
type InvestmentStatus = {
  id: number;
  planName?: string;
  slowSignalActive?: boolean;
  endDate?: string;
};

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || 'novacrestfi.com'}`;

async function fetchJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export default function ModeStatusBanner() {
  const { token, user } = useAuth();
  const { enabled, ready, toggle } = useLowSignal();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, refetch } = useQuery({
    queryKey: ['novacrest-mode-status', user?.id],
    enabled: Boolean(token && user?.id),
    queryFn: async () => {
      const [dashboard, investments] = await Promise.all([
        fetchJson<DashboardStatus>('/users/dashboard', token!),
        fetchJson<InvestmentStatus[]>('/investments', token!),
      ]);
      return {
        highMarketVolatilityActive: Boolean(dashboard.highMarketVolatilityActive),
        highMarketVolatilityDeadline: dashboard.highMarketVolatilityDeadline ?? null,
        slowSignalCount: investments.filter((item) => item.slowSignalActive).length,
      };
    },
    staleTime: enabled ? 10 * 60 * 1000 : 30 * 1000,
    refetchInterval: enabled ? false : 120 * 1000,
    retry: enabled ? 0 : 1,
  });

  const deadline = data?.highMarketVolatilityDeadline
    ? new Date(data.highMarketVolatilityDeadline).toLocaleString()
    : 'See your account notice';

  const onToggle = () => {
    const next = !enabled;
    Alert.alert(
      next ? 'Enable Low Signal Mode?' : 'Disable Low Signal Mode?',
      next
        ? 'This reduces automatic refreshes and retries. Information already loaded stays available during temporary connection loss. New account actions still require a connection.'
        : 'Automatic refresh and normal retry behavior will resume.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: next ? 'Enable' : 'Disable', onPress: () => { toggle().catch(() => Alert.alert('Could not save setting', 'Please try again.')); } },
      ],
    );
  };

  if (!token) return null;

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(6, Math.min(insets.top, 18)) }]}>
      <View style={styles.dataSaverRow}>
        <View style={styles.dataSaverTextWrap}>
          <Text style={styles.dataSaverTitle}>Low Signal Mode</Text>
          <Text style={styles.dataSaverSub}>{ready ? (enabled ? 'On · reduced refresh and retries' : 'Off · normal refresh') : 'Loading setting…'}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          disabled={!ready}
          onPress={onToggle}
          style={[styles.toggle, enabled && styles.toggleOn, !ready && styles.disabled]}
        >
          <Text style={styles.toggleText}>{enabled ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      {data?.highMarketVolatilityActive && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>High Market Volatility Notice</Text>
          <Text style={styles.warningText}>An account notice is active. Review the notice and contact support if you need clarification. Deadline shown by your account: {deadline}. This is an account notice, not a live market-price feed.</Text>
        </View>
      )}

      {(data?.slowSignalCount ?? 0) > 0 && (
        <TouchableOpacity style={styles.slowCard} onPress={() => router.push('/(tabs)/invest')} activeOpacity={0.8}>
          <Text style={styles.slowTitle}>Slow Signal Mode · {data!.slowSignalCount} investment(s)</Text>
          <Text style={styles.slowText}>Maturity dates have been adjusted by the backend. Check each investment’s displayed end date.</Text>
          <Text style={styles.slowLink}>View investments →</Text>
        </TouchableOpacity>
      )}

      {data?.highMarketVolatilityActive && (
        <TouchableOpacity style={styles.refreshLink} onPress={() => refetch()}>
          <Text style={styles.refreshText}>Refresh account mode status</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#0b0d12', paddingHorizontal: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#252a34', gap: 8 },
  dataSaverRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dataSaverTextWrap: { flex: 1 },
  dataSaverTitle: { color: '#f4f6fa', fontSize: 12, fontWeight: '700' },
  dataSaverSub: { color: '#9ca5b5', fontSize: 10, marginTop: 2 },
  toggle: { minWidth: 54, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: '#313743', alignItems: 'center' },
  toggleOn: { backgroundColor: '#0f766e' },
  disabled: { opacity: 0.55 },
  toggleText: { color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  warningCard: { backgroundColor: '#3b2511', borderColor: '#b87527', borderWidth: 1, borderRadius: 8, padding: 10 },
  warningTitle: { color: '#ffd08a', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  warningText: { color: '#f4dfc4', fontSize: 11, lineHeight: 16 },
  slowCard: { backgroundColor: '#172b3b', borderColor: '#32607c', borderWidth: 1, borderRadius: 8, padding: 10 },
  slowTitle: { color: '#a9ddff', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  slowText: { color: '#d3e6f1', fontSize: 11, lineHeight: 16 },
  slowLink: { color: '#85d0ff', fontSize: 11, fontWeight: '700', marginTop: 6 },
  refreshLink: { alignSelf: 'flex-start', paddingVertical: 2 },
  refreshText: { color: '#a9ddff', fontSize: 10, textDecorationLine: 'underline' },
});
