import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Layout from '../screens/(home)/_layout';
import HomeScreen from '../screens/(home)/HomeScreen';
import ProfileScreen from '../screens/(home)/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home">
        {() => (
          <Layout>
            <HomeScreen />
          </Layout>
        )}
      </Stack.Screen>

      <Stack.Screen name="Profile">
        {() => (
          <Layout>
            <ProfileScreen />
          </Layout>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
