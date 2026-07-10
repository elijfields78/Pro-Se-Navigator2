import React from 'react';
import { Pressable, View, Text, StyleSheet, Alert } from 'react-native';
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

// Type-specific badge colors — light-only (v1 is light-only)
const TYPE_BADGE: Record<CaseType, { bg: string; text: string }> = {
  fcra:    { bg: '#E1F5EE', text: '#0F6E56' },
  general: { bg: '#EFEFEB', text: '#6B6A63' },
  traffic: { bg: '#FFF4E5', text: '#92500A' },
  ifp:     { bg: '#F0F4FF', text: '#3B5BDB' },
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
  onDelete: () => void;
}

export default function CaseCard({ caseItem, lastMessage, onPress, onDelete }: CaseCardProps) {
  const colors = useColors();
  const badge = TYPE_BADGE[caseItem.caseType];

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      caseItem.title || 'This case',
      'Delete this case? This removes all messages, deadlines, and sources linked to it. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      {/* Title + time */}
      <View style={styles.top}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {caseItem.title}
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {timeAgo(caseItem.lastMessageAt || caseItem.createdAt)}
        </Text>
      </View>

      {/* Badge row */}
      <View style={styles.meta}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>
            {CASE_TYPE_LABELS[caseItem.caseType]}
          </Text>
        </View>
        {caseItem.court ? (
          <Text style={[styles.court, { color: colors.textSecondary }]} numberOfLines={1}>
            {caseItem.court}
          </Text>
        ) : null}
      </View>

      {/* Message preview */}
      {lastMessage ? (
        <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={2}>
          {lastMessage}
        </Text>
      ) : null}

      {/* Chevron */}
      <View style={styles.chevron}>
        <Feather name="chevron-right" size={16} color={colors.primary + '55'} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 9,
    position: 'relative',
    // Warm barely-there elevation
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: 22,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
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
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.1,
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
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
