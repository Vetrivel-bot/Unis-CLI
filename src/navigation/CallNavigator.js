import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DBtestscreen from '../screens/DBtestscreen';
import CallInterface from '../screens/(call)/CallInterface';
import CallScreen from '../screens/(home)/CallScreen';
import VoiceCallScreen from '../screens/voicecallui/voicecall1';
import VoiceCallScreen1 from '../screens/voicecallui/voicecall2';
const Stack = createNativeStackNavigator();
import HmacTestScreen from '../screens/HmacTestScreen';

const CallNavigator = () => {
  console.log('✅ HmacScreen imported:', typeof DBtestscreen);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* <Stack.Screen name='db' component={DBtestscreen} /> */}
      <Stack.Screen name='chatinterface' component={CallScreen} />
      <Stack.Screen name='voicecall' component={VoiceCallScreen} />

      <Stack.Screen name='voicecall1' component={VoiceCallScreen1} />

      {/* Add more dev/test screens here if needed */}
    </Stack.Navigator>
  );
};

export default CallNavigator;
