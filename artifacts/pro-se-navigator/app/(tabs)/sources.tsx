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
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import VerifiedTag from '@/components/VerifiedTag';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerifiedAuthority } from '@/contexts/types';
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
  const { sources, isLoading } = useCases();

  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [results, setResults] = useState<LegalSearchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

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
      <View style={[styles.authorityBadge, { backgroundColor: colors.verifiedBg }]}>
        <Feather name="award" size={11} color={colors.verifiedText} />
        <Text style={[styles.authorityText, { color: colors.verifiedText }]}>
          {authorityLabel(item.sourceType)}
        </Text>
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
});
