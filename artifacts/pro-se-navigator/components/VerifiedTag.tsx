import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface VerifiedTagProps {
  label?: string;
  status?: 'verified' | 'pending' | 'failed';
}

export default function VerifiedTag({ label = 'verified', status = 'verified' }: VerifiedTagProps) {
  const colors = useColors();

  const bg =
    status === 'verified' ? colors.verifiedBg
    : status === 'failed' ? colors.destructive + '22'
    : colors.deadlineBg;
  const fg =
    status === 'verified' ? colors.verifiedText
    : status === 'failed' ? colors.destructive
    : colors.deadlineText;
  const icon = status === 'verified' ? 'check' : status === 'failed' ? 'x' : 'clock';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Feather name={icon} size={10} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.2,
  },
});
