// src/navigation/RootNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import CallNavigator from "./CallNavigator"
import MainTabs from './TabNavigator';
import AuthNavigator from './AuthNavigator';
import HomeNavigator from './HomeNavigator'; // <-- make sure this exists
import { useAppContext } from '../context/AppContext';
import DevNavigator from './DevNavigator';
const Stack = createNativeStackNavigator();

const SplashScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size='large' />
  </View>
);

export default function RootNavigator() {
  const { user, isLoading } = useAppContext();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen name='Devflow' component={DevNavigator} /> */}

      {user ? (
        <>
                  <Stack.Screen name='ChatInterface' component={CallNavigator} />

          <Stack.Screen name='MainTabs' component={MainTabs} />
          <Stack.Screen name='HomeFlow' component={HomeNavigator} />
        </>
      ) : (
        <Stack.Screen name='AuthFlow' component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
