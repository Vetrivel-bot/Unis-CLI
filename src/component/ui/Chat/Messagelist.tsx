// src/components/Chat/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ViewToken,
} from 'react-native';
import { Message } from '../../../types/chat';
import TextBubble from './Bubble/TextBubble';
import ImageBubble from './Bubble/ImageBubble';

interface MessageListProps {
  messages: Message[];
  headerHeight?: number;
  footerHeight?: number;
  onMessagesViewed?: (ids: string[]) => void; // NEW: callback when messages become viewable
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  headerHeight = 0,
  footerHeight = 0,
  onMessagesViewed,
}) => {
  const flatListRef = useRef<FlatList<Message> | null>(null);
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // We want to consider an item "viewed" when at least 80% of it is visible
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    waitForInteraction: false,
  }).current;

  // callback ref to avoid re-creating the function each render
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (!onMessagesViewed || !viewableItems || viewableItems.length === 0) return;

      // collect ids of viewable items that are fully loaded and have ids
      const visibleIds = viewableItems.map(v => v.item?.id).filter(Boolean) as string[];

      if (visibleIds.length > 0) {
        onMessagesViewed(visibleIds);
      }
    },
  ).current;

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
    return <View style={{ marginBottom: 18 }}>{content}</View>;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
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
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
});

export default MessageList;
