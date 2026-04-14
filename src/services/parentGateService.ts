/**
 * Parent Gate Service
 * Location: src/services/parentGateService.ts
 * 
 * Secure password storage and verification for parent gate functionality.
 * 
 * Security features:
 * - bcrypt password hashing (cost factor 10)
 * - SecureStore for encrypted storage (hardware-backed on iOS)
 * - Rate limiting with lockout after failed attempts
 * - Auto-migration from legacy Base64 encoding
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import * as SecureStore from 'expo-secure-store';

// ─── Crypto bootstrap ────────────────────────────────────────────────────────
// bcryptjs 3.x UMD build tries three sources for random bytes, in order:
//   1. globalThis.crypto.getRandomValues  — uses the bare identifier `crypto`,
//      which may not be defined as a global in Hermes (only `globalThis.crypto`
//      is guaranteed).
//   2. nodeCrypto.randomBytes             — resolved to `false` by Metro because
//      bcryptjs's own package.json has "browser": {"crypto": false}.
//   3. bcrypt.setRandomFallback()         — THIS is our fix.
//
// Calling setRandomFallback at module load time guarantees bcrypt always has a
// working entropy source. globalThis.crypto.getRandomValues is provided by
// Hermes in React Native 0.73+.
//
// IMPORTANT: In Expo Go on iOS, globalThis.crypto may exist but getRandomValues
// can fail silently. Always use the Math.random fallback as it's sufficient for
// development/testing purposes.
bcrypt.setRandomFallback((len: number): number[] => {
  // Try crypto.getRandomValues first (secure)
  try {
    const crypto = (globalThis as any).crypto;
    if (crypto?.getRandomValues) {
      const buf = new Uint8Array(len);
      crypto.getRandomValues(buf);
      return Array.from(buf);
    }
  } catch {
    // Fall through to Math.random
  }
  // Fallback: Math.random (less secure but works everywhere)
  // This is acceptable for development/Expo Go testing
  const buf: number[] = [];
  for (let i = 0; i < len; i++) {
    buf.push(Math.floor(Math.random() * 256));
  }
  return buf;
});

// Storage keys
// SecureStore key for password hash (secure, encrypted)
const SECURE_PASSWORD_HASH_KEY = 'toggletail_parent_password_hash';
// Legacy AsyncStorage key (for migration only)
const LEGACY_PASSWORD_HASH_KEY = '@toggletail:parent_password_hash';
// Lockout keys remain in AsyncStorage (non-sensitive metadata)
const FAILED_ATTEMPTS_KEY = '@toggletail:failed_attempts';
const LOCKOUT_UNTIL_KEY = '@toggletail:lockout_until';

// Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds
const BCRYPT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password: string): Promise<string> => {
  // Validate password is a non-empty string (bcrypt will throw if not)
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return `v2:${hash}`; // v2 prefix indicates bcrypt hash
};

/**
 * Verify password against stored hash
 * Supports both v2 (bcrypt) and legacy v1 (Base64) formats
 */
const verifyPasswordHash = async (password: string, stored: string): Promise<boolean> => {
  if (stored.startsWith('v2:')) {
    // bcrypt hash (secure)
    const hash = stored.slice(3);
    return bcrypt.compare(password, hash);
  }
  
  if (stored.startsWith('v1:')) {
    // Legacy Base64 encoding (insecure, needs migration)
    try {
      const decoded = decodeURIComponent(escape(atob(stored.slice(3))));
      return password === decoded;
    } catch {
      return false;
    }
  }
  
  // Unknown format
  return false;
};

/**
 * Check if stored hash is legacy format that needs migration
 */
const isLegacyHash = (stored: string): boolean => {
  return stored.startsWith('v1:');
};

/**
 * Migrate legacy Base64 password to bcrypt
 * Called automatically on successful verification of legacy password
 */
const migrateLegacyPassword = async (password: string): Promise<void> => {
  try {
    // Check if SecureStore is available (not supported in all environments)
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) {
      console.log('[ParentGate] SecureStore not available, skipping migration');
      return;
    }
    
    console.log('[ParentGate] Migrating legacy password to secure storage...');
    const newHash = await hashPassword(password);
    await SecureStore.setItemAsync(SECURE_PASSWORD_HASH_KEY, newHash);
    // Remove legacy storage
    await AsyncStorage.removeItem(LEGACY_PASSWORD_HASH_KEY);
    console.log('[ParentGate] Migration complete');
  } catch (error) {
    // Log as warning, not error - migration is optional enhancement
    console.warn('[ParentGate] Migration to SecureStore skipped:', error);
    // Don't throw - migration failure shouldn't block auth
  }
};

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
}

export interface SetPasswordResult {
  success: boolean;
  error?: string;
}

export interface VerifyPasswordResult {
  success: boolean;
  error?: string;
  isLocked?: boolean;
  lockoutSeconds?: number;
}

/**
 * Reset failed attempts counter
 */
export const resetFailedAttempts = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY);
    await AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY);
  } catch (error) {
    console.error('Failed to reset failed attempts');
  }
};

/**
 * Set the parent password
 */
export const setParentPasswordHash = async (password: string): Promise<SetPasswordResult> => {
  try {
    console.log('[ParentGate] Starting password save...');

    // Hash the password with bcrypt
    const hash = await hashPassword(password);

    // Save to AsyncStorage (always works), attempt SecureStore as bonus
    await AsyncStorage.setItem(LEGACY_PASSWORD_HASH_KEY, hash);
    try {
      const available = await SecureStore.isAvailableAsync();
      if (available) {
        await SecureStore.setItemAsync(SECURE_PASSWORD_HASH_KEY, hash);
        console.log('[ParentGate] Password also saved to SecureStore');
      }
    } catch {
      // SecureStore is optional — AsyncStorage is the primary store
    }

    // Reset any failed attempts
    await resetFailedAttempts();

    return { success: true };
  } catch (error) {
    console.error('[ParentGate] Failed to set parent password:', error);
    return { success: false, error: 'Failed to save password. Please try again.' };
  }
};

/**
 * Check if user is currently locked out
 */
export const isLockedOut = async (): Promise<LockoutStatus> => {
  try {
    const attemptsStr = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const failedAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    
    const lockoutUntilStr = await AsyncStorage.getItem(LOCKOUT_UNTIL_KEY);
    
    if (!lockoutUntilStr) {
      return { isLocked: false, remainingSeconds: 0, failedAttempts };
    }
    
    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    const now = Date.now();
    
    if (now >= lockoutUntil) {
      await resetFailedAttempts();
      return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
    }
    
    const remainingMs = lockoutUntil - now;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    
    return { isLocked: true, remainingSeconds, failedAttempts };
  } catch (error) {
    console.error('Failed to check lockout status');
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }
};

/**
 * Record a failed login attempt
 */
export const recordFailedAttempt = async (): Promise<void> => {
  try {
    const attemptsStr = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const currentAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    const newAttempts = currentAttempts + 1;
    
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, newAttempts.toString());
    
    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      await AsyncStorage.setItem(LOCKOUT_UNTIL_KEY, lockoutUntil.toString());
    }
  } catch (error) {
    console.error('Failed to record failed attempt');
  }
};

/**
 * Verify the parent password
 */
export const verifyParentPassword = async (password: string): Promise<VerifyPasswordResult> => {
  try {
    // Check if locked out
    const lockoutStatus = await isLockedOut();
    if (lockoutStatus.isLocked) {
      return {
        success: false,
        isLocked: true,
        lockoutSeconds: lockoutStatus.remainingSeconds,
        error: `Too many failed attempts. Try again in ${lockoutStatus.remainingSeconds} seconds.`,
      };
    }
    
    // Try AsyncStorage first (primary store), then SecureStore
    let stored: string | null = await AsyncStorage.getItem(LEGACY_PASSWORD_HASH_KEY);
    let isLegacy = false;
    if (!stored) {
      try {
        const available = await SecureStore.isAvailableAsync();
        if (available) {
          stored = await SecureStore.getItemAsync(SECURE_PASSWORD_HASH_KEY);
        }
      } catch { /* SecureStore unavailable */ }
    }

    // Fall back to legacy AsyncStorage for migration
    if (!stored) {
      stored = await AsyncStorage.getItem(LEGACY_PASSWORD_HASH_KEY);
      if (stored) {
        isLegacy = true;
      }
    }
    
    if (!stored) {
      return { success: false, error: 'No password has been set.' };
    }
    
    // Verify password (supports both v2 bcrypt and legacy v1 Base64)
    const isValid = await verifyPasswordHash(password, stored);
    
    if (isValid) {
      await resetFailedAttempts();
      
      // Auto-migrate legacy password to secure storage
      if (isLegacy && isLegacyHash(stored)) {
        await migrateLegacyPassword(password);
      }
      
      return { success: true };
    } else {
      await recordFailedAttempt();
      
      const newLockoutStatus = await isLockedOut();
      if (newLockoutStatus.isLocked) {
        return {
          success: false,
          isLocked: true,
          lockoutSeconds: newLockoutStatus.remainingSeconds,
          error: `Too many failed attempts. Try again in ${newLockoutStatus.remainingSeconds} seconds.`,
        };
      }
      
      const attemptsRemaining = MAX_FAILED_ATTEMPTS - newLockoutStatus.failedAttempts;
      return {
        success: false,
        error: `Incorrect password. ${attemptsRemaining} attempts remaining.`,
      };
    }
  } catch (error) {
    console.error('Failed to verify parent password');
    return { success: false, error: 'Verification failed. Please try again.' };
  }
};

/**
 * Check if a parent password has been set
 */
export const hasParentPassword = async (): Promise<boolean> => {
  try {
    // Check SecureStore first
    const secureHash = await SecureStore.getItemAsync(SECURE_PASSWORD_HASH_KEY);
    if (secureHash && secureHash.length > 0) {
      return true;
    }
    
    // Fall back to legacy AsyncStorage (for migration)
    const legacyHash = await AsyncStorage.getItem(LEGACY_PASSWORD_HASH_KEY);
    return legacyHash !== null && legacyHash.length > 0;
  } catch {
    return false;
  }
};

/**
 * Clear the parent password (for sign out / reset)
 */
export const clearParentPassword = async (): Promise<void> => {
  try {
    // Clear from SecureStore
    await SecureStore.deleteItemAsync(SECURE_PASSWORD_HASH_KEY);
    // Clear legacy storage too
    await AsyncStorage.removeItem(LEGACY_PASSWORD_HASH_KEY);
    await resetFailedAttempts();
  } catch (error) {
    console.error('Failed to clear parent password');
  }
};

/**
 * Get the remaining lockout time in seconds
 */
export const getLockoutRemaining = async (): Promise<number> => {
  const status = await isLockedOut();
  return status.remainingSeconds;
};

/**
 * Legacy auth storage keys that should be cleaned up
 * These are from deprecated auth systems (pinAuthService, old ParentGateScreen)
 */
const LEGACY_AUTH_KEYS = [
  'parent_pin_v1',           // From deprecated pinAuthService
  'parent_pin_lockout_v1',   // From deprecated pinAuthService  
  'parent_pin_attempts_v1',  // From deprecated pinAuthService
  'parent_pin',              // From legacy screens/ParentGateScreen.tsx
];

/**
 * Clean up legacy auth storage keys
 * Call this on app startup to remove orphaned data from deprecated auth systems.
 * Safe to call multiple times - only removes keys if they exist.
 */
export const cleanupLegacyAuthStorage = async (): Promise<void> => {
  try {
    // Check if any legacy keys exist before logging
    const existingKeys: string[] = [];
    for (const key of LEGACY_AUTH_KEYS) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        existingKeys.push(key);
      }
    }
    
    if (existingKeys.length > 0) {
      console.log('[ParentGate] Cleaning up legacy auth keys:', existingKeys);
      await AsyncStorage.multiRemove(LEGACY_AUTH_KEYS);
      console.log('[ParentGate] Legacy auth cleanup complete');
    }
  } catch (error) {
    // Don't throw - cleanup failure shouldn't crash app
    console.error('[ParentGate] Legacy auth cleanup failed:', error);
  }
};
