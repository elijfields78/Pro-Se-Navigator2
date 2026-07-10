import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import CaseChat from '@/components/CaseChat';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CASE_TYPE_LABELS } from '@/components/CaseCard';

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
          onPress={() => router.push(`/case/${activeCase.id}`)}
          style={styles.expandBtn}
          hitSlop={8}
        >
          <Feather name="maximize-2" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

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
  caseInfo: { flex: 1 },
  caseName: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  caseType: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  expandBtn: { padding: 4 },
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
