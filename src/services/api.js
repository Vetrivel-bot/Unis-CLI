// src/services/api.js
import { API_BASE_URL } from '@env'; // Import the URL from your .env file
// const API_BASE_URL = 'http://10.208.124.13:3000';
/**
 * Sends a request to the backend to generate an OTP.
 */
export const generateOtpApi = async (phone, deviceId, deviceName) => {
  const details = {
    phone,
    deviceId,
    deviceName,
    lastIP: '0.0.0.0', // Your server should ideally get the real IP from the request headers
  };

  const endpoint = `${API_BASE_URL}/api/login/auth1`;
  console.log('Requesting OTP from:', endpoint); // For debugging

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to send OTP');
  }

  return response.json();
};

/**
 * Sends a request to verify the OTP and get session tokens.
 * Now includes publicKey and pushToken.
 */
export const verifyOtpApi = async (phone, otp, deviceId, deviceName, publicKey, pushToken) => {
  const details = {
    phone,
    otp,
    deviceId,
    deviceName,
    lastIP: '0.0.0.0',
    publicKey, // Added
    pushToken, // Added
  };

  const endpoint = `${API_BASE_URL}/api/login/auth2`;
  console.log('Verifying OTP at:', endpoint); // For debugging

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'OTP verification failed');
  }

  const data = await response.json();
  return data;
};
