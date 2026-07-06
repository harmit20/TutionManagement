import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Admin
import AdminDashboard   from './pages/admin/Dashboard';
import UserManagement   from './pages/admin/UserManagement';
import TeacherPayouts   from './pages/admin/TeacherPayouts';
import DynamicPricing   from './pages/admin/DynamicPricing';
import AdminReports     from './pages/admin/Reports';
import AuditLog         from './pages/admin/AuditLog';

// Receptionist
import Enrollments  from './pages/receptionist/Enrollments';
import FeeCollection from './pages/receptionist/FeeCollection';
import Receipts     from './pages/receptionist/Receipts';
import Timetable    from './pages/receptionist/Timetable';

// Teacher
import MyBatches       from './pages/teacher/MyBatches';
import Attendance      from './pages/teacher/Attendance';
import PaymentLedger   from './pages/teacher/PaymentLedger';

// Student
import FeeStatus      from './pages/student/FeeStatus';
import TestSchedule   from './pages/student/TestSchedule';
import MyAttendance   from './pages/student/MyAttendance';
import StudyMaterials from './pages/student/StudyMaterials';

const ROLE_HOME = {
  admin: '/admin',
  receptionist: '/receptionist/enrollments',
  teacher: '/teacher/batches',
  student: '/student/fees',
};

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={ROLE_HOME[user?.role] || '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* All authenticated routes share the AppShell layout */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>

        <Route index element={<RoleRedirect />} />

        {/* Admin */}
        <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/users"   element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="admin/payouts" element={<ProtectedRoute allowedRoles={['admin']}><TeacherPayouts /></ProtectedRoute>} />
        <Route path="admin/pricing" element={<ProtectedRoute allowedRoles={['admin']}><DynamicPricing /></ProtectedRoute>} />
        <Route path="admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
        <Route path="admin/audit"   element={<ProtectedRoute allowedRoles={['admin']}><AuditLog /></ProtectedRoute>} />

        {/* Receptionist */}
        <Route path="receptionist/enrollments" element={<ProtectedRoute allowedRoles={['admin','receptionist']}><Enrollments /></ProtectedRoute>} />
        <Route path="receptionist/fees"        element={<ProtectedRoute allowedRoles={['admin','receptionist']}><FeeCollection /></ProtectedRoute>} />
        <Route path="receptionist/receipts"    element={<ProtectedRoute allowedRoles={['admin','receptionist']}><Receipts /></ProtectedRoute>} />
        <Route path="receptionist/timetable"   element={<ProtectedRoute allowedRoles={['admin','receptionist']}><Timetable /></ProtectedRoute>} />

        {/* Teacher */}
        <Route path="teacher/batches"    element={<ProtectedRoute allowedRoles={['teacher']}><MyBatches /></ProtectedRoute>} />
        <Route path="teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><Attendance /></ProtectedRoute>} />
        <Route path="teacher/payouts"    element={<ProtectedRoute allowedRoles={['teacher']}><PaymentLedger /></ProtectedRoute>} />

        {/* Student */}
        <Route path="student/fees"       element={<ProtectedRoute allowedRoles={['student']}><FeeStatus /></ProtectedRoute>} />
        <Route path="student/tests"      element={<ProtectedRoute allowedRoles={['student']}><TestSchedule /></ProtectedRoute>} />
        <Route path="student/attendance" element={<ProtectedRoute allowedRoles={['student']}><MyAttendance /></ProtectedRoute>} />
        <Route path="student/materials"  element={<ProtectedRoute allowedRoles={['student']}><StudyMaterials /></ProtectedRoute>} />

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Wrap with ErrorBoundary so runtime errors don't show a blank white screen
export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
