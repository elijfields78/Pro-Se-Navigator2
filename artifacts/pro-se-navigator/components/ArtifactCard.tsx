import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CaseArtifact, ArtifactKind } from '@/contexts/types';
import * as Haptics from 'expo-haptics';

const KIND_LABELS: Record<ArtifactKind, string> = {
  motion: 'Motion',
  letter: 'Letter',
  form: 'Form',
  note: 'Note',
  other: 'Document',
};

const KIND_ICONS: Record<ArtifactKind, string> = {
  motion: 'file-text',
  letter: 'mail',
  form: 'clipboard',
  note: 'edit-3',
  other: 'file',
};

// Kind-specific icon container colors — light-only (v1)
const KIND_STYLE: Record<ArtifactKind, { bg: string; icon: string }> = {
  motion: { bg: '#E1F5EE', icon: '#0F6E56' },
  letter: { bg: '#FFF4E5', icon: '#92500A' },
  form:   { bg: '#F0F4FF', icon: '#3B5BDB' },
  note:   { bg: '#F5F4F0', icon: '#6B6A63' },
  other:  { bg: '#F5F4F0', icon: '#6B6A63' },
};

const KIND_BADGE: Record<ArtifactKind, { bg: string; text: string }> = {
  motion: { bg: '#E1F5EE', text: '#0F6E56' },
  letter: { bg: '#FFF4E5', text: '#92500A' },
  form:   { bg: '#F0F4FF', text: '#3B5BDB' },
  note:   { bg: '#EFEFEB', text: '#6B6A63' },
  other:  { bg: '#EFEFEB', text: '#6B6A63' },
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

interface ArtifactCardProps {
  artifact: CaseArtifact;
  showCaseTitle?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
}

export default function ArtifactCard({ artifact, showCaseTitle, onPress, onDelete }: ArtifactCardProps) {
  const colors = useColors();
  const kindStyle = KIND_STYLE[artifact.kind];
  const badge = KIND_BADGE[artifact.kind];

  const handleLongPress = () => {
    if (!onDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      artifact.title,
      'Delete this document? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      {/* Icon + title row */}
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: kindStyle.bg }]}>
          <Feather name={KIND_ICONS[artifact.kind] as any} size={18} color={kindStyle.icon} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {artifact.title}
          </Text>
          {showCaseTitle && (
            <Text style={[styles.caseLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {artifact.caseTitle}
            </Text>
          )}
        </View>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {timeAgo(artifact.createdAt)}
        </Text>
      </View>

      {/* Kind badge */}
      <View style={styles.meta}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>
            {KIND_LABELS[artifact.kind]}
          </Text>
        </View>
      </View>

      {/* Content preview */}
      {artifact.content ? (
        <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={2}>
          {artifact.content}
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
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 9,
    position: 'relative',
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
    gap: 12,
    paddingRight: 22,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
    paddingTop: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.1,
    lineHeight: 21,
  },
  caseLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    flexShrink: 0,
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
  preview: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  chevron: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
