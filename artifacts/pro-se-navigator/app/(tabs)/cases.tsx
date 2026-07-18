import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import { useAuth } from '@/contexts/AuthContext';
import CaseCard from '@/components/CaseCard';
import SearchBar from '@/components/SearchBar';
import GlobalSearch from '@/components/GlobalSearch';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Case } from '@/contexts/types';

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function deadlineLabel(dueDate: string): string {
  const d = new Date(dueDate + 'T00:00:00');
  if (isNaN(d.getTime())) return 'Deadline set';
  return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** Slowly rotating compass for the empty state (one turn every 6s). */
function RotatingCompass({ color }: { color: string }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Feather name="compass" size={44} color={color} />
    </Animated.View>
  );
}

export default function CasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cases, messages, deadlines, isLoading, refresh, setActiveCase, deleteCase } = useCases();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  // Undo-able delete: the swiped card is hidden immediately and only committed
  // to the DB after a 4s grace period (or right away if superseded).
  const [pendingDelete, setPendingDelete] = useState<Case | null>(null);
  const pendingDeleteRef = useRef<Case | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
  }, []);

  const firstName = user?.name?.split(' ')[0];
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handlePress = (id: string) => {
    setActiveCase(id);
    router.push(`/case/${id}`);
  };

  const handleNew = () => {
    Haptics.selectionAsync();
    router.push('/case/new');
  };

  const togglePin = useCallback((id: string) => {
    Haptics.selectionAsync();
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const requestDelete = useCallback(
    (c: Case) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Commit any already-pending delete before starting a new grace period.
      if (deleteTimer.current) {
        clearTimeout(deleteTimer.current);
        const prev = pendingDeleteRef.current;
        if (prev && prev.id !== c.id) deleteCase(prev.id);
      }
      pendingDeleteRef.current = c;
      setPendingDelete(c);
      deleteTimer.current = setTimeout(() => {
        deleteCase(c.id);
        pendingDeleteRef.current = null;
        setPendingDelete(null);
        deleteTimer.current = null;
      }, 4000);
    },
    [deleteCase],
  );

  const undoDelete = useCallback(() => {
    if (deleteTimer.current) {
      clearTimeout(deleteTimer.current);
      deleteTimer.current = null;
    }
    pendingDeleteRef.current = null;
    Haptics.selectionAsync();
    setPendingDelete(null);
  }, []);

  /** Earliest upcoming deadline for a case, if any. */
  const nextDeadlineFor = (caseId: string): string | undefined => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = deadlines
      .filter((d) => d.caseId === caseId && d.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return upcoming[0] ? deadlineLabel(upcoming[0].dueDate) : undefined;
  };

  // Search filter + pinned-first ordering (excludes the case pending deletion).
  const term = query.trim().toLowerCase();
  const visibleCases = cases
    .filter((c) => !(pendingDelete && c.id === pendingDelete.id))
    .filter(
      (c) =>
        !term ||
        c.title.toLowerCase().includes(term) ||
        c.caseType.toLowerCase().includes(term),
    )
    .sort((a, b) => {
      const ap = pinnedIds.includes(a.id) ? 1 : 0;
      const bp = pinnedIds.includes(b.id) ? 1 : 0;
      return bp - ap; // pinned first, otherwise preserve created-at order
    });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const showList = cases.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={[colors.surface2, 'transparent']}
        style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {greetingForNow()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Your Cases</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setGlobalSearchOpen(true);
              }}
              style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              hitSlop={6}
            >
              <Feather name="search" size={17} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleNew}
              style={({ pressed }) => [
                styles.newBtn,
                { backgroundColor: colors.amber },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={6}
            >
              <Feather name="plus" size={14} color={colors.amberText} />
              <Text style={[styles.newBtnLabel, { color: colors.amberText }]}>New case</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              style={[
                styles.avatarBtn,
                { backgroundColor: colors.primaryDim, borderColor: colors.primaryGlow },
              ]}
              hitSlop={6}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* ── Search filter (only when there are cases) ── */}
      {showList && (
        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Filter your cases…" />
        </View>
      )}

      {!showList ? (
        <View style={styles.empty}>
          <RotatingCompass color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Your legal journey begins here
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            The Navigator guides you through intake and{'\n'}organizes your matter step by step.
          </Text>
          <Pressable
            onPress={handleNew}
            style={({ pressed }) => [
              styles.emptyBtn,
              { backgroundColor: colors.amber },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.amberText }]}>Start a new case</Text>
          </Pressable>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            This is not legal advice. Pro Se Navigator is not a law firm.
          </Text>
        </View>
      ) : visibleCases.length === 0 ? (
        <View style={styles.noMatches}>
          <Feather name="search" size={30} color={colors.textMuted} />
          <Text style={[styles.noMatchesText, { color: colors.textSecondary }]}>
            No cases match "{query.trim()}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleCases}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {'Active · ' + visibleCases.length}
            </Text>
          }
          renderItem={({ item, index }) => {
            const msgs = messages[item.id] || [];
            const last = msgs[msgs.length - 1];
            return (
              <CaseCard
                caseItem={item}
                index={index}
                lastMessage={last?.content}
                messageCount={msgs.length}
                nextDeadline={nextDeadlineFor(item.id)}
                isPinned={pinnedIds.includes(item.id)}
                onPin={() => togglePin(item.id)}
                onPress={() => handlePress(item.id)}
                onDelete={() => requestDelete(item)}
              />
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* ── Undo toast ── */}
      {pendingDelete && (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: colors.surface2,
              borderColor: colors.borderStrong,
              bottom: insets.bottom + 88,
            },
          ]}
        >
          <Feather name="trash-2" size={15} color={colors.textSecondary} />
          <Text style={[styles.toastText, { color: colors.text }]}>Case deleted</Text>
          <Pressable onPress={undoDelete} hitSlop={8}>
            <Text style={[styles.undoText, { color: colors.primary }]}>Undo</Text>
          </Pressable>
        </View>
      )}

      <GlobalSearch visible={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerGradient: {
    minHeight: 120,
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'flex-end',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextBlock: { gap: 2 },
  greeting: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 36,
    shadowColor: '#E8A33D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  newBtnLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingBottom: 10,
    paddingTop: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 21,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 26,
    marginTop: 10,
  },
  emptyBtnText: {
    fontSize: 16,
    fontFamily: 'DMSans_500Medium',
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 18,
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
    fontFamily: 'DMSans_400Regular',
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
  undoText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
});
