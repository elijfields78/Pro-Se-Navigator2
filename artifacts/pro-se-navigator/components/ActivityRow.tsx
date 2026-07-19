import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

/**
 * An agent-activity row — the visible trace of real work happening:
 * "Verifying citations — CourtListener", "Perplexity Sonar — searching the
 * live web". Running rows pulse teal; finished rows settle with a check.
 * Tapping expands the detail lines (per-citation results, sources found).
 * Every row names the model/engine doing the work.
 */

export interface AgentActivity {
  id: string;
  /** What is happening, in plain words. */
  label: string;
  /** The model or engine doing it — shown as a proud tag. */
  model: string;
  status: 'running' | 'done' | 'error';
  /** Expandable detail lines (results, citations, notes). */
  detail?: string[];
}

export default function ActivityRow({ activity }: { activity: AgentActivity }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (activity.status !== 'running') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activity.status, pulse]);

  const running = activity.status === 'running';
  const error = activity.status === 'error';
  const hasDetail = (activity.detail?.length ?? 0) > 0;

  const icon = running ? 'loader' : error ? 'alert-circle' : 'check';
  const tint = running ? colors.primary : error ? colors.destructive : colors.textMuted;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          if (!hasDetail) return;
          Haptics.selectionAsync();
          setOpen((o) => !o);
        }}
        style={({ pressed }) => [styles.row, pressed && hasDetail && { opacity: 0.7 }]}
      >
        <Animated.View style={{ opacity: running ? pulse : 1 }}>
          <Feather name={icon} size={13} color={tint} />
        </Animated.View>
        <Animated.Text
          numberOfLines={open ? undefined : 1}
          style={[
            styles.label,
            { color: running ? colors.primary : colors.textSecondary },
            running && { opacity: pulse },
          ]}
        >
          {activity.label}
        </Animated.Text>
        <View style={[styles.modelTag, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.modelText, { color: colors.primary }]}>{activity.model}</Text>
        </View>
        {hasDetail && (
          <Feather name={open ? 'chevron-down' : 'chevron-right'} size={13} color={colors.textMuted} />
        )}
      </Pressable>

      {open && hasDetail && (
        <View style={[styles.detail, { borderLeftColor: colors.border }]}>
          {activity.detail!.map((line, i) => (
            <Text key={i} style={[styles.detailLine, { color: colors.textSecondary }]}>
              {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    flexShrink: 1,
    fontSize: 12.5,
    fontFamily: 'DMSans_500Medium',
  },
  modelTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modelText: {
    fontSize: 10,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.3,
  },
  detail: {
    marginLeft: 6,
    marginTop: 2,
    paddingLeft: 12,
    borderLeftWidth: 1,
    gap: 4,
  },
  detailLine: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
});
