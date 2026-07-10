import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import VerifiedTag from '@/components/VerifiedTag';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerifiedAuthority } from '@/contexts/types';

export default function SourcesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sources, isLoading } = useCases();

  const renderSource = ({ item }: { item: VerifiedAuthority }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.citation, { color: colors.text }]}>{item.citation}</Text>
        <VerifiedTag status={item.verifiedStatus} label={item.verifiedStatus} />
      </View>
      {item.quote ? (
        <Text style={[styles.quote, { color: colors.textSecondary }]} numberOfLines={3}>
          "{item.quote}"
        </Text>
      ) : null}
      <View style={styles.cardBottom}>
        <Text style={[styles.caseLabel, { color: colors.textMuted }]}>{item.caseTitle}</Text>
        {item.url ? (
          <Pressable
            onPress={() => item.url && Linking.openURL(item.url)}
            hitSlop={8}
            style={styles.urlBtn}
          >
            <Feather name="external-link" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sources</Text>
      </View>

      {sources.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="check-circle" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No verified sources yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Every citation Navigator uses is verified against CourtListener before appearing here. None slip through unverified.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item) => item.id}
          renderItem={renderSource}
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
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  citation: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  quote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caseLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  urlBtn: { padding: 2 },
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
});
