import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AttachmentSheet, { PendingAttachment } from './AttachmentSheet';

interface ChatInputProps {
  onSend: (text: string, attachments?: PendingAttachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  placeholder = 'Ask about your case…',
  disabled,
}: ChatInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  const hasContent = text.trim().length > 0 || attachments.length > 0;

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
            backgroundColor: colors.background,
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
              <View key={i} style={[styles.attachmentChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {att.type === 'image' || att.type === 'camera' ? (
                  <Image source={{ uri: att.uri }} style={styles.attachmentThumb} />
                ) : (
                  <View style={[styles.fileIconWrap, { backgroundColor: colors.verifiedBg }]}>
                    <Feather name="file-text" size={14} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.attachmentName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {att.name.length > 18 ? att.name.slice(0, 16) + '…' : att.name}
                </Text>
                <Pressable
                  onPress={() => removeAttachment(i)}
                  hitSlop={6}
                  style={[styles.removeBtn, { backgroundColor: colors.border }]}
                >
                  <Feather name="x" size={10} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input row */}
        <View
          style={[
            styles.row,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* + attachment button — square rounded corners */}
          <Pressable
            style={({ pressed }) => [
              styles.attachBtn,
              {
                backgroundColor: pressed ? colors.border : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSheetOpen(true);
            }}
            disabled={disabled}
          >
            <Feather name="plus" size={17} color={colors.textMuted} />
          </Pressable>

          <TextInput
            style={[
              styles.input,
              { color: colors.text, fontFamily: 'Inter_400Regular' },
            ]}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            editable={!disabled}
            returnKeyType="default"
          />

          {/* Mic */}
          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { backgroundColor: colors.border },
            ]}
            onPress={() => {}}
          >
            <Feather name="mic" size={17} color={colors.textMuted} />
          </Pressable>

          {/* Send — amber glow when active */}
          <Pressable
            onPress={handleSend}
            disabled={!hasContent || disabled}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: hasContent ? colors.amber : colors.border,
                shadowColor: hasContent ? colors.amber : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: hasContent ? 0.45 : 0,
                shadowRadius: 6,
                elevation: hasContent ? 3 : 0,
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
  attachmentName: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular' },
  removeBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
    // Subtle shadow on the pill
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  // Square-ish attachment button
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
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    paddingHorizontal: 4,
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
