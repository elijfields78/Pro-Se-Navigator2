import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { usePlan, PlanTier } from '@/hooks/usePlan';

/** Monthly AI message limits per tier — placeholder until Phase 6/14 wire-up. */
const MONTHLY_MESSAGE_LIMITS: Record<PlanTier, number | null> = {
  free: 40,
  pro: 500,
  max: null, // unlimited
};

/** Friendly tier names */
const PLAN_NAMES: Record<PlanTier, string> = {
  free: 'Free',
  pro: 'Pro',
  max: 'Max',
};

/** What each tier unlocks */
const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: ['40 AI messages / month', '3 file uploads / day', 'Basic case intake', 'Citation research'],
  pro: ['500 AI messages / month', 'Unlimited file uploads', 'Document drafting', 'Voice input'],
  max: ['Unlimited AI messages', 'Unlimited file uploads', 'Everything in Pro', 'Priority support'],
};

/** Returns the first day of next month as a readable string */
function nextResetDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function UsageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const plan = usePlan();

  const monthlyLimit = MONTHLY_MESSAGE_LIMITS[plan.tier];

  // Placeholder usage figures — Phase 6/14 will wire real counters.
  const messagesUsed = 0;
  const messagesLimit = monthlyLimit;
  const uploadUsed = plan.uploadsUsedToday;
  const uploadLimit = plan.uploadLimitPerDay;

  const messageProgress =
    messagesLimit != null ? Math.min(messagesUsed / messagesLimit, 1) : 0;
  const uploadProgress =
    uploadLimit != null ? Math.min(uploadUsed / uploadLimit, 1) : 0;

  const isNearLimit = messageProgress >= 0.8;

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
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Usage & Credits</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Plan badge row ── */}
        <View style={[styles.planRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.planRowLeft}>
            <Text style={[styles.planRowLabel, { color: colors.textMuted }]}>Current plan</Text>
            <Text style={[styles.planRowTier, { color: colors.text }]}>
              {PLAN_NAMES[plan.tier]}
            </Text>
          </View>
          {plan.tier === 'free' && (
            <Pressable
              style={({ pressed }) => [
                styles.upgradeBtn,
                { backgroundColor: colors.amber },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => {}}
            >
              <Text style={[styles.upgradeBtnText, { color: colors.amberText }]}>Upgrade</Text>
            </Pressable>
          )}
        </View>

        {/* ── AI Messages ── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>THIS MONTH</Text>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statHeader}>
            <View style={styles.statLabelRow}>
              <Feather name="message-circle" size={15} color={colors.textSecondary} />
              <Text style={[styles.statLabel, { color: colors.text }]}>AI Messages</Text>
            </View>
            <Text style={[styles.statCount, { color: isNearLimit ? colors.deadlineText : colors.textSecondary }]}>
              {messagesUsed}
              {messagesLimit != null ? ` / ${messagesLimit}` : ' / ∞'}
            </Text>
          </View>

          {messagesLimit != null ? (
            <>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(messageProgress * 100)}%` as any,
                      backgroundColor: isNearLimit ? colors.deadlineText : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                {messagesLimit - messagesUsed} messages remaining this month
              </Text>
            </>
          ) : (
            <Text style={[styles.statSub, { color: colors.textMuted }]}>Unlimited on {PLAN_NAMES[plan.tier]}</Text>
          )}
        </View>

        {/* ── File uploads ── */}
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statHeader}>
            <View style={styles.statLabelRow}>
              <Feather name="paperclip" size={15} color={colors.textSecondary} />
              <Text style={[styles.statLabel, { color: colors.text }]}>File Uploads Today</Text>
            </View>
            <Text style={[styles.statCount, { color: colors.textSecondary }]}>
              {uploadUsed}
              {uploadLimit != null ? ` / ${uploadLimit}` : ' / ∞'}
            </Text>
          </View>

          {uploadLimit != null ? (
            <>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(uploadProgress * 100)}%` as any,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.statSub, { color: colors.textMuted }]}>
                Resets daily at midnight
              </Text>
            </>
          ) : (
            <Text style={[styles.statSub, { color: colors.textMuted }]}>Unlimited on {PLAN_NAMES[plan.tier]}</Text>
          )}
        </View>

        {/* ── Reset date ── */}
        <View style={[styles.resetRow, { borderColor: colors.border }]}>
          <Feather name="refresh-cw" size={13} color={colors.textMuted} />
          <Text style={[styles.resetText, { color: colors.textMuted }]}>
            Monthly usage resets on {nextResetDate()}
          </Text>
        </View>

        {/* ── Plan features ── */}
        {plan.tier === 'free' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UNLOCK WITH PRO</Text>
            <View style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {PLAN_FEATURES.pro.map((f, i) => (
                <React.Fragment key={f}>
                  <View style={styles.featureRow}>
                    <Feather name="check" size={14} color={colors.primary} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
                  </View>
                  {i < PLAN_FEATURES.pro.length - 1 && (
                    <View style={[styles.featureDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.upgradeBtnLarge,
                { backgroundColor: colors.amber },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => {}}
            >
              <Text style={[styles.upgradeBtnLargeText, { color: colors.amberText }]}>
                Upgrade to Pro
              </Text>
              <Text style={[styles.upgradeBtnSub, { color: colors.amberText + 'CC' }]}>
                Payments coming soon
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
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

  // Plan row
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  planRowLeft: { gap: 2 },
  planRowLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', letterSpacing: 0.3 },
  planRowTier: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  upgradeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  upgradeBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
  },

  // Stat cards
  statCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  statCount: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 6,
  },
  statSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  // Reset date
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  resetText: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  // Plan features
  featureCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  featureText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  featureDivider: { height: StyleSheet.hairlineWidth, marginLeft: 42 },

  // Upgrade CTA
  upgradeBtnLarge: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  upgradeBtnLargeText: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  upgradeBtnSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
