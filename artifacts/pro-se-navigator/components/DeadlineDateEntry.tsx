/**
 * DeadlineDateEntry
 *
 * Renders in place of ChatInput when the case has a pending deadline date entry.
 * The user enters the trigger date (service date, filing date, etc.) and taps
 * "Calculate Deadline". The app then deterministically computes the deadline
 * using Federal Rule 6 and saves it.
 *
 * Design: amber/deadline palette — clearly "provisional input needed", distinct
 * from the confirmed teal/green palette of a finalized deadline.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface DeadlineDateEntryProps {
  /** "date you were served with the complaint" etc. */
  triggerDateLabel: string;
  /** Estimated number of days in the period (for context only) */
  estimatedDays: number;
  /** Title of the artifact that triggered this flow */
  artifactTitle: string;
  /** Called when the user submits a date. Should throw on validation error. */
  onSubmit: (dateStr: string) => Promise<void>;
}

export default function DeadlineDateEntry({
  triggerDateLabel,
  estimatedDays,
  artifactTitle,
  onSubmit,
}: DeadlineDateEntryProps) {
  const colors = useColors();
  const [value,   setValue]   = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Format the label with a capital first letter for the prompt
  const labelCap = triggerDateLabel.charAt(0).toUpperCase() + triggerDateLabel.slice(1);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter a date.');
      return;
    }
    // Basic format check before handing off
    const hasMDY = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed);
    const hasISO = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (!hasMDY && !hasISO) {
      setError('Use MM/DD/YYYY format — for example: 07/15/2025');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onSubmit(trimmed);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    }
    // On success the component unmounts (pendingFollowUp cleared) — no need to reset
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      {/* ── Header row ── */}
      <View style={[styles.card, { backgroundColor: colors.deadlineBg, borderColor: colors.deadlineText + '30' }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.deadlineText + '20' }]}>
            <Feather name="clock" size={15} color={colors.deadlineText} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.cardTitle, { color: colors.deadlineText }]}>
              Enter Trigger Date
            </Text>
            <Text style={[styles.cardSub, { color: colors.deadlineText + 'BB' }]}>
              ~{estimatedDays} days from this date · computed by Rule 6
            </Text>
          </View>
        </View>

        {/* ── Prompt ── */}
        <Text style={[styles.prompt, { color: colors.text }]}>
          {labelCap}?
        </Text>

        {/* ── Date input ── */}
        <View
          style={[
            styles.inputRow,
            { backgroundColor: colors.surface, borderColor: error ? colors.destructive : colors.border },
          ]}
        >
          <Feather name="calendar" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { color: colors.text, fontFamily: 'Inter_400Regular' }]}
            value={value}
            onChangeText={(t) => { setValue(t); setError(null); }}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={colors.textMuted}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            returnKeyType="done"
            autoCorrect={false}
            onSubmitEditing={handleSubmit}
            editable={!loading}
            maxLength={10}
          />
        </View>

        {/* ── Error message ── */}
        {error ? (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        ) : null}

        {/* ── Submit button ── */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.amber },
            (pressed || loading) && { opacity: 0.75 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.amberText} size="small" />
          ) : (
            <>
              <Text style={[styles.submitLabel, { color: colors.amberText }]}>
                Calculate Deadline
              </Text>
              <Feather name="arrow-right" size={15} color={colors.amberText} />
            </>
          )}
        </Pressable>

        {/* ── Disclaimer ── */}
        <Text style={[styles.disclaimer, { color: colors.deadlineText + '88' }]}>
          Uses Federal Rule 6 counting (excludes weekends &amp; federal holidays).
          Confirm against your court's local rules.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 11,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1, gap: 1 },
  cardTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  cardSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  prompt: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    letterSpacing: 0.5,
  },

  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: -4,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    height: 50,
    shadowColor: '#E8A33D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  submitLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },

  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: -2,
  },
});
