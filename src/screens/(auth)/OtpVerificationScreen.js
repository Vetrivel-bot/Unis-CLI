import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../context/themeColors';
import { verifyOtpApi } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

const OtpVerificationScreen = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = useThemeColors();
  const route = useRoute();
  const navigation = useNavigation();
  const { phone } = route.params || {};

  // get functions from AppContext
  const { deviceId, deviceName, signInWithTokens, setPhone } = useAppContext();

  // Optional: you may capture pushToken/publicKey here and pass them in verifyOtpApi
  const [pushToken, setPushToken] = useState(null);
  const [publicKey, setPublicKey] = useState(null);

  useEffect(() => {
    // if you use push notifications, initialize push token here and setPushToken(...)
    // if you generate keypair, setPublicKey(...)
  }, []);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid OTP.');
      return;
    }
    if (!deviceId || !deviceName) {
      Alert.alert('Error', 'Device information is missing. Try restarting the app.');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOtpApi(phone, otp, deviceId, deviceName, publicKey, pushToken);
      // Expect backend response to include accessToken, refreshToken, user
      const { accessToken, refreshToken, user } = data;

      if (!accessToken || !refreshToken) {
        Alert.alert('Error', 'Missing tokens from server response.');
        return;
      }

      // Save tokens & user via AppContext helper (saves securely & sets user)
      await signInWithTokens({ accessToken, refreshToken }, user);

      // Persist phone into keystore via AppContext helper
      try {
        // setPhone will persist phone in keystore and update context state
        if (typeof setPhone === 'function') await setPhone(phone);
      } catch (err) {
        console.warn('[OtpVerificationScreen] failed to persist phone to keystore', err);
      }

      Alert.alert('Success!', `Welcome, ${user?.phone ?? 'user'}`);

      // Navigate into main app (replace with your main stack name)
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      Alert.alert('Error', error?.message ?? 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Verify OTP</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enter the code sent to {phone}
      </Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        placeholder='Enter OTP'
        placeholderTextColor={colors.textSecondary}
        keyboardType='number-pad'
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleVerifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color='#fff' />
        ) : (
          <Text style={styles.buttonText}>Verify & Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default OtpVerificationScreen;
