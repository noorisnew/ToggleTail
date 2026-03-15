/**
 * Tests for Story Approval Service
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    approveAllInGenre,
    approveAllPreloaded,
    approveNextBatch,
    approveStory,
    getApprovalStats,
    getPendingApprovalStories,
    getPreloadedStoriesForParent,
    getVisibleStories,
    getVisibleStoriesByGenre,
    isStoryVisible,
    removeAllApprovalsInGenre,
    removeApproval
} from '../domain/services/storyApprovalService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Test data
const createPreloadedStory = (id: string, genre: string, approved: boolean) => ({
  id,
  title: `Story ${id}`,
  text: 'Story content',
  createdAt: '2026-01-01T00:00:00.000Z',
  approved,
  difficulty: 'Easy',
  tags: [genre],
  theme: genre,
  preloaded: {
    isPreloaded: true,
    manifestId: id,
    source: 'TestSource',
    license: 'CC BY 4.0',
    author: 'Test Author',
  },
});

const createRegularStory = (id: string, approved: boolean) => ({
  id,
  title: `Regular Story ${id}`,
  text: 'Regular content',
  createdAt: '2026-01-01T00:00:00.000Z',
  approved,
  difficulty: 'Easy',
  tags: [],
});

describe('StoryApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('Child View Queries', () => {
    describe('getVisibleStories', () => {
      it('should return only approved stories', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', true),
          createPreloadedStory('2', 'adventure', false),
          createPreloadedStory('3', 'bedtime', true),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await getVisibleStories();

        expect(result).toHaveLength(2);
        expect(result.map(s => s.id)).toEqual(['1', '3']);
      });

      it('should return empty array when no stories approved', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', false),
          createPreloadedStory('2', 'bedtime', false),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await getVisibleStories();

        expect(result).toHaveLength(0);
      });
    });

    describe('getVisibleStoriesByGenre', () => {
      it('should filter by genre and approval', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', true),
          createPreloadedStory('2', 'adventure', false),
          createPreloadedStory('3', 'bedtime', true),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await getVisibleStoriesByGenre('adventure');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });
    });

    describe('isStoryVisible', () => {
      it('should return true for approved story', async () => {
        const stories = [createPreloadedStory('1', 'adventure', true)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        expect(await isStoryVisible('1')).toBe(true);
      });

      it('should return false for unapproved story', async () => {
        const stories = [createPreloadedStory('1', 'adventure', false)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        expect(await isStoryVisible('1')).toBe(false);
      });

      it('should return false for non-existent story', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

        expect(await isStoryVisible('unknown')).toBe(false);
      });
    });
  });

  describe('Parent View Queries', () => {
    describe('getPreloadedStoriesForParent', () => {
      it('should return only preloaded stories', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', true),
          createRegularStory('2', true),
          createPreloadedStory('3', 'bedtime', false),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await getPreloadedStoriesForParent();

        expect(result).toHaveLength(2);
        expect(result.map(s => s.id)).toEqual(['1', '3']);
      });
    });

    describe('getPendingApprovalStories', () => {
      it('should return only unapproved preloaded stories', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', true),
          createPreloadedStory('2', 'adventure', false),
          createRegularStory('3', false),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await getPendingApprovalStories();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });
    });

    describe('getApprovalStats', () => {
      it('should return correct statistics', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', true),
          createPreloadedStory('2', 'adventure', false),
          createPreloadedStory('3', 'bedtime', false),
          createRegularStory('4', true),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const stats = await getApprovalStats();

        expect(stats.totalStories).toBe(4);
        expect(stats.approvedCount).toBe(2);
        expect(stats.pendingCount).toBe(2);
        expect(stats.preloadedCount).toBe(3);
        expect(stats.preloadedApprovedCount).toBe(1);
        expect(stats.preloadedPendingCount).toBe(2);
      });
    });
  });

  describe('Approval Operations', () => {
    describe('approveStory', () => {
      it('should approve a single story', async () => {
        const stories = [createPreloadedStory('1', 'adventure', false)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveStory('1');

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(1);
        
        const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        expect(savedData[0].approved).toBe(true);
      });

      it('should be idempotent for already approved story', async () => {
        const stories = [createPreloadedStory('1', 'adventure', true)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveStory('1');

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(0);
        expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      });

      it('should fail for non-existent story', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

        const result = await approveStory('unknown');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Story not found');
      });
    });

    describe('approveNextBatch', () => {
      it('should approve up to 20 pending stories by default', async () => {
        const stories = Array.from({ length: 25 }, (_, i) =>
          createPreloadedStory(`${i + 1}`, 'adventure', false)
        );
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveNextBatch();

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(20);
        
        const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        const approvedCount = savedData.filter((s: any) => s.approved).length;
        expect(approvedCount).toBe(20);
      });

      it('should approve custom batch size', async () => {
        const stories = Array.from({ length: 10 }, (_, i) =>
          createPreloadedStory(`${i + 1}`, 'adventure', false)
        );
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveNextBatch(5);

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(5);
      });

      it('should return 0 when no pending stories', async () => {
        const stories = [createPreloadedStory('1', 'adventure', true)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveNextBatch();

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(0);
      });
    });

    describe('approveAllInGenre', () => {
      it('should approve all pending stories in genre', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', false),
          createPreloadedStory('2', 'adventure', false),
          createPreloadedStory('3', 'bedtime', false),
          createPreloadedStory('4', 'adventure', true), // already approved
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveAllInGenre('adventure');

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(2);
        
        const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        expect(savedData[0].approved).toBe(true);
        expect(savedData[1].approved).toBe(true);
        expect(savedData[2].approved).toBe(false); // different genre
      });

      it('should be idempotent when all already approved', async () => {
        const stories = [createPreloadedStory('1', 'adventure', true)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveAllInGenre('adventure');

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(0);
        expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      });
    });

    describe('approveAllPreloaded', () => {
      it('should approve all pending preloaded stories', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', false),
          createPreloadedStory('2', 'bedtime', false),
          createRegularStory('3', false), // not preloaded
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await approveAllPreloaded();

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(2);
      });
    });
  });

  describe('Remove Approval Operations', () => {
    describe('removeApproval', () => {
      it('should remove approval from a story', async () => {
        const stories = [createPreloadedStory('1', 'adventure', true)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await removeApproval('1');

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(1);
        
        const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        expect(savedData[0].approved).toBe(false);
      });

      it('should be idempotent for already unapproved story', async () => {
        const stories = [createPreloadedStory('1', 'adventure', false)];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await removeApproval('1');

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(0);
        expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      });
    });

    describe('removeAllApprovalsInGenre', () => {
      it('should remove approvals from all stories in genre', async () => {
        const stories = [
          createPreloadedStory('1', 'adventure', true),
          createPreloadedStory('2', 'adventure', true),
          createPreloadedStory('3', 'bedtime', true),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));

        const result = await removeAllApprovalsInGenre('adventure');

        expect(result.success).toBe(true);
        expect(result.approvedCount).toBe(2);
        
        const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        expect(savedData[0].approved).toBe(false);
        expect(savedData[1].approved).toBe(false);
        expect(savedData[2].approved).toBe(true); // different genre
      });
    });
  });
});
