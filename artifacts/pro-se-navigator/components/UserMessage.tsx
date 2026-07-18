import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface UserMessageProps {
  content: string;
  /** ISO timestamp — revealed on tap. */
  createdAt?: string;
  /** Long-press opens the message action sheet. */
  onLongPress?: () => void;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function UserMessage({ content, createdAt, onLongPress }: UserMessageProps) {
  const colors = useColors();

  const [showTimestamp, setShowTimestamp] = useState(false);
  const timestampAnim = useRef(new Animated.Value(0)).current;
  const toggleTimestamp = useCallback(() => {
    const next = !showTimestamp;
    setShowTimestamp(next);
    Animated.timing(timestampAnim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showTimestamp, timestampAnim]);

  return (
    <View style={styles.container}>
      {/* "You" micro-label */}
      <Text style={[styles.youLabel, { color: colors.textMuted }]}>You</Text>
      <Pressable onPress={toggleTimestamp} onLongPress={onLongPress} delayLongPress={400}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: colors.verifiedBg,
              borderColor: colors.primary + '28',
            },
          ]}
        >
          <Text style={[styles.text, { color: colors.text }]}>{content}</Text>
        </View>
        {showTimestamp && createdAt ? (
          <Animated.View style={{ opacity: timestampAnim, alignSelf: 'flex-end' }}>
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatTime(createdAt)}
            </Text>
          </Animated.View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'flex-end',
    gap: 5,
  },
  youLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.2,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    // Subtle shadow on bubble
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  text: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 5,
  },
});
