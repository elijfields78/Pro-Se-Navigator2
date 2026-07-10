import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { User } from './types';

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
  /** Returns true if sign-in completed, false if the user canceled the Apple sheet. */
  signInWithApple: () => Promise<boolean>;
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
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? sessionToUser(session.user) : null);
      setIsLoading(false);
    });

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
   * Sign in with Apple using expo-apple-authentication.
   * Requires Apple configured as an OAuth provider in the Supabase dashboard.
   * See: supabase/migrations/001_initial.sql for setup instructions.
   */
  /**
   * Sign in with Apple.
   * Returns true on successful sign-in, false if the user canceled.
   * Throws on real errors (e.g. network failure, Supabase error).
   */
  const signInWithApple = useCallback(async (): Promise<boolean> => {
    try {
      // Lazy imports — only available on iOS
      const AppleAuthentication = await import('expo-apple-authentication');
      const Crypto = await import('expo-crypto');

      // Generate a cryptographically secure nonce for replay-attack prevention.
      // getRandomBytesAsync uses the OS CSPRNG (not Math.random).
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('Apple Sign In returned no identity token.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw new Error(error.message);
      return true;
    } catch (err: any) {
      // ERR_REQUEST_CANCELED means the user dismissed the sheet — not a real error
      if (err?.code === 'ERR_REQUEST_CANCELED') return false;
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, signInWithApple }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
