import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  SectionList,
  Keyboard,
  Platform,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import {
  useGlobalSearch,
  GlobalResult,
  GlobalResultType,
} from '@/hooks/useGlobalSearch';

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
}

const TYPE_ICON: Record<GlobalResultType, keyof typeof Feather.glyphMap> = {
  case: 'folder',
  message: 'message-circle',
  deadline: 'clock',
  source: 'book-open',
};

/**
 * Full-screen search across cases, messages, deadlines, and sources.
 * Input is debounced 200ms; recent searches (session-only, last 5) show as
 * chips while the query is empty. Purely navigational — no data mutations.
 */
export default function GlobalSearch({ visible, onClose }: GlobalSearchProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setActiveCase } = useCases();

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  // Inside a Modal, useSafeAreaInsets() often reports 0 because the modal
  // renders outside the SafeAreaProvider. Fall back to a sane top spacing so
  // the search field never hides under the status bar / notch.
  const topInset =
    insets.top ||
    (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44);

  const sections = useGlobalSearch(query);

  // Debounce the query feeding the search by 200ms.
  useEffect(() => {
    const t = setTimeout(() => setQuery(input), 200);
    return () => clearTimeout(t);
  }, [input]);

  // Reset the field each time the modal opens.
  useEffect(() => {
    if (visible) {
      setInput('');
      setQuery('');
    }
  }, [visible]);

  const rememberSearch = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecents((prev) => [t, ...prev.filter((r) => r !== t)].slice(0, 5));
  }, []);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (result: GlobalResult) => {
      Haptics.selectionAsync();
      rememberSearch(query);
      close();
      switch (result.type) {
        case 'case':
        case 'message':
          setActiveCase(result.caseId);
          router.push(`/case/${result.caseId}`);
          break;
        case 'deadline':
          router.push('/(tabs)/deadlines');
          break;
        case 'source':
          router.push('/(tabs)/sources');
          break;
      }
    },
    [query, rememberSearch, close, setActiveCase],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topInset + 8 }]}>
        {/* ── Search field ── */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              placeholder="Search cases, messages, sources…"
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => rememberSearch(input)}
            />
            {input.length > 0 && (
              <Pressable onPress={() => setInput('')} hitSlop={8}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={close} hitSlop={8} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
        </View>

        {/* ── Body ── */}
        {!hasQuery ? (
          <View style={styles.emptyWrap}>
            {recents.length > 0 && (
              <View style={styles.recentsWrap}>
                <Text style={[styles.recentsLabel, { color: colors.textMuted }]}>RECENT</Text>
                <View style={styles.recentChips}>
                  {recents.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setInput(r)}
                      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Feather name="clock" size={12} color={colors.textMuted} />
                      <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.hint}>
              <Feather name="search" size={28} color={colors.textMuted} />
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Search your cases, messages, and sources
              </Text>
            </View>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.hint}>
            <Feather name="inbox" size={28} color={colors.textMuted} />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              No matches for "{query.trim()}"
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            renderSectionHeader={({ section }) => (
              <Text style={[styles.sectionHeader, { color: colors.textMuted, backgroundColor: colors.background }]}>
                {section.title}
              </Text>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: colors.surface }]}
              >
                <View style={[styles.resultIcon, { backgroundColor: colors.primaryDim }]}>
                  <Feather name={TYPE_ICON[item.type]} size={15} color={colors.primary} />
                </View>
                <View style={styles.resultBody}>
                  <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={[styles.resultSub, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  cancelBtn: { paddingHorizontal: 2 },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },

  emptyWrap: { flex: 1 },
  recentsWrap: { paddingTop: 8, gap: 10 },
  recentsLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
  },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 200,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  hint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  hintText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    paddingTop: 16,
    paddingBottom: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBody: { flex: 1, gap: 2 },
  resultTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  resultSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
