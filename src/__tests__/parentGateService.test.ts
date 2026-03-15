import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import * as SecureStore from 'expo-secure-store';
import {
    cleanupLegacyAuthStorage,
    clearParentPassword,
    hasParentPassword,
    isLockedOut,
    setParentPasswordHash,
    verifyParentPassword
} from '../services/parentGateService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('parentGateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no lockout, no stored password
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockSecureStore.getItemAsync.mockResolvedValue(null);
  });

  describe('setParentPasswordHash', () => {
    it('should hash password with bcrypt and store in SecureStore', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      const result = await setParentPasswordHash('TestPassword123!');

      expect(result.success).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'toggletail_parent_password_hash',
        expect.stringMatching(/^v2:\$2[aby]\$.+/)
      );
    });

    it('should clean up legacy AsyncStorage after saving', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await setParentPasswordHash('TestPassword123!');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@toggletail:parent_password_hash'
      );
    });

    it('should reset failed attempts after setting password', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await setParentPasswordHash('TestPassword123!');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@toggletail:failed_attempts'
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@toggletail:lockout_until'
      );
    });
  });

  describe('verifyParentPassword', () => {
    it('should verify correct password against bcrypt hash', async () => {
      const password = 'CorrectPassword123!';
      const hash = await bcrypt.hash(password, 10);
      mockSecureStore.getItemAsync.mockResolvedValue(`v2:${hash}`);

      const result = await verifyParentPassword(password);

      expect(result.success).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcrypt.hash('CorrectPassword123!', 10);
      mockSecureStore.getItemAsync.mockResolvedValue(`v2:${hash}`);

      const result = await verifyParentPassword('WrongPassword456!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Incorrect password');
    });

    it('should NOT have dev123 bypass', async () => {
      // Ensure no password is set
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await verifyParentPassword('dev123');

      // Should fail because no password is set, not succeed via bypass
      expect(result.success).toBe(false);
      expect(result.error).toBe('No password has been set.');
    });

    it('should return error when no password is set', async () => {
      const result = await verifyParentPassword('AnyPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No password has been set.');
    });

    describe('legacy Base64 migration', () => {
      it('should verify legacy v1 Base64 password', async () => {
        const password = 'LegacyPassword123!';
        // Simulate legacy Base64 encoding
        const legacyEncoded = `v1:${btoa(unescape(encodeURIComponent(password)))}`;
        
        // Legacy password in AsyncStorage, not in SecureStore
        mockSecureStore.getItemAsync.mockResolvedValue(null);
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === '@toggletail:parent_password_hash') {
            return Promise.resolve(legacyEncoded);
          }
          return Promise.resolve(null);
        });

        const result = await verifyParentPassword(password);

        expect(result.success).toBe(true);
      });

      it('should migrate legacy password to SecureStore on successful verification', async () => {
        const password = 'LegacyPassword123!';
        const legacyEncoded = `v1:${btoa(unescape(encodeURIComponent(password)))}`;
        
        mockSecureStore.getItemAsync.mockResolvedValue(null);
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === '@toggletail:parent_password_hash') {
            return Promise.resolve(legacyEncoded);
          }
          return Promise.resolve(null);
        });

        await verifyParentPassword(password);

        // Should have saved new bcrypt hash to SecureStore
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          'toggletail_parent_password_hash',
          expect.stringMatching(/^v2:\$2[aby]\$.+/)
        );
        // Should have removed legacy storage
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
          '@toggletail:parent_password_hash'
        );
      });
    });

    describe('lockout behavior', () => {
      it('should return locked status when lockout is active', async () => {
        const futureTime = Date.now() + 30 * 1000; // 30 seconds from now
        mockAsyncStorage.getItem.mockImplementation((key) => {
          if (key === '@toggletail:lockout_until') {
            return Promise.resolve(futureTime.toString());
          }
          if (key === '@toggletail:failed_attempts') {
            return Promise.resolve('5');
          }
          return Promise.resolve(null);
        });

        const result = await verifyParentPassword('AnyPassword');

        expect(result.success).toBe(false);
        expect(result.isLocked).toBe(true);
        expect(result.lockoutSeconds).toBeGreaterThan(0);
        expect(result.error).toContain('Too many failed attempts');
      });

      it('should record failed attempt on wrong password', async () => {
        const hash = await bcrypt.hash('CorrectPassword', 10);
        mockSecureStore.getItemAsync.mockResolvedValue(`v2:${hash}`);
        mockAsyncStorage.getItem.mockResolvedValue('0');

        await verifyParentPassword('WrongPassword');

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@toggletail:failed_attempts',
          '1'
        );
      });
    });
  });

  describe('hasParentPassword', () => {
    it('should return true when password exists in SecureStore', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('v2:$2a$10$hash');

      const result = await hasParentPassword();

      expect(result).toBe(true);
    });

    it('should return true when legacy password exists in AsyncStorage', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue('v1:base64encoded');

      const result = await hasParentPassword();

      expect(result).toBe(true);
    });

    it('should return false when no password exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await hasParentPassword();

      expect(result).toBe(false);
    });
  });

  describe('clearParentPassword', () => {
    it('should clear password from both SecureStore and legacy AsyncStorage', async () => {
      await clearParentPassword();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'toggletail_parent_password_hash'
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@toggletail:parent_password_hash'
      );
    });

    it('should reset failed attempts', async () => {
      await clearParentPassword();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@toggletail:failed_attempts'
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@toggletail:lockout_until'
      );
    });
  });

  describe('isLockedOut', () => {
    it('should return not locked when no lockout exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const status = await isLockedOut();

      expect(status.isLocked).toBe(false);
      expect(status.remainingSeconds).toBe(0);
    });

    it('should return locked with remaining time when lockout is active', async () => {
      const futureTime = Date.now() + 15 * 1000; // 15 seconds from now
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@toggletail:lockout_until') {
          return Promise.resolve(futureTime.toString());
        }
        if (key === '@toggletail:failed_attempts') {
          return Promise.resolve('5');
        }
        return Promise.resolve(null);
      });

      const status = await isLockedOut();

      expect(status.isLocked).toBe(true);
      expect(status.remainingSeconds).toBeGreaterThan(0);
      expect(status.remainingSeconds).toBeLessThanOrEqual(15);
    });

    it('should clear expired lockout and return not locked', async () => {
      const pastTime = Date.now() - 1000; // 1 second ago
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@toggletail:lockout_until') {
          return Promise.resolve(pastTime.toString());
        }
        return Promise.resolve(null);
      });

      const status = await isLockedOut();

      expect(status.isLocked).toBe(false);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@toggletail:failed_attempts'
      );
    });
  });

  describe('security requirements', () => {
    it('should use bcrypt with appropriate cost factor', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await setParentPasswordHash('TestPassword');

      const savedHash = mockSecureStore.setItemAsync.mock.calls[0][1] as string;
      // v2: prefix + bcrypt hash with $2a$10$ or $2b$10$ (cost factor 10)
      expect(savedHash).toMatch(/^v2:\$2[aby]\$10\$/);
    });

    it('should not expose password in error messages', async () => {
      const password = 'SecretPassword123!';
      const hash = await bcrypt.hash('DifferentPassword', 10);
      mockSecureStore.getItemAsync.mockResolvedValue(`v2:${hash}`);

      const result = await verifyParentPassword(password);

      expect(result.success).toBe(false);
      expect(result.error).not.toContain(password);
      expect(result.error).not.toContain('Secret');
      expect(result.error).not.toContain('hash');
      expect(result.error).not.toContain('bcrypt');
    });
  });

  describe('cleanupLegacyAuthStorage', () => {
    it('should remove all legacy auth keys when they exist', async () => {
      // Simulate legacy keys existing
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'parent_pin_v1') return Promise.resolve('123456');
        if (key === 'parent_pin') return Promise.resolve('1234');
        return Promise.resolve(null);
      });

      await cleanupLegacyAuthStorage();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'parent_pin_v1',
        'parent_pin_lockout_v1',
        'parent_pin_attempts_v1',
        'parent_pin',
      ]);
    });

    it('should not call multiRemove when no legacy keys exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await cleanupLegacyAuthStorage();

      expect(mockAsyncStorage.multiRemove).not.toHaveBeenCalled();
    });

    it('should not throw on cleanup failure', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('some-value');
      mockAsyncStorage.multiRemove.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(cleanupLegacyAuthStorage()).resolves.toBeUndefined();
    });
  });
});
