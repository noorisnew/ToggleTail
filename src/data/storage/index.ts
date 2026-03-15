/**
 * Data Storage Module
 * 
 * Provides storage services for stories and profiles.
 * 
 * NOTE: storyApprovalService has been moved to src/domain/services/
 * as it contains business logic. Import from there instead:
 *   import { ... } from '../domain/services/storyApprovalService';
 */

// Story storage
export {
    addStory,
    deleteStory, getStories, updateStory, type Difficulty, type Story
} from './storyStorage';

// Storage keys
export {
    EVENT_LOG_KEY, LIBRARY_CACHE_KEY,
    LIBRARY_CACHE_TIMESTAMP_KEY, NARRATION_MODE_KEY, ONBOARDING_KEY, PARENT_RECORDINGS_KEY, PRELOADED_SEEDED_VERSION_KEY, PROFILE_KEY, STORIES_KEY, STORY_CONTENT_CACHE_PREFIX
} from './storageKeys';

