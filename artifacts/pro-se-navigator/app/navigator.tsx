import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import { CASE_TYPE_LABELS } from '@/components/CaseCard';
import {
  askNavigator,
  researchWeb,
  draftDocument,
  isAiConfigured,
  type AiCitation,
  type ResearchCitation,
  type DraftType,
} from '@/lib/aiClient';

type Mode = 'explain' | 'research' | 'draft';

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'explain', label: 'Explain', icon: 'help-circle' },
  { key: 'research', label: 'Research', icon: 'search' },
  { key: 'draft', label: 'Draft', icon: 'edit-3' },
];

const DRAFT_TYPES: { key: DraftType; label: string }[] = [
  { key: 'motion', label: 'Motion' },
  { key: 'letter', label: 'Letter' },
  { key: 'form', label: 'Form' },
  { key: 'other', label: 'Other' },
];

const AGENT_LABEL: Record<Mode, string> = {
  explain: 'Legal Analyst',
  research: 'Research Agent',
  draft: 'Drafting Agent',
};

interface Turn {
  id: string;
  role: 'user' | 'agent';
  mode: Mode;
  text: string;
  citations?: Array<{ n?: number; title?: string; citation?: string; url: string }>;
  placeholders?: string[];
  disclaimer?: string;
  model?: string;
  error?: boolean;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function NavigatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cases, activeCaseId } = useCases();

  const [mode, setMode] = useState<Mode>('explain');
  const [draftType, setDraftType] = useState<DraftType>('motion');
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const activeCase =
    cases.find((c) => c.id === activeCaseId) ?? (cases.length > 0 ? cases[0] : null);
  const caseContext = activeCase
    ? `${activeCase.title || 'Untitled case'} (${CASE_TYPE_LABELS[activeCase.caseType]})${
        activeCase.court ? `, ${activeCase.court}` : ''
      }`
    : undefined;

  const configured = isAiConfigured();

  const send = useCallback(async () => {
    const value = input.trim();
    if (!value || busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentMode = mode;
    const userTurn: Turn = { id: genId(), role: 'user', mode: currentMode, text: value };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setBusy(true);

    try {
      let agentTurn: Turn;
      if (currentMode === 'research') {
        const res = await researchWeb({ query: value, caseContext });
        agentTurn = {
          id: genId(),
          role: 'agent',
          mode: currentMode,
          text: res.text,
          citations: res.citations.map((c: ResearchCitation) => ({ title: c.title, url: c.url })),
          model: res.model,
        };
      } else if (currentMode === 'draft') {
        const res = await draftDocument({
          documentType: draftType,
          instructions: value,
          caseType: activeCase?.caseType,
          caseContext,
        });
        agentTurn = {
          id: genId(),
          role: 'agent',
          mode: currentMode,
          text: res.text,
          citations: res.citations.map((c: AiCitation) => ({ n: c.n, citation: c.citation, url: c.url })),
          placeholders: res.placeholders,
          disclaimer: res.disclaimer,
          model: res.model,
        };
      } else {
        const res = await askNavigator({
          message: value,
          caseType: activeCase?.caseType,
          caseContext,
        });
        agentTurn = {
          id: genId(),
          role: 'agent',
          mode: currentMode,
          text: res.text,
          citations: res.citations.map((c: AiCitation) => ({ n: c.n, citation: c.citation, url: c.url })),
          model: res.model,
        };
      }
      setTurns((prev) => [...prev, agentTurn]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          id: genId(),
          role: 'agent',
          mode: currentMode,
          text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [input, busy, mode, draftType, activeCase, caseContext]);

  const placeholder =
    mode === 'research'
      ? 'Research case law, rules, or your rights…'
      : mode === 'draft'
        ? `Describe the ${draftType} you need drafted…`
        : 'Ask about your case, a motion, a deadline, or your rights…';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.titleArea}>
          <Text style={[styles.title, { color: colors.text }]}>Navigator</Text>
          {activeCase ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {activeCase.title || 'Untitled case'}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.threadContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {/* One-time session disclaimer */}
          <View style={[styles.disclaimerBanner, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="info" size={13} color={colors.verifiedText} />
            <Text style={[styles.disclaimerText, { color: colors.verifiedText }]}>
              Pro Se Navigator provides legal information, not legal advice. Always verify with a
              licensed attorney in your jurisdiction.
            </Text>
          </View>

          {!configured && (
            <View style={[styles.notice, { backgroundColor: colors.deadlineBg }]}>
              <Text style={[styles.noticeText, { color: colors.deadlineText }]}>
                The AI assistant isn't connected yet. Ask your administrator to configure the research
                service.
              </Text>
            </View>
          )}

          {turns.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                How can I help with your case?
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Pick a mode below, then ask a question. I ground answers in real legal authorities and
                show my sources.
              </Text>
            </View>
          )}

          {turns.map((turn) =>
            turn.role === 'user' ? (
              <View key={turn.id} style={styles.userRow}>
                <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
                  <Text style={styles.userText}>{turn.text}</Text>
                </View>
              </View>
            ) : (
              <AgentBubble key={turn.id} turn={turn} colors={colors} />
            ),
          )}

          {busy && (
            <View style={styles.agentRow}>
              <View style={[styles.agentLabelRow]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.agentLabel, { color: colors.textMuted }]}>
                  {mode === 'research'
                    ? 'Researching…'
                    : mode === 'draft'
                      ? 'Drafting…'
                      : 'Analyzing…'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Draft-type selector */}
        {mode === 'draft' && (
          <View style={[styles.draftTypes, { borderTopColor: colors.border }]}>
            {DRAFT_TYPES.map((t) => {
              const active = draftType === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => { Haptics.selectionAsync(); setDraftType(t.key); }}
                  style={[
                    styles.draftTypeChip,
                    { borderColor: colors.border },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.draftTypeText,
                      { color: active ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Mode chips */}
        <View style={[styles.modeRow, { borderTopColor: colors.border }]}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => { Haptics.selectionAsync(); setMode(m.key); }}
                style={[
                  styles.modeChip,
                  { backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
              >
                <Feather name={m.icon as any} size={13} color={active ? '#fff' : colors.textSecondary} />
                <Text style={[styles.modeText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Input */}
        <View
          style={[
            styles.inputBar,
            { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!busy}
          />
          <Pressable
            onPress={send}
            disabled={busy || !input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: colors.amber, opacity: busy || !input.trim() ? 0.5 : 1 },
            ]}
          >
            <Feather name="arrow-up" size={20} color={colors.amberText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function AgentBubble({ turn, colors }: { turn: Turn; colors: ReturnType<typeof useColors> }) {
  if (turn.error) {
    return (
      <View style={styles.agentRow}>
        <View style={[styles.errorBubble, { backgroundColor: colors.deadlineBg }]}>
          <Feather name="alert-circle" size={14} color={colors.deadlineText} />
          <Text style={[styles.errorText, { color: colors.deadlineText }]}>{turn.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.agentRow}>
      <View style={styles.agentLabelRow}>
        <Feather name="compass" size={13} color={colors.primary} />
        <Text style={[styles.agentLabel, { color: colors.textMuted }]}>{AGENT_LABEL[turn.mode]}</Text>
      </View>

      {/* Draft review banner */}
      {turn.disclaimer ? (
        <View style={[styles.draftBanner, { backgroundColor: colors.deadlineBg }]}>
          <Feather name="alert-triangle" size={13} color={colors.deadlineText} />
          <Text style={[styles.draftBannerText, { color: colors.deadlineText }]}>{turn.disclaimer}</Text>
        </View>
      ) : null}

      <Text style={[styles.agentText, { color: colors.text }]}>{turn.text}</Text>

      {/* Placeholders to fill in (drafts) */}
      {turn.placeholders && turn.placeholders.length > 0 ? (
        <View style={[styles.placeholderBox, { borderColor: colors.border }]}>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>You still need to fill in:</Text>
          {turn.placeholders.map((p, i) => (
            <Text key={i} style={[styles.placeholderItem, { color: colors.textSecondary }]}>
              • {p}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Sources */}
      {turn.citations && turn.citations.length > 0 ? (
        <View style={styles.citations}>
          <Text style={[styles.citationsTitle, { color: colors.textMuted }]}>Sources</Text>
          {turn.citations.map((c, i) => (
            <Pressable
              key={i}
              onPress={() => Linking.openURL(c.url)}
              style={({ pressed }) => [
                styles.citationRow,
                { borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.citationNum, { color: colors.primary }]}>
                {c.n != null ? `[${c.n}]` : `[${i + 1}]`}
              </Text>
              <Text style={[styles.citationText, { color: colors.text }]} numberOfLines={2}>
                {c.citation ?? c.title ?? c.url}
              </Text>
              <Feather name="external-link" size={13} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.2 },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },

  threadContent: { padding: 16, gap: 14, paddingBottom: 24 },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 12,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  notice: { padding: 12, borderRadius: 12 },
  noticeText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },

  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },

  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderBottomRightRadius: 4 },
  userText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 21 },

  agentRow: { gap: 8 },
  agentLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agentLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  agentText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },

  draftBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10 },
  draftBannerText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 17 },

  placeholderBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 4 },
  placeholderTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  placeholderItem: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  citations: { gap: 6, marginTop: 2 },
  citationsTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  citationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  citationNum: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  citationText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },

  errorBubble: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },

  draftTypes: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  draftTypeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  draftTypeText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
