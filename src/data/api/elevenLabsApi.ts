/**
 * ElevenLabs API Adapter
 * Location: src/data/api/elevenLabsApi.ts
 *
 * Pure backend API adapter for ElevenLabs TTS generation.
 * - NO API keys stored in mobile app
 * - All calls go through our backend which holds the ElevenLabs key
 * - Returns raw audio data for local caching
 */

import { TTS_API_BASE_URL } from '../../config/api';
import { normalizeError } from '../../domain/services/errorService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceInfo = {
  id: string;
  name: string;
  description: string;
};

export type VoicesResponse = {
  voices: VoiceInfo[];
  default: string;
  available: boolean;
};

export type GenerateAudioParams = {
  /** Text to convert to speech */
  text: string;
  /** Voice name (default: 'Rachel') */
  voiceName?: string;
  /** Voice stability 0-1 (default: 0.5) */
  stability?: number;
  /** Similarity boost 0-1 (default: 0.75) */
  similarityBoost?: number;
};

export type GenerateAudioResult = {
  success: true;
  /** Audio data as base64 string */
  audioBase64: string;
  /** Content type (audio/mpeg) */
  contentType: string;
};

export type GenerateAudioError = {
  success: false;
  error: string;
  /** If true, caller should fall back to local TTS */
  fallback: boolean;
};

export type GenerateAudioResponse = GenerateAudioResult | GenerateAudioError;

// ─────────────────────────────────────────────────────────────────────────────
// API Endpoints
// ─────────────────────────────────────────────────────────────────────────────

const TTS_ENDPOINT = `${TTS_API_BASE_URL}/api/tts`;

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch available voices from backend
 *
 * @returns List of available voices, default voice, and availability status
 */
export async function getAvailableVoices(): Promise<VoicesResponse> {
  try {
    const response = await fetch(`${TTS_ENDPOINT}/voices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('getAvailableVoices error:', normalizeError(error));
    // Return fallback response
    return {
      voices: [],
      default: 'Rachel',
      available: false,
    };
  }
}

/**
 * Check if ElevenLabs TTS is available (backend has API key configured)
 */
export async function isElevenLabsAvailable(): Promise<boolean> {
  try {
    const response = await getAvailableVoices();
    return response.available;
  } catch {
    return false;
  }
}

/**
 * Generate speech audio from text via backend
 *
 * The backend calls ElevenLabs API with the API key.
 * We receive raw audio data back, never touching the key.
 *
 * @param params - Generation parameters
 * @returns Audio data as base64 or error with fallback flag
 */
export async function generateAudio(
  params: GenerateAudioParams
): Promise<GenerateAudioResponse> {
  try {
    const response = await fetch(`${TTS_ENDPOINT}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        voiceName: params.voiceName ?? 'Rachel',
        stability: params.stability ?? 0.5,
        similarityBoost: params.similarityBoost ?? 0.75,
      }),
    });

    // Check if response is JSON (error) or audio
    const contentType = response.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      // Error response
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Unknown error',
        fallback: errorData.fallback ?? true,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Server error: ${response.status}`,
        fallback: true,
      };
    }

    // Success - convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    return {
      success: true,
      audioBase64: base64,
      contentType: contentType || 'audio/mpeg',
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error),
      fallback: true,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert ArrayBuffer to base64 string
 *
 * Works in React Native environment.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Cloning
// ─────────────────────────────────────────────────────────────────────────────

export type CloneVoiceResult =
  | { success: true; voiceId: string; previewUrl: string | null }
  | { success: false; error: string };

/**
 * Clone a voice from a local audio recording.
 *
 * Sends the parent's recorded audio to the backend, which calls the
 * ElevenLabs voice cloning API. Returns the new voice ID that can be
 * used for TTS generation.
 *
 * @param audioUri - Local file URI of the recording (e.g. from expo-file-system)
 * @param name - Label for the cloned voice (default: 'Parent Voice')
 */
export async function cloneVoice(
  audioUri: string,
  name: string = 'Parent Voice'
): Promise<CloneVoiceResult> {
  try {
    const formData = new FormData();
    formData.append('name', name);
    // React Native accepts { uri, name, type } as a form file part
    formData.append('audio', {
      uri: audioUri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as any);

    const response = await fetch(`${TTS_ENDPOINT}/clone-voice`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — fetch adds it with the correct boundary
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (data as any).error ?? `Server error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      voiceId: data.voiceId,
      previewUrl: data.previewUrl ?? null,
    };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

/**
 * Delete a previously cloned voice from ElevenLabs.
 *
 * @param voiceId - The ElevenLabs voice ID to delete
 */
export async function deleteClonedVoice(
  voiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${TTS_ENDPOINT}/clone-voice/${voiceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (data as any).error ?? `Server error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

/**
 * Validate text length for TTS (ElevenLabs has limits)
 *
 * @param text - Text to validate
 * @returns True if text is within acceptable length
 */
export function isTextLengthValid(text: string): boolean {
  // ElevenLabs free tier limit is ~5000 characters
  // We use a conservative limit for story pages
  const MAX_CHARS = 2500;
  return text.length > 0 && text.length <= MAX_CHARS;
}

/**
 * Estimate audio duration from text (rough estimate)
 *
 * @param text - Text to estimate
 * @returns Estimated duration in milliseconds
 */
export function estimateAudioDuration(text: string): number {
  // Average speaking rate: ~150 words per minute
  // Average word length: ~5 characters
  const words = text.length / 5;
  const minutes = words / 150;
  return Math.round(minutes * 60 * 1000);
}
