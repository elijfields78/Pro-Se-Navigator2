import { useColorScheme as useSystemColorScheme } from 'react-native';

export type AppColorScheme = 'light' | 'dark';

/**
 * App color scheme. "Counsel Dark" is the product's art direction, so dark is
 * the default regardless of system preference for v1 — the system value is
 * still read so a future settings toggle can honor it without rewiring
 * call sites.
 */
export function useColorScheme(): AppColorScheme {
  // Read (and subscribe to) the system preference so this hook re-renders on
  // change once a toggle exists; for now the app always renders dark.
  useSystemColorScheme();
  return 'dark';
}
