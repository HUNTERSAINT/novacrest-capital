import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetAdminStats } from '@workspace/api-client-react';

// Section components
import { AdminMembers } from '@/components/admin/AdminMembers';
import { AdminTransactions } from '@/components/admin/AdminTransactions';
import { AdminPlans } from '@/components/admin/AdminPlans';
import { AdminWallets } from '@/components/admin/AdminWallets';
import { AdminKYC } from '@/components/admin/AdminKYC';
import { AdminSignals } from '@/components/admin/AdminSignals';
import { AdminCopyTrading } from '@/components/admin/AdminCopyTrading';
import { AdminChat } from '@/components/admin/AdminChat';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v);

type SectionId = 'members' | 'transactions' | 'plans' | 'wallets' | 'kyc' | 'signals' | 'copy-trade' | 'chat';

const SECTIONS: { id: SectionId; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { id: 'members',      label: 'Members',      icon: 'users' },
  { id: 'transactions', label: 'Transactions', icon: 'activity' },
  { id: 'plans',        label: 'Plans',        icon: 'grid' },
  { id: 'wallets',      label: 'Wallets',      icon: 'credit-card' },
  { id: 'kyc',          label: 'KYC',          icon: 'shield' },
  { id: 'signals',      label: 'Signals',      icon: 'trending-up' },
  { id: 'copy-trade',   label: 'Copy Trade',   icon: 'copy' },
  { id: 'chat',         label: 'Chat',         icon: 'message-circle' },
];

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { section: sectionParam } = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<SectionId>('members');

  // Deep-link from push notification tap — update active section when URL param changes
  useEffect(() => {
    if (sectionParam && SECTIONS.some(s => s.id === sectionParam)) {
      setSection(sectionParam as SectionId);
    }
  }, [sectionParam]);
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();

  const s = makeStyles(colors, insets);

  const renderSection = () => {
    switch (section) {
      case 'members':      return <AdminMembers colors={colors} />;
      case 'transactions': return <AdminTransactions colors={colors} />;
      case 'plans':        return <AdminPlans colors={colors} />;
      case 'wallets':      return <AdminWallets colors={colors} />;
      case 'kyc':          return <AdminKYC colors={colors} />;
      case 'signals':      return <AdminSignals colors={colors} />;
      case 'copy-trade':   return <AdminCopyTrading colors={colors} />;
      case 'chat':         return <AdminChat colors={colors} />;
    }
  };

  // Chat section gets its own layout (has internal scroll/input)
  const isChatSection = section === 'chat';

  return (
    <View style={s.root}>
      {/* Fixed top area — stats + section switcher */}
      <View style={s.topArea}>
        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.pageTitle}>Admin Panel</Text>
          <View style={[s.adminBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <Feather name="shield" size={11} color={colors.primary} />
            <Text style={[s.adminBadgeText, { color: colors.primary }]}>ADMIN</Text>
          </View>
        </View>

        {/* Stats strip */}
        {loadingStats ? (
          <ActivityIndicator color={colors.primary} style={{ marginBottom: 14 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsStrip}>
            {[
              { label: 'Users',    value: String(stats?.totalUsers ?? 0) },
              { label: 'Active',   value: String(stats?.activeUsers ?? 0) },
              { label: 'Invested', value: fmt(stats?.totalInvested ?? 0) },
              { label: 'Paid Out', value: fmt(stats?.totalPaidOut ?? 0) },
              { label: 'Pending',  value: String(stats?.pendingWithdrawals ?? 0) },
            ].map((st, i) => (
              <View key={i} style={[s.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.statValue, { color: colors.foreground }]}>{st.value}</Text>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Section switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sectionStrip}>
          {SECTIONS.map((sec) => {
            const active = section === sec.id;
            return (
              <TouchableOpacity
                key={sec.id}
                style={[s.sectionChip, {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                }]}
                onPress={() => setSection(sec.id)}
                activeOpacity={0.8}
              >
                <Feather name={sec.icon} size={13} color={active ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[s.sectionChipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                  {sec.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section content */}
      {isChatSection ? (
        <View style={s.chatContainer}>
          {renderSection()}
        </View>
      ) : (
        <ScrollView
          style={s.scrollArea}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderSection()}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topArea: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 14,
      paddingHorizontal: 20,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    pageTitle: { fontSize: 24, fontWeight: '700' as const, color: colors.foreground },
    adminBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1,
    },
    adminBadgeText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.8 },
    statsStrip: { gap: 8, paddingBottom: 12 },
    statItem: {
      borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
    },
    statValue: { fontSize: 14, fontWeight: '700' as const },
    statLabel: { fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginTop: 2 },
    sectionStrip: { gap: 7, paddingVertical: 4 },
    sectionChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
    },
    sectionChipText: { fontSize: 12, fontWeight: '600' as const },
    scrollArea: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 90,
    },
    chatContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 90,
    },
  });
