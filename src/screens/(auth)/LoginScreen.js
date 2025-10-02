// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../context/themeColors';
import { generateOtpApi } from '../../services/api';
import { useAppContext } from '../../context/AppContext'; // 1. Import the context hook

const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = useThemeColors();
  const navigation = useNavigation();
  
  // 2. Get device details and loading status from the context
  const { deviceId, deviceName, isLoading: isContextLoading } = useAppContext();

  const handleSendOtp = async () => {
    // 3. Ensure device details are loaded before making the API call
    if (isContextLoading || !deviceId || !deviceName) {
      Alert.alert('Initializing...', 'Please wait a moment while the app is starting.');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      // 4. Pass the device details from context to the API function
      await generateOtpApi(phone, deviceId, deviceName);
      navigation.navigate('OtpVerification', { phone });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Enter Your Phone</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        placeholder="Phone Number"
        placeholderTextColor={colors.textSecondary}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSendOtp}
        disabled={loading || isContextLoading} // 5. Disable button while either state is loading
      >
        {(loading || isContextLoading) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default LoginScreen;