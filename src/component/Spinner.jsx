import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeColors } from '../context/themeColors';

export default function Spinner({ size = 'large', overlay = false }) {
  const colors = useThemeColors();

  const styles = createStyles(colors);

  if (overlay) {
    return (
      <View style={styles.overlay}>
        <ActivityIndicator size={size} color={colors.primary} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={colors.primary} />;
}

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlayBackground || 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50,
    },
  });
