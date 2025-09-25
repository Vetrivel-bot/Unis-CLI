import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ThemeDemoScreen from '../screens/ThemeDemoScreen';

const Stack = createNativeStackNavigator();

const DevNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='ThemeDemo' component={ThemeDemoScreen} />
      {/* Add more dev/test screens here if needed */}
    </Stack.Navigator>
  );
};

export default DevNavigator;
