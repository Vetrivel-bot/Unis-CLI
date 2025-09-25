import React from 'react';
import { StyleSheet, ImageBackground } from 'react-native';
import { ThemeProvider } from './src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from './src/context/themeColors';
import RootNavigator from './src/navigation/RootNavigator';
import Icon from 'react-native-vector-icons/Feather';

Icon.loadFont(); // call once at app start (important for RN CLI)

function AppContainer() {
  const colors = useThemeColors();

  return (
    <ImageBackground
      source={require('./src/assets/Unis.png')} // place Unis.png inside assets folder
      style={styles.background}
      resizeMode="cover" // change to "contain" or "repeat" if needed
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </ImageBackground>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContainer />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
