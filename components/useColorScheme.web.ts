import { useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { ThemePreferenceContext } from '@/context/ThemePreferenceContext';

/**
 * Web: same resolution as native — theme preference + system fallback outside provider.
 */
export function useColorScheme(): 'light' | 'dark' {
  const ctx = useContext(ThemePreferenceContext);
  const systemScheme = useSystemColorScheme();
  if (ctx) {
    return ctx.colorScheme;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}
