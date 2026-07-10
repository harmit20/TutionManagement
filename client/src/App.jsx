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
import Messages         from './pages/admin/Messages';
import Expenses         from './pages/admin/Expenses';

// Shared (admin + receptionist)
import StudentProfile   from './pages/shared/StudentProfile';
import ReportCard       from './pages/shared/ReportCard';

// Parent
import MyChildren       from './pages/parent/MyChildren';

// Receptionist
import Enrollments  from './pages/receptionist/Enrollments';
import Enquiries    from './pages/receptionist/Enquiries';
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
import Announcements  from './pages/student/Announcements';

const ROLE_HOME = {
  admin: '/admin',
  receptionist: '/receptionist/enrollments',
  teacher: '/teacher/batches',
  student: '/student/fees',
  parent: '/parent',
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
        <Route path="admin/students/:id" element={<ProtectedRoute allowedRoles={['admin']}><StudentProfile /></ProtectedRoute>} />
        <Route path="admin/students/:id/report-card" element={<ProtectedRoute allowedRoles={['admin']}><ReportCard /></ProtectedRoute>} />
        <Route path="admin/messages" element={<ProtectedRoute allowedRoles={['admin']}><Messages /></ProtectedRoute>} />
        <Route path="admin/expenses" element={<ProtectedRoute allowedRoles={['admin']}><Expenses /></ProtectedRoute>} />

        {/* Receptionist */}
        <Route path="receptionist/enrollments" element={<ProtectedRoute allowedRoles={['admin','receptionist']}><Enrollments /></ProtectedRoute>} />
        <Route path="receptionist/enquiries"   element={<ProtectedRoute allowedRoles={['admin','receptionist']}><Enquiries /></ProtectedRoute>} />
        <Route path="receptionist/fees"        element={<ProtectedRoute allowedRoles={['admin','receptionist']}><FeeCollection /></ProtectedRoute>} />
        <Route path="receptionist/receipts"    element={<ProtectedRoute allowedRoles={['admin','receptionist']}><Receipts /></ProtectedRoute>} />
        <Route path="receptionist/timetable"   element={<ProtectedRoute allowedRoles={['admin','receptionist']}><Timetable /></ProtectedRoute>} />
        <Route path="receptionist/students/:id" element={<ProtectedRoute allowedRoles={['admin','receptionist']}><StudentProfile /></ProtectedRoute>} />
        <Route path="receptionist/students/:id/report-card" element={<ProtectedRoute allowedRoles={['admin','receptionist']}><ReportCard /></ProtectedRoute>} />

        {/* Teacher */}
        <Route path="teacher/batches"    element={<ProtectedRoute allowedRoles={['teacher']}><MyBatches /></ProtectedRoute>} />
        <Route path="teacher/attendance" element={<ProtectedRoute allowedRoles={['teacher']}><Attendance /></ProtectedRoute>} />
        <Route path="teacher/payouts"    element={<ProtectedRoute allowedRoles={['teacher']}><PaymentLedger /></ProtectedRoute>} />

        {/* Parent */}
        <Route path="parent"                    element={<ProtectedRoute allowedRoles={['parent']}><MyChildren /></ProtectedRoute>} />
        <Route path="parent/children/:id"       element={<ProtectedRoute allowedRoles={['parent']}><StudentProfile /></ProtectedRoute>} />
        <Route path="parent/children/:id/report-card" element={<ProtectedRoute allowedRoles={['parent']}><ReportCard /></ProtectedRoute>} />

        {/* Student */}
        <Route path="student/fees"       element={<ProtectedRoute allowedRoles={['student']}><FeeStatus /></ProtectedRoute>} />
        <Route path="student/tests"      element={<ProtectedRoute allowedRoles={['student']}><TestSchedule /></ProtectedRoute>} />
        <Route path="student/attendance" element={<ProtectedRoute allowedRoles={['student']}><MyAttendance /></ProtectedRoute>} />
        <Route path="student/materials"  element={<ProtectedRoute allowedRoles={['student']}><StudyMaterials /></ProtectedRoute>} />
        <Route path="student/announcements" element={<ProtectedRoute allowedRoles={['student']}><Announcements /></ProtectedRoute>} />

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
