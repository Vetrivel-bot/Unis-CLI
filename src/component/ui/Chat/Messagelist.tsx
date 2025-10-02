// src/components/Chat/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Message } from '../../../types/chat'; // CHANGED: Import shared type

// CHANGED: Import all bubble components
import TextBubble from './Bubble/TextBubble';
import ImageBubble from './Bubble/ImageBubble';
// import AudioBubble from './Bubble/AudioBubble'; // You can create and import more

// Your MessageListProps now uses the imported Message type
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
  const flatListRef = useRef<FlatList<Message> | null>(null); // This useEffect block is unchanged

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages]); // --- RENDERITEM LOGIC IS UPDATED ---

  const renderItem = ({ item }: { item: Message }) => {
    let content;

    switch (item.contentType) {
      case 'text':
        content = <TextBubble text={item.text} type={item.type} status={item.status} />;
        break;
      case 'image':
        content = <ImageBubble {...item} />;
        break;
      default:
        content = <TextBubble text='Unsupported message type.' type={item.type} />;
    }

    // Wrap the content in a View and apply margin
    // Since the list is inverted, marginBottom adds space "above" the item.
    return <View style={{ marginBottom: 18 }}>{content}</View>;
  }; // This return block is unchanged

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      {' '}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={{
          paddingTop: 90,
          paddingBottom: footerHeight || 0,
          paddingHorizontal: 12,
        }}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        // inverted={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
      />{' '}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
});

export default MessageList;
