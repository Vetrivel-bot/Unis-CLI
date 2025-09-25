import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FooterTabs from '../component/layout/FooterTabs';
// Screens
import ProfileScreen from '../screens/(home)/ProfileScreen';

import { View } from 'react-native';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <FooterTabs {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* <Tab.Screen name="Chat" component={ChatListScreen} /> */}
      <Tab.Screen name='Profile' component={ProfileScreen} />
      {/* Add more screens as needed */}
      <Tab.Screen name='Calls' component={() => <View />} />
      <Tab.Screen name='Status' component={() => <View />} />
      <Tab.Screen name='Contacts' component={() => <View />} />
    </Tab.Navigator>
  );
}
