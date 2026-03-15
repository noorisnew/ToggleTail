import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';

const SETTINGS_KEY = '@toggletail_settings';
const SCREEN_TIME_KEY = '@toggletail_screen_time';

export interface AppSettings {
  // Screen Time
  dailyTimeLimit: number; // minutes (0 = unlimited)
  screenTimeEnabled: boolean;
  
  // Reading Level
  readingLevel: 1 | 2 | 3; // 1=Beginner, 2=Intermediate, 3=Advanced
  autoAdjustLevel: boolean;
  
  // Voice Settings
  selectedVoice: string;
  voiceSpeed: number; // 0.5 to 2.0
  voicePitch: number; // 0.5 to 2.0
  
  // Audio
  soundEffects: boolean;
  autoPlay: boolean;
  backgroundMusic: boolean;
  
  // Content Filters
  allowedGenres: string[];
  contentSafeMode: boolean;
  
  // Narration
  narrationMode: 'AI' | 'Human';
}

export interface ScreenTimeData {
  date: string; // YYYY-MM-DD
  minutesUsed: number;
  sessionsCount: number;
  lastSessionStart?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  // Screen Time
  dailyTimeLimit: 30,
  screenTimeEnabled: false,
  
  // Reading Level
  readingLevel: 1,
  autoAdjustLevel: false,
  
  // Voice Settings
  selectedVoice: 'default',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  
  // Audio
  soundEffects: true,
  autoPlay: true,
  backgroundMusic: false,
  
  // Content Filters
  allowedGenres: ['Animals', 'Adventure', 'Bedtime', 'Fantasy', 'Science', 'Values'],
  contentSafeMode: true,
  
  // Narration
  narrationMode: 'AI',
};

const ALL_GENRES = ['Animals', 'Adventure', 'Bedtime', 'Fantasy', 'Science', 'Values'];

export { ALL_GENRES };

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

// Screen Time Tracking
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getScreenTime(): Promise<ScreenTimeData> {
  try {
    const today = getTodayKey();
    const data = await AsyncStorage.getItem(SCREEN_TIME_KEY);
    if (data) {
      const parsed = JSON.parse(data) as ScreenTimeData;
      // Reset if it's a new day
      if (parsed.date !== today) {
        const newData: ScreenTimeData = {
          date: today,
          minutesUsed: 0,
          sessionsCount: 0,
        };
        await AsyncStorage.setItem(SCREEN_TIME_KEY, JSON.stringify(newData));
        return newData;
      }
      return parsed;
    }
    const newData: ScreenTimeData = {
      date: today,
      minutesUsed: 0,
      sessionsCount: 0,
    };
    await AsyncStorage.setItem(SCREEN_TIME_KEY, JSON.stringify(newData));
    return newData;
  } catch (error) {
    console.error('getScreenTime:', normalizeError(error));
    return { date: getTodayKey(), minutesUsed: 0, sessionsCount: 0 };
  }
}

export async function addScreenTime(minutes: number): Promise<boolean> {
  try {
    const current = await getScreenTime();
    const updated: ScreenTimeData = {
      ...current,
      minutesUsed: current.minutesUsed + minutes,
    };
    await AsyncStorage.setItem(SCREEN_TIME_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('addScreenTime:', normalizeError(error));
    return false;
  }
}

export async function startSession(): Promise<boolean> {
  try {
    const current = await getScreenTime();
    const updated: ScreenTimeData = {
      ...current,
      sessionsCount: current.sessionsCount + 1,
      lastSessionStart: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SCREEN_TIME_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('startSession:', normalizeError(error));
    return false;
  }
}

export async function checkScreenTimeLimit(): Promise<{ allowed: boolean; minutesRemaining: number }> {
  try {
    const settings = await getSettings();
    if (!settings.screenTimeEnabled || settings.dailyTimeLimit === 0) {
      return { allowed: true, minutesRemaining: -1 }; // -1 means unlimited
    }
    
    const screenTime = await getScreenTime();
    const remaining = settings.dailyTimeLimit - screenTime.minutesUsed;
    
    return {
      allowed: remaining > 0,
      minutesRemaining: Math.max(0, remaining),
    };
  } catch (error) {
    console.error('checkScreenTimeLimit:', normalizeError(error));
    return { allowed: true, minutesRemaining: -1 };
  }
}
