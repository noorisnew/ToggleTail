import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';

const SETTINGS_KEY = '@toggletail_settings';

export interface AppSettings {
  dailyTimeLimit: number;
  selectedVoice: string;
  voiceSpeed: number;
  soundEffects: boolean;
  autoPlay: boolean;
  readingLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  narrationMode: 'AI' | 'Human';
}

const DEFAULT_SETTINGS: AppSettings = {
  dailyTimeLimit: 30,
  selectedVoice: 'cheerful',
  voiceSpeed: 1.0,
  soundEffects: true,
  autoPlay: false,
  readingLevel: 'Beginner',
  narrationMode: 'AI',
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('getSettings:', normalizeError(error));
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<boolean> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('updateSettings:', normalizeError(error));
    return false;
  }
}

export async function resetSettings(): Promise<boolean> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return true;
  } catch (error) {
    console.error('resetSettings:', normalizeError(error));
    return false;
  }
}
