import React, { useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface SearchBarProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  /** Optional autofocus when the bar mounts. */
  autoFocus?: boolean;
}

/**
 * Pill-shaped filter input: surface background, jade focus border, search icon
 * on the left and a clear (×) button on the right once there is text.
 */
export default function SearchBar({ value, onChangeText, placeholder, autoFocus }: SearchBarProps) {
  const colors = useColors();
  // Border color animates from the resting border to jade on focus.
  const focusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (to: number) =>
    Animated.timing(focusAnim, { toValue: to, duration: 180, useNativeDriver: false }).start();

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderColor },
      ]}
    >
      <Feather name="search" size={16} color={colors.textMuted} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
        onFocus={() => animateFocus(1)}
        onBlur={() => animateFocus(0)}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Feather name="x" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
});
