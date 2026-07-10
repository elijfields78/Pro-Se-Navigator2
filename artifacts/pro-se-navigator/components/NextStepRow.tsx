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
}

export default function NextStepRow({ step, onPress, showDivider }: NextStepRowProps) {
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
        <Feather name="corner-down-right" size={13} color={colors.textMuted} style={styles.arrow} />
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>{step.label}</Text>
          {step.subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{step.subtitle}</Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={13} color={colors.border} />
      </Pressable>
      {showDivider && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 2,
    gap: 10,
  },
  pressed: { opacity: 0.55 },
  arrow: { width: 20 },
  content: { flex: 1 },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 30,
  },
});
