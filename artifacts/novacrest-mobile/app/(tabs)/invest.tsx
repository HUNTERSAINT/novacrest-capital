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
import { useColors } from '@/hooks/useColors';
import { useGetInvestments, useGetPlans } from '@workspace/api-client-react';
import type { Investment, Plan } from '@workspace/api-client-react';
import { format } from 'date-fns';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#D9A520',
  platinum: '#b0c4de',
  diamond: '#a8edea',
};

function InvestmentCard({ inv, colors }: { inv: Investment; colors: ReturnType<typeof useColors> }) {
  const progress = Math.min(
    ((Date.now() - new Date(inv.startDate).getTime()) /
      (new Date(inv.endDate).getTime() - new Date(inv.startDate).getTime())) * 100,
    100
  );
  return (
    <View style={[invStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={invStyles.header}>
        <View>
          <Text style={[invStyles.planName, { color: colors.foreground }]} numberOfLines={1}>{inv.planName}</Text>
          <Text style={[invStyles.dates, { color: colors.mutedForeground }]}>
            {format(new Date(inv.startDate), 'MMM d')} – {format(new Date(inv.endDate), 'MMM d, yyyy')}
          </Text>
        </View>
        <View style={[invStyles.statusBadge, {
          backgroundColor: inv.status === 'active' ? colors.success + '20' :
            inv.status === 'completed' ? colors.primary + '20' : colors.destructive + '20'
        }]}>
          <Text style={[invStyles.statusText, {
            color: inv.status === 'active' ? colors.success :
              inv.status === 'completed' ? colors.primary : colors.destructive
          }]}>{inv.status}</Text>
        </View>
      </View>
      <View style={invStyles.statsRow}>
        <View>
          <Text style={[invStyles.statLabel, { color: colors.mutedForeground }]}>Invested</Text>
          <Text style={[invStyles.statValue, { color: colors.foreground }]}>{fmt(inv.amount)}</Text>
        </View>
        <View>
          <Text style={[invStyles.statLabel, { color: colors.mutedForeground }]}>ROI</Text>
          <Text style={[invStyles.statValue, { color: colors.primary }]}>{inv.roiPercent}%</Text>
        </View>
        <View>
          <Text style={[invStyles.statLabel, { color: colors.mutedForeground }]}>Earned</Text>
          <Text style={[invStyles.statValue, { color: colors.success }]}>{fmt(inv.profitEarned)}</Text>
        </View>
      </View>
      {inv.status === 'active' && (
        <View style={[invStyles.progressBg, { backgroundColor: colors.border }]}>
          <View style={[invStyles.progressFill, { width: `${progress}%` as any, backgroundColor: colors.primary }]} />
        </View>
      )}
    </View>
  );
}

const invStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 4, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  planName: { fontSize: 15, fontWeight: '600' as const, maxWidth: 200 },
  dates: { fontSize: 12, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600' as const, textTransform: 'capitalize' as const },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statLabel: { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.7 },
  statValue: { fontSize: 15, fontWeight: '700' as const, marginTop: 3 },
  progressBg: { height: 3, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
});

function PlanCard({ plan, colors }: { plan: Plan; colors: ReturnType<typeof useColors> }) {
  const tierColor = TIER_COLORS[plan.tier] ?? colors.primary;
  return (
    <View style={[planStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={planStyles.top}>
        <View style={[planStyles.tierBadge, { backgroundColor: tierColor + '22', borderColor: tierColor + '44' }]}>
          <Text style={[planStyles.tierText, { color: tierColor }]}>{plan.tier.toUpperCase()}</Text>
        </View>
        <Text style={[planStyles.roi, { color: colors.primary }]}>{plan.roiPercent}% ROI</Text>
      </View>
      <Text style={[planStyles.name, { color: colors.foreground }]}>{plan.name}</Text>
      <Text style={[planStyles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>{plan.description}</Text>
      <View style={[planStyles.divider, { backgroundColor: colors.border }]} />
      <View style={planStyles.meta}>
        <View style={planStyles.metaItem}>
          <Feather name="dollar-sign" size={14} color={colors.mutedForeground} />
          <Text style={[planStyles.metaText, { color: colors.mutedForeground }]}>
            Min {fmt(plan.minAmount)}{plan.maxAmount ? ` – ${fmt(plan.maxAmount)}` : '+'}
          </Text>
        </View>
        <View style={planStyles.metaItem}>
          <Feather name="clock" size={14} color={colors.mutedForeground} />
          <Text style={[planStyles.metaText, { color: colors.mutedForeground }]}>{plan.durationDays} days</Text>
        </View>
      </View>
      <View style={planStyles.features}>
        {plan.features.slice(0, 3).map((f, i) => (
          <View key={i} style={planStyles.featureRow}>
            <Feather name="check" size={13} color={tierColor} />
            <Text style={[planStyles.featureText, { color: colors.mutedForeground }]}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const planStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 4, padding: 18, marginBottom: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  tierText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1 },
  roi: { fontSize: 20, fontWeight: '700' as const },
  name: { fontSize: 17, fontWeight: '700' as const, marginBottom: 6 },
  desc: { fontSize: 13, lineHeight: 19 },
  divider: { height: 1, marginVertical: 14 },
  meta: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13 },
  features: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  featureText: { fontSize: 13 },
});

export default function InvestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    data: investments,
    isLoading: loadingInvestments,
    refetch: refetchInvestments,
    isRefetching,
  } = useGetInvestments();
  const { data: plans, isLoading: loadingPlans, refetch: refetchPlans } = useGetPlans();

  const s = makeStyles(colors, insets);
  const active = (investments ?? []).filter((i) => i.status === 'active');

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => { refetchInvestments(); refetchPlans(); }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={s.pageTitle}>Investments</Text>

      {/* Active Investments */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          My Investments {active.length > 0 && `(${active.length})`}
        </Text>
        {loadingInvestments ? (
          <ActivityIndicator color={colors.primary} />
        ) : active.length === 0 ? (
          <View style={s.empty}>
            <Feather name="trending-up" size={28} color={colors.mutedForeground} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No active investments</Text>
          </View>
        ) : (
          active.map((inv) => <InvestmentCard key={inv.id} inv={inv} colors={colors} />)
        )}
      </View>

      {/* Plans */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Investment Plans</Text>
        {loadingPlans ? (
          <ActivityIndicator color={colors.primary} />
        ) : (plans ?? []).length === 0 ? (
          <View style={s.empty}>
            <Feather name="grid" size={28} color={colors.mutedForeground} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No plans available</Text>
          </View>
        ) : (
          (plans ?? []).filter((p) => p.isActive).map((plan) => (
            <PlanCard key={plan.id} plan={plan} colors={colors} />
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
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
      paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 90,
      paddingHorizontal: 20,
    },
    pageTitle: { fontSize: 26, fontWeight: '700' as const, color: colors.foreground, marginBottom: 24 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.foreground, marginBottom: 14 },
    empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
    emptyText: { fontSize: 14 },
  });
