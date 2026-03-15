/**
 * Password Validation Hook
 * Location: src/hooks/usePasswordValidation.ts
 * 
 * Reusable hook for password validation with debouncing.
 * Provides real-time validation feedback for password fields.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    passwordStrength as calculateStrength,
    checkRequirements,
    getValidationErrors,
    PasswordRequirements,
    PasswordStrength,
} from '../domain/services/passwordPolicy';

interface PersonalInfo {
  childName?: string;
  parentEmail?: string;
}

interface UsePasswordValidationOptions {
  personalInfo?: PersonalInfo;
  debounceMs?: number;
}

interface PasswordValidationState {
  // Password values
  password: string;
  confirmPassword: string;
  
  // Setters
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  
  // Validation results
  requirements: PasswordRequirements;
  strength: PasswordStrength;
  errors: string[];
  
  // Status flags
  passwordsMatch: boolean;
  canSubmit: boolean;
  hasStartedTyping: boolean;
  hasStartedConfirm: boolean;
  
  // Field states for styling
  passwordFieldState: 'neutral' | 'error' | 'valid';
  confirmFieldState: 'neutral' | 'error' | 'valid';
  
  // First error to show (prioritized)
  primaryError: string | null;
  
  // Reset function
  reset: () => void;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: false,
  hasUppercase: false,
  hasLowercase: false,
  hasNumber: false,
  hasSymbol: false,
  notCommon: true,
  noPersonalInfo: true,
};

const DEFAULT_STRENGTH: PasswordStrength = {
  score: 0,
  label: 'Weak',
  percent: 0,
  color: '#EF4444',
};

export const usePasswordValidation = (
  options: UsePasswordValidationOptions = {}
): PasswordValidationState => {
  const { personalInfo, debounceMs = 150 } = options;
  
  // Password state
  const [password, setPasswordRaw] = useState('');
  const [confirmPassword, setConfirmPasswordRaw] = useState('');
  
  // Debounced values for validation
  const [debouncedPassword, setDebouncedPassword] = useState('');
  const [debouncedConfirm, setDebouncedConfirm] = useState('');
  
  // Tracking if user has started typing
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [hasStartedConfirm, setHasStartedConfirm] = useState(false);
  
  // Refs to track typing state without causing callback recreation
  const hasStartedTypingRef = useRef(false);
  const hasStartedConfirmRef = useRef(false);
  
  // Debounce timers
  const passwordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Password setter with debouncing - stable callback
  const setPassword = useCallback((value: string) => {
    setPasswordRaw(value);
    if (!hasStartedTypingRef.current && value.length > 0) {
      hasStartedTypingRef.current = true;
      setHasStartedTyping(true);
    }
    
    // Clear existing timer
    if (passwordTimerRef.current) {
      clearTimeout(passwordTimerRef.current);
    }
    
    // Set new debounced value after delay
    passwordTimerRef.current = setTimeout(() => {
      setDebouncedPassword(value);
    }, debounceMs);
  }, [debounceMs]);
  
  // Confirm password setter with debouncing - stable callback
  const setConfirmPassword = useCallback((value: string) => {
    setConfirmPasswordRaw(value);
    if (!hasStartedConfirmRef.current && value.length > 0) {
      hasStartedConfirmRef.current = true;
      setHasStartedConfirm(true);
    }
    
    // Clear existing timer
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
    }
    
    // Set new debounced value after delay
    confirmTimerRef.current = setTimeout(() => {
      setDebouncedConfirm(value);
    }, debounceMs);
  }, [debounceMs]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);
  
  // Calculate requirements based on debounced password
  const requirements = useMemo(() => {
    if (!debouncedPassword) return DEFAULT_REQUIREMENTS;
    return checkRequirements(debouncedPassword, personalInfo);
  }, [debouncedPassword, personalInfo]);
  
  // Calculate strength based on debounced password
  const strength = useMemo(() => {
    if (!debouncedPassword) return DEFAULT_STRENGTH;
    return calculateStrength(debouncedPassword);
  }, [debouncedPassword]);
  
  // Check if passwords match (use raw values for immediate feedback)
  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return false;
    return password === confirmPassword;
  }, [password, confirmPassword]);
  
  // Check if all requirements are met
  const allRequirementsMet = useMemo(() => {
    return Object.values(requirements).every(Boolean);
  }, [requirements]);
  
  // Can submit if all requirements met and passwords match
  const canSubmit = allRequirementsMet && passwordsMatch;
  
  // Get validation errors (prioritized)
  const errors = useMemo(() => {
    if (!hasStartedTyping) return [];
    return getValidationErrors(requirements, passwordsMatch || !hasStartedConfirm);
  }, [requirements, passwordsMatch, hasStartedTyping, hasStartedConfirm]);
  
  // Primary error (first/most important)
  const primaryError = errors.length > 0 ? errors[0] : null;
  
  // Field state for password input
  const passwordFieldState = useMemo((): 'neutral' | 'error' | 'valid' => {
    if (!hasStartedTyping || debouncedPassword.length === 0) return 'neutral';
    if (allRequirementsMet) return 'valid';
    return 'error';
  }, [hasStartedTyping, debouncedPassword, allRequirementsMet]);
  
  // Field state for confirm input
  const confirmFieldState = useMemo((): 'neutral' | 'error' | 'valid' => {
    if (!hasStartedConfirm || debouncedConfirm.length === 0) return 'neutral';
    if (passwordsMatch) return 'valid';
    return 'error';
  }, [hasStartedConfirm, debouncedConfirm, passwordsMatch]);
  
  // Reset function
  const reset = useCallback(() => {
    setPasswordRaw('');
    setConfirmPasswordRaw('');
    setDebouncedPassword('');
    setDebouncedConfirm('');
    setHasStartedTyping(false);
    setHasStartedConfirm(false);
    hasStartedTypingRef.current = false;
    hasStartedConfirmRef.current = false;
  }, []);
  
  return {
    // Values
    password,
    confirmPassword,
    
    // Setters
    setPassword,
    setConfirmPassword,
    
    // Validation
    requirements,
    strength,
    errors,
    
    // Status
    passwordsMatch,
    canSubmit,
    hasStartedTyping,
    hasStartedConfirm,
    
    // Field states
    passwordFieldState,
    confirmFieldState,
    
    // Primary error
    primaryError,
    
    // Reset
    reset,
  };
};
