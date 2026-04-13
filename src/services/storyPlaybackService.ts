/**
 * Story Playback Service
 * Location: src/services/storyPlaybackService.ts
 *
 * Orchestrates story audio playback across multiple sources:
 * - Parent recordings (via narrationService)
 * - ElevenLabs AI narration (via elevenLabsPlaybackService)
 * - Local TTS fallback (via expo-speech)
 *
 * This is a service layer file because it interacts with audio APIs,
 * not pure business logic.
 *
 * Playback priority for AI mode:
 * 1. ElevenLabs (cached or network)
 * 2. Local TTS fallback if ElevenLabs fails
 */

import * as Speech from 'expo-speech';
import { resolveNarrationSource } from '../domain/services/narrationResolutionService';
import {
    playElevenLabsAudio,
    stopElevenLabsPlayback,
} from './elevenLabsPlaybackService';
import { playPageRecording, stopPlayback as stopNarrationPlayback } from './narrationService';

// ============================================================================
// Types
// ============================================================================

/**
 * Source of the narration that was ultimately played
 */
export type NarrationSource = 'parent' | 'elevenlabs' | 'tts';

export interface TTSConfig {
  rate: number;
  pitch: number;
  language: string;
  voiceIdentifier?: string;
}

export interface PlaybackCallbacks {
  /** Called when parent recording playback begins */
  onParentStart?: () => void;
  /** Called when parent recording completes successfully */
  onParentComplete?: () => void;
  /** Called when parent recording fails (before TTS fallback) */
  onParentFailed?: () => void;
  /** Called when ElevenLabs playback starts (optional) */
  onElevenLabsStart?: () => void;
  /** Called when ElevenLabs fails and falling back to local TTS (optional) */
  onElevenLabsFallback?: () => void;
  /** Called when AI narration (ElevenLabs or TTS) finishes normally */
  onTTSComplete?: () => void;
  /** Called when TTS is stopped externally */
  onTTSStopped?: () => void;
  /** Called on TTS error */
  onTTSError?: () => void;
}

export interface PlaybackResult {
  source: NarrationSource;
}

// ============================================================================
// stopAllPlayback
// ============================================================================

/**
 * Stops all audio playback sources.
 * Combines stopping TTS, ElevenLabs, and any playing parent recording.
 *
 * NOTE: Does NOT reset React state - that must be done by the caller.
 * This function only handles audio API cleanup.
 */
export function stopAllPlayback(): void {
  // Stop TTS
  Speech.stop();

  // Stop ElevenLabs playback
  stopElevenLabsPlayback().catch((error) => {
    console.log('stopAllPlayback: ElevenLabs stop error (ignored):', error);
  });

  // Stop any playing parent recording
  stopNarrationPlayback().catch((error) => {
    console.log('stopAllPlayback: narration stop error (ignored):', error);
  });
}

// ============================================================================
// playStoryPage
// ============================================================================

/**
 * Prepares text for TTS by adding natural pauses at punctuation.
 */
function prepareTTSText(text: string): string {
  return text
    .replace(/\. /g, '.\n')
    .replace(/! /g, '!\n')
    .replace(/\? /g, '?\n');
}

/**
 * Plays TTS for given text with the provided config and callbacks.
 * Internal helper - callbacks are invoked directly, no state management.
 */
function playTTS(text: string, config: TTSConfig, callbacks: PlaybackCallbacks): void {
  const preparedText = prepareTTSText(text);

  Speech.speak(preparedText, {
    rate: config.rate,
    pitch: config.pitch,
    language: config.language,
    voice: config.voiceIdentifier,
    onDone: () => callbacks.onTTSComplete?.(),
    onStopped: () => callbacks.onTTSStopped?.(),
    onError: () => callbacks.onTTSError?.(),
  });
}

/**
 * Attempts ElevenLabs playback with TTS fallback.
 * Internal helper for AI narration mode.
 *
 * @returns PlaybackResult with 'elevenlabs' or 'tts' source
 */
async function playAINarration(
  storyId: string,
  pageIndex: number,
  pageText: string,
  ttsConfig: TTSConfig,
  callbacks: PlaybackCallbacks,
  voiceId?: string
): Promise<PlaybackResult> {
  // Try ElevenLabs first (using selected voice or default)
  const result = await playElevenLabsAudio(
    storyId,
    pageIndex,
    pageText,
    voiceId, // pass through voice selection
    () => callbacks.onTTSComplete?.() // fires when playback completes
  );

  if (result.success) {
    callbacks.onElevenLabsStart?.();
    return { source: 'elevenlabs' };
  }

  // ElevenLabs failed - check if we should fallback
  if (result.shouldFallback) {
    callbacks.onElevenLabsFallback?.();
    playTTS(pageText, ttsConfig, callbacks);
    return { source: 'tts' };
  }

  // Unexpected failure - fallback anyway
  callbacks.onElevenLabsFallback?.();
  playTTS(pageText, ttsConfig, callbacks);
  return { source: 'tts' };
}

/**
 * Orchestrates story page audio playback.
 *
 * Resolves narration source (parent vs AI) and handles playback with
 * automatic fallback chain:
 * - Parent mode: parent recording → local TTS
 * - AI mode: ElevenLabs → local TTS
 *
 * NOTE: Does NOT manage React state. The caller is responsible for:
 * - Setting isSpeaking/isPlayingParentAudio state
 * - Managing auto-advance timeouts
 * - Handling UI animations
 *
 * The service only orchestrates audio APIs and fires callbacks at the
 * appropriate moments.
 *
 * @param storyId - ID of the story being played
 * @param pageIndex - Zero-based page index
 * @param pageText - Text content of the page (for TTS/ElevenLabs)
 * @param narrationMode - User preference: 'AI' (ElevenLabs/TTS) or 'Human' (parent recording)
 * @param hasParentRecording - Whether a parent recording exists for this page
 * @param ttsConfig - Configuration for TTS voice
 * @param callbacks - Callbacks for playback lifecycle events
 * @param voiceId - Optional AI voice ID for ElevenLabs (default: 'Rachel')
 * @param clonedVoiceId - Optional ElevenLabs voice ID cloned from parent's own recording
 * @returns The narration source that was ultimately used
 */
export async function playStoryPage(
  storyId: string,
  pageIndex: number,
  pageText: string,
  narrationMode: 'AI' | 'Human',
  hasParentRecording: boolean,
  ttsConfig: TTSConfig,
  callbacks: PlaybackCallbacks,
  voiceId?: string,
  clonedVoiceId?: string
): Promise<PlaybackResult> {
  // Resolve which source to use
  const source = resolveNarrationSource(narrationMode, hasParentRecording);

  if (source === 'parent') {
    // Attempt parent recording playback
    callbacks.onParentStart?.();

    const success = await playPageRecording(storyId, pageIndex, () => {
      callbacks.onParentComplete?.();
    });

    if (success) {
      return { source: 'parent' };
    }

    // Parent recording failed - fallback to AI narration
    // Prefer cloned voice (sounds like the parent) over the generic AI voice
    callbacks.onParentFailed?.();
    return playAINarration(storyId, pageIndex, pageText, ttsConfig, callbacks, clonedVoiceId ?? voiceId);
  }

  // AI narration or Human mode without a recording for this page.
  // In Human mode, prefer the cloned voice if the parent has created one.
  const effectiveVoiceId =
    narrationMode === 'Human' && clonedVoiceId ? clonedVoiceId : voiceId;
  return playAINarration(storyId, pageIndex, pageText, ttsConfig, callbacks, effectiveVoiceId);
}
