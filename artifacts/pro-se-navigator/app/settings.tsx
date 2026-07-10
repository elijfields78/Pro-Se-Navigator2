import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import * as Haptics from 'expo-haptics';

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  max: 'Max',
};

const PLAN_COLOR: Record<string, string> = {
  free: '#9A988F',
  pro: '#0F6E56',
  max: '#7C3AED',
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const plan = usePlan();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase();

  const handleSignOut = () => {
    Haptics.selectionAsync();
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 10, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.verifiedBg }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            {user?.name ? (
              <Text style={[styles.profileName, { color: colors.text }]}>{user.name}</Text>
            ) : null}
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {user?.email ?? ''}
            </Text>
          </View>
          <View style={[styles.planBadge, { backgroundColor: PLAN_COLOR[plan.tier] + '18' }]}>
            <Text style={[styles.planBadgeText, { color: PLAN_COLOR[plan.tier] }]}>
              {PLAN_LABEL[plan.tier]}
            </Text>
          </View>
        </View>

        {/* ── Content section ── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CONTENT</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow
            icon="folder"
            label="Artifacts Archive"
            subtitle="All documents across cases"
            colors={colors}
            onPress={() => router.push('/artifacts-archive')}
          />
          <Divider colors={colors} />
          <MenuRow
            icon="bar-chart-2"
            label="Usage & Credits"
            subtitle="Monthly usage and limits"
            colors={colors}
            onPress={() => router.push('/usage')}
          />
        </View>

        {/* ── Account section ── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow
            icon="log-out"
            label="Sign out"
            colors={colors}
            destructive
            onPress={handleSignOut}
          />
        </View>

        {/* ── Legal section ── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LEGAL</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuRow
            icon="file-text"
            label="Terms of Service"
            colors={colors}
            onPress={() => {}}
            placeholder
          />
          <Divider colors={colors} />
          <MenuRow
            icon="shield"
            label="Privacy Policy"
            colors={colors}
            onPress={() => {}}
            placeholder
          />
        </View>

        {/* ── Disclaimer ── */}
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          This is not legal advice.{'\n'}Pro Se Navigator is not a law firm.
        </Text>
        <Text style={[styles.version, { color: colors.textMuted }]}>
          Pro Se Navigator · v0.1.0
        </Text>
      </ScrollView>
    </View>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  );
}

function MenuRow({
  icon,
  label,
  subtitle,
  destructive,
  placeholder,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  destructive?: boolean;
  placeholder?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const iconColor = destructive ? colors.destructive : colors.textSecondary;
  const labelColor = destructive ? colors.destructive : placeholder ? colors.textMuted : colors.text;

  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={placeholder}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: destructive ? '#FEE2E2' : colors.background }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={styles.menuRowContent}>
        <Text style={[styles.menuRowLabel, { color: labelColor }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.menuRowSub, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {!destructive && !placeholder && (
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      )}
      {placeholder && (
        <Text style={[styles.comingSoon, { color: colors.textMuted }]}>Soon</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, width: 36 },
  topBarTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },

  scroll: { paddingHorizontal: 16, paddingTop: 24, gap: 6 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  profileEmail: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },

  // Menu card
  menuCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowContent: { flex: 1, gap: 1 },
  menuRowLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  menuRowSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
  comingSoon: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Footer
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 32,
  },
  version: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 6,
  },
});
