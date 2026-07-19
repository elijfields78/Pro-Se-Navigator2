import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useCases } from '@/contexts/CasesContext';
import ArtifactCard from '@/components/ArtifactCard';
import DeadlineCard from '@/components/DeadlineCard';
import VerifiedTag from '@/components/VerifiedTag';
import { CASE_TYPE_LABELS } from '@/components/CaseCard';
import { downloadArtifact } from '@/lib/downloadArtifact';

/**
 * The Library — slides in from the profile button. Everything you own, one
 * page: your conversations/cases (Inbox), Artifacts, saved Sources, and
 * Deadlines. Settings lives behind the gear; New+ starts a case; the search
 * pill is pinned at the bottom.
 */

type Tab = 'chats' | 'artifacts' | 'sources' | 'deadlines';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'chats', label: 'Inbox', icon: 'message-circle' },
  { key: 'artifacts', label: 'Artifacts', icon: 'folder' },
  { key: 'sources', label: 'Sources', icon: 'book-open' },
  { key: 'deadlines', label: 'Deadlines', icon: 'clock' },
];

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = diff / 60000;
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${Math.floor(mins)} min. ago`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.floor(hours)} hr. ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)} days ago`;
  const weeks = days / 7;
  if (weeks < 5) return `${Math.floor(weeks)} wk. ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const {
    cases, artifacts, sources, deadlines, refresh, setActiveCase, deleteCase,
  } = useCases();

  const initialTab: Tab = (['chats', 'artifacts', 'sources', 'deadlines'] as Tab[]).includes(
    params.tab as Tab,
  )
    ? (params.tab as Tab)
    : 'chats';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Your library';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const openCase = (id: string) => {
    Haptics.selectionAsync();
    setActiveCase(id);
    router.push(`/case/${id}`);
  };

  const sortedDeadlines = useMemo(
    () => [...deadlines].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [deadlines],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header: gear · name · forward ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/settings');
          }}
          style={[styles.roundBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Feather name="settings" size={17} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          style={[styles.roundBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Feather name="arrow-right" size={17} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* ── Section tabs ── */}
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(t.key);
              }}
              style={[
                styles.tabChip,
                {
                  backgroundColor: active ? colors.primaryDim : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather name={t.icon as any} size={13} color={active ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 150 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {tab === 'chats' &&
          (cases.length === 0 ? (
            <EmptyNote icon="message-circle" text="No conversations yet. Start a session or open a new case." colors={colors} />
          ) : (
            cases.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => openCase(c.id)}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  deleteCase(c.id);
                }}
                delayLongPress={600}
                style={({ pressed }) => [
                  styles.inboxRow,
                  { borderBottomColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.inboxBody}>
                  <Text style={[styles.inboxTitle, { color: colors.text }]} numberOfLines={1}>
                    {c.title || 'Untitled case'}
                  </Text>
                  <Text style={[styles.inboxMeta, { color: colors.textMuted }]}>
                    {timeAgo(c.lastMessageAt || c.createdAt)} · {CASE_TYPE_LABELS[c.caseType]}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            ))
          ))}

        {tab === 'artifacts' &&
          (artifacts.length === 0 ? (
            <EmptyNote icon="folder" text="Drafted documents will collect here — ready to review and download." colors={colors} />
          ) : (
            <View style={styles.cardList}>
              {artifacts.map((a) => (
                <ArtifactCard
                  key={a.id}
                  artifact={a}
                  showCaseTitle
                  onDownload={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    downloadArtifact(a).catch(() => {});
                  }}
                />
              ))}
            </View>
          ))}

        {tab === 'sources' &&
          (sources.length === 0 ? (
            <EmptyNote icon="book-open" text="Verified authorities you save will appear here." colors={colors} />
          ) : (
            <View style={styles.cardList}>
              {sources.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => s.url && Linking.openURL(s.url)}
                  disabled={!s.url}
                  style={({ pressed }) => [
                    styles.sourceCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && s.url ? { opacity: 0.85 } : null,
                  ]}
                >
                  <View style={styles.sourceTop}>
                    <Text style={[styles.sourceCitation, { color: colors.text }]} numberOfLines={2}>
                      {s.citation}
                    </Text>
                    <VerifiedTag status={s.verifiedStatus} label={s.verifiedStatus} />
                  </View>
                  <Text style={[styles.sourceCase, { color: colors.textMuted }]} numberOfLines={1}>
                    {s.caseTitle}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}

        {tab === 'deadlines' &&
          (sortedDeadlines.length === 0 ? (
            <EmptyNote icon="clock" text="Computed deadlines appear here as your cases develop." colors={colors} />
          ) : (
            <View style={styles.cardList}>
              {sortedDeadlines.map((d) => (
                <DeadlineCard key={d.id} deadline={d} showCaseTitle />
              ))}
            </View>
          ))}
      </ScrollView>

      {/* ── Floating New+ ── */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/case/new');
        }}
        style={[styles.newFab, { backgroundColor: colors.primary, bottom: insets.bottom + 76 }]}
      >
        <Text style={[styles.newFabText, { color: colors.primaryForeground }]}>New</Text>
        <Feather name="plus" size={15} color={colors.primaryForeground} />
      </Pressable>

      {/* ── Bottom search pill ── */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/search');
        }}
        style={[
          styles.searchDock,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderStrong,
            bottom: insets.bottom + 14,
          },
        ]}
      >
        <Feather name="search" size={16} color={colors.textMuted} />
        <Text style={[styles.searchDockText, { color: colors.textMuted }]}>Search</Text>
      </Pressable>
    </View>
  );
}

function EmptyNote({
  icon,
  text,
  colors,
}: {
  icon: string;
  text: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.emptyNote}>
      <Feather name={icon as any} size={26} color={colors.textMuted} />
      <Text style={[styles.emptyNoteText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  userName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: -0.2,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tabLabel: { fontSize: 12.5, fontFamily: 'DMSans_500Medium' },
  content: { paddingHorizontal: 16, paddingTop: 6 },

  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inboxBody: { flex: 1, gap: 3 },
  inboxTitle: { fontSize: 15.5, fontFamily: 'DMSans_500Medium' },
  inboxMeta: { fontSize: 12, fontFamily: 'DMSans_400Regular' },

  cardList: { gap: 10, paddingTop: 6 },
  sourceCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 7,
  },
  sourceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sourceCitation: { flex: 1, fontSize: 14, fontFamily: 'DMSans_500Medium', lineHeight: 20 },
  sourceCase: { fontSize: 12, fontFamily: 'DMSans_400Regular' },

  emptyNote: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 70,
    paddingHorizontal: 40,
  },
  emptyNoteText: {
    fontSize: 13.5,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },

  newFab: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 22,
    paddingHorizontal: 18,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  newFabText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  searchDock: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  searchDockText: { fontSize: 14.5, fontFamily: 'DMSans_400Regular' },
});
