import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface UserMessageProps {
  content: string;
}

export default function UserMessage({ content }: UserMessageProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* "You" micro-label */}
      <Text style={[styles.youLabel, { color: colors.textMuted }]}>You</Text>
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
});
