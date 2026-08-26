import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

export default function ProtectedRoute({ roles, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
