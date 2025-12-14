import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ThemeDemoScreen from '../screens/ThemeDemoScreen';
import SecureStorageScreen from '../screens/SecureStorageScreen';
import DBtestscreen from "../screens/DBtestscreen"
const Stack = createNativeStackNavigator();

const DevNavigator = () => {
  console.log("✅ HmacScreen imported:", typeof DBtestscreen);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
           <Stack.Screen name='ThemeDemo' component={ThemeDemoScreen} />
 <Stack.Screen name='HmacTest' component={DBtestscreen} />

      <Stack.Screen name='SecureStorage' component={SecureStorageScreen} />

      {/* Add more dev/test screens here if needed */}
    </Stack.Navigator>
  );
};

export default DevNavigator;
