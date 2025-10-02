// component/layout/SecondaryHeader.js

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MessageSquare, Phone, Home, Users, User } from 'lucide-react-native';
import { useThemeColors } from '../../context/themeColors';

// 1. Define the tabs statically, since we can't read them from navigation state anymore.
const TABS = [
  { name: 'Chat', icon: MessageSquare },
  { name: 'Calls', icon: Phone },
  { name: 'Status', icon: Home },
];

const getIconComponent = routeName => {
  // This function can be simplified or removed if using the TABS array above
  for (const tab of TABS) {
    if (tab.name === routeName) return tab.icon;
  }
  return Home;
};

// 2. Change the props. It no longer receives BottomTabBarProps.
const SecondaryHeader = ({ activeTab, onTabPress }) => {
  const colors = useThemeColors();

  const dynamicStyles = {
    glassContainer: {
      backgroundColor: colors.glassBackground,
      borderColor: colors.glassBorder,
      shadowColor: colors.glassShadow,
    },
    tabButtonFocused: {
      backgroundColor: colors.cardSecondary,
    },
  };

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.glassContainer, dynamicStyles.glassContainer]}>
        {/* 3. Map over our static TABS array */}
        {TABS.map(route => {
          const isFocused = activeTab === route.name;
          const IconComponent = route.icon;
          const iconColor = isFocused ? colors.primary : colors.textSecondary;
          const textColor = isFocused ? colors.text : colors.textSecondary;

          return (
            <TouchableOpacity
              key={route.name}
              accessibilityRole='button'
              accessibilityState={isFocused ? { selected: true } : {}}
              // 4. Call the onTabPress function passed from ProfileScreen
              onPress={() => onTabPress(route.name)}
              style={[
                styles.tabButton,
                isFocused && styles.tabButtonFocused,
                isFocused && dynamicStyles.tabButtonFocused,
              ]}
              activeOpacity={0.8}
            >
              {/* <IconComponent size={22} color={iconColor} strokeWidth={isFocused ? 2.5 : 1.5} /> */}
              <Text
                style={[styles.label, { color: textColor, fontWeight: isFocused ? '600' : '400' }]}
                numberOfLines={1}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// The styles remain the same as they correctly position the component
const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    width: '100%',
    top: 63,
    zIndex: 100,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'end',
    justifyContent: 'space-around',
    padding: 8,
    height: 84,
    // borderRadius: 24,
    // borderWidth: 1,
    // shadowOpacity: 0.1,
    // shadowRadius: 20,
    // shadowOffset: { width: 0, height: 4 },
    // elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: 28,
    height: '50%',
  },
  tabButtonFocused: {},
  label: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SecondaryHeader;
