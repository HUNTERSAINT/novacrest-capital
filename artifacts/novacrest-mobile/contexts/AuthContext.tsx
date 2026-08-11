import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  referralCode?: string;
  phone?: string;
  country?: string;
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

  // Keep module-level ref in sync
  useEffect(() => {
    _currentToken = token;
  }, [token]);

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
  };

  const register = async (data: RegisterInput) => {
    const result = await apiRegister(data);
    _currentToken = result.token;
    setToken(result.token);
    setUser(result.user);
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
  };

  const logout = async () => {
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
