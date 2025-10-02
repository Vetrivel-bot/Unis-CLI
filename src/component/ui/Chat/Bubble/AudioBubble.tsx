// src/components/Chat/Bubble/AudioBubble.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Message } from '../../../../types/chat';
import StatusTicks from '../StatusTicks';
import BubbleTail from './BubbleTail';
import { Play } from 'lucide-react-native';
import { useThemeColors } from '../../../../context/themeColors'; // Corrected import path

interface AudioBubbleProps extends Message {
  style?: ViewStyle;
}

const AudioBubble: React.FC<AudioBubbleProps> = props => {
  const isSent = props.type === 'sent';
  const colors = useThemeColors();

  const bubbleColor = isSent ? colors.chatBubbleOutgoing : colors.chatBubbleIncoming;

  return (
    <View style={[isSent ? styles.sentContainer : styles.receivedContainer, props.style]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: bubbleColor },
          isSent ? styles.sentBubble : styles.receivedBubble,
        ]}
      >
        <TouchableOpacity activeOpacity={0.7}>
          <Play size={28} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.progressBar} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {props.duration || '0:00'}
        </Text>
        <View style={styles.tickContainer}>{isSent && <StatusTicks status={props.status} />}</View>
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
    alignItems: 'center',
    minWidth: 180,
  },
  sentBubble: {
    borderBottomRightRadius: 9,
  },
  receivedBubble: {
    borderBottomLeftRadius: 9,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    marginHorizontal: 10,
  },
  text: {
    fontSize: 14,
  },
  tickContainer: {
    minWidth: 20,
    marginLeft: 8,
  },
});

export default AudioBubble;
