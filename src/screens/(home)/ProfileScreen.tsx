import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileHeader from '../../component/layout/ProfileHeader';
import ChatListScreen from '../../component/Chat/ChatList';
import { useThemeColors } from '../../context/themeColors';
// import FooterTabs from '../../component/layout/FooterTabs'; // Assuming you have this

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // Calculate top padding for the list content to avoid the floating header
  const headerHeight = insets.top + 10 + 64 + 10; // insets.top + top_margin + header_height + bottom_buffer

  // Calculate bottom padding for the list content to avoid the floating footer
  const footerHeight = insets.bottom + 16 + 75 + 10; // insets.bottom + bottom_margin + footer_height + top_buffer

  // A simple check to determine if the current theme is dark
  const isDarkTheme = colors.background.startsWith('#1');

  // Conditionally choose the correct doodle image based on the theme
  const doodleSource = isDarkTheme
    ? require('../../assets/Unis-dark.png') // Use the dark version for dark themes
    : require('../../assets/Unis.png'); // Use the light version for light themes

  return (
    // 1. Base View with the theme's solid background color
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 2. Your theme-specific transparent doodle PNG, layered on top. */}
      <Image source={doodleSource} style={styles.doodleBackground} resizeMode='cover' />

      {/* 3. Your screen content, layered on top of everything else */}
      <ChatListScreen headerHeight={headerHeight} footerHeight={footerHeight} />

      <ProfileHeader
        title='Messages'
        // Add your onPress functions here
      />

      {/* Your floating footer would go here */}
      {/* <FooterTabs /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  doodleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.1, // Made it more subtle to not distract from content
  },
});
