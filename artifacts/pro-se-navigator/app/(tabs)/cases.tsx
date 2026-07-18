import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import { useAuth } from '@/contexts/AuthContext';
import CaseCard from '@/components/CaseCard';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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
  const { cases, messages, deadlines, isLoading, setActiveCase, deleteCase } = useCases();
  const { user } = useAuth();

  const firstName = user?.name?.split(' ')[0];
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

  /** Earliest upcoming deadline for a case, if any. */
  const nextDeadlineFor = (caseId: string): string | undefined => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = deadlines
      .filter((d) => d.caseId === caseId && d.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return upcoming[0] ? deadlineLabel(upcoming[0].dueDate) : undefined;
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

      {cases.length === 0 ? (
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
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {'Active · ' + cases.length}
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
                onPress={() => handlePress(item.id)}
                onDelete={() => deleteCase(item.id)}
              />
            );
          }}
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
});
