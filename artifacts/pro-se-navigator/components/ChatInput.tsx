import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AttachmentSheet, { PendingAttachment } from './AttachmentSheet';

interface ChatInputProps {
  onSend: (text: string, attachments?: PendingAttachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Mic waveform: three vertical bars looping while "recording". */
function Waveform({ color }: { color: string }) {
  const bars = [useRef(new Animated.Value(4)).current, useRef(new Animated.Value(10)).current, useRef(new Animated.Value(6)).current];

  useEffect(() => {
    const loops = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 12,
            duration: 260 + i * 70,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 4,
            duration: 260 + i * 70,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.waveform}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={[styles.waveBar, { height: v, backgroundColor: color }]} />
      ))}
    </View>
  );
}

export default function ChatInput({
  onSend,
  placeholder = 'Ask the Navigator…',
  disabled,
}: ChatInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [recording, setRecording] = useState(false);

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  // Focus glow ring: a jade layer under the bar that scales/fades in on focus.
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const handleFocus = () => {
    Animated.parallel([
      Animated.timing(glowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(glowScale, {
        toValue: 1.02,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };
  const handleBlur = () => {
    Animated.parallel([
      Animated.timing(glowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(glowScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  // Send button pulse: gentle amber breathing while there is content to send.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!hasContent) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hasContent, pulse]);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text.trim(), attachments.length > 0 ? attachments : undefined);
    setText('');
    setAttachments([]);
  };

  const handleAttach = (attachment: PendingAttachment) => {
    setAttachments((prev) => [...prev, attachment]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 8) + 6,
          },
        ]}
      >
        {/* Pending attachment previews */}
        {attachments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.attachmentScroll}
            contentContainerStyle={styles.attachmentRow}
          >
            {attachments.map((att, i) => (
              <View
                key={i}
                style={[styles.attachmentChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {att.type === 'image' || att.type === 'camera' ? (
                  <Image source={{ uri: att.uri }} style={styles.attachmentThumb} />
                ) : (
                  <View style={[styles.fileIconWrap, { backgroundColor: colors.primaryDim }]}>
                    <Feather name="file-text" size={14} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.attachmentName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {att.name.length > 18 ? att.name.slice(0, 16) + '…' : att.name}
                </Text>
                <Pressable
                  onPress={() => removeAttachment(i)}
                  hitSlop={6}
                  style={[styles.removeBtn, { backgroundColor: colors.surfaceOffset }]}
                >
                  <Feather name="x" size={10} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Floating bar + focus glow ring */}
        <View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowRing,
              {
                backgroundColor: colors.primaryGlow,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <View style={[styles.rowClip, { borderColor: colors.borderStrong }]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            {/* Blur fallback tint (Android renders BlurView weakly) */}
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface2, opacity: Platform.OS === 'android' ? 1 : 0.6 }]}
            />
            <View style={styles.row}>
              {/* + attachment */}
              <Pressable
                style={({ pressed }) => [
                  styles.attachBtn,
                  { backgroundColor: pressed ? colors.surfaceOffset : 'transparent', borderColor: colors.border },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSheetOpen(true);
                }}
                disabled={disabled}
              >
                <Feather name="plus" size={17} color={colors.textSecondary} />
              </Pressable>

              <TextInput
                style={[
                  styles.input,
                  { color: colors.text },
                  // Italic only while the placeholder is showing.
                  text.length === 0 && styles.inputEmpty,
                ]}
                value={text}
                onChangeText={setText}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={2000}
                editable={!disabled}
                returnKeyType="default"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />

              {/* Mic / waveform */}
              <Pressable
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { backgroundColor: colors.surfaceOffset },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRecording((r) => !r);
                }}
              >
                {recording ? (
                  <Waveform color={colors.primary} />
                ) : (
                  <Feather name="mic" size={17} color={colors.textSecondary} />
                )}
              </Pressable>

              {/* Send — amber, pulses while active */}
              <Animated.View style={{ transform: [{ scale: pulse }] }}>
                <Pressable
                  onPress={handleSend}
                  disabled={!hasContent || disabled}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    {
                      backgroundColor: hasContent ? colors.amber : colors.surfaceOffset,
                      shadowColor: hasContent ? colors.amber : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: hasContent ? 0.5 : 0,
                      shadowRadius: 8,
                      elevation: hasContent ? 4 : 0,
                    },
                    pressed && { opacity: 0.75, transform: [{ scale: 0.92 }] },
                  ]}
                >
                  <Feather
                    name="arrow-up"
                    size={15}
                    color={hasContent ? colors.amberText : colors.textMuted}
                  />
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </View>

      <AttachmentSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAttach={handleAttach}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachmentScroll: { marginBottom: 9 },
  attachmentRow: { gap: 8, paddingHorizontal: 2 },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingRight: 8,
    paddingLeft: 4,
    paddingVertical: 4,
    gap: 6,
    maxWidth: 200,
  },
  attachmentThumb: { width: 32, height: 32, borderRadius: 6 },
  fileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: { flex: 1, fontSize: 12, fontFamily: 'DMSans_400Regular' },
  removeBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -3,
    right: -3,
    borderRadius: 23,
  },
  rowClip: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  attachBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 16,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    paddingHorizontal: 4,
    fontFamily: 'DMSans_400Regular',
  },
  inputEmpty: {
    fontStyle: 'italic',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
