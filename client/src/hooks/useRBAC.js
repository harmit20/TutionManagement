import { useAuth } from '../context/AuthContext';

// Mirrors shared/constants.js PERMISSIONS — kept client-side to avoid bundling server code
const PERMISSIONS = {
  USER_CREATE: ['admin'], USER_UPDATE: ['admin'], USER_DELETE: ['admin'], USER_READ_ALL: ['admin'],
  PRICING_MANAGE: ['admin'],
  PAYOUT_MANAGE: ['admin'], PAYOUT_VIEW_OWN: ['teacher'],
  ENROLLMENT_MANAGE: ['admin', 'receptionist'],
  FEE_COLLECT: ['admin', 'receptionist'], FEE_VIEW_OWN: ['student'],
  TIMETABLE_MANAGE: ['admin', 'receptionist'], TIMETABLE_VIEW: ['teacher', 'student'],
  ATTENDANCE_MARK: ['admin', 'teacher'], ATTENDANCE_VIEW_OWN: ['student'],
  TEST_MANAGE: ['admin'], TEST_VIEW: ['teacher', 'student'],
  TEST_RESULTS_INPUT: ['admin', 'teacher'], TEST_RESULTS_VIEW_OWN: ['student'],
  STUDY_MATERIAL_MANAGE: ['admin'], STUDY_MATERIAL_UPLOAD: ['teacher'],
  STUDY_MATERIAL_DOWNLOAD: ['student'],
  NOTIFICATION_SEND: ['admin'],
};

export function useRBAC() {
  const { user } = useAuth();

  const can = (permission) => {
    if (!user) return false;
    return PERMISSIONS[permission]?.includes(user.role) ?? false;
  };

  const isRole = (...roles) => roles.includes(user?.role);

  return { can, isRole, role: user?.role };
}
