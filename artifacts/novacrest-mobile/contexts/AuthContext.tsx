import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  setAuthTokenGetter,
  login as apiLogin,
  register as apiRegister,
  getMe,
} from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';

const TOKEN_KEY = 'novacrest_token';

// Module-level ref so the getter always returns the current token
// without needing React state closures
let _currentToken: string | null = null;
setAuthTokenGetter(() => _currentToken);

// ─── Push notification helpers ─────────────────────────────────────────────────

/** Request permission and get the Expo push token. Returns null on any failure
 *  (web, simulator, permission denied, not configured in EAS). */
async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
    }
    if (status !== 'granted') return null;
    const result = await Notifications.getExpoPushTokenAsync();
    return result.data;
  } catch {
    return null;
  }
}

const API_BASE = () => `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function savePushToken(pushToken: string, authToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE()}/api/push-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
    });
  } catch {
    // Non-critical
  }
}

async function deletePushToken(pushToken: string, authToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE()}/api/push-tokens`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: pushToken }),
    });
  } catch {
    // Non-critical
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────

export interface LoginInput { email: string; password: string }
export interface RegisterInput {
  email: string; password: string; fullName: string;
  referralCode?: string; phone?: string; country?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Store current push token so we can clean it up on logout
  const pushTokenRef = useRef<string | null>(null);

  // Keep module-level ref in sync
  useEffect(() => {
    _currentToken = token;
  }, [token]);

  /** Register for push notifications (admins only) and save to backend */
  const setupPushNotifications = async (authToken: string, role?: string) => {
    if (role !== 'admin') return;
    const pt = await getPushToken();
    if (!pt) return;
    pushTokenRef.current = pt;
    await savePushToken(pt, authToken);
  };

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          _currentToken = stored;
          setToken(stored);
          const me = await getMe();
          setUser(me);
          // Re-register push token on app restart (non-blocking)
          setupPushNotifications(stored, me.role).catch(() => {});
        }
      } catch {
        _currentToken = null;
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (data: LoginInput) => {
    const result = await apiLogin(data);
    _currentToken = result.token;
    setToken(result.token);
    setUser(result.user);
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    // Register push token for admins (non-blocking)
    setupPushNotifications(result.token, result.user.role).catch(() => {});
  };

  const register = async (data: RegisterInput) => {
    const result = await apiRegister(data);
    _currentToken = result.token;
    setToken(result.token);
    setUser(result.user);
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    // New accounts start as 'user', so no push registration needed
  };

  const logout = async () => {
    // Unregister push token before clearing credentials
    if (token && pushTokenRef.current) {
      await deletePushToken(pushTokenRef.current, token);
      pushTokenRef.current = null;
    }
    _currentToken = null;
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
