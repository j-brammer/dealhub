import { useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { ThemePreferenceContext } from '@/context/ThemePreferenceContext';

/**
 * Effective `light` | `dark` for the app (user preference or system).
 * Prefer importing from here instead of `react-native` so screens respect Account appearance.
 */
export function useColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemePreferenceContext);
  const systemScheme = useSystemColorScheme();
  if (ctx) {
    return ctx.colorScheme;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}
