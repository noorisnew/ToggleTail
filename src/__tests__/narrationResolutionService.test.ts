/**
 * Tests for narrationResolutionService
 *
 * Pure unit tests - no mocks needed since these are pure functions.
 */

import { NarrationSource, resolveNarrationSource } from '../domain/services/narrationResolutionService';

describe('narrationResolutionService', () => {
  describe('resolveNarrationSource', () => {
    it('returns "parent" when mode is Human and recording exists', () => {
      const result = resolveNarrationSource('Human', true);
      expect(result).toBe('parent');
    });

    it('returns "tts" when mode is Human but no recording exists', () => {
      const result = resolveNarrationSource('Human', false);
      expect(result).toBe('tts');
    });

    it('returns "tts" when mode is AI regardless of recording availability', () => {
      expect(resolveNarrationSource('AI', true)).toBe('tts');
      expect(resolveNarrationSource('AI', false)).toBe('tts');
    });

    it('is a pure function (same inputs always produce same outputs)', () => {
      // Call multiple times with same inputs
      const results: NarrationSource[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(resolveNarrationSource('Human', true));
      }
      expect(results.every(r => r === 'parent')).toBe(true);
    });

    describe('truth table coverage', () => {
      const cases: Array<{
        mode: 'AI' | 'Human';
        hasRecording: boolean;
        expected: NarrationSource;
      }> = [
        { mode: 'AI', hasRecording: false, expected: 'tts' },
        { mode: 'AI', hasRecording: true, expected: 'tts' },
        { mode: 'Human', hasRecording: false, expected: 'tts' },
        { mode: 'Human', hasRecording: true, expected: 'parent' },
      ];

      cases.forEach(({ mode, hasRecording, expected }) => {
        it(`returns "${expected}" for mode="${mode}" hasRecording=${hasRecording}`, () => {
          expect(resolveNarrationSource(mode, hasRecording)).toBe(expected);
        });
      });
    });
  });
});
