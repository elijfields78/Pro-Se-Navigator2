import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import DeadlineCard from '@/components/DeadlineCard';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Deadline } from '@/contexts/types';

function sortByDate(a: Deadline, b: Deadline) {
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

export default function DeadlinesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deadlines, isLoading } = useCases();

  const sorted = [...deadlines].sort(sortByDate);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Deadlines</Text>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.deadlineBg }]}>
            <Feather name="clock" size={30} color={colors.deadlineText} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No deadlines yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Navigator computes deadlines deterministically — using federal Rule 6 counting,
            excluding weekends and federal holidays. They'll appear here as your cases develop.
          </Text>
          <Text style={[styles.note, { color: colors.textMuted }]}>
            Always confirm computed deadlines against your court's local rules.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DeadlineCard deadline={item} showCaseTitle />}
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
