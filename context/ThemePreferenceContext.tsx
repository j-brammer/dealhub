import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

const STORAGE_KEY = 'dealhub_theme_preference_v1';

export type ThemePreference = 'light' | 'dark' | 'system';

export type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
  hydrated: boolean;
  /** Resolved appearance for UI and `useColorScheme()`. */
  colorScheme: 'light' | 'dark';
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

function parsePreference(raw: string | null): ThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) setPreferenceState(parsePreference(raw));
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === 'system') {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      /* ignore persistence errors */
    }
  }, []);

  const colorScheme = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference,
      setPreference,
      hydrated,
      colorScheme,
    }),
    [preference, setPreference, hydrated, colorScheme]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemePreferenceContextValue {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return ctx;
}

export { ThemePreferenceContext };
