import { canAccess, Feature, getAccessibleFeatures, getRestrictedFeatures, isValidFeature, isValidRole } from '../domain/services/accessControl';

describe('AccessControl Service', () => {
  describe('canAccess', () => {
    describe('Parent role', () => {
      it('should allow parent to access all features', () => {
        const parentFeatures: Feature[] = [
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

        parentFeatures.forEach((feature) => {
          expect(canAccess('parent', feature)).toBe(true);
        });
      });

      it('should work with uppercase PARENT', () => {
        expect(canAccess('PARENT', 'settings')).toBe(true);
      });
    });

    describe('Child role', () => {
      it('should deny child access to restricted features', () => {
        expect(canAccess('child', 'settings')).toBe(false);
        expect(canAccess('child', 'story_approval')).toBe(false);
        expect(canAccess('child', 'narration_configuration')).toBe(false);
        expect(canAccess('child', 'parent_dashboard')).toBe(false);
        expect(canAccess('child', 'profile_edit')).toBe(false);
      });

      it('should allow child access to permitted features', () => {
        expect(canAccess('child', 'story_view')).toBe(true);
        expect(canAccess('child', 'story_read')).toBe(true);
        expect(canAccess('child', 'library_browse')).toBe(true);
        expect(canAccess('child', 'favorites')).toBe(true);
        expect(canAccess('child', 'child_home')).toBe(true);
      });

      it('should work with uppercase CHILD', () => {
        expect(canAccess('CHILD', 'story_view')).toBe(true);
        expect(canAccess('CHILD', 'settings')).toBe(false);
      });
    });

    describe('Fail-safe behavior (deny by default)', () => {
      it('should deny access for null role', () => {
        expect(canAccess(null, 'story_view')).toBe(false);
      });

      it('should deny access for undefined role', () => {
        expect(canAccess(undefined, 'story_view')).toBe(false);
      });

      it('should deny access for empty string role', () => {
        expect(canAccess('', 'story_view')).toBe(false);
      });

      it('should deny access for unknown role', () => {
        expect(canAccess('admin', 'story_view')).toBe(false);
        expect(canAccess('superuser', 'settings')).toBe(false);
      });

      it('should deny access for null feature', () => {
        expect(canAccess('parent', null as any)).toBe(false);
      });

      it('should deny access for undefined feature', () => {
        expect(canAccess('parent', undefined as any)).toBe(false);
      });

      it('should deny access for empty string feature', () => {
        expect(canAccess('parent', '')).toBe(false);
      });

      it('should deny access for unknown feature', () => {
        expect(canAccess('parent', 'unknown_feature')).toBe(false);
        expect(canAccess('child', 'admin_panel')).toBe(false);
      });
    });

    describe('Guest role', () => {
      it('should allow guest to view stories', () => {
        expect(canAccess('guest', 'story_view')).toBe(true);
        expect(canAccess('guest', 'story_read')).toBe(true);
        expect(canAccess('guest', 'library_browse')).toBe(true);
      });

      it('should deny guest access to restricted features', () => {
        expect(canAccess('guest', 'settings')).toBe(false);
        expect(canAccess('guest', 'story_approval')).toBe(false);
        expect(canAccess('guest', 'story_create')).toBe(false);
        expect(canAccess('guest', 'favorites')).toBe(false);
      });
    });
  });

  describe('getAccessibleFeatures', () => {
    it('should return all features for parent', () => {
      const features = getAccessibleFeatures('parent');
      expect(features.length).toBe(12); // All features
      expect(features).toContain('settings');
      expect(features).toContain('story_approval');
    });

    it('should return limited features for child', () => {
      const features = getAccessibleFeatures('child');
      expect(features).not.toContain('settings');
      expect(features).not.toContain('story_approval');
      expect(features).toContain('story_view');
      expect(features).toContain('child_home');
    });
  });

  describe('getRestrictedFeatures', () => {
    it('should return empty array for parent', () => {
      const features = getRestrictedFeatures('parent');
      expect(features.length).toBe(0);
    });

    it('should return restricted features for child', () => {
      const features = getRestrictedFeatures('child');
      expect(features).toContain('settings');
      expect(features).toContain('story_approval');
      expect(features).toContain('narration_configuration');
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('child')).toBe(true);
      expect(isValidRole('parent')).toBe(true);
      expect(isValidRole('guest')).toBe(true);
      expect(isValidRole('PARENT')).toBe(true);
      expect(isValidRole('Child')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('admin')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
    });
  });

  describe('isValidFeature', () => {
    it('should return true for valid features', () => {
      expect(isValidFeature('settings')).toBe(true);
      expect(isValidFeature('story_view')).toBe(true);
    });

    it('should return false for invalid features', () => {
      expect(isValidFeature('unknown')).toBe(false);
      expect(isValidFeature('')).toBe(false);
      expect(isValidFeature(null)).toBe(false);
      expect(isValidFeature(undefined)).toBe(false);
    });
  });
});
