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
    description: 'Wrong information on your credit report',
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

  // One tap on a type card both selects it AND starts the case immediately
  const handleTypeSelect = async (type: CaseType) => {
    if (loading) return;
    Haptics.selectionAsync();
    setCaseType(type);
    setLoading(true);
    try {
      // Title is optional — pass it only if the user typed something
      const newCase = await createCase({
        caseType: type,
        title: title.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/case/${newCase.id}`);
    } catch {
      Alert.alert('Error', 'Could not create case. Please try again.');
      setCaseType(null);
      setLoading(false);
    }
  };

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
        {/* Optional title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Name this case{' '}
            <Text style={[styles.optional, { color: colors.textMuted }]}>(optional)</Text>
          </Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Leave blank and Navigator will name it for you based on your answers.
          </Text>
          <TextInput
            style={[
              styles.titleInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                fontFamily: 'Inter_400Regular',
              },
            ]}
            placeholder="e.g. Dispute with my landlord"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            maxLength={120}
          />
        </View>

        {/* Case type — tap to start */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            What best describes your situation?
          </Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Tap one to start. The Navigator will ask you questions from there — no legal knowledge needed.
          </Text>
          <View style={styles.typeList}>
            {CASE_TYPES.map((ct) => {
              const isSelected = caseType === ct.type;
              const isLoading = loading && isSelected;
              return (
                <Pressable
                  key={ct.type}
                  onPress={() => handleTypeSelect(ct.type)}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.typeRow,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.verifiedBg : colors.surface,
                      opacity: loading && !isSelected ? 0.4 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.typeIconWrap,
                      { backgroundColor: isSelected ? colors.primary : colors.border },
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather
                        name={ct.icon as any}
                        size={16}
                        color={isSelected ? '#fff' : colors.textMuted}
                      />
                    )}
                  </View>
                  <View style={styles.typeText}>
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {ct.label}
                    </Text>
                    <Text style={[styles.typeSub, { color: colors.textMuted }]}>
                      {ct.description}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

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
  dragBar: { width: 36, height: 4, borderRadius: 2 },
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
  label: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  optional: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 12 },
  titleInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 22,
  },
  typeList: { gap: 10 },
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
  typeLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  typeSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
  },
});
