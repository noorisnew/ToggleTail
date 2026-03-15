/**
 * Tests for PreloadedSeeder
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoryManifest } from '../data/library/manifestSchema';
import {
    forceSeedPreloadedStories,
    getPendingPreloadedStories,
    getPreloadedStories,
    getSeededVersion,
    isPreloadedStory,
    needsSeeding,
    seedPreloadedStories,
    type StoryWithPreloadedMeta,
} from '../data/seeder';
import { PRELOADED_SEEDED_VERSION_KEY, STORIES_KEY } from '../data/storage/storageKeys';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Sample manifest for testing
const createTestManifest = (version = '1.0.0'): StoryManifest => ({
  manifestVersion: version,
  createdAt: '2026-03-02T00:00:00.000Z',
  stories: [
    {
      id: 'test-story-001',
      title: 'Test Story One',
      genre: 'adventure',
      language: 'en',
      gradeLevel: 'K-1',
      readingTimeSec: 180,
      coverAssetPath: 'covers/test-001.webp',
      textAssetPath: 'stories/test-001.json',
      attribution: {
        author: 'Test Author',
        source: 'StoryWeaver',
        license: 'CC BY 4.0',
        sourceUrl: 'https://example.com/story-001',
      },
    },
    {
      id: 'test-story-002',
      title: 'Test Story Two',
      genre: 'bedtime',
      language: 'en',
      gradeLevel: '2-3',
      readingTimeSec: 240,
      coverAssetPath: 'covers/test-002.webp',
      textAssetPath: 'stories/test-002.json',
      attribution: {
        author: 'Another Author',
        illustrator: 'Test Illustrator',
        source: 'Public Domain',
        license: 'CC0',
      },
    },
  ],
});

// Mock content loader (can return string or null)
const mockContentLoader = jest.fn<Promise<string | null>, [string]>(async (path: string) => `Content for ${path}`);

describe('PreloadedSeeder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockContentLoader.mockClear();
    mockContentLoader.mockImplementation(async (path: string) => `Content for ${path}`);
  });

  describe('needsSeeding', () => {
    it('should return true if no version stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await needsSeeding('1.0.0');
      
      expect(result).toBe(true);
    });

    it('should return true if manifest version is newer', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('1.0.0');
      
      const result = await needsSeeding('1.1.0');
      
      expect(result).toBe(true);
    });

    it('should return false if versions are equal', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('1.0.0');
      
      const result = await needsSeeding('1.0.0');
      
      expect(result).toBe(false);
    });

    it('should return false if stored version is newer', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('2.0.0');
      
      const result = await needsSeeding('1.0.0');
      
      expect(result).toBe(false);
    });

    it('should handle complex version comparisons', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('1.9.9');
      
      expect(await needsSeeding('1.10.0')).toBe(true);
      expect(await needsSeeding('1.9.9')).toBe(false);
      expect(await needsSeeding('1.9.8')).toBe(false);
    });
  });

  describe('getSeededVersion', () => {
    it('should return stored version', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('1.2.3');
      
      const result = await getSeededVersion();
      
      expect(result).toBe('1.2.3');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(PRELOADED_SEEDED_VERSION_KEY);
    });

    it('should return null if no version stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await getSeededVersion();
      
      expect(result).toBeNull();
    });
  });

  describe('seedPreloadedStories', () => {
    it('should seed stories on first run', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest('1.0.0');

      const result = await seedPreloadedStories(manifest, mockContentLoader);

      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(2);
      expect(result.manifestVersion).toBe('1.0.0');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        PRELOADED_SEEDED_VERSION_KEY,
        '1.0.0'
      );
    });

    it('should skip seeding if version is current', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        return null;
      });
      const manifest = createTestManifest('1.0.0');

      const result = await seedPreloadedStories(manifest, mockContentLoader);

      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(0);
      expect(result.skippedCount).toBe(2);
      expect(mockContentLoader).not.toHaveBeenCalled();
    });

    it('should seed on version upgrade', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        return null;
      });
      const manifest = createTestManifest('1.1.0');

      const result = await seedPreloadedStories(manifest, mockContentLoader);

      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(2);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        PRELOADED_SEEDED_VERSION_KEY,
        '1.1.0'
      );
    });

    it('should create stories with approved=false', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest();

      await seedPreloadedStories(manifest, mockContentLoader);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      expect(setItemCall).toBeDefined();
      
      const savedStories = JSON.parse(setItemCall![1]);
      expect(savedStories).toHaveLength(2);
      expect(savedStories[0].approved).toBe(false);
      expect(savedStories[1].approved).toBe(false);
    });

    it('should preserve preloaded metadata', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest();

      await seedPreloadedStories(manifest, mockContentLoader);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(setItemCall![1]);
      
      expect(savedStories[0].preloaded).toEqual({
        isPreloaded: true,
        manifestId: 'test-story-001',
        source: 'StoryWeaver',
        license: 'CC BY 4.0',
        author: 'Test Author',
        sourceUrl: 'https://example.com/story-001',
        illustrator: undefined,
      });
    });

    it('should not duplicate existing stories', async () => {
      const existingStories = [
        {
          id: 'test-story-001',
          title: 'Existing Story',
          approved: true, // Already approved
          isFavorite: true,
          readCount: 5,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ];
      
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === STORIES_KEY) return JSON.stringify(existingStories);
        return null;
      });
      
      const manifest = createTestManifest();
      await seedPreloadedStories(manifest, mockContentLoader);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(setItemCall![1]);
      
      // Should have 2 stories (one updated, one new)
      expect(savedStories).toHaveLength(2);
      
      // Existing story should preserve its approval and user data
      const existingStoryUpdated = savedStories.find(
        (s: StoryWithPreloadedMeta) => s.id === 'test-story-001'
      );
      expect(existingStoryUpdated.approved).toBe(true);
      expect(existingStoryUpdated.isFavorite).toBe(true);
      expect(existingStoryUpdated.readCount).toBe(5);
      expect(existingStoryUpdated.createdAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle content loading failures', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockContentLoader.mockResolvedValue(null);
      const manifest = createTestManifest();

      const result = await seedPreloadedStories(manifest, mockContentLoader);

      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(0);
      expect(result.skippedCount).toBe(2);
    });

    it('should map grade levels to difficulty correctly', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest();

      await seedPreloadedStories(manifest, mockContentLoader);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(setItemCall![1]);
      
      // K-1 -> Easy
      expect(savedStories[0].difficulty).toBe('Easy');
      // 2-3 -> Medium
      expect(savedStories[1].difficulty).toBe('Medium');
    });
  });

  describe('forceSeedPreloadedStories', () => {
    it('should re-seed even if version matches', async () => {
      // Track whether the version key has been removed
      let versionRemoved = false;
      
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) {
          // Return '1.0.0' only until removeItem is called
          return versionRemoved ? null : '1.0.0';
        }
        return null;
      });
      
      mockAsyncStorage.removeItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) {
          versionRemoved = true;
        }
      });
      
      const manifest = createTestManifest('1.0.0');
      const result = await forceSeedPreloadedStories(manifest, mockContentLoader);

      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(2);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(PRELOADED_SEEDED_VERSION_KEY);
    });
  });

  describe('isPreloadedStory', () => {
    it('should return true for preloaded stories', () => {
      const story = {
        id: 'test',
        preloaded: { isPreloaded: true, manifestId: 'test', source: 'S', license: 'L', author: 'A' },
      } as StoryWithPreloadedMeta;

      expect(isPreloadedStory(story)).toBe(true);
    });

    it('should return false for regular stories', () => {
      const story = { id: 'test', title: 'Test' } as StoryWithPreloadedMeta;

      expect(isPreloadedStory(story)).toBe(false);
    });
  });

  describe('getPreloadedStories', () => {
    it('should return only preloaded stories', async () => {
      const stories = [
        { id: '1', preloaded: { isPreloaded: true, manifestId: '1', source: 'S', license: 'L', author: 'A' } },
        { id: '2' }, // Regular story
        { id: '3', preloaded: { isPreloaded: true, manifestId: '3', source: 'S', license: 'L', author: 'A' } },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      const result = await getPreloadedStories();

      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toEqual(['1', '3']);
    });
  });

  describe('getPendingPreloadedStories', () => {
    it('should return only unapproved preloaded stories', async () => {
      const stories = [
        { id: '1', approved: false, preloaded: { isPreloaded: true, manifestId: '1', source: 'S', license: 'L', author: 'A' } },
        { id: '2', approved: true, preloaded: { isPreloaded: true, manifestId: '2', source: 'S', license: 'L', author: 'A' } },
        { id: '3', approved: false }, // Regular story
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      const result = await getPendingPreloadedStories();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });
});
