import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View>
      <Text>Welcome to Home!</Text>
      <Button title="Go to Profile" onPress={() => navigation.navigate('Profile' as never)} />
    </View>
  );
};

export default HomeScreen;
