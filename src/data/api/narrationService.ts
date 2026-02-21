import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { normalizeError } from '../../domain/services/errorService';
import {
    deletePageRecording,
    getPageRecording,
    NarrationRecording,
    savePageRecording,
} from '../storage/narrationRecordingStorage';

// Recording quality settings
const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

let currentRecording: Audio.Recording | null = null;
let currentSound: Audio.Sound | null = null;

/**
 * Request microphone permissions
 */
export async function requestRecordingPermissions(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('requestRecordingPermissions error:', normalizeError(error));
    return false;
  }
}

/**
 * Configure audio mode for recording
 */
async function configureAudioForRecording(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

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

/**
 * Start recording audio
 */
export async function startRecording(): Promise<boolean> {
  try {
    // Stop any existing recording
    if (currentRecording) {
      await stopRecording();
    }
    
    // Request permissions if needed
    const hasPermission = await requestRecordingPermissions();
    if (!hasPermission) {
      console.error('Recording permission denied');
      return false;
    }
    
    // Configure audio mode
    await configureAudioForRecording();
    
    // Start recording
    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
    currentRecording = recording;
    
    return true;
  } catch (error) {
    console.error('startRecording error:', normalizeError(error));
    return false;
  }
}

/**
 * Stop recording and get the file URI
 */
export async function stopRecording(): Promise<{ uri: string; durationMs: number } | null> {
  try {
    if (!currentRecording) {
      return null;
    }
    
    // Get recording status for duration
    const status = await currentRecording.getStatusAsync();
    const durationMs = status.durationMillis || 0;
    
    // Stop recording
    await currentRecording.stopAndUnloadAsync();
    
    // Get the URI
    const uri = currentRecording.getURI();
    currentRecording = null;
    
    // Configure for playback
    await configureAudioForPlayback();
    
    if (!uri) {
      return null;
    }
    
    return { uri, durationMs };
  } catch (error) {
    console.error('stopRecording error:', normalizeError(error));
    currentRecording = null;
    return null;
  }
}

/**
 * Cancel and discard current recording
 */
export async function cancelRecording(): Promise<void> {
  try {
    if (currentRecording) {
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      currentRecording = null;
      
      // Delete the file
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
      
      // Configure for playback
      await configureAudioForPlayback();
    }
  } catch (error) {
    console.error('cancelRecording error:', normalizeError(error));
    currentRecording = null;
  }
}

/**
 * Save a recording to permanent storage
 */
export async function saveRecording(
  storyId: string,
  storyTitle: string,
  pageIndex: number,
  pageCount: number,
  tempUri: string,
  durationMs: number
): Promise<NarrationRecording | null> {
  try {
    // Create a permanent directory for recordings
    const recordingsDir = `${FileSystem.documentDirectory}narrations/`;
    await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
    
    // Generate permanent file path
    const fileName = `${storyId}_page${pageIndex}_${Date.now()}.m4a`;
    const permanentUri = `${recordingsDir}${fileName}`;
    
    // Copy to permanent location
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri,
    });
    
    // Delete temp file
    await FileSystem.deleteAsync(tempUri, { idempotent: true });
    
    // Save to storage
    const recording = await savePageRecording(
      storyId,
      storyTitle,
      pageIndex,
      pageCount,
      permanentUri,
      durationMs
    );
    
    return recording;
  } catch (error) {
    console.error('saveRecording error:', normalizeError(error));
    return null;
  }
}

/**
 * Play a recorded narration
 */
export async function playRecording(
  uri: string,
  onComplete?: () => void,
  onStatusUpdate?: (status: AVPlaybackStatus) => void
): Promise<boolean> {
  try {
    // Stop any existing sound
    await stopPlayback();
    
    // Configure for playback
    await configureAudioForPlayback();
    
    // Load the sound
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      onStatusUpdate
    );
    currentSound = sound;
    
    // Set up completion callback
    if (onComplete) {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (onStatusUpdate) onStatusUpdate(status);
        if (status.isLoaded && status.didJustFinish) {
          onComplete();
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('playRecording error:', normalizeError(error));
    return false;
  }
}

/**
 * Play a page recording
 */
export async function playPageRecording(
  storyId: string,
  pageIndex: number,
  onComplete?: () => void,
  onStatusUpdate?: (status: AVPlaybackStatus) => void
): Promise<boolean> {
  try {
    const recording = await getPageRecording(storyId, pageIndex);
    if (!recording) {
      console.log('No recording found for page', pageIndex);
      return false;
    }
    
    return await playRecording(recording.fileUri, onComplete, onStatusUpdate);
  } catch (error) {
    console.error('playPageRecording error:', normalizeError(error));
    return false;
  }
}

/**
 * Stop current playback
 */
export async function stopPlayback(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch (error) {
    console.error('stopPlayback error:', normalizeError(error));
    currentSound = null;
  }
}

/**
 * Pause current playback
 */
export async function pausePlayback(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.pauseAsync();
    }
  } catch (error) {
    console.error('pausePlayback error:', normalizeError(error));
  }
}

/**
 * Resume current playback
 */
export async function resumePlayback(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.playAsync();
    }
  } catch (error) {
    console.error('resumePlayback error:', normalizeError(error));
  }
}

/**
 * Check if recording is in progress
 */
export function isRecordingActive(): boolean {
  return currentRecording !== null;
}

/**
 * Check if playback is active
 */
export function isPlaybackActive(): boolean {
  return currentSound !== null;
}

/**
 * Delete a page recording
 */
export async function deleteRecording(storyId: string, pageIndex: number): Promise<boolean> {
  return await deletePageRecording(storyId, pageIndex);
}

/**
 * Format duration in mm:ss
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
