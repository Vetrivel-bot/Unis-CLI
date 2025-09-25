import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { useThemeColors } from '../../../context/themeColors';
import FastImage from 'react-native-fast-image';

interface RecentChatCardProps {
  id: string;
  avatarUrl: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  onPress: (id: string) => void;
}

/**
 * Helpers to decide dark vs light from a color string.
 * Supports hex (#fff, #ffffff) and rgb(a).
 */
function parseColorToRgb(color: string) {
  if (!color) return null;
  color = color.trim();
  // hex
  if (color[0] === '#') {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
  }
  // rgb or rgba
  const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(p => parseFloat(p.trim()));
    return { r: parts[0], g: parts[1], b: parts[2] };
  }
  return null;
}
function isColorDark(color: string) {
  const rgb = parseColorToRgb(color);
  if (!rgb) return false; // fallback to light
  // Perceived luminance (0..1)
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.5;
}

const RecentChatCard: React.FC<RecentChatCardProps> = ({
  id,
  avatarUrl,
  name,
  lastMessage,
  timestamp,
  unreadCount = 0,
  onPress,
}) => {
  const colors = useThemeColors();

  // Tunable values for dark (glass) look — change these if you want stronger/weaker glass
  const DARK_BG = 'rgba(255,255,255,0.10)'; // matches bg-white/10
  const DARK_BORDER = 'rgba(255,255,255,0.20)';

  // Tunable fallback for light theme border
  const LIGHT_BORDER_FALLBACK = 'rgba(0,0,0,0.06)';

  // Decide dark mode:
  // prefer explicit token if available, else derive from colors.card
  const isDarkMode = useMemo(() => {
    // some theme hooks provide a mode token; try to use it if present
    // @ts-ignore
    if (typeof colors.mode === 'string') return colors.mode === 'dark';
    // otherwise derive from colors.card (hex or rgb)
    return isColorDark(colors.card);
  }, [colors.card, /*colors.mode may exist*/ (colors as any).mode]);

  // stable press handler
  const handlePress = useCallback(() => onPress(id), [onPress, id]);

  // memoized style objects so references don't change unnecessarily
  const containerStyle = useMemo(() => {
    if (isDarkMode) {
      return [
        styles.container,
        {
          backgroundColor: DARK_BG,
          borderColor: colors.border ?? DARK_BORDER,
        },
      ];
    }
    // light mode: use theme card & border
    return [
      styles.container,
      {
        backgroundColor: colors.card ?? '#fff',
        borderColor: colors.border ?? LIGHT_BORDER_FALLBACK,
      },
    ];
  }, [isDarkMode, colors.card, colors.border]);

  const unreadStyle = useMemo(
    () => [styles.unreadBadge, { backgroundColor: colors.primary }],
    [colors.primary],
  );

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={containerStyle}
      accessibilityRole='button'
    >
      <FastImage
        style={styles.avatar as any}
        source={{
          uri: avatarUrl,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable,
        }}
        resizeMode={FastImage.resizeMode.cover}
        onError={() => console.log('Image failed to load')}
      />

      <View style={styles.contentContainer}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
          {lastMessage}
        </Text>
      </View>

      <View style={styles.metaContainer}>
        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{timestamp}</Text>
        {unreadCount > 0 && (
          <View style={unreadStyle}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

/** shallow compare only frequently-changing props */
function propsAreEqual(prev: RecentChatCardProps, next: RecentChatCardProps) {
  return (
    prev.id === next.id &&
    prev.avatarUrl === next.avatarUrl &&
    prev.name === next.name &&
    prev.lastMessage === next.lastMessage &&
    prev.timestamp === next.timestamp &&
    prev.unreadCount === next.unreadCount &&
    prev.onPress === next.onPress
  );
}

interface Style {
  container: ViewStyle;
  avatar: ImageStyle;
  contentContainer: ViewStyle;
  name: TextStyle;
  lastMessage: TextStyle;
  metaContainer: ViewStyle;
  timestamp: TextStyle;
  unreadBadge: ViewStyle;
  unreadText: TextStyle;
}

const styles = StyleSheet.create<Style>({
  container: {
    width: '95%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 25, // pill-shaped smooth curve
    marginVertical: 8,
    borderWidth: 1,
    // fallback borderColor is overridden by inline styles
    borderColor: 'rgba(0,0,0,0.06)',
    // shadows retained; remove/reduce if you need better perf on low-end devices
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.85,
  },
  metaContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 6,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    elevation: 2,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default memo(RecentChatCard, propsAreEqual);
