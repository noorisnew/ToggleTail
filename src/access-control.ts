/**
 * Access Control Module
 * 
 * Role-Based Access Control (RBAC) for ToggleTail app.
 * 
 * @example
 * // Check access directly
 * import { canAccess } from '@/src/access-control';
 * if (canAccess('child', 'settings')) { ... }
 * 
 * @example
 * // Use with React components
 * import { AccessControlProvider, AccessGuard, useAccessControl } from '@/src/access-control';
 * 
 * // In your app root:
 * <AccessControlProvider userRole="child">
 *   <App />
 * </AccessControlProvider>
 * 
 * // Guard a component:
 * <AccessGuard feature="settings" fallback={<Locked />}>
 *   <SettingsPage />
 * </AccessGuard>
 * 
 * // In a hook:
 * const { canAccess, navigateWithAccess } = useAccessControl();
 */

// Core access control function and types
export {
    canAccess,
    getAccessibleFeatures,
    getRestrictedFeatures, isValidFeature, isValidRole, type Feature,
    type UserRole
} from './domain/services/accessControl';

// React hooks and components
export {
    AccessControlProvider, AccessGuard,
    RequireRole, useAccessControl
} from './hooks/useAccessControl';

