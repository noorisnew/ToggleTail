/**
 * Tests for storyPlaybackService
 *
 * Tests playStoryPage() orchestration with mocked audio APIs.
 * Verifies callback order and parent→ElevenLabs→TTS fallback behavior.
 */

import * as Speech from 'expo-speech';
import {
    playElevenLabsAudio,
    stopElevenLabsPlayback,
} from '../services/elevenLabsPlaybackService';
import { playPageRecording, stopPlayback as stopNarrationPlayback } from '../services/narrationService';
import {
    PlaybackCallbacks,
    playStoryPage,
    stopAllPlayback,
    TTSConfig,
} from '../services/storyPlaybackService';

// Mock narrationService
jest.mock('../services/narrationService', () => ({
  playPageRecording: jest.fn(),
  stopPlayback: jest.fn(),
}));

// Mock elevenLabsPlaybackService
jest.mock('../services/elevenLabsPlaybackService', () => ({
  playElevenLabsAudio: jest.fn(),
  stopElevenLabsPlayback: jest.fn(),
}));

// Mock expo-speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

const mockPlayPageRecording = playPageRecording as jest.MockedFunction<typeof playPageRecording>;
const mockStopNarrationPlayback = stopNarrationPlayback as jest.MockedFunction<typeof stopNarrationPlayback>;
const mockPlayElevenLabsAudio = playElevenLabsAudio as jest.MockedFunction<typeof playElevenLabsAudio>;
const mockStopElevenLabsPlayback = stopElevenLabsPlayback as jest.MockedFunction<typeof stopElevenLabsPlayback>;
const mockSpeech = Speech as jest.Mocked<typeof Speech>;

describe('storyPlaybackService', () => {
  const defaultTTSConfig: TTSConfig = {
    rate: 0.78,
    pitch: 1.0,
    language: 'en-US',
    voiceIdentifier: 'test-voice',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStopNarrationPlayback.mockResolvedValue();
    mockStopElevenLabsPlayback.mockResolvedValue();
    // Default: ElevenLabs succeeds
    mockPlayElevenLabsAudio.mockResolvedValue({
      success: true,
      source: 'cache',
      fileUri: 'file:///test.mp3',
    });
  });

  describe('stopAllPlayback', () => {
    it('stops TTS, ElevenLabs, and narration playback', () => {
      stopAllPlayback();

      expect(mockSpeech.stop).toHaveBeenCalled();
      expect(mockStopElevenLabsPlayback).toHaveBeenCalled();
      expect(mockStopNarrationPlayback).toHaveBeenCalled();
    });

    it('ignores narration stop errors', async () => {
      mockStopNarrationPlayback.mockRejectedValue(new Error('Stop failed'));

      // Should not throw
      expect(() => stopAllPlayback()).not.toThrow();
    });

    it('ignores ElevenLabs stop errors', async () => {
      mockStopElevenLabsPlayback.mockRejectedValue(new Error('Stop failed'));

      // Should not throw
      expect(() => stopAllPlayback()).not.toThrow();
    });
  });

  describe('playStoryPage', () => {
    describe('when narrationMode is AI', () => {
      describe('ElevenLabs success', () => {
        beforeEach(() => {
          mockPlayElevenLabsAudio.mockResolvedValue({
            success: true,
            source: 'cache',
            fileUri: 'file:///test.mp3',
          });
        });

        it('uses ElevenLabs regardless of hasParentRecording', async () => {
          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(),
            onElevenLabsStart: jest.fn(),
            onTTSComplete: jest.fn(),
          };

          const result = await playStoryPage(
            'story-1',
            0,
            'Hello world.',
            'AI',
            true, // has parent recording, but mode is AI
            defaultTTSConfig,
            callbacks
          );

          expect(result.source).toBe('elevenlabs');
          expect(callbacks.onParentStart).not.toHaveBeenCalled();
          expect(callbacks.onElevenLabsStart).toHaveBeenCalled();
          expect(mockPlayPageRecording).not.toHaveBeenCalled();
          expect(mockPlayElevenLabsAudio).toHaveBeenCalled();
          expect(mockSpeech.speak).not.toHaveBeenCalled();
        });

        it('calls onElevenLabsStart callback on success', async () => {
          const onElevenLabsStart = jest.fn();

          await playStoryPage(
            'story-1',
            0,
            'Test.',
            'AI',
            false,
            defaultTTSConfig,
            { onElevenLabsStart }
          );

          expect(onElevenLabsStart).toHaveBeenCalled();
        });

        it('fires onTTSComplete when ElevenLabs playback finishes', async () => {
          const onTTSComplete = jest.fn();

          mockPlayElevenLabsAudio.mockImplementation(async (_storyId, _pageIndex, _text, _voiceId, onComplete) => {
            // Simulate immediate completion
            onComplete?.();
            return { success: true, source: 'cache' as const, fileUri: 'file:///test.mp3' };
          });

          await playStoryPage(
            'story-1',
            0,
            'Test.',
            'AI',
            false,
            defaultTTSConfig,
            { onTTSComplete }
          );

          expect(onTTSComplete).toHaveBeenCalled();
        });
      });

      describe('ElevenLabs fallback to TTS', () => {
        beforeEach(() => {
          mockPlayElevenLabsAudio.mockResolvedValue({
            success: false,
            shouldFallback: true,
            error: 'Network error',
          });
        });

        it('falls back to TTS when ElevenLabs fails', async () => {
          const callbacks: PlaybackCallbacks = {
            onElevenLabsStart: jest.fn(),
            onElevenLabsFallback: jest.fn(),
          };

          const result = await playStoryPage(
            'story-1',
            0,
            'Hello world.',
            'AI',
            false,
            defaultTTSConfig,
            callbacks
          );

          expect(result.source).toBe('tts');
          expect(callbacks.onElevenLabsStart).not.toHaveBeenCalled();
          expect(callbacks.onElevenLabsFallback).toHaveBeenCalled();
          expect(mockSpeech.speak).toHaveBeenCalled();
        });

        it('calls TTS with correct config after ElevenLabs failure', async () => {
          await playStoryPage(
            'story-1',
            0,
            'Test text.',
            'AI',
            false,
            defaultTTSConfig,
            {}
          );

          expect(mockSpeech.speak).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              rate: 0.78,
              pitch: 1.0,
              language: 'en-US',
              voice: 'test-voice',
            })
          );
        });

        it('fires onTTSComplete when fallback TTS finishes', async () => {
          const onTTSComplete = jest.fn();
          mockSpeech.speak.mockImplementation((_text, options) => {
            // Simulate immediate completion
            options?.onDone?.();
          });

          await playStoryPage(
            'story-1',
            0,
            'Test.',
            'AI',
            false,
            defaultTTSConfig,
            { onTTSComplete }
          );

          expect(onTTSComplete).toHaveBeenCalled();
        });

        it('fires onTTSStopped when fallback TTS is stopped', async () => {
          const onTTSStopped = jest.fn();
          mockSpeech.speak.mockImplementation((_text, options) => {
            options?.onStopped?.();
          });

          await playStoryPage(
            'story-1',
            0,
            'Test.',
            'AI',
            false,
            defaultTTSConfig,
            { onTTSStopped }
          );

          expect(onTTSStopped).toHaveBeenCalled();
        });

        it('fires onTTSError on fallback TTS error', async () => {
          const onTTSError = jest.fn();
          mockSpeech.speak.mockImplementation((_text, options) => {
            options?.onError?.(new Error('TTS error'));
          });

          await playStoryPage(
            'story-1',
            0,
            'Test.',
            'AI',
            false,
            defaultTTSConfig,
            { onTTSError }
          );

          expect(onTTSError).toHaveBeenCalled();
        });
      });

      describe('ElevenLabs playback error triggers TTS fallback', () => {
        it('falls back to TTS when ElevenLabs returns shouldFallback', async () => {
          const onElevenLabsFallback = jest.fn();
          const onTTSComplete = jest.fn();

          // Simulate playback error via return value (no onError callback in new API)
          mockPlayElevenLabsAudio.mockResolvedValue({
            success: false,
            shouldFallback: true,
            error: 'Playback error after fetch',
          });

          mockSpeech.speak.mockImplementation((_text, opts) => {
            opts?.onDone?.();
          });

          await playStoryPage(
            'story-1',
            0,
            'Test.',
            'AI',
            false,
            defaultTTSConfig,
            { onElevenLabsFallback, onTTSComplete }
          );

          expect(onElevenLabsFallback).toHaveBeenCalled();
          expect(mockSpeech.speak).toHaveBeenCalled();
          expect(onTTSComplete).toHaveBeenCalled();
        });
      });
    });

    describe('when narrationMode is Human', () => {
      describe('and hasParentRecording is false', () => {
        it('uses ElevenLabs (AI narration) when ElevenLabs succeeds', async () => {
          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(),
            onElevenLabsStart: jest.fn(),
          };

          const result = await playStoryPage(
            'story-1',
            0,
            'Hello.',
            'Human',
            false,
            defaultTTSConfig,
            callbacks
          );

          expect(result.source).toBe('elevenlabs');
          expect(callbacks.onParentStart).not.toHaveBeenCalled();
          expect(callbacks.onElevenLabsStart).toHaveBeenCalled();
          expect(mockPlayPageRecording).not.toHaveBeenCalled();
        });

        it('falls back to TTS when ElevenLabs fails', async () => {
          mockPlayElevenLabsAudio.mockResolvedValue({
            success: false,
            shouldFallback: true,
            error: 'Network error',
          });

          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(),
            onElevenLabsFallback: jest.fn(),
          };

          const result = await playStoryPage(
            'story-1',
            0,
            'Hello.',
            'Human',
            false,
            defaultTTSConfig,
            callbacks
          );

          expect(result.source).toBe('tts');
          expect(callbacks.onParentStart).not.toHaveBeenCalled();
          expect(callbacks.onElevenLabsFallback).toHaveBeenCalled();
          expect(mockSpeech.speak).toHaveBeenCalled();
        });
      });

      describe('and hasParentRecording is true', () => {
        it('attempts parent recording playback', async () => {
          mockPlayPageRecording.mockResolvedValue(true);
          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(),
            onParentComplete: jest.fn(),
          };

          const result = await playStoryPage(
            'story-1',
            2,
            'Page text.',
            'Human',
            true,
            defaultTTSConfig,
            callbacks
          );

          expect(result.source).toBe('parent');
          expect(callbacks.onParentStart).toHaveBeenCalled();
          expect(mockPlayPageRecording).toHaveBeenCalledWith(
            'story-1',
            2,
            expect.any(Function)
          );
        });

        it('fires callbacks in correct order on parent success', async () => {
          const callOrder: string[] = [];

          mockPlayPageRecording.mockImplementation(async (_storyId, _pageIndex, onComplete) => {
            // Simulate successful playback completion
            if (onComplete) onComplete();
            return true;
          });

          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(() => callOrder.push('onParentStart')),
            onParentComplete: jest.fn(() => callOrder.push('onParentComplete')),
            onParentFailed: jest.fn(() => callOrder.push('onParentFailed')),
            onTTSComplete: jest.fn(() => callOrder.push('onTTSComplete')),
          };

          await playStoryPage(
            'story-1',
            0,
            'Text.',
            'Human',
            true,
            defaultTTSConfig,
            callbacks
          );

          expect(callOrder).toEqual(['onParentStart', 'onParentComplete']);
          expect(callbacks.onParentFailed).not.toHaveBeenCalled();
          expect(callbacks.onTTSComplete).not.toHaveBeenCalled();
        });

        it('falls back to ElevenLabs when parent recording fails', async () => {
          mockPlayPageRecording.mockResolvedValue(false);
          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(),
            onParentFailed: jest.fn(),
            onElevenLabsStart: jest.fn(),
          };

          const result = await playStoryPage(
            'story-1',
            0,
            'Fallback text.',
            'Human',
            true,
            defaultTTSConfig,
            callbacks
          );

          expect(result.source).toBe('elevenlabs');
          expect(callbacks.onParentStart).toHaveBeenCalled();
          expect(callbacks.onParentFailed).toHaveBeenCalled();
          expect(callbacks.onElevenLabsStart).toHaveBeenCalled();
          expect(mockPlayElevenLabsAudio).toHaveBeenCalled();
        });

        it('falls back to TTS when both parent and ElevenLabs fail', async () => {
          mockPlayPageRecording.mockResolvedValue(false);
          mockPlayElevenLabsAudio.mockResolvedValue({
            success: false,
            shouldFallback: true,
            error: 'Network error',
          });

          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(),
            onParentFailed: jest.fn(),
            onElevenLabsFallback: jest.fn(),
          };

          const result = await playStoryPage(
            'story-1',
            0,
            'Fallback text.',
            'Human',
            true,
            defaultTTSConfig,
            callbacks
          );

          expect(result.source).toBe('tts');
          expect(callbacks.onParentStart).toHaveBeenCalled();
          expect(callbacks.onParentFailed).toHaveBeenCalled();
          expect(callbacks.onElevenLabsFallback).toHaveBeenCalled();
          expect(mockSpeech.speak).toHaveBeenCalled();
        });

        it('fires callbacks in correct order on parent failure → ElevenLabs success', async () => {
          const callOrder: string[] = [];

          mockPlayPageRecording.mockResolvedValue(false);
          mockPlayElevenLabsAudio.mockImplementation(async (_storyId, _pageIndex, _text, _voiceId, onComplete) => {
            callOrder.push('elevenLabsStart');
            onComplete?.();
            return { success: true, source: 'cache' as const, fileUri: 'file:///test.mp3' };
          });

          const callbacks: PlaybackCallbacks = {
            onParentStart: jest.fn(() => callOrder.push('onParentStart')),
            onParentComplete: jest.fn(() => callOrder.push('onParentComplete')),
            onParentFailed: jest.fn(() => callOrder.push('onParentFailed')),
            onElevenLabsStart: jest.fn(() => callOrder.push('onElevenLabsStart')),
            onTTSComplete: jest.fn(() => callOrder.push('onTTSComplete')),
          };

          await playStoryPage(
            'story-1',
            0,
            'Text.',
            'Human',
            true,
            defaultTTSConfig,
            callbacks
          );

          // Note: In this sync mock, onComplete fires before onElevenLabsStart
          // because the mock calls onComplete inside mockImplementation,
          // before the await returns. In real usage, onComplete fires async
          // after audio finishes, so onElevenLabsStart always fires first.
          expect(callOrder).toEqual([
            'onParentStart',
            'onParentFailed',
            'elevenLabsStart',
            'onTTSComplete',
            'onElevenLabsStart',
          ]);
          expect(callbacks.onParentComplete).not.toHaveBeenCalled();
        });
      });
    });

    describe('TTS text preparation', () => {
      it('adds pauses at sentence boundaries (when followed by space)', async () => {
        // Mock ElevenLabs to fail so we fall back to TTS
        mockPlayElevenLabsAudio.mockResolvedValue({
          success: false,
          shouldFallback: true,
          error: 'Network error',
        });

        await playStoryPage(
          'story-1',
          0,
          'First sentence. Second sentence! Third sentence? More text.',
          'AI',
          false,
          defaultTTSConfig,
          {}
        );

        const calledText = mockSpeech.speak.mock.calls[0][0];
        // Pauses are added after punctuation followed by space
        expect(calledText).toContain('.\n');
        expect(calledText).toContain('!\n');
        expect(calledText).toContain('?\n');
      });
    });

    describe('return value', () => {
      it('returns { source: "parent" } when parent recording succeeds', async () => {
        mockPlayPageRecording.mockResolvedValue(true);

        const result = await playStoryPage(
          'story-1',
          0,
          'Text.',
          'Human',
          true,
          defaultTTSConfig,
          {}
        );

        expect(result).toEqual({ source: 'parent' });
      });

      it('returns { source: "elevenlabs" } when falling back from parent (ElevenLabs succeeds)', async () => {
        mockPlayPageRecording.mockResolvedValue(false);

        const result = await playStoryPage(
          'story-1',
          0,
          'Text.',
          'Human',
          true,
          defaultTTSConfig,
          {}
        );

        expect(result).toEqual({ source: 'elevenlabs' });
      });

      it('returns { source: "tts" } when falling back from parent and ElevenLabs fails', async () => {
        mockPlayPageRecording.mockResolvedValue(false);
        mockPlayElevenLabsAudio.mockResolvedValue({
          success: false,
          shouldFallback: true,
          error: 'Network error',
        });

        const result = await playStoryPage(
          'story-1',
          0,
          'Text.',
          'Human',
          true,
          defaultTTSConfig,
          {}
        );

        expect(result).toEqual({ source: 'tts' });
      });

      it('returns { source: "elevenlabs" } for AI mode when ElevenLabs succeeds', async () => {
        const result = await playStoryPage(
          'story-1',
          0,
          'Text.',
          'AI',
          false,
          defaultTTSConfig,
          {}
        );

        expect(result).toEqual({ source: 'elevenlabs' });
      });

      it('returns { source: "tts" } for AI mode when ElevenLabs fails', async () => {
        mockPlayElevenLabsAudio.mockResolvedValue({
          success: false,
          shouldFallback: true,
          error: 'Network error',
        });

        const result = await playStoryPage(
          'story-1',
          0,
          'Text.',
          'AI',
          false,
          defaultTTSConfig,
          {}
        );

        expect(result).toEqual({ source: 'tts' });
      });
    });
  });
});
