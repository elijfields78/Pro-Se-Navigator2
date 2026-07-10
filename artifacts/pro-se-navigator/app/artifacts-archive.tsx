import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import ArtifactCard from '@/components/ArtifactCard';
import { CaseArtifact } from '@/contexts/types';

function sortByDate(a: CaseArtifact, b: CaseArtifact) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function ArtifactsArchiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { artifacts, deleteArtifact, isLoading } = useCases();

  const sorted = [...artifacts].sort(sortByDate);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 10, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.titleArea}>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Artifacts</Text>
          {sorted.length > 0 && (
            <Text style={[styles.topBarCount, { color: colors.textMuted }]}>
              {sorted.length} document{sorted.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="folder" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            When Navigator drafts motions, letters, or forms for your cases, they'll be collected
            here — organized and ready to review or file.
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Document drafting is available once AI is connected (Phase 6).
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArtifactCard
              artifact={item}
              showCaseTitle
              onDelete={() => deleteArtifact(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, width: 36 },
  titleArea: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  topBarTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  topBarCount: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
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
  note: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
