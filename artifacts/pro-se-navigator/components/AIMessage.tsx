import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { NextStep } from '@/contexts/types';
import NextStepRow from './NextStepRow';

interface AIMessageProps {
  content: string;
  nextSteps?: NextStep[];
  onNextStepPress?: (step: NextStep) => void;
}

export default function AIMessage({ content, nextSteps, onNextStepPress }: AIMessageProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Navigator label with compass icon */}
      <View style={styles.label}>
        <Feather name="compass" size={11} color={colors.primary} />
        <Text style={[styles.labelText, { color: colors.primary }]}>Navigator</Text>
      </View>

      {/* Message text — flowing plain text, no bubble */}
      <Text style={[styles.text, { color: colors.text }]}>{content}</Text>

      {/* Tappable next-step rows */}
      {nextSteps && nextSteps.length > 0 && (
        <View style={[styles.nextSteps, { borderTopColor: colors.border }]}>
          {nextSteps.map((step, i) => (
            <NextStepRow
              key={step.id}
              step={step}
              onPress={onNextStepPress ? () => onNextStepPress(step) : undefined}
              showDivider={i < nextSteps.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 7,
  },
  labelText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  nextSteps: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
