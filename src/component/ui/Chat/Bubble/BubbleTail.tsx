// src/components/Chat/Bubble/BubbleTail.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface BubbleTailProps {
  direction: 'left' | 'right';
  color: string;
}

const BubbleTail: React.FC<BubbleTailProps> = ({ direction, color }) => {
  const isLeft = direction === 'left';

  // These styles create a triangle pointing left or right
  const tailStyle = isLeft ? styles.left : styles.right;
  const dynamicColorStyle = {
    [isLeft ? 'borderRightColor' : 'borderLeftColor']: color,
  };

  return <View style={[styles.tail, tailStyle, dynamicColorStyle]} />;
};

const styles = StyleSheet.create({
  tail: {
    position: 'absolute',
    bottom: 0, // Aligns the tail to the bottom of the bubble
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    // These two create the vertical size of the triangle
    borderTopWidth: 10,
    borderTopColor: 'transparent',
    borderBottomWidth: 10,
    borderBottomColor: 'transparent',
  },
  left: {
    left: -10, // Positions the tail outside the bubble on the left
    borderRightWidth: 20, // Creates the triangle shape
  },
  right: {
    right: -10, // Positions the tail outside the bubble on the right
    borderLeftWidth: 20, // Creates the triangle shape
  },
});

export default BubbleTail;
