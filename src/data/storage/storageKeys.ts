/**
 * Centralized storage keys for AsyncStorage
 * All keys are versioned to support future migrations
 * 
 * NOTE: Legacy PIN_KEY ('parent_pin_v1') was removed.
 * Parent authentication now uses SecureStore via parentGateService.ts
 */

export const STORIES_KEY = 'stories_v1';
export const NARRATION_MODE_KEY = 'narration_mode_v1';
export const PROFILE_KEY = 'child_profile_v1';
export const EVENT_LOG_KEY = 'event_log_v1';
export const ONBOARDING_KEY = 'onboarding_done_v1';

// Library cache keys
export const LIBRARY_CACHE_KEY = 'library_stories_cache_v1';
export const LIBRARY_CACHE_TIMESTAMP_KEY = 'library_cache_timestamp_v1';
export const STORY_CONTENT_CACHE_PREFIX = 'story_content_v1_';
export const PARENT_RECORDINGS_KEY = 'parent_recordings_v1';

// Preloaded story seeding
export const PRELOADED_SEEDED_VERSION_KEY = 'preloaded_seeded_version_v1';

// Soft-deleted stories
export const DELETED_STORIES_KEY = 'deleted_stories_v1';

// ElevenLabs AI narration cache
export const ELEVENLABS_CACHE_KEY = 'elevenlabs_cache_v1';
