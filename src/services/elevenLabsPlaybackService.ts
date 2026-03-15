/**
 * ElevenLabs Playback Service
 * Location: src/services/elevenLabsPlaybackService.ts
 *
 * Handles ElevenLabs audio: cache lookup, backend fetch, local save, and playback.
 *
 * Flow:
 * 1. Check if audio is cached locally
 * 2. If cached → play from cache
 * 3. If not cached → fetch from backend → save to cache → play
 *
 * This service does NOT handle fallback to local TTS.
 * Fallback logic is handled by higher-level orchestration (storyPlaybackService).
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { generateAudio, isTextLengthValid } from '../data/api/elevenLabsApi';
import {
    DEFAULT_VOICE_ID,
    getCachedAudio,
    isCached,
    saveToCache,
    type ElevenLabsCacheEntry,
} from '../data/storage/elevenLabsCacheStorage';
import { normalizeError } from '../domain/services/errorService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PlaybackSource = 'cache' | 'network';

export type ElevenLabsPlaybackResult = {
  success: true;
  /** Where the audio came from */
  source: PlaybackSource;
  /** Local file URI of the played audio */
  fileUri: string;
};

export type ElevenLabsPlaybackError = {
  success: false;
  /** Error message */
  error: string;
  /** If true, caller should fallback to local TTS */
  shouldFallback: boolean;
};

export type ElevenLabsPlaybackResponse =
  | ElevenLabsPlaybackResult
  | ElevenLabsPlaybackError;

// ─────────────────────────────────────────────────────────────────────────────
// Module State
// ─────────────────────────────────────────────────────────────────────────────

let currentSound: Audio.Sound | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Audio Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configure audio mode for playback
 */
async function configureAudioForPlayback(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Play audio from a local file URI
 */
async function playFromFile(
  fileUri: string,
  onComplete?: () => void,
  onStatusUpdate?: (status: AVPlaybackStatus) => void
): Promise<boolean> {
  try {
    // Stop any existing playback
    await stopElevenLabsPlayback();

    // Configure audio mode
    await configureAudioForPlayback();

    // Load and play
    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true },
      onStatusUpdate
    );
    currentSound = sound;

    // Set up completion callback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (onStatusUpdate) onStatusUpdate(status);
      if (status.isLoaded && status.didJustFinish) {
        onComplete?.();
      }
    });

    return true;
  } catch (error) {
    console.error('playFromFile error:', normalizeError(error));
    return false;
  }
}

/**
 * Fetch audio from backend and save to cache
 */
async function fetchAndCacheAudio(
  storyId: string,
  pageIndex: number,
  pageText: string,
  voiceId: string
): Promise<ElevenLabsCacheEntry | null> {
  // Fetch from backend
  const response = await generateAudio({
    text: pageText,
    voiceName: voiceId,
  });

  if (!response.success) {
    console.error('fetchAndCacheAudio: generateAudio failed:', response.error);
    return null;
  }

  // Save to cache
  const cacheEntry = await saveToCache(
    storyId,
    pageIndex,
    voiceId,
    response.audioBase64
  );

  if (!cacheEntry) {
    console.error('fetchAndCacheAudio: saveToCache failed');
    return null;
  }

  return cacheEntry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if ElevenLabs audio is cached for a story page
 *
 * @param storyId - Story ID
 * @param pageIndex - Page index (0-based)
 * @param voiceId - Voice ID (default: 'Rachel')
 * @returns True if audio is cached locally
 */
export async function isAudioCached(
  storyId: string,
  pageIndex: number,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<boolean> {
  return isCached(storyId, pageIndex, voiceId);
}

/**
 * Play ElevenLabs audio for a story page
 *
 * Flow:
 * 1. Check cache for existing audio
 * 2. If cached → play from cache
 * 3. If not cached → fetch from backend → save → play
 *
 * This function does NOT fallback to local TTS on failure.
 * The caller is responsible for handling fallback.
 *
 * @param storyId - Story ID
 * @param pageIndex - Page index (0-based)
 * @param pageText - Text content to narrate (used if fetching from backend)
 * @param voiceId - Voice ID (default: 'Rachel')
 * @param onComplete - Callback when playback finishes
 * @returns Result indicating success/failure and source (cache/network)
 */
export async function playElevenLabsAudio(
  storyId: string,
  pageIndex: number,
  pageText: string,
  voiceId: string = DEFAULT_VOICE_ID,
  onComplete?: () => void
): Promise<ElevenLabsPlaybackResponse> {
  try {
    // Validate text length
    if (!isTextLengthValid(pageText)) {
      return {
        success: false,
        error: 'Text too long for ElevenLabs generation',
        shouldFallback: true,
      };
    }

    // Step 1: Check cache
    const cachedEntry = await getCachedAudio(storyId, pageIndex, voiceId);

    if (cachedEntry) {
      // Step 2a: Play from cache
      const played = await playFromFile(cachedEntry.fileUri, onComplete);
      if (played) {
        return {
          success: true,
          source: 'cache',
          fileUri: cachedEntry.fileUri,
        };
      }
      // Cache file exists in index but playback failed - try fetching fresh
      console.warn('Cached file playback failed, attempting fresh fetch');
    }

    // Step 2b: Not cached or cache playback failed - fetch from backend
    const newEntry = await fetchAndCacheAudio(
      storyId,
      pageIndex,
      pageText,
      voiceId
    );

    if (!newEntry) {
      return {
        success: false,
        error: 'Failed to fetch or cache audio from backend',
        shouldFallback: true,
      };
    }

    // Step 3: Play the newly cached audio
    const played = await playFromFile(newEntry.fileUri, onComplete);
    if (!played) {
      return {
        success: false,
        error: 'Failed to play audio after caching',
        shouldFallback: true,
      };
    }

    return {
      success: true,
      source: 'network',
      fileUri: newEntry.fileUri,
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error),
      shouldFallback: true,
    };
  }
}

/**
 * Stop current ElevenLabs audio playback
 */
export async function stopElevenLabsPlayback(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch (error) {
    console.error('stopElevenLabsPlayback error:', normalizeError(error));
    currentSound = null;
  }
}

/**
 * Pre-cache audio for a story page (fetch & save, no playback)
 * Fire-and-forget - safe to call and ignore result.
 * Idempotent - multiple calls with same params are safe.
 *
 * Use this to warm the cache for upcoming pages during playback.
 * Does NOT affect current playback state.
 *
 * @param storyId - Story ID
 * @param pageIndex - Page index (0-based)
 * @param pageText - Text content to narrate
 * @param voiceId - Voice ID (default: 'Rachel')
 */
export async function precacheAudio(
  storyId: string,
  pageIndex: number,
  pageText: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<void> {
  try {
    // Skip if already cached
    if (await isCached(storyId, pageIndex, voiceId)) {
      return;
    }

    // Skip if text is too long
    if (!isTextLengthValid(pageText)) {
      return;
    }

    // Fetch and cache (no playback)
    await fetchAndCacheAudio(storyId, pageIndex, pageText, voiceId);
  } catch (error) {
    // Log for debugging but don't throw - this is fire-and-forget
    console.log('precacheAudio: background cache failed (ignored):', normalizeError(error));
  }
}

/**
 * Get current playback status
 * Returns null if no audio is loaded
 */
export async function getPlaybackStatus(): Promise<AVPlaybackStatus | null> {
  try {
    if (!currentSound) {
      return null;
    }
    return await currentSound.getStatusAsync();
  } catch (error) {
    console.error('getPlaybackStatus error:', normalizeError(error));
    return null;
  }
}

/**
 * Pause current playback
 */
export async function pausePlayback(): Promise<boolean> {
  try {
    if (!currentSound) {
      return false;
    }
    await currentSound.pauseAsync();
    return true;
  } catch (error) {
    console.error('pausePlayback error:', normalizeError(error));
    return false;
  }
}

/**
 * Resume paused playback
 */
export async function resumePlayback(): Promise<boolean> {
  try {
    if (!currentSound) {
      return false;
    }
    await currentSound.playAsync();
    return true;
  } catch (error) {
    console.error('resumePlayback error:', normalizeError(error));
    return false;
  }
}
