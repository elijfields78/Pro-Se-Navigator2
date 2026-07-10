import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Deadline } from '@/contexts/types';

interface DeadlineCardProps {
  deadline: Deadline;
  showCaseTitle?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

export default function DeadlineCard({ deadline, showCaseTitle }: DeadlineCardProps) {
  const colors = useColors();
  const days = daysUntil(deadline.dueDate);
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 7;

  let urgencyLabel: string;
  if (isOverdue) urgencyLabel = `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  else if (days === 0) urgencyLabel = 'Due today';
  else if (isUrgent) urgencyLabel = `${days} day${days === 1 ? '' : 's'} away`;
  else urgencyLabel = formatDate(deadline.dueDate);

  // Three-state visual system
  if (isOverdue) {
    return (
      <View style={[styles.card, styles.overdueCard]}>
        <View style={styles.header}>
          <Feather name="alert-circle" size={13} color="#DC2626" />
          <Text style={[styles.urgency, { color: '#DC2626' }]}>{urgencyLabel}</Text>
          <Text style={[styles.date, { color: '#DC262699' }]}>· {formatDate(deadline.dueDate)}</Text>
        </View>
        <Text style={[styles.description, { color: '#7F1D1D', fontFamily: 'Inter_600SemiBold' }]}>
          {deadline.description}
        </Text>
        {showCaseTitle && (
          <Text style={[styles.caseTitle, { color: '#991B1B' }]}>{deadline.caseTitle}</Text>
        )}
        <Text style={[styles.rule, { color: '#B91C1CBB' }]}>{deadline.ruleBasis}</Text>
        <Text style={[styles.disclaimer, { color: '#DC262688' }]}>Confirm against your court's rules.</Text>
      </View>
    );
  }

  if (isUrgent) {
    return (
      <View style={[styles.card, { backgroundColor: colors.deadlineBg, borderColor: '#D97706' + '44' }]}>
        <View style={styles.header}>
          <Feather name="clock" size={13} color={colors.deadlineText} />
          <Text style={[styles.urgency, { color: colors.deadlineText }]}>{urgencyLabel}</Text>
          {days > 0 && (
            <Text style={[styles.date, { color: colors.deadlineText + '88' }]}>· {formatDate(deadline.dueDate)}</Text>
          )}
        </View>
        <Text style={[styles.description, { color: '#422006', fontFamily: 'Inter_600SemiBold' }]}>
          {deadline.description}
        </Text>
        {showCaseTitle && (
          <Text style={[styles.caseTitle, { color: colors.deadlineText, opacity: 0.8 }]}>{deadline.caseTitle}</Text>
        )}
        <Text style={[styles.rule, { color: colors.deadlineText + 'BB' }]}>{deadline.ruleBasis}</Text>
        <Text style={[styles.disclaimer, { color: colors.deadlineText + '88' }]}>Confirm against your court's rules.</Text>
      </View>
    );
  }

  // Normal / future
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Feather name="calendar" size={13} color={colors.textMuted} />
        <Text style={[styles.urgency, { color: colors.textMuted, fontFamily: 'Inter_400Regular' }]}>
          {urgencyLabel}
        </Text>
      </View>
      <Text style={[styles.description, { color: colors.text }]}>{deadline.description}</Text>
      {showCaseTitle && (
        <Text style={[styles.caseTitle, { color: colors.textSecondary }]}>{deadline.caseTitle}</Text>
      )}
      <Text style={[styles.rule, { color: colors.textMuted }]}>{deadline.ruleBasis}</Text>
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>Confirm against your court's rules.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  overdueCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    shadowColor: '#DC2626',
    shadowOpacity: 0.08,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  urgency: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  caseTitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  rule: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginTop: 3,
  },
});
