/**
 * API configuration for ToggleTail backend
 *
 * URL resolution order (first defined wins):
 *   1. EXPO_PUBLIC_API_URL env variable  — set in the root .env file
 *   2. Platform-specific dev fallback    — localhost for web, LAN IP for devices
 *
 * To switch environments:
 *   - Development web  : set EXPO_PUBLIC_API_URL=http://localhost:3001
 *   - Physical device  : set EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:3001
 *   - Production       : set EXPO_PUBLIC_API_URL=https://your-api.example.com
 */

import { Platform } from 'react-native';

/**
 * Return the appropriate dev-mode fallback URL based on the current platform.
 * Only used when EXPO_PUBLIC_API_URL is not set in the environment.
 */
const getDevFallbackUrl = (): string => {
  if (Platform.OS === 'web') {
    // Web browser shares the host machine — localhost always works.
    return 'http://localhost:3001';
  }
  if (Platform.OS === 'ios') {
    // iOS simulator shares the host network stack — localhost works.
    // Physical iOS devices need the host machine's LAN IP via EXPO_PUBLIC_API_URL.
    return 'http://localhost:3001';
  }
  // Android emulator maps 10.0.2.2 → host machine localhost.
  // Physical Android devices need the host machine's LAN IP via EXPO_PUBLIC_API_URL.
  return 'http://10.0.2.2:3001';
};

/**
 * Resolved API base URL.
 * All fetch calls in src/data/api/ and src/services/ use this value.
 */
export const API_BASE_URL: string = (() => {
  // EXPO_PUBLIC_* variables are inlined by the Expo bundler at build time.
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  return __DEV__ ? getDevFallbackUrl() : 'https://your-production-url.com';
})();
