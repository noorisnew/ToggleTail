/**
 * ElevenLabs Cache Storage
 * Location: src/data/storage/elevenLabsCacheStorage.ts
 *
 * Manages local caching of ElevenLabs-generated audio files.
 * Cache index stored in AsyncStorage, audio files in FileSystem.
 *
 * Key format: `${storyId}_${pageIndex}_${voiceId}`
 * File format: `{storyId}_{pageIndex}_{voiceId}.mp3`
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { normalizeError } from '../../domain/services/errorService';
import { ELEVENLABS_CACHE_KEY } from './storageKeys';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ElevenLabsCacheEntry = {
  /** Unique ID: `${storyId}_${pageIndex}_${voiceId}` */
  id: string;
  storyId: string;
  pageIndex: number;
  voiceId: string;
  /** Local file URI */
  fileUri: string;
  /** ISO timestamp when cached */
  cachedAt: string;
  /** File size in bytes */
  fileSizeBytes: number;
};

export type ElevenLabsCacheIndex = {
  /** Schema version for future migrations */
  version: string;
  /** All cached entries */
  entries: ElevenLabsCacheEntry[];
  /** Total cache size in bytes */
  totalSizeBytes: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = '1.0.0';
const CACHE_DIR_NAME = 'elevenlabs_cache';

/** Default voice if none specified */
export const DEFAULT_VOICE_ID = 'Rachel';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate cache entry ID from components
 */
export function getCacheEntryId(
  storyId: string,
  pageIndex: number,
  voiceId: string
): string {
  return `${storyId}_${pageIndex}_${voiceId}`;
}

/**
 * Get the cache directory path
 */
export function getCacheDirectory(): string {
  return `${FileSystem.documentDirectory}${CACHE_DIR_NAME}/`;
}

/**
 * Generate file path for a cache entry
 */
export function getCacheFilePath(
  storyId: string,
  pageIndex: number,
  voiceId: string
): string {
  const fileName = `${storyId}_${pageIndex}_${voiceId}.mp3`;
  return `${getCacheDirectory()}${fileName}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Index Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the cache index from storage
 */
export async function getCacheIndex(): Promise<ElevenLabsCacheIndex> {
  try {
    const json = await AsyncStorage.getItem(ELEVENLABS_CACHE_KEY);
    if (!json) {
      return { version: CACHE_VERSION, entries: [], totalSizeBytes: 0 };
    }
    const index = JSON.parse(json) as ElevenLabsCacheIndex;
    // Ensure version matches (future migration point)
    if (index.version !== CACHE_VERSION) {
      // For now, treat as empty if version mismatch
      return { version: CACHE_VERSION, entries: [], totalSizeBytes: 0 };
    }
    return index;
  } catch (error) {
    console.error('getCacheIndex error:', normalizeError(error));
    return { version: CACHE_VERSION, entries: [], totalSizeBytes: 0 };
  }
}

/**
 * Save the cache index to storage
 */
async function saveCacheIndex(index: ElevenLabsCacheIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(ELEVENLABS_CACHE_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('saveCacheIndex error:', normalizeError(error));
    throw new Error(`Failed to save cache index: ${normalizeError(error)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Lookup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a cached entry by story/page/voice
 * Returns null if not cached
 */
export async function getCachedAudio(
  storyId: string,
  pageIndex: number,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<ElevenLabsCacheEntry | null> {
  try {
    const id = getCacheEntryId(storyId, pageIndex, voiceId);
    const index = await getCacheIndex();
    const entry = index.entries.find((e) => e.id === id);

    if (!entry) {
      return null;
    }

    // Verify file still exists
    const fileInfo = await FileSystem.getInfoAsync(entry.fileUri);
    if (!fileInfo.exists) {
      // File missing - remove stale entry
      await removeCacheEntry(storyId, pageIndex, voiceId);
      return null;
    }

    return entry;
  } catch (error) {
    console.error('getCachedAudio error:', normalizeError(error));
    return null;
  }
}

/**
 * Check if audio is cached for a story/page/voice
 */
export async function isCached(
  storyId: string,
  pageIndex: number,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<boolean> {
  const entry = await getCachedAudio(storyId, pageIndex, voiceId);
  return entry !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure cache directory exists
 */
export async function ensureCacheDirectory(): Promise<void> {
  const dirPath = getCacheDirectory();
  const dirInfo = await FileSystem.getInfoAsync(dirPath);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
}

/**
 * Save audio data to cache
 *
 * @param storyId - Story ID
 * @param pageIndex - Page index (0-based)
 * @param voiceId - Voice identifier
 * @param audioData - Raw audio data as base64 string
 * @returns The created cache entry, or null on failure
 */
export async function saveToCache(
  storyId: string,
  pageIndex: number,
  voiceId: string,
  audioData: string
): Promise<ElevenLabsCacheEntry | null> {
  try {
    await ensureCacheDirectory();

    const id = getCacheEntryId(storyId, pageIndex, voiceId);
    const filePath = getCacheFilePath(storyId, pageIndex, voiceId);

    // Write audio file
    await FileSystem.writeAsStringAsync(filePath, audioData, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    const fileSizeBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

    // Create entry
    const entry: ElevenLabsCacheEntry = {
      id,
      storyId,
      pageIndex,
      voiceId,
      fileUri: filePath,
      cachedAt: new Date().toISOString(),
      fileSizeBytes,
    };

    // Update index
    const index = await getCacheIndex();

    // Remove existing entry for same id if present
    const existingIndex = index.entries.findIndex((e) => e.id === id);
    if (existingIndex >= 0) {
      const oldEntry = index.entries[existingIndex];
      index.totalSizeBytes -= oldEntry.fileSizeBytes;
      index.entries.splice(existingIndex, 1);
    }

    // Add new entry
    index.entries.push(entry);
    index.totalSizeBytes += fileSizeBytes;

    await saveCacheIndex(index);

    return entry;
  } catch (error) {
    console.error('saveToCache error:', normalizeError(error));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Remove
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove a single cache entry
 */
export async function removeCacheEntry(
  storyId: string,
  pageIndex: number,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<boolean> {
  try {
    const id = getCacheEntryId(storyId, pageIndex, voiceId);
    const index = await getCacheIndex();

    const entryIndex = index.entries.findIndex((e) => e.id === id);
    if (entryIndex < 0) {
      return false; // Not found
    }

    const entry = index.entries[entryIndex];

    // Delete file
    try {
      await FileSystem.deleteAsync(entry.fileUri, { idempotent: true });
    } catch {
      // Ignore file deletion errors
    }

    // Update index
    index.totalSizeBytes -= entry.fileSizeBytes;
    index.entries.splice(entryIndex, 1);

    await saveCacheIndex(index);
    return true;
  } catch (error) {
    console.error('removeCacheEntry error:', normalizeError(error));
    return false;
  }
}

/**
 * Remove all cache entries for a story
 */
export async function removeStoryCache(storyId: string): Promise<number> {
  try {
    const index = await getCacheIndex();
    const entriesToRemove = index.entries.filter((e) => e.storyId === storyId);

    if (entriesToRemove.length === 0) {
      return 0;
    }

    // Delete files
    for (const entry of entriesToRemove) {
      try {
        await FileSystem.deleteAsync(entry.fileUri, { idempotent: true });
      } catch {
        // Ignore file deletion errors
      }
    }

    // Update index
    const remainingEntries = index.entries.filter((e) => e.storyId !== storyId);
    const removedSize = entriesToRemove.reduce((sum, e) => sum + e.fileSizeBytes, 0);

    index.entries = remainingEntries;
    index.totalSizeBytes -= removedSize;

    await saveCacheIndex(index);
    return entriesToRemove.length;
  } catch (error) {
    console.error('removeStoryCache error:', normalizeError(error));
    return 0;
  }
}

/**
 * Clear entire cache
 */
export async function clearCache(): Promise<void> {
  try {
    // Delete cache directory
    const dirPath = getCacheDirectory();
    try {
      await FileSystem.deleteAsync(dirPath, { idempotent: true });
    } catch {
      // Ignore errors
    }

    // Reset index
    const emptyIndex: ElevenLabsCacheIndex = {
      version: CACHE_VERSION,
      entries: [],
      totalSizeBytes: 0,
    };
    await saveCacheIndex(emptyIndex);
  } catch (error) {
    console.error('clearCache error:', normalizeError(error));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Stats
// ─────────────────────────────────────────────────────────────────────────────

export type CacheStats = {
  entryCount: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  storiesWithCache: number;
};

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const index = await getCacheIndex();
  const uniqueStories = new Set(index.entries.map((e) => e.storyId));

  return {
    entryCount: index.entries.length,
    totalSizeBytes: index.totalSizeBytes,
    totalSizeMB: Math.round((index.totalSizeBytes / (1024 * 1024)) * 100) / 100,
    storiesWithCache: uniqueStories.size,
  };
}
