/**
 * Safe wrapper for expo-speech-recognition that handles missing native module.
 * This allows the app to run in Expo Go without crashing.
 * Speech recognition features will be disabled, but everything else works.
 */

import { useEffect } from 'react';

// Check if the native module is available
let isNativeModuleAvailable = false;
let SpeechRecognitionModule: any = null;
let useSpeechRecognitionEventOriginal: any = null;

try {
  // Try to import the native module
  const speechRecognition = require('expo-speech-recognition');
  SpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEventOriginal = speechRecognition.useSpeechRecognitionEvent;
  
  // Check if the module actually works (has the required methods)
  if (SpeechRecognitionModule && typeof SpeechRecognitionModule.requestPermissionsAsync === 'function') {
    isNativeModuleAvailable = true;
  }
} catch (error) {
  console.log('expo-speech-recognition native module not available (expected in Expo Go)');
  isNativeModuleAvailable = false;
}

/**
 * Check if speech recognition is available
 */
export function isSpeechRecognitionAvailable(): boolean {
  return isNativeModuleAvailable;
}

/**
 * Safe version of ExpoSpeechRecognitionModule
 * Returns a mock implementation if native module is not available
 */
export const SafeSpeechRecognitionModule = {
  requestPermissionsAsync: async () => {
    if (!isNativeModuleAvailable) {
      return { granted: false, canAskAgain: false, status: 'unavailable' };
    }
    return SpeechRecognitionModule.requestPermissionsAsync();
  },
  
  start: async (options: any) => {
    if (!isNativeModuleAvailable) {
      throw new Error('Speech recognition requires a native build. Please use "Read to Me" or "Read Myself" mode in Expo Go.');
    }
    return SpeechRecognitionModule.start(options);
  },
  
  stop: async () => {
    if (!isNativeModuleAvailable) {
      return; // No-op
    }
    return SpeechRecognitionModule.stop();
  },
};

/**
 * Safe version of useSpeechRecognitionEvent hook
 * Does nothing if native module is not available
 */
export function useSpeechRecognitionEventSafe(
  event: string,
  callback: (event: any) => void
): void {
  useEffect(() => {
    if (!isNativeModuleAvailable || !useSpeechRecognitionEventOriginal) {
      return; // No-op - just don't set up the listener
    }
  }, [event, callback]);
  
  // Only call the original hook if available
  if (isNativeModuleAvailable && useSpeechRecognitionEventOriginal) {
    try {
      useSpeechRecognitionEventOriginal(event, callback);
    } catch (error) {
      // Silently ignore errors in Expo Go
    }
  }
}

/**
 * Get a user-friendly message about speech recognition availability
 */
export function getSpeechRecognitionUnavailableMessage(): string {
  return 'Speech recognition requires a native app build and is not available in Expo Go. Please select "Read to Me" or "Read Myself" mode instead.';
}
