/**
 * Role-Based Access Control (RBAC) Helper
 * 
 * Enforces access rules for different user roles.
 * Fails safely by denying access by default.
 */

// User roles
export type UserRole = 'child' | 'parent' | 'guest';

// Features that can be access-controlled
export type Feature =
  | 'settings'
  | 'story_approval'
  | 'narration_configuration'
  | 'profile_edit'
  | 'story_create'
  | 'story_view'
  | 'story_read'
  | 'library_browse'
  | 'favorites'
  | 'parent_dashboard'
  | 'parent_gate'
  | 'child_home';

// Features restricted from child users
const CHILD_RESTRICTED_FEATURES: Feature[] = [
  'settings',
  'story_approval',
  'narration_configuration',
  'parent_dashboard',
  'profile_edit',
];

// Features restricted from guest users (not logged in)
const GUEST_RESTRICTED_FEATURES: Feature[] = [
  'settings',
  'story_approval',
  'narration_configuration',
  'parent_dashboard',
  'profile_edit',
  'story_create',
  'favorites',
];

// All valid features for validation
const ALL_FEATURES: Feature[] = [
  'settings',
  'story_approval',
  'narration_configuration',
  'profile_edit',
  'story_create',
  'story_view',
  'story_read',
  'library_browse',
  'favorites',
  'parent_dashboard',
  'parent_gate',
  'child_home',
];

/**
 * Check if a user role can access a specific feature.
 * 
 * Rules:
 * - Parent can access everything
 * - Child cannot access: settings, story_approval, narration_configuration
 * - Guest has very limited access
 * - Unknown roles or features are denied by default (fail-safe)
 * 
 * @param userRole - The role of the current user
 * @param feature - The feature to check access for
 * @returns boolean - true if access is allowed, false otherwise
 */
export function canAccess(userRole: UserRole | string | null | undefined, feature: Feature | string): boolean {
  // Fail-safe: deny access for invalid/missing role
  if (!userRole || typeof userRole !== 'string') {
    return false;
  }

  // Fail-safe: deny access for invalid/missing feature
  if (!feature || typeof feature !== 'string') {
    return false;
  }

  // Fail-safe: deny access for unknown features
  if (!ALL_FEATURES.includes(feature as Feature)) {
    console.warn(`[AccessControl] Unknown feature requested: ${feature}`);
    return false;
  }

  // Normalize role to lowercase
  const normalizedRole = userRole.toLowerCase() as UserRole;

  switch (normalizedRole) {
    case 'parent':
      // Parent can access everything
      return true;

    case 'child':
      // Child cannot access restricted features
      return !CHILD_RESTRICTED_FEATURES.includes(feature as Feature);

    case 'guest':
      // Guest has very limited access
      return !GUEST_RESTRICTED_FEATURES.includes(feature as Feature);

    default:
      // Fail-safe: deny access for unknown roles
      console.warn(`[AccessControl] Unknown role requested: ${userRole}`);
      return false;
  }
}

/**
 * Get all features a role can access
 * Useful for debugging and UI generation
 */
export function getAccessibleFeatures(userRole: UserRole): Feature[] {
  return ALL_FEATURES.filter((feature) => canAccess(userRole, feature));
}

/**
 * Get all features a role cannot access
 * Useful for debugging and showing locked features
 */
export function getRestrictedFeatures(userRole: UserRole): Feature[] {
  return ALL_FEATURES.filter((feature) => !canAccess(userRole, feature));
}

/**
 * Check if a role is valid
 */
export function isValidRole(role: string | null | undefined): role is UserRole {
  if (!role) return false;
  return ['child', 'parent', 'guest'].includes(role.toLowerCase());
}

/**
 * Check if a feature is valid
 */
export function isValidFeature(feature: string | null | undefined): feature is Feature {
  if (!feature) return false;
  return ALL_FEATURES.includes(feature as Feature);
}
