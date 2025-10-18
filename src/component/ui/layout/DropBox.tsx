import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useThemeColors } from '../../../context/themeColors';

interface MenuItem {
  label: string;
  onPress?: () => void;
}

interface DropdownProps {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  data?: MenuItem[];
  anchorTop?: number;
  anchorRight?: number;
}

const defaultMenuItems: MenuItem[] = [
  { label: 'Profile', onPress: () => console.log('Profile selected') },
  { label: 'Settings', onPress: () => console.log('Settings selected') },
  { label: 'Sign Out', onPress: () => console.log('Sign Out selected') },
];

/**
 * Modern Dropdown Component
 * - Opaque background inspired by WhatsApp
 * - Spring animations for smooth interactions
 * - Modern typography and spacing
 * - Uses theme colors from context
 */
const Dropdown: React.FC<DropdownProps> = ({
  menuOpen,
  setMenuOpen,
  data = defaultMenuItems,
  anchorTop = 70,
  anchorRight = 16,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const translateY = useSharedValue(-12);
  const overlayOpacity = useSharedValue(0);

  const DROP_DOWN_EXTRA_OFFSET = 12;
  const effectiveTop = (anchorTop || 0) + DROP_DOWN_EXTRA_OFFSET;

  const themeColors = useThemeColors();

  const theme = {
    background: themeColors.background || '#1a1a1a',
    text: themeColors.text || '#ffffff',
    textSecondary: themeColors.textSecondary || '#a0a0a0',
    card: themeColors.card || '#ffffff',
    overlay: themeColors.overlay || 'rgba(0, 0, 0, 0.4)',
  };

  const springConfig = {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  };

  const timingConfig = {
    duration: 200,
  };

  const animate = (open: boolean) => {
    console.log('Animating dropdown:', open); // Debug log
    if (open) {
      opacity.value = withSpring(1, springConfig);
      scale.value = withSpring(1, springConfig);
      translateY.value = withSpring(0, springConfig);
      overlayOpacity.value = withTiming(1, timingConfig);
    } else {
      opacity.value = withSpring(0, { ...springConfig, damping: 25 });
      scale.value = withSpring(0.85, { ...springConfig, damping: 25 });
      translateY.value = withSpring(-12, { ...springConfig, damping: 25 });
      overlayOpacity.value = withTiming(0, timingConfig);
    }
  };

  const close = () => {
    animate(false);
    setTimeout(() => setMenuOpen(false), 150);
  };

  useEffect(() => {
    animate(menuOpen);
  }, [menuOpen]);

  const onSelect = (item: MenuItem) => {
    if (item.onPress) {
      item.onPress();
    } else {
      console.log('Selected:', item.label);
    }
    close();
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const dropdownAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Modal transparent visible={menuOpen} animationType='none' onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View
          style={[styles.overlay, overlayAnimatedStyle, { backgroundColor: theme.overlay }]}
        />
      </TouchableWithoutFeedback>

      <View pointerEvents='box-none' style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents='box-none'
          style={[
            {
              position: 'absolute',
              top: effectiveTop,
              right: anchorRight,
              zIndex: 1000,
            },
            dropdownAnimatedStyle,
          ]}
        >
          <View style={styles.pointerContainer} pointerEvents='none'>
            <View style={[styles.pointer, { backgroundColor: theme.card }]} />
          </View>

          <View
            style={[
              styles.dropdown,
              { backgroundColor: theme.card, shadowColor: theme.background },
            ]}
          >
            <View style={styles.content}>
              {data.map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <View style={styles.menuItemContent}>
                    <View style={styles.menuItemLeft}>
                      <Text style={[styles.menuText, { color: theme.text }]}>{item.label}</Text>
                    </View>
                    <ChevronRight size={12} color={theme.textSecondary} strokeWidth={2} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pointerContainer: {
    alignItems: 'flex-end',
    marginRight: 18,
    marginBottom: -6,
  },
  pointer: {
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  dropdown: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 180,
    maxWidth: 260,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    padding: 6,
  },
  menuItem: {
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 2,
  },
  menuItemPressed: {
    transform: [{ scale: 0.98 }],
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
});

export default Dropdown;
