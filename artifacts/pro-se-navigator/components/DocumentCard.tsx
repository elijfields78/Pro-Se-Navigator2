import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CaseDocument, DocumentSource } from '@/contexts/types';
import * as Haptics from 'expo-haptics';

const SOURCE_LABELS: Record<DocumentSource, string> = {
  image: 'Photo',
  camera: 'Photo',
  file: 'File',
};

/** Pick an icon + theme-aware colors from the document's MIME type. */
function visualFor(
  doc: CaseDocument,
  colors: ReturnType<typeof useColors>,
): { icon: string; bg: string; color: string } {
  const mime = doc.mimeType ?? '';
  if (mime.startsWith('image/') || doc.source === 'image' || doc.source === 'camera') {
    return { icon: 'image', bg: colors.primaryDim, color: colors.primary };
  }
  if (mime === 'application/pdf') {
    return { icon: 'file-text', bg: colors.destructive + '18', color: colors.destructive };
  }
  if (mime.includes('word')) {
    return { icon: 'file-text', bg: colors.primaryDim, color: colors.primary };
  }
  return { icon: mime.startsWith('text/') ? 'file-text' : 'file', bg: colors.surfaceOffset, color: colors.textSecondary };
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

interface DocumentCardProps {
  document: CaseDocument;
  showCaseTitle?: boolean;
  /** Called on tap — parent resolves a signed URL and opens it. */
  onPress?: () => void;
  onDelete?: () => void;
  /** Shows a spinner state while a signed URL is being fetched. */
  opening?: boolean;
}

export default function DocumentCard({
  document,
  showCaseTitle,
  onPress,
  onDelete,
  opening,
}: DocumentCardProps) {
  const colors = useColors();
  const visual = visualFor(document, colors);
  const size = formatSize(document.sizeBytes);

  const handleLongPress = () => {
    if (!onDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      document.name,
      'Delete this document? The file will be permanently removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  const metaParts = [SOURCE_LABELS[document.source], size].filter(Boolean);

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
      <View style={[styles.iconWrap, { backgroundColor: visual.bg }]}>
        <Feather name={visual.icon as any} size={18} color={visual.color} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {document.name}
        </Text>
        {showCaseTitle && document.caseTitle ? (
          <Text style={[styles.caseLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {document.caseTitle}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
          {metaParts.join(' · ')}
          {metaParts.length > 0 ? ' · ' : ''}
          {timeAgo(document.createdAt)}
        </Text>
      </View>

      <View style={styles.trailing}>
        {opening ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="external-link" size={16} color={colors.primary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.1,
  },
  caseLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  trailing: {
    paddingLeft: 4,
    paddingRight: 2,
  },
});
