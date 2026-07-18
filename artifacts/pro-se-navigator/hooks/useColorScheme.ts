import { useTheme } from '@/contexts/ThemeContext';

export type AppColorScheme = 'light' | 'dark';

/**
 * The active color scheme, resolved from the user's theme preference
 * (Light / Dark / System) held in ThemeContext. "Counsel Dark" is the
 * default when no preference has been chosen yet.
 */
export function useColorScheme(): AppColorScheme {
  return useTheme().scheme;
}
