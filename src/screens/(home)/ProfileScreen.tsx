import React from 'react';
import { View, Text } from 'react-native';
import ProfileHeader from '../../component/layout/ProfileHeader';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ProfileHeader     title="Message" 
        onPressLeft={() => console.log("Open Drawer")}
        onPressRight={() => console.log("Open Search")}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Profile Screen Content</Text>
      </View>
    </View>
  );
}
