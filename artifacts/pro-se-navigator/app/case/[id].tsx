import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  FlatList,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import CaseChat from '@/components/CaseChat';
import ArtifactCard from '@/components/ArtifactCard';
import { CASE_TYPE_LABELS } from '@/components/CaseCard';
import * as Haptics from 'expo-haptics';

type CaseDetailViewMode = 'chat' | 'artifacts';

export default function CaseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cases, getCaseMessages, artifacts, deleteCase, updateCaseTitle, deleteArtifact, isLoading } = useCases();

  const [activeView, setActiveView] = useState<CaseDetailViewMode>('chat');
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  const caseItem = cases.find((c) => c.id === id);
  const msgs = caseItem ? getCaseMessages(id) : [];
  const caseArtifacts = artifacts
    .filter((a) => a.caseId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!caseItem) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Case not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backFallback} hitSlop={8}>
          <Text style={[styles.backFallbackText, { color: colors.primary }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const handleMenuOpen = () => {
    Haptics.selectionAsync();
    setMenuVisible(true);
  };

  const handleRename = () => {
    setMenuVisible(false);
    setRenameText(caseItem.title);
    setRenameVisible(true);
  };

  const handleRenameSave = () => {
    const trimmed = renameText.trim();
    if (trimmed) updateCaseTitle(id, trimmed);
    setRenameVisible(false);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      caseItem.title || 'This case',
      'Delete this case? All messages, deadlines, documents, and sources will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCase(id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.titleArea}>
          <Text style={[styles.caseTitle, { color: colors.text }]} numberOfLines={1}>
            {caseItem.title}
          </Text>
          <Text style={[styles.caseType, { color: colors.textMuted }]}>
            {CASE_TYPE_LABELS[caseItem.caseType]}
            {caseItem.court ? ` · ${caseItem.court}` : ''}
          </Text>
        </View>

        <Pressable style={styles.moreBtn} hitSlop={10} onPress={handleMenuOpen}>
          <Feather name="more-horizontal" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* ── Chat / Artifacts segmented control ── */}
      <View style={[styles.segmentRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable
          style={[styles.segmentTab, activeView === 'chat' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveView('chat')}
        >
          <Text style={[styles.segmentLabel, { color: activeView === 'chat' ? colors.primary : colors.textMuted }]}>
            Chat
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentTab, activeView === 'artifacts' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveView('artifacts')}
        >
          <Text style={[styles.segmentLabel, { color: activeView === 'artifacts' ? colors.primary : colors.textMuted }]}>
            Artifacts
          </Text>
          {caseArtifacts.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBadgeText}>{caseArtifacts.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Content ── */}
      {activeView === 'chat' ? (
        <CaseChat caseId={id} messages={msgs} />
      ) : (
        <ArtifactsView
          artifacts={caseArtifacts}
          onDelete={deleteArtifact}
          insets={insets}
          colors={colors}
        />
      )}

      {/* ── Case actions menu ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)} />
        <View style={[styles.menu, { backgroundColor: colors.surface, shadowColor: '#000' }]}>
          <MenuRow
            icon="edit-2"
            label="Rename case"
            colors={colors}
            onPress={handleRename}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="trash-2"
            label="Delete case"
            colors={colors}
            destructive
            onPress={handleDelete}
          />
        </View>
      </Modal>

      {/* ── Rename modal ── */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
        statusBarTranslucent
      >
        <RNKeyboardAvoidingView
          style={styles.renameOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRenameVisible(false)} />
          <View style={[styles.renameCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.renameTitle, { color: colors.text }]}>Rename case</Text>
            <TextInput
              style={[styles.renameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Case title"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleRenameSave}
            />
            <View style={styles.renameActions}>
              <Pressable
                style={({ pressed }) => [styles.renameBtn, { backgroundColor: colors.background }, pressed && { opacity: 0.7 }]}
                onPress={() => setRenameVisible(false)}
              >
                <Text style={[styles.renameBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.renameBtn, { backgroundColor: colors.amber }, pressed && { opacity: 0.7 }]}
                onPress={handleRenameSave}
              >
                <Text style={[styles.renameBtnText, { color: colors.amberText }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </RNKeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ── Artifacts list ──────────────────────────────────────────────────────── */
function ArtifactsView({
  artifacts,
  onDelete,
  insets,
  colors,
}: {
  artifacts: ReturnType<typeof useCases>['artifacts'];
  onDelete: (id: string) => void;
  insets: { bottom: number };
  colors: ReturnType<typeof useColors>;
}) {
  if (artifacts.length === 0) {
    return (
      <View style={styles.emptyArtifacts}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.verifiedBg }]}>
          <Feather name="folder" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          Navigator will save drafted motions, letters, and forms here as your case develops.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={artifacts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ArtifactCard artifact={item} onDelete={() => onDelete(item.id)} />
      )}
      contentContainerStyle={[styles.artifactList, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

/* ── Menu row ────────────────────────────────────────────────────────────── */
function MenuRow({
  icon,
  label,
  destructive,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const color = destructive ? colors.destructive : colors.text;
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.65 }]}
      onPress={onPress}
    >
      <Feather name={icon as any} size={17} color={color} />
      <Text style={[styles.menuRowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, alignItems: 'center' },
  caseTitle: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  caseType: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 1 },
  moreBtn: { padding: 4 },

  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
  },
  segmentLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },

  // Artifacts view
  emptyArtifacts: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
  artifactList: { paddingHorizontal: 16, paddingTop: 16 },

  // Actions menu
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menu: {
    position: 'absolute',
    top: 90,
    right: 16,
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 200,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

  // Rename modal
  renameOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  renameCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  renameTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  renameActions: { flexDirection: 'row', gap: 10 },
  renameBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  renameBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },

  errorText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  backFallback: { marginTop: 8 },
  backFallbackText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
