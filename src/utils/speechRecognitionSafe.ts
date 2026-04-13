/**
 * Safe wrapper for expo-speech-recognition that handles missing native module.
 * This allows the app to run in Expo Go without crashing.
 * Speech recognition features will be disabled, but everything else works.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';

// Primary guard: Expo Go never has working native audio/speech modules.
// Checking this first avoids requiring a module that partially loads but fails.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let isNativeModuleAvailable = false;
let SpeechRecognitionModule: any = null;

if (!isExpoGo) {
  try {
    const speechRecognition = require('expo-speech-recognition');
    SpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;

    // Confirm the module actually has the required methods
    if (
      SpeechRecognitionModule &&
      typeof SpeechRecognitionModule.requestPermissionsAsync === 'function' &&
      typeof SpeechRecognitionModule.start === 'function'
    ) {
      isNativeModuleAvailable = true;
    }
  } catch (error) {
    console.log('expo-speech-recognition native module not available');
    isNativeModuleAvailable = false;
  }
}

/**
 * Check if speech recognition is available on this device/build.
 */
export function isSpeechRecognitionAvailable(): boolean {
  return isNativeModuleAvailable;
}

/**
 * Safe version of ExpoSpeechRecognitionModule.
 * Returns a mock implementation if the native module is not available.
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
      throw new Error(
        'Speech recognition requires a native build. Use "Read to Me" or "Read Myself" mode in Expo Go.'
      );
    }
    return SpeechRecognitionModule.start(options);
  },

  stop: async () => {
    if (!isNativeModuleAvailable) {
      return; // no-op
    }
    return SpeechRecognitionModule.stop();
  },
};

/**
 * Safe version of useSpeechRecognitionEvent.
 *
 * Always calls useEffect (satisfying Rules of Hooks).
 * Sets up the native event listener inside the effect only when available,
 * so it never runs in Expo Go and never causes a conditional-hook violation.
 */
export function useSpeechRecognitionEventSafe(
  event: string,
  callback: (event: any) => void
): void {
  useEffect(() => {
    if (!isNativeModuleAvailable || !SpeechRecognitionModule) {
      return;
    }

    // ExpoSpeechRecognitionModule is an EventEmitter — subscribe directly
    // instead of calling useSpeechRecognitionEvent (which itself uses a hook
    // and cannot be called conditionally).
    let subscription: { remove: () => void } | null = null;
    try {
      subscription = SpeechRecognitionModule.addListener(event, callback);
    } catch (e) {
      // Module loaded but native layer not ready — safe to ignore
    }

    return () => {
      try {
        subscription?.remove();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  // Note: `callback` is intentionally omitted from deps — the speech
  // recognition events fire frequently and re-subscribing on every render
  // causes missed events. The callback is kept stable by useCallback in the
  // calling component.
}

/**
 * Get a user-friendly message about speech recognition availability.
 */
export function getSpeechRecognitionUnavailableMessage(): string {
  if (isExpoGo) {
    return 'The "Read with Help" feature needs a native app build.\n\nIn Expo Go, please choose "Listen to Story" or "Read Myself" instead.';
  }
  return 'Speech recognition is not available on this device. Please choose "Listen to Story" or "Read Myself" instead.';
}
