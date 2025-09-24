import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather'; // Using Feather icons as an example

// Assuming useThemeColors returns an object like { background: '...', text: '...', ... }
// If your hook is different, you might need to adjust the color names.
import { useThemeColors } from '../../context/themeColors'; 

interface ProfileHeaderProps {
  title: string;
  onPressLeft?: () => void;
  onPressRight?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  title, 
  onPressLeft, 
  onPressRight 
}) => {
  const navigation = useNavigation();
  const colors = useThemeColors();

  // Default left action is to go back, if available
  const handleLeftPress = onPressLeft ? onPressLeft : () => navigation.canGoBack() && navigation.goBack();
  
  // A placeholder function for the right icon
  const handleRightPress = onPressRight ? onPressRight : () => console.log('Right icon pressed');

  return (
    // SafeAreaView might be needed here depending on your screen setup
    <View style={[styles.container, { backgroundColor: colors.background }]}>
       <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} />
      {/* Left Icon */}
      <TouchableOpacity onPress={handleLeftPress} style={styles.iconContainer}>
        <Feather name="menu" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {/* Right Icon */}
      <TouchableOpacity onPress={handleRightPress} style={styles.iconContainer}>
        <Feather name="search" size={22} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // This is key for the layout
    paddingVertical: 12,
    paddingHorizontal: 16,
    // No bottom border to match the image
  },
  title: {
    fontSize: 22, // Bigger font size
    fontWeight: 'bold', // Bolder text
    textAlign: 'center',
  },
  iconContainer: {
    padding: 4, // Makes the touch area a bit bigger
  },
});

export default ProfileHeader;