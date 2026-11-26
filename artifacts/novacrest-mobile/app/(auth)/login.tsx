import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const authenticatedUser = await login({ email: email.trim().toLowerCase(), password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(authenticatedUser.role === 'admin' ? '/(tabs)/admin' : '/(tabs)');
    } catch (e: any) {
      const msg = e?.message || 'Invalid email or password.';
      setError(msg.includes('Invalid') ? 'Invalid email or password.' : msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <Text style={s.logoText}>
            Novacrest<Text style={{ color: colors.primary }}>.</Text>
          </Text>
          <Text style={s.logoSub}>CAPITAL</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.heading}>Member Access</Text>
          <Text style={s.sub}>Enter your credentials to access your portfolio.</Text>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <View style={s.fieldGroup}>
            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="investor@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.btnText}>Enter Vault</Text>
            )}
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={s.footerLink}>Apply for membership</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      alignItems: 'center',
      paddingTop: (Platform.OS === 'web' ? 67 : insets.top) + 32,
      paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 32,
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoText: {
      fontFamily: 'serif',
      fontSize: 30,
      fontWeight: '700' as const,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    logoSub: {
      fontSize: 10,
      color: colors.mutedForeground,
      marginTop: 3,
      letterSpacing: 4,
      textTransform: 'uppercase' as const,
    },
    card: {
      backgroundColor: '#0e0e11e6',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      padding: 24,
      borderRadius: 2,
      width: '100%',
      maxWidth: 448,
    },
    heading: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: 6,
    },
    sub: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 24,
    },
    errorBox: {
      backgroundColor: colors.destructive + '22',
      borderWidth: 1,
      borderColor: colors.destructive + '44',
      borderRadius: colors.radius,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 6,
      fontWeight: '500' as const,
    },
    input: {
      backgroundColor: 'rgba(9,9,11,0.5)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      borderRadius: 2,
      padding: 14,
      fontSize: 15,
      color: colors.foreground,
    },
    btn: {
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: 'rgba(217,165,32,0.5)',
      alignItems: 'center',
      marginTop: 8,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: '700' as const,
      letterSpacing: 0.3,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
    footerText: {
      color: colors.mutedForeground,
      fontSize: 14,
    },
    footerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600' as const,
    },
  });
