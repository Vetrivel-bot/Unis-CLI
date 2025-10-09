import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ThemeDemoScreen from '../screens/ThemeDemoScreen';
import SecureStorageScreen from '../screens/SecureStorageScreen';
import HmacTestScreen from '../screens/HmacTestScreen';
import CryptoTestScreen from '../screens/(test)/CryptoTestScreen';

const Stack = createNativeStackNavigator();

const DevNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>

      <Stack.Screen name='CryptoDemo' component={CryptoTestScreen} />

      <Stack.Screen name='HmacTest' component={HmacTestScreen} />

      <Stack.Screen name='SecureStorage' component={SecureStorageScreen} />

      <Stack.Screen name='ThemeDemo' component={ThemeDemoScreen} />

      
      {/* Add more dev/test screens here if needed */}
    </Stack.Navigator>
  );
};

export default DevNavigator;
