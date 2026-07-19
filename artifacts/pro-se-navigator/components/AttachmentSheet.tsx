import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { usePlan } from '@/hooks/usePlan';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PendingAttachment {
  type: 'image' | 'camera' | 'file';
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onAttach: (attachment: PendingAttachment) => void;
}

interface OptionTileProps {
  icon: string;
  label: string;
  locked?: boolean;
  lockedLabel?: string;
  onPress: () => void;
}

function OptionTile({ icon, label, locked, lockedLabel, onPress }: OptionTileProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.surface },
        locked && { opacity: 0.5 },
        !locked && pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.tileIconWrap}>
        <Feather name={icon as any} size={24} color={locked ? colors.textMuted : colors.text} />
        {locked && (
          <View style={[styles.lockBadge, { backgroundColor: colors.background }]}>
            <Feather name="lock" size={10} color={colors.textMuted} />
          </View>
        )}
      </View>
      <Text style={[styles.tileLabel, { color: locked ? colors.textMuted : colors.text }]}>
        {label}
      </Text>
      {locked && lockedLabel ? (
        <View style={[styles.planBadge, { backgroundColor: colors.amber }]}>
          <Text style={[styles.planBadgeText, { color: colors.amberText }]}>{lockedLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function AttachmentSheet({ visible, onClose, onAttach }: AttachmentSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const plan = usePlan();

  const requestMediaPermission = async (source: 'library' | 'camera') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera access needed', 'Go to Settings and allow camera access for Pro Se Navigator.');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo access needed', 'Go to Settings and allow photo library access for Pro Se Navigator.');
        return false;
      }
    }
    return true;
  };

  const handleImage = async () => {
    onClose();
    const ok = await requestMediaPermission('library');
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAttach({
        type: 'image',
        uri: asset.uri,
        name: asset.fileName ?? `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  const handleCamera = async () => {
    onClose();
    const ok = await requestMediaPermission('camera');
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAttach({
        type: 'camera',
        uri: asset.uri,
        name: `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  // Scan: capture a document with the camera. On web this opens the file/
  // camera capture flow; on device it's a full-frame camera shot. Stored as
  // a 'camera' attachment (same pipeline), named as a scan.
  const handleScan = async () => {
    onClose();
    const ok = await requestMediaPermission('camera');
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAttach({
        type: 'camera',
        uri: asset.uri,
        name: `scan_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  const handleFile = async () => {
    if (!plan.canUploadFile) return;
    onClose();
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'text/plain',
             'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAttach({
        type: 'file',
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        size: asset.size,
      });
    }
  };

  const uploadsLeft =
    plan.uploadLimitPerDay !== null
      ? plan.uploadLimitPerDay - plan.uploadsUsedToday
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.dragBar, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Options</Text>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            hitSlop={8}
          >
            <Feather name="x" size={16} color={colors.text} />
          </Pressable>
        </View>

        {/* Tiles — Image · Camera · File · Scan */}
        <View style={styles.tiles}>
          <OptionTile icon="image" label="Image" onPress={handleImage} />
          <OptionTile icon="camera" label="Camera" onPress={handleCamera} />
          <OptionTile
            icon="file-plus"
            label="File"
            locked={!plan.canUploadFile}
            lockedLabel="Pro"
            onPress={handleFile}
          />
          <OptionTile icon="maximize" label="Scan" onPress={handleScan} />
        </View>

        {/* Upload counter for free plan */}
        {uploadsLeft !== null && (
          <Text style={[styles.uploadCount, { color: colors.textMuted }]}>
            {uploadsLeft} upload{uploadsLeft !== 1 ? 's' : ''} remaining today
          </Text>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Plan-gated feature rows */}
        <FeatureRow
          icon="search"
          label="Web search"
          description="Look up recent case law and filings"
          available
          colors={colors}
        />
        <FeatureRow
          icon="book-open"
          label="Deep research"
          description="In-depth legal analysis and memo"
          available={plan.tier === 'pro' || plan.tier === 'max'}
          planLabel="Pro"
          colors={colors}
        />
        <FeatureRow
          icon="cpu"
          label="Model council"
          description="Multiple AI models cross-check your filing"
          available={plan.tier === 'max'}
          planLabel="Max"
          colors={colors}
        />
      </View>
    </Modal>
  );
}

interface FeatureRowProps {
  icon: string;
  label: string;
  description: string;
  available: boolean;
  planLabel?: string;
  colors: ReturnType<typeof useColors>;
}

function FeatureRow({ icon, label, description, available, planLabel, colors }: FeatureRowProps) {
  return (
    <View style={[styles.featureRow, { opacity: available ? 1 : 0.5 }]}>
      <Feather name={icon as any} size={18} color={available ? colors.text : colors.textMuted} style={styles.featureIcon} />
      <View style={styles.featureText}>
        <View style={styles.featureLabelRow}>
          <Text style={[styles.featureLabel, { color: available ? colors.text : colors.textMuted }]}>
            {label}
          </Text>
          {planLabel && !available && (
            <View style={[styles.planBadge, { backgroundColor: colors.amber }]}>
              <Text style={[styles.planBadgeText, { color: colors.amberText }]}>{planLabel}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{description}</Text>
      </View>
      {!available && <Feather name="lock" size={16} color={colors.textMuted} />}
      {available && <Feather name="check" size={16} color={colors.primary} />}
    </View>
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
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    position: 'relative',
  },
  tileIconWrap: {
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  planBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  uploadCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  featureIcon: {
    width: 22,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
