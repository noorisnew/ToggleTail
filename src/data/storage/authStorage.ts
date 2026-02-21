/**
 * Authentication storage module for ToggleTail
 * Handles sign-out and clearing user data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';
import {
    EVENT_LOG_KEY,
    LIBRARY_CACHE_KEY,
    LIBRARY_CACHE_TIMESTAMP_KEY,
    NARRATION_MODE_KEY,
    ONBOARDING_KEY,
    PARENT_RECORDINGS_KEY,
    PIN_KEY,
    PROFILE_KEY,
    STORIES_KEY,
    STORY_CONTENT_CACHE_PREFIX,
} from './storageKeys';

// Storage key for auth token (if backend auth is used)
export const AUTH_TOKEN_KEY = 'auth_token_v1';

/**
 * Get current auth token
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('getAuthToken error:', normalizeError(error));
    return null;
  }
}

/**
 * Save auth token
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('setAuthToken error:', normalizeError(error));
    throw new Error('Failed to save auth token');
  }
}

/**
 * Check if user is signed in (has completed onboarding)
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const onboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
    return onboarding === 'true';
  } catch (error) {
    console.error('isSignedIn error:', normalizeError(error));
    return false;
  }
}

/**
 * Sign out - clears all user data and resets app to initial state
 * Returns true if successful, false otherwise
 */
export async function signOut(): Promise<boolean> {
  try {
    // Get all keys to find story content cache entries
    const allKeys = await AsyncStorage.getAllKeys();
    const storyContentKeys = allKeys.filter(key => 
      key.startsWith(STORY_CONTENT_CACHE_PREFIX)
    );

    // Keys to remove
    const keysToRemove = [
      AUTH_TOKEN_KEY,
      ONBOARDING_KEY,
      PROFILE_KEY,
      PIN_KEY,
      STORIES_KEY,
      NARRATION_MODE_KEY,
      EVENT_LOG_KEY,
      PARENT_RECORDINGS_KEY,
      LIBRARY_CACHE_KEY,
      LIBRARY_CACHE_TIMESTAMP_KEY,
      ...storyContentKeys,
    ];

    // Remove all keys
    await AsyncStorage.multiRemove(keysToRemove);

    return true;
  } catch (error) {
    console.error('signOut error:', normalizeError(error));
    return false;
  }
}

/**
 * Clear only session data (keeps profile and stories)
 * Useful for a "soft" sign-out
 */
export async function clearSession(): Promise<boolean> {
  try {
    await AsyncStorage.multiRemove([
      AUTH_TOKEN_KEY,
      PIN_KEY,
    ]);
    return true;
  } catch (error) {
    console.error('clearSession error:', normalizeError(error));
    return false;
  }
}
