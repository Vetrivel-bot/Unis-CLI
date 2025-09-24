import React from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screen/HomeScreen';
import SecureStorageScreen from './src/screen/SecureStorageScreen';
import ThemeDemoScreen from './src/screen/ThemeDemoScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home" 
        screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Hello Navigation' }} />
          <Stack.Screen name="SecureStorage" component={SecureStorageScreen} options={{ title: 'Secure Storage Test' }} />
          <Stack.Screen name="ThemeDemo" component={ThemeDemoScreen} options={{ title: 'Theme Demo' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
