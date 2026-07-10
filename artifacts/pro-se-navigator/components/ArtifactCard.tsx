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
        pressed && { opacity: 0.65 },
      ]}
    >
      {/* Icon + title row */}
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: colors.verifiedBg }]}>
          <Feather name={KIND_ICONS[artifact.kind] as any} size={16} color={colors.primary} />
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

      {/* Kind badge + preview */}
      <View style={styles.meta}>
        <View style={[styles.badge, { backgroundColor: colors.verifiedBg }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {KIND_LABELS[artifact.kind]}
          </Text>
        </View>
      </View>

      {artifact.content ? (
        <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={2}>
          {artifact.content}
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
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 20,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  caseLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
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
