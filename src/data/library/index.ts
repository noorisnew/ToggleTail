/**
 * Story Library Module
 * 
 * Preloaded story content organized by genre.
 * 
 * @example
 * import { getStoriesByGenre, getGenres, getFullStory } from '@/src/data/library';
 * 
 * // Get all genres
 * const genres = getGenres();
 * 
 * // Get stories by genre (paginated)
 * const result = getStoriesByGenre('animals', 1, 20);
 * console.log(result.items, result.hasNextPage);
 * 
 * // Load full story content
 * const story = await getFullStory('animal-001');
 */

export {
    getAllStories, getFullStory, getGenre,
    // Functions
    getGenres, getStoriesByGenre, getStoriesByReadingLevel, getStoryContent, getStoryCountByGenre, getStoryMetadata, getTotalStoryCount, listStoriesByGenre, searchStories, type Genre,
    // Types
    type GenreId, type LibraryStory,
    type ListStoriesByGenreParams,
    type PaginatedResult,
    type ReadingLevel, type StoryContent, type StoryMetadata
} from './storyLibraryService';

// Manifest schema
export {
    KNOWN_LICENSES,
    KNOWN_SOURCES, createEmptyManifest,
    isValidManifest, validateManifest,
    type ManifestStory,
    type StoryAttribution,
    type StoryManifest,
    type ValidationError
} from './manifestSchema';

// Cover image utilities
export {
    getGenrePlaceholderColors, getStoryCoverImage,
    hasCustomCover, type CoverImageSource
} from './coverImages';

