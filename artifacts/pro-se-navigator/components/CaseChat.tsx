import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet, Alert } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import AIMessage from './AIMessage';
import UserMessage from './UserMessage';
import ChatInput from './ChatInput';
import { Message, NextStep } from '@/contexts/types';
import { useCases } from '@/contexts/CasesContext';

interface CaseChatProps {
  caseId: string;
  messages: Message[];
}

export default function CaseChat({ caseId, messages }: CaseChatProps) {
  const { sendMessage } = useCases();

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(caseId, text).catch((err) => {
        console.error('[CaseChat] sendMessage error:', err);
        Alert.alert('Failed to send', 'Your message could not be saved. Please try again.');
      });
    },
    [caseId, sendMessage],
  );

  const handleNextStep = useCallback(
    (step: NextStep) => {
      sendMessage(caseId, step.label).catch((err) => {
        console.error('[CaseChat] sendMessage error:', err);
        Alert.alert('Failed to send', 'Your selection could not be saved. Please try again.');
      });
    },
    [caseId, sendMessage],
  );

  // Inverted FlatList — data must be reversed (newest-first in the array).
  const reversedMessages = [...messages].reverse();

  // Only the most-recent navigator message gets interactive next-step buttons.
  // All previous messages have their options hidden so they don't pile up.
  const lastNavId = reversedMessages.find((m) => m.role === 'navigator')?.id ?? null;

  const renderItem = ({ item }: { item: Message }) => {
    if (item.role === 'navigator') {
      const isLatest = item.id === lastNavId;
      return (
        <AIMessage
          content={item.content}
          nextSteps={isLatest ? item.nextSteps : undefined}
          onNextStepPress={isLatest ? handleNextStep : undefined}
        />
      );
    }
    return <UserMessage content={item.content} />;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        data={reversedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!reversedMessages.length}
        ListHeaderComponent={<View style={{ height: 16 }} />}
      />
      <ChatInput onSend={handleSend} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingTop: 4 },
});
