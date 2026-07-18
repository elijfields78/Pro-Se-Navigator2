import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import DeadlineCard from '@/components/DeadlineCard';
import SearchBar from '@/components/SearchBar';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Deadline } from '@/contexts/types';
import * as Haptics from 'expo-haptics';

type Urgency = 'overdue' | 'week' | 'later';
interface Section {
  title: string;
  data: Deadline[];
  urgency: Urgency;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sortByDate(a: Deadline, b: Deadline) {
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

/** A deadline card that resolves (session-only) when swiped right. */
function SwipeableDeadline({
  deadline,
  onResolve,
  colors,
}: {
  deadline: Deadline;
  onResolve: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const ref = useRef<Swipeable>(null);
  return (
    <Swipeable
      ref={ref}
      friction={2}
      leftThreshold={40}
      renderLeftActions={() => (
        <View style={[styles.resolveAction, { backgroundColor: colors.primary }]}>
          <Feather name="check" size={20} color={colors.primaryForeground} />
          <Text style={[styles.resolveLabel, { color: colors.primaryForeground }]}>Resolve</Text>
        </View>
      )}
      onSwipeableOpen={(direction) => {
        // Left actions open on a right-swipe.
        if (direction === 'left') {
          ref.current?.close();
          onResolve();
        }
      }}
    >
      <DeadlineCard deadline={deadline} showCaseTitle />
    </Swipeable>
  );
}

export default function DeadlinesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { deadlines, isLoading, refresh } = useCases();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const resolveDeadline = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResolvedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const term = query.trim().toLowerCase();
  const sorted = [...deadlines]
    .filter((d) => !resolvedIds.includes(d.id))
    .filter(
      (d) =>
        !term ||
        d.description.toLowerCase().includes(term) ||
        d.caseTitle.toLowerCase().includes(term),
    )
    .sort(sortByDate);

  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  const overdue = sorted.filter((d) => new Date(d.dueDate) < today);
  const thisWeek = sorted.filter(
    (d) => new Date(d.dueDate) >= today && new Date(d.dueDate) <= in7Days,
  );
  const later = sorted.filter((d) => new Date(d.dueDate) > in7Days);

  const sections: Section[] = [
    overdue.length > 0 && { title: '⚠️  Overdue', data: overdue, urgency: 'overdue' as const },
    thisWeek.length > 0 && { title: '🔔  This Week', data: thisWeek, urgency: 'week' as const },
    later.length > 0 && { title: 'Upcoming', data: later, urgency: 'later' as const },
  ].filter(Boolean) as Section[];

  const headerColor = (urgency: Urgency) =>
    urgency === 'overdue'
      ? colors.destructive
      : urgency === 'week'
        ? colors.deadlineText
        : colors.textMuted;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const hasAnyDeadlines = deadlines.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Deadlines</Text>
      </View>

      {hasAnyDeadlines && (
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Filter deadlines…" />
        </View>
      )}

      {!hasAnyDeadlines ? (
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
      ) : sections.length === 0 ? (
        <View style={styles.noMatches}>
          <Feather name="check-circle" size={30} color={colors.textMuted} />
          <Text style={[styles.noMatchesText, { color: colors.textSecondary }]}>
            {term ? `No deadlines match "${query.trim()}"` : 'All deadlines resolved'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                { color: headerColor((section as Section).urgency), backgroundColor: colors.background },
              ]}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <SwipeableDeadline
              deadline={item}
              onResolve={() => resolveDeadline(item.id)}
              colors={colors}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
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
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.4,
    paddingTop: 14,
    paddingBottom: 8,
  },
  resolveAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 92,
    gap: 4,
    borderRadius: 16,
    marginRight: 10,
  },
  resolveLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
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
  noMatches: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  noMatchesText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
