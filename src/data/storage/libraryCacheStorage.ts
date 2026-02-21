import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { normalizeError } from '../../domain/services/errorService';
import {
    LIBRARY_CACHE_KEY,
    LIBRARY_CACHE_TIMESTAMP_KEY,
    STORY_CONTENT_CACHE_PREFIX,
} from './storageKeys';

// Cache config
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export type CachedLibraryStory = {
  _id: string;
  title: string;
  category: string;
  ageBand: string;
  readingLevel: string;
  provider: string;
  coverUrl: string | null;
  wordCount: number;
  text?: string;
  author?: string;
};

export type LibraryCache = {
  stories: CachedLibraryStory[];
  timestamp: number;
};

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    console.warn('Could not check network status:', error);
    return true; // Assume online if we can't check
  }
}

/**
 * Check if cache is valid (exists and not expired)
 */
export async function isCacheValid(): Promise<boolean> {
  try {
    const timestampStr = await AsyncStorage.getItem(LIBRARY_CACHE_TIMESTAMP_KEY);
    if (!timestampStr) return false;

    const timestamp = parseInt(timestampStr, 10);
    const age = Date.now() - timestamp;
    return age < CACHE_DURATION_MS;
  } catch (error) {
    console.error('isCacheValid error:', normalizeError(error));
    return false;
  }
}

/**
 * Get cached library stories
 */
export async function getCachedLibraryStories(): Promise<CachedLibraryStory[] | null> {
  try {
    const json = await AsyncStorage.getItem(LIBRARY_CACHE_KEY);
    if (!json) return null;
    return JSON.parse(json) as CachedLibraryStory[];
  } catch (error) {
    console.error('getCachedLibraryStories error:', normalizeError(error));
    return null;
  }
}

/**
 * Cache library stories
 */
export async function cacheLibraryStories(stories: CachedLibraryStory[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(stories));
    await AsyncStorage.setItem(LIBRARY_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('cacheLibraryStories error:', normalizeError(error));
  }
}

/**
 * Get cached story content by ID
 */
export async function getCachedStoryContent(storyId: string): Promise<CachedLibraryStory | null> {
  try {
    const key = `${STORY_CONTENT_CACHE_PREFIX}${storyId}`;
    const json = await AsyncStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json) as CachedLibraryStory;
  } catch (error) {
    console.error('getCachedStoryContent error:', normalizeError(error));
    return null;
  }
}

/**
 * Cache story content
 */
export async function cacheStoryContent(story: CachedLibraryStory): Promise<void> {
  try {
    const key = `${STORY_CONTENT_CACHE_PREFIX}${story._id}`;
    await AsyncStorage.setItem(key, JSON.stringify(story));
  } catch (error) {
    console.error('cacheStoryContent error:', normalizeError(error));
  }
}

/**
 * Clear all library cache
 */
export async function clearLibraryCache(): Promise<void> {
  try {
    // Get all keys and remove cache-related ones
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      key => key === LIBRARY_CACHE_KEY ||
             key === LIBRARY_CACHE_TIMESTAMP_KEY ||
             key.startsWith(STORY_CONTENT_CACHE_PREFIX)
    );
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error('clearLibraryCache error:', normalizeError(error));
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  storyCount: number;
  cacheAge: number | null;
  isValid: boolean;
}> {
  try {
    const stories = await getCachedLibraryStories();
    const timestampStr = await AsyncStorage.getItem(LIBRARY_CACHE_TIMESTAMP_KEY);
    const timestamp = timestampStr ? parseInt(timestampStr, 10) : null;
    const valid = await isCacheValid();

    return {
      storyCount: stories?.length || 0,
      cacheAge: timestamp ? Date.now() - timestamp : null,
      isValid: valid,
    };
  } catch (error) {
    console.error('getCacheStats error:', normalizeError(error));
    return { storyCount: 0, cacheAge: null, isValid: false };
  }
}
