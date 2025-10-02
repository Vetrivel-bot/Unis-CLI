// src/navigation/AuthNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/(auth)/LoginScreen';
import OtpVerificationScreen from '../screens/(auth)/OtpVerificationScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='OtpVerification' component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}
