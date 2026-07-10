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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
            Harvey-caliber legal guidance{'\n'}for self-represented litigants
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
