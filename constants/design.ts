/**
 * ToggleTail Design System
 * Colors and styles matching the Figma design
 */

export const DesignTokens = {
  // Primary Colors (Violet/Purple theme)
  colors: {
    // Primary purple gradient
    primaryStart: '#7c3aed', // violet-600
    primaryEnd: '#ec4899', // pink-500
    
    // Text colors
    textPrimary: '#1f2937', // gray-800
    textSecondary: '#6b7280', // gray-500
    textMuted: '#9ca3af', // gray-400
    textAccent: '#8b5cf6', // violet-500
    
    // Background colors
    backgroundPrimary: '#7c3aed', // violet-600 (main bg)
    backgroundSecondary: '#f5f5f5', // gray-100
    backgroundCard: '#ffffff',
    backgroundInput: '#f9fafb', // gray-50
    
    // Border colors
    borderCard: '#c4b5fd', // violet-300
    borderInput: '#e5e7eb', // gray-200
    borderActive: '#7c3aed', // violet-600
    
    // Progress bar
    progressBackground: '#f3e8ff', // violet-100
    progressFill: '#1f2937', // gray-800
    
    // Status colors
    success: '#22c55e', // green-500
    error: '#ef4444', // red-500
    warning: '#f59e0b', // amber-500
    
    // Button colors
    buttonDanger: '#ef4444',
    buttonSecondary: '#6b7280',
    
    // Yellow accent (logo border)
    accentYellow: '#facc15', // yellow-400
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Border radius
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 14,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 25 },
      shadowOpacity: 0.25,
      shadowRadius: 50,
      elevation: 12,
    },
    button: {
      shadowColor: '#7c3aed',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  
  // Typography
  typography: {
    // Headings
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    // Body
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 28,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    // Labels
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
  },
  
  // Component specific
  components: {
    card: {
      borderWidth: 4,
      borderRadius: 14,
      maxWidth: 768,
    },
    button: {
      height: 56,
      borderRadius: 8,
      paddingHorizontal: 16,
    },
    input: {
      height: 52,
      borderRadius: 10,
      paddingHorizontal: 16,
      borderWidth: 1,
    },
    logo: {
      size: 128,
      borderWidth: 6,
    },
    progressBar: {
      height: 12,
      borderRadius: 9999,
    },
  },
};

// Convenience exports (mapped to match usage in screens)
export const Colors = {
  ...DesignTokens.colors,
  // Aliases for convenience
  background: DesignTokens.colors.backgroundPrimary,
  cardBackground: DesignTokens.colors.backgroundCard,
  backgroundLight: DesignTokens.colors.backgroundInput,
  textLight: '#ffffff',
  borderCard: DesignTokens.colors.borderCard,
};

export const Spacing = DesignTokens.spacing;

export const BorderRadius = {
  ...DesignTokens.borderRadius,
  card: DesignTokens.borderRadius.xl, // 14
  button: DesignTokens.borderRadius.lg, // 10
};

export const Shadows = DesignTokens.shadows;

export const Typography = {
  ...DesignTokens.typography,
  sizes: {
    title: 24,
    body: 16,
    small: 14,
    button: 16,
  },
  weights: {
    bold: '700' as const,
    semibold: '600' as const,
    medium: '500' as const,
    regular: '400' as const,
  },
};
