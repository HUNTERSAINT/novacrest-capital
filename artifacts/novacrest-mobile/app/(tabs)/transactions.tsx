import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetTransactions } from '@workspace/api-client-react';
import type { Transaction } from '@workspace/api-client-react';
import { format } from 'date-fns';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'profit' | 'bonus';

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Deposits', value: 'deposit' },
  { label: 'Withdrawals', value: 'withdrawal' },
  { label: 'Profits', value: 'profit' },
  { label: 'Bonus', value: 'bonus' },
];

const TX_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  deposit: 'arrow-down-circle',
  withdrawal: 'arrow-up-circle',
  profit: 'trending-up',
  bonus: 'gift',
  referral: 'users',
};

function TxItem({ tx, colors }: { tx: Transaction; colors: ReturnType<typeof useColors> }) {
  const isCredit = ['deposit', 'profit', 'bonus', 'referral'].includes(tx.type);
  return (
    <View style={[txStyles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[txStyles.iconWrap, {
        backgroundColor: isCredit ? colors.success + '20' : colors.destructive + '20'
      }]}>
        <Feather
          name={TX_ICON[tx.type] ?? 'circle'}
          size={18}
          color={isCredit ? colors.success : colors.destructive}
        />
      </View>
      <View style={txStyles.info}>
        <Text style={[txStyles.type, { color: colors.foreground }]}>
          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
        </Text>
        {tx.notes ? (
          <Text style={[txStyles.notes, { color: colors.mutedForeground }]} numberOfLines={1}>{tx.notes}</Text>
        ) : null}
        <Text style={[txStyles.date, { color: colors.mutedForeground }]}>
          {format(new Date(tx.createdAt), 'MMM d, yyyy · h:mm a')}
        </Text>
      </View>
      <View style={txStyles.right}>
        <Text style={[txStyles.amount, { color: isCredit ? colors.success : colors.destructive }]}>
          {isCredit ? '+' : '-'}{fmt(tx.amount)}
        </Text>
        <View style={[txStyles.badge, {
          backgroundColor: tx.status === 'completed' ? colors.success + '20' :
            tx.status === 'pending' ? colors.warning + '20' : colors.destructive + '20'
        }]}>
          <Text style={[txStyles.badgeText, {
            color: tx.status === 'completed' ? colors.success :
              tx.status === 'pending' ? colors.warning : colors.destructive
          }]}>{tx.status}</Text>
        </View>
      </View>
    </View>
  );
}

const txStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: 4, marginBottom: 10 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1 },
  type: { fontSize: 14, fontWeight: '600' as const },
  notes: { fontSize: 12, marginTop: 2 },
  date: { fontSize: 11, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700' as const },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  badgeText: { fontSize: 10, fontWeight: '600' as const, textTransform: 'capitalize' as const },
});

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: txs, isLoading, refetch, isRefetching } = useGetTransactions();

  const filtered = filter === 'all' ? (txs ?? []) : (txs ?? []).filter((t) => t.type === filter);

  const s = makeStyles(colors, insets);

  return (
    <View style={s.root}>
      <View style={s.topArea}>
        <Text style={s.pageTitle}>History</Text>

        {/* Filter chips */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersWrap}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[
                s.chip,
                {
                  backgroundColor: filter === f.value ? colors.primary : colors.card,
                  borderColor: filter === f.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, { color: filter === f.value ? colors.primaryForeground : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Feather name="inbox" size={36} color={colors.mutedForeground} />
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No transactions found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => <TxItem tx={item} colors={colors} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topArea: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 16,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
      paddingBottom: 12,
    },
    pageTitle: { fontSize: 26, fontWeight: '700' as const, color: colors.foreground, marginBottom: 16 },
    filtersWrap: { gap: 8, paddingBottom: 4 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    chipText: { fontSize: 13, fontWeight: '600' as const },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 90,
    },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontSize: 15 },
  });
