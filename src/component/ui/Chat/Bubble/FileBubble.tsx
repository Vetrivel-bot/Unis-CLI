// src/components/Chat/Bubble/FileBubble.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Message } from '../../../../types/chat';
import StatusTicks from '../StatusTicks';
import BubbleTail from './BubbleTail';
import { FileText } from 'lucide-react-native';
import { useThemeColors } from '../../../../context/themeColors'; // Corrected import path

interface FileBubbleProps extends Message {
  style?: ViewStyle;
}

const FileBubble: React.FC<FileBubbleProps> = props => {
  const isSent = props.type === 'sent';
  const colors = useThemeColors();

  const bubbleColor = isSent ? colors.chatBubbleOutgoing : colors.chatBubbleIncoming;

  return (
    <View style={[isSent ? styles.sentContainer : styles.receivedContainer, props.style]}>
      <TouchableOpacity activeOpacity={0.7}>
        <View
          style={[
            styles.bubble,
            { backgroundColor: bubbleColor },
            isSent ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          <FileText size={32} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
              {props.fileName || 'Document'}
            </Text>
          </View>
          <View style={styles.tickContainer}>
            {isSent && <StatusTicks status={props.status} />}
          </View>
          <BubbleTail direction={isSent ? 'right' : 'left'} color={bubbleColor} />
        </View>
      </TouchableOpacity>
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
    alignItems: 'center',
  },
  sentBubble: {
    borderBottomRightRadius: 9,
  },
  receivedBubble: {
    borderBottomLeftRadius: 9,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
  tickContainer: {
    minWidth: 20,
    marginLeft: 8,
    alignSelf: 'flex-end',
  },
});

export default FileBubble;
