import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet, Alert } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import AIMessage from './AIMessage';
import UserMessage from './UserMessage';
import ChatInput from './ChatInput';
import DeadlineDateEntry from './DeadlineDateEntry';
import { PendingAttachment } from './AttachmentSheet';
import { Message, NextStep, PendingDeadlineEntry } from '@/contexts/types';
import { useCases } from '@/contexts/CasesContext';

interface CaseChatProps {
  caseId: string;
  messages: Message[];
}

export default function CaseChat({ caseId, messages }: CaseChatProps) {
  const { sendMessage, submitDeadlineTriggerDate, cases, uploadDocument } = useCases();

  // Resolve pending deadline entry for this case
  const caseItem = cases.find((c) => c.id === caseId);
  const pendingEntry: PendingDeadlineEntry | null =
    caseItem?.pendingFollowUp?.kind === 'deadline_date_entry'
      ? (caseItem.pendingFollowUp as PendingDeadlineEntry)
      : null;

  const handleSend = useCallback(
    async (text: string, attachments?: PendingAttachment[]) => {
      // Persist any attached files to the case's document store first.
      if (attachments && attachments.length > 0) {
        try {
          for (const att of attachments) {
            await uploadDocument(caseId, {
              uri: att.uri,
              name: att.name,
              mimeType: att.mimeType,
              size: att.size,
              source: att.type,
            });
          }
        } catch (err) {
          console.error('[CaseChat] document upload error:', err);
          Alert.alert(
            'Upload failed',
            err instanceof Error
              ? err.message
              : 'Your file could not be saved. Please try again.',
          );
          // Fall through so any typed text is still sent.
        }
      }

      if (text.trim().length > 0) {
        try {
          await sendMessage(caseId, text);
        } catch (err) {
          console.error('[CaseChat] sendMessage error:', err);
          Alert.alert('Failed to send', 'Your message could not be saved. Please try again.');
        }
      }
    },
    [caseId, sendMessage, uploadDocument],
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

  const handleSubmitDeadlineDate = useCallback(
    async (dateStr: string) => {
      await submitDeadlineTriggerDate(caseId, dateStr);
    },
    [caseId, submitDeadlineTriggerDate],
  );

  // Inverted FlatList — data must be reversed (newest-first in the array).
  const reversedMessages = [...messages].reverse();

  // Only the most-recent navigator message gets interactive next-step buttons
  // and the Regenerate/Copy actions. Previous messages are static.
  const lastNavId = reversedMessages.find((m) => m.role === 'navigator')?.id ?? null;

  const handleRegenerate = useCallback(() => {
    // Placeholder — AI not connected yet (Phase 6)
    Alert.alert(
      'Regenerate',
      'AI regeneration will be available once the AI is connected in Phase 6.',
      [{ text: 'OK' }],
    );
  }, []);

  const renderItem = ({ item }: { item: Message }) => {
    if (item.role === 'navigator') {
      const isLatest   = item.id === lastNavId;
      // The latest navigator message is styled as an "estimate" when the
      // case is waiting for a deadline trigger date. This signals to the
      // user that the content is provisional.
      const isEstimate = isLatest && pendingEntry !== null;

      return (
        <AIMessage
          content={item.content}
          // Suppress next-step buttons when in deadline date entry mode —
          // DeadlineDateEntry is the active input instead.
          nextSteps={isLatest && !isEstimate ? item.nextSteps : undefined}
          onNextStepPress={isLatest && !isEstimate ? handleNextStep : undefined}
          onRegenerate={isLatest && !isEstimate ? handleRegenerate : undefined}
          isEstimate={isEstimate}
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

      {/* ── Bottom input area ── */}
      {pendingEntry ? (
        <DeadlineDateEntry
          triggerDateLabel={pendingEntry.triggerDateLabel}
          estimatedDays={pendingEntry.estimatedDays}
          artifactTitle={pendingEntry.artifactTitle}
          onSubmit={handleSubmitDeadlineDate}
        />
      ) : (
        <ChatInput onSend={handleSend} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingTop: 4 },
});
