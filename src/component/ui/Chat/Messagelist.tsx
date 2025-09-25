// src/components/Chat/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import TextBubble from './Bubble/TextBubble';

export type Message = {
  id: string;
  text: string;
  type: 'sent' | 'received';
};

interface MessageListProps {
  messages: Message[];
  headerHeight?: number;
  footerHeight?: number;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  headerHeight = 0,
  footerHeight = 0,
}) => {
  const flatListRef = useRef<FlatList<Message> | null>(null);

  // Scroll to bottom when messages change (works with inverted list)
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      // For inverted FlatList, offset 0 is the bottom — works reliably across platforms.
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages]);

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isLastItem = index === messages.length - 1; // Newest message at bottom (before inversion)
    const isFirstItem = index === 0; // Oldest message at top (before inversion)
    return (
      <TextBubble
        text={item.text}
        type={item.type}
        style={{
          ...(isLastItem ? { marginBottom: 0 } : {}),
          ...(isFirstItem ? { marginTop: 0 } : {}),
        }}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight} // let parent provide header offset if needed
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={{
          paddingTop: 0, // Remove paddingTop to eliminate gap at top
          paddingBottom: footerHeight || 0,
          paddingHorizontal: 12,
        }}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        inverted={true} // Render from bottom up, WhatsApp-style
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
});

export default MessageList;
