import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { NextStep } from '@/contexts/types';
import * as Haptics from 'expo-haptics';

interface NextStepRowProps {
  step: NextStep;
  onPress?: () => void;
  showDivider?: boolean;
  /** When provided, renders a numbered badge (01, 02…) instead of the arrow icon */
  index?: number;
}

export default function NextStepRow({ step, onPress, showDivider, index }: NextStepRowProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {/* Left: number badge OR corner-down-right arrow */}
        {index !== undefined ? (
          <View style={[styles.numBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.numText, { color: colors.textMuted }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>
        ) : (
          <Feather name="corner-down-right" size={13} color={colors.textMuted} style={styles.arrow} />
        )}

        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>{step.label}</Text>
          {step.subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{step.subtitle}</Text>
          ) : null}
        </View>

        {/* Teal chevron for premium feel */}
        <Feather name="chevron-right" size={14} color={colors.primaryGuide} />
      </Pressable>

      {showDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 11,
  },
  pressed: {
    backgroundColor: 'rgba(15,110,86,0.04)',
    opacity: 0.9,
  },
  // Numbered badge
  numBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 12,
  },
  // Classic arrow icon
  arrow: { width: 22, flexShrink: 0 },
  content: { flex: 1 },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 47,
    marginRight: 14,
  },
});
