import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

/** A single pulsing dot. */
function Dot({ delay, color }: { delay: number; color: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        // Pad the tail so the three dots stay out of phase.
        Animated.delay(600 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);

  return <Animated.View style={[styles.dot, { opacity, backgroundColor: color }]} />;
}

/**
 * "Navigator is typing" indicator — mirrors AIMessage's label row (jade rule +
 * NAVIGATOR wordmark) with three sequenced dots below.
 */
export default function TypingIndicator() {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryGlow, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.rule}
      />
      <View style={styles.label}>
        <Text style={[styles.navigatorLabel, { color: colors.primary }]}>NAVIGATOR</Text>
      </View>
      <View style={styles.dots}>
        <Dot delay={0} color={colors.textSecondary} />
        <Dot delay={200} color={colors.textSecondary} />
        <Dot delay={400} color={colors.textSecondary} />
      </View>
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
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
