import React, { useRef, useEffect } from 'react';
import { Pressable, View, Text, StyleSheet, Alert, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useColors } from '@/hooks/useColors';
import { Case, CaseType } from '@/contexts/types';
import * as Haptics from 'expo-haptics';

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  general: 'General Civil',
  fcra: 'FCRA / Credit',
  traffic: 'Traffic',
  ifp: 'Fee Waiver',
};

// Counsel Dark: type is communicated with a jade icon, not a pastel badge.
const TYPE_ICON: Record<CaseType, keyof typeof Feather.glyphMap> = {
  general: 'briefcase',
  fcra: 'credit-card',
  traffic: 'truck',
  ifp: 'file-text',
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
  /** Position in the list — drives the staggered entrance (80ms per card). */
  index?: number;
  /** Number of messages in this case, shown in the bottom row. */
  messageCount?: number;
  /** Next upcoming deadline label (e.g. "Due Aug 4"), shown as an amber pill. */
  nextDeadline?: string;
  /** Whether this case is pinned (shows a jade bookmark, sorts to top). */
  isPinned?: boolean;
  /** Toggle pin — triggered by a right-swipe. */
  onPin?: () => void;
}

export default function CaseCard({
  caseItem,
  lastMessage,
  onPress,
  onDelete,
  index = 0,
  messageCount,
  nextDeadline,
  isPinned = false,
  onPin,
}: CaseCardProps) {
  const colors = useColors();
  const swipeRef = useRef<Swipeable>(null);

  // Left-swipe (content moves left) reveals a red delete action on the right.
  const renderDeleteAction = () => (
    <View style={[styles.action, styles.deleteAction, { backgroundColor: colors.destructive }]}>
      <Feather name="trash-2" size={20} color="#fff" />
      <Text style={styles.actionLabel}>Delete</Text>
    </View>
  );

  // Right-swipe (content moves right) reveals a jade pin action on the left.
  const renderPinAction = () => (
    <View style={[styles.action, styles.pinAction, { backgroundColor: colors.primary }]}>
      <Feather name={isPinned ? 'bookmark' : 'bookmark'} size={20} color={colors.primaryForeground} />
      <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>
        {isPinned ? 'Unpin' : 'Pin'}
      </Text>
    </View>
  );

  const handleSwipeOpen = (direction: 'left' | 'right') => {
    // direction === 'right' → right actions opened (swiped left) → delete.
    // direction === 'left'  → left actions opened (swiped right) → pin.
    swipeRef.current?.close();
    if (direction === 'right') {
      onDelete();
    } else if (onPin) {
      onPin();
    }
  };

  // Entrance: translateY 20→0 + opacity 0→1, staggered 80ms per card.
  const translate = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translate, {
        toValue: 0,
        duration: 320,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translate, opacity, index]);

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
    <Animated.View style={{ opacity, transform: [{ translateY: translate }] }}>
      <Swipeable
        ref={swipeRef}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
        renderRightActions={renderDeleteAction}
        renderLeftActions={onPin ? renderPinAction : undefined}
        onSwipeableOpen={handleSwipeOpen}
        containerStyle={styles.swipeContainer}
      >
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
        {/* Jade status bar — indicates an active case */}
        <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />

        <View style={styles.body}>
          {/* Title row */}
          <View style={styles.top}>
            <Feather
              name={isPinned ? 'bookmark' : TYPE_ICON[caseItem.caseType]}
              size={15}
              color={colors.primary}
              style={styles.typeIcon}
            />
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {caseItem.title || 'Untitled case'}
            </Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>
              {timeAgo(caseItem.lastMessageAt || caseItem.createdAt)}
            </Text>
          </View>

          {/* Type + court */}
          <View style={styles.meta}>
            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
              {CASE_TYPE_LABELS[caseItem.caseType]}
            </Text>
            {caseItem.court ? (
              <Text style={[styles.court, { color: colors.textMuted }]} numberOfLines={1}>
                · {caseItem.court}
              </Text>
            ) : null}
          </View>

          {/* Last message preview */}
          {lastMessage ? (
            <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
              {lastMessage}
            </Text>
          ) : null}

          {/* Bottom row: deadline pill + message count */}
          {(nextDeadline || messageCount != null) && (
            <View style={styles.bottomRow}>
              {nextDeadline ? (
                <View style={[styles.deadlinePill, { backgroundColor: colors.deadlineBg }]}>
                  <Feather name="clock" size={10} color={colors.deadlineText} />
                  <Text style={[styles.deadlineText, { color: colors.deadlineText }]}>
                    {nextDeadline}
                  </Text>
                </View>
              ) : null}
              {messageCount != null ? (
                <Text style={[styles.msgCount, { color: colors.textMuted }]}>
                  {messageCount} message{messageCount !== 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Chevron */}
        <View style={styles.chevron}>
          <Feather name="chevron-right" size={16} color={colors.primary + '66'} />
        </View>
      </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    borderRadius: 14,
  },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    gap: 4,
  },
  deleteAction: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  pinAction: {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  accentBar: {
    width: 3,
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 22,
    gap: 8,
  },
  typeIcon: { flexShrink: 0 },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  time: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.2,
  },
  court: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  preview: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 19,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deadlineText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
  },
  msgCount: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
  },
  chevron: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
