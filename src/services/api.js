import { API_BASE_URL } from '@env';

/**
 * Sends a request to the backend to generate an OTP.
 */
export const generateOtpApi = async (phone, deviceId, deviceName) => {
  const details = {
    phone,
    deviceId,
    deviceName,
    lastIP: '0.0.0.0',
  };

  const endpoint = `${API_BASE_URL}/api/login/auth1`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to send OTP');
  }

  return response.json();
};

/**
 * Sends a request to verify the OTP and get session tokens.
 */
export const verifyOtpApi = async (phone, otp, deviceId, deviceName, publicKey, pushToken) => {
  const details = {
    phone,
    otp,
    deviceId,
    deviceName,
    lastIP: '0.0.0.0',
    publicKey,
    pushToken,
  };

  const endpoint = `${API_BASE_URL}/api/login/auth2`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'OTP verification failed');
  }

  const data = await response.json();
  return data;
};

/**
 * Authenticate endpoint used to fetch the user's server-side profile and contacts.
 * Sends Authorization header (Bearer token) and includes publicKey in body for server to update/verify.
 * ALSO sends required device headers x-device-id and x-device-name.
 */
// services/api.js (excerpt)
// services/api.js (AuthenticateApi)
export const AuthenticateApi = async (
  accessToken,
  refreshToken,
  phone,
  deviceId,
  deviceName,
  publicKey,
) => {
  const endpoint = `${API_BASE_URL}/api/auth`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (refreshToken) headers['x-refresh-token'] = refreshToken;
  if (deviceId) headers['x-device-id'] = deviceId;
  if (deviceName) headers['x-device-name'] = deviceName;

  const body = { phone, deviceId, deviceName, publicKey };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Authentication failed');
  }

  const data = await response.json();
  console.log('AuthenticateApi response:', data);
  return data;
};
