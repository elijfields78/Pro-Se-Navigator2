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
import { useTheme, ThemePreference } from '@/contexts/ThemeContext';
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
  const { preference, setPreference } = useTheme();
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

        {/* ── Appearance section ── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
        <ThemeSelector
          preference={preference}
          onChange={setPreference}
          colors={colors}
        />

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

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'smartphone' },
];

/** Segmented Light / Dark / System control. */
function ThemeSelector({
  preference,
  onChange,
  colors,
}: {
  preference: ThemePreference;
  onChange: (pref: ThemePreference) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {THEME_OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt.value);
            }}
            style={[
              styles.segment,
              active && { backgroundColor: colors.primaryDim },
            ]}
          >
            <Feather
              name={opt.icon}
              size={16}
              color={active ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? colors.primary : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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

  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 6 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 16,
    marginBottom: 24,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F6E56',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarText: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2 },
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
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
  },

  // Theme segmented control
  segmented: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },

  // Menu card
  menuCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
