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
    description: 'Disputes, lawsuits, responses',
    icon: 'file-text',
  },
  {
    type: 'fcra',
    label: 'FCRA / Credit',
    description: 'Credit report errors',
    icon: 'credit-card',
  },
  {
    type: 'traffic',
    label: 'Traffic',
    description: 'Citations and violations',
    icon: 'navigation',
  },
  {
    type: 'ifp',
    label: 'Fee Waiver',
    description: 'In forma pauperis / IFP',
    icon: 'dollar-sign',
  },
];

export default function NewCaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createCase } = useCases();

  const [title, setTitle] = useState('');
  const [caseType, setCaseType] = useState<CaseType>('general');
  const [court, setCourt] = useState('');
  const [judge, setJudge] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a case title.');
      return;
    }
    setLoading(true);
    try {
      const newCase = await createCase({
        title: title.trim(),
        caseType,
        court: court.trim(),
        judge: judge.trim() || undefined,
        caseNumber: caseNumber.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/case/${newCase.id}`);
    } catch {
      Alert.alert('Error', 'Failed to create case. Please try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.handle, { borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
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
          <Text style={[styles.label, { color: colors.text }]}>Case title</Text>
          <TextInput
            style={[
              styles.inputFull,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                fontFamily: 'Inter_400Regular',
              },
            ]}
            placeholder="e.g. Dispute with Equifax re: fraudulent account"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="next"
          />
        </View>

        {/* Case type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Case type</Text>
          <View style={styles.typeGrid}>
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
                    styles.typeCard,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.verifiedBg : colors.surface,
                    },
                  ]}
                >
                  <Feather
                    name={ct.icon as any}
                    size={18}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      { color: active ? colors.primary : colors.text },
                    ]}
                  >
                    {ct.label}
                  </Text>
                  <Text style={[styles.typeSub, { color: colors.textMuted }]} numberOfLines={2}>
                    {ct.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Court */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Court</Text>
          <TextInput
            style={[
              styles.inputFull,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                fontFamily: 'Inter_400Regular',
              },
            ]}
            placeholder="e.g. U.S. District Court, Southern District of NY"
            placeholderTextColor={colors.textMuted}
            value={court}
            onChangeText={setCourt}
            returnKeyType="next"
          />
        </View>

        {/* Optional fields */}
        <View style={styles.row}>
          <View style={styles.halfSection}>
            <Text style={[styles.label, { color: colors.text }]}>
              Judge{' '}
              <Text style={{ color: colors.textMuted, fontFamily: 'Inter_400Regular' }}>
                (optional)
              </Text>
            </Text>
            <TextInput
              style={[
                styles.inputFull,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  fontFamily: 'Inter_400Regular',
                },
              ]}
              placeholder="Hon. …"
              placeholderTextColor={colors.textMuted}
              value={judge}
              onChangeText={setJudge}
              returnKeyType="next"
            />
          </View>
          <View style={styles.halfSection}>
            <Text style={[styles.label, { color: colors.text }]}>
              Case no.{' '}
              <Text style={{ color: colors.textMuted, fontFamily: 'Inter_400Regular' }}>
                (optional)
              </Text>
            </Text>
            <TextInput
              style={[
                styles.inputFull,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  fontFamily: 'Inter_400Regular',
                },
              ]}
              placeholder="24-cv-…"
              placeholderTextColor={colors.textMuted}
              value={caseNumber}
              onChangeText={setCaseNumber}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleCreate}
          disabled={loading}
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: colors.amber },
            (pressed || loading) && { opacity: 0.8 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.amberText} />
          ) : (
            <Text style={[styles.createBtnText, { color: colors.amberText }]}>
              Create case and start intake
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
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 0 },
  section: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  inputFull: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '47%',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  typeSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfSection: { flex: 1 },
  createBtn: {
    height: 54,
    borderRadius: 12,
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
