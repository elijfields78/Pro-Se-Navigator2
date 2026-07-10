import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { NextStep } from '@/contexts/types';
import NextStepRow from './NextStepRow';

interface AIMessageProps {
  content: string;
  nextSteps?: NextStep[];
  onNextStepPress?: (step: NextStep) => void;
  /** Called when the user taps Regenerate. Undefined = button not shown. */
  onRegenerate?: () => void;
  /**
   * When true, renders the message with an amber "Estimate" badge instead of
   * the normal "Navigator" label. Action buttons (Copy, Regenerate) are hidden
   * because the user's next action is entering a date in DeadlineDateEntry.
   */
  isEstimate?: boolean;
}

export default function AIMessage({
  content,
  nextSteps,
  onNextStepPress,
  onRegenerate,
  isEstimate = false,
}: AIMessageProps) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <View style={styles.container}>
      {/* ── Label row ── */}
      {isEstimate ? (
        // Amber "Estimate" badge — signals provisional content
        <View style={styles.label}>
          <Feather name="clock" size={11} color={colors.deadlineText} />
          <Text style={[styles.labelText, { color: colors.deadlineText }]}>
            Estimate
          </Text>
          <View style={[styles.estimatePill, { backgroundColor: colors.deadlineBg }]}>
            <Text style={[styles.estimatePillText, { color: colors.deadlineText }]}>
              verify with your court
            </Text>
          </View>
        </View>
      ) : (
        // Standard Navigator label
        <View style={styles.label}>
          <Feather name="compass" size={11} color={colors.primary} />
          <Text style={[styles.labelText, { color: colors.primary }]}>Navigator</Text>
        </View>
      )}

      {/* ── Message text — flowing plain text, no bubble ── */}
      <Text
        style={[
          styles.text,
          { color: isEstimate ? colors.textSecondary : colors.text },
        ]}
      >
        {content}
      </Text>

      {/* ── Tappable next-step rows ── */}
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

      {/* ── Message actions — hidden for estimate messages ── */}
      {!isEstimate && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.5 }]}
            onPress={handleCopy}
            hitSlop={6}
          >
            <Feather
              name={copied ? 'check' : 'copy'}
              size={13}
              color={copied ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: copied ? colors.primary : colors.textMuted },
              ]}
            >
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </Pressable>

          {onRegenerate != null && (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.5 }]}
              onPress={onRegenerate}
              hitSlop={6}
            >
              <Feather name="refresh-cw" size={13} color={colors.textMuted} />
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Regenerate</Text>
            </Pressable>
          )}
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
  estimatePill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  estimatePillText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.3,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
