import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { User } from './types';

// Ensures the auth browser session closes cleanly on return to the app.
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Returns `{ needsConfirmation: true }` when Supabase requires the user to
   * verify their email before signing in. The caller should show a "check your
   * email" message instead of navigating.
   */
  signUp: (email: string, password: string, name?: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Returns true if sign-in completed, false if the user canceled the browser. */
  signInWithGoogle: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Map a Supabase Session user to our internal User shape. */
function sessionToUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, any> }): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    name:
      sbUser.user_metadata?.full_name ??
      sbUser.user_metadata?.name ??
      undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount. The catch matters: if restore rejects
    // (storage/network hiccup), isLoading must still clear or the app is
    // stuck on the splash forever.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ? sessionToUser(session.user) : null);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? sessionToUser(session.user) : null);
    });

    // Refresh token when app returns to foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !password) throw new Error('Email and password are required.');

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (error) {
      // Translate Supabase error messages to user-friendly ones
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Incorrect email or password.');
      }
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('Please confirm your email first. Check your inbox for a link from us, then try signing in again.');
      }
      throw new Error(error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<{ needsConfirmation: boolean }> => {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !password) throw new Error('Email and password are required.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');

    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        data: { full_name: name?.trim() || undefined },
      },
    });
    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        throw new Error('An account already exists with that email.');
      }
      throw new Error(error.message);
    }
    // When email confirmation is required, Supabase returns no session.
    // Signal this to the UI so it can show a "check your email" message
    // instead of silently doing nothing.
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  /**
   * Sign in with Google via Supabase OAuth (PKCE).
   *
   * Requires Google enabled as a provider in the Supabase dashboard, and this
   * app's redirect URL (scheme `pro-se-navigator://`) added to Supabase Auth →
   * URL Configuration → Redirect URLs.
   *
   * Flow: get the provider URL from Supabase, open it in a system auth browser,
   * capture the `code` from the redirect back into the app, and exchange it for
   * a session. Returns true on success, false if the user dismissed the browser.
   */
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    const redirectTo = Linking.createURL('auth-callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error('Could not start Google sign-in. Please try again.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    // User closed the browser without completing sign-in.
    if (result.type !== 'success') return false;

    const parsed = Linking.parse(result.url);
    const code = parsed.queryParams?.code;
    if (typeof code !== 'string') {
      const desc = parsed.queryParams?.error_description;
      throw new Error(
        typeof desc === 'string' ? desc : 'Google sign-in did not complete. Please try again.',
      );
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw new Error(exchangeError.message);
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
