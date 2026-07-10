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

  return (
    <View style={[styles.card, { backgroundColor: colors.deadlineBg, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Feather name="clock" size={13} color={colors.deadlineText} />
        <Text style={[styles.urgency, { color: colors.deadlineText }]}>{urgencyLabel}</Text>
        {(isOverdue || isUrgent) && (
          <Text style={[styles.date, { color: colors.deadlineText }]}>· {formatDate(deadline.dueDate)}</Text>
        )}
      </View>
      <Text style={[styles.description, { color: colors.text }]}>{deadline.description}</Text>
      {showCaseTitle && (
        <Text style={[styles.caseTitle, { color: colors.textSecondary }]}>{deadline.caseTitle}</Text>
      )}
      <Text style={[styles.rule, { color: colors.textMuted }]}>{deadline.ruleBasis}</Text>
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        Confirm against your court's rules.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  urgency: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
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
    marginTop: 4,
  },
});
