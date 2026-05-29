import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useRBAC } from '../hooks/useRBAC';
import * as AuthCtx from '../context/AuthContext';

function mockUser(role) {
  vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({
    user: { _id: '1', name: 'Test', email: 't@t.com', role },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('useRBAC', () => {
  describe('can()', () => {
    it('returns true when user role is in the permission list', () => {
      mockUser('admin');
      const { result } = renderHook(() => useRBAC());
      expect(result.current.can('PRICING_MANAGE')).toBe(true);
    });

    it('returns false when user role is NOT in the permission list', () => {
      mockUser('student');
      const { result } = renderHook(() => useRBAC());
      expect(result.current.can('PRICING_MANAGE')).toBe(false);
    });

    it('returns false for an unknown permission key', () => {
      mockUser('admin');
      const { result } = renderHook(() => useRBAC());
      expect(result.current.can('NON_EXISTENT_PERMISSION')).toBe(false);
    });

    it('returns false when no user is logged in', () => {
      vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn() });
      const { result } = renderHook(() => useRBAC());
      expect(result.current.can('USER_CREATE')).toBe(false);
    });
  });

  describe('isRole()', () => {
    it('returns true when user has one of the given roles', () => {
      mockUser('teacher');
      const { result } = renderHook(() => useRBAC());
      expect(result.current.isRole('teacher', 'admin')).toBe(true);
    });

    it('returns false when user has none of the given roles', () => {
      mockUser('student');
      const { result } = renderHook(() => useRBAC());
      expect(result.current.isRole('teacher', 'admin')).toBe(false);
    });
  });

  describe('RBAC matrix spot-checks', () => {
    const cases = [
      ['admin',        'USER_CREATE',           true ],
      ['receptionist', 'USER_CREATE',           false],
      ['admin',        'ENROLLMENT_MANAGE',      true ],
      ['receptionist', 'ENROLLMENT_MANAGE',      true ],
      ['student',      'ENROLLMENT_MANAGE',      false],
      ['teacher',      'ATTENDANCE_MARK',        true ],
      ['student',      'ATTENDANCE_MARK',        false],
      ['teacher',      'PAYOUT_VIEW_OWN',        true ],
      ['admin',        'NOTIFICATION_SEND',      true ],
      ['student',      'NOTIFICATION_SEND',      false],
    ];

    it.each(cases)('%s → can(%s) === %s', (role, permission, expected) => {
      mockUser(role);
      const { result } = renderHook(() => useRBAC());
      expect(result.current.can(permission)).toBe(expected);
    });
  });
});
