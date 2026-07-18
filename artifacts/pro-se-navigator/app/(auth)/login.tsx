import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

/** Official multi-color Google "G" mark. */
function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message || 'Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const signedIn = await signInWithGoogle();
      // `false` means the user dismissed the browser — no haptic, no alert.
      if (signedIn) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      Alert.alert('Google Sign In failed', e.message || 'Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={[styles.iconRing, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="compass" size={34} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Pro Se Navigator</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Step-by-step legal guidance{'\n'}for self-represented litigants
          </Text>
        </View>

        {/* Inputs */}
        <View style={styles.form}>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Feather name="mail" size={15} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, fontFamily: 'Inter_400Regular' }]}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Feather name="lock" size={15} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, fontFamily: 'Inter_400Regular' }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoComplete="password"
              textContentType="password"
            />
            <Pressable onPress={() => setShowPw(!showPw)} style={styles.eyeBtn} hitSlop={8}>
              <Feather name={showPw ? 'eye-off' : 'eye'} size={15} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Primary sign-in */}
          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.amber },
              (pressed || loading) && { opacity: 0.8 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.amberText} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.amberText }]}>Sign in</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Sign in with Google */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            style={({ pressed }) => [
              styles.googleBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
              (pressed || googleLoading) && { opacity: 0.7 },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <GoogleG />
                <Text style={[styles.googleBtnText, { color: colors.text }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/register')} style={styles.switchLink}>
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
              <Text style={{ color: colors.primary, fontFamily: 'Inter_500Medium' }}>Create one</Text>
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          This is not legal advice.{'\n'}Pro Se Navigator is not a law firm.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 28, alignItems: 'stretch' },
  logoArea: { alignItems: 'center', marginBottom: 44, gap: 10 },
  iconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  appName: {
    fontSize: 26,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },
  eyeBtn: { paddingLeft: 8 },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  googleBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  switchLink: { alignItems: 'center', paddingVertical: 10 },
  switchText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 36,
  },
});
