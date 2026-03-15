/**
 * Story Cover Images Registry
 * 
 * Maps story IDs to their cover image assets.
 * Images are bundled with the app and loaded via require().
 * 
 * For stories without custom covers, emoji-based placeholders are used.
 */

import { ImageSourcePropType } from 'react-native';

// Type for cover image source
export type CoverImageSource = ImageSourcePropType | null;

// Default placeholder - can be replaced with actual image assets
// To add real cover images:
// 1. Add image to assets/library/covers/
// 2. Import it here: const cover = require('../../../assets/library/covers/animal-001.png');
// 3. Add to registry below

/**
 * Get the cover image source for a story
 * Returns null if no cover is available (use emoji fallback)
 */
export function getStoryCoverImage(storyId: string): CoverImageSource {
  // Cover images registry - add entries as images are created
  const coverImages: Record<string, CoverImageSource> = {
    // Example entries (uncomment when images are added):
    // 'animal-001': require('../../../assets/library/covers/animal-001.png'),
    // 'adventure-001': require('../../../assets/library/covers/adventure-001.png'),
  };

  return coverImages[storyId] || null;
}

/**
 * Check if a story has a custom cover image
 */
export function hasCustomCover(storyId: string): boolean {
  return getStoryCoverImage(storyId) !== null;
}

/**
 * Generate a gradient color pair for a genre (for placeholder backgrounds)
 */
export function getGenrePlaceholderColors(genreId: string): [string, string] {
  const genreColors: Record<string, [string, string]> = {
    animals: ['#86EFAC', '#4ADE80'],
    adventure: ['#FBBF24', '#F59E0B'],
    bedtime: ['#C4B5FD', '#A78BFA'],
    science: ['#7DD3FC', '#38BDF8'],
    values: ['#FDA4AF', '#FB7185'],
    fantasy: ['#D8B4FE', '#C084FC'],
  };

  return genreColors[genreId] || ['#E5E7EB', '#D1D5DB'];
}
