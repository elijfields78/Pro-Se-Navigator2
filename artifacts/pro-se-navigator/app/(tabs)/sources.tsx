import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Modal,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import VerifiedTag from '@/components/VerifiedTag';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerifiedAuthority, Case } from '@/contexts/types';
import {
  searchLegalLibrary,
  isRetrievalConfigured,
  authorityLabel,
  LegalSearchResult,
} from '@/lib/retrievalClient';
import * as Haptics from 'expo-haptics';

type SearchState = 'idle' | 'loading' | 'done' | 'error';

export default function SourcesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sources, cases, addSource, isLoading } = useCases();

  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [results, setResults] = useState<LegalSearchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  // The library result the user is choosing a case for (case-picker modal).
  const [savingResult, setSavingResult] = useState<LegalSearchResult | null>(null);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    Haptics.selectionAsync();
    setSearchState('loading');
    setErrorMsg('');
    try {
      const res = await searchLegalLibrary(q, { limit: 12 });
      setResults(res);
      setSearchState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Search failed. Please try again.');
      setSearchState('error');
    }
  }, [query]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearchState('idle');
    setErrorMsg('');
  }, []);

  const startSaveToCase = useCallback((result: LegalSearchResult) => {
    Haptics.selectionAsync();
    if (cases.length === 0) {
      Alert.alert(
        'No cases yet',
        'Create a case first, then you can save legal authorities to it.',
      );
      return;
    }
    setSavingResult(result);
  }, [cases.length]);

  const saveToCase = useCallback(
    async (caseItem: Case) => {
      const result = savingResult;
      setSavingResult(null);
      if (!result) return;
      try {
        // Saved as 'pending': it's a real primary source, but "verified" in this
        // app means checked against a specific proposition — not yet the case here.
        await addSource({
          caseId: caseItem.id,
          caseTitle: caseItem.title,
          citation: result.citation,
          verifiedStatus: 'pending',
          url: result.url,
          quote: result.excerpt,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved', `${result.citation} was added to "${caseItem.title || 'your case'}".`);
      } catch (err) {
        console.error('[Sources] save to case failed:', err);
        Alert.alert('Could not save', 'This authority could not be saved. Please try again.');
      }
    },
    [savingResult, addSource],
  );

  const renderSavedSource = ({ item }: { item: VerifiedAuthority }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.citation, { color: colors.text }]}>{item.citation}</Text>
        <VerifiedTag status={item.verifiedStatus} label={item.verifiedStatus} />
      </View>
      {item.quote ? (
        <Text style={[styles.quote, { color: colors.textSecondary }]} numberOfLines={3}>
          "{item.quote}"
        </Text>
      ) : null}
      <View style={styles.cardBottom}>
        <Text style={[styles.caseLabel, { color: colors.textMuted }]}>{item.caseTitle}</Text>
        {item.url ? (
          <Pressable onPress={() => item.url && Linking.openURL(item.url)} hitSlop={8} style={styles.urlBtn}>
            <Feather name="external-link" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const renderLibraryResult = ({ item }: { item: LegalSearchResult }) => (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); Linking.openURL(item.url); }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.citation, { color: colors.text }]}>{item.citation}</Text>
        <Feather name="external-link" size={14} color={colors.primary} />
      </View>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>{item.heading}</Text>
      {item.excerpt ? (
        <Text style={[styles.quote, { color: colors.textMuted }]} numberOfLines={3}>
          {item.excerpt}
        </Text>
      ) : null}
      <View style={styles.resultFooter}>
        <View style={[styles.authorityBadge, { backgroundColor: colors.verifiedBg }]}>
          <Feather name="award" size={11} color={colors.verifiedText} />
          <Text style={[styles.authorityText, { color: colors.verifiedText }]}>
            {authorityLabel(item.sourceType)}
          </Text>
        </View>
        <Pressable
          onPress={() => startSaveToCase(item)}
          hitSlop={8}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="bookmark" size={13} color={colors.primary} />
          <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save to case</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const showingSearch = searchState !== 'idle';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sources</Text>
      </View>

      {/* ── Legal library search ── */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search the legal library…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={runSearch}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        {!isRetrievalConfigured() && (
          <Text style={[styles.configNote, { color: colors.textMuted }]}>
            Legal library search will be available once the research service is connected.
          </Text>
        )}
      </View>

      {/* ── Search results ── */}
      {showingSearch ? (
        searchState === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : searchState === 'error' ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.deadlineBg }]}>
              <Feather name="alert-circle" size={28} color={colors.deadlineText} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Search didn't work</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{errorMsg}</Text>
            <Pressable onPress={runSearch} style={[styles.retryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text>
            </Pressable>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="search" size={28} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No matches</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              No authorities in the library matched "{query.trim()}". Try different or broader terms.
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.citation + item.heading}
            renderItem={renderLibraryResult}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListHeaderComponent={
              <Text style={[styles.resultsHeading, { color: colors.textMuted }]}>
                {results.length} result{results.length !== 1 ? 's' : ''} from the legal library
              </Text>
            }
          />
        )
      ) : sources.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="check-circle" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved sources yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Search the legal library above to find the rules and statutes that apply to your case. Verified authorities you save will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item) => item.id}
          renderItem={renderSavedSource}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* ── Case picker (save library result to a case) ── */}
      <Modal
        visible={savingResult !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSavingResult(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setSavingResult(null)} />
        <View
          style={[
            styles.pickerSheet,
            { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={[styles.dragBar, { backgroundColor: colors.border }]} />
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Save to which case?</Text>
          {savingResult ? (
            <Text style={[styles.pickerSub, { color: colors.textMuted }]} numberOfLines={1}>
              {savingResult.citation}
            </Text>
          ) : null}
          <FlatList
            data={cases}
            keyExtractor={(item) => item.id}
            style={styles.pickerList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => saveToCase(item)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  { borderBottomColor: colors.border },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Feather name="folder" size={16} color={colors.primary} />
                <Text style={[styles.pickerRowText, { color: colors.text }]} numberOfLines={1}>
                  {item.title || 'Untitled case'}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.5 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 14, gap: 6 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  configNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 4,
  },
  resultsHeading: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 10,
  },

  list: { paddingHorizontal: 16, paddingTop: 16 },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  citation: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  heading: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  quote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  authorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  authorityText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caseLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  urlBtn: { padding: 2 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  // Case picker sheet
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '70%',
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  pickerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  pickerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, marginBottom: 8 },
  pickerList: { marginTop: 6 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
});
