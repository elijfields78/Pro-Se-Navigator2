import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import { useAuth } from '@/contexts/AuthContext';
import CaseCard from '@/components/CaseCard';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function CasesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cases, messages, isLoading, setActiveCase, deleteCase } = useCases();
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? '?').toUpperCase();

  const handlePress = (id: string) => {
    setActiveCase(id);
    router.push(`/case/${id}`);
  };

  const handleNew = () => {
    Haptics.selectionAsync();
    router.push('/case/new');
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.avatarBtn, { backgroundColor: colors.verifiedBg }]}
          hitSlop={6}
        >
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cases</Text>
        <Pressable
          onPress={handleNew}
          style={[styles.newBtn, { backgroundColor: colors.amber }]}
          hitSlop={6}
        >
          <Feather name="plus" size={18} color={colors.amberText} />
        </Pressable>
      </View>

      {cases.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.verifiedBg }]}>
            <Feather name="compass" size={34} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Start your first case
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            The Navigator guides you through intake and helps organize your legal matter step by step.
          </Text>
          <Pressable
            onPress={handleNew}
            style={({ pressed }) => [
              styles.emptyBtn,
              { backgroundColor: colors.amber },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.emptyBtnText, { color: colors.amberText }]}>New case</Text>
          </Pressable>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            This is not legal advice. Pro Se Navigator is not a law firm.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {'Active · ' + cases.length}
            </Text>
          }
          renderItem={({ item }) => {
            const msgs = messages[item.id] || [];
            const last = msgs[msgs.length - 1];
            return (
              <CaseCard
                caseItem={item}
                lastMessage={last?.content}
                onPress={() => handlePress(item.id)}
                onDelete={() => deleteCase(item.id)}
              />
            );
          }}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 96 },
          ]}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.7,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F6E5625',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E8A33D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingBottom: 10,
    paddingTop: 14,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
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
  emptyBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 20,
  },
});
