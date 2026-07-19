import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  Alert,
  Pressable,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AIMessage from './AIMessage';
import UserMessage from './UserMessage';
import ChatInput from './ChatInput';
import DeadlineDateEntry from './DeadlineDateEntry';
import TypingIndicator from './TypingIndicator';
import MessageActionSheet from './MessageActionSheet';
import { PendingAttachment } from './AttachmentSheet';
import { Message, NextStep, PendingDeadlineEntry } from '@/contexts/types';
import { useCases } from '@/contexts/CasesContext';
import { useColors } from '@/hooks/useColors';

interface CaseChatProps {
  caseId: string;
  messages: Message[];
  /** Auto-focus the input when the chat mounts (full-screen case view). */
  autoFocusInput?: boolean;
}

export default function CaseChat({ caseId, messages, autoFocusInput }: CaseChatProps) {
  const colors = useColors();
  const { sendMessage, submitDeadlineTriggerDate, cases, uploadDocument } = useCases();

  const flatListRef = useRef<FlatList<Message>>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const showScrollBtnRef = useRef(false);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;

  const [isNavigatorTyping, setIsNavigatorTyping] = useState(false);
  // Long-press action sheet target + active quoted message for the input.
  const [actionContent, setActionContent] = useState<string | null>(null);
  const [quotedMessage, setQuotedMessage] = useState<string | null>(null);

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
        // Prepend the quoted snippet (if any) to the outgoing message.
        const outgoing = quotedMessage
          ? `> ${quotedMessage.slice(0, 60)}${quotedMessage.length > 60 ? '…' : ''}\n\n${text}`
          : text;
        setQuotedMessage(null);
        setIsNavigatorTyping(true);
        try {
          await sendMessage(caseId, outgoing);
        } catch (err) {
          console.error('[CaseChat] sendMessage error:', err);
          Alert.alert('Failed to send', 'Your message could not be saved. Please try again.');
        } finally {
          setIsNavigatorTyping(false);
        }
      }
    },
    [caseId, sendMessage, uploadDocument, quotedMessage],
  );

  const handleNextStep = useCallback(
    (step: NextStep) => {
      setIsNavigatorTyping(true);
      sendMessage(caseId, step.label)
        .catch((err) => {
          console.error('[CaseChat] sendMessage error:', err);
          Alert.alert('Failed to send', 'Your selection could not be saved. Please try again.');
        })
        .finally(() => setIsNavigatorTyping(false));
    },
    [caseId, sendMessage],
  );

  const handleSubmitDeadlineDate = useCallback(
    async (dateStr: string) => {
      await submitDeadlineTriggerDate(caseId, dateStr);
    },
    [caseId, submitDeadlineTriggerDate],
  );

  // ── Scroll-to-bottom button (list is inverted: "bottom" == offset 0) ────────
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const show = y > 200;
      if (show !== showScrollBtnRef.current) {
        showScrollBtnRef.current = show;
        setShowScrollBtn(show);
        Animated.timing(scrollBtnOpacity, {
          toValue: show ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
    [scrollBtnOpacity],
  );

  const scrollToBottom = useCallback(() => {
    Haptics.selectionAsync();
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Inverted FlatList — data must be reversed (newest-first in the array).
  // Memoized: re-reversing on every render (each keystroke re-renders the
  // parent) is wasted work and breaks FlatList's item identity.
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Only the most-recent navigator message gets interactive next-step buttons
  // and the Regenerate/Copy actions. Previous messages are static.
  const lastNavId = useMemo(
    () => reversedMessages.find((m) => m.role === 'navigator')?.id ?? null,
    [reversedMessages],
  );

  const handleRegenerate = useCallback(() => {
    // Placeholder — AI not connected yet (Phase 6)
    Alert.alert(
      'Regenerate',
      'AI regeneration will be available once the AI is connected in Phase 6.',
      [{ text: 'OK' }],
    );
  }, []);

  const openActions = useCallback((content: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionContent(content);
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
          createdAt={item.createdAt}
          onLongPress={() => openActions(item.content)}
          // Suppress next-step buttons when in deadline date entry mode —
          // DeadlineDateEntry is the active input instead.
          nextSteps={isLatest && !isEstimate ? item.nextSteps : undefined}
          onNextStepPress={isLatest && !isEstimate ? handleNextStep : undefined}
          onRegenerate={isLatest && !isEstimate ? handleRegenerate : undefined}
          isEstimate={isEstimate}
        />
      );
    }
    return (
      <UserMessage
        content={item.content}
        createdAt={item.createdAt}
        onLongPress={() => openActions(item.content)}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatListRef}
        data={reversedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!reversedMessages.length}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        ListHeaderComponent={
          <View>
            {isNavigatorTyping ? <TypingIndicator /> : null}
            <View style={{ height: 16 }} />
          </View>
        }
      />

      {/* ── Scroll-to-bottom button ── */}
      <Animated.View
        pointerEvents={showScrollBtn ? 'auto' : 'none'}
        style={[styles.scrollBtnWrap, { opacity: scrollBtnOpacity }]}
      >
        <Pressable
          onPress={scrollToBottom}
          style={({ pressed }) => [
            styles.scrollBtn,
            { backgroundColor: colors.amber },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Feather name="chevrons-down" size={20} color={colors.amberText} />
        </Pressable>
      </Animated.View>

      {/* ── Bottom input area ── */}
      {pendingEntry ? (
        <DeadlineDateEntry
          triggerDateLabel={pendingEntry.triggerDateLabel}
          estimatedDays={pendingEntry.estimatedDays}
          artifactTitle={pendingEntry.artifactTitle}
          onSubmit={handleSubmitDeadlineDate}
        />
      ) : (
        <ChatInput
          onSend={handleSend}
          autoFocus={autoFocusInput}
          quotedMessage={quotedMessage}
          onClearQuote={() => setQuotedMessage(null)}
        />
      )}

      {/* ── Long-press message actions ── */}
      <MessageActionSheet
        content={actionContent}
        onClose={() => setActionContent(null)}
        onQuote={(content) => setQuotedMessage(content)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingTop: 4 },
  scrollBtnWrap: {
    position: 'absolute',
    right: 20,
    bottom: 88,
  },
  scrollBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});
