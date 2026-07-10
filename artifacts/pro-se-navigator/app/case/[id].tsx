import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import CaseChat from '@/components/CaseChat';
import { CASE_TYPE_LABELS } from '@/components/CaseCard';

export default function CaseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cases, getCaseMessages, isLoading } = useCases();

  const caseItem = cases.find((c) => c.id === id);
  const msgs = caseItem ? getCaseMessages(id) : [];

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!caseItem) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Case not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backFallback} hitSlop={8}>
          <Text style={[styles.backFallbackText, { color: colors.primary }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Minimal top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.titleArea}>
          <Text style={[styles.caseTitle, { color: colors.text }]} numberOfLines={1}>
            {caseItem.title}
          </Text>
          <Text style={[styles.caseType, { color: colors.textMuted }]}>
            {CASE_TYPE_LABELS[caseItem.caseType]}
            {caseItem.court ? ` · ${caseItem.court}` : ''}
          </Text>
        </View>

        <Pressable style={styles.moreBtn} hitSlop={10}>
          <Feather name="more-horizontal" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Full-screen chat */}
      <CaseChat caseId={id} messages={msgs} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4 },
  titleArea: { flex: 1, alignItems: 'center' },
  caseTitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  caseType: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 1,
  },
  moreBtn: { padding: 4 },
  errorText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  backFallback: { marginTop: 8 },
  backFallbackText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
