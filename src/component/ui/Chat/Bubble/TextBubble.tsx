// src/components/Chat/Bubble/TextBubble.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MessageStatus } from '../../../../types/chat';
import StatusTicks from '../StatusTicks';
import BubbleTail from './BubbleTail';
import { useThemeColors } from '../../../../context/themeColors'; // Corrected import path

interface TextBubbleProps {
  text?: string;
  type: 'sent' | 'received';
  status?: MessageStatus;
  style?: ViewStyle;
}

const TextBubble: React.FC<TextBubbleProps> = ({ text, type, status, style }) => {
  const isSent = type === 'sent';
  const colors = useThemeColors();

  const bubbleColor = isSent ? colors.chatBubbleOutgoing : colors.chatBubbleIncoming;

  return (
    <View style={[isSent ? styles.sentContainer : styles.receivedContainer, style]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: bubbleColor },
          isSent ? styles.sentBubble : styles.receivedBubble,
        ]}
      >
        <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
        <View style={styles.tickContainer}>{isSent && <StatusTicks status={status} />}</View>
        <BubbleTail direction={isSent ? 'right' : 'left'} color={bubbleColor} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sentContainer: {
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  receivedContainer: {
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sentBubble: {
    borderBottomRightRadius: 9,
  },
  receivedBubble: {
    borderBottomLeftRadius: 9,
  },
  text: {
    fontSize: 16,
  },
  tickContainer: {
    minWidth: 20,
    marginLeft: 8,
  },
});

export default TextBubble;