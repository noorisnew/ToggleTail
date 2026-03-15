/**
 * Tests for Manifest Schema validation
 */

import {
    createEmptyManifest,
    isValidManifest,
    KNOWN_LICENSES,
    KNOWN_SOURCES,
    validateManifest,
    type StoryManifest,
} from '../manifestSchema';

describe('manifestSchema', () => {
  describe('validateManifest', () => {
    it('should pass for valid manifest', () => {
      const manifest: StoryManifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [
          {
            id: 'test-001',
            title: 'Test Story',
            genre: 'animals',
            language: 'en',
            coverAssetPath: 'covers/test.webp',
            textAssetPath: 'stories/test.json',
            attribution: {
              author: 'Test Author',
              source: 'StoryWeaver',
              license: 'CC BY 4.0',
            },
          },
        ],
      };

      const errors = validateManifest(manifest);
      expect(errors).toHaveLength(0);
    });

    it('should pass for manifest with all optional fields', () => {
      const manifest: StoryManifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [
          {
            id: 'test-001',
            title: 'Test Story',
            genre: 'animals',
            language: 'en',
            gradeLevel: 'K-1',
            readingTimeSec: 180,
            coverAssetPath: 'covers/test.webp',
            textAssetPath: 'stories/test.json',
            attribution: {
              author: 'Test Author',
              illustrator: 'Test Illustrator',
              source: 'StoryWeaver',
              license: 'CC BY 4.0',
              sourceUrl: 'https://example.com/story',
            },
          },
        ],
      };

      const errors = validateManifest(manifest);
      expect(errors).toHaveLength(0);
    });

    it('should pass for empty stories array', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [],
      };

      const errors = validateManifest(manifest);
      expect(errors).toHaveLength(0);
    });

    it('should fail when manifest is not an object', () => {
      const errors = validateManifest(null);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('must be an object');
    });

    it('should fail when manifestVersion is missing', () => {
      const manifest = {
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [],
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.path === 'manifestVersion')).toBe(true);
    });

    it('should fail when createdAt is invalid date', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: 'not-a-date',
        stories: [],
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.path === 'createdAt')).toBe(true);
    });

    it('should fail when stories is not an array', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: 'not-an-array',
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.path === 'stories')).toBe(true);
    });

    it('should detect duplicate story IDs', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [
          {
            id: 'duplicate-id',
            title: 'Story 1',
            genre: 'animals',
            language: 'en',
            coverAssetPath: 'covers/1.webp',
            textAssetPath: 'stories/1.json',
            attribution: { author: 'A', source: 'S', license: 'L' },
          },
          {
            id: 'duplicate-id',
            title: 'Story 2',
            genre: 'adventure',
            language: 'en',
            coverAssetPath: 'covers/2.webp',
            textAssetPath: 'stories/2.json',
            attribution: { author: 'B', source: 'S', license: 'L' },
          },
        ],
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });

    it('should fail when required story fields are missing', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [
          {
            id: 'test-001',
            // missing title, genre, language, paths
            attribution: { author: 'A', source: 'S', license: 'L' },
          },
        ],
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.path.includes('title'))).toBe(true);
      expect(errors.some(e => e.path.includes('genre'))).toBe(true);
      expect(errors.some(e => e.path.includes('language'))).toBe(true);
      expect(errors.some(e => e.path.includes('coverAssetPath'))).toBe(true);
      expect(errors.some(e => e.path.includes('textAssetPath'))).toBe(true);
    });

    it('should fail when attribution is missing', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [
          {
            id: 'test-001',
            title: 'Test',
            genre: 'animals',
            language: 'en',
            coverAssetPath: 'covers/test.webp',
            textAssetPath: 'stories/test.json',
            // missing attribution
          },
        ],
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.path.includes('attribution'))).toBe(true);
    });

    it('should fail when required attribution fields are missing', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [
          {
            id: 'test-001',
            title: 'Test',
            genre: 'animals',
            language: 'en',
            coverAssetPath: 'covers/test.webp',
            textAssetPath: 'stories/test.json',
            attribution: {
              // missing author, source, license
            },
          },
        ],
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.path.includes('author'))).toBe(true);
      expect(errors.some(e => e.path.includes('source'))).toBe(true);
      expect(errors.some(e => e.path.includes('license'))).toBe(true);
    });

    it('should fail when readingTimeSec is negative', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [
          {
            id: 'test-001',
            title: 'Test',
            genre: 'animals',
            language: 'en',
            readingTimeSec: -100,
            coverAssetPath: 'covers/test.webp',
            textAssetPath: 'stories/test.json',
            attribution: { author: 'A', source: 'S', license: 'L' },
          },
        ],
      };

      const errors = validateManifest(manifest);
      expect(errors.some(e => e.path.includes('readingTimeSec'))).toBe(true);
    });
  });

  describe('isValidManifest', () => {
    it('should return true for valid manifest', () => {
      const manifest = {
        manifestVersion: '1.0.0',
        createdAt: '2026-03-02T00:00:00.000Z',
        stories: [],
      };

      expect(isValidManifest(manifest)).toBe(true);
    });

    it('should return false for invalid manifest', () => {
      expect(isValidManifest(null)).toBe(false);
      expect(isValidManifest({})).toBe(false);
    });
  });

  describe('createEmptyManifest', () => {
    it('should create valid empty manifest', () => {
      const manifest = createEmptyManifest();

      expect(manifest.manifestVersion).toBe('1.0.0');
      expect(manifest.createdAt).toBeDefined();
      expect(manifest.stories).toEqual([]);
      expect(isValidManifest(manifest)).toBe(true);
    });
  });

  describe('constants', () => {
    it('should export known licenses', () => {
      expect(KNOWN_LICENSES.CC_BY_4).toBe('CC BY 4.0');
      expect(KNOWN_LICENSES.CC0).toBe('CC0 1.0');
      expect(KNOWN_LICENSES.PUBLIC_DOMAIN).toBe('Public Domain');
    });

    it('should export known sources', () => {
      expect(KNOWN_SOURCES.STORYWEAVER).toBe('StoryWeaver');
      expect(KNOWN_SOURCES.GUTENBERG).toBe('Project Gutenberg');
    });
  });
});
