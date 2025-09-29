import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeNavigator from './HomeNavigator';
import DevNavigator from './DevNavigator';
import VpnScreen from '../screens/(test)/VpnScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomesdFlow" component={VpnScreen} />

      <Stack.Screen name="HomeFlow" component={HomeNavigator} />
                  <Stack.Screen name="DevFlow" component={DevNavigator} />

    </Stack.Navigator>
  );
}
