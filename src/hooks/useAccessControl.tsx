import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';
import {
    canAccess,
    Feature,
    getAccessibleFeatures,
    getRestrictedFeatures,
    isValidRole,
    UserRole,
} from '../domain/services/accessControl';

// Context type
type AccessControlContextType = {
  userRole: UserRole;
  canAccess: (feature: Feature) => boolean;
  accessibleFeatures: Feature[];
  restrictedFeatures: Feature[];
  navigateWithAccess: (feature: Feature, href: string) => boolean;
};

// Default context (fail-safe: guest role with minimal access)
const defaultContext: AccessControlContextType = {
  userRole: 'guest',
  canAccess: () => false, // Deny by default
  accessibleFeatures: [],
  restrictedFeatures: [],
  navigateWithAccess: () => false,
};

const AccessControlContext = createContext<AccessControlContextType>(defaultContext);

// Provider props
type AccessControlProviderProps = {
  children: ReactNode;
  userRole: UserRole | string | null | undefined;
  onAccessDenied?: (feature: Feature, userRole: UserRole) => void;
};

/**
 * AccessControlProvider - Provides role-based access control context
 * 
 * Wrap your app or protected sections with this provider to enable
 * access control throughout the component tree.
 */
export function AccessControlProvider({
  children,
  userRole,
  onAccessDenied,
}: AccessControlProviderProps) {
  const router = useRouter();

  // Normalize and validate role, default to guest for safety
  const normalizedRole: UserRole = useMemo(() => {
    if (isValidRole(userRole)) {
      return userRole.toLowerCase() as UserRole;
    }
    return 'guest';
  }, [userRole]);

  // Memoized access check
  const checkAccess = useCallback(
    (feature: Feature): boolean => {
      return canAccess(normalizedRole, feature);
    },
    [normalizedRole]
  );

  // Get accessible and restricted features
  const accessibleFeatures = useMemo(
    () => getAccessibleFeatures(normalizedRole),
    [normalizedRole]
  );

  const restrictedFeatures = useMemo(
    () => getRestrictedFeatures(normalizedRole),
    [normalizedRole]
  );

  // Navigation with access control
  const navigateWithAccess = useCallback(
    (feature: Feature, href: string): boolean => {
      if (canAccess(normalizedRole, feature)) {
        router.push(href as any);
        return true;
      } else {
        onAccessDenied?.(feature, normalizedRole);
        return false;
      }
    },
    [normalizedRole, router, onAccessDenied]
  );

  const value: AccessControlContextType = useMemo(
    () => ({
      userRole: normalizedRole,
      canAccess: checkAccess,
      accessibleFeatures,
      restrictedFeatures,
      navigateWithAccess,
    }),
    [normalizedRole, checkAccess, accessibleFeatures, restrictedFeatures, navigateWithAccess]
  );

  return (
    <AccessControlContext.Provider value={value}>
      {children}
    </AccessControlContext.Provider>
  );
}

/**
 * useAccessControl - Hook to access the access control context
 * 
 * Returns the current user's role and access control functions.
 * Fails safely by denying access if used outside provider.
 */
export function useAccessControl() {
  const context = useContext(AccessControlContext);
  return context;
}

// Guard component props
type AccessGuardProps = {
  children: ReactNode;
  feature: Feature;
  fallback?: ReactNode;
  onDenied?: () => void;
};

/**
 * AccessGuard - Component-level access control wrapper
 * 
 * Conditionally renders children based on user's access to a feature.
 * Shows fallback (or nothing) if access is denied.
 * 
 * @example
 * <AccessGuard feature="settings" fallback={<LockedMessage />}>
 *   <SettingsPanel />
 * </AccessGuard>
 */
export function AccessGuard({ children, feature, fallback = null, onDenied }: AccessGuardProps) {
  const { canAccess } = useAccessControl();

  if (!canAccess(feature)) {
    onDenied?.();
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// RequireRole component props
type RequireRoleProps = {
  children: ReactNode;
  roles: UserRole | UserRole[];
  fallback?: ReactNode;
};

/**
 * RequireRole - Component that only renders for specific roles
 * 
 * @example
 * <RequireRole roles="parent">
 *   <ParentOnlyContent />
 * </RequireRole>
 */
export function RequireRole({ children, roles, fallback = null }: RequireRoleProps) {
  const { userRole } = useAccessControl();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
