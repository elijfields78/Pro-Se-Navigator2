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
      <View style={[styles.bubble, { backgroundColor: colors.verifiedBg }]}>
        <Text style={[styles.text, { color: colors.text }]}>{content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
});
