/**
 * Password Policy Utilities
 * Location: src/domain/services/passwordPolicy.ts
 * 
 * Production-level password validation for parent gate functionality.
 * Implements industry-standard password policies for children's apps.
 */

// Common passwords list (~50 most common)
const COMMON_PASSWORDS: string[] = [
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'monkey', 'master',
  'dragon', 'iloveyou', 'trustno1', 'sunshine', 'princess', 'welcome',
  'shadow', 'superman', 'michael', 'football', 'baseball', 'letmein',
  '696969', 'mustang', 'access', 'shadow', 'batman', 'passw0rd',
  '111111', '000000', 'admin', 'admin123', 'root', 'toor',
  'pass', 'test', 'guest', 'master123', 'changeme', 'hello',
  'charlie', 'donald', 'jordan', 'thomas', 'hunter', 'amanda',
  'jessica', 'ashley', 'qwertyuiop', 'zaq12wsx', 'password1234',
];

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  notCommon: boolean;
  noPersonalInfo: boolean;
}

export interface PasswordStrength {
  score: number;       // 0-4
  label: 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  percent: number;     // 0-100 for progress bar
  color: string;       // Color code for UI
}

export interface ValidationResult {
  requirements: PasswordRequirements;
  strength: PasswordStrength;
  isValid: boolean;
  errors: string[];
}

/**
 * Check if password meets minimum length requirement (8+ chars)
 */
export const meetsMinLength = (password: string): boolean => {
  return password.length >= 8;
};

/**
 * Check if password contains at least one uppercase letter
 */
export const hasUppercase = (password: string): boolean => {
  return /[A-Z]/.test(password);
};

/**
 * Check if password contains at least one lowercase letter
 */
export const hasLowercase = (password: string): boolean => {
  return /[a-z]/.test(password);
};

/**
 * Check if password contains at least one number
 */
export const hasNumber = (password: string): boolean => {
  return /[0-9]/.test(password);
};

/**
 * Check if password contains at least one symbol
 */
export const hasSymbol = (password: string): boolean => {
  return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
};

/**
 * Check if password is in the common passwords list
 */
export const isCommonPassword = (password: string): boolean => {
  const normalizedPassword = password.toLowerCase().trim();
  return COMMON_PASSWORDS.includes(normalizedPassword);
};

/**
 * Check if password contains personal information
 * @param password - The password to check
 * @param personalInfo - Object containing personal information to check against
 */
export const containsPersonalInfo = (
  password: string,
  personalInfo: { childName?: string; parentEmail?: string }
): boolean => {
  const normalizedPassword = password.toLowerCase();
  
  if (personalInfo.childName) {
    const normalizedName = personalInfo.childName.toLowerCase().trim();
    if (normalizedName.length >= 3 && normalizedPassword.includes(normalizedName)) {
      return true;
    }
  }
  
  if (personalInfo.parentEmail) {
    // Extract username from email (before @)
    const emailUsername = personalInfo.parentEmail.split('@')[0].toLowerCase();
    if (emailUsername.length >= 3 && normalizedPassword.includes(emailUsername)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check for repeated character sequences (e.g., "aaaa", "1111")
 */
const hasRepeatedChars = (password: string): boolean => {
  return /(.)\1{3,}/.test(password);
};

/**
 * Check for sequential characters (e.g., "1234", "abcd")
 */
const hasSequentialChars = (password: string): boolean => {
  const sequences = [
    '0123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
  ];
  
  const normalizedPassword = password.toLowerCase();
  
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const chunk = seq.slice(i, i + 4);
      if (normalizedPassword.includes(chunk)) {
        return true;
      }
      // Also check reversed
      const reversedChunk = chunk.split('').reverse().join('');
      if (normalizedPassword.includes(reversedChunk)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Check all password requirements
 */
export const checkRequirements = (
  password: string,
  personalInfo?: { childName?: string; parentEmail?: string }
): PasswordRequirements => {
  return {
    minLength: meetsMinLength(password),
    hasUppercase: hasUppercase(password),
    hasLowercase: hasLowercase(password),
    hasNumber: hasNumber(password),
    hasSymbol: hasSymbol(password),
    notCommon: !isCommonPassword(password),
    noPersonalInfo: !containsPersonalInfo(password, personalInfo || {}),
  };
};

/**
 * Calculate password strength score and label
 */
export const passwordStrength = (password: string): PasswordStrength => {
  if (!password || password.length === 0) {
    return { score: 0, label: 'Weak', percent: 0, color: '#EF4444' };
  }
  
  let score = 0;
  
  // Length bonuses
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 0.5;
  
  // Character type bonuses
  if (hasUppercase(password)) score += 1;
  if (hasLowercase(password)) score += 1;
  if (hasNumber(password)) score += 1;
  if (hasSymbol(password)) score += 1;
  
  // Penalties
  if (isCommonPassword(password)) score -= 2;
  if (hasRepeatedChars(password)) score -= 1;
  if (hasSequentialChars(password)) score -= 0.5;
  
  // Clamp score to 0-4
  score = Math.max(0, Math.min(4, score));
  
  // Map score to label and color
  let label: PasswordStrength['label'];
  let color: string;
  let percent: number;
  
  if (score < 1.5) {
    label = 'Weak';
    color = '#EF4444'; // Red
    percent = 25;
  } else if (score < 2.5) {
    label = 'Fair';
    color = '#F59E0B'; // Orange/Amber
    percent = 50;
  } else if (score < 3.5) {
    label = 'Strong';
    color = '#10B981'; // Green
    percent = 75;
  } else {
    label = 'Very Strong';
    color = '#059669'; // Darker green
    percent = 100;
  }
  
  return { score: Math.round(score), label, percent, color };
};

/**
 * Get prioritized error messages based on missing requirements
 * Returns errors in priority order (most important first)
 */
export const getValidationErrors = (
  requirements: PasswordRequirements,
  passwordsMatch: boolean
): string[] => {
  const errors: string[] = [];
  
  // Priority order as specified
  if (!requirements.minLength) {
    errors.push('Password must be at least 8 characters');
  }
  if (!requirements.hasUppercase) {
    errors.push('Include at least one uppercase letter');
  }
  if (!requirements.hasLowercase) {
    errors.push('Include at least one lowercase letter');
  }
  if (!requirements.hasNumber) {
    errors.push('Include at least one number');
  }
  if (!requirements.hasSymbol) {
    errors.push('Include at least one symbol (!@#$%...)');
  }
  if (!requirements.notCommon) {
    errors.push('This password is too common, please choose another');
  }
  if (!requirements.noPersonalInfo) {
    errors.push('Password should not contain personal information');
  }
  if (!passwordsMatch) {
    errors.push('Passwords do not match');
  }
  
  return errors;
};

/**
 * Full password validation
 */
export const validatePassword = (
  password: string,
  confirmPassword: string,
  personalInfo?: { childName?: string; parentEmail?: string }
): ValidationResult => {
  const requirements = checkRequirements(password, personalInfo);
  const strength = passwordStrength(password);
  
  const allRequirementsMet = Object.values(requirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  
  const errors = getValidationErrors(requirements, passwordsMatch);
  
  return {
    requirements,
    strength,
    isValid: allRequirementsMet && passwordsMatch,
    errors,
  };
};
