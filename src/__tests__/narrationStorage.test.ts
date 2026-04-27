/**
 * Tests for narrationStorage — focused on the useClonedVoice field
 * and backward-compatible parsing of legacy / partial stored values.
 */

jest.mock('../config/api', () => ({ API_BASE_URL: 'http://localhost:3001' }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    getNarrationSettings,
    NarrationSettings,
    saveNarrationSettings,
} from '../data/storage/narrationStorage';

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

describe('narrationStorage', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getNarrationSettings', () => {
    it('returns defaults when nothing is stored', async () => {
      mockGetItem.mockResolvedValueOnce(null);
      const settings = await getNarrationSettings();

      expect(settings.preferredSource).toBe('AI');
      expect(settings.aiVoiceId).toBe('Rachel');
      expect(settings.parentVoiceLabel).toBe('Parent');
      expect(settings.useClonedVoice).toBe(false);
      expect(settings.clonedVoiceId).toBeUndefined();
    });

    it('parses useClonedVoice: true from stored JSON', async () => {
      const stored: NarrationSettings = {
        preferredSource: 'AI',
        aiVoiceId: 'Josh',
        parentVoiceLabel: 'Mom',
        clonedVoiceId: 'el-voice-abc',
        useClonedVoice: true,
      };
      mockGetItem.mockResolvedValueOnce(JSON.stringify(stored));

      const settings = await getNarrationSettings();

      expect(settings.useClonedVoice).toBe(true);
      expect(settings.clonedVoiceId).toBe('el-voice-abc');
    });

    it('defaults useClonedVoice to false when field is absent from stored JSON', async () => {
      const storedLegacy = {
        preferredSource: 'Human',
        aiVoiceId: 'Rachel',
        parentVoiceLabel: 'Dad',
        clonedVoiceId: 'some-id',
        // useClonedVoice intentionally absent
      };
      mockGetItem.mockResolvedValueOnce(JSON.stringify(storedLegacy));

      const settings = await getNarrationSettings();

      expect(settings.useClonedVoice).toBe(false);
      expect(settings.clonedVoiceId).toBe('some-id');
    });

    it('handles legacy string format ("AI") without crashing', async () => {
      mockGetItem.mockResolvedValueOnce('AI');

      const settings = await getNarrationSettings();

      expect(settings.preferredSource).toBe('AI');
      expect(settings.useClonedVoice).toBe(false);
    });

    it('handles legacy string format ("Human") without crashing', async () => {
      mockGetItem.mockResolvedValueOnce('Human');

      const settings = await getNarrationSettings();

      expect(settings.preferredSource).toBe('Human');
      expect(settings.useClonedVoice).toBe(false);
    });

    it('returns defaults on AsyncStorage error', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('Storage unavailable'));

      const settings = await getNarrationSettings();

      expect(settings.preferredSource).toBe('AI');
      expect(settings.useClonedVoice).toBe(false);
    });
  });

  describe('saveNarrationSettings', () => {
    it('persists useClonedVoice: true', async () => {
      mockSetItem.mockResolvedValueOnce(undefined);

      const toSave: NarrationSettings = {
        preferredSource: 'AI',
        aiVoiceId: 'Rachel',
        parentVoiceLabel: 'Parent',
        clonedVoiceId: 'el-v123',
        useClonedVoice: true,
      };

      await saveNarrationSettings(toSave);

      expect(mockSetItem).toHaveBeenCalledTimes(1);
      const [, serialized] = mockSetItem.mock.calls[0];
      const parsed = JSON.parse(serialized);
      expect(parsed.useClonedVoice).toBe(true);
      expect(parsed.clonedVoiceId).toBe('el-v123');
    });

    it('persists useClonedVoice: false', async () => {
      mockSetItem.mockResolvedValueOnce(undefined);

      await saveNarrationSettings({
        preferredSource: 'AI',
        aiVoiceId: 'Sarah',
        parentVoiceLabel: 'Mom',
        useClonedVoice: false,
      });

      const [, serialized] = mockSetItem.mock.calls[0];
      const parsed = JSON.parse(serialized);
      expect(parsed.useClonedVoice).toBe(false);
    });

    it('omits clonedVoiceId from JSON when cleared (undefined)', async () => {
      mockSetItem.mockResolvedValueOnce(undefined);

      await saveNarrationSettings({
        preferredSource: 'AI',
        aiVoiceId: 'Rachel',
        parentVoiceLabel: 'Parent',
        clonedVoiceId: undefined,
        useClonedVoice: false,
      });

      const [, serialized] = mockSetItem.mock.calls[0];
      const parsed = JSON.parse(serialized);
      expect(parsed.clonedVoiceId).toBeUndefined();
    });

    it('round-trips: save then load returns identical settings', async () => {
      const original: NarrationSettings = {
        preferredSource: 'Human',
        aiVoiceId: 'Dorothy',
        parentVoiceLabel: 'Dad',
        clonedVoiceId: 'el-round-trip',
        useClonedVoice: true,
      };

      let stored = '';
      mockSetItem.mockImplementation(async (_key, value) => { stored = value; });
      mockGetItem.mockImplementation(async () => stored);

      await saveNarrationSettings(original);
      const loaded = await getNarrationSettings();

      expect(loaded.preferredSource).toBe(original.preferredSource);
      expect(loaded.aiVoiceId).toBe(original.aiVoiceId);
      expect(loaded.parentVoiceLabel).toBe(original.parentVoiceLabel);
      expect(loaded.clonedVoiceId).toBe(original.clonedVoiceId);
      expect(loaded.useClonedVoice).toBe(original.useClonedVoice);
    });
  });
});
