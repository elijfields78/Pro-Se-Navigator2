import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

interface ThemeContextValue {
  /** The user's stored choice: 'light', 'dark', or 'system'. */
  preference: ThemePreference;
  /** The concrete scheme in effect right now, after resolving 'system'. */
  scheme: ResolvedScheme;
  /** Persist a new preference. */
  setPreference: (pref: ThemePreference) => void;
}

/**
 * Default context value. "Counsel Dark" is the product's art direction, so the
 * app falls back to dark if a component ever reads this hook outside the
 * provider (which shouldn't happen, but keeps `useColors` crash-proof).
 */
const ThemeContext = createContext<ThemeContextValue>({
  preference: 'dark',
  scheme: 'dark',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to dark until the stored preference loads, so the first paint
  // matches the product's dark-first art direction.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const system = useSystemColorScheme();

  // Load the saved preference once on mount.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (
          active &&
          (stored === 'light' || stored === 'dark' || stored === 'system')
        ) {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        /* fall back to the dark default */
      });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {
      /* non-fatal — preference stays for this session */
    });
  };

  const scheme: ResolvedScheme =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
