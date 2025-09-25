// src/components/Chat/Bubble/TextBubble.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Pressable } from 'react-native';
import { useThemeColors } from '../../../../context/themeColors';

interface TextBubbleProps {
  text: string;
  type: 'sent' | 'received';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  onPress?: () => void;
}

const TextBubble: React.FC<TextBubbleProps> = ({
  text,
  type,
  style,
  textStyle,
  numberOfLines,
  ellipsizeMode = 'tail',
  onPress,
}) => {
  const colors = useThemeColors();
  const isSent = type === 'sent';

  const containerStyle: ViewStyle = {
    backgroundColor: isSent ? colors.chatBubbleOutgoing : colors.chatBubbleIncoming,
  };

  const Inner = (
    <View
      style={[
        styles.container,
        isSent ? styles.sent : styles.received,
        containerStyle,
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${isSent ? 'Sent' : 'Received'} message: ${text}`}
    >
      <Text
        style={[styles.text, { color: colors.text }, textStyle]}
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
      >
        {text}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        accessibilityRole="button"
        accessibilityLabel="Interact with message"
      >
        {Inner}
      </Pressable>
    );
  }

  return Inner;
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 2,
  },
  sent: {
    alignSelf: 'flex-end',
  },
  received: {
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
});

export default React.memo(TextBubble);
