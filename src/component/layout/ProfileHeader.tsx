import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreVertical, Search, Phone, Video } from 'lucide-react-native';
import { useThemeColors } from '../../context/themeColors'; // Adjust path as needed
import Dropdown from '../ui/layout/DropBox';

/**
 * ProfileHeader
 * - Sleek header for a mobile chatting app
 * - Glass morphism design with theme colors
 * - Integrates with Dropdown component
 */
interface ProfileHeaderProps {
  title: string;
  avatarUrl?: string;
  onPressAvatar?: () => void;
  onPressSearch?: () => void;
  screen?: string;
  onlineStatus?: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  avatarUrl = 'https://i.pravatar.cc/100',
  onPressAvatar,
  onPressSearch,
  screen = 'Home',
  onlineStatus = 'Online',
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const isDarkTheme = colors.background.startsWith('#1');

  const dynamicStyles = {
    glassContainer: {
      backgroundColor: colors.glassBackground || 'rgba(255, 255, 255, 0.1)',
      borderColor: colors.glassBorder || 'rgba(255, 255, 255, 0.2)',
      shadowColor: colors.glassShadow || '#000000',
    },
    iconWrapper: {
      backgroundColor: colors.cardSecondary || 'rgba(255, 255, 255, 0.15)',
    },
  };

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    console.log('Toggling menu, new state:', !menuOpen); // Debug log
    setMenuOpen(prev => !prev);
  };

  const menuItems = [
    { label: 'Profile', onPress: () => console.log('Profile pressed') },
    { label: 'Settings', onPress: () => console.log('Settings pressed') },
    { label: 'Sign Out', onPress: () => console.log('Sign Out pressed') },
  ];

  const anchorTop = insets.top + 10 + 45;
  const anchorRight = 16;

  return (
    <>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      <View style={[styles.outerContainer, { top: insets.top + 10 }]}>
        <View style={[styles.glassContainer, dynamicStyles.glassContainer]}>
          <View style={styles.leftWrapper}>
            <TouchableOpacity onPress={onPressAvatar} activeOpacity={0.8}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            </TouchableOpacity>
            <View>
              <Text
                style={{
                  fontSize: screen === 'ChatScreen' ? 16 : 20,
                  color: colors.text,
                  fontWeight: '600',
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
              {screen === 'ChatScreen' && onlineStatus && (
                <Text
                  style={{ fontSize: 12, color: colors.text, opacity: 0.7, fontWeight: '500' }}
                  numberOfLines={1}
                >
                  {onlineStatus}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.rightActions}>
            {screen === 'Home' && (
              <TouchableOpacity
                onPress={onPressSearch}
                style={[styles.iconWrapper, dynamicStyles.iconWrapper]}
              >
                <Search size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {screen === 'ChatScreen' && (
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={[styles.iconWrapper, dynamicStyles.iconWrapper]}>
                  <Phone size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconWrapper, dynamicStyles.iconWrapper]}>
                  <Video size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={toggleMenu}
              style={[styles.iconWrapper, dynamicStyles.iconWrapper]}
            >
              <MoreVertical size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Dropdown
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        data={menuItems}
        anchorTop={anchorTop}
        anchorRight={anchorRight}
      />
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
      ios: { shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 12 },
    }),
  },
  leftWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
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
