/**
 * Narration Resolution Service
 * Location: src/domain/services/narrationResolutionService.ts
 *
 * Pure decision logic for determining which narration source to use.
 * No audio APIs, no side effects - just decision functions.
 */

export type NarrationSource = 'parent' | 'tts';

/**
 * Determines which narration source to use based on user preference
 * and recording availability.
 *
 * @param narrationMode - User's preferred narration mode ('AI' for TTS, 'Human' for parent)
 * @param hasParentRecording - Whether a parent recording exists for this page
 * @returns The narration source to use
 *
 * Rules:
 * - If mode is 'Human' AND parent recording exists → use 'parent'
 * - Otherwise → use 'tts'
 */
export function resolveNarrationSource(
  narrationMode: 'AI' | 'Human',
  hasParentRecording: boolean
): NarrationSource {
  if (narrationMode === 'Human' && hasParentRecording) {
    return 'parent';
  }
  return 'tts';
}
