import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/shared/Spinner';

const ROLE_HOME = {
  admin: '/admin',
  receptionist: '/receptionist/enrollments',
  teacher: '/teacher/batches',
  student: '/student/fees',
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner fullScreen />;
  if (!user)   return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
  }

  return children;
}
