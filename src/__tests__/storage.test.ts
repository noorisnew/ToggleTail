import { STORAGE_KEYS } from '@/src/data/storage/storageKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('Storage Keys', () => {
  test('STORAGE_KEYS contains required keys', () => {
    expect(STORAGE_KEYS.PROFILE).toBeDefined();
    expect(STORAGE_KEYS.STORIES).toBeDefined();
    expect(STORAGE_KEYS.SETTINGS).toBeDefined();
    expect(STORAGE_KEYS.LIBRARY_CACHE_KEY).toBeDefined();
    expect(STORAGE_KEYS.LIBRARY_CACHE_TIMESTAMP_KEY).toBeDefined();
    expect(STORAGE_KEYS.PARENT_RECORDINGS_KEY).toBeDefined();
  });

  test('storage keys are strings', () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      expect(typeof key).toBe('string');
    });
  });

  test('storage keys are unique', () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe('AsyncStorage Mock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setItem can be called', async () => {
    await AsyncStorage.setItem('test', 'value');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('test', 'value');
  });

  test('getItem can be called', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-value');
    const result = await AsyncStorage.getItem('test');
    expect(result).toBe('stored-value');
  });
});
