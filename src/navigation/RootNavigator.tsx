import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeNavigator from './HomeNavigator';
import DevNavigator from './DevNavigator';
import MainTabs from './TabNavigator'; // <-- import your tab navigator

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab navigator as the main app flow */}
      <Stack.Screen name='MainTabs' component={MainTabs} />

      {/* Other flows */}
      <Stack.Screen name='HomeFlow' component={HomeNavigator} />
      <Stack.Screen name='DevFlow' component={DevNavigator} />
    </Stack.Navigator>
  );
}
