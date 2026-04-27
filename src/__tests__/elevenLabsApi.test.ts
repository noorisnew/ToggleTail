/**
 * Tests for ElevenLabs API Adapter
 */

// Mock the config/api module to avoid react-native import issues
jest.mock('../config/api', () => ({
  API_BASE_URL: 'http://localhost:3001',
  TTS_API_BASE_URL: 'http://localhost:3001',
}));

import {
    cloneVoice,
    deleteClonedVoice,
    estimateAudioDuration,
    generateAudio,
    getAvailableVoices,
    isElevenLabsAvailable,
    isTextLengthValid,
} from '../data/api/elevenLabsApi';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ElevenLabs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableVoices', () => {
    it('should return voices from backend', async () => {
      const mockResponse = {
        voices: [
          { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Rachel', description: 'Warm and friendly' },
          { id: '21m00Tcm4TlvDq8ikWAM', name: 'Adam', description: 'Clear and professional' },
        ],
        default: 'Rachel',
        available: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getAvailableVoices();

      expect(result.voices.length).toBe(2);
      expect(result.default).toBe('Rachel');
      expect(result.available).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts/voices'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return fallback response on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getAvailableVoices();

      expect(result.voices).toEqual([]);
      expect(result.default).toBe('Rachel');
      expect(result.available).toBe(false);
    });

    it('should return fallback response on non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getAvailableVoices();

      expect(result.available).toBe(false);
    });
  });

  describe('isElevenLabsAvailable', () => {
    it('should return true when backend has API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ voices: [], default: 'Rachel', available: true }),
      });

      const result = await isElevenLabsAvailable();

      expect(result).toBe(true);
    });

    it('should return false when backend lacks API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ voices: [], default: 'Rachel', available: false }),
      });

      const result = await isElevenLabsAvailable();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await isElevenLabsAvailable();

      expect(result).toBe(false);
    });
  });

  describe('generateAudio', () => {
    it('should return audio data on success', async () => {
      // Create mock audio buffer
      const mockAudioData = new Uint8Array([0x49, 0x44, 0x33]); // ID3 header
      const mockArrayBuffer = mockAudioData.buffer;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'audio/mpeg' : null),
        },
        arrayBuffer: async () => mockArrayBuffer,
      });

      const result = await generateAudio({ text: 'Hello world' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.audioBase64).toBeDefined();
        expect(result.contentType).toBe('audio/mpeg');
      }
    });

    it('should send correct parameters to backend', async () => {
      const mockArrayBuffer = new ArrayBuffer(3);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'audio/mpeg' : null),
        },
        arrayBuffer: async () => mockArrayBuffer,
      });

      await generateAudio({
        text: 'Test text',
        voiceName: 'Adam',
        stability: 0.7,
        similarityBoost: 0.8,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts/generate'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Test text',
            voiceName: 'Adam',
            stability: 0.7,
            similarityBoost: 0.8,
          }),
        })
      );
    });

    it('should use default values when not specified', async () => {
      const mockArrayBuffer = new ArrayBuffer(3);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'audio/mpeg' : null),
        },
        arrayBuffer: async () => mockArrayBuffer,
      });

      await generateAudio({ text: 'Test' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.voiceName).toBe('Rachel');
      expect(callBody.stability).toBe(0.5);
      expect(callBody.similarityBoost).toBe(0.75);
    });

    it('should return error with fallback flag on JSON error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'application/json' : null),
        },
        json: async () => ({
          error: 'ElevenLabs API key not configured',
          fallback: true,
        }),
      });

      const result = await generateAudio({ text: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('ElevenLabs API key not configured');
        expect(result.fallback).toBe(true);
      }
    });

    it('should return fallback true on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: () => null,
        },
      });

      const result = await generateAudio({ text: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fallback).toBe(true);
      }
    });

    it('should return fallback true on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await generateAudio({ text: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fallback).toBe(true);
      }
    });
  });

  describe('isTextLengthValid', () => {
    it('should return true for valid length text', () => {
      expect(isTextLengthValid('Hello world')).toBe(true);
      expect(isTextLengthValid('A'.repeat(2500))).toBe(true);
    });

    it('should return false for empty text', () => {
      expect(isTextLengthValid('')).toBe(false);
    });

    it('should return false for text exceeding limit', () => {
      expect(isTextLengthValid('A'.repeat(2501))).toBe(false);
    });
  });

  describe('cloneVoice', () => {
    it('returns voiceId and previewUrl on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ voiceId: 'cloned-abc123', previewUrl: 'https://example.com/preview.mp3' }),
      });

      const result = await cloneVoice('file:///recording.m4a', 'Mom');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.voiceId).toBe('cloned-abc123');
        expect(result.previewUrl).toBe('https://example.com/preview.mp3');
      }
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts/clone-voice'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('sends audio uri and name as form data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ voiceId: 'v1', previewUrl: null }),
      });

      await cloneVoice('file:///audio.m4a', 'Dad');

      const [_url, options] = mockFetch.mock.calls[0];
      expect(options.body).toBeInstanceOf(FormData);
    });

    it('returns error on server failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Voice cloning failed' }),
      });

      const result = await cloneVoice('file:///recording.m4a');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Voice cloning failed');
      }
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await cloneVoice('file:///recording.m4a');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Network error');
      }
    });

    it('uses default name when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ voiceId: 'v1', previewUrl: null }),
      });

      await cloneVoice('file:///recording.m4a');

      const [_url, options] = mockFetch.mock.calls[0];
      const formData = options.body as FormData;
      // FormData.get is available in the test environment
      expect((formData as any).get('name')).toBe('Parent Voice');
    });
  });

  describe('deleteClonedVoice', () => {
    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, voiceId: 'abc123' }),
      });

      const result = await deleteClonedVoice('abc123');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts/clone-voice/abc123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('returns error with message on server failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Voice not found' }),
      });

      const result = await deleteClonedVoice('missing-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Voice not found');
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await deleteClonedVoice('abc123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });

    it('includes voiceId in the DELETE URL', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await deleteClonedVoice('my-voice-xyz');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('my-voice-xyz'),
        expect.anything()
      );
    });
  });

  describe('estimateAudioDuration', () => {
    it('should estimate duration based on word count', () => {
      // 150 words × 5 chars = 750 chars → 1 minute → 60000ms
      const text = 'A'.repeat(750);
      const estimate = estimateAudioDuration(text);

      expect(estimate).toBe(60000);
    });

    it('should handle short text', () => {
      const text = 'Hello';
      const estimate = estimateAudioDuration(text);

      // 5 chars ÷ 5 = 1 word, 1/150 minutes = 400ms
      expect(estimate).toBe(400);
    });

    it('should handle empty text', () => {
      const estimate = estimateAudioDuration('');
      expect(estimate).toBe(0);
    });
  });
});
