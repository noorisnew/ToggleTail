import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { normalizeError } from '../../domain/services/errorService';
import type { ParentVoiceLabel } from './narrationStorage';
import { PARENT_RECORDINGS_KEY } from './storageKeys';

export type NarratorSlot = ParentVoiceLabel;

const DEFAULT_NARRATOR_SLOT: NarratorSlot = 'Parent';
const NARRATOR_SORT_ORDER: NarratorSlot[] = ['Mom', 'Dad', 'Parent'];

export type NarrationRecording = {
  id: string;
  storyId: string;
  pageIndex: number;
  fileUri: string;
  durationMs: number;
  createdAt: string;
};

export type StoryRecordings = {
  storyId: string;
  storyTitle: string;
  narratorSlot: NarratorSlot;
  recordings: NarrationRecording[];
  isComplete: boolean;
  isFinalized?: boolean;
  finalizedAt?: string;
  pageCount: number;
};

type RecordingsIndex = {
  [storyId: string]: StoryRecordings;
};

function getRecordingKey(storyId: string, narratorSlot: NarratorSlot = DEFAULT_NARRATOR_SLOT): string {
  return `${storyId}::${narratorSlot}`;
}

function normalizeStoryRecordings(
  storyId: string,
  storyRecordings: StoryRecordings,
  narratorSlot: NarratorSlot = DEFAULT_NARRATOR_SLOT
): StoryRecordings {
  return {
    ...storyRecordings,
    storyId,
    narratorSlot: storyRecordings.narratorSlot ?? narratorSlot,
    isFinalized: storyRecordings.isFinalized ?? false,
  };
}

function getLegacyOrSlotRecordings(
  index: RecordingsIndex,
  storyId: string,
  narratorSlot: NarratorSlot = DEFAULT_NARRATOR_SLOT
): StoryRecordings | null {
  const slotKey = getRecordingKey(storyId, narratorSlot);
  if (index[slotKey]) {
    return normalizeStoryRecordings(storyId, index[slotKey], narratorSlot);
  }

  if (narratorSlot === DEFAULT_NARRATOR_SLOT && index[storyId]) {
    return normalizeStoryRecordings(storyId, index[storyId], DEFAULT_NARRATOR_SLOT);
  }

  return null;
}

/**
 * Get all recordings index
 */
export async function getRecordingsIndex(): Promise<RecordingsIndex> {
  try {
    const json = await AsyncStorage.getItem(PARENT_RECORDINGS_KEY);
    if (!json) return {};
    return JSON.parse(json) as RecordingsIndex;
  } catch (error) {
    console.error('getRecordingsIndex error:', normalizeError(error));
    return {};
  }
}

/**
 * Save recordings index
 */
async function saveRecordingsIndex(index: RecordingsIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(PARENT_RECORDINGS_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('saveRecordingsIndex error:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}

/**
 * Get recordings for a specific story
 */
export async function getStoryRecordings(storyId: string): Promise<StoryRecordings | null> {
  try {
    const index = await getRecordingsIndex();
    return getLegacyOrSlotRecordings(index, storyId);
  } catch (error) {
    console.error('getStoryRecordings error:', normalizeError(error));
    return null;
  }
}

export async function getStoryRecordingsForNarrator(
  storyId: string,
  narratorSlot: NarratorSlot
): Promise<StoryRecordings | null> {
  try {
    const index = await getRecordingsIndex();
    return getLegacyOrSlotRecordings(index, storyId, narratorSlot);
  } catch (error) {
    console.error('getStoryRecordingsForNarrator error:', normalizeError(error));
    return null;
  }
}

export async function getAvailableStoryNarrators(storyId: string): Promise<StoryRecordings[]> {
  try {
    const index = await getRecordingsIndex();
    const legacyEntry = index[storyId]
      ? [normalizeStoryRecordings(storyId, index[storyId], DEFAULT_NARRATOR_SLOT)]
      : [];
    const slotEntries = Object.entries(index)
      .filter(([key, value]) => key.startsWith(`${storyId}::`) && value.storyId === storyId)
      .map(([, value]) => normalizeStoryRecordings(storyId, value, value.narratorSlot ?? DEFAULT_NARRATOR_SLOT));

    return [...legacyEntry, ...slotEntries]
      .filter(recording => recording.isFinalized)
      .sort((left, right) => {
        return NARRATOR_SORT_ORDER.indexOf(left.narratorSlot) - NARRATOR_SORT_ORDER.indexOf(right.narratorSlot);
      });
  } catch (error) {
    console.error('getAvailableStoryNarrators error:', normalizeError(error));
    return [];
  }
}

/**
 * Get recording for a specific page of a story
 */
export async function getPageRecording(
  storyId: string,
  pageIndex: number,
  narratorSlot: NarratorSlot = DEFAULT_NARRATOR_SLOT
): Promise<NarrationRecording | null> {
  try {
    const storyRecordings = await getStoryRecordingsForNarrator(storyId, narratorSlot);
    if (!storyRecordings) return null;
    return storyRecordings.recordings.find(r => r.pageIndex === pageIndex) || null;
  } catch (error) {
    console.error('getPageRecording error:', normalizeError(error));
    return null;
  }
}

/**
 * Save a page recording
 */
export async function savePageRecording(
  storyId: string,
  storyTitle: string,
  pageIndex: number,
  pageCount: number,
  fileUri: string,
  durationMs: number,
  narratorSlot: NarratorSlot = DEFAULT_NARRATOR_SLOT
): Promise<NarrationRecording> {
  try {
    const index = await getRecordingsIndex();
    const recordingKey = getRecordingKey(storyId, narratorSlot);
    
    // Initialize story recordings if not exists
    if (!index[recordingKey]) {
      index[recordingKey] = {
        storyId,
        storyTitle,
        narratorSlot,
        recordings: [],
        isComplete: false,
        isFinalized: false,
        pageCount,
      };
    }
    
    // Remove existing recording for this page if any
    const existingIndex = index[recordingKey].recordings.findIndex(r => r.pageIndex === pageIndex);
    if (existingIndex >= 0) {
      // Delete old file
      const oldRecording = index[recordingKey].recordings[existingIndex];
      try {
        await FileSystem.deleteAsync(oldRecording.fileUri, { idempotent: true });
      } catch (e) {
        // Ignore file deletion errors
      }
      index[recordingKey].recordings.splice(existingIndex, 1);
    }
    
    // Create new recording entry
    const recording: NarrationRecording = {
      id: `${storyId}_page${pageIndex}_${Date.now()}`,
      storyId,
      pageIndex,
      fileUri,
      durationMs,
      createdAt: new Date().toISOString(),
    };
    
    // Add to recordings array
    index[recordingKey].recordings.push(recording);
    
    // Sort by page index
    index[recordingKey].recordings.sort((a, b) => a.pageIndex - b.pageIndex);
    
    // Check if all pages are recorded
    index[recordingKey].isComplete = index[recordingKey].recordings.length >= pageCount;
    if (!index[recordingKey].isComplete) {
      index[recordingKey].isFinalized = false;
      index[recordingKey].finalizedAt = undefined;
    }
    index[recordingKey].pageCount = pageCount;
    
    // Save index
    await saveRecordingsIndex(index);
    
    return recording;
  } catch (error) {
    console.error('savePageRecording error:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}

/**
 * Delete a page recording
 */
export async function deletePageRecording(
  storyId: string,
  pageIndex: number,
  narratorSlot: NarratorSlot = DEFAULT_NARRATOR_SLOT
): Promise<boolean> {
  try {
    const index = await getRecordingsIndex();
    const recordingKey = getRecordingKey(storyId, narratorSlot);
    if (!index[recordingKey]) return false;
    
    const recordingIndex = index[recordingKey].recordings.findIndex(r => r.pageIndex === pageIndex);
    if (recordingIndex < 0) return false;
    
    // Delete file
    const recording = index[recordingKey].recordings[recordingIndex];
    try {
      await FileSystem.deleteAsync(recording.fileUri, { idempotent: true });
    } catch (e) {
      // Ignore file deletion errors
    }
    
    // Remove from index
    index[recordingKey].recordings.splice(recordingIndex, 1);
    index[recordingKey].isComplete = false;
    index[recordingKey].isFinalized = false;
    index[recordingKey].finalizedAt = undefined;
    
    await saveRecordingsIndex(index);
    return true;
  } catch (error) {
    console.error('deletePageRecording error:', normalizeError(error));
    return false;
  }
}

/**
 * Delete all recordings for a story
 */
export async function deleteStoryRecordings(storyId: string): Promise<boolean> {
  try {
    const index = await getRecordingsIndex();
    const matchingKeys = Object.keys(index).filter(key => key === storyId || key.startsWith(`${storyId}::`));
    if (matchingKeys.length === 0) return true;

    for (const key of matchingKeys) {
      for (const recording of index[key].recordings) {
        try {
          await FileSystem.deleteAsync(recording.fileUri, { idempotent: true });
        } catch (e) {
          // Ignore file deletion errors
        }
      }
      delete index[key];
    }

    await saveRecordingsIndex(index);
    return true;
  } catch (error) {
    console.error('deleteStoryRecordings error:', normalizeError(error));
    return false;
  }
}

/**
 * Get all stories with recordings
 */
export async function getAllStoriesWithRecordings(): Promise<StoryRecordings[]> {
  try {
    const index = await getRecordingsIndex();
    return Object.entries(index).map(([key, value]) => {
      const storyId = value.storyId || key.split('::')[0];
      return normalizeStoryRecordings(storyId, value, value.narratorSlot ?? DEFAULT_NARRATOR_SLOT);
    });
  } catch (error) {
    console.error('getAllStoriesWithRecordings error:', normalizeError(error));
    return [];
  }
}

/**
 * Finalize a story recording once all pages have been saved.
 * This provides an explicit end-of-flow checkpoint for the narration UI.
 */
export async function finalizeStoryRecording(
  storyId: string,
  narratorSlot: NarratorSlot = DEFAULT_NARRATOR_SLOT
): Promise<StoryRecordings | null> {
  try {
    const index = await getRecordingsIndex();
    const recordingKey = getRecordingKey(storyId, narratorSlot);
    const storyRecordings = index[recordingKey] ?? (narratorSlot === DEFAULT_NARRATOR_SLOT ? index[storyId] : undefined);
    if (!storyRecordings) {
      return null;
    }

    const hasAllPages = storyRecordings.recordings.length >= storyRecordings.pageCount;
    if (!hasAllPages) {
      return null;
    }

    storyRecordings.isComplete = true;
    storyRecordings.isFinalized = true;
    storyRecordings.finalizedAt = new Date().toISOString();
    await saveRecordingsIndex(index);
    return normalizeStoryRecordings(storyId, storyRecordings, narratorSlot);
  } catch (error) {
    console.error('finalizeStoryRecording error:', normalizeError(error));
    return null;
  }
}
