import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  recordCompletedStoryReading,
} from '../data/storage/profileStorage';
import { PROFILE_KEY } from '../data/storage/storageKeys';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('profileStorage recordCompletedStoryReading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts total stories read and streak on first completed story', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T12:00:00.000Z'));
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        name: 'Mia',
        age: 6,
        readingLevel: 'Beginner',
      })
    );
    mockAsyncStorage.setItem.mockResolvedValue();

    const updated = await recordCompletedStoryReading();

    expect(updated?.totalStoriesRead).toBe(1);
    expect(updated?.readingStreak).toBe(1);
    expect(updated?.lastReadDate).toBe('2026-04-06');
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      PROFILE_KEY,
      expect.stringContaining('"totalStoriesRead":1')
    );
  });

  it('increments reading streak on consecutive day completion', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-06T12:00:00.000Z'));
    mockAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        name: 'Mia',
        age: 6,
        readingLevel: 'Beginner',
        readingStreak: 2,
        totalStoriesRead: 4,
        lastReadDate: '2026-04-05',
      })
    );
    mockAsyncStorage.setItem.mockResolvedValue();

    await recordCompletedStoryReading();
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      PROFILE_KEY,
      expect.stringContaining('"readingStreak":3')
    );
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      PROFILE_KEY,
      expect.stringContaining('"totalStoriesRead":5')
    );
  });
});