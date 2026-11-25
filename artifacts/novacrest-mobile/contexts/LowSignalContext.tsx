import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'novacrest_low_signal_mode';

type LowSignalContextValue = {
  enabled: boolean;
  ready: boolean;
  setEnabled: (value: boolean) => Promise<void>;
  toggle: () => Promise<void>;
};

const LowSignalContext = createContext<LowSignalContextValue | null>(null);

export function LowSignalProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);

  const applyQueryPolicy = useCallback((value: boolean) => {
    const policy = {
      retry: value ? 0 : 1,
      staleTime: value ? 10 * 60 * 1000 : 30 * 1000,
      refetchOnWindowFocus: value ? false : true,
      refetchOnReconnect: value ? false : true,
    };
    queryClient.setDefaultOptions({ queries: policy });
    // Apply the policy to currently-mounted queries too, not just new ones.
    queryClient.getQueryCache().getAll().forEach((query) => {
      query.setOptions({ ...query.options, ...policy });
    });
  }, [queryClient]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        const value = stored === '1';
        setEnabledState(value);
        applyQueryPolicy(value);
      })
      .catch(() => {
        if (mounted) applyQueryPolicy(false);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => { mounted = false; };
  }, [applyQueryPolicy]);

  const setEnabled = useCallback(async (value: boolean) => {
    // Persist the preference before changing the live query policy.
    await AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    setEnabledState(value);
    applyQueryPolicy(value);
  }, [applyQueryPolicy]);

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);
  const value = useMemo(() => ({ enabled, ready, setEnabled, toggle }), [enabled, ready, setEnabled, toggle]);

  return <LowSignalContext.Provider value={value}>{children}</LowSignalContext.Provider>;
}

export function useLowSignal() {
  const value = useContext(LowSignalContext);
  if (!value) throw new Error('useLowSignal must be used inside LowSignalProvider');
  return value;
}
