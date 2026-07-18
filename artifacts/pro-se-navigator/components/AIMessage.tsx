import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { NextStep } from '@/contexts/types';

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

// Messages that have already played their typewriter reveal this session.
// Inverted FlatLists recycle rows, so without this a message would re-stream
// every time it scrolls back into view. Keyed by content; bounded.
const streamedOnce = new Set<string>();
const STREAM_CACHE_MAX = 300;

/** Character reveal interval (ms). Long messages reveal in small chunks so a
 *  full answer never takes more than a few seconds. */
const TICK_MS = 12;

function chunkSizeFor(length: number): number {
  if (length > 900) return 4;
  if (length > 400) return 2;
  return 1;
}

/** Typewriter reveal for freshly-arrived Navigator messages. */
function useTypewriter(content: string): { shown: string; streaming: boolean } {
  const alreadyPlayed = streamedOnce.has(content);
  const [shown, setShown] = useState(alreadyPlayed ? content : '');
  const [streaming, setStreaming] = useState(!alreadyPlayed);
  const indexRef = useRef(0);

  useEffect(() => {
    if (alreadyPlayed) return;
    if (streamedOnce.size > STREAM_CACHE_MAX) streamedOnce.clear();
    streamedOnce.add(content);

    const chunk = chunkSizeFor(content.length);
    const timer = setInterval(() => {
      indexRef.current = Math.min(indexRef.current + chunk, content.length);
      setShown(content.slice(0, indexRef.current));
      if (indexRef.current >= content.length) {
        clearInterval(timer);
        setStreaming(false);
      }
    }, TICK_MS);

    return () => clearInterval(timer);
    // Intentionally keyed to content only — a new message means a new reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return { shown, streaming };
}

/** Blinking caret shown while the typewriter is streaming. */
function Cursor({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.Text style={{ color, opacity }}>|</Animated.Text>;
}

/** Next-step pill: jade tinted background, arrow, slides in from the left. */
function StepPill({
  step,
  index,
  onPress,
}: {
  step: NextStep;
  index: number;
  onPress?: () => void;
}) {
  const colors = useColors();
  const slide = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        delay: index * 70,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slide, opacity, index]);

  return (
    <Animated.View style={{ transform: [{ translateX: slide }], opacity }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.stepPill,
          { backgroundColor: colors.primaryDim, borderColor: colors.border },
          pressed && { backgroundColor: colors.primaryGlow },
        ]}
      >
        <View style={styles.stepPillBody}>
          <Text style={[styles.stepPillLabel, { color: colors.text }]}>{step.label}</Text>
          {step.subtitle ? (
            <Text style={[styles.stepPillSub, { color: colors.textSecondary }]}>
              {step.subtitle}
            </Text>
          ) : null}
        </View>
        <Feather name="arrow-right" size={15} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
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
  const { shown, streaming } = useTypewriter(content);

  // Label flicker-in: opacity 0→1 over 300ms with a slight stagger.
  const labelOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(labelOpacity, {
      toValue: 1,
      duration: 300,
      delay: 50,
      useNativeDriver: true,
    }).start();
  }, [labelOpacity]);

  // Estimate pill pop: spring scale 0.8→1 with fade.
  const popScale = useRef(new Animated.Value(0.8)).current;
  const popOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isEstimate) return;
    Animated.parallel([
      Animated.spring(popScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.timing(popOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [isEstimate, popScale, popOpacity]);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <View style={styles.container}>
      {/* ── Glowing rule: 1px jade gradient fading left → right ── */}
      <LinearGradient
        colors={[colors.primary, colors.primaryGlow, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.rule}
      />

      {/* ── Label row ── */}
      {isEstimate ? (
        <Animated.View style={[styles.label, { opacity: labelOpacity }]}>
          <Feather name="clock" size={12} color={colors.deadlineText} />
          <Text style={[styles.navigatorLabel, { color: colors.deadlineText }]}>Estimate</Text>
          <Animated.View
            style={[
              styles.estimatePill,
              { backgroundColor: colors.deadlineBg, opacity: popOpacity, transform: [{ scale: popScale }] },
            ]}
          >
            <Text style={[styles.estimatePillText, { color: colors.deadlineText }]}>
              verify with your court
            </Text>
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.label, { opacity: labelOpacity }]}>
          <Text style={[styles.navigatorLabel, { color: colors.primary }]}>NAVIGATOR</Text>
        </Animated.View>
      )}

      {/* ── Message text — typewriter reveal with blinking caret ── */}
      <Text
        style={[styles.text, { color: isEstimate ? colors.textSecondary : colors.text }]}
      >
        {shown}
        {streaming && <Cursor color={colors.primary} />}
      </Text>

      {/* ── Next-step pills — appear once streaming completes ── */}
      {!streaming && nextSteps && nextSteps.length > 0 && (
        <View style={styles.steps}>
          {nextSteps.map((step, i) => (
            <StepPill
              key={step.id}
              step={step}
              index={i}
              onPress={onNextStepPress ? () => onNextStepPress(step) : undefined}
            />
          ))}
        </View>
      )}

      {/* ── Message actions — hidden for estimates and while streaming ── */}
      {!isEstimate && !streaming && (
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
  rule: {
    height: 1,
    width: '52%',
    marginBottom: 10,
    borderRadius: 1,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  navigatorLabel: {
    fontSize: 13,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    letterSpacing: 2.2,
  },
  estimatePill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  estimatePillText: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 0.3,
  },
  text: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 26,
  },
  steps: {
    marginTop: 14,
    gap: 8,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepPillBody: { flex: 1, gap: 2 },
  stepPillLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
  stepPillSub: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
});
