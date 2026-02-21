/**
 * API configuration for ToggleTail backend
 */
import { Platform } from 'react-native';

// Production URL (update when deployed)
const PROD_API_URL = 'https://your-production-url.com';

// Development URLs for different platforms
const getDevApiUrl = () => {
  if (Platform.OS === 'web') {
    // Web browser can use localhost
    return 'http://localhost:3001';
  } else if (Platform.OS === 'android') {
    // Android emulator uses special IP to reach host machine
    // For physical Android device, use the computer's IP
    return 'http://192.168.1.37:3001';
  } else {
    // iOS simulator can use localhost, physical iOS device needs IP
    return 'http://192.168.1.37:3001';
  }
};

export const API_BASE_URL = __DEV__ ? getDevApiUrl() : PROD_API_URL;
