import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';
import { NARRATION_MODE_KEY } from './storageKeys';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Legacy type - kept for backward compatibility */
export type NarrationMode = 'AI' | 'Human';

/** Available AI voice options (ElevenLabs voice IDs) */
export type AIVoiceId = 'Rachel' | 'Adam' | 'Sarah' | 'Dorothy' | 'Josh';

/** Labels for parent-recorded voices */
export type ParentVoiceLabel = 'Mom' | 'Dad' | 'Parent';

/** Full narration settings object */
export type NarrationSettings = {
  /** Which source to prefer: AI voices or parent recordings */
  preferredSource: NarrationMode;
  /** Which AI voice to use when source is AI */
  aiVoiceId: AIVoiceId;
  /** Label for parent recordings (informational display) */
  parentVoiceLabel: ParentVoiceLabel;
  /** ElevenLabs voice ID created by cloning the parent's recorded voice */
  clonedVoiceId?: string;
};

/** AI voice display metadata */
export type AIVoiceOption = {
  id: AIVoiceId;
  name: string;
  emoji: string;
  description: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Available AI voice options for UI selection */
export const AI_VOICE_OPTIONS: AIVoiceOption[] = [
  { id: 'Rachel', name: 'Rachel', emoji: '👩', description: 'Warm storyteller' },
  { id: 'Dorothy', name: 'Dorothy', emoji: '👵', description: 'Gentle grandma' },
  { id: 'Josh', name: 'Josh', emoji: '👦', description: 'Fun & playful' },
  { id: 'Adam', name: 'Adam', emoji: '👨', description: 'Calm narrator' },
  { id: 'Sarah', name: 'Sarah', emoji: '👧', description: 'Bright & cheerful' },
];

/** Default narration settings */
const DEFAULT_SETTINGS: NarrationSettings = {
  preferredSource: 'AI',
  aiVoiceId: 'Rachel',
  parentVoiceLabel: 'Parent',
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the full narration settings
 * Handles migration from legacy string format
 */
export async function getNarrationSettings(): Promise<NarrationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NARRATION_MODE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }
    
    // Handle legacy string format ('AI' or 'Human')
    if (stored === 'AI' || stored === 'Human') {
      return {
        ...DEFAULT_SETTINGS,
        preferredSource: stored,
      };
    }
    
    // Parse JSON format
    const parsed = JSON.parse(stored) as Partial<NarrationSettings>;
    return {
      preferredSource: parsed.preferredSource ?? DEFAULT_SETTINGS.preferredSource,
      aiVoiceId: parsed.aiVoiceId ?? DEFAULT_SETTINGS.aiVoiceId,
      parentVoiceLabel: parsed.parentVoiceLabel ?? DEFAULT_SETTINGS.parentVoiceLabel,
      clonedVoiceId: parsed.clonedVoiceId,
    };
  } catch (error) {
    console.error('getNarrationSettings:', normalizeError(error));
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save full narration settings
 */
export async function saveNarrationSettings(settings: NarrationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NARRATION_MODE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('saveNarrationSettings:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}

/**
 * Get the current narration mode (legacy API - backward compatible)
 * Defaults to 'AI' if not set
 */
export async function getNarrationMode(): Promise<NarrationMode> {
  const settings = await getNarrationSettings();
  return settings.preferredSource;
}

/**
 * Set the narration mode (legacy API - backward compatible)
 */
export async function setNarrationMode(mode: NarrationMode): Promise<void> {
  const settings = await getNarrationSettings();
  await saveNarrationSettings({
    ...settings,
    preferredSource: mode,
  });
}

/**
 * Get the selected AI voice ID
 */
export async function getAIVoiceId(): Promise<AIVoiceId> {
  const settings = await getNarrationSettings();
  return settings.aiVoiceId;
}

/**
 * Set the AI voice ID
 */
export async function setAIVoiceId(voiceId: AIVoiceId): Promise<void> {
  const settings = await getNarrationSettings();
  await saveNarrationSettings({
    ...settings,
    aiVoiceId: voiceId,
  });
}

/**
 * Get the parent voice label
 */
export async function getParentVoiceLabel(): Promise<ParentVoiceLabel> {
  const settings = await getNarrationSettings();
  return settings.parentVoiceLabel;
}

/**
 * Set the parent voice label
 */
export async function setParentVoiceLabel(label: ParentVoiceLabel): Promise<void> {
  const settings = await getNarrationSettings();
  await saveNarrationSettings({
    ...settings,
    parentVoiceLabel: label,
  });
}
