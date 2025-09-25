import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MoreVertical } from 'lucide-react-native'; // Using Lucide for consistency
import { useThemeColors } from '../../context/themeColors';

interface ProfileHeaderProps {
  title: string;
  avatarUrl?: string;
  onPressAvatar?: () => void;
  onPressSearch?: () => void;
  onPressMenu?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  avatarUrl = 'https://i.pravatar.cc/100', // fallback avatar
  onPressAvatar,
  onPressSearch,
  onPressMenu,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  
  // A simple check to determine theme, assuming `background` is a good indicator
  const isDarkTheme = colors.background.startsWith('#1'); 

  // Dynamic styles that depend on the theme
  const dynamicStyles = {
    glassContainer: {
      backgroundColor: colors.glassBackground,
      borderColor: colors.glassBorder,
      shadowColor: colors.glassShadow,
    },
    iconWrapper: {
      backgroundColor: colors.cardSecondary,
    }
  };

  return (
    <>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      {/* The outer container positions the floating header correctly */}
      <View style={[styles.outerContainer, { top: insets.top + 10 }]}>
        <View style={[styles.glassContainer, dynamicStyles.glassContainer]}>
          
          {/* Left side: Avatar + Title */}
          <View style={styles.leftWrapper}>
            <TouchableOpacity onPress={onPressAvatar} activeOpacity={0.8}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          
          {/* Right actions */}
          <View style={styles.rightActions}>
            <TouchableOpacity onPress={onPressSearch} style={[styles.iconWrapper, dynamicStyles.iconWrapper]}>
              <Search size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onPressMenu} style={[styles.iconWrapper, dynamicStyles.iconWrapper]}>
              <MoreVertical size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: 16,
    zIndex: 100,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 24,
    borderWidth: 1,
    height: 64,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  leftWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allow this to take available space
    paddingRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flexShrink: 1, // Ensure title shrinks if space is limited
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});

export default ProfileHeader;