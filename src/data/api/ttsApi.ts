import { API_BASE_URL } from '../../config/api';

export type Voice = {
  id: string;
  name: string;
  description: string;
};

/**
 * Get available AI voices
 */
export async function getAvailableVoices(): Promise<{
  voices: Voice[];
  defaultVoice: string;
  available: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tts/voices`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return {
      voices: data.voices || [],
      defaultVoice: data.default || 'Rachel',
      available: data.available ?? false,
    };
  } catch (error) {
    console.error('getAvailableVoices error:', error);
    return {
      voices: getDefaultVoices(),
      defaultVoice: 'Rachel',
      available: false,
    };
  }
}

/**
 * Generate speech audio from text
 * Returns audio URL or null if fallback to device TTS needed
 */
export async function generateSpeech(
  text: string,
  voiceName: string = 'Rachel'
): Promise<{
  audioUrl: string | null;
  fallback: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName }),
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        audioUrl: null,
        fallback: data.fallback ?? true,
        error: data.error,
      };
    }

    // Convert response to blob and create URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      audioUrl,
      fallback: false,
    };
  } catch (error) {
    console.error('generateSpeech error:', error);
    return {
      audioUrl: null,
      fallback: true,
      error: 'Network error',
    };
  }
}

/**
 * Default voices when API unavailable
 */
function getDefaultVoices(): Voice[] {
  return [
    { id: 'device', name: 'Device Voice', description: 'Use your device\'s built-in voice' },
  ];
}
