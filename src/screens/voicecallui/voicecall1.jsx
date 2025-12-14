import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function VoiceCallScreen({ navigation, route }) {
  // Fade animation setup
  const { name, avatarUrl } = route.params || {};

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800, // fade-in duration (ms)
      useNativeDriver: true,
    }).start();
  }, []);

  // Function to handle accepting call with fade transition
  const handleAcceptCall = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400, // fade-out before navigating
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate('voicecall1', {
        name,
        avatarUrl,
      });
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Profile Section */}
      <View style={styles.profileContainer}>
        <Image
          source={{
            uri: avatarUrl,
          }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.status}>Voice Call</Text>
      </View>

      {/* Spacer between profile and call buttons */}
      <View style={{ height: 180 }} />

      {/* Call Buttons */}
      <View style={styles.callControls}>
        {/* End Call Button */}
        <TouchableOpacity
          style={[styles.iconButton, styles.endCallButton]}
          onPress={() => navigation.goBack()}
        >
          <Icon name='call' size={32} color='#fff' style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>

        {/* Spacer between buttons */}
        <View style={{ width: 140 }} />

        {/* Call Accept Button */}
        <TouchableOpacity
          style={[styles.iconButton, styles.callButton]}
          onPress={() =>
            navigation.navigate('voicecall1', {
              name,
              avatarUrl,
            })
          }
        >
          <Icon name='call' size={32} color='#fff' />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1eff', // dark navy blue
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileContainer: {
    alignItems: 'center',
  },

  profileImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#2E2E3A',
    marginBottom: 20,
    shadowColor: '#2C9EFF',
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },

  name: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 8,
  },

  status: {
    color: '#9A9AA5',
    fontSize: 16,
    marginTop: 6,
  },

  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconButton: {
    backgroundColor: '#1E1E25',
    padding: 24,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#2C2C38',
    elevation: 8,
    shadowColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  callButton: {
    backgroundColor: '#3bd94dff',
    borderColor: '#3acd66ff',
  },

  endCallButton: {
    backgroundColor: '#ff3b30',
    borderColor: '#ff4c4c',
  },
});
