import React, { useEffect, useRef, useState } from 'react';
import { View, Button, StyleSheet, Animated, Easing, Text } from 'react-native';
import { NativeModules } from 'react-native';

const { ScreenSecurityModule } = NativeModules;

export default function App() {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [secureEnabled, setSecureEnabled] = useState(false);

  const toggleSecurity = () => {
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Toggle FLAG_SECURE
      if (!secureEnabled) {
        ScreenSecurityModule.enableSecurity();
      } else {
        ScreenSecurityModule.disableSecurity();
      }
      setSecureEnabled(!secureEnabled);

      // Fade back in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      ScreenSecurityModule.enableSecurity();
      setSecureEnabled(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* <Button
        title={secureEnabled ? "Disable Security" : "Enable Security"}
        onPress={toggleSecurity}
      /> */}
      <Text >dfjsadfjsdfj</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
