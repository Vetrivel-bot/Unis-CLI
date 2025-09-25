import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MessageSquare, Phone, Chrome as Home, Users, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/themeColors'; // Using the theme context

const getIconComponent = (routeName: string) => {
  switch (routeName) {
    case 'index':
    case 'Chat':
      return MessageSquare;
    case 'calls':
    case 'Calls':
      return Phone;
    case 'status':
    case 'Status':
      return Home;
    case 'contacts':
    case 'Contacts':
      return Users;
    case 'profile':
    case 'Profile':
      return User;
    default:
      return Home;
  }
};

const FooterTabs: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors(); // Using theme colors from context

  if (!state?.routes?.length) return null;

  const bottomOffset = insets.bottom + 10; // Match header's positioning logic

  // Dynamic styles that depend on the theme, same as header
  const dynamicStyles = {
    glassContainer: {
      backgroundColor: colors.glassBackground,
      borderColor: colors.glassBorder,
      shadowColor: colors.glassShadow,
    },
    // New highlight for the focused tab button
    tabButtonFocused: {
      backgroundColor: colors.cardSecondary,
    },
  };

  return (
    <View style={[styles.outerContainer, { bottom: bottomOffset }]}>
      <View style={[styles.glassContainer, dynamicStyles.glassContainer]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] || {};
          const label = options?.tabBarLabel || options?.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const IconComponent = getIconComponent(route.name);
          const iconColor = isFocused ? colors.primary : colors.textSecondary;
          const textColor = isFocused ? colors.text : colors.textSecondary;

          return (
            <TouchableOpacity
              key={`${route.key}-${index}`}
              accessibilityRole='button'
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                styles.tabButton,
                isFocused && styles.tabButtonFocused, // Apply highlight style
                isFocused && dynamicStyles.tabButtonFocused,
              ]}
              activeOpacity={0.8}
            >
              <IconComponent size={22} color={iconColor} strokeWidth={isFocused ? 2 : 1.5} />
              <Text
                style={[
                  styles.label,
                  {
                    color: textColor,
                    fontWeight: isFocused ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {typeof label === 'string' ? label : route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Styles updated to mirror the ProfileHeader component
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
    justifyContent: 'space-around',
    padding: 8,
    borderRadius: 24, // Match header
    borderWidth: 1,
    height: 64, // Match header
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
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 18, // Pill shape for the highlight background
    height: '100%',
  },
  tabButtonFocused: {
    // Background color applied dynamically
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default FooterTabs;
