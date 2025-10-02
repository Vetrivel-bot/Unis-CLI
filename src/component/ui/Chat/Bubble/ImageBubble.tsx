// src/components/Chat/Bubble/ImageBubble.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Message } from '../../../../types/chat';
import StatusTicks from '../StatusTicks';
import BubbleTail from './BubbleTail';
import { useThemeColors } from '../../../../context/themeColors'; // Corrected import path

interface ImageBubbleProps extends Message {
  style?: ViewStyle;
}

const ImageBubble: React.FC<ImageBubbleProps> = props => {
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
        {props.uri && <Image source={{ uri: props.uri }} style={styles.image} />}

        {(props.text || isSent) && (
          <View style={styles.bottomContainer}>
            {props.text && (
              <Text style={[styles.caption, { color: colors.text }]}>{props.text}</Text>
            )}
            <View style={styles.tickContainer}>
              {isSent && <StatusTicks status={props.status} />}
            </View>
          </View>
        )}

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
    padding: 6,
    borderRadius: 12,
  },
  sentBubble: {
    borderBottomRightRadius: 9,
  },
  receivedBubble: {
    borderBottomLeftRadius: 9,
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 6,
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 6,
    paddingHorizontal: 6,
  },
  caption: {
    fontSize: 16,
    flex: 1,
  },
  tickContainer: {
    minWidth: 20,
    marginLeft: 8,
  },
});

export default ImageBubble;
