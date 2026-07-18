import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import CaseChat from '@/components/CaseChat';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CASE_TYPE_LABELS } from '@/components/CaseCard';
import * as Haptics from 'expo-haptics';
import { Case } from '@/contexts/types';

/** Horizontal case-switcher chips. Slides down into view on mount. */
function CaseSwitcher({
  cases,
  activeId,
  onSelect,
  colors,
}: {
  cases: Case[];
  activeId: string;
  onSelect: (id: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const slide = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [slide, opacity]);

  return (
    <Animated.View
      style={[
        styles.caseSwitcher,
        { borderBottomColor: colors.border, opacity, transform: [{ translateY: slide }] },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.caseSwitcherContent}
      >
        {cases.map((c) => {
          const active = c.id === activeId;
          return (
            <Pressable
              key={c.id}
              onPress={() => {
                if (!active) Haptics.selectionAsync();
                onSelect(c.id);
              }}
              style={[
                styles.caseChip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.primaryForeground : colors.textSecondary,
                  fontSize: 12,
                  fontFamily: 'Inter_500Medium',
                }}
                numberOfLines={1}
              >
                {c.title || 'Untitled'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

export default function ChatTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cases, messages, activeCaseId, isLoading, setActiveCase } = useCases();

  const activeCase =
    cases.find((c) => c.id === activeCaseId) ?? (cases.length > 0 ? cases[0] : null);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!activeCase) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chat</Text>
        </View>
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="message-circle" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No active case</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Open a case from the Cases tab, or create a new one to start chatting with Navigator.
          </Text>
          <Pressable
            onPress={() => router.push('/case/new')}
            style={({ pressed }) => [
              styles.emptyBtn,
              { backgroundColor: colors.amber },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.amberText }]}>New case</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/navigator')}
            style={({ pressed }) => [styles.askAiLink, pressed && { opacity: 0.6 }]}
          >
            <Feather name="zap" size={15} color={colors.primary} />
            <Text style={[styles.askAiLinkText, { color: colors.primary }]}>
              Or ask the Navigator AI anything
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const caseMessages = messages[activeCase.id] || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Minimal header */}
      <View
        style={[
          styles.chatHeader,
          { paddingTop: insets.top + 10, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.push(`/case/${activeCase.id}`)}
          style={styles.caseInfo}
        >
          <Text style={[styles.caseName, { color: colors.text }]} numberOfLines={1}>
            {activeCase.title}
          </Text>
          <Text style={[styles.caseType, { color: colors.textMuted }]}>
            {CASE_TYPE_LABELS[activeCase.caseType]}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/navigator')}
          style={[styles.aiBtn, { backgroundColor: colors.verifiedBg }]}
          hitSlop={8}
        >
          <Feather name="zap" size={13} color={colors.primary} />
          <Text style={[styles.aiBtnText, { color: colors.primary }]}>Ask AI</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/case/${activeCase.id}`)}
          style={styles.expandBtn}
          hitSlop={8}
        >
          <Feather name="maximize-2" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* ── Case switcher (only with more than one case) ── */}
      {cases.length > 1 && (
        <CaseSwitcher
          cases={cases}
          activeId={activeCase.id}
          onSelect={setActiveCase}
          colors={colors}
        />
      )}

      <CaseChat caseId={activeCase.id} messages={caseMessages} />
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
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  caseSwitcher: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  caseSwitcherContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  caseChip: {
    maxWidth: 160,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  caseInfo: { flex: 1 },
  caseName: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  caseType: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  expandBtn: { padding: 4 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  aiBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  askAiLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  askAiLinkText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
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
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
});
