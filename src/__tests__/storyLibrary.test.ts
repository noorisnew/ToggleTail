import {
    getAllStories,
    getGenre,
    getGenres,
    getStoriesByGenre,
    getStoriesByReadingLevel,
    getStoryCountByGenre,
    getStoryMetadata,
    getTotalStoryCount,
    searchStories,
} from '../data/library/storyLibraryService';

describe('Story Library Service', () => {
  describe('getGenres', () => {
    it('should return all genres', () => {
      const genres = getGenres();
      
      expect(genres).toBeDefined();
      expect(Array.isArray(genres)).toBe(true);
      expect(genres.length).toBeGreaterThan(0);
    });

    it('should include expected genre properties', () => {
      const genres = getGenres();
      const firstGenre = genres[0];
      
      expect(firstGenre).toHaveProperty('id');
      expect(firstGenre).toHaveProperty('name');
      expect(firstGenre).toHaveProperty('emoji');
      expect(firstGenre).toHaveProperty('description');
      expect(firstGenre).toHaveProperty('color');
    });

    it('should include animals genre', () => {
      const genres = getGenres();
      const animals = genres.find(g => g.id === 'animals');
      
      expect(animals).toBeDefined();
      expect(animals?.name).toBe('Animals');
    });
  });

  describe('getGenre', () => {
    it('should return a specific genre by ID', () => {
      const genre = getGenre('animals');
      
      expect(genre).toBeDefined();
      expect(genre?.id).toBe('animals');
      expect(genre?.name).toBe('Animals');
    });

    it('should return undefined for unknown genre', () => {
      const genre = getGenre('unknown' as any);
      
      expect(genre).toBeUndefined();
    });
  });

  describe('getStoriesByGenre', () => {
    it('should return paginated results', () => {
      const result = getStoriesByGenre('animals');
      
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasNextPage');
    });

    it('should filter stories by genre', () => {
      const result = getStoriesByGenre('animals');
      
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(story => {
        expect(story.genre).toBe('animals');
      });
    });

    it('should respect page parameter', () => {
      const page1 = getStoriesByGenre('animals', 1, 2);
      const page2 = getStoriesByGenre('animals', 2, 2);
      
      expect(page1.page).toBe(1);
      expect(page2.page).toBe(2);
      
      if (page1.items.length > 0 && page2.items.length > 0) {
        expect(page1.items[0].id).not.toBe(page2.items[0].id);
      }
    });

    it('should respect pageSize parameter', () => {
      const result = getStoriesByGenre('animals', 1, 2);
      
      expect(result.pageSize).toBe(2);
      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    it('should calculate hasNextPage correctly', () => {
      const result = getStoriesByGenre('animals', 1, 1);
      
      if (result.total > 1) {
        expect(result.hasNextPage).toBe(true);
      }
    });

    it('should normalize page to minimum of 1', () => {
      const result = getStoriesByGenre('animals', -5);
      
      expect(result.page).toBe(1);
    });

    it('should return empty items for invalid genre', () => {
      const result = getStoriesByGenre('invalid' as any);
      
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getAllStories', () => {
    it('should return all stories paginated', () => {
      const result = getAllStories();
      
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should include stories from different genres', () => {
      const result = getAllStories(1, 100);
      const genres = new Set(result.items.map(s => s.genre));
      
      expect(genres.size).toBeGreaterThan(1);
    });
  });

  describe('getStoriesByReadingLevel', () => {
    it('should filter by reading level', () => {
      const result = getStoriesByReadingLevel('Beginner');
      
      result.items.forEach(story => {
        expect(story.readingLevel).toBe('Beginner');
      });
    });

    it('should return paginated results', () => {
      const result = getStoriesByReadingLevel('Intermediate', 1, 5);
      
      expect(result.pageSize).toBe(5);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getStoryMetadata', () => {
    it('should return story metadata by ID', () => {
      const metadata = getStoryMetadata('animal-001');
      
      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('animal-001');
      expect(metadata?.title).toBe('The Brave Little Bunny');
    });

    it('should return undefined for unknown ID', () => {
      const metadata = getStoryMetadata('unknown-999');
      
      expect(metadata).toBeUndefined();
    });

    it('should include all expected metadata fields', () => {
      const metadata = getStoryMetadata('animal-001');
      
      expect(metadata).toHaveProperty('id');
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('genre');
      expect(metadata).toHaveProperty('readingLevel');
      expect(metadata).toHaveProperty('ageRange');
      expect(metadata).toHaveProperty('duration');
      expect(metadata).toHaveProperty('emoji');
      expect(metadata).toHaveProperty('preview');
      expect(metadata).toHaveProperty('contentFile');
    });
  });

  describe('searchStories', () => {
    it('should find stories by title', () => {
      const result = searchStories('bunny');
      
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].title.toLowerCase()).toContain('bunny');
    });

    it('should be case-insensitive', () => {
      const lower = searchStories('dragon');
      const upper = searchStories('DRAGON');
      
      expect(lower.total).toBe(upper.total);
    });

    it('should search in preview text', () => {
      const result = searchStories('magical');
      
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const result = searchStories('xyznonexistent');
      
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getStoryCountByGenre', () => {
    it('should return counts for all genres', () => {
      const counts = getStoryCountByGenre();
      
      expect(counts).toHaveProperty('animals');
      expect(counts).toHaveProperty('adventure');
      expect(counts).toHaveProperty('bedtime');
      expect(typeof counts.animals).toBe('number');
    });

    it('should have positive counts for main genres', () => {
      const counts = getStoryCountByGenre();
      
      expect(counts.animals).toBeGreaterThan(0);
      expect(counts.fantasy).toBeGreaterThan(0);
    });
  });

  describe('getTotalStoryCount', () => {
    it('should return total number of stories', () => {
      const total = getTotalStoryCount();
      
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThan(0);
    });

    it('should match sum of all genre counts', () => {
      const total = getTotalStoryCount();
      const counts = getStoryCountByGenre();
      const sum = Object.values(counts).reduce((a, b) => a + b, 0);
      
      expect(total).toBe(sum);
    });
  });
});
