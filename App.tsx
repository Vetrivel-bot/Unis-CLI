import React from 'react';
import { StyleSheet, ImageBackground } from 'react-native';
import { ThemeProvider } from './src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from './src/context/themeColors';
import RootNavigator from './src/navigation/RootNavigator';
import { AppProvider } from './src/context/AppContext';
import Icon from 'react-native-vector-icons/Feather';
import { SocketProvider } from './src/context/SocketContext';
Icon.loadFont(); // call once at app start (important for RN CLI)

function AppContainer() {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <SocketProvider>
          <SafeAreaProvider>
            <AppContainer />
          </SafeAreaProvider>
        </SocketProvider>
      </ThemeProvider>
    </AppProvider>
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
