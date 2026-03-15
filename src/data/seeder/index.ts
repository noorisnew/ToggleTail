/**
 * Preloaded Story Seeder Module
 * 
 * Handles first-run seeding of preloaded stories from manifest.
 * 
 * @example
 * import { seedStoriesFromLibrary } from '@/src/data/seeder';
 * 
 * // Seed on app launch (recommended)
 * const result = await seedStoriesFromLibrary();
 * console.log(`Seeded ${result.seededCount} stories`);
 */

export {
    forceSeedPreloadedStories, getPendingPreloadedStories,
    // Query functions
    getPreloadedStories, getSeededVersion, isPreloadedStory, needsSeeding,
    // Main functions
    seedPreloadedStories,
    // Practical seeder (uses actual manifest format)
    seedStoriesFromLibrary, type PreloadedStoryMeta,
    // Types
    type SeedResult, type StoryWithPreloadedMeta
} from './PreloadedSeeder';

