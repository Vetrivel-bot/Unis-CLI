import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function VoiceCallScreen1({ navigation, route }) {
  const { name, avatarUrl } = route.params || {};

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting...'); // NEW STATE

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Call status and timer logic
  useEffect(() => {
    let timer1, timer2, interval;

    // Step 1: Show "Connecting..." for 1 sec
    timer1 = setTimeout(() => {
      setCallStatus('Connecting...');

      // Step 2: Show "Ringing..." for 5 sec
      timer2 = setTimeout(() => {
        setCallStatus('Connected');
        setSecondsElapsed(0);

        // Step 3: Start actual call timer
        interval = setInterval(() => {
          setSecondsElapsed(prev => prev + 1);
        }, 1000);
      }, 3000);
    }, 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(interval);
    };
  }, []);

  const formatTime = secs => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.profileContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <Image
          source={{
            uri: avatarUrl,
          }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{name}</Text>

        {/* Display call status or timer */}
        <Text style={styles.callTime}>
          {callStatus !== 'Connected' ? callStatus : formatTime(secondsElapsed)}
        </Text>
      </Animated.View>

      <View style={{ height: 180 }} />

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => setIsMuted(!isMuted)}
          style={[styles.iconButton, isMuted && styles.activeButton]}
        >
          <Icon name={isMuted ? 'mic-off' : 'mic'} size={28} color='#fff' />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('chatinterface')}
          style={[styles.iconButton, styles.endCallButton]}
        >
          <Icon name='call' size={28} color='#fff' style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSpeaker(!isSpeaker)}
          style={[styles.iconButton, isSpeaker && styles.activeButton]}
        >
          <Icon name={isSpeaker ? 'volume-high' : 'volume-medium'} size={28} color='#fff' />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1eff',
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
  },
  name: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '600',
    marginTop: 6,
  },
  callTime: {
    color: '#9a9a9a',
    fontSize: 18,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '70%',
  },
  iconButton: {
    backgroundColor: '#1E1E25',
    padding: 18,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#2C2C38',
    elevation: 8,
    shadowColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#3b3b44',
    borderColor: '#4c4c5a',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
});
