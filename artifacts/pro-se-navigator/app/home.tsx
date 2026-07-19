import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useDictation } from '@/hooks/useDictation';
import ActivityRow, { AgentActivity } from '@/components/ActivityRow';
import AttachmentSheet, { PendingAttachment } from '@/components/AttachmentSheet';
import {
  askNavigator,
  researchWeb,
  verifyCitations,
  isAiConfigured,
  CitationVerification,
} from '@/lib/aiClient';

/**
 * Home — the app opens here. A general chat: no forced workflow, the same
 * engine underneath. Top bar: profile (opens the Library), search pill,
 * discovery, New case. The conversation shows the agents working — every
 * step labeled with the model doing it.
 */

type Mode = 'navigator' | 'research';

const MODE_META: Record<Mode, { label: string; model: string; working: string }> = {
  navigator: {
    label: 'Navigator',
    model: 'Claude Opus 4.8',
    working: 'Claude Opus 4.8 — reasoning over the legal corpus',
  },
  research: {
    label: 'Research',
    model: 'Sonar Pro',
    working: 'Perplexity Sonar — searching the live web',
  },
};

const VERIFY_LABEL: Record<string, { text: string; kind: 'good' | 'warn' }> = {
  verified: { text: 'Verified · CourtListener', kind: 'good' },
  corroborated: { text: 'Corroborated · live web', kind: 'good' },
  ambiguous: { text: 'Multiple matches', kind: 'warn' },
  unverified: { text: 'Unverified — confirm before relying', kind: 'warn' },
  error: { text: 'Verification error', kind: 'warn' },
};

interface HomeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Model that produced an assistant message — the footnote. */
  model?: string;
  citations?: Array<{ label: string; url?: string }>;
  verification?: CitationVerification[];
  activities?: AgentActivity[];
}

let idSeq = 0;
const nextId = () => `m-${Date.now().toString(36)}-${++idSeq}`;

/** Slow-breathing brand mark for the empty state. */
function BrandMark({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Feather name="compass" size={52} color={color} />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const dictation = useDictation();

  const [messages, setMessages] = useState<HomeMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('navigator');
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const dictationBase = useRef('');

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase();

  // Live dictation streams into the input while listening.
  React.useEffect(() => {
    if (dictation.listening) {
      const joiner = dictationBase.current && dictation.transcript ? ' ' : '';
      setInput(dictationBase.current + joiner + dictation.transcript);
    }
  }, [dictation.transcript, dictation.listening]);

  const toggleMic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    if (!dictation.supported) {
      // Native without a speech engine: keyboard dictation still works.
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content:
            'On this device, tap the microphone on your keyboard to dictate — it types straight into the message box. In-app voice capture arrives with the next native build.',
        },
      ]);
      return;
    }
    dictationBase.current = input.trim();
    dictation.reset();
    dictation.start();
  }, [dictation, input]);

  const updateActivity = useCallback((msgId: string, actId: string, patch: Partial<AgentActivity>) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, activities: (m.activities ?? []).map((a) => (a.id === actId ? { ...a, ...patch } : a)) }
          : m,
      ),
    );
  }, []);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || busy) return;
    if (dictation.listening) dictation.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const attachNote =
      attachments.length > 0
        ? `\n\n[Attached for context: ${attachments.map((a) => a.name).join(', ')}]`
        : '';
    setInput('');
    setAttachments([]);
    setBusy(true);

    const userMsg: HomeMessage = { id: nextId(), role: 'user', content: q };
    const meta = MODE_META[mode];
    const workId = nextId();
    const assistantMsg: HomeMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      activities: [{ id: workId, label: meta.working, model: meta.model, status: 'running' }],
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    try {
      if (!isAiConfigured()) {
        throw new Error('The AI service is not connected yet. Check the API configuration.');
      }

      let text = '';
      let model = meta.model;
      let citations: Array<{ label: string; url?: string }> = [];

      if (mode === 'research') {
        const res = await researchWeb({ query: q + attachNote });
        text = res.text;
        model = 'Perplexity ' + (res.model || 'Sonar');
        citations = res.citations.map((c) => ({ label: c.title ?? c.url, url: c.url }));
      } else {
        const res = await askNavigator({ message: q + attachNote });
        text = res.text;
        model = res.model?.includes('opus') ? 'Claude Opus 4.8' : res.model || meta.model;
        citations = res.citations.map((c) => ({ label: c.citation, url: c.url }));
      }

      updateActivity(assistantMsg.id, workId, { status: 'done' });
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: text, model, citations } : m)),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ── Verification pass — a second, independent agent, shown working ──
      const verifyId = nextId();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                activities: [
                  ...(m.activities ?? []),
                  {
                    id: verifyId,
                    label: 'Verification agent — checking citations against primary sources',
                    model: 'CourtListener + Sonar',
                    status: 'running' as const,
                  },
                ],
              }
            : m,
        ),
      );
      try {
        const checks = await verifyCitations(text);
        updateActivity(assistantMsg.id, verifyId, {
          status: 'done',
          label:
            checks.length === 0
              ? 'Verification agent — no case citations to check'
              : `Verification agent — ${checks.length} citation${checks.length === 1 ? '' : 's'} checked`,
          detail: checks.map(
            (c) => `${c.citation} — ${VERIFY_LABEL[c.status]?.text ?? c.status}${c.caseName ? ` (${c.caseName})` : ''}`,
          ),
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, verification: checks } : m)),
        );
      } catch {
        updateActivity(assistantMsg.id, verifyId, {
          status: 'error',
          label: 'Verification agent — could not reach the verifier',
        });
      }
    } catch (err) {
      updateActivity(assistantMsg.id, workId, { status: 'error' });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: err instanceof Error ? err.message : 'Something went wrong. Please try again.' }
            : m,
        ),
      );
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [input, busy, mode, attachments, dictation, updateActivity]);

  const cycleMode = () => {
    Haptics.selectionAsync();
    setMode((m) => (m === 'navigator' ? 'research' : 'navigator'));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/library');
          }}
          style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/search');
          }}
          style={[styles.searchPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Feather name="search" size={15} color={colors.textMuted} />
          <Text style={[styles.searchPillText, { color: colors.textMuted }]}>Search</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/library?tab=sources');
          }}
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Feather name="book-open" size={16} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/case/new');
          }}
          style={[styles.newCaseBtn, { backgroundColor: colors.amber }]}
          hitSlop={8}
        >
          <Feather name="plus" size={13} color={colors.amberText} />
          <Text style={[styles.newCaseText, { color: colors.amberText }]}>New case</Text>
        </Pressable>
      </View>

      {/* ── Conversation ── */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <BrandMark color={colors.primary} />
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Ask anything, or just tell what happened.{'\n'}The Navigator takes it from there.
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) =>
              m.role === 'user' ? (
                <View key={m.id} style={styles.userRow}>
                  <View style={[styles.userBubble, { backgroundColor: colors.verifiedBg, borderColor: colors.primary + '22' }]}>
                    <Text style={[styles.userText, { color: colors.text }]}>{m.content}</Text>
                  </View>
                </View>
              ) : (
                <View key={m.id} style={styles.aiBlock}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryGlow, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.rule}
                  />
                  <Text style={[styles.aiLabel, { color: colors.primary }]}>NAVIGATOR</Text>

                  {(m.activities ?? []).map((a) => (
                    <ActivityRow key={a.id} activity={a} />
                  ))}

                  {m.content ? (
                    <Text style={[styles.aiText, { color: colors.text }]}>{m.content}</Text>
                  ) : null}

                  {m.citations && m.citations.length > 0 && (
                    <View style={styles.citations}>
                      {m.citations.slice(0, 6).map((c, i) => {
                        const v = m.verification?.find((x) => c.label.includes(x.citation));
                        const badge = v ? VERIFY_LABEL[v.status] : undefined;
                        return (
                          <View
                            key={i}
                            style={[styles.citationChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          >
                            <Text style={[styles.citationText, { color: colors.textSecondary }]} numberOfLines={1}>
                              {c.label}
                            </Text>
                            {badge && (
                              <Text
                                style={[
                                  styles.citationBadge,
                                  { color: badge.kind === 'good' ? colors.verifiedText : colors.deadlineText },
                                ]}
                              >
                                {badge.text}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {m.model && m.content ? (
                    <Text style={[styles.footnote, { color: colors.textMuted }]}>
                      Powered by {m.model}
                      {m.verification && m.verification.length > 0 ? ' · citations checked against primary sources' : ''}
                    </Text>
                  ) : null}
                </View>
              ),
            )}
            <View style={{ height: 12 }} />
          </ScrollView>
        )}

        {/* ── Floating session input ── */}
        <View style={[styles.inputDock, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]}>
          {attachments.length > 0 && (
            <View style={styles.attachRow}>
              {attachments.map((a, i) => (
                <View key={i} style={[styles.attachChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="paperclip" size={11} color={colors.textMuted} />
                  <Text style={[styles.attachName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Pressable onPress={() => setAttachments((p) => p.filter((_, j) => j !== i))} hitSlop={6}>
                    <Feather name="x" size={11} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: colors.surface,
                borderColor: dictation.listening ? colors.primary : colors.borderStrong,
                shadowColor: '#1C1B18',
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={input}
              onChangeText={setInput}
              placeholder={dictation.listening ? 'Listening…' : 'Start a session…'}
              placeholderTextColor={dictation.listening ? colors.primary : colors.textMuted}
              multiline
              maxLength={4000}
              editable={!busy}
            />
            <View style={styles.inputControls}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSheetOpen(true);
                }}
                style={[styles.roundBtn, { borderColor: colors.border }]}
                hitSlop={6}
              >
                <Feather name="plus" size={17} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                onPress={cycleMode}
                style={[styles.modePill, { backgroundColor: colors.surfaceOffset }]}
                hitSlop={6}
              >
                <Feather
                  name={mode === 'navigator' ? 'compass' : 'globe'}
                  size={12}
                  color={colors.textSecondary}
                />
                <Text style={[styles.modeText, { color: colors.textSecondary }]}>
                  {MODE_META[mode].label}
                </Text>
              </Pressable>

              <View style={styles.spacer} />

              <Pressable
                onPress={toggleMic}
                style={[
                  styles.roundBtn,
                  { borderColor: dictation.listening ? colors.primary : colors.border },
                  dictation.listening && { backgroundColor: colors.primaryDim },
                ]}
                hitSlop={6}
              >
                <Feather
                  name={dictation.listening ? 'mic-off' : 'mic'}
                  size={16}
                  color={dictation.listening ? colors.primary : colors.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={send}
                disabled={busy || input.trim().length === 0}
                style={[
                  styles.sendBtn,
                  { backgroundColor: input.trim() && !busy ? colors.amber : colors.surfaceOffset },
                ]}
                hitSlop={6}
              >
                <Feather
                  name="arrow-up"
                  size={16}
                  color={input.trim() && !busy ? colors.amberText : colors.textMuted}
                />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            Not legal advice · Pro Se Navigator is not a law firm
          </Text>
        </View>
      </KeyboardAvoidingView>

      <AttachmentSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAttach={(a) => setAttachments((prev) => [...prev, a])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  searchPillText: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  newCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
  },
  newCaseText: { fontSize: 12.5, fontFamily: 'DMSans_600SemiBold' },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyHint: {
    fontSize: 13.5,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  userRow: { alignItems: 'flex-end', paddingVertical: 8 },
  userBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  userText: { fontSize: 15, fontFamily: 'DMSans_500Medium', lineHeight: 22 },

  aiBlock: { paddingTop: 18, paddingBottom: 8, gap: 6 },
  rule: { height: 1, width: '48%', borderRadius: 1, marginBottom: 4 },
  aiLabel: {
    fontSize: 12.5,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    letterSpacing: 2.2,
    marginBottom: 2,
  },
  aiText: { fontSize: 15, fontFamily: 'DMSans_400Regular', lineHeight: 25, marginTop: 4 },
  citations: { gap: 6, marginTop: 8 },
  citationChip: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    paddingVertical: 7,
    gap: 2,
  },
  citationText: { fontSize: 12.5, fontFamily: 'DMSans_500Medium' },
  citationBadge: { fontSize: 10.5, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.2 },
  footnote: { fontSize: 11, fontFamily: 'DMSans_400Regular', marginTop: 6 },

  inputDock: { paddingHorizontal: 14, paddingTop: 6, gap: 6 },
  attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 200,
  },
  attachName: { flexShrink: 1, fontSize: 11.5, fontFamily: 'DMSans_400Regular' },
  inputCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  input: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 22,
    maxHeight: 130,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  inputControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 11,
  },
  modeText: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  spacer: { flex: 1 },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    fontSize: 10.5,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
  },
});
