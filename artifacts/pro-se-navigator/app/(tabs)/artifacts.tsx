import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import ArtifactCard from '@/components/ArtifactCard';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaseArtifact } from '@/contexts/types';

function sortByDate(a: CaseArtifact, b: CaseArtifact) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function ArtifactsScreen() {
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
      <View
        style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Artifacts</Text>
        {sorted.length > 0 && (
          <Text style={[styles.headerCount, { color: colors.textMuted }]}>
            {sorted.length} document{sorted.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="folder" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            When Navigator drafts motions, letters, or forms for your cases, they'll be collected here — organized and ready to review or file.
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
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.5 },
  headerCount: { fontSize: 14, fontFamily: 'Inter_400Regular' },
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
