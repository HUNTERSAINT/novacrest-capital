import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useGetDashboard } from '@workspace/api-client-react';
import type { Transaction } from '@workspace/api-client-react';
import { format } from 'date-fns';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

function TxRow({ tx, colors }: { tx: Transaction; colors: ReturnType<typeof useColors> }) {
  const isCredit = ['deposit', 'profit', 'bonus', 'referral'].includes(tx.type);
  const typeIcon: Record<string, React.ComponentProps<typeof Feather>['name']> = {
    deposit: 'arrow-down-circle',
    withdrawal: 'arrow-up-circle',
    profit: 'trending-up',
    bonus: 'gift',
    referral: 'users',
  };
  return (
    <View style={[rowStyles.row, { borderColor: colors.border }]}>
      <View style={[rowStyles.iconWrap, { backgroundColor: isCredit ? colors.success + '20' : colors.destructive + '20' }]}>
        <Feather
          name={typeIcon[tx.type] ?? 'circle'}
          size={18}
          color={isCredit ? colors.success : colors.destructive}
        />
      </View>
      <View style={rowStyles.info}>
        <Text style={[rowStyles.type, { color: colors.foreground }]} numberOfLines={1}>
          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
        </Text>
        <Text style={[rowStyles.date, { color: colors.mutedForeground }]}>
          {format(new Date(tx.createdAt), 'MMM d, yyyy')}
        </Text>
      </View>
      <View style={rowStyles.amountWrap}>
        <Text style={[rowStyles.amount, { color: isCredit ? colors.success : colors.destructive }]}>
          {isCredit ? '+' : '-'}{fmt(tx.amount)}
        </Text>
        <View style={[rowStyles.statusBadge, {
          backgroundColor: tx.status === 'completed' ? colors.success + '20' :
            tx.status === 'pending' ? colors.warning + '20' : colors.destructive + '20'
        }]}>
          <Text style={[rowStyles.statusText, {
            color: tx.status === 'completed' ? colors.success :
              tx.status === 'pending' ? colors.warning : colors.destructive
          }]}>{tx.status}</Text>
        </View>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1 },
  type: { fontSize: 14, fontWeight: '500' as const },
  date: { fontSize: 12, marginTop: 2 },
  amountWrap: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700' as const },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 3 },
  statusText: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: dash, isLoading, refetch, isRefetching } = useGetDashboard();

  const s = makeStyles(colors, insets);

  const quickActions = [
    { label: 'Deposit', icon: 'arrow-down-circle' as const, onPress: () => {} },
    { label: 'Withdraw', icon: 'arrow-up-circle' as const, onPress: () => {} },
    { label: 'Invest', icon: 'trending-up' as const, onPress: () => router.push('/(tabs)/invest') },
    { label: 'Referrals', icon: 'users' as const, onPress: () => router.push('/(tabs)/profile') },
  ];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good day,</Text>
          <Text style={s.name} numberOfLines={1}>
            {user?.fullName?.split(' ')[0] ?? 'Investor'}
          </Text>
        </View>
        <View style={s.avatarWrap}>
          <Text style={s.avatarText}>
            {(user?.fullName?.[0] ?? 'N').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Balance Card */}
      <LinearGradient
        colors={['#1a1608', '#111008', colors.card]}
        style={s.balanceCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[s.balanceBorder, { borderColor: colors.primary + '30' }]}>
          <Text style={s.balanceLabel}>Total Balance</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <Text style={s.balanceValue}>{fmt(dash?.balance ?? 0)}</Text>
          )}
          <View style={s.balanceRow}>
            <View style={s.balanceStat}>
              <Text style={s.balanceStatLabel}>Total Profit</Text>
              <Text style={[s.balanceStatValue, { color: colors.success }]}>
                {fmt(dash?.totalProfit ?? 0)}
              </Text>
            </View>
            <View style={[s.balanceDivider, { backgroundColor: colors.border }]} />
            <View style={s.balanceStat}>
              <Text style={s.balanceStatLabel}>Total Invested</Text>
              <Text style={s.balanceStatValue}>{fmt(dash?.totalInvested ?? 0)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View style={s.statsRow}>
        {[
          { label: 'Active', value: String(dash?.activeInvestments ?? 0), icon: 'activity' as const, color: colors.primary },
          { label: 'Pending', value: String(dash?.pendingWithdrawals ?? 0), icon: 'clock' as const, color: colors.warning },
        ].map((st, i) => (
          <View key={i} style={[s.statCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name={st.icon} size={18} color={st.color} />
            <Text style={[s.statValue, { color: colors.foreground }]}>{st.value}</Text>
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={s.actionsRow}>
        {quickActions.map((a, i) => (
          <TouchableOpacity key={i} style={s.actionItem} onPress={a.onPress} activeOpacity={0.7}>
            <View style={[s.actionIcon, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' }]}>
              <Feather name={a.icon} size={22} color={colors.primary} />
            </View>
            <Text style={[s.actionLabel, { color: colors.mutedForeground }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Transactions */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
            <Text style={[s.sectionLink, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (dash?.recentTransactions ?? []).length === 0 ? (
          <View style={s.empty}>
            <Feather name="inbox" size={32} color={colors.mutedForeground} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No recent transactions</Text>
          </View>
        ) : (
          (dash?.recentTransactions ?? []).slice(0, 5).map((tx) => (
            <TxRow key={tx.id} tx={tx} colors={colors} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 12,
      paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 90,
      paddingHorizontal: 20,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    greeting: { fontSize: 13, color: colors.mutedForeground, fontWeight: '500' as const },
    name: { fontSize: 22, fontWeight: '700' as const, color: colors.foreground, marginTop: 2 },
    avatarWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary + '25', borderWidth: 1.5, borderColor: colors.primary + '50', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 17, fontWeight: '700' as const, color: colors.primary },
    balanceCard: { borderRadius: 4, marginBottom: 16, overflow: 'hidden' },
    balanceBorder: { borderWidth: 1, borderRadius: 4, padding: 24 },
    balanceLabel: { fontSize: 12, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 8 },
    balanceValue: { fontSize: 42, fontWeight: '700' as const, color: colors.primary, letterSpacing: -1 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
    balanceStat: { flex: 1 },
    balanceStatLabel: { fontSize: 11, color: colors.mutedForeground, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
    balanceStatValue: { fontSize: 16, fontWeight: '600' as const, color: colors.foreground, marginTop: 3 },
    balanceDivider: { width: 1, height: 32, marginHorizontal: 16 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard: { flex: 1, borderWidth: 1, borderRadius: 4, padding: 16, alignItems: 'center', gap: 6 },
    statValue: { fontSize: 22, fontWeight: '700' as const },
    statLabel: { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
    actionItem: { alignItems: 'center', gap: 8 },
    actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    actionLabel: { fontSize: 11, fontWeight: '500' as const },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.foreground },
    sectionLink: { fontSize: 13, fontWeight: '600' as const },
    empty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    emptyText: { fontSize: 14 },
  });
