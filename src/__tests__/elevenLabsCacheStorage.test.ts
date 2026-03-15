/**
 * Tests for ElevenLabs Cache Storage
 */

// Mock expo-file-system/legacy BEFORE imports
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
    clearCache,
    getCachedAudio,
    getCacheDirectory,
    getCacheEntryId,
    getCacheFilePath,
    getCacheIndex,
    getCacheStats,
    isCached,
    removeCacheEntry,
    removeStoryCache,
    saveToCache,
} from '../data/storage/elevenLabsCacheStorage';
import { ELEVENLABS_CACHE_KEY } from '../data/storage/storageKeys';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('ElevenLabs Cache Storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: '' });
    mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);
    mockFileSystem.writeAsStringAsync.mockResolvedValue(undefined);
    mockFileSystem.deleteAsync.mockResolvedValue(undefined);
  });

  describe('Helper Functions', () => {
    it('should generate correct cache entry ID', () => {
      const id = getCacheEntryId('story-001', 3, 'Rachel');
      expect(id).toBe('story-001_3_Rachel');
    });

    it('should generate correct cache directory path', () => {
      const dir = getCacheDirectory();
      expect(dir).toBe('file:///mock/documents/elevenlabs_cache/');
    });

    it('should generate correct cache file path', () => {
      const path = getCacheFilePath('story-001', 3, 'Rachel');
      expect(path).toBe('file:///mock/documents/elevenlabs_cache/story-001_3_Rachel.mp3');
    });
  });

  describe('getCacheIndex', () => {
    it('should return empty index when no cache exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const index = await getCacheIndex();

      expect(index.version).toBe('1.0.0');
      expect(index.entries).toEqual([]);
      expect(index.totalSizeBytes).toBe(0);
    });

    it('should return parsed index from storage', async () => {
      const storedIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///test.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1024,
          },
        ],
        totalSizeBytes: 1024,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedIndex));

      const index = await getCacheIndex();

      expect(index.entries.length).toBe(1);
      expect(index.entries[0].storyId).toBe('story-001');
      expect(index.totalSizeBytes).toBe(1024);
    });

    it('should return empty index on version mismatch', async () => {
      const oldVersionIndex = {
        version: '0.9.0',
        entries: [{ id: 'old-entry' }],
        totalSizeBytes: 500,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldVersionIndex));

      const index = await getCacheIndex();

      expect(index.version).toBe('1.0.0');
      expect(index.entries).toEqual([]);
    });
  });

  describe('getCachedAudio', () => {
    it('should return null when entry not found', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ version: '1.0.0', entries: [], totalSizeBytes: 0 })
      );

      const entry = await getCachedAudio('story-001', 0, 'Rachel');

      expect(entry).toBeNull();
    });

    it('should return entry when found and file exists', async () => {
      const storedIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///test.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1024,
          },
        ],
        totalSizeBytes: 1024,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedIndex));
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        uri: 'file:///test.mp3',
        size: 1024,
        modificationTime: 0,
      });

      const entry = await getCachedAudio('story-001', 0, 'Rachel');

      expect(entry).not.toBeNull();
      expect(entry?.storyId).toBe('story-001');
      expect(entry?.pageIndex).toBe(0);
    });

    it('should return null and clean up if file missing', async () => {
      const storedIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///test.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1024,
          },
        ],
        totalSizeBytes: 1024,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedIndex));
      mockFileSystem.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: '' });

      const entry = await getCachedAudio('story-001', 0, 'Rachel');

      expect(entry).toBeNull();
      // Should attempt to save updated index (removing stale entry)
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should use default voice if not specified', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ version: '1.0.0', entries: [], totalSizeBytes: 0 })
      );

      await getCachedAudio('story-001', 0);

      // Function should complete without error using default voice
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(ELEVENLABS_CACHE_KEY);
    });
  });

  describe('isCached', () => {
    it('should return false when not cached', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ version: '1.0.0', entries: [], totalSizeBytes: 0 })
      );

      const result = await isCached('story-001', 0, 'Rachel');

      expect(result).toBe(false);
    });

    it('should return true when cached', async () => {
      const storedIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///test.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1024,
          },
        ],
        totalSizeBytes: 1024,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedIndex));
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        uri: 'file:///test.mp3',
        size: 1024,
        modificationTime: 0,
      });

      const result = await isCached('story-001', 0, 'Rachel');

      expect(result).toBe(true);
    });
  });

  describe('saveToCache', () => {
    it('should save audio and update index', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ version: '1.0.0', entries: [], totalSizeBytes: 0 })
      );
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        uri: 'file:///test.mp3',
        size: 2048,
        modificationTime: 0,
      });

      const entry = await saveToCache('story-001', 0, 'Rachel', 'base64audiodata');

      expect(entry).not.toBeNull();
      expect(entry?.storyId).toBe('story-001');
      expect(entry?.fileSizeBytes).toBe(2048);
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should replace existing entry for same story/page/voice', async () => {
      const existingIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///old.mp3',
            cachedAt: '2026-03-14T00:00:00.000Z',
            fileSizeBytes: 1024,
          },
        ],
        totalSizeBytes: 1024,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingIndex));
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        uri: 'file:///test.mp3',
        size: 2048,
        modificationTime: 0,
      });

      const entry = await saveToCache('story-001', 0, 'Rachel', 'newbase64data');

      expect(entry).not.toBeNull();
      expect(entry?.fileSizeBytes).toBe(2048);

      // Check that setItem was called with updated index
      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === ELEVENLABS_CACHE_KEY
      );
      const savedIndex = JSON.parse(setItemCall![1]);
      expect(savedIndex.entries.length).toBe(1); // Still only 1 entry
      expect(savedIndex.totalSizeBytes).toBe(2048); // Updated size
    });
  });

  describe('removeCacheEntry', () => {
    it('should return false when entry not found', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ version: '1.0.0', entries: [], totalSizeBytes: 0 })
      );

      const result = await removeCacheEntry('story-001', 0, 'Rachel');

      expect(result).toBe(false);
    });

    it('should delete file and update index', async () => {
      const existingIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///test.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1024,
          },
        ],
        totalSizeBytes: 1024,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingIndex));

      const result = await removeCacheEntry('story-001', 0, 'Rachel');

      expect(result).toBe(true);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith('file:///test.mp3', {
        idempotent: true,
      });

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === ELEVENLABS_CACHE_KEY
      );
      const savedIndex = JSON.parse(setItemCall![1]);
      expect(savedIndex.entries.length).toBe(0);
      expect(savedIndex.totalSizeBytes).toBe(0);
    });
  });

  describe('removeStoryCache', () => {
    it('should remove all entries for a story', async () => {
      const existingIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///test1.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1024,
          },
          {
            id: 'story-001_1_Rachel',
            storyId: 'story-001',
            pageIndex: 1,
            voiceId: 'Rachel',
            fileUri: 'file:///test2.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 2048,
          },
          {
            id: 'story-002_0_Rachel',
            storyId: 'story-002',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///other.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 512,
          },
        ],
        totalSizeBytes: 3584,
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingIndex));

      const removedCount = await removeStoryCache('story-001');

      expect(removedCount).toBe(2);
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === ELEVENLABS_CACHE_KEY
      );
      const savedIndex = JSON.parse(setItemCall![1]);
      expect(savedIndex.entries.length).toBe(1);
      expect(savedIndex.entries[0].storyId).toBe('story-002');
      expect(savedIndex.totalSizeBytes).toBe(512);
    });
  });

  describe('clearCache', () => {
    it('should delete directory and reset index', async () => {
      await clearCache();

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///mock/documents/elevenlabs_cache/',
        { idempotent: true }
      );

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === ELEVENLABS_CACHE_KEY
      );
      const savedIndex = JSON.parse(setItemCall![1]);
      expect(savedIndex.entries).toEqual([]);
      expect(savedIndex.totalSizeBytes).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return correct statistics', async () => {
      const existingIndex = {
        version: '1.0.0',
        entries: [
          {
            id: 'story-001_0_Rachel',
            storyId: 'story-001',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///test1.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1048576, // 1MB
          },
          {
            id: 'story-001_1_Rachel',
            storyId: 'story-001',
            pageIndex: 1,
            voiceId: 'Rachel',
            fileUri: 'file:///test2.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 524288, // 0.5MB
          },
          {
            id: 'story-002_0_Rachel',
            storyId: 'story-002',
            pageIndex: 0,
            voiceId: 'Rachel',
            fileUri: 'file:///other.mp3',
            cachedAt: '2026-03-15T00:00:00.000Z',
            fileSizeBytes: 1048576, // 1MB
          },
        ],
        totalSizeBytes: 2621440, // 2.5MB
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingIndex));

      const stats = await getCacheStats();

      expect(stats.entryCount).toBe(3);
      expect(stats.totalSizeBytes).toBe(2621440);
      expect(stats.totalSizeMB).toBe(2.5);
      expect(stats.storiesWithCache).toBe(2);
    });
  });
});
