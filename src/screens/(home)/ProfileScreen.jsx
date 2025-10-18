// screens/(home)/ProfileScreen.js

import React, { useState } from 'react'; // Import useState
import { View, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/themeColors';

// Components
import ProfileHeader from '../../component/layout/ProfileHeader';
import ChatListScreen from '../../component/Chat/ChatList';
// 1. Import your refactored SecondaryHeader
import SecondaryHeader from '../../component/layout/SecondaryHeader';

// The screen receives the `navigation` prop from the TabNavigator
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // 2. Create state to manage which tab is active
  const [activeTab, setActiveTab] = useState('Chat');

  // The padding calculation remains the same, as the visual layout is identical
  const headerHeight = insets.top + 85 + 74 + 20;
  const footerHeight = insets.bottom + 10;

  // 3. Create a function to handle navigation when a tab is pressed
  const handleTabPress = tabName => {
    // Only navigate if the screen exists in your navigator
    if (tabName === 'Calls' || tabName === 'Status') {
      setActiveTab(tabName);
      navigation.navigate(tabName);
    } else {
      // If it's the current screen, just set the state
      setActiveTab(tabName);
    }
  };

  const isDarkTheme = colors.background.startsWith('#1');
  const doodleSource = isDarkTheme
    ? require('../../assets/Unis-dark.png')
    : require('../../assets/Unis.png');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={doodleSource} style={styles.doodleBackground} resizeMode='cover' />

      {/* The chat list still fills the screen and is padded */}
      <View style={styles.chatList}>
        <ChatListScreen headerHeight={headerHeight} footerHeight={footerHeight} />
      </View>

      {/* The two headers float on top of the list */}
      <ProfileHeader title='Chats' />

      {/* 4. Render the SecondaryHeader here and pass it the required props */}
      <SecondaryHeader activeTab={activeTab} onTabPress={handleTabPress} />
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
    opacity: 0.1,
  },
  chatList: {
    flex: 1,
    backgroundColor: '#101012ff',
    top: 120,
    zIndex: 102,
    borderTopRightRadius: 40,
    borderTopLeftRadius: 40,
  },
});
