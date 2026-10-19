import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        referralCode: referralCode.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.message || 'Registration failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(colors, insets);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <View style={s.logoWrap}>
        <Text style={s.logoText}>
          Novacrest<Text style={{ color: colors.primary }}>.</Text>
        </Text>
        <Text style={s.logoSub}>Premium Investment Platform</Text>
      </View>

      {/* Card */}
      <View style={s.card}>
        <Text style={s.heading}>Apply for Membership</Text>
        <Text style={s.sub}>Create your investment account</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {[
          { label: 'Full Name *', value: fullName, setter: setFullName, placeholder: 'James Whitfield', type: 'default' as const, secure: false },
          { label: 'Email Address *', value: email, setter: setEmail, placeholder: 'investor@example.com', type: 'email-address' as const, secure: false },
          { label: 'Password *', value: password, setter: setPassword, placeholder: '••••••••', type: 'default' as const, secure: true },
          { label: 'Referral Code (optional)', value: referralCode, setter: setReferralCode, placeholder: 'NOVA123', type: 'default' as const, secure: false },
        ].map((f) => (
          <View key={f.label} style={s.fieldGroup}>
            <Text style={s.label}>{f.label}</Text>
            <TextInput
              style={s.input}
              placeholder={f.placeholder}
              placeholderTextColor={colors.mutedForeground}
              value={f.value}
              onChangeText={f.setter}
              autoCapitalize={f.type === 'email-address' ? 'none' : 'words'}
              keyboardType={f.type}
              secureTextEntry={f.secure}
              autoComplete={f.secure ? 'new-password' : f.type === 'email-address' ? 'email' : 'off'}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={s.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Already a member? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={s.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 24,
      paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24,
    },
    logoWrap: { alignItems: 'center', marginBottom: 32 },
    logoText: { fontSize: 28, fontWeight: '700' as const, color: colors.foreground, letterSpacing: -0.5 },
    logoSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' as const },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 24, borderRadius: colors.radius },
    heading: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground, marginBottom: 6 },
    sub: { fontSize: 14, color: colors.mutedForeground, marginBottom: 24 },
    errorBox: { backgroundColor: colors.destructive + '22', borderWidth: 1, borderColor: colors.destructive + '44', borderRadius: colors.radius, padding: 12, marginBottom: 16 },
    errorText: { color: colors.destructive, fontSize: 13 },
    fieldGroup: { marginBottom: 16 },
    label: { fontSize: 13, color: colors.mutedForeground, marginBottom: 6, fontWeight: '500' as const },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, padding: 14, fontSize: 15, color: colors.foreground },
    btn: { backgroundColor: colors.primary, paddingVertical: 15, borderRadius: colors.radius, alignItems: 'center', marginTop: 8 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: '700' as const },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: colors.mutedForeground, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600' as const },
  });
