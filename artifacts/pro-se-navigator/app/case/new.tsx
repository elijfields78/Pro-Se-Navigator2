import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { useCases } from '@/contexts/CasesContext';
import { CaseType } from '@/contexts/types';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const CASE_TYPES: { type: CaseType; label: string; description: string; icon: string }[] = [
  {
    type: 'general',
    label: 'General Civil',
    description: 'Lawsuits, disputes, court orders',
    icon: 'file-text',
  },
  {
    type: 'fcra',
    label: 'Credit Report Error',
    description: 'Wrong info on your credit report',
    icon: 'credit-card',
  },
  {
    type: 'traffic',
    label: 'Traffic Ticket',
    description: 'Contest a citation or violation',
    icon: 'navigation',
  },
  {
    type: 'ifp',
    label: 'Fee Waiver',
    description: "Can't afford court filing fees",
    icon: 'dollar-sign',
  },
];

export default function NewCaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createCase } = useCases();

  const [title, setTitle] = useState('');
  const [caseType, setCaseType] = useState<CaseType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('One more thing', 'Give this case a short title so you can find it later.');
      return;
    }
    if (!caseType) {
      Alert.alert('One more thing', 'Select the type of case that best fits your situation.');
      return;
    }
    setLoading(true);
    try {
      const newCase = await createCase({
        title: title.trim(),
        caseType,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/case/${newCase.id}`);
    } catch {
      Alert.alert('Error', 'Could not create case. Please try again.');
      setLoading(false);
    }
  };

  const canCreate = title.trim().length > 0 && caseType !== null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Sheet handle + header */}
      <View
        style={[
          styles.handle,
          { borderBottomColor: colors.border, paddingTop: insets.top + 14 },
        ]}
      >
        <View style={[styles.dragBar, { backgroundColor: colors.border }]} />
        <View style={styles.handleRow}>
          <Text style={[styles.handleTitle, { color: colors.text }]}>New case</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeBtn}>
            <Feather name="x" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Case title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Give this case a title
          </Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Something short you'll recognize later — only you can see this.
          </Text>
          <TextInput
            style={[
              styles.titleInput,
              {
                color: colors.text,
                borderColor: caseType ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                fontFamily: 'Inter_400Regular',
              },
            ]}
            placeholder="e.g. Dispute with my landlord, Speeding ticket Aug 2026"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            maxLength={120}
          />
        </View>

        {/* Case type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>What best describes your situation?</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Don't worry if you're not sure — the Navigator will help you figure out the details once you're in the chat.
          </Text>
          <View style={styles.typeList}>
            {CASE_TYPES.map((ct) => {
              const active = caseType === ct.type;
              return (
                <Pressable
                  key={ct.type}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCaseType(ct.type);
                  }}
                  style={[
                    styles.typeRow,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.verifiedBg : colors.surface,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.typeIconWrap,
                      {
                        backgroundColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={ct.icon as any}
                      size={16}
                      color={active ? '#fff' : colors.textMuted}
                    />
                  </View>
                  <View style={styles.typeText}>
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: active ? colors.primary : colors.text },
                      ]}
                    >
                      {ct.label}
                    </Text>
                    <Text style={[styles.typeSub, { color: colors.textMuted }]}>
                      {ct.description}
                    </Text>
                  </View>
                  {active && (
                    <Feather name="check-circle" size={18} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Create button */}
        <Pressable
          onPress={handleCreate}
          disabled={loading || !canCreate}
          style={({ pressed }) => [
            styles.createBtn,
            {
              backgroundColor: canCreate ? colors.amber : colors.border,
            },
            (pressed || loading) && { opacity: 0.8 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={canCreate ? colors.amberText : colors.textMuted} />
          ) : (
            <Text
              style={[
                styles.createBtnText,
                { color: canCreate ? colors.amberText : colors.textMuted },
              ]}
            >
              Start case
            </Text>
          )}
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          This is not legal advice. Pro Se Navigator is not a law firm.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  handle: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 12,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  handleTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  closeBtn: { padding: 2 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  section: { marginBottom: 28 },
  label: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginBottom: 12,
  },
  titleInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 22,
  },
  typeList: {
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: { flex: 1 },
  typeLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  typeSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  createBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
  },
});
