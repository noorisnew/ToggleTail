import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';
import { NARRATION_MODE_KEY } from './storageKeys';

export type NarrationMode = 'AI' | 'Human';

/**
 * Get the current narration mode
 * Defaults to 'AI' if not set
 */
export async function getNarrationMode(): Promise<NarrationMode> {
  try {
    const mode = await AsyncStorage.getItem(NARRATION_MODE_KEY);
    if (mode === 'AI' || mode === 'Human') {
      return mode;
    }
    return 'AI'; // Default
  } catch (error) {
    console.error('getNarrationMode:', normalizeError(error));
    return 'AI';
  }
}

/**
 * Set the narration mode
 */
export async function setNarrationMode(mode: NarrationMode): Promise<void> {
  try {
    await AsyncStorage.setItem(NARRATION_MODE_KEY, mode);
  } catch (error) {
    console.error('setNarrationMode:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}
