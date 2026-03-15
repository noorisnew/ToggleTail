/**
 * Integration Tests for PreloadedSeeder and LibraryService
 * 
 * Covers the full lifecycle of preloaded stories:
 * 1. First-run seeding
 * 2. Duplicate prevention
 * 3. Version-triggered upsert
 * 4. Pagination behavior
 * 5. Child visibility (approval-based access)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getAllStories,
    getStoriesByGenre,
    listStoriesByGenre,
} from '../data/library';
import type { StoryManifest } from '../data/library/manifestSchema';
import {
    needsSeeding,
    seedPreloadedStories,
    type StoryWithPreloadedMeta
} from '../data/seeder';
import { PRELOADED_SEEDED_VERSION_KEY, STORIES_KEY } from '../data/storage/storageKeys';
import {
    approveAllInGenre,
    approveNextBatch,
    approveStory,
    getVisibleStories,
    getVisibleStoriesByGenre,
} from '../domain/services/storyApprovalService';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a test manifest with N stories
 */
function createTestManifest(
  version: string,
  storyCount: number,
  genre: string = 'adventure'
): StoryManifest {
  const stories = Array.from({ length: storyCount }, (_, i) => ({
    id: `test-${genre}-${String(i + 1).padStart(3, '0')}`,
    title: `Test Story ${i + 1}`,
    genre,
    language: 'en',
    gradeLevel: 'K-1',
    readingTimeSec: 180,
    coverAssetPath: `covers/test-${i + 1}.webp`,
    textAssetPath: `stories/test-${i + 1}.json`,
    attribution: {
      author: 'Test Author',
      source: 'TestSource',
      license: 'CC BY 4.0',
    },
  }));

  return {
    manifestVersion: version,
    createdAt: new Date().toISOString(),
    stories,
  };
}

/**
 * Mock content loader that returns story text
 */
const mockContentLoader = jest.fn(async (path: string) => `Story content from ${path}`);

/**
 * Create a preloaded story object for storage
 */
function createStoredPreloadedStory(
  id: string,
  genre: string,
  approved: boolean
): StoryWithPreloadedMeta {
  return {
    id,
    title: `Story ${id}`,
    text: 'Story content',
    createdAt: '2026-01-01T00:00:00.000Z',
    approved,
    difficulty: 'Easy',
    tags: [genre],
    theme: genre,
    isFavorite: false,
    readCount: 0,
    preloaded: {
      isPreloaded: true,
      manifestId: id,
      source: 'TestSource',
      license: 'CC BY 4.0',
      author: 'Test Author',
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('PreloadedSeeder and LibraryService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockContentLoader.mockClear();
    mockContentLoader.mockImplementation(async (path: string) => `Content for ${path}`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Case 1: First run seeds stories correctly
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Case 1: First run seeds stories correctly', () => {
    it('should seed all stories from manifest on first run', async () => {
      // Arrange: No stored version (first run)
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest('1.0.0', 5);

      // Act
      const result = await seedPreloadedStories(manifest, mockContentLoader);

      // Assert
      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(5);
      expect(result.manifestVersion).toBe('1.0.0');
    });

    it('should save version after successful seed', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest('1.0.0', 3);

      await seedPreloadedStories(manifest, mockContentLoader);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        PRELOADED_SEEDED_VERSION_KEY,
        '1.0.0'
      );
    });

    it('should create stories with approved=false by default', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest('1.0.0', 3);

      await seedPreloadedStories(manifest, mockContentLoader);

      const storiesCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(storiesCall![1]);

      savedStories.forEach((story: StoryWithPreloadedMeta) => {
        expect(story.approved).toBe(false);
      });
    });

    it('should mark stories as preloaded with metadata', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest('1.0.0', 2);

      await seedPreloadedStories(manifest, mockContentLoader);

      const storiesCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(storiesCall![1]);

      savedStories.forEach((story: StoryWithPreloadedMeta) => {
        expect(story.preloaded?.isPreloaded).toBe(true);
        expect(story.preloaded?.source).toBe('TestSource');
        expect(story.preloaded?.license).toBe('CC BY 4.0');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Case 2: Second run does not duplicate stories
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Case 2: Second run does not duplicate stories', () => {
    it('should skip seeding if version matches', async () => {
      // Arrange: Version already seeded
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        return null;
      });
      const manifest = createTestManifest('1.0.0', 5);

      // Act
      const result = await seedPreloadedStories(manifest, mockContentLoader);

      // Assert
      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(0);
      expect(result.skippedCount).toBe(5);
    });

    it('should not make storage write calls on second run', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        return JSON.stringify([]);
      });
      const manifest = createTestManifest('1.0.0', 5);

      await seedPreloadedStories(manifest, mockContentLoader);

      // setItem should NOT be called for stories
      const storiesCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      expect(storiesCall).toBeUndefined();
    });

    it('should not call content loader on second run', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        return null;
      });
      const manifest = createTestManifest('1.0.0', 5);

      await seedPreloadedStories(manifest, mockContentLoader);

      expect(mockContentLoader).not.toHaveBeenCalled();
    });

    it('should not duplicate stories when IDs already exist', async () => {
      // Arrange: Existing stories in storage
      const existingStories = [
        createStoredPreloadedStory('test-adventure-001', 'adventure', true),
        createStoredPreloadedStory('test-adventure-002', 'adventure', false),
      ];

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === STORIES_KEY) return JSON.stringify(existingStories);
        return null; // No version = trigger seed
      });

      const manifest = createTestManifest('1.0.0', 3);

      // Act
      await seedPreloadedStories(manifest, mockContentLoader);

      // Assert
      const storiesCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(storiesCall![1]);

      // Should have 3 stories total (2 updated + 1 new), not 5
      expect(savedStories).toHaveLength(3);

      // IDs should be unique
      const ids = savedStories.map((s: StoryWithPreloadedMeta) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should preserve user data (approved, favorite, readCount) on update', async () => {
      const existingStories = [
        {
          ...createStoredPreloadedStory('test-adventure-001', 'adventure', true),
          isFavorite: true,
          readCount: 42,
          createdAt: '2025-06-15T00:00:00.000Z',
        },
      ];

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === STORIES_KEY) return JSON.stringify(existingStories);
        return null;
      });

      const manifest = createTestManifest('1.0.0', 2);
      await seedPreloadedStories(manifest, mockContentLoader);

      const storiesCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(storiesCall![1]);
      const updatedStory = savedStories.find(
        (s: StoryWithPreloadedMeta) => s.id === 'test-adventure-001'
      );

      expect(updatedStory.approved).toBe(true); // Preserved
      expect(updatedStory.isFavorite).toBe(true); // Preserved
      expect(updatedStory.readCount).toBe(42); // Preserved
      expect(updatedStory.createdAt).toBe('2025-06-15T00:00:00.000Z'); // Preserved
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Case 3: Version update triggers upsert
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Case 3: Version update triggers upsert', () => {
    it('should trigger seeding when manifest version is newer', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        return null;
      });
      const manifest = createTestManifest('1.1.0', 5);

      const result = await seedPreloadedStories(manifest, mockContentLoader);

      expect(result.success).toBe(true);
      expect(result.seededCount).toBe(5);
    });

    it('should update stored version after upgrade', async () => {
      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        return null;
      });
      const manifest = createTestManifest('2.0.0', 3);

      await seedPreloadedStories(manifest, mockContentLoader);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        PRELOADED_SEEDED_VERSION_KEY,
        '2.0.0'
      );
    });

    it('should upsert existing stories on version upgrade', async () => {
      const existingStories = [
        createStoredPreloadedStory('test-adventure-001', 'adventure', true),
      ];

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === PRELOADED_SEEDED_VERSION_KEY) return '1.0.0';
        if (key === STORIES_KEY) return JSON.stringify(existingStories);
        return null;
      });

      // New manifest with updated content
      const manifest = createTestManifest('1.1.0', 3);
      await seedPreloadedStories(manifest, mockContentLoader);

      const storiesCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(storiesCall![1]);

      // Should have 3 stories (1 updated + 2 new)
      expect(savedStories).toHaveLength(3);
    });

    it('should handle semver comparisons correctly', async () => {
      // 1.9.9 < 1.10.0
      mockAsyncStorage.getItem.mockResolvedValue('1.9.9');
      expect(await needsSeeding('1.10.0')).toBe(true);

      // 1.10.0 >= 1.10.0
      mockAsyncStorage.getItem.mockResolvedValue('1.10.0');
      expect(await needsSeeding('1.10.0')).toBe(false);

      // 2.0.0 > 1.99.99
      mockAsyncStorage.getItem.mockResolvedValue('1.99.99');
      expect(await needsSeeding('2.0.0')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Case 4: Pagination returns exactly 20 stories per page
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Case 4: Pagination returns exactly 20 stories per page', () => {
    it('should return default page size of 20', () => {
      const result = listStoriesByGenre({ genre: 'animals' });
      
      expect(result.pageSize).toBe(20);
    });

    it('should return at most 20 items by default', () => {
      const result = getAllStories(1, 20);
      
      expect(result.items.length).toBeLessThanOrEqual(20);
      expect(result.pageSize).toBe(20);
    });

    it('should return exactly pageSize items when enough stories exist', () => {
      // Get total count first
      const total = getAllStories(1, 100);
      
      if (total.total >= 5) {
        const result = getAllStories(1, 5);
        expect(result.items.length).toBe(5);
      }
    });

    it('should respect custom pageSize parameter', () => {
      const result = listStoriesByGenre({ genre: 'animals', pageSize: 10 });
      
      expect(result.pageSize).toBe(10);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should cap pageSize at 100 to prevent abuse', () => {
      const result = listStoriesByGenre({ genre: 'animals', pageSize: 500 });
      
      expect(result.pageSize).toBeLessThanOrEqual(100);
    });

    it('should return fewer items on last page', () => {
      // First get total
      const first = getAllStories(1, 3);
      
      if (first.total > 3 && first.total % 3 !== 0) {
        const lastPage = Math.ceil(first.total / 3);
        const last = getAllStories(lastPage, 3);
        
        expect(last.items.length).toBeLessThanOrEqual(3);
        expect(last.items.length).toBe(first.total % 3 || 3);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Case 5: hasNextPage behaves correctly
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Case 5: hasNextPage behaves correctly', () => {
    it('should return hasNextPage=true when more pages exist', () => {
      const result = getAllStories(1, 1);
      
      if (result.total > 1) {
        expect(result.hasNextPage).toBe(true);
      }
    });

    it('should return hasNextPage=false on last page', () => {
      const first = getAllStories(1, 100);
      const lastPage = Math.ceil(first.total / 5);
      
      const last = getAllStories(lastPage, 5);
      
      expect(last.hasNextPage).toBe(false);
    });

    it('should return hasNextPage=false when total <= pageSize', () => {
      const result = getStoriesByGenre('animals', 1, 100);
      
      if (result.total <= 100) {
        expect(result.hasNextPage).toBe(false);
      }
    });

    it('should return hasNextPage=false for empty results', () => {
      const result = getStoriesByGenre('nonexistent' as any, 1, 20);
      
      expect(result.items.length).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });

    it('should calculate hasNextPage correctly at boundary', () => {
      // If we have exactly 20 items and request page 1 with pageSize 20
      const total = getAllStories(1, 100);
      
      if (total.total === 20) {
        const result = getAllStories(1, 20);
        expect(result.hasNextPage).toBe(false);
      } else if (total.total === 21) {
        const result = getAllStories(1, 20);
        expect(result.hasNextPage).toBe(true);
      }
    });

    it('should handle page beyond data range', () => {
      const result = getAllStories(999, 20);
      
      expect(result.items.length).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Case 6: Child library returns 0 stories before approval
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Case 6: Child library returns 0 stories before approval', () => {
    it('should return empty array when no stories are approved', async () => {
      const stories = [
        createStoredPreloadedStory('story-1', 'adventure', false),
        createStoredPreloadedStory('story-2', 'bedtime', false),
        createStoredPreloadedStory('story-3', 'animals', false),
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      const result = await getVisibleStories();

      expect(result).toHaveLength(0);
    });

    it('should return empty array for genre when no genre stories approved', async () => {
      const stories = [
        createStoredPreloadedStory('story-1', 'adventure', false),
        createStoredPreloadedStory('story-2', 'adventure', false),
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      const result = await getVisibleStoriesByGenre('adventure');

      expect(result).toHaveLength(0);
    });

    it('should return 0 immediately after first-run seeding', async () => {
      // Simulate first-run seed
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const manifest = createTestManifest('1.0.0', 5);
      await seedPreloadedStories(manifest, mockContentLoader);

      // Get the saved stories
      const storiesCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const seededStories = JSON.parse(storiesCall![1]);

      // All should be unapproved
      const approvedCount = seededStories.filter(
        (s: StoryWithPreloadedMeta) => s.approved
      ).length;

      expect(approvedCount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Case 7: Child library returns approved stories only
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Case 7: Child library returns approved stories only', () => {
    it('should return only approved stories', async () => {
      const stories = [
        createStoredPreloadedStory('story-1', 'adventure', true),
        createStoredPreloadedStory('story-2', 'adventure', false),
        createStoredPreloadedStory('story-3', 'bedtime', true),
        createStoredPreloadedStory('story-4', 'bedtime', false),
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      const result = await getVisibleStories();

      expect(result).toHaveLength(2);
      expect(result.map(s => s.id)).toEqual(['story-1', 'story-3']);
    });

    it('should filter by genre AND approval', async () => {
      const stories = [
        createStoredPreloadedStory('story-1', 'adventure', true),
        createStoredPreloadedStory('story-2', 'adventure', false),
        createStoredPreloadedStory('story-3', 'bedtime', true),
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      const result = await getVisibleStoriesByGenre('adventure');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('story-1');
    });

    it('should include newly approved stories', async () => {
      const stories = [
        createStoredPreloadedStory('story-1', 'adventure', false),
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      // Initial state: 0 visible
      let visible = await getVisibleStories();
      expect(visible).toHaveLength(0);

      // Approve the story
      await approveStory('story-1');

      // Check what was saved
      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(saveCall![1]);

      expect(savedStories[0].approved).toBe(true);
    });

    it('should work with batch approval', async () => {
      const stories = Array.from({ length: 25 }, (_, i) =>
        createStoredPreloadedStory(`story-${i + 1}`, 'adventure', false)
      );
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      // Approve batch of 20
      const result = await approveNextBatch(20);

      expect(result.success).toBe(true);
      expect(result.approvedCount).toBe(20);

      // Verify saved data has exactly 20 approved
      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(saveCall![1]);
      const approvedCount = savedStories.filter(
        (s: StoryWithPreloadedMeta) => s.approved
      ).length;

      expect(approvedCount).toBe(20);
    });

    it('should work with genre-based approval', async () => {
      const stories = [
        createStoredPreloadedStory('adv-1', 'adventure', false),
        createStoredPreloadedStory('adv-2', 'adventure', false),
        createStoredPreloadedStory('bed-1', 'bedtime', false),
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

      // Approve all in adventure genre
      const result = await approveAllInGenre('adventure');

      expect(result.success).toBe(true);
      expect(result.approvedCount).toBe(2);

      // Verify only adventure stories are approved
      const saveCall = mockAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORIES_KEY
      );
      const savedStories = JSON.parse(saveCall![1]);

      const advStories = savedStories.filter(
        (s: StoryWithPreloadedMeta) => s.theme === 'adventure'
      );
      const bedStories = savedStories.filter(
        (s: StoryWithPreloadedMeta) => s.theme === 'bedtime'
      );

      advStories.forEach((s: StoryWithPreloadedMeta) => {
        expect(s.approved).toBe(true);
      });
      bedStories.forEach((s: StoryWithPreloadedMeta) => {
        expect(s.approved).toBe(false);
      });
    });
  });
});
