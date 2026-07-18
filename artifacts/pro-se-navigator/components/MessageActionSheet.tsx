import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MessageActionSheetProps {
  /** The message content the actions operate on; null hides the sheet. */
  content: string | null;
  onClose: () => void;
  /** Called with the message content when the user picks "Quote Reply". */
  onQuote: (content: string) => void;
}

/** Bottom action sheet shown on long-press of a chat message. */
export default function MessageActionSheet({ content, onClose, onQuote }: MessageActionSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const visible = content !== null;

  const handleCopy = async () => {
    if (content) await Clipboard.setStringAsync(content);
    Haptics.selectionAsync();
    onClose();
  };

  const handleQuote = () => {
    if (content) onQuote(content);
    Haptics.selectionAsync();
    onClose();
  };

  const handleShare = async () => {
    onClose();
    if (!content) return;
    try {
      await Share.share({ message: content });
    } catch (err) {
      console.error('[MessageActionSheet] share failed:', err);
      Alert.alert('Could not share', 'This message could not be shared.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <View style={[styles.dragBar, { backgroundColor: colors.border }]} />
        {content ? (
          <Text style={[styles.preview, { color: colors.textMuted }]} numberOfLines={2}>
            {content}
          </Text>
        ) : null}
        <Row icon="copy" label="Copy" colors={colors} onPress={handleCopy} />
        <Row icon="corner-up-left" label="Quote Reply" colors={colors} onPress={handleQuote} />
        <Row icon="share" label="Share" colors={colors} onPress={handleShare} />
      </View>
    </Modal>
  );
}

function Row({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <Feather name={icon} size={18} color={colors.textSecondary} />
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  preview: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
});
