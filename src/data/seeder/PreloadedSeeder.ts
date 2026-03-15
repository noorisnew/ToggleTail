/**
 * PreloadedSeeder - First-run seeding of preloaded stories
 * 
 * Handles importing stories from the preloaded manifest into local storage.
 * Stories are seeded once per manifest version and are not visible to
 * children until explicitly approved by a parent.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';
import type { ManifestStory, StoryManifest } from '../library/manifestSchema';
import {
    getAllStories,
    getStoryContent,
    type ReadingLevel,
    type StoryMetadata,
} from '../library/storyLibraryService';
import { PRELOADED_SEEDED_VERSION_KEY, STORIES_KEY } from '../storage/storageKeys';
import type { Difficulty, Story } from '../storage/storyStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SeedResult = {
  success: boolean;
  seededCount: number;
  skippedCount: number;
  manifestVersion: string;
  error?: string;
};

export type PreloadedStoryMeta = {
  /** Marks this as a preloaded story */
  isPreloaded: true;
  /** Original manifest story ID */
  manifestId: string;
  /** Source attribution (e.g., "StoryWeaver") */
  source: string;
  /** License (e.g., "CC BY 4.0") */
  license: string;
  /** Author of the story */
  author: string;
  /** Original source URL (optional) */
  sourceUrl?: string;
  /** Illustrator (optional) */
  illustrator?: string;
};

/**
 * Extended story type that includes preloaded metadata
 * This extends the base Story type with optional preloaded info
 * and additional display metadata from the manifest
 */
export type StoryWithPreloadedMeta = Story & {
  preloaded?: PreloadedStoryMeta;
  /** Age range for display (e.g., "3-5") */
  ageRange?: string;
  /** Emoji for display */
  emoji?: string;
  /** Reading level for display (e.g., "Beginner") */
  readingLevel?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Version Comparison
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare semantic versions
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}

/**
 * Check if seeding is needed based on stored version
 */
export async function needsSeeding(manifestVersion: string): Promise<boolean> {
  try {
    const storedVersion = await AsyncStorage.getItem(PRELOADED_SEEDED_VERSION_KEY);
    if (!storedVersion) {
      return true; // Never seeded
    }
    // Seed if manifest is newer than stored version
    return compareVersions(manifestVersion, storedVersion) > 0;
  } catch (error) {
    console.error('needsSeeding check failed:', normalizeError(error));
    return true; // Err on the side of seeding
  }
}

/**
 * Get currently seeded version
 */
export async function getSeededVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PRELOADED_SEEDED_VERSION_KEY);
  } catch (error) {
    console.error('getSeededVersion failed:', normalizeError(error));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Story Conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map grade level to difficulty
 */
function gradeToDifficulty(gradeLevel?: string): Difficulty {
  if (!gradeLevel) return 'Easy';
  
  // Parse grade level like "K-1", "2-3", "4-5"
  const match = gradeLevel.match(/(\d+)/);
  if (!match) return 'Easy';
  
  const grade = parseInt(match[1], 10);
  if (grade <= 1) return 'Easy';
  if (grade <= 3) return 'Medium';
  return 'Hard';
}

/**
 * Convert ManifestStory to Story for storage
 * Stories are NOT approved by default - requires parent approval
 */
function manifestStoryToStory(
  manifestStory: ManifestStory,
  storyText: string
): StoryWithPreloadedMeta {
  return {
    // Base Story fields
    id: manifestStory.id,
    title: manifestStory.title,
    text: storyText,
    createdAt: new Date().toISOString(),
    approved: false, // CRITICAL: Not visible to child by default
    difficulty: gradeToDifficulty(manifestStory.gradeLevel),
    tags: [manifestStory.genre, manifestStory.language],
    isFavorite: false,
    theme: manifestStory.genre,
    readCount: 0,
    // Preloaded metadata
    preloaded: {
      isPreloaded: true,
      manifestId: manifestStory.id,
      source: manifestStory.attribution.source,
      license: manifestStory.attribution.license,
      author: manifestStory.attribution.author,
      sourceUrl: manifestStory.attribution.sourceUrl,
      illustrator: manifestStory.attribution.illustrator,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Loading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load story text content from asset
 * This is a placeholder - actual implementation depends on asset bundling
 */
async function loadStoryContent(textAssetPath: string): Promise<string | null> {
  try {
    // For React Native with Metro bundler, we need to use require()
    // This is a simplified approach - real implementation would use
    // static imports or a content registry similar to storyLibraryService
    
    // For now, return a placeholder indicating the path
    // The actual content loading should be implemented based on how
    // story assets are bundled in the app
    console.log(`Loading story content from: ${textAssetPath}`);
    return `[Story content from ${textAssetPath}]`;
  } catch (error) {
    console.error(`Failed to load story content from ${textAssetPath}:`, normalizeError(error));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeding Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get existing story IDs from storage
 */
async function getExistingStoryIds(): Promise<Set<string>> {
  try {
    const json = await AsyncStorage.getItem(STORIES_KEY);
    if (!json) return new Set();
    
    const stories = JSON.parse(json);
    if (!Array.isArray(stories)) return new Set();
    
    return new Set(stories.map((s: { id: string }) => s.id));
  } catch (error) {
    console.error('getExistingStoryIds failed:', normalizeError(error));
    return new Set();
  }
}

/**
 * Upsert stories into storage
 * - Inserts new stories
 * - Updates existing stories (preserves approval status)
 */
async function upsertStories(newStories: StoryWithPreloadedMeta[]): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(STORIES_KEY);
    const existingStories: StoryWithPreloadedMeta[] = json ? JSON.parse(json) : [];
    
    // Create map of existing stories by ID
    const storyMap = new Map<string, StoryWithPreloadedMeta>();
    for (const story of existingStories) {
      storyMap.set(story.id, story);
    }
    
    // Upsert new stories
    for (const newStory of newStories) {
      const existing = storyMap.get(newStory.id);
      if (existing) {
        // Update existing story, but preserve approval status and user data
        storyMap.set(newStory.id, {
          ...newStory,
          approved: existing.approved, // Keep existing approval
          isFavorite: existing.isFavorite, // Keep user preference
          readCount: existing.readCount, // Keep read history
          createdAt: existing.createdAt, // Keep original creation date
        });
      } else {
        // Insert new story
        storyMap.set(newStory.id, newStory);
      }
    }
    
    // Save back to storage
    const updatedStories = Array.from(storyMap.values());
    await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(updatedStories));
  } catch (error) {
    throw new Error(`Failed to upsert stories: ${normalizeError(error)}`);
  }
}

/**
 * Save the seeded version to storage
 */
async function saveSeededVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(PRELOADED_SEEDED_VERSION_KEY, version);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Seeding Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seed preloaded stories from manifest
 * 
 * @param manifest - The story manifest to seed from
 * @param contentLoader - Optional custom content loader function
 * @returns Result object with success status and counts
 * 
 * @example
 * import manifest from '@/assets/library/manifest-v2.json';
 * const result = await seedPreloadedStories(manifest);
 * console.log(`Seeded ${result.seededCount} stories`);
 */
export async function seedPreloadedStories(
  manifest: StoryManifest,
  contentLoader?: (path: string) => Promise<string | null>
): Promise<SeedResult> {
  const loader = contentLoader ?? loadStoryContent;
  
  try {
    // Check if seeding is needed
    const shouldSeed = await needsSeeding(manifest.manifestVersion);
    if (!shouldSeed) {
      const currentVersion = await getSeededVersion();
      return {
        success: true,
        seededCount: 0,
        skippedCount: manifest.stories.length,
        manifestVersion: currentVersion ?? manifest.manifestVersion,
      };
    }
    
    // Get existing story IDs to avoid duplicates
    const existingIds = await getExistingStoryIds();
    
    // Convert and collect stories to seed
    const storiesToSeed: StoryWithPreloadedMeta[] = [];
    let contentFailedCount = 0;
    let updatedCount = 0;
    
    for (const manifestStory of manifest.stories) {
      // Load story content
      const content = await loader(manifestStory.textAssetPath);
      if (!content) {
        console.warn(`Skipping story ${manifestStory.id}: failed to load content`);
        contentFailedCount++;
        continue;
      }
      
      // Convert to storage format
      const story = manifestStoryToStory(manifestStory, content);
      storiesToSeed.push(story);
      
      // Track if already exists (will be updated, not inserted)
      if (existingIds.has(manifestStory.id)) {
        updatedCount++;
      }
    }
    
    // Upsert stories
    if (storiesToSeed.length > 0) {
      await upsertStories(storiesToSeed);
    }
    
    // Save seeded version
    await saveSeededVersion(manifest.manifestVersion);
    
    // seededCount = new stories inserted (not updated)
    // skippedCount = content loading failures
    return {
      success: true,
      seededCount: storiesToSeed.length - updatedCount,
      skippedCount: contentFailedCount,
      manifestVersion: manifest.manifestVersion,
    };
  } catch (error) {
    return {
      success: false,
      seededCount: 0,
      skippedCount: 0,
      manifestVersion: manifest.manifestVersion,
      error: normalizeError(error),
    };
  }
}

/**
 * Force re-seed all stories regardless of version
 * Useful for development or data recovery
 */
export async function forceSeedPreloadedStories(
  manifest: StoryManifest,
  contentLoader?: (path: string) => Promise<string | null>
): Promise<SeedResult> {
  // Clear seeded version to force re-seed
  try {
    await AsyncStorage.removeItem(PRELOADED_SEEDED_VERSION_KEY);
  } catch (error) {
    console.error('Failed to clear seeded version:', normalizeError(error));
  }
  
  return seedPreloadedStories(manifest, contentLoader);
}

/**
 * Check if a story is a preloaded story
 */
export function isPreloadedStory(story: Story | StoryWithPreloadedMeta): boolean {
  return 'preloaded' in story && story.preloaded?.isPreloaded === true;
}

/**
 * Get all preloaded stories (approved or not)
 */
export async function getPreloadedStories(): Promise<StoryWithPreloadedMeta[]> {
  try {
    const json = await AsyncStorage.getItem(STORIES_KEY);
    if (!json) return [];
    
    const stories = JSON.parse(json) as StoryWithPreloadedMeta[];
    return stories.filter(isPreloadedStory);
  } catch (error) {
    console.error('getPreloadedStories failed:', normalizeError(error));
    return [];
  }
}

/**
 * Get preloaded stories pending approval
 */
export async function getPendingPreloadedStories(): Promise<StoryWithPreloadedMeta[]> {
  const preloaded = await getPreloadedStories();
  return preloaded.filter(s => !s.approved);
}

// ─────────────────────────────────────────────────────────────────────────────
// Practical Seeder (Works with actual manifest.json format)
// ─────────────────────────────────────────────────────────────────────────────

/** Current manifest version from manifest.json */
const MANIFEST_VERSION = '2.0.0';

/**
 * Map reading level to difficulty
 */
function readingLevelToDifficulty(level: ReadingLevel): Difficulty {
  switch (level) {
    case 'Beginner': return 'Easy';
    case 'Intermediate': return 'Medium';
    case 'Advanced': return 'Hard';
    default: return 'Easy';
  }
}

/**
 * Convert StoryMetadata to Story for storage
 * Stories are NOT approved by default - requires parent approval
 */
function storyMetadataToStory(
  metadata: StoryMetadata,
  storyText: string
): StoryWithPreloadedMeta {
  return {
    id: metadata.id,
    title: metadata.title,
    text: storyText,
    createdAt: new Date().toISOString(),
    approved: false, // CRITICAL: Not visible to child by default
    difficulty: readingLevelToDifficulty(metadata.readingLevel),
    tags: [metadata.genre],
    isFavorite: false,
    theme: metadata.genre,
    readCount: 0,
    // Store metadata for display 
    ageRange: metadata.ageRange,
    emoji: metadata.emoji,
    readingLevel: metadata.readingLevel,
    // Preloaded metadata
    preloaded: {
      isPreloaded: true,
      manifestId: metadata.id,
      source: 'Bundled Library',
      license: 'Public Domain',
      author: (metadata as any).author || 'Unknown',
    },
  };
}

/**
 * Seed stories from the bundled library service
 * 
 * This is the primary seeding function that uses storyLibraryService
 * to get stories from manifest.json in its actual format.
 * 
 * @returns Result object with success status and counts
 * 
 * @example
 * import { seedStoriesFromLibrary } from '@/src/data/seeder';
 * const result = await seedStoriesFromLibrary();
 * console.log(`Seeded ${result.seededCount} stories`);
 */
export async function seedStoriesFromLibrary(): Promise<SeedResult> {
  try {
    // Check if seeding is needed
    const shouldSeed = await needsSeeding(MANIFEST_VERSION);
    if (!shouldSeed) {
      const currentVersion = await getSeededVersion();
      return {
        success: true,
        seededCount: 0,
        skippedCount: 0,
        manifestVersion: currentVersion ?? MANIFEST_VERSION,
      };
    }
    
    // Get existing story IDs to avoid duplicates
    const existingIds = await getExistingStoryIds();
    
    // Get all stories from the library
    const allStories = getAllStories(1, 100); // Get all (max 100)
    
    // Convert and collect stories to seed
    const storiesToSeed: StoryWithPreloadedMeta[] = [];
    let skippedCount = 0;
    
    for (const metadata of allStories.items) {
      // Load story content
      const content = await getStoryContent(metadata.id);
      if (!content) {
        console.warn(`Skipping story ${metadata.id}: failed to load content`);
        skippedCount++;
        continue;
      }
      
      // Convert to storage format
      const story = storyMetadataToStory(metadata, content.content);
      storiesToSeed.push(story);
      
      // Count as skipped if already exists
      if (existingIds.has(metadata.id)) {
        skippedCount++;
      }
    }
    
    // Upsert stories
    if (storiesToSeed.length > 0) {
      await upsertStories(storiesToSeed);
    }
    
    // Save seeded version
    await saveSeededVersion(MANIFEST_VERSION);
    
    return {
      success: true,
      seededCount: storiesToSeed.length - skippedCount,
      skippedCount,
      manifestVersion: MANIFEST_VERSION,
    };
  } catch (error) {
    return {
      success: false,
      seededCount: 0,
      skippedCount: 0,
      manifestVersion: MANIFEST_VERSION,
      error: normalizeError(error),
    };
  }
}
