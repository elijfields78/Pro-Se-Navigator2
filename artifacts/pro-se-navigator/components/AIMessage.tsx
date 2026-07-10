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
        <View style={styles.label}>
          <Feather name="clock" size={11} color={colors.deadlineText} />
          <Text style={[styles.labelText, { color: colors.deadlineText }]}>Estimate</Text>
          <View style={[styles.estimatePill, { backgroundColor: colors.deadlineBg }]}>
            <Text style={[styles.estimatePillText, { color: colors.deadlineText }]}>
              verify with your court
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.label}>
          {/* Teal navigator avatar circle */}
          <View style={[styles.navAvatar, { backgroundColor: colors.primary }]}>
            <Feather name="compass" size={11} color="#FFFFFF" />
          </View>
          <Text style={[styles.labelText, { color: colors.primary }]}>Navigator</Text>
        </View>
      )}

      {/* ── Message text ── */}
      <Text
        style={[
          styles.text,
          !isEstimate && styles.textIndent,
          { color: isEstimate ? colors.textSecondary : colors.text },
        ]}
      >
        {content}
      </Text>

      {/* ── Next-step rows — wrapped in elevated card with teal left accent ── */}
      {nextSteps && nextSteps.length > 0 && (
        <View
          style={[
            styles.nextStepsCard,
            {
              backgroundColor: colors.surface,
              borderLeftColor: colors.primary,
              shadowColor: colors.text,
            },
          ]}
        >
          {nextSteps.map((step, i) => (
            <NextStepRow
              key={step.id}
              step={step}
              index={i}
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
    paddingTop: 24,
    paddingBottom: 6,
  },
  // Navigator avatar circle
  navAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  labelText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
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
    lineHeight: 26,
  },
  // Indent body text to align with label text (past avatar)
  textIndent: {
    paddingLeft: 30,
  },
  // Elevated next-steps card with teal left accent
  nextStepsCard: {
    marginTop: 14,
    marginLeft: 30,
    borderRadius: 14,
    borderLeftWidth: 3,
    // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    // Android
    elevation: 3,
    // Note: no overflow:hidden here — that clips iOS shadows.
    // Rows render fine without clipping since their bg is transparent by default.
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 2,
    paddingLeft: 30,
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
