import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Case, CaseType } from '@/contexts/types';
import * as Haptics from 'expo-haptics';

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  general: 'General Civil',
  fcra: 'FCRA / Credit',
  traffic: 'Traffic',
  ifp: 'Fee Waiver',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = diff / 60000;
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${Math.floor(mins)}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CaseCardProps {
  caseItem: Case;
  lastMessage?: string;
  onPress: () => void;
}

export default function CaseCard({ caseItem, lastMessage, onPress }: CaseCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {caseItem.title}
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {timeAgo(caseItem.lastMessageAt || caseItem.createdAt)}
        </Text>
      </View>

      <View style={styles.meta}>
        <View style={[styles.badge, { backgroundColor: colors.verifiedBg }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {CASE_TYPE_LABELS[caseItem.caseType]}
          </Text>
        </View>
        {caseItem.court ? (
          <Text style={[styles.court, { color: colors.textSecondary }]} numberOfLines={1}>
            {caseItem.court}
          </Text>
        ) : null}
      </View>

      {lastMessage ? (
        <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={2}>
          {lastMessage}
        </Text>
      ) : null}

      <View style={styles.chevron}>
        <Feather name="chevron-right" size={15} color={colors.border} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    position: 'relative',
  },
  pressed: { opacity: 0.65 },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  court: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  preview: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginTop: 2,
  },
  chevron: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
