import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { normalizeError } from '../../domain/services/errorService';
import { PARENT_RECORDINGS_KEY } from './storageKeys';

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
  recordings: NarrationRecording[];
  isComplete: boolean;
  pageCount: number;
};

type RecordingsIndex = {
  [storyId: string]: StoryRecordings;
};

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
    return index[storyId] || null;
  } catch (error) {
    console.error('getStoryRecordings error:', normalizeError(error));
    return null;
  }
}

/**
 * Get recording for a specific page of a story
 */
export async function getPageRecording(
  storyId: string,
  pageIndex: number
): Promise<NarrationRecording | null> {
  try {
    const storyRecordings = await getStoryRecordings(storyId);
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
  durationMs: number
): Promise<NarrationRecording> {
  try {
    const index = await getRecordingsIndex();
    
    // Initialize story recordings if not exists
    if (!index[storyId]) {
      index[storyId] = {
        storyId,
        storyTitle,
        recordings: [],
        isComplete: false,
        pageCount,
      };
    }
    
    // Remove existing recording for this page if any
    const existingIndex = index[storyId].recordings.findIndex(r => r.pageIndex === pageIndex);
    if (existingIndex >= 0) {
      // Delete old file
      const oldRecording = index[storyId].recordings[existingIndex];
      try {
        await FileSystem.deleteAsync(oldRecording.fileUri, { idempotent: true });
      } catch (e) {
        // Ignore file deletion errors
      }
      index[storyId].recordings.splice(existingIndex, 1);
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
    index[storyId].recordings.push(recording);
    
    // Sort by page index
    index[storyId].recordings.sort((a, b) => a.pageIndex - b.pageIndex);
    
    // Check if all pages are recorded
    index[storyId].isComplete = index[storyId].recordings.length >= pageCount;
    index[storyId].pageCount = pageCount;
    
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
export async function deletePageRecording(storyId: string, pageIndex: number): Promise<boolean> {
  try {
    const index = await getRecordingsIndex();
    if (!index[storyId]) return false;
    
    const recordingIndex = index[storyId].recordings.findIndex(r => r.pageIndex === pageIndex);
    if (recordingIndex < 0) return false;
    
    // Delete file
    const recording = index[storyId].recordings[recordingIndex];
    try {
      await FileSystem.deleteAsync(recording.fileUri, { idempotent: true });
    } catch (e) {
      // Ignore file deletion errors
    }
    
    // Remove from index
    index[storyId].recordings.splice(recordingIndex, 1);
    index[storyId].isComplete = false;
    
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
    if (!index[storyId]) return true;
    
    // Delete all recording files
    for (const recording of index[storyId].recordings) {
      try {
        await FileSystem.deleteAsync(recording.fileUri, { idempotent: true });
      } catch (e) {
        // Ignore file deletion errors
      }
    }
    
    // Remove from index
    delete index[storyId];
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
    return Object.values(index);
  } catch (error) {
    console.error('getAllStoriesWithRecordings error:', normalizeError(error));
    return [];
  }
}
