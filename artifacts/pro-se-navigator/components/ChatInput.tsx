import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  placeholder = 'Ask about your case…',
  disabled,
}: ChatInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8) + 4,
        },
      ]}
    >
      <View
        style={[
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {/* Mic button — decorative in Phase 1 */}
        <Pressable style={styles.iconBtn} onPress={() => {}}>
          <Feather name="mic" size={17} color={colors.textMuted} />
        </Pressable>

        <TextInput
          style={[
            styles.input,
            { color: colors.text, fontFamily: 'Inter_400Regular' },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="default"
        />

        {/* Amber send button */}
        <Pressable
          onPress={handleSend}
          disabled={!hasText || disabled}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: hasText ? colors.amber : colors.border },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Feather
            name="arrow-up"
            size={15}
            color={hasText ? colors.amberText : colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
