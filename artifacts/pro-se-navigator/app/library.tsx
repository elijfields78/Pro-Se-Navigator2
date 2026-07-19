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
 * The Library — slides in from the profile button, laid out like the
 * reference: a stacked list of quick-link rows on top (Artifacts, Sources,
 * Deadlines), then the Inbox — every conversation/case stacked below.
 * Tapping a quick-link drills into that collection. Settings behind the gear;
 * New+ floats; search pinned at the bottom.
 */

type Section = 'artifacts' | 'sources' | 'deadlines';

const QUICK_LINKS: { key: Section; label: string; icon: string }[] = [
  { key: 'artifacts', label: 'Artifacts', icon: 'folder' },
  { key: 'sources', label: 'Sources', icon: 'book-open' },
  { key: 'deadlines', label: 'Deadlines', icon: 'clock' },
];

const SECTION_TITLE: Record<Section, string> = {
  artifacts: 'Artifacts',
  sources: 'Sources',
  deadlines: 'Deadlines',
};

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

  // A deep-link (?tab=sources) opens straight into that collection.
  const initialSection: Section | null = (['artifacts', 'sources', 'deadlines'] as Section[]).includes(
    params.tab as Section,
  )
    ? (params.tab as Section)
    : null;
  const [section, setSection] = useState<Section | null>(initialSection);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Your library';

  const counts: Record<Section, number> = {
    artifacts: artifacts.length,
    sources: sources.length,
    deadlines: deadlines.length,
  };

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

  const goBack = () => {
    Haptics.selectionAsync();
    if (section) setSection(null);
    else router.back();
  };

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
          onPress={goBack}
          style={[styles.roundBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Feather name="arrow-right" size={17} color={colors.textSecondary} />
        </Pressable>
      </View>

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
        {section === null ? (
          <>
            {/* ── Quick-links (stacked rows on top) ── */}
            {QUICK_LINKS.map((q) => (
              <Pressable
                key={q.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSection(q.key);
                }}
                style={({ pressed }) => [styles.quickRow, pressed && { opacity: 0.6 }]}
              >
                <Feather name={q.icon as any} size={19} color={colors.text} style={styles.quickIcon} />
                <Text style={[styles.quickLabel, { color: colors.text }]}>{q.label}</Text>
                {counts[q.key] > 0 && (
                  <Text style={[styles.quickCount, { color: colors.textMuted }]}>{counts[q.key]}</Text>
                )}
                <Feather name="chevron-right" size={17} color={colors.textMuted} />
              </Pressable>
            ))}

            {/* ── Divider ── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ── Inbox (all chats/cases, stacked) ── */}
            <Text style={[styles.inboxHeader, { color: colors.text }]}>Inbox</Text>
            {cases.length === 0 ? (
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
                    pressed && { opacity: 0.6 },
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
            )}
          </>
        ) : (
          <>
            {/* ── Collection drill-down ── */}
            <Pressable onPress={goBack} style={styles.backRow} hitSlop={8}>
              <Feather name="chevron-left" size={18} color={colors.primary} />
              <Text style={[styles.backText, { color: colors.primary }]}>Library</Text>
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{SECTION_TITLE[section]}</Text>

            {section === 'artifacts' &&
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

            {section === 'sources' &&
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

            {section === 'deadlines' &&
              (sortedDeadlines.length === 0 ? (
                <EmptyNote icon="clock" text="Computed deadlines appear here as your cases develop." colors={colors} />
              ) : (
                <View style={styles.cardList}>
                  {sortedDeadlines.map((d) => (
                    <DeadlineCard key={d.id} deadline={d} showCaseTitle />
                  ))}
                </View>
              ))}
          </>
        )}
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
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Quick-links
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
  },
  quickIcon: { width: 22, textAlign: 'center' },
  quickLabel: { flex: 1, fontSize: 17, fontFamily: 'DMSans_600SemiBold', letterSpacing: -0.2 },
  quickCount: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },

  // Inbox
  inboxHeader: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.4,
    marginBottom: 6,
    marginTop: 2,
  },
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inboxBody: { flex: 1, gap: 3 },
  inboxTitle: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', letterSpacing: -0.2 },
  inboxMeta: { fontSize: 12.5, fontFamily: 'DMSans_400Regular' },

  // Collection drill-down
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  backText: { fontSize: 15, fontFamily: 'DMSans_500Medium' },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  cardList: { gap: 10 },
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
    paddingTop: 60,
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
