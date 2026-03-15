/**
 * Tests for storyCreationService
 *
 * Tests the local story generation logic.
 */

import { generateLocalStory, StoryLength } from '../domain/services/storyCreationService';

describe('storyCreationService', () => {
  describe('generateLocalStory', () => {
    it('generates a story with required params', () => {
      const story = generateLocalStory({
        title: 'Test Story',
        theme: 'forest',
        length: 'Short',
      });

      expect(story).toContain('The End.');
      expect(story).toContain('enchanted forest');
    });

    it('uses childName as hero when no mainCharacter', () => {
      const story = generateLocalStory({
        title: 'Test Story',
        childName: 'Emma',
        theme: 'forest',
        length: 'Short',
      });

      expect(story).toContain('Emma');
    });

    it('prefers mainCharacter over childName', () => {
      const story = generateLocalStory({
        title: 'Test Story',
        childName: 'Emma',
        mainCharacter: 'Sir Brave',
        theme: 'forest',
        length: 'Short',
      });

      expect(story).toContain('Sir Brave');
      expect(story).not.toContain('Emma');
    });

    it('uses fallback name when no childName or mainCharacter', () => {
      const story = generateLocalStory({
        title: 'Test Story',
        theme: 'forest',
        length: 'Short',
      });

      expect(story).toContain('A curious adventurer');
    });

    describe('theme intros', () => {
      const themes = [
        { theme: 'forest', expectedText: 'enchanted forest' },
        { theme: 'space', expectedText: 'twinkling stars' },
        { theme: 'castle', expectedText: 'magnificent castle' },
        { theme: 'ocean', expectedText: 'shimmering waves' },
      ];

      themes.forEach(({ theme, expectedText }) => {
        it(`uses correct intro for ${theme} theme`, () => {
          const story = generateLocalStory({
            title: 'Test',
            theme,
            length: 'Short',
          });

          expect(story).toContain(expectedText);
        });
      });

      it('falls back to forest for unknown theme', () => {
        const story = generateLocalStory({
          title: 'Test',
          theme: 'unknown-theme',
          length: 'Short',
        });

        expect(story).toContain('enchanted forest');
      });
    });

    describe('story length', () => {
      it('generates short stories', () => {
        const story = generateLocalStory({
          title: 'Test',
          theme: 'forest',
          length: 'Short',
        });

        expect(story.length).toBeLessThan(600);
      });

      it('generates medium stories longer than short', () => {
        const shortStory = generateLocalStory({
          title: 'Test',
          childName: 'Test',
          theme: 'forest',
          length: 'Short',
        });

        const mediumStory = generateLocalStory({
          title: 'Test',
          childName: 'Test',
          theme: 'forest',
          length: 'Medium',
        });

        expect(mediumStory.length).toBeGreaterThan(shortStory.length);
      });

      it('generates long stories longer than medium', () => {
        const mediumStory = generateLocalStory({
          title: 'Test',
          childName: 'Test',
          theme: 'forest',
          length: 'Medium',
        });

        const longStory = generateLocalStory({
          title: 'Test',
          childName: 'Test',
          theme: 'forest',
          length: 'Long',
        });

        expect(longStory.length).toBeGreaterThan(mediumStory.length);
      });
    });

    it('always includes "The End."', () => {
      const lengths: StoryLength[] = ['Short', 'Medium', 'Long'];

      lengths.forEach((length) => {
        const story = generateLocalStory({
          title: 'Test',
          theme: 'forest',
          length,
        });

        expect(story).toContain('The End.');
      });
    });

    it('is deterministic for hero name placement', () => {
      const story = generateLocalStory({
        title: 'Test',
        mainCharacter: 'Brave Knight',
        theme: 'castle',
        length: 'Short',
      });

      // Hero name should appear multiple times in the story
      const occurrences = (story.match(/Brave Knight/g) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    });

    describe('edge cases', () => {
      it('treats empty string mainCharacter as missing, falls back to childName', () => {
        const story = generateLocalStory({
          title: 'Test',
          childName: 'Emma',
          mainCharacter: '',
          theme: 'forest',
          length: 'Short',
        });

        expect(story).toContain('Emma');
      });

      it('treats empty string childName as missing, falls back to default', () => {
        const story = generateLocalStory({
          title: 'Test',
          childName: '',
          theme: 'forest',
          length: 'Short',
        });

        expect(story).toContain('A curious adventurer');
      });

      it('treats whitespace-only mainCharacter as missing', () => {
        const story = generateLocalStory({
          title: 'Test',
          childName: 'Leo',
          mainCharacter: '   ',
          theme: 'space',
          length: 'Short',
        });

        expect(story).toContain('Leo');
      });

      it('handles all empty optional fields gracefully', () => {
        const story = generateLocalStory({
          title: '',
          childName: '',
          mainCharacter: '',
          theme: 'ocean',
          length: 'Medium',
        });

        expect(story).toBeTruthy();
        expect(story).toContain('The End.');
      });
    });
  });
});
