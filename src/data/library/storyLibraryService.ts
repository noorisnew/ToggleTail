/**
 * Preloaded Story Library Service
 * 
 * Provides access to local story assets organized by genre.
 * Stories ship with the app - no download required.
 */

// Import manifest and story content statically for bundling
import manifest from '../../../assets/library/manifest.json';

// Static imports for story content (required for Metro bundler)
const storyContent: Record<string, () => Promise<StoryContent>> = {
  // Animals (9 stories - Beginner to Advanced)
  'animal-001.json': () => import('../../../assets/library/stories/animal-001.json'),
  'animal-002.json': () => import('../../../assets/library/stories/animal-002.json'),
  'animal-003.json': () => import('../../../assets/library/stories/animal-003.json'),
  'animal-004.json': () => import('../../../assets/library/stories/animal-004.json'),
  'animal-005.json': () => import('../../../assets/library/stories/animal-005.json'),
  'animal-006.json': () => import('../../../assets/library/stories/animal-006.json'),
  'animal-007.json': () => import('../../../assets/library/stories/animal-007.json'),
  'animal-008.json': () => import('../../../assets/library/stories/animal-008.json'),
  'animal-009.json': () => import('../../../assets/library/stories/animal-009.json'),
  // Adventure (9 stories - Beginner to Advanced)
  'adventure-001.json': () => import('../../../assets/library/stories/adventure-001.json'),
  'adventure-002.json': () => import('../../../assets/library/stories/adventure-002.json'),
  'adventure-003.json': () => import('../../../assets/library/stories/adventure-003.json'),
  'adventure-004.json': () => import('../../../assets/library/stories/adventure-004.json'),
  'adventure-005.json': () => import('../../../assets/library/stories/adventure-005.json'),
  'adventure-006.json': () => import('../../../assets/library/stories/adventure-006.json'),
  'adventure-007.json': () => import('../../../assets/library/stories/adventure-007.json'),
  'adventure-008.json': () => import('../../../assets/library/stories/adventure-008.json'),
  'adventure-009.json': () => import('../../../assets/library/stories/adventure-009.json'),
  // Bedtime (8 stories - Beginner to Advanced)
  'bedtime-001.json': () => import('../../../assets/library/stories/bedtime-001.json'),
  'bedtime-002.json': () => import('../../../assets/library/stories/bedtime-002.json'),
  'bedtime-003.json': () => import('../../../assets/library/stories/bedtime-003.json'),
  'bedtime-004.json': () => import('../../../assets/library/stories/bedtime-004.json'),
  'bedtime-005.json': () => import('../../../assets/library/stories/bedtime-005.json'),
  'bedtime-006.json': () => import('../../../assets/library/stories/bedtime-006.json'),
  'bedtime-007.json': () => import('../../../assets/library/stories/bedtime-007.json'),
  'bedtime-008.json': () => import('../../../assets/library/stories/bedtime-008.json'),
  // Science (7 stories - Beginner to Advanced)
  'science-001.json': () => import('../../../assets/library/stories/science-001.json'),
  'science-002.json': () => import('../../../assets/library/stories/science-002.json'),
  'science-003.json': () => import('../../../assets/library/stories/science-003.json'),
  'science-004.json': () => import('../../../assets/library/stories/science-004.json'),
  'science-005.json': () => import('../../../assets/library/stories/science-005.json'),
  'science-006.json': () => import('../../../assets/library/stories/science-006.json'),
  'science-007.json': () => import('../../../assets/library/stories/science-007.json'),
  // Values (8 stories - Beginner to Advanced)
  'values-001.json': () => import('../../../assets/library/stories/values-001.json'),
  'values-002.json': () => import('../../../assets/library/stories/values-002.json'),
  'values-003.json': () => import('../../../assets/library/stories/values-003.json'),
  'values-004.json': () => import('../../../assets/library/stories/values-004.json'),
  'values-005.json': () => import('../../../assets/library/stories/values-005.json'),
  'values-006.json': () => import('../../../assets/library/stories/values-006.json'),
  'values-007.json': () => import('../../../assets/library/stories/values-007.json'),
  'values-008.json': () => import('../../../assets/library/stories/values-008.json'),
  // Fantasy (9 stories - Beginner to Advanced)
  'fantasy-001.json': () => import('../../../assets/library/stories/fantasy-001.json'),
  'fantasy-002.json': () => import('../../../assets/library/stories/fantasy-002.json'),
  'fantasy-003.json': () => import('../../../assets/library/stories/fantasy-003.json'),
  'fantasy-004.json': () => import('../../../assets/library/stories/fantasy-004.json'),
  'fantasy-005.json': () => import('../../../assets/library/stories/fantasy-005.json'),
  'fantasy-006.json': () => import('../../../assets/library/stories/fantasy-006.json'),
  'fantasy-007.json': () => import('../../../assets/library/stories/fantasy-007.json'),
  'fantasy-008.json': () => import('../../../assets/library/stories/fantasy-008.json'),
  'fantasy-009.json': () => import('../../../assets/library/stories/fantasy-009.json'),
};

// Types
export type GenreId = 'animals' | 'adventure' | 'bedtime' | 'science' | 'values' | 'fantasy';

export type ReadingLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type Genre = {
  id: GenreId;
  name: string;
  emoji: string;
  description: string;
  color: string;
};

export type StoryMetadata = {
  id: string;
  title: string;
  genre: GenreId;
  readingLevel: ReadingLevel;
  ageRange: string;
  duration: number; // in minutes
  emoji: string;
  preview: string;
  contentFile: string;
  coverImage?: string; // path to cover image in assets
};

export type StoryContent = {
  id: string;
  title: string;
  content: string;
  pages: string[];
  wordCount: number;
  author: string;
};

export type LibraryStory = StoryMetadata & {
  fullContent?: StoryContent;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

// Constants
const DEFAULT_PAGE_SIZE = 20;

/**
 * Get all available genres
 */
export function getGenres(): Genre[] {
  return manifest.genres as Genre[];
}

/**
 * Get a specific genre by ID
 */
export function getGenre(genreId: GenreId): Genre | undefined {
  return manifest.genres.find((g) => g.id === genreId) as Genre | undefined;
}

/**
 * Get stories by genre with pagination
 * 
 * @param genre - The genre ID to filter by
 * @param page - Page number (1-indexed, default: 1)
 * @param pageSize - Number of items per page (default: 20)
 * @returns Paginated result with story metadata
 */
export function getStoriesByGenre(
  genre: GenreId,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedResult<StoryMetadata> {
  // Filter stories by genre
  const allStories = manifest.stories.filter((s) => s.genre === genre) as StoryMetadata[];
  
  // Calculate pagination
  const total = allStories.length;
  const normalizedPage = Math.max(1, page);
  const startIndex = (normalizedPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  // Get page items
  const items = allStories.slice(startIndex, endIndex);
  
  return {
    items,
    page: normalizedPage,
    pageSize,
    total,
    hasNextPage: endIndex < total,
  };
}

/**
 * Parameters for listStoriesByGenre
 */
export type ListStoriesByGenreParams = {
  /** Genre ID to filter by */
  genre: GenreId;
  /** Page number (1-indexed, default: 1) */
  page?: number;
  /** Number of items per page (default: 20) */
  pageSize?: number;
};

/**
 * List stories by genre with pagination (object params)
 * 
 * Optimized for fast local queries - uses in-memory manifest data.
 * Stories are returned in curated order as defined in the manifest.
 * 
 * @param params - Object containing genre, page, and pageSize
 * @returns Paginated result with story metadata and hasNextPage indicator
 * 
 * @example
 * const result = listStoriesByGenre({ genre: 'adventure' });
 * // First page, 20 items
 * 
 * const page2 = listStoriesByGenre({ genre: 'adventure', page: 2, pageSize: 10 });
 * // Second page, 10 items
 */
export function listStoriesByGenre({
  genre,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: ListStoriesByGenreParams): PaginatedResult<StoryMetadata> {
  // Stories are pre-ordered in manifest (curated order)
  // No additional sorting needed - manifest order IS the curated order
  const genreStories = manifest.stories.filter((s) => s.genre === genre) as StoryMetadata[];
  
  // Calculate pagination bounds
  const total = genreStories.length;
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.max(1, Math.min(pageSize, 100)); // Cap at 100
  const startIndex = (normalizedPage - 1) * normalizedPageSize;
  const endIndex = startIndex + normalizedPageSize;
  
  // Slice items for current page
  const items = genreStories.slice(startIndex, endIndex);
  
  return {
    items,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    hasNextPage: endIndex < total,
  };
}

/**
 * Get all stories with pagination (across all genres)
 * 
 * @param page - Page number (1-indexed, default: 1)
 * @param pageSize - Number of items per page (default: 20)
 * @returns Paginated result with story metadata
 */
export function getAllStories(
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedResult<StoryMetadata> {
  const allStories = manifest.stories as StoryMetadata[];
  
  const total = allStories.length;
  const normalizedPage = Math.max(1, page);
  const startIndex = (normalizedPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  const items = allStories.slice(startIndex, endIndex);
  
  return {
    items,
    page: normalizedPage,
    pageSize,
    total,
    hasNextPage: endIndex < total,
  };
}

/**
 * Get stories filtered by reading level
 * 
 * @param level - The reading level to filter by
 * @param page - Page number (1-indexed, default: 1)
 * @param pageSize - Number of items per page (default: 20)
 * @returns Paginated result with story metadata
 */
export function getStoriesByReadingLevel(
  level: ReadingLevel,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedResult<StoryMetadata> {
  const allStories = manifest.stories.filter(
    (s) => s.readingLevel === level
  ) as StoryMetadata[];
  
  const total = allStories.length;
  const normalizedPage = Math.max(1, page);
  const startIndex = (normalizedPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  const items = allStories.slice(startIndex, endIndex);
  
  return {
    items,
    page: normalizedPage,
    pageSize,
    total,
    hasNextPage: endIndex < total,
  };
}

/**
 * Get a story's metadata by ID
 */
export function getStoryMetadata(storyId: string): StoryMetadata | undefined {
  return manifest.stories.find((s) => s.id === storyId) as StoryMetadata | undefined;
}

/**
 * Load the full content of a story
 * 
 * @param storyId - The story ID to load content for
 * @returns The full story content, or undefined if not found
 */
export async function getStoryContent(storyId: string): Promise<StoryContent | undefined> {
  const metadata = getStoryMetadata(storyId);
  if (!metadata) {
    return undefined;
  }
  
  const loader = storyContent[metadata.contentFile];
  if (!loader) {
    console.warn(`Story content not found: ${metadata.contentFile}`);
    return undefined;
  }
  
  try {
    const module = await loader();
    // Metro bundler dynamic imports for JSON return the data as the default export
    const content = (module as any).default ?? module;
    return content as StoryContent;
  } catch (error) {
    console.warn(`Failed to load story content for ${storyId}:`, error);
    return undefined;
  }
}

/**
 * Get a story with full content loaded
 *
 * Combines metadata from the manifest with the full text content from the
 * bundled JSON file.  Used by storyApi.ts to serve preloaded stories in
 * LibraryStory format when the backend is unavailable or the story is offline.
 *
 * @param storyId - The story ID to load
 * @returns Story metadata with fullContent attached, or undefined if not found
 */
export async function getFullStory(storyId: string): Promise<LibraryStory | undefined> {
  const metadata = getStoryMetadata(storyId);
  if (!metadata) {
    return undefined;
  }

  const fullContent = await getStoryContent(storyId);

  return {
    ...metadata,
    fullContent,
  };
}