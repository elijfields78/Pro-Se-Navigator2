import colors from '@/constants/colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Returns the design tokens for the active color scheme plus
 * scheme-independent values like `radius`.
 *
 * The app currently runs "Counsel Dark" everywhere (useColorScheme returns
 * 'dark' for v1); the light palette remains available for a future toggle.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
