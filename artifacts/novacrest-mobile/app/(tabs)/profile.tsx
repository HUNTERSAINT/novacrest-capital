import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useGetReferrals, changePassword } from '@workspace/api-client-react';
import { Share } from 'react-native';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: referrals } = useGetReferrals();

  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const s = makeStyles(colors, insets);

  const handleCopyReferral = async () => {
    if (user?.referralCode) {
      await Share.share({ message: `Join Novacrest Capital with my referral code: ${user.referralCode}` });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { setPwError('Both fields required.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    setPwError('');
    setPwLoading(true);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { setPwSuccess(false); setChangingPw(false); }, 2000);
    } catch (e: any) {
      setPwError(e?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + Name */}
      <View style={s.avatarSection}>
        <View style={[s.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
          <Text style={[s.avatarText, { color: colors.primary }]}>
            {(user?.fullName?.[0] ?? 'N').toUpperCase()}
          </Text>
        </View>
        <Text style={s.name}>{user?.fullName}</Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={[s.statusBadge, {
          backgroundColor: user?.status === 'active' ? colors.success + '20' : colors.warning + '20',
          borderColor: user?.status === 'active' ? colors.success + '40' : colors.warning + '40',
        }]}>
          <Text style={[s.statusText, { color: user?.status === 'active' ? colors.success : colors.warning }]}>
            {user?.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Balance', value: fmt(user?.balance ?? 0), color: colors.primary },
          { label: 'Invested', value: fmt(user?.totalInvested ?? 0), color: colors.foreground },
          { label: 'Profit', value: fmt(user?.totalProfit ?? 0), color: colors.success },
        ].map((st, i) => (
          <View key={i} style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Referral Code */}
      <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.infoRow}>
          <Feather name="users" size={18} color={colors.primary} />
          <View style={s.infoContent}>
            <Text style={[s.infoLabel, { color: colors.mutedForeground }]}>Referral Code</Text>
            <Text style={[s.infoValue, { color: colors.primary }]} selectable>{user?.referralCode}</Text>
          </View>
          <TouchableOpacity onPress={handleCopyReferral} activeOpacity={0.7}>
            <View style={[s.copyBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Feather name="copy" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
        {(referrals?.totalReferrals ?? 0) > 0 && (
          <View style={[s.referralStats, { borderTopColor: colors.border }]}>
            <Text style={[s.referralStatText, { color: colors.mutedForeground }]}>
              {referrals?.totalReferrals} referrals · {fmt(referrals?.totalEarned ?? 0)} earned
            </Text>
          </View>
        )}
      </View>

      {/* Menu Items */}
      <View style={[s.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Change Password */}
        <TouchableOpacity
          style={[s.menuRow, { borderBottomColor: colors.border }]}
          onPress={() => { setChangingPw(v => !v); setPwError(''); setPwSuccess(false); }}
          activeOpacity={0.7}
        >
          <Feather name="lock" size={18} color={colors.mutedForeground} />
          <Text style={[s.menuLabel, { color: colors.foreground }]}>Change Password</Text>
          <Feather name={changingPw ? 'chevron-up' : 'chevron-right'} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        {changingPw && (
          <View style={[s.pwForm, { borderBottomColor: colors.border }]}>
            {pwError ? <Text style={[s.pwError, { color: colors.destructive }]}>{pwError}</Text> : null}
            {pwSuccess ? <Text style={[s.pwError, { color: colors.success }]}>Password changed!</Text> : null}
            <TextInput
              style={[s.pwInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Current password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={currentPw}
              onChangeText={setCurrentPw}
            />
            <TextInput
              style={[s.pwInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="New password (8+ characters)"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
            />
            <TouchableOpacity
              style={[s.pwBtn, { backgroundColor: colors.primary }, pwLoading && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={pwLoading}
              activeOpacity={0.8}
            >
              {pwLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[s.pwBtnText, { color: colors.primaryForeground }]}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={s.menuRowLast} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[s.menuLabel, { color: colors.destructive }]}>Sign Out</Text>
          <Feather name="chevron-right" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <Text style={[s.version, { color: colors.mutedForeground }]}>Novacrest Capital v1.0</Text>
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
    avatarSection: { alignItems: 'center', marginBottom: 28 },
    avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    avatarText: { fontSize: 32, fontWeight: '700' as const },
    name: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground, marginBottom: 4 },
    email: { fontSize: 14, color: colors.mutedForeground, marginBottom: 10 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: { flex: 1, borderWidth: 1, borderRadius: 4, padding: 12, alignItems: 'center' },
    statValue: { fontSize: 13, fontWeight: '700' as const, marginBottom: 3 },
    statLabel: { fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.7 },
    infoCard: { borderWidth: 1, borderRadius: 4, padding: 16, marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.7 },
    infoValue: { fontSize: 18, fontWeight: '700' as const, letterSpacing: 1, marginTop: 3 },
    copyBtn: { width: 38, height: 38, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    referralStats: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
    referralStatText: { fontSize: 13 },
    menuCard: { borderWidth: 1, borderRadius: 4, marginBottom: 24, overflow: 'hidden' },
    menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 1 },
    menuRowLast: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' as const },
    pwForm: { padding: 16, gap: 12, borderBottomWidth: 1 },
    pwError: { fontSize: 13, marginBottom: 4 },
    pwInput: { borderWidth: 1, borderRadius: 4, padding: 12, fontSize: 14 },
    pwBtn: { borderRadius: 4, padding: 12, alignItems: 'center' },
    pwBtnText: { fontSize: 14, fontWeight: '700' as const },
    version: { textAlign: 'center', fontSize: 12, marginBottom: 8 },
  });
