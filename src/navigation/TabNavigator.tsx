// TabNavigator.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
// Screens
import ProfileScreen from '../screens/(home)/ProfileScreen';
import CallScreen from "../screens/(home)/CallScreen"
const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      // 1. REMOVE the tabBar prop
      // tabBar={props => <SecondaryHeader {...props} />}

      screenOptions={{
        headerShown: false,
        // 2. HIDE the default tab bar that would otherwise appear
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name='Chat' component={ProfileScreen} />
      <Tab.Screen name='Calls' component={CallScreen} />
      <Tab.Screen name='Status' component={() => <View />} />
    </Tab.Navigator>
  );
}
