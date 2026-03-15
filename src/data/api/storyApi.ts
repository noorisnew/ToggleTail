import { API_BASE_URL } from '../../config/api';
import { StoryLength } from '../../domain/services/storyCreationService';
import { logger } from '../../services/loggerService';
import {
    getStoriesByGenre as getPreloadedByGenre,
    getFullStory as getPreloadedFullStory,
    getAllStories as getPreloadedStories,
    StoryMetadata as PreloadedStoryMetadata
} from '../library/storyLibraryService';
import {
    cacheLibraryStories,
    cacheStoryContent,
    getCachedLibraryStories,
    getCachedStoryContent,
    isCacheValid,
    isOnline,
} from '../storage/libraryCacheStorage';
import { InterestType } from '../storage/profileStorage';
import { addStory, Story } from '../storage/storyStorage';

/**
 * Genre to category mapping for preloaded stories
 */
const GENRE_TO_CATEGORY: Record<string, string> = {
  animals: 'Animals',
  adventure: 'Adventure',
  bedtime: 'Bedtime',
  science: 'Science',
  values: 'Values',
  fantasy: 'Fantasy',
};

/**
 * Convert preloaded story metadata to LibraryStory format
 */
function convertPreloadedToLibraryStory(story: PreloadedStoryMetadata): LibraryStory {
  return {
    _id: story.id,
    title: story.title,
    category: GENRE_TO_CATEGORY[story.genre] || story.genre,
    ageBand: story.ageRange,
    readingLevel: story.readingLevel,
    provider: 'preloaded',
    coverUrl: null,
    wordCount: story.duration * 150, // Estimate: ~150 words per minute
  };
}

/**
 * Get preloaded stories as LibraryStory format
 * This is SYNCHRONOUS for instant loading
 */
function getPreloadedLibraryStories(category?: string, limit?: number, offset?: number): LibraryStory[] {
  let stories: PreloadedStoryMetadata[];
  
  if (category) {
    // Map category back to genre
    const genre = Object.entries(GENRE_TO_CATEGORY).find(([_, cat]) => cat === category)?.[0];
    if (genre) {
      const result = getPreloadedByGenre(genre as any, 1, 100);
      stories = result.items;
    } else {
      stories = [];
    }
  } else {
    const result = getPreloadedStories(1, 100);
    stories = result.items;
  }
  
  // Apply pagination
  const start = offset || 0;
  const end = limit ? start + limit : stories.length;
  const sliced = stories.slice(start, end);
  
  return sliced.map(convertPreloadedToLibraryStory);
}

/**
 * Get preloaded stories synchronously - instant loading, no async
 * Use this for immediate story list display
 */
export function getPreloadedStoriesSync(category?: string): LibraryStory[] {
  return getPreloadedLibraryStories(category, 100, 0);
}

/**
 * Get a preloaded story by ID with full content
 */
async function getPreloadedStoryById(storyId: string): Promise<LibraryStory | null> {
  try {
    const fullStory = await getPreloadedFullStory(storyId);
    if (!fullStory) return null;
    
    const libraryStory = convertPreloadedToLibraryStory(fullStory);
    // Add full text content from the story
    if (fullStory.fullContent) {
      libraryStory.text = fullStory.fullContent.content;
      libraryStory.author = fullStory.fullContent.author;
    }
    return libraryStory;
  } catch (error) {
    console.error('getPreloadedStoryById failed:', error);
    return null;
  }
}

export type GenerateStoryParams = {
  childName?: string;
  age: number;
  readingLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  interests: (InterestType | string)[];
  customPrompt?: string;
  title?: string;
  theme?: string;
  mainCharacter?: string;
  specialCharacters?: string;
  storyContext?: string;
  storyLength?: StoryLength;
  agentStyle?: string;
};

export type GeneratedStory = {
  title: string;
  text: string;
  readingLevel: string;
  pageCount: number;
  generatedFor: string;
  themes: string[];
};

export type StorySuggestion = {
  title: string;
  theme: string;
  description?: string;
};

/**
 * Check if the backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (error) {
    logger.error('API health check failed', error);
    return false;
  }
}

/**
 * Generate a story using the AI backend and save to storage
 */
export async function generateStory(params: GenerateStoryParams): Promise<Story & { success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stories/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate story');
    }

    // Create story object
    const story: Story = {
      id: Date.now().toString(),
      title: data.story?.title || params.title || 'Untitled Story',
      text: data.story?.text || '',
      createdAt: new Date().toISOString(),
      approved: false,
      difficulty: params.readingLevel === 'Beginner' ? 'Easy' : params.readingLevel === 'Advanced' ? 'Hard' : 'Medium',
      tags: data.story?.themes || params.interests as string[] || [],
      theme: params.theme,
      isFavorite: false,
      readCount: 0,
    };

    // Save to storage
    await addStory(story);

    return { ...story, success: true };
  } catch (error) {
    logger.error('generateStory failed', error, { params });
    const errorStory: Story = {
      id: Date.now().toString(),
      title: params.title || 'Story',
      text: '',
      createdAt: new Date().toISOString(),
      approved: false,
      difficulty: 'Easy',
      tags: [],
      isFavorite: false,
      readCount: 0,
    };
    return { ...errorStory, success: false, error: error instanceof Error ? error.message : 'Failed to generate story' };
  }
}

/**
 * Get story suggestions based on interests
 */
export async function getStorySuggestions(
  interests: InterestType[],
  count: number = 3
): Promise<{
  suggestions: StorySuggestion[];
  fallback: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stories/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests, count }),
    });

    const data = await response.json();

    return {
      suggestions: data.suggestions || [],
      fallback: data.fallback ?? true,
    };
  } catch (error) {
    logger.error('getStorySuggestions failed', error, { interests });
    return {
      suggestions: getFallbackSuggestions(interests),
      fallback: true,
    };
  }
}

/**
 * Fallback suggestions when API is unavailable
 */
function getFallbackSuggestions(interests: InterestType[]): StorySuggestion[] {
  const fallbackMap: Record<InterestType, StorySuggestion> = {
    'Super Heroes': { title: 'The Brave Hero\'s Quest', theme: 'Super Heroes' },
    'Dragons & Magic': { title: 'The Friendly Dragon', theme: 'Dragons & Magic' },
    'Fairy Tales': { title: 'The Princess and the Star', theme: 'Fairy Tales' },
    'Mystery & Puzzles': { title: 'The Secret of the Lost Key', theme: 'Mystery & Puzzles' },
    'Dinosaurs': { title: 'Dino\'s Big Day', theme: 'Dinosaurs' },
    'Ocean Adventures': { title: 'Under the Sea Adventure', theme: 'Ocean Adventures' },
    'Cute Animals': { title: 'The Forest Friends', theme: 'Cute Animals' },
    'Space & Robots': { title: 'Robot\'s Space Journey', theme: 'Space & Robots' },
  };

  if (interests.length === 0) {
    return Object.values(fallbackMap).slice(0, 3);
  }

  return interests.slice(0, 3).map(i => fallbackMap[i] || { title: 'A Magical Story', theme: i });
}

/**
 * Library story from the backend
 */
export type LibraryStory = {
  _id: string;
  title: string;
  category: string;
  ageBand: string;
  readingLevel: string;
  provider: string;
  coverUrl: string | null;
  wordCount: number;
  text?: string;
  author?: string;
};

/**
 * Fetch stories from the library (pre-loaded stories)
 * Preloaded stories are always available - API stories are supplemental
 */
export async function getLibraryStories(options?: {
  category?: string;
  limit?: number;
  offset?: number;
  forceRefresh?: boolean;
}): Promise<{
  stories: LibraryStory[];
  success: boolean;
  fromCache: boolean;
  error?: string;
}> {
  try {
    // Always start with preloaded stories - they're bundled with the app
    const preloaded = getPreloadedLibraryStories(options?.category, options?.limit, options?.offset);
    
    // If we have preloaded stories and not forcing refresh, return them
    if (preloaded.length > 0 && !options?.forceRefresh) {
      return {
        stories: preloaded,
        success: true,
        fromCache: true, // Treat preloaded as cached
      };
    }
    
    const online = await isOnline();
    const cacheValid = await isCacheValid();

    // If offline or cache is valid and no force refresh, use cache
    if (!online || (cacheValid && !options?.forceRefresh)) {
      const cached = await getCachedLibraryStories();
      if (cached && cached.length > 0) {
        let filteredStories = cached as LibraryStory[];
        
        // Apply category filter to cached data
        if (options?.category) {
          filteredStories = filteredStories.filter(s => s.category === options.category);
        }
        
        // Apply pagination to cached data
        const offset = options?.offset || 0;
        const limit = options?.limit || filteredStories.length;
        filteredStories = filteredStories.slice(offset, offset + limit);
        
        return { 
          stories: filteredStories, 
          success: true, 
          fromCache: true,
        };
      }
      
      // Offline with no cache - fall back to preloaded library
      if (!online) {
        const preloaded = getPreloadedLibraryStories(options?.category, options?.limit, options?.offset);
        if (preloaded.length > 0) {
          return {
            stories: preloaded,
            success: true,
            fromCache: true,
          };
        }
        return { 
          stories: [], 
          success: false, 
          fromCache: true,
          error: 'No internet connection and no cached stories available' 
        };
      }
    }

    // Online - fetch from server
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    const url = `${API_BASE_URL}/api/stories/library${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      // Try cache as fallback
      const cached = await getCachedLibraryStories();
      if (cached && cached.length > 0) {
        return { stories: cached as LibraryStory[], success: true, fromCache: true };
      }
      // Fall back to preloaded library
      const preloaded = getPreloadedLibraryStories(options?.category, options?.limit, options?.offset);
      if (preloaded.length > 0) {
        return { stories: preloaded, success: true, fromCache: true };
      }
      return { stories: [], success: false, fromCache: false, error: data.message || 'Failed to fetch library' };
    }

    const stories = data.stories || [];
    
    // Cache the full library (only when fetching without filters)
    if (!options?.category && !options?.offset) {
      await cacheLibraryStories(stories);
    }

    return { stories, success: true, fromCache: false };
  } catch (error) {
    logger.error('getLibraryStories failed', error);
    
    // Try cache as fallback on network error
    const cached = await getCachedLibraryStories();
    if (cached && cached.length > 0) {
      let filteredStories = cached as LibraryStory[];
      if (options?.category) {
        filteredStories = filteredStories.filter(s => s.category === options.category);
      }
      return { stories: filteredStories, success: true, fromCache: true };
    }
    
    // Fall back to preloaded library
    const preloaded = getPreloadedLibraryStories(options?.category, options?.limit, options?.offset);
    if (preloaded.length > 0) {
      return { stories: preloaded, success: true, fromCache: true };
    }
    
    return { 
      stories: [], 
      success: false, 
      fromCache: false,
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Fetch a single story with full content
 * Uses cache when offline or as fallback, then preloaded library
 */
export async function getStoryById(storyId: string): Promise<{
  story: LibraryStory | null;
  success: boolean;
  fromCache: boolean;
  error?: string;
}> {
  try {
    const online = await isOnline();

    // If offline, try cache first, then preloaded
    if (!online) {
      const cached = await getCachedStoryContent(storyId);
      if (cached) {
        return { story: cached as LibraryStory, success: true, fromCache: true };
      }
      // Try preloaded library
      const preloaded = await getPreloadedStoryById(storyId);
      if (preloaded) {
        return { story: preloaded, success: true, fromCache: true };
      }
      return { 
        story: null, 
        success: false, 
        fromCache: true,
        error: 'No internet connection and story not cached' 
      };
    }

    // Online - fetch from server
    const response = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      // Try cache as fallback
      const cached = await getCachedStoryContent(storyId);
      if (cached) {
        return { story: cached as LibraryStory, success: true, fromCache: true };
      }
      // Try preloaded library
      const preloaded = await getPreloadedStoryById(storyId);
      if (preloaded) {
        return { story: preloaded, success: true, fromCache: true };
      }
      return { story: null, success: false, fromCache: false, error: data.message || 'Failed to fetch story' };
    }

    const story = data.story;
    
    // Cache the story content
    if (story) {
      await cacheStoryContent(story);
    }

    return { story, success: true, fromCache: false };
  } catch (error) {
    logger.error('getStoryById failed', error, { storyId });
    
    // Try cache as fallback on network error
    const cached = await getCachedStoryContent(storyId);
    if (cached) {
      return { story: cached as LibraryStory, success: true, fromCache: true };
    }
    
    // Try preloaded library
    const preloaded = await getPreloadedStoryById(storyId);
    if (preloaded) {
      return { story: preloaded, success: true, fromCache: true };
    }
    
    return { 
      story: null, 
      success: false, 
      fromCache: false,
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}
