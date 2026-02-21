import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';
import { PROFILE_KEY } from './storageKeys';

export type ReadingLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type AvatarType = 'Lion' | 'Bear' | 'Bunny' | 'Panda' | 'Fox' | 'Koala' | 'Unicorn' | 'Frog' | 'Owl' | 'Octopus' | 'Dino' | 'Cat';

export type InterestType = 'Super Heroes' | 'Dragons & Magic' | 'Fairy Tales' | 'Mystery & Puzzles' | 'Dinosaurs' | 'Ocean Adventures' | 'Cute Animals' | 'Space & Robots';

export type ChildProfile = {
  name: string;
  age: number;
  readingLevel: ReadingLevel;
  avatar?: AvatarType;
  interests?: InterestType[];
  readingStreak?: number;
  lastReadDate?: string;
  totalStoriesRead?: number;
  favoriteStories?: string[];
};

/**
 * Get the child profile from storage
 * Returns null if no profile exists
 */
export async function getProfile(): Promise<ChildProfile | null> {
  try {
    const json = await AsyncStorage.getItem(PROFILE_KEY);
    if (!json) {
      return null;
    }
    return JSON.parse(json) as ChildProfile;
  } catch (error) {
    console.error('getProfile:', normalizeError(error));
    return null;
  }
}

/**
 * Save the child profile to storage
 */
export async function saveProfile(profile: ChildProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('saveProfile:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}

/**
 * Save the child profile to storage (alias for saveProfile)
 */
export async function setProfile(profile: ChildProfile): Promise<void> {
  return saveProfile(profile);
}

/**
 * Clear the child profile from storage
 */
export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    console.error('clearProfile:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}

/**
 * Update specific fields of the child profile
 */
export async function updateProfile(updates: Partial<ChildProfile>): Promise<ChildProfile | null> {
  try {
    const current = await getProfile();
    if (!current) {
      return null;
    }
    const updated = { ...current, ...updates };
    await setProfile(updated);
    return updated;
  } catch (error) {
    console.error('updateProfile:', normalizeError(error));
    return null;
  }
}
